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


function safeFolderPart(value){
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120) || "geral";
}

export async function uploadChatMedia(file,{tipo="imagem",conversationId="",userId=""}={}){
  if(!file) throw new Error("Arquivo inválido.");
  if(!["imagem","audio"].includes(tipo)) throw new Error("Tipo de mídia inválido.");

  const resourceType = tipo === "audio" ? "video" : "image";
  const folder = [
    "entre-capitulos",
    "chat",
    safeFolderPart(conversationId),
    safeFolderPart(userId)
  ].join("/");

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", APP.cloudinary.uploadPreset);
  form.append("folder", folder);
  form.append("return_delete_token", "true");
  form.append("tags", "entre-capitulos,chat");

  const url = `https://api.cloudinary.com/v1_1/${APP.cloudinary.cloudName}/${resourceType}/upload`;
  const res = await fetch(url,{method:"POST",body:form});
  const data = await res.json().catch(()=>({}));
  if(!res.ok || !data.secure_url){
    throw new Error(data?.error?.message || (tipo === "audio"
      ? "Falha ao enviar o áudio para o Cloudinary."
      : "Falha ao enviar a foto para o Cloudinary."));
  }

  return {
    url: data.secure_url,
    publicId: data.public_id || "",
    resourceType: data.resource_type || resourceType,
    format: data.format || "",
    bytes: Number(data.bytes || file.size || 0),
    deleteToken: data.delete_token || ""
  };
}

export async function deleteCloudinaryUploadByToken(token){
  if(!token) return false;
  const form = new FormData();
  form.append("token", token);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${APP.cloudinary.cloudName}/delete_by_token`,{
    method:"POST",
    body:form
  });
  return res.ok;
}
