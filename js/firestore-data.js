import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
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

async function buscarCapitulosPublicadosDoLivro(livroId) {
  if (!livroId) return [];

  try {
    // Mesma consulta usada no Entre Capítulos antigo.
    const consulta = query(
      collection(db, "capitulos"),
      where("livroId", "==", livroId),
      where("status", "==", "publicado")
    );

    const resultado = await getDocs(consulta);

    return resultado.docs
      .map(documento => ({
        id: documento.id,
        ...documento.data()
      }))
      .map(normalizarCapitulo)
      .sort((a, b) => a.number - b.number);

  } catch (erroConsultaPublicada) {
    console.warn(
      "Consulta de capítulos publicados falhou. Tentando compatibilidade:",
      erroConsultaPublicada
    );

    try {
      // Compatibilidade para capítulos antigos sem status.
      const consulta = query(
        collection(db, "capitulos"),
        where("livroId", "==", livroId)
      );

      const resultado = await getDocs(consulta);

      return resultado.docs
        .map(documento => ({
          id: documento.id,
          ...documento.data()
        }))
        .filter(capitulo => statusPublico(capitulo.status))
        .map(normalizarCapitulo)
        .sort((a, b) => a.number - b.number);

    } catch (erro) {
      console.error("Erro ao carregar capítulos do livro:", erro);
      return [];
    }
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

function normalizarLivro(
  livro,
  capitulos = [],
  mapaAvaliacoes = new Map(),
  mapaVisualizacoes = new Map()
) {
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
    chapters: [...capitulos].sort((a, b) => a.number - b.number)
  };
}

export async function carregarBibliotecaPublica() {
  const livrosBrutos = await buscarColecaoSegura("livros");

  const livrosPublicos = livrosBrutos
    .filter(livro => statusPublico(livro.status))
    .sort((a, b) => timestampMs(b.criadoEm || b.dataCriacao) - timestampMs(a.criadoEm || a.dataCriacao));

  const [avaliacoes, visualizacoes] = await Promise.all([
    buscarColecaoSegura("avaliacoes"),
    buscarColecaoSegura("visualizacoesCapitulos")
  ]);

  const mapaAvaliacoes = criarMapaAvaliacoes(avaliacoes);
  const mapaVisualizacoes = criarMapaVisualizacoes(visualizacoes);

  // Carrega os capítulos de cada livro com a mesma query
  // que já funcionava no projeto original.
  const books = await Promise.all(
    livrosPublicos.map(async livro => {
      const chapters = await buscarCapitulosPublicadosDoLivro(livro.id);

      return normalizarLivro(
        livro,
        chapters,
        mapaAvaliacoes,
        mapaVisualizacoes
      );
    })
  );

  return {
    books,
    chapters: books.flatMap(book => book.chapters)
  };
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

  const chapters = await buscarCapitulosPublicadosDoLivro(livroId);

  const [avaliacoes, visualizacoes] = await Promise.all([
    buscarColecaoSegura("avaliacoes"),
    buscarColecaoSegura("visualizacoesCapitulos")
  ]);

  return normalizarLivro(
    livroBruto,
    chapters,
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
    // Mesma forma usada pelo leitor antigo.
    const resultado = await getDoc(
      doc(db, "capitulos", chapterId)
    );

    if (resultado.exists()) {
      capituloBruto = {
        id: resultado.id,
        ...resultado.data()
      };
    }
  } else if (bookId && chapterNumber) {
    const chapters = await buscarCapitulosPublicadosDoLivro(bookId);

    const encontrado = chapters.find(
      item => Number(item.number) === Number(chapterNumber)
    );

    if (encontrado) {
      capituloBruto = {
        id: encontrado.id,
        livroId: encontrado.bookId,
        livroTitulo: encontrado.bookTitle,
        numero: encontrado.number,
        titulo: encontrado.title,
        resumo: encontrado.summary,
        texto: encontrado.text,
        status: encontrado.status
      };
    }
  }

  if (!capituloBruto || !statusPublico(capituloBruto.status)) {
    return null;
  }

  const livroIdFinal = capituloBruto.livroId;
  if (!livroIdFinal) return null;

  const livroResultado = await getDoc(
    doc(db, "livros", livroIdFinal)
  );

  if (!livroResultado.exists()) return null;

  const livroBruto = {
    id: livroResultado.id,
    ...livroResultado.data()
  };

  const chapters =
    await buscarCapitulosPublicadosDoLivro(livroIdFinal);

  const chapter = normalizarCapitulo(capituloBruto);

  let index = chapters.findIndex(
    item => item.id === chapter.id
  );

  // Se o capítulo foi aberto direto mas por algum motivo não
  // voltou na lista, ainda preservamos a leitura atual.
  if (index < 0) {
    chapters.push(chapter);
    chapters.sort((a, b) => a.number - b.number);
    index = chapters.findIndex(item => item.id === chapter.id);
  }

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
    next:
      index >= 0 && index < chapters.length - 1
        ? chapters[index + 1]
        : null
  };
}
