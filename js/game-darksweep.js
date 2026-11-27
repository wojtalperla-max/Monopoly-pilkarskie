/* ===== DARK SWEEP (strzelanka w iframe: pokoje online przez Firebase, nick i kolor z konta, statystyki meczów) ===== */
function darksweepOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('darksweep').hidden=false;const f=document.getElementById('darksweepFrame');if(!f.dataset.loaded){const room=new URLSearchParams(location.search).get('darksweepRoom');f.src='gry/darksweep/darksweep.html'+(room?'?room='+encodeURIComponent(room):'');f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__darksweepRefresh)f.contentWindow.__darksweepRefresh()}catch(e){}}}
function darksweepBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:darksweepStats}}
function darksweepStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('darksweep_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'darksweep',r,players);
}
function darksweepExit(){try{const f=document.getElementById('darksweepFrame');if(f&&f.contentWindow&&f.contentWindow.__darksweepLeave)f.contentWindow.__darksweepLeave()}catch(e){}document.getElementById('darksweep').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}

// Zaproszenia Dark Sweep otwierają grę przez platformę z kontem Firebase.
window.addEventListener("load",()=>{if(/^[A-Z0-9]{5}$/i.test(new URLSearchParams(location.search).get("darksweepRoom")||""))darksweepOpen();});
