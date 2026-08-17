import { carregarBibliotecaPublica } from "./firestore-data.js";

document.addEventListener("DOMContentLoaded", async () => {
  UI.shell("explore");

  const input = UI.$("#search");
  const grid = UI.$("#grid");
  const counter = UI.$("#counter");
  const filters = UI.$("#filters");

  const params = new URLSearchParams(location.search);
  input.value = params.get("q") || "";

  grid.innerHTML = `<div class="loading-state">Carregando histórias...</div>`;

  try {
    const { books } = await carregarBibliotecaPublica();
    let genre = "Todos";

    const genres = ["Todos", ...new Set(books.map(book => book.genre).filter(Boolean))];

    filters.innerHTML = genres.map((item,index) =>
      `<button class="filter ${index===0?"active":""}" data-g="${UI.esc(item)}">${UI.esc(item)}</button>`
    ).join("");

    function render() {
      const term = input.value.trim().toLowerCase();

      const items = books.filter(book => {
        const text = [
          book.title,
          book.author,
          book.genre,
          book.description,
          ...(book.chapters || []).flatMap(chapter => [
            chapter.title,
            chapter.summary
          ])
        ].join(" ").toLowerCase();

        return (!term || text.includes(term)) &&
          (genre === "Todos" || book.genre === genre);
      });

      counter.textContent = `${items.length} ${items.length===1?"história":"histórias"}`;
      grid.innerHTML = items.length
        ? items.map(UI.bookCard).join("")
        : `<div class="loading-state">Nenhuma história encontrada.</div>`;
    }

    input.addEventListener("input", render);

    UI.$$("[data-g]").forEach(button => {
      button.addEventListener("click", () => {
        UI.$$("[data-g]").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        genre = button.dataset.g;
        render();
      });
    });

    render();

  } catch (erro) {
    console.error("Erro ao explorar livros:", erro);
    counter.textContent = "0 histórias";
    grid.innerHTML = `<div class="loading-state">Não foi possível carregar os livros do Firebase.</div>`;
  }
});
