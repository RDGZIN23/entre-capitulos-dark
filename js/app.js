const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmt=(n=0)=>new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(Number(n)||0);
const timeMs=v=>v?.toMillis?.() ?? (v?.seconds? v.seconds*1000 : Number(v)||0);
const timeAgo=v=>{const ms=timeMs(v);if(!ms)return"";const d=Math.max(0,Date.now()-ms),m=Math.floor(d/60000);if(m<1)return"agora";if(m<60)return`há ${m} min`;const h=Math.floor(m/60);if(h<24)return`há ${h} h`;const days=Math.floor(h/24);if(days<30)return`há ${days} d`;return new Date(ms).toLocaleDateString("pt-BR")};
const safeHttps=u=>{try{const x=new URL(String(u||""));return x.protocol==="https:"?x.href:""}catch{return""}};
function toast(msg){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2600)}
function initials(name="Leitor"){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function cover(book,cls="book-cover"){const url=safeHttps(book?.cover||book?.capa);if(url)return`<div class="${cls}"><img src="${esc(url)}" alt="Capa de ${esc(book?.title||book?.titulo||"Livro")}" loading="${cls==="hero-cover"?"eager":"lazy"}"></div>`;return`<div class="${cls}"><div class="cover-title">${esc(book?.title||book?.titulo||"Livro")}</div><div class="cover-author">${esc(book?.author||book?.autor||"")}</div></div>`}
function bookCard(b){return`<a class="book-card" href="livro.html?id=${encodeURIComponent(b.id)}">${cover(b)}<div class="book-info"><strong>${esc(b.title)}</strong><span>${esc(b.author||"Autor")}</span><div class="book-stats"><span>◉ ${fmt(b.reads||0)}</span><span>★ ${b.rating||"Novo"}</span></div></div></a>`}
function nav(active){return[
["home","⌂","Início","index.html"],["explore","⌕","Explorar","explorar.html"],["library","▣","Biblioteca","biblioteca.html"],["updates","◴","Atualizações","atualizacoes.html"],["profile","●","Perfil","perfil.html"],["author","✦","Área do autor","painel.html"],["settings","⚙","Configurações","configuracoes.html"]
].map(([id,icon,label,href])=>`<a class="nav-link ${active===id?"active":""}" href="${href}"><span class="nav-icon">${icon}</span>${label}</a>`).join("")}
function mobileNav(active){return`<div class="bottom-nav-inner">
<a class="${active==="home"?"active":""}" href="index.html"><b>⌂</b>Início</a>
<a class="${active==="explore"?"active":""}" href="explorar.html"><b>⌕</b>Explorar</a>
<a class="${active==="library"?"active":""}" href="biblioteca.html"><b>▣</b>Biblioteca</a>
<a class="${active==="updates"?"active":""}" href="atualizacoes.html"><b>◴</b>Atualizações</a>
<a class="${active==="profile"?"active":""}" href="perfil.html"><b>●</b>Perfil</a></div>`}
async function shell(active=""){
 const top=$("#topbar");if(top)top.innerHTML=`<div class="container topbar-inner">
 <a class="brand" href="index.html"><img src="assets/logo.svg" alt=""><b>Entre <span>Capítulos</span></b></a>
 <div class="search-top"><input id="globalSearch" placeholder="Buscar histórias, autores ou gêneros..."><span class="search-symbol">⌕</span></div>
 <div class="top-actions"><a class="icon-btn desktop-only" title="Área do autor" href="painel.html">✦</a><a class="icon-btn desktop-only" title="Configurações" href="configuracoes.html">⚙</a><a id="headerAvatar" class="avatar-sm" href="login.html">?</a></div></div>`;
 const side=$("#sidebar");if(side)side.innerHTML=`<nav class="nav-stack">${nav(active)}</nav><div class="sidebar-card"><strong>Todo leitor pode escrever</strong><p>Crie sua história, publique capítulos e construa sua página de autor.</p><a class="btn btn-primary btn-block" href="painel.html">Abrir área do autor</a></div><div id="sidebarUser" class="sidebar-user"><span class="avatar-sm">?</span><div><strong style="font-size:.77rem">Visitante</strong><div class="muted small">Entrar</div></div></div>`;
 const bottom=$("#bottomNav");if(bottom)bottom.innerHTML=mobileNav(active);
 const gs=$("#globalSearch");if(gs)gs.addEventListener("keydown",e=>{if(e.key==="Enter")location.href=`explorar.html?q=${encodeURIComponent(gs.value.trim())}`});
 try{
   const [{auth,db},authSdk,fs]=await Promise.all([import("./firebase-config.js"),import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js"),import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js")]);
   authSdk.onAuthStateChanged(auth,async user=>{
     const av=$("#headerAvatar"),su=$("#sidebarUser");if(!user||user.isAnonymous){if(av){av.textContent="Entrar";av.style.width="auto";av.style.padding="0 10px";av.href="login.html"}return}
     let name=user.displayName||"Leitor",photo=user.photoURL||"";
     try{const s=await fs.getDoc(fs.doc(db,"usuarios",user.uid));if(s.exists()){const d=s.data();name=d.nome||name;photo=d.fotoURL||d.foto||photo}}catch{}
     if(av){av.textContent=photo?"":initials(name);av.style.backgroundImage=photo?`url("${photo}")`:"";av.href="perfil.html";av.style.width="36px";av.style.padding="0"}
     if(su)su.innerHTML=`<span class="avatar-sm" style="${photo?`background-image:url('${esc(photo)}')`:""}">${photo?"":initials(name)}</span><div><strong style="font-size:.77rem">${esc(name)}</strong><div class="muted small">Minha conta</div></div>`;
   });
 }catch(e){console.warn("Cabeçalho sem autenticação:",e)}
}
function footer(){const f=$("#siteFooter");if(f)f.innerHTML=`<div class="container site-footer-inner"><span>© 2026 Entre Capítulos · Onde cada página ganha vida.</span><span><a href="sobre.html">Sobre</a> · <a href="privacidade.html">Privacidade</a> · <a href="configuracoes.html">Configurações</a></span></div>`}
function setTheme(pref){localStorage.setItem("ec-theme",pref);const resolved=pref==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):pref;document.documentElement.dataset.theme=resolved;document.documentElement.dataset.themePreference=pref}
document.addEventListener("DOMContentLoaded",()=>{footer();if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{})});
window.UI={$, $$, esc, fmt, timeMs, timeAgo, safeHttps, toast, initials, cover, bookCard, shell, setTheme};
