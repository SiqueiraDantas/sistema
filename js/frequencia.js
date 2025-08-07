// js/frequencia.js (VERSÃO CORRIGIDA - SEM BARRAS NO ID DO DOCUMENTO)
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, getDoc, query, where, Timestamp, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mostrarNotificacao } from './notificacao.js';

// --- Variáveis de escopo do módulo ---
let containerElement = null;
let turmaSelect, dataInput, salvarBtn, corpoTabela, filtroDistritoContainer, distritoSelect;

export function init(container ) {
  console.log("✅ Módulo de Frequência (Professor) com Filtro de Distrito inicializado!");
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
    const oficinasOrdenadas = Array.from(oficinasSet).sort();
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
  // Lista dos distritos específicos
  const distritosEspecificos = ["Macaoca", "Cajazeiras", "União", "Cacimba Nova", "Paus Branco"];
  
  // Se o bairro do aluno for um dos distritos específicos, retorna ele mesmo
  if (distritosEspecificos.includes(bairroAluno)) {
    return bairroAluno;
  }
  
  // Caso contrário, considera como "Sede"
  return "Sede";
}

// NOVA FUNÇÃO: Sanitiza o nome da oficina para uso no ID do documento
function sanitizarNomeOficina(nomeOficina) {
  return nomeOficina.replace(/\//g, '_'); // Substitui todas as barras por underscores
}

async function verificarEcarregarAlunos() {
  const oficina = turmaSelect.value;
  const dataSelecionada = dataInput.value;
  const distritoSelecionado = distritoSelect.value;

  corpoTabela.innerHTML = "";
  salvarBtn.style.display = 'none';

  if (!oficina || !dataSelecionada) return;

  // Se for Percussão/Fanfarra e nenhum distrito foi selecionado, não carrega alunos
  if (oficina === "Percussão/Fanfarra" && !distritoSelecionado) {
    corpoTabela.innerHTML = `<tr><td colspan="2">Selecione um distrito/turma para Percussão/Fanfarra.</td></tr>`;
    return;
  }

  // CORREÇÃO: Sanitiza o nome da oficina para evitar barras no ID do documento
  const oficinaSanitizada = sanitizarNomeOficina(oficina);
  
  // Cria o docId baseado na oficina e distrito (se aplicável)
  const docId = oficina === "Percussão/Fanfarra" && distritoSelecionado 
    ? `${dataSelecionada}_${oficinaSanitizada}_${distritoSelecionado}` 
    : `${dataSelecionada}_${oficinaSanitizada}`;
  
  const frequenciaRef = doc(db, "frequencias", docId);

  try {
    const docSnap = await getDoc(frequenciaRef);

    if (docSnap.exists()) {
      const dataFormatada = new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR');
      const distritoTexto = oficina === "Percussão/Fanfarra" && distritoSelecionado ? ` (${distritoSelecionado})` : '';
      corpoTabela.innerHTML = `<tr><td colspan="2" style="text-align: center; background-color: #fffbe6;">A frequência para esta turma${distritoTexto} já foi registrada no dia ${dataFormatada}.</td></tr>`;
      return;
    }

    salvarBtn.style.display = 'block';
    
    // Busca todos os alunos da oficina primeiro
    const qAlunos = query(collection(db, "matriculas"), where("oficinas", "array-contains", oficina));
    const snapshotAlunos = await getDocs(qAlunos);
    
    let alunos = snapshotAlunos.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Se for Percussão/Fanfarra, filtra por distrito
    if (oficina === "Percussão/Fanfarra" && distritoSelecionado) {
      alunos = alunos.filter(aluno => {
        const bairroAluno = aluno.bairro;
        const distritoDoAluno = determinarDistrito(bairroAluno);
        return distritoDoAluno === distritoSelecionado;
      });
    }

    alunos.sort((a, b) => a.nome.localeCompare(b.nome));

    if (alunos.length === 0) {
        const distritoTexto = oficina === "Percussão/Fanfarra" && distritoSelecionado ? ` no distrito ${distritoSelecionado}` : '';
        corpoTabela.innerHTML = `<tr><td colspan="2">Nenhum aluno encontrado para esta oficina${distritoTexto}.</td></tr>`;
        salvarBtn.style.display = 'none';
        return;
    }

    alunos.forEach(aluno => {
      const linha = document.createElement("tr");
      linha.dataset.alunoId = aluno.id;
      linha.dataset.alunoNome = aluno.nome;
      linha.innerHTML = `\n        <td>${aluno.nome}</td>\n        <td class="status-cell">\n          <button class="btn-status presente" data-status="presente">Presente</button>\n          <button class="btn-status falta ativo" data-status="falta">Falta</button>\n        </td>\n      `;
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
        nome: linha.dataset.alunoNome,
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

  // CORREÇÃO: Sanitiza o nome da oficina para evitar barras no ID do documento
  const oficinaSanitizada = sanitizarNomeOficina(oficina);

  // O docId agora pode incluir o distrito para Percussão/Fanfarra
  const docId = oficina === "Percussão/Fanfarra" && distritoSelecionado 
    ? `${dataSelecionada}_${oficinaSanitizada}_${distritoSelecionado}` 
    : `${dataSelecionada}_${oficinaSanitizada}`;

  const frequenciaRef = doc(db, "frequencias", docId);

  const [ano, mes, dia] = dataSelecionada.split('-');
  const dataFormatada = `${dia}/${mes}/${ano}`;

  try {
    await setDoc(frequenciaRef, {
      data: dataFormatada,
      oficina: oficina, // Mantém o nome original da oficina nos dados
      distrito: oficina === "Percussão/Fanfarra" ? distritoSelecionado : null, // Salva o distrito se for Percussão/Fanfarra
      professor: auth.currentUser.displayName || "Não identificado",
      alunos: listaDeAlunos,
      salvoEm: Timestamp.now()
    });

    mostrarNotificacao("Frequência registrada com sucesso!", "sucesso");
    
    const distritoTexto = oficina === "Percussão/Fanfarra" && distritoSelecionado ? ` (${distritoSelecionado})` : '';
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
