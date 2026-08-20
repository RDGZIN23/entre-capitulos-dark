import { auth } from "./firebase-config.js";
import {
  publicBooks,
  progress,
  ensureViewer,
  latestPublishedChapters
} from "./firebase-data.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

UI.shell("home");

const hero = UI.$("#hero");
const cont = UI.$("#continueList");
const shelvesRoot = UI.$("#homeShelves");

let books = [];


/* =========================================================
   UTILIDADES
   ========================================================= */

const ms = value => UI.timeMs(value);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const activityTime = book => {
  const chapterTimes = (book.chapters || []).map(ch =>
    Math.max(
      ms(ch.updatedAt),
      ms(ch.createdAt)
    )
  );

  return Math.max(
    ms(book.updatedAt),
    ms(book.createdAt),
    ...chapterTimes,
    0
  );
};

const latestChapter = book =>
  [...(book.chapters || [])]
    .sort((a, b) =>
      Math.max(ms(b.updatedAt), ms(b.createdAt)) -
      Math.max(ms(a.updatedAt), ms(a.createdAt))
    )[0] || null;

const isToday = value =>
  ms(value) >= startOfToday();

const publishedToday = book => {
  if (isToday(book.createdAt)) return true;

  return (book.chapters || []).some(ch =>
    isToday(ch.createdAt)
  );
};

const tagSummary = book => {
  const tags = Array.isArray(book.tags)
    ? book.tags
        .map(tag => String(tag || "").trim())
        .filter(Boolean)
    : [];

  const unique = [...new Set(tags)];

  if (!unique.length && book.genre) {
    unique.push(String(book.genre).trim());
  }

  return {
    visible: unique.slice(0, 2),
    remaining: Math.max(0, unique.length - 2)
  };
};

const trendingScore = book => {
  const reads = Number(book.reads || 0);
  const rating = Number(book.rating || 0);
  const ratingCount = Number(book.ratingCount || 0);

  const ageHours = activityTime(book)
    ? Math.max(
        1,
        (Date.now() - activityTime(book)) / 3600000
      )
    : 9999;

  const recentBoost =
    ageHours <= 24 ? 80 :
    ageHours <= 72 ? 45 :
    ageHours <= 168 ? 20 :
    0;

  return (
    reads +
    rating * 8 +
    ratingCount * 4 +
    recentBoost
  );
};


/* =========================================================
   CARD COMPACTO
   ========================================================= */

function shelfCard(book, badge = "") {
  const cover = UI.safeHttps(book.cover);
  const tagInfo = tagSummary(book);

  const ratingText =
    Number(book.rating || 0) > 0
      ? `★ ${book.rating}`
      : "★ Novo";

  return `
    <a
      class="shelf-book"
      href="livro.html?id=${encodeURIComponent(book.id)}"
      aria-label="${UI.esc(book.title)}"
    >

      <div class="shelf-cover">

        ${
          cover
            ? `
              <img
                src="${UI.esc(cover)}"
                alt="Capa de ${UI.esc(book.title)}"
                loading="lazy"
              >
            `
            : `
              <span class="shelf-placeholder-title">
                ${UI.esc(book.title)}
              </span>

              <span class="shelf-placeholder-author">
                ${UI.esc(book.author)}
              </span>
            `
        }

        ${
          badge
            ? `<span class="shelf-badge">${UI.esc(badge)}</span>`
            : ""
        }

      </div>

      <div class="shelf-book-info">

        <strong class="shelf-book-title">
          ${UI.esc(book.title)}
        </strong>

        <span class="shelf-book-author">
          ${UI.esc(book.author || "Autor")}
        </span>

        ${
          tagInfo.visible.length
            ? `
              <div class="shelf-book-tags">
                <span>
                  ${tagInfo.visible.map(UI.esc).join(", ")}
                </span>

                ${
                  tagInfo.remaining
                    ? `<b>+${tagInfo.remaining}</b>`
                    : ""
                }
              </div>
            `
            : ""
        }

        <div class="shelf-book-meta">

          <span title="Visualizações">
            👁 ${UI.fmt(book.reads || 0)}
          </span>

          <span title="Avaliação">
            ${ratingText}
          </span>

        </div>

      </div>

    </a>
  `;
}


/* =========================================================
   CRIA PRATELEIRA
   ========================================================= */

function shelf({
  id,
  title,
  subtitle = "",
  items = [],
  emptyText = "",
  badge,
  href = ""
}) {

  const moreHref =
    href ||
    `explorar.html?mode=${encodeURIComponent(id)}`;

  const cards = items.length
    ? items.map((book, index) =>
        shelfCard(
          book,
          typeof badge === "function"
            ? badge(book, index)
            : badge || ""
        )
      ).join("")
    : `
      <div class="shelf-empty">
        ${UI.esc(emptyText || "Nenhum livro nesta seção ainda.")}
      </div>
    `;

  return `
    <section class="home-shelf" id="${id}">

      <div class="shelf-head">

        <div class="shelf-title-wrap">

          <h2 class="shelf-title">
            ${title}
          </h2>

          ${
            subtitle
              ? `<p class="shelf-subtitle">${subtitle}</p>`
              : ""
          }

        </div>

        <a class="shelf-more" href="${moreHref}">
          Ver todos ›
        </a>

      </div>

      <div class="shelf-scroll-wrap">

        <div class="shelf-track">
          ${cards}
        </div>

        ${
          items.length > 3
            ? `
              <button
                class="shelf-arrow"
                type="button"
                aria-label="Ver mais livros"
              >
                ›
              </button>
            `
            : ""
        }

      </div>

    </section>
  `;
}


/* =========================================================
   BOTÕES DE AVANÇAR
   ========================================================= */

function activateShelfArrows() {
  UI.$$(".shelf-arrow").forEach(button => {

    button.addEventListener("click", () => {

      const track =
        button
          .closest(".shelf-scroll-wrap")
          ?.querySelector(".shelf-track");

      if (!track) return;

      track.scrollBy({
        left: Math.max(
          240,
          track.clientWidth * 0.82
        ),
        behavior: "smooth"
      });

    });

  });
}


/* =========================================================
   HERO / DESTAQUE
   ========================================================= */

function renderHero() {

  if (!books.length) {
    hero.innerHTML = `
      <div class="empty-state">
        Nenhum livro publicado ainda.
      </div>
    `;
    return;
  }

  const featured =
    books.find(book => book.featured) ||
    [...books].sort(
      (a, b) => trendingScore(b) - trendingScore(a)
    )[0];

  const firstChapter = featured.chapters?.[0];

  const ranking = [...books]
    .sort((a, b) =>
      Number(b.reads || 0) -
      Number(a.reads || 0)
    )
    .slice(0, 5);

  hero.innerHTML = `

    ${UI.cover(featured, "hero-cover")}

    <div>

      <span class="eyebrow">
        ✦ Destaque
      </span>

      <h1>
        ${UI.esc(featured.title)}
      </h1>

      <div class="hero-meta">

        <span>
          ${UI.esc(featured.author)}
        </span>

        <span>
          • ${UI.esc(featured.genre)}
        </span>

        <span>
          • 👁 ${UI.fmt(featured.reads || 0)}
        </span>

        ${
          featured.rating
            ? `<span>• ★ ${featured.rating}</span>`
            : ""
        }

      </div>

      <p>
        ${UI.esc(featured.description)}
      </p>

      <div class="hero-actions">

        <a
          class="btn btn-primary"
          href="${
            firstChapter
              ? `leitura.html?id=${firstChapter.id}`
              : `livro.html?id=${featured.id}`
          }"
        >
          ▶ Ler agora
        </a>

        <a
          class="btn secondary"
          href="livro.html?id=${featured.id}"
        >
          Ver livro
        </a>

      </div>

    </div>

    <aside class="ranking">

      <h3>👁 Mais lidos</h3>

      ${ranking.map((book, index) => `

        <a
          class="rank-item"
          href="livro.html?id=${book.id}"
        >

          <span class="rank-num">
            ${index + 1}
          </span>

          <span
            class="rank-thumb"
            ${
              book.cover
                ? `style="background-image:url('${UI.esc(book.cover)}')"`
                : ""
            }
          ></span>

          <span class="rank-copy">

            <strong>
              ${UI.esc(book.title)}
            </strong>

            <span>
              👁 ${UI.fmt(book.reads || 0)}
            </span>

          </span>

        </a>

      `).join("")}

    </aside>
  `;
}


/* =========================================================
   PRATELEIRAS DA HOME
   ========================================================= */

async function renderShelves() {

  if (!books.length) {
    shelvesRoot.innerHTML = "";
    return;
  }

  let latestChapters = [];

  try {
    latestChapters =
      await latestPublishedChapters();
  } catch (error) {
    console.warn(
      "Não foi possível carregar capítulos recentes:",
      error
    );
  }


  const trending = [...books]
    .sort((a, b) =>
      trendingScore(b) - trendingScore(a)
    );


  const mostRead = [...books]
    .sort((a, b) =>
      Number(b.reads || 0) -
      Number(a.reads || 0)
    );


  const today = books
    .filter(publishedToday)
    .sort((a, b) =>
      activityTime(b) - activityTime(a)
    );


  const recent = [...books]
    .sort((a, b) =>
      ms(b.createdAt) - ms(a.createdAt)
    );


  const recentlyUpdated = [...books]
    .sort((a, b) =>
      activityTime(b) - activityTime(a)
    );


  const bestRated = books
    .filter(book =>
      Number(book.rating || 0) > 0
    )
    .sort((a, b) => {

      const ratingDiff =
        Number(b.rating || 0) -
        Number(a.rating || 0);

      if (ratingDiff !== 0)
        return ratingDiff;

      return (
        Number(b.ratingCount || 0) -
        Number(a.ratingCount || 0)
      );

    });


  /*
    Livros que receberam capítulos recentemente.
    Mantemos somente um card por livro.
  */
  const recentChapterBooks = [];

  const used = new Set();

  latestChapters.forEach(chapter => {

    if (used.has(chapter.bookId))
      return;

    const book = books.find(
      item => item.id === chapter.bookId
    );

    if (!book)
      return;

    used.add(book.id);

    recentChapterBooks.push({
      ...book,
      __latestChapter: chapter
    });

  });


  const sections = [

    shelf({
      id: "em-alta",
      title: "🔥 Em alta",
      subtitle: "Histórias chamando atenção dos leitores.",
      items: trending,
      badge: (_, index) =>
        index < 3
          ? `#${index + 1} em alta`
          : "Em alta"
    }),

    shelf({
      id: "mais-lidos",
      title: "👁 Mais lidos",
      subtitle: "Os livros com mais visualizações.",
      items: mostRead,
      badge: (_, index) =>
        `#${index + 1} mais lido`
    }),

    shelf({
      id: "publicados-hoje",
      title: "🆕 Publicados hoje",
      subtitle: "Novidades que chegaram hoje.",
      items: today,
      emptyText:
        "Ainda não houve novas publicações hoje.",
      badge: "Hoje"
    }),

    shelf({
      id: "recentes",
      title: "✨ Adicionados recentemente",
      subtitle: "As histórias mais novas da plataforma.",
      items: recent,
      badge: "Novo"
    }),

    shelf({
      id: "atualizados",
      title: "🕒 Atualizados recentemente",
      subtitle: "Histórias que receberam novidades.",
      items:
        recentChapterBooks.length
          ? recentChapterBooks
          : recentlyUpdated,
      badge: book => {

        const chapter =
          book.__latestChapter ||
          latestChapter(book);

        return chapter
          ? `Cap. ${chapter.number}`
          : "Atualizado";

      }
    }),

    shelf({
      id: "melhores-avaliacoes",
      title: "⭐ Mais bem avaliados",
      subtitle: "Histórias que conquistaram os leitores.",
      items: bestRated,
      emptyText:
        "As primeiras avaliações aparecerão aqui.",
      badge: book =>
        book.rating
          ? `★ ${book.rating}`
          : ""
    })

  ];


  /*
    PRATELEIRAS POR GÊNERO
  */
  const genres = [
    ...new Set(
      books
        .map(book => String(book.genre || "").trim())
        .filter(Boolean)
    )
  ];

  genres.forEach(genre => {

    const genreBooks = books
      .filter(book =>
        String(book.genre || "")
          .toLowerCase() ===
        genre.toLowerCase()
      )
      .sort((a, b) =>
        trendingScore(b) -
        trendingScore(a)
      );

    sections.push(
      shelf({
        id:
          "genero-" +
          genre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-"),
        title: `📚 ${UI.esc(genre)}`,
        subtitle:
          `Explore histórias de ${UI.esc(genre)}.`,
        items: genreBooks,
        badge: genre,
        href: `explorar.html?genre=${encodeURIComponent(genre)}`
      })
    );

  });


  shelvesRoot.innerHTML =
    sections.join("");

  activateShelfArrows();
}


/* =========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================= */

async function loadHome() {

  try {

    /*
      Garante autenticação anônima para permitir
      consultar as visualizações reais dos capítulos.
    */
    await ensureViewer();

    books = await publicBooks();

    renderHero();

    await renderShelves();

  } catch (error) {

    console.error(
      "Erro ao carregar a página inicial:",
      error
    );

    hero.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar os livros.
      </div>
    `;

    shelvesRoot.innerHTML = "";

  }

}

await loadHome();


/* =========================================================
   CONTINUE LENDO
   ========================================================= */

onAuthStateChanged(auth, async user => {

  if (!user || user.isAnonymous) {

    cont.innerHTML = `
      <div
        class="continue-card"
        style="grid-template-columns:1fr"
      >
        <span>
          <strong>
            Entre para sincronizar leituras
          </strong>

          <span>
            Seu progresso fica disponível em qualquer dispositivo.
          </span>
        </span>
      </div>
    `;

    return;
  }


  try {

    const saved = await progress(user.uid);

    cont.innerHTML =
      saved.length

        ? saved
            .sort((a, b) =>
              UI.timeMs(b.atualizadoEm) -
              UI.timeMs(a.atualizadoEm)
            )
            .slice(0, 6)
            .map(item => {

              const book =
                books.find(
                  b => b.id === item.livroId
                );

              const cover =
                item.capa ||
                book?.cover ||
                "";

              const chapterNumber =
                Number(
                  item.ultimoCapituloNumero || 0
                );

              const total =
                book?.chapters?.length || 0;

              const percent =
                total
                  ? Math.min(
                      100,
                      Math.round(
                        chapterNumber /
                        total *
                        100
                      )
                    )
                  : 10;

              return `
                <a
                  class="continue-card"
                  href="${
                    item.ultimoCapituloId
                      ? `leitura.html?id=${item.ultimoCapituloId}`
                      : `livro.html?id=${item.livroId}`
                  }"
                >

                  <span
                    class="continue-thumb"
                    ${
                      cover
                        ? `style="background-image:url('${UI.esc(cover)}')"`
                        : ""
                    }
                  ></span>

                  <span>

                    <strong>
                      ${UI.esc(
                        item.livroTitulo ||
                        book?.title ||
                        "Livro"
                      )}
                    </strong>

                    <span>
                      Capítulo ${
                        chapterNumber || "—"
                      }${
                        total
                          ? ` de ${total}`
                          : ""
                      }
                    </span>

                    <div class="progress">
                      <i style="width:${percent}%"></i>
                    </div>

                  </span>

                </a>
              `;

            })
            .join("")

        : `
          <div
            class="continue-card"
            style="grid-template-columns:1fr"
          >
            <span>
              <strong>
                Nenhuma leitura iniciada
              </strong>

              <span>
                Abra um capítulo para começar.
              </span>
            </span>
          </div>
        `;

  } catch (error) {

    console.error(
      "Erro ao carregar progresso:",
      error
    );

    cont.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar seu progresso.
      </div>
    `;

  }

});
