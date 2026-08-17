import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

function statusPublico(valor) {
  const status = String(valor || "").trim().toLowerCase();
  return !status || status === "publicado";
}

function timestampMs(valor) {
  if (!valor) return 0;
  if (typeof valor.toMillis === "function") return valor.toMillis();
  if (typeof valor.seconds === "number") return valor.seconds * 1000;
  if (typeof valor === "number") return valor;
  return 0;
}

async function buscarColecaoSegura(nome) {
  try {
    const resultado = await getDocs(collection(db, nome));
    return resultado.docs.map(documento => ({
      id: documento.id,
      ...documento.data()
    }));
  } catch (erro) {
    console.warn(`Não foi possível carregar ${nome}:`, erro);
    return [];
  }
}

function normalizarCapitulo(capitulo) {
  return {
    id: capitulo.id,
    bookId: capitulo.livroId || "",
    bookTitle: capitulo.livroTitulo || "",
    number: Number(capitulo.numero || 0),
    title: capitulo.titulo || "Capítulo sem título",
    summary: capitulo.resumo || "",
    text: capitulo.texto || "",
    status: capitulo.status || "",
    createdAt: capitulo.criadoEm || null,
    updatedAt: capitulo.atualizadoEm || null
  };
}

function criarMapaAvaliacoes(avaliacoes) {
  const mapa = new Map();

  avaliacoes.forEach(avaliacao => {
    const livroId = avaliacao.livroId;
    const nota = Number(avaliacao.nota);

    if (!livroId || !(nota >= 1 && nota <= 5)) return;

    const atual = mapa.get(livroId) || { soma: 0, total: 0 };
    atual.soma += nota;
    atual.total += 1;
    mapa.set(livroId, atual);
  });

  return mapa;
}

function criarMapaVisualizacoes(visualizacoes) {
  const mapa = new Map();

  visualizacoes.forEach(item => {
    if (!item.livroId) return;
    mapa.set(item.livroId, (mapa.get(item.livroId) || 0) + 1);
  });

  return mapa;
}

function normalizarLivro(livro, capitulos, mapaAvaliacoes, mapaVisualizacoes) {
  const avaliacao = mapaAvaliacoes.get(livro.id);
  const rating = avaliacao?.total
    ? Number((avaliacao.soma / avaliacao.total).toFixed(1))
    : 0;

  return {
    id: livro.id,
    title: livro.titulo || "Livro sem título",
    author: livro.autor || "Autor desconhecido",
    genre: livro.genero || "Literatura",
    cover: livro.capa || "",
    description: livro.sinopse || "Este livro ainda não possui uma sinopse.",
    status: livro.status || "",
    featured: livro.destaque === true || livro.emDestaque === true,
    reads: mapaVisualizacoes.get(livro.id) || 0,
    rating,
    ratingCount: avaliacao?.total || 0,
    createdAt: livro.criadoEm || livro.dataCriacao || null,
    updatedAt: livro.atualizadoEm || null,
    raw: livro,
    chapters: capitulos
      .filter(capitulo => capitulo.bookId === livro.id)
      .sort((a, b) => a.number - b.number)
  };
}

export async function carregarBibliotecaPublica() {
  const [
    livrosBrutos,
    capitulosBrutos,
    avaliacoes,
    visualizacoes
  ] = await Promise.all([
    buscarColecaoSegura("livros"),
    buscarColecaoSegura("capitulos"),
    buscarColecaoSegura("avaliacoes"),
    buscarColecaoSegura("visualizacoesCapitulos")
  ]);

  const capitulos = capitulosBrutos
    .filter(capitulo => statusPublico(capitulo.status))
    .map(normalizarCapitulo);

  const mapaAvaliacoes = criarMapaAvaliacoes(avaliacoes);
  const mapaVisualizacoes = criarMapaVisualizacoes(visualizacoes);

  const books = livrosBrutos
    .filter(livro => statusPublico(livro.status))
    .map(livro =>
      normalizarLivro(
        livro,
        capitulos,
        mapaAvaliacoes,
        mapaVisualizacoes
      )
    )
    .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));

  return { books, chapters: capitulos };
}

export async function carregarLivroComCapitulos(livroId) {
  if (!livroId) return null;

  const resultado = await getDoc(doc(db, "livros", livroId));
  if (!resultado.exists()) return null;

  const livroBruto = {
    id: resultado.id,
    ...resultado.data()
  };

  if (!statusPublico(livroBruto.status)) return null;

  const [
    capitulosBrutos,
    avaliacoes,
    visualizacoes
  ] = await Promise.all([
    buscarColecaoSegura("capitulos"),
    buscarColecaoSegura("avaliacoes"),
    buscarColecaoSegura("visualizacoesCapitulos")
  ]);

  const capitulos = capitulosBrutos
    .filter(capitulo =>
      capitulo.livroId === livroId &&
      statusPublico(capitulo.status)
    )
    .map(normalizarCapitulo)
    .sort((a, b) => a.number - b.number);

  return normalizarLivro(
    livroBruto,
    capitulos,
    criarMapaAvaliacoes(avaliacoes),
    criarMapaVisualizacoes(visualizacoes)
  );
}

export async function carregarContextoCapitulo({
  chapterId = "",
  bookId = "",
  chapterNumber = 0
} = {}) {
  let capituloBruto = null;

  if (chapterId) {
    const resultado = await getDoc(doc(db, "capitulos", chapterId));
    if (resultado.exists()) {
      capituloBruto = {
        id: resultado.id,
        ...resultado.data()
      };
    }
  } else if (bookId && chapterNumber) {
    const capitulos = await buscarColecaoSegura("capitulos");
    capituloBruto = capitulos.find(item =>
      item.livroId === bookId &&
      Number(item.numero) === Number(chapterNumber) &&
      statusPublico(item.status)
    ) || null;
  }

  if (!capituloBruto || !statusPublico(capituloBruto.status)) {
    return null;
  }

  const livroId = capituloBruto.livroId;
  const livroResultado = await getDoc(doc(db, "livros", livroId));

  if (!livroResultado.exists()) return null;

  const livroBruto = {
    id: livroResultado.id,
    ...livroResultado.data()
  };

  const capitulosBrutos = await buscarColecaoSegura("capitulos");

  const chapters = capitulosBrutos
    .filter(item =>
      item.livroId === livroId &&
      statusPublico(item.status)
    )
    .map(normalizarCapitulo)
    .sort((a, b) => a.number - b.number);

  const chapter = normalizarCapitulo(capituloBruto);
  const index = chapters.findIndex(item => item.id === chapter.id);

  return {
    book: {
      id: livroBruto.id,
      title: livroBruto.titulo || "Livro",
      author: livroBruto.autor || "Autor desconhecido",
      genre: livroBruto.genero || "Literatura",
      cover: livroBruto.capa || "",
      description: livroBruto.sinopse || ""
    },
    chapter,
    chapters,
    index,
    previous: index > 0 ? chapters[index - 1] : null,
    next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null
  };
}
