import {
  setAnoAtivo,
  getAnoAtivo,
  getAuthInst,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword
} from "./firebase-config.js";

const loginForm = document.querySelector(".login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");
const loginBtn = document.querySelector(".login-btn");
const errorDiv = document.getElementById("error-message");
const anoRadios = document.querySelectorAll('input[name="anoLetivo"]');

// Marca o ano salvo ao abrir a tela
(function initAno() {
  const anoSalvo = getAnoAtivo();
  anoRadios.forEach(r => (r.checked = (r.value === anoSalvo)));
})();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError("Por favor, preencha o email e a senha.");
    return;
  }

  // pega ano selecionado (bolinhas)
  let anoLetivo = "2026";
  anoRadios.forEach(r => { if (r.checked) anoLetivo = r.value; });

  // define banco antes do login
  setAnoAtivo(anoLetivo);

  setLoading(true);
  try {
    const auth = getAuthInst();

    if (rememberInput && rememberInput.checked) {
      await setPersistence(auth, browserLocalPersistence);
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user.email.endsWith("@prof.amm.com")) {
      window.location.href = "professor.html";
    } else if (user.email.endsWith("@adm.amm.com")) {
      window.location.href = "adm.html";
    } else {
      showError("Login bem-sucedido, mas o perfil não foi reconhecido.");
    }
  } catch (error) {
    console.error("Falha no login:", error);
    showError("Email ou senha incorretos. Tente novamente.");
  }
});

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

window.togglePassword = function () {
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
