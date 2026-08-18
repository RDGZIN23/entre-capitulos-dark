import { APP } from "./config.js";
export async function uploadImage(file,{kind="image"}={}){
  if(!file) return "";
  if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) throw new Error("Use JPG, PNG, WEBP ou GIF.");
  const max=kind==="avatar"?APP.limits.avatarMB:APP.limits.coverMB;
  if(file.size>max*1024*1024) throw new Error(`A imagem deve ter no máximo ${max} MB.`);
  const form=new FormData();form.append("file",file);form.append("upload_preset",APP.cloudinary.uploadPreset);
  form.append("folder",kind==="avatar"?"entre-capitulos/perfis":"entre-capitulos/capas");
  const url=`https://api.cloudinary.com/v1_1/${APP.cloudinary.cloudName}/image/upload`;
  const res=await fetch(url,{method:"POST",body:form});const data=await res.json();
  if(!res.ok||!data.secure_url) throw new Error(data?.error?.message||"Falha no upload.");
  return data.secure_url;
}
