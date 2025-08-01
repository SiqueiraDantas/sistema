// 1. IMPORTA O 'db' E AS FUNÇÕES DO FIRESTORE
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2. REFERÊNCIAS AOS ELEMENTOS DO HTML
const filtroTurma = document.getElementById("filtroTurma" );
const corpoTabelaTurmas = document.getElementById("corpoTabelaTurmas");

// 3. FUNÇÕES

async function carregarOficinasUnicas() {
  try {
    // CAMINHO CORRIGIDO FINALMENTE: Acessando 'matriculas' como coleção raiz
    const matriculasCollection = collection(db, "matriculas");
    const snapshot = await getDocs(matriculasCollection);
    const oficinasSet = new Set();

    if (snapshot.empty) {
      console.warn("A coleção 'matriculas' está vazia ou não foi encontrada.");
      return;
    }

    snapshot.forEach(doc => {
      const aluno = doc.data();
      if (aluno.oficinas && Array.isArray(aluno.oficinas)) {
        aluno.oficinas.forEach(oficina => oficinasSet.add(oficina.trim()));
      }
    });

    const oficinasOrdenadas = Array.from(oficinasSet).sort();
    filtroTurma.innerHTML = '<option value="">Todas</option>';
    oficinasOrdenadas.forEach(oficina => {
      const option = document.createElement("option");
      option.value = oficina;
      option.textContent = oficina;
      filtroTurma.appendChild(option);
    });

  } catch (error) {
    console.error("❌ Erro ao carregar oficinas:", error);
  }
}

async function carregarAlunos(oficinaSelecionada = "") {
  corpoTabelaTurmas.innerHTML = '<tr><td colspan="7">Carregando alunos...</td></tr>';
  try {
    // CAMINHO CORRIGIDO FINALMENTE: Acessando 'matriculas' como coleção raiz
    const matriculasCollection = collection(db, "matriculas");
    const snapshot = await getDocs(matriculasCollection);
    const alunos = [];

    if (snapshot.empty) {
      corpoTabelaTurmas.innerHTML = '<tr><td colspan="7">Nenhum aluno encontrado.</td></tr>';
      return;
    }

    snapshot.forEach(doc => {
      const aluno = doc.data();
      const oficinasDoAluno = aluno.oficinas;
      const pertenceAOficina = !oficinaSelecionada || (Array.isArray(oficinasDoAluno) && oficinasDoAluno.includes(oficinaSelecionada));

      if (pertenceAOficina) {
        alunos.push({
          matricula: aluno.numeroMatricula || 'N/A',
          nome: aluno.nome || 'N/A',
          cpf: aluno.cpf || 'N/A',
          escola: aluno.escola || 'N/A',
          responsavel: aluno.responsavel?.nome || 'N/A',
          telefone: aluno.responsavel?.telefone || 'N/A',
          email: aluno.responsavel?.email || 'N/A'
        });
      }
    });

    corpoTabelaTurmas.innerHTML = "";
    if (alunos.length === 0) {
      corpoTabelaTurmas.innerHTML = `<tr><td colspan="7">Nenhum aluno para a oficina: "${oficinaSelecionada}".</td></tr>`;
      return;
    }

    alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    alunos.forEach(aluno => {
      const linha = document.createElement("tr");
      linha.innerHTML = `<td>${aluno.matricula}</td><td>${aluno.nome}</td><td>${aluno.cpf}</td><td>${aluno.escola}</td><td>${aluno.responsavel}</td><td>${aluno.telefone}</td><td>${aluno.email}</td>`;
      corpoTabelaTurmas.appendChild(linha);
    });

  } catch (error) {
    console.error("❌ Erro ao carregar alunos:", error);
    corpoTabelaTurmas.innerHTML = '<tr><td colspan="7">Falha ao carregar dados.</td></tr>';
  }
}

// 4. INICIALIZAÇÃO DA PÁGINA
async function inicializarPagina() {
  filtroTurma.addEventListener("change", (e) => {
    carregarAlunos(e.target.value);
  });
  await carregarOficinasUnicas();
  await carregarAlunos();
}

inicializarPagina();
