
const firebaseConfig = {
    apiKey: "AIzaSyDoxjubnixDIV-ZU2HWhFrAPnE9azfy688",
    authDomain: "football-monopoly-online.firebaseapp.com",
    databaseURL: "https://football-monopoly-online-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "football-monopoly-online",
    storageBucket: "football-monopoly-online.firebasestorage.app",
    messagingSenderId: "831395216434",
    appId: "1:831395216434:web:bd66ccdb92d8fbeb52502b",
    measurementId: "G-76PR5FW94Y"
  };

/* [wydzielone → gry/<nazwa>/<nazwa>.html] wspólne pomocniki platformy (używane też przez konta, statystyki, ranking): */
const LG_COLS=['#e63946','#2a9df4','#f2c230','#3a9b62','#b04fe0','#ff8c42'];
const lgEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function lgDot(c){return `<i class="lgd" style="background:${/^#[0-9a-f]{6}$/i.test(c)?c:'#888'}"></i>`}
/* ===== ISLA PETIT (osadzona gra w ramce + pokoje online) ===== */
let ISL={ref:null,listener:null,code:'',host:null,room:null,players:[],round:0,drawSeq:0,localDrawPending:false,ready:false,pendingSeed:null,state:null,sendT:null,claimSent:{},msg:'',nick:'',col:'#2a9df4',joinCode:'',board:'isla-petit'};
const islaFrame=()=>document.getElementById('islaFrame');
const islaNet=()=>typeof fbDB!=='undefined'&&!!fbDB&&typeof onlineEnsureAuth==='function';
function islaPost(o){const f=islaFrame();if(f&&f.contentWindow){try{f.contentWindow.postMessage(Object.assign({islaCmd:1},o),'*')}catch(e){}}}
function islaOpen(){
  const h=document.getElementById('hub');if(h)h.style.display='none';
  document.getElementById('isla').hidden=false;
  const f=islaFrame();
  if(!f.dataset.loaded){
    f.src='gry/tukan/tukan.html';f.dataset.loaded='1';
  }
  islaRender();
}
function islaExit(){islaLeave();document.getElementById('isla').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
window.addEventListener('message',e=>{
  const f=islaFrame();if(!f||e.source!==f.contentWindow)return;
  const d=e.data;if(!d||!d.isla)return;
  if(d.type==='ready'){ISL.ready=true;islaSync()}
  else if(d.type==='lobby'){if(islaNet())islaLobby()}
  else if(d.type==='state'){ISL.state=d.s;islaSendScore();lbIsla(d.s)}
  else if(d.type==='draw'&&ISL.ref&&ISL.host===onlinePlayerId){
    ISL.localDrawPending=true;
    ISL.ref.child('game/drawSeq').transaction(v=>(Number(v)||0)+1).catch(e=>{ISL.localDrawPending=false;ISL.msg='Nie udało się rozdać kart: '+e.message;islaRender()});
  }
});
function islaReadyInfo(){
  const sc=islaScores(),ready=ISL.players.filter(p=>{const s=sc[p.id];return s&&s.round===ISL.round&&s.ready;});
  const waiting=ISL.players.filter(p=>!ready.some(q=>q.id===p.id));
  const allOver=ISL.players.length>0&&ISL.players.every(p=>{const s=sc[p.id];return s&&s.round===ISL.round&&s.over;});
  return {ready,waiting,canDraw:!allOver&&(ISL.drawSeq===0||(ISL.players.length>0&&waiting.length===0))};
}
function islaLockMsg(){
  const x=islaReadyInfo();
  if(!ISL.round)return 'Pokój '+ISL.code+': host rozpocznie partię.';
  if(x.waiting.length)return 'Czekamy jeszcze na: '+x.waiting.map(p=>p.name).join(', ')+'.';
  return 'Wszyscy gotowi! Host może wylosować następną parę kart.';
}
function islaSync(){
  if(!ISL.ref)return;
  const x=islaReadyInfo();
  islaPost({cmd:'lock',label:islaLockMsg(),host:ISL.host===onlinePlayerId,canDraw:x.canDraw});
  islaPost({cmd:'claims',claims:(ISL.room&&ISL.room.cardClaims)||{}});
  if(ISL.pendingSeed){islaPost({cmd:'start',seed:ISL.pendingSeed});ISL.pendingSeed=null}
}
function islaRegisterClaims(){
  if(!ISL.ref||!ISL.state||!ISL.round||!Array.isArray(ISL.state.claims))return;
  ISL.state.claims.forEach(L=>{
    const turn=Number((ISL.state.cm||{})[L])||Number(ISL.state.move)||1;
    if(!/^[A-E X]$/.test(L)||ISL.claimSent[L])return;
    ISL.claimSent[L]=true;
    const ref=ISL.ref.child('cardClaims/'+L);
    ref.transaction(cur=>{
      if(!cur)return {turn,players:{[onlinePlayerId]:true}};
      const ct=Number(cur.turn)||1;
      if(ct!==turn)return;
      cur.players=cur.players||{};cur.players[onlinePlayerId]=true;return cur;
    }).catch(()=>{delete ISL.claimSent[L]});
  });
}
function islaSendScore(){
  if(!ISL.ref||!ISL.state||!ISL.round)return;
  islaRegisterClaims();
  clearTimeout(ISL.sendT);
  ISL.sendT=setTimeout(()=>{
    if(!ISL.ref)return;
    ISL.ref.child('scores/'+onlinePlayerId).set(JSON.stringify(Object.assign({round:ISL.round},ISL.state))).catch(()=>{});
  },250);
}
const islaClean=s=>String(s||'').replace(/[<>&]/g,'').trim().slice(0,14);
async function islaCreate(){
  try{
    const uid=await onlineEnsureAuth(),code=onlineCode(),nick=islaClean(ISL.nick)||'Gracz';
    const ref=fbDB.ref('islaRooms/'+code);
    await ref.set({host:uid,status:'lobby',board:ISL.board||'isla-petit',createdAt:firebase.database.ServerValue.TIMESTAMP,players:{[uid]:{id:uid,name:nick,color:ISL.col||'#2a9df4',order:0}}});
    islaAttach(ref,code);
  }catch(e){ISL.msg='Nie udało się utworzyć pokoju: '+e.message;islaLobby()}
}
async function islaJoin(){
  try{
    const uid=await onlineEnsureAuth(),code=String(ISL.joinCode||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
    if(code.length!==5)throw new Error('Wpisz pięcioznakowy kod pokoju.');
    const ref=fbDB.ref('islaRooms/'+code),room=(await ref.once('value')).val();
    if(!room)throw new Error('Nie znaleziono pokoju o takim kodzie.');
    ISL.board=room.board||'isla-petit';
    const players=Object.values(room.players||{});
    if(!(room.players&&room.players[uid])){
      if(players.length>=6)throw new Error('Pokój jest pełny (maksymalnie 6 osób).');
      await ref.child('players/'+uid).set({id:uid,name:islaClean(ISL.nick)||'Gracz',color:ISL.col||'#2a9df4',order:Math.max(-1,...players.map(p=>Number(p.order)||0))+1});
    }
    islaAttach(ref,code);
  }catch(e){ISL.msg='Nie udało się dołączyć: '+e.message;islaLobby()}
}
function islaDetach(){try{if(ISL.ref&&ISL.listener)ISL.ref.off('value',ISL.listener)}catch(e){}ISL.ref=null;ISL.listener=null}
function islaAttach(ref,code){
  islaDetach();ISL.ref=ref;ISL.code=code;ISL.round=0;ISL.msg='';ISL.pendingSeed=null;
  ISL.listener=ref.on('value',snap=>islaOnRoom(snap.val()),err=>{ISL.msg='Błąd połączenia: '+err.message;islaLobby()});
  islaPost({cmd:'lock',label:islaLockMsg()});
  islaRender();islaLobby();
}
function islaOnRoom(room){
  if(!room){ISL.msg='Pokój został usunięty.';islaLeave(true);return}
  ISL.room=room;ISL.host=room.host;
  ISL.players=Object.values(room.players||{}).sort((a,b)=>(a.order||0)-(b.order||0));
  const g=room.game;
  if(g&&Number(g.round)>ISL.round){
    ISL.round=Number(g.round);ISL.drawSeq=Number(g.drawSeq)||0;ISL.localDrawPending=false;ISL.state=null;ISL.claimSent={};
    if(ISL.ready)islaPost({cmd:'start',seed:g.seed});else ISL.pendingSeed=g.seed;
    islaCloseLobby();
  }else if(g&&Number(g.drawSeq||0)>ISL.drawSeq){
    ISL.drawSeq=Number(g.drawSeq)||0;
    if(ISL.localDrawPending)ISL.localDrawPending=false;
    else if(ISL.ready)islaPost({cmd:'draw'});
  }
  islaSync();islaRender();islaLobbyRefresh();
}
function islaHostStart(){
  if(!ISL.ref||ISL.host!==onlinePlayerId||ISL.players.length<1)return;
  const seed=Math.random().toString(36).slice(2,8).toUpperCase(),r=ISL.ref,rd=((ISL.room&&ISL.room.game&&Number(ISL.room.game.round))||0)+1;
  r.child('scores').remove().then(()=>r.child('cardClaims').remove()).then(()=>r.child('game').set({seed,round:rd,drawSeq:0})).then(()=>r.child('status').set('play')).catch(e=>{ISL.msg='Nie udało się rozpocząć: '+e.message;islaLobby()});
}
function islaLeave(silent){
  try{if(!silent&&ISL.ref&&onlinePlayerId){ISL.ref.child('players/'+onlinePlayerId).remove();ISL.ref.child('scores/'+onlinePlayerId).remove()}}catch(e){}
  islaDetach();ISL.room=null;ISL.players=[];ISL.round=0;ISL.drawSeq=0;ISL.localDrawPending=false;ISL.state=null;ISL.claimSent={};
  islaPost({cmd:'unlock'});islaCloseLobby();islaRender();
}
function islaScores(){const sc={};const raw=(ISL.room&&ISL.room.scores)||{};Object.keys(raw).forEach(k=>{try{sc[k]=JSON.parse(raw[k])}catch(e){}});return sc}
function islaRender(){
  const el=document.getElementById('islaroom');if(!el)return;
  if(!ISL.ref){
    el.innerHTML=`<span>Gra solo</span><button class="lgbtn" onclick="islaLobby()" ${islaNet()?'':'disabled title="Pokoje online wymagają hostingu z Firebase"'}>Pokój online</button>${islaNet()?'':'<span class="lgnote">Pokoje działają po wgraniu gry na własny hosting.</span>'}`;
    return;
  }
  const sc=islaScores(),readyInfo=islaReadyInfo();
  const chips=ISL.players.map(p=>{const s=sc[p.id],ok=s&&s.round===ISL.round;
    return `<span class="isc">${lgDot(p.color)}<b>${lgEsc(p.name)}</b> ${ok?'tura '+s.turn+' · '+s.live+' pkt'+(s.over?' · koniec':'')+(s.ready?' · gotowy':''):(ISL.round?'—':'czeka')}</span>`}).join('');
  let win='';
  if(ISL.round&&ISL.players.length&&ISL.players.every(p=>{const s=sc[p.id];return s&&s.round===ISL.round&&s.over})){
    const best=Math.max(...ISL.players.map(p=>sc[p.id].live)),ws=ISL.players.filter(p=>sc[p.id].live===best).map(p=>lgEsc(p.name));
    win=`<span class="isw">${ws.length>1?'Remis':'Wygrywa'}: <b>${ws.join(', ')}</b> (${best} pkt)</span>`;statsIsla(ISL.players.filter(p=>sc[p.id].live===best).map(p=>p.id));
  }
  const waiting=readyInfo.waiting.length?`<div class="lgnote"><b>Czekamy jeszcze na:</b> ${readyInfo.waiting.map(p=>lgEsc(p.name)).join(', ')}</div>`:`<div class="lgnote">Wszyscy gracze są gotowi na następną parę kart.</div>`;
  el.innerHTML=`<span>Pokój <b class="lgcode">${lgEsc(ISL.code)}</b></span>${chips}${ISL.round?waiting:''}${win}<button class="lgbtn" onclick="islaLobby()">Pokój</button>`;
}
function islaCloseLobby(){const d=document.getElementById('islalobby');if(d)d.remove()}
function islaLobbyRefresh(){if(document.getElementById('islalobby'))islaLobby()}
function islaLobby(){
  const old=document.getElementById('islalobby');
  const act=document.activeElement,fid=old&&act&&act.id&&old.contains(act)?act.id:null,pos=fid?act.selectionStart:0;
  if(old)old.remove();
  const d=document.createElement('div');d.id='islalobby';
  const msg=ISL.msg?`<div class="lgmsg">${lgEsc(ISL.msg)}</div>`:'';
  let h;
  if(!ISL.ref){
    h=`<h2>Pokój online</h2><p class="lgnote">W pokoju wszyscy gracze dostają tę samą planszę i te same karty, a wyniki widać na żywo.</p>
    <div class="lgrow"><label>Twój nick <input id="islanick" maxlength="14" value="${lgEsc(ISL.nick||'Gracz')}" oninput="ISL.nick=this.value"></label>
    <label>Kolor <input id="islacol" type="color" value="${lgEsc(ISL.col||'#2a9df4')}" oninput="ISL.col=this.value"></label></div>
    <div class="lgrow"><label>Wybierz planszę <select id="islaboard" onchange="ISL.board=this.value"><option value="isla-petit" ${ISL.board==='isla-petit'?'selected':''}>Isla Petit</option></select></label></div>
    <div class="lgrow"><button class="lgbtn go" onclick="islaCreate()">Utwórz pokój</button></div>
    <div class="lgrow"><input id="islajoin" maxlength="5" placeholder="Kod pokoju" value="${lgEsc(ISL.joinCode||'')}" oninput="ISL.joinCode=this.value" style="text-transform:uppercase"><button class="lgbtn" onclick="islaJoin()">Dołącz</button></div>${msg}
    <div class="lgrow"><button class="lgbtn" onclick="islaCloseLobby()">Zamknij</button></div>`;
  }else{
    const isHost=ISL.host===onlinePlayerId,list=ISL.players.map((p,i)=>`<div class="lghist">${lgDot(p.color)}${i+1}. ${lgEsc(p.name)}${p.id===ISL.host?' <b>(host)</b>':''}${p.id===onlinePlayerId?' (Ty)':''}</div>`).join('');
    h=`<h2>Pokój: <span class="lgcode">${lgEsc(ISL.code)}</span></h2><p class="lgnote">Plansza: <b>Isla Petit</b></p>${list}${tgBox('ISL.ref',ISL.room&&ISL.room.test)}
    <p class="lgnote">${isHost?(ISL.round?'Możesz zacząć nową partię z nową planszą.':'Gdy wszyscy są w pokoju, rozpocznij partię.'):(ISL.round?'Partia trwa. Host może rozpocząć nową.':'Czekaj, aż host rozpocznie partię.')} (Gracze: ${ISL.players.length}/6)</p>${msg}
    <div class="lgrow">${isHost?`<button class="lgbtn go" onclick="islaHostStart()">${ISL.round?'Nowa partia':'Rozpocznij partię'}</button>`:''}<button class="lgbtn" onclick="navigator.clipboard&&navigator.clipboard.writeText(ISL.code)">Kopiuj kod</button><button class="lgbtn" onclick="islaLeave()">Wyjdź z pokoju</button><button class="lgbtn" onclick="islaCloseLobby()">Zamknij</button></div>`;
  }
  d.innerHTML=`<div class="islabox">${h}</div>`;
  document.getElementById('isla').appendChild(d);
  if(fid){const e=document.getElementById(fid);if(e){e.focus();try{e.setSelectionRange(pos,pos)}catch(x){}}}
}
/* ===== KONTA (logowanie i rejestracja, Firebase Authentication) ===== */
let ACC={user:null,nick:'',col:'',avatar:'',admin:false,view:'login',msg:'',ok:'',busy:false,f:{email:'',nick:'',gender:''},gender:'',streak:null};
let PRES={map:{},ref:null,listener:null,connectedRef:null,connectedListener:null,adminUsers:{},adminPresenceRef:null,adminUsersRef:null};
const accNet=()=>typeof fbAuth!=='undefined'&&!!fbAuth&&typeof fbDB!=='undefined'&&!!fbDB;
const accInRoom=()=>(typeof onlineRoom!=='undefined'&&!!onlineRoom)||(typeof __gamesInRoom==='function'&&__gamesInRoom())||!!ISL.ref;
const accErr=e=>({
  'auth/email-already-in-use':'Ten adres e-mail ma już konto. Zaloguj się.',
  'auth/invalid-email':'Nieprawidłowy adres e-mail.',
  'auth/weak-password':'Hasło jest za słabe (minimum 6 znaków).',
  'auth/wrong-password':'Nieprawidłowy e-mail lub hasło.',
  'auth/invalid-credential':'Nieprawidłowy e-mail lub hasło.',
  'auth/invalid-login-credentials':'Nieprawidłowy e-mail lub hasło.',
  'auth/user-not-found':'Nieprawidłowy e-mail lub hasło.',
  'auth/too-many-requests':'Za dużo prób. Spróbuj ponownie za chwilę.',
  'auth/network-request-failed':'Brak połączenia z internetem.',
  'auth/credential-already-in-use':'Ten adres e-mail jest już powiązany z innym kontem.',
  'auth/operation-not-allowed':'Logowanie e-mailem nie jest włączone w Firebase (Authentication → Metoda logowania → E-mail/hasło).'
}[e&&e.code]||('Błąd: '+((e&&e.message)||e)));
const accCleanNick=s=>String(s||'').replace(/[<>&]/g,'').trim().slice(0,14);
/* ----- AWATAR: zdjęcie profilowe (przycięte do kwadratu 128×128, JPEG, zapisane jako data URL w bazie) ----- */
const accAvatarOk=a=>typeof a==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(a)&&a.length<=60000?a:'';
function accAvatarHTML(src,color,size,name){
  const sz=size||40,c=/^#[0-9a-f]{6}$/i.test(color)?color:'#888888',a=accAvatarOk(src);
  if(a)return `<img class="accav" alt="" src="${a}" style="width:${sz}px;height:${sz}px">`;
  const ch=String(name||'').trim().charAt(0).toUpperCase();
  return `<i class="accav accavph" style="width:${sz}px;height:${sz}px;background:${c};font-size:${Math.round(sz*.45)}px">${lgEsc(ch)}</i>`;
}
(function(){
  if(document.getElementById('accav-style'))return;
  const st=document.createElement('style');st.id='accav-style';
  st.textContent='.accav{display:inline-block;border-radius:50%;object-fit:cover;vertical-align:middle;flex:none}'
    +'.accavph{display:inline-flex;align-items:center;justify-content:center;color:#fff;font-style:normal;font-weight:800;text-shadow:0 1px 2px #0006}'
    +'.accavbox{display:flex;align-items:center;gap:14px;margin:10px 0}'
    +'.accavbox .accav{border:2px solid #ffffff55;box-shadow:0 2px 8px #0004}'
    +'.accavbtns{display:flex;flex-wrap:wrap;gap:8px}'
    +'#accbar .accav{margin-right:6px}.frrow .accav{margin-right:6px}';
  document.head.appendChild(st);
})();
function accAvatarResize(file){
  return new Promise((res,rej)=>{
    if(!file||!/^image\//.test(file.type))return rej(new Error('Wybierz plik graficzny (JPG, PNG lub WebP).'));
    if(file.size>15*1024*1024)return rej(new Error('Plik jest za duży (maksymalnie 15 MB).'));
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      try{
        const S=128,c=document.createElement('canvas');c.width=c.height=S;
        const x=c.getContext('2d'),m=Math.min(img.width,img.height),sx=(img.width-m)/2,sy=(img.height-m)/2;
        x.fillStyle='#fff';x.fillRect(0,0,S,S);x.drawImage(img,sx,sy,m,m,0,0,S,S);
        URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.85));
      }catch(e){URL.revokeObjectURL(url);rej(e)}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Nie udało się odczytać obrazu. Spróbuj JPG lub PNG.'))};
    img.src=url;
  });
}
async function accAvatarPick(inp){
  const f=inp.files&&inp.files[0];inp.value='';
  if(!f||!ACC.user||ACC.busy)return;
  const prev=ACC.avatar,uid=ACC.user.uid;
  ACC.busy=true;ACC.msg='';ACC.ok='';accRefresh();
  try{
    const data=await accAvatarResize(f);
    if(!accAvatarOk(data))throw new Error('Zdjęcie jest zbyt złożone. Wybierz inne.');
    await fbDB.ref('users/'+uid).update({avatar:data});
    ACC.avatar=data;
    try{await fbDB.ref('publicUsers/'+uid+'/avatar').set(data)}catch(e){console.warn('Nie opublikowano awatara:',e)}
    accBar();ACC.ok='Zdjęcie profilowe zapisane.';
  }catch(e){ACC.avatar=prev;ACC.msg=(e&&e.code)?accErr(e):((e&&e.message)||'Nie udało się zapisać zdjęcia.')}
  ACC.busy=false;accRefresh();
}
async function accAvatarRemove(){
  if(!ACC.user||ACC.busy||!ACC.avatar)return;
  const uid=ACC.user.uid;
  ACC.busy=true;ACC.msg='';ACC.ok='';accRefresh();
  try{
    await fbDB.ref('users/'+uid+'/avatar').remove();
    try{await fbDB.ref('publicUsers/'+uid+'/avatar').remove()}catch(e){}
    ACC.avatar='';accBar();ACC.ok='Zdjęcie usunięte.';
  }catch(e){ACC.msg=accErr(e)}
  ACC.busy=false;accRefresh();
}
function accAvatarBlock(){
  return `<div class="accavbox">${accAvatarHTML(ACC.avatar,ACC.col,72,ACC.nick||(ACC.user&&ACC.user.email))}<div class="accavbtns"><input id="accavfile" type="file" accept="image/*" hidden onchange="accAvatarPick(this)"><button class="lgbtn go" ${ACC.busy?'disabled':''} onclick="document.getElementById('accavfile').click()">${ACC.avatar?'Zmień zdjęcie':'Dodaj zdjęcie'}</button>${ACC.avatar?`<button class="lgbtn" ${ACC.busy?'disabled':''} onclick="accAvatarRemove()">Usuń</button>`:''}</div></div>`;
}
function accBar(){
  const msgBtn=document.getElementById('msgAdminBtn');if(msgBtn)msgBtn.style.display=ACC.admin?'block':'none';
  if(typeof ideaRender==='function'){ideaRender();ideasInit()}
  if(typeof slogInit==='function'){slogInit();slogRefresh()}
  const t6=document.getElementById('hubtab6');if(t6){t6.style.display=ACC.user?'':'none';if(!ACC.user&&document.getElementById('stbox'))hubTab(1)}
  const t5=document.getElementById('hubtab5');if(t5){t5.style.display=ACC.user?'':'none';if(!ACC.user&&document.getElementById('frbox'))hubTab(1)}
  const el=document.getElementById('accbar');if(!el)return;
  if(!accNet()){el.innerHTML='<span class="lgnote">Gość (konta po wgraniu na hosting)</span>';return}
  el.innerHTML=ACC.user
    ?`${accAvatarHTML(ACC.avatar,ACC.col,24,ACC.nick||ACC.user.displayName||ACC.user.email)}<span>Zalogowany: <b>${lgEsc(ACC.nick||ACC.user.displayName||ACC.user.email||'konto')}</b></span><button class="lgbtn" onclick="accOpen()">Konto</button>`
    :`<span class="lgnote">Gość</span><button class="lgbtn go" onclick="accOpen('login')">Zaloguj się</button><button class="lgbtn" onclick="accOpen('register')">Utwórz konto</button>`;
}
const accGenderOk=g=>g==='f'||g==='m'?g:'';
const accGenderSel=(val,handler)=>`<label>Płeć <select id="accgender" onchange="${handler}"><option value=""${val?'':' selected'} disabled>Wybierz…</option><option value="f"${val==='f'?' selected':''}>Kobieta</option><option value="m"${val==='m'?' selected':''}>Mężczyzna</option></select></label>`;
function accApplyProfile(){
  const n=ACC.nick,c=ACC.col;
  if(n){ISL.nick=n;if(typeof __gamesSetNick==='function')__gamesSetNick(n);const e=document.getElementById('onlineNick');if(e)e.value=n.slice(0,14)}
  if(c){ISL.col=c;if(typeof __gamesSetCol==='function')__gamesSetCol(c);const e=document.getElementById('onlineColor');if(e)e.value=c}
}
async function accLoadProfile(u){
  try{
    const v=(await fbDB.ref('users/'+u.uid).once('value')).val();
    ACC.nick=accCleanNick((v&&v.nick)||u.displayName||'');ACC.col=(v&&/^#[0-9a-f]{6}$/i.test(v.color))?v.color:'';ACC.gender=accGenderOk(v&&v.gender);ACC.avatar=accAvatarOk(v&&v.avatar);
  }catch(e){ACC.nick=accCleanNick(u.displayName||'')}
  // Administratorzy są wskazani w Firebase Realtime Database pod admins/{UID}.
  try{const adminSnap=await fbDB.ref('admins/'+u.uid).once('value');ACC.admin=adminSnap.exists()&&adminSnap.val()!==false&&adminSnap.val()!==null;}
  catch(e){ACC.admin=false;console.warn('Nie udało się sprawdzić uprawnień administratora:',e)}
  accApplyProfile();accPublish();presenceStart(u.uid);accBar();accRefresh();
  accStreakUpdate(u);
  // Po zalogowaniu pokaż jeden losowy komunikat dzienny (maksymalnie raz na dzień).
  msgDailyMaybe(u.uid);
}
/* Passa kolejnych dni logowania: users/{uid}/streak = {count,best,last}; last = numer dnia (czas lokalny) */
const accDayNum=()=>{const d=new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5)};
function accStreakNext(cur,t){
  const c=cur&&isFinite(cur.count)?Number(cur.count):0,b=cur&&isFinite(cur.best)?Number(cur.best):0,l=cur&&isFinite(cur.last)?Number(cur.last):null;
  if(l===t)return {count:Math.max(1,c),best:Math.max(b,c,1),last:t};
  const n=(l!==null&&l===t-1)?c+1:1;
  return {count:n,best:Math.max(b,n),last:t};
}
async function accStreakUpdate(u){
  if(!u||!u.uid)return;
  const t=accDayNum(),key='accStreak_'+u.uid;let res=null;
  try{
    const r=await fbDB.ref('users/'+u.uid+'/streak').transaction(cur=>{
      if(cur&&Number(cur.last)===t)return; // dzisiaj już policzone: przerwij bez zapisu
      return accStreakNext(cur,t);
    });
    res=accStreakNext(r.snapshot.val(),t);
  }catch(e){
    // Brak uprawnień w regułach bazy lub brak sieci: licz lokalnie w tej przeglądarce.
    let cur=null;try{cur=JSON.parse(localStorage.getItem(key)||'null')}catch(x){}
    res=accStreakNext(cur,t);
  }
  try{localStorage.setItem(key,JSON.stringify(res))}catch(e){}
  /* kopia w publicUsers/{uid}/streak, żeby zakładka „Passa” mogła pokazać passę wszystkich graczy */
  try{fbDB.ref('publicUsers/'+u.uid+'/streak').set({count:res.count,best:res.best,last:res.last}).catch(()=>{})}catch(e){}
  if(ACC.user&&ACC.user.uid===u.uid){ACC.streak=res;accRefresh()}
}
function accStreakHTML(){
  const s=ACC.streak;
  if(!s)return '<p class="lgnote">🔥 Passa logowań: liczenie…</p>';
  const d=n=>n===1?'1 dzień':n+' dni';
  return `<div class="accstreak"><span class="accflame">🔥</span><div><div>Passa logowań: <b>${lgEsc(d(s.count))}</b> z rzędu</div><div class="lgnote">Rekord: ${lgEsc(d(s.best))}${s.count>=s.best&&s.count>1?' (właśnie go ustanawiasz!)':''}</div></div></div>`;
}
function accPublish(){
  const u=ACC.user;if(!u||!accNet())return;
  const nick=accCleanNick(ACC.nick||u.displayName||'Gracz')||'Gracz';
  const pub={nick,nickLower:nick.toLowerCase(),color:ACC.col||'#2a9df4'};if(ACC.gender)pub.gender=ACC.gender;
  const p=fbDB.ref('publicUsers/'+u.uid).update(pub).catch(()=>{});
  if(ACC.avatar)p.then(()=>fbDB.ref('publicUsers/'+u.uid+'/avatar').set(ACC.avatar)).catch(()=>{});
  return p;
}
async function accInit(){
  if(!accNet()){accBar();return}
  // Wymuś trwałą sesję Firebase: logowanie pozostaje aktywne po zamknięciu
  // karty/przeglądarki i ponownym wejściu na stronę.
  try{await fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)}
  catch(e){console.warn('Nie udało się ustawić trwałej sesji Firebase:',e)}
  fbAuth.onAuthStateChanged(u=>{
    const acc=u&&!u.isAnonymous?u:null;
    ACC.user=acc;ACC.admin=false;accBar();
    if(acc){if(typeof onlinePlayerId!=='undefined')onlinePlayerId=acc.uid;accLoadProfile(acc);frStart(acc.uid);stStart(acc.uid)}
    else{presenceStop();ACC.nick='';ACC.col='';ACC.avatar='';ACC.gender='';ACC.admin=false;ACC.streak=null;msgClose();frStop();stStop();accBar();accRefresh()}
  });
}
function accOpen(view){
  let d=document.getElementById('acc');if(d)d.remove();
  ACC.view=view||(ACC.user?'profile':'login');ACC.msg='';ACC.ok='';
  d=document.createElement('div');d.id='acc';document.body.appendChild(d);accRefresh();
}
function accClose(){const d=document.getElementById('acc');if(d)d.remove()}
function accTab(v){ACC.view=v;ACC.msg='';ACC.ok='';accRefresh()}
function accRefresh(){
  const d=document.getElementById('acc');if(!d)return;
  const a=document.activeElement,fid=a&&a.id&&d.contains(a)?a.id:null,pos=fid&&a.selectionStart;
  d.innerHTML='<div class="accbox">'+accHTML()+'</div>';
  if(fid){const e=document.getElementById(fid);if(e){e.focus();try{if(pos!=null)e.setSelectionRange(pos,pos)}catch(x){}}}
}
function accCreated(){
  try{
    const m=ACC.user&&ACC.user.metadata;
    const t=m&&(m.creationTime?Date.parse(m.creationTime):Number(m.createdAt));
    if(!t||!isFinite(t))return '';
    const d=new Date(t),days=Math.max(0,Math.floor((Date.now()-t)/864e5));
    const date=new Intl.DateTimeFormat('pl-PL',{day:'numeric',month:'long',year:'numeric'}).format(d);
    const time=new Intl.DateTimeFormat('pl-PL',{hour:'2-digit',minute:'2-digit'}).format(d);
    return `<p class="lgnote">Konto założone: <b>${lgEsc(date)}</b>, ${lgEsc(time)} (${days===0?'dzisiaj':days===1?'1 dzień temu':days+' dni temu'})</p>`;
  }catch(e){return ''}
}
function accHTML(){
  const msg=(ACC.msg?`<div class="lgmsg" role="alert">${lgEsc(ACC.msg)}</div>`:'')+(ACC.ok?`<div class="accok">${lgEsc(ACC.ok)}</div>`:'');
  if(!accNet())return `<h2>Konto</h2><p class="lgnote">Konta działają po wgraniu gry na własny hosting z Firebase. W tym podglądzie grasz jako gość.</p><div class="lgrow"><button class="lgbtn" onclick="accClose()">Zamknij</button></div>`;
  if(ACC.user){
    return `<h2>Twoje konto</h2>${accAvatarBlock()}<p>Zalogowany jako <b>${lgEsc(ACC.user.email||'')}</b></p>${accCreated()}${accStreakHTML()}
    <div class="lgrow"><label>Nick <input id="accnick" maxlength="14" value="${lgEsc(ACC.nick)}" oninput="ACC.nick=this.value"></label><label>Kolor <input id="acccol" type="color" value="${lgEsc(ACC.col||'#2a9df4')}" oninput="ACC.col=this.value"></label></div>
    <div class="lgrow">${accGenderSel(ACC.gender,'ACC.gender=this.value')}</div>
    <p class="lgnote">Nick i kolor będą podpowiadane w każdej grze online. Płeć widzą znajomi (np. przy informacji „Ostatnio aktywny/a”).</p>${msg}
    <div class="lgrow"><button class="lgbtn go" ${ACC.busy?'disabled':''} onclick="accSaveProfile()">Zapisz</button><button class="lgbtn" ${ACC.busy?'disabled':''} onclick="accLogout()">Wyloguj się</button><button class="lgbtn" onclick="accClose()">Zamknij</button></div>`;
  }
  const tabs=`<div class="lgrow"><button class="lgbtn ${ACC.view==='login'?'on':''}" onclick="accTab('login')">Zaloguj się</button><button class="lgbtn ${ACC.view==='register'?'on':''}" onclick="accTab('register')">Utwórz konto</button></div>`;
  const email=`<label>E-mail <input id="accemail" type="email" autocomplete="email" value="${lgEsc(ACC.f.email)}" oninput="ACC.f.email=this.value"></label>`;
  if(ACC.view==='reset')return `<h2>Reset hasła</h2><p class="lgnote">Wyślemy wiadomość z linkiem do ustawienia nowego hasła.</p><div class="lgrow">${email}</div>${msg}<div class="lgrow"><button class="lgbtn go" ${ACC.busy?'disabled':''} onclick="accReset()">Wyślij link</button><button class="lgbtn" onclick="accTab('login')">Wróć</button></div>`;
  if(ACC.view==='register')return `<h2>Utwórz konto</h2>${tabs}
    <div class="lgrow"><label>Nick <input id="accnick" maxlength="14" value="${lgEsc(ACC.f.nick)}" oninput="ACC.f.nick=this.value"></label></div>
    <div class="lgrow">${accGenderSel(ACC.f.gender,'ACC.f.gender=this.value')}</div>
    <div class="lgrow">${email}</div>
    <div class="lgrow"><label>Hasło <input id="accpass" type="password" autocomplete="new-password"></label><label>Powtórz hasło <input id="accpass2" type="password" autocomplete="new-password" onkeydown="if(event.key==='Enter')accSubmit()"></label></div>
    <p class="lgnote">Hasło ma mieć co najmniej 6 znaków. Jeśli już grasz jako gość, twoje dane zostaną przypisane do nowego konta.</p>${msg}
    <div class="lgrow"><button class="lgbtn go" ${ACC.busy?'disabled':''} onclick="accSubmit()">Utwórz konto</button><button class="lgbtn" onclick="accClose()">Zamknij</button></div>`;
  return `<h2>Zaloguj się</h2>${tabs}
    <div class="lgrow">${email}</div>
    <div class="lgrow"><label>Hasło <input id="accpass" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')accSubmit()"></label></div>${msg}
    <div class="lgrow"><button class="lgbtn go" ${ACC.busy?'disabled':''} onclick="accSubmit()">Zaloguj się</button><button class="lgbtn" onclick="accTab('reset')">Nie pamiętam hasła</button><button class="lgbtn" onclick="accClose()">Zamknij</button></div>`;
}
async function accSubmit(){
  if(ACC.busy||!accNet())return;
  const email=String(ACC.f.email||'').trim(),pass=(document.getElementById('accpass')||{}).value||'';
  if(!email||!pass){ACC.msg='Wpisz e-mail i hasło.';accRefresh();return}
  const register=ACC.view==='register';
  if(register){
    const p2=(document.getElementById('accpass2')||{}).value||'',nick=accCleanNick(ACC.f.nick);
    if(!nick){ACC.msg='Wpisz nick (do 14 znaków).';accRefresh();return}
    if(!accGenderOk(ACC.f.gender)){ACC.msg='Wybierz płeć.';accRefresh();return}
    if(pass.length<6){ACC.msg='Hasło jest za krótkie (minimum 6 znaków).';accRefresh();return}
    if(pass!==p2){ACC.msg='Hasła nie są takie same.';accRefresh();return}
  }else if(accInRoom()){ACC.msg='Najpierw opuść pokój lub grę online, a dopiero potem zmieniaj konto.';accRefresh();return}
  ACC.busy=true;ACC.msg='';accRefresh();
  try{
    if(register){
      const nick=accCleanNick(ACC.f.nick),cur=fbAuth.currentUser;let user;
      if(cur&&cur.isAnonymous){user=(await cur.linkWithCredential(firebase.auth.EmailAuthProvider.credential(email,pass))).user}
      else user=(await fbAuth.createUserWithEmailAndPassword(email,pass)).user;
      try{await user.updateProfile({displayName:nick})}catch(e){}
      await fbDB.ref('users/'+user.uid).set({nick,color:ACC.col||'#2a9df4',createdAt:firebase.database.ServerValue.TIMESTAMP});
      ACC.gender=accGenderOk(ACC.f.gender);
      try{await fbDB.ref('users/'+user.uid).update({gender:ACC.gender})}catch(e){console.warn('Nie zapisano płci:',e)}
      ACC.user=user;ACC.nick=nick;if(typeof onlinePlayerId!=='undefined')onlinePlayerId=user.uid;
      accApplyProfile();await accPublish();accBar();ACC.view='profile';ACC.ok='Konto utworzone. Jesteś zalogowany.';accStreakUpdate(user);
    }else{
      const user=(await fbAuth.signInWithEmailAndPassword(email,pass)).user;
      ACC.user=user;if(typeof onlinePlayerId!=='undefined')onlinePlayerId=user.uid;
      await accLoadProfile(user);ACC.view='profile';ACC.ok='Zalogowano.';
    }
  }catch(e){ACC.msg=accErr(e)}
  ACC.busy=false;accRefresh();
}
async function accReset(){
  if(ACC.busy||!accNet())return;
  const email=String(ACC.f.email||'').trim();if(!email){ACC.msg='Wpisz adres e-mail.';accRefresh();return}
  ACC.busy=true;ACC.msg='';accRefresh();
  try{await fbAuth.sendPasswordResetEmail(email);ACC.view='login';ACC.ok='Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.'}
  catch(e){ACC.msg=accErr(e)}
  ACC.busy=false;accRefresh();
}
async function accSaveProfile(){
  if(!ACC.user||ACC.busy)return;
  const nick=accCleanNick(ACC.nick);if(!nick){ACC.msg='Nick nie może być pusty.';accRefresh();return}
  ACC.busy=true;ACC.msg='';accRefresh();
  try{
    ACC.nick=nick;try{await ACC.user.updateProfile({displayName:nick})}catch(e){}
    const upd={nick,color:ACC.col||'#2a9df4',updatedAt:firebase.database.ServerValue.TIMESTAMP};if(accGenderOk(ACC.gender))upd.gender=ACC.gender;
    await fbDB.ref('users/'+ACC.user.uid).update(upd);
    accApplyProfile();await accPublish();accBar();ACC.ok='Zapisano.';
  }catch(e){ACC.msg=accErr(e)}
  ACC.busy=false;accRefresh();
}
async function accLogout(){
  if(accInRoom()){ACC.msg='Najpierw opuść pokój lub grę online, a dopiero potem się wyloguj.';accRefresh();return}
  try{await fbAuth.signOut();if(typeof onlinePlayerId!=='undefined')onlinePlayerId=null;ACC.user=null;ACC.nick='';ACC.col='';ACC.avatar='';ACC.gender='';ACC.streak=null;ACC.view='login';ACC.ok='Wylogowano.';accBar()}
  catch(e){ACC.msg=accErr(e)}
  accRefresh();
}
window.addEventListener('load',()=>setTimeout(accInit,0));
/* ===== ZNAJOMI (po zalogowaniu) ===== */
let FR={map:{},names:{},ref:null,listener:null,res:null,q:'',msg:''};
const frUid=()=>ACC.user?ACC.user.uid:null;
const frIncoming=()=>Object.keys(FR.map).filter(k=>FR.map[k]==='in');
function frBadge(){const t=document.getElementById('hubtab5');if(!t)return;const n=frIncoming().length+(typeof chatUnreadCount==='function'?chatUnreadCount():0);t.textContent='Znajomi'+(n?' ('+n+')':'')}
function frStart(uid){
  frStop();FR.ref=fbDB.ref('friends/'+uid);
  FR.listener=FR.ref.on('value',s=>{FR.map=s.val()||{};frBadge();frLoadNames();frRender();chatWatch()},e=>{FR.msg='Błąd znajomych: '+e.message;frRender()});
}
function frStop(){
  try{if(FR.ref&&FR.listener)FR.ref.off('value',FR.listener)}catch(e){}
  FR.ref=null;FR.listener=null;FR.map={};FR.res=null;FR.msg='';if(typeof chatUnwatch==='function')chatUnwatch();frBadge();
}
async function frLoadNames(){
  const ids=Object.keys(FR.map).filter(id=>!FR.names[id]);if(!ids.length)return;
  await Promise.all(ids.map(async id=>{
    try{const v=(await fbDB.ref('publicUsers/'+id).once('value')).val();FR.names[id]=v?{nick:v.nick,color:v.color,gender:accGenderOk(v.gender),avatar:accAvatarOk(v.avatar)}:{nick:'(nieznany)',color:'#888888'}}
    catch(e){FR.names[id]={nick:'(?)',color:'#888888'}}
  }));
  frRender();
}
const frName=id=>(FR.names[id]&&FR.names[id].nick)||'…';
const frTag=id=>'#'+String(id).slice(-4);
function frSeen(id){
  const p=PRES.map[id],g=(FR.names[id]||{}).gender,L=(g==='f'?'Ostatnio aktywna':g==='m'?'Ostatnio aktywny':'Ostatnio aktywny/a')+': ';
  if(!p)return L+'brak danych';
  if(p.state==='online')return L+'teraz';
  const ts=+p.last_changed;if(!ts)return L+'brak danych';
  const d=new Date(ts),now=new Date(),diff=now-d,hm=d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  if(diff<60000)return L+'przed chwilą';
  if(diff<3600000)return L+Math.floor(diff/60000)+' min temu';
  const y=new Date(now);y.setDate(y.getDate()-1);
  if(d.toDateString()===now.toDateString())return L+'dziś o '+hm;
  if(d.toDateString()===y.toDateString())return L+'wczoraj o '+hm;
  return L+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear()+' o '+hm;
}
setInterval(()=>{if(document.getElementById('frbox'))frRender()},60000);
function frRow(id,nick,color,actions,seen,avatar){
  const online=!!(PRES.map[id]&&PRES.map[id].state==='online');
  return `<div class="lghist frrow"><i class="fronline ${online?'on':''}" title="${online?'Online':'Offline'}"></i>${accAvatarOk(avatar||(FR.names[id]||{}).avatar)?accAvatarHTML(avatar||(FR.names[id]||{}).avatar,color,26):lgDot(color||'#888')}<b>${lgEsc(nick)}</b> <small>${lgEsc(frTag(id))}</small><span class="frb">${actions}</span>${seen?`<span class="frseen">${lgEsc(frSeen(id))}</span>`:''}</div>`;
}
function frRender(){
  const box=document.getElementById('frbox');if(!box)return;
  const a=document.activeElement,fid=a&&a.id&&box.contains(a)?a.id:null,pos=fid&&a.selectionStart;
  const keys=Object.keys(FR.map),by=s=>keys.filter(k=>FR.map[k]===s);
  const q=`<div class="lgrow"><input id="frq" maxlength="14" placeholder="Szukaj użytkownika po nicku" value="${lgEsc(FR.q)}" oninput="FR.q=this.value" onkeydown="if(event.key==='Enter')frSearch()"><button class="lgbtn go" onclick="frSearch()">Szukaj</button></div>`;
  let res='';
  if(FR.res){
    res=FR.res.length?FR.res.map(r=>{const st=FR.map[r.id];
      return frRow(r.id,r.nick,r.color,st==='friend'?'<span class="lgnote">Znajomy</span>':st==='out'?'<span class="lgnote">Zaproszenie wysłane</span>':st==='in'?`<button class="lgbtn go" onclick="frAccept('${r.id}')">Akceptuj</button>`:`<button class="lgbtn go" onclick="frInvite('${r.id}')">Dodaj do znajomych</button>`,false,r.avatar)}).join(''):'';
  }
  const inc=by('in').map(id=>frRow(id,frName(id),(FR.names[id]||{}).color,`<button class="lgbtn go" onclick="frAccept('${id}')">Akceptuj</button><button class="lgbtn" onclick="frRemove('${id}')">Odrzuć</button>`)).join('');
  const out=by('out').map(id=>frRow(id,frName(id),(FR.names[id]||{}).color,`<button class="lgbtn" onclick="frRemove('${id}')">Anuluj</button>`)).join('');
  const fr=by('friend').map(id=>frRow(id,frName(id),(FR.names[id]||{}).color,`<button class="lgbtn go" onclick="chatOpen('${id}')">Chat${chatUnread(id)?'<i class="chatdot" aria-label="Nowe wiadomości"></i>':''}</button><button class="lgbtn" onclick="frRemove('${id}')">Usuń</button>`,true)).join('');
  box.innerHTML=`${q}${FR.msg?`<div class="lgmsg">${lgEsc(FR.msg)}</div>`:''}${res}
  <h3>Zaproszenia do ciebie</h3>${inc||'<div class="lgnote">Brak zaproszeń.</div>'}
  <h3>Wysłane zaproszenia</h3>${out||'<div class="lgnote">Brak wysłanych zaproszeń.</div>'}
  <h3>Twoi znajomi (${by('friend').length})</h3>${fr||'<div class="lgnote">Nie masz jeszcze znajomych. Wyszukaj kogoś po nicku.</div>'}`;
  if(fid){const e=document.getElementById(fid);if(e){e.focus();try{if(pos!=null)e.setSelectionRange(pos,pos)}catch(x){}}}
}
/* ===== CHAT ZE ZNAJOMYMI ===== */
var CHAT={refs:{},meta:{},open:null,mref:null};
const chatId=(a,b)=>[String(a),String(b)].sort().join('_');
const chatUnread=id=>{const m=CHAT.meta[id],me=frUid();return !!(m&&me&&m.lf&&m.lf!==me&&(+m.lt||0)>(+((m.r||{})[me])||0))};
const chatUnreadCount=()=>Object.keys(CHAT.meta).filter(chatUnread).length;
function chatWatch(){
  const me=frUid();if(!me)return;
  const ids=Object.keys(FR.map).filter(k=>FR.map[k]==='friend');
  Object.keys(CHAT.refs).forEach(id=>{if(!ids.includes(id)){try{CHAT.refs[id].off()}catch(e){}delete CHAT.refs[id];delete CHAT.meta[id]}});
  ids.forEach(id=>{
    if(CHAT.refs[id])return;
    const r=fbDB.ref('chats/'+chatId(me,id)+'/meta');CHAT.refs[id]=r;
    r.on('value',s=>{CHAT.meta[id]=s.val()||{};frBadge();frRender()},()=>{});
  });
  frBadge();
}
function chatUnwatch(){
  Object.keys(CHAT.refs).forEach(id=>{try{CHAT.refs[id].off()}catch(e){}});
  CHAT.refs={};CHAT.meta={};chatStop();
}
function chatStop(){try{if(CHAT.mref)CHAT.mref.off()}catch(e){}CHAT.mref=null;CHAT.open=null}
function chatTime(ts){
  if(!ts)return '';const d=new Date(ts),n=new Date(),t=d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  return d.toDateString()===n.toDateString()?t:String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+' '+t;
}
function chatOpen(id){
  const me=frUid();if(!me||!fbDB||FR.map[id]!=='friend')return;
  msgClose();chatStop();
  const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.onclick=e=>{if(e.target===d){chatStop();msgClose()}};document.body.appendChild(d);
  const C=CHAT.open={id,cid:chatId(me,id),draft:'',msgs:[],msg:'',first:true};
  d.innerHTML='<div class="accbox" id="chatbox"><div class="lghead"><h2>Chat: '+lgEsc(frName(id))+'</h2><button type="button" class="lgbtn" onclick="chatStop();msgClose()">Zamknij</button></div>'
    +'<div id="chatlist" class="chatlist" aria-live="polite"></div><div id="chatmsg"></div>'
    +'<div class="lgrow"><input id="chatin" maxlength="500" autocomplete="off" placeholder="Napisz wiadomość…" oninput="if(CHAT.open)CHAT.open.draft=this.value" onkeydown="if(event.key===\'Enter\')chatSend()" aria-label="Wiadomość"><button type="button" class="lgbtn go" onclick="chatSend()">Wyślij</button></div></div>';
  chatListRender();
  const i=document.getElementById('chatin');if(i)i.focus();
  CHAT.mref=fbDB.ref('chats/'+C.cid+'/messages').limitToLast(100);
  CHAT.mref.on('value',s=>{
    if(CHAT.open!==C||!document.getElementById('chatbox')){chatStop();return}
    const a=[];s.forEach(c=>{const v=c.val();if(v&&typeof v.t==='string')a.push({k:c.key,from:v.from,t:v.t,ts:+v.ts||0})});
    C.msgs=a;C.msg='';chatListRender();chatMarkRead();
  },e=>{C.msg=/permission/i.test(String(e&&(e.code||e.message)))?'Brak uprawnień do czatu. Dodaj w regułach Firebase ścieżkę chats.':'Błąd czatu: '+(e&&e.message||e);chatListRender()});
}
function chatListRender(){
  const C=CHAT.open,l=document.getElementById('chatlist');if(!C||!l)return;
  const me=frUid(),near=C.first||l.scrollHeight-l.scrollTop-l.clientHeight<60;
  l.innerHTML=C.msgs.length?C.msgs.map(m=>'<div class="chatm'+(m.from===me?' me':'')+'">'+lgEsc(m.t)+'<small>'+lgEsc(chatTime(m.ts))+'</small></div>').join(''):'<div class="lgnote">Brak wiadomości. Napisz pierwszą!</div>';
  const mm=document.getElementById('chatmsg');if(mm)mm.innerHTML=C.msg?'<div class="lgmsg" role="alert">'+lgEsc(C.msg)+'</div>':'';
  if(near){l.scrollTop=l.scrollHeight;if(C.msgs.length)C.first=false}
}
function chatMarkRead(){
  const C=CHAT.open,me=frUid();if(!C||!me)return;
  const last=C.msgs[C.msgs.length-1];if(!last||last.from===me||!last.ts)return;
  const m=CHAT.meta[C.id],r=+((m&&m.r&&m.r[me])||0);
  if(r>=last.ts)return;
  fbDB.ref('chats/'+C.cid+'/meta/r/'+me).set(firebase.database.ServerValue.TIMESTAMP).catch(()=>{});
}
async function chatSend(){
  const C=CHAT.open,me=frUid();if(!C||!me)return;
  const t=String(C.draft||'').trim().slice(0,500);if(!t)return;
  const key=fbDB.ref('chats/'+C.cid+'/messages').push().key,TS=firebase.database.ServerValue.TIMESTAMP,i=document.getElementById('chatin');
  C.draft='';if(i)i.value='';
  const upd={};upd['messages/'+key]={from:me,t,ts:TS};upd['meta/lf']=me;upd['meta/lt']=TS;upd['meta/r/'+me]=TS;
  try{await fbDB.ref('chats/'+C.cid).update(upd);C.msg='';chatListRender()}
  catch(e){C.draft=t;if(i)i.value=t;C.msg=/permission/i.test(String(e&&(e.code||e.message)))?'Brak uprawnień do czatu. Dodaj w regułach Firebase ścieżkę chats.':'Nie wysłano: '+(e&&e.message||e);chatListRender()}
}
async function frSearch(){
  const q=String(FR.q||'').trim().toLowerCase();
  if(q.length<2){FR.msg='Wpisz co najmniej 2 znaki.';FR.res=null;frRender();return}
  FR.msg='Szukam…';frRender();
  try{
    const s=await fbDB.ref('publicUsers').orderByChild('nickLower').startAt(q).endAt(q+'\uf8ff').limitToFirst(10).once('value');
    const res=[];s.forEach(c=>{const v=c.val();if(c.key!==frUid()&&v)res.push({id:c.key,nick:String(v.nick||'?'),color:v.color,avatar:accAvatarOk(v.avatar)});});
    FR.res=res;FR.msg=res.length?'':'Nie znaleziono takiego użytkownika.';
  }catch(e){FR.msg='Błąd wyszukiwania: '+e.message;FR.res=null}
  frRender();
}
async function frInvite(id){
  if(!frUid()||id===frUid())return;
  if(FR.map[id]==='in')return frAccept(id);
  try{
    await fbDB.ref('friends/'+frUid()+'/'+id).set('out');
    await fbDB.ref('friends/'+id+'/'+frUid()).set('in');
    FR.msg='Zaproszenie wysłane.';
  }catch(e){
    FR.msg='Nie udało się wysłać zaproszenia: '+e.message;
    try{await fbDB.ref('friends/'+frUid()+'/'+id).remove()}catch(x){}
  }
  frRender();
}
async function frAccept(id){
  try{
    await fbDB.ref('friends/'+frUid()+'/'+id).set('friend');
    await fbDB.ref('friends/'+id+'/'+frUid()).set('friend');
    FR.msg='Dodano do znajomych.';
  }catch(e){FR.msg='Nie udało się zaakceptować: '+e.message}
  frRender();
}
async function frRemove(id){
  try{
    await fbDB.ref('friends/'+frUid()+'/'+id).remove();
    await fbDB.ref('friends/'+id+'/'+frUid()).remove();
    FR.msg='';
  }catch(e){FR.msg='Nie udało się usunąć: '+e.message}
  frRender();
}
/* ===== STATYSTYKI (zapisywane na koncie) ===== */
const ST_GAMES={monopoly:'Monopoly piłkarskie',litery:'Zgadywanie literek',kod:'Łamanie kodu',czolko:'Czółko',isla:'Tukan',panstwa:'Państwa Miasta',podboj:'Podbój',kj:'Kim jestem?',ttt:'Kółko i krzyżyk',kulki:'Kulki',snl:'Węże i drabiny',dobble:'Dobble',grzyb:'Grzybobranie',wisielec:'Wisielec',gofish:'Go Fish',kropki:'Kropki i Kwadraty',uno:'UNO',bierze:'6 bierze!',chinczyk:'Chińczyk',holearena:'Hole Arena',postaw:'Postaw na milion',szept:'Szept',guessr:'GuessR',darksweep:'Dark Sweep',krzyzowka:'Krzyżówka',tabu:'Tabu',podboj:'Podbój',statki:'Statki'};
let STS={done:new Set(),data:null,ref:null,listener:null,game:'all',sel:new Set(),msg:''};
/* ===== GRA TESTOWA (admin): wyniki takiej gry nie wchodzą do statystyk ani do najlepszych wyników ===== */
function tgBox(refExpr,isTest){
  if(typeof ACC!=='undefined'&&ACC.admin)return `<label class="lgnote tgbox" style="display:flex;align-items:center;gap:8px;margin:8px 0;cursor:pointer"><input type="checkbox" ${isTest?'checked':''} onchange="tgSet(${refExpr},this.checked)"><span>🧪 <b>Gra testowa</b> (admin) – wyniki nie liczą się do statystyk</span></label>`;
  return isTest?'<div class="lgnote tgbox">🧪 <b>Gra testowa</b> – wyniki nie liczą się do statystyk</div>':'';
}
function tgSet(ref,v){
  if(!ref||typeof ACC==='undefined'||!ACC.admin)return;
  ref.child('test').set(v?true:null).catch(e=>alert('Nie udało się zmienić trybu gry testowej: '+(e&&e.message||e)));
}
function statsRecord(key,g,r,players,test){
  if(test)return;
  if(typeof ACC==='undefined'||!ACC.user||!accNet()||STS.done.has(key))return;
  const me=ACC.user.uid,p={};
  (players||[]).forEach(x=>{if(x&&x.uid)p[x.uid]=String(x.name||'?').replace(/[<>&]/g,'').slice(0,14)});
  if(!p[me])return;
  STS.done.add(key);
  if(r==='w'&&typeof lbRecord==='function')lbRecord('wins','win_'+key+'_'+me,1,p[me]);
  fbDB.ref('stats/'+me+'/'+key).set({g,r,n:(players||[]).length,p,t:firebase.database.ServerValue.TIMESTAMP})
    .then(()=>{if(typeof LEAST!=='undefined'){LEAST.pick='';LEAST.asked=''}})
    .catch(e=>{STS.done.delete(key);console.error('Statystyki:',e)});
}
function statsIsla(winnerIds){
  if(typeof ACC==='undefined'||!ACC.user||!ISL.round)return;
  const me=ACC.user.uid;if(!ISL.players.some(p=>p.id===me))return;
  statsRecord('isla_'+ISL.code+'_'+ISL.round,'isla',winnerIds.includes(me)?(winnerIds.length>1?'d':'w'):'l',ISL.players.map(p=>({uid:p.id,name:p.name})),ISL.room&&ISL.room.test);
}
function stStart(uid){
  stStop();STS.ref=fbDB.ref('stats/'+uid);
  STS.listener=STS.ref.on('value',s=>{STS.data=s.val()||{};stRender()},e=>{STS.msg='Błąd statystyk: '+e.message;stRender()});
}
function stStop(){
  try{if(STS.ref&&STS.listener)STS.ref.off('value',STS.listener)}catch(e){}
  STS.ref=null;STS.listener=null;STS.data=null;STS.sel=new Set();STS.game='all';
}
function stFiltered(){
  let a=Object.keys(STS.data||{}).map(k=>Object.assign({id:k},STS.data[k]));
  if(STS.game!=='all')a=a.filter(x=>x.g===STS.game);
  const sel=[...STS.sel];if(sel.length)a=a.filter(x=>x.p&&sel.every(u=>x.p[u]));
  return a.sort((x,y)=>(y.t||0)-(x.t||0));
}
const stSum=a=>({n:a.length,w:a.filter(x=>x.r==='w').length,l:a.filter(x=>x.r==='l').length,d:a.filter(x=>x.r==='d').length});
const stPct=s=>s.n?Math.round(100*s.w/s.n)+'%':'—';
function stSetGame(g){STS.game=g;stRender()}
function stToggle(id){if(STS.sel.has(id))STS.sel.delete(id);else STS.sel.add(id);stRender()}
function stBoxes(s){
  return `<div class="stbx"><div><b>${s.n}</b><span>rozegrane</span></div><div><b>${s.w}</b><span>wygrane</span></div><div><b>${s.l}</b><span>przegrane</span></div>${s.d?`<div><b>${s.d}</b><span>remisy</span></div>`:''}<div><b>${stPct(s)}</b><span>wygranych</span></div></div>`;
}
function stRender(){
  const box=document.getElementById('stbox');if(!box)return;
  if(STS.data==null){box.innerHTML='<div class="lgnote">Wczytywanie statystyk…</div>';return}
  const games=[['all','Wszystkie gry']].concat(Object.keys(ST_GAMES).map(k=>[k,ST_GAMES[k]]));
  const gbtn=games.map(a=>`<button class="lgbtn ${STS.game===a[0]?'on':''}" onclick="stSetGame('${a[0]}')">${lgEsc(a[1])}</button>`).join('');
  const friends=(typeof FR!=='undefined'?Object.keys(FR.map).filter(k=>FR.map[k]==='friend'):[]);
  const fbtn=friends.length
    ?friends.map(id=>`<button class="lgbtn ${STS.sel.has(id)?'on':''}" onclick="stToggle('${id}')">${lgEsc(frName(id))} <small>${lgEsc(frTag(id))}</small></button>`).join('')
    :'<span class="lgnote">Dodaj znajomych w zakładce „Znajomi”, żeby filtrować gry z nimi.</span>';
  const arr=stFiltered(),s=stSum(arr);
  const selNames=[...STS.sel].map(id=>frName(id));
  const title=(STS.game==='all'?'Wszystkie gry':ST_GAMES[STS.game])+(selNames.length?' · razem z: '+selNames.join(', '):' · ogólnie');
  let h=`<div class="lgrow">${gbtn}</div><h3>Z kim</h3><div class="lgrow">${fbtn}</div>${STS.sel.size>1?'<div class="lgnote">Liczą się gry, w których brali udział wszyscy wybrani znajomi naraz.</div>':''}
  ${STS.sel.size?'<div class="lgrow"><button class="lgbtn" onclick="STS.sel=new Set();stRender()">Wyczyść wybór</button></div>':''}
  <h3>${lgEsc(title)}</h3>${stBoxes(s)}`;
  if(STS.game==='all'&&arr.length){
    h+='<h3>Podział na gry</h3><div class="stt">'+Object.keys(ST_GAMES).map(k=>{const q=stSum(arr.filter(x=>x.g===k));return `<div class="strow"><b>${lgEsc(ST_GAMES[k])}</b><span>${q.n} gier · ${q.w} W / ${q.l} P${q.d?' / '+q.d+' R':''}</span></div>`}).join('')+'</div>';
  }
  h+='<h3>Ostatnie gry</h3>'+(arr.length?arr.slice(0,10).map(x=>{
    const others=Object.keys(x.p||{}).filter(u=>u!==(ACC.user&&ACC.user.uid)).map(u=>lgEsc(x.p[u])).join(', ');
    return `<div class="lghist"><span class="str ${x.r}">${x.r==='w'?'Wygrana':x.r==='d'?'Remis':'Przegrana'}</span> ${lgEsc(ST_GAMES[x.g]||x.g)} <small>${x.t?new Date(x.t).toLocaleString('pl'):''}${x.adm?' · korekta admina':''}</small>${others?`<div class="lgnote">z: ${others}</div>`:''}</div>`}).join(''):'<div class="lgnote">Brak rozegranych gier w tym zestawieniu.</div>');
  if(STS.msg)h+=`<div class="lgmsg">${lgEsc(STS.msg)}</div>`;
  box.innerHTML=h;
}

const POD_B64="PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InBsIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCB2aWV3cG9ydC1maXQ9Y292ZXIiPgo8dGl0bGU+UG9kYsOzaiDigJMgZ3JhIHoga29zdGvEhTwvdGl0bGU+CjxzdHlsZT4KOnJvb3R7LS1iZzojZjNmMWVjOy0tY2FyZDojZmZmOy0tdGV4dDojMjIyOy0tbXV0ZWQ6IzY2NjstLWxpbmU6cmdiYSgwLDAsMCwuMjUpOy0tcDA6I2U2Mzk0NjstLXAxOiMyYTdkZTE7LS1wMjojMmE5ZDRmOy0tcDM6I2YwYTIwMjsKYm94LXNpemluZzpib3JkZXItYm94O3BhZGRpbmctdG9wOmVudihzYWZlLWFyZWEtaW5zZXQtdG9wLDBweCk7cGFkZGluZy1ib3R0b206ZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KX0KQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTpkYXJrKXs6cm9vdDpub3QoW2RhdGEtdGhlbWU9ImxpZ2h0Il0pey0tYmc6IzE3MTgxYjstLWNhcmQ6IzIzMjUyYTstLXRleHQ6I2VlZTstLW11dGVkOiNhYWE7LS1saW5lOnJnYmEoMjU1LDI1NSwyNTUsLjMpfX0KOnJvb3RbZGF0YS10aGVtZT0iZGFyayJdey0tYmc6IzE3MTgxYjstLWNhcmQ6IzIzMjUyYTstLXRleHQ6I2VlZTstLW11dGVkOiNhYWE7LS1saW5lOnJnYmEoMjU1LDI1NSwyNTUsLjMpfQoqe2JveC1zaXppbmc6Ym9yZGVyLWJveH0KYm9keXttYXJnaW46MDtiYWNrZ3JvdW5kOnZhcigtLWJnKTtjb2xvcjp2YXIoLS10ZXh0KTtmb250LWZhbWlseTpzeXN0ZW0tdWksLWFwcGxlLXN5c3RlbSwiU2Vnb2UgVUkiLHNhbnMtc2VyaWY7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoxMnB4O2dhcDoxMnB4fQpoMXttYXJnaW46NHB4IDAgMDtmb250LXNpemU6MS42cmVtfQouY2FyZHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjE0cHg7Ym94LXNoYWRvdzowIDJweCA4cHggcmdiYSgwLDAsMCwuMTIpO3dpZHRoOjEwMCU7bWF4LXdpZHRoOjgyMHB4fQpidXR0b257Zm9udDppbmhlcml0O2JvcmRlcjowO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjEwcHggMThweDtjdXJzb3I6cG9pbnRlcjtiYWNrZ3JvdW5kOnZhcigtLXRleHQpO2NvbG9yOnZhcigtLWJnKTtmb250LXdlaWdodDo2MDB9CmJ1dHRvbjpkaXNhYmxlZHtvcGFjaXR5Oi4zNTtjdXJzb3I6ZGVmYXVsdH0KI3NldHVwe3RleHQtYWxpZ246Y2VudGVyfQojc2V0dXAgLnJvd3tkaXNwbGF5OmZsZXg7Z2FwOjhweDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21hcmdpbjoxMnB4IDB9CiNodWR7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDoxMHB4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbn0KI3BsYXllcnN7ZGlzcGxheTpmbGV4O2dhcDo4cHg7ZmxleC13cmFwOndyYXB9Ci5wbHtwYWRkaW5nOjZweCAxMnB4O2JvcmRlci1yYWRpdXM6MjBweDtjb2xvcjojZmZmO2ZvbnQtd2VpZ2h0OjYwMDtmb250LXNpemU6LjlyZW07b3BhY2l0eTouNTV9Ci5wbC5vbntvcGFjaXR5OjE7b3V0bGluZTozcHggc29saWQgdmFyKC0tdGV4dCk7b3V0bGluZS1vZmZzZXQ6MnB4fQojY3RybHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxNHB4O2ZsZXgtd3JhcDp3cmFwfQojZGlle2ZvbnQtc2l6ZTozLjJyZW07bGluZS1oZWlnaHQ6MTttaW4td2lkdGg6MS4yZW07dGV4dC1hbGlnbjpjZW50ZXJ9CiNtc2d7Y29sb3I6dmFyKC0tbXV0ZWQpO2ZsZXg6MTttaW4td2lkdGg6MTYwcHh9CiN3cmFwe292ZXJmbG93LXg6YXV0bzt3aWR0aDoxMDAlO21heC13aWR0aDo4MjBweH0KI2JvYXJke2Rpc3BsYXk6Z3JpZDtnYXA6MDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLXRleHQpO2JvcmRlci1yYWRpdXM6OHB4O292ZXJmbG93OmhpZGRlbjttYXJnaW46MCBhdXRvO3dpZHRoOjEwMCU7bWluLXdpZHRoOjYwMHB4O3VzZXItc2VsZWN0Om5vbmV9Ci5je2FzcGVjdC1yYXRpbzoxO3Bvc2l0aW9uOnJlbGF0aXZlO3RyYW5zaXRpb246YmFja2dyb3VuZCAuMjVzfQouYy5hdntjdXJzb3I6cG9pbnRlcjthbmltYXRpb246cHVsc2UgMXMgaW5maW5pdGUgYWx0ZXJuYXRlfQouYy5hdjo6YWZ0ZXJ7Y29udGVudDoiIjtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDozMCU7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDp2YXIoLS1jdXIpO29wYWNpdHk6Ljg1fQpAa2V5ZnJhbWVzIHB1bHNle2Zyb217ZmlsdGVyOmJyaWdodG5lc3MoMSl9dG97ZmlsdGVyOmJyaWdodG5lc3MoMS4xOCl9fQojZW5ke3RleHQtYWxpZ246Y2VudGVyfQouaGlkZXtkaXNwbGF5Om5vbmUhaW1wb3J0YW50fQouYyAuY2ltZ3t3aWR0aDo3OCU7aGVpZ2h0OmF1dG87ZGlzcGxheTpibG9jaztwb2ludGVyLWV2ZW50czpub25lfQoucGwgLmNpbWcsI3dhbCAuY2ltZ3t3aWR0aDoxLjFlbTtoZWlnaHQ6MS4xZW07dmVydGljYWwtYWxpZ246LS4yZW19Ci5jIC51aW1ne3dpZHRoOjkyJTtoZWlnaHQ6YXV0bztkaXNwbGF5OmJsb2NrO3BvaW50ZXItZXZlbnRzOm5vbmU7ZmlsdGVyOmRyb3Atc2hhZG93KDAgMCAxcHggI2ZmZikgZHJvcC1zaGFkb3coMCAwIDFweCAjZmZmKX0KLmMgLnNoaWVsZE1hcmt7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6MDtib3R0b206MDtmb250LXNpemU6MTJweDtsaW5lLWhlaWdodDoxO2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuNzIpO2JvcmRlci1yYWRpdXM6NXB4O3BhZGRpbmc6MXB4O3otaW5kZXg6Mn0KLmljbyAudWltZ3t3aWR0aDoyLjZyZW07aGVpZ2h0OjIuNnJlbTtkaXNwbGF5OmJsb2NrfQojbWJveCBoMyAudWltZ3t3aWR0aDoxLjVlbTtoZWlnaHQ6MS41ZW07dmVydGljYWwtYWxpZ246LS4zNWVtfQouY3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjE0cHg7bGluZS1oZWlnaHQ6MTtvdmVyZmxvdzpoaWRkZW59Ci5jLmF2LmNvaW46OmFmdGVye2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7Ym9yZGVyOjJweCBzb2xpZCB2YXIoLS1jdXIpO2luc2V0OjglfQojc2hvcHtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2dhcDoxMnB4fQojc2hvcCAuaGVhZHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMHB4O2ZsZXgtd3JhcDp3cmFwO2ZvbnQtc2l6ZToxLjE1cmVtfQouaXRlbXtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6MTBweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTJweDtmbGV4LXdyYXA6d3JhcH0KLml0ZW0gLmljb3tmb250LXNpemU6Mi4ycmVtO3dpZHRoOjIuNnJlbTt0ZXh0LWFsaWduOmNlbnRlcn0KLml0ZW0gLmluZm97ZmxleDoxO21pbi13aWR0aDoxODBweH0KLml0ZW0gLmluZm8gZGl2e2NvbG9yOnZhcigtLW11dGVkKTtmb250LXNpemU6LjlyZW19Ci5pdGVtIC5hY3R7ZGlzcGxheTpmbGV4O2dhcDo4cHg7ZmxleC13cmFwOndyYXB9CiNzaG9wIC5ub3Rle2NvbG9yOnZhcigtLW11dGVkKTtmb250LXNpemU6LjlyZW19CiNzaG9wIHVse21hcmdpbjo2cHggMCAwO3BhZGRpbmctbGVmdDoyMHB4fQojdGFic3tkaXNwbGF5OmZsZXg7Z2FwOjhweH0KI3RhYnMgYnV0dG9ue2ZsZXg6MTtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2NvbG9yOnZhcigtLXRleHQpO2JveC1zaGFkb3c6MCAycHggOHB4IHJnYmEoMCwwLDAsLjEyKX0KI3RhYnMgYnV0dG9uLm9ue2JhY2tncm91bmQ6dmFyKC0tdGV4dCk7Y29sb3I6dmFyKC0tYmcpfQojZ2FtZS50YWItc2hvcCAjY3RybCwjZ2FtZS50YWItc2hvcCAjdHBhbmVsLCNnYW1lLnRhYi1zaG9wICN3cmFwe2Rpc3BsYXk6bm9uZSFpbXBvcnRhbnR9CiNnYW1lOm5vdCgudGFiLXNob3ApICNzaG9we2Rpc3BsYXk6bm9uZX0KI3Nob3AgYnttYXJnaW4tcmlnaHQ6NnB4fQojd2Fse2NvbG9yOnZhcigtLW11dGVkKTtmbGV4OjE7bWluLXdpZHRoOjEyMHB4fQojYnd7cG9zaXRpb246cmVsYXRpdmU7bWluLXdpZHRoOjYwMHB4O3dpZHRoOjEwMCU7bWFyZ2luOjAgYXV0b30KI292e3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtwb2ludGVyLWV2ZW50czpub25lO292ZXJmbG93OmhpZGRlbn0KI2J3LmFpbWluZ3t0b3VjaC1hY3Rpb246bm9uZTtjdXJzb3I6Y3Jvc3NoYWlyfQojbWVudXtwb3NpdGlvbjpmaXhlZDtpbnNldDowO2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuNDUpO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjt6LWluZGV4OjUwO3BhZGRpbmc6MTZweH0KI21ib3h7bWF4LXdpZHRoOjMyMHB4fQojbWJveCBoM3ttYXJnaW46MCAwIDhweH0KLm1yb3d7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2dhcDo4cHg7bWFyZ2luLXRvcDoxMnB4fQoudHJvd3tkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7Z2FwOjEwcHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi10b3A6OHB4fQojdHBhbmVsIHNlbGVjdCwjdHBhbmVsIGlucHV0e2ZvbnQ6aW5oZXJpdDtwYWRkaW5nOjZweDtib3JkZXItcmFkaXVzOjhweH0KPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KPGgxPvCfl7rvuI8gUG9kYsOzajwvaDE+Cgo8ZGl2IGlkPSJzZXR1cCIgY2xhc3M9ImNhcmQiPgogIDxwPk1hcGEgamVzdCBwb2R6aWVsb25hIG5hIHJlZ2lvbnkuIFJ6dWNhc3oga29zdGvEhSBpIHByemVqbXVqZXN6IHR5bGUgcMOzbCwgaWxlIHd5cGFkbmllIOKAkyBrYcW8ZGUgbm93ZSBwb2xlIG11c2kgc8SFc2lhZG93YcSHIHogVHdvaW0gdGVyeXRvcml1bS4gS2HFvGRhIHN0cmVmYSwgdyBrdMOzcmVqIG1hc3ogY2hvxIcgamVkZW4ga2FmZWxlaywgZGFqZSBDaSBwdW5rdCAoU1RSRUZZKS4gV3lncnl3YSB0ZW4sIGt0byBtYSBuYWp3acSZY2VqIHN0cmVmIOKAkyBwcnp5IHJlbWlzaWUgZGVjeWR1amUgbGljemJhIHDDs2wuIE5hIHBsYW5zenkgbGXFvMSFIG1vbmV0eSDwn6qZICh6YmllcmFzeiBqZSwgemFqbXVqxIVjIHBvbGUpOyB3IHNrbGVwaWUga3VwaXN6IGR6aWHFgm8g8J+UqyBpIHBvc3Rhd2lzeiBqZSBuYSBzd29pbSBwb2x1LjwvcD4KICA8bGFiZWwgc3R5bGU9J2Rpc3BsYXk6YmxvY2s7bWFyZ2luLWJvdHRvbToxMHB4Jz48aW5wdXQgdHlwZT0nY2hlY2tib3gnIGlkPSd0bW9kZSc+IPCfp6ogVHJ5YiB0ZXN0b3d5PC9sYWJlbD48Yj5JbHUgZ3JhY3p5PzwvYj4KICA8ZGl2IGNsYXNzPSJyb3ciPjxidXR0b24gb25jbGljaz0ic3RhcnQoMikiPjI8L2J1dHRvbj48YnV0dG9uIG9uY2xpY2s9InN0YXJ0KDMpIj4zPC9idXR0b24+PGJ1dHRvbiBvbmNsaWNrPSJzdGFydCg0KSI+NDwvYnV0dG9uPjwvZGl2PgogIDxociBzdHlsZT0iYm9yZGVyOjA7Ym9yZGVyLXRvcDoxcHggc29saWQgdmFyKC0tbGluZSk7bWFyZ2luOjE2cHggMCI+CiAgPGI+8J+kliBHcmEgb2ZmbGluZSB6IGJvdGFtaTwvYj4KICA8ZGl2IGNsYXNzPSJyb3ciPjxsYWJlbD5Qb3ppb20gYm90w7N3OiA8c2VsZWN0IGlkPSJiZGlmZiIgc3R5bGU9ImZvbnQ6aW5oZXJpdDtwYWRkaW5nOjZweDtib3JkZXItcmFkaXVzOjhweCI+PG9wdGlvbiB2YWx1ZT0iMCI+xYFhdHd5PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT0iMSIgc2VsZWN0ZWQ+Tm9ybWFsbnk8L29wdGlvbj48b3B0aW9uIHZhbHVlPSIyIj5UcnVkbnk8L29wdGlvbj48L3NlbGVjdD48L2xhYmVsPjwvZGl2PgogIDxkaXYgY2xhc3M9InJvdyI+PGJ1dHRvbiBvbmNsaWNrPSJzdGFydEJvdHMoMSkiPjEgYm90PC9idXR0b24+PGJ1dHRvbiBvbmNsaWNrPSJzdGFydEJvdHMoMikiPjIgYm90eTwvYnV0dG9uPjxidXR0b24gb25jbGljaz0ic3RhcnRCb3RzKDMpIj4zIGJvdHk8L2J1dHRvbj48L2Rpdj4KPC9kaXY+Cgo8ZGl2IGlkPSJnYW1lIiBjbGFzcz0iaGlkZSIgc3R5bGU9IndpZHRoOjEwMCU7bWF4LXdpZHRoOjgyMHB4O2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjEycHgiPgogIDxkaXYgY2xhc3M9ImNhcmQiIGlkPSJodWQiPgogICAgPGRpdiBpZD0icGxheWVycyI+PC9kaXY+CiAgICA8YnV0dG9uIGlkPSd0bW9kZUJ0bicgb25jbGljaz0ndG9nZ2xlVGVzdCgpJyBzdHlsZT0nYmFja2dyb3VuZDp2YXIoLS1tdXRlZCknPvCfp6ogVHJ5Yjogend5a8WCeTwvYnV0dG9uPgogICAgPGJ1dHRvbiBpZD0ibmV3R2FtZUJ0biIgb25jbGljaz0ibG9jYXRpb24ucmVsb2FkKCkiIHN0eWxlPSJiYWNrZ3JvdW5kOnZhcigtLW11dGVkKSI+Tm93YSBncmE8L2J1dHRvbj4KICA8L2Rpdj4KICA8ZGl2IGlkPSd0YWJzJz48YnV0dG9uIGlkPSd0YWJNYXAnIGNsYXNzPSdvbicgb25jbGljaz0ic2V0VGFiKCdtYXAnKSI+8J+Xuu+4jyBNYXBhPC9idXR0b24+PGJ1dHRvbiBpZD0ndGFiU2hvcCcgb25jbGljaz0ic2V0VGFiKCdzaG9wJykiPvCfm5IgU2tsZXA8L2J1dHRvbj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJjYXJkIiBpZD0iY3RybCI+CiAgICA8YnV0dG9uIGlkPSJyb2xsIiBvbmNsaWNrPSJyb2xsKCkiPvCfjrIgUnp1xIcga29zdGvEhTwvYnV0dG9uPgogICAgPGRpdiBpZD0iZGllIj7imoA8L2Rpdj4KICAgIDxkaXYgaWQ9Im1zZyI+PC9kaXY+CiAgICA8YnV0dG9uIGlkPSJza2lwIiBvbmNsaWNrPSJlbmRUdXJuKCkiIGRpc2FibGVkPlpha2/FhGN6IHR1csSZPC9idXR0b24+CiAgICA8YnV0dG9uIGlkPSJjYW5jZWxBaW0iIGNsYXNzPSJoaWRlIiBvbmNsaWNrPSJjYW5jZWxBaW0odHJ1ZSkiIHN0eWxlPSJiYWNrZ3JvdW5kOnZhcigtLW11dGVkKSI+QW51bHVqIGNlbG93YW5pZTwvYnV0dG9uPgogIDwvZGl2PgogIDxkaXYgY2xhc3M9ImNhcmQiIGlkPSJzaG9wIj4KICAgIDxkaXYgY2xhc3M9J2hlYWQnPjxiPvCfm5IgU2tsZXA8L2I+PHNwYW4gaWQ9IndhbCI+PC9zcGFuPjwvZGl2PgogICAgPGRpdiBjbGFzcz0naXRlbSc+CiAgICAgIDxkaXYgY2xhc3M9J2ljbycgaWQ9J2ljb0MnPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSdpbmZvJz48Yj5EemlhxYJvPC9iPjxkaXY+U3RyemVsYSB3IGxpbmlpOiB6YXNpxJlnIDMsIG5pc3pjenkgMSBibG9rLiBSYXogbmEgdHVyxJkuPC9kaXY+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9J2FjdCc+PGJ1dHRvbiBpZD0iYnV5IiBvbmNsaWNrPSJidXkoKSI+S3VwIGR6aWHFgm8gKDUg8J+qmSk8L2J1dHRvbj48YnV0dG9uIGlkPSJwbGFjZSIgb25jbGljaz0idG9nZ2xlUGxhY2UoKTtzZXRUYWIoJ21hcCcpIj5Qb3N0YXcgZHppYcWCbyAoMCk8L2J1dHRvbj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0naXRlbSc+CiAgICAgIDxkaXYgY2xhc3M9J2ljbyc+8J+boe+4jzwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSdpbmZvJz48Yj5PY2hyb25hIHDDs2w8L2I+PGRpdj5LdXAgcGFraWV0IDEwIG9zxYJvbiB6YSAxNSDwn6qZLiBOYXN0xJlwbmllIGtsaWtuaWogMTAgc3dvaWNoIHDDs2wsIGFieSB6YWJlenBpZWN6ecSHIGplIHByemVkIGR6aWHFgmFtaSBpIGthdGFwdWx0YW1pIHByemVjaXduaWvDs3cuPC9kaXY+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9J2FjdCc+PGJ1dHRvbiBpZD0iYnV5UyIgb25jbGljaz0iYnV5U2hpZWxkKCkiPkt1cCBvY2hyb27EmSAoMTUg8J+qmSk8L2J1dHRvbj48YnV0dG9uIGlkPSJwbGFjZVMiIG9uY2xpY2s9InRvZ2dsZVNoaWVsZCgpO3NldFRhYignbWFwJykiPlphYmV6cGllY3ogcG9sYSAoMCk8L2J1dHRvbj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0naXRlbSc+CiAgICAgIDxkaXYgY2xhc3M9J2ljbyc+4pqhPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9J2luZm8nPjxiPkdlbmVyYXRvcjwvYj48ZGl2PkRhamUgMiDwn6qZIG5hIHBvY3rEhXRrdSBUd29qZWogdHVyeS4gTmlzemN6eSBzacSZIHJhemVtIHogcG9sZW0uPC9kaXY+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9J2FjdCc+PGJ1dHRvbiBpZD0iYnV5RyIgb25jbGljaz0iYnV5R2VuKCkiPkt1cCBnZW5lcmF0b3IgKDYg8J+qmSk8L2J1dHRvbj48YnV0dG9uIGlkPSJwbGFjZUciIG9uY2xpY2s9InRvZ2dsZVBsYWNlRygpO3NldFRhYignbWFwJykiPlBvc3RhdyBnZW5lcmF0b3IgKDApPC9idXR0b24+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9J2l0ZW0nPgogICAgICA8ZGl2IGNsYXNzPSdpY28nIGlkPSdpY29LJz48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0naW5mbyc+PGI+S2F0YXB1bHRhPC9iPjxkaXY+TmFjacSFZ2FuYSBwcm9jxIUsIHphc2nEmWcgZG8gMTIgcMOzbC4gUHJ6ZWptdWplIHBvbGUgaSA0IGRvb2tvxYJhLCBuaXN6Y3rEhWMgc3RydWt0dXJ5IHByemVjaXduaWthLjwvZGl2PjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSdhY3QnPjxidXR0b24gaWQ9ImJ1eUsiIG9uY2xpY2s9ImJ1eUNhdCgpIj5LdXAga2F0YXB1bHTEmSAoOCDwn6qZKTwvYnV0dG9uPjxidXR0b24gaWQ9InBsYWNlSyIgb25jbGljaz0idG9nZ2xlUGxhY2VLKCk7c2V0VGFiKCdtYXAnKSI+UG9zdGF3IGthdGFwdWx0xJkgKDApPC9idXR0b24+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9J25vdGUnPjxiPlVsZXBzemVuaWE8L2I+IGt1cHVqZXN6IHcgbWVudSBqZWRub3N0a2kgKGtsaWtuaWogasSFIG5hIG1hcGllKToKICAgICAgPHVsPgogICAgICAgIDxsaT7wn5SrIHphc2nEmWcgKzE6IDUg8J+qmSAobWFrcy4gNCBwb3ppb215KTwvbGk+CiAgICAgICAgPGxpPvCflKsgbmlzemN6b25lIGJsb2tpIDI6IDUg8J+qmTwvbGk+CiAgICAgICAgPGxpPvCfqqggemFzacSZZyAxNTogNiDwn6qZPC9saT4KICAgICAgICA8bGk+4pqhIHByenljaMOzZCAzIPCfqpkgbmEgdHVyxJk6IDEwIPCfqpk8L2xpPgogICAgICA8L3VsPgogICAgPC9kaXY+CiAgPC9kaXY+CiAgPGRpdiBjbGFzcz0nY2FyZCBoaWRlJyBpZD0ndHBhbmVsJz4KICAgIDxiPvCfp6ogVHJ5YiB0ZXN0b3d5PC9iPgogICAgPGRpdiBjbGFzcz0ndHJvdyc+CiAgICAgIDxsYWJlbD5HcmFjejogPHNlbGVjdCBpZD0ndHBsYXllcic+PC9zZWxlY3Q+PC9sYWJlbD4KICAgICAgPGxhYmVsPk5hcnrEmWR6aWU6IDxzZWxlY3QgaWQ9J3R0b29sJz4KICAgICAgICA8b3B0aW9uIHZhbHVlPScnPuKAlCBicmFrIChncmEgbm9ybWFsbmEpIOKAlDwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9J293bic+WmFqbWlqIHBvbGU8L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSdmcmVlJz5XeWN6ecWbxIcgcG9sZTwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9J2Nhbm5vbic+UG9zdGF3IGR6aWHFgm88L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSdnZW4nPlBvc3RhdyBnZW5lcmF0b3I8L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSdjYXQnPlBvc3RhdyBrYXRhcHVsdMSZPC9vcHRpb24+CiAgICAgICAgPG9wdGlvbiB2YWx1ZT0nY29pbic+UHJ6ZcWCxIVjeiBtb25ldMSZIG5hIHBvbHU8L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSdwb3QnPlByemXFgsSFY3ogZ2FybmVrIG5hIHBvbHU8L29wdGlvbj4KICAgICAgPC9zZWxlY3Q+PC9sYWJlbD4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ndHJvdyc+CiAgICAgIDxsYWJlbD5Nb25ldHk6IDxpbnB1dCBpZD0ndGNvaW5zJyB0eXBlPSdudW1iZXInIHZhbHVlPScxMCcgc3R5bGU9J3dpZHRoOjgwcHgnPjwvbGFiZWw+CiAgICAgIDxidXR0b24gb25jbGljaz0ndGVzdENvaW5zKHRydWUpJz5Eb2RhajwvYnV0dG9uPgogICAgICA8YnV0dG9uIG9uY2xpY2s9J3Rlc3RDb2lucyhmYWxzZSknPlVzdGF3PC9idXR0b24+CiAgICAgIDxidXR0b24gb25jbGljaz0ndGVzdFR1cm4oKSc+RGFqIHR1csSZIGdyYWN6b3dpPC9idXR0b24+CiAgICAgIDxidXR0b24gb25jbGljaz0ndGVzdFBvdCgpJz5acnp1xIcgZ2FybmVrPC9idXR0b24+CiAgICA8L2Rpdj4KICA8L2Rpdj4KICA8ZGl2IGlkPSd3cmFwJz48ZGl2IGlkPSdidyc+PGRpdiBpZD0nYm9hcmQnPjwvZGl2PjxzdmcgaWQ9J292Jz48L3N2Zz48L2Rpdj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJjYXJkIGhpZGUiIGlkPSJlbmQiPjwvZGl2Pgo8L2Rpdj4KCjxkaXYgaWQ9J21lbnUnIGNsYXNzPSdoaWRlJyBvbmNsaWNrPSJpZihldmVudC50YXJnZXQ9PT10aGlzKWNsb3NlTWVudSgpIj48ZGl2IGNsYXNzPSdjYXJkJyBpZD0nbWJveCc+PGgzIGlkPSdtdGl0bGUnPvCflKsgRHppYcWCbzwvaDM+PGRpdiBpZD0nbXN0Jz48L2Rpdj48ZGl2IGlkPSdtbm90ZScgc3R5bGU9J2NvbG9yOnZhcigtLW11dGVkKTttYXJnaW4tdG9wOjRweCc+PC9kaXY+PGRpdiBjbGFzcz0nbXJvdyc+PGJ1dHRvbiBpZD0nbWZpcmUnIG9uY2xpY2s9J3N0YXJ0QWltKG1lbnVJKSc+8J+OryBTdHJ6ZWxhajwvYnV0dG9uPjxidXR0b24gaWQ9J211cCcgb25jbGljaz0ndXBncmFkZSgpJz7irIbvuI8gVWxlcHN6PC9idXR0b24+PGJ1dHRvbiBpZD0nbXJuZycgb25jbGljaz0ndXBncmFkZVJhbmdlKCknPvCflK0gWmFzacSZZzwvYnV0dG9uPjxidXR0b24gaWQ9J21rdScgb25jbGljaz0ndXBncmFkZUtHKCknPuKshu+4jyBVbGVwc3o8L2J1dHRvbj48YnV0dG9uIG9uY2xpY2s9J2Nsb3NlTWVudSgpJyBzdHlsZT0nYmFja2dyb3VuZDp2YXIoLS1tdXRlZCknPlphbWtuaWo8L2J1dHRvbj48L2Rpdj48L2Rpdj48L2Rpdj4KPHNjcmlwdD4KY29uc3QgVz0yNSxIPTI1O2xldCBOQU1FUz1bIkN6ZXJ3b255IiwiTmllYmllc2tpIiwiWmllbG9ueSIsIsW7w7PFgnR5Il07Y29uc3QgQ09MPVsidmFyKC0tcDApIiwidmFyKC0tcDEpIiwidmFyKC0tcDIpIiwidmFyKC0tcDMpIl07CmNvbnN0IEZBQ0VTPSLimoDimoHimoLimoPimoTimoUiOwpsZXQgTixvd25lcixyZWdpb24sY3VyLGxlZnQscm9sbGVkLG92ZXIsY2VsbHM9W10sY29pbixjYW5ub24sY2F0LGtzdG9jayxrbHYsZ2x2LGNwb3csY3JhbmdlLGdlbixnc3RvY2ssd2FsbGV0LHN0b2NrLHNoaWVsZCxzaGllbGRTdG9jayxwbGFjZU1vZGU9ZmFsc2U7CmNvbnN0IFBSSUNFPTUsVVBHPTUsR0VOUD02LENBVFA9OCxLVVA9NixHVVA9MTAsQ1JNQVg9NCxQVUxMPTQsUkFOR0U9MzsKY29uc3QgQ09JTj0iZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFFQUFBQUJBQ0FZQUFBQ3FhWEhlQUFBWjRFbEVRVlI0MnNXYmFiQmwxMVhmZjJ2dmZjWTd2Ym5WNnBZTjhpQmoyZGpZaG9DaGtGUllCSXpERU5KZHhoQ2JoTUVGSVFTb1VPVnZLdVVMSk1ibGNvb0VRcElLQ0FLaTJ3VXBVMlZRaUNPSk9KQ0FKM0FNbGp6Sm9xViszVys4MDdsbjJudmx3N252cVNVMXRscnFodHQxdnZUdHZtZXYrYi8rYTIzaEJuek9uVHRqejJ4ZUZybnI0ZmJaM3hvKzhoRWZUYWYvTGhtWUp3ZUVxSmx5ZTVra1grL2YrTVlYTDBDZjlULzB3VHNjZDk0WlJPNE4xL3VzY3IxK1NCV0JNMGJrdkgvcWJ4MlBmdmpIWHBJMkY3N1crY1ZYZXcydk1FWk9pVGFyR01sUTZRblNCa0tGMFNhbzJYYktFeDU1MUx1VnZ6QzY5ckZiN3Z4UG53SC96SGNFcnFhcHZ3c0ZQRnR3eDRXSDN2NE5WaSsveFlUbTI4WDZWL1dIYWVRaVM2c1JiUkRhQnRRSGZLdGdCUkZ3eHVBaUlYS0tNUUZmVjB6R3BkZmcvOEl6K3BCZHYrMittMTd6cnovNTFIdlAyS2NyKys5QUFYcnVqSld6M1NFZStNUUR2VmZ1LzRmdmQyYitvN0VMcisrTk1xbzZwaWlnTGtzZnFrcXBDcUd0QlcyUW9DS3FCRkZRQThhb09LdnFFaVRLMUtTWjJEUzF2YjVodEQ2Z0RLNEpuai95bXY3eUQ5MzYzdDg5TCtJRitPMXpaK3paczg5ZkVmSzhyWDcrakpHejUvMzdQcWpKZDJWdi9aRWVPei9kSHlTMzFtUk1KcTIyUmVsOWVXaWtMc1FGTDJyQWlRRnJRQXhpQk5IT3VVVVVncUloZ0NxRVFGREFKU3E5Z1pxVnpaQ1BUcmpWRXpuWWhuSSsvMFRicE84ZTNQcUx2NFdJNnJremxqUG5nOGkxaDRWY3UvRDNtS05rOU5tSHZ1L05QZG45dWRXQi9lcDVtektadEY3SCsyTExpVEdxaE1oZ25RTVI4QUd0RzFvZm9BMTRyMGhRQW9vWXdSaEJJb3UxRnBNNlRPd1FBV2thdkc4SkdxdjBWa08wZVpxMVd6YXNzeVh6N1lQL3M3MFgvYXVYM25uZjd6L3piRGRFQVE4K2VJZTc2NjZIMjNNUG51dC9rLzdHZXdiSi9FZERrakk1c0swZlh6SlNUWTAxRmlLREdFdGJON1N6Q3I5b2FJTWlUakRPWUozQldvTXMzeDVVQ0Q2Z2JjQ0lBYWNFSThSeGpNdGpyTE5vVUxSdVVRMDA4V3FJMW0vV2xVRnR3MnpNcEJyODh2K1duL3paczNmZE5UczY0M1ZYZ0Q1NGg1TzdIbTQvL3NDUHYvYVc5SE8vUGhycXE3WW4vZERzNzJJWHU4YUlJY1FXaTlCTUs2cEpoYWNoeVZLU1lZcEpVOFE0QWhhdkVhcUdzRHlCMVlDWVFOcExjSWtCSHdqVmduSlNVRTNtcUFiU1hrYVVwVFRxOGNVQ1dpWDBONExiM0dDck56ZmphZmpreGZxMVAvaWFONzM3WTBkbnZXNEtPUHJCUngvNHZuK3drV3ovUmp4SWg1ZjNYV3QyTGpoTGpVUU9FVWM5TFZrY1RDRTFERFlHUkwwTTd4UEtOaU9JQXh0aG5FR01ZcVY3dXhJQWc0bjZxSUt2YTlRSHJLdElrMEFTSzIweFpYcGhsL0p3VGo3S2NjTWNWWTlXRGQ0bXlOcXBkbVBOdW5vMm0rM1ZtOS8vc20rOS93UFBWUW55M0lVLzh3TmIrY0Y5M3VWeWVERDM5dUNpTmRaZ25FTWJ6K3p5R01ReXZHV0VTWHNVaTVnMjVMZ3NJc2tDTm1xd29RUnRRVDJvb2hyQUNrbC9pSXN5VkF3cUVUNFk2dHBRVElWbVVaT0dLWW1kVVZkejVoY093QWQ2V3lNMGRramI0SDJnSFozMncvWElKcjdnOG1MOUhTKzcrLzMzUFJjbHlITVIvak4vK0gxdjM4b3YvbG9sb3pDL2ZJZ1VsNHhFTVVZcy9yQmdjamhoNWVaMXNyVWhrMmxNSXdPU1VVUVd6N0JhUU5zU0ZCVHBFcUlLb0xna0pjcHpzQlpWN2JDTktnZ1lFV3dVVVZmQzVFQXB4eldXZ242L3BqdzRaSFpobjN4bFNMS1NFNEluTkJWdGRpTGtOdzNKUTJHMlordnZ1TzNiem4xWkpjaVhxL0dQL3NFL2Zzdkp3Uk8vTjVkQktDNGVTTExZRVIvRldBUFRuVU5Dcld5Ky9DU0xPbUc2eU9pdkpXVFpCR2thUW1oUjZjb2VDaUlDQVFUQjlYSnNuaTVsVnVSS2FDZUNEVXBkRkxUbEhER0t4bjBXMVpCaWQwRXZLMGlUaXYxSExpRXVNTmhhUlJXMHFhamlWUjNjdkJweUtlMWppeFBmKytwditjM2YrVktKVWI1VXFmdnpoMzcwMVMrU3ozMVk0N1Ivc0QwakxuWk1TQktjOTB5ZjNFZDZLV3UzYm5Hd2t4RHlQcXVyTmFhWm9GNVJZN3ZmUXVsRXBvdDJHNUgyY2lTT0NFR1BENkdkM0FoQ2FFdXFXWUUyaWhFSW9vaTJPT05vNGlHVFBZc1dVelkzUFR0ZnVJZ3ZHa1kzcnhGRTBhYW1pZGZDeXNrUk5JdjU0NHNUMy9BMTMzNy9wLzZtRWlsWEJ6bVk3WmUvTzVXOVAvaElmeGk5NHRKMjVlM2tvalZSaGtVNXVMQkR1dEpqOUtJdGRpN0dwRnQ5QnVrWVh5OVFpYnJ5cG5yOEJsRkJnMkN6aERUdmdRaGVGRG42SjlxNWZGQlB1eWlweStKSUpjODRxaUtxMkRoaHRoZ3cyNWx5MDRtVzhSTTdWUHNGbzF0VzhRaTBOVDQ3NFRkT0pYWTJhLy9xaWVIWmIvajg1OTg1TzNPR1o0RWw4Mno3bnpGeUZ0OWNldmk5YTJ2bUZaZjNwSFhqUzlaRU1kWW8weWQyU1ZmNkRHL1pZbnM3b1g5emowRzhTNmdhUkNKa0tkRFJvVFYwc1o4TWU2VDkzbExKbmZDNmxNc1lvVzBiRnBNcFRiRkFFT1JaUit2Q0JPbndSVC9lWTNpcXo2VnR4L0QwQnRGNnd1U0pDY1lZakkweHhhN2R1K1RialRYM1ZSdUh2L3ZlczJmRlAvVFFIZmJadmVrejQxN08rOC85ajdmZXZUcGMvTWpPT0drNWVOS1p5R0NzbzdoMGdLUUpveGR2Y1drN1p2VmtTaWI3dEMyb1BYSjNSWTgxRUxCUlREb2FZdElVRDNnRHdTeUZONEFHcW1KT09abWliWVBhN3YvcjFkcGlsbVhUS0UyQWxGMEdwM0syTDBhc25ENkpUUzN6UzRkZ0JlTUVwcnZ1MHE2Mlc4UDJuenp5UDkvMkhYZmQ5WENyNTg3WXF5cEFGZUhNZVgzd3dRZFR4NlYvR3lTbTJqdVFLTFJnSGMyNG9LNENHeSs5aWN0UEdnWW5jeEk1SUFSQnBNUDFzb3gyQ1YybWo1T2NiREJBbklQUVdmM29zU0pRTjFUakNYV3h3S3AyU1ZLZlE2T3JZQkNDdDJTeXoraW1qTzJMc1A2eWs3UlZRejJaSWRaaWFhajNKOUswVm5QL3hIcysrTUgzSlp3NWY1UnpuNjZBaHg2Nnc0b1Fidkh2ZWNmSnRlZ1YrL3V0ZCtXaEpiSm8yekxkRzdQKzh0TWM3RnVTdFI0OWQ0RDNvQktXVmo4Mk9vZ2hIWXh3L1Q3ZVBCVjBLb0FSQktXWno2bkdFNEp2RUtONEU2N3duT2NBemxBd2lnK0dMQjdUV3hteXQ2ZHMzSGFLMmU2YzBDZ2FSZGg2YnZmMm03QzFibSs3TGZyUWo0c1E0SXg1V2hJODBzaWYvTWw3MGhjWEgvaFVtdVZmTWIyd28xWkxJMUhNN01JZThWcVBkSFdEd3lKbjgwU0pyeXRFekhHeUV1MWt0MUZNMU04eDFuV056aFd4YmhIYXBxRXVDclNwTzR0ZmtlNzBlWEFjZ29BcU5vN1p2ZWpvRDBxYS9YMnEvUVc5VXlQd0xUNjQwRHQ5UXVxNjNwbjN2dnRsTC90Ny8ySzZyTFpxcnJDK25pais2RzNyYThsWGp2Zkw0SnJDWUdPYWVVVm9BLzJiVmprWU85WTJJRFFMTUFaZFd2NG9ZcU1zSXg1MkxoK1dWZURZNmdyMWZFRTluaUoxQTRZcllsMmZsL0RIbmlDRzBDd1luRkJtZXhIOUU2dTAyaEptSldJY29xMlpIMVJoZmNWdFJZc1B2VTBFUFVxSUJ1RE9PeC8yOTZpYWlPS2ZWNldvbVI4U25NR0lzdGdmMHp1OXdtSnFTUG9aVHFhb3VxWGJ5TEg1NG1HZnFOYzdhdStPcTRIQklMV25tb3lwRnpPUTBLbjl1Y1Q2TmFnaHFDT21KQnBGRkRNWW5seWpPRmgwNE1LQUx4YVV0VlhUekgrTWU5VGNlZWZESHNCMG1SLzlvUWZlOFlaaEVyNzY4TERTRUdwcnJLTmRsS2dxeWNxQStjSXlHSlNFdHN2Q25ad0I0eHo1YUFVVEp3UmRlc1FSMmhWb3lobkY5SURRMWgwZ2xPZHY3Uy90QlJDOHB6ZndGRVZLTWhyZ0NiUkZoVFVSMXMvdDRXR3B3MEgwNmllLy9RZS9SZ1RWYzJlc1lmTnlGNGh5OFIvbWVTUytXQVFyUXJCQ2VWRFFXeDlRbFpZNGN4aFpvQmdrZEUrYzlrZ0hLNmlOamlEOGNZWW1CS3JwbEhvMlIxUTdaN3V1VnIrYUdneEdHcEk4b3FvY3ZhMGUxV0hSaGFCNHBLbkR5c2tWU2FMRmR3Rjg5TmJQRzhQUy9aMXJ2Mk8rYU5CbUlXSUZHazliTjZTckl4YUZvZGZ2K0N1bEsxZDIyQ082QXRnY3hidEQ4SFhUMWZXcTZRaU80MVIzZ3o4Q0dscVNRVU5aQ05sb1FGM1hLQUdYWmdpMWxFWEFpcjdsSGxYeit0ZC90RFVpNkprSGZ2aFdHOGtyNXBNS0Y0STFZbWlMQnB0RUJCZUJXS0xZbzE0UUY1RU1oeVJKU3JpaS9NbVMyS2ptTTZycEZId0xOOERkdjZUOEtxaUhxQ2VZS0FhYmthMzB3QWRNWkxCVmE2YUhCY1p4KzlzLytzN1R4MVZnRUYxKzNiQm5YVk0xWGcySU1maWlJdTJuTkpVbGplanFkWmFTRFFkWTU5RHdWSWt6WXFCdFdZeW4xR1YxakRMKzlvU1hyaHNFWE40akgvU0lod2srenNodldxTXRTZ3dHQkdtS3d2ZjdOdTYzNWRjZFZ3RnI2dGRaQmFscnRkTFYxYmFzaVVZNTJocGNxcmc4SXg3MFVXUHdTOHNiRlN6UUxoYVU0d25lMTRnSktQNXZ6ZVc3RUR5QzNDT2lmazRJZ1N3ejFJdEExRXRwbW9EdnFqRmhVYW9ZSVk3YVZ6K0ZCSU8vVGFzQVBvZ1l3YmN0UVpSc2N3TlZJVjNOaUxLTUl6VjNyV3ZYNEpiekdkVjhnaEE2TGV2ZmpzVmwyV2lCa0dZNTJSSi9hT2dvOWppRlVCdGNuR0tBRUFMZUN1cExvVmJFdEsvc3hqZ0lSampSTmkycVhzQmlsdDJiUkFtZWtqaFA4ZG9jYTF6RUVLcWFhajZIdGtXTUVLNXNnVyswMVZWQkJSTW5KSG1PY3hFdDRZcnZCV3NOYUVCdGhMRVcyaGJqQkcxVm1xb21pSHNSZ1BualAvNkZEQk5PbG5YVGtUYVI3Y3BHNUxwR0I0OUlXREk1QnF1Q244OHBweFB3N1RHMWZXTXRMOGQvZE5scnVGNU9OdXdqenRGcWVGcWpwU3FJVll5Q0JvTkVGcngyNkZXRHRIV0YwYkQ2d1ErK0wzSFZoUTlZWFE4dUVMQ1J4VHBEVTN2RU9sUTlCdTJFTkFLaG9ab1h0RlY1REtUMVJndS9CQmU2cE01Y0ZCUDNjaVNLbDNCYk9RS2tWeUtDSUlaZ2xtRE51bVVKNzBwMWFCb2tUZlBoOEVMc1ZrL2RranYyMHRpWGxMYnNZandvMWh6QnVhWHNWVTFUek5EZ2wwM1FFWDk1STNMOU1VbldXVkhCR3lITk0rSTBKWWdRUWxnU2JWY3JoMkEwSU1GRGlJL0FjamQxa2tEb1d1K3cwc3pWdFVWVlpWdTkyc3hxVkFQZUtFRTZKWWgwRFUrOVdGQlA1MTJ2YStRWStOdzQ0K3R4ckFjRkU4WGt2UjdPUm5oQ2wycSt4Q0JRdEd1NU93K1dLOXIxSmEwbVFxdkIySEVwTG5XdjlONy92Njc4TGExcXhlS0Q0dHVLdWlpcDV1MlNqbnE2OERjMnczZjlmcFRuUkZrT2dPL1MvakhrL2hMcVc0YW02ZXFjVjhRQ2JRdEJDV1ZKV1NMamFTYW1ITnhjSWN5V3N6bzlFclNhekdpS2dvN1ExeHZTeFB4TjhSNFViQlNSRDFlSThwekE4aGp5M0I1RXVzYk1LOFlZR3QraXJwdEYrcmFsS2hkSUNHMjZkWk0zYjNqRE94c3ZadGNsRmxXTGVDRzBubVpSZFRRVjNUQkhSRzY4M1lOQnhSTDNlbVRESWVvaVF1QXB1azJmdzdNMFlHZzdwc29RVUs4Z1FsdTEwS2dtemdGbS96WGYrZ3VGNlY1dUhyTnBCQ0dFdHFvUlp6cHorQXByQlY5ZnoyV2FxMytDQmlSMlpNTUJTWnAyY1g1a0FMa0c2eXNZNDJtcUdoTVpOTlMwOHhMeG51QVZVVFNKRFEzeTF5TFM5UUp0MDM3V2x5VmF0NTBXeFdBRTZxTEVwWmEyQ0JpeDZIWFd3aEVmQjRhNDF5Y2ZESmVKVHZIbUNxR3ViWGtESTVaNjVvbGltRnpldy9zR2tZN0VDUmFORWdlQlI0Nmg4R1N2L1VTejhKQVk4U2dZSWNvVDZzTUZVUitxeFJIdko5Zk4zVUh3Mm5HSStYQkluR1hMZEtQSHBleGFIN1FqWEJCaE1hbkIxQ3gyeGlSWjB0VnlCWEdXMWdpTk1SODVWc0JNMDA5TXl0QkVVV1RWQjFWVm9qeWptbFk0UnpkOWJRQVRybU9KNzZ5ZURWY2dpdkIwODRJckxYOU56L0szSFlaNlBLZWNMWWhqcFowc2lQSVVWU1dFZ0V1Y215NWNPL0hEajNlVW1DTC83ZHZ1Zjd6RlBkb2J4QmpWUUZDaU5FSTkrR2xKM0xOVWt4Smo1WGtYL2l1aHJFUVI2WEJBa21WZHRsWjlYaFovMmlNRzQ0VjJNV2R5Y1VLV1d0clpnaEFVbHlab0NJalgwTzhubEszNXpHcytmUDluVlJIRFEzZlllMFZDRzdJL3lQb0pJcUlFSlZnbDdzZE1MMDNvcmNTVWt4WUo1b3BVZXcwV0Z3Z2RmVUtTOTBoSEF5VHFZajA4WDRzdmJXRzBvOXZWMTVUVFEveWlaREVOOUZhN3N5ZDV2cHhBZ1RvSnZYNUtVUGY3Y3E4RUhyckRtdk03V3dvUUF2OTFYb2xLR3R2Z0F5aWtvNVJ5UEVOQ2pZbGp5bkhkZFZiNjNLMXVna0dENEZ4Q1BoZ1I5VEtDeXJNbVJkZjZtTENNWHdOTlZWS094MEJETlZXTWMwaFlVQjhXcEtPOFE3YXR4NmFSbVh2SFFySnpBT3hzcVRsNzlyelhlekMvK3VHditmTlo0ejYrdXBhanFwNmdTQnFUOUJJbWY3M0xZQ3RsdXR1dHNlbVhXNjA0V24vUkRsWkh2WnhrT0lJNHhvZmxkOC96T2VJZWo4Wng1V3hPTlpzdFM2Wmx2TnV3ZXNJeHViQlAxSXN4U2RjSkJsVS9XczFsV3RxUHYveXU5LytwS2lKbnovdHVNSExuSGViZWUrOE5MZmt2eG5rcUVqdmFFUEFvMmZxQXhjNGNtb0tzRnpHNTNHSWpnd1N1Mm93Y3pRbzBLQ1oySktNaGNaNFJSTHNtaEJjVzZ5cEwxcmx0S0NZVDJySkVBT3NjMDhzMVNWOEliY1Y4ZDBGL2JZaUtJdDVqWTZkNVA1TldzMThSRWVXWmd4RlY1R0wya3Z0M1ovTDR5bXJQRUVJd0FXeHNTVlpUZGgvZFpuZ3lvcDYyaEZtTHNYSzg1ZlUwVm5aSlRDUjVqM1F3eEVRZG1qdisvb1ZZWDdwRTJoUWw4OGtVOVcyM1pPbVVkdDVTVEZ0V1R1VHNQWHFSZkNWR0VvT0dRQk5DNkk5NmRtZHFMamI5MS95bUtzTFJZT1NveDNub29UdnNHOS80M2tXajZjOE5Wbkt4TmxMYXJvbk8xb2RJSFpnK3ZzUEdpd2ZzWFdqQUc1d3Vad1FJUmszWGZMaUViTEJDbFBXNnBhZnd3cXh1Rkd3NG1qVW96WFJLdlpndXA3QWdXQWlXZ3dzVkd5L3FNYjV3Q2FsYTB2VUJYclhiT0l1dERsWnpLVVArYjE3KzlmZE91dDNtcHliMFhPRUY1dlAyOWI5NmFXSSt2WHBUMy9nUXZLb2lvZ3hPRGptOHNFdTdtREM4S1dQbmkzT3M2UmFkd3pMV1haYVNEd2FkMVpja3hndXlPay94ajZHcXFBLzM4VldKT1dvSEpXQ3NzUCtGa3Q3SkJDMExwby92a3AxYUFXTTc1QmVDWDlucW05MkplYVNwMy9sTHFoZzRINTQxSGhkQk9YOUc3cnJyM25MV3JQeWtwSmxrZzF4RDA0S0N5eHlEbTFiWS90UUYwaVRRVzgzWWZteU9HSXVMWStMQmtDalBVU01FanBjRnJoM05jVVJyMGUwVEExVXhwNXBNQ1JxV3c0OU9LVllzdTE4b1NGWXRXUW83bjd6QTRNUVFsMGFnaW04OGNUL1ZPT3RKcVNkKzZ1VnZmblBGK1ROeUpaVndsUjJoYmt2a0N3Kzg1VmR1MlpqL3lJWFA3TFVtQkNmTGRuS3hPNk1ZRjV4OHcwc29KcDc1WHNQcDE1N0dwSUt2QTllamFUeEtkS0ZwYVdaelF0dDBVSGJwVmNZcG9iWHNQMWFSclZ2eW9lUFNSejVIT3N6SU52cWQ1YjFIaldsUHYyVEwvZlc0OTJ0ZithWVAvT0NWMisxZmRrbnF6MGZ2VGplUy8vNm5LM2J4eXAwdkhuampqRFZHTUFqenk0Y1VrNHFidi9aV3hBM1plZnlRalJldjA5dElhSnNHVlRtMi9qVzFEM3EwS2FiNFJVbFZ6RHVVYUxyQmh3Rk1aS2pIZ1lPTEZTczNaMFJ4eS9iSEhpY2JKT1JiSzZBZURVb1RRdGk4WmRYTWZmYkk3dVozdmVIMjIzK2lBUFRMTGttSm9KeTVSMS83OTM5MnZ0ZHN2cldXYkRZNk1STGYrQ0FCdkVDK09XSndZc2plWDIwajRqbDEreWtPTGh4eStaRURDQVlYbVdYaXV6YXdZNVpiNWVWa1JsVVV5L04wWWVDV0xmckJoWnFEM1lyTmwvU2hMYmo0WjE4Z1c4bkl0MWJRRU5DZytNYUgwWWtobGMzS0p4YnJaMS8xcXArWXdUMVhaZEdldzZMazI5NXlZdVh5N3kwT3BtRisrUkNYeENaS0VveTErUG1DeWM0aC9WT2JyTDMwRmc2M0Y0d3ZqeG11OXhodDlUQ3h3YXQyKzRCaG1SSGwyVzgyb1JPK3JrdWErV0s1TmlPSUFXTXNvVFVzOWl1S3NhZTNGdE5mcyt3L3RzM3NpVEdqRXlPaWxSaUNRVlZwbXFERHJUeGt3MVg3eGRucVcyKy8rN2QvKzVvWEpaKzVIdi9JSDM3UDIwK3R6SDZ0RFpiSms1ZURVelZZMDdXZVBqQy9ORVlsWXVPclRwUDBSaHhjN1BKRTBvdnByK1hFZ3doeGdxZ3VteCtPcDB3aUJnbWVhckdnclJjNHBFdWtYbW5Md09MUTB5NENjZDh4MklocFpqUDJQM3NSZ2pBOHVZSWtFZURSQUw3eG9iZlowM3kwWXArWVplKzQ3ZTRQM1BmbDF1ZWY4N0wwa3g5NzV6L2FQR0h2bzVoa2x6NzlhRXU5Y0VRUkFGYWdIVmZNRG1aRUszMVd2K0kwVVo1UkhGWVUrek44QzFGc2lYdU9LSFBZMkhab1VpeHQ2NmxuVTN4Vm9hMmxxVnZhc3FWdEJJbUVkT0RJZTQ1MlhuRDQrRDcxWkVwL2JVaXkxb2RsYnhhOHB3bnFCNXNEbXc4R2JCZWpmL3JTYjNuL2YzbkJ5OUxQVk1JVG4veXBiMXhmcVg4bnNlWFc5cWMrMXpTSGg1R0pERWJNVS9FN0xxaG1DMnlXMGJ0NWczeHRCT0tvRncyTHVjZFhOZG9HZkIxQVBXMW9NV0Y1ZWNvYW90Z1JwUWFYS0hoUHVUOWhkbWxNV0hpU1lVeSsya2RpaXdSb1JBbE5pN1cyWGJ0NTVFcWJGVHVMalI5NjVadCs2LzdydGk3L2xCTHVjWExYdmUzakgzM1hTemMzcDcrYUR2UWI5eDk1VEl1TEY0TUpyVFV1V29JZWkybVZlbDVSVHd0Q1VFeWVrSXd5NHRHQUtFa0lkVU5iTlNoZDJSUVJOQVI4MitMTGlucFdVWThMNnRJVEdTRWRKa1NESGphS09xaXRnVFlFMUljUTlWTTljV3JWSHBUdUw1K2NidjNBYTkvODZ4Ky83aGNtbm9rUnpwMDdGMy9iNi83WHo2ZHA4OU5SbUxEem1TZDlkWGdnb21MRUxiMWhtYjIxYmFrWEpiNE10SXVhc21pNjZaSXhSL3RMZUFVSkhmWHVFRXhpY1hsQ2xDZllLRUlNdEVlRWxQYzBQcWhOckYvZEhEaWI5aGhYZy8vNDRlYnJmdmJzM2U4YTM3QXJNMWU3TkhYcDB6L3pUZjI4L1BtOEo5K28rM3ZzUExidDY4a1lDYTIxemlMR0xBRzM2ZGlsdWtHUExrMWRNZERzVnVrTTF0cnVWcG50ZW9DakNaV0dBRDdnVllOMVZ2dHJQVHRZNlRGYnhIODUxZlYzdmZqTzMvZzk2RzZzWHVzVnV1ZC9iZTc0c3FUSytMUC84dTFKWFAxa2t2clhNWnN5dm5DWllqeHAyN28wSmlDRUlGNjEyd2czY3JVTjdRN3pMMGxSQlV4UVdnMnFRZFVZRTF6czdHQTlrN1NYTTZuang2dDIrTDQvdnZ5OXYzVDI3Tm1GbnNOeWxVM3dHNmFBSzczQnlMM2Qxdjg5YWc3ZS9qUGZrMW45WjhZVTN4eWx3ZnFkSGZhL3VNMThNdmZHcStKVlZJN3VUVHdkTkt1b211WFdMVTVValVpVVJMYmZqOGtIR2JNcW9wSDB6N3htLy9sVDlldnV2L3Z1ZDQydnhDc3ZjTW5rQldMM1oxeGp2ZmpaZTE2VmhaM3ZaYkgvM2MzaDN1M0RORVNHbHJadWFab1dYM3VDQm53TElZQnpGbU1GNXh4eERDNkphSXhoUExNcUp2MnJJT2tIRnd6ZWYrczMzL2QvbjdwSGZNYkM4N3NzZWQwVmNLVWlubjRvd3ljLzlNTXZHVVhUcnhWZHZNRnE4MUtEUHgyMFhSTXhFV3B5UlJKVXg5MTlXdGxUa3oyaGhrKzN1SStVZnVPVHYzbkh2My9rWHBGajdpVmNKOEZ2aUFLdURBM0FpTng3MWV2ejU4N2RuMjF1WHJiNWZLZS90VTU2NldCdC8zTDdsZTEzZnVkM0YwZEV4ek54eVBtZExYMGhkNFQvcHMvL0J3ZmVRckZkcjBsSUFBQUFBRWxGVGtTdVFtQ0MiOwpjb25zdCBJTUdDPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUZBQUFBQlFDQVlBQUFDT0VmS3RBQUFYNlVsRVFWUjQydTJjZVh4VjFiWEhmMnZ2ZmM2ZGtuc3pRSUFrWUZSQVJhMURIVHJZaHJTMUR2VnBmZlhtMWFlbzFEb0xqczhKN2VXMkJiUll0Ty81VUxRdEtyYjI1WXJhdnRacW54V2lhSzFEdFZWaUZVUUlJWUdNTjduek9XZnY5ZjdJRFkwVWtFbXNOZXZ6eVQvSkp6Zm5mTTl2ci9WYmE1OGRZQ1JHWWlSR1lpUkdZaVJHWWlRK3poR0x4UVF6MHdpSm5ReG1wcVpvVkE0SE9VSmxGK0xCZSsvZGQ5R2lSYU9Hb083bzc0bFBydkpBWUthSEZ5K3UrKzlaVi82b3UrWGx2MlRmZnUzTnVaZE9QNWFJZUVlVitJa0ZPSHQyVElLSSs5Yis5YWFnd0V6dGVYN0Zab3pmNTN2d2xWYzJCRnRhV29nWk5BSndHOUhTMHNJQWtFMzJsbWV5T1krSWtIY2ROMkRMeVNzZVhYQmVJcEhRczJmSDVBakFyUWRObVRLRjMySDJNZkE1MS9NVW1BV1JrUGxjM3Bqc3dFMFBMbnl3Q29ENW9Id29QNG53ZmpSamhuM0REMzdnMWVWNnp2TUxPc3R4WFUxRUVnQVpabDNpOTVXbDBqMTA0L2ZuL1E1WXJwcWIxNWx0ZnRnbkNWeXN2bDdHbTVzOUFMajd1OWNmVnVqdCtSMGJIdVV4RXhWWk1NQVNZRkpXdXVhSXp4L2VlTTQ1YXprV0k0ckh6U2RTZ2NVbHFKcWJtMDN6dW5YbThSVXJTajg5cXZSaXpxUi9BbUMwcHpXSWlJWXBpZ3l6Q2RncWtNMmthbjZ6ZkVYVHdWVlZJbEhNbVo4a0JWSXNWaS9qOFVIRnhXYk1DSE8rZjNvdTFUK1RQR2UvMFdQR0FFUThITjc3d2hoait3TW12TjhCbno3MzBpdmVhR3hzRklsRVF2L1RGeEVlQktjQWNEemU3QzE1NG9ud3ZYTnZ1Wkl5bmE5bnV0cnY5TExwL1RLWmpFNG1reXlsSkRCdm83d0tJMkJVNTlzcmJ5RWlqbjRDY3VEN0ZMZGt5Wkp3ejV1dm5tODhaNlpmb2k2ZnoyTjk2M3J0ZVI0UmtTQWlqS3VwZ1dWWjRHMUJCR2xMU2RoVjQ3OXl5WTIzTkVlajBiOVRvZmhueUhIRlhuWlFjVCtLaGYvcnVzdXU3SDM5aFQ5Yk9yK0F2RUpkT3BQVFJNS1VWVlJJWmhaRUJLMDFrbjE5Mk5ZS0hsUXpReEJrUHRsOUc0ait1WEpnTEJZVEI3ZTBVR05SRVQrS3hjTElkWCtMUFcrbUpXaGYxL1hnYWUyQlNBd1hTc2VHRFhBY1p6TzRjVFUxc0cxN215cGtodmJabHZSVlZKMXgwYzNmVzlyVUZKV05qWDlUSVgzY3dkMDU1OFl4bE1wZURUZC9wZ0tOZDdRSDdSa1BZRkdFTnl5dENhUlRLWFJ1MmdRcEpiVFdDSVpDR0ROMjdIYVdNYlNscFBCQWJ4MTU2cG1mN2xxNDBHMU1KTXhndXYwWUFkd1MzTjN6WW5WT2YzS216dWZQdFFSWGVNYkE4N1FtZ0xZRTk3NGxSNFJOSFIzSVpiTVFSWWhqeDQ1RnNLUUV4cGh0RkdUV3BhR0ExRmJ3NHN2bjNMNG9Gb3VwZUR6dWZTd0FEazFGNGtVamU5K3QzejFvb0tQdEFpSjgyeWRGYWNGMW9aazFNVzhYM0hBVjVuSTVkR3pZQUNrbGpESHcrLzBZVzEyOWJSVXlHeVVsSU9YNnlVY2M5Nm1UcGsxTGdSbEV4R3AzYjI3cTFLbWlxNnVMR3hzYk44dDZUMFEwR3BWQUF2RjRYQVBBa2tYL2ZmUkEyNXFMQnpyV24rMVh3aTY0SG5LZTV6RkJFaUJCTzZZRll3d0NnUUJLd21Ha0J3WWdwVVF1bDBNNm5VWnBhZW5XVlVna1hLMjlFcCs5ejdyMzNyNlJnQnRqczJjckFONC9uQUtib2xHNWNzb1VIbExjclZkZGZrelFaMTFqM0h6VUlxWmNvUUNBUEFZazdlSUtJaUs0cm92MnRyYWhTZzdMc2xCZFcxdTBrdENiL2VGZ3RSRUFJQWhzU0NWOVkrb216N2pwcGg1bXB0MVM0RytYUGZ1UVVtckEwMmFKbjkwM0dob2EwcnNETHBwSUdDcm11RnN1bVY2ZjcrNjhyR1BOMjJmVVZvOGxZZGx3amZHS1RiL2FuU2ZQeHNDMmJZUktTcEFxcXRCeEhBd005T3VLOGdxcHBGQkNER1lEei9QZ2VCb01kaG5DSXUxV1pOYStGUUxRTTN2MmJOcUY2MkFDaUp1V0xTc3BZZGtXS1N1UEVBRjlmWDIzbjl6d2hlc1NpWVJvYkd6VU93TnVlRlZiTkMvMmxkVEc5b3ZhMTdlZVFjYWc0THJ3MmJZZVYxdTdSL3QySW9MbnVtamZzQUdHMlJDejhOa1d4a3pZSnltVjlhU3k3UFhHdU15a2pqS0YvSEUrUWJaaGh2WUZmMXg5eElLTFY2NmN6ZkY0M095eUFzTStuODE1TDU4YUdBaUVRa0dMZ1JJaTRxYW1KZ25nZ3dCU1V6UXFHaE1KMDVoSWFBaUp1K2Q4NTdSYzE4YUxjcDBkSndWc0JTV2x5ZWJ6TEpVU0JjZVJxWUVCUk1yS1lMUUdhUGN6RHhzRHk3WTVIQW1iL3Q1ZUtXdy9VekN5R0tHcTJWZk5tYk4rdUZXKzc2N2JKenJ0YmRNTmUwOWZPZStPWmNBZHRFZHN6RytmZWU1dDIyOVA5RndQUktMUFMrY1BQL25raHJabHk1YXBob1lHYjJ0OWFxSXBLb1liMGJ0dXVmWTA5cnhyNFJhT2c5SElPeTZURU1aelhkbXhZUU9ZR2N3TVpWbW9ycW5aYnVld2t6MnpWb0trbEJKdG03cGVaUzB1bnYrTFIxOEJlQ2dQMDdEcWI0YmZBdzBybHJ1a3dDRkFodkdMWUREMG5kN2Uzb0xQbHBXK3N0Qnp2M3pxbWJNYkdocWUzd0lpeFdMMWt1TE5IaG9UdXVtRjFzREd4MzV3Z3ZhY2EweG00RGd3bytDNEJrSXdFVWsyUnRxMmpkSndCSDI5UFZCS3dYVWM5UGYzbzZLaVlwdCtiUWQ3UHdNQUFkdVNXc2hlZjZUaWh0dCt1T2duUkdTaWdHeGlOa1NrLzk1S0xSZkFWTFBsWEpCMjdSb0d4OXlQTDE4ZUNaRDF4MkF3T0RtVlNqbkJZTkEyaGdmUzJjeS9uWFo4dzVOTlRVMFNpUVNHek8vckhSMmhQeTYrWjNxaHYzY21uTUlrRU9BNHJobXlDbHZtS0swMTJ0dmFvSTBCRmI5WFhWc0xwZFQyT29mdFhEZTBraVF0eTRZVzZuNFJxSmcxSXg1dkg0SVUzOGJRZEx1NWFIYzhZRHdlTjB1WExhc05xOERUdHM4K0lKVktGZncrbjQrSWN2bDA1dml2bmZDbDV3SGd3UWNmRENYLyt0cDB1TzRWa3ZWRXgzV2d0ZGtxdUdFUENWSks5Q2VUNk9udTN0eDZsWlNXb21yTW1KMVRJYk5oZ0lNK24vUkFyVlk0Y3UybHNWc1RnL2RScjRZbU9MdFVqSGJMc3pVMXljYkdScjMwaVNkcXcrSHlwd0wrNEpUK1pKOGJDSVVzemR6VjM5NTZkT3VLSjArU1VsMmpDQk1kMTRXbmphWmgzbXBITHJCOTJBQ0FtVkZkVXdQYjU5c3hGVEo3VWdpbGJCdGsyUS9va3FyL3VHTFdySzZtYUZSR201b01iV1BLc2xjQURvZjR3QU1QVkZidmYrQmR2a0NnTWRYVHhjbDFxK1RHbFgvcXR3UWl4akJjejlzcGNNTmJyMHdtZzg2Tkd5R0VnTllhb1ZBSVZkc2ZBQUFNdzJBTytuMVNRN1NLVU9TYXkrUHpIaG04NXZkUFZENHlnRnMyK1BmZGQ5ZkVvS0hYdTFldERPWUdrckQ4Zm1LR3hnNzJxZHVEdUhGb0FGQ0VPR2JjT0lSQ29hMHZaWVluSlNsbFdXQnBMd2xOUHV5YTg4OC92eXNhamNxbVBhQzYzUVlZaThWRVMwdWNFb2xCdi9mak8yNDd3T2xxdnlTZlRrMXpIYWRjU0FVaEZSazJUSHRBNVlJSXVWd09HenM2SUlTQUtYWVM0MnBxdHN5YkRKQUoraXlwU2JhcTByS3JMNDNOWGJxblZiZkxBS1BScUV3TTd4cm16eis2ME50Mm1adEpmejNnOTBYeStRSjQ2SWZNZS9SQ2hSRG82dXpjM0hwcHJWRTVlalFpa1FpMDFpREFrMUlxcFJTMHNwZFVUejdzbXNZUFNYVTdEWEE0T0JJUzk4eTY4dWk4NDE1am5FS2pMWW55amdzMnhrTnhjM29QanVzM1c1b3RCd0FBSUpWQ2RVME5FOEFCbjA4NG9GYmw4MTg5WSs0ZFM0Zm41dzkxSTJaSHdRbGw0ZnB2VFd0SWQ3WmZHUTc2VHgwM2JneHlCUWNFR2hvcDBaNEFOZ1JyOEd1emZ3TWJBeElDUGQzZFNQYjFRU2tGN1htNnJMeGNWbzBkQzFMMmtzZys0Njg5NTlMLzZOeFRGWFozQVE3MmUwSWdmdEgwZnlua010Zm0rdnUrU05wRHdmTXdwcnBhaDBJaHlidlRGV3poK2FRUTBNYkFjUnk0cmdldEIrMlpsQXFXWmNHMkxRZ2l0SzViQjlkMW9RVEJEb1VMTlFjY2ZObk0yWE4rc3JkVTk0RUFoL3E5V2VkKzgwU25rSnRsbk54eHJEVmNyUTJSWUdhV0h6akYzVUZ3UWdoSUtaRktwN0dwc3h2OUF5bWtNemxvclRIMGNFZ1FsRlFJQnZ3WU5hb0NQaVhaeWVjSy9uRDVzNkh4ZGJOdW5qdi9sYjJwdXVFaHQxWmhHNXFiK1h1WGZtdWZaTmZHbDRSMjluRmNUelBBeFZtY0lDSGdPZzVzMjRiUDc5L0Z0bXB3aUZrb0ZMQnF6VnE4dmVvOTlQUWxrYzhYaWsrV1FZSkFnaUNJWUJqSUZRcm83TzdoWlA4QWxNL2ZWYlgvd2VmZmZOdjhWMlBScUgxWlU1UGUyL0N3ZFZPN1hBQkEvMENtUVVrU2pxZWRJamc1dktra0l2UW5rN3ZVMkEvQ1UralkySW1YWHYwTFd0ZDNRQWlDMzJkdjlubVp2RUVtQjZTelFMYkFjQXA1c09jaEdBZ1FrOERHVFYzVnJ6LzM5UE1YbjNyaURmRkV3aW5DMitzVDlyK2J4aXhmWGx6YjJqMmltTlczYW9CSkNCUUtCYVJUS1lRamtSMEd5UXhZbHNMcU5ldXcrcjFXV0VvaEdQREJjVjI0bmtZNEZFUnB1QXdObnpLb0hjV0FJS3hlbThWcm02cmh1Z1dzYWxrSjIxTGtEd1M1NExqK3pvNzJlZDgrN2VRRDczdjhONWNRVWFGWWlQZ2pBMWhWVmNYTVRGYzNuanBKYk8vbHdxSUtCL3I3VVZKYXVsUEtlM2ROSzFhdGFVWEFiNE1BcERJZUtzdEMyTGV1QnFNcnkrRVlIdzZabk1LaEIvUUJoUUlPT093RW5IRElsU2p4TTE1LzhROUlMUDRwL3ZwR0M1V1dXT3c0bnBmdTZUcjNuQk8vWEFEUlJiT25UbFVBdkk5cUNWUHgzUThoYmYrQm5xZXh2ZDZWaElEak9PaFBKaUdFMkc0dUhJSzNjV01uVnIrM0RuNmZCVEFqVTJEODY5UktOSHorRUZSV1ZvR0VnTlllVnI2Ymcwa3p2SlJHZVBLWEVRaUc0SGt1anYzS3lWaHcvMzJJSGwrRFZNWWpaVmxXS3BOMmNzbmVDeTg0NWN1WHg1dWJ2ZWl3WXdzZlFRNHMzckNiNHcrYy9oYXI2RUIvUDF6UHc5Qkd6RmFybFJUSTVmSjRlL1ZhU0NsQkdNeHRGNXd5Q2hlZkZjWm5KNmFRZHd3OHB3RFB5YU55NGxFUVFrTFlBYkIvRENROFdNcENMdWVDL3JvWUY1NEdYUHF2TlVobEhDaXBySHpCMGFtK2dSLys4T2FiRDBza0VtWnZRZHkydW15LzJKSHFPalQ0VFBYM2J4NDNiZDJ1U0x5M3JnMjVRZ0UrV3lHZDB6ajVzeFU0NCtRZ3ZENFBoKzZidzRIVk9WQ2dFdCs0K0hJY2QrWVYwS0lVUmtVZ1Ntc1FMdldqTkZLT3N2UkxFSzIvZ3BkVk9MMkIwWGppUktTekhpa2wyU25rN1RkZVhoSERYc3lCV3dMa0N5KzgwSHIxMVZlRm04dXRWa3JpZ3p6S2tKZExEd3pBZFp5dHFsQUtnVXcyaTAxZFBmRFpGaHhuTU9mSjBQNTQ3clVLYUFPd2s4RlhEczNnMnpkY2o0T1BPaGJaQWdHQmNUQ0JzVEF5QkRDRG5RSHd5b1VRWkNBRmtCdHpOczZlZlQ4bUh6UUorWHhldWRxWVhDWjc2dTN4V1Vja0VnbTlOMDRkdmU4UHhBQng3NzMzdWtjZGRaVHJDd1JmSXhMWWthZEpSUEMweHNCV1ZEalVaZlQwOU1GeFhBZ1NNTXpZdDY0V21ueDQ4a1VIajYwOEVLYnNDRVRRaWtqbkkzQVlZRkx3ZkZVd3ZpcUFHQ0FCODlaOW9QNFdlR1dIWStEUWVSZ1lHNFcvdEFKblhuQVIzSUlESmFYeG5JSnNmZXZ0YzhCTXk1Y3ZGM3V0Q2pNekVaRlpjUE4xQjNlc2VmZnNYS2IvT0dVMGltOEE3RkJIa1VxbFVGSmFDcC9mdjluV0VCR01NZWpwVFVLSVFkREJnQitSRWovU3lSNGNQZlVMK055cFo2RVFEZ0dyZm83QTZ2c2hRcE1RcWprUk1ySS9HSUNqQ083YUoyQ3QreVVLQjEwTjNxOFJQdUdEengyQWw4L2hVOGNjaS9INzdZL09qbmF5bEVJcTJYZThzbTF1ZGwyOXVTWDlNQUZHbzFGSlJQcTdWODg4cFgzVlcwdmg1RzNMTUR6RDJKa2hnVEVHL2YzOXFQTDdNZHpWZXA2SFRDNVh6SmNHd1dBSWtiRVRjZHhwVVJ4NnhLRUFnUDcrSkx4OXpvSXVPd1MrMXY5Qm9QWm9vTzVMQUJHVTA0M0MrcWRST0hJQm5NaGhLTE1FaEFCZ2hlRVl3RzhIY01DbkRrUHJtbmVGRllrZ2xVeU9lZnorKzh0UE9ldXN2Zy9iWEl1aWRURVBQdlZVcUdmdDZ2L1UyWXp0dU5weGQ2SEZFRUlnazA0am04bHN0alZFQk0vem9EME5JUWdGRHpqMkFNSTVwMWc0ZEV3YlROZnJNUGtrU1BvZ0NNaFhIQTE5NVBld3RtVWxycnZ3S2x4MzRkVlk4OFlyOEk3OEx2SVZSNEhBWUpKZ3B4K20rOC9BdTB2aGUrZDIxRnJ2d2tnL2dRMHNKVWUxdkxaaWZMRTEvVkFCcWxnTUZJL0RMTC8xMWxIK0lJKzNwR0FBRnUzNmxpZjZrMGtFZ3NHaEJNbU9wNDJudFpRQzBBYW9HVzBobEhvV3pvdFB3Ykp0d0NwRnlJckFCQ2ZBOFU5QVlQOEdQUERqQlA2NDdQOUFRa0RaRnI0L2R6eEU2d3RRdWJVUStRMUFvUS9rcGlDMEJrSUtvd01FSVJTSWdFdzJnNWVmTGU2MHhlTjdwNGlVakFveGdRVHorL01GTXd3UGprVjRSMVdZeStXRzlpK01BRlBBNTVPRFB4dmNHdkdjQWxpN2tIWUk4SlhEMk9XZzhQNVFGWk1Sckp3QTJCVUlGUGM3dE91aW9ySVNJakFhL3ZMeHNDb09nQmVZQUdOWEFMNXlRUG9CR0RqdTMxNzVJQ0pJeTZMaWRPVERMU0x4T0JpQStPWVAvN2ZyMGV0UGIrRnM2aEJYc3dPQ0FETXBLYVZRTmp6SGdTbStXYlFENXBDVHZYMG1FaTZWV3NoMHVHcE1VeURRY281VHlDcG9CeGxyUEdqaTE1QXlFMEFsNDhGMkdVckt5cUNLVDRrekhaZys3WGo0Z3lFd004NCs4M2d3QzlDRUV3Y05lRmFEblJUSVNVTGsybEZDYmVoNzluR3cxdzVtRzRGZ0NKK3ZyeGUvZVA3UGU4VUhjaXdXdytjbVVFNUo2M1FqclhkOHRtVmJTaW1mYlVzS2xpNHZyOTIzVVJ0T0tVSDBnWDBtUXd1QWpQWmtmODc1ZlhYZHhDTXVtejN2ZkFoS0Vra0lMdkQ2YkRWUWR4YWN5T0hRVmdXTTlpQ01HWlQ0K2lmQnI4K0RQZTR3ekxoaUdtWmNNUTBsdFFlQy9qSWZhUDN0NE45d016RGFnNmZLb1NzK0RaclFpUFdac1pCd21BWnRVdmRudjM1aDYrQUtqdk9IYm1QaThiZ3AycGpWaTI2OTlaalZmM25wVkwrdEpwRXY5T2IzN3ZucG8wVGt6YnB3V29lVDdGdEtoVnlWcTQwaFlHaFNRMytidzBJclNZcWxyd0NwcnBxMWNQRWlJakxNckw1MTBwZmY2Y3RsSzMyQm9GbjV5Z3V5ZTFNN2dzRVEyRERnTDRQSjkwSzg4MVBRdWwvQk8rWk9JRGdLK2RWUHdXZ0hkT2gwdUhYL0J2WGlUSER2RzFCMTUwQUVSNEdkRkd6bElka3pnSlpYL3dDZlAyREFMUHlod0R2SEhEdTV2eWdRczFkeTRPQXBiWWlMYnJpaGYvN1BIMTB5NS82bTczeC8wZUltSXZKaXNaaWFjKytTRlpVSEhYeTBERVgrVDBrcExLVWtCcWMxSGdBUHpHUkpxVVN3OUxteEJ4N3l1UVdKLzcyYmlEZ1dqZHBFNUFWTFN4OVRVcEpsV2R6ZTFvWVhmdjgwU2tvakNFWEtVSnA4SHVJUE15SFdQQXhudjJuSWx4MkppTTN3T1IwSWNRL0lZd3dFRG9hNy96bWdOUThqK0tkclVKcDhIcVdSY3ZnRElUeno2MStoWTBNN2xMTFlzaXdxQ1pjOWJyUkdyTDUrNzNZaThUZ01ENTVxVkxINmVsVTh3RUx4ZU55TFJxUHlodmh0cmZNZmZ1eXJGQXlkQ0tXZVZyYlBzWlZTdHBSS1dGYkJLaHQ5MC95ZlB6YjErcm56LzFSczVobFRwbmdBTUtHdTl1ZWtWTTRZSXdMQklEK3krS2RJZDY0RzNsZ0E4M0lNSXRjT00vb3p5TlkyQW00YUFJSFNhOEdaZG9BSjVLYVJxMjJFR2YwWklOTUc4M0lNL01ZQ3BEdFg0L0dISG9JL0VHQm1Jd3lRbkRpcDdpRUFtTjNjL0tIdmpkQk9XcFNoczNrTUFQODFOelo1M1p0dkh1OFBoUTRMVll5Nis4YmJGcndHZ0dLeEdBMS8weWthaFh6a0VhRXZPUFhFKzd2YjI4N1Z4bmlwckZaZlBTYUM2ODhPUWJzMjRMbklIajRQaFpJRFlVdEdPR1REUERNTlFraGtqMW1JbkdNQUZZQTlzQktoUDk4RWxoYWtjbkRienpMNDNVdjlLQTFLVDBtbHdoV1Y5eXgrOHZlWEZIY1VQM1NBTy9WKzROQ2tkMmk3YzhaTjhYY0F2TFBGTnFqZU1uRlBTWUFaUm93YlUzdHQ3NlpOWC9WMFlVeHBTSm1uWGhvUXBVRWZMajJkZ1VublFvNCtIQ1VtQjFoQjVIdmVoczhkQUlNaEN4c1JLcDBJNkR6TTZDTkJrLzRkWXYxRHVPZHh4bE12RFNBY1VvWU5DeEt5WTBMZHBCandlekVsa2RnckU1bGRtcGtOL2IrQldDd21wZ0lTZFhYaXZQUE93OEtGQzdlYXNKc0Jqa2FqWXVHU0pabUd6MzVtalhFTDN5emtDenJnVS9UYXFnRnE2L0hqME5PdVF6Z2NnYko4WUVsdzJsNkU2bjRlUm51UW93NkhYVGtKeXZMQlVnTGRoVEw4NTUyUDR0Y3JPaEVwc2Rob1kwcEtTdVRvbXRwejV6LzQwS3ZSYUZRc2JHa3hld1BnWHQyRWlVYWo4cEdsUy9VRkozM3Bwcjd1N2puWmdxT1ZrcFRPdXFLcXFoS24vdnZaK05MWC9nVlYxVFhBTzNjRDZ4OEIyQUQ3bndYcysyMTB0cmZobWQvOEdyLzgyUkowZHZXaU5HZ1pUeHN1OGRzeVVsRSs2NzdmTHA5N3hqZStzVmVXN2tjQ0VBQ2lnRXdBK3ZMVHYzWlRWMmZubkd3MkF5R0U1N3FlekdVelZEbTZDdnNlZEFqMkNTZFJGKzZHTVVCYmRoVGVTNWJodmJmZVJFOVhKd0toRUZ1V3BiV25WU2dVd3VpcXFsbDNQZmFidVVPZnZUZnY1eU01YUZOZlg2K2FuMzNXdS9iY00wL2IxTHJ1cm13NlhldDZHaEJDZTU0SEo1OG5EWXVZQm8rREVIdXM0TExsODdPeUZJaFpLaUhnS3dtMVZlOVRkL250RHp6OHkvb3ZmbEUxTnpkN2UvdGVQcktUU2tOcVdYekhIV1d2L0tFNW51emNOQzJmelpVYlpoaGpJQVNCaldabUJnbEp4Z0JLQ2hBUi9NRkFYN2lpYXNreFg1Z2FtMzdWVmNtUFFua2ZPY0RoVlJzQUZ2OGdOdmJGNWhWZnplVUxwd2loanM1a0JzSkMrU3BBQk9QbWUvM0JrZ0VZNzJWZklQRHJ6OWVmOEx2cDExMjNjY3ZQK01RQkhMcUdLQ0NHSzRpWi9YZGVlWjdmM3ZlWVNRRGd2UGZTcWl2dnZEOVBSUGt0Rkx4SER6aCtySU9acWI2K1hrVzNZNjJpZ0t5dnIxZi9TUC9uN3gveXZIRHg3VEJFbzFFQkFJbEV3aFMzQ0ViVU5oSWpNUklqTVJJak1SSWpzV2ZpL3dHR09SbnVrQ0k5UXdBQUFBQkpSVTVFcmtKZ2dnPT0iOwpjb25zdCBJTUdLPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUZBQUFBQlFDQVlBQUFDT0VmS3RBQUFhTFVsRVFWUjQydTE4ZVhqVTViWC81NXozTzVucyswSVN3cEt3SmFDUkpRbTdnS0pTUVVRV3JZcEx2WTlhYlN0ZXI1WFcvdHhhdDFyRjJzZmFTNnZpZ3Q0S0tvamlnb2l5VkNJN2dSQzJCSkt3WkY5Sk1qUGY5ejIvUDJZbURtRUw0TFhlTnVkNXZrOHlrNW52dk9mem52TTV5M3N5UUpkMFNaZDBTWmQwU1pkMFNaZDBTWmQweWZjdDZqdTZEd0hnTGpqUEhqVEw5N016ejNkWllJQXdBQUZnZkkrakFTUUFjQUJvQ1hoZStWNzNieS9zdXl6ZkJRQ1J6SHd2TTY4aG9rb0FMVVJVbzVUS1orWUhBU1IreHpUeEx5WGpBZXoxV2RkSkwyWStER0RhdnpxSTFBa1gxd0IrQk9CK3BTaGZoQTZMeUI4QU9PTGlFKzBoT2FNcHRYc3ZUa25wanNpSUNPd28yQ0lmZjdUWVZGZFZXTXdNWTh3TkFON3lXYkQ1ZHdQUXIvUWFBS1BibjJRR0U1a2hPYU01ZDhSNFpQVHBqNHV5aDhLeXZMSGo4T0ZTUFAzNFhMMTUwOWZFekI1anpFVUFkdnMrei95N0FFZytkNHdIc0plSUlnYjJUakZIYXhxb3VxRlpCYjQzSVNFSi9RY013c0FMaHFEL2dBdlF0OTlBaElhRzRaNjdyN2QzRkd5MmxGS0x0TmJYK29LTTV5d0NDM1V5bXNzL0sxalJtZHhYS1RWSmE3MDhJVHJDdkRMM1ZuYTVQZGgzcUJMRkZYWFl1cmNVdXc0Y1F0T3gxdVBlbUpiV0M4TnlSc0ZqZStTalpZc0FVS3VJNlFhZ3FVTlE4a2Z5LzdPUjJqb1R1RVF5Q0FEU0VtT04wMkd4RVVGT1ptL011R3dNUExiRzRlbzY3Q3c1aEkyN2lyRzVxQVJGQjhwUlZuWUFaV1VIMnExWU1ZVVNxeGNGZUV0cnZRbEFWUWRYVmdIdWJRS3NQd0pBQ2dBVGRQTE5GcmQzSXc3N05vZSs3ODJ3enVnYlFqRUFFQlljQkdhQzFnYXRiaHYxVFMwZ0ppVEdSS0ZIVWp5dUhIa1Jqclc2Y1BCb05iYnRLOFhHd21KczJWMkNnMGVyU0JzakFHWURtRTFFMVVyUkpnQmZBTHphdHUzdHZ0eXhZeUllRG1BdGdFd0EybjN5U3NmNHdOOEZZQ1NBeHU4YnhETUNTQ1J0QU5EaWNrTkVRT1RWUkRFQlJQRFlObHdlRHlDQVVveU0xRVJrOVU3RmRaY09SMTFUQy9hWFYyRHo3bUphdjJPZjNsbGNSalVOemZHMkxaY0R1Qnd3WU9aU0pzb25rYzg5eHF6eEJSdVBiMjFaQU9CUXlpSUNRSFE4UVl1dzI5Ynd2UzRlUUVNQU5md3dBRFFHSlFCd3FLcWVqclc2b1ppaGpZRTJ4aGQxQVJXZ1dLdmJneGFYR3dEZ3NCUXU2dGNUd3pKNzQ3YXJ4cXVqTlEzWWRlQ1FiQzRxTVJ0M0ZVdlJ3Y09xcGMzVnd3QTlBTXdFb0JYekxpYjZVb3NVR1dQYUxNWE9lNmFNUTNKY05HSVNJa0JFRUJFNExBc1ZOUTB5ZC81N1pHdnRkZ0xHOVFQalFPTUYwT1FUa1YxUjI2RDJIYXBFZHAvdWFHcHBnOXZ0aHNQaGdNanhtODFFN1pZaUltaHVhWU16eUFGdERIb2t4YUZmajJTNmN0UmcxZGpjaXJLS0d1d29MalViQ290bHk1NEQyRjllb2JReGd6UXdLUENlTWVHaFNJZ0tSM3hNVkR1QVFVRVd0TmFCalF6R0R4QkFCckNIaWRacmtWRkwxMjdWUS92M1ZFWUV4MXBhRUJZV2R0cWJlMnlOdUtod3ZQbkpXcno5MlRvenNIZDNrNU9Wd1lQUzA3aEhjanl5MHJzanUxOVBubm5KQ05RME5xUGtVSVZzM1h0UU51MHFObHYySEtBajFmVUtBR3h0NExFMVhMYnRkVTVmY3VQeHVxOC9yTGNHNktSUEVkMHBvQ3FTQUw0ODUwemdUQzVNQUtDTitUMFRmYkJtK3g1WnVXa1hKdVprb2FxdUNlSGg0UWdOQ1lFeDVxVGd4VWFHWWZ1K1Vqeng2aEp4ZVR4Y2RPQXd2N3ZxR3ppREhPalhJOWtlTnFBM0RjMU01OHhlM1NrMUlRYkRCL1dsNFlQNmtybGFlR05oTVdiOGVoNk04Zkl1RWNGU2pGQ25FeTB1RjBBRThscTZBQ0FQME1jWGpkMG5BY3dmMlRVQSt3ejF2am1iWlA5TUFHcmZBcFlKOEQ0UlRadjN6Z3BQVkhpSUkzZEFiOVRWMVVFcEM1WlNNR0o4Ymd0WWlwRVFFNG1keFdYNDJUT3YyaTZQeDFLS2R4RW9YMFF1ZHJrOXZRdjJsVm9GKzByeDZvZGZJU284MUF4TTcyNXlzeklvdTE4dnZqQ2pCOFZHaGg4WFRwa0p4MXJkK0daWENRYjJTa1ZNWkNqazI5VEcwc0FLeFZ6SVJHc004SVhXT2gvQWtRNkFKVmlNbVdES3MyMXhBdGlqRkZacmpVMEE2Z0tBNDg0bTU1M0o4djNWUUJRUnJSYVJRVUdXOHR3eWFaUjFSZDRnU29pSlFrSjhQQ3lIMWY3SjljMHQrR0ROSnBuMzFuSzc0VmlMZzRrcWpNZ1lYd01pMk9IQVFCRWVDMkM4MFpKclJKSUNQekExSVZiM1NrbWc5VHYyTWtUd20xbFg0SUwwN3ZpZmRadXgrS3RObUg3eFVOdzdheUoybGh6RzNmTVdRaHR6QWhjVFVhTlN0RmxFdnRKYVZnQklaY2J6eGlENUJOTmpxaEtSRFNKWUJlQlRBQVVkcXJIekFqQ3dKazRtb2tVaU1nb0F1c1ZHMlRuOWU2SmZ6MjZVa3BoQUxXNWJkaDg4Skt1M0ZGSHAwV3JsQ3lvRlJ1UTZBSVVCcGR4eE1VSXBOWVNCQ1FaeXNURW1Xd1RoN1M2aUdMK1plUVg2cFNWaFgwMHQzdlVCT0NhN0gvYVdWK0tuejc0QklzS3pjMlpMVFgyVGZMMTl0OW0rdjR3cWFodlU4WUI2dlNNdDBXbFBHQjJIaFI4Y2dkYUNpUEFnYm14eXR3Y2d4YVNOeUpzaStIbG5rdlBPV2lEN2Z0b0FnaGlZQzZhZkd5UHhwMFNjcVVZRTgwWGtDUUROQVowZENyam55ZmltaDFKcUNJbmNZQnN6M1ZJc0QxMDdpVlBqWTVHU0Z0Y2VoVVdBdzlYMXVPTVByd01BMXY3MU1mVHIwUTIxRFUyb3FHM0U3dExEc25YUEFiTit4ejdaWEZTc3RCRmNsQm1CejVlT29NSWRCbU92K1J5OTBpS3c5cE9aMkhXZ1VlYmN0OG9VN3E0UmtmYXE2Q3R2cnRwZXU4dXBMS3N6aGJxZmZBbUEyd0NQR1NNWE1QTWRsbEp2SytaOHhieERNWDl0V2VvTkIvTnR4c2dnRWZtMUR6ejIzUU1CVWM4T0lIZmw0Mk1Gb0ZScnZjUTJKcTZqQmJuY252YkxIeitJQ0VZRXJ5NWJoYy9XYjBkTlF6TlNFbUp3K2ZCc2V1ejJXV3JPZFpNc0VaQXpTTkdDSnpNcExqMGVDNWRWQVFCRzVLWWdOU3NCbDE2Y1JyWTJTZ1RXYlRjT3BPZ29weHZBeGN5WUUxRHRuSFVROFJOcENvRGZBMWdJWURtQUlOL2ZqeHBqNWh0Zy9vblo0M0UxN3BtaW1nUllwbi8zUHlLaThTS2lBeGRQMzBiZUR1V21ZUDZTbFppL1pDVzZKOGJLUlgxNzZzSDllL1A0b1FQcDY0STlaRVF3WmxnTXNvZEV3WFBZWVAybW93Q0FjYU5USWFLd2ZtMDVkdSt0Z3pOSTRTL1BqY2VnekZqcjNnZlhHQ2EremNBOGQ1cklmY1ptZ2dId09JRHJBVVFDK0RnZ1RhQ0FNdzhUa0ZkeFFNcWd6L0o4eGdid0FoRk5FaEdiaUt4T3B4T0tZV3VEOHNwYUtxK3N0VDVjdHdWUHYvNEJRb01kR29CS1MzWkNoenV3ZDJzVGR1NnFnYVVJbzNLVFFRUjh2Y0VMNk9Ec0JGZ3h3Ymp5c3Q3MFh3K3RJMXViSHNIQlNHbHJ3OEZUTllUNU5OYW5BUXowbDFqd1dwb0FtQVRna2dETDBRSDhFT2p1Y3BiNXFBMWdEalA5WEVUc3EwWmxXMkhCVG1qZHVaVE0xc1lRRVpqb1hZZFNMeWptM1c3Ymx2cm1WZ1ZBdGhjMVFUa1UxbjlUQnR0akk3TmZMUHIzandVOGJueTU3aENJZ1BHanUwT1VBd0tBdmNpUXlPbHBqcy93L08wQVFnRnNCTERNMXhsWkR1QXpYL0V1T1AvalN6OTRWeXZtZWNhSXZtYnNFSFhuTlJQUjV2YWMxR1VEblVRYmcvQ1FZT1JscFVORVJJQnNqOVp6dERHREhBNWtNK04rWnFKTk94djFzb1Zsc21GckxRQmc3TWdVVUZRSXFnODJZUDNHSXhBQlJ1ZWxBTVRZdExWQ1BCNGpTbkdGeTRVakFjYlJhUmYyYi91N0FOSUJQT3A3L0d2ZmpmN2hheDJkN3ptSDMyMkhLdWFGMmhnenRGOVBmdkRXYVZUWDRqb2h0enNWejdnOUhzeStmQVFmUEZxaksrb2EreERSWDBUa0RvOEhCUUFLaUNRVHdFK20vMnliT3lURVVnQjQ3S2p1cEt4d0ZPN1pqNnJxVnNUSGhtRDh1RFNROXVERnYyM1hBQnhFc2dKQVcwQUcwV2tMOUlPeUdzQVVud1ZtQVpqaFcvTVRQaTQ4SCt2ejAwUXFNeTNSeG9UMjZoYUgzOTB4Z3hMaVkxR3dyeFJHQklyNURPMDJndHZXaUk4S3g4OW5Yc1lpb29ub05nRERmSW83ZlRuZGNvOHRRWTFOSGtVQXpYMTBuYjdqUHhiYjgxN2NZZ0RJNEF2alVWN2prcHV2WDJxdnl6L2lZS1kyMjVhbno1UUhXcDFRMHZLQjlRQ0FZQURyQUh6U0lUVTVwNk9FQkNDOGhtbUpNZEk5Smp4VVAzSG5USldaMFFzYmR1N0h3L01YaVloUVo3YUltZERjMG9acDQzSnB5WnJOMkZDNFh6SHpDOGFZVWI0MXVnQk1ac2FkWWpCYmdNRWxCeHVENTcrOHZmMGU2L0tQSVBPQ2wwa2JzWWpJWTR6TUJyRG5URjdXbVR6UURTQWJ3TFcreDQ5L0I5ekhJaUpWd0l2R3lEQ0hwVHlQM0hhMXlyc3dFd2VPVk9PZTV4Wkk0N0ZXOGlmTnA4dUFsR0lZSTFoYnNCY0VnL3R2bktJc3BUUWdJeGk0MVVjUkZnQXhCaStKdDNPZDVXQytNU2hJdmN4TVJRRHNsbFliMmtpelpkRW5JaklXd09LQU5Bem5DcUFmcERnQVRtOGIvcnl0andGWVJDUVJvU0hCRWFIQjVwZlhUNkpKbzRlaDRWZ3I3bmx1Z1pSWDFwSlM3QkVSOTVtUEhMd0FMLzV5RXpidTNJZThnUm00ZHVJSU1rWU1NVDhKSURhZ05lZlBNMHM4eGl4MHUvVi9HQ09EZlBRME5DUUVtYll0a3dDc1B4M3ZuVzAzQmo3Z2N2SHROTUk1V3g0UkdSRnhyWGorZ1I0dVYrdEZEYzJ0bE5tbk40TVl2M3J4YmRtMjk2QW94VzFhbXpzQi9OR1h1Si9TNGtXOFBOamM2cElGeTlmUW9ENDljUGZNeTNsRmZvRmRWZCtZU0VTL0U1RzdPZ0FTZUNxb2ZYcWh0ZlU0bzlLZHRZYk95Z1lBOWFjTDZaMkl1RVlwTlR3eVBPU25MYTB0aTBPQ0hQMTZwbmFUbUtnSWZ1cTFKZkxwK20xYUtXYXR6VTBBM3ZjbDcraU1GVElUcmRxeVcxWitVNERVdUNqY2M5MGtKU0thaWU3d0JaVEFxc1pmU3VvT0hlMno3Z2Z5V1FKd3Jyem4zLzFzWS9TS3h1YldQKzhzTHM5eGhvUkthcmRFZm1YWktyeXk3RXV0RkZ0YW00ZDkvTlB0ZENWVWg0MXNKTkIrSTBLdkxGOGpCOHFQWVBxRVBNckpUSWMyaGhYekM2ZFp1d1NBWnM2Rmp6b3IraHd0ejgrWDNaaHBxVEVTbnBZWTQ4NUs3eUhkazVQb2s2KzM0dkZYM3JlWjJUSkdYZ0h3bU84OTlsbXR6Wmk1ek93cVBIQkVscTdlQ0FYQi9iT3ZVcFpTV3I0TktCcmY4YURUMlI3RUJKcDdaMXRoQU9Ba292ZU5rWjZSWWNINjhUdG1CZzNPNmt1YmkwcHcvNThXMmdLeFJHU2xpTnp1NCtXenRZVG9TR0NGaUx4RVJQem1aK3Z0bmZ0S2tKdVZnZXN1R3hrWVVPSk93YWRucTlkWkFlalBCYW1EdVV2QUlUaWZBandGd0JEUjZ3UU10eFRiRDk5NnRSbzllQ0FPSEtuQ0w1NTlWVGUzdEZsRXRFdEVacDVIVmFQYmdBZ1JlWXlKNmlycm0vaXR6NzZXcHFabTNEWGpNazZLalRKR0pGRVIvUzRnSWdldS9WUjZuVGVBS29Cd0JVQ00wK2xNaDlPWkRpREc5NXg5aXA2WnY4Wjlrb2xtR1JIUHZiTXVzNlpjbk9OTFYxNHo1WlcxU2pGWEd5TlgrYzRrenJVMEZPMnQyZXZFbU44eUVYK3dicXZKMzdFYktYRlJ1T2RhYjBBQjBlMitnQ0lkMWg0T29Ec1FuQVlnS3VCdjV3d2dCYlNrZWpMemIxaXBkVVMweCtWeUZjSGxLaUtpUFVxcHRjeldyd0NrZGVnMlc3NU83dTJLZWE0MnhyN3hzdUdPbXllUGg4Q2JybXpkYzBDVVlvODJaanFBZlozTnUwN0RGVFlBTXNDZlFWVFk1cmI1MWVWcnpOSEtha3dibjBzNVdSblF4akF6LzhrSFdnb3ozOGVXdFpLWWQzdXJqclk5UkxSYktiWFdzb0llU0U1T0RuM25uWGRPR3p4UDVYcitIWHFRbUxjWlkzNXJ0QjRwSXZHV3crR3dMSWREUk9LMTFxT01zWjlnNW0wQWZ1bDdqejhBWEthWVg5TEc2RXVIWnFvNVA3NFNZV0doZVByMXBmTEorbTNhVXF5ME5qL3gxZHZXK1lBWEVFMEZnTXNZY3g4ejBicUMvYkx5bXdJNG1IRC9qVk9VWW9hSURDZkNZbWJlWW96NWc3SHRDV0pNaWxJcXhMS3NZQkZKMGxxUHNtMzNVMGVPSE1tWk5XdVc5cDNscU00azBuNExDZ0h3UHdDbWlER0lqVXUweDR5N2d2THlSbkZNVEJ3RVFGMXROWXAyRlpndlB2OVFEcFVmakNHaXAwVmtCTHhqdmYyWjZCMXRER1gxU3NhRHQwNmpoTGhZL0czSlNyeXk3RXRSaWkxYm0wY0J2T21ycisyQXRYQkhTakFpTUVhZ2pXay9FOUhHd0R1emRCemQrR2U0UDRYZ0V3Qlh2TEo4cmM0Wm1LRnlzakp3NjVSeCtOdlNMOFJTYXJxdE5VTERJdXd4WXlmU2lGSGpPRDQrQ2N5TWhvWjZGR3pmcUZ1T05jdVBiN3o5bWJDdzhKOU92bnpvcGxPVmxkWkpJcEVBOUhjaVRBYmdHVHZoU212cXRPdXQ3T3doQ0FweVF0czJRSUJpaFpHako2aXAwNjdIZTR0ZWs3ZmVuRzhUMGRVQVBnRFFTMFNpQnZUb1p2N3l5NS93Z0l5ZWVQZUxmRHkrNEgydG1Oa1llUmJBSTc3UGJUdUZSZFg2ZndsekJpRTh4SW1vc0pCdlJ6c2NGaG9ENWhLZFFLM0x1eEcyRC9TYm1Yblgvc05WTVV0WGI1STVxZDJvcktJR0FNaldXZy9OSGNNenJyM1Z5czBaQ1dkd01HemJTM2xLS2VTTnVOaHl0YldLNVhEa3RMUWMreUtqYjlZSHhmdDJWVDM4OE1QLzllaWpqd1phKzNHKzdlZWd1VVQ4SkJIY1UyZmNISFRKeENrWTBHOEF5a3BMa0w5K05Vb1BGZ01FOU9yVkJ6bTVvNUhhdlNlVXN2RGhzbmZ3L0I4ZTFrU2tmRHNsUS92MXBINDlVK0MyTlZia0Y2Q3B0UlZNN1BGWm5qbEZWZU0vU29nVWtabEU0Q0hwYVFnTGNjSVpFdFRPTDRvWngxcGRXRnV3RHlKaWlHZ1J2aDF2SXdMY0Fwa3NnclNvc0JEcG01WkUrWVhGQUlDSms2Wmp5clFmWStDQVFTZ3JLMEgrMTEvaDRNSDlnQUE5ZTJVZ0oyOE1rcE83bzdXMXhiaGNyWHo3cmRQUTFOd0lKcHByakhuNlpIenQ1OEpVWW00R29NZGRPdGs4L2NjM1pNbEgrWExQZlE5TFZIVHNDWlA0TVRGeE11ZStSK1NqenpiTHlqVkZNdXU2bndnQW01azFUalBCLzgrODhrYU9sNmZtdlM1TFB2cEcvdlAreHlRNkp1NkUxMFJGeDhvdjduMUlsbisrVFQ3K2ZLdTU0YWFmdWdGNG1MbkpkOGpXanRseHZNUE10eGhqd3VMaWsremhveTYxNG1QanNmcXJUL0hIWjcwTjZiajRSR1QwellLSVlQL2VRdFRXVk9INVp4OEJNK09LSDAzSHpPdHV4ZW92UDFWSGp4NUN6OFE0REVoTmhBcXlFT3dNZ3EwMTVOdDVIazJucUdyRXgyc1NNQWpFZkpKUmFaOHBCc3psSEhkUElrS3J5NlBFMXJUM1NCWEtxK3NSRVJtTnNSTitoSVQ0QlB4ajdlZDQ3cG1IQUFDeGNRbkk2SnNGSXNMK3ZZV29xYTdFQy9NZUF4Rmg4bFhYMGpVelpqdFdyZnpJUG55b05OeXlySnR0MjM3U2o1blZvZk13R1lCa0Q4NmptSmc0dExZMDRhOHZQUXNBdUhCd0hxWk92d2tob2Q2SnJKWmp6Vml5ZUFGMmJOdUl2LzczczhnZW5Jc2VQZEl4L3BKSmVIdmgzeEFkSG9xYnh1VWlLRFFJQ1VreEp5UDg3MXBVeHlaclZVVWQzQzF1L0g3SlNoeXNyRVgya09HSWkwOUNXK3N4ekgvcEdRREFvT3hodUhyR0xRZ044dzVEdExZY3c5SjNYOGYyTGZsNGVmNXp1R2hJSG5yMTdvTkxKazZtTnhiOFdVUmtNb0FuL1pnRlZoalJJdElYQUhYdmtjNmhZV0hZdHVrZmFHcHFRR3hjSXFaT253Mkh3NEZqemQ0NWNhY3pHRk9uMzRUeTBnT29yNnZHaHZ3MXlNam9qOHlzaXdBQUpVZXJjYml1RWRFNkZGYW9FOS8vSERtaHZxa0Y5WTB0S1BFR0Q2VDE3SVBRMERBVWJQc0c5ZlYxaUk2Snc5VHBOeUVveUJtZ2x4TlhYVE1iNWFVbHFLMnBSUDdYWDZGUDMwd015THlRQVpBeHBwOHYyVzRBUUlHMVg0eUlSRElyaElWSGdvbHdxUHdnaUFqcGZRWWdKRFFjTHBjTFNpa29wZUJ5dFNFc1BCTHBHZjFCUkNnckxZRXhCakd4OFQ3M2NjRnQyMURFWVBLUy92ZDVNUUdLR0c3YlJxdkxEUkFoUENJU2lobUhENVdDaU5BN1l3REN3aUxoY3JVRjZPVkNhRmc0MHZzTWFOZExhNDJZbURnb3BTQWlrWUF6eHI5TGZFSnJpQUorOVI4cG5xYXQzcDRiRVhrWldDVHdSajhvT1NHUEV6bE5rK3RiRE9qNDkxTEhQTkQvbHpvaWFqQmF4emMzTmNJWVFmZTBYaEFSN050YmlPYW1SZ1NIaE1EVjVrM2Jnb05EME5SUWgrTDlSUkFSOU95WkFXYUYydG9xUUFTaHdVNDRIUmEwR0lpZ2ZYN3dMRnJYN1Jzb0lqQnlkaFJBUk5CaTRIUllDSEVHd2RQU2l1YW1SbWhqMEQydE4wUUV4ZnVLME5SUWo5Q3djTFMxZVhOS1ozQUltcHNhc1cvdkxxOWV2VExBU3FHMnRocGFheEJSZzRpcnpnK3pGVkIrTlJEUmJoR0pLenU0M3d5OGNLaTZjSEF1b3FOalVWOVhneVdMRnVEcUdUY2pQTUxiSkc1cWJNRDdpMTVEUTMwdG9tTmlrWk0zQmg2UEM0VTd0Z0FBMHJ2Rkl6a21Fa0VoUVlpT0NEM3BGT3ZweEdQYnB0VnRHd0FJQ2JMWVlWbG4xWHBqWm5naVhBaTFMS1IzaThmVzRqS1VsKzdIb094aHVDQjdHR0xqRWxCYlU0WDNGeTNBdEptM0lDSXlDZ0RRM05TSUpZdGZRMzFkTlNJam81RTdmQ3hzandlRk83WWE3MjE1dDlhNm9XTVU5cGRQSHdBWXRXM0xlc2tiTlFIeHNRTnc1OTBQNEtuSEgwRGhqczA0VkY2QzNoa0RBQUdLOSs5Q1k0TzN3My9uWFE4Z0tTa0ZWUlZIc2VxTGp3RkFWemMyeTE4Lyt3ZllZamlEZk1QbzFCbnFKNENBeTNJSFdUa0RlakVFMkZCMEFKOXQyR0ZEQU9sTU1QS2RrN2pjSGhqYm9LYXhHUUJvMjVaOGxUZnlFc1RIeHVPdW44M0Y3eDY5RDBXRlcvSGk4NDhnUFNNVElLQmtmeEVhNnIwR2R2dGQ5eU01T1ExVlZSWDQ0dk1QeFR2cUlSOTB3T3c0djA1aTVnWUFldlM0Szh4VHo3OHU3MytVTHcvOCtpbUpUMGc2SWVGTVRFcVJCeDU4U2o3NmJJdXNYRjBrVjArL1VRQm9aajd2aERjMUlicG81Yno3ZnJWeTNuMi9TazJJM24yKzl5UHZtdlRJTVJQbHFYbXZ5WHNmcnBkZi83OW5KREV4K1lUWEppUjBrL3ZuUHU3VmEwMlJ6SmgxaS9IcDFRQWdLUkN6azVWeWM5ZzdvK0tlTXUyR29JbVRya1ptL3l4VUhEbUVqUnZXb2F5MEdBQ2hSNjhNREJrNkFrbmRVc0RNZUcvUkcvanpuNTdRekt5TU1ZdUo2QkF6RklQUHBiK25QVnEvREdDbjcvRkFoMUszblV2K2FHRFlHR2dSU1dYbUdjWVkvYU9wUDFhWFQ3b0dXUU1Hb3JMeU1EWitzdzZsQjRzaDhITDU0S0VqMEMwNUZjd0tTOTlmaUQvTis2MmJtWU9NTVhOOEo0WHRwUnlkNHZEbkhTS2FLU0tla1dNbVdsT3Z1WUdHRE1sRlNIQW90TkhlWXBNWkhyY2JsWlZIOE03YnI4aDdpMSszbWRsaGpMd0Z5QTNubmNVUjRZdUhIcklBWU1Kamo5a2kzMGtldVpDSXJoY1J6L0JSbDFoVHI3bVJoZzNOUTBoSUI3MDhibFJWSHNXaXY3OHFpLysrd0NZaWh3Q0xJREtyWXgxTXAyaG5XUUJlSjZKclJRU1JVVEgyeU5HWFV1N3cwUlFiRTA4QVVGdFhMYnQyYkpVdlYzMHNWWlZITFYrWFpDR0FXenIwRmM5VkFrL0p6dmNmYVFMWHNvQ0liaEFSUkVSRzJ5TkdUYUM4RVdNcExqYUJBS0MrcmtZS2QyNlZMMWQ5SXBVVmgvMTYvUjNBVFFHZCtVNFBudC9EekJYSGNRbVJnS2pqdi9jZkFmQ3pEcHZ3UTVQQWRkM3RXL054ZXRHSmVsVUF1T2NVMkhUcTlBMEFFcGw1RGx2V0NtWXVoM2ZtdVptWnl5ekwrcFNaZitHZEUycTNsQi95MTUwRTZwWEF6TDlncnc1bEFYcVZXMTVkNStEYkw4NDRwVkYwOWpzVC9CSUs3MWVjd0RlbDBIS2ExLzZRNVh2VjYzUkhsNEZIbnYvWDVEdlJpODZEUi81cDMxUHd2OHlQLzBwNmRVbVhkRW1YZEVtWGRFbVhkRW1YZE1tL3BQeC9CYjgvZmNVWjNVVUFBQUFBU1VWT1JLNUNZSUk9IjsKY29uc3QgVUM9IjxpbWcgY2xhc3M9J3VpbWcnIHNyYz0nIitJTUdDKyInIGFsdD0nZHppYcWCbyc+IixVSz0iPGltZyBjbGFzcz0ndWltZycgc3JjPSciK0lNR0srIicgYWx0PSdrYXRhcHVsdGEnPiI7CmNvbnN0IElNR1A9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBRWdBQUFCSUNBWUFBQUJWN2JOSEFBQXV2a2xFUVZSNDJ1MjhlWlRsVjFudi9kbDcvK2JmbWV1Y21xdDZuanNrWkRBa0JOSXRZZ2dnaEtFYlZGNm5xeUNJQ2c2dkxyM2M2a2JVSzc1Y1FFVmZRT1ZDY0tBN0txSVFNRUEzU1NCQVpwTHVkTktkN3E3dXJxN3hWTldaejIvYSsvMmpPaGk4RVF4YzcvS3U5KzYxYXEycVZhZCtwODUzUC92WmV6L2Y3L2VCL3pPKzdSRC8zbTlnREFJTUhEZ2dEdTg2THZidDJ3ZEhqNG1qd0o3RjR3Ymc4Rk12dnZUTnNjT0h6VUV3VHowQ2tQdjJJWFl1M0NqMjdJR2p3Qjcyd0o2MUYrelpnejV3QUE0Y09HQ0VFT1kvTE5yR0dHR01rZWJJbEdXT1RGbFRVOGp2L21rS2hJWGxlUEFzSGpNMWhUeHlaTW95WmtxdVRjNS9nQWd5VTFQeTZCN2szcjBIMDJjQXpRTEMvZ08zMXBLd04remJ3YkJRN2tpakYyMU5lNTJ4TE5QME9tM1JiYTBTOTNxUXhtaEVPWEQ5WXJQVlpqWENhalM2QzBySnByTGNldWpMbFhLbFZpemxpcXRoM3AveEs2WEY4dGpJZzFoamJmek5TMEtJM3RQZi85Q2hmV3JmdnJjSTJKTjlOOUVsdnJlSU9hUTRjTXlJZ3dmMUpUQThPTFdUdVJQWHQrb0xrek96czd1NjdjNjIxc3B5MGVpMDNPd21hbkZ1aGZuNVJlWVhPM1NTR05lMVNHTk50OVBEb0pGSU91MHV0dFMwdWhHZGZrYVVhSXlRdUs0a2x3OG9CajZENVFLbGNrQnRzRWFsWEdSNHBOd2JyRmJxYnBCN2VLaGF2aWMvdXU1elZGLzhzQkFpZWRwa0tTRkU5cjhDSUdHTTRha1pNZWI0MXU2SnUzLzA1S09uM3ZENDZRc2J6NTJmNTh6NUJjNU1ML0RFby9QOHB6ZStrbC8vN1ovbDlBTmYxSzJGbmprM3UyanVlZUFrZDMvOUhFK2NYaElhVE9DejlqUURFeE1qWFArOHJlS3liUlBrY2dIenkzMXovLzFQME9wMFRLZmI0Y0o4aXd1ekt6UjdLUjZJdklzYXJubU1qWllZcVpYWk5EbkMyR2lGMGRHaFUxZGNkZlZEeGN0dnVCTUtoNFVZbWpQR1dFS0k5TjhUSUhFcGNXSTZUNzZHeGEvKzlKMy8rTm05bnp2NmtMdXkwdURVbVhuT1hvelRNMzFEMmZQRlQvL0l5OFZFSlJKYm5uc3RlMTd4VW1GNVFLOU90akpOL2Z3MFgvemlReXdzZGRsNTlSVllWcDc2eFZOODM5VWJtTmd3Q0doUUxpaWZxQlBUbUY4aVNWc3MxMXVjUGpYRFkzTVM1Vm9zVHMrYXUrNS9uQk5QTGhpZFppYVh3eFJDenhvcU9seStmWndYdldRdjErOTkwWm5xdXAzL1JRVGJQNzQydDVqLzZRQVpZd1RBbXo3MElldVBYNy8zcit2VFgzLzErMzc3OS9uYlR4L25WYSs0SnYycDExNGxBNnNyVDU4K3h6MzNuK0hVUEJ4OC8zOGp1dkFJNy8rZDM2VVJiT1RGci93aHJyajZSaVlteXZoMmhzcnFkRS9mejcxMzNzWHVGenlmWWk2ZzMyc1JHNFZTRnNMeWtKYURVcEtvMVFJbmowM0kvTEhQVWR5eW00RXJmNGJzN0YyY1Bma3dYLzdhU1Q3K0QvZnpwZnZQRUVoTjZGbGFHbVBpWHFLZmY5MkkvZDQvZWk4akc2NSttMVBjOUFmR3dMOGxKNmxuQTlDQkF3ZWtFTUo4L29QLzlTTnA4L3pyWC9iOXIwdisrcXNYcWNlV2VNSGxRNnJaaW9WYlhNL083N3VLNjc1dm5QamNBN3ozdi8wRlk1dDJzbUhIWlF3TTFIRDdGemozeENNMDVzL1FibldZdTdqQ0Z6NTdsTi8rbzZNMEZzNXcrZTR4dEFySWRJd1VCbUVNV1JvaHBNSUlRYlBaSXJmaEJYZzVuMC8reVcvVFhtMHdkdGxlQ29VS2s1V0VHN2JuOFMzQi9hZVdXZXhFd3JacytkcFgzcUNlcy9OeS9kQURENWdiWC9xRE45OXkwMzJmSEZtM2VlN1FvVVBxOE9IRDN4WWs2OWxFanhCQy8vSHZ2cm5zeTk2clAzSDd2WHA0Y3AzNnN6ZnVrcmY5N1ZFKzhQR3Y4U00zNzBaWkdZK2YrQWFUR3paeDJkNWJ1R0wvTldUeGVYYmY4SEx3Tmx5YWt4N0ViYnJkRHEzNUdUNTg2alA4MGkvdTU1cU5oaTk4K212OHdLdHVacUJZSUVrTXluWFJKaWFKRWxvWDcwTTBuMlNwdGNxRmhWbVNLTWVmdi9lRFBITC9NVjd5aGgrbkdGYXAxSnI4OEl0R1NYc05IbG4wZU12cm5zY05MN3lSeDA1K1F5S0dkSFBtWENLekZmay9QUWRkQXNqODVmdCtlK2lhWGY1cHQ3YmQvK2dIUDhnMTYxTXh1bWt6eTJhUTBaRTh0Y0VxY1Nxb0x6UVJ1c0dHeTIra2NmNnIzUDJQbjBYbk5sSWRYOC9RMkRpRmNvaHR1OHcvZVpvN1AvTTN2T0xsVjJKMUwvRC8vUDdmOG1ROTVLYWJyNlJhQzdHbHhrcDdPQ3hRY2xjWjMzb05ZVzBiU3kxRGJ2d2FiSzlBa29Md2JGekxSY1VyUFBiRnY2Ris3bUcyWFg4em9qTEJYU2RPTWVKNSt0cE5HOFR4VXlkbnoyMS8vWWI5dTNmSEJvVGdXM1BSb1VQNzFMN2FUbkY0Y1pmWnYzOS9KcDdWempVMUpUaHdnSzk4NGovZnZhN0NkYTBzbjgwdXJhb2JYL1VHWkpnamE1MGg2V2tRRXRmelNWTER5cFAzOGZFL3ZZMEVoWnZVY1VSS0xralJjVWFTYVZTeHh0VXZmQkdUbTllVHhEMmFDM1UrZmZ2OTNQRlBkek02TnNGVlYrMWkrNjV4eHJkc3BsUWJKeCtNNEFRK2NkYkNLVjhHSklDN2x0REpnSXd2L09sdm9yb3piTG5obFR4NjRTSmpGWTl5djZjdlRwK1dEYXYwNHkvK2lmZCs3TkNoZldyLy9zUFoydUZ5U3U3Wmc5eXpCeTNFMnBIbG0wSHhiQStFSER4b0hyM25IN2VuRjQ1KzB1N01iRlpCbGNpcnlWeDFqTUxnQ1BsaUhsdEVhSm5IbUNhekQ5N0dmLzYxVHpBOE5zTGVGK3hreDdZaHdpREhxYTVEYzZYQkQ5ejhFaXluUU5Udlk3VEdjVUJtSzhTUmgxTWFndndnVUZyYk9PT1l1ZllxWDc3dkNLWDZlY2EzWDQvbitSaGNUSmJRNjlkWnZuZ1N2WHFlWFpkZmdWQUsxWnhqZVdFdTYwYW96TnYwbnN0dithVmZlVG80VDkrVkFmN20vVzkvM2cvY3VQMzVrVC81OWNGdE45LzFyTGY1STFNM1duc1BmaW45MUlkLzZhTkRjdVhIckt5WmhrWEhNamhFcVNMR1J0dDV5dFVOaVA0RkxweStseDNQZVFHbGdSRm1GcHFzcEhDdXZzeXR0OTNCM3VkZXlTLzh4dHVKNmsyRWlYQmNTYU8reU9NUDNNUFkxdWZTNzJXc3JqU1k2Zlk1MDZrejNWcmc5UEVuV05jNlIvdTg1TnhzeEhYWGJHWGI5czFzM0RqQThHaUJjaUVrTElSRWpWazZ5dzJXbDF2RUtwOFZ5eE5xc2ExZTgrbDdmKzZUZS9aTXliMTdENlpQcFkxLytKTmZ1M3l3a0x3OExPV3VjOVBsbDIyZXpORXhPWDF4d1hxSmRlalFJYlh2Mkg1eitQZytzZS9RVHZQMEVIdW1zWWM5ZW1wcWoreTA1eVpPWGp4QnE5TVNqb0xSSVkraG9TSjV4Mko1YnBGSHZ6cExvMnVETzhpRkMxOUVPU0hkS0NISUZVbXlqTXR5UG9XMHhkbjc3a1FuQXRzQzIzT0lvNGl6cDg5ejV2Z1Q2RFNtMFl0WkZTa3lkTmp1U200WThkaHkzUXR4S2pWS1RrYXVXaVhJRnhBbUkrNjE2ZFRQc1REZG9OWHEwNGtFMHN2UmpWdjBteWVZV1k1cUJ3K2k5NENjbXBxU1FnanptVnZmUDk0NCthazdMeXQ1aFFGbmxOUDFabkwzbDgrS3NXSmtKZDdXWDdUMjc5K2ZmZk1xTGY0NUdYK2J2ZDRjQU91UGZ2MDFBMmExaTBuNllxV3JlZlQ0UmJSTzJEQldKZThiakVoUlJNaGVpMzRqb1o4WWpMQm9Kd0twSE1ZRG0zajZESi81d3k4aXJCQWhKWlp0Y0J4SkxsZEFtQlFoTTBxK1lhY2pLQVNTSUZDa2pxTGc5VEh0czdUN01QZDRUS3ZaSjg1czR0aVFvZ2pETWtGWUlsVTIvWGFkT0VtWVhMK0I3R0pqQWVBb1I3bDBBMDZmZlBCajF6MS9YQlRPMXIxdm5MaTQ5SjZGN3NCZGFkcC9VZjM4MlEvdnZtN1R1SFg2eTdmZDlPWGJQL3IyMHNpbTVQdGY4WVozQ1NHK1pzeVVmS1pJTXNaSUlZUlpPSFhiK28wVGxaMzNubnJZZUxhUm9kOG5uQmpBQzR0bzRYQnhwY1BGQ3hyb0VkZ3B0bVhqdWhaWkZxT2t3YlV6T2ttRXJTUktXaWpkeG5VRXBBSmpKTTErRjlzR0lhR25KU3NJVXAwaXBNU1ltRFFHWXl3NnFjRnlQRXJGS3JiamtjK0hGQU1mMzg4VEp6M1NYZ2VSYVVJL2I2cTFLdHVjd1IzR2ZQenZUOTcrQitxaGoveGlDaUI3OWRlcHd2YjJ4cXQrODZXVHo3MStCdUNPUDl6K2QrZU90VDRRSjUwaFM3YSs4VnZYWFZhOTVyNUhIK1QrejNQOVkzZC84cklENHBhNXFha3BlZkRnMHpNNjR2NFB2VWtCeWN5cG1iY09GWlExT1J4a3AyWmF5dk5kSmlhR0tCWkxWS3Q1VHA5WlFPbVlmaHJTN1BYcFJBbXE3OURyOWtqaUJKUDJVSmJBa1Jwallnd0sxN05Ja2o0U2crdTRWSW9lcmkyUmxrMFVHOUpVVUM3bENRS1hvQlNRei90TUJCNSs0T0k2QWt2YTlLTU0zN1BwOTdwa1dZcnJ1YVJSakpLSXpzb3l2amQ2aXhEaWQ0REltRVBxN1FjT1Y4YVN4MzdJZGl1SEo1OTcvY3hYM3ZNOC8zUE5tNklrT0NjdDhWbWQ5RHBHTnBiT2J6eC8vbUsyZWZ0MjNiaHdYMlg2Mk5FL1BDaVUzclhyK0xjazhLTUhwdFRWYi9wUXNqUjk3N3ZIeDhaLzRlU0pKN0xhVUVGdFhsY0NMWGp5Ykl1NWhSWUw5UTUzM1QvSHBuVTV4bXNadG03ak93SmxHWklzSmNrc1ZyczI3U2hFZUZXczNBRENMOUJORkY2dVFGQVl4UEdLQ0xkSVlrSWN4MlA5dWhwWFg3MkZxNjdhd1BERUFKVmFnZldieHhnZUdtQmtaQWpsRjhtRVN5bWZ3L0Z6YUtsUVFxQ05oWFFEd2x4ZWRib1ozYWovM083cXFYZWNlK3pMTndteFB5czgrZkFMeDRjR25JSHgwWThiWTBSaFlpSTdjUENnS1pyT0RzK1JuallxbGNySkQ4eWNmbEM2Z2Y2SjdWZGM4N2hxUFBqcWo3eno5VCsvZi8vaDdOQytmUXJneUpFcGErL0JkNllYVDl6emxuVDEzSzhtemVuc09aZHRVQmRubHdpY2pIVVRJV20veFVQSEx2QlBYL3dHbFlyUCtGQ0ZSc2Rpb0ZpQy9ncHhheDZYTGdQNWhIVWpGcFV3dzVFUnZwUGlXeEU1cDRkS1cyd2F6N05qVTRGeUhqYXNDOW0yYllUUjBURjI3OTdNME5BUUE2TWI2U1VPNTJhVzBjcW5NaktKZFBKWWJoSExMOUpQRExZWFVxaU5VcTZVS1pSS1lJZk1MaTVpeVZUNWR2TE9TbTN3SHhlbTcvdkZiR1h1RFUwVGRnYjMvUDVSSVlUNTh1ZFBHd0VtYlM2OUpvMTdSdGloa0NoTGJ4eFhZdTcrRHorMCtmSlh2ck1VV3BTdHVZTm01VXhwLytIRDJaRWpVOWJldlFmVEwvM2QrOTQyL2REdEgyak5QcHdxM1phVFl3Tzg5S2JyVVE1TVR5OVNMa3VlczN1U2JWdlhNZUFubko1WlptNmhSUUowZTRaK1YyQXlDNHhHaWhUSDFtUkdzckxjSWVsbEZBcURCRUVPV3huYS9UNjJaVlBLNXdsOGw2WGxEcFpmeEMwVXllWHlsQW9GS3NVU3VYeU8rdElDV2ErSmpwdjBreDUrenFkU0xlTVZ5dUFYc1FyRE5GcHQwdFlDS3UyTHh2ekZ6S1E5S3dqODk5Mzh1aDkrVGQrNHR3b2gra2VtYnJUZStNSDcwOGJ4T3diYXEvVWZybzJNaVdwdC9VbjFuMjY1K3VmNjljZkQwYTAzbkt2ZThCdC8vdkRuLy90YkF0V3I5S09WMHgvNHk3c2UrT2hIdjZULytnL2Vlbmx6N3VUZitzbUsyYlo1V0pwK1J3Z0JVa1IwVjZhcHo4K3pzdFNqMzJ0amU1S1oyVldtWjFZcEY2c3NyMGFrUnRHTEJjMnVacm1oYWFXUzJOaDBvb1IydTR1bElOTUpTbG0wMjEyeVZCTVdBcHFOTnIxV2k0R0JrTWJxS3N0THkvUzZUWW81UlJoNGRHTk5uS1pZZmc0blh5WUlDcmgrQ1Q4b0V3WStTZ2dhOVl1MEY2ZnhySVJlYTVuT3lweDBQY2NrU1Q4TmJGOHNMNlJ2di9YN2JwcEpLZ1dyK3J5dnA2OS9mdTV0VVhQNkZZUHJMbXVYdHQzMFJwbEYwWVZNMS9Eekc1OHZoSWlFbmJzOWF2Zk02dG5IM3dDQysrNjd6MTZkUGZOaEZUV2tud3RNMm04THgwcVJKRXlmZW9TNWMrZHdWWUx2UnFTdEpTNmNlSVR1eWtWV2xoWjQrUGdwemw2b003L1lKc2sweGFKUGJUQlBJUXh3YkJmZjk2Z09WckhjZ0V3TGVuMk5VUzVTV1BTN0NkSnlNZEtsMiszUmp6S0U0eElXaTFpNUlpSlhwbEN0TWpTMm5wSHhEUXhOckdkdzR4WUcxNDlUR3EwU0R2amsvQmlYTG81dGdiQ0k0NGoyL0ZsbWo5OGx6bi9qVHJsMC9xUlVYdm9XY2ZDZ2JucVJYalpQRmp2MXVWOFlMSTlRR3QvOHFjRmRMNy9UeWxjSFpudExnVEhTMmo0MU5TVkhka1FmUDNYMzNJL20rc3N2T1BHcEg5dCsxeDIzRGdmcDZqV05oWDY2Skh2V0k2MFpTa1dQTktwejhmd3NXdmdrSnNXMk5aN240aVlHMlRSMElqREVKR21Femd5MnRBa0RoZXNxK3BlV1VCQ0UyTFpERWtYWUVpb2xIOXRPS1lZZXVaeUg3L3NFZ2FKUXpGRXBWOGtQcjhNZHZRSXJIRVk1SGhJQkNOSXNJOU1heTlhWXFJNUpJdExNdzAwaVhIY2UxM0xvUmozaU9FTVlpMzZyU2JPL3BDd2hkTGxVK1pIUGZQQVgvdW5xTi8zQlIrOEw3VisycytYaHdxYm45T3pSNjMvTG1DbHBqZXg2L2tkWDVrNi9yTnRkcmJ6dGJUOWVLSld1dU9Qa2c3YzhZSkxGNXg1L1pQYmRJNFBWT0t6c05uLzE5L2VJRjNvTm90NEtGODRtT0piQmFJZDZzdzVhWXJTZ0Z5VWtXaEFuWUFtQjd3aDhHekFhSXhMaTFqSlpWeUowU2lJRWphNk56alNaQmtzcW9oWU1GRzJjTk1UU0xnNDU4RW9vNFdHckROZnpjSElGakhMSWtCaFZCSkZoWklKSUkzVGNSS2dDRUdIWkFhcVNVaHBhSXVuMVNKSWVXaGlVRXF3dXorSG5Ca2lOWXJVeGJ3S3IrTHNYdnY1bk00OGQrWXVmMzdKek8wbGgyeTl1MlA2U0UrYlFJU1dMRzE1Mm16KzQ0L09tMjZ0RXg3OTZzeEFpRzl0NnhlOTFkRTYwNjRzLzFEenp3R3R1UC9xSThPMVlCYUZORklFWGxsaHB4alNhZlZKZEpDaXNZOHZ1YXlnTmpyUFNTQkVDdkVEaVdBWXBEY3BldTRUNm5vWG5LZ0xmSWZSZFFrY1NPZ0piWldScHVuWUdVaFpDQ05Kc3JSZ1I1a0pLdFZIeTQ1dXhLMk5vblVML0FuUm1FTmtLUnZjaGFTQkZENUcxRVZLajdBQ0pvZC9QNkd0RkpCMjhmSlZTYlF3dm4wTlpCc2YxbUppWWtHNWhXQXl1M3oxeTV0Z0RkNVFDcjBUcE9aL2Rjc05iUDJ3T0hWTGlVcmxER0dOcVgvMnpuM3pFOGJMR2xULzZzYXVCOXBjLzhhNi9PbnZ2N2E5OTZNR0hzeWNhZWZ2bDE5VUlMWUdmQzRuakhxMUdBMXRxK29uRTl4UTZpMGd6dzRYWkZxdU5qQ2lWV003YWg5WW13YlVsbGxpclV5a0pVaXFreWhBSXNrd2p0YUJVc01qbGZWelh4Zk5kZ3NDbFZDcFFxZzVSSFIyak1EQ0FkSXRrS0N5L2dNeVBZWGtWa3NZMDNVZ2g2V0d5REdtN0xNK2ZwN3N3aXhLS2RydUZwUVcyRjZLelBrbXZRYXNYNFhvaFRxNUNaZVAxV1ZnWkZqTVBmZTcrbG5qdWk1NGYvMFdYZlllMUVCaDE1TWlVdFdIRDN0YXYvY3BiemliTFozNzI3SDJmK2NHSksxLzVvZnJpVERCUzlWL1Y3cWFtR2lKM2JxelFha2NvT3laSkxHeGhzRHhKb1Z4RVdSNmRLTVdTR2NyeU1WSlFHOGpqT1FyZnM1RmFvYlZCNDVJWmlaWVNJU1N1N2FLc0JOLzFVTW9pUXlLVVJDSklrb1FzMC9UaWxNWDVPcTM2S3FhL1REdVY0SlhwTlZyMFdnMjY5ZE1zTGl5aUVIUm1wMG1URk5OdkViVTdwTDBFTnlqUWoyTENYRWdXOWVrbEd0dTFrR1JraVNHSld1U0tGVDM2bkplcktKUHZmTTRMYjc3bndGcytvTVNHajJwZ2pldzdNalZsYmIzeHpiZWwvczczcnB4NzhLcVAvT2RiRHMyZmV1alhXNDBHTzNaT3FKdGVNSWF5QmNvQlIza0lwV2duTGxJV0tCVXIyTFpOMHBmWXlzSHpMWHpQd21RWnVhQ0FZeW5HeHlxVXkxVnNMNDhUNVBHQ01xNWZ3SFU5UmthR2NYSWxDQWRRdVdIbWxtd3lLMlRYMWRjeXNmVXl0QWpRTWsrckxYbGlKc0VwYnFhL1hHZDVZUjdUaldpMmVraW5UTnk4aVBEeWFPSFE2NmRVYW9PNHBSS3RkZ3MzVjBiWUhoQ2orOHUwVmxmb05oc1FyMUx5QlhIOUJQM3BvNnlldjNmM0dqRng5SnMzQ0FtdzUrREJiTjlyTS9XOEgvbXRYeXJzL0tHN0ppdml0ZE9uajIyWHJrZHRzQ3h5cFNLRnZJT0pHMlJaeE1od2dkR3hNcmFTQ0FFakk0TklMOGR5cTArcjFhVWJRWXBOb3hNamdVSWhvQk5ybGxwZGxsWjd4RkdLYXdrR2g4cWtGR20xTXZydERsS2tESTRXS2RjR2NmMkFack5Mc3hPeDJseWxNbGhoZUdJVHRreFpiYVVVMWwxSlZ6aFlWb2h0ZWxqQ3c3SmNwT01RdFZ1c3JLeUFreWNzVlBEb29MSU9jYTlGMGxsaDd1dzAzM2pncTh6UFBJZzBYYnFOdGpqeDViOUY2dTRWUWdqRDBYKytnOHBMSlRXemMrZVVlVWNheVJ0ZWQvQzE0MWUrN0hPam95T2svYnArL013U0t4MUZyNU14TkpSbjNaWU5YSDc5RGV5NitrcEdOcTJuMlkwNWU3NU9MZ3dabWR4RXFzRzJCUGx5U0dXb2lQUWNNaFJ4WCtOS2k5QVA2VWFDVGlkQ0NNbjBoVHJMelM3dHJtQmh2a3NTWjBTUjRjekpNNlJ4SDlkMmlXTEpYSDJWb2NFSzgzTjFiRDhraVRxZ0paMUdDNTFKOEF0WVRwNThjWmpxeUFhU1NHTGlEanByMFkrNkNLVklvNGpsZXAxbVl4YVR0YkdseC9KcXpOSktWMGFOUmZ5Z05HbU1jY1ZCOUZNVTF6ZFpqWU1IRCtwTFJhU0ZuMy8vRTY5OGJmN1kxMnRoNzdMVjViYWVuV25MTElvb0JBRitXQ1Uzc283SzVnSVRsL2Rvenk4eWQzNkdYbjJlMVVhRHFEZk96UGtMdEZ1cmhINUFMNUhNTHE0d09DRHA5U0trSlJCT2tjN3lFcTFXUkxtWW85dHZZZHVDMEEvUldVYXIxYUJjSENHTk94Ujh3OGpJT2xTaHh2emlNcG4wOE1NY1JkL0ZxUTBUZFV2TVR6OUJ2OTNFcjQ0ajU2ZlJTWk44ZVJnVmhyakJPUDdBS0twK21yU3h3UFRaR052MXFYb2JzUHdLclhhSGJtZWE0ZldUSkozNTRNU0pKUWVJL2xWVzQ3NzczbWhmZmZXSGtucys5dWFQZVduMy83TDhJRzBzTDFnWFo4N2p1eVhLTlVtalo3RnB4MmJHZDF4RzRQbGsvUzRrRWUzNVdiNTI5MTNjZSsvRExDMm5SSkVDeHliVEdxVUVubXVSejRmb05LYmJUZkFjU1JoYUlFQWhFQm40aFJ4K1lGSEs1MUJHVXloNGxNdEZVaEhTaXhLR05tL0hMWS9TUHY4NGZqNlBDb29vTjhSeVF5dzd3TTJYOEhJRmJEZUhJTU5FcThnZ29ILzZIbzdmZlFmVFo1L0VHQXNsQXdRck9IWU81VWt6TVRvaStpcWNiempYYmQ2Ny82M3RwOWpYLzRFWHUrcjBpamJHaU9PM3Y2dFlzVnVzclBTSUUwMFllUFRUbUpReWdkSTBGeGI0K3BtL1ozQ3d6TkRFT0RLT2VmamVlM25ra2VNa1NVcS9IekcvcW1uM0pTQ3dMSUd5QkxacTQwcndmQXZQa2JSN05vNGxjRldLNTRDZlNFeGswZFo5UEV2U2tSN1ZvUUZHTjI3Q3psZFJRUTByWDJONDQyVUlPNGNRQXNjUE1DaVU2NjN4Ym1tUHRMdEtsR1hvM2dyZFUvZXdjUElCK25IRXhNUTQ3ZVlLM1hhRTY1ZEpnWEtwaUxBS29LV3ltOVBpMnhPSHgzWWFzVitZUnovM2Jnc1pNYmQ4Z1ZZL1F1Q3hic1Rqa1ZNcmpOY1V4Y0JsK3ZReTdlVVZldTB1cmNZcXh4NjdpSkFlUWhwY1QxQXBhWnkrWUhFcG90Rk1VWlpHV2VBcWlkTXlhRzF3WFBBc2lXTnB3bERRYkRRSWZFa1FlaFFDajB3SExNM05rSzhPTXp5eUNiOVNBVXVDbENBTldpZEU3UmI5MVNXeXRFL2FiZE51TnRCa0JIWkdaL1lrVVdNWktRMVNDbEl0NkVRR0ljRVBjOWllaitYWTlCTkJQeEdONTkrNE40YmYvellBWFNxVTFSZnJ6VlEwc1RBTTE0cWN2N0NLMW9aYXhTV3lYT1lYSTFLVkovQ2dYMStnMFUxWmFoWFlzWEdVOXNwNS9EQkNXVGtXbHJvTTFtQ3B1U1psRVNoc05LRW5zQ3lKN2E3OUUxbVNrbWhOWHdYa3dvRFVFYXhFTWQxNndtcjdJbk9MWFhMM1A0enQySVJCaUJPR2hQa2M1WkVKdXQwKzlYTW44WHlmbkN0STdRQ1ZkVm5TTHA1T01VTFIxUWFCWWJYWlpxV1I0RnNXRldVVCtqNVJHaHRodTBKNWxWV3g5YVVSL0xPNDRWK2xub1BDS0U0UzRmUnR4a1pMekN5MGliVmhZbktjbGI1TndlbVNxMWpVRzAwc0oyVDV3Z3k3Tnhkb2Qxc29Xek9RbDNTakZOZldOTnM5cW1XUFhOL0Q2SXgyczRGbEJXelp0bzdHeWlxV1V0aU9JSTBqaHFvbFROWm40Njdub05NdWcrVVNqejk2bkhhN2dlMExMQm16dk5RaDEvZVJTWm00bjFHcnVBeFhmSjZjYVpQYk5FRkJ0OUZHTUw4YWtkcWFndWV5dExCQzRFb3lMY25sOHJpMnduSjlVaUVRR3VPRVpWUTRFRjJxdlNNdVVZYlB1TVFBd3NITnQ4dVY1ZGN2blhwY3BsR2JiaWVsTHFCWTd0SnJKa3lPdTh3bkFkSXFFTGNXS1E0TVlKa09nNEhQRis3c1hRSW9JUXdkcWxLUmFJVk9OWjEyUW0yd1NwS2tuRDR6emZMQ01tSE9ZZXVXelNoSDgvakpKN0YwVEdvVXo3bnFDcGFYbDJnMFY1SEMwRnhkb1RRNnlNQm9qY2hJaEJ0U0xCZHdiRU1tSVJmMjhHM056T2s1enMvMUdkMDRnYVVVbGtvUnhxYmROaWpMWnJEazR0b2gwbklSR0t6U21GRnV6alRqYkhxTjREa3NMOUcwenlEK08zREFBT3k0OXFVZnoxVHhmS2xja25HVTZUanE0L3NCT3RWWVFvR3hXV24wOFV5UCtjVUV6MDZZbjIrVFJJTG43SmlrMWV0UnFlWVFJaURuQllTZVErQW0yS3BMSWVleWUrY29ydU1TNXN0TVRrNmdUY29USjAvanVFVkdKNGZvZDVxWVRKTkdFYjFlQjIwa1NSVGplSXJWeGlyRmNwbWxScCtseFdXZU9EMUhQd3RvZG1CK29jbHFKNk5jRzhMM0hlSzRSMm9VR0VPdjI4QnpIWnFObENBZm9CeUY3UWE0K1VIaDVhdkN5NDhlQW1BZjMzcVMvaFlDWGdoelpHcktFa0pvdnpUeHVlSEo3YVlYYXowMEdMSmpjNEVnbjhjb2llMVoxS3BsQm9vaFl4dHJDR1hZdlgwWTIvVkpMUjlrZ2VYVmxQbEdnL21sSmdaQjROcllLc1d6VTlKT25SMWJ5MnpjVkNYMEhPSitsMXhZWUxqcTBlazBtZGk0aFlXRmVkcWRMcDduSUVURzVPUW9hYWJSeG1CbEVXTWpOWlJ0TVRZeHl2TEtFa29KMmxITWhtMmJtSmdvRUlZaGxkb3dTYWJJRjNKSTIyYW9Ob2psdWdqSHdiSXRwT1ZtU2lnbC9jcVJxL2I4NUNmTjFKUVVZbi8ycndMMGxLNFdJSmJCcDRQaWtDaFdTcUlZQnZSN2ZSeGJvU3lIUnJQUGdPcEIwbWR1cnNGS1F6TTBXc1J4SmNWQU1sakxVd3d0WEpsaDZUNjJFdlFUdlZZc0V6MHNGTzM2Q2tNbGkzNXpBY2Z5V0Q4MmdLdmFURTZzSjRzNmRCdUxyTlNYOEx3QXp3dW9MemZJdE1LMUJIR3ZTZEhWSUN3YUszV3FwUUtWVWc1YmV1UURqMnExVEpKa09JNkhNVkFvaFl5TXJ5TW9sTmk2ZFQybFFvVWtrU1NSTUpXaFVXUDVsWTlxbmNHZVBkK0N5VE1DZFBUb1VRM2dWVGM5M0VsVWI2QlNrbTVZTnIyc2lFUXlNUnB5ZXJiRGFxTkZNOUhrY3lWODM2WFpnYkZxeUZDdGdqYVNTa0ZUTGxjcDVuTVVDaDVhQzBacU5VelNKU3o0ZUU3QTh0dzgzVmdqUFo5OFR1SmFGdFZLQ2RlenFWWEwxS3BWcEZBNHRrM29XclE3TWJYcUVMa3d3UEU5b2loRzJRR0RRME5rU1l5WEwrSTZQcjErZ21YNTVBTUhZd1ZZU3JGaHd6Q1dueVBMYkRJa2ZuRUFOMStTd3EwSXp4czlBOERpb3ZtT0FCMDhlRkNiUTRmVSt2WGJ6eVNaKzZsS3BTWUtvY3h5cmtJb201eXJ1V3pyS0g2WVozaDRrcXV2bUdDb0dsSmY2YU9WWkg2dVRxM29vR3liYXRuRHkvbTBlNExob1NFR0JnYXdiSXM0aWFnTUZMRWRoVW1odGJ5Q0pWTnMxeUpOZXd5UGpOQm85TEJ0S0JVY2ZGOVJLdnNZREZFbUtRN1U4SUxnbTlvTXJRMjFnUW9qZ3dXazd4RWxrbW81UjFndTBVOE5yVzVFRWtWMGV6MGlrMkhTREVkbVdiRTZLRHFwYzNkNXc4NTdqREZDN04rZi9ac1Vaa2RyeDlZS3ZrNTRhN2Zydk00Z2hKUUNZVkowSnNtSGlzR2hFc0xPa2ZRalJvZHJMSzYyYVBVak5reVdxYTlhbkoxdTRRY1dYbjZFWnFmUGhibEZmTnVtbWxjb3BmQmNTUzduTTFpektSVUwrSjZINVNqY29FU3pzY0pRdFFnbW96SmFJY3NFV2lkVWg2dGcyZVJLSmVhV09saVdUYVUyUUQ5TktKUXJHSjBnaktSWXJ0QnBObWgyT295TzFIQWRpelRKS0JRc2txeVBTUTBpVFhWMWVGSXQ2dkpYaEJDSk1VY3NJUDJPRWJTV2hnNW1nUEZIWC8yRmR1YlBTT21xTEJNNlRUUngzQ2VPVS9yOU5Tb1pLZkhDZ0dvNXgxQnRBR0VGMkg2SjhYWHJzQ3liZ1hJT2s2VU1WeHdjMDhIMWNyaE9RRDRmTWprNWdtWGJLTnREV0E1QnJvSzBQR3dMeHNiS2pJMlBFZVFEbGhzZEhqMnhoQmY2Yk5veWprRXhQYjFJcVZ4a2JOMFlRYkdJQ24yY1VwN1VVbGlXb2xBc0lSQ1V5MFZzeDhYMUFtekxRZ2tYcVpRT2lrT3FtWVhubFYrODdWSWRTUCtiTllwQ1lOYXFqYUovL09pdC8rQ0x4cyt1enAvUlFXaEpyVFA2L1I1S2FxU3dRTmlRYW15aFNMS0VNQi9pT0JwVHJERmN6WmlkbjJWMFFEQThPSTQyRm9WU1NDN000N28yY2RKZkUwRmxtbktsakhCOGJOZWxOaEN5dkx5SUZBbm56NitTYWNIV2JadnBkRG9rL1E3bkx6UVlHcXl3ZnRNNEdvM3ZCMlJaakU1amJHVmhLWWNzUy9HOElkSWtSUWlCa0d2SFk5dTJ5VkpwOG9QclZUMlZ2ekV4dXYxZWMrU0lKWjdCS2ZCdFJaeUxpN3NNZ01oditMTk8wbmlUMW1kRkhFVTREbUJTa2tRZ25RaEpCanBDQ0xCc0MwaVFyazhjeDBpdHFWYktESlR6WUNTVnlpQktPV2lkWVlUQmNSMDhQd0JqOElOZ1RjV0JRR2NKQXdNMWtqUm02OVlDMVZvQngvRklrcFRWbFRhREl5VUdSNFpJc3dSU2pSRVd3aGlFRkd0L3IxT1NKRVlnMFZxVHBobU82MkZTQTVwTWhXWFJ5SEtuR3R2M0hETG1rRUxzZVVZRi9yZFZlKzdmdno4N2RHaWYybkhWRGZmMThmK3FQRGlxa2lSTDB6UkRhME1TSjZSUlRKckdhSjJBU1RBa0tNdWdsTVJ4Ykh3L0lKL0w0M2xyb2syRVFOb0tZVWtzUzJGMEJqcEJ5SlFzN2FQalBrS25LQ0h4UEk5aW9VSnRxQXdvNGpqRnNpeUtwWkJ5T1kvV0tmMTJrNlRYQmhLMFRqQ1pXYU9Tc3V5YlpxRXMxV1JaaWpFYUlVQTZycTZ1MnlFenYveSszVUxFUjQvV2hPQ1pOVkhmVVNlOWMrYytzV2ZQSHJGOXg1YXZKdjNWSHhWeE05UW1SWmhNbUN6RGtpQ2tKRWxUc2l4Qm1JeTFRRFpBaGhJU1l6UlJ2NDlRRXN1MnNCd0hvVFJ4djBQY2FSQkhMZUlvUWdvUTBxeGRENlJFV2c1YUNEUUNqRVpKUTVyRUdEUittTWNnVWJhTlZBcTBSbUF3R29TUjZDeGRFM2FLRENFc2JFdUNObWhoc3Nyd3FGVmZEZjk0YU1zTjc5eTFhNWQ4K2N0Zm5uMVBNdUNuQkF6MzMzSHJUNVhUazMrMmRQWWJzZU1weHhJcHZ1L2plUzVKa3BLbUNWSUtEQkt0RFZKSXRGaWpkWkkwd3hod1hBL0g4WW1UTGdLTk5DbHhyME8zMDhPeVhjSmNnTURHOW4xc0w4Q1lwK2JXNERnV1Nra3MxOEh5QWxCcXJkZ20xcGFSTVdzNVZtc0pXUVlhdEdtQlBvK0oyMmk1UGkwTVhXWTFzdEkvVlhhOTdpWXpOU1g1RGg2emY1T1FmTy9lZzZrNWRFanhBL3MrOHNBZGYvS0tYS1greXNYekp4TEhWbmJTNzVINDdxWGFUSWFRQm1FVVdtZG9CRkk0V0U2QUZJSnVyNHRqV1pnMGdpekR0aUROTkxadEV3WmdleTZ1N3lPRWcxQnlMYWRnUUJpa2xHUlppcEkyU2dnd0tXdS9FaGdNSXN2SWRJWVdJRkpEMG85UXJHRGJKN0RVQXNicVpGbzZWby9uTDdUenUzNTRiZGM2OEIzdENNOUtTSDdnZ0JEN0RoaXI5Wm4zMzhyRmgvWTM1cDlJTGNzb3p4WkNXZERydE1nRkJrUkduRVJrTVNpN1FKQXY0L3BGakZaSUNjcUNUcWVERXBwZXIwdS8xMGNuR2E3dkV1UkNnbHlBNnhld2xJdFlXemdrbVVZb0c4OXhjRndYSi9Rd1JpS01BQWxabHFFTm9ETjAzRVVuRFh6dkNTeDVHazJvSGJzb0l1ZW1ySjdiLzZMSmJWZmQrUlJ6K3AwKzk3L1ppaUNFTUpmcUpBbnd1aS8rOVc5TnUxSG5WMWN1UEdhNlNtdkxNWko0R1JrMThBT0JURkpPUFFrWEZ6WEtrZ3lOVkZnM01VcXBHQkxIS1drYXNieTh6TXhzaytYRkZrSmtPSTZpbEJlc1grZFRIUjBoVjlxTUd3eGlNbzBTQ21sWkNMa215ek5hclBtbmhFWm5hN2tISThtaW1INW5pVEIvQnFVdUV2Y2JXWmd2cTBoZW1UYXpYYStlM0hiVm5lYklsTVdlL2Y4bTM1ajFiRFRTbDBBU0hEZ2d4ZXZmOFg5LzZiYjNOa1ZISEdqTkhsUGQyYmswY0NPTG9pRElDV3BWbDFaZmMvSkN4TXc1dytObjU5bDRmcEZONjNPTURBMHdPN2ZNNHllYkxMZHNGQWJMVVFnaGtVYlI3L2F4MGxPSWFCRmpYNE8wUjVDMmpaUVdydWNoTEF1aEZNYXNMV3R0REdDakRYUmFiWWpQNDViT2tFV2RORi9hYVBYRkRhMmxlUHYreWV0LzdMTkN3RlBuSFNFRVduL1JnajBHME0rMDNKNFZRRStCdENhNnY5RzY4YlZ2ZjlmbmJ2dndrVWdFSDVibS9oM3pzeWYwM0x3eGhZS2xKaWNOcmkwWUduQlpxR2ZNTFJ1UzJOQnJ0K2wyTW5xZGpKV0dZcVdkTVZDRWZDREk1eVMxa2tPdUVDTXRpYUpGMm4rWTBCL0NTSWR1cjRQdHVuakt3bWpJdE1BZ01CcVNPRU1EcTZ0OUU2cFo3YnVKWW1DMzFZK3ZlZUJKNTAwdjIzMzE3cm1wS2VTMW0zODBGNlZWdVhyMmsvMmZQRGpkRjJKdituUUg1WUVEeDh6VHhhdmZreVh6eU5TVXRmZmd3ZlN4UlpOLzRLTS85KzZWNmEvKzdPenhiekF6bjJKc2g2dTJlcHc0bDdHMEdoRnJqVFJROEEyVGd4SlhDZWFXTmYxVVlGdWFhbEV4UHVJeVZORU1EQmpLWlVWNUlDWFdIazd4SmRqT0VLblJPRUVPend1SSt4bGFyQjBiZXQzWUxOV1hUZUE1K3ZUeE0xYlUrRHBYUG44czlrZHUrb081L3ZOdXJmSHdpNTFTYlo4cURnV3A5b2UwN1NnbG5RNUtMdG1XOHhXUzVQYStTcjVhS2wyLy9EMUgwTGZzYmdjUFpvZW05ams3YXFJRHZQbER2L2ZXdjh4RjNqc2FzOGR1ZVBSNHcrdEVRanc1bitHN2hwd3JjSVFnVGpQNnNjREpnZTBLRWdOU0tMUldkSHNHWlN0c1cyT3BGTWNWSlAwaE1wUERaREZTdUNSeFJodzFzSlNqcFJPWU5ORW1qV0xMa2JhbzF4dHl0cHRGcTUzTFAzNzJLOFB2dWVLNVltUW8rZGpkcFEzVnZIVFdpbmdtQ0JCZUdZUXpnSldmUklaWFF2T3RWcSsxMkY1NjhJNlowMCsrWTl2M3ZmYjBVMXJ4N3pxQ3BxYVFCdy95ejZHb0xIU2FxS05nTDkzNmgyLzgraGUrOEw1UGZlcWZ6R0lubHI3VTJOcmdLeGdkc015V01aSFZ5b0oyUjR0TzEwalBRa3lPMlFoU3FnT0NEV05RR1JBSWQ5RFk0YlhHeVZlTkVtQ01iVklVQ0tsY3h4SnBtdEh2R3hhYVBkTkpyQ2NhM2ZSam9qSjVhUCtQL2VZcE1OejY2OWYvM2ZYYnVjVXUxcUtnVkxBRXJranpFOEx5UjdEOWlsSEJJRTV1V0tkQ1NrY0lLZjJBYUhYMmEyNnBjUVBzMFVLSTd4b2dBWmozSFBxS1g3bi9IUzlkWHBwOWFYTzF2YVBaU0xlY242MW5zY2g1MmlrVWw1WldFQmd5Qkpiam9GSkRZRFVZR3hDVUE0bm5PU1Nwd1hWc1hKVWdqQ0JmdEtrTkJoVEtKV3FWRGRoZUFXRVpMR1ZoakUyQ3BCMG4xQmRiTTUxVzcySEM2dDJ5T1BMcHJXLzVuY2V1dnVSdy92bVg0RmF1blVydS82dDNmK1NXRjQrOTRRZXZHNDhISmlZZE82ektTQTBnL0JLeERKQldEc3V0cmFsTE1OcW1ueTNPbnVlQkJ4L2Y5SklmZnNkNVk2Ymtzd2JvMEw1OWF2L2h3L3F2My8wVHIxWE5ZLzlWOVM1c2pMc3hNd3RkWm1ZVEZ0cVMwL01wMDNWTlgwdENWMUxNMmRuVlYxMm1ybmpldGI5dzlETi9jZTlBcGZROEs0N0dnc0FkRG5MQlM1S29WWFZ0YVZ4bENTOEl5UlZ5ZUg0aFZzS3NLRWRHamxOY3lCRG5oR1dmUzdWNXJKV2szM2pmWHo3NDZQSGp4OXYvMG9sMGxEMzYrUEhqNHZEaHc5bGJYM25kTFZFeTkzZkZ3WXpMTm8yeVlYSkNEdzFPVXFnTWlMQXdndkJMV0g3ZUpKazJqYVh6MmZ5NXg1eFRKNWVlZk93cjYzWWVPSFF3RVFJanZvdklBV080NDNkMlArYnJsVzI5ZENWcExIdGlhVldMcFpWVXppekJ4WHJHZEYyTGRnSW1Td0V5a3hybDVZTXZIYTkzOWp6bFlmL1M0WGQrLy9TSngvL2t4TDEzYmhRbU0wYW5Va2lUalUxTXlyR2RlLzd1VE80RnYvejJuM3p0MlVzTXpETWNYcWZrMFFOSDVSNzJhQTRlTkU5M0R4b1FsbExtTXg5OHl3OGVQZmJZYTFaWGwxNklpcmYzdWgweUJINGhwRm9wTTFvcU1wUUx5ZmtlaGZMNFVtWGsybC9kY2Uwci8vdlRKWGpQM2hJK1plU1h3dldQRDhqVkRjc05LZm9ta291TE1Mc2c2TVFXcSsyVUM4c0pLeDNCM0VKRzZDdGR5aXVaR1RQNytUTzlpWGU5Y2MrdnFMajFhOUpFNWJtTEs4d3V0TEdWSWFkU0JuSVpROE9ZV3NYTE1ydDAzbmpqZnpXLzZTZmU4OHMvOHpQTEgvemdHKzJMRng4M3U0NFBtdjJIRDJ2NGp0YnVmN2F3RzJPZCs5THZ2MnBodFR2VmllSmliQ2dxcFV3eFYxb2NLRlllR3h3YStreXc4ZWJiaEJDTFQzYzhQZXNsOWhUcCtGL2VmTzNEMTZ4dlh1YjBGdUpPSTdGN01hTFpUT2wwSktzdHljV1ZtRllQdkRCUElhKzBaZnF5TUx6bFZHUVBmakU1LzlBYlYxdE5ZaTJ5a2FHS2pQcDlrZlk2bEVORDNwZjRic2EyTFlhSmNVTnJ4V0d1TzNHU3pTOTd6YXQrNnZjZU5WTlRRaHo4OXA2MmYrbEIvY0FIRG9zdmZXbXRsTHJXSFFJSjVDKzlwUDcwUmdQLzBzVHpyTGY1QXdlbWhPR0F1VzNIMjM3dHNmbVRoKzJXRmE2Y3UwZ1N4MFpuSXV2R1dtUVNWUnNwVWhQUTYydHNrWXBTcnBCZWU5Tk5tKysrL2RPYjIya25TL3FKM0xxeHJDYkdQVHczSkU1S1JQMHVlVThoVFVJdTM4YjJlcVpZaXVMUWVYTEwyWmwvZUw4eDVrVUhEank3T1gyYTlaSkRoL1lwSVVULzBvL2RiN0dhN2tHeTUwQW1oTkRmYzJ1S3AxQStkc2VmUG5kcDV2aTc2bk5ubjlmdmRpc2kwelM2UFpZN1RTTnNPOHRiTnI3bnErR1JFVEV3c1l2RmxqbDM3eWYvdUphekkyOTJyaTBzb2FrVUxiWnNtNlRaN2xDcEZNaWlEb1dpUmQ2M3lPZWJ1RjVEUjkwaXpjaS8rSkhIWHJUeFF4LzZVUEl2ZmFiZlRYT0VwMFB3N2Jvd2ZGY0h4YWZVYUx0ZS9OTVBBaTh6eGd3a1o3Kzh0YjY2ZkhNbjYrMVV0dmVhd0hLdFhwUlNiM1RvckM2Zm0yMjFQdEVzYlA2OWxwMy81SmFSNEliMXcwN2NpMXAyenMrRXd6enJCeFc1b3FiWjBWU3FOdWdWOG1GTXZ4TlFLdVJOdTUxUFIwWSthT0JEMzF1N20yZlpBZVo3dW1wTVRVMUpPTWpURDR3QWozN2p3VGRhT3RvWmQ1b1BHOTE3YkhrMmVuVHYvdjF0Z0Y5OTgvNjlROEhTcDJxbW5vdmJkZkplbWhiY2pNR1NFbFlZWVpsTStJRUFpWWt6MytCV05aV056bU16bzU5NDlWdiszOWYvQzhmeS94NGRxSXd4NHZEaHc3SldxNG5GeFQ4MnovUUJEaDA2cEk0ZFc3c0kvdm1mL09xV2JQSGM3ejUrOHZUTFdxMjZsd3NNQXdXNVp0SXR1b2hjRHRzdm85d3lsbDBCTi9qMGh2VTMvTlRsMTc5bUVRei9LN3RNL2J1MDZES0hEcW1qdFpwWVkwWVd6YjU5Kzc1WlNuZ3Fmem1lejkxMy9OSEdyOXgxNXc4MmxoZWVkN0d4WEZHT015eGN5L2I5bkM2R3Vla2RROVdITmcyTTNmL2NXMzdqMDJ1TkE3NzczUE8vMVZoYm12L2pYRmxTNFNnTFI4bG42bGNrK1AvYm1KcWFrbE5UTjFvMzNvaDFpV0VSVDMzdDI0YzZNbldqZGVqUUljWC9HZjl4eC84SGVpSmJtdUVvQUlzQUFBQUFTVVZPUks1Q1lJST0iOwpjb25zdCBVUD0iPGltZyBjbGFzcz0ndWltZycgc3JjPSciK0lNR1ArIicgYWx0PSdnYXJuZWsnPiI7CmNvbnN0IENJPSI8aW1nIGNsYXNzPSdjaW1nJyBzcmM9JyIrQ09JTisiJyBhbHQ9J21vbmV0YSc+IjsKY29uc3QgUE9URVZFUlk9NSxQT1RDT0lOUz01OwpsZXQgdGVzdD1mYWxzZSxwb3Qscm91bmRzPTAsbm90ZT0iIixhaW09bnVsbCxpZ25vcmVDbGljaz1mYWxzZSxmaXJlZD1uZXcgU2V0KCksZng9bmV3IFNldCgpLG1lbnVJPS0xOwpjb25zdCAkPWlkPT5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7CmNvbnN0IGlkeD0oeCx5KT0+eSpXK3g7CmZ1bmN0aW9uIG5iOChpKXtjb25zdCB4PWklVyx5PShpL1cpfDAscj1bXTtmb3IobGV0IGR5PS0xO2R5PD0xO2R5KyspZm9yKGxldCBkeD0tMTtkeDw9MTtkeCsrKXtpZighZHgmJiFkeSljb250aW51ZTtjb25zdCBhPXgrZHgsYj15K2R5O2lmKGE+PTAmJmI+PTAmJmE8VyYmYjxIKXIucHVzaChpZHgoYSxiKSl9cmV0dXJuIHJ9CmZ1bmN0aW9uIG5iKGkpe2NvbnN0IHg9aSVXLHk9KGkvVyl8MCxyPVtdO2lmKHg+MClyLnB1c2goaS0xKTtpZih4PFctMSlyLnB1c2goaSsxKTtpZih5PjApci5wdXNoKGktVyk7aWYoeTxILTEpci5wdXNoKGkrVyk7cmV0dXJuIHJ9CgoKbGV0IHBvZE9ubGluZT1mYWxzZSxwb2RTZWF0PS0xLHBvZFJlbW90ZUFwcGx5aW5nPWZhbHNlLHBvZFB1Ymxpc2hPbmNlPWZhbHNlLHBvZFN0YXJ0ZWQ9ZmFsc2U7CmZ1bmN0aW9uIHBvZENhbkFjdCgpe3JldHVybiAhcG9kT25saW5lfHxjdXI9PT1wb2RTZWF0fQpmdW5jdGlvbiBwb2RNYXJrQWN0aW9uKCl7aWYocG9kT25saW5lJiZwb2RDYW5BY3QoKSlwb2RQdWJsaXNoT25jZT10cnVlfQpmdW5jdGlvbiBwb2RTbmFwc2hvdCgpe3JldHVybiB7TixuYW1lczpOQU1FUy5zbGljZSgwLE4pLHJlZ2lvbixvd25lcixjdXIsbGVmdCxyb2xsZWQsb3Zlcixjb2luLGNhbm5vbixjYXQsa3N0b2NrLGtsdixnbHYsY3BvdyxjcmFuZ2UsZ2VuLGdzdG9jayx3YWxsZXQsc3RvY2ssc2hpZWxkLHNoaWVsZFN0b2NrLHBsYWNlTW9kZSxyb3VuZHMsbm90ZSxwb3QsZmlyZWQ6Wy4uLmZpcmVkXSxkaWU6JCgnZGllJykudGV4dENvbnRlbnQsYWN0b3I6cG9kU2VhdH19CmZ1bmN0aW9uIHBvZFNlbmRTdGF0ZSgpe2lmKCFwb2RPbmxpbmV8fHBvZFJlbW90ZUFwcGx5aW5nfHwhb3duZXIpcmV0dXJuO3RyeXtwYXJlbnQucG9zdE1lc3NhZ2Uoe3BvZGJvajoxLHR5cGU6J3N0YXRlJyxzOnBvZFNuYXBzaG90KCl9LCcqJyl9Y2F0Y2goZSl7fX0KZnVuY3Rpb24gcG9kUHVibGlzaCgpe2lmKCFwb2RPbmxpbmV8fHBvZFJlbW90ZUFwcGx5aW5nfHwhcG9kUHVibGlzaE9uY2UpcmV0dXJuO3BvZFB1Ymxpc2hPbmNlPWZhbHNlO3BvZFNlbmRTdGF0ZSgpfQpmdW5jdGlvbiBwb2RBcHBseVN0YXRlKHMpewogIGlmKCFzfHwhQXJyYXkuaXNBcnJheShzLm93bmVyKXx8IUFycmF5LmlzQXJyYXkocy5yZWdpb24pKXJldHVybjsKICBwb2RSZW1vdGVBcHBseWluZz10cnVlOwogIHRyeXsKICAgIE49TnVtYmVyKHMuTil8fDI7TkFNRVM9KEFycmF5LmlzQXJyYXkocy5uYW1lcyk/cy5uYW1lczpOQU1FUykuc2xpY2UoMCxOKTsKICAgICQoJ3NldHVwJykuY2xhc3NMaXN0LmFkZCgnaGlkZScpOyQoJ2dhbWUnKS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRlJyk7CiAgICAkKCd0cGxheWVyJykuaW5uZXJIVE1MPU5BTUVTLm1hcCgobm0sayk9PmA8b3B0aW9uIHZhbHVlPSIke2t9Ij4ke25tfTwvb3B0aW9uPmApLmpvaW4oJycpOwogICAgJCgndG1vZGVCdG4nKS5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7JCgndHBhbmVsJykuY2xhc3NMaXN0LmFkZCgnaGlkZScpOyQoJ25ld0dhbWVCdG4nKS5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7CiAgICBjb25zdCBib2FyZD0kKCdib2FyZCcpO2JvYXJkLnN0eWxlLmdyaWRUZW1wbGF0ZUNvbHVtbnM9YHJlcGVhdCgke1d9LDFmcilgOwogICAgaWYoIWNlbGxzLmxlbmd0aCl7Ym9hcmQuaW5uZXJIVE1MPScnO2ZvcihsZXQgaT0wO2k8VypIO2krKyl7Y29uc3QgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtkLmNsYXNzTmFtZT0nYyc7ZC5vbmNsaWNrPSgpPT5jbGFpbShpKTtib2FyZC5hcHBlbmRDaGlsZChkKTtjZWxscy5wdXNoKGQpfX0KICAgIHJlZ2lvbj1zLnJlZ2lvbi5zbGljZSgpO293bmVyPXMub3duZXIuc2xpY2UoKTtjdXI9TnVtYmVyKHMuY3VyKXx8MDtsZWZ0PU51bWJlcihzLmxlZnQpfHwwO3JvbGxlZD0hIXMucm9sbGVkO292ZXI9ISFzLm92ZXI7CiAgICBjb2luPShzLmNvaW58fFtdKS5zbGljZSgpO2Nhbm5vbj0ocy5jYW5ub258fFtdKS5zbGljZSgpO2NhdD0ocy5jYXR8fFtdKS5zbGljZSgpO3NoaWVsZD0ocy5zaGllbGR8fEFycmF5KFcqSCkuZmlsbChmYWxzZSkpLnNsaWNlKCk7c2hpZWxkU3RvY2s9KHMuc2hpZWxkU3RvY2t8fEFycmF5KE4pLmZpbGwoMCkpLnNsaWNlKCk7a3N0b2NrPShzLmtzdG9ja3x8W10pLnNsaWNlKCk7a2x2PShzLmtsdnx8W10pLnNsaWNlKCk7Z2x2PShzLmdsdnx8W10pLnNsaWNlKCk7Y3Bvdz0ocy5jcG93fHxbXSkuc2xpY2UoKTtjcmFuZ2U9KHMuY3JhbmdlfHxbXSkuc2xpY2UoKTtnZW49KHMuZ2VufHxbXSkuc2xpY2UoKTtnc3RvY2s9KHMuZ3N0b2NrfHxbXSkuc2xpY2UoKTt3YWxsZXQ9KHMud2FsbGV0fHxbXSkuc2xpY2UoKTtzdG9jaz0ocy5zdG9ja3x8W10pLnNsaWNlKCk7CiAgICBwbGFjZU1vZGU9cy5wbGFjZU1vZGV8fGZhbHNlO3JvdW5kcz1OdW1iZXIocy5yb3VuZHMpfHwwO25vdGU9U3RyaW5nKHMubm90ZXx8JycpO3BvdD0ocy5wb3R8fFtdKS5zbGljZSgpO2ZpcmVkPW5ldyBTZXQocy5maXJlZHx8W10pO2Z4PW5ldyBTZXQoKTthaW09bnVsbDttZW51ST0tMTtjbG9zZU1lbnUoKTtjYW5jZWxBaW0oKTsKICAgICQoJ2RpZScpLnRleHRDb250ZW50PXMuZGllfHwn4pqAJztzZXRUYWIoJ21hcCcpOwogICAgaWYob3Zlcil7cmVuZGVyKCk7ZmluaXNoKCl9ZWxzZXskKCdlbmQnKS5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7cmVuZGVyKCl9CiAgfWNhdGNoKGUpe2NvbnNvbGUuZXJyb3IoJ05pZSB1ZGHFgm8gc2nEmSBvZHR3b3J6ecSHIFBvZGJvanU6JyxlKX0KICBmaW5hbGx5e3BvZFJlbW90ZUFwcGx5aW5nPWZhbHNlfQp9CndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJyxlPT57CiAgY29uc3QgZD1lLmRhdGE7aWYoIWR8fGQucG9kYm9qIT09MSlyZXR1cm47CiAgaWYoZC5jbWQ9PT0nc3RhcnQnKXsKICAgIHBvZE9ubGluZT10cnVlO3BvZFNlYXQ9TnVtYmVyKGQuc2VhdCk7cG9kU3RhcnRlZD10cnVlO05BTUVTPShkLm5hbWVzfHxOQU1FUykuc2xpY2UoKTsKICAgIHN0YXJ0KE51bWJlcihkLm4pfHxkLm5hbWVzLmxlbmd0aCk7CiAgICAkKCd0bW9kZUJ0bicpLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTskKCd0cGFuZWwnKS5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7JCgnbmV3R2FtZUJ0bicpLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTsKICAgIGlmKGQuZW1pdClwb2RTZW5kU3RhdGUoKTsKICB9ZWxzZSBpZihkLmNtZD09PSdhcHBseScpewogICAgcG9kT25saW5lPXRydWU7aWYoTnVtYmVyLmlzSW50ZWdlcihOdW1iZXIoZC5zZWF0KSkpcG9kU2VhdD1OdW1iZXIoZC5zZWF0KTsKICAgIGlmKCFwb2RTdGFydGVkJiZkLnN0YXRlKXtwb2RTdGFydGVkPXRydWU7TkFNRVM9KGQuc3RhdGUubmFtZXN8fE5BTUVTKS5zbGljZSgpO3N0YXJ0KE51bWJlcihkLnN0YXRlLk4pfHxOQU1FUy5sZW5ndGgpOyQoJ3Rtb2RlQnRuJykuY2xhc3NMaXN0LmFkZCgnaGlkZScpOyQoJ3RwYW5lbCcpLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTskKCduZXdHYW1lQnRuJykuY2xhc3NMaXN0LmFkZCgnaGlkZScpfQogICAgcG9kQXBwbHlTdGF0ZShkLnN0YXRlKTsKICB9Cn0pOwp3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsKCk9Pnt0cnl7cGFyZW50LnBvc3RNZXNzYWdlKHtwb2Rib2o6MSx0eXBlOidyZWFkeSd9LCcqJyl9Y2F0Y2goZSl7fX0pOwoKLyogPT09PT0gVFJZQiBPRkZMSU5FIFogQk9UQU1JID09PT09ICovCmxldCBCT1Q9W10sYm90VG9rPTAsQkw9MSxib3RMb2c9W107CmZ1bmN0aW9uIHN0YXJ0Qm90cyhuYil7CiAgQkw9KyQoJ2JkaWZmJykudmFsdWU7Qk9UPVtmYWxzZV07CiAgTkFNRVM9WydUeScsJ0JvdCBBbGZhJywnQm90IEJldGEnLCdCb3QgR2FtbWEnXS5zbGljZSgwLG5iKzEpOwogIGZvcihsZXQgaz0wO2s8bmI7aysrKUJPVC5wdXNoKHRydWUpOwogICQoJ3Rtb2RlJykuY2hlY2tlZD1mYWxzZTsKICBzdGFydChuYisxKTsKICAkKCd0bW9kZUJ0bicpLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTskKCd0cGFuZWwnKS5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7Cn0KWydjbGljaycsJ3BvaW50ZXJkb3duJ10uZm9yRWFjaChldj0+d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZXYsZT0+ewogIGlmKHBvZE9ubGluZXx8IUJPVFtjdXJdfHxvdmVyKXJldHVybjsKICBjb25zdCB0PWUudGFyZ2V0OwogIGlmKHQmJnQuY2xvc2VzdCYmdC5jbG9zZXN0KCcjYm9hcmQsI3JvbGwsI3NraXAsI3Nob3AgYnV0dG9uLCNtYm94LCNtZW51LCNjYW5jZWxBaW0nKSl7ZS5zdG9wUHJvcGFnYXRpb24oKTtlLnByZXZlbnREZWZhdWx0KCl9Cn0sdHJ1ZSkpOwpjb25zdCBid2FpdD0obXMsdCxmKT0+c2V0VGltZW91dCgoKT0+e2lmKHQ9PT1ib3RUb2smJiFvdmVyKWYoKX0sbXMpOwpmdW5jdGlvbiBib3RDb3VudHMoKXtjb25zdCByYz1BcnJheS5mcm9tKHtsZW5ndGg6Tn0sKCk9Pih7fSkpO293bmVyLmZvckVhY2goKG8saSk9PntpZihvPj0wKXJjW29dW3JlZ2lvbltpXV09KHJjW29dW3JlZ2lvbltpXV18fDApKzF9KTtyZXR1cm4gcmN9CmZ1bmN0aW9uIGJvdE15UmVnaW9ucygpe2NvbnN0IHM9bmV3IFNldCgpO293bmVyLmZvckVhY2goKG8saSk9PntpZihvPT09Y3VyKXMuYWRkKHJlZ2lvbltpXSl9KTtyZXR1cm4gc30KZnVuY3Rpb24gYm90Q291bnQoYXJyKXtsZXQgbj0wO293bmVyLmZvckVhY2goKG8saSk9PntpZihvPT09Y3VyJiZhcnJbaV0pbisrfSk7cmV0dXJuIG59CmZ1bmN0aW9uIGJvdFR1cm4odCl7CiAgaWYodCE9PWJvdFRva3x8b3Zlcnx8IUJPVFtjdXJdfHxyb2xsZWQpcmV0dXJuOwogIHNldFRhYignbWFwJyk7Ym90TG9nPVtdOwogIHRyeXtib3RTaG9wKCk7Ym90RmlyZSgpfWNhdGNoKGUpe2NvbnNvbGUuZXJyb3IoJ0JvdDonLGUpfQogIGlmKGJvdExvZy5sZW5ndGgpJCgnbXNnJykudGV4dENvbnRlbnQ9J/CfpJYgJytOQU1FU1tjdXJdKyc6ICcrYm90TG9nLmpvaW4oJyAnKTsKICByZW5kZXIoKTsKICBid2FpdCgxMTAwLHQsKCk9PntpZihyb2xsZWQpcmV0dXJuO3JvbGwoKTtid2FpdCgxMzAwLHQsKCk9PmJvdENsYWltKHQpKX0pOwp9CmZ1bmN0aW9uIGJvdENsYWltKHQpewogIGlmKHQhPT1ib3RUb2t8fG92ZXJ8fCFCT1RbY3VyXXx8IXJvbGxlZHx8bGVmdDw9MClyZXR1cm47CiAgY29uc3QgYXY9Wy4uLmF2YWlsKCldO2lmKCFhdi5sZW5ndGgpcmV0dXJuOwogIHBsYWNlTW9kZT1mYWxzZTtjbGFpbShib3RQaWNrQ2VsbChhdikpOwogIGJ3YWl0KDM4MCx0LCgpPT5ib3RDbGFpbSh0KSk7Cn0KZnVuY3Rpb24gYm90UGlja0NlbGwoYXYpewogIGNvbnN0IG15PWJvdE15UmVnaW9ucygpLG5vaXNlPVs2LDIsLjRdW0JMXTtsZXQgYmVzdD1hdlswXSxicz0tMWU5OwogIGZvcihjb25zdCBpIG9mIGF2KXsKICAgIGxldCBzPU1hdGgucmFuZG9tKCkqbm9pc2U7CiAgICBpZighbXkuaGFzKHJlZ2lvbltpXSkpcys9MTA7CiAgICBpZihjb2luW2ldKXMrPTM7aWYocG90W2ldKXMrPTc7CiAgICBsZXQgZnJlZT0wLG5ld3o9MDsKICAgIGZvcihjb25zdCBqIG9mIG5iOChpKSlpZihvd25lcltqXT09PS0xKXtmcmVlKys7aWYoIW15LmhhcyhyZWdpb25bal0pKW5ld3orK30KICAgIHMrPWZyZWUqLjE1K25ld3oqKEJMPj0xPzEuMjouMyk7CiAgICBpZihzPmJzKXticz1zO2Jlc3Q9aX0KICB9CiAgcmV0dXJuIGJlc3Q7Cn0KZnVuY3Rpb24gYm90U3BvdChraW5kKXsKICBjb25zdCBmcmVlPVsuLi5vd25GcmVlKCldO2lmKCFmcmVlLmxlbmd0aClyZXR1cm4gLTE7CiAgbGV0IGJlc3Q9LTEsYnM9LTFlOTsKICBmb3IoY29uc3QgaSBvZiBmcmVlKXsKICAgIGNvbnN0IHg9aSVXLHk9KGkvVyl8MDtsZXQgZW49MDsKICAgIGZvcihsZXQgZHk9LTM7ZHk8PTM7ZHkrKylmb3IobGV0IGR4PS0zO2R4PD0zO2R4Kyspe2NvbnN0IGE9eCtkeCxiPXkrZHk7aWYoYTwwfHxiPDB8fGE+PVd8fGI+PUgpY29udGludWU7Y29uc3Qgbz1vd25lcltpZHgoYSxiKV07aWYobz49MCYmbyE9PWN1cillbisrfQogICAgY29uc3Qgcz0oa2luZD09PSdjYW5ub24nP2VuOi1lbioyKStNYXRoLnJhbmRvbSgpOwogICAgaWYocz5icyl7YnM9cztiZXN0PWl9CiAgfQogIHJldHVybiBiZXN0Owp9CmZ1bmN0aW9uIGJvdEJ1eVBsYWNlKGtpbmQpewogIGNvbnN0IGNmZz17Y2Fubm9uOltQUklDRSxidXksJ2Nhbm5vbicsJ2R6aWHFgm8nXSxnZW46W0dFTlAsYnV5R2VuLCdnZW4nLCdnZW5lcmF0b3InXSxjYXQ6W0NBVFAsYnV5Q2F0LCdjYXQnLCdrYXRhcHVsdMSZJ119W2tpbmRdOwogIGlmKHdhbGxldFtjdXJdPGNmZ1swXSlyZXR1cm4gZmFsc2U7CiAgY29uc3QgaT1ib3RTcG90KGtpbmQpO2lmKGk8MClyZXR1cm4gZmFsc2U7CiAgY2ZnWzFdKCk7cGxhY2VNb2RlPWNmZ1syXTtjbGFpbShpKTtwbGFjZU1vZGU9ZmFsc2U7CiAgYm90TG9nLnB1c2goJ0t1cGnFgiAnK2NmZ1szXSsnLicpO3JldHVybiB0cnVlOwp9CmZ1bmN0aW9uIGJvdFVwZ3JhZGUoKXsKICBmb3IobGV0IGk9MDtpPFcqSDtpKyspewogICAgaWYob3duZXJbaV0hPT1jdXIpY29udGludWU7CiAgICBsZXQgZm49bnVsbCxsYWJlbD0nJzsKICAgIGlmKGNhdFtpXSYma2x2W2ldPDImJndhbGxldFtjdXJdPj1LVVApe2ZuPXVwZ3JhZGVLRztsYWJlbD0na2F0YXB1bHTEmSd9CiAgICBlbHNlIGlmKGdlbltpXSYmZ2x2W2ldPDImJndhbGxldFtjdXJdPj1HVVApe2ZuPXVwZ3JhZGVLRztsYWJlbD0nZ2VuZXJhdG9yJ30KICAgIGVsc2UgaWYoY2Fubm9uW2ldJiZjcmFuZ2VbaV0tUkFOR0UrMTxDUk1BWCYmd2FsbGV0W2N1cl0+PVVQRyl7Zm49dXBncmFkZVJhbmdlO2xhYmVsPSd6YXNpxJlnIGR6aWHFgmEnfQogICAgZWxzZSBpZihjYW5ub25baV0mJmNwb3dbaV08MiYmd2FsbGV0W2N1cl0+PVVQRyl7Zm49dXBncmFkZTtsYWJlbD0nbW9jIGR6aWHFgmEnfQogICAgaWYoZm4pe21lbnVJPWk7Zm4oKTtjbG9zZU1lbnUoKTtib3RMb2cucHVzaCgnVWxlcHN6ecWCICcrbGFiZWwrJy4nKTtyZXR1cm4gdHJ1ZX0KICB9CiAgcmV0dXJuIGZhbHNlOwp9CmZ1bmN0aW9uIGJvdFNoaWVsZCgpewogIGJ1eVNoaWVsZCgpO3BsYWNlTW9kZT0nc2hpZWxkJzsKICBjb25zdCBjbnQ9e307b3duZXIuZm9yRWFjaCgobyxpKT0+e2lmKG89PT1jdXIpY250W3JlZ2lvbltpXV09KGNudFtyZWdpb25baV1dfHwwKSsxfSk7CiAgY29uc3QgbWluZT1bXTtvd25lci5mb3JFYWNoKChvLGkpPT57aWYobz09PWN1ciYmIXNoaWVsZFtpXSltaW5lLnB1c2goW2ksKGNhbm5vbltpXXx8Y2F0W2ldfHxnZW5baV0/NTowKSsoY250W3JlZ2lvbltpXV09PT0xPzg6MCkrTWF0aC5yYW5kb20oKSozXSl9KTsKICBtaW5lLnNvcnQoKGEsYik9PmJbMV0tYVsxXSk7CiAgZm9yKGNvbnN0IFtpXSBvZiBtaW5lKXtpZihzaGllbGRTdG9ja1tjdXJdPDEpYnJlYWs7Y2xhaW0oaSl9CiAgcGxhY2VNb2RlPWZhbHNlO2JvdExvZy5wdXNoKCdaYWJlenBpZWN6ecWCIHBvbGEuJyk7Cn0KZnVuY3Rpb24gYm90U2hvcCgpewogIGlmKEJMPDEpcmV0dXJuOwogIGNvbnN0IGNhcD1CTD49Mj8zOjI7CiAgZm9yKGxldCByPTA7cjw0O3IrKyl7CiAgICBjb25zdCBuRz1ib3RDb3VudChnZW4pLG5LPWJvdENvdW50KGNhdCksbkM9Ym90Q291bnQoY2Fubm9uKTsKICAgIGlmKG5HPDEmJmJvdEJ1eVBsYWNlKCdnZW4nKSljb250aW51ZTsKICAgIGlmKG5LPDEmJmJvdEJ1eVBsYWNlKCdjYXQnKSljb250aW51ZTsKICAgIGlmKG5DPDEmJmJvdEJ1eVBsYWNlKCdjYW5ub24nKSljb250aW51ZTsKICAgIGlmKEJMPj0yJiZzaGllbGRTdG9ja1tjdXJdPDEmJndhbGxldFtjdXJdPj0yMSYmKG5HK25LK25DKT4wKXtib3RTaGllbGQoKTtjb250aW51ZX0KICAgIGlmKGJvdFVwZ3JhZGUoKSljb250aW51ZTsKICAgIGlmKG5HPGNhcCYmYm90QnV5UGxhY2UoJ2dlbicpKWNvbnRpbnVlOwogICAgaWYobks8Y2FwJiZib3RCdXlQbGFjZSgnY2F0JykpY29udGludWU7CiAgICBpZihuQzxjYXAmJmJvdEJ1eVBsYWNlKCdjYW5ub24nKSljb250aW51ZTsKICAgIGJyZWFrOwogIH0KfQpmdW5jdGlvbiBib3RWYWwoaCxyYyl7CiAgcmV0dXJuIDErKGdlbltoXT8zOjApKyhjYW5ub25baF0/MzowKSsoY2F0W2hdPzQ6MCkrKHJjW293bmVyW2hdXVtyZWdpb25baF1dPT09MT80OjApOwp9CmZ1bmN0aW9uIGNhbm5vbkhpdHMoaSx1eCx1eSxMLHB3KXsKICBjb25zdCBjeD1pJVcrLjUsY3k9KChpL1cpfDApKy41LGhpdHM9W107CiAgZm9yKGxldCB0PS41O3Q8PUwmJmhpdHMubGVuZ3RoPHB3O3QrPS4wNSl7CiAgICBjb25zdCB4PU1hdGguZmxvb3IoY3grdXgqdCkseT1NYXRoLmZsb29yKGN5K3V5KnQpOwogICAgaWYoeDwwfHx5PDB8fHg+PVd8fHk+PUgpYnJlYWs7CiAgICBjb25zdCBjPWlkeCh4LHkpOwogICAgaWYoYyE9PWkmJm93bmVyW2NdIT09LTEmJm93bmVyW2NdIT09Y3VyJiYhaGl0cy5pbmNsdWRlcyhjKSl7aWYoc2hpZWxkW2NdKWJyZWFrO2hpdHMucHVzaChjKX0KICB9CiAgcmV0dXJuIGhpdHM7Cn0KZnVuY3Rpb24gYm90RmlyZUNhbm5vbihpKXsKICBjb25zdCBjeD1pJVcrLjUsY3k9KChpL1cpfDApKy41LFI9Y3JhbmdlW2ldLHB3PWNwb3dbaV0scmM9Ym90Q291bnRzKCk7CiAgbGV0IGJlc3Q9bnVsbCxicz0wOwogIGZvcihsZXQgaj0wO2o8VypIO2orKyl7CiAgICBjb25zdCBvPW93bmVyW2pdO2lmKG89PT0tMXx8bz09PWN1ciljb250aW51ZTsKICAgIGNvbnN0IGp4PWolVysuNSxqeT0oKGovVyl8MCkrLjUsZD1NYXRoLmh5cG90KGp4LWN4LGp5LWN5KTtpZihkPlJ8fGQ8LjUpY29udGludWU7CiAgICBjb25zdCB1eD0oangtY3gpL2QsdXk9KGp5LWN5KS9kOwogICAgY29uc3Qgc2M9Y2Fubm9uSGl0cyhpLHV4LHV5LFIscHcpLnJlZHVjZSgoYSxoKT0+YStib3RWYWwoaCxyYyksMCk7CiAgICBpZihzYz5icyl7YnM9c2M7YmVzdD17dXgsdXl9fQogIH0KICBpZighYmVzdClyZXR1cm47CiAgYWltPXtpLGRyYWc6dHJ1ZSxweDpjeCtiZXN0LnV4KlIscHk6Y3krYmVzdC51eSpSLGtpbmQ6J2Nhbm5vbid9OwogIGZpcmUoKTtib3RMb2cucHVzaCgkKCdtc2cnKS50ZXh0Q29udGVudCk7Cn0KZnVuY3Rpb24gYm90RmlyZUNhdChpKXsKICBjb25zdCBjeD1pJVcrLjUsY3k9KChpL1cpfDApKy41LFI9a2F0UmFuZ2UoaSkscmM9Ym90Q291bnRzKCksbXk9Ym90TXlSZWdpb25zKCk7CiAgbGV0IGJlc3Q9bnVsbCxicz0zLjU7CiAgZm9yKGxldCB0eT0wO3R5PEg7dHkrKylmb3IobGV0IHR4PTA7dHg8Vzt0eCsrKXsKICAgIGNvbnN0IEQ9TWF0aC5oeXBvdCh0eCsuNS1jeCx0eSsuNS1jeSk7aWYoRDwyfHxEPlIpY29udGludWU7CiAgICBjb25zdCB0PWlkeCh0eCx0eSkscmVncz1uZXcgU2V0KCk7bGV0IHNjPTA7CiAgICBmb3IoY29uc3QgYSBvZiBbdCwuLi5uYih0KV0pewogICAgICBpZihvd25lclthXT09PWN1ciljb250aW51ZTsKICAgICAgaWYob3duZXJbYV0hPT0tMSYmc2hpZWxkW2FdKWNvbnRpbnVlOwogICAgICBzYys9MTsKICAgICAgaWYob3duZXJbYV0hPT0tMSlzYys9LjUrYm90VmFsKGEscmMpOwogICAgICBpZihjb2luW2FdKXNjKz0yO2lmKHBvdFthXSlzYys9NTsKICAgICAgaWYoIW15LmhhcyhyZWdpb25bYV0pJiYhcmVncy5oYXMocmVnaW9uW2FdKSl7cmVncy5hZGQocmVnaW9uW2FdKTtzYys9Nn0KICAgIH0KICAgIGlmKHNjPmJzKXticz1zYztiZXN0PXt0eCx0eSxEfX0KICB9CiAgaWYoIWJlc3QpcmV0dXJuOwogIGNvbnN0IHA9YmVzdC5EL1IqUFVMTCx1eD0oYmVzdC50eCsuNS1jeCkvYmVzdC5ELHV5PShiZXN0LnR5Ky41LWN5KS9iZXN0LkQ7CiAgYWltPXtpLGRyYWc6dHJ1ZSxweDpjeC11eCpwLHB5OmN5LXV5KnAsa2luZDonY2F0J307CiAgZmlyZUNhdCgpO2JvdExvZy5wdXNoKCQoJ21zZycpLnRleHRDb250ZW50KTsKfQpmdW5jdGlvbiBib3RGaXJlKCl7CiAgZm9yKGxldCBpPTA7aTxXKkg7aSsrKXsKICAgIGlmKG92ZXJ8fG93bmVyW2ldIT09Y3VyfHxmaXJlZC5oYXMoaSl8fCEoY2Fubm9uW2ldfHxjYXRbaV0pKWNvbnRpbnVlOwogICAgaWYoQkw9PT0wJiZNYXRoLnJhbmRvbSgpPC41KWNvbnRpbnVlOwogICAgaWYoY2F0W2ldKWJvdEZpcmVDYXQoaSk7ZWxzZSBib3RGaXJlQ2Fubm9uKGkpOwogIH0KfQoKZnVuY3Rpb24gc3RhcnQobil7CiAgTj1uOyQoInNldHVwIikuY2xhc3NMaXN0LmFkZCgiaGlkZSIpOyQoImdhbWUiKS5jbGFzc0xpc3QucmVtb3ZlKCJoaWRlIik7CiAgJCgndHBsYXllcicpLmlubmVySFRNTD1OQU1FUy5zbGljZSgwLE4pLm1hcCgobm0sayk9PmA8b3B0aW9uIHZhbHVlPScke2t9Jz4ke25tfTwvb3B0aW9uPmApLmpvaW4oJycpOwogIHNldFRlc3QoJCgndG1vZGUnKS5jaGVja2VkKTtzZXRUYWIoJ21hcCcpOyQoJ2ljb0MnKS5pbm5lckhUTUw9VUM7JCgnaWNvSycpLmlubmVySFRNTD1VSzsKICAvLyByZWdpb255IChWb3Jvbm9pKQogIGNvbnN0IFI9MjIsc2VlZHM9W107CiAgZm9yKGxldCBrPTA7azxSO2srKylzZWVkcy5wdXNoKFtNYXRoLnJhbmRvbSgpKlcsTWF0aC5yYW5kb20oKSpIXSk7CiAgcmVnaW9uPVtdOwogIGZvcihsZXQgeT0wO3k8SDt5KyspZm9yKGxldCB4PTA7eDxXO3grKyl7CiAgICBsZXQgYj0wLGJkPTFlOTtzZWVkcy5mb3JFYWNoKChzLGspPT57Y29uc3QgZD0oc1swXS14KSoqMisoc1sxXS15KSoqMjtpZihkPGJkKXtiZD1kO2I9a319KTsKICAgIHJlZ2lvbi5wdXNoKGIpOwogIH0KICBvd25lcj1BcnJheShXKkgpLmZpbGwoLTEpOwogIFtbMCwwXSxbVy0xLEgtMV0sW1ctMSwwXSxbMCxILTFdXS5zbGljZSgwLE4pLmZvckVhY2goKHAsayk9Pm93bmVyW2lkeChwWzBdLHBbMV0pXT1rKTsKICBwb3Q9QXJyYXkoVypIKS5maWxsKGZhbHNlKTtyb3VuZHM9MDtub3RlPSIiO2NvaW49QXJyYXkoVypIKS5maWxsKGZhbHNlKTtzaGllbGQ9QXJyYXkoVypIKS5maWxsKGZhbHNlKTtzaGllbGRTdG9jaz1BcnJheShOKS5maWxsKDApO2Nhbm5vbj1BcnJheShXKkgpLmZpbGwoZmFsc2UpO2Nwb3c9QXJyYXkoVypIKS5maWxsKDEpO2NyYW5nZT1BcnJheShXKkgpLmZpbGwoUkFOR0UpO2dlbj1BcnJheShXKkgpLmZpbGwoZmFsc2UpO2dzdG9jaz1BcnJheShOKS5maWxsKDApO2NhdD1BcnJheShXKkgpLmZpbGwoZmFsc2UpO2tzdG9jaz1BcnJheShOKS5maWxsKDApO2tsdj1BcnJheShXKkgpLmZpbGwoMSk7Z2x2PUFycmF5KFcqSCkuZmlsbCgxKTt3YWxsZXQ9QXJyYXkoTikuZmlsbCgwKTtzdG9jaz1BcnJheShOKS5maWxsKDApO3BsYWNlTW9kZT1mYWxzZTsKICBmb3IobGV0IG49MDtuPDcwOyl7Y29uc3QgaT1NYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqVypIKTtpZihvd25lcltpXT09PS0xJiYhY29pbltpXSl7Y29pbltpXT10cnVlO24rK319CiAgY29uc3QgYm9hcmQ9JCgiYm9hcmQiKTtib2FyZC5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zPWByZXBlYXQoJHtXfSwxZnIpYDsKICBmb3IobGV0IGk9MDtpPFcqSDtpKyspewogICAgY29uc3QgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJkaXYiKTtkLmNsYXNzTmFtZT0iYyI7ZC5vbmNsaWNrPSgpPT5jbGFpbShpKTsKICAgIGJvYXJkLmFwcGVuZENoaWxkKGQpO2NlbGxzLnB1c2goZCk7CiAgfQogIGN1cj0wO2xlZnQ9MDtyb2xsZWQ9ZmFsc2U7b3Zlcj1mYWxzZTsKICBiZWdpbigpOwp9CmZ1bmN0aW9uIGJlZ2luKCl7CiAgcm9sbGVkPWZhbHNlO2xlZnQ9MDtwbGFjZU1vZGU9ZmFsc2U7ZmlyZWQ9bmV3IFNldCgpO2NhbmNlbEFpbSgpOwogIGxldCBpbmM9MDtvd25lci5mb3JFYWNoKChvLGkpPT57aWYobz09PWN1ciYmZ2VuW2ldKWluYys9Z2VuSW5jKGkpfSk7d2FsbGV0W2N1cl0rPWluYzsKICAkKCJyb2xsIikuZGlzYWJsZWQ9ZmFsc2U7JCgic2tpcCIpLmRpc2FibGVkPXRydWU7CiAgJCgibXNnIikudGV4dENvbnRlbnQ9YFR1cmE6ICR7TkFNRVNbY3VyXX0uIFJ6dcSHIGtvc3RrxIUhYCsoaW5jP2AgR2VuZXJhdG9yeTogKyR7aW5jfSDwn6qZYDoiIikrKG5vdGU/IiAiK25vdGU6IiIpO25vdGU9IiI7CiAgcmVuZGVyKCk7CiAgYm90VG9rKys7aWYoQk9UW2N1cl0mJiFvdmVyJiYhcG9kT25saW5lKXtjb25zdCB0PWJvdFRvaztzZXRUaW1lb3V0KCgpPT5ib3RUdXJuKHQpLDkwMCl9Cn0KZnVuY3Rpb24gcm9sbCgpewogIGlmKCFwb2RDYW5BY3QoKXx8cm9sbGVkfHxvdmVyKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7CiAgcm9sbGVkPXRydWU7JCgicm9sbCIpLmRpc2FibGVkPXRydWU7CiAgbGV0IHQ9MDtjb25zdCBpdj1zZXRJbnRlcnZhbCgoKT0+ewogICAgJCgiZGllIikudGV4dENvbnRlbnQ9RkFDRVNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjYpXTsKICAgIGlmKCsrdD45KXtjbGVhckludGVydmFsKGl2KTtjb25zdCB2PTErTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjYpOyQoImRpZSIpLnRleHRDb250ZW50PUZBQ0VTW3YtMV07bGVmdD12O2FmdGVyUm9sbCh2KX0KICB9LDcwKTsKfQpmdW5jdGlvbiBhdmFpbCgpewogIGNvbnN0IHM9bmV3IFNldCgpOwogIGNvbnN0IGRnPXN0YXRzKCkueltjdXJdPj0xMDtvd25lci5mb3JFYWNoKChvLGkpPT57aWYobz09PWN1cikoZGc/bmI4KGkpOm5iKGkpKS5mb3JFYWNoKGo9PntpZihvd25lcltqXT09PS0xKXMuYWRkKGopfSl9KTsKICByZXR1cm4gczsKfQpmdW5jdGlvbiBhZnRlclJvbGwodil7CiAgaWYoYXZhaWwoKS5zaXplPT09MCl7JCgibXNnIikudGV4dENvbnRlbnQ9YFd5cnp1Y29ubyAke3Z9LCBhbGUgJHtOQU1FU1tjdXJdfSBuaWUgbWEgZ2R6aWUgc2nEmSByb3pzemVyennEhy4gVHVyYSBwcnplcGFkYS5gO3NldFRpbWVvdXQoZW5kVHVybiwxNTAwKTtyZXR1cm59CiAgJCgic2tpcCIpLmRpc2FibGVkPWZhbHNlOwogICQoIm1zZyIpLnRleHRDb250ZW50PWBXeXJ6dWNvbm8gJHt2fSEgWmFqbWlqIHBvbGE6ICR7bGVmdH1gOwogIHJlbmRlcigpOwp9CmZ1bmN0aW9uIGNsYWltKGkpewogIGlmKCFwb2RDYW5BY3QoKXx8YWltfHxpZ25vcmVDbGljaylyZXR1cm47cG9kTWFya0FjdGlvbigpOwogIGlmKHRlc3QmJiQoJ3R0b29sJykudmFsdWUpe3Rlc3RFZGl0KGkpO3JldHVybn0KICBpZihvdmVyKXJldHVybjsKICBpZihwbGFjZU1vZGU9PT0nc2hpZWxkJyl7CiAgICBpZihvd25lcltpXT09PWN1ciYmIXNoaWVsZFtpXSYmc2hpZWxkU3RvY2tbY3VyXT4wKXtzaGllbGRbaV09dHJ1ZTtzaGllbGRTdG9ja1tjdXJdLS07aWYoc2hpZWxkU3RvY2tbY3VyXT09PTApcGxhY2VNb2RlPWZhbHNlOyQoJ21zZycpLnRleHRDb250ZW50PSfwn5uh77iPIFBvbGUgemFiZXpwaWVjem9uZSEgUG96b3N0YcWCbyBvc8WCb246ICcrc2hpZWxkU3RvY2tbY3VyXSsnLic7cmVuZGVyKCl9CiAgICByZXR1cm47CiAgfQogIGlmKHBsYWNlTW9kZSl7CiAgICBpZihvd25lcltpXT09PWN1ciYmIWNhbm5vbltpXSYmIWdlbltpXSYmIWNhdFtpXSl7CiAgICAgIGlmKHBsYWNlTW9kZT09PSJjYW5ub24iJiZzdG9ja1tjdXJdPjApe2Nhbm5vbltpXT10cnVlO2Nwb3dbaV09MTtjcmFuZ2VbaV09UkFOR0U7c3RvY2tbY3VyXS0tO3BsYWNlTW9kZT1mYWxzZTskKCJtc2ciKS50ZXh0Q29udGVudD0iRHppYcWCbyBwb3N0YXdpb25lISI7cmVuZGVyKCl9CiAgICAgIGVsc2UgaWYocGxhY2VNb2RlPT09ImdlbiImJmdzdG9ja1tjdXJdPjApe2dlbltpXT10cnVlO2dsdltpXT0xO2dzdG9ja1tjdXJdLS07cGxhY2VNb2RlPWZhbHNlOyQoIm1zZyIpLnRleHRDb250ZW50PSJHZW5lcmF0b3IgcG9zdGF3aW9ueSEiO3JlbmRlcigpfQogICAgICBlbHNlIGlmKHBsYWNlTW9kZT09PSJjYXQiJiZrc3RvY2tbY3VyXT4wKXtjYXRbaV09dHJ1ZTtrbHZbaV09MTtrc3RvY2tbY3VyXS0tO3BsYWNlTW9kZT1mYWxzZTskKCJtc2ciKS50ZXh0Q29udGVudD0iS2F0YXB1bHRhIHBvc3Rhd2lvbmEhIjtyZW5kZXIoKX0KICAgIH0KICAgIHJldHVybjsKICB9CiAgaWYoY2Fubm9uW2ldfHxjYXRbaV18fGdlbltpXSl7b3Blbk1lbnUoaSk7cmV0dXJufQogIGlmKCFyb2xsZWR8fGxlZnQ8PTApcmV0dXJuOwogIGlmKCFhdmFpbCgpLmhhcyhpKSlyZXR1cm47CiAgb3duZXJbaV09Y3VyO2xlZnQtLTsKICBpZihjb2luW2ldKXtjb2luW2ldPWZhbHNlO3dhbGxldFtjdXJdKyt9CiAgaWYocG90W2ldKXtwb3RbaV09ZmFsc2U7d2FsbGV0W2N1cl0rPVBPVENPSU5TfQogIGlmKGxlZnQ9PT0wfHxhdmFpbCgpLnNpemU9PT0wKXtyZW5kZXIoKTtlbmRUdXJuKCk7cmV0dXJufQogICQoIm1zZyIpLnRleHRDb250ZW50PWBab3N0YcWCbyBww7NsIGRvIHphasSZY2lhOiAke2xlZnR9YDsKICByZW5kZXIoKTsKfQpmdW5jdGlvbiBlbmRUdXJuKCl7CiAgaWYoIXBvZENhbkFjdCgpfHxvdmVyKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7CiAgaWYob3duZXIuZXZlcnkobz0+byE9PS0xKSl7cmV0dXJuIGZpbmlzaCgpfQogIC8vIG5hc3TEmXBueSBncmFjeiwga3TDs3J5IG1hIHJ1Y2ggKGplxZtsaSBuaWt0IG5pZSBtYSAtIGtvbmllYykKICBmb3IobGV0IGs9MTtrPD1OO2srKyl7CiAgICBjb25zdCBwPShjdXIrayklTjsKICAgIGNvbnN0IG9sZD1jdXI7Y3VyPXA7CiAgICBpZihhdmFpbCgpLnNpemU+MCl7aWYocDw9b2xkKXtyb3VuZHMrKztpZihyb3VuZHMlUE9URVZFUlk9PT0wKWRyb3BQb3QoKX1iZWdpbigpO3JldHVybn0KICAgIGN1cj1vbGQ7CiAgfQogIGZpbmlzaCgpOwp9CmZ1bmN0aW9uIHJlbmRlcigpewogIGNvbnN0IGF2PXBsYWNlTW9kZT09PSdzaGllbGQnP293blNoaWVsZGFibGUoKToocGxhY2VNb2RlP293bkZyZWUoKToocm9sbGVkJiZsZWZ0PjA/YXZhaWwoKTpuZXcgU2V0KCkpKTsKICBjZWxscy5mb3JFYWNoKChkLGkpPT57CiAgICBjb25zdCBvPW93bmVyW2ldLHI9cmVnaW9uW2ldLHg9aSVXLHk9KGkvVyl8MDsKICAgIGQuc3R5bGUuYmFja2dyb3VuZD1vPj0wP0NPTFtvXTpgaHNsKCR7KHIqNDcrMzApJTM2MH0gMzUlICR7bWF0Y2hNZWRpYSgiKHByZWZlcnMtY29sb3Itc2NoZW1lOmRhcmspIikubWF0Y2hlcz8iMjglIjoiODIlIn0pYDsKICAgIGNvbnN0IHNoPVtdOwogICAgaWYoeDxXLTEmJnJlZ2lvbltpKzFdIT09cilzaC5wdXNoKCJpbnNldCAtMnB4IDAgMCB2YXIoLS1saW5lKSIpOwogICAgaWYoeTxILTEmJnJlZ2lvbltpK1ddIT09cilzaC5wdXNoKCJpbnNldCAwIC0ycHggMCB2YXIoLS1saW5lKSIpOwogICAgaWYoIXNoLmxlbmd0aClzaC5wdXNoKCJpbnNldCAwIDAgMCAuNXB4IHJnYmEoMTI4LDEyOCwxMjgsLjI1KSIpOwogICAgZC5zdHlsZS5ib3hTaGFkb3c9c2guam9pbigiLCIpOwogICAgZC5jbGFzc0xpc3QudG9nZ2xlKCJhdiIsYXYuaGFzKGkpKTsKICAgIGQuc3R5bGUuc2V0UHJvcGVydHkoIi0tY3VyIixDT0xbY3VyXSk7CiAgICBkLmNsYXNzTGlzdC50b2dnbGUoImNvaW4iLCEhKGNvaW5baV18fHBvdFtpXSkpOwogICAge2NvbnN0IGg9ZnguaGFzKGkpPyLwn5KlIjooY2Fubm9uW2ldP1VDOihjYXRbaV0/VUs6KGdlbltpXT8i4pqhIjoocG90W2ldP1VQOihjb2luW2ldP0NJOiIiKSkpKSk7Y29uc3Qgc2hvd249aCsoc2hpZWxkW2ldPyI8c3BhbiBjbGFzcz1cInNoaWVsZE1hcmtcIj7wn5uh77iPPC9zcGFuPiI6IiIpO2lmKGQuX2ghPT1zaG93bil7ZC5pbm5lckhUTUw9c2hvd247ZC5faD1zaG93bn19CiAgfSk7CiAgY29uc3Qge2M6Y250LHp9PXN0YXRzKCk7CiAgJCgicGxheWVycyIpLmlubmVySFRNTD1jbnQubWFwKChjLGspPT5gPHNwYW4gY2xhc3M9InBsICR7az09PWN1ciYmIW92ZXI/Im9uIjoiIn0iIHN0eWxlPSJiYWNrZ3JvdW5kOiR7Q09MW2tdfSI+JHtOQU1FU1trXX0ke0JPVFtrXT8nIPCfpJYnOicnfSDCtyBTVFJFRlk6ICR7eltrXX0vJHtuZXcgU2V0KHJlZ2lvbikuc2l6ZX0gwrcgcMOzbDogJHtjfSDCtyAke0NJfSAke3dhbGxldFtrXX0ke3pba10+PTEwPycgwrcg4oaXIHVrb3MnOicnfTwvc3Bhbj5gKS5qb2luKCIiKTsKICAkKCJidXkiKS5kaXNhYmxlZD1vdmVyfHx3YWxsZXRbY3VyXTxQUklDRTsKICAkKCJidXlTIikuZGlzYWJsZWQ9b3Zlcnx8d2FsbGV0W2N1cl08MTU7CiAgJCgicGxhY2VTIikuZGlzYWJsZWQ9b3Zlcnx8KHNoaWVsZFN0b2NrW2N1cl08MSYmcGxhY2VNb2RlIT09InNoaWVsZCIpOwogICQoInBsYWNlUyIpLnRleHRDb250ZW50PShwbGFjZU1vZGU9PT0ic2hpZWxkIj8iQW51bHVqIHd5YsOzciI6IlphYmV6cGllY3ogcG9sYSIpK2AgKCR7c2hpZWxkU3RvY2tbY3VyXXx8MH0pYDsKICAkKCJwbGFjZSIpLmRpc2FibGVkPW92ZXJ8fChzdG9ja1tjdXJdPDEmJnBsYWNlTW9kZSE9PSJjYW5ub24iKTsKICAkKCJidXlHIikuZGlzYWJsZWQ9b3Zlcnx8d2FsbGV0W2N1cl08R0VOUDsKICAkKCJwbGFjZUciKS5kaXNhYmxlZD1vdmVyfHwoZ3N0b2NrW2N1cl08MSYmcGxhY2VNb2RlIT09ImdlbiIpOwogICQoInBsYWNlRyIpLnRleHRDb250ZW50PShwbGFjZU1vZGU9PT0iZ2VuIj8iQW51bHVqIHN0YXdpYW5pZSI6IlBvc3RhdyBnZW5lcmF0b3IiKStgICgke2dzdG9ja1tjdXJdfSlgOwogICQoImJ1eUsiKS5kaXNhYmxlZD1vdmVyfHx3YWxsZXRbY3VyXTxDQVRQOwogICQoInBsYWNlSyIpLmRpc2FibGVkPW92ZXJ8fChrc3RvY2tbY3VyXTwxJiZwbGFjZU1vZGUhPT0iY2F0Iik7CiAgJCgicGxhY2VLIikudGV4dENvbnRlbnQ9KHBsYWNlTW9kZT09PSJjYXQiPyJBbnVsdWogc3Rhd2lhbmllIjoiUG9zdGF3IGthdGFwdWx0xJkiKStgICgke2tzdG9ja1tjdXJdfSlgOwogICQoInBsYWNlIikudGV4dENvbnRlbnQ9KHBsYWNlTW9kZT09PSJjYW5ub24iPyJBbnVsdWogc3Rhd2lhbmllIjoiUG9zdGF3IGR6aWHFgm8iKStgICgke3N0b2NrW2N1cl19KWA7CiAgJCgid2FsIikuaW5uZXJIVE1MPWAke05BTUVTW2N1cl19OiAke0NJfSAke3dhbGxldFtjdXJdfWA7CiAgaWYocG9kT25saW5lKXsKICAgIGNvbnN0IG1pbmU9cG9kQ2FuQWN0KCk7CiAgICAkKCdyb2xsJykuZGlzYWJsZWQ9IW1pbmV8fHJvbGxlZHx8b3ZlcjsKICAgICQoJ3NraXAnKS5kaXNhYmxlZD0hbWluZXx8b3Zlcnx8IXJvbGxlZDsKICAgICQoJ2J1eScpLmRpc2FibGVkPSFtaW5lfHxvdmVyfHx3YWxsZXRbY3VyXTxQUklDRTsKICAgICQoJ2J1eVMnKS5kaXNhYmxlZD0hbWluZXx8b3Zlcnx8d2FsbGV0W2N1cl08MTU7CiAgICAkKCdwbGFjZVMnKS5kaXNhYmxlZD0hbWluZXx8b3Zlcnx8KHNoaWVsZFN0b2NrW2N1cl08MSYmcGxhY2VNb2RlIT09J3NoaWVsZCcpOwogICAgJCgnYnV5RycpLmRpc2FibGVkPSFtaW5lfHxvdmVyfHx3YWxsZXRbY3VyXTxHRU5QOwogICAgJCgnYnV5SycpLmRpc2FibGVkPSFtaW5lfHxvdmVyfHx3YWxsZXRbY3VyXTxDQVRQOwogICAgJCgncGxhY2UnKS5kaXNhYmxlZD0hbWluZXx8b3Zlcnx8KHN0b2NrW2N1cl08MSYmcGxhY2VNb2RlIT09J2Nhbm5vbicpOwogICAgJCgncGxhY2VHJykuZGlzYWJsZWQ9IW1pbmV8fG92ZXJ8fChnc3RvY2tbY3VyXTwxJiZwbGFjZU1vZGUhPT0nZ2VuJyk7CiAgICAkKCdwbGFjZUsnKS5kaXNhYmxlZD0hbWluZXx8b3Zlcnx8KGtzdG9ja1tjdXJdPDEmJnBsYWNlTW9kZSE9PSdjYXQnKTsKICAgICQoJ21zZycpLnRleHRDb250ZW50PShtaW5lPydUd29qYSB0dXJhLiAnOidUdXJhIGdyYWN6YTogJytOQU1FU1tjdXJdKycuIFBvY3pla2FqLiAnKSskKCdtc2cnKS50ZXh0Q29udGVudC5yZXBsYWNlKC9eVHdvamEgdHVyYVwuIHxeVHVyYSBncmFjemE6IFteLl0rXC4gUG9jemVrYWpcLiAvLCcnKTsKICB9CiAgaWYoIXBvZE9ubGluZSYmQk9UW2N1cl0mJiFvdmVyKVsncm9sbCcsJ3NraXAnLCdidXknLCdidXlTJywncGxhY2VTJywnYnV5RycsJ2J1eUsnLCdwbGFjZScsJ3BsYWNlRycsJ3BsYWNlSyddLmZvckVhY2goaWQ9PiQoaWQpLmRpc2FibGVkPXRydWUpOwogIHBvZFB1Ymxpc2goKTsKfQpmdW5jdGlvbiBvcGVuTWVudShpKXsKICBpZighcG9kQ2FuQWN0KCkpcmV0dXJuO21lbnVJPWk7Y29uc3QgbWluZT1vd25lcltpXT09PWN1cjsKICBjb25zdCBLPWNhdFtpXSxHPWdlbltpXTskKCdtdGl0bGUnKS5pbm5lckhUTUw9Sz9VSysnIEthdGFwdWx0YSc6Rz8n4pqhIEdlbmVyYXRvcic6VUMrJyBEemlhxYJvJzskKCdtZmlyZScpLnRleHRDb250ZW50PUs/J/Cfjq8gTmFjacSFZ25paiBpIHN0cnplbCc6J/Cfjq8gU3RyemVsYWonOyQoJ21maXJlJykuY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZScsRyk7JCgnbWt1JykuY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZScsIShLfHxHKSk7JCgnbXVwJykuY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZScsS3x8Ryk7JCgnbXJuZycpLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGUnLEt8fEcpOwogICQoJ21zdCcpLmlubmVySFRNTD1LPydNYWtzLiB6YXNpxJlnOiA8Yj4nK2thdFJhbmdlKGkpKyc8L2I+ICgnK2tsdltpXSsnLzIpPGJyPk9ic3phciB0cmFmaWVuaWE6IDxiPnBvbGUgKyA0IGRvb2tvxYJhPC9iPic6Rz8nUHJ6eWNow7NkOiA8Yj4nK2dlbkluYyhpKSsnIPCfqpk8L2I+IG5hIHR1csSZICgnK2dsdltpXSsnLzIpJzonWmFzacSZZzogPGI+JytjcmFuZ2VbaV0rJzwvYj4gKCcrKGNyYW5nZVtpXS1SQU5HRSsxKSsnLycrQ1JNQVgrJyk8YnI+TmlzemN6b25lIGJsb2tpOiA8Yj4nK2Nwb3dbaV0rJzwvYj4gKCcrY3Bvd1tpXSsnLzIpJzsKICAkKCdtbm90ZScpLnRleHRDb250ZW50PSFtaW5lPydOYWxlxbx5IGRvIGdyYWN6YTogJytOQU1FU1tvd25lcltpXV06KEc/J1Byb2R1a3VqZSBtb25ldHkgbmEgcG9jesSFdGt1IFR3b2plaiB0dXJ5Lic6ZmlyZWQuaGFzKGkpPydKdcW8IHN0cnplbGHFgm8gdyB0ZWogdHVyemUuJzonR290b3dlIGRvIHN0cnphxYJ1LicpOwogICQoJ21maXJlJykuZGlzYWJsZWQ9IW1pbmV8fGZpcmVkLmhhcyhpKXx8b3ZlcjsKICBjb25zdCBteD1jcG93W2ldPj0yOwogICQoJ211cCcpLnRleHRDb250ZW50PW14PydNYWtzLiBwb3ppb20nOifirIbvuI8gVWxlcHN6OiAyIGJsb2tpICgnK1VQRysnIPCfqpkpJzsKICAkKCdtdXAnKS5kaXNhYmxlZD0hbWluZXx8bXh8fG92ZXJ8fHdhbGxldFtjdXJdPFVQRzsKICBjb25zdCBybT1jcmFuZ2VbaV0tUkFOR0UrMT49Q1JNQVg7JCgnbXJuZycpLnRleHRDb250ZW50PXJtPydNYWtzLiB6YXNpxJlnJzon8J+UrSBaYXNpxJlnICsxICgnK1VQRysnIPCfqpkpJzsKICAkKCdtcm5nJykuZGlzYWJsZWQ9IW1pbmV8fHJtfHxvdmVyfHx3YWxsZXRbY3VyXTxVUEc7CiAgY29uc3Qga209Sz9rbHZbaV0+PTI6Z2x2W2ldPj0yLGtjPUs/S1VQOkdVUDsKICAkKCdta3UnKS50ZXh0Q29udGVudD1rbT8nTWFrcy4gcG96aW9tJzpLPyfirIbvuI8gWmFzacSZZyAxNSAoJytLVVArJyDwn6qZKSc6J+Kshu+4jyAzIPCfqpkvdHVyxJkgKCcrR1VQKycg8J+qmSknOwogICQoJ21rdScpLmRpc2FibGVkPSFtaW5lfHxrbXx8b3Zlcnx8d2FsbGV0W2N1cl08a2M7CiAgJCgnbWVudScpLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGUnKTsKfQpmdW5jdGlvbiB1cGdyYWRlKCl7CiAgaWYoIXBvZENhbkFjdCgpKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7Y29uc3QgaT1tZW51STsKICBpZihvdmVyfHxpPDB8fG93bmVyW2ldIT09Y3VyfHxjcG93W2ldPj0yfHx3YWxsZXRbY3VyXTxVUEcpcmV0dXJuOwogIHdhbGxldFtjdXJdLT1VUEc7Y3Bvd1tpXT0yOwogIHJlbmRlcigpO29wZW5NZW51KGkpOwogICQoJ21zZycpLnRleHRDb250ZW50PSdEemlhxYJvIHVsZXBzem9uZSDigJMgbmlzemN6eSB0ZXJheiAyIGJsb2tpIGxlxbzEhWNlIG5hIGxpbmlpIHN0cnphxYJ1Lic7Cn0KZnVuY3Rpb24gY2xvc2VNZW51KCl7JCgnbWVudScpLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKX0KZnVuY3Rpb24gZ2VvbSgpe2NvbnN0IHI9Y2VsbHNbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksYj0kKCdidycpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO3JldHVybntjczpyLndpZHRoLGw6ci5sZWZ0LHQ6ci50b3Asb3g6ci5sZWZ0LWIubGVmdCxveTpyLnRvcC1iLnRvcH19CmZ1bmN0aW9uIGVuZFB0KCl7CiAgY29uc3QgY3g9YWltLmklVysuNSxjeT0oKGFpbS5pL1cpfDApKy41LGR4PWFpbS5weC1jeCxkeT1haW0ucHktY3ksbD1NYXRoLmh5cG90KGR4LGR5KXx8MWUtOSxMPU1hdGgubWluKGwsY3JhbmdlW2FpbS5pXSk7CiAgcmV0dXJue3g6Y3grZHgvbCpMLHk6Y3krZHkvbCpMLEwsbCx1eDpkeC9sLHV5OmR5L2x9Owp9CmZ1bmN0aW9uIHN0YXJ0QWltKGkpewogIGlmKCFwb2RDYW5BY3QoKSlyZXR1cm47CiAgaWYob3Zlcnx8b3duZXJbaV0hPT1jdXJ8fGZpcmVkLmhhcyhpKSlyZXR1cm47CiAgY2xvc2VNZW51KCk7cGxhY2VNb2RlPWZhbHNlO2FpbT17aSxkcmFnOmZhbHNlLHB4OjAscHk6MCxraW5kOmNhdFtpXT8nY2F0JzonY2Fubm9uJ307CiAgJCgnY2FuY2VsQWltJykuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZScpOyQoJ2J3JykuY2xhc3NMaXN0LmFkZCgnYWltaW5nJyk7CiAgJCgnbXNnJykudGV4dENvbnRlbnQ9J1ByemVjacSFZ25paiBtecWha8SFIGxpbmnEmSBvZCBkemlhxYJhICh6YXNpxJlnICcrY3JhbmdlW2ldKycpIGkgcHXFm8SHLCBhYnkgc3RyemVsacSHLic7CiAgaWYoYWltLmtpbmQ9PT0nY2F0JykkKCdtc2cnKS50ZXh0Q29udGVudD0nTmFjacSFZ25paiBwcm9jxJk6IHByemVjacSFZ25paiBtecWba8SFIHcgUFJaRUNJV07EhCBzdHJvbsSZIG5pxbwgY2VsIOKAkyBpbSBkYWxlaiwgdHltIGTFgnXFvHN6eSBzdHJ6YcWCLiBQdcWbxIcsIGFieSB3eXN0cnplbGnEhy4nOwogIHJlbmRlcigpO2RyYXdBaW0oKTsKfQpmdW5jdGlvbiBjYW5jZWxBaW0obSl7CiAgYWltPW51bGw7JCgnb3YnKS5pbm5lckhUTUw9Jyc7JCgnY2FuY2VsQWltJykuY2xhc3NMaXN0LmFkZCgnaGlkZScpOyQoJ2J3JykuY2xhc3NMaXN0LnJlbW92ZSgnYWltaW5nJyk7CiAgaWYobSkkKCdtc2cnKS50ZXh0Q29udGVudD0nQW51bG93YW5vIGNlbG93YW5pZS4nOwp9CmZ1bmN0aW9uIGRyYXdBaW0oKXsKICBpZighYWltKXskKCdvdicpLmlubmVySFRNTD0nJztyZXR1cm59CiAgaWYoYWltLmtpbmQ9PT0nY2F0Jyl7ZHJhd0NhdCgpO3JldHVybn0KICBjb25zdCBnPWdlb20oKSxjeD1haW0uaSVXKy41LGN5PSgoYWltLmkvVyl8MCkrLjUsUD0oeCx5KT0+W2cub3greCpnLmNzLGcub3kreSpnLmNzXSxbc3gsc3ldPVAoY3gsY3kpLGM9Q09MW2N1cl07CiAgbGV0IHM9YDxjaXJjbGUgY3g9JyR7c3h9JyBjeT0nJHtzeX0nIHI9JyR7Y3JhbmdlW2FpbS5pXSpnLmNzfScgc3R5bGU9J2ZpbGw6JHtjfTtmaWxsLW9wYWNpdHk6LjEzO3N0cm9rZToke2N9O3N0cm9rZS13aWR0aDoyO3N0cm9rZS1kYXNoYXJyYXk6NiA0Jy8+YDsKICBzKz1gPGNpcmNsZSBjeD0nJHtzeH0nIGN5PScke3N5fScgcj0nJHtnLmNzKi43fScgc3R5bGU9J2ZpbGw6bm9uZTtzdHJva2U6JHtjfTtzdHJva2Utd2lkdGg6MycvPmA7CiAgaWYoYWltLmRyYWcpe2NvbnN0IGU9ZW5kUHQoKSxbZXgsZXldPVAoZS54LGUueSk7cys9YDxsaW5lIHgxPScke3N4fScgeTE9JyR7c3l9JyB4Mj0nJHtleH0nIHkyPScke2V5fScgc3R5bGU9J3N0cm9rZToke2N9O3N0cm9rZS13aWR0aDo0O3N0cm9rZS1saW5lY2FwOnJvdW5kJy8+PGNpcmNsZSBjeD0nJHtleH0nIGN5PScke2V5fScgcj0nNScgc3R5bGU9J2ZpbGw6JHtjfScvPmB9CiAgJCgnb3YnKS5pbm5lckhUTUw9czsKfQpmdW5jdGlvbiBmaXJlKCl7CiAgaWYoIXBvZENhbkFjdCgpKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7CiAgaWYoYWltLmtpbmQ9PT0nY2F0JylyZXR1cm4gZmlyZUNhdCgpOwogIGNvbnN0IGU9ZW5kUHQoKTsKICBpZihlLmw8MC40KXthaW0uZHJhZz1mYWxzZTtkcmF3QWltKCk7cmV0dXJufQogIGNvbnN0IGk9YWltLmksY3g9aSVXKy41LGN5PSgoaS9XKXwwKSsuNSxwdz1jcG93W2ldLGhpdHM9W107CiAgZm9yKGxldCB0PS41O3Q8PWUuTCYmaGl0cy5sZW5ndGg8cHc7dCs9LjA1KXsKICAgIGNvbnN0IHg9TWF0aC5mbG9vcihjeCtlLnV4KnQpLHk9TWF0aC5mbG9vcihjeStlLnV5KnQpOwogICAgaWYoeDwwfHx5PDB8fHg+PVd8fHk+PUgpYnJlYWs7CiAgICBjb25zdCBjPWlkeCh4LHkpOwogICAgaWYoYyE9PWkmJm93bmVyW2NdIT09LTEmJm93bmVyW2NdIT09Y3VyJiYhaGl0cy5pbmNsdWRlcyhjKSl7aWYoc2hpZWxkW2NdKWJyZWFrO2hpdHMucHVzaChjKTt9CiAgfQogIGZpcmVkLmFkZChpKTtjYW5jZWxBaW0oKTsKICBpZihoaXRzLmxlbmd0aCl7CiAgICBjb25zdCBnbD1oaXRzLmZpbHRlcihoPT5nZW5baF0pLmxlbmd0aDtoaXRzLmZvckVhY2goaD0+e293bmVyW2hdPS0xO2Nhbm5vbltoXT1mYWxzZTtnZW5baF09ZmFsc2U7Y2F0W2hdPWZhbHNlO2Z4LmFkZChoKX0pOwogICAgc2V0VGltZW91dCgoKT0+e2hpdHMuZm9yRWFjaChoPT5meC5kZWxldGUoaCkpO3JlbmRlcigpfSw4MDApOwogICAgJCgnbXNnJykudGV4dENvbnRlbnQ9J/CfkqUgVHJhZmlvbm8hIFpuaXN6Y3pvbmUgcG9sYTogJytoaXRzLmxlbmd0aCsoZ2w/JyAodyB0eW0gZ2VuZXJhdG9yeTogJytnbCsnKSc6JycpKycuJzsKICB9ZWxzZSAkKCdtc2cnKS50ZXh0Q29udGVudD0nUHVkxYJvIOKAkyBsaW5pYSBuaWUgdHJhZmnFgmEgdyBwb2xlIHByemVjaXduaWthLic7CiAgcmVuZGVyKCk7Cn0KJCgnYncnKS5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsZT0+ewogIGlmKCFhaW0pcmV0dXJuOwogIGNvbnN0IGc9Z2VvbSgpLHB4PShlLmNsaWVudFgtZy5sKS9nLmNzLHB5PShlLmNsaWVudFktZy50KS9nLmNzLGN4PWFpbS5pJVcrLjUsY3k9KChhaW0uaS9XKXwwKSsuNTsKICBpZihNYXRoLmh5cG90KHB4LWN4LHB5LWN5KTw9MSl7YWltLmRyYWc9dHJ1ZTthaW0ucHg9cHg7YWltLnB5PXB5O2UucHJldmVudERlZmF1bHQoKTtkcmF3QWltKCl9Cn0pOwp3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLGU9PnsKICBpZighYWltfHwhYWltLmRyYWcpcmV0dXJuOwogIGNvbnN0IGc9Z2VvbSgpO2FpbS5weD0oZS5jbGllbnRYLWcubCkvZy5jczthaW0ucHk9KGUuY2xpZW50WS1nLnQpL2cuY3M7ZHJhd0FpbSgpOwp9KTsKd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsKCk9PnsKICBpZighYWltfHwhYWltLmRyYWcpcmV0dXJuOwogIGlnbm9yZUNsaWNrPXRydWU7c2V0VGltZW91dCgoKT0+e2lnbm9yZUNsaWNrPWZhbHNlfSw4MCk7ZmlyZSgpOwp9KTsKd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGU9PntpZihlLmtleT09PSdFc2NhcGUnKXtpZihhaW0pY2FuY2VsQWltKHRydWUpO2Nsb3NlTWVudSgpfX0pOwpmdW5jdGlvbiBzZXRUZXN0KHYpewogIHRlc3Q9djskKCd0cGFuZWwnKS5jbGFzc0xpc3QudG9nZ2xlKCdoaWRlJywhdik7CiAgJCgndG1vZGVCdG4nKS50ZXh0Q29udGVudD0n8J+nqiBUcnliOiAnKyh2Pyd0ZXN0b3d5Jzonend5a8WCeScpOwogIGlmKCF2KSQoJ3R0b29sJykudmFsdWU9Jyc7Cn0KZnVuY3Rpb24gdG9nZ2xlVGVzdCgpe2lmKHBvZE9ubGluZSlyZXR1cm47c2V0VGVzdCghdGVzdCl9CmZ1bmN0aW9uIHRlc3RFZGl0KGkpe2lmKHBvZE9ubGluZSlyZXR1cm47CiAgY29uc3QgcD0rJCgndHBsYXllcicpLnZhbHVlLHQ9JCgndHRvb2wnKS52YWx1ZTsKICBjb25zdCBjbHI9KCk9PntjYW5ub25baV09ZmFsc2U7Z2VuW2ldPWZhbHNlO2NhdFtpXT1mYWxzZX07CiAgaWYodD09PSdvd24nKXtpZihvd25lcltpXSE9PXApe2NscigpO293bmVyW2ldPXB9fQogIGVsc2UgaWYodD09PSdmcmVlJyl7Y2xyKCk7b3duZXJbaV09LTF9CiAgZWxzZSBpZih0PT09J2NvaW4nKXtpZihvd25lcltpXT09PS0xKWNvaW5baV09IWNvaW5baV19CiAgZWxzZSBpZih0PT09J3BvdCcpe2lmKG93bmVyW2ldPT09LTEpcG90W2ldPSFwb3RbaV19CiAgZWxzZXsKICAgIGNscigpO293bmVyW2ldPXA7CiAgICBpZih0PT09J2Nhbm5vbicpe2Nhbm5vbltpXT10cnVlO2Nwb3dbaV09MTtjcmFuZ2VbaV09UkFOR0V9CiAgICBlbHNlIGlmKHQ9PT0nZ2VuJyl7Z2VuW2ldPXRydWU7Z2x2W2ldPTF9CiAgICBlbHNlIGlmKHQ9PT0nY2F0Jyl7Y2F0W2ldPXRydWU7a2x2W2ldPTF9CiAgfQogIGlmKG93bmVyW2ldPj0wKXtjb2luW2ldPWZhbHNlO3BvdFtpXT1mYWxzZX0KICByZW5kZXIoKTsKfQpmdW5jdGlvbiB0ZXN0Q29pbnMoYWRkKXtpZihwb2RPbmxpbmUpcmV0dXJuOwogIGNvbnN0IHA9KyQoJ3RwbGF5ZXInKS52YWx1ZSxuPXBhcnNlSW50KCQoJ3Rjb2lucycpLnZhbHVlKXx8MDsKICB3YWxsZXRbcF09TWF0aC5tYXgoMCxhZGQ/d2FsbGV0W3BdK246bik7CiAgcmVuZGVyKCk7Cn0KZnVuY3Rpb24gdGVzdFR1cm4oKXtpZihwb2RPbmxpbmUpcmV0dXJuOwogIGlmKG92ZXIpcmV0dXJuOwogIGN1cj0rJCgndHBsYXllcicpLnZhbHVlO2JlZ2luKCk7Cn0KZnVuY3Rpb24gc2V0VGFiKHQpewogIGlmKHQ9PT0nc2hvcCcmJmFpbSljYW5jZWxBaW0odHJ1ZSk7CiAgJCgnZ2FtZScpLmNsYXNzTGlzdC50b2dnbGUoJ3RhYi1zaG9wJyx0PT09J3Nob3AnKTsKICAkKCd0YWJNYXAnKS5jbGFzc0xpc3QudG9nZ2xlKCdvbicsdD09PSdtYXAnKTsKICAkKCd0YWJTaG9wJykuY2xhc3NMaXN0LnRvZ2dsZSgnb24nLHQ9PT0nc2hvcCcpOwp9CmZ1bmN0aW9uIGRyb3BQb3QoKXsKICBjb25zdCBmPVtdO2ZvcihsZXQgaT0wO2k8VypIO2krKylpZihvd25lcltpXT09PS0xJiYhY29pbltpXSYmIXBvdFtpXSlmLnB1c2goaSk7CiAgaWYoIWYubGVuZ3RoKXJldHVybjsKICBwb3RbZltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqZi5sZW5ndGgpXV09dHJ1ZTsKICBub3RlPSdTcGFkxYIgZ2FybmVrIHplIHrFgm90ZW0gKCcrUE9UQ09JTlMrJyBtb25ldCkg4oCTIHpham1paiBqZWdvIHBvbGUhJzsKfQpmdW5jdGlvbiB0ZXN0UG90KCl7aWYocG9kT25saW5lKXJldHVybjtkcm9wUG90KCk7JCgnbXNnJykudGV4dENvbnRlbnQ9bm90ZXx8J0JyYWsgd29sbmVnbyBwb2xhIG5hIGdhcm5lay4nO25vdGU9Jyc7cmVuZGVyKCl9CmZ1bmN0aW9uIGthdFJhbmdlKGkpe3JldHVybiBrbHZbaV0+PTI/MTU6MTJ9CmZ1bmN0aW9uIGdlbkluYyhpKXtyZXR1cm4gZ2x2W2ldPj0yPzM6Mn0KZnVuY3Rpb24gdXBncmFkZUtHKCl7CiAgaWYoIXBvZENhbkFjdCgpKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7Y29uc3QgaT1tZW51STsKICBpZihvdmVyfHxpPDB8fG93bmVyW2ldIT09Y3VyKXJldHVybjsKICBpZihjYXRbaV0pewogICAgaWYoa2x2W2ldPj0yfHx3YWxsZXRbY3VyXTxLVVApcmV0dXJuOwogICAgd2FsbGV0W2N1cl0tPUtVUDtrbHZbaV09MjskKCdtc2cnKS50ZXh0Q29udGVudD0nS2F0YXB1bHRhIHVsZXBzem9uYSDigJMgemFzacSZZyAxNSBww7NsLic7CiAgfWVsc2UgaWYoZ2VuW2ldKXsKICAgIGlmKGdsdltpXT49Mnx8d2FsbGV0W2N1cl08R1VQKXJldHVybjsKICAgIHdhbGxldFtjdXJdLT1HVVA7Z2x2W2ldPTI7JCgnbXNnJykudGV4dENvbnRlbnQ9J0dlbmVyYXRvciB1bGVwc3pvbnkg4oCTIGRhamUgMyDwn6qZIG5hIHR1csSZLic7CiAgfWVsc2UgcmV0dXJuOwogIHJlbmRlcigpO29wZW5NZW51KGkpOwp9CmZ1bmN0aW9uIHVwZ3JhZGVSYW5nZSgpewogIGlmKCFwb2RDYW5BY3QoKSlyZXR1cm47cG9kTWFya0FjdGlvbigpO2NvbnN0IGk9bWVudUk7CiAgaWYob3Zlcnx8aTwwfHxvd25lcltpXSE9PWN1cnx8d2FsbGV0W2N1cl08VVBHKXJldHVybjsKICBpZihjcmFuZ2VbaV0tUkFOR0UrMT49Q1JNQVgpcmV0dXJuO3dhbGxldFtjdXJdLT1VUEc7Y3JhbmdlW2ldKys7CiAgcmVuZGVyKCk7b3Blbk1lbnUoaSk7CiAgJCgnbXNnJykudGV4dENvbnRlbnQ9J1phc2nEmWcgZHppYcWCYSB6d2nEmWtzem9ueSBkbyAnK2NyYW5nZVtpXSsnLic7Cn0KZnVuY3Rpb24gYnV5U2hpZWxkKCl7CiAgaWYoIXBvZENhbkFjdCgpKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7CiAgaWYob3Zlcnx8d2FsbGV0W2N1cl08MTUpcmV0dXJuOwogIHdhbGxldFtjdXJdLT0xNTtzaGllbGRTdG9ja1tjdXJdKz0xMDsKICAkKCdtc2cnKS50ZXh0Q29udGVudD0nS3VwaW9ubyBvY2hyb27EmSAxMCBww7NsISBLbGlrbmlqIOKAnlphYmV6cGllY3ogcG9sYeKAnSwgYSBuYXN0xJlwbmllIHd5Ymllcnogc3dvamUgcG9sYSBuYSBtYXBpZS4nOwogIHJlbmRlcigpOwp9CmZ1bmN0aW9uIHRvZ2dsZVNoaWVsZCgpewogIGlmKCFwb2RDYW5BY3QoKSlyZXR1cm47cG9kTWFya0FjdGlvbigpOwogIGlmKG92ZXJ8fChzaGllbGRTdG9ja1tjdXJdPDEmJnBsYWNlTW9kZSE9PSdzaGllbGQnKSlyZXR1cm47CiAgcGxhY2VNb2RlPXBsYWNlTW9kZT09PSdzaGllbGQnP2ZhbHNlOidzaGllbGQnOwogICQoJ21zZycpLnRleHRDb250ZW50PXBsYWNlTW9kZT8nS2xpa25paiBkbyAxMCBzd29pY2ggcMOzbCwgYWJ5IGplIHphYmV6cGllY3p5xIcuJzoocm9sbGVkJiZsZWZ0PjA/YFpvc3RhxYJvIHDDs2wgZG8gemFqxJljaWE6ICR7bGVmdH1gOmBUdXJhOiAke05BTUVTW2N1cl19LmApOwogIHJlbmRlcigpOwp9CmZ1bmN0aW9uIGJ1eUdlbigpewogIGlmKCFwb2RDYW5BY3QoKSlyZXR1cm47cG9kTWFya0FjdGlvbigpOwogIGlmKG92ZXJ8fHdhbGxldFtjdXJdPEdFTlApcmV0dXJuOwogIHdhbGxldFtjdXJdLT1HRU5QO2dzdG9ja1tjdXJdKys7CiAgJCgnbXNnJykudGV4dENvbnRlbnQ9J0t1cGlvbm8gZ2VuZXJhdG9yISBLbGlrbmlqIOKAnlBvc3RhdyBnZW5lcmF0b3LigJ0uJzsKICByZW5kZXIoKTsKfQpmdW5jdGlvbiB0b2dnbGVQbGFjZUcoKXsKICBpZighcG9kQ2FuQWN0KCkpcmV0dXJuO3BvZE1hcmtBY3Rpb24oKTsKICBpZihvdmVyfHwoZ3N0b2NrW2N1cl08MSYmcGxhY2VNb2RlIT09J2dlbicpKXJldHVybjsKICBwbGFjZU1vZGU9cGxhY2VNb2RlPT09J2dlbic/ZmFsc2U6J2dlbic7CiAgJCgnbXNnJykudGV4dENvbnRlbnQ9cGxhY2VNb2RlPydLbGlrbmlqIHN3b2plIHBvbGUsIGFieSBwb3N0YXdpxIcgZ2VuZXJhdG9yLic6KHJvbGxlZCYmbGVmdD4wP2Bab3N0YcWCbyBww7NsIGRvIHphasSZY2lhOiAke2xlZnR9YDpgVHVyYTogJHtOQU1FU1tjdXJdfS5gKTsKICByZW5kZXIoKTsKfQpmdW5jdGlvbiBjYXRQdCgpewogIGNvbnN0IGN4PWFpbS5pJVcrLjUsY3k9KChhaW0uaS9XKXwwKSsuNSxkeD1haW0ucHgtY3gsZHk9YWltLnB5LWN5LGw9TWF0aC5oeXBvdChkeCxkeSl8fDFlLTkscD1NYXRoLm1pbihsLFBVTEwpLGQ9cC9QVUxMKmthdFJhbmdlKGFpbS5pKTsKICByZXR1cm57cCxsLGQseDpjeC1keC9sKmQseTpjeS1keS9sKmQsaHg6Y3grZHgvbCpwLGh5OmN5K2R5L2wqcH07Cn0KZnVuY3Rpb24gZHJhd0NhdCgpewogIGNvbnN0IGc9Z2VvbSgpLGN4PWFpbS5pJVcrLjUsY3k9KChhaW0uaS9XKXwwKSsuNSxQPSh4LHkpPT5bZy5veCt4KmcuY3MsZy5veSt5KmcuY3NdLFtzeCxzeV09UChjeCxjeSksYz1DT0xbY3VyXTsKICBsZXQgcz1gPGNpcmNsZSBjeD0nJHtzeH0nIGN5PScke3N5fScgcj0nJHtQVUxMKmcuY3N9JyBzdHlsZT0nZmlsbDpub25lO3N0cm9rZToke2N9O3N0cm9rZS13aWR0aDoyO3N0cm9rZS1kYXNoYXJyYXk6NiA0Jy8+YDsKICBzKz1gPGNpcmNsZSBjeD0nJHtzeH0nIGN5PScke3N5fScgcj0nJHtnLmNzKi43fScgc3R5bGU9J2ZpbGw6bm9uZTtzdHJva2U6JHtjfTtzdHJva2Utd2lkdGg6MycvPmA7CiAgaWYoYWltLmRyYWcpewogICAgY29uc3Qgaz1jYXRQdCgpLFtoeCxoeV09UChrLmh4LGsuaHkpLFtseCxseV09UChrLngsay55KTsKICAgIHMrPWA8bGluZSB4MT0nJHtzeH0nIHkxPScke3N5fScgeDI9JyR7aHh9JyB5Mj0nJHtoeX0nIHN0eWxlPSdzdHJva2U6JHtjfTtzdHJva2Utd2lkdGg6NTtzdHJva2UtbGluZWNhcDpyb3VuZDtvcGFjaXR5Oi42Jy8+YDsKICAgIHMrPWA8bGluZSB4MT0nJHtzeH0nIHkxPScke3N5fScgeDI9JyR7bHh9JyB5Mj0nJHtseX0nIHN0eWxlPSdzdHJva2U6JHtjfTtzdHJva2Utd2lkdGg6MjtzdHJva2UtZGFzaGFycmF5OjMgNScvPmA7CiAgICBjb25zdCB0eD1NYXRoLmZsb29yKGsueCksdHk9TWF0aC5mbG9vcihrLnkpOwogICAgW1swLDBdLFsxLDBdLFstMSwwXSxbMCwxXSxbMCwtMV1dLmZvckVhY2goKFtkeCxkeV0pPT57Y29uc3QgeD10eCtkeCx5PXR5K2R5O2lmKHg8MHx8eTwwfHx4Pj1XfHx5Pj1IKXJldHVybjtjb25zdCBbcngscnldPVAoeCx5KTtzKz1gPHJlY3QgeD0nJHtyeH0nIHk9JyR7cnl9JyB3aWR0aD0nJHtnLmNzfScgaGVpZ2h0PScke2cuY3N9JyBzdHlsZT0nZmlsbDoke2N9O2ZpbGwtb3BhY2l0eTouMzU7c3Ryb2tlOiR7Y307c3Ryb2tlLXdpZHRoOjInLz5gfSk7CiAgfQogICQoJ292JykuaW5uZXJIVE1MPXM7Cn0KZnVuY3Rpb24gZmlyZUNhdCgpewogIGlmKCFwb2RDYW5BY3QoKSlyZXR1cm47cG9kTWFya0FjdGlvbigpOwogIGNvbnN0IGs9Y2F0UHQoKTsKICBpZihrLmw8MC40KXthaW0uZHJhZz1mYWxzZTtkcmF3QWltKCk7cmV0dXJufQogIGNvbnN0IGk9YWltLmksdHg9TWF0aC5mbG9vcihrLngpLHR5PU1hdGguZmxvb3Ioay55KTsKICBmaXJlZC5hZGQoaSk7Y2FuY2VsQWltKCk7CiAgaWYodHg8MHx8dHk8MHx8dHg+PVd8fHR5Pj1IKXskKCdtc2cnKS50ZXh0Q29udGVudD0nUG9jaXNrIHd5bMSFZG93YcWCIHBvemEgbWFwxIUuJztyZW5kZXIoKTtyZXR1cm59CiAgY29uc3QgdD1pZHgodHgsdHkpLGFyZWE9W3QsLi4ubmIodCldO2xldCB0YWtlbj0wLGRlc3Ryb3llZD0wOwogIGFyZWEuZm9yRWFjaChhPT57CiAgICBpZihvd25lclthXT09PWN1cilyZXR1cm47CiAgICBpZihvd25lclthXSE9PS0xJiZzaGllbGRbYV0pcmV0dXJuOwogICAgaWYob3duZXJbYV0hPT0tMSl7ZGVzdHJveWVkKys7Y2Fubm9uW2FdPWZhbHNlO2dlblthXT1mYWxzZTtjYXRbYV09ZmFsc2V9CiAgICBvd25lclthXT1jdXI7dGFrZW4rKzsKICAgIGlmKGNvaW5bYV0pe2NvaW5bYV09ZmFsc2U7d2FsbGV0W2N1cl0rK30KICAgIGlmKHBvdFthXSl7cG90W2FdPWZhbHNlO3dhbGxldFtjdXJdKz1QT1RDT0lOU30KICAgIGZ4LmFkZChhKTsKICB9KTsKICBzZXRUaW1lb3V0KCgpPT57YXJlYS5mb3JFYWNoKGE9PmZ4LmRlbGV0ZShhKSk7cmVuZGVyKCl9LDgwMCk7CiAgJCgnbXNnJykudGV4dENvbnRlbnQ9J/CfqqggS2F0YXB1bHRhISBQcnplasSZdGUgcG9sYTogJyt0YWtlbisoZGVzdHJveWVkPycgKHcgdHltIHpuaXN6Y3pvbmUgcG9sYSBwcnplY2l3bmlrYTogJytkZXN0cm95ZWQrJyknOicnKSsnLic7CiAgcmVuZGVyKCk7Cn0KZnVuY3Rpb24gYnV5Q2F0KCl7CiAgaWYoIXBvZENhbkFjdCgpKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7CiAgaWYob3Zlcnx8d2FsbGV0W2N1cl08Q0FUUClyZXR1cm47CiAgd2FsbGV0W2N1cl0tPUNBVFA7a3N0b2NrW2N1cl0rKzsKICAkKCdtc2cnKS50ZXh0Q29udGVudD0nS3VwaW9ubyBrYXRhcHVsdMSZISBLbGlrbmlqIOKAnlBvc3RhdyBrYXRhcHVsdMSZ4oCdLic7CiAgcmVuZGVyKCk7Cn0KZnVuY3Rpb24gdG9nZ2xlUGxhY2VLKCl7CiAgaWYoIXBvZENhbkFjdCgpKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7CiAgaWYob3Zlcnx8KGtzdG9ja1tjdXJdPDEmJnBsYWNlTW9kZSE9PSdjYXQnKSlyZXR1cm47CiAgcGxhY2VNb2RlPXBsYWNlTW9kZT09PSdjYXQnP2ZhbHNlOidjYXQnOwogICQoJ21zZycpLnRleHRDb250ZW50PXBsYWNlTW9kZT8nS2xpa25paiBzd29qZSBwb2xlLCBhYnkgcG9zdGF3acSHIGthdGFwdWx0xJkuJzoocm9sbGVkJiZsZWZ0PjA/YFpvc3RhxYJvIHDDs2wgZG8gemFqxJljaWE6ICR7bGVmdH1gOmBUdXJhOiAke05BTUVTW2N1cl19LmApOwogIHJlbmRlcigpOwp9CmZ1bmN0aW9uIG93bkZyZWUoKXtjb25zdCBzPW5ldyBTZXQoKTtvd25lci5mb3JFYWNoKChvLGkpPT57aWYobz09PWN1ciYmIWNhbm5vbltpXSYmIWdlbltpXSYmIWNhdFtpXSlzLmFkZChpKX0pO3JldHVybiBzfQpmdW5jdGlvbiBvd25TaGllbGRhYmxlKCl7Y29uc3Qgcz1uZXcgU2V0KCk7b3duZXIuZm9yRWFjaCgobyxpKT0+e2lmKG89PT1jdXImJiFzaGllbGRbaV0pcy5hZGQoaSl9KTtyZXR1cm4gc30KZnVuY3Rpb24gYnV5KCl7CiAgaWYoIXBvZENhbkFjdCgpKXJldHVybjtwb2RNYXJrQWN0aW9uKCk7CiAgaWYob3Zlcnx8d2FsbGV0W2N1cl08UFJJQ0UpcmV0dXJuOwogIHdhbGxldFtjdXJdLT1QUklDRTtzdG9ja1tjdXJdKys7CiAgJCgibXNnIikudGV4dENvbnRlbnQ9Ikt1cGlvbm8gZHppYcWCbyEgS2xpa25paiDigJ5Qb3N0YXcgZHppYcWCb+KAnSwgYWJ5IGplIHVtaWXFm2NpxIcuIjsKICByZW5kZXIoKTsKfQpmdW5jdGlvbiB0b2dnbGVQbGFjZSgpewogIGlmKCFwb2RDYW5BY3QoKSlyZXR1cm47cG9kTWFya0FjdGlvbigpOwogIGlmKG92ZXJ8fChzdG9ja1tjdXJdPDEmJnBsYWNlTW9kZSE9PSJjYW5ub24iKSlyZXR1cm47CiAgcGxhY2VNb2RlPXBsYWNlTW9kZT09PSJjYW5ub24iP2ZhbHNlOiJjYW5ub24iOwogICQoIm1zZyIpLnRleHRDb250ZW50PXBsYWNlTW9kZT8iS2xpa25paiBzd29qZSBwb2xlLCBhYnkgcG9zdGF3acSHIGR6aWHFgm8uIjoocm9sbGVkJiZsZWZ0PjA/YFpvc3RhxYJvIHDDs2wgZG8gemFqxJljaWE6ICR7bGVmdH1gOmBUdXJhOiAke05BTUVTW2N1cl19LmApOwogIHJlbmRlcigpOwp9CmZ1bmN0aW9uIHN0YXRzKCl7CiAgY29uc3QgenM9QXJyYXkuZnJvbSh7bGVuZ3RoOk59LCgpPT5uZXcgU2V0KCkpLGM9QXJyYXkoTikuZmlsbCgwKTsKICBvd25lci5mb3JFYWNoKChvLGkpPT57aWYobz49MCl7Y1tvXSsrO3pzW29dLmFkZChyZWdpb25baV0pfX0pOwogIHJldHVybiB7Yyx6OnpzLm1hcChzPT5zLnNpemUpfTsKfQpmdW5jdGlvbiBmaW5pc2goKXsKICBvdmVyPXRydWU7cmVuZGVyKCk7CiAgY29uc3Qge2M6Y250LHp9PXN0YXRzKCk7CiAgY29uc3Qgc2M9Y250Lm1hcCgoYyxrKT0+eltrXSoxMDAwK2MpLG14PU1hdGgubWF4KC4uLnNjKSx3aW49c2MubWFwKChzLGspPT5zPT09bXg/TkFNRVNba106bnVsbCkuZmlsdGVyKEJvb2xlYW4pOwogICQoInJvbGwiKS5kaXNhYmxlZD10cnVlOyQoInNraXAiKS5kaXNhYmxlZD10cnVlOwogICQoIm1zZyIpLnRleHRDb250ZW50PSJLb25pZWMgZ3J5ISI7CiAgY29uc3QgZT0kKCJlbmQiKTtlLmNsYXNzTGlzdC5yZW1vdmUoImhpZGUiKTsKICBlLmlubmVySFRNTD1gPGgyPvCfj4YgJHt3aW4ubGVuZ3RoPjE/IlJlbWlzOiAiK3dpbi5qb2luKCIsICIpOiJXeWdyeXdhOiAiK3dpblswXX08L2gyPjxwPiR7Y250Lm1hcCgoYyxrKT0+TkFNRVNba10rIjogU1RSRUZZICIreltrXSsiLCBww7NsICIrYykuam9pbigiPGJyPiIpfTwvcD5gKyhwb2RPbmxpbmU/IiI6IjxidXR0b24gb25jbGljaz1cImxvY2F0aW9uLnJlbG9hZCgpXCI+WmFncmFqIHBvbm93bmllPC9idXR0b24+Iik7Cn0KPC9zY3JpcHQ+CjwvYm9keT4KPC9odG1sPgo=";
let POD={offline:false,ref:null,listener:null,code:'',host:null,room:null,players:[],status:'',seat:-1,frameReady:false,startedLocally:false,lastAppliedState:'',msg:''};
const podFrame=()=>document.getElementById('podFrame');
const podColors=['#e63946','#2a7de1','#2a9d4f','#f0a202'];
const podColorNames=['Kolor konta','Kolor konta','Kolor konta','Kolor konta'];
function podAccountColor(){return (typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||''))?ACC.col:'#2a9df4'}
const podClean=s=>String(s||'').replace(/[<>&]/g,'').trim().slice(0,14)||'Gracz';
function podNick(){const u=(typeof ACC!=='undefined'&&ACC.user)?ACC.user:null;return podClean((typeof ACC!=='undefined'&&ACC.nick)||(u&&u.displayName)||(u&&u.email?u.email.split('@')[0]:'Gracz'))}
function podPost(o){const f=podFrame();if(f&&f.contentWindow)try{f.contentWindow.postMessage(Object.assign({podboj:1},o),'*')}catch(e){}}
function podOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('pod').hidden=false;const f=podFrame();if(!f.dataset.loaded){f.src='gry/pod/pod.html';f.dataset.loaded='1'}else podPost({cmd:'account',name:podNick(),color:podAccountColor()});podRender();if(POD.room)podOnRoom(POD.room)}
function podExit(){podLeave();document.getElementById('pod').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
function podNet(){return typeof fbDB!=='undefined'&&!!fbDB&&typeof onlineEnsureAuth==='function'}
function podDetach(){try{if(POD.ref&&POD.listener)POD.ref.off('value',POD.listener)}catch(e){}POD.ref=null;POD.listener=null}
function podLeave(){try{if(POD.ref&&onlinePlayerId)POD.ref.child('players/'+onlinePlayerId).remove()}catch(e){}podDetach();POD.room=null;POD.players=[];POD.status='';POD.seat=-1;POD.startedLocally=false;POD.lastAppliedState='';podPost({cmd:'stop'});podRender()}
function podAttach(ref,code){podDetach();POD.ref=ref;POD.code=code;POD.startedLocally=false;POD.lastAppliedState='';POD.msg='';POD.listener=ref.on('value',snap=>podOnRoom(snap.val()),err=>{POD.msg='Błąd połączenia: '+err.message;podRender()});podRender()}
async function podCreate(){try{const uid=await onlineEnsureAuth(),code=onlineCode(),ref=fbDB.ref('podbojRooms/'+code),name=podNick();await ref.set({host:uid,status:'lobby',createdAt:firebase.database.ServerValue.TIMESTAMP,players:{[uid]:{id:uid,name,seat:0,order:0,color:podAccountColor()}}});podAttach(ref,code)}catch(e){POD.msg='Nie udało się utworzyć pokoju: '+e.message;podRender()}}
async function podJoin(){try{const uid=await onlineEnsureAuth(),code=String(document.getElementById('podJoinCode')?.value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);if(code.length!==5)throw new Error('Wpisz pięcioznakowy kod pokoju.');const ref=fbDB.ref('podbojRooms/'+code),snap=await ref.once('value'),room=snap.val();if(!room)throw new Error('Nie znaleziono pokoju o takim kodzie.');if(room.status!=='lobby'&&!(room.players&&room.players[uid]))throw new Error('Ta rozgrywka już się rozpoczęła.');if(!(room.players&&room.players[uid])){const tx=await ref.child('players').transaction(curr=>{curr=curr||{};if(curr[uid])return curr;if(room.status!=='lobby'||Object.keys(curr).length>=4)return;const used=Object.values(curr).map(p=>Number(p.seat??p.order));const seat=[0,1,2,3].find(x=>!used.includes(x));if(seat==null)return;curr[uid]={id:uid,name:podNick(),seat,order:seat,color:podAccountColor()};return curr});if(!tx.committed)throw new Error('Pokój jest pełny (maksymalnie 4 osoby) albo gra już się rozpoczęła.')}podAttach(ref,code)}catch(e){POD.msg='Nie udało się dołączyć: '+e.message;podRender()}}
function podOnRoom(room){if(!room){POD.msg='Pokój nie istnieje.';podDetach();podRender();return}POD.room=room;POD.host=room.host;POD.status=room.status;POD.players=Object.values(room.players||{}).sort((a,b)=>(Number(a.seat??a.order)||0)-(Number(b.seat??b.order)||0));POD.seat=POD.players.findIndex(p=>p.id===onlinePlayerId);if(POD.seat>=0)POD.seat=Number(POD.players[POD.seat].seat??POD.players[POD.seat].order)||0;
  if(room.status==='play'){
    const names=POD.players.map(p=>p.name||'Gracz'),colors=POD.players.map((p,i)=>/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:podColors[Number(p.seat??i)]);
    if(POD.frameReady&&!POD.startedLocally){POD.startedLocally=true;podPost({cmd:'start',n:POD.players.length,names,colors,seat:POD.seat,hostBots:room.host===onlinePlayerId,botSeats:POD.players.filter(p=>p.bot).map(p=>Number(p.seat)),botLevel:1,emit:room.host===onlinePlayerId&&!room.game?.state})}
    const raw=room.game&&room.game.state;
    if(raw&&raw!==POD.lastAppliedState){try{const state=JSON.parse(raw);POD.lastAppliedState=raw;if(POD.frameReady){if(!POD.startedLocally){POD.startedLocally=true;podPost({cmd:'start',n:state.N,names:state.names,colors:state.colors||colors,seat:POD.seat,hostBots:room.host===onlinePlayerId,botSeats:POD.players.filter(p=>p.bot).map(p=>Number(p.seat)),botLevel:1,emit:false})}podPost({cmd:'apply',seat:POD.seat,hostBots:room.host===onlinePlayerId,botSeats:POD.players.filter(p=>p.bot).map(p=>Number(p.seat)),botLevel:1,colors:state.colors||colors,state})}}catch(e){console.error('Podbój state:',e)}}
  }else{POD.startedLocally=false;POD.lastAppliedState=''}
  podRender();
}
async function podAddBot(){
  if(!POD.ref||POD.host!==onlinePlayerId||POD.status!=='lobby')return;
  try{const tx=await POD.ref.child('players').transaction(curr=>{
    curr=curr||{};const vals=Object.values(curr);if(vals.length>=4)return;
    const used=vals.map(p=>Number(p.seat??p.order));const seat=[0,1,2,3].find(x=>!used.includes(x));if(seat==null)return;
    curr['bot'+seat]={id:'bot'+seat,name:['Bot Alfa','Bot Beta','Bot Gamma','Bot Delta'][seat],seat,order:seat,color:podColors[seat],bot:true};return curr;
  });if(!tx.committed)throw new Error('Brak wolnego miejsca.');POD.msg='Dodano bota.';
  }catch(e){POD.msg='Nie udało się dodać bota: '+e.message}podRender();
}
async function podRemoveBot(){
  if(!POD.ref||POD.host!==onlinePlayerId||POD.status!=='lobby')return;
  const bot=POD.players.filter(p=>p.bot).sort((a,b)=>Number(b.seat)-Number(a.seat))[0];if(!bot)return;
  try{await POD.ref.child('players/'+bot.id).remove();POD.msg='Usunięto bota.'}catch(e){POD.msg='Nie udało się usunąć bota: '+e.message}podRender();
}
async function podHostStart(){if(!POD.ref||POD.host!==onlinePlayerId||POD.players.length<2||POD.players.length>4||POD.status!=='lobby')return;const sorted=POD.players.slice().sort((a,b)=>(Number(a.seat)||0)-(Number(b.seat)||0));if(sorted.some((p,i)=>Number(p.seat)!==i)){POD.msg='Miejsca graczy muszą być kolejno od 1 do 4. Wyjdź i utwórz pokój ponownie.';podRender();return}try{await POD.ref.update({status:'play',game:{startedAt:firebase.database.ServerValue.TIMESTAMP}})}catch(e){POD.msg='Nie udało się rozpocząć gry: '+e.message;podRender()}}
function podHandleMessage(e){const f=podFrame();if(!f||e.source!==f.contentWindow)return;const d=e.data;if(!d||d.podboj!==1)return;if(d.type==='online'){podOfflineBack();return}if(d.type==='ready'){POD.frameReady=true;podPost({cmd:'account',name:podNick(),color:podAccountColor()});if(POD.room)podOnRoom(POD.room);return}if(d.type==='finished'&&POD.ref&&POD.status==='play'&&Array.isArray(d.winners)){const winners=d.winners.map(Number),players=POD.players.map(p=>({uid:p.id,name:p.name})),winnerIds=winners.map(i=>POD.players.find(p=>Number(p.seat??p.order)===i)?.id).filter(Boolean);POD.ref.update({status:'end',winnerIds,finishedAt:firebase.database.ServerValue.TIMESTAMP}).catch(err=>console.warn('Podbój finish:',err));const me=ACC&&ACC.user&&ACC.user.uid,seat=POD.players.find(p=>p.id===me);if(seat){const mySeat=Number(seat.seat??seat.order),won=winners.includes(mySeat);statsRecord('podboj_'+POD.code,'podboj',won?(winners.length>1?'d':'w'):'l',players,false)}return}if(d.type==='state'&&POD.ref&&POD.status==='play'&&d.s&&(Number(d.s.actor)===POD.seat||(POD.host===onlinePlayerId&&POD.players.some(p=>p.bot&&Number(p.seat)===Number(d.s.actor))))){const state=d.s,actor=Number(state.actor),raw=JSON.stringify(state);POD.ref.child('game/state').transaction(old=>{if(old==null)return actor===0?raw:undefined;let prev;try{prev=JSON.parse(old)}catch(x){return}if(Number(prev.cur)!==actor)return;return raw}).then(tx=>{if(!tx.committed)console.warn('Podbój: pominięto nieaktualny lub nieuprawniony ruch')}).catch(err=>{POD.msg='Nie udało się zapisać ruchu: '+err.message;podRender()})}}
window.addEventListener('message',podHandleMessage);
const podFloat=()=>['🗺️','🎲','🪙','🔫','🛡️','🏰','🚩','🎲','⚔️','🪙','🗺️','🏆'].map((e,i)=>`<span style="left:${(i*8.7+3)%96}%;animation-duration:${14+(i*5)%11}s;animation-delay:-${(i*3.3)%14}s">${e}</span>`).join('');
const podLogo=()=>'PODBÓJ'.split('').map((c,i)=>`<b style="--i:${i}">${c}</b>`).join('');
function podTogglePane(){POD.pane=POD.pane==='join'?'':'join';POD.msg='';const e=document.getElementById('podJoinPane');if(e)e.style.display=POD.pane==='join'?'block':'none';if(POD.pane==='join')setTimeout(()=>{const i=document.getElementById('podJoinCode');if(i)i.focus()},60)}
function podOffline(){POD.offline=true;podRender()}
function podOfflineBack(){POD.offline=false;POD.frameReady=false;const f=podFrame();try{f.contentWindow.location.reload()}catch(e){}podRender()}
function podRender(){const el=document.getElementById('podroom'),f=podFrame();if(!el)return;if(!POD.ref&&POD.offline){if(f)f.hidden=false;el.innerHTML=`<div class="podbox"><div class="podrow"><button onclick="podOfflineBack()">← Wróć do pokoi online</button><span class="podmuted">Tryb offline — wybierz liczbę botów poniżej.</span></div></div>`;return}
  if(!POD.ref){if(f)f.hidden=true;const pv=(document.getElementById('podJoinCode')||{}).value||'',net=podNet();
    el.innerHTML=`<div id="podGate" class="pg"><div class="og-bg" aria-hidden="true">${podFloat()}</div>
    <button class="og-back" onclick="podExit()">← Menu główne</button>
    <div class="og-wrap"><div class="og-logo" role="img" aria-label="Podbój">${podLogo()}</div>
      <p class="og-sub">Rzuć kostką. Zajmij mapę. Przejmij strefy.</p>
      <p class="pg-nick">Grasz jako <b>${lgEsc(podNick())}</b></p>
      <div class="og-main">
        <button class="og-btn og-gold" onclick="podCreate()" ${net?'':'disabled'}><span class="og-ic">🏠</span><span>Utwórz pokój</span></button>
        <button class="og-btn og-red" onclick="podTogglePane()" ${net?'':'disabled'}><span class="og-ic">🚪</span><span>Dołącz do znajomego</span></button>
      </div>
      <div id="podJoinPane" class="og-pane" style="display:${POD.pane==='join'&&net?'block':'none'}"><label for="podJoinCode"><b>Kod pokoju od znajomego</b></label>
        <div class="og-join"><input id="podJoinCode" maxlength="5" placeholder="A8K2Q" autocomplete="off" value="${lgEsc(pv)}" onkeydown="if(event.key==='Enter')podJoin()"><button class="og-btn og-green" onclick="podJoin()">Dołącz</button></div></div>
      ${net?'':'<p class="pg-note">Pokoje online wymagają połączenia z Firebase.</p>'}
      ${POD.msg?`<div class="pg-err" role="alert">${lgEsc(POD.msg)}</div>`:''}
      <button class="og-local" onclick="podOffline()">🤖 Graj offline z botami lub na jednym ekranie</button>
    </div></div>`;return}
  const list=POD.players.map((p,i)=>`<span class="podchip"><i class="podcolor" style="background:${/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:'#888'}"></i>${lgEsc(p.name||'Gracz')} · kolor konta${p.id===POD.host?' (host)':''}${p.id===onlinePlayerId?' (Ty)':''}</span>`).join('');
  const lobby=POD.status==='lobby';if(f)f.hidden=lobby;
  if(lobby){
    const pl=POD.players.map((q,i)=>`<div><i class="podcolor" style="background:${/^#[0-9a-f]{6}$/i.test(q.color||'')?q.color:'#888'}"></i>${i+1}. ${lgEsc(q.name||'Gracz')}${q.bot?' 🤖':''}${q.id===POD.host?' <b class="pg-host">(host)</b>':''}${q.id===onlinePlayerId?' <b>(Ty)</b>':''}</div>`).join('');
    const isHost=POD.host===onlinePlayerId;
    el.innerHTML=`<div id="podGate" class="pg inlobby"><div class="og-bg" aria-hidden="true">${podFloat()}</div>
    <button class="og-back" onclick="podExit()">← Wyjdź z pokoju</button>
    <div class="og-wrap"><div class="og-logo" role="img" aria-label="Podbój">${podLogo()}</div>
      <div class="og-lobby" style="display:block"><span class="og-badge">🗺️ Podbój online</span>
        <div class="og-codewrap">Kod pokoju<div class="og-code">${lgEsc(POD.code)}</div></div>
        <div class="pg-status">Gracze: ${POD.players.length}/4 · Boty: ${POD.players.filter(q=>q.bot).length}${isHost?'':' · Czekaj, aż host rozpocznie grę.'}</div>
        <div class="pg-players">${pl}</div>
        ${isHost?`<div class="pg-hostrow"><button class="og-btn og-ghost" onclick="podAddBot()" ${POD.players.length<4?'':'disabled'}>＋ Dodaj bota</button><button class="og-btn og-ghost" onclick="podRemoveBot()" ${POD.players.some(q=>q.bot)?'':'disabled'}>－ Usuń bota</button></div><button class="og-btn og-gold" style="margin-top:12px" onclick="podHostStart()" ${POD.players.length>=2?'':'disabled'}><span class="og-ic">⚔️</span><span>Rozpocznij grę</span></button>`:''}
        <button class="og-btn og-ghost" style="margin-top:10px" onclick="navigator.clipboard?.writeText(POD.code).then(()=>{POD.msg='Kod pokoju skopiowany.';podRender()}).catch(()=>{POD.msg='Kod pokoju: '+POD.code;podRender()})">📋 Kopiuj kod pokoju</button>
        ${POD.msg?`<div class="pg-err" role="alert">${lgEsc(POD.msg)}</div>`:''}
      </div></div></div>`;return;
  }
  el.innerHTML=`<div class="podbox"><b>Pokój: <span style="color:var(--acc);letter-spacing:.12em">${lgEsc(POD.code)}</span></b><div class="podrow">${list}</div><div class="podmuted">Gracze: ${POD.players.length}/4 · Boty: ${POD.players.filter(p=>p.bot).length} · Kolory graczy są pobierane z ich kont.</div><div class="podrow">${lobby?(POD.host===onlinePlayerId?`<button onclick="podAddBot()" ${POD.players.length<4?'':'disabled'}>＋ Dodaj bota</button><button onclick="podRemoveBot()" ${POD.players.some(p=>p.bot)?'':'disabled'}>－ Usuń bota</button><button onclick="podHostStart()" ${POD.players.length>=2?'':'disabled'}>Rozpocznij grę</button>`:'<span>Oczekiwanie na rozpoczęcie przez hosta…</span>'):POD.status==='play'?'Gra trwa — ruch wykonuje gracz, którego kolor jest aktywny.':'Gra zakończona.'}<button onclick="navigator.clipboard?.writeText(POD.code).then(()=>{POD.msg='Kod pokoju skopiowany.';podRender()}).catch(()=>{POD.msg='Kod pokoju: '+POD.code;podRender()})">Kopiuj kod</button></div>${POD.msg?`<div style="color:#ffcf70">${lgEsc(POD.msg)}</div>`:''}</div>`;
}

/* ===== POMYSŁODAWCY GRY (admin wybiera kilku, wszyscy widzą) ===== */
var IDEAS={},IDEA_REF=null,IDEA_BUSY=false,IDEA_CUR=0,IDEA_SEQ=0,IDEA_T=null,IDEA_PICK={n:0,q:'',res:null,msg:''};
const IDEA_NAMES={1:'Monopoly piłkarskie',2:'Zgadywanie literek',3:'Tukan',4:'Czółko',5:'Państwa Miasta',6:'Podbój',7:'Statki',8:'Łamanie kodu',12:'Imperia',13:'Kim jestem?',14:'Prawdziwe życie',16:'Kulki'};
function ideaLocalLoad(){try{return JSON.parse(localStorage.getItem('fm_ideas')||'{}')||{}}catch(e){return{}}}
function ideaIsAdmin(){return typeof ACC!=='undefined'&&!!ACC.admin}
function ideaHasFb(){try{return !!fbDB&&typeof onlineEnsureAuth==='function'}catch(e){return false}}
const ideaKey=u=>u.uid?String(u.uid):'n_'+String(u.nick||'').toLowerCase().replace(/[^\p{L}\p{N}_-]/gu,'_');
function ideaList(n){
  const v=IDEAS['g'+n];if(!v)return[];const out=[];
  if(v.nick)out.push({k:ideaKey(v),nick:String(v.nick),uid:v.uid||'',t:0});
  if(v.m)Object.keys(v.m).forEach(k=>{const x=v.m[k];if(x&&x.nick)out.push({k,nick:String(x.nick),uid:x.uid||'',t:+x.t||0})});
  return out.sort((a,b)=>a.t-b.t);
}
async function ideasInit(){
  if(IDEA_REF||IDEA_BUSY)return;
  if(!ideaHasFb()){IDEAS=ideaLocalLoad();ideaRender();return}
  IDEA_BUSY=true;
  try{
    await onlineEnsureAuth();
    if(!IDEA_REF){IDEA_REF=fbDB.ref('ideas');IDEA_REF.on('value',s=>{IDEAS=s.val()||{};ideaRender();ideaCurRender()},()=>{})}
  }catch(e){}
  IDEA_BUSY=false;
}
function ideaHtml(n){
  const l=ideaList(n);
  return (l.length?'<div class="ideatxt">'+(l.length>1?'Pomysłodawcy':'Pomysłodawca')+': <b>'+l.map(u=>lgEsc(u.nick)).join(', ')+'</b></div>':'')
    +(ideaIsAdmin()?'<button type="button" class="lgbtn ideabtn" onclick="ideaOpen('+n+')">Pomysłodawca</button>':'');
}
function ideaRender(){
  const hp=document.getElementById('hubp');if(!hp)return;
  const old=document.getElementById('ideabox');if(old)old.remove();
  if(!IDEA_CUR)return;
  const h=ideaHtml(IDEA_CUR);if(!h)return;
  const b=document.createElement('div');b.id='ideabox';b.innerHTML=h;
  const go=hp.querySelector('.hubgo');
  if(go&&go.parentNode)go.parentNode.insertBefore(b,go);else hp.appendChild(b);
}
function ideaCur(n){IDEA_CUR=n;ideaRender();ideasInit()}
function ideaOpen(n){
  if(!ideaIsAdmin())return;
  msgClose();
  const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.onclick=e=>{if(e.target===d)msgClose()};document.body.appendChild(d);
  Object.assign(IDEA_PICK,{n,q:'',res:null,msg:''});
  const fb=ideaHasFb();
  d.innerHTML='<div class="accbox" id="ideaPick"><h2>Pomysłodawcy</h2><div class="lgnote">'+lgEsc(IDEA_NAMES[n]||'')+'</div><div id="ideacur"></div>'
    +'<div class="lgrow"><input id="ideaq" maxlength="30" autocomplete="off" placeholder="'+(fb?'Szukaj użytkownika do dodania':'Wpisz nick do dodania')+'" oninput="IDEA_PICK.q=this.value;ideaSearchSoon()" onkeydown="if(event.key===\'Enter\')ideaEnter()" aria-label="Nick użytkownika">'+(fb?'':'<button type="button" class="lgbtn go" onclick="ideaEnter()">Dodaj</button>')+'</div>'
    +'<div id="idearesbox"></div>'
    +'<div class="lgrow"><button type="button" class="lgbtn go" onclick="msgClose()">Gotowe</button></div></div>';
  ideaCurRender();ideaSearch();
  const i=document.getElementById('ideaq');if(i)i.focus();
}
function ideaCurRender(){
  const b=document.getElementById('ideacur');if(!b||!IDEA_PICK.n)return;
  const l=ideaList(IDEA_PICK.n);
  b.innerHTML=l.length?'<div class="lgnote">Wybrani:</div><div class="pmchips">'+l.map((u,i)=>'<button type="button" class="lgbtn ideares" onclick="ideaDel('+i+')" title="Usuń" aria-label="Usuń '+lgEsc(u.nick)+'">'+lgEsc(u.nick)+' ✕</button>').join('')+'</div>'+(l.length>1?'<div class="lgrow"><button type="button" class="lgbtn" onclick="ideaDel(-1)">Usuń wszystkich</button></div>':''):'<div class="lgnote">Nikt jeszcze nie jest wybrany.</div>';
}
function ideaResRender(){
  const b=document.getElementById('idearesbox');if(!b)return;
  const have=new Set(ideaList(IDEA_PICK.n).map(u=>u.k));
  const res=(IDEA_PICK.res||[]).map((u,i)=>have.has(ideaKey({uid:u.id,nick:u.nick}))?'':'<button type="button" class="lgbtn ideares" onclick="ideaSet('+i+')"><i class="lgd" style="background:'+lgEsc(u.color||'#888')+'"></i>+ '+lgEsc(u.nick)+'</button>').join('');
  b.innerHTML=(IDEA_PICK.msg?'<div class="lgnote">'+lgEsc(IDEA_PICK.msg)+'</div>':'')+'<div class="pmchips">'+res+'</div>';
}
function ideaSearchSoon(){clearTimeout(IDEA_T);IDEA_T=setTimeout(ideaSearch,250)}
async function ideaSearch(){
  const q=String(IDEA_PICK.q||'').trim().toLowerCase();
  if(!ideaHasFb()){IDEA_PICK.res=null;IDEA_PICK.msg='Brak połączenia z Firebase: wpisz nick i zatwierdź.';ideaResRender();return}
  IDEA_PICK.msg='Szukam…';ideaResRender();
  const my=++IDEA_SEQ;
  try{
    await onlineEnsureAuth();
    const s=await fbDB.ref('publicUsers').orderByChild('nickLower').startAt(q).endAt(q+'\uf8ff').limitToFirst(20).once('value');
    if(my!==IDEA_SEQ)return;
    const res=[];s.forEach(c=>{const v=c.val();if(v&&v.nick)res.push({id:c.key,nick:String(v.nick),color:v.color})});
    IDEA_PICK.res=res;IDEA_PICK.msg=res.length?'':'Nie znaleziono takiego użytkownika.';
  }catch(e){if(my!==IDEA_SEQ)return;IDEA_PICK.res=null;IDEA_PICK.msg='Błąd wyszukiwania: '+(e&&e.message||e)}
  ideaResRender();
}
/* op: 'add' (nick,uid) | 'del' (key) | 'all' */
async function ideaWrite(n,op,nick,uid,key){
  const g='g'+n;
  if(!ideaHasFb()){
    const a=ideaLocalLoad();
    if(op==='all')delete a[g];
    else{
      const v=a[g]=a[g]||{};
      if(v.nick){v.m=v.m||{};v.m[ideaKey(v)]={nick:v.nick,uid:v.uid||''};delete v.nick;delete v.uid}
      v.m=v.m||{};
      if(op==='add')v.m[ideaKey({nick,uid})]={nick,uid:uid||'',t:Date.now()};else delete v.m[key];
    }
    try{localStorage.setItem('fm_ideas',JSON.stringify(a))}catch(e){}
    IDEAS=a;return;
  }
  await onlineEnsureAuth();
  const ref=fbDB.ref('ideas/'+g),v=IDEAS[g]||{};
  if(op==='all')await ref.remove();
  else if(op==='add'){
    const upd={};
    if(v.nick){upd.nick=null;upd.uid=null;upd.by=null;upd.t=null;upd['m/'+ideaKey(v)]={nick:v.nick,uid:v.uid||''}}
    upd['m/'+ideaKey({nick,uid})]={nick:nick.slice(0,30),uid:uid||'',by:(ACC.nick||'').slice(0,30),t:firebase.database.ServerValue.TIMESTAMP};
    await ref.update(upd);
  }else{
    if(v.nick&&ideaKey(v)===key&&!v.m)await ref.remove();
    else if(v.nick&&ideaKey(v)===key)await ref.update({nick:null,uid:null,by:null,t:null});
    else await ref.child('m/'+key).remove();
  }
  IDEAS[g]=(await ref.once('value')).val()||undefined;if(!IDEAS[g])delete IDEAS[g];
}
const ideaErr=e=>/permission/i.test(String(e&&(e.code||e.message)))?'Brak uprawnień do zapisu. Dodaj w regułach Firebase ścieżkę ideas (odczyt dla wszystkich, zapis tylko dla administratorów).':'Błąd zapisu: '+(e&&e.message||e);
async function ideaDo(fn){
  if(!ideaIsAdmin())return;
  try{await fn();IDEA_PICK.msg=''}catch(e){IDEA_PICK.msg=ideaErr(e)}
  ideaRender();ideaCurRender();ideaResRender();
}
function ideaSet(i){const u=(IDEA_PICK.res||[])[i];if(u)return ideaDo(()=>ideaWrite(IDEA_PICK.n,'add',u.nick,u.id))}
function ideaDel(i){
  if(i<0)return ideaDo(()=>ideaWrite(IDEA_PICK.n,'all'));
  const u=ideaList(IDEA_PICK.n)[i];if(u)return ideaDo(()=>ideaWrite(IDEA_PICK.n,'del','','',u.k));
}
async function ideaEnter(){
  if(!ideaIsAdmin())return;
  if(ideaHasFb()){const r=(IDEA_PICK.res||[]).filter(u=>!ideaList(IDEA_PICK.n).some(x=>x.k===ideaKey({uid:u.id,nick:u.nick})));if(r.length===1)ideaSet(IDEA_PICK.res.indexOf(r[0]));return}
  const t=String(IDEA_PICK.q||'').trim().replace(/[<>&]/g,'').slice(0,30);
  if(t){await ideaDo(()=>ideaWrite(IDEA_PICK.n,'add',t,''));IDEA_PICK.q='';const i=document.getElementById('ideaq');if(i)i.value=''}
}

/* ===== SERWERY: katalog pokoi online + podgląd obserwatora ===== */
/* Oznacz pokój jako zakończony bez nadpisywania stanu gry potrzebnego do ekranu wyników. */
function serverMarkRoomFinished(ref){
  if(!ref||typeof ref.child!=='function')return;
  ref.child('serverClosed').transaction(v=>v===true?undefined:true)
    .then(r=>{if(r&&r.committed)return ref.child('serverClosedAt').set(firebase.database.ServerValue.TIMESTAMP);})
    .catch(e=>console.warn('Nie udało się zamknąć pokoju w katalogu serwerów:',e));
}
function serverReopenRoom(ref){
  if(!ref||typeof ref.update!=='function')return;
  ref.update({serverClosed:null,serverClosedAt:null}).catch(e=>console.warn('Nie udało się ponownie otworzyć pokoju:',e));
}
const SERVER_ROOTS=[
  ['rooms','Monopoly',1],['lgRooms','Zgadywanie literek',2],['islaRooms','Tukan',3],
  ['czRooms','Czółko',4],['kodRooms','Łamanie kodu',8],['podbojRooms','Podbój',6],
  ['kjRooms','Kim jestem?',13],['pmRooms','Państwa Miasta',5],['statkiRooms','Statki',7],
  ['unoRooms','UNO',24],['imperiaRooms','Imperia',12],['tttRooms','Gry online',15],['rlRooms','Prawdziwe życie',14]
];
let SERVER_DATA={},SERVER_LISTENERS={},SERVER_WATCH=null,SERVER_SELECTED='',SERVER_VIEW=null;
const serverEsc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const serverSafeObj=(obj)=>{const out={};if(!obj||typeof obj!=='object')return out;Object.keys(obj).forEach(k=>{if(/secret|password|private|answer|word|code|hand|deck|hidden|token|email/i.test(k))return;const v=obj[k];if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')out[k]=v;});return out;};
function serversStart(){
  if(!fbDB){const el=document.getElementById('serverList');if(el)el.innerHTML='<p class="srv-muted">Serwery są dostępne po połączeniu z Firebase.</p>';return;}
  SERVER_ROOTS.forEach(([root])=>{
    if(SERVER_LISTENERS[root])return;
    const ref=fbDB.ref(root),cb=snap=>{SERVER_DATA[root]=snap.val()||{};serversRenderList();};
    ref.on('value',cb,err=>{const el=document.getElementById('serverList');if(el)el.innerHTML+='<p class="srv-error">Nie udało się pobrać części pokoi: '+serverEsc(err.message)+'</p>';});
    SERVER_LISTENERS[root]={ref,cb};
  });
}
function serversRender(){
  return '<div class="srv-head"><div><h2>🌐 SERWERY</h2><p>Otwarte pokoje gier aktualizowane na żywo</p></div><div>'+(ideaIsAdmin()?'<button class="lgbtn srv-secondary" onclick="serversPurgeOld()">🗑 Usuń stare pokoje</button> <button class="lgbtn srv-secondary" onclick="serversPurgeOpen()">🗑 Usuń otwarte pokoje</button> ':'')+'<button class="lgbtn" onclick="serversRefresh()">↻ Odśwież</button></div></div><div id="serverList"><p class="srv-muted">Ładowanie pokoi…</p></div><div id="serverWatch" class="srv-watch"></div>';
}
/* Usuwa z Firebase stare pokoje: zamknięte/zakończone, starsze niż 48 h albo bez graczy (bez względu na wiek). */
function serversStaleRooms(){
  const now=Date.now(),H=3600*1000,out=[];
  SERVER_ROOTS.forEach(([root,game])=>{
    const data=SERVER_DATA[root]||{};
    Object.keys(data).forEach(code=>{
      const room=data[code];
      if(!room||typeof room!=='object'){out.push({root,code,game,why:'pusty wpis'});return;}
      const created=Number(room.createdAt||0);
      const closedAt=Number(room.serverClosedAt||room.finishedAt||room.endedAt||room.closedAt||0);
      const status=String(room.status||'').toLowerCase();
      const players=Object.keys(room.players||room.peers||{}).length;
      const ended=!!(room.serverClosed||closedAt)||/^(closed|end|ended|finished|complete|completed|deleted|removed|over|gameover|game_over)$/.test(status);
      let why='';
      if(ended&&(!closedAt||now-closedAt>H))why='zakończony';
      else if(created&&now-created>48*H)why='starszy niż 48 h';
      else if(!players)why='bez graczy';
      if(why)out.push({root,code,game,why});
    });
  });
  return out;
}
function serversOpenRooms(){
  const stale=new Set(serversStaleRooms().map(r=>r.root+'/'+r.code)),out=[];
  SERVER_ROOTS.forEach(([root,game])=>{
    const data=SERVER_DATA[root]||{};
    Object.keys(data).forEach(code=>{
      if(!data[code]||typeof data[code]!=='object'||stale.has(root+'/'+code))return;
      out.push({root,code,game,why:'otwarty'});
    });
  });
  return out;
}
async function serversDeleteRooms(list,label){
  if(!ideaIsAdmin()){alert('Tylko administrator może usuwać pokoje.');return;}
  if(!fbDB){alert('Brak połączenia z Firebase.');return;}
  if(!list.length){alert('Nie ma '+label+' pokoi do usunięcia.');return;}
  if(!confirm('Usunąć '+list.length+' '+label+' pokoi? Gracze zostaną z nich wyrzuceni. Tej operacji nie można cofnąć.'))return;
  let ok=0,fail=0;
  for(const r of list){
    try{await fbDB.ref(r.root+'/'+r.code).remove();if(SERVER_DATA[r.root])delete SERVER_DATA[r.root][r.code];ok++}
    catch(e){fail++;console.warn('Nie udało się usunąć pokoju',r.root,r.code,e)}
  }
  serversRenderList();
  alert('Usunięto pokoi: '+ok+(fail?'\nNie udało się usunąć: '+fail+' (sprawdź reguły bazy).':''));
}
function serversPurgeOld(){return serversDeleteRooms(serversStaleRooms(),'starych')}
function serversPurgeOpen(){return serversDeleteRooms(serversOpenRooms(),'otwartych')}
function serversRefresh(){SERVER_DATA={};serversRenderList();SERVER_ROOTS.forEach(([root])=>fbDB.ref(root).once('value').then(s=>{SERVER_DATA[root]=s.val()||{};serversRenderList();}));}
function serversRenderList(){
  const el=document.getElementById('serverList');if(!el)return;
  const rooms=[];
  SERVER_ROOTS.forEach(([root,game,tab])=>{
    const data=SERVER_DATA[root]||{};
    Object.keys(data).forEach(code=>{
      const room=data[code];if(!room||room.serverClosed||room.serverClosedAt||room.finishedAt||room.endedAt||room.closedAt)return;
      const playerMap=room.players||room.peers||{};
      if(!Object.keys(playerMap).length)return;
      const status=String(room.status||'').toLowerCase();
      if(/^(closed|end|ended|finished|complete|completed|deleted|removed|over|gameover|game_over)$/.test(status))return;
      const players=Object.values(playerMap).filter(Boolean);
      const started=!!room.peers||!['lobby','waiting','open',''].includes(status);
      let gameName=game;
      if(root==='tttRooms'){
        const prefix=String(code).split('-')[0].toLowerCase();
        const labels={szept:'Szept',holearena:'Hole Arena',darksweep:'Dark Sweep',guessr:'GuessR',panstwa:'Państwa Miasta',kro:'Kropki i Kwadraty',krzyzowka:'Krzyżówka',tabu:'Tabu',dobble:'Dobble',kulki:'Kulki',waz:'Węże i drabiny',chinczyk:'Chińczyk',bie:'6 bierze!',gof:'Go Fish',ttt:'Kółko i krzyżyk'};
        gameName=labels[prefix]||gameName;
      }
      const created=Number(room.createdAt||0);
      if(created&&Date.now()-created>48*60*60*1000)return;
      rooms.push({root,game:gameName,tab,code,room,players,started});
    });
  });
  rooms.sort((a,b)=>(b.started-a.started)||(Number(b.room.createdAt||0)-Number(a.room.createdAt||0)));
  if(!rooms.length){el.innerHTML='<div class="srv-empty"><b>Nie ma teraz otwartych pokoi</b><p>Utwórz pokój w dowolnej grze, a pojawi się tutaj.</p></div>';return;}
  el.innerHTML='<div class="srv-count">'+rooms.length+' '+(rooms.length===1?'pokój':'otwarte pokoje')+'</div><div class="srv-grid">'+rooms.map(r=>{
    const names=r.players.map(p=>serverEsc(p.name||p.nick||'Gracz')).join(', ');
    return '<article class="srv-card"><div class="srv-cardtop"><span class="srv-game">'+serverEsc(r.game)+'</span><span class="srv-status '+(r.started?'playing':'lobby')+'">'+(r.started?'W TRAKCIE':'LOBBY')+'</span></div><div class="srv-code">#'+serverEsc(r.code)+'</div><div class="srv-players">👥 '+r.players.length+' graczy</div><div class="srv-names">'+names+'</div><div class="srv-actions">'+(r.started?'<button class="lgbtn" onclick="serversWatch(\''+r.root+'\',\''+r.code+'\')">Obserwuj</button>':'<button class="lgbtn" onclick="serversJoinLobby(\''+r.root+'\',\''+r.code+'\')">Dołącz do lobby</button><button class="lgbtn srv-secondary" onclick="serversWatch(\''+r.root+'\',\''+r.code+'\')">Podgląd</button>')+'</div></article>';
  }).join('')+'</div>';
}
async function serversJoinLobby(root,code){
  try{
    if(root==='lgRooms'){await __gameJoin(lgOpen,'lgFrame',code);return;}
    if(root==='kodRooms'){await __gameJoin(kodOpen,'kodFrame',code);return;}
    if(root==='islaRooms'){islaOpen();ISL.joinCode=code;await islaJoin();return;}
    if(root==='czRooms'){await __gameJoin(czOpen,'czFrame',code);return;}
    if(root==='kjRooms'){await __gameJoin(kjOpen,'kjFrame',code);return;}
    if(root==='podbojRooms'){podOpen();setTimeout(()=>{const i=document.getElementById('podJoinCode');if(i){i.value=code;podJoin();}},180);return;}
    if(root==='rooms'){await __gameJoin(monoOpen,'monoFrame',code);return;}
    if(root==='pmRooms'){await __gameJoin(pmOpen,'pmFrame',code);return;}
    if(root==='statkiRooms'){await __gameJoin(stkOpen,'stkFrame',code);return;}
    if(root==='unoRooms'||root==='imperiaRooms'||root==='tttRooms'){
      const openers={unoRooms:'unoOpen',imperiaRooms:'impOpen'};
      const tttMap={szept:'szeptOpen',holearena:'holeOpen',darksweep:'darksweepOpen',guessr:'guessrOpen',panstwa:'pmOpen',kro:'kroOpen',krzyzowka:'krzyzowkaOpen',tabu:'tabuOpen',dobble:'dblOpen',kulki:'kulkiOpen',waz:'snlOpen',chinczyk:'chinOpen',bie:'bierzeOpen',gof:'gofOpen',ttt:'tttOpen'};
      const fn=root==='tttRooms'?(tttMap[String(code).split('-')[0].toLowerCase()]||'tttOpen'):openers[root];
      if(typeof window[fn]==='function'){window[fn]();alert('Otwarto grę. Kod pokoju: '+code+' — wpisz go w ekranie dołączania.');return;}
      serversWatch(root,code);return;
    }
    alert('Dołączanie do tego typu pokoju nie jest jeszcze obsługiwane z katalogu. Możesz otworzyć podgląd pokoju.');
  }catch(e){alert('Nie udało się dołączyć: '+(e.message||e));}
}
function serversWatch(root,code){
  if(SERVER_WATCH){SERVER_WATCH.off();SERVER_WATCH=null;}
  const ref=fbDB.ref(root+'/'+code);
  const box=document.getElementById('serverWatch');if(box)box.innerHTML='<p class="srv-muted">Ładowanie podglądu…</p>';
  SERVER_WATCH=ref;ref.on('value',snap=>{
    const room=snap.val();const target=document.getElementById('serverWatch');if(!target)return;
    if(!room){target.innerHTML='<p class="srv-error">Ten pokój został zamknięty.</p>';return;}
    const players=Object.entries(room.players||room.peers||{}).map(([id,p])=>({id,...(p||{})}));
    if(!players.some(p=>p.id===SERVER_SELECTED))SERVER_SELECTED=players[0]?.id||'';
    const selected=players.find(p=>p.id===SERVER_SELECTED);
    const publicRoom=serverSafeObj(room);
    delete publicRoom.players;
    const playerData=serverSafeObj(selected||{});
    target.innerHTML='<div class="srv-watchhead"><div><h3>👁 Tryb obserwatora</h3><p>'+serverEsc(root)+' / '+serverEsc(code)+' · podgląd na żywo</p></div><button class="lgbtn srv-secondary" onclick="serversStopWatch()">Zamknij podgląd</button></div><label class="srv-label" for="srvPlayerSelect">Obserwowany gracz</label><select id="srvPlayerSelect" class="srv-select" onchange="serversSelectPlayer(this.value)">'+players.map(p=>'<option value="'+serverEsc(p.id)+'" '+(p.id===SERVER_SELECTED?'selected':'')+'>'+serverEsc(p.name||p.nick||'Gracz')+'</option>').join('')+'</select><div class="srv-watchgrid"><section><h4>Wybrany gracz</h4><pre>'+serverEsc(JSON.stringify(playerData,null,2))+'</pre></section><section><h4>Stan pokoju</h4><pre>'+serverEsc(JSON.stringify(publicRoom,null,2))+'</pre></section></div><p class="srv-muted">Podgląd jest tylko do odczytu. Zmiana gracza przełącza wyświetlane dane tego uczestnika.</p>';
  },err=>{const target=document.getElementById('serverWatch');if(target)target.innerHTML='<p class="srv-error">Brak dostępu do podglądu: '+serverEsc(err.message)+'</p>';});
}
function serversSelectPlayer(id){SERVER_SELECTED=id;if(SERVER_WATCH)SERVER_WATCH.once('value',snap=>{const room=snap.val();if(!room)return;const players=Object.entries(room.players||{}).map(([pid,p])=>({id:pid,...(p||{})}));const selected=players.find(p=>p.id===SERVER_SELECTED);const box=document.getElementById('serverWatch');if(!box)return;const pub=serverSafeObj(room);delete pub.players;box.querySelectorAll('.srv-watchgrid pre')[0].textContent=JSON.stringify(serverSafeObj(selected||{}),null,2);});}
function serversStopWatch(){if(SERVER_WATCH){SERVER_WATCH.off();SERVER_WATCH=null;}const el=document.getElementById('serverWatch');if(el)el.innerHTML='';}

const HUBLAST={g:1,s:0};
function hubSec(x){
  if(x==='r')return hubTab(36);
  if(x==='g')return hubTab(HUBLAST.g||1);
  if(x==='f')return hubTab(9);
  const logged=typeof ACC!=='undefined'&&ACC.user;
  hubTab(HUBLAST.s&&(HUBLAST.s!==10||logged)?HUBLAST.s:(logged?10:11));
}
function hubTab(n){
  const sec=n===36?'r':(n<=8||n===12||n===13||n===14||n===15||n===16||n===17||n===18||n===19||n===20||n===21||n===22||n===23||n===24||n===25||n===26||n===27||n===28||n===29||n===30||n===32||n===33||n===34)?'g':n===9?'f':'s';
  if(sec==='g')HUBLAST.g=n;else if(sec==='s')HUBLAST.s=n;
  const setOn=(el,on)=>{if(!el)return;el.classList.toggle('on',on);el.setAttribute('aria-selected',on?'true':'false')};
  const sg=document.getElementById('hubsubg'),ss=document.getElementById('hubsubs');
  if(sg)sg.hidden=sec!=='g';if(ss)ss.hidden=sec!=='s';
  setOn(document.getElementById('hubsecg'),sec==='g');
  setOn(document.getElementById('hubsecs'),sec==='s');
  setOn(document.getElementById('hubsecr'),sec==='r');
  setOn(document.getElementById('hubtab5'),sec==='f');
  document.querySelectorAll('#hubsubg button').forEach((b,i)=>setOn(b,n===12?i===8:n===13?i===9:n===14?i===10:n===15?i===11:n===16?i===12:n===17?i===13:n===18?i===14:n===19?i===15:n===20?i===16:n===21?i===17:n===22?i===18:n===23?i===19:n===24?i===20:n===25?i===21:n===26?i===22:n===27?i===23:n===28?i===24:n===29?i===25:n===30?i===26:n===32?i===27:n===33?i===28:n===34?i===29:i===n-1));
  setOn(document.getElementById('hubtab6'),n===10);
  setOn(document.getElementById('hubtab7'),n===11);setOn(document.getElementById('hubtab8'),n===31);
  document.getElementById('hubp').innerHTML=n===36?serversRender():n===34?'<img class="hub-art" src="assets/tabu-card.webp" alt="Grafika gry Tabu" loading="lazy"><h2>Tabu</h2><p>Opisuj hasło tak, by drużyna je odgadła, ale bez 6 zakazanych słów. Drużyna przeciwna pilnuje i naciska TABU, gdy powiesz zakazane słowo (−1 punkt). Każdy gra na swoim telefonie w pokoju z kodem (nick i kolor z Twojego konta) albo w trybie lokalnym na jednym telefonie. Wyniki z pokoi (min. 2 graczy w zespołach) zapisują się w statystykach: wygrywa zespół z większą liczbą punktów.</p><button class="hubgo" onclick="tabuOpen()">Graj</button>':n===33?'<img class="hub-art" src="assets/krzyzowka-card.webp" alt="Grafika gry Krzyżówka" loading="lazy"><h2>Krzyżówka</h2><p>Klasyczna krzyżówka dla wielu graczy: wspólna plansza, każdy wpisuje hasła i zdobywa punkty za długość odgadniętych słów, a rozwiązane pola barwią się na kolor gracza. Graj solo albo w pokoju z kodem (nick i kolor z Twojego konta). Wyniki z pokoi (min. 2 graczy) zapisują się w statystykach: wygrywa osoba z największą liczbą punktów.</p><button class="hubgo" onclick="krzyzowkaOpen()">Graj</button>':n===32?'<h2>Dark Sweep</h2><p>Taktyczna strzelanka 2D z góry, w ciemności. Wszyscy gracze (do 8 osób) tworzą zieloną drużynę przeciwko czerwonym botom, a widzisz tylko to, co oświetla latarka drużyny. Stań przy ścianie i przytrzymaj Shift / C (na telefonie przycisk UKRYJ), aby wtopić się w ścianę – strzał lub trafienie cię ujawnia. Wygrywa drużyna, która pierwsza zdobędzie 25 zabójstw. Graj z botami offline albo w pokoju online z kodem (nick i kolor postaci z Twojego konta). Wyniki meczów w pokojach (min. 2 graczy) zapisują się w statystykach.</p><button class="hubgo" onclick="darksweepOpen()">Graj</button>':n===30?'<img class="hub-art" src="assets/guessr-card.webp" alt="Grafika gry GuessR" loading="lazy"><h2>GuessR</h2><p>Zgadnij, co to jest: wpisuj nazwy, a kolory podpowiedzą, jak blisko jesteś (zielony – trafione, żółty – blisko, czerwony – pudło). Motywy: dinozaury, piłkarze, zwierzęta albo własna baza. Graj solo albo w pokoju z kodem (nick i kolor z Twojego konta). Wyniki z pokoi (min. 2 graczy) zapisują się w statystykach: kto pierwszy trafi, wygrywa rundę.</p><button class="hubgo" onclick="guessrOpen()">Graj</button>':n===1?'<h2>Monopoly</h2><p>Zwykłe Monopoly z miastami Polski albo wersja piłkarska: kupuj kluby, zbieraj piłkarzy z paczek i układaj z nich składy. Utwórz pokój, dołącz do znajomego albo zagraj lokalnie na jednym urządzeniu.</p><button class="hubgo" onclick="hubPlay()">Graj</button>':n===2?'<h2>Zgadywanie literek</h2><p>Każdy wpisuje tajne hasło, a potem zgadujecie po kolei hasła sąsiadów, dostając wskazówki: czy litera jest przed, czy po w polskim alfabecie. Zagraj lokalnie albo online.</p><button class="hubgo" onclick="lgOpen()">Graj</button>':n===3?'<h2>Tukan</h2><p>Plansza z losowo przemieszanymi polami, symbolami i literami wysp, karty tras oraz panel punktacji. Zagraj solo albo w pokoju online ze znajomymi: wszyscy w pokoju dostają tę samą planszę i karty, a wyniki widać na żywo.</p><button class="hubgo" onclick="islaOpen()">Graj</button>':n===4?'<h2>Czółko</h2><p>Każdy wpisuje hasło dla następnej osoby. Widzisz hasła wszystkich oprócz własnego i zadajesz pytania, na które odpowiada się tylko „tak” albo „nie”. Gra online w pokojach.</p><button class="hubgo" onclick="czOpen()">Graj</button>':n===5?'<h2>Państwa Miasta</h2><p>Losujemy literę i wpisujecie słowa w wybranych kategoriach: państwa, miasta, imiona, zwierzęta i wiele innych. Na każdą kategorię przypada 30 sekund. Unikalne słowo daje 10 punktów, powtórzone po 5. Gra online w pokojach.</p><button class="hubgo" onclick="pmOpen()">Graj</button>':n===6?'<h2>Podbój</h2><p>Strategiczna gra o przejmowaniu terytoriów. Rzucaj kostką, rozszerzaj swoje państwo, zbieraj monety i buduj działa, generatory oraz katapulty. Kolor planszy każdego gracza jest zgodny z kolorem jego konta. Gra online dla 2–4 osób.</p><button class="hubgo" onclick="podOpen()">Graj</button>':n===7?'<h2>Statki</h2><p>Klasyczna bitwa morska dla dwóch graczy. Ustaw flotę na planszy 10×10, a następnie na zmianę ostrzeliwuj pola przeciwnika. Wygrywa osoba, która zatopi wszystkie statki rywala.</p><button class="hubgo" onclick="stkOpen()">Graj</button>':n===8?'<h2>Łamanie kodu</h2><p>Każdy ustawia tajny 4-cyfrowy kod, a potem zgadujecie po kolei kody sąsiadów, pole po polu. Po każdej próbie widzisz, które cyfry są dobre, a które złe, a błędne cyfry odpadają z puli w danym polu. Kto pierwszy złamie kod, wygrywa. Zagraj lokalnie albo online.</p><button class="hubgo" onclick="kodOpen()">Graj</button>':n===12?'<h2>Imperia</h2><p>Turowa strategia na mapie heksagonalnej: wybierz jedną z sześciu cywilizacji, zakładaj miasta, werbuj armie i rozstrzygaj bitwy taktyczne. Nick i kolor pobierane są z Twojego konta. Gra online dla 2–6 osób w pokojach (kod), z opcją dodania AI, albo lokalnie.</p><button class="hubgo" onclick="impOpen()">Graj</button>':n===13?'<h2>Kim jestem?</h2><p>Gra dla dwóch osób w pokoju online. Na planszy 6×4 jest 24 postaci: każdy w tajemnicy wybiera jedną, a potem na zmianę zadajecie pytania tak/nie i zakrywacie ikony, które nie pasują. Kto pierwszy zgadnie postać przeciwnika, wygrywa. Motywy plansz dodaje administrator.</p><button class="hubgo" onclick="kjOpen()">Graj</button>':n===14?'<h2>Prawdziwe życie</h2><p>Trójwymiarowa gra solo o codziennym życiu: chodź po mieście, zbieraj przedmioty, korzystaj ze sklepu, restauracji i pracy oraz zarządzaj ekwipunkiem. Sterowanie: WASD / strzałki – ruch, Shift – bieg, spacja – skok, Q/E – obrót kamery, I – ekwipunek, F – interakcja, P – telefon; na telefonie joystick ekranowy.</p><button class="hubgo" onclick="rlOpen()">Graj</button>':n===15?'<h2>Kółko i krzyżyk</h2><p>Trzy w rzędzie na planszy 3×3, 8×8 lub 12×12. Zagraj z komputerem albo lokalnie z drugą osobą na jednym urządzeniu.</p><button class="hubgo" onclick="tttOpen()">Graj</button>':n===16?'<h2>Kulki</h2><p>Pojedynek jak z Squid Game: ukrywasz w dłoni kulki, a przeciwnik zgaduje, czy ich liczba jest parzysta. Trafi – zabiera Ci tyle kulek, ile miałeś w dłoni, pudło – ty zabierasz jemu. Zagraj z botem albo online w pokoju ze znajomym. Wyniki zapisują się w statystykach.</p><button class="hubgo" onclick="kulkiOpen()">Graj</button>':n===17?'<h2>Węże i drabiny</h2><p>Klasyczny wyścig do setki: rzucaj kostką, wspinaj się po drabinach i uważaj na węże. Szóstka daje dodatkowy rzut. Zagraj online w pokoju z kodem (do 4 osób, z Twoim nickiem i kolorem pionka) albo lokalnie na jednym urządzeniu. Wyniki zapisują się w statystykach.</p><button class="hubgo" onclick="snlOpen()">Graj</button>':n===18?'<h2>Prawda czy Wyzwanie</h2><p>Imprezowa gra 18+ na jednym urządzeniu, bez pokoi i bez internetu. Dodaj graczy, wybierz poziom pikantności, a potem losuj prawdę lub wyzwanie. Gra działa wyłącznie offline.</p><button class="hubgo" onclick="pcwOpen()">Graj</button>':n===19?'<h2>Dobble</h2><p>Szybka gra refleksu: na karcie środkowej i na Twojej karcie jest dokładnie jeden wspólny symbol. Kto kliknie go pierwszy, zabiera kartę i dostaje punkt. Pudło blokuje Cię na 1,5 s. Gra online w pokoju z kodem (2–5 osób, z nickiem z Twojego konta). Wyniki zapisują się w statystykach.</p><button class="hubgo" onclick="dblOpen()">Graj</button>':n===20?'<h2>Grzybobranie</h2><p>Wyścig przez las: rzucaj kostką, wybieraj ścieżkę do mety, zbieraj borowiki (+1) i omijaj muchomory (−1). Szóstka daje dodatkowy rzut, a dotarcie do mety to +3 punkty. Gra online w pokoju z kodem (do 4 osób, z nickiem i kolorem pionka z Twojego konta) albo solo na próbę. Wyniki zapisują się w statystykach.</p><button class="hubgo" onclick="grzOpen()">Graj</button>':n===21?'<h2>Wisielec</h2><p>Zgadujcie hasło litera po litera, zanim szubienica będzie gotowa (10 błędów). Gra kooperacyjna: wszyscy w pokoju grają razem i wygrywają albo przegrywają razem. Gospodarz losuje hasło z kategorii albo wpisuje własne dla znajomych. Pokój z kodem online (nick i kolor z Twojego konta) albo solo na próbę. Wyniki zapisują się w statystykach.</p><button class="hubgo" onclick="wisOpen()">Graj</button>':n===22?'<h2>Go Fish</h2><p>Podwodne łowienie kart: w swojej turze dotknij karty (pytasz o jej figurę), a potem gracza, od którego chcesz wszystkie takie karty. Jak ma – dostajesz je i pytasz dalej. Jak nie – „Go Fish!” i dobierasz z talii. Cztery karty tej samej figury to komplet, wygrywa najwięcej kompletów. Gra online w pokoju z kodem (2–4 osoby, z nickiem i kolorem z Twojego konta). Wyniki zapisują się w statystykach.</p><button class="hubgo" onclick="gofOpen()">Graj</button>':n===29?'<h2>Szept</h2><p>Kooperacyjny horror 3D dla 1–4 graczy: zbierz 5 kluczy, otwórz bramę i uciekaj przed duchem i zombie. Potwory słyszą bieg i widzą światło latarki – gaś ją i kucaj przy ścianie, żeby się ukryć, ale pilnuj baterii, zdrowia i stresu. Gra wymaga klawiatury i myszy. Graj solo albo w pokoju online z kodem (nick i kolor gracza z Twojego konta). Wyniki z pokoi (min. 2 graczy) zapisują się w statystykach: ucieczka to wygrana.</p><button class="hubgo" onclick="szeptOpen()">Graj</button>':n===28?'<h2>Postaw na milion</h2><p>Teleturniej dla 2–3 graczy: każdy zaczyna z milionem złotych i przed każdym pytaniem głosujecie na kategorię. Kasę rozdzielasz między cztery odpowiedzi – pieniądze postawione na złe znikają, a przechodzi tylko to, co leży na dobrej. Po 10 pytaniach wygrywa najbogatszy. Graj online w pokoju z kodem (nick i kolor z Twojego konta) albo offline na jednym urządzeniu. Wyniki gier online zapisują się w statystykach.</p><button class="hubgo" onclick="pnmOpen()">Graj</button>':n===27?'<h2>Hole Arena</h2><p>Steruj czarną dziurą i pochłaniaj obiekty mniejsze od siebie – większe dziury zjadają mniejsze! Rundy trwają 3 minuty, wygrywa najwyższy wynik. Graj solo z botami albo w pokoju online z kodem (nick i kolor dziury z Twojego konta, boty do uzupełnienia areny). Wyniki rund w pokojach (min. 2 graczy) zapisują się w statystykach.</p><button class="hubgo" onclick="holeOpen()">Graj</button>':n===26?'<h2>Chińczyk</h2><p>Klasyczna gra planszowa dla 2–4 osób: wyprowadzaj pionki szóstką, zbijaj rywali i jako pierwszy wprowadź wszystkie cztery do domu. Dwa tryby (klasyczny oraz z dodatkami ✨ – teleporty i bezpieczne pola startowe), gra online w pokoju z kodem (z nickiem i kolorem z Twojego konta, boty do uzupełnienia stołu) albo solo z botami. Wyniki gier online zapisują się w statystykach.</p><button class="hubgo" onclick="chinOpen()">Graj</button>':n===25?'<h2>6 bierze!</h2><p>Klasyczna gra karciana Wolfganga Kramera dla 2–10 osób. Wszyscy naraz wybierają kartę i odkrywają ją po kolei od najniższej – karta trafia do rzędu na stole, a kto położy 6. kartę w rzędzie, zabiera całą piątkę i dostaje ●. Wygrywa ten, kto zbierze ich najmniej. Gra online w pokoju z kodem (z nickiem i kolorem z Twojego konta, boty do uzupełnienia stołu) albo solo z botami. Wyniki gier online zapisują się w statystykach.</p><button class="hubgo" onclick="bierzeOpen()">Graj</button>':n===24?'<h2>UNO</h2><p>Klasyczna gra karciana dla 2–6 osób w pokoju online (z kodem, nickiem i kolorem z Twojego konta) albo solo z botami. Dobieraj, zagrywaj karty w kolorze lub z symbolem ze stosu i pozbądź się wszystkich kart jako pierwszy. Rewers kart każdego gracza ma jego kolor. Wyniki gier online zapisują się w statystykach.</p><button class="hubgo" onclick="unoOpen()">Graj</button>':n===23?'<h2>Kropki i Kwadraty</h2><p>Klasyk na kartce: w swojej turze łączysz dwie sąsiednie kropki linią. Kto zamknie kwadrat, zdobywa punkt i ma dodatkowy ruch. Wygrywa ten, kto zamknie najwięcej kwadratów. Osiem plansz (od mini po diament i pierścień), gra online w pokoju z kodem (2–6 osób, z nickiem i kolorem z Twojego konta) albo lokalnie na jednym ekranie. Wyniki gier online zapisują się w statystykach.</p><button class="hubgo" onclick="kroOpen()">Graj</button>':n===9?'<h2>Znajomi</h2><div id="frbox"></div>':n===31?'<h2>Passa</h2><div id="psbox"></div>':n===11?'<h2>Najlepsze wyniki</h2><div id="lbbox"></div>':'<h2>Statystyki</h2><div id="stbox"></div>';
  if(n===9)frRender();if(n===10)stRender();if(n===11)lbOpen();if(n===31)psOpen();if(n===36)serversStart();
  ideaCur(sec==='g'?n:0);
}
function hubPlay(){monoOpen()}
hubTab(1);

/* ===== FOOTBALL MONOPOLY ONLINE ===== */
let fbApp=null, fbAuth=null, fbDB=null, onlinePlayerId=null;
try {
  fbApp=firebase.initializeApp(firebaseConfig);
  fbAuth=firebase.auth();
  fbDB=firebase.database();
} catch(e) { console.error('Firebase init:',e); }
// Trwała sesja + czekanie na odtworzenie zapisanego logowania,
// zanim cokolwiek zaloguje gościa anonimowo (to wylogowywało z konta).
let fbAuthReady=null;
function authReady(){
  if(!fbAuth)return Promise.resolve();
  if(!fbAuthReady){
    const pers=fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
    fbAuthReady=pers.then(()=>new Promise(res=>{const un=fbAuth.onAuthStateChanged(()=>{un();res()})}));
  }
  return fbAuthReady;
}
if(fbAuth)authReady();

/* [wydzielone → gry/monopoly/monopoly.html] pomocniki online współdzielone z Tukanem i kontami: */
function onlineCode(){return Math.random().toString(36).slice(2,7).toUpperCase()}
async function onlineEnsureAuth(){
  if(!fbAuth||!fbDB)throw new Error('Nie udało się uruchomić Firebase. Sprawdź połączenie z internetem.');
  await authReady();
  if(!fbAuth.currentUser) await fbAuth.signInAnonymously();
  const user = fbAuth.currentUser;
  if(!user || !user.uid) throw new Error('Firebase nie potwierdził anonimowego logowania. Odśwież stronę i spróbuj ponownie.');
  onlinePlayerId = user.uid;
  return onlinePlayerId;
}
function onlineNick(){const A=typeof ACC!=='undefined'?ACC:null;const n=(A&&(A.nick||(A.user&&A.user.displayName)))||'Gracz';return String(n).replace(/[<>&]/g,'').trim().slice(0,14)||'Gracz'}
