
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(n||0);
const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const slugify=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

function toast(msg){
  let t=$("#toast");
  if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}
  t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>t.classList.remove("show"),2200);
}
function coverMarkup(book, cls="book-cover"){
  const cover=String(book?.cover||"").trim();
  if(cover){
    return `<div class="${cls} has-image">
      <img src="${esc(cover)}" alt="Capa de ${esc(book.title||"Livro")}" loading="${cls==="hero-cover"?"eager":"lazy"}">
    </div>`;
  }
  return `<div class="${cls}">
    <div class="cover-title">${esc(book?.title||"Livro")}</div>
    <div class="cover-author">${esc(book?.author||"")}</div>
  </div>`;
}
function bookCard(book){
  return `<a class="book-card" href="livro.html?id=${encodeURIComponent(book.id)}">
    ${coverMarkup(book)}
    <div class="book-info">
      <strong>${esc(book.title)}</strong>
      <span>${esc(book.author)}</span>
      <div class="book-stats"><span>◉ ${fmt(book.reads)}</span><span>★ ${book.rating||"Novo"}</span></div>
    </div>
  </a>`;
}
function shell(active=""){
  const top=$("#topbar");
  if(top) top.innerHTML=`
    <div class="container topbar-inner">
      <a class="brand" href="index.html"><img src="assets/logo.svg" alt=""><b>Entre <span>Capítulos</span></b></a>
      <div class="search-top"><input id="globalSearch" placeholder="Buscar histórias, autores ou gêneros..."><span class="kbd">⌕</span></div>
      <div class="top-actions">
        <a class="icon-btn desktop-only" href="atualizacoes.html">♢</a>
        <a class="icon-btn desktop-only" href="painel.html">✦</a>
        <a class="avatar-sm" href="perfil.html">RS</a>
      </div>
    </div>`;
  const sidebar=$("#sidebar");
  if(sidebar) sidebar.innerHTML=`
    <nav class="nav-stack">
      <a class="nav-link ${active==="home"?"active":""}" href="index.html"><span class="nav-icon">⌂</span>Início</a>
      <a class="nav-link ${active==="explore"?"active":""}" href="explorar.html"><span class="nav-icon">⌕</span>Explorar</a>
      <a class="nav-link ${active==="library"?"active":""}" href="biblioteca.html"><span class="nav-icon">▣</span>Biblioteca</a>
      <a class="nav-link ${active==="updates"?"active":""}" href="atualizacoes.html"><span class="nav-icon">◴</span>Atualizações</a>
      <a class="nav-link ${active==="profile"?"active":""}" href="perfil.html"><span class="nav-icon">●</span>Perfil</a>
      <a class="nav-link ${active==="admin"?"active":""}" href="painel.html"><span class="nav-icon">✦</span>Painel do autor</a>
    </nav>
    <div class="sidebar-card">
      <strong>Publique suas histórias</strong>
      <p>Crie livros, capítulos e acompanhe leituras em um só lugar.</p>
      <a class="btn btn-primary" href="painel.html" style="width:100%">Abrir painel</a>
    </div>
    <div class="sidebar-user"><span class="avatar-sm">RS</span><div><strong style="font-size:.78rem">RD Sebastião</strong><div class="muted" style="font-size:.68rem">Ver perfil</div></div></div>`;
  const bottom=$("#bottomNav");
  if(bottom) bottom.innerHTML=`<div class="bottom-nav-inner">
    <a class="${active==="home"?"active":""}" href="index.html"><b>⌂</b>Início</a>
    <a class="${active==="explore"?"active":""}" href="explorar.html"><b>⌕</b>Explorar</a>
    <a class="${active==="library"?"active":""}" href="biblioteca.html"><b>▣</b>Biblioteca</a>
    <a class="${active==="updates"?"active":""}" href="atualizacoes.html"><b>◴</b>Atualizações</a>
    <a class="${active==="profile"?"active":""}" href="perfil.html"><b>●</b>Perfil</a>
  </div>`;
  setTimeout(()=>{
    const gs=$("#globalSearch");
    if(gs) gs.addEventListener("keydown",e=>{
      if(e.key==="Enter") location.href="explorar.html?q="+encodeURIComponent(gs.value.trim());
    });
  },0);
}
window.UI={$, $$, fmt, esc, slugify, toast, coverMarkup, bookCard, shell};
