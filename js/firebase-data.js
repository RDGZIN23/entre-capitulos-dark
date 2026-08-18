import { auth, db } from "./firebase-config.js";
import {
 collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,query,where,serverTimestamp,arrayUnion,getCountFromServer,limit
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const pub=v=>String(v||"").toLowerCase()==="publicado";
const ms=v=>v?.toMillis?.()??(v?.seconds?v.seconds*1000:Number(v)||0);
const normChapter=d=>({id:d.id,bookId:d.livroId||"",bookTitle:d.livroTitulo||"",number:Number(d.numero||0),title:d.titulo||"Capítulo",summary:d.resumo||"",text:d.texto||"",status:d.status||"",createdAt:d.criadoEm||null,updatedAt:d.atualizadoEm||null,ownerId:d.criadoPor||""});
async function qdocs(q){const s=await getDocs(q);return s.docs.map(x=>({id:x.id,...x.data()}))}
export async function publicBooks(){
 const raw=await qdocs(query(collection(db,"livros"),where("status","==","publicado")));
 const books=await Promise.all(raw.map(async b=>normalizeBook(b)));return books.sort((a,b)=>ms(b.createdAt)-ms(a.createdAt));
}
export async function publishedChapters(bookId){
 const raw=await qdocs(query(collection(db,"capitulos"),where("livroId","==",bookId),where("status","==","publicado")));
 return raw.map(normChapter).sort((a,b)=>a.number-b.number);
}
export async function normalizeBook(b){
 const [chapters,ratings,views]=await Promise.all([
  publishedChapters(b.id).catch(()=>[]),
  qdocs(query(collection(db,"avaliacoes"),where("livroId","==",b.id))).catch(()=>[]),
  qdocs(query(collection(db,"visualizacoesCapitulos"),where("livroId","==",b.id))).catch(()=>[])
 ]);
 const valid=ratings.map(x=>Number(x.nota)).filter(n=>n>=1&&n<=5);
 return{id:b.id,title:b.titulo||"Livro",author:b.autor||"Autor",authorId:b.criadoPor||"",genre:b.genero||"Literatura",cover:b.capa||"",description:b.sinopse||"",status:b.status||"",tags:Array.isArray(b.tags)?b.tags:[],mature:b.maduro===true,featured:b.destaque===true,createdAt:b.criadoEm||null,updatedAt:b.atualizadoEm||null,chapters,rating:valid.length?Number((valid.reduce((a,n)=>a+n,0)/valid.length).toFixed(1)):0,ratingCount:valid.length,reads:views.length};
}
export async function bookById(id){
 const s=await getDoc(doc(db,"livros",id));if(!s.exists())return null;return normalizeBook({id:s.id,...s.data()});
}
export async function chapterContext(id){
 const s=await getDoc(doc(db,"capitulos",id));if(!s.exists())return null;const c=normChapter({id:s.id,...s.data()});
 const bs=await getDoc(doc(db,"livros",c.bookId));if(!bs.exists())return null;const bd=bs.data();
 const chapters=await publishedChapters(c.bookId).catch(()=>[]);
 let i=chapters.findIndex(x=>x.id===c.id);if(i<0){chapters.push(c);chapters.sort((a,b)=>a.number-b.number);i=chapters.findIndex(x=>x.id===c.id)}
 return{book:{id:bs.id,title:bd.titulo||"Livro",author:bd.autor||"Autor",authorId:bd.criadoPor||"",cover:bd.capa||"",genre:bd.genero||""},chapter:c,chapters,index:i,previous:i>0?chapters[i-1]:null,next:i>=0&&i<chapters.length-1?chapters[i+1]:null};
}
export async function privateProfile(uid){const s=await getDoc(doc(db,"usuarios",uid));return s.exists()?{id:s.id,...s.data()}:null}
export async function publicAuthor(uid){const s=await getDoc(doc(db,"autores",uid));return s.exists()?{id:s.id,...s.data()}:null}
export async function authorBooks(uid){const raw=await qdocs(query(collection(db,"livros"),where("criadoPor","==",uid),where("status","==","publicado")));return Promise.all(raw.map(normalizeBook))}
export async function favorites(uid){return qdocs(query(collection(db,"favoritos"),where("usuarioId","==",uid)))}
export async function progress(uid){return qdocs(query(collection(db,"progressoLeitura"),where("usuarioId","==",uid)))}
export async function follows(uid){return qdocs(query(collection(db,"seguindoAutores"),where("usuarioId","==",uid)))}
export async function isFavorite(uid,bookId){const s=await getDoc(doc(db,"favoritos",`${uid}_${bookId}`));return s.exists()}
export async function toggleFavorite(user,book){
 const ref=doc(db,"favoritos",`${user.uid}_${book.id}`),s=await getDoc(ref);if(s.exists()){await deleteDoc(ref);return false}
 await setDoc(ref,{usuarioId:user.uid,livroId:book.id,titulo:book.title,autor:book.author,capa:book.cover||"",criadoEm:serverTimestamp()});return true;
}
export async function isFollowing(uid,authorId){const s=await getDoc(doc(db,"seguindoAutores",`${uid}_${authorId}`));return s.exists()}
export async function toggleFollow(user,authorId){
 const ref=doc(db,"seguindoAutores",`${user.uid}_${authorId}`),s=await getDoc(ref);if(s.exists()){await deleteDoc(ref);return false}
 await setDoc(ref,{usuarioId:user.uid,autorId:authorId,criadoEm:serverTimestamp()});return true;
}
export async function saveProgress(user,ctx){
 if(!user||user.isAnonymous)return;
 await setDoc(doc(db,"progressoLeitura",`${user.uid}_${ctx.book.id}`),{usuarioId:user.uid,livroId:ctx.book.id,livroTitulo:ctx.book.title,capa:ctx.book.cover||"",ultimoCapituloId:ctx.chapter.id,ultimoCapituloNumero:ctx.chapter.number,ultimoCapituloTitulo:ctx.chapter.title,capitulosLidos:arrayUnion(ctx.chapter.id),atualizadoEm:serverTimestamp()},{merge:true});
}
export async function ensureViewer(){
 if(auth.currentUser)return auth.currentUser;try{const c=await signInAnonymously(auth);return c.user}catch{return null}
}
export async function registerView(ctx){
 const u=await ensureViewer();if(!u)return 0;const id=`${ctx.chapter.id}_${u.uid}`,ref=doc(db,"visualizacoesCapitulos",id),s=await getDoc(ref);
 if(!s.exists())await setDoc(ref,{usuarioId:u.uid,usuarioAnonimo:u.isAnonymous===true,livroId:ctx.book.id,capituloId:ctx.chapter.id,capituloNumero:ctx.chapter.number,capituloTitulo:ctx.chapter.title,criadoEm:serverTimestamp()});
 const count=await getCountFromServer(query(collection(db,"visualizacoesCapitulos"),where("capituloId","==",ctx.chapter.id)));return count.data().count;
}
export async function toggleLike(user,chapterId){
 const ref=doc(db,"curtidasCapitulos",`${chapterId}_${user.uid}`),s=await getDoc(ref);if(s.exists()){await deleteDoc(ref)}else await setDoc(ref,{usuarioId:user.uid,capituloId:chapterId,criadoEm:serverTimestamp()});
 const count=await getCountFromServer(query(collection(db,"curtidasCapitulos"),where("capituloId","==",chapterId)));return{liked:!s.exists(),count:count.data().count};
}
export async function likeState(user,chapterId){
 const [s,c]=await Promise.all([user&&!user.isAnonymous?getDoc(doc(db,"curtidasCapitulos",`${chapterId}_${user.uid}`)):Promise.resolve(null),getCountFromServer(query(collection(db,"curtidasCapitulos"),where("capituloId","==",chapterId))).catch(()=>({data:()=>({count:0})}))]);return{liked:!!s?.exists?.(),count:c.data().count};
}
export async function comments(chapterId){const r=await qdocs(query(collection(db,"comentarios"),where("capituloId","==",chapterId)));return r.sort((a,b)=>ms(b.criadoEm)-ms(a.criadoEm))}
export async function addComment(user,ctx,text,profile){
 return addDoc(collection(db,"comentarios"),{usuarioId:user.uid,nomeUsuario:profile?.nome||user.displayName||"Leitor",fotoUsuario:profile?.fotoURL||profile?.foto||user.photoURL||"",livroId:ctx.book.id,capituloId:ctx.chapter.id,comentario:text,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()});
}
export async function deleteComment(id){return deleteDoc(doc(db,"comentarios",id))}
export async function ratings(bookId){const r=await qdocs(query(collection(db,"avaliacoes"),where("livroId","==",bookId)));return r.sort((a,b)=>ms(b.atualizadoEm||b.criadoEm)-ms(a.atualizadoEm||a.criadoEm))}
export async function saveRating(user,bookId,note,comment,profile){
 return setDoc(doc(db,"avaliacoes",`${bookId}_${user.uid}`),{livroId:bookId,usuarioId:user.uid,usuarioNome:profile?.nome||user.displayName||"Leitor",usuarioFoto:profile?.fotoURL||profile?.foto||user.photoURL||"",nota:Number(note),comentario:comment||"",atualizadoEm:serverTimestamp(),criadoEm:serverTimestamp()},{merge:true});
}
export async function deleteRating(user,bookId){return deleteDoc(doc(db,"avaliacoes",`${bookId}_${user.uid}`))}
export async function latestPublishedChapters(){const raw=await qdocs(query(collection(db,"capitulos"),where("status","==","publicado"),limit(100)));return raw.map(normChapter).sort((a,b)=>ms(b.createdAt)-ms(a.createdAt)).slice(0,40)}
