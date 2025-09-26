// js/turmas.js — PROFESSOR (somente leitura)
// Removeu: coluna Ações, modal e lógica de edição

import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let todosOsAlunos = [];
let currentContainer = null;

export function init(container) {
  console.log("✅ Turmas (Professor) — somente leitura");
  if (!container) {
    console.error("❌ container ausente em turmas.js (professor)");
    return;
  }
  currentContainer = container;

  const filtroTurma = currentContainer.querySelector("#filtroTurma");
  const filtroNome = currentContainer.querySelector("#filtroNome");
  const btnImprimir = currentContainer.querySelector("#btn-imprimir-tabela");
  if (!filtroTurma || !filtroNome || !btnImprimir) {
    console.error("❌ Elementos do módulo não encontrados (professor)");
    return;
  }

  filtroTurma.addEventListener("change", () => renderizarTabela(currentContainer));
  filtroNome.addEventListener("input", () => renderizarTabela(currentContainer));
  btnImprimir.addEventListener("click", () => window.print());

  carregarDadosIniciais(currentContainer);
}

async function carregarDadosIniciais(container) {
  const corpoTabelaTurmas = container.querySelector("#corpoTabelaTurmas");
  if (corpoTabelaTurmas) {
    corpoTabelaTurmas.innerHTML = '<tr><td colspan="3">Carregando dados...</td></tr>';
  }
  try {
    const snapshot = await getDocs(collection(db, "matriculas"));
    todosOsAlunos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    todosOsAlunos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    carregarOficinasUnicas(container);
    renderizarTabela(container);
  } catch (e) {
    console.error("❌ Erro Firestore:", e);
    if (corpoTabelaTurmas) {
      corpoTabelaTurmas.innerHTML = '<tr><td colspan="3">Falha ao carregar dados.</td></tr>';
    }
  }
}

function carregarOficinasUnicas(container) {
  const filtroElement = container.querySelector("#filtroTurma");
  if (!filtroElement) return;

  const oficinasSet = new Set();
  for (let i = 0; i < todosOsAlunos.length; i++) {
    const aluno = todosOsAlunos[i];
    if (aluno && Array.isArray(aluno.oficinas)) {
      for (let j = 0; j < aluno.oficinas.length; j++) {
        const o = (aluno.oficinas[j] || "").trim();
        if (o) oficinasSet.add(o);
      }
    }
  }
  const oficinasOrdenadas = Array.from(oficinasSet).sort();
  filtroElement.innerHTML = '<option value="">Todas</option>';
  for (let k = 0; k < oficinasOrdenadas.length; k++) {
    const op = document.createElement("option");
    op.value = oficinasOrdenadas[k];
    op.textContent = oficinasOrdenadas[k];
    filtroElement.appendChild(op);
  }
}

function renderizarTabela(container) {
  const corpoTabelaTurmas = container.querySelector("#corpoTabelaTurmas");
  const filtroTurma = container.querySelector("#filtroTurma");
  const filtroNome = container.querySelector("#filtroNome");
  if (!corpoTabelaTurmas || !filtroTurma || !filtroNome) return;

  const oficinaSelecionada = filtroTurma.value;
  const nomePesquisado = (filtroNome.value || "").toLowerCase();

  const alunosFiltrados = todosOsAlunos.filter(aluno => {
    const nomeDoAluno = (aluno.nome || "").toLowerCase();
    const pertenceAOficina = !oficinaSelecionada || (aluno.oficinas && aluno.oficinas.indexOf(oficinaSelecionada) !== -1);
    const correspondeAoNome = nomeDoAluno.indexOf(nomePesquisado) !== -1;
    return pertenceAOficina && correspondeAoNome;
  });

  if (alunosFiltrados.length === 0) {
    corpoTabelaTurmas.innerHTML = '<tr><td colspan="3">Nenhum aluno encontrado.</td></tr>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < alunosFiltrados.length; i++) {
    const aluno = alunosFiltrados[i];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Matrícula">${aluno.numeroMatricula || 'N/A'}</td>
      <td data-label="Nome">${aluno.nome || 'N/A'}</td>
      <td data-label="Oficinas">${Array.isArray(aluno.oficinas) ? aluno.oficinas.join(', ') : 'Nenhuma'}</td>
    `;
    frag.appendChild(tr);
  }
  corpoTabelaTurmas.innerHTML = "";
  corpoTabelaTurmas.appendChild(frag);
}
