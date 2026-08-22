import { auth, db } from "./firebase-config.js";
import { APP } from "./config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const form = UI.$("#authForm");
const btn = UI.$("#authSubmit");
const googleBtn = UI.$("#googleAuth");
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

  setBusy(true, mode === "signup" ? "Criando conta..." : "Entrando...");

  try {
    let cred;
    let name = "";
    let isNew = false;

    if (mode === "signup") {
      name = UI.$("#name").value.trim();
      cred = await createUserWithEmailAndPassword(auth, email, pass);
      isNew = true;
      await updateProfile(cred.user, { displayName: name });
    } else {
      cred = await signInWithEmailAndPassword(auth, email, pass);
    }

    await finalizeAccount(cred, { preferredName: name, isNew });
  } catch (error) {
    handleError(error);
  }
};

if (googleBtn) {
  googleBtn.onclick = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setBusy(true, "Conectando ao Google...");

    try {
      const cred = await signInWithPopup(auth, provider);
      const info = getAdditionalUserInfo(cred);
      await finalizeAccount(cred, {
        preferredName: cred.user.displayName || "",
        isNew: info?.isNewUser === true
      });
    } catch (error) {
      handleError(error);
    }
  };
}

async function finalizeAccount(cred, { preferredName = "", isNew = false } = {}) {
  const u = cred.user;
  const userRef = doc(db, "usuarios", u.uid);
  const authorRef = doc(db, "autores", u.uid);
  const [userSnap, authorSnap] = await Promise.all([
    getDoc(userRef).catch(() => null),
    getDoc(authorRef).catch(() => null)
  ]);

  const newProfile = !userSnap?.exists?.();
  const name = preferredName || u.displayName || userSnap?.data?.()?.nome || "Leitor";
  const photo = u.photoURL || userSnap?.data?.()?.fotoURL || userSnap?.data?.()?.foto || "";

  if (newProfile) {
    await setDoc(userRef, {
      uid: u.uid,
      nome: name,
      email: u.email || "",
      tipo: "leitor",
      foto: photo,
      fotoURL: photo,
      biografia: "",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    }, { merge: true });
  } else {
    await setDoc(userRef, {
      nome: userSnap.data().nome || name,
      email: u.email || userSnap.data().email || "",
      fotoURL: userSnap.data().fotoURL || photo,
      atualizadoEm: serverTimestamp()
    }, { merge: true });
  }

  if (!authorSnap?.exists?.()) {
    await setDoc(authorRef, {
      uid: u.uid,
      nome: name,
      fotoURL: photo,
      privacidadeSeguidores: "publico",
      privacidadeSeguindo: "publico",
      privacidadeLeituras: "privado",
      privacidadeMensagens: "todos",
      atualizadoEm: serverTimestamp()
    }, { merge: true });
  } else {
    const ad = authorSnap.data();
    await setDoc(authorRef, {
      nome: ad.nome || name,
      fotoURL: ad.fotoURL || photo,
      atualizadoEm: serverTimestamp()
    }, { merge: true });
  }

  if (isNew || newProfile) await followCreatorByDefault(u).catch(error => console.warn("Follow inicial adiado:", error));

  show(isNew ? "Conta criada. Bem-vindo ao Entre Capítulos!" : "Pronto. Entrando...", "ok");
  setTimeout(() => location.replace(next), 300);
}

async function followCreatorByDefault(u) {
  const creatorUid = APP.creatorUid;
  if (!creatorUid || !u?.uid || creatorUid === u.uid) return false;

  const rootRef = doc(db, "seguindoAutores", `${u.uid}_${creatorUid}`);
  const snap = await getDoc(rootRef);
  if (snap.exists()) return false;

  const data = {
    usuarioId: u.uid,
    autorId: creatorUid,
    criadoEm: serverTimestamp(),
    origem: "boas_vindas"
  };

  await setDoc(rootRef, data);
  await Promise.all([
    setDoc(doc(db, "usuarios", u.uid, "seguindo", creatorUid), data, { merge: true }).catch(() => {}),
    setDoc(doc(db, "autores", creatorUid, "seguidores", u.uid), data, { merge: true }).catch(() => {})
  ]);

  await addDoc(collection(db, "notificacoes"), {
    destinatarioId: creatorUid,
    remetenteId: u.uid,
    tipo: "seguidor",
    texto: "Nova conta começou seguindo o perfil oficial.",
    lida: false,
    criadoEm: serverTimestamp()
  }).catch(() => {});

  return true;
}

function setBusy(state, label = "") {
  sending = state;
  btn.disabled = state;
  if (googleBtn) googleBtn.disabled = state;
  btn.textContent = state ? label : (mode === "signup" ? "Criar conta" : "Entrar");
  if (state && googleBtn) googleBtn.classList.add("is-busy");
  else googleBtn?.classList.remove("is-busy");
}

function handleError(error) {
  console.error(error);
  setBusy(false);
  show(({
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/weak-password": "Senha muito fraca.",
    "auth/network-request-failed": "Verifique sua conexão.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes de terminar.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.",
    "auth/unauthorized-domain": "Este domínio ainda precisa ser autorizado no Firebase Authentication.",
    "auth/operation-not-allowed": "Ative o provedor Google no Firebase Authentication para usar este botão."
  })[error.code] || error.message || "Não foi possível continuar.");
}

function safeLocalNext(value) {
  const v = String(value || "").trim();
  if (!v || v.startsWith("//") || /^[a-z]+:/i.test(v) || v.includes("\\")) return "";
  return v.startsWith("/") ? v.slice(1) : v;
}

function show(text, type = "err") {
  msg.textContent = text;
  msg.style.color = type === "ok" ? "#86efac" : "#fda4af";
}
