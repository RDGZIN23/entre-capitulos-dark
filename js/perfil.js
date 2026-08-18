document.addEventListener("DOMContentLoaded", () => {
  const UI = window.UI;
  UI.shell("profile");

  const avatar = UI.$("#avatar");
  const name = UI.$("#name");
  const bio = UI.$("#bio");
  const favCount = UI.$("#favCount");
  const readCount = UI.$("#readCount");
  const following = UI.$("#following");
  const profileBooks = UI.$("#profileBooks");
  const editPanel = UI.$("#editPanel");
  const editName = UI.$("#editName");
  const editBio = UI.$("#editBio");
  const editBtn = UI.$("#editBtn");
  const saveBtn = UI.$("#saveProfile");
  const logoutBtn = UI.$("#logoutBtn");

  profileBooks.innerHTML = `<div class="loading-state">Carregando perfil...</div>`;

  iniciar();

  async function iniciar() {
    try {
      const [
        firebase,
        firestore,
        authModulo,
        dadosModulo
      ] = await Promise.all([
        import("./firebase-config.js"),
        import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js"),
        import("./firestore-data.js")
      ]);

      const { auth, db } = firebase;

      const {
        collection,
        doc,
        getDoc,
        getDocs,
        query,
        serverTimestamp,
        setDoc,
        where
      } = firestore;

      const {
        onAuthStateChanged,
        updateProfile,
        signOut
      } = authModulo;

      logoutBtn.onclick = async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Saindo...";

        try {
          await signOut(auth);
          localStorage.removeItem("ultimoCapituloLido");
          window.location.replace("login.html");
        } catch (erro) {
          console.error("Erro ao sair:", erro);
          UI.toast("Não foi possível sair da conta.");
          logoutBtn.disabled = false;
          logoutBtn.textContent = "Sair";
        }
      };

      let carregado = false;

      onAuthStateChanged(auth, async usuario => {
        if (carregado) return;

        if (!usuario) {
          mostrarVisitante();
          return;
        }

        carregado = true;

        try {
          const [
            perfilDoc,
            favoritosSnap,
            progressosSnap,
            biblioteca
          ] = await Promise.all([
            getDoc(doc(db, "usuarios", usuario.uid)),
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
            ),
            dadosModulo.carregarBibliotecaPublica()
          ]);

          const perfil = perfilDoc.exists() ? perfilDoc.data() : {};

          const nomeReal =
            perfil.nome ||
            usuario.displayName ||
            "Leitor";

          const bioReal =
            perfil.biografia ||
            "Este leitor ainda não escreveu uma biografia.";

          const foto =
            perfil.fotoURL ||
            perfil.foto ||
            usuario.photoURL ||
            "";

          atualizarAvatar(nomeReal, foto);

          name.textContent = nomeReal;
          bio.textContent = bioReal;
          editName.value = nomeReal;
          editBio.value = perfil.biografia || "";

          favCount.textContent = String(favoritosSnap.size);
          readCount.textContent = String(progressosSnap.size);
          following.textContent = "0";

          const favoritos = favoritosSnap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));

          const livrosFavoritos = favoritos
            .map(favorito => {
              const livroReal = biblioteca.books.find(
                book => book.id === favorito.livroId
              );

              if (livroReal) return livroReal;

              return {
                id: favorito.livroId || "",
                title: favorito.titulo || "Livro",
                author: favorito.autor || "Autor desconhecido",
                cover: favorito.capa || "",
                genre: "",
                reads: 0,
                rating: 0,
                chapters: []
              };
            })
            .filter(book => book.id);

          profileBooks.innerHTML = livrosFavoritos.length
            ? livrosFavoritos.map(UI.bookCard).join("")
            : `<div class="loading-state">Você ainda não possui livros salvos.</div>`;

          editBtn.onclick = () => {
            editPanel.classList.toggle("hidden");
          };

          saveBtn.onclick = async () => {
            const novoNome = editName.value.trim() || nomeReal;
            const novaBio = editBio.value.trim();

            saveBtn.disabled = true;
            saveBtn.textContent = "Salvando...";

            try {
              await setDoc(
                doc(db, "usuarios", usuario.uid),
                {
                  nome: novoNome,
                  biografia: novaBio,
                  email: usuario.email || "",
                  fotoURL: foto || "",
                  atualizadoEm: serverTimestamp()
                },
                { merge: true }
              );

              await updateProfile(usuario, {
                displayName: novoNome
              });

              name.textContent = novoNome;
              bio.textContent =
                novaBio ||
                "Este leitor ainda não escreveu uma biografia.";

              atualizarAvatar(novoNome, foto);
              editPanel.classList.add("hidden");
              UI.toast("Perfil atualizado.");

            } catch (erro) {
              console.error("Erro ao salvar perfil:", erro);
              UI.toast("Não foi possível salvar o perfil.");
            } finally {
              saveBtn.disabled = false;
              saveBtn.textContent = "Salvar alterações";
            }
          };

        } catch (erro) {
          console.error("Erro ao carregar perfil:", erro);
          profileBooks.innerHTML =
            `<div class="loading-state">Não foi possível carregar seu perfil.</div>`;
        }
      });

      function atualizarAvatar(nomeReal, foto) {
        if (foto) {
          avatar.textContent = "";
          avatar.style.backgroundImage =
            `url("${foto.replace(/"/g, "%22")}")`;
          avatar.style.backgroundSize = "cover";
          avatar.style.backgroundPosition = "center";
          return;
        }

        avatar.style.backgroundImage = "";
        avatar.textContent = String(nomeReal || "L")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0,2)
          .map(p => p[0])
          .join("")
          .toUpperCase();
      }

    } catch (erro) {
      console.error("Erro ao iniciar perfil:", erro);
      profileBooks.innerHTML =
        `<div class="loading-state">Erro ao conectar o perfil ao Firebase.</div>`;
    }
  }

  function mostrarVisitante() {
    name.textContent = "Visitante";
    bio.textContent = "Entre na sua conta para acessar seu perfil.";
    avatar.style.backgroundImage = "";
    avatar.textContent = "?";
    favCount.textContent = "0";
    readCount.textContent = "0";
    following.textContent = "0";

    profileBooks.innerHTML = `
      <div class="loading-state">
        Você não está conectado.<br>
        <a class="link" href="login.html">Entrar na conta</a>
      </div>`;

    editBtn.textContent = "Entrar";
    editBtn.onclick = () => {
      location.href = "login.html";
    };

    logoutBtn.classList.add("hidden");
  }
});
