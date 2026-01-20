// 1. IMPORTA AS FERRAMENTAS DO NOSSO ARQUIVO CENTRAL (MULTI-BANCO)
import { 
  setAnoAtivo, 
  getAnoAtivo, 
  getAuthInst,
  setPersistence, 
  browserLocalPersistence 
} from './firebase-config.js';

import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 2. SELECIONA OS ELEMENTOS DO FORMULÁRIO
const loginForm = document.querySelector(".login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");
const loginBtn = document.querySelector(".login-btn");
const errorDiv = document.getElementById("error-message");
const anoLetivoSelect = document.getElementById("anoLetivo");

// 2.1 PREENCHE O ANO SALVO (SE HOUVER)
try {
  const anoSalvo = (typeof getAnoAtivo === "function" ? getAnoAtivo() : (localStorage.getItem("MIS_ANO_ATIVO") || "2026"));
  if (anoLetivoSelect) anoLetivoSelect.value = anoSalvo || "2026";
} catch (e) {
  if (anoLetivoSelect) anoLetivoSelect.value = "2026";
}

// 3. ADICIONA O EVENTO DE SUBMISSÃO AO FORMULÁRIO
loginForm.addEventListener("submit", (e) => {
  e.preventDefault(); // Impede o recarregamento da página

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const anoLetivo = anoLetivoSelect ? anoLetivoSelect.value : "2026";

  // Validação simples
  if (!email || !password) {
    showError("Por favor, preencha o email e a senha.");
    return;
  }

  // ✅ Define o banco antes de autenticar
  setAnoAtivo(anoLetivo);

  // Desativa o botão e mostra feedback de carregamento
  setLoading(true);

  // Faz login
  handleLogin(email, password);
});

// 4. FUNÇÃO ASYNC PARA LIDAR COM O LOGIN
async function handleLogin(email, password) {
  try {
    // Pega o auth do ano ativo
    const auth = getAuthInst();

    // Persistência: só mantém logado se "Lembrar de mim" estiver marcado
    // (se você quiser manter sempre logado como estava antes, pode remover o if)
    if (rememberInput && rememberInput.checked) {
      await setPersistence(auth, browserLocalPersistence);
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Redirecionamento por domínio
    if (user.email.endsWith("@prof.amm.com")) {
      window.location.href = "professor.html";
    } else if (user.email.endsWith("@adm.amm.com")) {
      window.location.href = "adm.html";
    } else {
      showError("Login bem-sucedido, mas o perfil não foi reconhecido.");
    }

  } catch (error) {
    console.error("Falha no login:", error && error.code ? error.code : error);

    // Mensagens um pouco mais certeiras (sem complicar)
    const code = error && error.code ? error.code : "";
    if (code === "auth/invalid-credential") showError("Email ou senha incorretos. Tente novamente.");
    else if (code === "auth/user-not-found") showError("Usuário não encontrado.");
    else if (code === "auth/wrong-password") showError("Senha incorreta.");
    else if (code === "auth/too-many-requests") showError("Muitas tentativas. Tente novamente mais tarde.");
    else showError("Não foi possível entrar. Verifique seus dados e tente novamente.");
  }
}

// 5. FUNÇÕES AUXILIARES

function showError(message) {
  errorDiv.innerText = message;
  errorDiv.style.display = "block";
  setLoading(false);
}

function setLoading(isLoading) {
  if (isLoading) {
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    loginBtn.disabled = true;
    errorDiv.style.display = "none";
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
