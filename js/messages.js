import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { publicAuthor } from "./firebase-data.js";
import {
  ensureConversation,
  conversationById,
  watchConversations,
  watchMessages,
  sendTextMessage,
  sendMediaMessage,
  conversationProfile,
  otherParticipant,
  mediaObjectUrl,
  markConversationNotificationsRead
} from "./messaging-data.js";

UI.shell("messages");

const shell = UI.$("#messagesShell");
const conversationList = UI.$("#conversationList");
const chatEmpty = UI.$("#chatEmpty");
const chatView = UI.$("#chatView");
const messageList = UI.$("#messageList");
const messageInput = UI.$("#messageInput");
const composer = UI.$("#messageComposer");
const imageInput = UI.$("#imageInput");
const attachImage = UI.$("#attachImage");
const recordAudio = UI.$("#recordAudio");
const recordingBar = UI.$("#recordingBar");
const recordingTime = UI.$("#recordingTime");
const stopRecording = UI.$("#stopRecording");
const cancelRecording = UI.$("#cancelRecording");
const sendButton = UI.$("#sendMessage");

let user = null;
let conversations = [];
let currentConversation = null;
let stopConversations = null;
let stopMessages = null;
let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let recordingStartedAt = 0;
let recordingTimer = null;
let cancelRecordedAudio = false;
let sending = false;

function avatarStyle(photo) {
  const safe = UI.safeHttps(photo);
  return safe ? `style="background-image:url('${UI.esc(safe)}')"` : "";
}

function timeLabel(value) {
  const ms = UI.timeMs(value);
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

async function resolveConversationProfile(conversation) {
  let profile = conversationProfile(conversation, user.uid);
  if (!profile.nome || profile.nome === "Usuário" || !profile.fotoURL) {
    const fresh = await publicAuthor(profile.uid).catch(() => null);
    if (fresh) profile = { uid: profile.uid, nome: fresh.nome || profile.nome, fotoURL: fresh.fotoURL || profile.fotoURL };
  }
  return profile;
}

async function renderConversationList() {
  if (!conversations.length) {
    conversationList.innerHTML = `<div class="empty-state">Você ainda não tem conversas. Abra o perfil de alguém e toque em <strong>Mensagem</strong>.</div>`;
    return;
  }

  const profiles = await Promise.all(conversations.map(resolveConversationProfile));
  const unreadMap = window.__EC_NOTIFICATION_STATE?.messageConversations || new Set();

  conversationList.innerHTML = conversations.map((c, i) => {
    const p = profiles[i];
    const active = c.id === currentConversation?.id;
    const unread = unreadMap.has(c.id);
    return `<button class="conversation-item ${active ? "active" : ""}" data-conversation="${UI.esc(c.id)}" type="button">
      <span class="conversation-avatar" ${avatarStyle(p.fotoURL)}>${p.fotoURL ? "" : UI.initials(p.nome)}</span>
      <span class="conversation-copy">
        <span class="conversation-name">${UI.esc(p.nome || "Usuário")}${unread ? '<i class="conversation-unread-dot"></i>' : ""}</span>
        <span class="conversation-preview">${UI.esc(c.ultimoTexto || "Comece a conversa")}</span>
      </span>
      <span class="conversation-time">${timeLabel(c.ultimaMensagemEm || c.atualizadoEm)}</span>
    </button>`;
  }).join("");

  UI.$$('[data-conversation]', conversationList).forEach(btn => {
    btn.onclick = () => openConversation(btn.dataset.conversation);
  });
}

async function openConversation(id) {
  const convo = conversations.find(c => c.id === id) || await conversationById(id).catch(() => null);
  if (!convo || !(convo.participantes || []).includes(user.uid)) {
    UI.toast("Conversa indisponível.");
    return;
  }

  currentConversation = convo;
  history.replaceState(null, "", `mensagens.html?c=${encodeURIComponent(convo.id)}`);
  shell.classList.add("chat-open");
  chatEmpty.classList.add("hidden");
  chatView.classList.remove("hidden");

  const p = await resolveConversationProfile(convo);
  UI.$("#chatName").textContent = p.nome || "Usuário";
  UI.$("#chatUserLink").href = `perfil.html?id=${encodeURIComponent(p.uid)}`;
  const avatar = UI.$("#chatAvatar");
  avatar.textContent = p.fotoURL ? "" : UI.initials(p.nome);
  avatar.style.backgroundImage = p.fotoURL ? `url("${UI.safeHttps(p.fotoURL)}")` : "";

  if (stopMessages) stopMessages();
  messageList.innerHTML = `<div class="loading-state">Carregando mensagens...</div>`;
  stopMessages = watchMessages(convo.id, renderMessages, error => {
    console.error(error);
    messageList.innerHTML = `<div class="empty-state">Não foi possível carregar as mensagens.</div>`;
  });

  await markConversationNotificationsRead(user.uid, convo.id).catch(() => {});
  renderConversationList();
  setTimeout(() => messageInput.focus(), 80);
}

function renderMessages(messages) {
  if (!messages.length) {
    messageList.innerHTML = `<div class="chat-start"><strong>Comece a conversa</strong><span>As mensagens ficam visíveis apenas para vocês dois.</span></div>`;
    return;
  }

  messageList.innerHTML = messages.map((m, index) => {
    const mine = m.remetenteId === user.uid;
    const text = m.texto ? `<div class="message-text">${UI.esc(m.texto).replace(/\n/g, "<br>")}</div>` : "";
    let media = "";
    if (m.tipo === "imagem" && m.mediaUrl) media = `<div class="message-media message-media-loading" data-media-index="${index}" data-media-type="imagem">Carregando foto...</div>`;
    if (m.tipo === "audio" && m.mediaUrl) media = `<div class="message-media message-media-loading" data-media-index="${index}" data-media-type="audio">Carregando áudio...</div>`;
    return `<div class="message-row ${mine ? "mine" : "theirs"}">
      <div class="message-bubble ${m.tipo !== "texto" ? "has-media" : ""}">
        ${media}${text}
        <span class="message-time">${timeLabel(m.criadoEm)}</span>
      </div>
    </div>`;
  }).join("");

  hydrateMedia(messages);
  requestAnimationFrame(() => { messageList.scrollTop = messageList.scrollHeight; });
}

async function hydrateMedia(messages) {
  const nodes = UI.$$('[data-media-index]', messageList);
  await Promise.all(nodes.map(async node => {
    const msg = messages[Number(node.dataset.mediaIndex)];
    const source = msg?.mediaUrl || "";
    if (!source) return;
    try {
      const url = await mediaObjectUrl(source);
      node.classList.remove("message-media-loading");
      node.innerHTML = node.dataset.mediaType === "imagem"
        ? `<img class="message-image" src="${url}" alt="Foto enviada na conversa">`
        : `<audio class="message-audio" controls preload="metadata" src="${url}"></audio>`;
      requestAnimationFrame(() => { messageList.scrollTop = messageList.scrollHeight; });
    } catch (error) {
      console.error(error);
      node.textContent = "Não foi possível abrir este arquivo.";
    }
  }));
}

async function setSending(state, label = "") {
  sending = state;
  sendButton.disabled = state;
  attachImage.disabled = state;
  recordAudio.disabled = state;
  sendButton.textContent = state ? "…" : "➤";
  if (label) UI.toast(label);
}

composer.onsubmit = async event => {
  event.preventDefault();
  if (sending || !currentConversation) return;
  const text = messageInput.value.trim();
  if (!text) return;
  try {
    await setSending(true);
    await sendTextMessage(user, currentConversation, text);
    messageInput.value = "";
    messageInput.style.height = "auto";
  } catch (error) {
    console.error(error);
    UI.toast(error.message || "Não foi possível enviar.");
  } finally {
    await setSending(false);
  }
};

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;
});

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

attachImage.onclick = () => imageInput.click();
imageInput.onchange = async () => {
  const file = imageInput.files?.[0];
  imageInput.value = "";
  if (!file || !currentConversation || sending) return;
  try {
    await setSending(true, "Enviando foto...");
    await sendMediaMessage(user, currentConversation, file, "imagem");
  } catch (error) {
    console.error(error);
    UI.toast(error.message || "Não foi possível enviar a foto.");
  } finally {
    await setSending(false);
  }
};

recordAudio.onclick = startRecording;
stopRecording.onclick = () => stopCurrentRecording(false);
cancelRecording.onclick = () => stopCurrentRecording(true);

async function startRecording() {
  if (sending || !currentConversation) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    UI.toast("Seu navegador não oferece gravação de áudio aqui.");
    return;
  }

  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = preferredAudioMime();
    mediaRecorder = mime ? new MediaRecorder(recordingStream, { mimeType: mime }) : new MediaRecorder(recordingStream);
    recordingChunks = [];
    cancelRecordedAudio = false;
    mediaRecorder.ondataavailable = e => { if (e.data?.size) recordingChunks.push(e.data); };
    mediaRecorder.onstop = finishRecording;
    mediaRecorder.start();
    recordingStartedAt = Date.now();
    recordingBar.classList.remove("hidden");
    composer.classList.add("hidden");
    updateRecordingClock();
    recordingTimer = setInterval(updateRecordingClock, 500);
    window.__recordingSafety = setTimeout(() => stopCurrentRecording(false), 120000);
  } catch (error) {
    console.error(error);
    UI.toast("Não foi possível acessar o microfone.");
    cleanupRecording();
  }
}

function preferredAudioMime() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return options.find(type => MediaRecorder.isTypeSupported?.(type)) || "";
}

function updateRecordingClock() {
  const seconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
  recordingTime.textContent = `Gravando ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function stopCurrentRecording(cancel) {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  cancelRecordedAudio = cancel;
  mediaRecorder.stop();
}

async function finishRecording() {
  const cancelled = cancelRecordedAudio;
  const type = mediaRecorder?.mimeType || recordingChunks[0]?.type || "audio/webm";
  const blob = new Blob(recordingChunks, { type });
  cleanupRecording();
  if (cancelled || !blob.size) return;
  try {
    await setSending(true, "Enviando áudio...");
    const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `audio-${Date.now()}.${ext}`, { type });
    await sendMediaMessage(user, currentConversation, file, "audio");
  } catch (error) {
    console.error(error);
    UI.toast(error.message || "Não foi possível enviar o áudio.");
  } finally {
    await setSending(false);
  }
}

function cleanupRecording() {
  clearInterval(recordingTimer);
  clearTimeout(window.__recordingSafety);
  recordingTimer = null;
  recordingStream?.getTracks?.().forEach(track => track.stop());
  recordingStream = null;
  mediaRecorder = null;
  recordingChunks = [];
  recordingBar.classList.add("hidden");
  composer.classList.remove("hidden");
}

UI.$("#chatBack").onclick = () => {
  shell.classList.remove("chat-open");
  history.replaceState(null, "", "mensagens.html");
};

onAuthStateChanged(auth, async account => {
  if (!account || account.isAnonymous) {
    location.replace("login.html?next=mensagens.html");
    return;
  }
  user = account;

  stopConversations?.();
  stopConversations = watchConversations(user.uid, list => {
    conversations = list;
    renderConversationList();
    if (currentConversation) {
      const updated = list.find(c => c.id === currentConversation.id);
      if (updated) currentConversation = updated;
    }
  }, error => {
    console.error(error);
    conversationList.innerHTML = `<div class="empty-state">Não foi possível carregar suas conversas.</div>`;
  });

  const params = new URLSearchParams(location.search);
  const to = params.get("to");
  const c = params.get("c");

  try {
    if (to && to !== user.uid) {
      const convo = await ensureConversation(user, to);
      currentConversation = convo;
      await openConversation(convo.id);
    } else if (c) {
      await openConversation(c);
    }
  } catch (error) {
    console.error(error);
    UI.toast(error.message || "Não foi possível iniciar a conversa.");
    history.replaceState(null, "", "mensagens.html");
  }
});


window.addEventListener("ec:notifications", () => {
  if (user) renderConversationList();
});

window.addEventListener("beforeunload", () => {
  stopConversations?.();
  stopMessages?.();
  cleanupRecording();
});
