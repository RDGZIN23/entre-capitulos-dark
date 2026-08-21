import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { publicAuthor } from "./firebase-data.js";
import {
  watchNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "./messaging-data.js";

UI.shell("notifications");

const box = UI.$("#notificationList");
const markAll = UI.$("#markAllRead");
let user = null;
let unsubscribe = null;
let current = [];

function targetFor(n) {
  if (n.tipo === "mensagem" && n.conversaId) return `mensagens.html?c=${encodeURIComponent(n.conversaId)}`;
  if (n.tipo === "comentario" && n.capituloId) return `leitura.html?id=${encodeURIComponent(n.capituloId)}`;
  if (n.tipo === "avaliacao" && n.livroId) return `livro.html?id=${encodeURIComponent(n.livroId)}`;
  if (n.remetenteId) return `perfil.html?id=${encodeURIComponent(n.remetenteId)}`;
  return "#";
}

function copyFor(n, sender) {
  const name = sender?.nome || "Alguém";
  if (n.tipo === "mensagem") return { title: `${name} enviou uma mensagem`, text: n.texto || "Nova mensagem", icon: "✉" };
  if (n.tipo === "seguidor") return { title: `${name} começou a seguir você`, text: "Toque para abrir o perfil.", icon: "＋" };
  if (n.tipo === "comentario") return { title: `${name} comentou em sua história`, text: n.texto || "Novo comentário", icon: "◌" };
  if (n.tipo === "avaliacao") return { title: `${name} avaliou sua história`, text: n.texto || "Nova avaliação", icon: "★" };
  return { title: "Nova notificação", text: n.texto || "", icon: "•" };
}

async function render(list) {
  current = list;
  if (!list.length) {
    box.innerHTML = `<div class="empty-state">Você ainda não tem notificações.</div>`;
    return;
  }
  const ids = [...new Set(list.map(n => n.remetenteId).filter(Boolean))];
  const profiles = new Map((await Promise.all(ids.map(async id => [id, await publicAuthor(id).catch(() => null)]))).filter(([, p]) => p));

  box.innerHTML = list.map(n => {
    const sender = profiles.get(n.remetenteId) || {};
    const copy = copyFor(n, sender);
    const photo = UI.safeHttps(sender.fotoURL || sender.foto || "");
    return `<a class="notification-item ${n.lida ? "" : "unread"}" href="${targetFor(n)}" data-notification="${UI.esc(n.id)}">
      <span class="notification-avatar" ${photo ? `style="background-image:url('${UI.esc(photo)}')"` : ""}>${photo ? "" : (sender.nome ? UI.initials(sender.nome) : copy.icon)}</span>
      <span class="notification-copy">
        <strong>${UI.esc(copy.title)}</strong>
        <span>${UI.esc(copy.text)}</span>
        <small>${UI.timeAgo(n.criadoEm)}</small>
      </span>
      ${n.lida ? "" : '<i class="notification-dot"></i>'}
    </a>`;
  }).join("");

  UI.$$('[data-notification]', box).forEach(link => {
    link.addEventListener("click", () => markNotificationRead(link.dataset.notification).catch(() => {}));
  });
}

markAll.onclick = async () => {
  if (!user) return;
  markAll.disabled = true;
  try {
    await markAllNotificationsRead(user.uid);
    UI.toast("Notificações marcadas como lidas.");
  } catch (error) {
    console.error(error);
    UI.toast("Não foi possível atualizar as notificações.");
  } finally {
    markAll.disabled = false;
  }
};

onAuthStateChanged(auth, account => {
  if (!account || account.isAnonymous) {
    location.replace("login.html?next=notificacoes.html");
    return;
  }
  user = account;
  unsubscribe?.();
  unsubscribe = watchNotifications(user.uid, render, error => {
    console.error(error);
    box.innerHTML = `<div class="empty-state">Não foi possível carregar as notificações.</div>`;
  });
});

window.addEventListener("beforeunload", () => unsubscribe?.());
