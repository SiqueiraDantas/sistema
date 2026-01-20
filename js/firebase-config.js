// js/firebase-config.js
// Firebase modular (CDN) - 2 bancos (2025 e 2026) + roteamento por "Ano Ativo"

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =========================
// CONFIGS
// =========================

// 2025 - matriculas-madeinsertao
const firebaseConfig2025 = {
  apiKey: "AIzaSyAzavu7lRQPAi--SFecOg2FE6f0WlDyTPE",
  authDomain: "matriculas-madeinsertao.firebaseapp.com",
  projectId: "matriculas-madeinsertao",
  storageBucket: "matriculas-madeinsertao.firebasestorage.app",
  messagingSenderId: "426884127493",
  appId: "1:426884127493:web:7c83d74f972af209c8b56c",
  measurementId: "G-V2DH0RHXEE"
};

// 2026 - matriculas-cfdd0
const firebaseConfig2026 = {
  apiKey: "AIzaSyB79TFuSXVbYprURdw5Q5jI9xxc6DkDOMQ",
  authDomain: "matriculas-cfdd0.firebaseapp.com",
  projectId: "matriculas-cfdd0",
  storageBucket: "matriculas-cfdd0.firebasestorage.app",
  messagingSenderId: "697940252168",
  appId: "1:697940252168:web:0822cc5e1e94b083dde3bd",
  measurementId: "G-ZBPXGL357R"
};

// =========================
// Inicializa 2 Apps (com nomes)
// =========================
const app2025 = getApps().find(a => a.name === "app2025") || initializeApp(firebaseConfig2025, "app2025");
const app2026 = getApps().find(a => a.name === "app2026") || initializeApp(firebaseConfig2026, "app2026");

// =========================
// Instâncias
// =========================
export const db2025 = getFirestore(app2025);
export const db2026 = getFirestore(app2026);

export const auth2025 = getAuth(app2025);
export const auth2026 = getAuth(app2026);

// =========================
// Ano Ativo (localStorage)
// =========================
const STORAGE_KEY = "MIS_ANO_ATIVO";

export function getAnoAtivo() {
  const v = localStorage.getItem(STORAGE_KEY);
  return (v === "2025" || v === "2026") ? v : "2026";
}

export function setAnoAtivo(ano) {
  const v = String(ano);
  if (v !== "2025" && v !== "2026") return;
  localStorage.setItem(STORAGE_KEY, v);
}

export function getDB() {
  return getAnoAtivo() === "2025" ? db2025 : db2026;
}

export function getAuthInst() {
  return getAnoAtivo() === "2025" ? auth2025 : auth2026;
}

// ✅ Compatibilidade: manter exports db/auth (opcional)
export const db = getDB();
export const auth = getAuthInst();

// ✅ Reexports (pra você usar em todo o sistema)
export {
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword
};
