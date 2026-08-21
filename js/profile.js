import { auth } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  privateProfile,
  publicAuthor,
  authorBooks,
  favorites,
  progress,
  publicFollows,
  publicFollowers,
  migrateSocialGraph,
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


function ensureProfilePeopleModal() {
  let modal = document.getElementById("profilePeopleModal");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "profilePeopleModal";
  modal.className = "profile-people-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="profile-people-backdrop" data-close-people></div>

    <div class="profile-people-sheet" role="dialog" aria-modal="true">
      <div class="profile-people-head">
        <strong id="profilePeopleTitle">Usuários</strong>
        <button type="button" class="profile-people-close" data-close-people aria-label="Fechar">×</button>
      </div>

      <div id="profilePeopleList" class="profile-people-list"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-close-people]").forEach(el => {
    el.addEventListener("click", () => {
      modal.hidden = true;
      document.body.classList.remove("profile-people-open");
    });
  });

  return modal;
}

async function openProfilePeople(kind, uid, isPrivate = false) {
  if (!uid) return;

  const modal = ensureProfilePeopleModal();
  const title = modal.querySelector("#profilePeopleTitle");
  const list = modal.querySelector("#profilePeopleList");

  title.textContent = kind === "followers" ? "Seguidores" : "Seguindo";
  list.innerHTML = `<div class="profile-people-state">Carregando...</div>`;

  modal.hidden = false;
  document.body.classList.add("profile-people-open");

  if (isPrivate) {
    list.innerHTML = `
      <div class="profile-people-state">
        <div class="profile-private-icon">🔒</div>
        <strong>Esta lista é privada</strong>
        <span>O dono deste perfil escolheu não mostrar esta lista.</span>
      </div>
    `;
    return;
  }

  try {
    const relations =
      kind === "followers"
        ? await publicFollowers(uid)
        : await publicFollows(uid);

    const ids = [...new Set(
      relations
        .map(item =>
          kind === "followers"
            ? item.usuarioId
            : item.autorId
        )
        .filter(Boolean)
        .filter(id => id !== uid)
    )];

    if (!ids.length) {
      list.innerHTML = `
        <div class="profile-people-state">
          ${
            kind === "followers"
              ? "Ainda não há seguidores."
              : "Este perfil ainda não segue ninguém."
          }
        </div>
      `;
      return;
    }

    const profiles = await Promise.all(
      ids.map(id => publicAuthor(id).catch(() => null))
    );

    list.innerHTML = ids.map((id, index) => {
      const profile = profiles[index] || {};
      const name =
        profile.nome ||
        profile.name ||
        profile.displayName ||
        "Usuário";

      const photo =
        profile.fotoURL ||
        profile.photoURL ||
        profile.avatar ||
        "";

      const avatar = photo
        ? `<img src="${UI.esc(photo)}" alt="">`
        : `<span>${UI.esc(name.charAt(0).toUpperCase())}</span>`;

      return `
        <a class="profile-person-row"
           href="perfil.html?id=${encodeURIComponent(id)}">
          <div class="profile-person-avatar">
            ${avatar}
          </div>

          <div class="profile-person-info">
            <strong>${UI.esc(name)}</strong>
            <span>Ver perfil</span>
          </div>

          <span class="profile-person-arrow">›</span>
        </a>
      `;
    }).join("");

  } catch (error) {
    console.error(error);
    list.innerHTML = `
      <div class="profile-people-state">
        Não foi possível carregar esta lista.
      </div>
    `;
  }
}

function wireProfilePeopleStats(uid, privacy = {}) {
  const follower = document.getElementById("followerCount")?.closest(".profile-stat");
  const following = document.getElementById("followCount")?.closest(".profile-stat");

  const activate = (element, kind) => {
    if (!element) return;

    element.classList.add("profile-stat-clickable");
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");

    element.onclick = () => openProfilePeople(
      kind,
      uid,
      kind === "followers"
        ? privacy.followersPrivate === true
        : privacy.followingPrivate === true
    );

    element.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProfilePeople(
          kind,
          uid,
          kind === "followers"
            ? privacy.followersPrivate === true
            : privacy.followingPrivate === true
        );
      }
    };
  };

  activate(follower, "followers");
  activate(following, "following");
}



function ensureProfileBooksModal() {
  let modal = document.getElementById("profileBooksModal");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "profileBooksModal";
  modal.className = "profile-people-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="profile-people-backdrop" data-close-books></div>

    <div class="profile-people-sheet" role="dialog" aria-modal="true">
      <div class="profile-people-head">
        <strong id="profileBooksModalTitle">Livros</strong>
        <button
          type="button"
          class="profile-people-close"
          data-close-books
          aria-label="Fechar"
        >×</button>
      </div>

      <div id="profileBooksModalList" class="profile-books-modal-list"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-close-books]").forEach(el => {
    el.addEventListener("click", () => {
      modal.hidden = true;
      document.body.classList.remove("profile-people-open");
    });
  });

  return modal;
}

function openProfileBooks(kind, books = [], isPrivate = false) {
  const modal = ensureProfileBooksModal();
  const title = modal.querySelector("#profileBooksModalTitle");
  const list = modal.querySelector("#profileBooksModalList");

  title.textContent =
    kind === "reading"
      ? "Livros lidos"
      : "Livros publicados";

  modal.hidden = false;
  document.body.classList.add("profile-people-open");

  if (isPrivate) {
    list.innerHTML = `
      <div class="profile-people-state">
        <div class="profile-private-icon">🔒</div>
        <strong>Esta lista é privada</strong>
        <span>O dono deste perfil escolheu não mostrar seus livros lidos.</span>
      </div>
    `;
    return;
  }

  if (!books.length) {
    list.innerHTML = `
      <div class="profile-people-state">
        ${
          kind === "reading"
            ? "Nenhum livro lido ainda."
            : "Nenhum livro publicado ainda."
        }
      </div>
    `;
    return;
  }

  list.innerHTML = books.map(book => {
    const id =
      book.livroId ||
      book.bookId ||
      book.id ||
      "";

    const title =
      book.titulo ||
      book.title ||
      "Livro";

    const cover =
      book.capa ||
      book.cover ||
      "";

    const detail =
      kind === "reading"
        ? (
            book.ultimoCapituloTitulo
              ? `Último capítulo: ${book.ultimoCapituloTitulo}`
              : "Continuar leitura"
          )
        : (
            book.genero ||
            book.genre ||
            "Ver história"
          );

    const coverHtml = cover
      ? `<img src="${UI.esc(cover)}" alt="">`
      : `<span class="profile-book-placeholder">📖</span>`;

    return `
      <a
        class="profile-book-modal-row"
        href="${id ? `livro.html?id=${encodeURIComponent(id)}` : "#"}"
      >
        <div class="profile-book-modal-cover">
          ${coverHtml}
        </div>

        <div class="profile-book-modal-info">
          <strong>${UI.esc(title)}</strong>
          <span>${UI.esc(detail)}</span>
        </div>

        <span class="profile-person-arrow">›</span>
      </a>
    `;
  }).join("");
}

function wireProfileBookStats(readingBooks, publishedBooks, canViewReading) {
  const readingStat =
    document.getElementById("readCount")?.closest(".profile-stat");

  const publishedStat =
    document.getElementById("booksCount")?.closest(".profile-stat");

  const activate = (element, handler) => {
    if (!element) return;

    element.classList.add("profile-stat-clickable");
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");

    element.onclick = handler;

    element.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler();
      }
    };
  };

  activate(readingStat, () => {
    openProfileBooks(
      "reading",
      canViewReading ? readingBooks : [],
      !canViewReading
    );
  });

  activate(publishedStat, () => {
    openProfileBooks("published", publishedBooks, false);
  });
}


async function loadOwnProfile(user) {
  wireProfilePeopleStats(user.uid);

  await removeSelfFollow(user.uid).catch(() => {});
  await migrateSocialGraph(user.uid).catch(() => {});

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

    publicFollows(user.uid).catch(() => []),

    publicFollowers(user.uid).catch(() => []),

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

  UI.$("#visitorProfileActions").classList.add("hidden");

  UI.$("#followerCount").textContent =
    followerList.filter(x => x.usuarioId !== user.uid).length;

  UI.$("#readCount").textContent = reading.length;

  UI.$("#followCount").textContent =
    following.filter(x => x.autorId !== user.uid).length;

  UI.$("#booksCount").textContent = books.length;

  wireProfileBookStats(reading, books, true);

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

}

async function loadPublicProfile(id, user) {

  const [author, books] = await Promise.all([
    publicAuthor(id),
    authorBooks(id).catch(() => [])
  ]);

  if (!author) {
    throw new Error("Perfil não encontrado");
  }

  wireProfilePeopleStats(id, {
    followersPrivate: author.privacidadeSeguidores === "privado",
    followingPrivate: author.privacidadeSeguindo === "privado"
  });

  const readingIsPublic =
    author.privacidadeLeituras === "publico";

  const publicReading = readingIsPublic
    ? await progress(id).catch(() => [])
    : [];

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

  wireProfileBookStats(
    publicReading,
    books,
    readingIsPublic
  );

  UI.$("#profileSectionTitle").textContent =
    "Histórias publicadas";

  UI.$("#profileSectionSubtitle").textContent =
    "Livros deste autor.";

  UI.$("#profileSectionLink").classList.add("hidden");

  UI.$("#profileBooks").innerHTML =
    books.length
      ? books.map(UI.bookCard).join("")
      : `<div class="empty-state">Este autor ainda não publicou histórias.</div>`;

  const followersPrivate = author.privacidadeSeguidores === "privado";
  const followingPrivate = author.privacidadeSeguindo === "privado";

  const followerList = followersPrivate
    ? []
    : await publicFollowers(id).catch(() => []);

  UI.$("#followerCount").textContent = followersPrivate
    ? (author.seguidoresCount ?? "—")
    : followerList.filter(x => x.usuarioId !== id).length;

  const followingList = followingPrivate
    ? []
    : await publicFollows(id).catch(() => []);

  UI.$("#followCount").textContent = followingPrivate
    ? (author.seguindoCount ?? "—")
    : followingList.filter(x => x.autorId !== id).length;

  UI.$("#readCount").textContent =
    readingIsPublic ? publicReading.length : "—";

  if (user && user.uid === id) {
    location.replace("perfil.html");
    return;
  }

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

    const followerCount = UI.$("#followerCount");
    const currentCount = Number(followerCount?.textContent);
    if (followerCount && Number.isFinite(currentCount)) {
      followerCount.textContent = Math.max(0, currentCount + (state ? 1 : -1));
    }
  };

  const messageButton = UI.$("#messageProfileBtn");
  if (messageButton) {
    messageButton.onclick = () => {
      if (!user || user.isAnonymous) {
        location.href = `login.html?next=${encodeURIComponent(`mensagens.html?to=${id}`)}`;
        return;
      }
      location.href = `mensagens.html?to=${encodeURIComponent(id)}`;
    };
  }
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
