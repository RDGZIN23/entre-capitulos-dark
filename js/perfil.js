
document.addEventListener("DOMContentLoaded",()=>{
  UI.shell("profile");
  const d=EC.getData(),u=d.user,initials=u.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  $("#avatar").textContent=initials;$("#name").textContent=u.name;$("#bio").textContent=u.bio;
  $("#favCount").textContent=u.favorites.length;$("#readCount").textContent=Object.keys(u.progress||{}).length;$("#following").textContent=u.following||0;
  $("#profileBooks").innerHTML=d.books.filter(b=>u.favorites.includes(b.id)).map(UI.bookCard).join("");
  $("#editBtn").onclick=()=>$("#editPanel").classList.toggle("hidden");
  $("#saveProfile").onclick=()=>{
    const d=EC.getData();d.user.name=$("#editName").value.trim()||d.user.name;d.user.bio=$("#editBio").value.trim()||d.user.bio;EC.saveData(d);location.reload();
  };
  $("#editName").value=u.name;$("#editBio").value=u.bio;
});
