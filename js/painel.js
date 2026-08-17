
document.addEventListener("DOMContentLoaded",()=>{
  UI.shell("admin");
  render();
  $("#bookForm").addEventListener("submit",e=>{
    e.preventDefault();
    const d=EC.getData(),title=$("#bookTitle").value.trim();
    if(!title)return;
    const id=UI.slugify(title)+"-"+Date.now().toString().slice(-4);
    d.books.unshift({id,title,author:"RD Sebastião",genre:$("#bookGenre").value,reads:0,rating:0,description:$("#bookDesc").value.trim(),chapters:[]});
    EC.saveData(d);e.target.reset();UI.toast("Livro criado");render();
  });
  function render(){
    const d=EC.getData();
    $("#kpis").innerHTML=`
      <div class="kpi"><span>Livros</span><strong>${d.books.length}</strong></div>
      <div class="kpi"><span>Leituras</span><strong>${UI.fmt(d.books.reduce((a,b)=>a+b.reads,0))}</strong></div>
      <div class="kpi"><span>Capítulos</span><strong>${d.books.reduce((a,b)=>a+b.chapters.length,0)}</strong></div>
      <div class="kpi"><span>Favoritos</span><strong>${d.user.favorites.length}</strong></div>`;
    $("#bookRows").innerHTML=d.books.map(b=>`<tr><td><strong>${UI.esc(b.title)}</strong><div class="muted small">${UI.esc(b.genre)}</div></td><td>${b.chapters.length}</td><td>${UI.fmt(b.reads)}</td><td><span class="status ${b.chapters.length?"live":"draft"}">${b.chapters.length?"Publicado":"Rascunho"}</span></td><td><a class="btn" style="height:34px" href="livro.html?id=${b.id}">Abrir</a></td></tr>`).join("");
  }
});
