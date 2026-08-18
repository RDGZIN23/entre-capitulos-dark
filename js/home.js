import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { publicBooks,progress } from "./firebase-data.js";
UI.shell("home");
const hero=UI.$("#hero"),grid=UI.$("#bookGrid"),filters=UI.$("#homeFilters"),cont=UI.$("#continueList");
let books=[];
try{
 books=await publicBooks();
 if(!books.length){hero.innerHTML=`<div class="empty-state">Nenhum livro publicado ainda.</div>`;grid.innerHTML=`<div class="empty-state">As histórias publicadas aparecerão aqui.</div>`}
 else{
  const b=books.find(x=>x.featured)||books[0],first=b.chapters[0];
  hero.innerHTML=`${UI.cover(b,"hero-cover")}<div><span class="eyebrow">✦ Destaque</span><h1>${UI.esc(b.title)}</h1><div class="hero-meta"><span>${UI.esc(b.author)}</span><span>• ${UI.esc(b.genre)}</span><span>• ${UI.fmt(b.reads)} leituras</span></div><p>${UI.esc(b.description)}</p><div class="hero-actions"><a class="btn btn-primary" href="${first?`leitura.html?id=${first.id}`:`livro.html?id=${b.id}`}">▶ Ler agora</a><a class="btn secondary" href="livro.html?id=${b.id}">Ver livro</a></div></div><aside class="ranking"><h3>Mais lidas</h3>${[...books].sort((a,b)=>b.reads-a.reads).slice(0,5).map((x,i)=>`<a class="rank-item" href="livro.html?id=${x.id}"><span class="rank-num">${i+1}</span><span class="rank-thumb" ${x.cover?`style="background-image:url('${UI.esc(x.cover)}')"`:""}></span><span class="rank-copy"><strong>${UI.esc(x.title)}</strong><span>${UI.esc(x.author)}</span></span></a>`).join("")}</aside>`;
  const gs=["Todas",...new Set(books.map(x=>x.genre).filter(Boolean))];
  filters.innerHTML=gs.slice(0,7).map((g,i)=>`<button class="filter ${i===0?"active":""}" data-g="${UI.esc(g)}">${UI.esc(g)}</button>`).join("");
  const render=g=>grid.innerHTML=(g==="Todas"?books:books.filter(x=>x.genre===g)).map(UI.bookCard).join("");
  render("Todas");UI.$$("[data-g]").forEach(b=>b.onclick=()=>{UI.$$("[data-g]").forEach(x=>x.classList.remove("active"));b.classList.add("active");render(b.dataset.g)});
 }
}catch(e){console.error(e);hero.innerHTML=`<div class="empty-state">Não foi possível carregar os livros.</div>`;grid.innerHTML=""}
onAuthStateChanged(auth,async u=>{
 if(!u||u.isAnonymous){cont.innerHTML=`<div class="continue-card" style="grid-template-columns:1fr"><span><strong>Entre para sincronizar leituras</strong><span>Seu progresso fica disponível em qualquer dispositivo.</span></span></div>`;return}
 try{
  const ps=await progress(u.uid);cont.innerHTML=ps.length?ps.sort((a,b)=>UI.timeMs(b.atualizadoEm)-UI.timeMs(a.atualizadoEm)).slice(0,6).map(p=>{const b=books.find(x=>x.id===p.livroId),c=p.capa||b?.cover||"",n=Number(p.ultimoCapituloNumero||0),total=b?.chapters?.length||0,pct=total?Math.min(100,Math.round(n/total*100)):10;return`<a class="continue-card" href="${p.ultimoCapituloId?`leitura.html?id=${p.ultimoCapituloId}`:`livro.html?id=${p.livroId}`}"><span class="continue-thumb" ${c?`style="background-image:url('${UI.esc(c)}')"`:""}></span><span><strong>${UI.esc(p.livroTitulo||b?.title||"Livro")}</strong><span>Capítulo ${n||"—"}${total?` de ${total}`:""}</span><div class="progress"><i style="width:${pct}%"></i></div></span></a>`}).join(""):`<div class="continue-card" style="grid-template-columns:1fr"><span><strong>Nenhuma leitura iniciada</strong><span>Abra um capítulo para começar.</span></span></div>`;
 }catch{cont.innerHTML=`<div class="empty-state">Não foi possível carregar seu progresso.</div>`}
});
