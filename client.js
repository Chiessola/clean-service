async function init(){
  const me=await api('me'); user=me.user; isAdm=me.admin; plans=me.plans||[];
  $('#nav').innerHTML=`<a class="btn s l" href="#/">Accueil</a>`+(user?`<a class="btn s" href="#/espace">Mon espace</a>`+`<button class="btn s g" onclick="api('logout').then(()=>{location.hash='#/';init()})">Déconnexion</button>`:`<a class="btn s" href="#/auth">Connexion / Inscription</a>`);
  route();
}
window.onhashchange=route;
function route(){const r=location.hash.slice(2)||'';({'':home,auth,espace})[r]?.()||0; scrollTo(0,0)}

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
  <button class="btn g" id="li">Se connecter</button> <button class="btn" id="su">Créer un compte</button><p id="msg" class="warn" hidden></p></div>`;
  const m=t=>{$('#msg').hidden=false;$('#msg').textContent=t};
  const go=async a=>{const r=await api(a,{full_name:$('#fn').value,email:$('#em').value,password:$('#pw').value});r.error?m(r.error):(location.hash='#/espace',init())};
  $('#li').onclick=()=>go('login');$('#su').onclick=()=>go('register');
}

async function espace(){
  if(!user)return location.hash='#/auth';
  const {profile:pr,sub}=await api('my');
  if(sub&&['pending','active'].includes(sub.status)){ // Étape 4 : tableau de bord
    app.innerHTML=`<div class="card"><h2>Mon abonnement</h2><p><b>${sub.plans.name}</b> – ${fc(sub.amount)}</p><p>État : ${sub.status==='pending'?'<span class="badge">⏳ En attente de validation</span>':'<span class="badge" style="background:var(--l)">✅ Actif</span>'}</p>
    ${sub.status==='active'?`<p>Du <b>${fd(sub.start_date)}</b> au <b>${fd(sub.end_date)}</b></p>`:'<p>Nous vérifions votre paiement.</p>'}<p>Jours de passage : <b>${sub.passage_days.join(', ')}</b></p></div>`;return}
  const msg=sub?.status==='rejected'?'<p class="warn">Votre dernière demande a été rejetée. Vous pouvez refaire une demande.</p>':sub?.status==='expired'?'<p class="warn">Votre abonnement a expiré : renouvelez-le.</p>':'';
  const steps=()=>`<div class="steps">${['Coordonnées','Formule & jours','Paiement'].map((s,i)=>`<span class="${st.step==i+1?'on':''}">${i+1}. ${s}</span>`).join('')}</div>`;
  const draw=()=>{
    if(st.step==1)app.innerHTML=msg+steps()+`<div class="card"><label>Nom complet</label><input id="a" value="${pr.full_name||''}"><label>Téléphone</label><input id="b" value="${pr.phone||''}"><label>Quartier</label><input id="c" value="${pr.quartier||''}"><label>Repère / adresse exacte</label><textarea id="d">${pr.address||''}</textarea><button class="btn" id="nx">Continuer</button></div>`,
    $('#nx').onclick=async()=>{const v={full_name:$('#a').value,phone:$('#b').value,quartier:$('#c').value,address:$('#d').value};if(Object.values(v).some(x=>!x.trim()))return alert('Remplissez tous les champs');Object.assign(pr,v);await api('profile_save',v);st.step=2;draw()};
    if(st.step==2){const p=plans.find(x=>x.id==st.plan);app.innerHTML=steps()+`<div class="grid">${plans.map(x=>planCard(x,`<button class="btn s" onclick="st.plan=${x.id};st.days=[];draw2()">Choisir</button>`)).join('')}</div>${p?`<div class="card"><h3>Jours de passage : ${p.passages_per_week} jour(s)</h3><div class="days">${JOURS.map(j=>`<label class="${st.days.includes(j)?'sel':''}"><input type="checkbox" value="${j}" ${st.days.includes(j)?'checked':''}><span>${j}</span></label>`).join('')}</div><br><button class="btn" id="nx">Continuer</button></div>`:''}`;
      if(p){$('#pl'+p.id).classList.add('sel-plan');document.querySelectorAll('.days input').forEach(i=>i.onchange=()=>{if(i.checked){if(st.days.length>=p.passages_per_week){i.checked=false;return alert('Maximum '+p.passages_per_week+' jour(s) pour ce pack')}st.days.push(i.value)}else st.days=st.days.filter(d=>d!=i.value);i.parentNode.classList.toggle('sel',i.checked)});
      $('#nx').onclick=()=>st.days.length==p.passages_per_week?(st.step=3,draw()):alert('Choisissez exactement '+p.passages_per_week+' jour(s)')}}
    if(st.step==3){const p=plans.find(x=>x.id==st.plan);app.innerHTML=steps()+`<div class="card"><h3>Paiement par dépôt mobile : ${fc(p.price)}</h3><div class="warn">Faites un dépôt <b>Orange Money</b> ou <b>MTN MoMo</b> au <b>${PAY_NUM}</b> (au nom de Clean & Services), puis confirmez ci-dessous.</div><br><label>Nom de l'expéditeur</label><input id="a"><label>Numéro ayant payé</label><input id="b"><label>Référence / ID de transaction</label><input id="c"><button class="btn g" id="bk">Retour</button> <button class="btn" id="ok">Envoyer ma demande</button></div>`;
      $('#bk').onclick=()=>{st.step=2;draw()};$('#ok').onclick=async()=>{if(!$('#a').value||!$('#b').value||!$('#c').value)return alert('Remplissez tous les champs');const r=await api('sub_create',{plan_id:p.id,passage_days:st.days,payer_name:$('#a').value,payer_phone:$('#b').value,payment_ref:$('#c').value});r.error?alert(r.error):(st={step:1,plan:null,days:[]},espace())}}
  };window.draw2=draw;window.st=st;draw();
}

init();
