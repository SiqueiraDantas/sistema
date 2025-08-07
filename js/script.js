// 1. IMPORTA AS FERRAMENTAS DE AUTENTICAÇÃO DO NOSSO ARQUIVO CENTRAL
// Isso garante que estamos usando a mesma instância do Firebase em toda a aplicação.
import { auth, setPersistence, browserLocalPersistence } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// A configuração do Firebase foi removida daqui, pois agora ela vive no firebase-config.js

// 2. SELECIONA OS ELEMENTOS DO FORMULÁRIO
const loginForm = document.querySelector(".login-form" );
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.querySelector(".login-btn");
const errorDiv = document.getElementById("error-message");

// 3. ADICIONA O EVENTO DE SUBMISSÃO AO FORMULÁRIO
loginForm.addEventListener("submit", (e) => {
  e.preventDefault(); // Impede o recarregamento da página

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Validação simples para não fazer chamadas desnecessárias ao Firebase
  if (!email || !password) {
    showError("Por favor, preencha o email e a senha.");
    return;
  }

  // Desativa o botão e mostra o feedback de carregamento
  setLoading(true);

  // A sua lógica de login, agora usando async/await para melhor legibilidade
  handleLogin(email, password);
});

// 4. FUNÇÃO ASYNC/AWAIT PARA LIDAR COM O LOGIN
async function handleLogin(email, password) {
  try {
    // Passo 1: Define a persistência para manter o usuário logado
    await setPersistence(auth, browserLocalPersistence);
    
    // Passo 2: Tenta fazer o login com o email e senha fornecidos
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Passo 3: Se o login for bem-sucedido, redireciona com base no domínio do email
    if (user.email.endsWith("@prof.amm.com")) {
      window.location.href = "professor.html";
    } else if (user.email.endsWith("@adm.amm.com")) {
      window.location.href = "adm.html";
    } else {
      // Este caso é uma segurança extra, caso um usuário sem o domínio correto seja autenticado
      showError("Login bem-sucedido, mas o perfil não foi reconhecido.");
    }
  } catch (error) {
    // Se qualquer passo falhar (ex: senha errada, usuário não existe), mostra um erro
    console.error("Falha no login:", error.code);
    showError("Email ou senha incorretos. Tente novamente.");
  }
}

// 5. FUNÇÕES AUXILIARES PARA CONTROLAR A INTERFACE

// Função para mostrar mensagens de erro
function showError(message) {
  errorDiv.innerText = message;
  errorDiv.style.display = "block";
  setLoading(false); // Reativa o botão se der erro
}

// Função para controlar o estado de "carregando" do botão
function setLoading(isLoading) {
  if (isLoading) {
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    loginBtn.disabled = true;
    errorDiv.style.display = "none"; // Esconde erros antigos
  } else {
    loginBtn.innerHTML = '<span>Entrar</span><i class="fas fa-arrow-right"></i>';
    loginBtn.disabled = false;
  }
}

// 6. FUNÇÃO PARA MOSTRAR/OCULTAR SENHA (continua igual)
window.togglePassword = function () {
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eye-icon');
  const toggleButton = document.querySelector('.toggle-password');

  toggleButton.classList.add('blink');
  setTimeout(() => toggleButton.classList.remove('blink'), 300);

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
    toggleButton.classList.add('active');
  } else {
    passwordInput.type = 'password';
    eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    toggleButton.classList.remove('active');
  }
};
