// Importa todas as funções do Firebase que a aplicação inteira vai precisar
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- CONFIGURAÇÃO CENTRAL E ÚNICA DA APLICAÇÃO ---
// Projeto: matriculas-madeinsertao
const firebaseConfig = {
  apiKey: "AIzaSyAzavu7lRQPAi--SFecOg2FE6f0WlDyTPE",
  authDomain: "matriculas-madeinsertao.firebaseapp.com",
  projectId: "matriculas-madeinsertao",
  storageBucket: "matriculas-madeinsertao.firebasestorage.app",
  messagingSenderId: "426884127493",
  appId: "1:426884127493:web:7c83d74f972af209c8b56c",
  measurementId: "G-V2DH0RHXEE"
};

// Inicializa o Firebase App
const app = initializeApp(firebaseConfig );

// --- EXPORTAÇÕES ---
// Disponibiliza as instâncias e funções para toda a aplicação

export const db = getFirestore(app);
export const auth = getAuth(app);
export { 
  onAuthStateChanged, 
  signOut,
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword
};
