document.addEventListener("DOMContentLoaded", () => {
  const UI = window.UI;
  UI.shell("library");

  const favGrid = UI.$("#favGrid");
  const readingList = UI.$("#readingList");

  favGrid.innerHTML = `<div class="loading-state">Carregando seus livros salvos...</div>`;
  readingList.innerHTML = `<div class="loading-state">Carregando suas leituras...</div>`;

  iniciar();

  async function iniciar() {
    try {
      const [
        firebase,
        firestore,
        dadosModulo
      ] = await Promise.all([
        import("./firebase-config.js"),
        import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"),
        import("./firestore-data.js")
      ]);

      const { auth, db } = firebase;
      const { collection, getDocs, query, where } = firestore;

      // Fundamental: espera o Firebase restaurar a sessão salva.
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }

      const usuario = auth.currentUser;

      if (!usuario) {
        favGrid.innerHTML = `
          <div class="loading-state">
            Você não está conectado.<br>
            <a class="link" href="login.html">Entrar na conta</a>
          </div>`;

        readingList.innerHTML = `
          <div class="loading-state">
            Faça login para sincronizar suas leituras.
          </div>`;
        return;
      }

      const [{ books }, favoritosSnap, progressosSnap] = await Promise.all([
        dadosModulo.carregarBibliotecaPublica(),
        getDocs(
          query(
            collection(db, "favoritos"),
            where("usuarioId", "==", usuario.uid)
          )
        ),
        getDocs(
          query(
            collection(db, "progressoLeitura"),
            where("usuarioId", "==", usuario.uid)
          )
        )
      ]);

      const favoritos = favoritosSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      const progressos = progressosSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      renderFavoritos(favoritos, books);
      renderProgressos(progressos, books);

    } catch (erro) {
      console.error("Erro ao carregar biblioteca:", erro);
      favGrid.innerHTML = `<div class="loading-state">Não foi possível carregar seus livros salvos.</div>`;
      readingList.innerHTML = `<div class="loading-state">Não foi possível carregar suas leituras.</div>`;
    }
  }

  function renderFavoritos(favoritos, books) {
    if (!favoritos.length) {
      favGrid.innerHTML = `
        <div class="loading-state">
          Você ainda não adicionou nenhum livro à sua biblioteca.
        </div>`;
      return;
    }

    const livros = favoritos
      .map(favorito => {
        const real = books.find(book => book.id === favorito.livroId);
        if (real) return real;

        return {
          id: favorito.livroId || "",
          title: favorito.titulo || "Livro",
          author: favorito.autor || "Autor desconhecido",
          genre: favorito.genero || "Literatura",
          cover: favorito.capa || "",
          reads: 0,
          rating: 0,
          chapters: []
        };
      })
      .filter(book => book.id);

    favGrid.innerHTML = livros.length
      ? livros.map(UI.bookCard).join("")
      : `<div class="loading-state">Nenhum livro salvo foi encontrado.</div>`;
  }

  function renderProgressos(progressos, books) {
    if (!progressos.length) {
      const local = obterProgressoLocal();

      if (local) {
        renderProgressos([local], books);
        return;
      }

      readingList.innerHTML = `
        <div class="loading-state">
          Você ainda não começou nenhuma leitura.
        </div>`;
      return;
    }

    readingList.innerHTML = progressos.map(progresso => {
      const livro = books.find(book => book.id === progresso.livroId);

      const titulo = progresso.livroTitulo || livro?.title || "Livro";
      const capa = progresso.capa || livro?.cover || "";

      const numero = Number(
        progresso.ultimoCapituloNumero ??
        progresso.numero ??
        progresso.capituloNumero ??
        0
      );

      const capituloId =
        progresso.ultimoCapituloId ||
        progresso.capituloId ||
        "";

      const total = livro?.chapters?.length || 0;

      const pct = total && numero
        ? Math.min(100, Math.round((numero / total) * 100))
        : 5;

      const destino = capituloId
        ? `leitura.html?id=${encodeURIComponent(capituloId)}`
        : `livro.html?id=${encodeURIComponent(progresso.livroId || livro?.id || "")}`;

      return `
        <a class="continue-card" href="${destino}">
          ${capa
            ? `<img src="${UI.esc(capa)}" alt="Capa de ${UI.esc(titulo)}"
                 style="width:58px;aspect-ratio:2/3;object-fit:cover;border-radius:10px">`
            : `<span class="continue-thumb"></span>`
          }
          <span>
            <strong>${UI.esc(titulo)}</strong>
            <span>
              ${numero ? `Capítulo ${numero}` : "Continuar leitura"}
              ${total ? ` de ${total}` : ""}
            </span>
            <div class="progress">
              <i style="width:${Math.max(5,pct)}%"></i>
            </div>
          </span>
        </a>`;
    }).join("");
  }

  function obterProgressoLocal() {
    try {
      const p = JSON.parse(localStorage.getItem("ultimoCapituloLido") || "null");
      return p?.capituloId ? p : null;
    } catch {
      return null;
    }
  }
});
