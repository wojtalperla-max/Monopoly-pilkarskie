/* ===== Most platforma <-> gry w iframe ===== */
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


/* ===== Wspólny most dla gier wydzielonych do gry/<nazwa>/<nazwa>.html =====
   Gry (Zgadywanie literek, Łamanie kodu, Czółko, Kim jestem?, Państwa Miasta, Statki, UNO, Monopoly)
   czytają konto, bazę Firebase i statystyki przez window.parent.PLATFORM_BRIDGE. */
window.PLATFORM_BRIDGE={
  get ACC(){return ACC},
  get fbDB(){return fbDB},
  get fbAuth(){return fbAuth},
  get firebase(){return firebase},
  get onlinePlayerId(){return onlinePlayerId},
  get ISL(){return ISL},
  onlineEnsureAuth:()=>onlineEnsureAuth(),
  statsRecord:(...a)=>statsRecord(...a),
  serverMarkRoomFinished:r=>serverMarkRoomFinished(r),
  serverReopenRoom:r=>serverReopenRoom(r),
  lbMeta:(...a)=>lbMeta(...a),
  lbRecord:(...a)=>lbRecord(...a)
};
/* otwórz grę: pokaż kontener; przy pierwszym razie załaduj ramkę (ona sama woła __show), potem tylko __show */
function __gameOpen(id,frameId,src){
  __gameShow(id);
  const f=document.getElementById(frameId);
  if(!f.dataset.loaded){f.src=src;f.dataset.loaded='1'}else __gameCall(frameId,'__show');
}
/* dołączenie do pokoju z katalogu SERWERY: otwiera grę i woła __joinFromHub(kod) w ramce */
function __gameJoin(openFn,frameId,code){
  return new Promise(res=>{
    openFn();
    const f=document.getElementById(frameId);
    const ready=()=>{try{return f.contentDocument&&f.contentDocument.readyState==='complete'&&!!f.contentWindow.__joinFromHub}catch(e){return false}};
    const go=async()=>{try{await f.contentWindow.__joinFromHub(code)}catch(e){alert('Nie udało się dołączyć: '+(e.message||e))}res()};
    if(ready())go();else f.addEventListener('load',()=>setTimeout(go,60),{once:true});
  });
}
const __GAME_FRAMES_NICK=['lgFrame','kodFrame','czFrame','monoFrame'],__GAME_FRAMES_ROOM=['lgFrame','czFrame','monoFrame'];
function __gamesSetNick(n){__GAME_FRAMES_NICK.forEach(id=>{try{const f=document.getElementById(id);if(f&&f.contentWindow&&f.contentWindow.__setNick)f.contentWindow.__setNick(n)}catch(e){}})}
function __gamesSetCol(c){__GAME_FRAMES_NICK.forEach(id=>{try{const f=document.getElementById(id);if(f&&f.contentWindow&&f.contentWindow.__setCol)f.contentWindow.__setCol(c)}catch(e){}})}
function __gamesInRoom(){return __GAME_FRAMES_ROOM.some(id=>{try{const f=document.getElementById(id);return !!(f&&f.contentWindow&&f.contentWindow.__inRoom&&f.contentWindow.__inRoom())}catch(e){return false}})}

/* --- Zgadywanie literek (gry/zgadywanie-literek/zgadywanie-literek.html) --- */
function lgOpen(){__gameOpen('lg','lgFrame','gry/zgadywanie-literek/zgadywanie-literek.html')}
function lgExit(){__gameCall('lgFrame','__leave');__gameHide('lg')}

/* --- Łamanie kodu (gry/lamanie-kodu/lamanie-kodu.html) --- */
function kodOpen(){__gameOpen('kod','kodFrame','gry/lamanie-kodu/lamanie-kodu.html')}
function kodExit(){__gameCall('kodFrame','__leave');__gameHide('kod')}

/* --- Czółko (gry/czolko/czolko.html) --- */
function czOpen(){__gameOpen('cz','czFrame','gry/czolko/czolko.html')}
function czExit(){__gameCall('czFrame','__leave');__gameHide('cz')}

/* --- Kim jestem? (gry/kim-jestem/kim-jestem.html) --- */
function kjOpen(){__gameOpen('kj','kjFrame','gry/kim-jestem/kim-jestem.html')}
function kjExit(){__gameCall('kjFrame','__leave');__gameHide('kj')}

/* --- Państwa Miasta (gry/panstwa-miasta/panstwa-miasta.html) --- */
function pmOpen(){__gameOpen('pm','pmFrame','gry/panstwa-miasta/panstwa-miasta.html')}
function pmExit(){__gameCall('pmFrame','__leave');__gameHide('pm')}

/* --- Statki (gry/statki/statki.html) --- */
function stkOpen(){__gameOpen('stk','stkFrame','gry/statki/statki.html')}
function stkExit(){__gameCall('stkFrame','__leave');__gameHide('stk')}

/* --- UNO (gry/uno/uno.html) --- */
function unoOpen(){__gameOpen('uno','unoFrame','gry/uno/uno.html')}
function unoExit(){__gameCall('unoFrame','__leave');__gameHide('uno')}

/* --- Monopoly piłkarskie (gry/monopoly/monopoly.html) --- */
function monoOpen(){__gameOpen('mono','monoFrame','gry/monopoly/monopoly.html')}
function monoExit(){
  const f=document.getElementById('monoFrame');
  try{if(f.contentWindow&&typeof f.contentWindow.__leave==='function')f.contentWindow.__leave()}catch(e){}
  f.src='about:blank';delete f.dataset.loaded;
  __gameHide('mono');
}
