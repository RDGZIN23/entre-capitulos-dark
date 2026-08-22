import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
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

const GROUPS = [
  { id: "mensagens", label: "Mensagens", subtitle: "Novas conversas e mensagens", icon: "✉", types: ["mensagem"] },
  { id: "seguidores", label: "Seguidores", subtitle: "Quem começou a seguir você", icon: "＋", types: ["seguidor"] },
  { id: "curtidas", label: "Livros curtidos", subtitle: "Leitores que curtiram seus livros", icon: "♥", types: ["curtida_livro"] },
  { id: "comentarios", label: "Comentários", subtitle: "Comentários nas suas histórias", icon: "◌", types: ["comentario"] },
  { id: "avaliacoes", label: "Avaliações", subtitle: "Notas recebidas nos seus livros", icon: "★", types: ["avaliacao"] }
];

function targetFor(n) {
  if (n.tipo === "mensagem" && n.conversaId) return `mensagens.html?c=${encodeURIComponent(n.conversaId)}`;
  if (n.tipo === "comentario" && n.capituloId) return `leitura.html?id=${encodeURIComponent(n.capituloId)}`;
  if (["avaliacao", "curtida_livro"].includes(n.tipo) && n.livroId) return `livro.html?id=${encodeURIComponent(n.livroId)}`;
  if (n.remetenteId) return `perfil.html?id=${encodeURIComponent(n.remetenteId)}`;
  return "#";
}

function copyFor(n, sender, book) {
  const name = sender?.nome || "Alguém";
  const title = book?.titulo || n.livroTitulo || "seu livro";
  if (n.tipo === "mensagem") return { title: `${name} enviou uma mensagem`, text: n.texto || "Nova mensagem" };
  if (n.tipo === "seguidor") return { title: `${name} começou a seguir você`, text: "Toque para abrir o perfil." };
  if (n.tipo === "curtida_livro") return { title: `${name} curtiu seu livro`, text: title };
  if (n.tipo === "comentario") return { title: `${name} comentou em ${title}`, text: n.texto || "Novo comentário" };
  if (n.tipo === "avaliacao") return { title: `${name} avaliou ${title}`, text: n.texto || "Nova avaliação" };
  return { title: "Nova notificação", text: n.texto || "" };
}

async function render(list) {
  if (!list.length) {
    box.innerHTML = `<div class="notification-empty"><div class="notification-empty-icon">✦</div><strong>Tudo tranquilo por aqui</strong><span>Suas mensagens, seguidores, curtidas, comentários e avaliações vão aparecer aqui.</span></div>`;
    return;
  }

  const senderIds = [...new Set(list.map(n => n.remetenteId).filter(Boolean))];
  const bookIds = [...new Set(list.map(n => n.livroId).filter(Boolean))];

  const [profilesRows, bookRows] = await Promise.all([
    Promise.all(senderIds.map(async id => [id, await publicAuthor(id).catch(() => null)])),
    Promise.all(bookIds.map(async id => {
      const snap = await getDoc(doc(db, "livros", id)).catch(() => null);
      return [id, snap?.exists?.() ? { id: snap.id, ...snap.data() } : null];
    }))
  ]);

  const profiles = new Map(profilesRows.filter(([, value]) => value));
  const books = new Map(bookRows.filter(([, value]) => value));
  const grouped = GROUPS.map(group => ({
    ...group,
    items: list.filter(n => group.types.includes(n.tipo))
  }));

  box.innerHTML = grouped.map((group, groupIndex) => {
    const unread = group.items.filter(n => !n.lida).length;
    const displayItems = group.id === "mensagens" ? collapseMessageNotifications(group.items) : group.items.map(n => ({ notification: n, count: 1 }));
    const rows = displayItems.length
      ? displayItems.map(entry => notificationRow(entry.notification, profiles.get(entry.notification.remetenteId) || {}, books.get(entry.notification.livroId) || null, entry.count)).join("")
      : `<div class="notification-group-empty">Nenhuma notificação nesta categoria.</div>`;
    return `<details class="notification-group" ${groupIndex === 0 ? "open" : ""}>
      <summary class="notification-group-summary">
        <span class="notification-group-icon">${group.icon}</span>
        <span class="notification-group-copy"><strong>${group.label}</strong><small>${group.subtitle}</small></span>
        <span class="notification-group-meta">
          <span class="notification-group-count">${group.items.length}</span>
          ${unread ? `<span class="notification-group-unread">${unread > 99 ? "99+" : unread}</span>` : ""}
          <span class="notification-group-chevron">⌄</span>
        </span>
      </summary>
      <div class="notification-group-list">${rows}</div>
    </details>`;
  }).join("");

  UI.$$('[data-notification]', box).forEach(link => {
    link.addEventListener("click", async event => {
      event.preventDefault();
      await markNotificationRead(link.dataset.notification).catch(() => {});
      location.href = link.href;
    });
  });
}

function collapseMessageNotifications(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.conversaId || item.remetenteId || item.id;
    const current = map.get(key);
    if (!current) {
      map.set(key, { notification: item, count: 1 });
    } else {
      current.count += 1;
      if (UI.timeMs(item.criadoEm) > UI.timeMs(current.notification.criadoEm)) current.notification = item;
    }
  }
  return [...map.values()].sort((a, b) => UI.timeMs(b.notification.criadoEm) - UI.timeMs(a.notification.criadoEm));
}

function notificationRow(n, sender, book, groupedCount = 1) {
  const copy = copyFor(n, sender, book);
  if (n.tipo === "mensagem" && groupedCount > 1) {
    copy.title = `${sender?.nome || "Alguém"} enviou ${groupedCount} mensagens`;
  }
  const photo = UI.safeHttps(sender.fotoURL || sender.foto || "");
  const bookCover = UI.safeHttps(book?.capa || "");
  const contextMedia = n.tipo === "curtida_livro" && bookCover
    ? `<span class="notification-book-cover" style="background-image:url('${UI.esc(bookCover)}')"></span>`
    : "";

  return `<a class="notification-item ${n.lida ? "" : "unread"}" href="${targetFor(n)}" data-notification="${UI.esc(n.id)}">
    <span class="notification-avatar" ${photo ? `style="background-image:url('${UI.esc(photo)}')"` : ""}>${photo ? "" : (sender.nome ? UI.initials(sender.nome) : "•")}</span>
    <span class="notification-copy">
      <strong>${UI.esc(copy.title)}</strong>
      <span>${UI.esc(copy.text)}</span>
      <small>${UI.timeAgo(n.criadoEm)}</small>
    </span>
    ${contextMedia}
    ${n.lida ? "" : '<i class="notification-dot"></i>'}
  </a>`;
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
