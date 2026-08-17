
document.addEventListener("DOMContentLoaded",()=>{
  UI.shell("home");
  const data=EC.getData(), b=data.books.find(x=>x.featured)||data.books[0];
  $("#hero").innerHTML=`
    ${UI.coverMarkup(b,"hero-cover")}
    <div class="hero-copy">
      <span class="eyebrow">✦ Destaque da semana</span>
      <h1>${UI.esc(b.title)}</h1>
      <div class="hero-meta"><span>${UI.esc(b.author)}</span><span>• ${UI.esc(b.genre)}</span><span>• ${UI.fmt(b.reads)} leituras</span></div>
      <p>${UI.esc(b.description)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="leitura.html?book=${b.id}&chapter=1">▶ Ler agora</a>
        <button class="btn secondary" id="favHero">${data.user.favorites.includes(b.id)?"♥ Na biblioteca":"♡ Adicionar à biblioteca"}</button>
      </div>
    </div>
    <aside class="ranking">
      <h3>Top histórias</h3>
      ${data.books.slice().sort((a,b)=>b.reads-a.reads).slice(0,5).map((x,i)=>`
      <a class="rank-item" href="livro.html?id=${x.id}">
        <span class="rank-num">${i+1}</span><span class="rank-thumb"></span>
        <span class="rank-copy"><strong>${UI.esc(x.title)}</strong><span>${UI.esc(x.author)}</span></span>
      </a>`).join("")}
    </aside>`;
  $("#favHero").onclick=()=>{
    const d=EC.getData(),i=d.user.favorites.indexOf(b.id);
    if(i>=0)d.user.favorites.splice(i,1);else d.user.favorites.push(b.id);
    EC.saveData(d);$("#favHero").textContent=i>=0?"♡ Adicionar à biblioteca":"♥ Na biblioteca";UI.toast(i>=0?"Removido da biblioteca":"Adicionado à biblioteca");
  };
  const progress=Object.entries(data.user.progress||{});
  $("#continueList").innerHTML=progress.map(([id,ch])=>{
    const x=data.books.find(b=>b.id===id);if(!x)return"";
    const pct=Math.round((ch/x.chapters.length)*100);
    return `<a class="continue-card" href="leitura.html?book=${x.id}&chapter=${ch}">
      <span class="continue-thumb"></span>
      <span><strong>${UI.esc(x.title)}</strong><span>Capítulo ${ch} · ${pct}%</span><div class="progress"><i style="width:${pct}%"></i></div></span>
    </a>`;
  }).join("");
  $("#trendingGrid").innerHTML=data.books.map(UI.bookCard).join("");
});
