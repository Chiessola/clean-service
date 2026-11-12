// ⚙️ CONFIG : remplacez par les valeurs de Supabase > Project Settings > API
const SUPABASE_URL='https://VOTRE-PROJET.supabase.co', SUPABASE_KEY='VOTRE_CLE_ANON';
const PAY_NUM='692 636 419', sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s), app=$('#app'), JOURS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const fc=n=>Number(n||0).toLocaleString('fr-FR')+' FCFA', fd=d=>d?new Date(d).toLocaleDateString('fr-FR'):'-';
const wa=(ph,msg)=>`https://wa.me/237${String(ph||'').replace(/\D/g,'').slice(-9)}?text=${encodeURIComponent(msg)}`;
const sms=(ph,msg)=>`sms:+237${String(ph||'').replace(/\D/g,'').slice(-9)}?body=${encodeURIComponent(msg)}`;
const iso=d=>d.toISOString().slice(0,10); let user=null,isAdm=false,plans=[],st={step:1,plan:null,days:[]};

async function init(){
  const {data:{session}}=await sb.auth.getSession(); user=session?.user||null; isAdm=false;
  if(user){const {data}=await sb.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin');isAdm=!!data?.length}
  plans=(await sb.from('plans').select('*').order('position')).data||[];
  $('#nav').innerHTML=`<a class="btn s l" href="#/">Accueil</a>`+(user?`<a class="btn s" href="#/espace">Mon espace</a>`+(isAdm?`<a class="btn s" href="#/admin">Admin</a>`:'')+`<button class="btn s g" onclick="sb.auth.signOut().then(()=>{location.hash='#/';init()})">Déconnexion</button>`:`<a class="btn s" href="#/auth">Connexion / Inscription</a>`);
  route();
}
window.onhashchange=route;
function route(){const r=location.hash.slice(2)||'';({'':home,auth,espace,admin})[r]?.()||0; scrollTo(0,0)}

function planCard(p,btn){return `<div class="card" id="pl${p.id}"><span class="badge">N°${p.position}</span><h3>${p.name}</h3><div class="price">${fc(p.price)}<small>/mois</small></div><p>${p.description}</p>${btn||''}</div>`}
function home(){
  app.innerHTML=`<section class="hero"><img src="logo.jpeg" height="120" style="border-radius:14px;background:#fff"><h1>Clean & Services : <em>Propreté assurée !</em></h1>
  <p>Collecte d'ordures ménagères à domicile : propreté garantie, zéro encombrement, ponctualité.</p><a class="btn" href="#/espace">Je m'abonne</a></section>
  <div class="grid"><div class="card"><h3>✨ Propreté garantie</h3>Votre quartier reste net toute l'année.</div><div class="card"><h3>🏠 Zéro encombrement</h3>On vient chez vous, aux jours choisis.</div><div class="card"><h3>⏰ Ponctualité</h3>Un planning fixe et un suivi de votre abonnement.</div></div>
  <h2>Nos formules mensuelles</h2><div class="grid">${plans.map(p=>planCard(p,`<button class="btn" onclick="choose(${p.id})">Choisir ce pack</button>`)).join('')}</div>
  <h2>Quartiers desservis</h2><p>${['Akwa','Bonapriso','Bonamoussadi','Makepe','Deido','Logpom'].map(q=>`<span class="badge">${q}</span>`).join(' ')} <small>(exemples : à adapter)</small></p>
  <h2>Ils nous font confiance</h2><div class="grid"><div class="card">« Service ponctuel, mon quartier est enfin propre ! » <b>– Client (exemple)</b></div><div class="card">« Le Pack VIP avec le bac 120L est top. » <b>– Client (exemple)</b></div></div>
  <p style="text-align:center"><a class="btn g" href="#/auth">Connexion / Inscription</a></p>`}
window.choose=id=>{st.plan=id;location.hash='#/espace'};

function auth(){
  app.innerHTML=`<div class="card" style="max-width:420px;margin:auto"><h2>Connexion / Inscription</h2><label>Nom complet (inscription)</label><input id="fn"><label>E-mail</label><input id="em" type="email"><label>Mot de passe</label><input id="pw" type="password">
  <button class="btn g" id="li">Se connecter</button> <button class="btn" id="su">Créer un compte</button><p><button class="btn l" id="go">Continuer avec Google</button></p><p id="msg" class="warn" hidden></p></div>`;
  const m=t=>{$('#msg').hidden=false;$('#msg').textContent=t};
  $('#li').onclick=async()=>{const{error}=await sb.auth.signInWithPassword({email:$('#em').value,password:$('#pw').value});error?m(error.message):(location.hash='#/espace',init())};
  $('#su').onclick=async()=>{const{data,error}=await sb.auth.signUp({email:$('#em').value,password:$('#pw').value,options:{data:{full_name:$('#fn').value}}});error?m(error.message):data.session?(location.hash='#/espace',init()):m('Compte créé : vérifiez votre e-mail pour confirmer.')};
  $('#go').onclick=()=>sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href.split('#')[0]+'#/espace'}});
}

async function espace(){
  if(!user)return location.hash='#/auth';
  const [{data:pr},{data:subs}]=await Promise.all([sb.from('profiles').select('*').eq('id',user.id).single(),sb.from('subscriptions').select('*,plans(*)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1)]);
  const sub=subs?.[0];
  if(sub&&['pending','active'].includes(sub.status)){ // Étape 4 : tableau de bord
    app.innerHTML=`<div class="card"><h2>Mon abonnement</h2><p><b>${sub.plans.name}</b> – ${fc(sub.amount)}</p><p>État : ${sub.status==='pending'?'<span class="badge">⏳ En attente de validation</span>':'<span class="badge" style="background:var(--l)">✅ Actif</span>'}</p>
    ${sub.status==='active'?`<p>Du <b>${fd(sub.start_date)}</b> au <b>${fd(sub.end_date)}</b></p>`:'<p>Nous vérifions votre paiement.</p>'}<p>Jours de passage : <b>${sub.passage_days.join(', ')}</b></p></div>`;return}
  const msg=sub?.status==='rejected'?'<p class="warn">Votre dernière demande a été rejetée. Vous pouvez refaire une demande.</p>':sub?.status==='expired'?'<p class="warn">Votre abonnement a expiré : renouvelez-le.</p>':'';
  const steps=()=>`<div class="steps">${['Coordonnées','Formule & jours','Paiement'].map((s,i)=>`<span class="${st.step==i+1?'on':''}">${i+1}. ${s}</span>`).join('')}</div>`;
  const draw=()=>{
    if(st.step==1)app.innerHTML=msg+steps()+`<div class="card"><label>Nom complet</label><input id="a" value="${pr.full_name||''}"><label>Téléphone</label><input id="b" value="${pr.phone||''}"><label>Quartier</label><input id="c" value="${pr.quartier||''}"><label>Repère / adresse exacte</label><textarea id="d">${pr.address||''}</textarea><button class="btn" id="nx">Continuer</button></div>`,
    $('#nx').onclick=async()=>{const v={full_name:$('#a').value,phone:$('#b').value,quartier:$('#c').value,address:$('#d').value};if(Object.values(v).some(x=>!x.trim()))return alert('Remplissez tous les champs');Object.assign(pr,v);await sb.from('profiles').update(v).eq('id',user.id);st.step=2;draw()};
    if(st.step==2){const p=plans.find(x=>x.id==st.plan);app.innerHTML=steps()+`<div class="grid">${plans.map(x=>planCard(x,`<button class="btn s" onclick="st.plan=${x.id};st.days=[];draw2()">Choisir</button>`)).join('')}</div>${p?`<div class="card"><h3>Jours de passage : ${p.passages_per_week} jour(s)</h3><div class="days">${JOURS.map(j=>`<label class="${st.days.includes(j)?'sel':''}"><input type="checkbox" value="${j}" ${st.days.includes(j)?'checked':''}><span>${j}</span></label>`).join('')}</div><br><button class="btn" id="nx">Continuer</button></div>`:''}`;
      if(p){$('#pl'+p.id).classList.add('sel-plan');document.querySelectorAll('.days input').forEach(i=>i.onchange=()=>{if(i.checked){if(st.days.length>=p.passages_per_week){i.checked=false;return alert('Maximum '+p.passages_per_week+' jour(s) pour ce pack')}st.days.push(i.value)}else st.days=st.days.filter(d=>d!=i.value);i.parentNode.classList.toggle('sel',i.checked)});
      $('#nx').onclick=()=>st.days.length==p.passages_per_week?(st.step=3,draw()):alert('Choisissez exactement '+p.passages_per_week+' jour(s)')}}
    if(st.step==3){const p=plans.find(x=>x.id==st.plan);app.innerHTML=steps()+`<div class="card"><h3>Paiement par dépôt mobile : ${fc(p.price)}</h3><div class="warn">Faites un dépôt <b>Orange Money</b> ou <b>MTN MoMo</b> au <b>${PAY_NUM}</b> (au nom de Clean & Services), puis confirmez ci-dessous.</div><br><label>Nom de l'expéditeur</label><input id="a"><label>Numéro ayant payé</label><input id="b"><label>Référence / ID de transaction</label><input id="c"><button class="btn g" id="bk">Retour</button> <button class="btn" id="ok">Envoyer ma demande</button></div>`;
      $('#bk').onclick=()=>{st.step=2;draw()};$('#ok').onclick=async()=>{if(!$('#a').value||!$('#b').value||!$('#c').value)return alert('Remplissez tous les champs');const{error}=await sb.from('subscriptions').insert({user_id:user.id,plan_id:p.id,amount:p.price,passage_days:st.days,payer_name:$('#a').value,payer_phone:$('#b').value,payment_ref:$('#c').value});error?alert(error.message):(st={step:1,plan:null,days:[]},espace())}}
  };window.draw2=draw;window.st=st;draw();
}

let A={subs:[],notifs:[],tab:'val',day:JOURS[(new Date().getDay()+6)%7]};
async function admin(){
  if(!isAdm)return app.innerHTML='<p class="warn">Accès réservé aux administrateurs.</p>';
  [A.subs,A.notifs]=await Promise.all([sb.from('subscriptions').select('*,plans(name),profiles(*)').order('created_at',{ascending:false}).then(r=>r.data||[]),sb.from('notifications').select('*').order('created_at',{ascending:false}).then(r=>r.data||[])]);
  // expiration automatique
  const today=iso(new Date());for(const s of A.subs)if(s.status==='active'&&s.end_date<today){s.status='expired';sb.from('subscriptions').update({status:'expired'}).eq('id',s.id)}
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
window.valid=async(id,ok)=>{const n=new Date(),e=new Date(n.getTime()+30*864e5);await sb.from('subscriptions').update(ok?{status:'active',start_date:iso(n),end_date:iso(e),validated_at:n.toISOString()}:{status:'rejected'}).eq('id',id);admin()};
window.mark=(id,d)=>sb.from('subscriptions').update(d<=1?{reminded_1d:true}:{reminded_3d:true}).eq('id',id);
window.sent=id=>sb.from('notifications').update({sent:true}).eq('id',id);
window.csv=()=>{const r=[['Nom','Téléphone','Quartier','Adresse','Pack','Jours','Statut','Début','Fin'],...CL.map(s=>[s.profiles.full_name,s.profiles.phone,s.profiles.quartier,s.profiles.address,s.plans.name,s.passage_days.join('/'),s.status,s.start_date,s.end_date])];
  const b=new Blob(['\ufeff'+r.map(l=>l.map(c=>`"${c??''}"`).join(';')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='clients.csv';a.click()};
init();
