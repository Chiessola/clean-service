async function init(){
  const me=await api('me'); user=me.user; isAdm=me.admin; plans=me.plans||[];
  $('#nav').innerHTML='<a class="btn s l" href="index.html">Voir le site</a>'+(user?`<button class="btn s g" onclick="api('logout').then(init)">Déconnexion</button>`:'');
  if(!user)return login(); admin();
}
function login(){
  app.innerHTML=`<div class="card" style="max-width:380px;margin:auto"><h2>Espace administrateur</h2><label>E-mail</label><input id="em" type="email"><label>Mot de passe</label><input id="pw" type="password"><button class="btn g" id="li">Se connecter</button><p id="msg" class="warn" hidden></p></div>`;
  $('#li').onclick=async()=>{const r=await api('login',{email:$('#em').value,password:$('#pw').value});r.error?($('#msg').hidden=false,$('#msg').textContent=r.error):init()};
}
let A={subs:[],notifs:[],tab:'val',day:JOURS[(new Date().getDay()+6)%7]};
async function admin(){
  if(!isAdm)return app.innerHTML='<p class="warn">Accès réservé aux administrateurs.</p>';
  const d=await api('admin_data');A.subs=d.subs;A.notifs=d.notifs;
  // expiration automatique
  const today=iso(new Date());for(const s of A.subs)if(s.status==='active'&&s.end_date<today){s.status='expired';0}
  adminDraw();
}
const tabs=[['val','Validations'],['plan','Planning du jour'],['cli','Suivi clients'],['rap','Rapports'],['msg','Messages & relances']];
window.setTab=t=>{A.tab=t;adminDraw()};
function adminDraw(){
  let h=`<div class="tabs noprint">${tabs.map(([k,n])=>`<button class="btn ${A.tab==k?'':'g'}" onclick="setTab('${k}')">${n}</button>`).join('')}</div><div class="box">`;
  const act=A.subs.filter(s=>s.status==='active');
  if(A.tab=='val'){const L=A.subs.filter(s=>s.status==='pending');h+=L.length?`<table><tr><th>Client</th><th>Tél.</th><th>Quartier</th><th>Pack</th><th>Réf. paiement</th><th></th></tr>${L.map(s=>`<tr><td>${s.profiles.full_name}</td><td>${s.profiles.phone}</td><td>${s.profiles.quartier}</td><td>${s.plans.name}</td><td>${s.payer_name} / ${s.payer_phone}<br><b>${s.payment_ref}</b></td><td><button class="btn s l" onclick="valid('${s.id}',1)">Valider</button> <button class="btn s" style="background:#f66;color:#fff" onclick="valid('${s.id}',0)">Rejeter</button></td></tr>`).join('')}</table>`:'<p>Aucun paiement en attente.</p>'}
  if(A.tab=='plan'){const L=act.filter(s=>s.passage_days.includes(A.day)).sort((a,b)=>(a.profiles.quartier||'').localeCompare(b.profiles.quartier||''));
    const txt=`Tournée ${A.day} :\n`+L.map((s,i)=>`${i+1}. ${s.profiles.full_name} – ${s.profiles.quartier}, ${s.profiles.address} – ${s.profiles.phone}`).join('\n');
    h+=`<div class="noprint"><select onchange="A.day=this.value;adminDraw()">${JOURS.map(j=>`<option ${j==A.day?'selected':''}>${j}</option>`).join('')}</select><button class="btn s" onclick="print()">Imprimer / PDF</button> <a class="btn s l" target="_blank" href="https://wa.me/?text=${encodeURIComponent(txt)}">Envoyer à l'équipe (WhatsApp)</a></div><h3>Tournée du ${A.day} (${L.length})</h3><table><tr><th>#</th><th>Client</th><th>Quartier</th><th>Repère</th><th>Contact</th></tr>${L.map((s,i)=>`<tr><td>${i+1}</td><td>${s.profiles.full_name}</td><td>${s.profiles.quartier}</td><td>${s.profiles.address}</td><td><a href="tel:${s.profiles.phone}">${s.profiles.phone}</a> <a href="${wa(s.profiles.phone,'Bonjour, Clean & Services')}" target="_blank">WhatsApp</a></td></tr>`).join('')}</table>`}
  if(A.tab=='cli'){const qs=[...new Set(A.subs.map(s=>s.profiles.quartier))];h+=`<div class="noprint"><select id="fs" onchange="adminDraw()"><option value="">Tous statuts</option>${['pending','active','expired','rejected'].map(x=>`<option ${window.FS==x?'selected':''}>${x}</option>`).join('')}</select><select id="fq"><option value="">Tous quartiers</option>${qs.map(q=>`<option>${q}</option>`).join('')}</select><button class="btn s" onclick="csv()">Export CSV</button></div><table id="tc"><tr><th>Nom</th><th>Tél.</th><th>Quartier</th><th>Pack</th><th>Jours</th><th>Statut</th><th>Fin</th></tr></table>`;setTimeout(()=>{const f=()=>{const s=$('#fs').value,q=$('#fq').value;window.CL=A.subs.filter(x=>(!s||x.status==s)&&(!q||x.profiles.quartier==q));$('#tc').innerHTML=$('#tc').rows[0].outerHTML+CL.map(x=>`<tr><td>${x.profiles.full_name}</td><td>${x.profiles.phone}</td><td>${x.profiles.quartier}</td><td>${x.plans.name}</td><td>${x.passage_days.join('/')}</td><td>${x.status}</td><td>${fd(x.end_date)}</td></tr>`).join('')};$('#fs').onchange=$('#fq').onchange=f;f()})}
  if(A.tab=='rap'){const paid=A.subs.filter(s=>['active','expired'].includes(s.status)),mo=iso(new Date()).slice(0,7),by={};paid.forEach(s=>by[s.plans.name]=(by[s.plans.name]||0)+1);const mx=Math.max(1,...Object.values(by));
    h+=`<div class="grid"><div class="card"><div class="price">${fc(paid.reduce((a,s)=>a+s.amount,0))}</div>Chiffre d'affaires total</div><div class="card"><div class="price">${fc(paid.filter(s=>(s.validated_at||'').startsWith(mo)).reduce((a,s)=>a+s.amount,0))}</div>Recettes du mois</div><div class="card"><div class="price">${act.length}</div>Abonnés actifs</div></div><div class="card"><h3>Répartition par formule</h3>${Object.entries(by).map(([n,c])=>`<p>${n}<div class="bar" style="width:${c/mx*100}%">${c}</div></p>`).join('')||'Aucune donnée'}</div>`}
  if(A.tab=='msg'){const T=new Date(iso(new Date())),rem=act.map(s=>({s,d:Math.round((new Date(s.end_date)-T)/864e5)})).filter(x=>x.d<=3&&x.d>=0);
    h+=`<h3>Relances d'échéance (J-3 / J-1)</h3>${rem.length?`<table>${rem.map(({s,d})=>{const m=`Bonjour ${s.profiles.full_name}, votre abonnement Clean & Services (${s.plans.name}) expire le ${fd(s.end_date)} (J-${d}). Renouvelez-le : dépôt au ${PAY_NUM}. Propreté assurée !`;return `<tr><td>${s.profiles.full_name}</td><td>J-${d}</td><td><a class="btn s l" target="_blank" href="${wa(s.profiles.phone,m)}" onclick="mark('${s.id}',${d})">WhatsApp</a> <a class="btn s" href="${sms(s.profiles.phone,m)}">SMS</a></td></tr>`}).join('')}</table>`:'<p>Aucune relance à envoyer.</p>'}
    <h3>Notifications automatiques</h3><table>${A.notifs.map(n=>`<tr><td>${n.audience}</td><td>${n.message}</td><td>${n.audience=='client'&&n.phone?`<a target="_blank" href="${wa(n.phone,n.message)}" onclick="sent('${n.id}')">WhatsApp</a> | <a href="${sms(n.phone,n.message)}">SMS</a>`:''}${n.sent?' ✔':''}</td></tr>`).join('')}</table>`}
  app.innerHTML=h+'</div>';
}
window.valid=async(id,ok)=>{await api('admin_validate',{id,ok});admin()};
window.mark=(id,d)=>api('admin_mark',{id,d});
window.sent=id=>api('admin_sent',{id});
window.csv=()=>{const r=[['Nom','Téléphone','Quartier','Adresse','Pack','Jours','Statut','Début','Fin'],...CL.map(s=>[s.profiles.full_name,s.profiles.phone,s.profiles.quartier,s.profiles.address,s.plans.name,s.passage_days.join('/'),s.status,s.start_date,s.end_date])];
  const b=new Blob(['\ufeff'+r.map(l=>l.map(c=>`"${c??''}"`).join(';')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='clients.csv';a.click()};
init();
