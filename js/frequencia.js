import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzavu7lRQPAi--SFecOg2FE6f0WlDyTPE",
  authDomain: "matriculas-madeinsertao.firebaseapp.com",
  projectId: "matriculas-madeinsertao",
  storageBucket: "matriculas-madeinsertao.firebasestorage.app",
  messagingSenderId: "426884127493",
  appId: "1:426884127493:web:7c83d74f972af209c8b56c",
  measurementId: "G-V2DH0RHXEE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const turmaSelect = document.getElementById("turmaSelect");
const corpoTabela = document.getElementById("corpoTabela");
const salvarBtn = document.getElementById("salvarBtn");
const dataInput = document.getElementById("dataAula");
const toast = document.getElementById("toast");

const modal = document.getElementById("modalJustificativa");
const categoria = document.getElementById("categoria");
const anexo = document.getElementById("anexo");
let alunoAtual = null;
let tdJustificando = null;

// Carregar oficinas (array ou string)
async function carregarOficinasUnicas() {
  const snapshot = await getDocs(collection(db, "matriculas"));
  const oficinasSet = new Set();

  snapshot.forEach(doc => {
    const aluno = doc.data();
    if (Array.isArray(aluno.oficinas)) {
      aluno.oficinas.forEach(of => oficinasSet.add(of.trim()));
    } else if (typeof aluno.oficinas === "string") {
      oficinasSet.add(aluno.oficinas.trim());
    }
  });

  oficinasSet.forEach(oficina => {
    const option = document.createElement("option");
    option.value = oficina;
    option.textContent = oficina;
    turmaSelect.appendChild(option);
  });
}

// Carregar alunos da oficina selecionada
async function carregarAlunosPorOficina(oficina) {
  corpoTabela.innerHTML = "";
  const snapshot = await getDocs(collection(db, "matriculas"));

  snapshot.forEach(doc => {
    const aluno = doc.data();
    const oficinaAluno = aluno.oficinas;

    const pertence =
      (Array.isArray(oficinaAluno) && oficinaAluno.includes(oficina)) ||
      (typeof oficinaAluno === "string" && oficinaAluno.trim() === oficina);

    if (pertence) {
      const linha = document.createElement("tr");
      const tdNome = document.createElement("td");
      tdNome.textContent = aluno.nome;

      const tdPresenca = document.createElement("td");
      tdPresenca.setAttribute("data-status", "");

      const btnPresente = document.createElement("button");
      btnPresente.textContent = "✅";
      btnPresente.className = "btn-presenca";
      btnPresente.onclick = () => {
        limparEstilos(tdPresenca);
        tdPresenca.setAttribute("data-status", "Presente");
        btnPresente.classList.add("ativo");
      };

      const btnFalta = document.createElement("button");
      btnFalta.textContent = "❌";
      btnFalta.className = "btn-falta";
      btnFalta.onclick = () => {
        limparEstilos(tdPresenca);
        tdPresenca.setAttribute("data-status", "Falta");
        btnFalta.classList.add("ativo");
      };

      const btnJustificar = document.createElement("button");
      btnJustificar.textContent = "📄 Justificar";
      btnJustificar.className = "btn-justificar";
      btnJustificar.onclick = () => {
        alunoAtual = aluno.nome;
        tdJustificando = tdPresenca;
        anexo.value = "";
        categoria.value = "Saúde";
        limparEstilos(tdPresenca);
        tdPresenca.setAttribute("data-status", "Justificada");
        btnJustificar.classList.add("ativo");
        modal.classList.remove("hidden");
      };

      tdPresenca.appendChild(btnPresente);
      tdPresenca.appendChild(btnFalta);
      tdPresenca.appendChild(btnJustificar);

      linha.appendChild(tdNome);
      linha.appendChild(tdPresenca);
      corpoTabela.appendChild(linha);
    }
  });
}

// Limpar destaque dos botões
function limparEstilos(td) {
  td.querySelectorAll("button").forEach(btn => btn.classList.remove("ativo"));
}

// Botão Salvar Frequência
salvarBtn.addEventListener("click", () => {
  const data = dataInput.value;
  const oficina = turmaSelect.value;

  if (!data || !oficina) {
    alert("Preencha todos os campos antes de salvar.");
    return;
  }

  const registros = [];

  corpoTabela.querySelectorAll("tr").forEach(tr => {
    const nome = tr.children[0].textContent;
    const status = tr.children[1].getAttribute("data-status") || "Não marcado";
    registros.push({ nome, status, data, oficina });
  });

  localStorage.setItem(`frequencia-${oficina}-${data}`, JSON.stringify(registros));
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
});

// Modal: cancelar
document.getElementById("cancelarModal").onclick = () => {
  modal.classList.add("hidden");
  if (tdJustificando) {
    tdJustificando.setAttribute("data-status", "");
    limparEstilos(tdJustificando);
    tdJustificando = null;
  }
};

// Modal: confirmar
document.getElementById("confirmarModal").onclick = () => {
  modal.classList.add("hidden");
  console.log("Justificativa:", categoria.value);
  console.log("Arquivo:", anexo.files[0]);
  tdJustificando = null;
};

// Troca de oficina
turmaSelect.addEventListener("change", e => {
  const oficinaSelecionada = e.target.value;
  if (oficinaSelecionada) {
    carregarAlunosPorOficina(oficinaSelecionada);
  }
});

// Início
carregarOficinasUnicas();
