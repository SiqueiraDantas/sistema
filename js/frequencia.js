// js/frequencia.js (NOMES EM CAPSLOCK + SEM BARRAS NO ID DO DOC)
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, getDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mostrarNotificacao } from './notificacao.js';

// --- Normalização: CAIXA ALTA ---
function upperize(str){
  return String(str || "").normalize("NFC").toLocaleUpperCase("pt-BR");
}

// --- Variáveis de escopo do módulo ---
let containerElement = null;
let turmaSelect, dataInput, salvarBtn, corpoTabela, filtroDistritoContainer, distritoSelect;

export function init(container) {
  console.log("✅ Módulo de Frequência (Professor) — NOMES EM CAPS + Filtro de Distrito");
  containerElement = container;

  // Seleção dos elementos do DOM
  turmaSelect = container.querySelector("#turmaSelect");
  dataInput = container.querySelector("#dataAula");
  salvarBtn = container.querySelector("#salvarBtn");
  corpoTabela = container.querySelector("#corpoTabela");
  filtroDistritoContainer = container.querySelector("#filtroDistritoContainer");
  distritoSelect = container.querySelector("#distritoSelect");

  if (!turmaSelect || !dataInput || !salvarBtn || !corpoTabela || !filtroDistritoContainer || !distritoSelect) {
    console.error("❌ Erro fatal: Elementos essenciais de frequência não encontrados.");
    return;
  }

  // Adiciona os listeners
  turmaSelect.addEventListener("change", handleOficinaChange);
  dataInput.addEventListener("change", verificarEcarregarAlunos);
  distritoSelect.addEventListener("change", verificarEcarregarAlunos);
  salvarBtn.addEventListener("click", salvarFrequenciaAgrupada);

  carregarOficinasUnicas();
}

async function carregarOficinasUnicas() {
  try {
    const snapshot = await getDocs(collection(db, "matriculas"));
    const oficinasSet = new Set();
    snapshot.forEach(doc => {
      const aluno = doc.data();
      if (aluno.oficinas) aluno.oficinas.forEach(oficina => oficinasSet.add(oficina.trim()));
    });
    const oficinasOrdenadas = Array.from(oficinasSet)
      .sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"}));
    turmaSelect.innerHTML = '<option value="">Selecione uma oficina</option>';
    oficinasOrdenadas.forEach(oficina => {
      turmaSelect.innerHTML += `<option value="${oficina}">${oficina}</option>`;
    });
  } catch (error) {
    console.error("❌ Erro ao carregar oficinas:", error);
  }
}

function handleOficinaChange() {
  const oficina = turmaSelect.value;
  if (oficina === "Percussão/Fanfarra") {
    filtroDistritoContainer.style.display = "block";
  } else {
    filtroDistritoContainer.style.display = "none";
    distritoSelect.value = ""; // Limpa a seleção do distrito quando a oficina muda
  }
  verificarEcarregarAlunos();
}

function determinarDistrito(bairroAluno) {
  const distritosEspecificos = ["Macaoca", "Cajazeiras", "União", "Cacimba Nova", "Paus Branco"];
  if (distritosEspecificos.includes(bairroAluno)) return bairroAluno;
  return "Sede";
}

// Sanitiza o nome da oficina para uso no ID do documento
function sanitizarNomeOficina(nomeOficina) {
  return nomeOficina.replace(/\//g, '_'); // Substitui barras por underscores
}

async function verificarEcarregarAlunos() {
  const oficina = turmaSelect.value;
  const dataSelecionada = dataInput.value;
  const distritoSelecionado = distritoSelect.value;

  corpoTabela.innerHTML = "";
  salvarBtn.style.display = 'none';

  if (!oficina || !dataSelecionada) return;

  // Percussão/Fanfarra exige distrito
  if (oficina === "Percussão/Fanfarra" && !distritoSelecionado) {
    corpoTabela.innerHTML = `<tr><td colspan="2">Selecione um distrito/turma para Percussão/Fanfarra.</td></tr>`;
    return;
  }

  // ID do doc sem barras
  const oficinaSanitizada = sanitizarNomeOficina(oficina);
  const docId = (oficina === "Percussão/Fanfarra" && distritoSelecionado)
    ? `${dataSelecionada}_${oficinaSanitizada}_${distritoSelecionado}`
    : `${dataSelecionada}_${oficinaSanitizada}`;

  const frequenciaRef = doc(db, "frequencias", docId);

  try {
    const docSnap = await getDoc(frequenciaRef);

    if (docSnap.exists()) {
      const dataFormatada = new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR');
      const distritoTexto = (oficina === "Percussão/Fanfarra" && distritoSelecionado) ? ` (${distritoSelecionado})` : '';
      corpoTabela.innerHTML = `<tr><td colspan="2" style="text-align: center; background-color: #fffbe6;">A frequência para esta turma${distritoTexto} já foi registrada no dia ${dataFormatada}.</td></tr>`;
      return;
    }

    salvarBtn.style.display = 'block';
    
    // Busca alunos da oficina
    const qAlunos = query(collection(db, "matriculas"), where("oficinas", "array-contains", oficina));
    const snapshotAlunos = await getDocs(qAlunos);
    
    let alunos = snapshotAlunos.docs.map(doc => {
      const data = { id: doc.id, ...doc.data() };
      return { ...data, _nomeCaps: upperize(data.nome || "") };
    });

    // Filtro de distrito para Percussão/Fanfarra
    if (oficina === "Percussão/Fanfarra" && distritoSelecionado) {
      alunos = alunos.filter(aluno => {
        const distritoDoAluno = determinarDistrito(aluno.bairro);
        return distritoDoAluno === distritoSelecionado;
      });
    }

    // Ordena por nome (CAPS)
    alunos.sort((a, b) =>
      (a._nomeCaps || "").localeCompare(b._nomeCaps || "", "pt-BR", { sensitivity: "base" })
    );

    if (alunos.length === 0) {
      const distritoTexto = (oficina === "Percussão/Fanfarra" && distritoSelecionado) ? ` no distrito ${distritoSelecionado}` : '';
      corpoTabela.innerHTML = `<tr><td colspan="2">Nenhum aluno encontrado para esta oficina${distritoTexto}.</td></tr>`;
      salvarBtn.style.display = 'none';
      return;
    }

    alunos.forEach(aluno => {
      const linha = document.createElement("tr");
      linha.dataset.alunoId = aluno.id;
      // guardamos já em CAPS (para salvar assim)
      linha.dataset.alunoNome = aluno._nomeCaps;
      linha.innerHTML = `
        <td>${aluno._nomeCaps}</td>
        <td class="status-cell">
          <button class="btn-status presente" data-status="presente">Presente</button>
          <button class="btn-status falta ativo" data-status="falta">Falta</button>
        </td>
      `;
      corpoTabela.appendChild(linha);
    });

    corpoTabela.querySelectorAll('.btn-status').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const statusCell = e.target.parentElement;
        statusCell.querySelectorAll('.btn-status').forEach(b => b.classList.remove('ativo'));
        e.target.classList.add('ativo');
      });
    });

  } catch (error) {
    console.error("❌ Erro ao verificar/carregar alunos:", error);
    corpoTabela.innerHTML = `<tr><td colspan="2">Ocorreu um erro ao carregar os dados.</td></tr>`;
  }
}

async function salvarFrequenciaAgrupada() {
  const oficina = turmaSelect.value;
  const dataSelecionada = dataInput.value;
  const distritoSelecionado = distritoSelect.value;

  if (!dataSelecionada || !oficina) {
    mostrarNotificacao("Preencha a Oficina e a Data da Aula.", "erro");
    return;
  }

  if (oficina === "Percussão/Fanfarra" && !distritoSelecionado) {
    mostrarNotificacao("Selecione um distrito/turma para Percussão/Fanfarra.", "erro");
    return;
  }

  const listaDeAlunos = [];
  const linhas = corpoTabela.querySelectorAll("tr");

  linhas.forEach(linha => {
    if (linha.dataset.alunoId) {
      const botaoAtivo = linha.querySelector('.btn-status.ativo');
      listaDeAlunos.push({
        id: linha.dataset.alunoId,
        // salva o nome já EM CAPS
        nome: upperize(linha.dataset.alunoNome),
        status: botaoAtivo ? botaoAtivo.dataset.status : 'nao_marcado'
      });
    }
  });

  if (listaDeAlunos.some(aluno => aluno.status === 'nao_marcado')) {
    mostrarNotificacao("Marque o status (Presente/Falta) para todos os alunos.", "erro");
    return;
  }

  salvarBtn.disabled = true;
  salvarBtn.textContent = "Salvando...";

  // ID sem barras
  const oficinaSanitizada = sanitizarNomeOficina(oficina);
  const docId = (oficina === "Percussão/Fanfarra" && distritoSelecionado)
    ? `${dataSelecionada}_${oficinaSanitizada}_${distritoSelecionado}`
    : `${dataSelecionada}_${oficinaSanitizada}`;

  const frequenciaRef = doc(db, "frequencias", docId);

  const [ano, mes, dia] = dataSelecionada.split('-');
  const dataFormatada = `${dia}/${mes}/${ano}`;

  try {
    await setDoc(frequenciaRef, {
      data: dataFormatada,
      oficina: oficina, // mantém o nome original da oficina nos dados
      distrito: (oficina === "Percussão/Fanfarra") ? distritoSelecionado : null,
      // professor EM CAPS
      professor: upperize(auth.currentUser?.displayName || "Não identificado"),
      alunos: listaDeAlunos,
      salvoEm: Timestamp.now()
    });

    mostrarNotificacao("Frequência registrada com sucesso!", "sucesso");
    
    const distritoTexto = (oficina === "Percussão/Fanfarra" && distritoSelecionado) ? ` (${distritoSelecionado})` : '';
    corpoTabela.innerHTML = `<tr><td colspan="2" style="text-align: center; background-color: #e8f5e9;">Frequência salva${distritoTexto}! Selecione outra oficina ou data.</td></tr>`;
    salvarBtn.style.display = 'none';

  } catch (error) {
    console.error("❌ Erro ao salvar frequência:", error);
    mostrarNotificacao("Falha ao salvar a frequência. Tente novamente.", "erro");
  } finally {
    salvarBtn.disabled = false;
    salvarBtn.textContent = "Salvar Frequência";
  }
}
