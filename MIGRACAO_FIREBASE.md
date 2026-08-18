# Migração e compatibilidade com o Firebase antigo

## Coleções existentes reutilizadas

- `usuarios`
- `livros`
- `capitulos`
- `favoritos`
- `progressoLeitura`
- `avaliacoes`
- `comentarios`
- `visualizacoesCapitulos`

## Coleções novas

- `autores` — perfil público do autor + formas de apoio
- `seguindoAutores` — autores seguidos pelo leitor
- `curtidasCapitulos` — curtidas únicas por usuário/capítulo

## Campos importantes

### livros
`titulo`, `autor`, `sinopse`, `genero`, `status`, `capa`, `criadoPor`, `criadoEm`, `atualizadoEm`, `tags[]`, `maduro`

### capitulos
`livroId`, `livroTitulo`, `numero`, `titulo`, `resumo`, `texto`, `status`, `criadoPor`, `criadoEm`, `atualizadoEm`

### autores
`uid`, `nome`, `biografia`, `fotoURL`, `pixChave`, `pixNome`, `apoioUrl`, `apoioMensagem`

## Livros antigos sem criadoPor

As regras novas exigem propriedade. Se algum livro antigo não possuir `criadoPor`, adicione manualmente o UID da conta do autor no Firestore antes de tentar editar esse livro na nova Área do Autor.
