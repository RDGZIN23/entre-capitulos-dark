import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

function mensagem(texto, tipo = "erro") {
  const el = document.getElementById("authMessage");
  if (!el) return;

  el.textContent = texto;
  el.style.color =
    tipo === "sucesso"
      ? "#86efac"
      : "#fda4af";
}

function traduzirErroFirebase(erro) {
  const mensagens = {
    "auth/email-already-in-use":
      "Este e-mail já está sendo usado por outra conta.",
    "auth/invalid-email":
      "Digite um endereço de e-mail válido.",
    "auth/weak-password":
      "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-credential":
      "E-mail ou senha incorretos.",
    "auth/user-not-found":
      "Não encontramos uma conta com esse e-mail.",
    "auth/wrong-password":
      "A senha informada está incorreta.",
    "auth/too-many-requests":
      "Muitas tentativas foram feitas. Aguarde um pouco.",
    "auth/network-request-failed":
      "Não foi possível conectar. Verifique sua internet."
  };

  return mensagens[erro?.code] || "Não foi possível entrar. Tente novamente.";
}

async function garantirPerfil(usuario, nome = "") {
  const ref = doc(db, "usuarios", usuario.uid);
  const atual = await getDoc(ref);

  if (atual.exists()) return;

  await setDoc(
    ref,
    {
      uid: usuario.uid,
      nome: nome || usuario.displayName || "Leitor",
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
  const form = document.getElementById("authForm");
  const botao = document.getElementById("authSubmit");

  if (!form || !botao) return;

  const modo = document.body.dataset.auth;

  form.addEventListener("submit", async evento => {
    evento.preventDefault();
    evento.stopPropagation();

    mensagem("");

    const email =
      document.getElementById("email")
        ?.value
        .trim()
        .toLowerCase() || "";

    const senha =
      document.getElementById("password")
        ?.value || "";

    if (!email) {
      mensagem("Digite seu e-mail.");
      return;
    }

    if (senha.length < 6) {
      mensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const textoNormal =
      modo === "signup"
        ? "Criar conta"
        : "Entrar";

    botao.disabled = true;
    botao.textContent =
      modo === "signup"
        ? "Criando conta..."
        : "Entrando...";

    try {
      if (modo === "signup") {
        const nome =
          document.getElementById("name")
            ?.value
            .trim() || "";

        if (nome.length < 2) {
          mensagem("Digite um nome com pelo menos 2 caracteres.");
          botao.disabled = false;
          botao.textContent = textoNormal;
          return;
        }

        const credencial =
          await createUserWithEmailAndPassword(
            auth,
            email,
            senha
          );

        await updateProfile(
          credencial.user,
          { displayName: nome }
        );

        await garantirPerfil(
          credencial.user,
          nome
        );

        mensagem(
          "Conta criada. Abrindo seu perfil...",
          "sucesso"
        );
      } else {
        const credencial =
          await signInWithEmailAndPassword(
            auth,
            email,
            senha
          );

        await garantirPerfil(
          credencial.user
        );

        mensagem(
          "Login realizado. Abrindo seu perfil...",
          "sucesso"
        );
      }

      // Mesmo fluxo simples usado no projeto antigo.
      setTimeout(() => {
        window.location.href = "perfil.html";
      }, 450);

    } catch (erro) {
      console.error("Erro no Firebase Auth:", erro);

      mensagem(
        traduzirErroFirebase(erro)
      );

      botao.disabled = false;
      botao.textContent = textoNormal;
    }
  });
});
