import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  privateProfile,
  favorites,
  progress,
  follows,
  followers,
  removeSelfFollow,
  publicBooks
} from "./firebase-data.js";

UI.shell("profile");

function renderSocials(profile){
  const box=UI.$("#profileSocials");
  if(!box)return;

  const social=profile?.redesSociais||{};

  const items=[
    ["Instagram",social.instagram],
    ["TikTok",social.tiktok],
    ["YouTube",social.youtube],
    ["X / Twitter",social.twitter],
    ["Facebook",social.facebook],
    ["Site",social.site]
  ]
  .map(([label,url])=>[label,UI.safeHttps(url)])
  .filter(([,url])=>url);

  box.innerHTML=items.map(([label,url])=>`
    <a
      class="author-social-link"
      href="${UI.esc(url)}"
      target="_blank"
      rel="noopener noreferrer"
    >${UI.esc(label)}</a>
  `).join("");
}

onAuthStateChanged(auth,async u=>{
  if(!u||u.isAnonymous){
    location.replace("login.html");
    return;
  }

  try{
    /* Remove um auto-follow antigo, caso exista */
    await removeSelfFollow(u.uid).catch(()=>{});

    const [p,fs,ps,fol,followersList,books]=await Promise.all([
      privateProfile(u.uid),
      favorites(u.uid),
      progress(u.uid),
      follows(u.uid),
      followers(u.uid).catch(()=>[]),
      publicBooks()
    ]);

    const name=p?.nome||u.displayName||"Leitor";
    const photo=p?.fotoURL||p?.foto||u.photoURL||"";

    const av=UI.$("#avatar");
    av.textContent=photo?"":UI.initials(name);
    av.style.backgroundImage=photo?`url("${photo}")`:"";

    UI.$("#name").textContent=name;
    UI.$("#bio").textContent=
      p?.biografia||
      "Este leitor ainda não escreveu uma biografia.";

    renderSocials(p);

    UI.$("#followerCount").textContent=
      followersList.filter(x=>x.usuarioId!==u.uid).length;

    UI.$("#readCount").textContent=ps.length;

    UI.$("#followCount").textContent=
      fol.filter(x=>x.autorId!==u.uid).length;

    UI.$("#booksCount").textContent=
      books.filter(b=>b.authorId===u.uid).length;

    const bks=fs
      .map(f=>books.find(b=>b.id===f.livroId))
      .filter(Boolean);

    UI.$("#profileBooks").innerHTML=bks.length
      ? bks.slice(0,6).map(UI.bookCard).join("")
      : `<div class="empty-state">Sua biblioteca está vazia.</div>`;

  }catch(e){
    console.error(e);
    UI.toast("Não foi possível carregar o perfil.");
  }
});

UI.$("#logout").onclick=async()=>{
  await signOut(auth);
  location.replace("login.html");
};
