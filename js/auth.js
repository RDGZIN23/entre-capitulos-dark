import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const form = UI.$("#authForm");
const btn = UI.$("#authSubmit");
const msg = UI.$("#authMessage");
const mode = document.body.dataset.auth;
const rawNext = new URLSearchParams(location.search).get("next") || "";
const next = safeLocalNext(rawNext) || "perfil.html";
let sending = false;

if (rawNext) {
  const switchLink = document.querySelector(mode === "login" ? 'a[href="cadastro.html"]' : 'a[href="login.html"]');
  if (switchLink) switchLink.href = `${mode === "login" ? "cadastro.html" : "login.html"}?next=${encodeURIComponent(rawNext)}`;
}

onAuthStateChanged(auth, user => {
  if (user && !user.isAnonymous && !sending) location.replace(next);
});

form.onsubmit = async event => {
  event.preventDefault();
  const email = UI.$("#email").value.trim().toLowerCase();
  const pass = UI.$("#password").value;
  if (pass.length < 6) return show("A senha precisa ter pelo menos 6 caracteres.");

  sending = true;
  btn.disabled = true;
  btn.textContent = mode === "signup" ? "Criando conta..." : "Entrando...";

  try {
    let cred;
    let name = "";
    if (mode === "signup") {
      name = UI.$("#name").value.trim();
      cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
    } else {
      cred = await signInWithEmailAndPassword(auth, email, pass);
    }

    const userRef = doc(db, "usuarios", cred.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: cred.user.uid,
        nome: name || cred.user.displayName || "Leitor",
        email: cred.user.email || "",
        tipo: "leitor",
        foto: "",
        fotoURL: "",
        biografia: "",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      }, { merge: true });
    }

    await setDoc(doc(db, "autores", cred.user.uid), {
      uid: cred.user.uid,
      nome: name || cred.user.displayName || "Leitor",
      fotoURL: cred.user.photoURL || "",
      privacidadeSeguidores: "publico",
      privacidadeSeguindo: "publico",
      privacidadeLeituras: "privado",
      privacidadeMensagens: "todos",
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    show("Pronto. Entrando...", "ok");
    setTimeout(() => location.replace(next), 250);
  } catch (error) {
    console.error(error);
    sending = false;
    btn.disabled = false;
    btn.textContent = mode === "signup" ? "Criar conta" : "Entrar";
    show(({
      "auth/email-already-in-use": "Este e-mail já está em uso.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/invalid-email": "E-mail inválido.",
      "auth/weak-password": "Senha muito fraca.",
      "auth/network-request-failed": "Verifique sua conexão."
    })[error.code] || error.message || "Não foi possível continuar.");
  }
};

function safeLocalNext(value) {
  const v = String(value || "").trim();
  if (!v || v.startsWith("//") || /^[a-z]+:/i.test(v) || v.includes("\\")) return "";
  return v.startsWith("/") ? v.slice(1) : v;
}

function show(text, type = "err") {
  msg.textContent = text;
  msg.style.color = type === "ok" ? "#86efac" : "#fda4af";
}
