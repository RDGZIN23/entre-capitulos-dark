import { auth, db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { publicAuthor, isFollowing } from "./firebase-data.js";
import { uploadChatMedia, deleteCloudinaryUploadByToken } from "./cloudinary.js";
import { APP } from "./config.js";

const MEDIA_LIMITS = {
  image: 8 * 1024 * 1024,
  audio: 15 * 1024 * 1024
};

const mediaCache = new Map();

function timeMs(v) {
  return v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : Number(v) || 0);
}

function pair(a, b) {
  return [String(a || ""), String(b || "")].sort();
}

export function conversationIdFor(a, b) {
  return pair(a, b).join("__");
}

export async function canStartConversation(senderId, targetId) {
  if (!senderId || !targetId || senderId === targetId) return false;
  const target = await publicAuthor(targetId).catch(() => null);
  const pref = target?.privacidadeMensagens || "todos";
  if (pref === "ninguem") return false;
  if (pref === "seguindo") {
    return isFollowing(targetId, senderId).catch(() => false);
  }
  return true;
}

export async function ensureConversation(user, targetId) {
  if (!user || user.isAnonymous || !targetId || user.uid === targetId) {
    throw new Error("Conversa inválida.");
  }

  const allowed = await canStartConversation(user.uid, targetId);
  if (!allowed) {
    throw new Error("Este perfil não está recebendo novas mensagens de você.");
  }

  const [a, b] = pair(user.uid, targetId);
  const id = conversationIdFor(user.uid, targetId);
  const ref = doc(db, "conversas", id);

  const [me, other] = await Promise.all([
    publicAuthor(user.uid).catch(() => null),
    publicAuthor(targetId).catch(() => null)
  ]);

  const infoA = a === user.uid ? me : other;
  const infoB = b === user.uid ? me : other;

  const base = {
    participantes: [a, b],
    participanteA: a,
    participanteB: b,
    perfilA: {
      nome: infoA?.nome || (a === user.uid ? user.displayName : "") || "Leitor",
      fotoURL: infoA?.fotoURL || (a === user.uid ? user.photoURL : "") || ""
    },
    perfilB: {
      nome: infoB?.nome || (b === user.uid ? user.displayName : "") || "Leitor",
      fotoURL: infoB?.fotoURL || (b === user.uid ? user.photoURL : "") || ""
    }
  };

  await setDoc(ref, base, { merge: true });

  const snap = await getDoc(ref);
  return snap.exists()
    ? { id: snap.id, ...snap.data() }
    : { id, ...base };
}

export async function conversationById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, "conversas", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function watchConversations(uid, callback, onError = console.error) {
  const q = query(collection(db, "conversas"), where("participantes", "array-contains", uid));
  return onSnapshot(q, snap => {
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => timeMs(b.atualizadoEm) - timeMs(a.atualizadoEm));
    callback(list);
  }, onError);
}

export function watchMessages(conversationId, callback, onError = console.error) {
  const q = query(
    collection(db, "conversas", conversationId, "mensagens"),
    orderBy("criadoEm", "asc"),
    limit(150)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, onError);
}

export async function sendTextMessage(user, conversation, text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  if (clean.length > 4000) throw new Error("A mensagem é muito grande.");
  return sendMessage(user, conversation, { tipo: "texto", texto: clean });
}

export async function sendMediaMessage(user, conversation, file, tipo) {
  if (!file || !["imagem", "audio"].includes(tipo)) throw new Error("Arquivo inválido.");
  const max = tipo === "imagem" ? MEDIA_LIMITS.image : MEDIA_LIMITS.audio;
  if (file.size > max) {
    throw new Error(tipo === "imagem" ? "A foto deve ter no máximo 8 MB." : "O áudio deve ter no máximo 15 MB.");
  }
  if (tipo === "imagem" && !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
    throw new Error("Use uma imagem JPG, PNG, WEBP ou GIF.");
  }
  if (tipo === "audio" && !/^audio\//i.test(file.type)) {
    throw new Error("Formato de áudio não suportado.");
  }

  const uploaded = await uploadChatMedia(file, {
    tipo,
    conversationId: conversation.id,
    userId: user.uid
  });

  try {
    return await sendMessage(user, conversation, {
      tipo,
      mediaUrl: uploaded.url,
      cloudinaryPublicId: uploaded.publicId,
      cloudinaryResourceType: uploaded.resourceType,
      cloudinaryFormat: uploaded.format,
      mediaBytes: uploaded.bytes,
      mimeType: file.type || "",
      arquivoNome: file.name || ""
    });
  } catch (error) {
    await deleteCloudinaryUploadByToken(uploaded.deleteToken).catch(() => false);
    throw error;
  }
}

async function sendMessage(user, conversation, payload) {
  const other = otherParticipant(conversation, user.uid);
  if (!other) throw new Error("Destinatário inválido.");
  const msgRef = doc(collection(db, "conversas", conversation.id, "mensagens"));
  const notificationRef = doc(collection(db, "notificacoes"));
  const batch = writeBatch(db);
  const preview = payload.tipo === "imagem" ? "📷 Foto" : payload.tipo === "audio" ? "🎤 Áudio" : String(payload.texto || "").slice(0, 140);

  batch.set(msgRef, {
    remetenteId: user.uid,
    destinatarioId: other,
    tipo: payload.tipo,
    texto: payload.texto || "",
    mediaUrl: payload.mediaUrl || "",
    cloudinaryPublicId: payload.cloudinaryPublicId || "",
    cloudinaryResourceType: payload.cloudinaryResourceType || "",
    cloudinaryFormat: payload.cloudinaryFormat || "",
    mediaBytes: Number(payload.mediaBytes || 0),
    mimeType: payload.mimeType || "",
    arquivoNome: payload.arquivoNome || "",
    criadoEm: serverTimestamp()
  });

  batch.update(doc(db, "conversas", conversation.id), {
    ultimoTexto: preview,
    ultimoTipo: payload.tipo,
    ultimaMensagemEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  batch.set(notificationRef, {
    destinatarioId: other,
    remetenteId: user.uid,
    tipo: "mensagem",
    conversaId: conversation.id,
    texto: preview,
    lida: false,
    criadoEm: serverTimestamp()
  });

  await batch.commit();
  return msgRef.id;
}

export function otherParticipant(conversation, uid) {
  return (conversation?.participantes || []).find(id => id !== uid) || "";
}

export function conversationProfile(conversation, uid) {
  const other = otherParticipant(conversation, uid);
  if (!other) return { uid: "", nome: "Usuário", fotoURL: "" };
  const info = conversation.participanteA === other ? conversation.perfilA : conversation.perfilB;
  return { uid: other, nome: info?.nome || "Usuário", fotoURL: info?.fotoURL || "" };
}

export async function mediaObjectUrl(source) {
  const value = String(source || "").trim();
  if (!value) return "";
  if (mediaCache.has(value)) return mediaCache.get(value);

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Mídia indisponível.");
  }

  if (
    parsed.protocol !== "https:"
    || parsed.hostname !== "res.cloudinary.com"
    || !parsed.pathname.startsWith(`/${APP.cloudinary.cloudName}/`)
  ) {
    throw new Error("URL de mídia inválida.");
  }

  mediaCache.set(value, value);
  return value;
}

export async function notificationsFor(uid) {
  const snap = await getDocs(query(collection(db, "notificacoes"), where("destinatarioId", "==", uid)));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => timeMs(b.criadoEm) - timeMs(a.criadoEm));
}

export function watchNotifications(uid, callback, onError = console.error) {
  const q = query(collection(db, "notificacoes"), where("destinatarioId", "==", uid));
  return onSnapshot(q, snap => {
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => timeMs(b.criadoEm) - timeMs(a.criadoEm));
    callback(list);
  }, onError);
}

export async function markNotificationRead(id) {
  if (!id) return;
  await updateDoc(doc(db, "notificacoes", id), { lida: true });
}

export async function markConversationNotificationsRead(uid, conversationId) {
  const list = await notificationsFor(uid).catch(() => []);
  await Promise.all(
    list
      .filter(n => !n.lida && n.tipo === "mensagem" && n.conversaId === conversationId)
      .map(n => updateDoc(doc(db, "notificacoes", n.id), { lida: true }).catch(() => {}))
  );
}

export async function markAllNotificationsRead(uid) {
  const list = await notificationsFor(uid).catch(() => []);
  await Promise.all(list.filter(n => !n.lida).map(n => updateDoc(doc(db, "notificacoes", n.id), { lida: true }).catch(() => {})));
}

export { auth };
