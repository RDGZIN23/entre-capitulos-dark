import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { uploadImage } from "./cloudinary.js";

const SOCIAL_BASES = {
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://www.youtube.com/@",
  twitter: "https://x.com/",
  facebook: "https://www.facebook.com/"
};

function socialHandle(value, platform) {
  let v = String(value || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) {
    try {
      const u = new URL(v);
      let path = u.pathname.replace(/^\/+|\/+$/g, "");
      if ((platform === "tiktok" || platform === "youtube") && path.startsWith("@")) path = path.slice(1);
      v = path.split("/")[0] || "";
    } catch {}
  }
  v = v.replace(/^@+/, "").trim();
  return v ? `@${v}` : "";
}

function socialLink(value, platform) {
  const handle = socialHandle(value, platform).replace(/^@/, "");
  return handle ? SOCIAL_BASES[platform] + handle : "";
}

UI.shell("settings");

function activateTab(id) {
  const target = UI.$(`#${id}`) ? id : "appearance";
  UI.$$('[data-tab]').forEach(btn => btn.classList.toggle("active", btn.dataset.tab === target));
  UI.$$(".tab-panel").forEach(panel => panel.classList.toggle("hidden", panel.id !== target));
}

UI.$$('[data-tab]').forEach(btn => {
  btn.onclick = () => {
    activateTab(btn.dataset.tab);
    const url = new URL(location.href);
    url.searchParams.set("tab", btn.dataset.tab);
    history.replaceState(null, "", url);
  };
});

const requestedTab = new URLSearchParams(location.search).get("tab");
if (requestedTab) activateTab(requestedTab);

const pref = localStorage.getItem("ec-theme") || "dark";
UI.$$('[data-theme]').forEach(btn => {
  btn.classList.toggle("active", btn.dataset.theme === pref);
  btn.onclick = () => {
    UI.setTheme(btn.dataset.theme);
    UI.$$('[data-theme]').forEach(x => x.classList.toggle("active", x === btn));
  };
});

const readerTheme = localStorage.getItem("ec-reader-theme") || "dark";
UI.$("#readerThemeSetting").value = readerTheme;
UI.$("#readerThemeSetting").onchange = e => localStorage.setItem("ec-reader-theme", e.target.value);
const reduceMotion = localStorage.getItem("ec-reduce-motion") === "1";
UI.$("#reduceMotion").checked = reduceMotion;
UI.$("#reduceMotion").onchange = e => {
  localStorage.setItem("ec-reduce-motion", e.target.checked ? "1" : "0");
  document.documentElement.style.scrollBehavior = e.target.checked ? "auto" : "";
};

onAuthStateChanged(auth, async user => {
  if (!user || user.isAnonymous) {
    UI.$("#profile").innerHTML = `<div class="empty-state"><a class="link" href="login.html">Entre</a> para editar seu perfil.</div>`;
    UI.$("#support").innerHTML = `<div class="empty-state"><a class="link" href="login.html">Entre</a> para configurar apoio.</div>`;
    return;
  }

  const [userSnap, authorSnap] = await Promise.all([
    getDoc(doc(db, "usuarios", user.uid)),
    getDoc(doc(db, "autores", user.uid))
  ]);
  const privateData = userSnap.exists() ? userSnap.data() : {};
  const publicData = authorSnap.exists() ? authorSnap.data() : {};
  const merged = { ...publicData, ...privateData };

  UI.$("#settingsName").value = merged.nome || user.displayName || "";
  UI.$("#settingsBio").value = merged.biografia || "";
  UI.$("#settingsAge").value = merged.idade || "";
  UI.$("#settingsLocation").value = merged.localizacao || "";
  UI.$("#settingsGender").value = merged.genero || "";

  const social = publicData.redesSociais || privateData.redesSociais || {};
  UI.$("#socialInstagram").value = socialHandle(social.instagram, "instagram");
  UI.$("#socialTikTok").value = socialHandle(social.tiktok, "tiktok");
  UI.$("#socialYouTube").value = socialHandle(social.youtube, "youtube");
  UI.$("#socialTwitter").value = socialHandle(social.twitter, "twitter");
  UI.$("#socialFacebook").value = socialHandle(social.facebook, "facebook");
  UI.$("#socialSite").value = social.site || "";

  UI.$("#privacyFollowers").value = publicData.privacidadeSeguidores || "publico";
  UI.$("#privacyFollowing").value = publicData.privacidadeSeguindo || "publico";
  UI.$("#privacyReading").value = publicData.privacidadeLeituras || "privado";
  UI.$("#privacyMessages").value = publicData.privacidadeMensagens || "todos";

  UI.$("#pixKey").value = publicData.pixChave || "";
  UI.$("#pixName").value = publicData.pixNome || "";
  UI.$("#supportUrl").value = publicData.apoioUrl || "";
  UI.$("#supportMessage").value = publicData.apoioMensagem || "";

  UI.$("#profileForm").onsubmit = async event => {
    event.preventDefault();
    const name = UI.$("#settingsName").value.trim();
    const bio = UI.$("#settingsBio").value.trim();
    const ageRaw = UI.$("#settingsAge").value.trim();
    const idade = ageRaw ? Number(ageRaw) : null;
    const localizacao = UI.$("#settingsLocation").value.trim();
    const genero = UI.$("#settingsGender").value;
    if (idade !== null && (!Number.isInteger(idade) || idade < 1 || idade > 120)) return UI.toast("Digite uma idade válida.");

    const socialLinks = {
      instagram: socialLink(UI.$("#socialInstagram").value, "instagram"),
      tiktok: socialLink(UI.$("#socialTikTok").value, "tiktok"),
      youtube: socialLink(UI.$("#socialYouTube").value, "youtube"),
      twitter: socialLink(UI.$("#socialTwitter").value, "twitter"),
      facebook: socialLink(UI.$("#socialFacebook").value, "facebook"),
      site: UI.$("#socialSite").value.trim()
    };
    if (socialLinks.site && !UI.safeHttps(socialLinks.site)) return UI.toast("Use um link HTTPS válido no site / portfólio.");

    const privacy = {
      privacidadeSeguidores: UI.$("#privacyFollowers").value,
      privacidadeSeguindo: UI.$("#privacyFollowing").value,
      privacidadeLeituras: UI.$("#privacyReading").value,
      privacidadeMensagens: UI.$("#privacyMessages").value
    };

    let photo = merged.fotoURL || user.photoURL || "";
    const file = UI.$("#settingsPhoto").files[0];
    try {
      if (file) {
        UI.toast("Enviando foto...");
        photo = await uploadImage(file, { kind: "avatar" });
      }
      const common = {
        uid: user.uid,
        nome: name,
        biografia: bio,
        fotoURL: photo,
        idade,
        localizacao,
        genero,
        redesSociais: socialLinks,
        atualizadoEm: serverTimestamp()
      };
      await Promise.all([
        setDoc(doc(db, "usuarios", user.uid), { ...common, email: user.email || "" }, { merge: true }),
        setDoc(doc(db, "autores", user.uid), { ...common, ...privacy }, { merge: true }),
        updateProfile(user, { displayName: name, photoURL: photo || null })
      ]);
      UI.toast("Perfil atualizado");
      if (location.hash === "#privacySettings") UI.$("#privacySettings")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error(error);
      UI.toast(error.message || "Não foi possível salvar");
    }
  };

  UI.$("#supportForm").onsubmit = async event => {
    event.preventDefault();
    const url = UI.$("#supportUrl").value.trim();
    if (url && !UI.safeHttps(url)) return UI.toast("Use um link HTTPS válido.");
    try {
      await setDoc(doc(db, "autores", user.uid), {
        uid: user.uid,
        nome: UI.$("#settingsName").value.trim() || publicData.nome || user.displayName || "Autor",
        biografia: UI.$("#settingsBio").value.trim() || publicData.biografia || "",
        fotoURL: merged.fotoURL || user.photoURL || "",
        pixChave: UI.$("#pixKey").value.trim(),
        pixNome: UI.$("#pixName").value.trim(),
        apoioUrl: url,
        apoioMensagem: UI.$("#supportMessage").value.trim(),
        atualizadoEm: serverTimestamp()
      }, { merge: true });
      UI.toast("Formas de apoio salvas");
    } catch (error) {
      console.error(error);
      UI.toast("Não foi possível salvar o apoio.");
    }
  };

  if (location.hash === "#privacySettings") {
    activateTab("profile");
    setTimeout(() => UI.$("#privacySettings")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }
});
