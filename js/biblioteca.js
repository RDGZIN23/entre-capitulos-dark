
document.addEventListener("DOMContentLoaded",()=>{
  UI.shell("library");
  const data=EC.getData();
  const favs=data.books.filter(b=>data.user.favorites.includes(b.id));
  $("#favGrid").innerHTML=favs.length?favs.map(UI.bookCard).join(""):'<div class="panel muted" style="grid-column:1/-1;text-align:center;padding:38px">Sua biblioteca está vazia.</div>';
  const prog=Object.entries(data.user.progress||{});
  $("#readingList").innerHTML=prog.map(([id,ch])=>{
    const b=data.books.find(x=>x.id===id);if(!b)return"";
    const pct=Math.min(100,Math.round((ch/b.chapters.length)*100));
    return `<a class="continue-card" href="leitura.html?book=${b.id}&chapter=${ch}"><span class="continue-thumb"></span><span><strong>${UI.esc(b.title)}</strong><span>Capítulo ${ch} de ${b.chapters.length}</span><div class="progress"><i style="width:${pct}%"></i></div></span></a>`;
  }).join("");
});
