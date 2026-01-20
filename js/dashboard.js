// js/dashboard.js (VERSÃO FINAL com lógica para Professor e Admin) — ✅ multi-banco
import { getDB, getAuthInst, onAuthStateChanged } from './firebase-config.js';
import { collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Função de inicialização do módulo do Dashboard.
 * @param {string} userRole - O papel do usuário ('professor' ou 'admin' ). Padrão é 'professor'.
 */
export function init(userRole = 'professor') {
  console.log(`✅ Módulo de Dashboard inicializado para o perfil: ${userRole}`);

  // ✅ pega AUTH do ano ativo (2025/2026)
  const auth = getAuthInst();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      carregarDadosDoDashboard(user, userRole);
    } else {
      console.error("❌ Usuário não autenticado. Não é possível carregar o dashboard.");
      const a = document.getElementById('dashboard-total-turmas');
      const b = document.getElementById('dashboard-total-planos');
      const c = document.getElementById('dashboard-frequencia-hoje');
      if (a) a.textContent = '-';
      if (b) b.textContent = '-';
      if (c) c.textContent = '-';
    }
  });
}

async function carregarDadosDoDashboard(user, userRole) {
  const emailProfessor = user.email;

  const turmasValor = document.getElementById('dashboard-total-turmas');
  const planosValor = document.getElementById('dashboard-total-planos');
  const frequenciaValor = document.getElementById('dashboard-frequencia-hoje');

  if (!turmasValor || !planosValor || !frequenciaValor) {
    console.error("❌ Elementos do dashboard não encontrados no DOM.");
    return;
  }

  turmasValor.textContent = '...';
  planosValor.textContent = '...';
  frequenciaValor.textContent = '...';

  try {
    // ✅ pega DB do ano ativo (2025/2026)
    const db = getDB();

    // --- PLANOS DE AULA ---
    let planosQuery;
    if (userRole === 'admin') {
      planosQuery = query(collection(db, "planosDeAula"));
    } else {
      planosQuery = query(collection(db, "planosDeAula"), where("professorEmail", "==", emailProfessor));
    }

    const planosSnapshot = await getDocs(planosQuery);
    planosValor.textContent = `${planosSnapshot.size} registrados`;

    // --- TURMAS (com base nos planos) ---
    const oficinas = new Set();
    planosSnapshot.forEach(doc => {
      const o = doc.data()?.oficina;
      if (o) oficinas.add(o);
    });
    turmasValor.textContent = String(oficinas.size);

    // --- FREQUÊNCIA DE HOJE ---
    const hoje = new Date();
    const inicioDoDia = new Date(hoje);
    inicioDoDia.setHours(0, 0, 0, 0);

    const fimDoDia = new Date(hoje);
    fimDoDia.setHours(23, 59, 59, 999);

    let freqQuery;
    if (userRole === 'admin') {
      freqQuery = query(
        collection(db, "frequencias"),
        where("data", ">=", Timestamp.fromDate(inicioDoDia)),
        where("data", "<=", Timestamp.fromDate(fimDoDia))
      );
    } else {
      freqQuery = query(
        collection(db, "frequencias"),
        where("professorEmail", "==", emailProfessor),
        where("data", ">=", Timestamp.fromDate(inicioDoDia)),
        where("data", "<=", Timestamp.fromDate(fimDoDia))
      );
    }

    const freqSnapshot = await getDocs(freqQuery);

    if (freqSnapshot.empty) {
      frequenciaValor.textContent = 'Pendente';
      frequenciaValor.style.color = '#F26729';
    } else {
      frequenciaValor.textContent = 'Registrada';
      frequenciaValor.style.color = '#2E7D32';
    }

  } catch (error) {
    console.error("❌ Erro ao carregar dados do dashboard:", error);
    turmasValor.textContent = 'Erro';
    planosValor.textContent = 'Erro';
    frequenciaValor.textContent = 'Erro';
  }
}
