// js/plano_de_aula.js
import { db, auth } from './firebase-config.js';
import {
  collection, getDocs, addDoc, serverTimestamp,
  query, where, doc, getDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { mostrarNotificacao } from './notificacao.js';

// Estado e refs
let meusPlanos = [];
let corpoTabela, filtroOficina, filtroBusca, btnImprimir;
let modalVisualizar, modalEditar, formEditarPlano;

export function init(container) {
  console.log("✅ Módulo de Plano de Aula (Professor) inicializado!");

  // refs do bloco "criar"
  const planoForm = container.querySelector("#plano-form");
  const btnSalvar = container.querySelector("#btn-salvar-plano");
  const selectOficina = container.querySelector("#plano-oficina");
  const inputProfessor = container.querySelector("#plano-professor");

  if (!planoForm || !btnSalvar || !selectOficina || !inputProfessor) {
    console.error("❌ Erro: Elementos essenciais do formulário não encontrados.");
    return;
  }

  // refs do bloco "gerenciar" (mesmo padrão do admin)
  corpoTabela   = document.getElementById("corpo-tabela-planos-admin");
  filtroOficina = document.getElementById("filtro-planos-oficina");
  filtroBusca   = document.getElementById("filtro-planos-busca");
  btnImprimir   = document.getElementById("btn-imprimir-planos");

  modalVisualizar = document.getElementById("modal-visualizar-plano");
  modalEditar     = document.getElementById("modal-editar-plano");
  formEditarPlano = document.getElementById("form-editar-plano");

  // listeners fixos
  adicionarEventListenersBasicos();

  // autenticação
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // preenche professor
    if (user.displayName) inputProfessor.value = user.displayName;

    await carregarOficinasParaFormulario(selectOficina);
    await carregarMeusPlanos();     // carrega e renderiza
    renderizarTabela(meusPlanos);
    carregarFiltros(meusPlanos);

    // submit criar
    planoForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      salvarPlano(planoForm, btnSalvar);
    });

    // quando um plano novo é salvo
    window.addEventListener('planoSalvo', async () => {
      await carregarMeusPlanos();
      renderizarTabela(meusPlanos);
      carregarFiltros(meusPlanos);
    });
  });
}

/* -----------------------------
   CRIAR PLANO (igual ao seu)
------------------------------*/
async function carregarOficinasParaFormulario(selectElement) {
  selectElement.innerHTML = `<option value="">Carregando oficinas...</option>`;
  try {
    const snapshot = await getDocs(collection(db, "matriculas"));
    const oficinas = new Set();
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.oficinas) data.oficinas.forEach(o => oficinas.add((o || '').trim()));
    });
    const sorted = Array.from(oficinas).filter(Boolean).sort();
    selectElement.innerHTML = `<option value="">Selecione uma oficina</option>`;
    sorted.forEach(o => selectElement.innerHTML += `<option value="${o}">${o}</option>`);
  } catch (error) {
    console.error("❌ Erro ao carregar oficinas:", error);
    selectElement.innerHTML = `<option value="">Erro ao carregar</option>`;
    mostrarNotificacao('Erro ao carregar as oficinas.', 'erro');
  }
}

async function salvarPlano(planoForm, btnSalvar) {
  const user = auth.currentUser;
  if (!user) { mostrarNotificacao("Sessão expirada. Faça login novamente.", 'erro'); return; }

  const formData = new FormData(planoForm);
  const dadosPlano = {
    titulo: (formData.get('plano-titulo') || '').trim(),
    professor: (formData.get('plano-professor') || '').trim(),
    oficina: formData.get('plano-oficina') || '',
    data: formData.get('plano-data') || '',
    objetivos: (formData.get('plano-objetivos') || '').trim(),
    materiais: (formData.get('plano-materiais') || '').trim(),
    desenvolvimento: (formData.get('plano-descricao') || '').trim(),
    avaliacao: (formData.get('plano-avaliacao') || '').trim(),
    professorEmail: user.email,
    criadoEm: serverTimestamp()
  };

  if (!dadosPlano.titulo || !dadosPlano.professor || !dadosPlano.oficina ||
      !dadosPlano.data || !dadosPlano.objetivos || !dadosPlano.desenvolvimento || !dadosPlano.avaliacao) {
    mostrarNotificacao("Por favor, preencha todos os campos obrigatórios.", 'erro');
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  try {
    await addDoc(collection(db, "planosDeAula"), dadosPlano);
    mostrarNotificacao("Plano de aula salvo com sucesso!", 'sucesso');
    planoForm.reset();
    if (auth.currentUser?.displayName) {
      planoForm.querySelector("#plano-professor").value = auth.currentUser.displayName;
    }
    window.dispatchEvent(new CustomEvent('planoSalvo'));
  } catch (error) {
    console.error("❌ Erro ao salvar plano:", error);
    mostrarNotificacao("Falha ao salvar o plano. Tente novamente.", 'erro');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar Plano de Aula";
  }
}

/* -------------------------------------
   GERENCIAR (mesmo padrão do admin)
   – listar/filtrar/visualizar/editar/excluir/imprimir
--------------------------------------*/
async function carregarMeusPlanos() {
  const user = auth.currentUser;
  if (!user) return;

  if (corpoTabela) corpoTabela.innerHTML = `<tr><td colspan="5">Carregando planos...</td></tr>`;
  try {
    const q = query(collection(db, "planosDeAula"), where("professorEmail", "==", user.email));
    const querySnapshot = await getDocs(q);
    meusPlanos = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // ordena por data desc (sem índice)
    meusPlanos.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    if (corpoTabela) corpoTabela.innerHTML = `<tr><td colspan="5">Erro ao carregar.</td></tr>`;
  }
}

function renderizarTabela(planos) {
  if (!corpoTabela) return;
  corpoTabela.innerHTML = "";
  if (!planos.length) {
    corpoTabela.innerHTML = `<tr><td colspan="5">Nenhum plano encontrado.</td></tr>`;
    return;
  }
  planos.forEach(plano => {
    const tr = document.createElement("tr");
    tr.dataset.planoId = plano.id;
    tr.innerHTML = `
      <td>${plano.data ? new Date(plano.data + 'T00:00:00').toLocaleDateString('pt-BR') : "N/A"}</td>
      <td>${escapeHTML(plano.titulo || "Sem Título")}</td>
      <td>${escapeHTML(plano.oficina || "N/A")}</td>
      <td>${escapeHTML(plano.professor || "Não atribuído")}</td>
      <td class="actions">
        <a href="#" class="acao-visualizar" title="Visualizar"><i class="fas fa-eye"></i></a>
        <a href="#" class="acao-editar" title="Editar"><i class="fas fa-edit"></i></a>
        <a href="#" class="acao-excluir" title="Excluir"><i class="fas fa-trash"></i></a>
      </td>
    `;
    corpoTabela.appendChild(tr);
  });
}

function carregarFiltros(planos) {
  if (!filtroOficina) return;
  const oficinas = [...new Set(planos.map(p => p.oficina).filter(Boolean))].sort();
  filtroOficina.innerHTML = `<option value="">Todas as Oficinas</option>`;
  oficinas.forEach(of => filtroOficina.innerHTML += `<option value="${of}">${of}</option>`);
}

function aplicarFiltros() {
  const oficina = (filtroOficina?.value || '');
  const busca = (filtroBusca?.value || '').toLowerCase();

  const filtrados = meusPlanos.filter(p => {
    const okOf = !oficina || p.oficina === oficina;
    const okBusca =
      !busca ||
      (p.titulo && p.titulo.toLowerCase().includes(busca)) ||
      (p.objetivos && p.objetivos.toLowerCase().includes(busca));
    return okOf && okBusca;
  });

  renderizarTabela(filtrados);
}

/* ---- modais ---- */
async function abrirModalVisualizar(planoId) {
  const tituloModal = document.getElementById("modal-plano-titulo");
  const conteudoModal = document.getElementById("modal-plano-conteudo");
  if (!modalVisualizar || !tituloModal || !conteudoModal) return;

  tituloModal.textContent = "Carregando...";
  conteudoModal.innerHTML = '<p>Buscando informações do plano...</p>';
  modalVisualizar.style.display = "flex";

  try {
    const ref = doc(db, "planosDeAula", planoId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      tituloModal.textContent = d.titulo || 'Plano de Aula';
      conteudoModal.innerHTML = `
        <p><strong>Oficina:</strong> ${escapeHTML(d.oficina || "N/A")}</p>
        <p><strong>Professor:</strong> ${escapeHTML(d.professor || "N/A")}</p>
        <p><strong>Data:</strong> ${d.data ? new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR') : "N/A"}</p><hr>
        <p><strong>Objetivos:</strong></p><p>${nl2br(escapeHTML(d.objetivos || "Não informado."))}</p>
        <p><strong>Materiais:</strong></p><p>${nl2br(escapeHTML(d.materiais || "Não informado."))}</p>
        <p><strong>Desenvolvimento:</strong></p><p>${nl2br(escapeHTML(d.desenvolvimento || "Não informado."))}</p>
        <p><strong>Avaliação:</strong></p><p>${nl2br(escapeHTML(d.avaliacao || "Não informado."))}</p>
      `;
    } else {
      tituloModal.textContent = "Erro";
      conteudoModal.innerHTML = '<p>Plano de aula não encontrado.</p>';
    }
  } catch (e) {
    tituloModal.textContent = "Erro";
    conteudoModal.innerHTML = '<p>Ocorreu um erro ao buscar os detalhes.</p>';
  }
}

async function abrirModalEdicao(planoId) {
  if (!modalEditar || !formEditarPlano) return;
  formEditarPlano.reset();
  modalEditar.style.display = "flex";

  try {
    const ref = doc(db, "planosDeAula", planoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      mostrarNotificacao("Plano não encontrado para edição.", "erro");
      fecharModalEdicao();
      return;
    }
    const d = snap.data();

    // preencher campos
    formEditarPlano.querySelector("#editar-plano-id").value = planoId;
    formEditarPlano.querySelector("#editar-plano-titulo").value = d.titulo || '';
    formEditarPlano.querySelector("#editar-plano-professor").value = d.professor || '';
    formEditarPlano.querySelector("#editar-plano-data").value = d.data || '';
    formEditarPlano.querySelector("#editar-plano-objetivos").value = d.objetivos || '';
    formEditarPlano.querySelector("#editar-plano-materiais").value = d.materiais || '';
    formEditarPlano.querySelector("#editar-plano-descricao").value = d.desenvolvimento || '';
    formEditarPlano.querySelector("#editar-plano-avaliacao").value = d.avaliacao || '';

    // opções de oficina no select
    const selectOficina = formEditarPlano.querySelector("#editar-plano-oficina");
    const oficinas = [...new Set(meusPlanos.map(p => p.oficina).filter(Boolean))].sort();
    selectOficina.innerHTML = '<option value="">Selecione uma oficina</option>';
    oficinas.forEach(o => selectOficina.innerHTML += `<option value="${o}">${o}</option>`);
    selectOficina.value = d.oficina || '';
  } catch (e) {
    mostrarNotificacao("Erro ao carregar dados para edição.", "erro");
    fecharModalEdicao();
  }
}

function fecharModalVisualizar() {
  if (modalVisualizar) modalVisualizar.style.display = "none";
}
function fecharModalEdicao() {
  if (modalEditar) modalEditar.style.display = "none";
}

/* ---- ações: salvar, excluir, imprimir ---- */
async function salvarEdicao(ev) {
  ev.preventDefault();
  const btn = formEditarPlano.querySelector("#btn-salvar-edicao");
  btn.disabled = true; btn.textContent = "Salvando...";

  const planoId = formEditarPlano.querySelector("#editar-plano-id").value;
  const dadosAtualizados = {
    titulo: formEditarPlano.querySelector("#editar-plano-titulo").value.trim(),
    oficina: formEditarPlano.querySelector("#editar-plano-oficina").value,
    professor: formEditarPlano.querySelector("#editar-plano-professor").value.trim(),
    data: formEditarPlano.querySelector("#editar-plano-data").value,
    objetivos: formEditarPlano.querySelector("#editar-plano-objetivos").value.trim(),
    materiais: formEditarPlano.querySelector("#editar-plano-materiais").value.trim(),
    desenvolvimento: formEditarPlano.querySelector("#editar-plano-descricao").value.trim(),
    avaliacao: formEditarPlano.querySelector("#editar-plano-avaliacao").value.trim(),
  };

  // valida
  if (!dadosAtualizados.titulo || !dadosAtualizados.oficina || !dadosAtualizados.professor ||
      !dadosAtualizados.data || !dadosAtualizados.objetivos || !dadosAtualizados.desenvolvimento || !dadosAtualizados.avaliacao) {
    mostrarNotificacao("Preencha todos os campos obrigatórios.", "erro");
    btn.disabled = false; btn.textContent = "Salvar Alterações";
    return;
  }

  try {
    await updateDoc(doc(db, "planosDeAula", planoId), dadosAtualizados);
    mostrarNotificacao("Plano atualizado com sucesso!", "sucesso");
    fecharModalEdicao();
    await carregarMeusPlanos();
    renderizarTabela(meusPlanos);
  } catch (e) {
    mostrarNotificacao("Erro ao atualizar o plano.", "erro");
  } finally {
    btn.disabled = false; btn.textContent = "Salvar Alterações";
  }
}

async function excluirPlano(planoId) {
  if (!confirm("Tem certeza que deseja excluir este plano de aula? Esta ação não pode ser desfeita.")) return;
  try {
    await deleteDoc(doc(db, "planosDeAula", planoId));
    mostrarNotificacao("Plano excluído com sucesso!", "sucesso");
    await carregarMeusPlanos();
    renderizarTabela(meusPlanos);
  } catch (e) {
    mostrarNotificacao("Erro ao excluir o plano.", "erro");
  }
}

function imprimirLista() {
  const tabela = document.getElementById('tabela-planos-admin');
  if (!tabela) return;
  const clone = tabela.cloneNode(true);
  // remove coluna ações
  Array.from(clone.querySelectorAll('tr')).forEach(tr => tr.deleteCell(tr.cells.length - 1));
  const estilo = `<style>body{font-family:sans-serif;margin:20px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ddd;padding:8px;text-align:left}
  th{background:#f2f2f2}h1{font-size:22px;margin:0 0 14px}</style>`;
  const win = window.open('', '', 'height=800,width=1000');
  win.document.write(`<html><head><title>Meus Planos de Aula</title>${estilo}</head><body><h1>Meus Planos de Aula</h1>${clone.outerHTML}</body></html>`);
  win.document.close(); win.focus(); win.print();
}

/* ---- listeners raiz (uma vez) ---- */
function adicionarEventListenersBasicos() {
  // filtros
  document.getElementById("filtro-planos-oficina")?.addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-planos-busca")?.addEventListener("input", aplicarFiltros);

  // imprimir
  document.getElementById("btn-imprimir-planos")?.addEventListener("click", imprimirLista);

  // submit do modal editar
  document.getElementById("form-editar-plano")?.addEventListener("submit", salvarEdicao);

  // delegação na tabela (ações)
  document.getElementById("corpo-tabela-planos-admin")?.addEventListener("click", (ev) => {
    const a = ev.target.closest("a");
    if (!a) return;
    ev.preventDefault();
    const planoId = a.closest("tr")?.dataset?.planoId;
    if (!planoId) return;

    if (a.classList.contains("acao-visualizar")) abrirModalVisualizar(planoId);
    if (a.classList.contains("acao-editar")) abrirModalEdicao(planoId);
    if (a.classList.contains("acao-excluir")) excluirPlano(planoId);
  });

  // fechar modais
  document.getElementById("modal-visualizar-plano-fechar")?.addEventListener("click", fecharModalVisualizar);
  document.getElementById("modal-editar-plano-fechar")?.addEventListener("click", fecharModalEdicao);
  document.getElementById("modal-editar-plano-fechar-2")?.addEventListener("click", fecharModalEdicao);

  // fechar ao clicar no backdrop
  document.querySelectorAll('#modal-visualizar-plano .modal-backdrop, #modal-editar-plano .modal-backdrop')
    .forEach(el => el.addEventListener('click', (e) => {
      const modal = e.currentTarget.closest('.modal');
      if (modal?.id === 'modal-visualizar-plano') fecharModalVisualizar();
      if (modal?.id === 'modal-editar-plano') fecharModalEdicao();
    }));
}

/* -----------------
   util
------------------*/
function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function nl2br(str) {
  return String(str).replace(/\n/g, '<br>');
}
