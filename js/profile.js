import { auth } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  privateProfile,
  publicAuthor,
  authorBooks,
  favorites,
  progress,
  follows,
  followers,
  isFollowing,
  toggleFollow,
  removeSelfFollow
} from "./firebase-data.js";

const params = new URLSearchParams(location.search);
const requestedId = params.get("id");

UI.shell(requestedId ? "" : "profile");

let currentUser = null;
let targetId = requestedId || null;
let ownProfile = false;

function renderAvatar(name, photo) {
  const avatar = UI.$("#avatar");

  avatar.textContent = photo ? "" : UI.initials(name);

  avatar.style.backgroundImage =
    photo ? `url("${photo}")` : "";
}

function renderMeta(profile) {
  const box = UI.$("#profileMeta");

  const items = [];

  const idade = Number(profile?.idade || 0);
  const localizacao =
    profile?.localizacao ||
    profile?.cidade ||
    "";

  const genero = profile?.genero || "";

  if (idade > 0) {
    items.push(`Idade: ${idade} anos`);
  }

  if (localizacao) {
    items.push(`Cidade/Estado: ${localizacao.replace(",", " /")}`);
  }

  if (genero) {
    items.push(`Gênero: ${genero}`);
  }

  box.innerHTML = items.map(item =>
    `<span class="profile-meta-pill">${UI.esc(item)}</span>`
  ).join("");
}

function renderSocials(profile) {
  const box = UI.$("#profileSocials");

  const social = profile?.redesSociais || {};

  const networks = [
    ["Instagram", social.instagram],
    ["TikTok", social.tiktok],
    ["YouTube", social.youtube],
    ["X / Twitter", social.twitter],
    ["Facebook", social.facebook],
    ["Site", social.site]
  ];

  box.innerHTML = networks
    .map(([label, url]) => [label, UI.safeHttps(url)])
    .filter(([, url]) => url)
    .map(([label, url]) => `
      <a
        class="btn profile-social-btn"
        href="${UI.esc(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${socialIcon(label)}
      </a>
    `)
    .join("");
}


function socialIcon(label) {
  const icons = {
    "Instagram": `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
    </svg>`,

    "TikTok": `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 4v10.2a4.3 4.3 0 1 1-3.2-4.15v2.8a1.8 1.8 0 1 0 .7 1.35V4h2.5zm0 0c.5 2.1 1.7 3.5 4 4v2.7c-1.7-.25-3-1-4-2V4z" fill="currentColor"/>
    </svg>`,

    "YouTube": `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="currentColor"/>
      <path d="M10 9l6 3-6 3z" fill="var(--surface,#111827)"/>
    </svg>`,

    "X / Twitter": `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4l14 16M19 4L5 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`,

    "Facebook": `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 8h4V4h-4c-3 0-5 2-5 5v3H6v4h3v6h4v-6h4l1-4h-5V9c0-.7.3-1 1-1z" fill="currentColor"/>
    </svg>`,

    "Site": `<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="1.7"/>
    </svg>`
  };

  return icons[label] || UI.esc(label);
}

async function loadOwnProfile(user) {

  await removeSelfFollow(user.uid).catch(() => {});

  const [
    privateData,
    publicData,
    favs,
    reading,
    following,
    followerList,
    books
  ] = await Promise.all([

    privateProfile(user.uid),

    publicAuthor(user.uid).catch(() => null),

    favorites(user.uid).catch(() => []),

    progress(user.uid).catch(() => []),

    follows(user.uid).catch(() => []),

    followers(user.uid).catch(() => []),

    authorBooks(user.uid).catch(() => [])

  ]);

  const profile = {
    ...(publicData || {}),
    ...(privateData || {})
  };

  const name =
    profile.nome ||
    user.displayName ||
    "Leitor";

  const photo =
    profile.fotoURL ||
    profile.foto ||
    user.photoURL ||
    "";

  renderAvatar(name, photo);

  UI.$("#profileEyebrow").textContent = "MEU PERFIL";

  UI.$("#name").textContent = name;

  UI.$("#bio").textContent =
    profile.biografia ||
    "Você ainda não escreveu uma biografia.";

  renderMeta(profile);
  renderSocials(profile);

  UI.$("#ownProfileActions").classList.remove("hidden");

  UI.$("#visitorProfileActions").classList.add("hidden");

  UI.$("#followerCount").textContent =
    followerList.filter(x => x.usuarioId !== user.uid).length;

  UI.$("#readCount").textContent = reading.length;

  UI.$("#followCount").textContent =
    following.filter(x => x.autorId !== user.uid).length;

  UI.$("#booksCount").textContent = books.length;

  UI.$("#profileSectionTitle").textContent =
    "Minha biblioteca";

  UI.$("#profileSectionSubtitle").textContent =
    "Histórias que você salvou.";

  UI.$("#profileSectionLink").href =
    "biblioteca.html";

  const savedBooks = favs
    .map(f => ({
      id: f.livroId,
      title: f.titulo || "Livro",
      author: f.autor || "Autor",
      cover: f.capa || ""
    }));

  UI.$("#profileBooks").innerHTML =
    savedBooks.length
      ? savedBooks.slice(0, 6).map(UI.bookCard).join("")
      : `<div class="empty-state">Sua biblioteca está vazia.</div>`;

  UI.$("#logout").onclick = async () => {
    await signOut(auth);
    location.replace("login.html");
  };
}

async function loadPublicProfile(id, user) {

  const [author, books] = await Promise.all([
    publicAuthor(id),
    authorBooks(id).catch(() => [])
  ]);

  if (!author) {
    throw new Error("Perfil não encontrado");
  }

  const name =
    author.nome ||
    "Autor";

  const photo =
    author.fotoURL ||
    author.foto ||
    "";

  renderAvatar(name, photo);

  UI.$("#profileEyebrow").textContent =
    "PERFIL";

  UI.$("#name").textContent = name;

  UI.$("#bio").textContent =
    author.biografia ||
    "Este usuário ainda não escreveu uma biografia.";

  renderMeta(author);
  renderSocials(author);

  UI.$("#booksCount").textContent = books.length;

  UI.$("#profileSectionTitle").textContent =
    "Histórias publicadas";

  UI.$("#profileSectionSubtitle").textContent =
    "Livros deste autor.";

  UI.$("#profileSectionLink").classList.add("hidden");

  UI.$("#profileBooks").innerHTML =
    books.length
      ? books.map(UI.bookCard).join("")
      : `<div class="empty-state">Este autor ainda não publicou histórias.</div>`;

  const followerList =
    await followers(id).catch(() => []);

  UI.$("#followerCount").textContent =
    followerList.filter(x => x.usuarioId !== id).length;

  const followingList =
    await follows(id).catch(() => []);

  UI.$("#followCount").textContent =
    followingList.filter(x => x.autorId !== id).length;

  UI.$("#readCount").textContent = "—";

  if (user && user.uid === id) {
    location.replace("perfil.html");
    return;
  }

  UI.$("#ownProfileActions").classList.add("hidden");

  UI.$("#visitorProfileActions").classList.remove("hidden");

  const button = UI.$("#followProfileBtn");

  let followed = false;

  if (user && !user.isAnonymous) {
    followed =
      await isFollowing(user.uid, id).catch(() => false);
  }

  button.textContent =
    followed ? "✓ Seguindo" : "+ Seguir";

  button.onclick = async () => {

    if (!user || user.isAnonymous) {
      location.href = "login.html";
      return;
    }

    const state =
      await toggleFollow(user, id);

    button.textContent =
      state ? "✓ Seguindo" : "+ Seguir";
  };
}

onAuthStateChanged(auth, async user => {

  currentUser =
    user && !user.isAnonymous
      ? user
      : null;

  targetId =
    requestedId ||
    currentUser?.uid ||
    null;

  if (!targetId) {
    location.replace("login.html");
    return;
  }

  ownProfile =
    !!currentUser &&
    currentUser.uid === targetId;

  try {

    if (ownProfile) {
      await loadOwnProfile(currentUser);
    } else {
      await loadPublicProfile(targetId, currentUser);
    }

  } catch (error) {

    console.error(error);

    UI.$("#name").textContent =
      "Perfil indisponível";

    UI.$("#bio").textContent =
      "Não foi possível carregar este perfil.";

  }

});
