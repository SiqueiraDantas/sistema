import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase config (a mesma do projeto MIS Educa)
const firebaseConfig = {
  apiKey: "AIzaSyAGWgkGQglB_uuV0eVnU3FuT0kLe8U7vdw",
  authDomain: "mis-educa.firebaseapp.com",
  projectId: "mis-educa",
  storageBucket: "mis-educa.appspot.com",
  messagingSenderId: "432559485193",
  appId: "1:432559485193:web:5c3ad99c601cea0594a3d8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formAjuda");
  const resposta = document.getElementById("respostaSuporte");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const assunto = form.assunto.value.trim();
      const mensagem = form.mensagem.value.trim();
      const user = auth.currentUser;

      if (!user) {
        resposta.textContent = "Usuário não autenticado.";
        return;
      }

      try {
        await addDoc(collection(db, "suporte"), {
          email: user.email,
          assunto: assunto,
          mensagem: mensagem,
          data: serverTimestamp()
        });

        resposta.textContent = "Mensagem enviada com sucesso!";
        form.reset();
        resposta.style.color = "green";
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        resposta.textContent = "Erro ao enviar. Tente novamente.";
        resposta.style.color = "red";
      }
    });
  }
});
