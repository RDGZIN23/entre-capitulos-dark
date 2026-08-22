const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmt=(n=0)=>new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(Number(n)||0);
const timeMs=v=>v?.toMillis?.() ?? (v?.seconds? v.seconds*1000 : Number(v)||0);
const timeAgo=v=>{const ms=timeMs(v);if(!ms)return"";const d=Math.max(0,Date.now()-ms),m=Math.floor(d/60000);if(m<1)return"agora";if(m<60)return`há ${m} min`;const h=Math.floor(m/60);if(h<24)return`há ${h} h`;const days=Math.floor(h/24);if(days<30)return`há ${days} d`;return new Date(ms).toLocaleDateString("pt-BR")};
const safeHttps=u=>{try{const x=new URL(String(u||""));return x.protocol==="https:"?x.href:""}catch{return""}};
function toast(msg){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2600)}
function ensureDialogHost(){
 let host=$("#ecDialogHost");
 if(host)return host;
 host=document.createElement("div");
 host.id="ecDialogHost";
 host.className="ec-dialog-host hidden";
 host.innerHTML=`<div class="ec-dialog-backdrop" data-dialog-cancel></div><section class="ec-dialog" role="dialog" aria-modal="true" aria-labelledby="ecDialogTitle"><button class="ec-dialog-close" type="button" aria-label="Fechar" data-dialog-cancel>×</button><div class="ec-dialog-icon" id="ecDialogIcon">!</div><h2 id="ecDialogTitle">Confirmar ação</h2><p id="ecDialogMessage"></p><div class="ec-dialog-actions"><button id="ecDialogCancel" class="btn" type="button" data-dialog-cancel>Cancelar</button><button id="ecDialogConfirm" class="btn btn-primary" type="button">Confirmar</button></div></section>`;
 document.body.appendChild(host);
 return host;
}
function dialog({title="Confirmar ação",message="",confirmText="Confirmar",cancelText="Cancelar",danger=false,icon="!",showCancel=true}={}){
 const host=ensureDialogHost(),titleEl=$("#ecDialogTitle",host),messageEl=$("#ecDialogMessage",host),confirmBtn=$("#ecDialogConfirm",host),cancelBtn=$("#ecDialogCancel",host),iconEl=$("#ecDialogIcon",host);
 titleEl.textContent=title;messageEl.textContent=message;confirmBtn.textContent=confirmText;cancelBtn.textContent=cancelText;iconEl.textContent=icon;
 cancelBtn.classList.toggle("hidden",!showCancel);confirmBtn.classList.toggle("btn-danger",!!danger);confirmBtn.classList.toggle("btn-primary",!danger);
 host.classList.remove("hidden");document.documentElement.classList.add("ec-dialog-open");
 return new Promise(resolve=>{
   let done=false;
   const finish=value=>{if(done)return;done=true;host.classList.add("hidden");document.documentElement.classList.remove("ec-dialog-open");confirmBtn.onclick=null;host.querySelectorAll("[data-dialog-cancel]").forEach(el=>el.onclick=null);document.removeEventListener("keydown",onKey);resolve(value)};
   const onKey=e=>{if(e.key==="Escape")finish(false)};
   confirmBtn.onclick=()=>finish(true);
   host.querySelectorAll("[data-dialog-cancel]").forEach(el=>el.onclick=()=>finish(false));
   document.addEventListener("keydown",onKey);
   setTimeout(()=>((danger&&showCancel)?cancelBtn:confirmBtn).focus(),20);
 });
}
function confirmDialog(options={}){return dialog({...options,showCancel:true})}
function alertDialog(options={}){return dialog({...options,showCancel:false,confirmText:options.confirmText||"Entendi"})}
function initials(name="Leitor"){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function cover(book,cls="book-cover"){const url=safeHttps(book?.cover||book?.capa);if(url)return`<div class="${cls}"><img src="${esc(url)}" alt="Capa de ${esc(book?.title||book?.titulo||"Livro")}" loading="${cls==="hero-cover"?"eager":"lazy"}"></div>`;return`<div class="${cls}"><div class="cover-title">${esc(book?.title||book?.titulo||"Livro")}</div><div class="cover-author">${esc(book?.author||book?.autor||"")}</div></div>`}
function bookCard(b){return`<a class="book-card" href="livro.html?id=${encodeURIComponent(b.id)}">${cover(b)}<div class="book-info"><strong>${esc(b.title)}</strong><span>${esc(b.author||"Autor")}</span><div class="book-stats"><span>◉ ${fmt(b.reads||0)}</span><span>★ ${b.rating||"Novo"}</span></div></div></a>`}

function nav(active){return[
["home","⌂","Início","index.html"],
["explore","⌕","Explorar","explorar.html"],
["library","▣","Biblioteca","biblioteca.html"],
["messages","✉","Mensagens","mensagens.html"],
["updates","◴","Atualizações","atualizacoes.html"],
["profile","●","Perfil","perfil.html"]
].map(([id,icon,label,href])=>`<a class="nav-link ${active===id?"active":""}" href="${href}"><span class="nav-icon">${icon}</span>${label}${id==="messages"?'<span class="nav-badge hidden" data-message-badge></span>':""}</a>`).join("")}

function mobileNav(active){return`<div class="bottom-nav-inner">
<a class="${active==="home"?"active":""}" href="index.html"><b>⌂</b>Início</a>
<a class="${active==="explore"?"active":""}" href="explorar.html"><b>⌕</b>Explorar</a>
<a class="${active==="library"?"active":""}" href="biblioteca.html"><b>▣</b>Biblioteca</a>
<a class="bottom-message-link ${active==="messages"?"active":""}" href="mensagens.html"><b>✉</b>Mensagens<span class="bottom-badge hidden" data-message-badge></span></a>
<a class="${active==="profile"?"active":""}" href="perfil.html"><b>●</b>Perfil</a></div>`}

function accountMenuHtml(){return`<div id="accountMenu" class="account-menu hidden" role="menu">
  <div id="accountMenuUser" class="account-menu-user">
    <span class="avatar-sm">?</span>
    <div><strong>Minha conta</strong><span>Entre Capítulos</span></div>
  </div>
  <div class="account-menu-links">
    <a href="perfil.html" role="menuitem"><b>●</b><span>Meu perfil</span></a>
    <a href="mensagens.html" role="menuitem"><b>✉</b><span>Mensagens</span><i class="account-count hidden" data-message-badge></i></a>
    <a href="notificacoes.html" role="menuitem"><b>◉</b><span>Notificações</span><i class="account-count hidden" data-notification-badge></i></a>
    <a href="painel.html" role="menuitem"><b>✦</b><span>Área do autor</span></a>
    <a href="configuracoes.html" role="menuitem"><b>⚙</b><span>Configurações</span></a>
    <a href="configuracoes.html?tab=profile#privacySettings" role="menuitem"><b>◈</b><span>Privacidade</span></a>
    <a href="atualizacoes.html" role="menuitem"><b>◴</b><span>Atualizações</span></a>
    <a href="sobre.html" role="menuitem"><b>ⓘ</b><span>Sobre</span></a>
  </div>
  <button id="accountLogout" class="account-logout" type="button"><b>↪</b><span>Sair</span></button>
</div>`}

async function shell(active=""){
 const top=$("#topbar");if(top)top.innerHTML=`<div class="container topbar-inner">
 <a class="brand" href="index.html"><img src="assets/logo.svg" alt=""><b>Entre <span>Capítulos</span></b></a>
 <div class="search-top"><input id="globalSearch" placeholder="Buscar histórias, autores ou gêneros..."><span class="search-symbol">⌕</span></div>
 <div class="top-actions">
   <a id="notificationBell" class="icon-btn notification-bell hidden" title="Notificações" href="notificacoes.html" aria-label="Notificações">
     <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
     <span class="top-badge hidden" data-notification-badge></span>
   </a>
   <div class="account-menu-wrap">
     <button id="headerAvatar" class="avatar-sm header-avatar-button" type="button" aria-label="Abrir menu da conta">?</button>
     ${accountMenuHtml()}
   </div>
 </div></div>`;
 const side=$("#sidebar");if(side)side.innerHTML=`<nav class="nav-stack">${nav(active)}</nav><div class="sidebar-card"><strong>Todo leitor pode escrever</strong><p>Crie sua história, publique capítulos e construa sua página de autor.</p><a class="btn btn-primary btn-block" href="painel.html">Abrir área do autor</a></div><a id="sidebarUser" class="sidebar-user" href="perfil.html"><span class="avatar-sm">?</span><div><strong style="font-size:.77rem">Visitante</strong><div class="muted small">Entrar</div></div></a>`;
 const bottom=$("#bottomNav");if(bottom)bottom.innerHTML=mobileNav(active);
 const gs=$("#globalSearch");if(gs)gs.addEventListener("keydown",e=>{if(e.key==="Enter")location.href=`explorar.html?q=${encodeURIComponent(gs.value.trim())}`});

 let stopNotifications=null;
 try{
   const [{auth,db},authSdk,fs]=await Promise.all([
     import("./firebase-config.js"),
     import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js"),
     import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js")
   ]);

   authSdk.onAuthStateChanged(auth,async user=>{
     stopNotifications?.();stopNotifications=null;
     const av=$("#headerAvatar"),su=$("#sidebarUser"),bell=$("#notificationBell"),menu=$("#accountMenu");
     if(!user||user.isAnonymous){
       if(av){av.textContent="Entrar";av.style.width="auto";av.style.padding="0 10px";av.style.backgroundImage="";av.onclick=()=>location.href="login.html"}
       if(su) su.href="login.html";
       bell?.classList.add("hidden");menu?.classList.add("hidden");setBadges(0,0,new Set());return;
     }

     let name=user.displayName||"Leitor",photo=user.photoURL||"";
     try{const s=await fs.getDoc(fs.doc(db,"usuarios",user.uid));if(s.exists()){const d=s.data();name=d.nome||name;photo=d.fotoURL||d.foto||photo}}catch{}
     if(av){av.textContent=photo?"":initials(name);av.style.backgroundImage=photo?`url("${safeHttps(photo)}")`:"";av.style.width="36px";av.style.padding="0";av.onclick=()=>toggleAccountMenu()}
     bell?.classList.remove("hidden");
     if(su){su.innerHTML=`<span class="avatar-sm" style="${photo?`background-image:url('${esc(safeHttps(photo))}')`:""}">${photo?"":initials(name)}</span><div><strong style="font-size:.77rem">${esc(name)}</strong><div class="muted small">Minha conta</div></div>`;su.href="perfil.html"}
     const menuUser=$("#accountMenuUser");if(menuUser)menuUser.innerHTML=`<span class="avatar-sm" style="${photo?`background-image:url('${esc(safeHttps(photo))}')`:""}">${photo?"":initials(name)}</span><div><strong>${esc(name)}</strong><span>Ver conta e opções</span></div>`;
     const logout=$("#accountLogout");if(logout)logout.onclick=async()=>{await authSdk.signOut(auth);location.replace("login.html")};

     try{
       const social=await import("./firebase-data.js");
       if(sessionStorage.getItem(`ec-social-migrated-${user.uid}`)!=="1"){
         await social.migrateSocialGraph(user.uid).catch(()=>{});
         sessionStorage.setItem(`ec-social-migrated-${user.uid}`,"1");
       }
     }catch(e){console.warn("Migração social adiada:",e)}

     try{
       const msg=await import("./messaging-data.js");
       stopNotifications=msg.watchNotifications(user.uid,list=>{
         const unread=list.filter(n=>!n.lida);
         const unreadMessages=unread.filter(n=>n.tipo==="mensagem");
         const conversations=new Set(unreadMessages.map(n=>n.conversaId).filter(Boolean));
         setBadges(unread.length,unreadMessages.length,conversations);
       },e=>console.warn("Notificações indisponíveis:",e));
     }catch(e){console.warn("Badges indisponíveis:",e)}
   });
 }catch(e){console.warn("Cabeçalho sem autenticação:",e)}
}

function setBadges(total,messages,messageConversations=new Set()){
 window.__EC_NOTIFICATION_STATE={total,messages,messageConversations};
 $$('[data-notification-badge]').forEach(el=>{el.textContent=total>99?"99+":String(total||"");el.classList.toggle("hidden",!total)});
 $$('[data-message-badge]').forEach(el=>{el.textContent=messages>99?"99+":String(messages||"");el.classList.toggle("hidden",!messages)});
 window.dispatchEvent(new CustomEvent("ec:notifications",{detail:window.__EC_NOTIFICATION_STATE}));
}

function toggleAccountMenu(force){
 const menu=$("#accountMenu");if(!menu)return;
 const open=typeof force==="boolean"?force:menu.classList.contains("hidden");
 menu.classList.toggle("hidden",!open);
 $("#headerAvatar")?.setAttribute("aria-expanded",open?"true":"false");
}

document.addEventListener("click",e=>{if(!e.target.closest?.(".account-menu-wrap"))toggleAccountMenu(false)});
document.addEventListener("keydown",e=>{if(e.key==="Escape")toggleAccountMenu(false)});

function footer(){const f=$("#siteFooter");if(f)f.innerHTML=`<div class="container site-footer-inner"><span>© 2026 Entre Capítulos · Onde cada página ganha vida.</span><span><a href="sobre.html">Sobre</a> · <a href="privacidade.html">Privacidade</a> · <a href="configuracoes.html">Configurações</a></span></div>`}
function setTheme(pref){localStorage.setItem("ec-theme",pref);const resolved=pref==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):pref;document.documentElement.dataset.theme=resolved;document.documentElement.dataset.themePreference=pref}
document.addEventListener("DOMContentLoaded",()=>{footer();if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{})});
window.UI={$, $$, esc, fmt, timeMs, timeAgo, safeHttps, toast, dialog, confirmDialog, alertDialog, initials, cover, bookCard, shell, setTheme};
