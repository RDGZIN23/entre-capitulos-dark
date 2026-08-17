import { carregarBibliotecaPublica } from "./firestore-data.js";

document.addEventListener("DOMContentLoaded", async () => {
  UI.shell("home");

  const hero = UI.$("#hero");
  const continueList = UI.$("#continueList");
  const grid = UI.$("#trendingGrid");

  hero.innerHTML = `<div class="loading-state">Carregando histórias...</div>`;
  grid.innerHTML = `<div class="loading-state">Buscando livros publicados...</div>`;

  try {
    const { books } = await carregarBibliotecaPublica();

    if (!books.length) {
      hero.innerHTML = `<div class="loading-state">Nenhum livro publicado ainda.</div>`;
      grid.innerHTML = `<div class="loading-state">Os livros publicados no Painel do Autor aparecerão aqui.</div>`;
      renderContinue(null);
      return;
    }

    const featured = books.find(book => book.featured) || books[0];
    const firstChapter = featured.chapters?.[0];
    const readHref = firstChapter
      ? `leitura.html?id=${encodeURIComponent(firstChapter.id)}`
      : `livro.html?id=${encodeURIComponent(featured.id)}`;

    hero.innerHTML = `
      ${UI.coverMarkup(featured,"hero-cover")}
      <div class="hero-copy">
        <span class="eyebrow">✦ Destaque da semana</span>
        <h1>${UI.esc(featured.title)}</h1>
        <div class="hero-meta">
          <span>${UI.esc(featured.author)}</span>
          <span>• ${UI.esc(featured.genre)}</span>
          <span>• ${UI.fmt(featured.reads)} leituras</span>
        </div>
        <p>${UI.esc(featured.description)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="${readHref}">▶ Ler agora</a>
          <a class="btn secondary" href="livro.html?id=${encodeURIComponent(featured.id)}">Ver detalhes</a>
        </div>
      </div>
      <aside class="ranking">
        <h3>Top histórias</h3>
        ${[...books]
          .sort((a,b)=>(b.reads||0)-(a.reads||0))
          .slice(0,5)
          .map((book,index)=>`
            <a class="rank-item" href="livro.html?id=${encodeURIComponent(book.id)}">
              <span class="rank-num">${index+1}</span>
              <span class="rank-thumb" ${book.cover?`style="background-image:url('${UI.esc(book.cover)}');background-size:cover;background-position:center"`:""}></span>
              <span class="rank-copy">
                <strong>${UI.esc(book.title)}</strong>
                <span>${UI.esc(book.author)}</span>
              </span>
            </a>
          `).join("")}
      </aside>
    `;

    grid.innerHTML = books.map(UI.bookCard).join("");
    configurarFiltros(books);
    renderContinue(books);

  } catch (erro) {
    console.error("Erro ao carregar página inicial:", erro);
    hero.innerHTML = `<div class="loading-state">Não foi possível carregar o destaque.</div>`;
    grid.innerHTML = `<div class="loading-state">Não foi possível carregar os livros do Firebase.</div>`;
  }

  function configurarFiltros(books) {
    const filtros = UI.$$(".filters .filter");
    filtros.forEach(botao => {
      botao.style.cursor = "pointer";
      botao.addEventListener("click", () => {
        filtros.forEach(item => item.classList.remove("active"));
        botao.classList.add("active");

        const genero = botao.textContent.trim();
        const filtrados = genero === "Todas"
          ? books
          : books.filter(book =>
              String(book.genre).toLowerCase() === genero.toLowerCase()
            );

        grid.innerHTML = filtrados.length
          ? filtrados.map(UI.bookCard).join("")
          : `<div class="loading-state">Nenhuma história nesta categoria.</div>`;
      });
    });
  }

  function renderContinue(books) {
    if (!continueList) return;

    let progresso = null;

    try {
      progresso = JSON.parse(localStorage.getItem("ultimoCapituloLido") || "null");
    } catch {}

    if (!progresso?.capituloId) {
      continueList.innerHTML = `
        <div class="continue-card" style="grid-template-columns:1fr">
          <span>
            <strong>Sua próxima leitura aparece aqui</strong>
            <span>Abra um capítulo para começar.</span>
          </span>
        </div>`;
      return;
    }

    const livro = books?.find(item => item.id === progresso.livroId);
    const capa = progresso.capa || livro?.cover || "";
    const titulo = progresso.livroTitulo || livro?.title || "Continue lendo";
    const numero = Number(progresso.numero || progresso.capituloNumero || 0);

    continueList.innerHTML = `
      <a class="continue-card" href="leitura.html?id=${encodeURIComponent(progresso.capituloId)}">
        <span class="continue-thumb" ${capa?`style="background-image:url('${UI.esc(capa)}');background-size:cover;background-position:center"`:""}></span>
        <span>
          <strong>${UI.esc(titulo)}</strong>
          <span>${numero?`Capítulo ${numero}`:"Continuar leitura"}</span>
          <div class="progress"><i style="width:55%"></i></div>
        </span>
      </a>`;
  }
});
