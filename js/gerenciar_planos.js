// js/gerenciar_planos.js (VERSÃO FINAL E LIMPA)
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mostrarNotificacao } from './notificacao.js';

// --- Variáveis de escopo do módulo para os modais e elementos ---
let todosOsPlanos = [];
let modalVisualizar, modalEditar, corpoTabela, filtroOficina, filtroProfessor, btnImprimir, formEditarPlano;

// --- Funções para fechar os modais ---
function fecharModalVisualizar( ) {
  if (modalVisualizar) modalVisualizar.style.display = "none";
}
function fecharModalEdicao() {
  if (modalEditar) modalEditar.style.display = "none";
}

// --- Função de Inicialização ---
export function init() {
  // Atribui os elementos do DOM às variáveis do módulo
  corpoTabela = document.getElementById("corpo-tabela-planos-admin");
  modalVisualizar = document.getElementById("modal-visualizar-plano");
  modalEditar = document.getElementById("modal-editar-plano");
  filtroOficina = document.getElementById("filtro-planos-oficina");
  filtroProfessor = document.getElementById("filtro-planos-professor");
  btnImprimir = document.getElementById("btn-imprimir-planos");
  formEditarPlano = document.getElementById("form-editar-plano");

  if (!corpoTabela || !modalVisualizar || !modalEditar) {
    console.error("ERRO CRÍTICO: Elementos essenciais da página de gerenciamento de planos não foram encontrados.");
    return;
  }

  // Adiciona os listeners de eventos uma única vez
  adicionarEventListeners();

  // Carrega os dados iniciais
  carregarPlanosDeAula();
}

// --- Funções de Carregamento e Renderização ---
async function carregarPlanosDeAula() {
  corpoTabela.innerHTML = `<tr><td colspan="5">Carregando planos de aula...</td></tr>`;
  try {
    const querySnapshot = await getDocs(collection(db, "planosDeAula"));
    todosOsPlanos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    todosOsPlanos.sort((a, b) => new Date(b.data) - new Date(a.data)); // Ordena por data
    renderizarTabela(todosOsPlanos);
    carregarFiltros(todosOsPlanos);
  } catch (error) {
    console.error("Erro ao buscar planos de aula:", error);
    corpoTabela.innerHTML = `<tr><td colspan="5">Ocorreu um erro ao carregar os dados. Tente novamente.</td></tr>`;
  }
}

function renderizarTabela(planos) {
  corpoTabela.innerHTML = "";
  if (planos.length === 0) {
    corpoTabela.innerHTML = `<tr><td colspan="5">Nenhum plano de aula encontrado.</td></tr>`;
    return;
  }
  planos.forEach(plano => {
    const tr = document.createElement("tr");
    tr.dataset.planoId = plano.id;
    tr.innerHTML = `
      <td>${plano.data ? new Date(plano.data + 'T00:00:00').toLocaleDateString('pt-BR') : "N/A"}</td>
      <td>${plano.titulo || "Sem Título"}</td>
      <td>${plano.oficina || "N/A"}</td>
      <td>${plano.professor || "Não atribuído"}</td>
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
  const oficinas = [...new Set(planos.map(p => p.oficina).filter(Boolean))].sort();
  filtroOficina.innerHTML = `<option value="">Todas as Oficinas</option>`;
  oficinas.forEach(oficina => {
    filtroOficina.innerHTML += `<option value="${oficina}">${oficina}</option>`;
  });
}

function aplicarFiltros() {
  const oficina = filtroOficina.value;
  const professor = filtroProfessor.value.toLowerCase();
  const planosFiltrados = todosOsPlanos.filter(p => 
    (!oficina || p.oficina === oficina) &&
    (!professor || (p.professor && p.professor.toLowerCase().includes(professor)))
  );
  renderizarTabela(planosFiltrados);
}

// --- Funções de Abertura dos Modais ---
async function abrirModalVisualizar(planoId) {
  const tituloModal = document.getElementById("modal-plano-titulo");
  const conteudoModal = document.getElementById("modal-plano-conteudo");
  
  tituloModal.textContent = "Carregando...";
  conteudoModal.innerHTML = '<p>Buscando informações do plano...</p>';
  modalVisualizar.style.display = "flex";
  
  try {
    const docRef = doc(db, "planosDeAula", planoId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const dados = docSnap.data();
      tituloModal.textContent = dados.titulo;
      conteudoModal.innerHTML = `
        <p><strong>Oficina:</strong> ${dados.oficina || "N/A"}</p>
        <p><strong>Professor:</strong> ${dados.professor || "N/A"}</p>
        <p><strong>Data:</strong> ${dados.data ? new Date(dados.data + 'T00:00:00').toLocaleDateString('pt-BR') : "N/A"}</p><hr>
        <p><strong>Objetivos:</strong></p><p>${dados.objetivos || "Não informado."}</p>
        <p><strong>Materiais:</strong></p><p>${dados.materiais || "Não informado."}</p>
        <p><strong>Desenvolvimento:</strong></p><p>${dados.desenvolvimento || "Não informado."}</p>
        <p><strong>Avaliação:</strong></p><p>${dados.avaliacao || "Não informado."}</p>
      `;
    } else {
      tituloModal.textContent = "Erro";
      conteudoModal.innerHTML = '<p>Plano de aula não encontrado no banco de dados.</p>';
    }
  } catch (error) {
    tituloModal.textContent = "Erro";
    conteudoModal.innerHTML = '<p>Ocorreu um erro ao buscar os detalhes do plano.</p>';
  }
}

async function abrirModalEdicao(planoId) {
  formEditarPlano.reset();
  modalEditar.style.display = "flex";
  try {
    const docRef = doc(db, "planosDeAula", planoId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const dados = docSnap.data();
      // Preenche todos os campos do formulário de edição
      formEditarPlano.querySelector("#editar-plano-id").value = planoId;
      formEditarPlano.querySelector("#editar-plano-titulo").value = dados.titulo || '';
      formEditarPlano.querySelector("#editar-plano-professor").value = dados.professor || '';
      formEditarPlano.querySelector("#editar-plano-data").value = dados.data || '';
      formEditarPlano.querySelector("#editar-plano-objetivos").value = dados.objetivos || '';
      formEditarPlano.querySelector("#editar-plano-materiais").value = dados.materiais || '';
      formEditarPlano.querySelector("#editar-plano-descricao").value = dados.desenvolvimento || '';
      formEditarPlano.querySelector("#editar-plano-avaliacao").value = dados.avaliacao || '';
      
      const selectOficina = formEditarPlano.querySelector("#editar-plano-oficina");
      const oficinas = [...new Set(todosOsPlanos.map(p => p.oficina).filter(Boolean))].sort();
      selectOficina.innerHTML = '<option value="">Selecione uma oficina</option>';
      oficinas.forEach(o => {
          selectOficina.innerHTML += `<option value="${o}">${o}</option>`;
      });
      selectOficina.value = dados.oficina || '';
    } else {
      mostrarNotificacao("Plano não encontrado para edição.", "erro");
      fecharModalEdicao();
    }
  } catch (error) {
    mostrarNotificacao("Erro ao carregar dados para edição.", "erro");
    fecharModalEdicao();
  }
}

// --- Funções de Ação (Salvar, Excluir, Imprimir) ---
async function salvarEdicao(event) {
  event.preventDefault();
  const btn = formEditarPlano.querySelector("#btn-salvar-edicao");
  btn.disabled = true;
  btn.textContent = "Salvando...";

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

  try {
    await updateDoc(doc(db, "planosDeAula", planoId), dadosAtualizados);
    mostrarNotificacao("Plano atualizado com sucesso!", "sucesso");
    fecharModalEdicao();
    carregarPlanosDeAula();
  } catch (error) {
    mostrarNotificacao("Erro ao atualizar o plano.", "erro");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar Alterações";
  }
}

async function excluirPlano(planoId) {
  if (!confirm("Tem certeza que deseja excluir este plano de aula? Esta ação não pode ser desfeita.")) return;
  try {
    await deleteDoc(doc(db, "planosDeAula", planoId));
    mostrarNotificacao("Plano excluído com sucesso!", "sucesso");
    carregarPlanosDeAula();
  } catch (error) {
    mostrarNotificacao("Erro ao excluir o plano.", "erro");
  }
}

function imprimirLista() {
  const tabela = document.getElementById('tabela-planos-admin');
  if (!tabela) return;
  const tabelaParaImprimir = tabela.cloneNode(true);
  tabelaParaImprimir.querySelectorAll('tr').forEach(tr => tr.deleteCell(-1)); // Remove a coluna "Ações"
  const estilo = `<style>body{font-family:sans-serif;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}h1{font-size:24px;}</style>`;
  const win = window.open('', '', 'height=800,width=1000');
  win.document.write(`<html><head><title>Lista de Planos de Aula</title>${estilo}</head><body><h1>Lista de Planos de Aula</h1>${tabelaParaImprimir.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

// --- Central de Event Listeners ---
function adicionarEventListeners() {
  filtroOficina.addEventListener("change", aplicarFiltros);
  filtroProfessor.addEventListener("input", aplicarFiltros);
  btnImprimir.addEventListener("click", imprimirLista);
  formEditarPlano.addEventListener("submit", salvarEdicao);

  // Listener principal na tabela para delegar eventos
  corpoTabela.addEventListener("click", (event) => {
    const target = event.target.closest("a");
    if (!target) return;
    event.preventDefault();
    const planoId = target.closest("tr").dataset.planoId;
    if (!planoId) return;

    if (target.classList.contains("acao-visualizar")) abrirModalVisualizar(planoId);
    if (target.classList.contains("acao-editar")) abrirModalEdicao(planoId);
    if (target.classList.contains("acao-excluir")) excluirPlano(planoId);
  });

  // Listeners para fechar os modais
  document.getElementById("modal-visualizar-plano-fechar").addEventListener("click", fecharModalVisualizar);
  document.getElementById("modal-editar-plano-fechar").addEventListener("click", fecharModalEdicao);
  modalVisualizar.addEventListener("click", (e) => { if (e.target === modalVisualizar) fecharModalVisualizar(); });
  modalEditar.addEventListener("click", (e) => { if (e.target === modalEditar) fecharModalEdicao(); });
}
