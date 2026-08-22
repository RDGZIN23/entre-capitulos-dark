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
  markConversationNotificationsRead,
  deleteMessage
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
const conversationSearch = UI.$("#conversationSearch");
const clearConversationSearch = UI.$("#clearConversationSearch");
const chatProfileAction = UI.$("#chatProfileAction");
const authGate = UI.$("#messagesAuthGate");
const loginAction = UI.$("#messagesLoginAction");
const signupAction = UI.$("#messagesSignupAction");

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

function normalizeConversationSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function applyConversationSearch() {
  if (!conversationSearch) return;

  const query = normalizeConversationSearch(conversationSearch.value);
  const items = UI.$$("[data-conversation]", conversationList);
  let visible = 0;

  items.forEach(item => {
    const matches =
      !query ||
      String(item.dataset.search || "").includes(query);

    item.hidden = !matches;

    if (matches) visible += 1;
  });

  clearConversationSearch?.classList.toggle(
    "hidden",
    !conversationSearch.value
  );

  let empty = conversationList.querySelector(
    ".conversation-search-empty"
  );

  if (query && !visible && items.length) {
    if (!empty) {
      empty = document.createElement("div");
      empty.className =
        "empty-state conversation-search-empty";

      empty.innerHTML =
        '<strong>Nenhuma conversa encontrada</strong>' +
        '<span>Tente pesquisar outro nome.</span>';

      conversationList.appendChild(empty);
    }
  } else {
    empty?.remove();
  }
}

async function renderConversationList() {
  if (!conversations.length) {
    conversationList.innerHTML = `
      <div class="empty-state messages-list-empty">
        <div class="messages-list-empty-icon">✦</div>
        <strong>Nenhuma conversa ainda</strong>
        <span>Abra o perfil de alguém e toque em Mensagem.</span>
        <a href="explorar.html" class="btn btn-primary">
          Encontrar pessoas
        </a>
      </div>
    `;
    return;
  }

  const profiles = await Promise.all(
    conversations.map(resolveConversationProfile)
  );

  const unreadMap =
    window.__EC_NOTIFICATION_STATE?.messageConversations ||
    new Set();

  conversationList.innerHTML = conversations.map((c, i) => {
    const p = profiles[i];
    const active = c.id === currentConversation?.id;
    const unread = unreadMap.has(c.id);

    const preview =
      c.ultimoTexto ||
      "Comece a conversa";

    const searchText = normalizeConversationSearch(
      `${p.nome || ""} ${preview}`
    );

    return `
      <button
        class="conversation-item ${active ? "active" : ""} ${unread ? "unread" : ""}"
        data-conversation="${UI.esc(c.id)}"
        data-search="${UI.esc(searchText)}"
        type="button"
      >
        <span class="conversation-avatar-wrap">
          <span
            class="conversation-avatar"
            ${avatarStyle(p.fotoURL)}
          >
            ${p.fotoURL ? "" : UI.initials(p.nome)}
          </span>

          ${unread
            ? '<span class="conversation-status-dot"></span>'
            : ''
          }
        </span>

        <span class="conversation-copy">
          <span class="conversation-name">
            ${UI.esc(p.nome || "Usuário")}
          </span>

          <span class="conversation-preview">
            ${UI.esc(preview)}
          </span>
        </span>

        <span class="conversation-meta">
          <span class="conversation-time">
            ${timeLabel(c.ultimaMensagemEm || c.atualizadoEm)}
          </span>

          ${unread
            ? '<span class="conversation-unread-badge">1</span>'
            : ''
          }
        </span>
      </button>
    `;
  }).join("");

  UI.$$("[data-conversation]", conversationList)
    .forEach(btn => {
      btn.onclick = () =>
        openConversation(btn.dataset.conversation);
    });

  applyConversationSearch();
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
  if (chatProfileAction) {
    chatProfileAction.href = `perfil.html?id=${encodeURIComponent(p.uid)}`;
  }
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
    messageList.innerHTML = `
      <div class="chat-start">
        <strong>Comece a conversa</strong>
        <span>As mensagens ficam visíveis apenas para vocês dois.</span>
      </div>
    `;
    return;
  }

  messageList.innerHTML = messages.map((m, index) => {
    const mine = m.remetenteId === user.uid;

    const text = m.texto
      ? `<div class="message-text">${UI.esc(m.texto).replace(/\n/g, "<br>")}</div>`
      : "";

    let media = "";

    if (m.tipo === "imagem" && m.mediaUrl) {
      media = `
        <div
          class="message-media message-media-loading"
          data-media-index="${index}"
          data-media-type="imagem"
        >
          Carregando foto...
        </div>
      `;
    }

    if (m.tipo === "audio" && m.mediaUrl) {
      media = `
        <div
          class="message-media message-media-loading"
          data-media-index="${index}"
          data-media-type="audio"
        >
          Carregando áudio...
        </div>
      `;
    }

    const actions = mine
      ? `
        <button
          class="message-actions-button"
          type="button"
          data-delete-message="${UI.esc(m.id)}"
          aria-label="Opções da mensagem"
          title="Apagar mensagem"
        >
          ⋯
        </button>
      `
      : "";

    return `
      <div class="message-row ${mine ? "mine" : "theirs"}">
        <div class="message-bubble ${m.tipo !== "texto" ? "has-media" : ""}">
          ${actions}
          ${media}
          ${text}
          <span class="message-time">${timeLabel(m.criadoEm)}</span>
        </div>
      </div>
    `;
  }).join("");

  hydrateMedia(messages);

  requestAnimationFrame(() => {
    messageList.scrollTop = messageList.scrollHeight;
  });
}


async function hydrateMedia(messages) {
  const nodes = UI.$$("[data-media-index]", messageList);

  await Promise.all(
    nodes.map(async node => {
      const msg = messages[Number(node.dataset.mediaIndex)];
      const source = msg?.mediaUrl || "";

      if (!source) return;

      try {
        const url = await mediaObjectUrl(source);

        node.classList.remove("message-media-loading");

        if (node.dataset.mediaType === "imagem") {
          node.innerHTML = `
            <img
              class="message-image"
              src="${UI.esc(url)}"
              alt="Foto enviada na conversa"
              loading="lazy"
              data-open-message-image
            >
          `;
        } else {
          node.innerHTML = `
            <div class="voice-player" data-voice-player>
              <button class="voice-play" type="button" aria-label="Reproduzir áudio">
                <svg class="voice-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7Z"/></svg>
                <svg class="voice-pause-icon hidden" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM14 5h3v14h-3z"/></svg>
              </button>
              <div class="voice-track-wrap">
                <input class="voice-progress" type="range" min="0" max="1000" value="0" aria-label="Progresso do áudio">
                <div class="voice-time"><span data-voice-current>0:00</span><span data-voice-duration>0:00</span></div>
              </div>
              <audio class="voice-audio" preload="metadata" src="${UI.esc(url)}"></audio>
            </div>
          `;
          setupVoicePlayer(node.querySelector("[data-voice-player]"));
        }

        requestAnimationFrame(() => {
          messageList.scrollTop = messageList.scrollHeight;
        });

      } catch (error) {
        console.error(error);
        node.textContent = "Não foi possível abrir este arquivo.";
      }
    })
  );
}


function formatAudioTime(value) {
  const seconds = Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function setupVoicePlayer(root) {
  if (!root) return;
  const audio = root.querySelector(".voice-audio");
  const play = root.querySelector(".voice-play");
  const playIcon = root.querySelector(".voice-play-icon");
  const pauseIcon = root.querySelector(".voice-pause-icon");
  const progress = root.querySelector(".voice-progress");
  const current = root.querySelector("[data-voice-current]");
  const duration = root.querySelector("[data-voice-duration]");

  const sync = () => {
    const total = Number.isFinite(audio.duration) ? audio.duration : 0;
    const now = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    progress.value = total ? String(Math.round((now / total) * 1000)) : "0";
    current.textContent = formatAudioTime(now);
    duration.textContent = formatAudioTime(total);
  };

  const syncPlaying = () => {
    const active = !audio.paused && !audio.ended;
    playIcon.classList.toggle("hidden", active);
    pauseIcon.classList.toggle("hidden", !active);
    root.classList.toggle("is-playing", active);
  };

  play.onclick = async () => {
    document.querySelectorAll(".voice-audio").forEach(other => {
      if (other !== audio && !other.paused) other.pause();
    });
    if (audio.paused) await audio.play().catch(() => {});
    else audio.pause();
    syncPlaying();
  };

  progress.oninput = () => {
    if (!Number.isFinite(audio.duration) || !audio.duration) return;
    audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
    sync();
  };

  audio.addEventListener("loadedmetadata", sync);
  audio.addEventListener("durationchange", sync);
  audio.addEventListener("timeupdate", sync);
  audio.addEventListener("play", syncPlaying);
  audio.addEventListener("pause", syncPlaying);
  audio.addEventListener("ended", () => { audio.currentTime = 0; sync(); syncPlaying(); });
}

function ensureImageViewer() {
  let viewer = document.querySelector("#messageImageViewer");

  if (viewer) return viewer;

  viewer = document.createElement("div");
  viewer.id = "messageImageViewer";
  viewer.className = "message-image-viewer hidden";

  viewer.innerHTML = `
    <button
      class="message-image-viewer-close"
      type="button"
      aria-label="Fechar foto"
    >
      ×
    </button>

    <img
      class="message-image-viewer-photo"
      alt="Foto da conversa"
    >
  `;

  document.body.appendChild(viewer);

  viewer.addEventListener("click", event => {
    if (
      event.target === viewer ||
      event.target.closest(".message-image-viewer-close")
    ) {
      closeImageViewer();
    }
  });

  return viewer;
}


function openImageViewer(url) {
  const viewer = ensureImageViewer();
  const image = viewer.querySelector(".message-image-viewer-photo");

  image.src = url;
  viewer.classList.remove("hidden");
  document.documentElement.classList.add("message-image-viewer-open");
}


function closeImageViewer() {
  const viewer = document.querySelector("#messageImageViewer");
  if (!viewer) return;

  viewer.classList.add("hidden");

  const image = viewer.querySelector(".message-image-viewer-photo");
  if (image) image.src = "";

  document.documentElement.classList.remove("message-image-viewer-open");
}


document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeImageViewer();
  }
});


messageList.addEventListener("click", async event => {

  const image = event.target.closest("[data-open-message-image]");

  if (image) {
    openImageViewer(image.src);
    return;
  }


  const deleteButton = event.target.closest("[data-delete-message]");

  if (!deleteButton || !currentConversation || !user) return;

  event.preventDefault();
  event.stopPropagation();

  const messageId = deleteButton.dataset.deleteMessage;

  const confirmed = await UI.confirmDialog({
    title: "Apagar mensagem?",
    message: "Essa mensagem será removida da conversa para você e para a outra pessoa.",
    confirmText: "Apagar",
    cancelText: "Cancelar",
    danger: true,
    icon: "✕"
  });

  if (!confirmed) return;

  deleteButton.disabled = true;

  try {
    await deleteMessage(
      user,
      currentConversation.id,
      messageId
    );

    UI.toast("Mensagem apagada.");

  } catch (error) {
    console.error(error);
    UI.toast(
      error.message ||
      "Não foi possível apagar a mensagem."
    );

    deleteButton.disabled = false;
  }
});


function ensureUploadStatus() {
  let status = document.querySelector("#composerUploadStatus");

  if (status) return status;

  status = document.createElement("div");
  status.id = "composerUploadStatus";
  status.className = "composer-upload-status hidden";

  status.innerHTML = `
    <span class="composer-upload-spinner"></span>
    <strong></strong>
  `;

  composer.prepend(status);

  return status;
}


async function setSending(state, label = "") {
  sending = state;

  sendButton.disabled = state;
  attachImage.disabled = state;
  recordAudio.disabled = state;

  sendButton.classList.toggle("is-sending", state);

  const status = ensureUploadStatus();
  const text = status.querySelector("strong");

  if (state && label) {
    text.textContent = label;
    status.classList.remove("hidden");
  } else {
    text.textContent = "";
    status.classList.add("hidden");
  }
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
    user = null;
    stopConversations?.();
    stopMessages?.();
    stopConversations = null;
    stopMessages = null;
    currentConversation = null;
    shell.classList.add("hidden");
    authGate?.classList.remove("hidden");
    const next = `${location.pathname.split("/").pop() || "mensagens.html"}${location.search || ""}`;
    if (loginAction) loginAction.href = `login.html?next=${encodeURIComponent(next)}`;
    if (signupAction) signupAction.href = `cadastro.html?next=${encodeURIComponent(next)}`;
    return;
  }
  user = account;
  authGate?.classList.add("hidden");
  shell.classList.remove("hidden");

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
