
/* ===== PAŃSTWA MIASTA ===== */
const PM_CATS=[['panstwa','Państwa'],['miasta','Miasta'],['imie_m','Imię męskie'],['imie_z','Imię żeńskie'],['zwierze','Zwierzę'],['rzecz','Rzecz'],['roslina','Roślina'],['piosenka','Tytuł piosenki'],['osoba','Znana osoba'],['kolor','Kolor'],['zawod','Zawód'],['film','Film'],['jedzenie','Jedzenie'],['aplikacja','Aplikacja'],['spoznienie','Powód spóźnienia'],['cialo','Część ciała'],['emocja','Emocja'],['ubranie','Ubranie']];
const PM_NAME=Object.fromEntries(PM_CATS);
const PM_LETTERS='ABCDEFGHIJKLMNOPRSTUWZ'.split('');
const PM_SEC=30,PM_COUNT=4000,PM_GRACE=6000,PM_MAXP=8;
let PM={screen:'start',ref:null,listener:null,code:'',host:null,players:[],status:null,cats:[],rounds:3,cur:0,rd:{},gid:'',msg:'',nick:'',col:'#2a9df4',joinCode:'',off:0,offRef:null,offL:null,my:[],phase:'',tick:null,saveT:null,sel:['panstwa','miasta','imie_m','imie_z','zwierze','rzecz'],selRounds:3,key:'',finR:-1,advancing:false};
const pmNet=()=>typeof fbDB!=='undefined'&&!!fbDB&&typeof onlineEnsureAuth==='function';
const pmNow=()=>Date.now()+PM.off;
const pmClean=s=>String(s||'').replace(/[<>&]/g,'').trim().slice(0,14);
const pmCatList=s=>String(s||'').split(',').filter(id=>PM_NAME[id]);
const pmOrder=ids=>PM_CATS.map(c=>c[0]).filter(id=>ids.includes(id));
const pmTimeTxt=n=>{const t=n*PM_SEC;return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
const pmMe=()=>typeof onlinePlayerId!=='undefined'?onlinePlayerId:null;
const pmRound=n=>PM.rd['r'+n]||null;
function pmNorm(s){return String(s||'').toLocaleLowerCase('pl').replace(/ł/g,'l').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
const pmStarts=(w,L)=>String(w).trim().charAt(0).toLocaleLowerCase('pl')===String(L).toLowerCase();
function pmAns(r,uid){
  let a=[];try{a=JSON.parse(r&&r.ans&&r.ans[uid]||'[]')}catch(e){}
  return PM.cats.map((_,i)=>typeof a[i]==='string'?a[i].slice(0,30):'');
}
function pmScoreRound(n){
  const r=pmRound(n)||{},L=r.letter||'',np=PM.players.length;
  const ans={},tot={};PM.players.forEach(p=>{ans[p.id]=pmAns(r,p.id);tot[p.id]=0});
  const cells=PM.cats.map((c,ci)=>{
    const row=PM.players.map(p=>{
      const w=String(ans[p.id][ci]||'').trim(),fl=(r.fl&&r.fl[p.id+'_'+ci])||{};
      const flags=Object.keys(fl).filter(v=>v!==p.id&&fl[v]);
      let st='ok';
      if(!w)st='empty';
      else if(!pmStarts(w,L)||pmNorm(w).length<2)st='wrong';
      else if(flags.length*2>np-1)st='rej';
      return {id:p.id,w,st,pts:0,flags};
    });
    const good=row.filter(x=>x.st==='ok');
    good.forEach(x=>{const same=good.filter(y=>pmNorm(y.w)===pmNorm(x.w)).length;x.st=same>1?'dup':'uniq';x.pts=same>1?5:10});
    row.forEach(x=>{
      if(!x.w||x.st==='wrong')return;
      const votes=(r.pt&&r.pt[x.id+'_'+ci])||{},counts={5:0,10:0};
      Object.entries(votes).forEach(([voter,value])=>{if(voter!==x.id&&(value===5||value===10))counts[value]++});
      if(counts[5]*2>np-1)x.pts=5;
      else if(counts[10]*2>np-1)x.pts=10;
      else if(x.flags.length*2>np-1)x.pts=0;
      tot[x.id]+=x.pts;
    });
    return row;
  });
  return {cells,tot};
}
function pmTotals(){
  const tot={},per=[];PM.players.forEach(p=>tot[p.id]=0);
  const last=PM.status==='play'?PM.cur-1:PM.cur;
  for(let n=0;n<=last;n++){if(!pmRound(n))continue;const s=pmScoreRound(n);per.push(s.tot);PM.players.forEach(p=>{tot[p.id]+=s.tot[p.id]||0})}
  return {tot,per};
}
function pmRender(keep){
  const c=document.getElementById('pmc');if(!c)return;
  const a=document.activeElement,fid=keep&&a&&a.id&&c.contains(a)?a.id:null,pos=fid?a.selectionStart:0;
  c.innerHTML=pmScreen();
  if(fid){const e=document.getElementById(fid);if(e){e.focus();try{e.setSelectionRange(pos,pos)}catch(x){}}}
}
function pmAccountProfile(){
  const user=(typeof ACC!=='undefined'&&ACC.user)?ACC.user:null;
  const nick=(typeof ACC!=='undefined'&&ACC.nick)|| (user&&user.displayName) || (user&&user.email?user.email.split('@')[0]:'') || (typeof onlineNick==='function'?onlineNick():'') || 'Gracz';
  const color=(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||''))?ACC.col:'#2a9df4';
  PM.nick=pmClean(nick)||'Gracz';
  PM.col=color;
}
function pmOpen(){
  const h=document.getElementById('hub');if(h)h.style.display='none';
  document.getElementById('pm').hidden=false;
  pmAccountProfile();
  if(!PM.ref)Object.assign(PM,{screen:'start',msg:''});
  pmRender();
}
function pmExit(){document.getElementById('pm').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
function pmDetach(){
  try{if(PM.ref&&PM.listener)PM.ref.off('value',PM.listener)}catch(e){}
  try{if(PM.offRef&&PM.offL)PM.offRef.off('value',PM.offL)}catch(e){}
  clearInterval(PM.tick);clearTimeout(PM.saveT);
  PM.ref=null;PM.listener=null;PM.offRef=null;PM.offL=null;PM.tick=null;
}
function pmLeave(){
  try{if(PM.ref&&pmMe()&&PM.status==='lobby')PM.ref.child('players/'+pmMe()).remove()}catch(e){}
  pmDetach();
  Object.assign(PM,{screen:'start',players:[],status:null,rd:{},msg:'',my:[],phase:'',key:'',finR:-1});
  pmRender();
}
function pmScreen(){
  const m=PM.msg?`<div class="lgmsg" role="alert">${lgEsc(PM.msg)}</div>`:'';
  switch(PM.screen){
    case 'start':return pmStartHTML()+m;
    case 'lobby':return pmLobbyHTML()+m;
    case 'play':return pmPlayHTML()+m;
    case 'review':return pmReviewHTML()+m;
    case 'end':return pmEndHTML()+m;
  }
  return '';
}
function pmChips(sel,editable,fn){
  return `<div class="pmchips">${PM_CATS.map(c=>`<button class="lgbtn ${sel.includes(c[0])?'on':''}" ${editable?'':'disabled'} onclick="${fn}('${c[0]}')">${c[1]}</button>`).join('')}</div>`;
}
function pmStartHTML(){
  const net=pmNet(),n=PM.sel.length;
  return `<h2>Państwa Miasta</h2>
  <p class="lgrules">Przed każdą rundą losujemy literę. Masz wpisać słowo na tę literę w każdej wybranej kategorii. Na każdą kategorię przypada <b>30 sekund</b> do wspólnego czasu rundy. Po czasie porównujemy odpowiedzi: słowo, którego nikt inny nie ma, daje <b>10 punktów</b>, a słowo powtórzone u kogoś innego daje <b>po 5 punktów</b> każdemu. Wygrywa gracz z największą sumą po wszystkich rundach.</p>
  <p class="lgnote">Grasz jako <b>${lgEsc(PM.nick||'Gracz')}</b> — nick i kolor są pobierane automatycznie z Twojego konta.</p>
  <h3>Kategorie w rozgrywce</h3>
  ${pmChips(PM.sel,true,'pmToggleSel')}
  <div class="lgrow"><button class="lgbtn" onclick="PM.sel=PM_CATS.map(c=>c[0]);pmRender()">Wszystkie</button><button class="lgbtn" onclick="PM.sel=[];pmRender()">Wyczyść</button><span class="lgnote">Wybrano: ${n} · czas rundy: ${n?pmTimeTxt(n):'—'}</span></div>
  <div class="lgrow">Liczba rund: ${[1,2,3,4,5].map(k=>`<button class="lgbtn ${k===PM.selRounds?'on':''}" onclick="PM.selRounds=${k};pmRender()">${k}</button>`).join('')}</div>
  <div class="lgrow"><button class="lgbtn go" ${net&&n?'':'disabled'} onclick="pmCreate()">Utwórz pokój</button></div>
  <div class="lgrow"><input id="pmjoin" maxlength="5" placeholder="Kod pokoju" value="${lgEsc(PM.joinCode||'')}" oninput="PM.joinCode=this.value" style="text-transform:uppercase"><button class="lgbtn" ${net?'':'disabled'} onclick="pmJoin()">Dołącz</button></div>
  ${net?'':'<p class="lgnote">Państwa Miasta wymagają pokoju online, bo każdy wpisuje słowa na swoim urządzeniu. Działa po wgraniu gry na własny hosting z Firebase.</p>'}`;
}
function pmToggleSel(id){PM.sel=PM.sel.includes(id)?PM.sel.filter(x=>x!==id):pmOrder(PM.sel.concat(id));pmRender()}
async function pmCreate(){
  try{
    pmAccountProfile();
    if(!PM.sel.length)throw new Error('Wybierz co najmniej jedną kategorię.');
    const uid=await onlineEnsureAuth(),code=onlineCode(),ref=fbDB.ref('pmRooms/'+code);
    await ref.set({host:uid,status:'lobby',cats:pmOrder(PM.sel).join(','),rounds:PM.selRounds,cur:0,createdAt:firebase.database.ServerValue.TIMESTAMP,players:{[uid]:{id:uid,name:pmClean(PM.nick)||'Gracz',color:PM.col||'#2a9df4',order:0}}});
    pmAttach(ref,code);
  }catch(e){PM.msg='Nie udało się utworzyć pokoju: '+e.message;pmRender()}
}
async function pmJoin(){
  try{
    pmAccountProfile();
    const uid=await onlineEnsureAuth(),code=String(PM.joinCode||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
    if(code.length!==5)throw new Error('Wpisz pięcioznakowy kod pokoju.');
    const ref=fbDB.ref('pmRooms/'+code),room=(await ref.once('value')).val();
    if(!room)throw new Error('Nie znaleziono pokoju o takim kodzie.');
    ISL.board=room.board||'isla-petit';
    const players=Object.values(room.players||{});
    if(!(room.players&&room.players[uid])){
      if(room.status!=='lobby')throw new Error('Ta rozgrywka już się rozpoczęła.');
      if(players.length>=PM_MAXP)throw new Error('Pokój jest pełny (maksymalnie '+PM_MAXP+' osób).');
      await ref.child('players/'+uid).set({id:uid,name:pmClean(PM.nick)||'Gracz',color:PM.col||'#2a9df4',order:Math.max(-1,...players.map(p=>Number(p.order)||0))+1});
    }
    pmAttach(ref,code);
  }catch(e){PM.msg='Nie udało się dołączyć: '+e.message;pmRender()}
}
function pmAttach(ref,code){
  pmDetach();PM.ref=ref;PM.code=code;PM.msg='';PM.key='';PM.finR=-1;PM.my=[];PM.phase='';
  PM.offRef=fbDB.ref('.info/serverTimeOffset');PM.offL=PM.offRef.on('value',s=>{PM.off=Number(s.val())||0});
  PM.listener=ref.on('value',snap=>pmOnRoom(snap.val()),err=>{PM.msg='Błąd połączenia: '+err.message;pmRender()});
  PM.tick=setInterval(pmTick,250);
}
function pmOnRoom(room){
  if(!room){PM.msg='Pokój został usunięty.';pmDetach();PM.screen='start';pmRender();return}
  PM.host=room.host;PM.status=room.status;PM.test=!!room.test;
  PM.players=Object.values(room.players||{}).sort((a,b)=>(a.order||0)-(b.order||0)).map(p=>({id:p.id,name:String(p.name||'Gracz'),color:p.color}));
  PM.cats=pmCatList(room.cats);PM.rounds=Math.max(1,Number(room.rounds)||1);PM.cur=Number(room.cur)||0;PM.rd=room.rd||{};PM.gid=room.gid||'';
  const st=room.status;
  PM.screen=st==='lobby'?'lobby':st==='play'?'play':st==='review'?'review':st==='end'?'end':PM.screen;
  if(st==='lobby'){PM.finR=-1;PM.my=[];PM.phase='';PM.key=''}
  if(st==='play'){
    const key=PM.gid+':'+PM.cur+':'+(pmRound(PM.cur)?1:0);
    if(key===PM.key){pmWaitUpdate();return}
    if(PM.key.split(':').slice(0,2).join(':')!==key.split(':').slice(0,2).join(':')){PM.my=[];PM.finR=-1}
    PM.key=key;PM.phase='';
  }else PM.key='';
  if(st==='end')statsPm();
  pmRender(true);
}
function pmLobbyHTML(){
  const isHost=PM.host===pmMe(),n=PM.cats.length;
  const list=PM.players.map((p,i)=>`<div class="lghist">${lgDot(p.color)}${i+1}. ${lgEsc(p.name)}${p.id===PM.host?' <b>(host)</b>':''}${p.id===pmMe()?' (Ty)':''}</div>`).join('');
  return `<h2>Pokój: <span class="lgcode">${lgEsc(PM.code)}</span></h2>${list}${tgBox('PM.ref',PM.test)}
  <h3>Kategorie${isHost?' (kliknij, aby zmienić)':''}</h3>
  ${pmChips(PM.cats,isHost,'pmToggleRoom')}
  <div class="lgrow">Liczba rund: ${[1,2,3,4,5].map(k=>`<button class="lgbtn ${k===PM.rounds?'on':''}" ${isHost?'':'disabled'} onclick="pmSetRounds(${k})">${k}</button>`).join('')}</div>
  <p class="lgnote">Kategorie: ${n} · czas na rundę: ${n?pmTimeTxt(n):'—'} · ${isHost?(PM.players.length>=2?'Możesz rozpocząć grę.':'Poczekaj, aż dołączy co najmniej jeden gracz.'):'Czekaj, aż host rozpocznie grę.'} (Gracze: ${PM.players.length}/${PM_MAXP})</p>
  <div class="lgrow">${isHost?`<button class="lgbtn go" ${PM.players.length>=2&&n?'':'disabled'} onclick="pmHostStart()">Rozpocznij grę</button>`:''}<button class="lgbtn" onclick="navigator.clipboard&&navigator.clipboard.writeText(PM.code)">Kopiuj kod</button><button class="lgbtn" onclick="pmLeave()">Wyjdź</button></div>`;
}
function pmToggleRoom(id){
  if(PM.host!==pmMe()||PM.status!=='lobby')return;
  const next=PM.cats.includes(id)?PM.cats.filter(x=>x!==id):pmOrder(PM.cats.concat(id));
  if(!next.length)return;
  PM.ref.child('cats').set(next.join(',')).catch(e=>{PM.msg=e.message;pmRender()});
}
function pmSetRounds(k){if(PM.host!==pmMe()||PM.status!=='lobby')return;PM.ref.child('rounds').set(k)}
const pmRandLetter=()=>{const used=Object.values(PM.rd||{}).map(r=>r&&r.letter);const pool=PM_LETTERS.filter(l=>!used.includes(l));const p=pool.length?pool:PM_LETTERS;return p[Math.floor(Math.random()*p.length)]};
function pmHostStart(){
  if(PM.host!==pmMe()||PM.players.length<2||!PM.cats.length||PM.status!=='lobby')return;
  PM.rd={};
  PM.ref.update({status:'play',cur:0,gid:Date.now().toString(36)+Math.random().toString(36).slice(2,5),rd:{r0:{letter:pmRandLetter(),startAt:pmNow()+PM_COUNT}}}).catch(e=>{PM.msg=e.message;pmRender()});
}
function pmNext(){
  if(PM.host!==pmMe()||PM.status!=='review')return;
  const n=PM.cur+1;
  if(n>=PM.rounds){PM.ref.child('status').set('end');return}
  const u={status:'play',cur:n};u['rd/r'+n]={letter:pmRandLetter(),startAt:pmNow()+PM_COUNT};
  PM.ref.update(u).catch(e=>{PM.msg=e.message;pmRender()});
}
function pmRematch(){if(PM.host!==pmMe())return;PM.ref.update({status:'lobby',cur:0,rd:null})}
const pmTimes=()=>{const r=pmRound(PM.cur);if(!r||!r.startAt)return null;return {s:r.startAt,e:r.startAt+PM.cats.length*PM_SEC*1000}};
function pmPhase(){
  if(PM.status!=='play')return PM.status;
  const t=pmTimes();if(!t)return 'wait';
  const n=pmNow();
  if(n<t.s)return 'count';
  return n<t.e&&PM.finR!==PM.cur?'run':'done';
}
function pmCollect(){return PM.cats.map((_,i)=>String(PM.my[i]||'').replace(/[<>]/g,'').trim().slice(0,30))}
function pmType(i,v){
  PM.my[i]=v;clearTimeout(PM.saveT);PM.saveT=setTimeout(pmSaveDraft,1200);
}
function pmSaveDraft(){
  if(!PM.ref||PM.status!=='play'||PM.finR===PM.cur||!pmMe())return;
  PM.ref.child('rd/r'+PM.cur+'/ans/'+pmMe()).set(JSON.stringify(pmCollect())).catch(()=>{});
}
function pmKey(e,i){
  if(e.key!=='Enter')return;e.preventDefault();
  const nx=document.getElementById('pmin'+(i+1));if(nx)nx.focus();
}
function pmFinish(){
  if(!PM.ref||PM.status!=='play'||PM.finR===PM.cur||!pmMe())return;
  PM.finR=PM.cur;clearTimeout(PM.saveT);
  const base='rd/r'+PM.cur,uid=pmMe(),ref=PM.ref;
  ref.child(base+'/ans/'+uid).set(JSON.stringify(pmCollect())).then(()=>ref.child(base+'/fin/'+uid).set(true)).catch(e=>console.error('Państwa Miasta:',e));
  PM.phase='done';pmRender();
}
function pmAdvance(){
  if(PM.advancing||!PM.ref)return;PM.advancing=true;
  const cur=PM.cur;
  PM.ref.child('status').transaction(s=>s==='play'&&PM.cur===cur?'review':undefined).catch(()=>{}).then(()=>{PM.advancing=false});
}
function pmWaitUpdate(){
  const el=document.getElementById('pmwait');if(!el)return;
  const r=pmRound(PM.cur)||{},f=PM.players.filter(p=>r.fin&&r.fin[p.id]).length;
  el.textContent='Gotowi: '+f+' z '+PM.players.length;
}
function pmTick(){
  if(!PM.ref||PM.status!=='play')return;
  const t=pmTimes();if(!t)return;
  const n=pmNow(),ph=pmPhase();
  if(ph!==PM.phase){PM.phase=ph;pmRender(true)}
  const el=document.getElementById('pmtimer'),bar=document.getElementById('pmbari');
  if(el){
    if(n<t.s){el.textContent=Math.max(1,Math.ceil((t.s-n)/1000));el.classList.remove('low')}
    else{const left=Math.max(0,t.e-n),sec=Math.ceil(left/1000);el.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');el.classList.toggle('low',left<10000)}
  }
  if(bar){const tot=t.e-t.s;bar.style.width=(n<t.s?100:Math.max(0,Math.min(100,(t.e-n)/tot*100)))+'%'}
  if(n>=t.e&&PM.finR!==PM.cur)pmFinish();
  const r=pmRound(PM.cur)||{};
  const all=PM.players.length&&PM.players.every(p=>r.fin&&r.fin[p.id]);
  if(n>=t.s&&(all||n>=t.e+PM_GRACE))pmAdvance();
}
function pmPlayHTML(){
  const r=pmRound(PM.cur),head=`<h2>Runda ${PM.cur+1} z ${PM.rounds}</h2>`;
  if(!r||!r.letter)return head+'<p>Losowanie litery…</p>';
  const L=lgEsc(r.letter),ph=pmPhase();
  if(ph==='count')return `${head}<p>Litera tej rundy:</p><div class="pmbig"><span class="pmletter">${L}</span></div><p>Start za…</p><div class="pmtimer" id="pmtimer"></div><p class="lgnote">Kategorie: ${PM.cats.length} · czas rundy: ${pmTimeTxt(PM.cats.length)}</p>`;
  const bar=`<div class="pmtimer" id="pmtimer"></div><div class="pmbar"><i id="pmbari"></i></div>`;
  if(ph==='done')return `${head}<p>Litera: <span class="pmletter">${L}</span></p>${bar}<p>Odpowiedzi wysłane. Czekamy na pozostałych graczy…</p><p class="lgnote" id="pmwait"></p>`;
  const rows=PM.cats.map((id,i)=>`<label>${lgEsc(PM_NAME[id])}<input id="pmin${i}" maxlength="30" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="${lgEsc(PM_NAME[id])} na ${L}…" value="${lgEsc(PM.my[i]||'')}" oninput="pmType(${i},this.value)" onkeydown="pmKey(event,${i})"></label>`).join('');
  return `${head}<p>Litera: <span class="pmletter">${L}</span></p>${bar}<div class="pmgrid">${rows}</div>
  <div class="lgrow"><button class="lgbtn go" onclick="pmFinish()">Gotowe</button><span class="lgnote" id="pmwait"></span></div>`;
}
function pmRankHTML(tot,roundTot){
  const sorted=PM.players.map((p,i)=>({p,i,t:tot[p.id]||0})).sort((a,b)=>b.t-a.t||a.i-b.i);
  return sorted.map((x,k)=>`<div class="lghist">${k+1}. ${lgDot(x.p.color)}<b>${lgEsc(x.p.name)}</b>${x.p.id===pmMe()?' (Ty)':''} — razem <b>${x.t}</b> pkt${roundTot?` <span class="lgnote">(w tej rundzie +${roundTot[x.p.id]||0})</span>`:''}</div>`).join('');
}
function pmReviewHTML(){
  const r=pmRound(PM.cur)||{},sc=pmScoreRound(PM.cur),T=pmTotals(),isHost=PM.host===pmMe(),np=PM.players.length,last=PM.cur+1>=PM.rounds;
  const lab={uniq:'unikat',dup:'powtórka',rej:'odrzucone',wrong:'zła litera',empty:'brak odpowiedzi'};
  const cards=PM.cats.map((id,ci)=>{
    const rows=sc.cells[ci].map(x=>{
      const p=PM.players.find(q=>q.id===x.id),mine=x.id===pmMe(),can=!mine&&x.w&&(x.st==='uniq'||x.st==='dup'||x.st==='rej'),iflag=x.flags.includes(pmMe()),votes=(r.pt&&r.pt[x.id+'_'+ci])||{},myVote=votes[pmMe()]||0;
      const voteCount=v=>Object.entries(votes).filter(([uid,val])=>uid!==x.id&&val===v).length;
      return `<div class="pma">${lgDot(p.color)}<span>${lgEsc(p.name)}:</span> <b>${x.w?lgEsc(x.w):'—'}</b> <span class="pmst ${x.pts===0&&x.w?'bad':x.pts===10?'good':''}">${x.w?x.pts+' pkt · '+(x.st==='rej'&&x.pts>0?'zmienione głosowaniem':lab[x.st]):'—'}</span>${x.flags.length?`<span class="lgnote">(${x.flags.length} z ${np-1} głosów za 0)</span>`:''}${can?`<span class="pmvotes"><button class="pmflag ${iflag?'on':''}" onclick="pmVote(${ci},'${x.id}',0)">0 pkt${iflag?' ✓':''}</button><button class="pmflag ${myVote===5?'on':''}" onclick="pmVote(${ci},'${x.id}',5)">5 pkt${myVote===5?' ✓':''}</button><button class="pmflag ${myVote===10?'on':''}" onclick="pmVote(${ci},'${x.id}',10)">10 pkt${myVote===10?' ✓':''}</button></span><span class="lgnote">Głosy: 0=${x.flags.length}, 5=${voteCount(5)}, 10=${voteCount(10)} (wymagana większość)</span>`:''}</div>`;
    }).join('');
    return `<div class="lgcard"><b>${lgEsc(PM_NAME[id])}</b>${rows}</div>`;
  }).join('');
  return `<h2>Podsumowanie rundy ${PM.cur+1} z ${PM.rounds} · litera <span class="pmletter">${lgEsc(r.letter||'?')}</span></h2>
  <p class="lgnote">Unikalne słowo: 10 pkt, powtórzone: po 5 pkt. Słowo, które nie pasuje do kategorii, możesz odrzucić. Znika z punktacji, gdy odrzuci je większość pozostałych graczy.</p>
  <h3>Wyniki</h3>${pmRankHTML(T.tot,sc.tot)}
  <div class="lgrow">${isHost?`<button class="lgbtn go" onclick="pmNext()">${last?'Zakończ grę':'Następna runda'}</button>`:'<span class="lgnote">Host przechodzi dalej.</span>'}</div>
  <div class="lgcards">${cards}</div>`;
}
function pmVote(ci,owner,points){
  if(!PM.ref||PM.status!=='review'||owner===pmMe()||![0,5,10].includes(points))return;
  const base='rd/r'+PM.cur,flRef=PM.ref.child(base+'/fl/'+owner+'_'+ci+'/'+pmMe()),ptRef=PM.ref.child(base+'/pt/'+owner+'_'+ci+'/'+pmMe()),r=pmRound(PM.cur)||{};
  const current=(r.pt&&r.pt[owner+'_'+ci]&&r.pt[owner+'_'+ci][pmMe()])||0,zeroOn=!!(r.fl&&r.fl[owner+'_'+ci]&&r.fl[owner+'_'+ci][pmMe()]);
  let job;
  if(points===0){job=zeroOn?flRef.remove():flRef.set(true);job=Promise.all([job,ptRef.remove()]);}
  else{job=Promise.all([flRef.remove(),current===points?ptRef.remove():ptRef.set(points)]);}
  job.catch(e=>{PM.msg=e.message;pmRender()});
}
function pmFlag(ci,owner){pmVote(ci,owner,0)}
function pmEndHTML(){
  const T=pmTotals(),isHost=PM.host===pmMe();
  const max=Math.max(0,...PM.players.map(p=>T.tot[p.id]||0)),top=PM.players.filter(p=>(T.tot[p.id]||0)===max);
  const perRound=PM.players.map(p=>`<div class="lghist">${lgDot(p.color)}<b>${lgEsc(p.name)}</b>: ${T.per.map((t,i)=>`R${i+1} ${t[p.id]||0}`).join(' · ')}</div>`).join('');
  return `<h2>Koniec gry</h2><div class="lgwin">🏆 ${top.length>1?'Remis: ':'Zwycięzca: '}${top.map(p=>lgEsc(p.name)).join(', ')}<small>${max} pkt</small></div>
  <h3>Ranking</h3>${pmRankHTML(T.tot)}
  <h3>Punkty w rundach</h3>${perRound}
  <div class="lgrow">${isHost?'<button class="lgbtn go" onclick="pmRematch()">Zagraj ponownie</button>':'<span class="lgnote">Host może rozpocząć kolejną grę.</span>'}<button class="lgbtn" onclick="pmLeave()">Wyjdź</button></div>`;
}
function statsPm(){
  if(PM.status!=='end'||!PM.gid||typeof ACC==='undefined'||!ACC.user)return;
  const me=PM.players.findIndex(p=>p.id===ACC.user.uid);if(me<0)return;
  const T=pmTotals(),max=Math.max(0,...PM.players.map(p=>T.tot[p.id]||0)),top=PM.players.filter(p=>(T.tot[p.id]||0)===max);
  const won=top.some(p=>p.id===ACC.user.uid);
  if(!PM.test)lbRecord('panstwa','pm_'+PM.gid+'_'+ACC.user.uid,T.tot[ACC.user.uid]||0,PM.players[me].name,lbMeta('online',PM.players.map(p=>p.name)));
  statsRecord('pm_'+PM.gid,'panstwa',won?(top.length>1?'d':'w'):'l',PM.players.map(p=>({uid:p.id,name:p.name})),PM.test);
}


/* ================= STATKI ONLINE ================= */
const STK_FLEET=[3,3,2,2,2,1,1,1];
let STK={ref:null,code:'',host:'',uid:'',listener:null,reqListener:null,resListener:null,room:null,players:[],status:'start',msg:'',joinCode:'',nick:'Gracz',color:'#2a9df4',ships:[],orientation:'H',ready:false,privateRef:null,pending:false,processed:new Set(),requestsRef:null,responsesRef:null,shots:{},turn:'',winner:null};
function stkMe(){return STK.uid||onlinePlayerId}
function stkProfile(){const u=(typeof ACC!=='undefined'&&ACC.user)?ACC.user:null;STK.nick=String((typeof ACC!=='undefined'&&ACC.nick)||u?.displayName||(u?.email?u.email.split('@')[0]:'Gracz')).replace(/[<>&]/g,'').trim().slice(0,18)||'Gracz';STK.color=(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||''))?ACC.col:'#2a9df4'}
function stkDetach(){try{if(STK.ref&&STK.listener)STK.ref.off('value',STK.listener);if(STK.requestsRef&&STK.reqListener)STK.requestsRef.off('child_added',STK.reqListener);if(STK.responsesRef&&STK.resListener)STK.responsesRef.off('child_added',STK.resListener)}catch(e){}STK.ref=null;STK.listener=null;STK.reqListener=null;STK.resListener=null;STK.requestsRef=null;STK.responsesRef=null;STK.privateRef=null;STK.processed=new Set();STK.pending=false}
function stkOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('stk').hidden=false;stkProfile();if(!STK.ref){STK.status='start';STK.msg=''}stkRender()}
function stkExit(){document.getElementById('stk').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
async function stkLeave(){const ref=STK.ref,uid=stkMe(),host=STK.host,status=STK.status,privateRef=STK.privateRef;try{if(ref&&status==='lobby'&&uid){if(host===uid)await ref.remove();else{await ref.child('players/'+uid).remove();if(privateRef)await privateRef.remove()}}else if(ref&&status==='play'&&uid){const other=STK.players.find(p=>p.id!==uid);if(other)await ref.update({status:'end',winner:other.id})}}catch(e){console.warn('Statki leave:',e)}stkDetach();Object.assign(STK,{code:'',host:'',room:null,players:[],status:'start',msg:'',ships:[],ready:false,shots:{},turn:'',winner:null});stkRender()}
function stkRender(){const el=document.getElementById('stkcontent');if(!el)return;let h='';if(STK.msg)h+=`<div class="stkbox" style="color:#ffd1ca">${lgEsc(STK.msg)}</div>`;
 if(!STK.ref){h+=`<div class="stkbox"><h2>⚓ Bitwa morska</h2><p>Gra dla dokładnie 2 osób. Każdy ustawia flotę na swojej planszy 10×10. Statki nie mogą na siebie nachodzić ani stykać się bokami lub rogami.</p><p>Twoje konto: <b>${lgEsc(STK.nick)}</b></p><div class="stkrow"><button class="stkbtn" onclick="stkCreate()" ${podNet()?'':'disabled'}>Utwórz pokój</button><input id="stkJoin" maxlength="5" placeholder="Kod pokoju" style="text-transform:uppercase" value="${lgEsc(STK.joinCode)}" oninput="STK.joinCode=this.value.toUpperCase()"><button class="stkbtn" onclick="stkJoin()" ${podNet()?'':'disabled'}>Dołącz</button></div><div class="stkmuted">Plansza 10×10 · flota: 1×5, 2×4, 3×3, 4×2 i 4×1</div></div>`;el.innerHTML=h;return}
 const list=STK.players.map(p=>`<span class="stkmuted">${lgEsc(p.name)}${p.id===STK.host?' (host)':''}${p.id===stkMe()?' (Ty)':''} ${p.ready?'✓ gotowy':'· ustawia flotę'}</span>`).join(' · ');
 h+=`<div class="stkbox"><div>Pokój: <span class="stkcode">${lgEsc(STK.code)}</span></div><div class="stkrow">${list}</div><div class="stkrow"><span class="stkmuted">Gracze: ${STK.players.length}/2</span><button class="stkbtn" onclick="navigator.clipboard?.writeText(STK.code).then(()=>{STK.msg='Kod skopiowany';stkRender()}).catch(()=>{STK.msg='Kod pokoju: '+STK.code;stkRender()})">Kopiuj kod</button><button class="stkbtn" onclick="stkLeave()">Opuść pokój</button></div></div>`;
 if(STK.status==='lobby'){
   if(!STK.ready){const next=STK.ships.length,remaining=STK_FLEET[next];h+=`<div class="stkbox"><h3>Ustaw swoją flotę</h3><p>${next<8?`Teraz ustaw statek długości <b>${remaining}</b> (${next+1}/8).`:'Flota ustawiona — możesz zatwierdzić ustawienie.'}</p><div class="stkrow"><button class="stkbtn" onclick="stkRotate()">Obróć: ${STK.orientation==='H'?'poziomo':'pionowo'}</button><button class="stkbtn" onclick="stkUndo()" ${STK.ships.length?'':'disabled'}>Cofnij statek</button><button class="stkbtn" onclick="stkRandom()">Losuj flotę</button><span class="stkmuted">Postawione: ${STK.ships.length}/8</span></div>${stkGridHTML('place')}<div class="stkrow"><button class="stkbtn" onclick="stkReady()" ${STK.ships.length===8?'':'disabled'}>Zatwierdź flotę</button></div></div>`}
   else h+=`<div class="stkbox"><h3>Twoja flota jest gotowa ✓</h3><p>Czekaj, aż drugi gracz również zatwierdzi ustawienie.</p>${stkGridHTML('own')}</div>`;
   if(STK.host===stkMe())h+=`<div class="stkbox"><button class="stkbtn" onclick="stkStart()" ${STK.players.length===2&&STK.players.every(p=>p.ready)?'':'disabled'}>Rozpocznij bitwę</button><div class="stkmuted">Rozpocząć można, gdy obaj gracze zatwierdzą flotę.</div></div>`;
 }else if(STK.status==='play'){
   const myTurn=STK.turn===stkMe();h+=`<div class="stkbox"><h2>${myTurn?'Twoja tura — wybierz pole do ostrzału':'Ruch przeciwnika'}</h2><p class="stkmuted">${myTurn?'Kliknij pole na planszy przeciwnika. Trafienie daje kolejny strzał.':'Przeciwnik wykonuje strzał. Poczekaj na wynik.'}</p><div class="stkboards"><div class="stkboardwrap"><h3>Twoja flota</h3>${stkGridHTML('own')}</div><div class="stkboardwrap"><h3>Plansza przeciwnika</h3>${stkGridHTML('enemy')}</div></div><div class="stklegend"><span><i class="stkdot" style="background:#607d9b"></i>Twój statek</span><span><i class="stkdot" style="background:#e45d57"></i>Trafienie</span><span><i class="stkdot" style="background:#eaf3fa"></i>Pudło</span></div></div>`;
 }else if(STK.status==='end'){
   const won=STK.winner===stkMe();h+=`<div class="stkbox"><h2>${won?'🏆 Zwycięstwo!':'Koniec gry'}</h2><p>${won?'Zatopiłeś całą flotę przeciwnika!':'Przeciwnik zatopił całą Twoją flotę.'}</p><button class="stkbtn" onclick="stkLeave()">Wróć</button></div>`;
 }
 el.innerHTML=h;
}
function stkSunkSVG(len,ori){
 const W=len*100,V=ori==='V',w=V?100:W,h=V?W:100,F=n=>Math.round(n*10)/10;
 let hull=`<path d="M10 44H${F(W-34)}Q${F(W-12)} 48 ${F(W-6)} 60L${F(W-22)} 76H22Q12 72 10 44Z" fill="#4a5a70" stroke="#18222e" stroke-width="3" stroke-linejoin="round"/><rect x="20" y="44" width="${F(W-56)}" height="7" fill="#8a9bb0"/>`;
 if(len>=2)hull+=`<rect x="${F(W*.3)}" y="26" width="${F(Math.min(64,W*.26))}" height="18" rx="3" fill="#62748b" stroke="#18222e" stroke-width="3"/><rect x="${F(W*.3+8)}" y="31" width="9" height="8" fill="#cfe3f5"/>`;
 if(len>=3)hull+=`<rect x="${F(W*.62)}" y="18" width="14" height="26" fill="#6c5f55" stroke="#18222e" stroke-width="3"/>`;
 hull+=`<path d="M${F(W*.18)} 44V16l14 6" fill="none" stroke="#2a3644" stroke-width="3" stroke-linecap="round"/><path d="M${F(W*.46)} 44l8 10-6 8 9 12" fill="none" stroke="#0b1119" stroke-width="3" stroke-linecap="round"/><circle cx="${F(W*.46+5)}" cy="58" r="5" fill="#ff8a1f"/>`;
 const hg=`<g transform="rotate(-6 ${F(W/2)} 60)">${hull}</g>`;
 const ship=V?`<g transform="translate(100 0) rotate(90)">${hg}</g>`:hg;
 let water;
 if(V){const y0=F(h*.74);water=`<path d="M0 ${y0}q12.5 -9 25 0t25 0t25 0t25 0V${h}H0Z" fill="rgba(25,105,190,.8)"/>`}
 else water=`<path d="M0 64q12.5 -9 25 0${'t25 0'.repeat(Math.max(1,len*4-1))}V100H0Z" fill="rgba(25,105,190,.8)"/>`;
 let fx='';
 for(let i=0;i<len;i++){
  const cx=V?50:i*100+50,cy=V?i*100+38:42,d=(i*.37).toFixed(2);
  fx+=`<g class="fl" style="animation-delay:-${d}s"><path d="M${cx} ${cy}q-17 -8 -7 -30q5 10 14 5q13 14 -7 25z" fill="#ff8a1f"/><path d="M${cx} ${cy}q-8 -4 -3 -15q3 5 7 3q6 7 -4 12z" fill="#ffe066"/></g>`;
  fx+=`<circle class="sm" style="animation-delay:-${(i*.9).toFixed(2)}s" cx="${cx+6}" cy="${cy-34}" r="9" fill="#9aa4af"/><circle class="sm" style="animation-delay:-${(i*.9+1.3).toFixed(2)}s" cx="${cx-6}" cy="${cy-30}" r="7" fill="#b4bcc6"/>`;
 }
 return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><rect width="${w}" height="${h}" rx="10" fill="#0c2340" opacity=".82"/>${ship}${water}${fx}</svg>`;
}
function stkSunkOverlay(shots,local){
 const seen=new Set(),out=[];
 const add=sk=>{
  if(!sk||seen.has(sk))return;seen.add(sk);
  const cs=String(sk).split(',').map(t=>{const a=t.split('_');return {x:+a[0],y:+a[1]}}).filter(c=>isFinite(c.x)&&isFinite(c.y)).sort((a,b)=>a.x-b.x||a.y-b.y);
  if(!cs.length)return;
  const n=cs.length,ori=n>1&&cs[0].x===cs[1].x?'V':'H',c0=cs[0];
  out.push(`<div class="stksunk" style="grid-area:${c0.y+1}/${c0.x+1}/${ori==='V'?c0.y+1+n:c0.y+2}/${ori==='H'?c0.x+1+n:c0.x+2}">${stkSunkSVG(n,ori)}</div>`);
 };
 Object.values(shots||{}).forEach(x=>x&&add(x.sk));(local||[]).forEach(add);
 return out.join('');
}
function stkFly(k){
 try{
  const tgt=document.querySelector('.stkboard[data-kind="enemy"] [data-k="'+k+'"]');if(!tgt||!tgt.animate)return;
  const r=tgt.getBoundingClientRect(),ex=r.left+r.width/2,ey=r.top+r.height/2;
  const own=document.querySelector('.stkboard[data-kind="own"]');
  let sx,sy;
  if(own){const o=own.getBoundingClientRect();sx=o.left+o.width/2;sy=o.top+o.height/2}else{sx=window.innerWidth/2;sy=window.innerHeight+40}
  if(Math.hypot(ex-sx,ey-sy)<140){sx=ex;sy=window.innerHeight+40}
  const mx=(sx+ex)/2,my=Math.min(sy,ey)-Math.max(90,Math.abs(ex-sx)*.25);
  const m=document.createElement('div');m.className='stkmissile';
  m.innerHTML='<svg viewBox="0 0 26 46" width="26" height="46"><path d="M9 26H17L13 46Z" fill="#ffa21f"/><path d="M13 0Q20 10 19 26H7Q6 10 13 0Z" fill="#dfe6ee" stroke="#33475f" stroke-width="1.5"/><path d="M7 22L0 36L8 32ZM19 22L26 36L18 32Z" fill="#e45d57"/><circle cx="13" cy="14" r="3" fill="#2a9df4"/></svg>';
  document.body.appendChild(m);
  const N=18,kf=[];
  for(let i=0;i<=N;i++){
   const t=i/N,u=1-t,px=u*u*sx+2*u*t*mx+t*t*ex,py=u*u*sy+2*u*t*my+t*t*ey;
   const dx=2*u*(mx-sx)+2*t*(ex-mx),dy=2*u*(my-sy)+2*t*(ey-my);
   kf.push({transform:`translate(${px}px,${py}px) rotate(${Math.atan2(dy,dx)*180/Math.PI+90}deg) scale(${1-.4*t})`,offset:t});
  }
  const a=m.animate(kf,{duration:700,easing:'ease-in',fill:'forwards'});
  a.onfinish=()=>m.remove();a.oncancel=()=>m.remove();
  setTimeout(()=>{try{m.remove()}catch(e){}},1500);
 }catch(e){console.error('Pocisk:',e)}
}
function stkGridHTML(kind){const cells=[];const ownHits=STK.shots?.[Object.keys(STK.room?.players||{}).find(id=>id!==stkMe())]||{};const myShots=STK.shots?.[stkMe()]||{};const occupied=new Set(STK.ships.flatMap(s=>s.cells.map(c=>c.x+'_'+c.y)));
 for(let y=0;y<10;y++)for(let x=0;x<10;x++){const k=x+'_'+y;let cl='stkcell',disabled=false,click='';if(kind==='place'){if(occupied.has(k))cl+=' ship';click=`onclick="stkPlace(${x},${y})"`;}
 else if(kind==='own'){if(occupied.has(k))cl+=' ship';const sh=ownHits[k];if(sh)cl+=' '+(sh.result==='hit'?'hit':'miss');if(STK.fxOwn&&STK.fxOwn.k===k&&Date.now()<STK.fxOwn.until)cl+=' fx'+STK.fxOwn.result;disabled=true;}
 else{const sh=myShots[k];if(sh)cl+=' '+(sh.result==='hit'?'hit':'miss');if(!sh&&STK.pending&&STK.aim===k)cl+=' aim';if(sh&&STK.fx&&STK.fx.k===k&&Date.now()<STK.fx.until)cl+=' fx'+STK.fx.result;disabled=!!sh||STK.turn!==stkMe()||STK.pending||STK.status!=='play';click=`onclick="stkShoot(${x},${y})"`;}
 cells.push(`<button class="${cl}" style="grid-area:${y+1}/${x+1}" data-k="${k}" ${disabled?'disabled':''} ${click} aria-label="${String.fromCharCode(65+x)}${y+1}"></button>`)}
 const ov=kind==='own'?stkSunkOverlay(ownHits):kind==='enemy'?stkSunkOverlay(myShots,STK.skLocal):'';
 return `<div class="stkboard" data-kind="${kind}" aria-label="Plansza 10 na 10">${cells.join('')}${ov}</div>`;
}
function stkCanPlace(x,y,len,ori){if((ori==='H'&&x+len>10)||(ori==='V'&&y+len>10))return false;const used=new Set(STK.ships.flatMap(s=>s.cells.map(c=>c.x+'_'+c.y)));for(let i=0;i<len;i++){const cx=x+(ori==='H'?i:0),cy=y+(ori==='V'?i:0);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=cx+dx,ny=cy+dy;if(nx>=0&&nx<10&&ny>=0&&ny<10&&used.has(nx+'_'+ny))return false}}return true}
function stkPlace(x,y){if(STK.status!=='lobby'||STK.ready||STK.ships.length>=8)return;const len=STK_FLEET[STK.ships.length];if(!stkCanPlace(x,y,len,STK.orientation)){STK.msg='Statek nie mieści się lub dotyka innego statku. Wybierz inne pole.';stkRender();return}const cells=Array.from({length:len},(_,i)=>({x:x+(STK.orientation==='H'?i:0),y:y+(STK.orientation==='V'?i:0)}));STK.ships.push({len,cells});STK.msg='';stkRender()}
function stkRotate(){STK.orientation=STK.orientation==='H'?'V':'H';stkRender()}
function stkUndo(){if(STK.ready)return;STK.ships.pop();STK.msg='';stkRender()}
function stkRandom(){if(STK.ready)return;let success=null;for(let restart=0;restart<250&&!success;restart++){let placed=[],ok=true;for(const len of STK_FLEET){let found=false;for(let tries=0;tries<450&&!found;tries++){STK.ships=placed;const x=Math.floor(Math.random()*10),y=Math.floor(Math.random()*10),o=Math.random()<.5?'H':'V';if(stkCanPlace(x,y,len,o)){const cells=Array.from({length:len},(_,i)=>({x:x+(o==='H'?i:0),y:y+(o==='V'?i:0)}));placed.push({len,cells});found=true}}if(!found){ok=false;break}}if(ok)success=placed}STK.ships=success||[];STK.msg=success?'Wylosowano ustawienie floty.':'Nie udało się wylosować floty. Ustaw ją ręcznie.';stkRender()}
async function stkCreate(){try{stkProfile();const uid=await onlineEnsureAuth();STK.uid=uid;const code=onlineCode(),ref=fbDB.ref('statkiRooms/'+code);const room={host:uid,status:'lobby',createdAt:firebase.database.ServerValue.TIMESTAMP,players:{[uid]:{id:uid,name:STK.nick,color:STK.color,ready:false}}};await ref.set(room);stkAttach(ref,code)}catch(e){STK.msg='Nie udało się utworzyć pokoju: '+e.message;stkRender()}}
async function stkJoin(){try{stkProfile();const uid=await onlineEnsureAuth();STK.uid=uid;const code=String(STK.joinCode||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);if(code.length!==5)throw new Error('Wpisz pięcioznakowy kod.');const ref=fbDB.ref('statkiRooms/'+code),room=(await ref.once('value')).val();if(!room)throw new Error('Nie znaleziono takiego pokoju.');if(room.status!=='lobby'&&!room.players?.[uid])throw new Error('Gra już się rozpoczęła.');if(!room.players?.[uid]){const tx=await ref.child('players').transaction(players=>{players=players||{};if(players[uid])return players;if(Object.keys(players).length>=2||room.status!=='lobby')return;players[uid]={id:uid,name:STK.nick,color:STK.color,ready:false};return players});if(!tx.committed)throw new Error('Pokój jest pełny lub gra już się rozpoczęła.')}stkAttach(ref,code)}catch(e){STK.msg='Nie udało się dołączyć: '+e.message;stkRender()}}
function stkAttach(ref,code){stkDetach();STK.skLocal=[];STK.seenOpp=null;STK.ref=ref;STK.code=code;STK.status='lobby';STK.ships=[];STK.ready=false;STK.msg='';STK.privateRef=fbDB.ref('statkiBoards/'+code+'/'+stkMe());STK.listener=ref.on('value',s=>stkOnRoom(s.val()),e=>{STK.msg='Błąd połączenia: '+e.message;stkRender()});STK.privateRef.once('value').then(s=>{const b=s.val();if(b&&Array.isArray(b.ships)){STK.ships=b.ships;STK.ready=true}STK.requestsRef=ref.child('requests');STK.reqListener=STK.requestsRef.on('child_added',q=>stkHandleRequest(q.key,q.val()));STK.responsesRef=ref.child('responses');STK.resListener=STK.responsesRef.on('child_added',q=>stkHandleResponse(q.key,q.val()));stkRender()}).catch(e=>{STK.msg='Nie udało się wczytać Twojej floty: '+e.message;stkRender()})}
function stkOnRoom(room){if(!room){STK.msg='Pokój został usunięty.';stkDetach();STK.status='start';stkRender();return}STK.room=room;STK.host=room.host;STK.status=room.status;STK.players=Object.values(room.players||{});STK.turn=room.turn||'';STK.winner=room.winner||null;{const opp=Object.keys(room.players||{}).find(id=>id!==stkMe()),ns=(room.shots||{})[opp]||{},ks=Object.keys(ns);if(STK.seenOpp&&STK.seenOpp.code===STK.code)ks.forEach(k=>{if(!STK.seenOpp.set.has(k))STK.fxOwn={k,result:ns[k].result,until:Date.now()+900}});STK.seenOpp={code:STK.code,set:new Set(ks)}}STK.shots=room.shots||{};if(STK.status==='lobby'&&STK.players.length===2&&STK.players.every(p=>p.ready)&&STK.host===stkMe()){}stkRender()}
async function stkReady(){if(STK.ships.length!==8||STK_FLEET.reduce((a,b)=>a+b,0)!==STK.ships.reduce((a,s)=>a+s.len,0))return;try{await STK.privateRef.set({ships:STK.ships,ready:true});await STK.ref.child('players/'+stkMe()+'/ready').set(true);STK.ready=true;STK.msg='Flota zatwierdzona. Czekaj na przeciwnika.';stkRender()}catch(e){STK.msg='Nie udało się zapisać floty: '+e.message;stkRender()}}
async function stkStart(){if(STK.host!==stkMe()||STK.players.length!==2||!STK.players.every(p=>p.ready)||STK.status!=='lobby')return;try{await STK.ref.update({status:'play',turn:STK.host,shots:{},requests:null,responses:null})}catch(e){STK.msg='Nie udało się rozpocząć: '+e.message;stkRender()}}
async function stkShoot(x,y){if(STK.status!=='play'||STK.turn!==stkMe()||STK.pending)return;const k=x+'_'+y;if(STK.shots?.[stkMe()]?.[k])return;STK.pending=true;STK.aim=k;STK.flyEnd=Date.now()+720;stkRender();stkFly(k);try{const target=STK.players.find(p=>p.id!==stkMe());if(!target)throw new Error('Brak przeciwnika.');const req=STK.ref.child('requests').push();await req.set({by:stkMe(),target:target.id,x,y,at:firebase.database.ServerValue.TIMESTAMP});STK.msg='Strzał oddany — oczekiwanie na wynik…';}catch(e){STK.msg='Nie udało się oddać strzału: '+e.message;STK.pending=false;stkRender()}}
async function stkHandleRequest(id,r){if(!r||r.target!==stkMe()||STK.status!=='play'||!STK.ships.length)return;try{const key=r.x+'_'+r.y,ship=STK.ships.find(s=>s.cells.some(c=>c.x===r.x&&c.y===r.y)),hit=!!ship;let sk='';if(ship){const prev=(await STK.ref.child('shots/'+r.by).once('value')).val()||{};if(ship.cells.every(c=>(c.x===r.x&&c.y===r.y)||(prev[c.x+'_'+c.y]&&prev[c.x+'_'+c.y].result==='hit')))sk=ship.cells.map(c=>c.x+'_'+c.y).join(',')}await STK.ref.child('responses/'+id).transaction(old=>old||Object.assign({by:r.by,target:r.target,x:r.x,y:r.y,result:hit?'hit':'miss',at:firebase.database.ServerValue.TIMESTAMP},sk?{sk}:{}))}catch(e){console.error('Statki response',e)}}
async function stkHandleResponse(id,r){if(!r||r.by!==stkMe()||STK.processed.has(id))return;STK.processed.add(id);const key=r.x+'_'+r.y;try{const wait=(STK.flyEnd||0)-Date.now();if(wait>0)await new Promise(z=>setTimeout(z,wait));STK.fx={k:key,result:r.result,until:Date.now()+900};const existing=(await STK.ref.child('shots/'+stkMe()+'/'+key).once('value')).val();if(existing)return;{const rec={x:r.x,y:r.y,result:r.result},sref=STK.ref.child('shots/'+stkMe()+'/'+key);if(r.sk){rec.sk=r.sk;(STK.skLocal=STK.skLocal||[]).push(r.sk)}try{await sref.set(rec)}catch(er){if(!r.sk)throw er;delete rec.sk;await sref.set(rec)}}const fresh=(await STK.ref.child('shots/'+stkMe()).once('value')).val()||{};const total=Object.values(fresh).filter(x=>x.result==='hit').length;if(total>=15){await STK.ref.update({status:'end',winner:stkMe(),lastResult:r.result});STK.pending=false;STK.msg='Trafiony ostatni statek!';stkRender();return}const target=STK.players.find(p=>p.id!==stkMe());await STK.ref.update({turn:r.result==='hit'?stkMe():target.id,lastResult:r.result,lastBy:stkMe()});STK.pending=false;STK.msg=r.result==='hit'?(r.sk?'Zatopiony! Strzelasz ponownie.':'Trafiony! Strzelasz ponownie.'):'Pudło. Teraz strzela przeciwnik.';stkRender()}catch(e){STK.pending=false;STK.msg='Błąd zapisu wyniku: '+e.message;stkRender()}}

