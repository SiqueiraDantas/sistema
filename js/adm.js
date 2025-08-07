// js/adm.js (VERSÃO COM INTEGRAÇÃO DE KPI E TURMAS)
import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { mostrarNotificacao } from './notificacao.js';

// Importa os módulos das páginas
import * as dashboard from './dashboard.js';
import * as gerenciar_planos from './gerenciar_planos.js';
import * as frequencia_adm from './frequencia_adm.js';
import * as kpi from './kpi.js';
import * as turmas_adm from './turmas_adm.js';
import * as inventario from './inventario.js'; // NOVO: Importa o módulo de Inventário
import * as relatorio from './relatorio.js';

const mainContent = document.getElementById('main-content'   );
const sidebarNav = document.querySelector('.sidebar nav ul');

// Mapeia as páginas para seus respectivos arquivos HTML e módulos JS
const paginas = {
  'dashboard': { html: 'dashboard.html', module: dashboard },
  'plano_de_aula': { html: 'gerenciar_planos.html', module: gerenciar_planos },
  'frequencia': { html: 'frequencia_adm.html', module: frequencia_adm },
  'kpi': { html: 'kpi.html', module: kpi },
  'turmas': { html: 'turmas_adm.html', module: turmas_adm },
  'inventario': { html: 'inventario.html', module: inventario }, // NOVO: Adiciona a página de Inventário
  'relatorio': { html: 'relatorio.html', module: relatorio } // NOVO: Adiciona a página de Relatório
};

// Função para carregar o conteúdo da página
async function loadPage(pageName) {
  const page = paginas[pageName];
  if (!page) {
    console.error(`Página ${pageName} não encontrada.`);
    mainContent.innerHTML = `<p>Página não encontrada: ${pageName}</p>`;
    return;
  }

  try {
    const response = await fetch(page.html);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    mainContent.innerHTML = html;

    // Inicializa o módulo da página se ele tiver uma função init
    if (page.module && typeof page.module.init === 'function') {
      page.module.init(mainContent, 'admin'); // Passa o container e o perfil
    } else if (page.module) {
      console.warn(`Módulo ${pageName} importado, mas não possui função init().`);
    }

    // Atualiza o estado ativo do menu lateral
    document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      }
    });

  } catch (error) {
    console.error(`Erro ao carregar a página ${pageName}:`, error);
    mainContent.innerHTML = `<p>Erro ao carregar a página: ${pageName}</p><p>${error.message}</p>`;
  }
}

// Event listener para a navegação lateral
sidebarNav.addEventListener('click', (event) => {
  const target = event.target.closest('a');
  if (target && target.dataset.page) {
    event.preventDefault();
    loadPage(target.dataset.page);
  }
});

// Logout
document.getElementById('logout').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = 'index.html'; // Redireciona para a página de login
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    mostrarNotificacao("Erro ao fazer logout.", "erro");
  }
});

// Carrega a página inicial (dashboard) ao carregar o admin.html
document.addEventListener('DOMContentLoaded', () => {
  loadPage('dashboard');
});

// Verifica o estado de autenticação
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html'; // Redireciona se não estiver logado
  }
});
