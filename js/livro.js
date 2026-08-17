document.addEventListener("DOMContentLoaded", () => {
  const UI = window.UI;
  UI.shell("");

  const id = new URLSearchParams(location.search).get("id");
  const detail = UI.$("#detail");
  const chaptersArea = UI.$("#chapters");

  detail.innerHTML = `<div class="loading-state">Carregando livro...</div>`;
  chaptersArea.innerHTML = `<div class="loading-state">Carregando capítulos...</div>`;

  carregar();

  async function carregar() {
    try {
      const modulo = await import("./firestore-data.js");
      const book = await modulo.carregarLivroComCapitulos(id);

      if (!book) {
        detail.innerHTML = `<div class="loading-state">Livro não encontrado ou não publicado.</div>`;
        chaptersArea.innerHTML = "";
        return;
      }

      document.title = `${book.title} · Entre Capítulos`;

      const first = book.chapters[0];
      const readButton = first
        ? `<a class="btn btn-primary" href="leitura.html?id=${encodeURIComponent(first.id)}">▶ Começar leitura</a>`
        : `<button class="btn btn-primary" disabled style="opacity:.55;cursor:not-allowed">Sem capítulos publicados</button>`;

      detail.innerHTML = `
        ${UI.coverMarkup(book)}
        <div>
          <span class="eyebrow">${UI.esc(book.genre)}</span>
          <h1>${UI.esc(book.title)}</h1>
          <div class="muted">por <strong>${UI.esc(book.author)}</strong></div>
          <div class="meta-pills">
            <span class="pill">★ ${book.rating || "Novo"}</span>
            <span class="pill">${UI.fmt(book.reads)} leituras</span>
            <span class="pill">${book.chapters.length} capítulos</span>
          </div>
          <p class="detail-description">${UI.esc(book.description)}</p>
          <div class="hero-actions detail-actions">
            ${readButton}
            <a class="btn" href="explorar.html">Explorar mais</a>
          </div>
        </div>`;

      chaptersArea.innerHTML = book.chapters.length
        ? book.chapters.map(chapter => `
            <a class="chapter" href="leitura.html?id=${encodeURIComponent(chapter.id)}">
              <span class="chapter-num">${chapter.number}</span>
              <span>
                <strong>${UI.esc(chapter.title)}</strong>
                <span>${chapter.summary ? UI.esc(chapter.summary) : `Capítulo ${chapter.number}`}</span>
              </span>
              <b>→</b>
            </a>
          `).join("")
        : `<div class="loading-state">Nenhum capítulo publicado ainda.</div>`;

    } catch (erro) {
      console.error(erro);
      detail.innerHTML = `<div class="loading-state">Erro ao conectar ao Firebase: ${UI.esc(erro?.message || "erro desconhecido")}</div>`;
      chaptersArea.innerHTML = "";
    }
  }
});
