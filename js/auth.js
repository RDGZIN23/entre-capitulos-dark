
document.addEventListener("DOMContentLoaded",()=>{
  const form=$("#authForm");if(!form)return;
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const email=$("#email").value.trim(),pass=$("#password").value;
    if(!email||pass.length<6){UI.toast("Use um e-mail válido e senha com 6 ou mais caracteres.");return}
    localStorage.setItem("ec-dark-auth",JSON.stringify({email}));
    UI.toast(document.body.dataset.auth==="signup"?"Conta criada":"Login realizado");
    setTimeout(()=>location.href="index.html",500);
  });
});
