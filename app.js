import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

/*
  SETUP: replace the placeholder values with your Firebase Web App config.
  Do not put service-account keys or private credentials in this file.
*/
const firebaseConfig = {
  apiKey: "COLOQUE_SUA_API_KEY",
  authDomain: "COLOQUE_SEU_PROJETO.firebaseapp.com",
  projectId: "COLOQUE_SEU_PROJECT_ID",
  storageBucket: "COLOQUE_SEU_PROJETO.firebasestorage.app",
  messagingSenderId: "COLOQUE_SEU_SENDER_ID",
  appId: "COLOQUE_SEU_APP_ID"
};

const TARGET = 11000;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const parseDate = (s) => new Date(`${s}T12:00:00`);
const weekStart = (dateString) => {
  const d = parseDate(dateString);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return todayLocalFromDate(d);
};
const todayLocalFromDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const shortDate = (s) => s ? s.split("-").reverse().join("/") : "—";
const weekEnd = (start) => { const d=parseDate(start); d.setDate(d.getDate()+6); return todayLocalFromDate(d); };
let currentUser = null, myProfile = null, profiles = [], deposits = [], stopProfiles = null, stopDeposits = null;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function setMessage(id, message, error=false) {
  const el=$(id); el.textContent=message; el.style.color=error?"#b54738":"#1c8a58";
}
function currentWeekStart(){ return weekStart(todayLocal()); }
function isCurrentWeek(d){ return weekStart(d) === currentWeekStart(); }
function sumDeposits(personName, weekOnly=false) {
  return deposits.filter(d => d.personName===personName && (!weekOnly || isCurrentWeek(d.depositDate))).reduce((sum,d)=>sum+Number(d.amount||0),0);
}
function initialBalance(p){ return Number(p.initialBalance || 0); }
function totalFor(p){ return initialBalance(p)+sumDeposits(p.name); }
function groupTotal(){ return profiles.reduce((s,p)=>s+totalFor(p),0); }

$("depositDate").value = todayLocal();
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault(); setMessage("loginMessage","Entrando...");
  try {
    await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);
    setMessage("loginMessage","");
  } catch (err) {
    setMessage("loginMessage", friendlyError(err), true);
  }
});
$("logoutBtn").addEventListener("click", async () => { await signOut(auth); });
$("depositForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if(!currentUser || !myProfile) return;
  const amount = Number($("amount").value);
  const depositDate = $("depositDate").value;
  if(!Number.isFinite(amount) || amount<=0 || !depositDate){ setMessage("depositMessage","Informe um valor válido e a data.",true); return; }
  try {
    await addDoc(collection(db,"deposits"), {
      ownerUid: currentUser.uid,
      personName: myProfile.name,
      amount: Math.round(amount*100)/100,
      depositDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    $("amount").value="";
    $("depositDate").value=todayLocal();
    setMessage("depositMessage","Depósito registrado.");
    toast("Depósito sincronizado com a equipe.");
  } catch(err) { setMessage("depositMessage",friendlyError(err),true); }
});
$("historyFilter").addEventListener("change",renderHistory);

onAuthStateChanged(auth, async (user) => {
  cleanupListeners();
  currentUser=user; myProfile=null; profiles=[]; deposits=[];
  if(!user){ $("loginView").classList.remove("hidden"); $("appView").classList.add("hidden"); $("logoutBtn").classList.add("hidden"); return; }
  try {
    const profileSnap=await getDoc(doc(db,"participants",user.uid));
    if(!profileSnap.exists()){
      await signOut(auth);
      setMessage("loginMessage","Esta conta ainda não foi vinculada a um participante. Peça ao administrador para concluir a configuração.",true);
      return;
    }
    myProfile={uid:user.uid,...profileSnap.data()};
    $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden"); $("logoutBtn").classList.remove("hidden");
    $("myName").textContent=myProfile.name;
    $("weekLabel").textContent=`${shortDate(currentWeekStart())} – ${shortDate(weekEnd(currentWeekStart()))}`;
    stopProfiles=onSnapshot(collection(db,"participants"), snap=>{
      profiles=snap.docs.map(d=>({uid:d.id,...d.data()})).sort((a,b)=>["Ditto","Jm","Júlio"].indexOf(a.name)-["Ditto","Jm","Júlio"].indexOf(b.name));
      renderAll();
    },err=>toast("Erro ao carregar participantes: "+err.message));
    stopDeposits=onSnapshot(query(collection(db,"deposits"),orderBy("depositDate","desc")), snap=>{
      deposits=snap.docs.map(d=>({id:d.id,...d.data()}));
      renderAll();
    },err=>toast("Erro ao sincronizar depósitos: "+err.message));
  } catch(err) {
    setMessage("loginMessage",friendlyError(err),true);
    await signOut(auth);
  }
});

function cleanupListeners(){ if(stopProfiles) stopProfiles(); if(stopDeposits) stopDeposits(); stopProfiles=null; stopDeposits=null; }
function renderAll(){
  if(!myProfile || profiles.length===0) return;
  $("groupTotal").textContent=brl(groupTotal());
  $("groupRemaining").textContent=brl(Math.max(0, TARGET*3-groupTotal()));
  $("weekTotal").textContent=brl(deposits.filter(d=>isCurrentWeek(d.depositDate)).reduce((s,d)=>s+Number(d.amount||0),0));
  $("groupProgress").style.width=`${Math.min(100,groupTotal()/(TARGET*3)*100)}%`;
  $("participantCards").innerHTML=profiles.map(p=>{
    const total=totalFor(p), pct=Math.min(100,total/TARGET*100);
    const bikeImage = p.name === "Ditto" ? "ditto-moto.jpg" : p.name === "Jm" ? "jm-moto.jpg" : "julio-moto.jpg";
    const accent = p.name === "Ditto" ? "ditto" : p.name === "Jm" ? "jm" : "julio";
    return `<article class="participant-card ${accent}">
      <div class="bike-photo"><img src="./assets/${bikeImage}" alt="Moto de ${escapeHtml(p.name)}" loading="lazy"></div>
      <div class="person-top"><div class="avatar">${escapeHtml(p.name.slice(0,1))}</div><span class="person-name">${escapeHtml(p.name)}</span><span class="percent">${pct.toFixed(1).replace(".",",")}%</span></div>
      <div class="person-total">${brl(total)}</div><div class="person-sub">Guardado no total · Meta ${brl(TARGET)}</div>
      <div class="person-progress"><i style="width:${pct}%"></i></div>
      <div class="person-foot"><span>Esta semana: ${brl(sumDeposits(p.name,true))}</span><span>Faltam ${brl(Math.max(0,TARGET-total))}</span></div>
    </article>`;
  }).join("");
  renderRanking(); renderHistory();
}
function renderRanking(){
  const ranked=profiles.map(p=>({name:p.name,total:sumDeposits(p.name,true)})).sort((a,b)=>b.total-a.total);
  const max=Math.max(1,...ranked.map(p=>p.total));
  $("rankingDates").textContent=`Semana de ${shortDate(currentWeekStart())} a ${shortDate(weekEnd(currentWeekStart()))}`;
  $("rankingList").innerHTML=ranked.map((p,i)=>`<div class="rank-row"><div class="rank-num">${i+1}</div><div><div class="rank-name">${escapeHtml(p.name)}</div><div class="rank-bar"><i style="width:${p.total/max*100}%"></i></div></div><div class="rank-value">${brl(p.total)}</div></div>`).join("");
}
function renderHistory(){
  if(!myProfile) return;
  const filter=$("historyFilter").value;
  const filtered=deposits.filter(d=>filter==="all"||(filter==="mine"?d.ownerUid===currentUser.uid:d.personName===filter));
  if(!filtered.length){ $("historyList").innerHTML='<div class="empty">Nenhum depósito encontrado para esse filtro.</div>'; return; }
  $("historyList").innerHTML=filtered.map(d=>{
    const own=d.ownerUid===currentUser.uid;
    const created=d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}) : "Horário de registro indisponível";
    return `<article class="history-item"><div><div class="history-title">${escapeHtml(d.personName)} ${own?'<span class="percent">· seu registro</span>':''}</div><div class="history-meta">Data do depósito: ${shortDate(d.depositDate)} · Registrado em: ${created}</div></div><div><div class="history-amount">${brl(d.amount)}</div>${own?`<div class="history-actions"><button class="text-btn" data-edit="${d.id}">Editar</button><button class="text-btn danger" data-delete="${d.id}">Excluir</button></div>`:""}</div></article>`;
  }).join("");
  $("historyList").querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>editDeposit(btn.dataset.edit)));
  $("historyList").querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>removeDeposit(btn.dataset.delete)));
}
async function editDeposit(id){
  const d=deposits.find(x=>x.id===id); if(!d || d.ownerUid!==currentUser.uid) return;
  const amountRaw=prompt("Novo valor do depósito (R$):",String(d.amount).replace(".",","));
  if(amountRaw===null) return;
  const amount=Number(amountRaw.trim().replace(/\./g,"").replace(",","."));
  if(!Number.isFinite(amount)||amount<=0){toast("Valor inválido.");return;}
  const date=prompt("Nova data do depósito (AAAA-MM-DD):",d.depositDate);
  if(date===null) return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseDate(date).getTime())){toast("Data inválida. Use AAAA-MM-DD.");return;}
  try{await updateDoc(doc(db,"deposits",id),{amount:Math.round(amount*100)/100,depositDate:date,updatedAt:serverTimestamp()});toast("Registro atualizado.");}
  catch(err){toast(friendlyError(err));}
}
async function removeDeposit(id){
  const d=deposits.find(x=>x.id===id); if(!d || d.ownerUid!==currentUser.uid) return;
  if(!confirm(`Excluir o depósito de ${brl(d.amount)} de ${shortDate(d.depositDate)}? Essa ação não pode ser desfeita.`)) return;
  try{await deleteDoc(doc(db,"deposits",id));toast("Depósito excluído.");}
  catch(err){toast(friendlyError(err));}
}
function friendlyError(err){
  const code=err?.code||"";
  if(code==="auth/invalid-credential"||code==="auth/wrong-password"||code==="auth/user-not-found") return "E-mail ou senha incorretos.";
  if(code==="auth/too-many-requests") return "Muitas tentativas. Aguarde e tente novamente.";
  if(code==="permission-denied"||code==="firestore/permission-denied") return "Acesso negado. Confira as regras do Firestore e o cadastro do participante.";
  if(code==="auth/unauthorized-domain") return "Este domínio ainda não está autorizado no Firebase Authentication.";
  if(code==="auth/invalid-api-key") return "Configure a API Key do Firebase em app.js.";
  return err?.message||"Não foi possível concluir a operação.";
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
