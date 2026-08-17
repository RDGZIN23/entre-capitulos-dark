
document.addEventListener("DOMContentLoaded",()=>{
  UI.shell("");
  const id=new URLSearchParams(location.search).get("id");
  const data=EC.getData(), b=data.books.find(x=>x.id===id)||data.books[0];
  document.title=b.title+" · Entre Capítulos";
  $("#detail").innerHTML=`
    ${UI.coverMarkup(b)}
    <div>
      <span class="eyebrow">${UI.esc(b.genre)}</span>
      <h1>${UI.esc(b.title)}</h1>
      <div class="muted">por <strong>${UI.esc(b.author)}</strong></div>
      <div class="meta-pills"><span class="pill">★ ${b.rating}</span><span class="pill">${UI.fmt(b.reads)} leituras</span><span class="pill">${b.chapters.length} capítulos</span></div>
      <p class="detail-description">${UI.esc(b.description)}</p>
      <div class="hero-actions detail-actions"><a class="btn btn-primary" href="leitura.html?book=${b.id}&chapter=1">▶ Começar leitura</a><button class="btn" id="favBtn">${data.user.favorites.includes(b.id)?"♥ Na biblioteca":"♡ Adicionar à biblioteca"}</button></div>
    </div>`;
  $("#chapters").innerHTML=b.chapters.map(c=>`<a class="chapter" href="leitura.html?book=${b.id}&chapter=${c.number}">
    <span class="chapter-num">${c.number}</span><span><strong>${UI.esc(c.title)}</strong><span>Capítulo ${c.number}</span></span><b>→</b>
  </a>`).join("");
  $("#favBtn").onclick=()=>{
    const d=EC.getData(),i=d.user.favorites.indexOf(b.id);
    if(i>=0)d.user.favorites.splice(i,1);else d.user.favorites.push(b.id);
    EC.saveData(d);$("#favBtn").textContent=i>=0?"♡ Adicionar à biblioteca":"♥ Na biblioteca";UI.toast(i>=0?"Removido da biblioteca":"Adicionado à biblioteca");
  };
});
