
document.addEventListener("DOMContentLoaded",()=>{
  const p=new URLSearchParams(location.search),bookId=p.get("book"),num=Number(p.get("chapter")||1);
  const data=EC.getData(),b=data.books.find(x=>x.id===bookId)||data.books[0];
  let idx=b.chapters.findIndex(c=>Number(c.number)===num);if(idx<0)idx=0;
  const c=b.chapters[idx],prev=b.chapters[idx-1],next=b.chapters[idx+1];
  document.title=c.title+" · "+b.title;
  $("#readerBook").textContent=b.title;$("#readerChapter").textContent=`Capítulo ${c.number} · ${c.title}`;$("#backBook").href=`livro.html?id=${b.id}`;
  $("#readerHeading").innerHTML=`<div class="chapter-kicker">CAPÍTULO ${c.number}</div><h1>${UI.esc(c.title)}</h1><div class="muted small">${UI.esc(b.title)}</div>`;
  $("#readerContent").innerHTML=(c.text||["Capítulo ainda não publicado."]).map(t=>`<p>${UI.esc(t)}</p>`).join("");
  $("#prev").href=prev?`leitura.html?book=${b.id}&chapter=${prev.number}`:`livro.html?id=${b.id}`;
  $("#prev").textContent=prev?"← Anterior":"← Livro";
  $("#next").href=next?`leitura.html?book=${b.id}&chapter=${next.number}`:`livro.html?id=${b.id}`;
  $("#next").textContent=next?"Próximo →":"Finalizar";
  const pct=Math.round(((idx+1)/b.chapters.length)*100);$("#readPct").textContent=pct+"%";$("#readBar").style.width=pct+"%";
  data.user.progress[b.id]=c.number;EC.saveData(data);
  $("#fontDown").onclick=()=>change(-1);$("#fontUp").onclick=()=>change(1);
  function change(dir){const el=$("#readerContent"),px=parseFloat(getComputedStyle(el).fontSize);el.style.fontSize=Math.max(15,Math.min(26,px+dir))+"px"}
});
