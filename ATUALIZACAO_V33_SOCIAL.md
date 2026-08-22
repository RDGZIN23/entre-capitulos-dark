# Entre Capítulos — pacote social v3.3

Este pacote foi preparado sobre a `main` enviada em 22/08/2026.

## Alterações incluídas

- todos os `confirm()` nativos encontrados no projeto foram substituídos por modais personalizados do Entre Capítulos;
- Mensagens agora mostra uma tela de login/cadastro para visitantes, em vez de abrir o chat;
- botão Google em Login e Criar conta;
- novas contas seguem automaticamente o perfil oficial configurado em `js/config.js` (`creatorUid`);
- player próprio para áudios do chat;
- notificações organizadas em Mensagens, Seguidores, Livros curtidos, Comentários e Avaliações;
- notificações de mensagens da mesma conversa são condensadas em uma linha;
- nova curtida de livro, separada de Favoritos, com contador e notificação ao autor;
- cache do PWA atualizado para `entre-capitulos-v6`.

## Antes de testar no site

### 1. Publicar as novas regras do Firestore

O arquivo `firestore.rules` deste pacote adiciona a coleção `curtidasLivros` e o tipo de notificação `curtida_livro`.

Como o login do Firebase CLI costuma falhar no Codespaces, você pode publicar manualmente pelo Firebase Console:

1. Firebase Console → Firestore Database → Regras.
2. Substitua o conteúdo pelas regras deste pacote.
3. Clique em **Publicar**.

Não é necessário Firebase Storage. Fotos e áudios do chat continuam no Cloudinary.

### 2. Ativar Login com Google

1. Firebase Console → Authentication.
2. Abra **Sign-in method / Método de login**.
3. Abra **Google**.
4. Ative o provedor.
5. Escolha o e-mail de suporte solicitado pelo Firebase e salve.

### 3. Autorizar o domínio do site

Em Authentication → Settings / Configurações → Authorized domains / Domínios autorizados, confirme que o domínio oficial do site está listado:

- `entre-capitulos-dark.vercel.app`

Ao testar em um Preview da Vercel, talvez seja necessário adicionar também o domínio daquele Preview.

## Follow automático

O perfil seguido por novas contas é definido em:

`js/config.js` → `creatorUid`

O sistema impede auto-follow e não cria follow duplicado.

## Testes recomendados

1. Abrir Mensagens sem login e conferir a tela Entrar / Criar conta.
2. Criar uma conta nova por e-mail e confirmar que ela já segue o perfil oficial.
3. Criar/entrar com Google.
4. Abrir uma conversa e testar o novo player de áudio.
5. Apagar uma mensagem e conferir o novo modal personalizado.
6. Entrar na Área do Autor e testar Exclusão de livro/capítulo para confirmar os novos modais.
7. Curtir um livro com uma conta diferente do autor.
8. Entrar como autor e abrir Notificações → Livros curtidos.
9. Conferir as demais categorias de notificações.
