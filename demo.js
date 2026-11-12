// MODE DÉMO : fonctionne sans serveur (ouverture directe de index.html), données gardées dans le navigateur.
const IS_DEMO=location.protocol==='file:'||window.DEMO===true;
const PL=[['Pack Classique',1,1,3000,'1 passage / semaine (4 passages / mois)'],['Classique Plus',2,2,4000,'2 passages / semaine (8 passages / mois)'],['Classique Full',3,3,5000,'3 passages / semaine (12 passages / mois)'],['Pack Premium',4,2,5000,'2 passages / semaine (8 / mois) + conditionnement des ordures (02 sacs-poubelle à domicile inclus)'],['Pack VIP',5,3,10000,'3 passages / semaine (12 / mois) + conditionnement des ordures (01 bac à ordures de 120L à domicile inclus)']];
const dd=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
function demoSeed(){
  const P=(n,t,q,a)=>({full_name:n,phone:t,quartier:q,address:a});
  const S={session:null,users:[{id:1,email:'admin@demo.cm',password:'demo123',role:'admin'},{id:2,email:'client@demo.cm',password:'demo123',role:'user'},{id:3,email:'a@x',role:'user'},{id:4,email:'b@x',role:'user'},{id:5,email:'c@x',role:'user'},{id:6,email:'d@x',role:'user'}],
  profiles:{1:P('Administrateur','690000000','Akwa',''),2:P('Client Démo','677000002','Bonapriso','Près de la pharmacie'),3:P('Marie Ngo','677111111','Bonamoussadi','Carrefour Shell, maison verte'),4:P('Paul Essomba','699222222','Makepe','Face école maternelle'),5:P('Aïcha Bello','655333333','Akwa','Rue des Palmiers'),6:P('Jean Tchoumi','670444444','Deido','Derrière le marché')},subs:[],notifs:[]};
  const A=(id,u,p,days,s,e,st,ref)=>S.subs.push({id,user_id:u,plan_id:p,amount:PL[p-1][3],passage_days:days,payer_name:S.profiles[u].full_name,payer_phone:S.profiles[u].phone,payment_ref:ref,status:st,start_date:s,end_date:e,created_at:new Date().toISOString(),validated_at:s?s+'T10:00:00':null});
  A(1,3,2,['Lundi','Jeudi'],dd(-10),dd(20),'active','OM240811A');A(2,4,5,['Mardi','Vendredi','Samedi'],dd(-5),dd(25),'active','MOMO88231');A(3,6,3,['Lundi','Mercredi','Samedi'],dd(-28),dd(2),'active','OM240790Z');A(4,5,1,['Mercredi'],null,null,'pending','OM240999K');
  return S;
}
function demoApi(a,d={}){
  let S=JSON.parse(localStorage.getItem('cs_demo')||'null')||demoSeed();
  const plans=PL.map((p,i)=>({id:i+1,name:p[0],position:p[1],passages_per_week:p[2],price:p[3],description:p[4]}));
  const U=S.users.find(u=>u.id===S.session),adm=U?.role==='admin',no={error:'Accès refusé'};
  const sub=s=>({...s,plans:{name:plans[s.plan_id-1].name},profiles:S.profiles[s.user_id]}),id=()=>Date.now();
  const R=(()=>{switch(a){
  case 'me':return {user:U?{id:U.id}:null,admin:!!adm,plans};
  case 'register':{const e=(d.email||'').trim().toLowerCase();if(!e.includes('@'))return {error:'E-mail invalide'};if((d.password||'').length<6)return {error:'Mot de passe : 6 caractères minimum'};if(S.users.some(u=>u.email===e))return {error:'Cet e-mail existe déjà'};const n=id();S.users.push({id:n,email:e,password:d.password,role:'user'});S.profiles[n]={full_name:d.full_name||'',phone:'',quartier:'',address:''};S.session=n;return {ok:1}}
  case 'login':{const u=S.users.find(u=>u.email===(d.email||'').trim().toLowerCase()&&u.password===d.password);if(!u)return {error:'E-mail ou mot de passe incorrect'};S.session=u.id;return {ok:1}}
  case 'logout':S.session=null;return {ok:1};
  }
  if(!U)return no;
  switch(a){
  case 'my':{const l=S.subs.filter(s=>s.user_id===U.id).pop();return {profile:S.profiles[U.id],sub:l?sub(l):null}}
  case 'profile_save':Object.assign(S.profiles[U.id],{full_name:d.full_name,phone:d.phone,quartier:d.quartier,address:d.address});return {ok:1};
  case 'sub_create':{const p=plans[d.plan_id-1];S.subs.push({id:id(),user_id:U.id,plan_id:p.id,amount:p.price,passage_days:d.passage_days,payer_name:d.payer_name,payer_phone:d.payer_phone,payment_ref:d.payment_ref,status:'pending',start_date:null,end_date:null,created_at:new Date().toISOString(),validated_at:null});const f=S.profiles[U.id];S.notifs.push({id:id(),audience:'admin',phone:null,message:`Nouvelle demande : ${f.full_name} (${f.quartier}) - ${p.name} - Réf paiement : ${d.payment_ref}`,sent:0});return {ok:1}}
  }
  if(!adm)return no;
  switch(a){
  case 'admin_data':S.subs.forEach(s=>{if(s.status==='active'&&s.end_date<dd(0))s.status='expired'});return {subs:S.subs.map(sub).reverse(),notifs:[...S.notifs].reverse()};
  case 'admin_validate':{const s=S.subs.find(x=>x.id==d.id);if(d.ok){s.status='active';s.start_date=dd(0);s.end_date=dd(30);s.validated_at=new Date().toISOString();const f=S.profiles[s.user_id];S.notifs.push({id:id(),audience:'client',phone:f.phone,message:`Bonjour ${f.full_name}, votre abonnement Clean & Services est actif du ${s.start_date} au ${s.end_date}. Propreté assurée !`,sent:0})}else s.status='rejected';return {ok:1}}
  case 'admin_mark':return {ok:1};
  case 'admin_sent':{const n=S.notifs.find(x=>x.id==d.id);if(n)n.sent=1;return {ok:1}}
  }return {error:'Action inconnue'}})();
  localStorage.setItem('cs_demo',JSON.stringify(S));return Promise.resolve(R);
}
if(IS_DEMO)document.body.insertAdjacentHTML('beforeend','<div style="position:fixed;bottom:8px;left:8px;right:8px;max-width:520px;background:#ffc400;color:#222;padding:6px 10px;border-radius:10px;font:12px system-ui;z-index:9;box-shadow:0 2px 8px #0003">MODE DÉMO · admin@demo.cm / client@demo.cm · mot de passe : demo123 · <a href="#" onclick="localStorage.removeItem(\'cs_demo\');location.reload()">réinitialiser</a></div>');
