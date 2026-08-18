# Entre Capítulos — versão completa

Nova versão consolidada da plataforma, mantendo o Firebase existente e o layout Dark responsivo.

## Incluído

- Android + computador
- Tema escuro, claro e seguir sistema
- PWA
- Login/cadastro Firebase
- Perfil do leitor
- Perfil público de autor
- Área do Autor disponível para qualquer conta
- Criar/editar/excluir livros
- Upload de capas pelo Cloudinary já configurado no projeto antigo
- Criar/editar/excluir capítulos com Quill
- Rascunho/publicado
- Biblioteca e favoritos
- Progresso de leitura
- Pesquisa por livros/autores/gêneros/tags/capítulos
- Avaliações
- Comentários
- Curtidas em capítulos
- Visualizações únicas usando Firebase Anonymous Auth
- Seguir autores
- Atualizações
- Apoio ao autor via PIX ou link HTTPS
- Configurações de aparência, perfil e apoio
- Página Sobre e Privacidade
- Firestore Security Rules
- Firestore indexes
- Cabeçalhos de segurança para Vercel

## Importante antes de substituir o site atual

1. Faça backup do repositório atual.
2. Teste esta versão em um projeto/deploy separado.
3. Ative no Firebase Authentication:
   - E-mail/senha
   - Anônimo (para visualizações únicas)
4. Publique `firestore.rules` e `firestore.indexes.json`.
5. Confira se seus livros antigos possuem `criadoPor` com o UID correto do autor.
6. O arquivo `js/firebase-config.js` usa o mesmo projeto Firebase que já estava funcionando.

## Regras

As novas regras tornam a Área do Autor disponível para todos os usuários autenticados, mas cada autor só pode alterar seus próprios livros e capítulos. Rascunhos não são públicos.

## Apoio / doações

O site não processa cartões. O autor pode cadastrar:
- chave PIX
- nome do recebedor
- link HTTPS externo para página de apoio

A chave PIX só fica pública se o autor decidir preenchê-la.

## Cloudinary

O projeto reaproveita:
- cloud name: `dzsf7cwf`
- unsigned upload preset: `entre_capitulos`

Para um projeto público grande, é recomendável futuramente trocar upload unsigned por upload assinado em backend/Cloud Function.

## Firebase CLI (opcional)

Com Firebase CLI instalado e autenticado:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Vercel

Framework Preset: `Other`
Root Directory: `./`
Build command: nenhum

Cada push na branch conectada gera novo deploy.
