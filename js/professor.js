import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase config
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

// Protege o acesso ao portal
onAuthStateChanged(auth, (user) => {
  if (!user || !user.email.endsWith("@professor.amm.com")) {
    window.location.href = "login.html";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout");
  const links = document.querySelectorAll(".sidebar a[data-page]");
  const mainContent = document.getElementById("main-content");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth)
        .then(() => window.location.href = "login.html")
        .catch((error) => alert("Erro ao sair: " + error.message));
    });
  }

  links.forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      if (!page || !mainContent) return;

      try {
        const response = await fetch(`${page}.html`);
        const html = await response.text();
        mainContent.innerHTML = html;

        links.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      } catch (error) {
        mainContent.innerHTML = "<p>Erro ao carregar a página.</p>";
      }
    });
  });
});
