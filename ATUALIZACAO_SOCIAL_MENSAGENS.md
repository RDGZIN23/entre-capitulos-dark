# Entre Capítulos — atualização social, mensagens e notificações (Cloudinary)

Esta versão foi adaptada para **não depender do Firebase Storage**. O Firebase continua responsável por autenticação, Firestore, conversas, notificações e regras; fotos e áudios do chat usam o Cloudinary já configurado no projeto.

## O que esta versão inclui

- menu da conta ao tocar na foto do perfil no topo;
- remoção dos botões grandes de Área do Autor / Configurações / Sair do próprio perfil;
- botão **Mensagem** em perfis de outras pessoas;
- aba **Mensagens** na navegação principal;
- conversas em tempo real com texto;
- envio de fotos pelo Cloudinary;
- gravação e envio de mensagens de voz pelo Cloudinary;
- notificações em tempo real para mensagens, novos seguidores, comentários e avaliações;
- sino de notificações no topo e badges de mensagens não lidas;
- tela `notificacoes.html`;
- privacidade para quem pode iniciar novas conversas;
- espelhos protegidos de Seguidores/Seguindo para a nova arquitetura social.

## 1. Firebase Storage não é necessário

Não ative Cloud Storage e não é necessário trocar o projeto Firebase para o plano Blaze por causa do chat. O arquivo `firebase.json` desta versão contém somente Firestore.

## 2. Cloudinary usado pelo chat

O projeto reutiliza:

- Cloud name: `dzsf7cwf`
- unsigned upload preset: `entre_capitulos`

Imagens são enviadas como recurso `image`. Mensagens de voz são enviadas como recurso `video`, pois o Cloudinary trata arquivos de áudio por esse tipo de recurso.

Se a foto funcionar e o áudio retornar erro de formato/preset, abra o upload preset `entre_capitulos` no Cloudinary e confirme que ele não está limitado apenas a formatos de imagem.

## 3. Publicar apenas as regras do Firestore

Com Firebase CLI autenticado:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Não existe mais etapa de `storage.rules` ou CORS do Firebase Storage.

## 4. Privacidade da mídia — limitação importante do modo gratuito

O documento da mensagem no Firestore é privado para os dois participantes e contém a URL do arquivo no Cloudinary. O `public_id` criado pelo Cloudinary é difícil de adivinhar, mas a entrega unsigned/gratuita usada nesta versão **não transforma a URL do arquivo em um recurso autenticado**.

Na prática:

- quem não participa da conversa não consegue obter a URL pelo Firestore;
- se alguém copiar/compartilhar a URL direta do Cloudinary, o arquivo poderá ser aberto fora do site.

Por isso, esta solução é adequada para um MVP gratuito, mas não deve ser tratada como armazenamento de mídia altamente sensível. Para proteção de URL realmente privada no futuro, use upload/delivery `authenticated` do Cloudinary com assinatura gerada no backend.

## 5. Migração de Seguidores/Seguindo

A coleção antiga `seguindoAutores` continua existindo para preservar os follows atuais. A nova versão cria espelhos:

- `usuarios/{uid}/seguindo/{autorId}`
- `autores/{uid}/seguidores/{seguidorId}`

A migração acontece quando usuários autenticados voltam ao site.

## 6. Teste mínimo depois de publicar

1. Entre com duas contas diferentes.
2. Na conta A, abra o perfil da conta B e toque em **Mensagem**.
3. Envie uma mensagem de texto.
4. Envie uma foto.
5. Grave um áudio curto e envie.
6. Na conta B, confira o badge de mensagem e o sino de notificações.
7. Abra a conversa e confira se a notificação é marcada como lida.
8. Em Configurações > Perfil > Privacidade, teste **Quem pode me enviar mensagens?**.
9. Teste Seguidores/Seguindo como Público e Privado.

## 7. Microfone e Vercel

Mensagens de voz precisam de HTTPS e permissão do microfone. O `vercel.json` já permite `microphone=(self)` e também libera `res.cloudinary.com` para fotos/áudios e `api.cloudinary.com` para uploads.
