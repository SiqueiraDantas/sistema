// js/dashboard.js (VERSÃO FINAL com lógica para Professor e Admin)
import { db, auth, onAuthStateChanged } from './firebase-config.js';
import { collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Função de inicialização do módulo do Dashboard.
 * @param {string} userRole - O papel do usuário ('professor' ou 'admin' ). Padrão é 'professor'.
 */
export function init(userRole = 'professor') {
  console.log(`✅ Módulo de Dashboard inicializado para o perfil: ${userRole}`);

  // Espera o Firebase confirmar quem está logado para evitar erros de timing.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Se um usuário for confirmado, carrega os dados do dashboard para o papel correto.
      carregarDadosDoDashboard(user, userRole);
    } else {
      // Se não houver usuário, exibe um estado de erro claro nos cards.
      console.error("❌ Usuário não autenticado. Não é possível carregar o dashboard.");
      document.getElementById('dashboard-total-turmas').textContent = '-';
      document.getElementById('dashboard-total-planos').textContent = '-';
      document.getElementById('dashboard-frequencia-hoje').textContent = '-';
    }
  });
}

/**
 * Função principal que busca e exibe todos os dados do dashboard.
 * @param {object} user - O objeto do usuário autenticado do Firebase.
 * @param {string} userRole - O papel do usuário ('professor' ou 'admin').
 */
async function carregarDadosDoDashboard(user, userRole) {
  const emailProfessor = user.email;
  const turmasValor = document.getElementById('dashboard-total-turmas');
  const planosValor = document.getElementById('dashboard-total-planos');
  const frequenciaValor = document.getElementById('dashboard-frequencia-hoje');

  // Define o estado inicial de "carregando"
  turmasValor.textContent = '...';
  planosValor.textContent = '...';
  frequenciaValor.textContent = '...';

  try {
    // --- LÓGICA DE PLANOS DE AULA ---
    let planosQuery;
    if (userRole === 'admin') {
      // Admin vê todos os planos de aula, sem filtro.
      planosQuery = query(collection(db, "planosDeAula"));
    } else {
      // Professor vê apenas os planos de aula que ele criou.
      planosQuery = query(collection(db, "planosDeAula"), where("professorEmail", "==", emailProfessor));
    }
    const planosSnapshot = await getDocs(planosQuery);
    planosValor.textContent = `${planosSnapshot.size} registrados`;

    // --- LÓGICA DE TURMAS (baseada nos planos de aula encontrados) ---
    const oficinas = new Set();
    planosSnapshot.forEach(doc => {
      oficinas.add(doc.data().oficina);
    });
    turmasValor.textContent = oficinas.size;

    // --- LÓGICA DE FREQUÊNCIA DE HOJE ---
    const hoje = new Date();
    const inicioDoDia = new Date(hoje.setHours(0, 0, 0, 0));
    const fimDoDia = new Date(hoje.setHours(23, 59, 59, 999));
    
    let freqQuery;
    if (userRole === 'admin') {
      // Admin vê se QUALQUER frequência foi registrada hoje.
      freqQuery = query(collection(db, "frequencias"),
        where("data", ">=", Timestamp.fromDate(inicioDoDia)),
        where("data", "<=", Timestamp.fromDate(fimDoDia))
      );
    } else {
      // Professor vê apenas se ELE registrou alguma frequência hoje.
      freqQuery = query(collection(db, "frequencias"),
        where("professorEmail", "==", emailProfessor),
        where("data", ">=", Timestamp.fromDate(inicioDoDia)),
        where("data", "<=", Timestamp.fromDate(fimDoDia))
      );
    }
    const freqSnapshot = await getDocs(freqQuery);
    
    if (freqSnapshot.empty) {
      frequenciaValor.textContent = 'Pendente';
      frequenciaValor.style.color = '#F26729'; // Laranja
    } else {
      frequenciaValor.textContent = 'Registrada';
      frequenciaValor.style.color = '#2E7D32'; // Verde
    }

  } catch (error) {
    console.error("❌ Erro ao carregar dados do dashboard:", error);
    turmasValor.textContent = 'Erro';
    planosValor.textContent = 'Erro';
    frequenciaValor.textContent = 'Erro';
  }
}
