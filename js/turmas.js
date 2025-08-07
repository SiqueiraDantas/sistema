// js/turmas.js (versão final com correção do modal e container - DEBUG)
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let todosOsAlunos = [];
let currentContainer; // Variável para armazenar o container do módulo

export function init(container ) { // Agora init recebe o container
  console.log("✅ Módulo de Turmas v6.1 (Botão Editar Corrigido) inicializado!");
  console.log("DEBUG: Container recebido na init:", container);

  if (!container) {
    console.error("❌ ERRO CRÍTICO: 'container' é undefined na função init de turmas.js");
    return;
  }

  currentContainer = container; // Armazena o container

  const filtroTurma = currentContainer.querySelector("#filtroTurma");
  const filtroNome = currentContainer.querySelector("#filtroNome");
  const btnImprimir = currentContainer.querySelector("#btn-imprimir-tabela");

  if (!filtroTurma || !filtroNome || !btnImprimir) {
    console.error("❌ Erro fatal: Elementos de filtro ou impressão não encontrados no container. Verifique o HTML do módulo de turmas.");
    return;
  }

  filtroTurma.addEventListener("change", () => renderizarTabela(currentContainer));
  filtroNome.addEventListener("input", () => renderizarTabela(currentContainer));
  btnImprimir.addEventListener("click", () => window.print());

  carregarDadosIniciais(currentContainer);
}

async function carregarDadosIniciais(container) {
  console.log("DEBUG: Container recebido em carregarDadosIniciais:", container);
  if (!container) {
    console.error("❌ ERRO CRÍTICO: 'container' é undefined em carregarDadosIniciais.");
    return;
  }

  const corpoTabelaTurmas = container.querySelector("#corpoTabelaTurmas");
  if (corpoTabelaTurmas) corpoTabelaTurmas.innerHTML = '<tr><td colspan="4">Carregando dados...</td></tr>';
  
  try {
    const snapshot = await getDocs(collection(db, "matriculas"));
    todosOsAlunos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    todosOsAlunos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    carregarOficinasUnicas(container);
    renderizarTabela(container);
  } catch (error) {
    console.error("❌ Erro ao carregar dados do Firestore:", error);
    if (corpoTabelaTurmas) corpoTabelaTurmas.innerHTML = '<tr><td colspan="4">Falha ao carregar dados.</td></tr>';
  }
}

function renderizarTabela(container) {
  console.log("DEBUG: Container recebido em renderizarTabela:", container);
  if (!container) {
    console.error("❌ ERRO CRÍTICO: 'container' é undefined em renderizarTabela.");
    return;
  }

  const corpoTabelaTurmas = container.querySelector("#corpoTabelaTurmas");
  const filtroTurma = container.querySelector("#filtroTurma");
  const filtroNome = container.querySelector("#filtroNome");

  if (!filtroTurma || !filtroNome || !corpoTabelaTurmas) {
    console.error("❌ Erro: Elementos de filtro ou corpo da tabela não encontrados em renderizarTabela.");
    return;
  }

  const oficinaSelecionada = filtroTurma.value;
  const nomePesquisado = filtroNome.value.toLowerCase();

  const alunosFiltrados = todosOsAlunos.filter(aluno => {
    const nomeDoAluno = (aluno.nome || "").toLowerCase();
    const pertenceAOficina = !oficinaSelecionada || (aluno.oficinas && aluno.oficinas.includes(oficinaSelecionada));
    const correspondeAoNome = nomeDoAluno.includes(nomePesquisado);
    return pertenceAOficina && correspondeAoNome;
  });

  corpoTabelaTurmas.innerHTML = "";
  if (alunosFiltrados.length === 0) {
    corpoTabelaTurmas.innerHTML = `<tr><td colspan="4">Nenhum aluno encontrado.</td></tr>`;
    return;
  }

  alunosFiltrados.forEach(aluno => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td data-label="Matrícula">${aluno.numeroMatricula || 'N/A'}</td>
      <td data-label="Nome">${aluno.nome || 'N/A'}</td>
      <td data-label="Oficinas">${(aluno.oficinas || []).join(', ') || 'Nenhuma'}</td>
      <td data-label="Ações">
        <button class="btn-acao editar" data-id="${aluno.id}" data-nome="${aluno.nome}">
          <i class="fas fa-pencil-alt"></i> Editar
        </button>
      </td>
    `;
    corpoTabelaTurmas.appendChild(linha);
  });

  // Adiciona o event listener APENAS UMA VEZ para os botões de edição
  // e passa o container para a função abrirModalEdicao
  container.querySelectorAll('.btn-acao.editar').forEach(button => {
    button.addEventListener('click', (e) => {
      const alunoId = e.currentTarget.getAttribute('data-id');
      const alunoNome = e.currentTarget.getAttribute('data-nome');
      abrirModalEdicao(alunoId, alunoNome, container); // Passa o container
    });
  });
}

function carregarOficinasUnicas(container) {
  console.log("DEBUG: Container recebido em carregarOficinasUnicas:", container);
  if (!container) {
    console.error("❌ ERRO CRÍTICO: 'container' é undefined em carregarOficinasUnicas.");
    return;
  }

  const filtroElement = container.querySelector("#filtroTurma");
  if (!filtroElement) {
    console.error("❌ Erro: Elemento #filtroTurma não encontrado em carregarOficinasUnicas.");
    return;
  }

  const oficinasSet = new Set();
  todosOsAlunos.forEach(aluno => {
    if (aluno.oficinas) aluno.oficinas.forEach(o => oficinasSet.add(o.trim()));
  });
  const oficinasOrdenadas = Array.from(oficinasSet).sort();
  filtroElement.innerHTML = '<option value="">Todas</option>';
  oficinasOrdenadas.forEach(oficina => {
    const option = document.createElement("option");
    option.value = oficina;
    option.textContent = oficina;
    filtroElement.appendChild(option);
  });
}

async function abrirModalEdicao(alunoId, alunoNome, container) { // Agora recebe o container
  console.log("DEBUG: Container recebido em abrirModalEdicao:", container);
  if (!container) {
    console.error("❌ ERRO CRÍTICO: 'container' é undefined em abrirModalEdicao.");
    return;
  }

  const modal = container.querySelector('#modal-editar-oficinas');
  const nomeAlunoSpan = container.querySelector('#modal-nome-aluno');
  const selectOficinas = container.querySelector('#modal-select-oficinas');
  const btnSalvar = container.querySelector('#modal-btn-salvar');
  const btnClose = container.querySelector('.modal-close');
  
  if (!modal || !nomeAlunoSpan || !selectOficinas || !btnSalvar || !btnClose) {
      console.error("Erro crítico: Não foi possível encontrar todos os elementos do modal no DOM dentro do container. Verifique o HTML do modal.");
      alert("Ocorreu um erro ao tentar abrir a janela de edição. Verifique o console para mais detalhes.");
      return;
  }

  nomeAlunoSpan.textContent = alunoNome;
  
  try {
    const alunoParaEditar = todosOsAlunos.find(aluno => aluno.id === alunoId);
    if (!alunoParaEditar) throw new Error("Aluno não encontrado na lista local.");

    const oficinasAtuais = alunoParaEditar.oficinas || [];
    const todasOficinas = new Set();
    todosOsAlunos.forEach(aluno => {
      if(aluno.oficinas) aluno.oficinas.forEach(o => todasOficinas.add(o.trim()));
    });

    selectOficinas.innerHTML = '';
    // Habilita seleção múltipla no HTML do modal se ainda não estiver
    selectOficinas.setAttribute('multiple', 'multiple'); 
    selectOficinas.size = Math.min(10, todasOficinas.size > 0 ? todasOficinas.size : 3); // Ajusta o tamanho visível

    todasOficinas.forEach(oficina => {
      const option = document.createElement('option');
      option.value = oficina;
      option.textContent = oficina;
      option.selected = oficinasAtuais.includes(oficina); // Marca as oficinas que o aluno já tem
      selectOficinas.appendChild(option);
    });

    modal.classList.add('visible');

    const fecharModal = () => modal.classList.remove('visible');
    btnClose.onclick = fecharModal;
    modal.onclick = (e) => { if (e.target === modal) fecharModal(); };

    // Remove qualquer listener anterior para evitar duplicação
    btnSalvar.replaceWith(btnSalvar.cloneNode(true)); 
    const newBtnSalvar = container.querySelector('#modal-btn-salvar'); // Pega a nova referência

    newBtnSalvar.addEventListener('click', async () => {
      const oficinasSelecionadas = Array.from(selectOficinas.selectedOptions).map(opt => opt.value);
      try {
        const alunoRef = doc(db, "matriculas", alunoId);
        await updateDoc(alunoRef, { oficinas: oficinasSelecionadas });
        alert('Oficinas atualizadas com sucesso!');
        fecharModal();
        carregarDadosIniciais(currentContainer); // Recarrega os dados com o container correto
      } catch (error) {
        console.error("Erro ao ATUALIZAR oficinas:", error);
        alert('Falha ao atualizar as oficinas.');
      }
    });

  } catch (error) {
    console.error("Erro ao ABRIR MODAL de edição:", error);
    alert("Não foi possível carregar os dados do aluno para edição.");
  }
}
