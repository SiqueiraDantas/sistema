import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

// Importa os módulos das páginas
import * as dashboard from './dashboard.js';
import * as plano_de_aula from './plano_de_aula.js';
import * as frequencia from './frequencia.js';
import * as turmas from './turmas.js';
import * as relatorio from './relatorio.js'; // <-- Mantido
// Linha do ajuda.js foi removida

const mainContent = document.getElementById('main-content');
const sidebarNav = document.querySelector('.sidebar nav ul');

const paginas = {
  'dashboard': { html: 'dashboard.html', module: dashboard },
  'plano_de_aula': { html: 'plano_de_aula.html', module: plano_de_aula },
  'frequencia': { html: 'frequencia.html', module: frequencia },
  'turmas': { html: 'turmas.html', module: turmas },
  'relatorio': { html: 'relatorio.html', module: relatorio },
  // ajuda removido daqui também
};

// --- PROTEÇÃO DE ACESSO PARA O PROFESSOR ---
onAuthStateChanged(auth, (user) => {
  if (user && user.email.endsWith("@prof.amm.com")) {
    console.log("✅ Professor autenticado. Bem-vindo!");
  } else {
    console.log("Usuário não autenticado ou não é professor. Redirecionando...");
    window.location.href = 'index.html';
  }
});

async function loadPage(pageName) {
  if (!pageName) return;

  try {
    const page = paginas[pageName];
    if (!page) {
      console.error(`Página ${pageName} não encontrada no mapeamento.`);
      mainContent.innerHTML = `<p style="color: red; padding: 20px;">Página não encontrada.</p>`;
      return;
    }

    const response = await fetch(page.html);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    mainContent.innerHTML = await response.text();

    if (page.module && typeof page.module.init === 'function') {
      console.log(`DEBUG: Inicializando módulo ${pageName}`);
      page.module.init(mainContent);
    } else if (page.module) {
      console.warn(`Módulo ${pageName} importado, mas não possui função init().`);
    }

    document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      }
    });

  } catch (error) {
    console.error(`Erro ao carregar a página '${pageName}':`, error);
    mainContent.innerHTML = `<p style="color: red; padding: 20px;">Ocorreu um erro ao carregar esta seção.</p>`;
  }
}

sidebarNav.addEventListener('click', (event) => {
  const target = event.target.closest('a');
  if (target && target.dataset.page) {
    event.preventDefault();
    loadPage(target.dataset.page);
  }
});

document.getElementById('logout').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadPage('dashboard');
});
