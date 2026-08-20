import { publicBooks } from "./firebase-data.js";

UI.shell("explore");

const input = UI.$("#search");
const grid = UI.$("#grid");
const filters = UI.$("#filters");
const counter = UI.$("#counter");
const title = UI.$("#exploreTitle");
const subtitle = UI.$("#exploreSubtitle");

const params = new URLSearchParams(location.search);

const mode = params.get("mode") || "";
const requestedGenre = params.get("genre") || "";
input.value = params.get("q") || "";

grid.innerHTML = `
  <div class="loading-state">
    Carregando...
  </div>
`;

/* ==============================
   UTILIDADES
   ============================== */

const ms = value => UI.timeMs(value);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const isToday = value =>
  ms(value) >= startOfToday();

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

const publishedToday = book => {
  if (isToday(book.createdAt)) return true;

  return (book.chapters || []).some(ch =>
    isToday(ch.createdAt)
  );
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

/* ==============================
   TÍTULO DA PÁGINA
   ============================== */

function setPageHeading() {

  const headings = {
    "em-alta": [
      "🔥 Em alta",
      "As histórias que estão chamando mais atenção dos leitores."
    ],

    "mais-lidos": [
      "👁 Mais lidos",
      "Os livros com mais visualizações da plataforma."
    ],

    "publicados-hoje": [
      "🆕 Publicados hoje",
      "As novidades publicadas hoje."
    ],

    "recentes": [
      "✨ Adicionados recentemente",
      "As histórias mais novas da plataforma."
    ],

    "atualizados": [
      "🕒 Atualizados recentemente",
      "Histórias que receberam novidades recentemente."
    ],

    "melhores-avaliacoes": [
      "⭐ Mais bem avaliados",
      "As histórias com as melhores avaliações dos leitores."
    ]
  };

  if (headings[mode]) {
    title.textContent = headings[mode][0];
    subtitle.textContent = headings[mode][1];
    return;
  }

  if (requestedGenre) {
    title.textContent = `📚 ${requestedGenre}`;
    subtitle.textContent =
      `Todas as histórias de ${requestedGenre}.`;
    return;
  }

  title.textContent = "Explorar";
  subtitle.textContent =
    "Pesquise por livro, autor, gênero, tag ou capítulo.";
}

/* ==============================
   ORDENAR / FILTRAR POR SEÇÃO
   ============================== */

function sectionBooks(allBooks) {

  const items = [...allBooks];

  switch (mode) {

    case "em-alta":
      return items.sort(
        (a, b) =>
          trendingScore(b) -
          trendingScore(a)
      );

    case "mais-lidos":
      return items.sort(
        (a, b) =>
          Number(b.reads || 0) -
          Number(a.reads || 0)
      );

    case "publicados-hoje":
      return items
        .filter(publishedToday)
        .sort(
          (a, b) =>
            activityTime(b) -
            activityTime(a)
        );

    case "recentes":
      return items.sort(
        (a, b) =>
          ms(b.createdAt) -
          ms(a.createdAt)
      );

    case "atualizados":
      return items.sort(
        (a, b) =>
          activityTime(b) -
          activityTime(a)
      );

    case "melhores-avaliacoes":
      return items
        .filter(
          book =>
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

    default:
      return items;
  }
}

/* ==============================
   CARREGAMENTO
   ============================== */

setPageHeading();

try {

  const books = await publicBooks();

  const baseBooks = sectionBooks(books);

  let genre = requestedGenre || "Todos";

  const genres = [
    "Todos",
    ...new Set(
      books
        .map(book => book.genre)
        .filter(Boolean)
    )
  ];

  filters.innerHTML = genres
    .map(g => `
      <button
        class="filter ${g === genre ? "active" : ""}"
        data-g="${UI.esc(g)}"
      >
        ${UI.esc(g)}
      </button>
    `)
    .join("");

  const render = () => {

    const q =
      input.value
        .trim()
        .toLowerCase();

    const items = baseBooks.filter(book => {

      const tags =
        Array.isArray(book.tags)
          ? book.tags
          : [];

      const chapters =
        Array.isArray(book.chapters)
          ? book.chapters
          : [];

      const hay = [
        book.title,
        book.author,
        book.genre,
        book.description,
        ...tags,
        ...chapters.flatMap(ch => [
          ch.title,
          ch.summary
        ])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !q || hay.includes(q);

      const matchesGenre =
        genre === "Todos" ||
        String(book.genre || "")
          .toLowerCase() ===
        String(genre)
          .toLowerCase();

      return (
        matchesSearch &&
        matchesGenre
      );
    });

    counter.textContent =
      `${items.length} ${
        items.length === 1
          ? "história"
          : "histórias"
      }`;

    grid.innerHTML = items.length
      ? items.map(UI.bookCard).join("")
      : `
        <div class="empty-state">
          Nenhuma história encontrada nesta seção.
        </div>
      `;
  };

  input.oninput = render;

  UI.$$("[data-g]").forEach(button => {

    button.onclick = () => {

      UI.$$("[data-g]").forEach(item =>
        item.classList.remove("active")
      );

      button.classList.add("active");

      genre = button.dataset.g;

      render();
    };

  });

  render();

} catch (error) {

  console.error(error);

  grid.innerHTML = `
    <div class="empty-state">
      Não foi possível carregar a busca.
    </div>
  `;
}
