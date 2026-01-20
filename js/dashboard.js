// js/dashboard.js — (VERSÃO FINAL com lógica para Professor e Admin) ✅ multi-banco
// ✅ Corrigido: evita "query requires an index" na frequência (filtra professor no JS)

import { getDB, getAuthInst, onAuthStateChanged } from './firebase-config.js';
import { collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Inicializa o módulo do Dashboard.
 * @param {string} userRole - 'professor' ou 'admin'. Padrão: 'professor'
 */
export function init(userRole = 'professor') {
  console.log(`✅ Módulo de Dashboard inicializado para o perfil: ${userRole}`);

  const auth = getAuthInst();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      carregarDadosDoDashboard(user, userRole);
    } else {
      console.error("❌ Usuário não autenticado. Não é possível carregar o dashboard.");
      setCards('-', '-', '-');
    }
  });
}

function setCards(turmas, planos, freq, freqColor = '') {
  const turmasValor = document.getElementById('dashboard-total-turmas');
  const planosValor = document.getElementById('dashboard-total-planos');
  const frequenciaValor = document.getElementById('dashboard-frequencia-hoje');

  if (turmasValor) turmasValor.textContent = turmas;
  if (planosValor) planosValor.textContent = planos;
  if (frequenciaValor) {
    frequenciaValor.textContent = freq;
    if (freqColor) frequenciaValor.style.color = freqColor;
  }
}

async function carregarDadosDoDashboard(user, userRole) {
  const emailProfessor = user?.email || "";

  const turmasValor = document.getElementById('dashboard-total-turmas');
  const planosValor = document.getElementById('dashboard-total-planos');
  const frequenciaValor = document.getElementById('dashboard-frequencia-hoje');

  if (!turmasValor || !planosValor || !frequenciaValor) {
    console.error("❌ Elementos do dashboard não encontrados no DOM.");
    return;
  }

  setCards('...', '...', '...');

  try {
    const db = getDB();

    // =========================
    // 1) PLANOS DE AULA
    // =========================
    let planosQuery;
    if (userRole === 'admin') {
      planosQuery = query(collection(db, "planosDeAula"));
    } else {
      // professor vê apenas os planos dele
      planosQuery = query(
        collection(db, "planosDeAula"),
        where("professorEmail", "==", emailProfessor)
      );
    }

    const planosSnapshot = await getDocs(planosQuery);
    planosValor.textContent = `${planosSnapshot.size} registrados`;

    // =========================
    // 2) TURMAS (base nos planos)
    // =========================
    const oficinas = new Set();
    planosSnapshot.forEach(doc => {
      const data = doc.data ? doc.data() : {};
      const o = data?.oficina;
      if (o) oficinas.add(o);
    });
    turmasValor.textContent = String(oficinas.size);

    // =========================
    // 3) FREQUÊNCIA DE HOJE
    // =========================
    // ✅ Evita índice composto:
    // - Busca registros de HOJE filtrando só por "data" (range)
    // - Se for professor, filtra por professorEmail no JS
    const agora = new Date();
    const inicioDoDia = new Date(agora);
    inicioDoDia.setHours(0, 0, 0, 0);

    const fimDoDia = new Date(agora);
    fimDoDia.setHours(23, 59, 59, 999);

    const freqBaseQuery = query(
      collection(db, "frequencias"),
      where("data", ">=", Timestamp.fromDate(inicioDoDia)),
      where("data", "<=", Timestamp.fromDate(fimDoDia))
    );

    const freqSnapshot = await getDocs(freqBaseQuery);

    let temRegistroHoje = false;

    if (userRole === 'admin') {
      // admin: basta ter qualquer registro hoje
      temRegistroHoje = !freqSnapshot.empty;
    } else {
      // professor: filtra no JS (sem índice composto)
      freqSnapshot.forEach(doc => {
        const data = doc.data ? doc.data() : {};
        if (String(data?.professorEmail || "").toLowerCase() === String(emailProfessor).toLowerCase()) {
          temRegistroHoje = true;
        }
      });
    }

    if (!temRegistroHoje) {
      frequenciaValor.textContent = 'Pendente';
      frequenciaValor.style.color = '#F26729'; // laranja
    } else {
      frequenciaValor.textContent = 'Registrada';
      frequenciaValor.style.color = '#2E7D32'; // verde
    }

  } catch (error) {
    console.error("❌ Erro ao carregar dados do dashboard:", error);
    setCards('Erro', 'Erro', 'Erro');
  }
}
