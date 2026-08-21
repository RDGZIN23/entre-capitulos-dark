import { auth,db } from "./firebase-config.js";import { onAuthStateChanged,updateProfile } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";import { doc,getDoc,setDoc,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";import { uploadImage } from "./cloudinary.js";

const SOCIAL_BASES={
  instagram:"https://www.instagram.com/",
  tiktok:"https://www.tiktok.com/@",
  youtube:"https://www.youtube.com/@",
  twitter:"https://x.com/",
  facebook:"https://www.facebook.com/"
};

function socialHandle(value,platform){
  let v=String(value||"").trim();
  if(!v)return "";

  if(v.startsWith("http://")||v.startsWith("https://")){
    try{
      const u=new URL(v);
      let path=u.pathname.replace(/^\/+|\/+$/g,"");

      if((platform==="tiktok"||platform==="youtube")&&path.startsWith("@")){
        path=path.slice(1);
      }

      v=path.split("/")[0]||"";
    }catch{}
  }

  v=v.replace(/^@+/,"").trim();
  return v?`@${v}`:"";
}

function socialLink(value,platform){
  const handle=socialHandle(value,platform).replace(/^@/,"");
  return handle?SOCIAL_BASES[platform]+handle:"";
}

UI.shell("settings");UI.$$("[data-tab]").forEach(b=>b.onclick=()=>{UI.$$("[data-tab]").forEach(x=>x.classList.remove("active"));b.classList.add("active");UI.$$(".tab-panel").forEach(x=>x.classList.add("hidden"));UI.$(`#${b.dataset.tab}`).classList.remove("hidden")});
const pref=localStorage.getItem("ec-theme")||"dark";UI.$$("[data-theme]").forEach(b=>{b.classList.toggle("active",b.dataset.theme===pref);b.onclick=()=>{UI.setTheme(b.dataset.theme);UI.$$("[data-theme]").forEach(x=>x.classList.toggle("active",x===b))}});
const rt=localStorage.getItem("ec-reader-theme")||"dark";UI.$("#readerThemeSetting").value=rt;UI.$("#readerThemeSetting").onchange=e=>localStorage.setItem("ec-reader-theme",e.target.value);
const rm=localStorage.getItem("ec-reduce-motion")==="1";UI.$("#reduceMotion").checked=rm;UI.$("#reduceMotion").onchange=e=>{localStorage.setItem("ec-reduce-motion",e.target.checked?"1":"0");document.documentElement.style.scrollBehavior=e.target.checked?"auto":""};
onAuthStateChanged(auth,async u=>{if(!u||u.isAnonymous){UI.$("#profile").innerHTML=`<div class="empty-state"><a class="link" href="login.html">Entre</a> para editar seu perfil.</div>`;UI.$("#support").innerHTML=`<div class="empty-state"><a class="link" href="login.html">Entre</a> para configurar apoio.</div>`;return}const [us,as]=await Promise.all([getDoc(doc(db,"usuarios",u.uid)),getDoc(doc(db,"autores",u.uid))]);const p=us.exists()?us.data():{},a=as.exists()?as.data():{};UI.$("#settingsName").value=p.nome||u.displayName||"";UI.$("#settingsBio").value=p.biografia||"";UI.$("#settingsAge").value=p.idade||a.idade||"";UI.$("#settingsLocation").value=p.localizacao||a.localizacao||"";UI.$("#settingsGender").value=p.genero||a.genero||"";const social=a.redesSociais||p.redesSociais||{};UI.$("#socialInstagram").value=socialHandle(social.instagram,"instagram");UI.$("#socialTikTok").value=socialHandle(social.tiktok,"tiktok");UI.$("#socialYouTube").value=socialHandle(social.youtube,"youtube");UI.$("#socialTwitter").value=socialHandle(social.twitter,"twitter");UI.$("#socialFacebook").value=socialHandle(social.facebook,"facebook");UI.$("#socialSite").value=social.site||"";UI.$("#pixKey").value=a.pixChave||"";UI.$("#pixName").value=a.pixNome||"";UI.$("#supportUrl").value=a.apoioUrl||"";UI.$("#supportMessage").value=a.apoioMensagem||"";
 UI.$("#profileForm").onsubmit=async e=>{e.preventDefault();const name=UI.$("#settingsName").value.trim(),bio=UI.$("#settingsBio").value.trim();const idadeRaw=UI.$("#settingsAge").value.trim();const idade=idadeRaw?Number(idadeRaw):null;const localizacao=UI.$("#settingsLocation").value.trim();const genero=UI.$("#settingsGender").value;if(idade!==null&&(!Number.isInteger(idade)||idade<1||idade>120))return UI.toast("Digite uma idade válida.");const socialLinks={instagram:socialLink(UI.$("#socialInstagram").value,"instagram"),tiktok:socialLink(UI.$("#socialTikTok").value,"tiktok"),youtube:socialLink(UI.$("#socialYouTube").value,"youtube"),twitter:socialLink(UI.$("#socialTwitter").value,"twitter"),facebook:socialLink(UI.$("#socialFacebook").value,"facebook"),site:UI.$("#socialSite").value.trim()};if(socialLinks.site&&!UI.safeHttps(socialLinks.site))return UI.toast("Use um link HTTPS válido no site / portfólio.");let photo=p.fotoURL||u.photoURL||"",file=UI.$("#settingsPhoto").files[0];try{if(file){UI.toast("Enviando foto...");photo=await uploadImage(file,{kind:"avatar"})}await setDoc(doc(db,"usuarios",u.uid),{uid:u.uid,nome:name,biografia:bio,fotoURL:photo,email:u.email||"",idade:idade,localizacao:localizacao,genero:genero,idade:idade,localizacao:localizacao,genero:genero,redesSociais:socialLinks,atualizadoEm:serverTimestamp()},{merge:true});await setDoc(doc(db,"autores",u.uid),{uid:u.uid,nome:name,biografia:bio,fotoURL:photo,redesSociais:socialLinks,atualizadoEm:serverTimestamp()},{merge:true});await updateProfile(u,{displayName:name,photoURL:photo||null});UI.toast("Perfil atualizado")}catch(err){console.error(err);UI.toast(err.message||"Não foi possível salvar")}};
 UI.$("#supportForm").onsubmit=async e=>{e.preventDefault();const url=UI.$("#supportUrl").value.trim();if(url&&!UI.safeHttps(url))return UI.toast("Use um link HTTPS válido.");await setDoc(doc(db,"autores",u.uid),{uid:u.uid,nome:UI.$("#settingsName").value.trim()||p.nome||u.displayName||"Autor",biografia:UI.$("#settingsBio").value.trim()||p.biografia||"",fotoURL:p.fotoURL||u.photoURL||"",pixChave:UI.$("#pixKey").value.trim(),pixNome:UI.$("#pixName").value.trim(),apoioUrl:url,apoioMensagem:UI.$("#supportMessage").value.trim(),atualizadoEm:serverTimestamp()},{merge:true});UI.toast("Formas de apoio salvas")};
});

/* =========================================
   PRIVACIDADE DO PERFIL
   ========================================= */

onAuthStateChanged(auth, async user => {
  if (!user || user.isAnonymous) return;

  try {
    const snap = await getDoc(doc(db, "autores", user.uid));
    const profile = snap.exists() ? snap.data() : {};

    const followers = UI.$("#privacyFollowers");
    const following = UI.$("#privacyFollowing");
    const reading = UI.$("#privacyReading");

    if (followers) {
      followers.value = profile.privacidadeSeguidores || "publico";
    }

    if (following) {
      following.value = profile.privacidadeSeguindo || "publico";
    }

    if (reading) {
      reading.value = profile.privacidadeLeituras || "privado";
    }
  } catch (error) {
    console.error("Erro ao carregar privacidade:", error);
  }
});

UI.$("#profileForm")?.addEventListener("submit", async () => {
  const user = auth.currentUser;

  if (!user || user.isAnonymous) return;

  try {
    await setDoc(
      doc(db, "autores", user.uid),
      {
        privacidadeSeguidores:
          UI.$("#privacyFollowers")?.value || "publico",

        privacidadeSeguindo:
          UI.$("#privacyFollowing")?.value || "publico",

        privacidadeLeituras:
          UI.$("#privacyReading")?.value || "privado",

        atualizadoEm: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Erro ao salvar privacidade:", error);
  }
});
