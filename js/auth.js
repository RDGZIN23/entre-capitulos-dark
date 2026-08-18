import { auth, db } from "./firebase-config.js";

import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

function traduzirErroFirebase(erro) {
  const mensagens = {
    "auth/email-already-in-use": "Este e-mail já está sendo usado por outra conta.",
    "auth/invalid-email": "Digite um endereço de e-mail válido.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Não encontramos uma conta com esse e-mail.",
    "auth/wrong-password": "A senha informada está incorreta.",
    "auth/too-many-requests": "Muitas tentativas foram feitas. Aguarde um pouco e tente novamente.",
    "auth/network-request-failed": "Não foi possível conectar. Verifique sua internet.",
    "auth/operation-not-allowed": "O login por e-mail e senha não está ativado no Firebase."
  };

  return mensagens[erro?.code] || "Não foi possível concluir. Tente novamente.";
}

async function criarPerfilFirestore(usuario, nome) {
  await setDoc(
    doc(db, "usuarios", usuario.uid),
    {
      uid: usuario.uid,
      nome,
      email: usuario.email || "",
      tipo: "leitor",
      foto: "",
      fotoURL: "",
      biografia: "",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    },
    { merge: true }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#authForm");
  if (!form) return;

  const modo = document.body.dataset.auth;
  const botao = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document.querySelector("#email")?.value.trim() || "";
    const senha = document.querySelector("#password")?.value || "";

    if (!email || senha.length < 6) {
      UI.toast("Use um e-mail válido e uma senha com pelo menos 6 caracteres.");
      return;
    }

    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = modo === "signup" ? "Criando conta..." : "Entrando...";

    try {
      // Mantém a conta conectada mesmo ao trocar de página ou fechar a aba.
      await setPersistence(auth, browserLocalPersistence);

      if (modo === "signup") {
        const nome = document.querySelector("#name")?.value.trim() || "Leitor";
        const credencial = await createUserWithEmailAndPassword(auth, email, senha);

        await updateProfile(credencial.user, { displayName: nome });
        await criarPerfilFirestore(credencial.user, nome);

        UI.toast("Conta criada com sucesso.");
      } else {
        await signInWithEmailAndPassword(auth, email, senha);
        UI.toast("Login realizado com sucesso.");
      }

      // Aguarda o estado de autenticação ser gravado antes de redirecionar.
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }

      window.location.replace("index.html");

    } catch (erro) {
      console.error("Erro de autenticação:", erro);
      UI.toast(traduzirErroFirebase(erro));
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  });
});
