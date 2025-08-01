import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAGWgkGQglB_uuV0eVnU3FuT0kLe8U7vdw",
  authDomain: "mis-educa.firebaseapp.com",
  projectId: "mis-educa",
  storageBucket: "mis-educa.appspot.com",
  messagingSenderId: "432559485193",
  appId: "1:432559485193:web:5c3ad99c601cea0594a3d8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.querySelector(".login-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const loginBtn = document.querySelector(".login-btn");
  const errorDiv = document.getElementById("error-message");

  errorDiv.style.display = "none";
  errorDiv.innerText = "";

  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
  loginBtn.disabled = true;

  setPersistence(auth, browserLocalPersistence)
    .then(() => signInWithEmailAndPassword(auth, email, password))
    .then((userCredential) => {
      if (email.endsWith("@professor.amm.com")) {
        window.location.href = "professor.html";
      } else if (email.endsWith("@adm.amm.com")) {
        window.location.href = "adm.html";
      } else {
        showError("Domínio de e-mail não reconhecido.");
      }
    })
    .catch(() => {
      showError("Email ou senha incorretos. Tente novamente.");
    });

  function showError(message) {
    errorDiv.innerText = message;
    errorDiv.style.display = "block";
    loginBtn.innerHTML = '<span>Entrar</span><i class="fas fa-arrow-right"></i>';
    loginBtn.disabled = false;
  }
});

// Mostrar/ocultar senha
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
