
document.addEventListener("DOMContentLoaded",()=>{
  UI.shell("explore");
  const data=EC.getData(), input=$("#search"), grid=$("#grid"), counter=$("#counter");
  const params=new URLSearchParams(location.search);input.value=params.get("q")||"";
  let genre="Todos";
  const genres=["Todos",...new Set(data.books.map(b=>b.genre))];
  $("#filters").innerHTML=genres.map((g,i)=>`<button class="filter ${i===0?"active":""}" data-g="${UI.esc(g)}">${UI.esc(g)}</button>`).join("");
  function render(){
    const q=input.value.toLowerCase().trim();
    const items=data.books.filter(b=>{
      const hay=(b.title+" "+b.author+" "+b.genre+" "+b.description).toLowerCase();
      return (!q||hay.includes(q))&&(genre==="Todos"||b.genre===genre);
    });
    counter.textContent=`${items.length} ${items.length===1?"história":"histórias"}`;
    grid.innerHTML=items.length?items.map(UI.bookCard).join(""):'<div class="panel muted" style="grid-column:1/-1;text-align:center;padding:42px">Nenhuma história encontrada.</div>';
  }
  input.addEventListener("input",render);
  $$("[data-g]").forEach(btn=>btn.onclick=()=>{$$("[data-g]").forEach(x=>x.classList.remove("active"));btn.classList.add("active");genre=btn.dataset.g;render()});
  render();
});
