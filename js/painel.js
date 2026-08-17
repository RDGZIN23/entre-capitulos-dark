document.addEventListener("DOMContentLoaded", () => {
  UI.shell("admin");

  const $ = UI.$;
  const $$ = UI.$$;
  const editorSection = $("#editorSection");
  const chapterSection = $("#chapterSection");
  let selectedBookId = null;

  renderAll();

  $("#bookForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = EC.getData();
    const title = $("#bookTitle").value.trim();
    if (!title) return UI.toast("Digite o título do livro.");

    const base = UI.slugify(title) || "livro";
    let id = base;
    let index = 2;
    while (data.books.some(book => book.id === id)) id = `${base}-${index++}`;

    data.books.unshift({
      id,
      title,
      author: data.user?.name || "RD Sebastião",
      genre: $("#bookGenre").value,
      reads: 0,
      rating: 0,
      featured: false,
      description: $("#bookDesc").value.trim(),
      chapters: []
    });

    EC.saveData(data);
    event.target.reset();
    UI.toast("Livro criado.");
    renderAll();
    openBook(id, true, true);
  });

  $("#editBookForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = EC.getData();
    const id = $("#editBookId").value;
    const book = data.books.find(item => item.id === id);
    if (!book) return;

    const title = $("#editBookTitle").value.trim();
    if (!title) return UI.toast("O livro precisa ter um título.");

    book.title = title;
    book.genre = $("#editBookGenre").value;
    book.description = $("#editBookDesc").value.trim();
    EC.saveData(data);
    UI.toast("Livro atualizado.");
    renderAll();
    openBook(id, false, false);
  });

  $("#deleteBook").addEventListener("click", () => {
    const id = $("#editBookId").value;
    const data = EC.getData();
    const book = data.books.find(item => item.id === id);
    if (!book) return;
    if (!confirm(`Excluir \"${book.title}\" e todos os capítulos?`)) return;

    data.books = data.books.filter(item => item.id !== id);
    data.user.favorites = (data.user.favorites || []).filter(item => item !== id);
    if (data.user.progress) delete data.user.progress[id];
    EC.saveData(data);

    selectedBookId = null;
    editorSection.classList.add("hidden");
    chapterSection.classList.add("hidden");
    UI.toast("Livro excluído.");
    renderAll();
  });

  $("#closeEditor").addEventListener("click", () => {
    selectedBookId = null;
    editorSection.classList.add("hidden");
    chapterSection.classList.add("hidden");
  });

  $("#chapterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = EC.getData();
    const bookId = $("#chapterBookId").value;
    const book = data.books.find(item => item.id === bookId);
    if (!book) return;

    const number = Number($("#chapterNumber").value);
    const title = $("#chapterTitle").value.trim();
    const text = $("#chapterText").value.trim();
    const editing = $("#editingChapterNumber").value;

    if (!number || number < 1 || !title || !text) {
      return UI.toast("Preencha número, título e texto do capítulo.");
    }

    const paragraphs = text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);

    if (editing) {
      const oldNumber = Number(editing);
      const chapter = book.chapters.find(item => Number(item.number) === oldNumber);
      if (!chapter) return;

      const duplicated = book.chapters.some(item =>
        Number(item.number) === number && Number(item.number) !== oldNumber
      );
      if (duplicated) return UI.toast(`Já existe um capítulo ${number}.`);

      chapter.number = number;
      chapter.title = title;
      chapter.text = paragraphs;
      UI.toast("Capítulo atualizado.");
    } else {
      if (book.chapters.some(item => Number(item.number) === number)) {
        return UI.toast(`Já existe um capítulo ${number}.`);
      }
      book.chapters.push({ number, title, text: paragraphs });
      UI.toast("Capítulo publicado.");
    }

    book.chapters.sort((a, b) => Number(a.number) - Number(b.number));
    EC.saveData(data);
    resetChapterForm();
    renderAll();
    openBook(bookId, false, false);
  });

  $("#cancelChapterEdit").addEventListener("click", resetChapterForm);

  function renderAll() {
    const data = EC.getData();
    $("#kpis").innerHTML = `
      <div class="kpi"><span>Livros</span><strong>${data.books.length}</strong></div>
      <div class="kpi"><span>Leituras</span><strong>${UI.fmt(data.books.reduce((sum,book)=>sum+(book.reads||0),0))}</strong></div>
      <div class="kpi"><span>Capítulos</span><strong>${data.books.reduce((sum,book)=>sum+(book.chapters?.length||0),0)}</strong></div>
      <div class="kpi"><span>Favoritos</span><strong>${data.user.favorites?.length || 0}</strong></div>`;

    $("#bookRows").innerHTML = data.books.map(book => `
      <tr>
        <td><strong>${UI.esc(book.title)}</strong><div class="muted small">${UI.esc(book.genre || "")}</div></td>
        <td>${book.chapters?.length || 0}</td>
        <td>${UI.fmt(book.reads || 0)}</td>
        <td><span class="status ${(book.chapters?.length || 0) ? "live" : "draft"}">${(book.chapters?.length || 0) ? "Publicado" : "Rascunho"}</span></td>
        <td>
          <div style="display:flex;gap:7px;flex-wrap:nowrap;min-width:max-content">
            <button class="btn js-edit-book" style="height:34px;padding:0 10px" data-id="${book.id}">Editar</button>
            <button class="btn btn-primary js-chapters-book" style="height:34px;padding:0 10px" data-id="${book.id}">Capítulos</button>
            <a class="btn" style="height:34px;padding:0 10px" href="livro.html?id=${book.id}">Abrir</a>
          </div>
        </td>
      </tr>`).join("");

    $$(".js-edit-book").forEach(button => {
      button.addEventListener("click", () => openBook(button.dataset.id, true, false));
    });

    $$(".js-chapters-book").forEach(button => {
      button.addEventListener("click", () => openBook(button.dataset.id, true, true));
    });

    if (selectedBookId) renderChapters(selectedBookId);
  }

  function openBook(id, scroll = true, scrollToChapters = false) {
    const data = EC.getData();
    const book = data.books.find(item => item.id === id);
    if (!book) return;

    selectedBookId = id;
    $("#editBookId").value = book.id;
    $("#editBookTitle").value = book.title || "";
    $("#editBookGenre").value = book.genre || "Romance";
    $("#editBookDesc").value = book.description || "";
    $("#editorHeading").textContent = book.title;

    $("#chapterBookId").value = book.id;
    $("#chapterHeading").textContent = `Capítulos de ${book.title}`;

    editorSection.classList.remove("hidden");
    chapterSection.classList.remove("hidden");
    resetChapterForm(false);
    renderChapters(id);

    if (scroll) {
      setTimeout(() => (scrollToChapters ? chapterSection : editorSection)
        .scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }

  function renderChapters(bookId) {
    const data = EC.getData();
    const book = data.books.find(item => item.id === bookId);
    if (!book) return;
    const chapters = [...(book.chapters || [])].sort((a,b)=>Number(a.number)-Number(b.number));

    $("#chapterCount").textContent = `${chapters.length} ${chapters.length === 1 ? "capítulo publicado" : "capítulos publicados"}`;
    $("#chapterRows").innerHTML = chapters.length ? chapters.map(chapter => `
      <div class="chapter">
        <span class="chapter-num">${chapter.number}</span>
        <span><strong>${UI.esc(chapter.title)}</strong><span>Capítulo ${chapter.number}</span></span>
        <span style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn js-edit-chapter" style="height:34px;padding:0 10px" data-number="${chapter.number}">Editar</button>
          <a class="btn" style="height:34px;padding:0 10px" href="leitura.html?book=${book.id}&chapter=${chapter.number}">Ler</a>
          <button class="btn btn-danger js-delete-chapter" style="height:34px;padding:0 10px" data-number="${chapter.number}">Excluir</button>
        </span>
      </div>`).join("") : `<div class="muted" style="text-align:center;padding:32px 10px">Nenhum capítulo publicado ainda.</div>`;

    $$(".js-edit-chapter").forEach(button => {
      button.addEventListener("click", () => editChapter(book.id, Number(button.dataset.number)));
    });
    $$(".js-delete-chapter").forEach(button => {
      button.addEventListener("click", () => deleteChapter(book.id, Number(button.dataset.number)));
    });
  }

  function editChapter(bookId, number) {
    const data = EC.getData();
    const book = data.books.find(item => item.id === bookId);
    const chapter = book?.chapters?.find(item => Number(item.number) === number);
    if (!chapter) return;

    $("#chapterBookId").value = book.id;
    $("#editingChapterNumber").value = chapter.number;
    $("#chapterNumber").value = chapter.number;
    $("#chapterTitle").value = chapter.title || "";
    $("#chapterText").value = Array.isArray(chapter.text) ? chapter.text.join("\n\n") : (chapter.text || "");
    $("#saveChapterBtn").textContent = "Salvar capítulo";
    $("#cancelChapterEdit").classList.remove("hidden");
    chapterSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteChapter(bookId, number) {
    const data = EC.getData();
    const book = data.books.find(item => item.id === bookId);
    const chapter = book?.chapters?.find(item => Number(item.number) === number);
    if (!book || !chapter) return;
    if (!confirm(`Excluir o capítulo ${chapter.number} — \"${chapter.title}\"?`)) return;

    book.chapters = book.chapters.filter(item => Number(item.number) !== number);
    EC.saveData(data);
    UI.toast("Capítulo excluído.");
    resetChapterForm();
    renderAll();
    openBook(bookId, false, false);
  }

  function resetChapterForm(clearBook = false) {
    $("#editingChapterNumber").value = "";
    $("#chapterNumber").value = "";
    $("#chapterTitle").value = "";
    $("#chapterText").value = "";
    $("#saveChapterBtn").textContent = "+ Publicar capítulo";
    $("#cancelChapterEdit").classList.add("hidden");
    if (clearBook) $("#chapterBookId").value = "";
  }
});
