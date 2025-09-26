// js/turmas_adm.js — ADM (com botão Editar Oficinas)
import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dadosMatriculas = []; // [{ id, ...data }]
let corpoTabela, filtroOficina, filtroProfessor;

// refs do modal
let modalEl, modalCloseEl, modalNomeEl, modalSelectEl, modalSalvarEl;
let alunoEdicaoId = null;

export function init() {
  console.log("✅ Módulo de Turmas (Admin) inicializado!");

  corpoTabela = document.getElementById('corpo-tabela-turmas');
  filtroOficina = document.getElementById('filtro-oficina-turmas');
  filtroProfessor = document.getElementById('filtro-professor-turmas');

  modalEl = document.getElementById('modal-editar-oficinas-adm');
  modalCloseEl = modalEl ? modalEl.querySelector('.modal-close') : null;
  modalNomeEl = document.getElementById('adm-modal-nome-aluno');
  modalSelectEl = document.getElementById('adm-modal-select-oficinas');
  modalSalvarEl = document.getElementById('adm-modal-btn-salvar');

  if (modalCloseEl) modalCloseEl.addEventListener('click', fecharModal);
  if (modalEl) {
    modalEl.addEventListener('click', function(e){
      if (e.target === modalEl) fecharModal();
    });
  }
  if (modalSalvarEl) {
    modalSalvarEl.addEventListener('click', salvarEdicaoOficinas);
  }

  carregarDadosMatriculas();
  adicionarEventListeners();
}

function adicionarEventListeners() {
  if (filtroOficina) filtroOficina.addEventListener('change', aplicarFiltros);
  if (filtroProfessor) filtroProfessor.addEventListener('input', aplicarFiltros);
}

async function carregarDadosMatriculas() {
  try {
    if (corpoTabela) corpoTabela.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
    const querySnapshot = await getDocs(collection(db, "matriculas"));
    dadosMatriculas = [];
    querySnapshot.forEach(d => {
      dadosMatriculas.push({ id: d.id, ...d.data() });
    });
    // Ordena por nome de aluno
    dadosMatriculas.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    popularFiltroOficinas();
    popularTabela(dadosMatriculas);
  } catch (error) {
    console.error("❌ Erro ao carregar matrículas:", error);
    if (corpoTabela) {
      corpoTabela.innerHTML = '<tr><td colspan="6">Erro ao carregar dados.</td></tr>';
    }
  }
}

function popularFiltroOficinas() {
  if (!filtroOficina) return;
  const setOficinas = new Set();
  for (let i = 0; i < dadosMatriculas.length; i++) {
    const m = dadosMatriculas[i];
    if (m && Array.isArray(m.oficinas)) {
      for (let j = 0; j < m.oficinas.length; j++) {
        const o = (m.oficinas[j] || "").trim();
        if (o) setOficinas.add(o);
      }
    }
  }
  const ordenadas = Array.from(setOficinas).sort();
  filtroOficina.innerHTML = '<option value="">Todas</option>';
  for (let k = 0; k < ordenadas.length; k++) {
    const op = document.createElement('option');
    op.value = ordenadas[k];
    op.textContent = ordenadas[k];
    filtroOficina.appendChild(op);
  }
}

function popularTabela(dados) {
  if (!corpoTabela) return;

  if (!dados || dados.length === 0) {
    corpoTabela.innerHTML = '<tr><td colspan="6">Nenhuma matrícula encontrada.</td></tr>';
    return;
  }

  let html = '';
  for (let i = 0; i < dados.length; i++) {
    const m = dados[i];
    const nomeAluno = m && m.nome ? m.nome : 'N/A';

    const resp = (m && m.responsavel) ? m.responsavel : {};
    const nomeResp = resp && resp.nome ? resp.nome : 'N/A';
    const telResp = resp && resp.telefone ? resp.telefone : 'N/A';

    const oficinasStr = (m && Array.isArray(m.oficinas)) ? m.oficinas.join(', ') : 'N/A';
    const professores = 'A definir'; // placeholder

    html += `
      <tr>
        <td>${escapeHTML(nomeAluno)}</td>
        <td>${escapeHTML(nomeResp)}</td>
        <td>${escapeHTML(telResp)}</td>
        <td>${escapeHTML(oficinasStr)}</td>
        <td>${professores}</td>
        <td>
          <button class="btn-acao editar" data-id="${m.id}" data-nome="${encodeHTMLAttr(nomeAluno)}">
            <i class="fas fa-pencil-alt"></i> Editar
          </button>
        </td>
      </tr>
    `;
  }
  corpoTabela.innerHTML = html;

  // listeners do botão Editar
  const botoes = corpoTabela.querySelectorAll('.btn-acao.editar');
  for (let b = 0; b < botoes.length; b++) {
    botoes[b].addEventListener('click', onClickEditar);
  }
}

function aplicarFiltros() {
  const oficinaSelecionada = (filtroOficina && filtroOficina.value) ? filtroOficina.value.toLowerCase() : "";
  // ainda não filtramos por professor até integrar o dado
  let dados = dadosMatriculas;

  if (oficinaSelecionada) {
    dados = dados.filter(m => {
      if (!m || !Array.isArray(m.oficinas)) return false;
      for (let i = 0; i < m.oficinas.length; i++) {
        const o = (m.oficinas[i] || "").toLowerCase();
        if (o.indexOf(oficinaSelecionada) !== -1) return true;
      }
      return false;
    });
  }
  popularTabela(dados);
}

// ======= Edição (modal) =======
function onClickEditar(e) {
  const btn = e.currentTarget;
  const id = btn.getAttribute('data-id');
  const nome = btn.getAttribute('data-nome') || '';

  const reg = dadosMatriculas.find(x => x.id === id);
  if (!reg) {
    alert("Registro não encontrado.");
    return;
  }
  alunoEdicaoId = id;

  if (modalNomeEl) modalNomeEl.textContent = nome;

  // montar lista de oficinas (todas as que aparecem no dataset)
  const setOficinas = new Set();
  for (let i = 0; i < dadosMatriculas.length; i++) {
    const m = dadosMatriculas[i];
    if (m && Array.isArray(m.oficinas)) {
      for (let j = 0; j < m.oficinas.length; j++) {
        const o = (m.oficinas[j] || "").trim();
        if (o) setOficinas.add(o);
      }
    }
  }
  const todas = Array.from(setOficinas).sort();

  if (modalSelectEl) {
    modalSelectEl.innerHTML = "";
    modalSelectEl.setAttribute('multiple', 'multiple');
    modalSelectEl.size = Math.min(10, Math.max(3, todas.length));
    const atuais = Array.isArray(reg.oficinas) ? reg.oficinas : [];
    for (let k = 0; k < todas.length; k++) {
      const opt = document.createElement('option');
      opt.value = todas[k];
      opt.textContent = todas[k];
      if (atuais.indexOf(todas[k]) !== -1) opt.selected = true;
      modalSelectEl.appendChild(opt);
    }
  }

  abrirModal();
}

function abrirModal() {
  if (modalEl) modalEl.classList.add('visible');
}

function fecharModal() {
  if (modalEl) modalEl.classList.remove('visible');
  alunoEdicaoId = null;
}

async function salvarEdicaoOficinas() {
  if (!alunoEdicaoId) return;
  if (!modalSelectEl) return;

  const selecionadas = [];
  for (let i = 0; i < modalSelectEl.options.length; i++) {
    const op = modalSelectEl.options[i];
    if (op.selected) selecionadas.push(op.value);
  }

  try {
    const ref = doc(db, "matriculas", alunoEdicaoId);
    await updateDoc(ref, { oficinas: selecionadas });
    alert("Oficinas atualizadas com sucesso!");

    // Atualiza cache local
    const idx = dadosMatriculas.findIndex(x => x.id === alunoEdicaoId);
    if (idx !== -1) dadosMatriculas[idx].oficinas = selecionadas.slice();

    fecharModal();
    aplicarFiltros(); // rerender
  } catch (e) {
    console.error("Erro ao atualizar oficinas:", e);
    alert("Falha ao atualizar as oficinas. Verifique o console.");
  }
}

// ======= helpers =======
function escapeHTML(str) {
  str = String(str || "");
  return str.replace(/[&<>"']/g, function(m){
    switch(m){
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return m;
    }
  });
}
function encodeHTMLAttr(str){
  // simples, reutiliza escapeHTML
  return escapeHTML(str);
}
