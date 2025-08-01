// 1. IMPORTA TUDO O QUE PRECISAMOS DO FIREBASE
import { db, auth, onAuthStateChanged } from './firebase-config.js'; // Importa db e agora também a autenticação
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- GUARDA DE AUTENTICAÇÃO ---
// Este bloco de código verifica se o usuário está logado ANTES de tentar carregar qualquer dado.
onAuthStateChanged(auth, (user ) => {
  if (user) {
    // Se o usuário ESTIVER logado, o código prossegue e inicializa a página.
    console.log("Usuário autenticado. Carregando dados...");
    inicializarPagina();
  } else {
    // Se o usuário NÃO ESTIVER logado, ele é redirecionado para a página de login.
    console.log("Usuário não autenticado. Redirecionando para a página de login.");
    // IMPORTANTE: Altere 'index.html' para o nome exato da sua página de login, se for diferente.
    window.location.href = 'index.html';
  }
});
// --- FIM DO GUARDA ---


// 2. REFERÊNCIAS AOS ELEMENTOS DO HTML
const filtroTurma = document.getElementById("filtroTurma");
const corpoTabelaTurmas = document.getElementById("corpoTabelaTurmas");

// 3. FUNÇÕES (O conteúdo delas permanece o mesmo)

async function carregarOficinasUnicas() {
  try {
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
      linha.innerHTML = `<td data-label="Matrícula">${aluno.matricula}</td><td data-label="Nome">${aluno.nome}</td><td data-label="CPF">${aluno.cpf}</td><td data-label="Escola">${aluno.escola}</td><td data-label="Responsável">${aluno.responsavel}</td><td data-label="Telefone">${aluno.telefone}</td><td data-label="Email">${aluno.email}</td>`;
      corpoTabelaTurmas.appendChild(linha);
    });

  } catch (error) {
    console.error("❌ Erro ao carregar alunos:", error);
    corpoTabelaTurmas.innerHTML = '<tr><td colspan="7">Falha ao carregar dados.</td></tr>';
  }
}

// 4. INICIALIZAÇÃO DA PÁGINA
// Esta função agora só é chamada se o usuário estiver autenticado.
async function inicializarPagina() {
  filtroTurma.addEventListener("change", (e) => {
    carregarAlunos(e.target.value);
  });
  await carregarOficinasUnicas();
  await carregarAlunos();
}

// A chamada direta 'inicializarPagina();' foi removida daqui e colocada dentro do verificador de login.
