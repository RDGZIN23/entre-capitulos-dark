import { carregarContextoCapitulo } from "./firestore-data.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);

  const chapterId = params.get("id") || "";
  const bookId = params.get("book") || "";
  const chapterNumber = Number(params.get("chapter") || 0);

  const content = UI.$("#readerContent");
  content.innerHTML = `<p class="muted">Carregando capítulo...</p>`;

  try {
    const ctx = await carregarContextoCapitulo({
      chapterId,
      bookId,
      chapterNumber
    });

    if (!ctx) {
      content.innerHTML = `<p>Este capítulo não foi encontrado ou ainda não está publicado.</p>`;
      UI.$("#readerHeading").innerHTML = `<div class="chapter-kicker">ENTRE CAPÍTULOS</div><h1>Capítulo indisponível</h1>`;
      return;
    }

    const { book, chapter, chapters, index, previous, next } = ctx;

    document.title = `${chapter.title} · ${book.title}`;

    UI.$("#readerBook").textContent = book.title;
    UI.$("#readerChapter").textContent = `Capítulo ${chapter.number} · ${chapter.title}`;
    UI.$("#backBook").href = `livro.html?id=${encodeURIComponent(book.id)}`;

    UI.$("#readerHeading").innerHTML = `
      <div class="chapter-kicker">CAPÍTULO ${chapter.number}</div>
      <h1>${UI.esc(chapter.title)}</h1>
      <div class="muted small">${UI.esc(book.title)}</div>`;

    renderText(chapter.text);

    const prev = UI.$("#prev");
    const nextButton = UI.$("#next");

    prev.href = previous
      ? `leitura.html?id=${encodeURIComponent(previous.id)}`
      : `livro.html?id=${encodeURIComponent(book.id)}`;
    prev.textContent = previous ? "← Anterior" : "← Livro";

    nextButton.href = next
      ? `leitura.html?id=${encodeURIComponent(next.id)}`
      : `livro.html?id=${encodeURIComponent(book.id)}`;
    nextButton.textContent = next ? "Próximo →" : "Finalizar";

    const pct = chapters.length
      ? Math.round(((Math.max(index, 0) + 1) / chapters.length) * 100)
      : 100;

    UI.$("#readPct").textContent = `${pct}%`;
    UI.$("#readBar").style.width = `${pct}%`;

    localStorage.setItem(
      "ultimoCapituloLido",
      JSON.stringify({
        capituloId: chapter.id,
        livroId: book.id,
        livroTitulo: book.title,
        capa: book.cover || "",
        numero: chapter.number,
        capituloNumero: chapter.number,
        capituloTitulo: chapter.title,
        atualizadoEm: Date.now()
      })
    );

    UI.$("#fontDown").onclick = () => changeFont(-1);
    UI.$("#fontUp").onclick = () => changeFont(1);

  } catch (erro) {
    console.error("Erro ao abrir capítulo:", erro);
    content.innerHTML = `<p>Não foi possível carregar este capítulo.</p>`;
  }

  function changeFont(direction) {
    const px = parseFloat(getComputedStyle(content).fontSize);
    content.style.fontSize = `${Math.max(15, Math.min(27, px + direction))}px`;
  }

  function renderText(rawText = "") {
    content.innerHTML = "";

    const text = String(rawText || "").replace(/\u00a0/g, " ").trim();

    if (!text) {
      content.innerHTML = `<p>Este capítulo ainda não possui texto.</p>`;
      return;
    }

    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);

    if (hasHtml) {
      const parsed = new DOMParser().parseFromString(text, "text/html");

      parsed.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach(el => el.remove());

      parsed.querySelectorAll("*").forEach(el => {
        [...el.attributes].forEach(attr => {
          const name = attr.name.toLowerCase();
          const value = String(attr.value || "").trim().toLowerCase();

          if (
            name.startsWith("on") ||
            (["href","src"].includes(name) && value.startsWith("javascript:"))
          ) {
            el.removeAttribute(attr.name);
          }
        });

        [
          "width","min-width","max-width","white-space","position",
          "left","right","transform","margin-left","margin-right"
        ].forEach(prop => el.style?.removeProperty(prop));

        el.removeAttribute("width");
      });

      content.append(...parsed.body.childNodes);
      return;
    }

    text.split(/\n\s*\n/).forEach(paragraph => {
      const p = document.createElement("p");
      p.textContent = paragraph
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      content.appendChild(p);
    });
  }
});
