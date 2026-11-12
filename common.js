const PAY_NUM='692 636 419';
const api=(a,d)=>IS_DEMO?demoApi(a,d):fetch('api.php?a='+a,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(d||{})}).then(r=>r.json()).catch(()=>{if(!window._w){window._w=1;document.body.insertAdjacentHTML('afterbegin','<div class="warn" style="margin:8px">⚠️ Serveur non joignable : api.php ou la base MySQL ne sont pas installés/configurés.</div>')}return {error:'Serveur non joignable',plans:[]}});
const $=s=>document.querySelector(s), app=$('#app'), JOURS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const fc=n=>Number(n||0).toLocaleString('fr-FR')+' FCFA', fd=d=>d?new Date(d).toLocaleDateString('fr-FR'):'-';
const wa=(ph,msg)=>`https://wa.me/237${String(ph||'').replace(/\D/g,'').slice(-9)}?text=${encodeURIComponent(msg)}`;
const sms=(ph,msg)=>`sms:+237${String(ph||'').replace(/\D/g,'').slice(-9)}?body=${encodeURIComponent(msg)}`;
const iso=d=>d.toISOString().slice(0,10); let user=null,isAdm=false,plans=[],st={step:1,plan:null,days:[]};

