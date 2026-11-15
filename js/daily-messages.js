
/* ===== KOMUNIKATY DNIA ===== */
/* Komunikaty domyślne; {nick} = nick gracza, {gra} = losowa nazwa gry, {najmniej} = gra z najmniejszą liczbą rozegranych gier gracza (remis = losowa z nich), {dzieńtygodnia} = aktualny dzień tygodnia. */
/* {gralx} = „grałeś” (mężczyzna) lub „grałaś” (kobieta). Bez wybranej płci komunikat/hasło z tym placeholderem nie jest pokazywane. */
const gxHas=t=>/\{gralx\}/i.test(String(t));
const gxGender=()=>(typeof ACC!=='undefined'&&(ACC.gender==='f'||ACC.gender==='m'))?ACC.gender:'';
const gxOk=t=>!gxHas(t)||!!gxGender();
const gxWord=()=>gxGender()==='f'?'grałaś':'grałeś';
var LEAST={uid:'',pick:'',asked:'',p:null,fb:''};
function leastCompute(data){
  const cnt={};Object.keys(ST_GAMES).forEach(k=>cnt[k]=0);
  Object.keys(data||{}).forEach(k=>{const g=data[k]&&data[k].g;if(g in cnt)cnt[g]++});
  const min=Math.min.apply(null,Object.keys(cnt).map(k=>cnt[k]));
  const c=Object.keys(cnt).filter(k=>cnt[k]===min);
  return ST_GAMES[c[Math.floor(Math.random()*c.length)]];
}
function leastLoad(){
  const uid=(typeof ACC!=='undefined'&&ACC.user)?ACC.user.uid:'';
  if(!uid||typeof fbDB==='undefined'||!fbDB)return Promise.resolve('');
  if(LEAST.uid===uid&&LEAST.pick)return Promise.resolve(LEAST.pick);
  if(LEAST.p)return LEAST.p;
  LEAST.p=fbDB.ref('stats/'+uid).once('value')
    .then(sn=>{LEAST.uid=uid;LEAST.pick=leastCompute(sn.val()||{});return LEAST.pick})
    .catch(()=>'')
    .then(r=>{LEAST.p=null;return r});
  return LEAST.p;
}
function leastGame(){
  if(LEAST.pick)return LEAST.pick;
  if(!LEAST.fb){const a=Object.keys(ST_GAMES);LEAST.fb=ST_GAMES[a[Math.floor(Math.random()*a.length)]]}
  return LEAST.fb;
}
const MSG_DEFAULT=['Hej {nick} miłej zabawy!'];
const MSG_KEY='dgw_msgs',MSG_DAY='dgw_msg_day_v2';
/* ===== FORMAT TEKSTU (admin): **pogrubienie**, [size=small|big|huge]tekst[/size] ===== */
function rtFmt(h){
  return String(h)
    .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/\[size=(small|big|huge)\](.+?)\[\/size\]/g,(m,k,t)=>'<span class="fs-'+({small:'s',big:'b',huge:'h'})[k]+'">'+t+'</span>');
}
function rtWrap(id,a,b){
  const t=document.getElementById(id);if(!t)return;
  let s=t.selectionStart,e=t.selectionEnd;const v=t.value;
  const mid=s===e?'tekst':v.slice(s,e);
  const st=t.scrollTop,ws=window.scrollY,pop=t.closest('#msgpop,.accbox'),ps=pop?pop.scrollTop:0;
  t.value=v.slice(0,s)+a+mid+b+v.slice(e);
  t.focus({preventScroll:true});t.setSelectionRange(s+a.length,s+a.length+mid.length);
  t.dispatchEvent(new Event('input',{bubbles:true}));
  const back=()=>{t.scrollTop=st;if(pop)pop.scrollTop=ps;window.scrollTo(window.scrollX,ws)};
  back();requestAnimationFrame(back);setTimeout(back,0);
}
function rtSize(id,k){if(k)rtWrap(id,'[size='+k+']','[/size]')}
function rtBar(id){
  return '<div class="rtbar"><button type="button" class="lgbtn" onclick="rtWrap(\''+id+'\',\'**\',\'**\')" aria-label="Pogrubienie" title="Pogrubienie"><b>B</b></button>'
   +'<select aria-label="Rozmiar czcionki" onchange="rtSize(\''+id+'\',this.value);this.value=\'\'"><option value="">Rozmiar…</option><option value="small">Mały</option><option value="big">Duży</option><option value="huge">Bardzo duży</option></select></div>';
}
function msgCustom(){try{const a=JSON.parse(localStorage.getItem(MSG_KEY)||'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.trim()):[]}catch(e){return[]}}
function msgSaveCustom(a){try{localStorage.setItem(MSG_KEY,JSON.stringify(a))}catch(e){}}
function msgNick(){
  const n=(typeof ACC!=='undefined'&&ACC.nick)||(typeof CZ!=='undefined'&&CZ.nick)||(typeof LG!=='undefined'&&LG.nick)||'';
  return String(n).trim()||'Gracz';
}
const MSG_GAMES=['Monopoly piłkarskie','Zgadywanie literek','Tukan','Czółko','Państwa Miasta','Podbój','Statki','Łamanie kodu'];
function msgFill(t){
  const game=MSG_GAMES[Math.floor(Math.random()*MSG_GAMES.length)];
  return rtFmt(lgEsc(t))
    .replace(/\{nick\}/gi,'<b>'+lgEsc(msgNick())+'</b>')
    .replace(/\{gra\}/gi,'<b>'+lgEsc(game)+'</b>')
    .replace(/\{najmniej\}/gi,()=>'<b>'+lgEsc(leastGame())+'</b>')
    .replace(/\{gralx\}/gi,()=>'<b>'+gxWord()+'</b>')
    .replace(/\{dzie[ńn]\s*tygodnia\}/gi,'<b>'+['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'][new Date().getDay()]+'</b>');
}
const msgToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function msgClose(){const d=document.getElementById('msgpop');if(d)d.remove()}
function msgDailyMaybe(uid){
  if(!uid||typeof ACC==='undefined'||!ACC.user||ACC.user.uid!==uid)return;
  let saved=null;try{saved=JSON.parse(localStorage.getItem(MSG_DAY)||'null')}catch(e){}
  const today=msgToday();
  if(saved&&saved.uid===uid&&saved.date===today)return;
  const pool=[...new Set(MSG_DEFAULT.concat(msgCustom()).map(x=>String(x).trim()).filter(Boolean))].filter(gxOk);
  if(!pool.length)return;
  const previous=saved&&saved.uid===uid?saved.text:null;
  const choices=pool.filter(t=>t!==previous);
  // Jeśli istnieje tylko jeden komunikat, nie powtarzaj go następnego dnia.
  if(!choices.length){try{localStorage.setItem(MSG_DAY,JSON.stringify({uid,date:today,text:previous}))}catch(e){}return;}
  const chosen=choices[Math.floor(Math.random()*choices.length)];
  try{localStorage.setItem(MSG_DAY,JSON.stringify({uid,date:today,text:chosen}))}catch(e){}
  msgDailyShow(chosen);
}
function msgDailyShow(message,ready){
  if(!gxOk(message))return;
  if(!ready&&/\{najmniej\}/i.test(message)&&!LEAST.pick){leastLoad().then(()=>msgDailyShow(message,true));return}
  msgClose();
  const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.onclick=e=>{if(e.target===d)msgClose()};document.body.appendChild(d);
  d.innerHTML='<div class="accbox"><h2>Komunikat dnia</h2><div class="msgitem">'+msgFill(message)+'</div><div class="lgrow"><button class="lgbtn go" onclick="msgClose()">OK</button></div></div>';
}
function presenceStart(uid){
  presenceStop();
  const statusRef=fbDB.ref('presence/'+uid);
  PRES.connectedRef=fbDB.ref('.info/connected');
  PRES.connectedListener=PRES.connectedRef.on('value',snap=>{
    if(snap.val()!==true)return;
    statusRef.onDisconnect().set({state:'offline',last_changed:firebase.database.ServerValue.TIMESTAMP}).then(()=>statusRef.set({state:'online',last_changed:firebase.database.ServerValue.TIMESTAMP})).catch(e=>console.warn('Presence:',e));
  });
  PRES.ref=fbDB.ref('presence');
  PRES.listener=PRES.ref.on('value',snap=>{PRES.map=snap.val()||{};frRender();if(ACC.admin&&document.getElementById('msgpop')&&document.getElementById('adminUsersList'))adminUsersRender()});
  if(ACC.admin)adminUsersStart();
}
function presenceStop(){
  try{if(PRES.ref&&PRES.listener)PRES.ref.off('value',PRES.listener);if(PRES.connectedRef&&PRES.connectedListener)PRES.connectedRef.off('value',PRES.connectedListener);if(PRES.adminUsersRef&&PRES.adminUsersListener)PRES.adminUsersRef.off('value',PRES.adminUsersListener);if(PRES.adminPresenceRef&&PRES.adminPresenceListener)PRES.adminPresenceRef.off('value',PRES.adminPresenceListener)}catch(e){}
  PRES={map:{},ref:null,listener:null,connectedRef:null,connectedListener:null,adminUsers:{},adminUsersRef:null,adminUsersListener:null,adminPresenceRef:null,adminPresenceListener:null};
}
function adminUsersStart(){
  if(!ACC.admin||!fbDB)return;
  if(!PRES.adminUsersRef){PRES.adminUsersRef=fbDB.ref('publicUsers');PRES.adminUsersListener=PRES.adminUsersRef.on('value',s=>{PRES.adminUsers=s.val()||{};adminUsersRender()});}
}
function adminUsersOpen(){
  if(!ACC.admin)return;
  msgClose();const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.onclick=e=>{if(e.target===d)msgClose()};document.body.appendChild(d);
  d.innerHTML='<div class="accbox"><h2>Użytkownicy online</h2><div id="adminUsersList"><p class="lgnote">Ładowanie…</p></div><div class="lgrow"><button class="lgbtn" onclick="adminPanelOpen()">← Panel admina</button><button class="lgbtn" onclick="msgClose()">Zamknij</button></div></div>';
  adminUsersStart();adminUsersRender();
}
function adminUsersRender(){
  const box=document.getElementById('adminUsersList');if(!box||!ACC.admin)return;
  const users=Object.entries(PRES.adminUsers||{});const online=users.filter(([uid])=>PRES.map[uid]&&PRES.map[uid].state==='online');
  box.innerHTML=`<h3>Online ${online.length}/${users.length}</h3>${online.length?online.map(([uid,u])=>`<div class="adminonline"><i class="fronline on"></i><b>${lgEsc((u&&u.nick)||'Gracz')}</b><span class="lgnote">online</span></div>`).join(''):'<p class="lgnote">Nikt nie jest teraz online.</p>'}`;
}
function adminPanelOpen(){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  msgClose();
  const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.onclick=e=>{if(e.target===d)msgClose()};document.body.appendChild(d);
  d.innerHTML='<div class="accbox"><h2>Panel administratora</h2><p class="lgnote">Wybierz funkcję panelu administracyjnego.</p><div class="lgrow"><button class="lgbtn go" onclick="msgOpen(true)">Komunikaty</button><button class="lgbtn" onclick="slogOpen()">Hasła</button><button class="lgbtn" onclick="adminUsersOpen()">Użytkownicy online</button><button class="lgbtn" onclick="adminStatsOpen()">Statystyki graczy</button></div><div class="lgrow"><button class="lgbtn" onclick="msgClose()">Zamknij</button></div></div>';
}
function msgOpen(manage){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  msgClose();
  const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.onclick=e=>{if(e.target===d)msgClose()};document.body.appendChild(d);
  msgRender(true,false);
}
function msgPreview(){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  const pool=[...new Set(MSG_DEFAULT.concat(msgCustom()).map(x=>String(x).trim()).filter(Boolean))].filter(gxOk);
  if(pool.length)msgDailyShow(pool[Math.floor(Math.random()*pool.length)]);
}
function msgRender(manage,keep){
  if(typeof ACC==='undefined'||!ACC.admin){msgClose();return}
  const d=document.getElementById('msgpop');if(!d)return;
  const custom=msgCustom();
  let h='<div class="accbox"><h2>Baza komunikatów</h2><p class="lgnote">Każdego dnia gracz otrzymuje jeden losowy komunikat. Komunikat z poprzedniego dnia nie zostanie wylosowany ponownie. Użyj {nick}, żeby wstawić nick gracza, {gra}, żeby wstawić losową nazwę gry, {najmniej}, żeby wstawić grę, w którą gracz ma najmniej rozegranych gier (przy remisie losową spośród nich), {gralx}, żeby wstawić „grałeś” lub „grałaś” zależnie od płci gracza (gracze bez wybranej płci nie zobaczą takiego komunikatu ani hasła), albo {dzieńtygodnia}, żeby wstawić aktualny dzień tygodnia. Zaznacz tekst i użyj B (pogrubienie) lub listy „Rozmiar”. Własne komunikaty zapisują się w tej przeglądarce.</p>'
    +MSG_DEFAULT.map(t=>`<div class="msgrow"><span>${rtFmt(lgEsc(t))}</span><small class="lgnote">wbudowany</small></div>`).join('')
    +custom.map((t,i)=>`<div class="msgrow"><span>${rtFmt(lgEsc(t))}</span><button class="lgbtn" onclick="msgDel(${i})" aria-label="Usuń komunikat">Usuń</button></div>`).join('')
    +rtBar('msgin')+'<div class="lgrow"><input id="msgin" maxlength="400" autocomplete="off" placeholder="Nowy komunikat…" onkeydown="if(event.key===\'Enter\')msgAdd()" aria-label="Nowy komunikat"><button class="lgbtn go" onclick="msgAdd()">Dodaj</button></div>'
    +'<div class="lgrow"><button class="lgbtn" onclick="msgPreview()">Podgląd losowego</button><button class="lgbtn" onclick="adminPanelOpen()">← Panel admina</button><button class="lgbtn" onclick="msgClose()">Zamknij</button></div></div>';
  d.innerHTML=h;
  if(keep){const e=document.getElementById('msgin');if(e)e.focus()}
}
function msgAdd(){
  const e=document.getElementById('msgin'),t=e?e.value.replace(/\s+/g,' ').trim().slice(0,400):'';
  if(!t)return;
  const a=msgCustom();a.push(t);msgSaveCustom(a);msgRender(true,true);
}
function msgDel(i){const a=msgCustom();a.splice(i,1);msgSaveCustom(a);msgRender(true,true)}
/* ===== HASŁA (losowy napis pod tytułem; admin dodaje, wszyscy widzą) ===== */
const SLOG_DEFAULT='🎲 tu rodzą się wielkie kłótnie 🃏',SLOG_CACHE='dgw_slogans_cache',SLOG_LOCAL='dgw_slogans';
var SLOG={edit:null,raw:'',game:'',items:null,ref:null,busy:false,msg:'',draft:''};
const slogClean=t=>String(t==null?'':t).replace(/\s+/g,' ').trim().slice(0,100);
function slogListLoad(key){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.map(slogClean).filter(Boolean):[]}catch(e){return[]}}
function slogHasFb(){try{return !!fbDB&&typeof onlineEnsureAuth==='function'}catch(e){return false}}
function slogApply(t){const h=document.querySelector('#hub>h1');if(!h)return;h.style.setProperty('--slogan','"'+String(t).replace(/[\r\n]/g,' ').replace(/[\\"]/g,'\\$&')+'"')}
function slogFill(t){
  if(!SLOG.game)SLOG.game=MSG_GAMES[Math.floor(Math.random()*MSG_GAMES.length)];
  if(/\{najmniej\}/i.test(t)&&!LEAST.pick&&typeof ACC!=='undefined'&&ACC.user&&LEAST.asked!==ACC.user.uid){LEAST.asked=ACC.user.uid;leastLoad().then(()=>slogRefresh())}
  return String(t).replace(/\{gralx\}/gi,()=>gxWord()).replace(/\{nick\}/gi,()=>msgNick()).replace(/\{gra\}/gi,()=>SLOG.game).replace(/\{najmniej\}/gi,()=>leastGame()).replace(/\{dzie[ńn]\s*tygodnia\}/gi,()=>['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'][new Date().getDay()]);
}
function slogShow(raw){SLOG.raw=raw;slogApply(slogFill(raw))}
function slogList(){
  if(SLOG.items)return SLOG.items.map(x=>x.t);
  const c=slogListLoad(SLOG_CACHE);return c.length?c:slogListLoad(SLOG_LOCAL);
}
function slogRefresh(){
  if(!SLOG.raw)return;
  // Hasło z {gralx} nie może zostać pokazane bez wybranej płci (np. po wylogowaniu) – losuj inne.
  // Gdy płeć stanie się znana (po zalogowaniu), losuj raz jeszcze z pełnej puli.
  if(!gxOk(SLOG.raw)||(gxGender()&&!SLOG.gRepick)){if(gxGender())SLOG.gRepick=1;slogShow(slogPick(slogList()));return}
  slogApply(slogFill(SLOG.raw))
}
function slogPick(list){const p=[SLOG_DEFAULT].concat(list).filter(gxOk);return p[Math.floor(Math.random()*p.length)]}
function slogItems(){return SLOG.items||slogListLoad(SLOG_LOCAL).map((t,i)=>({k:String(i),t}))}
const slogErr=e=>/permission/i.test(String(e&&(e.code||e.message)))?'Brak uprawnień. Dodaj w regułach Firebase ścieżkę slogans (odczyt dla wszystkich, zapis tylko dla administratorów).':'Błąd: '+(e&&e.message||e);
async function slogInit(){
  if(SLOG.ref||SLOG.busy||!slogHasFb())return;
  SLOG.busy=true;
  try{
    await onlineEnsureAuth();
    if(!SLOG.ref){
      SLOG.ref=fbDB.ref('slogans');
      SLOG.ref.on('value',s=>{
        const v=s.val()||{};
        SLOG.items=Object.keys(v).filter(k=>v[k]&&slogClean(v[k].t)).map(k=>({k,t:slogClean(v[k].t),ts:+v[k].ts||0})).sort((a,b)=>a.ts-b.ts);
        try{localStorage.setItem(SLOG_CACHE,JSON.stringify(SLOG.items.map(x=>x.t)))}catch(e){}
        slogRender();
      },e=>{SLOG.msg=slogErr(e);slogRender()});
    }
  }catch(e){}
  SLOG.busy=false;
}
function slogOpen(){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  msgClose();
  const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.onclick=e=>{if(e.target===d)msgClose()};document.body.appendChild(d);
  SLOG.msg='';SLOG.draft='';slogInit();slogRender(true);
}
function slogRender(force){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  const d=document.getElementById('msgpop');if(!d)return;
  if(!force&&!document.getElementById('slogmgr'))return;
  const list=slogItems(),fb=!!SLOG.items;
  d.innerHTML='<div class="accbox" id="slogmgr"><h2>Hasła</h2><p class="lgnote">Krótki napis pod tytułem na stronie głównej. Przy każdym wejściu wyświetla się jedno losowe hasło z listy. Użyj {nick}, żeby wstawić nick gracza, {gra}, żeby wstawić losową nazwę gry, {najmniej}, żeby wstawić grę, w którą gracz ma najmniej rozegranych gier (przy remisie losową spośród nich), {gralx}, żeby wstawić „grałeś” lub „grałaś” zależnie od płci gracza (gracze bez wybranej płci nie zobaczą takiego komunikatu ani hasła), albo {dzieńtygodnia}, żeby wstawić aktualny dzień tygodnia. '+(fb?'Hasła widzą wszyscy gracze.':'Brak połączenia z bazą: hasła zapisują się tylko w tej przeglądarce.')+'</p>'
    +'<div class="msgrow"><span>'+lgEsc(SLOG_DEFAULT)+'</span><small class="lgnote">wbudowane</small></div>'
    +list.map((x,i)=>SLOG.edit&&SLOG.edit.k===x.k
      ?'<div class="msgrow"><input id="slogedit" maxlength="100" autocomplete="off" value="'+lgEsc(SLOG.edit.text)+'" oninput="SLOG.edit.text=this.value" onkeydown="if(event.key===\'Enter\')slogSave();else if(event.key===\'Escape\'){event.stopPropagation();slogEditCancel()}" aria-label="Edytuj hasło"><button class="lgbtn go" onclick="slogSave()">Zapisz</button><button class="lgbtn" onclick="slogEditCancel()">Anuluj</button></div>'
      :'<div class="msgrow"><span>'+lgEsc(x.t)+'</span><button class="lgbtn" onclick="slogEdit('+i+')" aria-label="Edytuj hasło">Edytuj</button><button class="lgbtn" onclick="slogDel('+i+')" aria-label="Usuń hasło">Usuń</button></div>').join('')
    +'<div class="lgrow"><input id="slogin" maxlength="100" autocomplete="off" placeholder="Nowe hasło…" value="'+lgEsc(SLOG.draft)+'" oninput="SLOG.draft=this.value" onkeydown="if(event.key===\'Enter\')slogAdd()" aria-label="Nowe hasło"><button class="lgbtn go" onclick="slogAdd()">Dodaj</button></div>'
    +(SLOG.msg?'<div class="lgmsg" role="alert">'+lgEsc(SLOG.msg)+'</div>':'')
    +'<div class="lgrow"><button class="lgbtn" onclick="slogPreview()">Podgląd losowego</button><button class="lgbtn" onclick="adminPanelOpen()">← Panel admina</button><button class="lgbtn" onclick="msgClose()">Zamknij</button></div></div>';
  if(force){const e=document.getElementById('slogin');if(e)e.focus()}
}
async function slogAdd(){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  const t=slogClean(SLOG.draft);if(!t)return;
  try{
    if(SLOG.ref)await fbDB.ref('slogans').push({t,by:(ACC.nick||'').slice(0,30),ts:firebase.database.ServerValue.TIMESTAMP});
    else{const a=slogListLoad(SLOG_LOCAL);a.push(t);localStorage.setItem(SLOG_LOCAL,JSON.stringify(a))}
    SLOG.draft='';SLOG.msg='';
  }catch(e){SLOG.msg=slogErr(e)}
  slogRender();const i=document.getElementById('slogin');if(i)i.focus();
}
function slogEdit(i){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  const x=slogItems()[i];if(!x)return;
  SLOG.edit={k:x.k,text:x.t};SLOG.msg='';slogRender();
  const e=document.getElementById('slogedit');if(e){e.focus();e.select()}
}
function slogEditCancel(){SLOG.edit=null;SLOG.msg='';slogRender()}
async function slogSave(){
  if(typeof ACC==='undefined'||!ACC.admin||!SLOG.edit)return;
  const t=slogClean(SLOG.edit.text),k=SLOG.edit.k;
  if(!t){SLOG.msg='Hasło nie może być puste.';slogRender();const e=document.getElementById('slogedit');if(e)e.focus();return}
  try{
    if(SLOG.ref)await fbDB.ref('slogans/'+k).update({t});
    else{const a=slogListLoad(SLOG_LOCAL),i=+k;if(i>=0&&i<a.length){a[i]=t;localStorage.setItem(SLOG_LOCAL,JSON.stringify(a))}}
    SLOG.edit=null;SLOG.msg='';
  }catch(e){SLOG.msg=slogErr(e)}
  slogRender();
}
async function slogDel(i){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  const x=slogItems()[i];if(!x)return;
  try{
    if(SLOG.ref)await fbDB.ref('slogans/'+x.k).remove();
    else{const a=slogListLoad(SLOG_LOCAL);a.splice(i,1);localStorage.setItem(SLOG_LOCAL,JSON.stringify(a))}
    SLOG.msg='';
  }catch(e){SLOG.msg=slogErr(e)}
  slogRender();
}
function slogPreview(){SLOG.game='';slogShow(slogPick(slogItems().map(x=>x.t)))}
(function(){
  const c=slogListLoad(SLOG_CACHE);
  slogShow(slogPick(c.length?c:slogListLoad(SLOG_LOCAL)));
  setTimeout(slogInit,0);setTimeout(slogInit,2000);
})();
document.addEventListener('keydown',e=>{if(e.key==='Escape')msgClose()});
/* ===== ZEGAR ===== */
(function(){
  const dF=new Intl.DateTimeFormat('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const tF=new Intl.DateTimeFormat('pl-PL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  function tick(){
    const el=document.getElementById('hubclock');
    if(!el){clearInterval(iv);return}
    const n=new Date();
    el.innerHTML='<div class="hcd">'+dF.format(n)+'</div><div class="hct">'+tF.format(n)+'</div>';
  }
  const iv=setInterval(tick,1000);tick();
})();

/* ===== PASSA (ranking passy logowań wszystkich graczy) ===== */
const PS={rows:null,msg:'',loading:false,at:0};
const psDays=n=>n===1?'1 dzień':n+' dni';
async function psLoad(force){
  if(PS.loading)return;
  if(!force&&PS.rows&&Date.now()-PS.at<30000)return;
  if(typeof fbDB==='undefined'||!fbDB){PS.msg='Passa wymaga połączenia z Firebase.';PS.rows=PS.rows||[];psRender();return}
  PS.loading=true;PS.msg='';psRender();
  try{
    if(typeof onlineEnsureAuth==='function')await onlineEnsureAuth();
    const snap=await fbDB.ref('publicUsers').once('value');
    const rows=[];
    snap.forEach(x=>{
      const v=x.val(),s=v&&v.streak;
      if(s&&isFinite(s.count)&&isFinite(s.last))rows.push({u:String(x.key),n:String(v.nick||'?'),c:Number(s.count),b:Math.max(Number(s.best)||0,Number(s.count)),l:Number(s.last)});
    });
    PS.rows=rows;PS.at=Date.now();
  }catch(e){
    PS.msg='Nie udało się wczytać passy: '+(e&&e.message?e.message:e);
    if(!PS.rows)PS.rows=[];
  }
  PS.loading=false;psRender();
}
function psOpen(){psRender();psLoad(true)}
function psRender(){
  const box=document.getElementById('psbox');if(!box)return;
  const esc=typeof lgEsc==='function'?lgEsc:(x=>String(x).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])));
  if(!PS.rows){box.innerHTML=PS.msg?`<div class="lgmsg">${esc(PS.msg)}</div>`:'<div class="lgnote">Wczytywanie…</div>';return}
  const today=accDayNum();
  const me=(typeof ACC!=='undefined'&&ACC.user)?ACC.user:null,uid=me?me.uid:'';
  let rows=PS.rows.slice();
  /* własną passę bierzemy z lokalnych danych (działa też, gdy zapis do bazy się nie udał) */
  if(me&&ACC.streak)rows=rows.filter(r=>r.u!==uid).concat({u:uid,n:ACC.nick||me.displayName||'Ty',c:ACC.streak.count,b:Math.max(ACC.streak.best,ACC.streak.count),l:ACC.streak.last});
  /* trwająca passa: ostatnie logowanie dzisiaj albo wczoraj (wczoraj = jeszcze można ją podtrzymać) */
  const live=rows.filter(r=>r.l>=today-1).sort((a,b)=>b.c-a.c||b.b-a.b||a.n.localeCompare(b.n,'pl'));
  const top=live.slice(0,10);
  /* „właśnie ją ustanawia”: bieżąca passa jest jednocześnie rekordem gracza (jak w widoku konta) */
  const setters=live.filter(r=>r.c>1&&r.c>=r.b);
  let body;
  if(top.length){
    body=`<table class="lbt"><thead><tr><th>#</th><th>Nick</th><th class="r">Passa</th><th class="r">Rekord</th></tr></thead><tbody>${top.map((r,i)=>`<tr class="${i===0?'top1':''}"><td class="pos">${i+1}</td><td>${esc(r.n)}${r.u===uid?' <span class="lbsub">(Ty)</span>':''}</td><td class="r pts">🔥 ${esc(psDays(r.c))}</td><td class="r dt">${esc(psDays(r.b))}</td></tr>`).join('')}</tbody></table>`;
    if(setters.length){
      body+=setters.slice(0,5).map(r=>`<div style="margin:10px 0 0">🔥 <b>${esc(r.n)}</b> właśnie ją ustanawia</div>`).join('');
      if(setters.length>5)body+=`<div class="lgnote">…i jeszcze ${setters.length-5} ${setters.length-5===1?'osoba':'osób'}</div>`;
    }
    body+='<div class="lgnote">Liczy się liczba kolejnych dni z logowaniem. Przerwana passa znika z listy.</div>';
  }else{
    body='<div class="lgnote">Nikt nie ma jeszcze trwającej passy. Zaloguj się na konto, a Twoja passa pojawi się tutaj.</div>';
  }
  if(PS.msg)body+=`<div class="lgmsg">${esc(PS.msg)}</div>`;
  box.innerHTML=`${body}<div class="lgrow"><button class="lgbtn" onclick="psLoad(true)" ${PS.loading?'disabled':''}>${PS.loading?'Odświeżanie…':'Odśwież'}</button></div>`;
}
/* ===== NAJLEPSZE WYNIKI ===== */
const LB={done:new Set(),mode:'points',game:'isla',wgame:'all',period:'day',scope:'all',kind:'all',cache:{},msg:'',loading:false,islaKey:'',req:0};
const LB_MODES=[['points','Punkty'],['wins','Liczba wygranych']];
const LB_GAMES=[['isla','Tukan'],['panstwa','Państwa Miasta']];
/* ranking wygranych: ‘Wszystkie gry’ + każda gra osobno; grę rozpoznajemy po prefiksie klucza wpisu (win_<prefiks>_...) */
const LB_WGAMES=[['all','Wszystkie gry'],['monopoly','Monopoly piłkarskie'],['litery','Zgadywanie literek'],['isla','Tukan'],['czolko','Czółko'],['panstwa','Państwa Miasta'],['kod','Łamanie kodu'],['kj','Kim jestem?'],['ttt','Kółko i krzyżyk'],['kulki','Kulki'],['snl','Węże i drabiny'],['dobble','Dobble'],['grzyb','Grzybobranie'],['wisielec','Wisielec'],['gofish','Go Fish'],['kropki','Kropki i Kwadraty'],['uno','UNO'],['bierze','6 bierze!'],['chinczyk','Chińczyk'],['holearena','Hole Arena'],['postaw','Postaw na milion'],['szept','Szept'],['guessr','GuessR'],['darksweep','Dark Sweep'],['krzyzowka','Krzyżówka'],['tabu','Tabu']];
const LB_WPREF=[['monopoly_','monopoly'],['lg_','litery'],['kod_','kod'],['cz_','czolko'],['isla_','isla'],['pm_','panstwa'],['kj_','kj'],['ttt_','ttt'],['kulki_','kulki'],['snl_','snl'],['dobble_','dobble'],['grzyb_','grzyb'],['wisielec_','wisielec'],['gofish_','gofish'],['kropki_','kropki'],['uno_','uno'],['bierze_','bierze'],['chinczyk_','chinczyk'],['holearena_','holearena'],['postaw_','postaw'],['szept_','szept'],['guessr_','guessr'],['darksweep_','darksweep'],['krzyzowka_','krzyzowka'],['tabu_','tabu']];
const lbWinGame=k=>{k=String(k||'').replace(/^win_/,'');for(const a of LB_WPREF)if(k.indexOf(a[0])===0)return a[1];return ''};
/* ścieżka danych: dla wygranych jeden wspólny węzeł (wszystkie gry), dla punktów — wybrana gra */
const lbG=()=>LB.mode==='wins'?'wins':LB.game;
const LB_KINDS=[['all','Razem'],['solo','Solo'],['online','Online']];
const LB_SCOPES=[['all','Ogólne'],['mine','Moje']];
const LB_PERIODS=[['day','Dzisiaj'],['week','W tym tygodniu'],['month','W tym miesiącu'],['all','Ogólnie']];
const lbSafe=k=>String(k).replace(/[.#$\[\]\/\s]/g,'_').slice(0,120);

/* zapis wyniku po zakończonej partii (każdy gracz zapisuje swój własny wynik) */
/* tryb partii zapisywany przy wyniku: solo / online + liczba i nicki graczy */
function lbMeta(m,names){
  const raw=(names||[]).map(x=>String(x||'').replace(/[<>&|]/g,'').trim().slice(0,14)).filter(Boolean);
  if(m==='solo')return {m:'solo'};
  return {m:'online',c:Math.max(1,raw.length),pl:raw.slice(0,12).join('|')};
}
/* dla starszych wpisów (bez pól m/c/pl) tryb i graczy wyprowadzamy z klucza wpisu i ze wpisów z tej samej partii */
function lbEnrich(rows,g){
  const grp={};
  rows.forEach(r=>{
    const k=String(r.k||'');
    r.gk=(r.u&&k.endsWith('_'+r.u))?k.slice(0,-(r.u.length+1)):'';
    if(r.m==='solo'||k.indexOf('solo_')===0)return;
    if(r.gk)(grp[r.gk]||(grp[r.gk]=[])).push(r.n);
  });
  rows.forEach(r=>{
    const k=String(r.k||'');
    if(!r.m){
      if(g==='isla')r.m=k.indexOf('isla_')===0?'online':(k.indexOf('solo_')===0?'solo':'');
      else r.m='online';
    }
    r.pls=[];
    if(r.m==='online'){
      if(r.pl)r.pls=r.pl.split('|').filter(Boolean);
      else if(r.gk&&grp[r.gk])r.pls=Array.from(new Set(grp[r.gk]));
      if(!r.pls.length)r.pls=[r.n];
    }
  });
}
function lbSub(r,esc){
  if(r.m==='solo')return '<div class="lbsub">👤 Solo</div>';
  if(r.m!=='online')return '';
  const n=(r.pls&&r.pls.length)?r.pls:[r.n];
  return '<div class="lbsub">🌐 Online · gracze ('+Math.max(r.c||0,n.length)+'): '+n.map(x=>esc(x)).join(', ')+'</div>';
}
function lbRecord(game,key,pts,nick,extra){
  try{
    if(typeof ACC==='undefined'||!ACC.user||typeof accNet!=='function'||!accNet())return;
    pts=Math.round(Number(pts));if(!isFinite(pts))return;
    const k=lbSafe(key),id=game+'/'+k;
    if(LB.done.has(id))return;
    LB.done.add(id);
    const name=String(nick||ACC.nick||'Gracz').replace(/[<>&]/g,'').trim().slice(0,14)||'Gracz';
    const base={u:ACC.user.uid,n:name,p:pts,t:firebase.database.ServerValue.TIMESTAMP},ref=fbDB.ref('bestScores/'+id);
    /* jeśli reguły bazy nie przyjmą dodatkowych pól, zapisujemy sam wynik (tryb i gracze i tak da się odtworzyć z klucza) */
    ref.set(extra?Object.assign({},base,extra):base)
      .catch(e=>{if(!extra)throw e;return ref.set(base)})
      .then(()=>{delete LB.cache[game]})
      .catch(e=>{LB.done.delete(id);console.error('Najlepsze wyniki:',e)});
  }catch(e){console.error('Najlepsze wyniki:',e)}
}
/* Tukan: koniec partii = koniec 2. tury (solo i w pokoju) */
function lbIsla(s){
  if(!s||!s.over||s.turn!==2){LB.islaKey='';return}
  if(LB.islaKey)return;
  if(ISL.ref&&ISL.room&&ISL.room.test){LB.islaKey='test';return}
  if(typeof ACC==='undefined'||!ACC.user)return;
  const uid=ACC.user.uid;let key,nick=ACC.nick,extra=lbMeta('solo');
  if(ISL.ref&&ISL.round&&ISL.code){
    key='isla_'+ISL.code+'_'+ISL.round+'_'+uid;
    const me=(ISL.players||[]).find(p=>p.id===uid);if(me&&me.name)nick=me.name;
    extra=lbMeta('online',(ISL.players||[]).map(p=>p&&p.name));
  }else key='solo_'+uid+'_'+Date.now();
  LB.islaKey=key;
  lbRecord('isla',key,s.live,nick,extra);
}

/* odczyt i wyświetlanie */
function lbStart(period){
  if(period==='all')return 0;
  const d=new Date();d.setHours(0,0,0,0);
  if(period==='week')d.setDate(d.getDate()-((d.getDay()+6)%7));
  else if(period==='month')d.setDate(1);
  return d.getTime();
}
function lbSet(k,v){LB[k]=v;lbRender();if(k==='game'||k==='period'||k==='mode')lbLoad()}
async function lbLoad(force){
  const g=lbG(),c=LB.cache[g];
  const needAll=LB.period==='all';
  if(!force&&c&&Date.now()-c.at<30000&&(c.full||!needAll))return;
  if(typeof fbDB==='undefined'||!fbDB){LB.msg='Najlepsze wyniki wymagają połączenia z Firebase.';lbRender();return}
  const req=++LB.req;LB.loading=true;LB.msg='';lbRender();
  try{
    if(typeof onlineEnsureAuth==='function')await onlineEnsureAuth();
    const from=Math.min(lbStart('week'),lbStart('month'));
    const q=fbDB.ref('bestScores/'+g).orderByChild('t');
    const snap=await (needAll?q:q.startAt(from)).once('value');
    const rows=[];snap.forEach(x=>{const v=x.val();if(v&&typeof v.p==='number'&&v.t)rows.push({u:String(v.u||''),n:String(v.n||'?'),p:v.p,t:Number(v.t),g:g==='wins'?lbWinGame(x.key):'',k:String(x.key||''),m:(v.m==='solo'||v.m==='online')?v.m:'',c:Number(v.c)||0,pl:typeof v.pl==='string'?v.pl:''})});
    if(g!=='wins')lbEnrich(rows,g);
    LB.cache[g]={at:Date.now(),rows,full:needAll};
  }catch(e){
    if(req===LB.req)LB.msg='Nie udało się wczytać wyników: '+(e&&e.message?e.message:e);
  }
  if(req===LB.req){LB.loading=false;lbRender()}
}
/* ranking liczby wygranych: każdy wpis w węźle „wins” to jedna wygrana, zliczamy je per gracz w wybranym okresie */
function lbWinsBody(c,esc){
  const from=lbStart(LB.period);
  const uid=(typeof ACC!=='undefined'&&ACC.user)?ACC.user.uid:'';
  const by={};
  c.rows.forEach(r=>{
    if(r.t<from||!r.u)return;
    if(LB.scope==='mine'&&r.u!==uid)return;
    if(LB.wgame!=='all'&&r.g!==LB.wgame)return;
    const o=by[r.u]||(by[r.u]={n:r.n,w:0,t:0});
    o.w++;
    if(r.t>=o.t){o.t=r.t;o.n=r.n}
  });
  const top=Object.keys(by).map(k=>by[k]).sort((a,b)=>b.w-a.w||a.t-b.t).slice(0,10);
  const fmt=new Intl.DateTimeFormat('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  let body=top.length
    ?`<table class="lbt"><thead><tr><th>#</th><th>Nick</th><th class="r">Wygrane</th><th class="r">Ostatnia wygrana</th></tr></thead><tbody>${top.map((r,i)=>`<tr class="${i===0?'top1':''}"><td class="pos">${i+1}</td><td>${esc(r.n)}</td><td class="r pts">${r.w}</td><td class="r dt">${fmt.format(new Date(r.t))}</td></tr>`).join('')}</tbody></table><div class="lgnote">${LB.wgame==='all'?'Liczą się wygrane we wszystkich grach łącznie':'Liczą się wygrane w grze: '+esc((LB_WGAMES.find(a=>a[0]===LB.wgame)||[0,''])[1])} (remisy nie są wliczane).</div>`
    :(LB.scope==='mine'&&!uid?'<div class="lgnote">Zaloguj się na konto, aby zobaczyć swoje wygrane.</div>':LB.scope==='mine'?'<div class="lgnote">Nie masz jeszcze wygranych z tego okresu'+(LB.wgame==='all'?'':' w tej grze')+'. Wygraj partię zalogowany na konto, a wynik pojawi się tutaj.</div>':'<div class="lgnote">Brak wygranych z tego okresu'+(LB.wgame==='all'?'':' w tej grze')+'. Wygraj partię zalogowany na konto, a wynik pojawi się tutaj.</div>');
  if(LB.msg)body+=`<div class="lgmsg">${esc(LB.msg)}</div>`;
  return body;
}
function lbOpen(){lbRender();lbLoad(true)}
function lbRender(){
  const box=document.getElementById('lbbox');if(!box)return;
  const esc=typeof lgEsc==='function'?lgEsc:(x=>String(x).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])));
  const gb=LB_GAMES.map(a=>`<button class="lgbtn ${LB.game===a[0]?'on':''}" onclick="lbSet('game','${a[0]}')">${a[1]}</button>`).join('');
  const wgb=LB_WGAMES.map(a=>`<button class="lgbtn ${LB.wgame===a[0]?'on':''}" onclick="lbSet('wgame','${a[0]}')">${a[1]}</button>`).join('');
  const sb=LB_SCOPES.map(a=>`<button class="lgbtn ${LB.scope===a[0]?'on':''}" onclick="lbSet('scope','${a[0]}')">${a[1]}</button>`).join('');
  const kb=LB_KINDS.map(a=>`<button class="lgbtn ${LB.kind===a[0]?'on':''}" onclick="lbSet('kind','${a[0]}')">${a[1]}</button>`).join('');
  const pb=LB_PERIODS.map(a=>`<button class="lgbtn ${LB.period===a[0]?'on':''}" onclick="lbSet('period','${a[0]}')">${a[1]}</button>`).join('');
  const mb=LB_MODES.map(a=>`<button class="lgbtn ${LB.mode===a[0]?'on':''}" onclick="lbSet('mode','${a[0]}')">${a[1]}</button>`).join('');
  let body;
  const c=LB.cache[lbG()];
  if(!c||(LB.period==='all'&&!c.full&&LB.loading)){body=LB.msg?`<div class="lgmsg">${esc(LB.msg)}</div>`:'<div class="lgnote">Wczytywanie…</div>'}
  else if(LB.mode==='wins'){body=lbWinsBody(c,esc)}
  else{
    const from=lbStart(LB.period);
    const uid=(typeof ACC!=='undefined'&&ACC.user)?ACC.user.uid:'';
    const top=c.rows.filter(r=>r.t>=from&&(LB.scope!=='mine'||(uid&&r.u===uid))&&(LB.kind==='all'||r.m===LB.kind)).sort((a,b)=>b.p-a.p||a.t-b.t).slice(0,10);
    const fmt=new Intl.DateTimeFormat('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    body=top.length
      ?`<table class="lbt"><thead><tr><th>#</th><th>Nick i tryb gry</th><th class="r">Punkty</th><th class="r">Data i godzina</th></tr></thead><tbody>${top.map((r,i)=>`<tr class="${i===0?'top1':''}"><td class="pos">${i+1}</td><td>${esc(r.n)}${lbSub(r,esc)}</td><td class="r pts">${r.p}</td><td class="r dt">${fmt.format(new Date(r.t))}</td></tr>`).join('')}</tbody></table>`
      :(LB.scope==='mine'&&!uid?'<div class="lgnote">Zaloguj się na konto, aby zobaczyć swoje wyniki.</div>':LB.scope==='mine'?'<div class="lgnote">Nie masz jeszcze wyników z tego okresu. Zagraj partię zalogowany na konto, a wynik pojawi się tutaj.</div>':'<div class="lgnote">Brak wyników z tego okresu. Zagraj partię zalogowany na konto, a wynik pojawi się tutaj.</div>');
    if(LB.msg)body+=`<div class="lgmsg">${esc(LB.msg)}</div>`;
  }
  box.innerHTML=`<div class="lbrow">${mb}</div><div class="lbrow">${LB.mode==='wins'?wgb:gb}</div><div class="lbrow">${sb}</div>${LB.mode==='wins'?'':`<div class="lbrow">${kb}</div>`}<div class="lbrow">${pb}</div>${body}<div class="lgrow"><button class="lgbtn" onclick="lbLoad(true)" ${LB.loading?'disabled':''}>${LB.loading?'Odświeżanie…':'Odśwież'}</button></div>`;
}
