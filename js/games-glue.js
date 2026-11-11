/* ===== Most platforma <-> gry w iframe: Imperia, Prawdziwe życie, Kółko i krzyżyk, Kulki ===== */
function __gameShow(id){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById(id).hidden=false}
function __gameHide(id){document.getElementById(id).hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
function __gameLoad(frameId,src){const f=document.getElementById(frameId);if(!f.dataset.loaded){f.src=src;f.dataset.loaded='1'}return f}
function __gameCall(frameId,fn){try{const f=document.getElementById(frameId);if(f&&f.contentWindow&&f.contentWindow[fn])f.contentWindow[fn]()}catch(e){}}
function __gameNick(){return(typeof ACC!=='undefined'&&ACC.nick)||''}
function __gameCol(){return(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:'')}
function __gameClean(s){return String(s).toLowerCase().replace(/[^a-z0-9]/g,'')}

/* --- Imperia + Prawdziwe życie (multiplayer używa IMP_BRIDGE) --- */
window.IMP_BRIDGE={
  acc:()=>({nick:__gameNick(),col:__gameCol(),logged:!!(typeof ACC!=='undefined'&&ACC.user)}),
  db:()=>(typeof fbDB!=='undefined'?fbDB:null),
  ensureAuth:()=>onlineEnsureAuth(),
  fb:()=>firebase
};
function impOpen(){__gameShow('imp');__gameLoad('impFrame','gry/imperia/imperia.html')}
function impExit(){__gameCall('impFrame','__impCleanup');__gameHide('imp')}

function rlOpen(){__gameShow('rl');__gameLoad('rlFrame','gry/prawdziwe-zycie/prawdziwe-zycie.html')}
function rlExit(){
  const f=document.getElementById('rlFrame');
  if(f){f.removeAttribute('src');f.src='about:blank';delete f.dataset.loaded} /* zatrzymaj pętlę 3D */
  __gameHide('rl');
}

/* --- Kółko i krzyżyk --- */
function tttBridge(){return{
  db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,
  net:()=>!!(fbDB&&fbAuth),nick:__gameNick,col:__gameCol,
  stats:function(code,S,ms){
    if(!code||!S||!S.X||!S.O||!S.win||!ms)return;
    const r=S.win==='D'?'d':(S.win===ms?'w':'l');
    statsRecord('ttt_'+__gameClean(code)+'_'+(S.rd||0)+'_'+__gameClean(S.X).slice(0,8)+__gameClean(S.O).slice(0,8),'ttt',r,
      [{uid:S.X,name:S.nX||'Gracz'},{uid:S.O,name:S.nO||'Gracz'}]);
  }
}}
function tttOpen(){__gameShow('ttt');const f=__gameLoad('tttFrame','gry/kolko-krzyzyk/kolko-krzyzyk.html')}
function tttExit(){__gameCall('tttFrame','__tttLeave');__gameHide('ttt')}

/* --- Kulki --- */
function kulkiBridge(){return{
  db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,
  net:()=>!!(fbDB&&fbAuth),nick:__gameNick,col:__gameCol,
  stats:function(code,gid,players,r){
    if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
    statsRecord('kulki_'+__gameClean(code)+'_'+__gameClean(gid),'kulki',r,players);
  }
}}
function kulkiOpen(){__gameShow('kul');__gameLoad('kulFrame','gry/kulki/kulki.html')}
function kulkiExit(){__gameCall('kulFrame','__kulkiLeave');__gameHide('kul')}
