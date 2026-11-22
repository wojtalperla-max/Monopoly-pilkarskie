
const T=['Woda','Jezioro','Pustynia','Las','Góry','Nizina'],TC=['#2d6a9f','#5aa9d6','#e0c36a','#2f7d3e','#8a8a8a','#9ccc65'],GL=['','','','♣','▲',''],COST=[9,9,1,2,2,1];
const N=[{n:'Polanie',c:'#d94f4f',b:'Wzrok +1',d:'Atak −1'},{n:'Wikingowie',c:'#4f7fd9',b:'Atak +1',d:'Obrona −1'},{n:'Rzymianie',c:'#a24fd9',b:'Dochód +1',d:'Atak −1'},{n:'Mongołowie',c:'#e08a2c',b:'Ruch 3',d:'Obrona −1'},{n:'Egipcjanie',c:'#e0457b',b:'Obrona +1',d:'Atak −1'},{n:'Inkowie',c:'#2fa59a',b:'Start z 2 osadnikami',d:'Obrona −1'}];
const PAL=[['Czerwony','#d94f4f'],['Niebieski','#4f7fd9'],['Fiolet','#a24fd9'],['Pomarańczowy','#e08a2c'],['Różowy','#e0457b'],['Turkusowy','#2fa59a'],['Żółty','#d4b800'],['Brązowy','#8b5a2b'],['Biały','#eeeeee'],['Czarny','#333333']],N0=N.map(n=>n.c);
function applyCols(list){N.forEach((n,i)=>n.c=N0[i]);list.forEach(p=>{if(p.ni>=0&&p.col)N[p.ni].c=p.col})}
const SZ={s:[14,10],m:[20,14],l:[28,18],xl:[40,26],xxl:[60,40]},R=22,W=Math.sqrt(3)*R;
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rnd=n=>Math.floor(Math.random()*n);
const KINGDOM_NAMES=['Szmaragdowa Korona','Srebrny Horyzont','Złote Imperium','Królestwo Mglistych Gór','Bursztynowy Tron','Księstwo Północnych Mórz','Cesarstwo Świtu','Rubinowa Marchia','Kraina Wiecznych Dębów','Imperium Błękitnego Lwa','Korona Tysiąca Rzek','Królestwo Słonecznych Piasków','Żelazna Domena','Księstwo Gwiezdnych Pól','Szkarłatne Państwo','Zielona Marchia','Królestwo Siedmiu Wzgórz','Perłowe Wybrzeże','Imperium Burz','Złoty Archipelag','Królestwo Białego Orła','Koralowa Korona','Cesarstwo Dalekiego Wschodu','Kraina Wschodzącego Słońca'];
function randomKingdom(used=[]){const taken=new Set(used);const pool=KINGDOM_NAMES.filter(n=>!taken.has(n));return pool.length?pool[rnd(pool.length)]:KINGDOM_NAMES[rnd(KINGDOM_NAMES.length)]+' '+(rnd(89)+11)}
const NB=r=>r&1?[[1,0],[-1,0],[1,-1],[0,-1],[1,1],[0,1]]:[[1,0],[-1,0],[0,-1],[-1,-1],[0,1],[-1,1]];
const cube=(q,r)=>{const x=q-(r-(r&1))/2;return[x,r,-x-r]};
const HD=(a,b,c,d)=>{const p=cube(a,b),o=cube(c,d);return Math.max(Math.abs(p[0]-o[0]),Math.abs(p[1]-o[1]),Math.abs(p[2]-o[2]))};
const C=(q,r)=>[W*(q+(r&1)/2)+W/2+5,R*1.5*r+R+5];
let myId,name,code,ref,RD={},LP=[],S=null,sel=null,msg='',started=false,local=false,hold=false,lastH=0,quiet=false,aiBusy=false,grpMode=true,grpN=0,zoom=1,holdFor=null,needBR=false,spec=null;
try{myId=localStorage.getItem('imp_id')}catch(e){}
if(!myId){myId=Math.random().toString(36).slice(2,10);try{localStorage.setItem('imp_id',myId)}catch(e){}}

/* ---------- generowanie mapy ---------- */
function smooth(a,w,h,k){for(;k>0;k--){const b=a.slice();for(let r=0;r<h;r++)for(let q=0;q<w;q++){let s=a[r*w+q],c=1;for(const[dq,dr]of NB(r)){const x=q+dq,y=r+dr;if(x>=0&&y>=0&&x<w&&y<h){s+=a[y*w+x];c++}}b[r*w+q]=s/c}a=b}return a}
function rk(a){const o=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]),r=[];o.forEach((p,k)=>r[p[1]]=k/a.length);return r}
function genMap(w,h){const g=()=>rk(smooth(Array.from({length:w*h},Math.random),w,h,3));const e=g(),m=g();return e.map((v,i)=>v<.2?0:v<.27&&m[i]>.6?1:v>.88?4:m[i]<.22?2:m[i]>.66?3:5)}
/* ---------- rzeki (krawędzie między polami) ---------- */
function genRivers(t,w,h){
  const VM=new Map(),key=(x,y)=>Math.round(x*4)+','+Math.round(y*4);
  const gv=(x,y)=>{const k=key(x,y);let v=VM.get(k);if(!v){v={x,y,nb:[],w:0,mt:0,d:1e9};VM.set(k,v)}return v};
  const isLand=(q,r)=>q>=0&&r>=0&&q<w&&r<h&&t[r*w+q]>=2;
  const link=(a,b)=>{if(!a.nb.includes(b))a.nb.push(b);if(!b.nb.includes(a))b.nb.push(a)};
  for(let r=0;r<h;r++)for(let q=0;q<w;q++){
    const[c0,c1]=C(q,r),ty=+t[r*w+q],vs=[];
    for(let j=0;j<6;j++){const a=Math.PI/180*(60*j-30);vs.push(gv(c0+R*Math.cos(a),c1+R*Math.sin(a)))}
    if(ty<2){vs.forEach(v=>v.w=1);continue}
    if(ty==4)vs.forEach(v=>v.mt=1);
    for(let j=0;j<6;j++){const a=Math.PI/180*(60*j),nx=c0+W*Math.cos(a),ny=c1+W*Math.sin(a),r2=Math.round((ny-R-5)/(R*1.5)),q2=Math.round((nx-W/2-5-W*(r2&1)/2)/W);
      if(isLand(q2,r2))link(vs[j],vs[(j+1)%6])}
  }
  const qu=[...VM.values()].filter(v=>v.w&&v.nb.length);qu.forEach(v=>v.d=0);
  for(let i=0;i<qu.length;i++){const v=qu[i];v.nb.forEach(n=>{if(n.d>v.d+1){n.d=v.d+1;qu.push(n)}})}
  const cand=[...VM.values()].filter(v=>v.nb.length&&v.d>=4&&v.d<1e8),sh=a=>a.sort(()=>Math.random()-.5);
  const pool=sh(cand.filter(v=>v.mt)).concat(sh(cand.filter(v=>!v.mt)));
  const want=Math.max(1,Math.min(36,Math.round(w*h/80))),used=new Set(),srcs=[],out=[];
  for(const s0 of pool){
    if(out.length>=want)break;if(used.has(s0)||srcs.some(p=>Math.hypot(p.x-s0.x,p.y-s0.y)<W*3.5))continue;
    const path=[s0],seen=new Set([s0]);let v=s0,ok=false;
    for(let step=0;step<600;step++){
      if(v.w){ok=true;break}
      const c=v.nb.filter(x=>!seen.has(x));if(!c.length)break;
      const dn=c.filter(x=>x.d<v.d),sm=c.filter(x=>x.d==v.d),from=(dn.length&&(Math.random()>.3||!sm.length))?dn:(sm.length?sm:dn);
      if(!from.length)break;const nx=from[rnd(from.length)];path.push(nx);seen.add(nx);v=nx;if(used.has(nx)){ok=true;break}
    }
    if(ok&&path.length>=5){path.forEach(x=>used.add(x));srcs.push(s0);out.push(path.map(x=>[+x.x.toFixed(2),+x.y.toFixed(2)]))}
  }
  return out}
const _rvE={set:new Set(),segs:[]};let _rvRef=null,_rvC=_rvE;
function px2c(x,y){const r=Math.round((y-R-5)/(R*1.5)),q=Math.round((x-W/2-5-W*(r&1)/2)/W);return(S&&q>=0&&r>=0&&q<S.w&&r<S.h)?[q,r]:null}
function rvData(){
  if(!S||!S.rv||!S.rv.length)return _rvE;if(S.rv===_rvRef)return _rvC;
  const set=new Set(),segs=[];
  S.rv.forEach(p=>{for(let i=0;i+1<p.length;i++){
    const[x1,y1]=p[i],[x2,y2]=p[i+1],dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,mx=(x1+x2)/2,my=(y1+y2)/2,nx=-dy/L*W/2,ny=dx/L*W/2,a=px2c(mx+nx,my+ny),b=px2c(mx-nx,my-ny);
    const ia=a?a[1]*S.w+a[0]:-1,ib=b?b[1]*S.w+b[0]:-1;segs.push({x1,y1,x2,y2,ia,ib});if(ia>=0&&ib>=0)set.add(ia<ib?ia+'|'+ib:ib+'|'+ia)}});
  _rvRef=S.rv;_rvC={set,segs};return _rvC}
function ensureRivers(){if(!S||!S.t||S.rv!==undefined)return;if(!(local||(RD&&RD.host==myId)))return;S.rv=genRivers(Array.from(S.t,Number),S.w,S.h);save()}
function riverX(q1,r1,q2,r2){const d=rvData();if(!d.set.size)return false;const a=r1*S.w+q1,b=r2*S.w+q2;return d.set.has(a<b?a+'|'+b:b+'|'+a)}
function riverStroke(g,segs,mp,sc,alpha){
  if(!segs.length)return;const m=segs.map(s=>[mp(s.x1,s.y1),mp(s.x2,s.y2)]);
  g.save();g.globalAlpha=alpha;g.lineCap='round';g.lineJoin='round';
  [['rgba(16,48,78,.94)',5.8],['#3f9fd8',3.7],['#97d8f6',1.25]].forEach(([c,w0])=>{g.beginPath();m.forEach(([a,b])=>{g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1])});g.strokeStyle=c;g.lineWidth=w0*sc;g.stroke()});
  g.restore()}
function starts(t,w,n){const c=[];t.forEach((v,i)=>{if(v==5||v==3)c.push([i%w,Math.floor(i/w)])});const out=[c[rnd(c.length)]];while(out.length<n){let best=null,bd=-1;for(let k=0;k<80;k++){const p=c[rnd(c.length)],d=Math.min(...out.map(o=>HD(p[0],p[1],o[0],o[1])));if(d>bd){bd=d;best=p}}out.push(best)}return out}
const mx=(s,o)=>s.pl[o].ni==3?3:2;
const MIL=k=>k=='W'||k=='A';
function milCount(i,withQ=true){return S.units.filter(u=>u.o==i&&MIL(u.k)).length+(withQ?(S.q||[]).filter(x=>x.o==i&&MIL(x.k)).length:0)}
function armyUpkeep(m){let s=0;for(let n=1;n<=m;n++)s+=1+Math.floor((n-1)/4);return s}
function upkeep(i){return S.units.filter(u=>u.o==i&&!MIL(u.k)).length+(S.q||[]).filter(x=>x.o==i&&!MIL(x.k)).length+armyUpkeep(milCount(i))}
function unitPrice(i,k){const b={W:15,A:20,S:15,C:8}[k];return MIL(k)?b+2*Math.floor(milCount(i)/4):b}
function add(s,o,k,q,r){s.units.push({id:s.nid++,o,k,q,r,mp:mx(s,o)+(k=='C'?2:0)})}

/* ===== IMPERIA w DGW: nick/kolor z konta + multiplayer przez Firebase Realtime Database ===== */
function impBridge(){try{return window.parent&&window.parent!==window?window.parent.IMP_BRIDGE:null}catch(e){return null}}
function impAcc(){try{const B=impBridge();if(B){const a=B.acc()||{};return{nick:a.nick||'',col:/^#[0-9a-f]{6}$/i.test(a.col||'')?a.col:'',logged:!!a.logged}}}catch(e){}return{nick:'',col:'',logged:false}}
const IMP_OFFS=[];
window.__impCleanup=()=>{while(IMP_OFFS.length){try{IMP_OFFS.pop()()}catch(e){}}};
async function impDb(){
  const B=impBridge();if(!B)return null;
  const fdb=B.db();if(!fdb)return null;
  const uid=await B.ensureAuth();if(!uid)return null;
  const root=c=>fdb.ref('imperiaRooms/'+c);
  const clean=o=>JSON.parse(JSON.stringify(o,(k,v)=>v===undefined?null:v));
  const snapOf=(id,v)=>{const ok=v!==null&&typeof v==='object';return{id,exists:ok,data:()=>ok?Object.assign({},v):undefined}};
  const listOf=v=>{v=v||{};const docs=Object.keys(v).filter(k=>v[k]!==null&&typeof v[k]==='object').map(k=>snapOf(k,v[k]));return{docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f)}};
  const listen=(node,make,cb,err)=>{const h=s=>cb(make(s.val()));node.on('value',h,e=>{if(err)err(e)});const off=()=>node.off('value',h);IMP_OFFS.push(off);return off};
  class Doc{
    constructor(path){const s=path.split('/');this.path=path;this.room=s.length===2;this.id=s[s.length-1];
      const base=root(s[1]);this.node=this.room?base.child('doc'):base.child(s[2]).child(s[3])}
    collection(n){return new Coll(this.path+'/'+n)}
    async get(){return snapOf(this.id,(await this.node.once('value')).val())}
    set(o){const d=clean(o);if(this.room)d.createdAt=B.fb().database.ServerValue.TIMESTAMP;return this.node.set(d)}
    update(o){return this.node.update(clean(o))}
    delete(){return this.node.remove()}
    onSnapshot(cb,err){return listen(this.node,v=>snapOf(this.id,v),cb,err)}
  }
  class Coll{
    constructor(path){const s=path.split('/');this.path=path;this.node=root(s[1]).child(s[2])}
    doc(id){return new Doc(this.path+'/'+id)}
    async get(){return listOf((await this.node.once('value')).val())}
    onSnapshot(cb,err){return listen(this.node,listOf,cb,err)}
  }
  return{uid,doc:p=>new Doc(p)};
}
function impLobbyInfo(){
  const a=impAcc(),el=$('nmacc'),inp=$('nm');if(!el||!inp||!a.nick)return;
  inp.style.display='none';el.style.display='block';
  el.innerHTML='Grasz jako <b>'+esc(a.nick)+'</b>'+(a.col?' <i style="display:inline-block;width:.9em;height:.9em;border-radius:50%;vertical-align:middle;border:2px solid #fff;background:'+a.col+'"></i> <small>(nick i kolor z konta DGW)</small>':' <small>(nick z konta DGW)</small>');
}

/* ---------- pokój / lobby ---------- */
function genCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
async function enter(create){
  const ia=impAcc();name=ia.nick||$('nm').value.trim().slice(0,16)||'Gracz';code=create?genCode():$('cd').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  const er=m=>$('er').textContent=m;
  if(!create&&code.length<3)return er('Wpisz kod pokoju od znajomego (min. 3 znaki).');
  const db=await impDb();
  if(!db)return er('Brak połączenia z serwerem gry (Firebase). Odśwież stronę i spróbuj ponownie.');myId=db.uid;
  try{
    ref=db.doc('rooms/'+code);let snap=await ref.get();
    if(create)for(let k=0;k<8&&snap.exists;k++){code=genCode();ref=db.doc('rooms/'+code);snap=await ref.get()}
    const pc=ref.collection('players'),pd=pc.doc(myId);
    if(create){if(snap.exists)return er('Nie udało się wygenerować kodu pokoju. Spróbuj ponownie.');await ref.set({host:myId,size:'m',started:false,game:''})}
    else if(!snap.exists)return er('Nie ma takiego pokoju.');
    const mine=await pd.get();
    if(!mine.exists){
      const d=snap.data()||{};
      if(d.started)return er('Gra w tym pokoju już trwa.');
      if((await pc.get()).size>=6)return er('Pokój jest pełny (max 6).');
      await pd.set(Object.assign({name,kingdom:$('kingdom').value.trim()||'Królestwo '+name,ni:-1,t:Date.now()},ia.col?{col:ia.col}:{}));
    }
    ref.onSnapshot(s=>{RD=s.data()||{};let ns=null;try{ns=RD.game?JSON.parse(RD.game):null}catch(e){ns=null}adoptState(ns);render()});
    pc.onSnapshot(s=>{LP=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.t-b.t);render()});
  }catch(e){er('Błąd: '+(e.message||e.code))}
}
const me=()=>LP.find(p=>p.id==myId);
function pick(i){ref.collection('players').doc(myId).update({ni:i})}
function setSize(v){ref.update({size:v})}
function addAI(){const used=LP.map(p=>p.ni),i=[0,1,2,3,4,5].find(x=>!used.includes(x));if(i==null)return;const kingdom=randomKingdom(LP.map(p=>p.kingdom));ref.collection('players').doc('ai'+rnd(1e6)).set({name:'Władca '+(LP.filter(p=>p.ai).length+1),kingdom,ni:i,t:Date.now(),ai:true})}
function rmAI(id){ref.collection('players').doc(id).delete()}
async function start(){
  const[w,h]=SZ[RD.size||'m'],t=genMap(w,h),ps=LP.map(p=>({id:p.id,name:p.name,kingdom:p.kingdom||('Królestwo '+p.name),ni:p.ni,alive:true,ai:!!p.ai,col:p.col,g:10,e:0,h:[[1,10,0,0]],seen:'0'.repeat(w*h)}));
  const pos=starts(t,w,ps.length),s={w,h,t:t.join(''),rv:genRivers(t,w,h),pl:ps,units:[],cities:[],turn:0,round:1,nid:1,over:-1,own:'0'.repeat(w*h),hs:[],tw:[]};
  const used=new Set();ps.forEach(p=>{if(p.col&&!used.has(p.col))used.add(p.col);else p.col=null});const pool=PAL.map(x=>x[1]).filter(c=>!used.has(c)).sort(()=>Math.random()-.5);ps.forEach(p=>{if(!p.col){p.col=pool.length?pool.shift():'#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');used.add(p.col)}});
  ps.forEach((p,i)=>{const[q,r]=pos[i];s.cities.push({o:i,q,r,b:'W',p:0,nm:pickCityName(s),lv:1});claim(i,q,r,1,2,s);add(s,i,'W',q,r);add(s,i,'S',q,r);if(p.ni==5)add(s,i,'S',q,r)});
  if(local){S=s;hold=false;render();return}
  await ref.update({started:true,game:JSON.stringify(s)});
}
const CIV_IC=['🦅','🪓','🏛️','🐎','🏺','☀️'];
const MAP_SZ=[['s','Mała'],['m','Średnia'],['l','Duża'],['xl','Bardzo duża'],['xxl','Ogromna']];
/* wspólne kafelki wyboru cywilizacji (pokój online + gra lokalna) */
function civCards(sel,taken,fn){return N.map((n,i)=>{const t=taken[i],on=sel===i;
  return `<button type="button" class="civ${on?' on':''}${t?' taken':''}" ${t?'disabled':''} style="--cc:${N0[i]}" onclick="${fn(i)}"><span class="civ-ic">${CIV_IC[i]||'🏰'}</span><b>${esc(n.n)}</b><span class="civ-b">＋ ${esc(n.b)}</span><span class="civ-d">－ ${esc(n.d)}</span>${t?`<em class="civ-t">Zajęte: ${esc(t)}</em>`:''}${on?'<em class="civ-ok">✓</em>':''}</button>`}).join('')}
const civGrid=(sel,taken,fn)=>`<div class="civ-grid">${civCards(sel,taken,fn)}</div>`;
let _rmLast='';
function roomSet(html){
  const b=$('rmBody');if(!b){$('room').innerHTML=html;return}
  if(html===_rmLast)return;_rmLast=html;
  const a=document.activeElement,keep=a&&b.contains(a)&&a.id?{id:a.id,v:a.value,s:a.selectionStart,e:a.selectionEnd}:null,sc=$('room').scrollTop;
  b.innerHTML=html;
  if(keep){const n=$(keep.id);if(n){if(n.id==='kingdomEdit'&&keep.v!==undefined)n.value=keep.v;try{n.focus();n.setSelectionRange(keep.s,keep.e)}catch(e){}}}
  $('room').scrollTop=sc;
}
function copyCode(btn){
  const t=code||'',done=()=>{if(btn){btn.textContent='✅ Skopiowano!';setTimeout(()=>{btn.textContent='📋 Kopiuj kod pokoju'},1600)}};
  const fb=()=>{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0;left:-999px';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove();done()};
  try{navigator.clipboard.writeText(t).then(done,fb)}catch(e){fb()}
}
function roomMsg(txt){return `<div class="rm-card"><div class="rm-badge">👑 Imperia</div><p class="rm-info">${txt}</p></div>`}
function lobbyView(){
  const host=RD.host==myId,m=me();applyCols(LP);
  const ready=LP.length>=2&&LP.every(p=>p.ni>=0),taken={};
  LP.forEach(p=>{if(p.ni>=0&&p.id!=myId)taken[p.ni]=p.name});
  const info=LP.length<2?'Możesz rozpocząć grę, gdy dołączy co najmniej 2 osoby.':!ready?'Czekamy, aż każdy wybierze cywilizację.':host?'Wszyscy gotowi – możesz rozpocząć grę!':'Wszyscy gotowi – czekamy na hosta.';
  let h=`<div class="rm-card"><div class="rm-badge">👑 Imperia · gra online</div><div class="rm-lbl">Kod pokoju</div><div class="rm-code">${esc(code)}</div><p class="rm-info">Gracze: ${LP.length}/6. ${info}</p>`;
  h+='<div class="rm-players">'+LP.map((p,k)=>`<div class="rm-pl"><i class="rm-dot${p.ni>=0?' ok':''}"></i><span class="rm-nm">${k+1}. ${esc(p.name)}${p.id==RD.host?' <b class="rm-tag">(host)</b>':''}${p.id==myId?' <b class="rm-me">(Ty)</b>':''}${p.ai?' <b class="rm-tag">[AI]</b>':''}</span>${p.ni>=0?`<span class="rm-civ" style="--cc:${p.col||N0[p.ni]}">${CIV_IC[p.ni]||'🏰'} ${esc(N[p.ni].n)}</span>`:'<span class="rm-civ none">wybiera…</span>'}${p.ai&&host?`<button type="button" class="rm-x" title="Usuń AI" onclick="rmAI('${p.id}')">✕</button>`:''}</div>`).join('')+'</div>';
  h+='<div class="rm-sec">Twoja cywilizacja</div>'+civGrid(m?m.ni:-1,taken,i=>`pick(${i})`);
  const mc=(m&&(m.col||(m.ni>=0?N0[m.ni]:null)))||'#d94f4f';
  h+=`<div class="rm-sec">Twoje królestwo</div><div class="rm-row"><input id="kingdomEdit" maxlength="24" value="${esc(m&&m.kingdom||'Królestwo '+(m&&m.name||'Gracza'))}" placeholder="Nazwa królestwa"><button type="button" class="rm-sm" onclick="pickKingdom()">Zapisz</button></div><div class="rm-row"><span>Kolor państwa:</span><input type="color" value="${mc}" onchange="pickCol(this.value)"></div>`;
  h+='<div class="rm-sep"></div>';
  if(host){
    h+=`<div class="rm-row"><span>Rozmiar mapy:</span><select onchange="setSize(this.value)">${MAP_SZ.map(([k,l])=>`<option value="${k}" ${RD.size==k?'selected':''}>${l}</option>`).join('')}</select></div>`;
    h+=`<button type="button" class="il-btn il-gold il-go" ${ready?'':'disabled'} onclick="start()"><span class="il-ic">⚔️</span><span>Rozpocznij grę</span></button>`;
    h+=`<button type="button" class="rm-ghost" ${LP.length<6?'':'disabled'} onclick="addAI()">🤖 Dodaj AI</button>`;
  }else{
    const sz=(MAP_SZ.find(x=>x[0]==(RD.size||'m'))||MAP_SZ[1])[1];
    h+=`<div class="rm-row"><span>Rozmiar mapy:</span><b class="rm-val">${sz}</b></div><div class="rm-wait">⏳ Czekamy, aż host rozpocznie grę…</div>`;
  }
  h+='<button type="button" class="rm-ghost" onclick="copyCode(this)">📋 Kopiuj kod pokoju</button></div>';
  return h;
}

function localCivPaint(){
  const n=document.querySelectorAll('#local-civs input[id^=local-ni-]').length,vals=[];
  for(let i=0;i<n;i++)vals.push(+$('local-ni-'+i).value);
  for(let i=0;i<n;i++){const t={};vals.forEach((v,k)=>{if(k!==i)t[v]='Gracz '+(k+1)});const g=$('lg-'+i);if(g)g.innerHTML=civCards(vals[i],t,j=>`localPick(${i},${j})`)}
}
function localPick(i,j){const h=$('local-ni-'+i);if(!h)return;h.value=j;const c=$('local-col-'+i);if(c&&!c.dataset.u)c.value=N0[j];localCivPaint();try{sfx('tap')}catch(e){}}
function localCivUI(){
  const n=Math.max(0,Math.min(6,+$('ln').value||0)),box=$('local-civs');if(!box)return;
  const oldN=[...box.querySelectorAll('input[id^=local-ni-]')].map(x=>+x.value),oc=[...box.querySelectorAll('input[type=color]')].map(x=>x.dataset.u?x.value:null);
  if(!n){box.innerHTML='<p class="rm-info">👁 Tryb obserwatora – wszystkie cywilizacje zagrają jako AI.</p>';return}
  const used=new Set(),vals=[];
  for(let i=0;i<n;i++){let v=oldN[i];if(!(v>=0)||used.has(v))v=N.findIndex((_,j)=>!used.has(j));if(v<0)v=0;used.add(v);vals.push(v)}
  box.innerHTML=vals.map((v,i)=>{const user=oc[i]||(i===0&&impAcc().col);const col=oc[i]||(i===0&&impAcc().col)||N0[v];
    return `<div class="lc"><div class="lc-h"><span>👤 Gracz ${i+1}</span><label class="lcol">Kolor <input type="color" id="local-col-${i}" value="${col}" ${user?'data-u="1"':''} oninput="this.dataset.u='1'"></label></div><input type="hidden" id="local-ni-${i}" value="${v}"><div class="civ-grid" id="lg-${i}"></div></div>`}).join('');
  localCivPaint();
}
function localGame(){const n=+$('ln').value,m=+$('la').value;if(n+m<2)return $('er').textContent=n==0?'Tryb obserwatora: ustaw min. 2 AI.':'Potrzeba min. 2 graczy (ludzie + AI).';if(n+m>6)return $('er').textContent='Max 6 graczy łącznie.';spec=n==0?{paused:false,speed:800,target:0,step:0}:null;local=true;ref={update:()=>Promise.resolve()};code='LOKALNIE';RD={size:$('ls').value,started:true};
  const chosen=Array.from({length:n},(_,i)=>+$('local-ni-'+i).value),used=new Set(chosen);if(used.size<n)return $('er').textContent='Każdy gracz musi wybrać inną cywilizację.';if(new Set(chosen.map((_,i)=>$('local-col-'+i).value)).size<n)return $('er').textContent='Każdy gracz musi mieć inny kolor.';
  const aiN=N.map((_,i)=>i).filter(i=>!used.has(i));if(aiN.length<m)return $('er').textContent='Za mało różnych cywilizacji dla tylu graczy i AI.';
  LP=Array.from({length:n+m},(_,i)=>{const ni=i<n?chosen[i]:aiN[i-n];return{id:'L'+i,name:i>=n?'Władca '+(i-n+1):(i===0&&impAcc().nick?impAcc().nick:'Gracz '+(i+1)),kingdom:(i===0&&n>0)?($('kingdom').value.trim()||randomKingdom()):randomKingdom(),ni,t:i,ai:i>=n,col:i<n?$('local-col-'+i).value:undefined}});start()}
/* ---------- logika gry ---------- */
const meIdx=()=>{if(local&&S){if(!S.pl[S.turn].ai)lastH=S.turn;return lastH}return S.pl.findIndex(p=>p.id==myId)};
const mineTurn=()=>S&&S.over<0&&S.turn==meIdx();
const tt=(q,r)=>+S.t[r*S.w+q];
const adj=(u,q,r)=>NB(u.r).some(([a,b])=>u.q+a==q&&u.r+b==r);
function vision(pi){const V=new Uint8Array(S.w*S.h),ni=S.pl[pi].ni,rad=2+(ni==0?1:0);
  if(spec&&!quiet)return V.fill(1);
  const mark=(q0,r0,rr=rad)=>{for(let r=Math.max(0,r0-rr);r<=Math.min(S.h-1,r0+rr);r++)for(let q=Math.max(0,q0-rr-1);q<=Math.min(S.w-1,q0+rr+1);q++)if(HD(q0,r0,q,r)<=rr)V[r*S.w+q]=1};
  S.units.forEach(u=>u.o==pi&&mark(u.q,u.r,u.k=='C'?rad+1:rad));(S.tw||[]).forEach(k=>S.own[k]==pi+1&&mark(k%S.w,Math.floor(k/S.w),3));S.cities.forEach(c=>c.o==pi&&mark(c.q,c.r));return V}
const BTX=new Set(['fl','busy','_rc','anim','aiRun','sel','ver','fin','pr']);
function save(){if(local||quiet)return;ref.update({game:JSON.stringify(S,(k,v)=>BTX.has(k)?undefined:v)}).catch(()=>{msg='Błąd zapisu';render()})}
function chk(){S.pl.forEach((p,i)=>{if(p.alive&&!S.cities.some(c=>c.o==i)&&!S.units.some(u=>u.o==i))p.alive=false});
  const al=S.pl.map((p,i)=>p.alive?i:-1).filter(i=>i>=0);if(al.length==1)S.over=al[0]}
// Audio jest generowane lokalnie w przeglądarce; nic nie jest pobierane z sieci.
let soundOn=true,audioCtx=null,motions=[],motionFrame=0;
function tone(freq,dur=.11,type='sine',vol=.035,slide=0){
  if(!soundOn)return;
  try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,now);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),now+dur);
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(vol,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+dur);
    o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+dur+.02);
  }catch(e){}
}
function sfx(kind){if(quiet)return;if(kind==='move'){tone(420,.09,'triangle',.025,-110);setTimeout(()=>tone(300,.08,'sine',.018,-40),55)}
  else if(kind==='fight'){tone(125,.16,'sawtooth',.045,-65);setTimeout(()=>tone(78,.19,'triangle',.035,-25),85)}
  else if(kind==='win'){tone(520,.12,'triangle',.03,130);setTimeout(()=>tone(760,.18,'sine',.025,100),100)}
  else if(kind==='build'){tone(390,.1,'sine',.025,80);setTimeout(()=>tone(590,.16,'triangle',.02,100),95)}
  else if(kind==='tap'){tone(740,.07,'sine',.03,160);setTimeout(()=>tone(1110,.1,'triangle',.016,-140),42)}
  else if(kind==='select')tone(650,.055,'sine',.012,-100);
  else if(kind==='swish')tone(950,.11,'sawtooth',.016,-700);
  else if(kind==='clang'){tone(1250,.09,'square',.024,-500);setTimeout(()=>tone(1900,.12,'triangle',.014,-900),18)}
  else if(kind==='thud')tone(95,.17,'triangle',.05,-45);
}
function animateMove(u,from,to){
  motions=motions.filter(m=>m.id!==u.id);motions.push({id:u.id,from,to,start:performance.now(),duration:310});
  if(motionFrame)return;
  const tick=now=>{motions=motions.filter(m=>now-m.start<m.duration);if(S&&S.pl){draw(vision(meIdx()));}
    if(motions.length)motionFrame=requestAnimationFrame(tick);else motionFrame=0;};
  motionFrame=requestAnimationFrame(tick);
}
function unitPos(u){const m=motions.find(x=>x.id===u.id);if(!m)return C(u.q,u.r);let t=Math.min(1,(performance.now()-m.start)/m.duration);t=1-Math.pow(1-t,3);const a=C(m.from.q,m.from.r),b=C(m.to.q,m.to.r);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}

var _mvB=new Set();
function moveU(u,q,r){
  const old={q:u.q,r:u.r};const t=tt(q,r);if(t<2){msg='Tam nie da się wejść (woda).';return render()}
  const me_=u.o,en=S.units.filter(x=>x.q==q&&x.r==r&&x.o!=me_),ec=S.cities.find(c=>c.q==q&&c.r==r&&c.o!=me_);
  if(en.length){
    if(!MIL(u.k)){msg=u.k=='C'?'Zwiadowca nie może atakować.':'Osadnik nie atakuje.';return render()}
    const d=en.find(x=>MIL(x.k))||en[0],ai=S.pl[me_].ni,di=S.pl[d.o].ni;
    const rv0=riverX(u.q,u.r,q,r)?1:0,a=Math.max(1,3+(ai==1?1:0)-(isCut(me_,u.q,u.r)?1:0)-rv0),df=Math.max(1,3+rv0+(di==4?1:0)-(isCut(d.o,q,r)?1:0)+(t==3||t==4?1:0)+(ec?1:0)+((S.tw||[]).includes(r*S.w+q)&&S.own[r*S.w+q]==d.o+1?2:0));
    if(d.k=='C'||Math.random()<a/(a+df)){S.units=S.units.filter(x=>x.id!=d.id);msg='Wygrana walka!';sfx('win');if(d.k!='C')recB(me_,d.o,1,0)}
    else{S.units=S.units.filter(x=>x.id!=u.id);msg='Twój oddział poległ.';sel=null;sfx('fight');if(d.k!='C')recB(d.o,me_,1,0)}
    u.mp=0;
  }else if(ec){
    if(!MIL(u.k)){msg='Tylko wojsko zdobywa miasta.';return render()}
    ec.o=me_;u.q=q;u.r=r;u.mp=0;animateMove(u,old,{q,r});sfx('win');msg='Miasto zdobyte!';claim(me_,q,r,1,2);
  }else{const _stay=S.units.filter(x=>x!==u&&x.o==u.o&&x.q==q&&x.r==r&&x.k!='C'&&!_mvB.has(x.id));u.q=q;u.r=r;animateMove(u,old,{q,r});sfx('move');const rvx=riverX(old.q,old.r,q,r);u.mp=Math.max(0,u.mp-COST[t]-(rvx?2:0));if((S.hs||[]).includes(r*S.w+q))u.mp++;msg=(S.hs||[]).includes(r*S.w+q)?'Przejście przez domek: +1 punkt ruchu!':'';if(rvx)msg='Przeprawa przez rzekę: −2 punkty ruchu.'+(msg?' '+msg:'');if(u.k!='C')claim(u.o,q,r,u.k=='S'?1:0,1);
    if(u.k!='C'&&_stay.length){const _m=Math.max(u.mp,..._stay.map(x=>x.mp));u.mp=_m;_stay.forEach(x=>{x.mp=_m})}}
  chk();save();render();
}
const CITY_NAMES=['Złotogród','Biały Gród','Kamienna Wola','Srebrna Góra','Wysoka Warta','Czarny Bór','Lwi Gród','Orlia Skała','Dębowa Twierdza','Szafirowe Wrota','Kruszwica','Wolin','Stary Bród','Zielona Dolina','Wilcze Wzgórze','Mglisty Gród','Jantarowa Przystań','Żelazna Brama','Królewska Wola','Granitowy Szczyt','Brzask','Wrzosowisko','Miodowa','Łabędzi Gród','Sokole Gniazdo','Burzogród','Krasnogród','Ostoja','Nowa Nadzieja','Gwiezdny Gród','Rubinowa Warta','Szmaragdowy Bór','Cisowa','Jaskółcza Wola','Bursztynowo','Szronowa Twierdza'];
function pickCityName(st){const used=new Set(((st||S).cities||[]).map(c=>c.nm)),pool=CITY_NAMES.filter(n=>!used.has(n));return pool.length?pool[rnd(pool.length)]:'Gród '+(rnd(900)+100)}
const CITY_UP=[0,0,50,100];
function cityPanel(c,en){const lv=c.lv||1,mx=lv>=3;return `<b>🏰 ${esc(c.nm||'Miasto')}</b> · poziom ${lv}${lv>1?' '+'★'.repeat(lv-1):''}<br><small>Fortyfikacje dają obrońcom osłonę +${lv-1} więcej w bitwie.</small><br>`+(mx?'<small>Maksymalny poziom ulepszenia.</small><br>':`<button ${en?'':'disabled'} onclick="upgradeCity()">Ulepsz miasto do poz. ${lv+1} – ${CITY_UP[lv+1]} 🪙 (+1 osłona murów)</button><br>`)}
function upgradeCity(){if(!mineTurn()||!sel||sel.k!='c')return;const c=S.cities[sel.i],p=S.pl[S.turn],lv=c.lv||1;if(!c||c.o!=S.turn)return;if(lv>=3){msg='Miasto ma już maksymalny poziom.';return render()}const cost=CITY_UP[lv+1];if((p.g||0)<cost){msg='Za mało złota ('+cost+').';return render()}p.g-=cost;c.lv=lv+1;sfx('build');msg='Miasto '+(c.nm||'')+' ulepszone do poziomu '+c.lv+' – mocniejsze mury i cytadela!';save();render()}
function found(){const u=S.units.find(x=>sel&&x.id==sel.id);if(!u||!mineTurn()||u.k!='S')return;
  if(tt(u.q,u.r)==4)return msg='Nie można w górach.',render();
  if(S.cities.some(c=>HD(c.q,c.r,u.q,u.r)<3))return msg='Za blisko innego miasta (min. 3 pola).',render();
  const nm0=pickCityName(),uid=u.id;
  askName('Nazwa nowego miasta',nm0,inp=>{const u2=S.units.find(x=>x.id==uid);if(!u2||!mineTurn()||u2.k!='S')return;if(S.cities.some(c=>HD(c.q,c.r,u2.q,u2.r)<3))return;const nm=(inp.trim()||nm0).slice(0,20);S.cities.push({o:u2.o,q:u2.q,r:u2.r,b:'W',p:0,nm,lv:1});sfx('build');claim(u2.o,u2.q,u2.r,1,2);S.units=S.units.filter(x=>x.id!=uid);sel=null;msg='Założono miasto '+nm+'!';save();render()})}
function askName(title,def,cb){
  const old=document.getElementById('nmdlg');if(old)old.remove();
  const w=document.createElement('div');w.id='nmdlg';w.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px';
  w.innerHTML=`<div class="card" style="max-width:360px;width:100%;margin:0"><h3 style="margin-top:0">${esc(title)}</h3><input id="nmdi" maxlength="20" value="${esc(def)}" style="width:100%;margin:8px 0 12px"><div class="row" style="gap:8px"><button class="p" id="nmok" style="flex:1">Załóż miasto</button><button id="nmno" style="flex:1">Anuluj</button></div></div>`;
  document.body.appendChild(w);const inp=document.getElementById('nmdi'),close=()=>w.remove();
  document.getElementById('nmok').onclick=()=>{const v=inp.value;close();cb(v)};document.getElementById('nmno').onclick=close;
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){document.getElementById('nmok').click()}else if(e.key==='Escape')close()});setTimeout(()=>{inp.focus();inp.select()},30)}
let CUTS=new Set();
function isCut(o,q,r){
  if(!S||!S.own)return false;const w=S.w,h=S.h,i0=r*w+q;
  /* jednostka stoi na własnym terytorium lub w mieście = ma dostęp do królestwa */
  if(S.cities.some(c=>c.o==o&&c.q==q&&c.r==r))return false;
  const en=S.units.filter(x=>x.o!=o&&MIL(x.k));if(!en.length)return false;
  if(+S.own[i0]===o+1){
    /* stoi na własnym polu: ma dostęp do królestwa tylko, jeśli ciągiem własnych pól (bez pól zajętych przez wroga) dojdzie do własnego miasta */
    const cs=new Set(S.cities.filter(c=>c.o==o).map(c=>c.r*w+c.q));if(!cs.size)return false;
    const eo=new Set(en.map(x=>x.r*w+x.q)),sn=new Set([i0]),qq=[[q,r]];
    for(let k=0;k<qq.length;k++){const[cq,cr]=qq[k];
      for(const[a,b]of NB(cr)){const nq=cq+a,nr=cr+b;if(nq<0||nr<0||nq>=w||nr>=h)continue;const ni=nr*w+nq;
        if(sn.has(ni)||+S.own[ni]!==o+1||tt(nq,nr)<2||eo.has(ni))continue;if(cs.has(ni))return false;sn.add(ni);qq.push([nq,nr])}}
    return true}
  const occ=new Set(),zoc=new Set(),mine=new Set(S.units.filter(x=>x.o==o&&MIL(x.k)).map(x=>x.r*w+x.q));
  en.forEach(x=>{occ.add(x.r*w+x.q);NB(x.r).forEach(([a,b])=>{const nq=x.q+a,nr=x.r+b;if(nq>=0&&nr>=0&&nq<w&&nr<h)zoc.add(nr*w+nq)})});
  const blocked=i=>occ.has(i)||(zoc.has(i)&&!mine.has(i));
  /* BFS bez limitu; ign=true ignoruje wrogów (sprawdza tylko, czy lądem w ogóle da się dojść do królestwa) */
  const reach=ign=>{const seen=new Set([i0]),qu=[[q,r]];
    for(let k=0;k<qu.length;k++){const[cq,cr]=qu[k];
      for(const[a,b]of NB(cr)){const nq=cq+a,nr=cr+b;if(nq<0||nr<0||nq>=w||nr>=h)continue;const ni=nr*w+nq;if(seen.has(ni)||tt(nq,nr)<2)continue;seen.add(ni);
        if(!ign&&blocked(ni))continue;if(+S.own[ni]===o+1)return true;qu.push([nq,nr])}}
    return false};
  if(reach(false))return false;            /* jest droga do królestwa */
  return reach(true)}                      /* okrążony tylko jeśli to wróg odcina drogę (a nie np. wyspa/woda) */
function computeCuts(){CUTS=new Set();if(!S||!S.units)return;const done=new Set();S.units.forEach(u=>{const k=u.o+':'+u.q+','+u.r;if(done.has(k))return;done.add(k);if(isCut(u.o,u.q,u.r))CUTS.add(k)})}
function skip(){const u=S.units.find(x=>sel&&x.id==sel.id);if(u){u.mp=0;save();render()}}
function build(k){S.cities[sel.i].b=k;save();render()}
function chart(ser,cols,h){const W_=320,H_=120,m=26,n=ser[0].length,mv=Math.max(1,...ser.flat()),yy=v=>H_-m+4-(H_-m-10)*v/mv,xx=i=>m+(W_-m-8)*(n>1?i/(n-1):.5);
 let s=`<svg viewBox="0 0 ${W_} ${H_}" style="width:100%;max-width:460px;background:var(--bg);border:1px solid var(--bd);border-radius:6px">`;
 for(let g=0;g<=2;g++){const y=yy(mv*g/2);s+=`<line x1="${m}" x2="${W_-6}" y1="${y}" y2="${y}" stroke="var(--bd)"/><text x="2" y="${y+3}" font-size="9" fill="currentColor">${Math.round(mv*g/2)}</text>`}
 ser.forEach((a,k)=>{s+=`<polyline fill="none" stroke="${cols[k]}" stroke-width="2" points="${a.map((v,i)=>xx(i)+','+yy(v)).join(' ')}"/>`+a.map((v,i)=>`<circle cx="${xx(i)}" cy="${yy(v)}" r="2.5" fill="${cols[k]}"/>`).join('')});
 s+=`<text x="${m}" y="${H_-6}" font-size="9" fill="currentColor">tura ${h[0][0]}</text><text x="${W_-8}" y="${H_-6}" font-size="9" text-anchor="end" fill="currentColor">tura ${h[h.length-1][0]}</text></svg>`;return s}
function stats(){const mi=meIdx(),p=S.pl[mi],h=p.h&&p.h.length?p.h:[[S.round,p.g||0,0,0]],g=p.g||0,e=p.e||0;
 $('stc').innerHTML=`<h3 style="margin-top:0">Statystyki – ${esc(p.name)}</h3><div>🪙 Złoto teraz: <b>${g}</b><br>Zarobione łącznie: <b>${e}</b><br>Wydane łącznie: <b>${Math.max(0,10+e-g)}</b><br>Przychód na turę: <b>+${income(mi)}</b></div><p><b>Złoto</b> <span style="color:#2ecc71">■</span> i <b>zarobione łącznie</b> <span style="color:#3498db">■</span> w kolejnych turach</p>${chart([h.map(x=>x[1]),h.map(x=>x[3])],['#2ecc71','#3498db'],h)}<p><b>Przychód na turę</b> <span style="color:#e67e22">■</span></p>${chart([h.map(x=>x[2])],['#e67e22'],h)}<p><button class="p" onclick="$('st').style.display='none'">Zamknij</button></p>`;$('st').style.display='block'}
function noteMet(a,b){const m=S.pl[a];m.met=m.met||[];if(!m.met.includes(b))m.met.push(b)}
function colHtmlOld(m){const my=m&&(m.col||(m.ni>=0?N0[m.ni]:null));let h='<h3>Kolor państwa</h3><div class="row" style="flex-wrap:wrap">';PAL.forEach(([n,c])=>{const tk=LP.some(p=>p.id!=myId&&(p.col||(p.ni>=0?N0[p.ni]:null))==c);h+=`<button title="${n}" ${tk?'disabled':''} onclick="pickCol('${c}')" style="background:${c};width:34px;height:34px;padding:0;border:3px solid ${my==c?'var(--fg)':'var(--bd)'}"></button>`});return h+'</div>'}
function colHtml(m){const my=m&&(m.col||(m.ni>=0?N0[m.ni]:null))||'#d94f4f';return `<h3>Kolor państwa</h3><div class="row"><input type="color" value="${my}" onchange="pickCol(this.value)" style="width:56px;height:40px;padding:2px"> <small>dowolny kolor – wybierz i zatwierdź</small></div>`}
function pickCol(c){ref.collection('players').doc(myId).update({col:c})}
function pickKingdom(){const v=$('kingdomEdit').value.trim().slice(0,24);if(v)ref.collection('players').doc(myId).update({kingdom:v})}
function recB(w,l,kw,kl){const a=S.pl[w],b=S.pl[l];a.bw=(a.bw||0)+1;b.bl=(b.bl||0)+1;a.bk=(a.bk||0)+kw;b.bk=(b.bk||0)+kl;a.bd=(a.bd||0)+kl;b.bd=(b.bd||0)+kw}
function battleStats(met){let t='<p><b>⚔ Bitwy</b></p><table style="width:100%;border-collapse:collapse"><tr><th align="left">Państwo</th><th>Wygrane</th><th>Przegrane</th><th>Skuteczność</th><th>Zabici</th><th>Straty</th></tr>';
 met.forEach(i=>{const p=S.pl[i],w=p.bw||0,l=p.bl||0,n=w+l,pc=n?Math.round(w/n*100):0;t+=`<tr><td><i class="d" style="background:${N[p.ni].c}"></i> ${esc(p.name)}</td><td align="center"><b>${w}</b></td><td align="center">${l}</td><td align="center"><div style="background:rgba(255,255,255,.1);border-radius:4px;height:8px;min-width:50px"><div style="width:${pc}%;height:8px;border-radius:4px;background:${N[p.ni].c}"></div></div><small>${n?pc+'%':'—'}</small></td><td align="center">${(p.bk||0)*100}</td><td align="center">${(p.bd||0)*100}</td></tr>`});
 return t+'</table><small>Zabici i straty liczone w żołnierzach (1 jednostka bojowa = 100).</small>'}
let CH={},chN=0;
function chart(ser){const id='ch'+(chN++),all=ser.flatMap(x=>x.p),r0=Math.min(...all.map(p=>p[0])),r1=Math.max(...all.map(p=>p[0]));CH[id]={ser,r0,r1,v0:r0,v1:r1};return `<div class="chw" data-id="${id}" style="touch-action:none;cursor:grab">${chartSvg(id)}</div>`}
function chartSvg(id){const C=CH[id],W_=320,H_=130,m=28,{ser,v0,v1}=C,span=Math.max(1,v1-v0),xx=r=>m+(W_-m-8)*((r-v0)/span);
 const vis=ser.map(se=>({c:se.c,p:se.p.filter(p=>p[0]>=v0-span*.02&&p[0]<=v1+span*.02)})),mv=Math.max(1,...vis.flatMap(se=>se.p.map(p=>p[1]))),yy=v=>H_-m+4-(H_-m-10)*v/mv;
 let s=`<svg viewBox="0 0 ${W_} ${H_}" style="width:100%;max-width:460px;background:var(--bg);border:1px solid var(--bd);border-radius:6px;user-select:none"><defs><clipPath id="cp${id}"><rect x="${m}" y="0" width="${W_-m-4}" height="${H_-m+8}"/></clipPath></defs>`;
 for(let g=0;g<=2;g++){const y=yy(mv*g/2);s+=`<line x1="${m}" x2="${W_-6}" y1="${y}" y2="${y}" stroke="var(--bd)"/><text x="2" y="${y+3}" font-size="9" fill="currentColor">${Math.round(mv*g/2)}</text>`}
 s+=`<g clip-path="url(#cp${id})">`;
 ser.forEach(se=>{const pts=se.p.filter(p=>p[0]>=v0-span&&p[0]<=v1+span),dots=span<=40;s+=`<polyline fill="none" stroke="${se.c}" stroke-width="2" points="${pts.map(p=>xx(p[0])+','+yy(p[1])).join(' ')}"/>`+(dots?pts.map(p=>`<circle cx="${xx(p[0])}" cy="${yy(p[1])}" r="2.5" fill="${se.c}"/>`).join(''):'')});
 s+='</g>';
 const step=Math.max(1,Math.ceil(span/6));for(let r=Math.ceil(v0);r<=v1;r+=step)s+=`<text x="${xx(r)}" y="${H_-14}" font-size="8" text-anchor="middle" fill="currentColor">${r}</text>`;
 return s+`<text x="${m}" y="${H_-4}" font-size="9" fill="currentColor">tura ${Math.round(v0)}</text><text x="${W_-8}" y="${H_-4}" font-size="9" text-anchor="end" fill="currentColor">tura ${Math.round(v1)}</text></svg>`}
function chartZoom(id,f,cx){const C=CH[id],span=C.v1-C.v0,ns=Math.max(4,Math.min(C.r1-C.r0||1,span*f));if(C.r1-C.r0<=4)return;const a=C.v0+span*cx,v0=a-ns*cx;C.v0=Math.max(C.r0,Math.min(v0,C.r1-ns));C.v1=C.v0+ns;chartDraw(id)}
function chartDraw(id){const el=document.querySelector(`.chw[data-id="${id}"]`);if(el)el.innerHTML=chartSvg(id)}
function initCharts(){document.querySelectorAll('#stc .chw').forEach(el=>{const id=el.dataset.id,rel=e=>{const b=el.getBoundingClientRect();return Math.max(0,Math.min(1,((e.clientX-b.left)/b.width*320-28)/(320-36)))},P=new Map();let last=0,drag=null;
 el.addEventListener('wheel',e=>{e.preventDefault();chartZoom(id,e.deltaY<0?.8:1.25,rel(e))},{passive:false});
 el.addEventListener('dblclick',()=>{const C=CH[id];C.v0=C.r0;C.v1=C.r1;chartDraw(id)});
 el.addEventListener('pointerdown',e=>{P.set(e.pointerId,e);if(P.size==1)drag={x:e.clientX,v0:CH[id].v0};if(P.size==2){const[a,b]=[...P.values()];last=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}try{el.setPointerCapture(e.pointerId)}catch(_){}});
 el.addEventListener('pointermove',e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,e);const C=CH[id];if(P.size==2){const[a,b]=[...P.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(last&&d)chartZoom(id,last/d,rel({clientX:(a.clientX+b.clientX)/2}));last=d;drag=null}else if(drag){const bw=el.getBoundingClientRect().width,span=C.v1-C.v0,dv=(e.clientX-drag.x)/bw*320/(320-36)*span;let v0=drag.v0-dv;v0=Math.max(C.r0,Math.min(v0,C.r1-span));C.v0=v0;C.v1=v0+span;chartDraw(id)}});
 const up=e=>{P.delete(e.pointerId);last=0;drag=null};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})}
function stats(){const mi=meIdx(),met=spec?S.pl.map((_,i)=>i):[mi,...(S.pl[mi].met||[]).filter(i=>S.pl[i]&&i!=mi)];
 const rl=p=>p.h&&p.h.length?p.h:[[S.round,p.g||0,0,0]],lim=Math.max(...met.map(i=>rl(S.pl[i]).slice(-1)[0][0])),pts=(p,k)=>rl(p).map(x=>[x[0],x[k]]),mk=k=>met.map(i=>({c:N[S.pl[i].ni].c,p:pts(S.pl[i],k)}));
 let t='<table style="width:100%;border-collapse:collapse"><tr><th align="left">Państwo</th><th>🪙</th><th>Zarobione</th><th>Wydane</th><th>Przychód</th></tr>';
 met.forEach(i=>{const p=S.pl[i],hh=rl(p),ls=hh[hh.length-1],g=ls[1],e=ls[3],inc=ls[2];t+=`<tr><td><i class="d" style="background:${N[p.ni].c}"></i> ${esc(p.name)}${i==mi&&!spec?' (Ty)':''}</td><td align="center">${g}</td><td align="center">${e}</td><td align="center">${Math.max(0,10+e-g)}</td><td align="center">${inc>=0?'+':''}${inc}</td></tr>`});
 $('stc').innerHTML=`<h3 style="margin-top:0">Statystyki</h3>${t}</table>${battleStats(met)}<p><b>Złoto</b></p>${chart(mk(1))}<p><b>Zarobione łącznie</b></p>${chart(mk(3))}<p><b>Przychód na turę</b></p>${chart(mk(2))}<p><small>Pełna historia do tury ${lim}. Kółko myszy / szczypanie = przybliżenie wykresu, przeciągnięcie = przesuwanie, dwuklik = reset. Widzisz tu siebie i państwa, z którymi kiedykolwiek graniczyłeś. Kolor linii = kolor państwa.</small></p><p><button class="p" onclick="$('st').style.display='none'">Zamknij</button></p>`;$('st').style.display='block';initCharts()}
function claim(o,q,r,rad,mode,s=S){if(!s.own)return;const a=s.own.split(''),v=String(o+1);for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){if(HD(q,r,x,y)>rad||+s.t[y*s.w+x]<2)continue;const i=y*s.w+x,c=a[i];if(c=='0'||mode==2||(mode==1&&x==q&&y==r&&!s.cities.some(k=>k.o!=o&&HD(k.q,k.r,q,r)<=1)))a[i]=v}s.own=a.join('')}
const terr=i=>S.own?S.own.split('').filter(c=>c==i+1).length:0;
const income=i=>(S.pl[i].ni==2?1:0)+2*S.cities.filter(c=>c.o==i).length+Math.floor(terr(i)/10)+2*(S.hs||[]).filter(k=>S.own[k]==i+1).length+5*(S.hup||[]).filter(k=>S.own[k]==i+1).length-upkeep(i);
function buildTower(){if(!mineTurn()||!sel||sel.k!='t')return;const i=sel.r*S.w+sel.q,p=S.pl[S.turn];if(S.own[i]!=S.turn+1||(S.hs||[]).includes(i)||(S.tw||[]).includes(i))return;if((p.g||0)<25){msg='Za mało złota (25).';return render()}p.g-=25;(S.tw=S.tw||[]).push(i);sfx('build');sel=null;msg='Wieża zbudowana (widok + obrona).';save();render()}
function houseCost(p){return 15+2*(S.hs||[]).filter(i=>+S.own[i]===p+1).length}
function buildHouse(){if(!mineTurn()||!sel||sel.k!='t')return;const i=sel.r*S.w+sel.q,p=S.pl[S.turn];if(!vision(S.turn)[i]){msg='Nie można budować w mgle wojny – najpierw odkryj to pole.';return render()}if(S.own[i]!=S.turn+1||(S.hs||[]).includes(i)||(S.tw||[]).includes(i))return;const hc=houseCost(S.turn);if((p.g||0)<hc){msg='Za mało złota ('+hc+').';return render()}p.g-=hc;(S.hs=S.hs||[]).push(i);sfx('build');sel=null;msg='Domek zbudowany (+2 złota/turę).';save();render()}
function upgradeHouse(){if(!mineTurn()||!sel||sel.k!='t')return;const i=sel.r*S.w+sel.q,p=S.pl[S.turn];if(!(S.hs||[]).includes(i)||!vision(S.turn)[i]||+S.own[i]!==S.turn+1)return;if((S.hup||[]).includes(i))return msg='Ten domek ma już ulepszenie dochodu.',render();if((p.g||0)<100)return msg='Ulepszenie kosztuje 100 złota.',render();p.g-=100;(S.hup=S.hup||[]).push(i);msg='Domek ulepszony: +5 złota na turę!';sfx('build');save();render()}
function buy(k){if(!mineTurn()||!sel||sel.k!='c')return;const c=S.cities[sel.i],p=S.pl[S.turn],cost=unitPrice(S.turn,k);if((p.g||0)<cost){msg='Za mało złota.';return render()}p.g-=cost;(S.q=S.q||[]).push({o:S.turn,k,q:c.q,r:c.r});msg='Jednostka powstanie w ciągu 1 tury (na początku Twojej następnej tury). Uwaga: im większa armia, tym wyższy koszt utrzymania.';sfx('build');save();render()}
function aiCheck(){if(!S||S.over>=0||aiBusy||S.bt||!S.pl[S.turn].ai||!(local||RD.host==myId))return;
  if(spec&&spec.paused&&!spec.step)return;
  aiBusy=true;const t=S.turn,d=spec?(S.round<spec.target?0:spec.speed):800;
  setTimeout(()=>{if(spec&&spec.paused&&!spec.step){aiBusy=false;return}if(spec&&spec.step)spec.step=0;if(S&&S.turn==t&&S.over<0)runAI();else aiBusy=false},d)}
function runAI(){const p=S.turn,own=()=>S.own||'';let stop=false;quiet=true;
 try{
  const V=vision(p),sn=S.pl[p].seen.split('');V.forEach((v,i)=>{if(v)sn[i]='1'});S.pl[p].seen=sn.join('');
  const nbrs=u=>NB(u.r).map(([a,b])=>[u.q+a,u.r+b]).filter(([q,r])=>q>=0&&r>=0&&q<S.w&&r<S.h&&tt(q,r)>=2);
  const ws=()=>S.units.filter(x=>x.o==p&&MIL(x.k)).length,P=S.pl[p];
  if(P.eco!==S.round){P.eco=S.round;
  const hcA=houseCost(p);if((P.g||0)>=hcA&&Math.random()<.8){const ow=[];own().split('').forEach((v,i)=>{if(v==p+1&&+S.t[i]>=2&&!(S.hs||[]).includes(i)&&!S.cities.some(c=>c.r*S.w+c.q==i))ow.push(i)});if(ow.length){(S.hs=S.hs||[]).push(ow[rnd(ow.length)]);P.g-=hcA}}
  {const uc=S.cities.find(c=>c.o==p&&(c.lv||1)<3);if(uc){const cst=CITY_UP[(uc.lv||1)+1];if((P.g||0)>=cst+20&&Math.random()<.35){P.g-=cst;uc.lv=(uc.lv||1)+1}}}
  if((P.g||0)>=100){const hi=(S.hs||[]).find(i=>+S.own[i]===p+1&&!(S.hup||[]).includes(i));if(hi!=null){(S.hup=S.hup||[]).push(hi);P.g-=100}}
  S.cities.filter(c=>c.o==p).forEach(c=>{const ns=S.units.filter(x=>x.o==p&&x.k=='S').length,nc=S.cities.filter(x=>x.o==p).length;c.b=(ns<1&&nc<6)?'S':(ws()>=2&&Math.random()<.4?'A':'W');
   const cost=unitPrice(p,c.b);if((P.g||0)>=cost&&(c.b=='S'||milCount(p)<14)){P.g-=cost;(S.q=S.q||[]).push({o:p,k:c.b,q:c.q,r:c.r})}});}
  const foes=[...S.cities.filter(c=>c.o!=p&&sn[c.r*S.w+c.q]=='1').map(c=>[c.q,c.r]),...S.units.filter(u=>u.o!=p&&V[u.r*S.w+u.q]).map(u=>[u.q,u.r])];
  S.units.filter(u=>u.o==p).forEach(u=>{
   if(stop)return;
   for(let k=0;k<3&&!stop&&u.mp>0&&S.units.includes(u);k++){
    const c=nbrs(u);if(!c.length)break;let best;
    if(u.k=='S'){
     const dc=Math.min(9,...S.cities.map(x=>HD(x.q,x.r,u.q,u.r)));
     if(dc>=3&&tt(u.q,u.r)!=4){S.cities.push({o:p,q:u.q,r:u.r,b:'W',p:0,nm:pickCityName(),lv:1});claim(p,u.q,u.r,1,2);S.units=S.units.filter(x=>x.id!=u.id);break}
     const free=c.filter(([q,r])=>!S.units.some(x=>x.o!=p&&x.q==q&&x.r==r));if(!free.length)break;
     best=free.map(x=>[x,Math.min(4,...S.cities.map(y=>HD(y.q,y.r,x[0],x[1])))*2+(own()[x[1]*S.w+x[0]]=='0'?1:0)+Math.random()*2]).sort((a,b)=>b[1]-a[1])[0][0];
    }else if(MIL(u.k)){
     const A=S.units.filter(x=>x.o==p&&MIL(x.k)),n=A.length,need=Math.min(6,Math.max(3,Math.ceil(n*.6)));
     const free=c.filter(([q,r])=>!S.units.some(x=>x.o!=p&&x.q==q&&x.r==r));
     if(foes.length&&n>=4){
      const tg=foes.reduce((a,b)=>HD(u.q,u.r,a[0],a[1])<=HD(u.q,u.r,b[0],b[1])?a:b);
      const L=A.reduce((a,b)=>HD(a.q,a.r,tg[0],tg[1])<=HD(b.q,b.r,tg[0],tg[1])?a:b);
      const cl=A.filter(x=>x.mp>0&&HD(x.q,x.r,u.q,u.r)<=1).length;
      const toT=c.slice().sort((a,b)=>HD(a[0],a[1],tg[0],tg[1])-HD(b[0],b[1],tg[0],tg[1]))[0];
      const fu=S.units.filter(x=>x.q==toT[0]&&x.r==toT[1]&&x.o!=p);
      if(fu.length){
       const grp=A.filter(x=>x.mp>0&&adj(x,toT[0],toT[1]));
       if(grp.length>=need||grp.length>=n){
        if(!S.pl[fu[0].o].ai){startAIBattle(grp.slice(0,10),fu,toT[0],toT[1]);stop=true;break}
        _mvB=new Set(grp.map(x=>x.id));try{grp.forEach(g=>{if(S.units.includes(g)&&g.mp>0)moveU(g,toT[0],toT[1])})}finally{_mvB=new Set()}
       }
       break;
      }
      if(u!==L&&HD(u.q,u.r,L.q,L.r)>1){if(!free.length)break;best=free.slice().sort((a,b)=>HD(a[0],a[1],L.q,L.r)-HD(b[0],b[1],L.q,L.r))[0]}
      else if(cl>=need)best=toT;
      else break;
     }else{
      if(!free.length)break;
      const dc=Math.min(99,...S.cities.filter(x=>x.o==p).map(x=>HD(x.q,x.r,u.q,u.r)));
      if(foes.length&&dc<=2)break;
      best=free.map(x=>[x,(own()[x[1]*S.w+x[0]]!=String(p+1)?2:0)+Math.random()*2]).sort((a,b)=>b[1]-a[1])[0][0];
     }
    }else{
     const free=c.filter(([q,r])=>!S.units.some(x=>x.o!=p&&x.q==q&&x.r==r));if(!free.length)break;
     best=free.map(x=>[x,(own()[x[1]*S.w+x[0]]!=String(p+1)?2:0)+Math.random()*2]).sort((a,b)=>b[1]-a[1])[0][0];
    }
    moveU(u,best[0],best[1]);
   }});
 }catch(e){}
 finally{quiet=false;aiBusy=false}
 if(stop){msg='';save();render();return}
 chk();msg='';sel=null;doEnd();
}
function endTurn(){if(S.bt||typeof FZ!=='undefined'&&FZ&&FZ.battle)return;if(mineTurn())doEnd()}
function doEnd(){const m=S.turn,p=S.pl[m];
    S.cities.filter(c=>c.o==m).forEach(c=>{});
  let n=m;do{n++;if(n>=S.pl.length){n=0;S.round++}}while(!S.pl[n].alive);
  S.turn=n;S.units.forEach(u=>{if(u.o==n)u.mp=mx(S,n)+(u.k=='C'?2:0)});(S.q||[]).filter(x=>x.o==n&&S.cities.some(c=>c.q==x.q&&c.r==x.r&&c.o==n)).forEach(x=>add(S,n,x.k,x.q,x.r));S.q=(S.q||[]).filter(x=>x.o!=n);sel=null;msg='';{const pn=S.pl[n],inc=income(n);let ng=(pn.g||0)+inc;if(ng<0){ng=0;const ml=S.units.filter(u=>u.o==n&&MIL(u.k));if(ml.length>1){const d=ml[ml.length-1];S.units=S.units.filter(x=>x!==d);pn.dr=S.round}}pn.g=ng;pn.e=(pn.e||0)+Math.max(0,inc);(pn.h=pn.h||[]).push([S.round,pn.g,inc,pn.e])}hold=false;holdFor=null;save();render()}
function tap(q,r){const mi=meIdx(),own=S.units.filter(u=>u.o==mi&&u.q==q&&u.r==r),su=sel&&sel.k=='u'?S.units.find(u=>u.id==sel.id):null;
  if(su&&mineTurn()&&su.mp>0&&!(su.q==q&&su.r==r)&&adj(su,q,r)){let gl=grpMode?S.units.filter(x=>x.o==su.o&&x.q==su.q&&x.r==su.r&&x.mp>0):[su];if(grpMode&&grpN>0)gl=[su,...gl.filter(x=>x!==su)].slice(0,grpN);{const en=S.units.filter(x=>x.q==q&&x.r==r&&x.o!=su.o),atk=gl.filter(x=>S.units.includes(x)&&x.mp>0&&MIL(x.k));if(en.length&&tt(q,r)>=2&&atk.length&&S.pl[mi].seen[r*S.w+q]=='1'&&typeof beginBattle==='function'&&!S.bt&&!(typeof FZ!=='undefined'&&FZ)){beginBattle(atk,en,q,r);return}}_mvB=new Set(gl.map(x=>x.id));try{gl.forEach(x=>{if(S.units.includes(x)&&x.mp>0)moveU(x,q,r)})}finally{_mvB=new Set()}return}
  const ci=S.cities.findIndex(c=>c.o==mi&&c.q==q&&c.r==r);msg='';
  if(own.length){sfx('select');const i=su?own.findIndex(u=>u.id==su.id):-1;
    if(i>=0&&own.length==1&&ci>=0)sel={k:'c',i:ci};else sel={k:'u',id:own[(i+1)%own.length].id}}
  else if(ci>=0)sel={k:'c',i:ci};else sel=(S.own&&S.own[r*S.w+q]==mi+1&&tt(q,r)>=2&&!(S.tw||[]).includes(r*S.w+q))?{k:'t',q,r}:null;
  render()}

/* ---------- rysowanie ---------- */
const cv=$('cv');let cx=cv.getContext('2d');
function hex(x,y,r){cx.beginPath();for(let k=0;k<6;k++){const a=Math.PI/180*(60*k-30);cx[k?'lineTo':'moveTo'](x+r*Math.cos(a),y+r*Math.sin(a))}cx.closePath()}
function seeded(x,y){const v=Math.sin(x*127.1+y*311.7+S.w*17)*43758.5453;return v-Math.floor(v)}
function terrainArt(type,x,y,q,r){
  const n=seeded(q,r),shade=c=>c;
  if(type===0||type===1){
    cx.strokeStyle=type===0?'rgba(167,222,239,.34)':'rgba(213,241,248,.34)';cx.lineWidth=1.15;
    for(let j=-1;j<=1;j++){cx.beginPath();cx.moveTo(x-11,y+j*7+Math.sin(n*9+j)*2);cx.quadraticCurveTo(x,y+j*7-3,x+11,y+j*7+Math.sin(n*8+j)*2);cx.stroke()}
    cx.fillStyle='rgba(224,246,255,.55)';cx.beginPath();cx.arc(x-7+(n*10),y-5,1.1,0,7);cx.fill();
  }else if(type===2){
    cx.strokeStyle='rgba(150,102,45,.38)';cx.lineWidth=1;for(let j=0;j<3;j++){cx.beginPath();cx.moveTo(x-12+j*2,y+4+j*3);cx.quadraticCurveTo(x-2,y-1+j*3,x+12-j*2,y+2+j*3);cx.stroke()}
    cx.fillStyle='rgba(255,238,177,.6)';cx.beginPath();cx.arc(x-8,y-7,1.5,0,7);cx.fill();
  }else if(type===3){
    for(let j=0;j<3;j++){const tx=x+(j-1)*8+(n-.5)*3,ty=y+(j%2?3:-3);cx.fillStyle=j%2?'#245b39':'#347849';cx.beginPath();cx.moveTo(tx,ty-8);cx.lineTo(tx-5,ty+3);cx.lineTo(tx+5,ty+3);cx.closePath();cx.fill();cx.fillStyle='#6b5737';cx.fillRect(tx-1,ty+2,2,4)}
  }else if(type===4){
    // Warstwowe, ośnieżone szczyty górskie
    cx.fillStyle='#626f78';cx.beginPath();cx.moveTo(x-14,y+8);cx.lineTo(x-5,y-11);cx.lineTo(x+1,y-1);cx.lineTo(x+8,y-14);cx.lineTo(x+16,y+8);cx.closePath();cx.fill();
    cx.fillStyle='#aab8bf';cx.beginPath();cx.moveTo(x-5,y-11);cx.lineTo(x-1,y-3);cx.lineTo(x-7,y-1);cx.closePath();cx.fill();
    cx.beginPath();cx.moveTo(x+8,y-14);cx.lineTo(x+12,y-5);cx.lineTo(x+5,y-4);cx.closePath();cx.fill();
    cx.strokeStyle='rgba(35,47,56,.5)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x-14,y+8);cx.lineTo(x-5,y-11);cx.lineTo(x+1,y-1);cx.lineTo(x+8,y-14);cx.lineTo(x+16,y+8);cx.stroke();
  }else{
    cx.strokeStyle='rgba(224,255,177,.23)';cx.lineWidth=1;cx.beginPath();cx.arc(x+4,y-4,5,2.8,5.6);cx.stroke();
    cx.fillStyle='rgba(233,255,199,.45)';cx.beginPath();cx.arc(x-9,y+6,1.4,0,7);cx.fill();
  }
}
function drawUnit(u,x,y,col,selected,ni=0){
  const glow=cx.createRadialGradient(x,y,2,x,y,17);glow.addColorStop(0,col+'88');glow.addColorStop(1,col+'00');cx.fillStyle=glow;cx.beginPath();cx.arc(x,y,17,0,7);cx.fill();
  cx.save();cx.translate(x,y);
  if(u.k==='S'){if(selected){cx.strokeStyle='#fff';cx.lineWidth=1.8;cx.beginPath();cx.ellipse(0,5,24,16,0,0,7);cx.stroke()}if(drawSettlerSprite(ni)){cx.restore();return}}
  // miękki cień i podstawa
  cx.fillStyle='rgba(0,0,0,.38)';cx.beginPath();cx.ellipse(1,8,9,4,0,0,7);cx.fill();
  cx.fillStyle=col;cx.strokeStyle=selected?'#fff':'rgba(8,15,24,.95)';cx.lineWidth=selected?2.3:1.6;
  if(u.k==='W'){
    // wojownik: tarcza, tułów, hełm i włócznia
    cx.fillStyle='#b78a4e';cx.beginPath();cx.ellipse(-5,2,4,6,-.2,0,7);cx.fill();cx.stroke();
    cx.fillStyle=col;cx.beginPath();cx.moveTo(-3,-2);cx.lineTo(4,-2);cx.lineTo(6,6);cx.lineTo(-4,6);cx.closePath();cx.fill();cx.stroke();
    cx.fillStyle='#d8c49a';cx.beginPath();cx.arc(1,-6,4.2,0,7);cx.fill();cx.stroke();
    cx.fillStyle='#e4e9ed';cx.beginPath();cx.moveTo(-4,-8);cx.lineTo(1,-13);cx.lineTo(5,-8);cx.closePath();cx.fill();cx.stroke();
    cx.strokeStyle='#e7d7ad';cx.lineWidth=1.8;cx.beginPath();cx.moveTo(7,-11);cx.lineTo(8,7);cx.stroke();
    // Charakterystyczny rynsztunek wojowników każdej cywilizacji.
    cx.save();cx.lineWidth=1.5;cx.strokeStyle='#241d18';cx.fillStyle='#f2d59a';
    if(ni===0){ // Polanie: skrzydło i czerwony płaszcz
      cx.fillStyle='#f0e7d4';cx.beginPath();cx.moveTo(-2,-9);cx.quadraticCurveTo(-13,-19,-8,-3);cx.quadraticCurveTo(-3,-5,-2,-9);cx.fill();cx.stroke();
      cx.fillStyle='#b83e37';cx.beginPath();cx.moveTo(3,0);cx.lineTo(10,4);cx.lineTo(5,9);cx.lineTo(1,5);cx.fill();
    }else if(ni===1){ // Wikingowie: rogate hełmy
      cx.strokeStyle='#e6dfc9';cx.lineWidth=2.4;cx.beginPath();cx.moveTo(-2,-9);cx.quadraticCurveTo(-12,-18,-10,-12);cx.moveTo(3,-9);cx.quadraticCurveTo(13,-18,11,-12);cx.stroke();
      cx.fillStyle='#4c7fc4';cx.fillRect(-3,1,7,3);
    }else if(ni===2){ // Rzymianie: czerwony grzebień i segmentowana zbroja
      cx.fillStyle='#b73b35';cx.beginPath();cx.moveTo(-3,-10);cx.quadraticCurveTo(0,-20,4,-10);cx.fill();cx.stroke();
      cx.strokeStyle='#e4c58c';cx.beginPath();cx.moveTo(-3,1);cx.lineTo(5,1);cx.moveTo(-3,4);cx.lineTo(5,4);cx.stroke();
    }else if(ni===3){ // Mongołowie: futrzana czapa i łuk
      cx.fillStyle='#9a6939';cx.beginPath();cx.ellipse(1,-9,6,3,0,0,7);cx.fill();cx.stroke();
      cx.strokeStyle='#e4c58c';cx.beginPath();cx.arc(9,-1,7,-1.2,1.2);cx.stroke();
    }else if(ni===4){ // Egipcjanie: nemes i złoty kołnierz
      cx.fillStyle='#d7b64f';cx.beginPath();cx.moveTo(-5,-8);cx.lineTo(-7,1);cx.lineTo(-2,-1);cx.lineTo(1,-9);cx.lineTo(6,1);cx.lineTo(5,-8);cx.fill();cx.stroke();
      cx.strokeStyle='#f4d36c';cx.lineWidth=2.5;cx.beginPath();cx.arc(0,2,6,.15,2.9);cx.stroke();
    }else{ // Inkowie: słoneczny diadem i barwna tunika
      cx.fillStyle='#e7b83e';cx.beginPath();cx.arc(1,-9,6,Math.PI,0);cx.fill();cx.stroke();
      cx.strokeStyle='#e7b83e';cx.beginPath();cx.moveTo(-5,0);cx.lineTo(6,0);cx.moveTo(-4,3);cx.lineTo(5,3);cx.stroke();
    }
    cx.restore();
  }else if(u.k==='S'){
    cx.fillStyle=col;cx.beginPath();cx.ellipse(0,2,5,7,0,0,7);cx.fill();cx.stroke();
    cx.fillStyle='#d9b88a';cx.beginPath();cx.arc(0,-7,3.7,0,7);cx.fill();cx.stroke();
    cx.fillStyle='#8a633b';cx.fillRect(-4,-2,8,6);cx.strokeRect(-4,-2,8,6);
    cx.strokeStyle='#d9d3b8';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(7,-7);cx.lineTo(7,7);cx.stroke();
  }else{
    // zwiadowca z kapturem i lekkim wierzchowcem
    cx.fillStyle='#8a6747';cx.beginPath();cx.ellipse(0,4,9,4,0,0,7);cx.fill();cx.stroke();
    cx.fillStyle=col;cx.beginPath();cx.arc(0,-5,5,0,7);cx.fill();cx.stroke();
    cx.fillStyle='#e0c49b';cx.beginPath();cx.arc(1,-5,2,0,7);cx.fill();
    cx.strokeStyle='#e8d7ad';cx.lineWidth=1.3;cx.beginPath();cx.moveTo(-5,7);cx.lineTo(-6,10);cx.moveTo(5,7);cx.lineTo(6,10);cx.stroke();
  }
  cx.restore();
}

function mini(x,y,col,k){
  cx.save();cx.translate(x,y);
  cx.fillStyle='rgba(0,0,0,.28)';cx.beginPath();cx.ellipse(0,3.3,2.6,.9,0,0,7);cx.fill();
  cx.strokeStyle='rgba(8,15,24,.85)';cx.lineWidth=.55;
  cx.fillStyle=col;cx.beginPath();cx.moveTo(-1.8,-2.2);cx.lineTo(1.8,-2.2);cx.lineTo(2.3,3);cx.lineTo(-2.3,3);cx.closePath();cx.fill();cx.stroke();
  cx.fillStyle='#d8c49a';cx.beginPath();cx.arc(0,-3.7,1.6,0,7);cx.fill();cx.stroke();
  if(k==='A'){
    cx.fillStyle='#4f6b3d';cx.beginPath();cx.arc(0,-3.9,1.75,Math.PI,0);cx.fill();
    cx.strokeStyle='#e0cb94';cx.lineWidth=.9;cx.beginPath();cx.arc(-.6,-.6,3.7,-1.15,1.15);cx.stroke();
    cx.strokeStyle='rgba(255,255,255,.75)';cx.lineWidth=.4;cx.beginPath();cx.moveTo(-.6+3.7*Math.cos(-1.15),-.6+3.7*Math.sin(-1.15));cx.lineTo(-.6+3.7*Math.cos(1.15),-.6+3.7*Math.sin(1.15));cx.stroke();
  }else{
    cx.fillStyle='#e4e9ed';cx.beginPath();cx.arc(0,-4,1.75,Math.PI,0);cx.fill();
    cx.fillStyle='#b78a4e';cx.beginPath();cx.ellipse(-2.7,.6,1.3,2,0,0,7);cx.fill();cx.stroke();
    cx.strokeStyle='#e7d7ad';cx.lineWidth=.8;cx.beginPath();cx.moveTo(2.9,-7.5);cx.lineTo(2.9,3.6);cx.stroke();
    cx.fillStyle='#f2f5f7';cx.beginPath();cx.moveTo(2.9,-9);cx.lineTo(3.8,-6.8);cx.lineTo(2,-6.8);cx.closePath();cx.fill();
  }
  cx.restore()}
// Ilustracje oddziałów Wikingów i Mongołów są osadzone w pliku HTML.
const CIV_SPRITES = {
  0: new Image(), // Polanie
  1: new Image(), // Wikingowie
  2: new Image(), // Rzymianie
  3: new Image(), // Mongołowie
  4: new Image(), // Egipcjanie
  5: new Image()  // Inkowie
};
CIV_SPRITES[1].src = 'media/5d0cb44e1c.webp';
CIV_SPRITES[3].src = 'media/ebff51d8b9.webp';
CIV_SPRITES[0].src = 'media/e3cfbf8c59.webp';
CIV_SPRITES[2].src = 'media/8419b27758.webp';
CIV_SPRITES[4].src = 'media/f90bea1506.webp';
CIV_SPRITES[5].src = 'media/eb412385ae.webp';
Object.values(CIV_SPRITES).forEach(img => img.onload = () => {
  if (S && typeof draw === 'function') requestAnimationFrame(() => { if (S) draw(vision(meIdx())); });
});
// Ilustracje osadników każdej cywilizacji (przycięte, jednakowa wysokość)
// Grafiki ŁUCZNIKÓW (jednostka 'A') – osobne od wojowników
const CIV_ARCHERS = {0:new Image(),1:new Image(),2:new Image(),3:new Image(),4:new Image(),5:new Image()};
CIV_ARCHERS[0].src = 'media/0b72c6ef19.webp'; // Polanie
CIV_ARCHERS[1].src = 'media/ee6cebae85.webp'; // Wikingowie
CIV_ARCHERS[2].src = 'media/02bd1e53b4.webp'; // Rzymianie
CIV_ARCHERS[3].src = 'media/28d64002a0.webp'; // Mongołowie
CIV_ARCHERS[4].src = 'media/170fd6fd8a.webp'; // Egipcjanie
CIV_ARCHERS[5].src = 'media/8482ca1352.webp'; // Inkowie
Object.values(CIV_ARCHERS).forEach(img => img.onload = () => {
  if (S && typeof draw === 'function') requestAnimationFrame(() => { if (S) draw(vision(meIdx())); });
});
const CIV_SETTLERS = {0:new Image(),1:new Image(),2:new Image(),3:new Image(),4:new Image(),5:new Image()};
CIV_SETTLERS[0].src = 'media/5213b95b4d.webp'; // Polanie
CIV_SETTLERS[1].src = 'media/3e4446a5d1.webp'; // Wikingowie
CIV_SETTLERS[2].src = 'media/f74de4345b.webp'; // Rzymianie
CIV_SETTLERS[3].src = 'media/b31643cdca.webp'; // Mongołowie
CIV_SETTLERS[4].src = 'media/5f34efc7e4.webp'; // Egipcjanie
CIV_SETTLERS[5].src = 'media/340a890ea4.webp'; // Inkowie
Object.values(CIV_SETTLERS).forEach(img => img.onload = () => {
  if (S && typeof draw === 'function') requestAnimationFrame(() => { if (S) draw(vision(meIdx())); });
});
function drawSettlerSprite(ni){
  const sp=CIV_SETTLERS[ni];
  if(!(sp&&sp.complete&&sp.naturalWidth))return false;
  // Każdy osadnik ma tę samą wysokość; szerokość wynika z proporcji grafiki.
  const h=FZ?17:24,w=sp.naturalWidth*h/sp.naturalHeight;
  cx.drawImage(sp,-w/2,5-h,w,h);
  return true;
}
// Jedna jednostka bojowa = oddział ~100 żołnierzy (do 12 figurek; w bitwie ubywa ich wraz z HP)
function drawArmy(k,x,y,col,selected,frac,nf,ni=0){
  const n=Math.max(1,Math.min(12,nf||Math.ceil(12*(frac==null?1:frac))));
  const glow=cx.createRadialGradient(x,y,2,x,y,22);glow.addColorStop(0,col+'66');glow.addColorStop(1,col+'00');cx.fillStyle=glow;cx.beginPath();cx.arc(x,y,22,0,7);cx.fill();
  if(selected){cx.strokeStyle='#fff';cx.lineWidth=1.8;cx.beginPath();cx.ellipse(x,y+5,24,16,0,0,7);cx.stroke()}
  const ar=(k=='A'&&typeof CIV_ARCHERS!=='undefined')?CIV_ARCHERS[ni]:null,sprite=(ar&&ar.complete&&ar.naturalWidth)?ar:(MIL(k)?CIV_SPRITES[ni]:null);
  if(sprite&&sprite.complete&&sprite.naturalWidth){
    // Wspólne pole obrazu dla każdej nacji: zachowuje proporcje i ogranicza rozmiar.
    // W widoku bitwy/zbliżenia grafiki są dodatkowo mniejsze, by mieściły się w heksie.
    const maxW=FZ?28:38, maxH=FZ?18:24;
    const fit=Math.min(maxW/sprite.naturalWidth,maxH/sprite.naturalHeight);
    const w=sprite.naturalWidth*fit,h=sprite.naturalHeight*fit;
    cx.drawImage(sprite,x-w/2,y-h+5,w,h);
  }else{
    const rows=Math.ceil(n/4),pts=[];
    for(let r=0;r<rows;r++){const c=Math.floor(n/rows)+(r<n%rows?1:0);for(let i=0;i<c;i++)pts.push([(i-(c-1)/2)*5.6+(r%2?1.2:0),(r-(rows-1)/2)*5.2+1])}
    pts.forEach(p=>mini(x+p[0],y+p[1],col,k));
  }
}
function drawAny(u,x,y,col,sel,frac,niOverride=null){if(MIL(u.k)){const ni=niOverride==null?(S.pl[u.o]?.ni||0):niOverride;drawArmy(u.k,x,y,col,sel,frac,undefined,ni)}else drawUnit(u,x,y,col,sel,niOverride==null?(S.pl[u.o]?.ni||0):niOverride)}
let boardW=0,boardH=0,panMX=0,panMY=0,panInit=false;
function layoutPan(){const w=$('wrap'),p=$('pan');if(!p||!boardW||!w.clientWidth)return;
  const mx=Math.round(w.clientWidth*.8),my=Math.round(w.clientHeight*.8);
  p.style.width=(boardW*zoom+2*mx)+'px';p.style.height=(boardH*zoom+2*my)+'px';cv.style.left=mx+'px';cv.style.top=my+'px';
  if(panInit&&(mx!==panMX||my!==panMY)){w.scrollLeft+=mx-panMX;w.scrollTop+=my-panMY}
  panMX=mx;panMY=my;if(!panInit){panInit=true;centerMine()}}
function centerMine(){if(!S||!S.pl)return;const w=$('wrap'),mi=meIdx(),c=S.cities.find(c=>c.o==mi)||S.units.find(u=>u.o==mi);if(!c)return;
  const cs=getComputedStyle(w),[x,y]=C(c.q,c.r);w.scrollLeft=(parseFloat(cs.paddingLeft)||0)+panMX+x*zoom-w.clientWidth/2;w.scrollTop=(parseFloat(cs.paddingTop)||0)+panMY+y*zoom-w.clientHeight/2}
function applyZoom(){if(!boardW)return;cv.style.width=(boardW*zoom)+'px';cv.style.height=(boardH*zoom)+'px';layoutPan()}
window.addEventListener('resize',()=>{if(S&&S.pl&&$('game').style.display!=='none')layoutPan()});
$('wrap').addEventListener('wheel',e=>{
  if(!$('game')||$('game').style.display==='none')return;e.preventDefault();
  const wrap=$('wrap'),rect=wrap.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top,old=zoom,next=Math.max(.55,Math.min(2.8,old*(e.deltaY<0?1.12:1/1.12)));
  if(Math.abs(next-old)<.0001)return;
  const cb=cv.getBoundingClientRect(),mapX=(e.clientX-cb.left)/old,mapY=(e.clientY-cb.top)/old,cL=cb.left-rect.left+wrap.scrollLeft,cT=cb.top-rect.top+wrap.scrollTop;
  zoom=next;if(S)draw(vision(meIdx()));else applyZoom();
  wrap.scrollLeft=cL+mapX*next-px;wrap.scrollTop=cT+mapY*next-py;
  const z=$('zoomval');if(z)z.textContent=Math.round(zoom*100)+'%';
},{passive:false});
function draw(V){
  ensureRivers();
  const mi=meIdx(),seen=spec?new Array(S.w*S.h).fill('1'):S.pl[mi].seen.split('');
  boardW=W*(S.w+.5)+10;boardH=R*1.5*S.h+R*.5+10;
  const pixelRatio=Math.min(3,Math.max(1,window.devicePixelRatio||1))*zoom;
  cv.width=Math.round(boardW*pixelRatio);cv.height=Math.round(boardH*pixelRatio);
  cv.style.width=(boardW*zoom)+'px';cv.style.height=(boardH*zoom)+'px';
  layoutPan();cx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
  cx.font='bold 12px system-ui';cx.textAlign='center';cx.textBaseline='middle';
  for(let r=0;r<S.h;r++)for(let q=0;q<S.w;q++){
    const i=r*S.w+q,[x,y]=C(q,r);if(seen[i]!='1')continue;
    hex(x,y,R-.5);
    const ty=tt(q,r);cx.fillStyle=TC[ty];cx.fill();cx.save();cx.globalAlpha=.34;cx.fillStyle=ty===0?'#153d64':ty===1?'#82c9df':ty===2?'#f3d68b':ty===3?'#153e2c':ty===4?'#c0cbd0':'#b5d88b';hex(x,y,R-.5);cx.fill();cx.restore();terrainArt(ty,x,y,q,r);const ow=S.own?+S.own[i]:0;if(ow){const oc=N[S.pl[ow-1].ni].c;cx.globalAlpha=.28;cx.fillStyle=oc;hex(x,y,R-.5);cx.fill();cx.globalAlpha=1}
    if(!V[i]){cx.fillStyle='rgba(0,0,0,.55)';hex(x,y,R-.5);cx.fill()}
  }
  if(S.own){const DR=r=>r&1?[[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]]:[[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]];
   cx.lineWidth=3.5;cx.lineCap='round';
   for(let r=0;r<S.h;r++)for(let q=0;q<S.w;q++){const i=r*S.w+q,ow=+S.own[i];if(!ow||seen[i]!='1')continue;const[x,y]=C(q,r);
    DR(r).forEach(([a,b],k)=>{const nq=q+a,nr=r+b,no=nq>=0&&nr>=0&&nq<S.w&&nr<S.h?+S.own[nr*S.w+nq]:0;if(no==ow)return;
     const a1=Math.PI/180*(60*k-30),a2=a1+Math.PI/3,rr=R-1.5;cx.beginPath();cx.moveTo(x+rr*Math.cos(a1),y+rr*Math.sin(a1));cx.lineTo(x+rr*Math.cos(a2),y+rr*Math.sin(a2));cx.strokeStyle=N[S.pl[ow-1].ni].c;cx.stroke()})}
   cx.lineCap='butt'}
  if(sel&&sel.k=='t'){const[tx,ty]=C(sel.q,sel.r);hex(tx,ty,R-1);cx.strokeStyle='#fff';cx.lineWidth=3;cx.stroke()}
  const su=sel&&sel.k=='u'&&mineTurn()?S.units.find(x=>x.id==sel.id):null;
  if(su){const[sx,sy]=C(su.q,su.r);hex(sx,sy,R-1);cx.strokeStyle='#fff';cx.lineWidth=3;cx.stroke();
   if(su.mp>0)NB(su.r).forEach(([a,b])=>{const q=su.q+a,r=su.r+b;if(q<0||r<0||q>=S.w||r>=S.h||tt(q,r)<2)return;
    const foe=S.units.some(x=>x.o!=mi&&x.q==q&&x.r==r)||S.cities.some(c=>c.o!=mi&&c.q==q&&c.r==r);if(su.k!='W'&&foe)return;
    const[x,y]=C(q,r),col=foe?'#e74c3c':'#ffffff';hex(x,y,R-2);cx.globalAlpha=foe?.4:.3;cx.fillStyle=col;cx.fill();cx.globalAlpha=1;
    cx.setLineDash([5,3]);cx.strokeStyle=col;cx.lineWidth=2.5;cx.stroke();cx.setLineDash([]);
    if(!foe){cx.beginPath();cx.arc(x,y+8,3,0,7);cx.fillStyle='#fff';cx.fill()}})}
  {const d=rvData();if(d.segs.length){const vis=[],dim=[],id=(x,y)=>[x,y];d.segs.forEach(s=>{const sn=(s.ia>=0&&seen[s.ia]=='1')||(s.ib>=0&&seen[s.ib]=='1');if(!sn)return;((s.ia>=0&&V[s.ia])||(s.ib>=0&&V[s.ib])?vis:dim).push(s)});riverStroke(cx,dim,id,1,.5);riverStroke(cx,vis,id,1,1)}}
  // Domki: ciepłe drewniane ściany, kamienna podmurówka i wyraźny dach.
  (S.hs||[]).forEach(i=>{if(!V[i])return;const[x,y]=C(i%S.w,Math.floor(i/S.w)),ow=+S.own[i],col=ow?N[S.pl[ow-1].ni].c:'#9b9b9b';cx.save();cx.translate(x,y);cx.fillStyle='#0007';cx.beginPath();cx.ellipse(0,8,11,4,0,0,7);cx.fill();cx.fillStyle='#b9a17a';cx.fillRect(-8,0,16,8);cx.fillStyle='#d7b77e';cx.fillRect(-7,-6,14,9);cx.fillStyle='#70462f';cx.beginPath();cx.moveTo(-11,-5);cx.lineTo(0,-15);cx.lineTo(11,-5);cx.closePath();cx.fill();cx.strokeStyle='#33251d';cx.lineWidth=1.4;cx.stroke();cx.fillStyle='#4b3024';cx.fillRect(-2,0,4,7);cx.fillStyle='#f7d88a';cx.fillRect(4,-4,3,3);cx.fillStyle=col;cx.fillRect(-7,6,14,2);cx.restore()});
  (S.tw||[]).forEach(i=>{if(!V[i])return;const[x,y]=C(i%S.w,Math.floor(i/S.w)),ow=+S.own[i],col=ow?N[S.pl[ow-1].ni].c:'#888';cx.save();cx.translate(x,y);cx.fillStyle='#0007';cx.beginPath();cx.ellipse(0,8,8,3,0,0,7);cx.fill();cx.fillStyle='#9b9589';cx.fillRect(-5,-9,10,17);cx.fillStyle=col;cx.fillRect(-5,-11,10,5);cx.fillStyle='#c7bda9';cx.fillRect(-7,-14,14,4);cx.strokeStyle='#292a2c';cx.lineWidth=1.4;cx.strokeRect(-5,-9,10,17);cx.restore()});
  // Główne miasta: cytadela z murami, basztami, bramą i chorągwią.
  S.cities.forEach((c,ci)=>{if(!V[c.r*S.w+c.q])return;const[x,y]=C(c.q,c.r),col=N[S.pl[c.o].ni].c;cx.save();cx.translate(x,y);cx.fillStyle='#0008';cx.beginPath();cx.ellipse(0,9,15,5,0,0,7);cx.fill();cx.fillStyle='#8e969a';cx.fillRect(-13,-3,26,12);cx.fillStyle='#c5c5b9';cx.fillRect(-12,-8,24,8);cx.fillStyle='#777f86';cx.fillRect(-10,-12,7,8);cx.fillRect(3,-12,7,8);cx.fillStyle='#d9d5c7';cx.fillRect(-8,-10,3,6);cx.fillRect(5,-10,3,6);cx.fillStyle=col;cx.fillRect(-3,-14,6,17);cx.fillStyle='#ead9b5';cx.fillRect(-2,-13,4,10);cx.fillStyle='#5b4330';cx.fillRect(-3,2,6,7);cx.fillStyle=col;cx.beginPath();cx.moveTo(0,-16);cx.lineTo(10,-13);cx.lineTo(0,-10);cx.closePath();cx.fill();cx.strokeStyle=sel&&sel.k=='c'&&sel.i==ci?'#fff':'#26303a';cx.lineWidth=2.2;cx.strokeRect(-13,-8,26,17);if(c.nm){const lv=c.lv||1,t=c.nm+(lv>1?' '+'★'.repeat(lv-1):'');cx.font='bold 9px system-ui';cx.textAlign='center';cx.lineWidth=2.6;cx.strokeStyle='rgba(8,15,24,.92)';cx.fillStyle='#f6e9c6';cx.strokeText(t,0,17);cx.fillText(t,0,17)}cx.restore()});
  // Duża strzałka nad wojownikiem jasno pokazuje gotowość do ataku.
  S.units.forEach(u=>{
    const idx=u.r*S.w+u.q;
    if(!V[idx])return;
    const canAttack=MIL(u.k)&&u.mp>0&&NB(u.r).some(([a,b])=>{
      const q=u.q+a,r=u.r+b;
      if(q<0||r<0||q>=S.w||r>=S.h||tt(q,r)<2)return false;
      const i=r*S.w+q;
      return (S.pl[mi].seen[i]==='1'||V[i])&&
        (S.units.some(e=>e.o!==u.o&&e.q===q&&e.r===r)||
         S.cities.some(c=>c.o!==u.o&&c.q===q&&c.r===r));
    });
    if(canAttack){
      const [ax,ay]=unitPos(u);
      cx.save();cx.translate(ax,ay-20);cx.scale(.5,.5);
      cx.shadowColor='#ff2f24';cx.shadowBlur=6;
      cx.fillStyle='#ff382e';cx.strokeStyle='#fff0df';cx.lineWidth=1.7;
      cx.beginPath();cx.moveTo(0,-17);cx.lineTo(11,-4);cx.lineTo(5,-4);
      cx.lineTo(5,8);cx.lineTo(-5,8);cx.lineTo(-5,-4);cx.lineTo(-11,-4);
      cx.closePath();cx.fill();cx.stroke();cx.restore();
    }
  });
  const gr={};S.units.forEach(u=>{const k=u.r*S.w+u.q;if(V[k])(gr[k]=gr[k]||[]).push(u)});
  Object.values(gr).forEach(g=>{
    const items=[];[...new Set(g.map(u=>u.o))].forEach(o=>['W','A','S','C'].forEach(k=>{const l=g.filter(u=>u.o==o&&u.k==k);if(l.length)items.push({o,k,l})}));
    const m=items.length,sc=m>2?.62:m>1?.74:1,gap=m>2?9:12;
    items.forEach((it,j)=>{const[x0,y0]=unitPos(it.l[0]),x=x0+(j-(m-1)/2)*gap,y=y0,col=N[S.pl[it.o].ni].c,selI=it.l.some(u=>sel&&sel.k=='u'&&sel.id==u.id),mil=MIL(it.k);
      cx.save();cx.translate(x,y);cx.scale(sc,sc);cx.globalAlpha=it.o==mi&&it.l.every(u=>u.mp==0)?.62:1;
      if(mil)drawArmy(it.k,0,0,col,selI,1,Math.min(12,4+2*it.l.length),S.pl[it.o].ni);else drawUnit(it.l[0],0,0,col,selI,S.pl[it.o].ni);
      cx.restore();
      if(mil||it.l.length>1){const txt=String(mil?it.l.length*100:it.l.length),bw=txt.length*5+7,bx=x+10*sc,by=y+13*sc;cx.save();cx.font='bold 9px system-ui';cx.fillStyle='#f3e6c8';cx.strokeStyle='#253243';cx.lineWidth=1.3;cx.beginPath();cx.rect(bx-bw/2,by-6,bw,12);cx.fill();cx.stroke();cx.fillStyle='#253243';cx.fillText(txt,bx,by+.5);cx.restore()}
    });
    /* jeden znacznik okrążenia na pole i właściciela */
    const ow_=[...new Set(g.map(u=>u.o))].filter(o=>CUTS.has(o+':'+g[0].q+','+g[0].r));
    ow_.forEach((o,j)=>{const[x0,y0]=unitPos(g[0]),sc2=m>2?.62:m>1?.74:1,x=x0,y=y0-j*0;
      cx.save();cx.strokeStyle='#ff3b30';cx.lineWidth=2;cx.setLineDash([4,3]);cx.beginPath();cx.arc(x,y,(m>1?15+4*(m-1):17)*sc2+2,0,7);cx.stroke();cx.setLineDash([]);
      const by=y-(m>1?19:17)*sc2-9;cx.beginPath();cx.arc(x,by,8.5,0,7);cx.fillStyle='#d62d20';cx.fill();cx.strokeStyle='#fff';cx.lineWidth=1.8;cx.stroke();cx.font='bold 13px system-ui';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText('!',x,by+.5);cx.restore()})});
}
let lastTap={q:-1,r:-1,t:0};
cv.onclick=e=>{if(!S||hold||spec)return;const b=cv.getBoundingClientRect(),x=(e.clientX-b.left)/zoom,y=(e.clientY-b.top)/zoom;let best=null,bd=1e9;
  for(let r=0;r<S.h;r++)for(let q=0;q<S.w;q++){const[cx_,cy]=C(q,r),d=(cx_-x)**2+(cy-y)**2;if(d<bd){bd=d;best=[q,r]}}
  if(bd<=R*R){const[q,r]=best,now=performance.now();sfx('tap');
    if(lastTap.q==q&&lastTap.r==r&&now-lastTap.t<450){lastTap={q:-1,r:-1,t:0};openDetail(q,r);return}
    lastTap={q,r,t:now};tap(q,r)}};

function specSet(k,v){if(!spec)return;if(k=='toggle'){spec.paused=!spec.paused;spec.target=0}
  else if(k=='step'){spec.paused=true;spec.target=0;spec.step=1}
  else if(k=='skip'){spec.paused=false;spec.target=S.round+v}
  else if(k=='speed')spec.speed=+v;
  render()}
function renderSpec(){
  const cur=S.pl[S.turn],skipping=spec.target>S.round&&S.over<0;
  if(skipping){const h=$('hd');if(h)h.innerHTML=`<b>👁 Obserwator</b><span>Runda ${S.round}</span><span>⏩ Pomijanie do rundy ${spec.target}…</span><button onclick="specSet('toggle')">⏸ Zatrzymaj</button>`;aiCheck();return}
  $('room').style.display='none';$('game').style.display='flex';
  const sp=[[2000,'Bardzo wolno'],[800,'Normalnie'],[250,'Szybko'],[0,'Błyskawicznie']].map(([v,n])=>`<option value="${v}"${spec.speed==v?' selected':''}>${n}</option>`).join('');
  $('hd').innerHTML=`<b>👁 Obserwator</b><span>Runda ${S.round}</span><span>${S.over>=0?'Koniec! Wygrywa '+esc(S.pl[S.over].name)+' ('+N[S.pl[S.over].ni].n+')':'Tura: '+esc(cur.name)}</span><button class="p" onclick="specSet('toggle')" ${S.over>=0?'disabled':''}>${spec.paused?'▶ Wznów':'⏸ Pauza'}</button><button onclick="specSet('step')" ${S.over>=0?'disabled':''}>⏭ Następny ruch</button><button onclick="specSet('skip',1)" ${S.over>=0?'disabled':''}>⏩ +1 runda</button><button onclick="specSet('skip',10)" ${S.over>=0?'disabled':''}>⏩ +10 rund</button><select onchange="specSet('speed',this.value)" title="Szybkość">${sp}</select><span class="zoom-hint">Scroll: zoom <b id="zoomval">${Math.round(zoom*100)}%</b></span><button onclick="stats()">📊 Statystyki</button><button class="sound" onclick="soundOn=!soundOn;this.textContent=soundOn?'🔊 Dźwięk':'🔇 Wycisz'">🔊 Dźwięk</button>`;
  let h='<b>Gracze</b><small style="display:block;margin:4px 0 8px">Tryb obserwatora – brak mgły wojny, widzisz całą mapę.</small>';
  S.pl.forEach((p,i)=>{const inc=income(i);h+=`<div class="row" style="flex-wrap:wrap;opacity:${p.alive?1:.5}"><i class="d" style="background:${N[p.ni].c}"></i><b>${esc(p.kingdom||('Królestwo '+p.name))}</b> (${N[p.ni].n})${i==S.turn&&S.over<0?' ◀':''}${p.alive?'':' ✖'}<br><small>🪙 ${p.g||0} (${inc>=0?'+':''}${inc}/turę) · ◈ ${terr(i)} · 🏰 ${S.cities.filter(c=>c.o==i).length} · ⚔ ${milCount(i,false)*100} · 🏠 ${(S.hs||[]).filter(k=>+S.own[k]===i+1).length}</small></div>`});
  h+='<hr><small>Dwuklik na pole: szczegóły pola. „Następny ruch” wykonuje turę jednego gracza AI i zatrzymuje grę.</small>';
  $('side').innerHTML=h;computeCuts();draw(vision(0));applyZoom();aiCheck();if(typeof focusRefresh==='function')focusRefresh();
}

/* ---------- okno akcji na planszy (rekrutacja, budowa, ruch grupy) + powiadomienia ---------- */
const ACT=document.createElement('div');ACT.id='act';$('game').appendChild(ACT);
const TOAST=document.createElement('div');TOAST.id='toast';$('game').appendChild(TOAST);

/* ===== Menu główne, pełny ekran, ukrycie paska portalu w grze ===== */
(function(){
  function pmenu(){const out=[];try{const d=window.parent.document;d.querySelectorAll('button,a').forEach(e=>{if(!e.classList.contains('gmenu')&&e.children.length<=2&&/^\s*(←|<)?\s*menu g[łl]ówne\s*$/i.test(e.textContent||''))out.push(e)})}catch(e){}return out}
  function hideParentBtn(){pmenu().forEach(e=>{if(e.dataset.impHid==null){e.dataset.impHid=e.style.display||'';e.style.display='none'}})}
  function restoreParentBtn(){try{window.parent.document.querySelectorAll('[data-imp-hid]').forEach(e=>{e.style.display=e.dataset.impHid;delete e.dataset.impHid})}catch(e){}}
  const prevClean=window.__impCleanup;window.__impCleanup=()=>{try{prevClean&&prevClean()}catch(e){}restoreParentBtn();restorePortalBar();};
  let leaving=false,syncT=0;
  function goMenu(){
    if(leaving)return;
    leaving=true;clearInterval(syncT);
    try{window.__impCleanup()}catch(e){}
    let fe=null;try{fe=window.frameElement}catch(e){}
    /* czy portal już nas schował / usunął? (wtedy nic więcej nie robimy) */
    const gone=()=>{try{if(fe)return !fe.isConnected||fe.offsetWidth===0||fe.offsetHeight===0||getComputedStyle(fe).display==='none'}catch(e){return true}return false};
    const viaParent=()=>{try{const d=window.parent.document,g=d.querySelector('#imp .gmenu')||d.querySelector('.gmenu');if(g){g.click();return true}const p=pmenu();if(p.length){p[0].click();return true}}catch(e){}return false};
    const viaBridge=()=>{try{const B=impBridge();if(B)for(const k of ['menu','mainMenu','home','exit','back','close'])if(typeof B[k]==='function'){B[k]();return true}}catch(e){}return false};
    if(!viaParent()&&!viaBridge()){try{window.parent.postMessage({type:'imperia:menu',imperia:'menu'},'*')}catch(e){}}
    /* jeśli portal nie zareagował – wracamy na stronę główną sami */
    setTimeout(()=>{
      if(gone())return;
      try{window.top.location.href='/'}catch(e){try{window.parent.location.href='/'}catch(e2){try{location.href='/'}catch(e3){}}}
      setTimeout(()=>{if(!gone()){leaving=false;syncT=setInterval(sync,700)}},1500);
    },600);
  }
  $('ilMenu').onclick=goMenu;
  function hidePortalBar(){try{
    const pd=window.parent.document,fe=window.frameElement;
    const hide=e=>{if(!e||(e.classList&&e.classList.contains('gmenu'))||/^(SCRIPT|STYLE|LINK)$/.test(e.tagName)||e.dataset.impHid2!=null)return;e.dataset.impHid2=e.style.display||'';e.style.display='none'};
    if(fe){let n=fe;while(n&&n!==pd.body&&n!==pd.documentElement){let s=n.previousElementSibling;while(s){hide(s);s=s.previousElementSibling}n=n.parentElement}
      if(fe.dataset.impH==null){fe.dataset.impH=fe.style.height||'';fe.style.height='100dvh'}}
    pd.querySelectorAll('header,nav,div,h1,h2,span').forEach(e=>{if(e.contains(fe))return;if(/^\s*imperia\s*$/i.test(e.textContent||'')){let t=e;while(t.parentElement&&t.parentElement!==pd.body&&!t.parentElement.contains(fe)&&(t.parentElement.textContent||'').trim().length<40)t=t.parentElement;hide(t)}});
  }catch(e){}
    try{window.parent.postMessage({type:'imperia:hideHeader',imperia:'hideHeader'},'*')}catch(e){}}
  function restorePortalBar(){try{const pd=window.parent.document;pd.querySelectorAll('[data-imp-hid2]').forEach(e=>{e.style.display=e.dataset.impHid2;delete e.dataset.impHid2});const fe=window.frameElement;if(fe&&fe.dataset.impH!=null){fe.style.height=fe.dataset.impH;delete fe.dataset.impH}}catch(e){}}
  function sync(){if(leaving)return;hideParentBtn();hidePortalBar()}
  syncT=setInterval(sync,700);sync();
})();
let _actKey='',_lastMsg='',_toastT=0;
const UIC={W:'⚔️',A:'🏹',S:'🧺',C:'🐎'};
function actHide(){ACT.classList.remove('on','pop');ACT.innerHTML='';_actKey=''}
function showToast(t){if(!t)return;TOAST.textContent=t;TOAST.classList.add('on');clearTimeout(_toastT);_toastT=setTimeout(()=>TOAST.classList.remove('on'),3800)}
function selU(id){sel={k:'u',id};try{sfx('select')}catch(e){}render()}
function closeAct(){sel=null;grpN=0;render()}
function setGrp(n,max){n=Math.max(1,Math.min(max,n|0));grpMode=true;grpN=n>=max?0:n;render()}
function grpList(su,cur){const gl=S.units.filter(x=>x.o==su.o&&x.q==su.q&&x.r==su.r&&x.mp>0);return[su,...gl.filter(x=>x!==su)].slice(0,cur)}
function grpComp(su,cur){const l=grpList(su,cur),c={};l.forEach(x=>c[x.k]=(c[x.k]||0)+1);return Object.keys(c).map(k=>`${UIC[k]} ${c[k]}× ${UN[k]}`).join(' · ')}
function grpLive(v,max){const su=S.units.find(x=>sel&&x.id==sel.id);if(!su)return;const n=Math.max(1,Math.min(max,v|0));grpMode=true;grpN=n>=max?0:n;
  const a=document.getElementById('gcur'),b=document.getElementById('gcomp');if(a)a.textContent=n;if(b)b.textContent=grpComp(su,n)}
function renderAct(mi){
  if(!sel||S.over>=0||!S.pl[mi]){actHide();return}
  const my=mineTurn(),g=S.pl[mi].g||0;let key='',h='';
  const tile=(e,n,sub,pr,ok,on,tip)=>`<button class="tile" ${ok?'':'disabled'} onclick="${on}" title="${esc(tip||'')}"><span class="e">${e}</span><span class="n">${n}</span>${sub?`<span class="s">${sub}</span>`:''}${pr==null?'':`<span class="pr${typeof pr=='object'?(pr.cls?' '+pr.cls:''):(g<pr?' short':'')}">${typeof pr=='object'?pr.t:pr+' 🪙'}</span>`}</button>`;
  const head=(ic,t,sub)=>`<div class="ac-h"><div class="ac-ic">${ic}</div><div class="ac-t"><b>${t}</b><small>${sub}</small></div><button class="ac-x" onclick="closeAct()" title="Zamknij (Esc)">✕</button></div>`;
  const wait=my?'':`<div class="ac-w">⏳ To nie Twoja tura – akcje odblokują się, gdy przyjdzie na Ciebie kolej.</div>`;
  if(sel.k=='c'){
    const c=S.cities[sel.i];if(!c||c.o!=mi){actHide();return}
    key='c'+sel.i;const lv=c.lv||1,mc=milCount(mi),q=(S.q||[]).filter(x=>x.o==mi&&x.q==c.q&&x.r==c.r);
    const stat={W:'Atak 3 · Obrona 2',A:'Zasięg 3 pól',S:'Zakłada miasta',C:'Szybki zwiad'};
    h=head('🏰',esc(c.nm||'Miasto'),`Poziom ${lv}${lv>1?' '+'★'.repeat(lv-1):''} · masz <b style="color:#f0cc83">${g} 🪙</b>`)+`<div class="ac-l">Rekrutacja</div><div class="tiles">`+
      [['W','Wojownik'],['A','Łucznik'],['S','Osadnik'],['C','Zwiadowca']].map(([k,n])=>{const cost=unitPrice(mi,k),up=MIL(k)?armyUpkeep(mc+1)-armyUpkeep(mc):1;
        return tile(UIC[k],n,stat[k]+`<br>utrzymanie −${up}/turę`,cost,my&&g>=cost,`buy('${k}')`,g<cost?'Za mało złota':'Kup: '+n)}).join('')+`</div>`;
    h+=`<div class="ac-l">Rozwój miasta</div><div class="tiles">`+(lv>=3?tile('🏰','Maks. poziom','Mury i cytadela na maksimum',{t:'✔ gotowe',cls:'free'},false,'',''):tile('🧱',`Ulepsz do poz. ${lv+1}`,'+1 osłona murów w bitwie',CITY_UP[lv+1],my&&g>=CITY_UP[lv+1],'upgradeCity()',''))+`</div>`;
    h+=`<div class="ac-n">${q.length?'📦 W kolejce (pojawią się na początku Twojej tury): '+['W','A','S','C'].filter(k=>q.some(x=>x.k==k)).map(k=>UIC[k]+' ×'+q.filter(x=>x.k==k).length).join(' · ')+'<br>':''}Armia: ${mc} jedn. (${mc*100} żołnierzy), utrzymanie −${armyUpkeep(mc)}/turę. Każda kolejna jednostka wojskowa jest droższa.</div>`+wait;
  }else if(sel.k=='t'){
    const ti=sel.r*S.w+sel.q;if(+S.own[ti]!==mi+1){actHide();return}
    key='t'+ti;const has=(S.hs||[]).includes(ti),hup=(S.hup||[]).includes(ti),hc=houseCost(mi);
    h=head(has?'🏠':'🌾',has?'Domek'+(hup?' · ulepszony':''):T[tt(sel.q,sel.r)],`Twoje ziemie · pole ${sel.q+1}:${sel.r+1} · masz <b style="color:#f0cc83">${g} 🪙</b>`)+`<div class="ac-l">${has?'Ulepszenia':'Budowa'}</div><div class="tiles">`+
      (has?(hup?tile('💰','Dochód +5/turę','Ulepszenie aktywne',{t:'✔ gotowe',cls:'free'},false,'',''):tile('💰','Ulepsz dochód','+5 złota na turę',100,my&&g>=100,'upgradeHouse()','')):
        tile('🏠','Domek','+2 🪙/turę · +1 ruch przy przejściu',hc,my&&g>=hc,'buildHouse()','')+tile('🗼','Wieża','Zasięg widzenia + obrona',25,my&&g>=25,'buildTower()',''))+`</div>`+
      `<div class="ac-n">${has?'Przejście jednostki przez domek daje +1 punkt ruchu.':'Domek kosztuje więcej z każdym kolejnym. Wieża daje dużą osłonę obrońcom.'}</div>`+wait;
  }else if(sel.k=='u'){
    const u=S.units.find(x=>x.id==sel.id);if(!u||u.o!=mi){actHide();return}
    key='u'+u.id;const mxp=mx(S,mi)+(u.k=='C'?2:0),mine=S.units.filter(x=>x.o==mi&&x.q==u.q&&x.r==u.r),mov=mine.filter(x=>x.mp>0),n=mov.length;
    h=head(UIC[u.k],UN[u.k]+(MIL(u.k)?' <small style="font-weight:600;color:var(--muted)">(100 żołnierzy)</small>':''),`${T[tt(u.q,u.r)]} · ruch <span class="mpd">${'●'.repeat(Math.min(u.mp,9))}${'○'.repeat(Math.max(0,mxp-u.mp))}</span> ${u.mp}/${mxp}`);
    if(mine.length>1)h+=`<div class="ac-l">Jednostki na polu</div><div class="ulist">`+mine.map(x=>`<button class="uc${x.id==u.id?' on':''}" onclick="selU(${x.id})" title="${UN[x.k]}">${UIC[x.k]}<small>${x.mp}/${mx(S,mi)+(x.k=='C'?2:0)}</small></button>`).join('')+`</div>`;
    if(n>1&&u.mp>0){const cur=grpN>0&&grpN<=n?grpN:n;
      h+=`<div class="grp"><div class="grp-top"><b>Ile jednostek ruszyć?</b><span class="big"><span id="gcur">${cur}</span> <small>/ ${n}</small></span></div>
        <div class="stp"><button class="sq" onclick="setGrp(${cur-1},${n})" ${cur<=1?'disabled':''}>−</button><input type="range" min="1" max="${n}" value="${cur}" oninput="grpLive(this.value,${n})" onchange="render()"><button class="sq" onclick="setGrp(${cur+1},${n})" ${cur>=n?'disabled':''}>+</button></div>
        <div class="chips"><button class="chip${cur==n?' on':''}" onclick="setGrp(${n},${n})">Wszystkie</button><button class="chip${cur==Math.ceil(n/2)&&n>2?' on':''}" onclick="setGrp(${Math.ceil(n/2)},${n})">Połowa</button><button class="chip${cur==1?' on':''}" onclick="setGrp(1,${n})">Tylko ta</button></div>
        <div class="grp-c">Ruszysz: <b id="gcomp">${grpComp(u,cur)}</b><br>👉 Kliknij sąsiednie pole na mapie.</div></div>`}
    else h+=`<div class="ac-n" style="margin:0 0 6px">👉 Kliknij sąsiednie pole na mapie, by się ruszyć lub zaatakować.</div>`;
    let foundOk=false,foundWhy='';if(u.k=='S'){if(tt(u.q,u.r)==4)foundWhy='Nie w górach';else if(S.cities.some(c=>HD(c.q,c.r,u.q,u.r)<3))foundWhy='Za blisko miasta (min. 3 pola)';else foundOk=true}
    h+=`<div class="ac-l">Akcje</div><div class="tiles">`+(u.k=='S'?tile('🏙️','Załóż miasto',foundOk?'Nowy ośrodek królestwa':foundWhy,null,my&&foundOk,'found()',''):'')+tile('⏭️','Zakończ ruch','Zostaw jednostkę na miejscu',null,my&&u.mp>0,'skip()','')+`</div>`+wait;
  }else{actHide();return}
  ACT.innerHTML=`<div class="ac">${h}</div>`;ACT.classList.add('on');
  if(key!==_actKey){_actKey=key;ACT.classList.remove('pop');void ACT.offsetWidth;ACT.classList.add('pop')}
}
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||FZ||document.getElementById('nmdlg')||!sel||!S||(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=='range'))return;closeAct()});
function render(){
  if(quiet)return;const inRoom=!!ref;$('lobby').style.display=inRoom?'none':'';
  if(!inRoom)return;
  if(!S||meIdx()<0){$('game').style.display='none';$('room').style.display='';
    roomSet(RD.started&&!S?roomMsg('Ładowanie…'):RD.started?roomMsg('Gra już trwa bez Ciebie.'):lobbyView());return}
  $('room').style.display='none';$('game').style.display='flex';applyCols(S.pl);
  if(local&&hold){hold=false;holdFor=null;}
  if(spec){actHide();renderSpec();return}
  const mi=meIdx(),V=vision(mi),sn=S.pl[mi].seen.split('');V.forEach((v,i)=>{if(v)sn[i]='1'});S.pl[mi].seen=sn.join('');
  if(S.own)for(let r=0;r<S.h;r++)for(let q=0;q<S.w;q++){if(S.own[r*S.w+q]!=mi+1)continue;NB(r).forEach(([a,b])=>{const x=q+a,y=r+b;if(x<0||y<0||x>=S.w||y>=S.h)return;const o=+S.own[y*S.w+x];if(o&&o!=mi+1)noteMet(mi,o-1)})}
  computeCuts();const cur=S.pl[S.turn];
  $('hd').innerHTML=`<b>${esc(S.pl[mi].kingdom||('Królestwo '+S.pl[mi].name))}</b><span>Pokój ${esc(code)}</span><span>Runda ${S.round}</span><span class="gold-pill"><i class="gold-icon">✦</i> ${S.pl[mi].g||0} złota <small style="font-weight:600;color:#e7c987">${income(mi)>=0?'+':''}${income(mi)}/turę</small></span><span>◈ Ziemia: ${terr(mi)}</span><span title="Utrzymanie armii: −${armyUpkeep(milCount(mi))} złota na turę (wliczone w dochód)">⚔ Armia: <b>${milCount(mi,false)*100}</b></span><span class="zoom-hint">Scroll: zoom <b id="zoomval">${Math.round(zoom*100)}%</b></span><span>${S.over>=0?'Koniec! Wygrywa '+esc(S.pl[S.over].name)+' ('+N[S.pl[S.over].ni].n+')':mineTurn()?'<b>Twoja tura</b>':'Tura: '+esc(cur.name)}</span><button class="p" ${mineTurn()?'':'disabled'} onclick="endTurn()">Zakończ turę</button><button onclick="stats()">📊 Statystyki</button><button class="sound" onclick="soundOn=!soundOn;this.textContent=soundOn?'🔊 Dźwięk':'🔇 Wycisz'">🔊 Dźwięk</button>`;
  let h='<b>Gracze</b>';
  S.pl.forEach((p,i)=>h+=`<div class="row"><i class="d" style="background:${N[p.ni].c}"></i>${esc(p.kingdom||('Królestwo '+p.name))} (${esc(p.name)})${p.ai?' [AI]':(i==mi?' – '+N[p.ni].n:'')}${i==S.turn?' ◀':''}${p.alive?'':' ✖'}</div>`);
  {let nm=0,ne=0;CUTS.forEach(k=>{const[o,rest]=k.split(':'),[q,r]=rest.split(',').map(Number);if(!V[r*S.w+q])return;if(+o===mi)nm++;else ne++});if(nm)h+=`<div class=err>⚠ OKRĄŻONE Twoje oddziały: ${nm} (−1 atak, −1 obrona)</div>`;if(ne)h+=`<div class=err style="color:#ffb86b">⚠ Okrążone oddziały wroga: ${ne} (osłabione)</div>`}
  {const pm=S.pl[mi];if(pm.dr===S.round)h+='<div class=err>⚠ Zabrakło złota na utrzymanie armii – jeden oddział zdezerterował!</div>';else if((pm.g||0)+income(mi)<0)h+='<div class=err>⚠ Koszty utrzymania armii przewyższają dochód – grozi dezercja.</div>'}h+='<hr><b>Wybrane</b><div>';
  if(sel&&sel.k=='u'){const u=S.units.find(x=>x.id==sel.id);if(u){h+=`${UN[u.k]}${MIL(u.k)?' (100 żołnierzy)':''}, ruch ${u.mp}/${mx(S,mi)+(u.k=='C'?2:0)} – ${T[tt(u.q,u.r)]}${CUTS.has(u.o+':'+u.q+','+u.r)?'<br><b style="color:#ff6258">⚠ OKRĄŻENI – odcięci od królestwa: −1 atak, −1 obrona</b>':''}<br><small>Przyciski akcji są w oknie na dole planszy.</small>`;
    h+='<br><small>Kliknij sąsiednie pole, by się ruszyć lub zaatakować.</small>'}}
  else if(sel&&sel.k=='c'){const en=mineTurn(),mc=milCount(mi),nx=armyUpkeep(mc+1)-armyUpkeep(mc);h+=`<b>🏰 ${esc(S.cities[sel.i].nm||'Miasto')}</b> · poziom ${S.cities[sel.i].lv||1}<br><small>Rekrutacja i ulepszenia są w oknie na dole planszy.</small><br>`+`<br><small>Armia: ${mc} jedn. (${mc*100} żołnierzy), utrzymanie −${armyUpkeep(mc)}/turę. Każda kolejna jednostka wojskowa jest droższa, a jej utrzymanie to −${nx}/turę (rośnie co 4 jednostki).</small>`}
  else if(sel&&sel.k=='t'){const ti=sel.r*S.w+sel.q,has=(S.hs||[]).includes(ti);h+=`Pole: ${T[tt(sel.q,sel.r)]} – Twoje ziemie<br>${has?'<b>🏠 Domek'+((S.hup||[]).includes(ti)?' · dochód +5':'')+'</b><br>':''}<small>Budowa i ulepszenia są w oknie na dole planszy.</small>`}
  else h+='<small>Kliknij swoją jednostkę, miasto lub pole w swoim królestwie (budowa domków).</small>';
  h+=`</div><div class="err">${esc(msg)}</div><hr><small>❗ <b style="color:#ff6258">Czerwony wykrzyknik „OKRĄŻENI”</b> przy oddziale = okrążony, bez drogi do własnego królestwa (−1 atak i −1 obrona).<br>⬆️ <b style="color:#ff6258">Czerwona strzałka</b> nad wojownikiem = może zaatakować sąsiedni cel. Jednostki bez strzałki nie mają teraz takiego ataku.<br>Fog of war: widzisz tylko pola w zasięgu swoich jednostek i miast. Zdobądź wszystkie wrogie miasta i jednostki, by wygrać.<br>Dwukrotne kliknięcie pola przybliża je na planszy.</small>`;
  $('side').innerHTML=h;if(msg&&msg!==_lastMsg)showToast(msg);_lastMsg=msg;renderAct(mi);computeCuts();draw(V);applyZoom();aiCheck();if(typeof focusRefresh==='function')focusRefresh();battleHook();
}


/* ---------- przybliżenie pola na planszy (dwuklik) + bitwa taktyczna ---------- */
const UN={W:'Wojownik',A:'Łucznik',S:'Osadnik',C:'Zwiadowca'};
let FZ=null,bSize=4,fzAnim=false;
const fzw=document.createElement('div');fzw.id='fzw';
fzw.innerHTML='<canvas id="fzc"></canvas><div id="fzhud"></div><div id="fzhint"></div><div id="fzdie" style="display:none"><small id="fzdielbl"></small><b id="fzdn">–</b></div><button id="fzback" class="p">← Wróć do mapy (Esc)</button><div id="fzzoom"><span>🔍 <b id="fzzv">100%</b> · kółko: zoom · przeciągnij: przesuń</span><button id="fzreset">Reset</button></div>';
document.body.appendChild(fzw);
const fzc=fzw.querySelector('#fzc'),fzhint=fzw.querySelector('#fzhint'),fzhud=fzw.querySelector('#fzhud');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function placeFz(){const r=$('wrap').getBoundingClientRect();Object.assign(fzw.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})}
function inHex(dx,dy,rr){const a=Math.abs(dx),b=Math.abs(dy),h=Math.sqrt(3)/2;return b<=rr&&a<=h*rr&&a*.5+b*h<=h*rr}

/* ---- podtereny: każdy rodzaj pola składa się z kilku rodzajów terenu ---- */
const SUB_GRASS={k:'trawa',n:'Trawa',col:'#9ccc65',mv:1,cov:0,hgt:0,w:.28,art:'grass'};
const SUBT={
 5:{list:[SUB_GRASS,
  {k:'wysoka',n:'Wysoka trawa',col:'#86b955',mv:1,cov:1,hgt:0,w:.18,art:'tall'},
  {k:'kwiaty',n:'Kwietna łąka',col:'#a9d36f',mv:1,cov:0,hgt:0,w:.14,art:'flowers'},
  {k:'krzaki',n:'Krzaki',col:'#6c9e48',mv:2,cov:1,hgt:0,w:.14,art:'bush'},
  {k:'pagorek',n:'Pagórek',col:'#bcd57f',mv:2,cov:1,hgt:1,w:.18,art:'hill'},
  {k:'glazy',n:'Głazy',col:'#a3ae8f',mv:2,cov:2,hgt:0,w:.08,art:'rocks'}],
  ridge:{th:.045,t:{k:'potok',n:'Potok',col:'#6fb7da',mv:2,cov:-1,hgt:0,art:'stream'}}},
 3:{list:[
  {k:'gesty',n:'Gęsty las',col:'#2a6b3a',mv:2,cov:2,hgt:0,w:.32,art:'forest'},
  {k:'rzadki',n:'Rzadki las',col:'#3d8449',mv:1,cov:1,hgt:0,w:.24,art:'sparse'},
  {k:'polana',n:'Polana',col:'#86b35a',mv:1,cov:0,hgt:0,w:.18,art:'clearing'},
  {k:'podszycie',n:'Podszycie',col:'#35703f',mv:2,cov:1,hgt:0,w:.16,art:'undergrowth'},
  {k:'pien',n:'Powalony pień',col:'#4f7a45',mv:2,cov:1,hgt:0,w:.10,art:'log'}],
  ridge:{th:.045,t:{k:'strumien',n:'Strumień',col:'#5da6cc',mv:2,cov:-1,hgt:0,art:'stream'}}},
 2:{list:[
  {k:'piasek',n:'Piasek',col:'#e6cb7a',mv:1,cov:0,hgt:0,w:.32,art:'sand'},
  {k:'wydma',n:'Wydma',col:'#d9b45f',mv:2,cov:1,hgt:1,w:.22,art:'dune'},
  {k:'kamienista',n:'Kamienista ziemia',col:'#cdb77f',mv:1,cov:0,hgt:0,w:.18,art:'gravel'},
  {k:'skaly',n:'Skały',col:'#a89572',mv:2,cov:2,hgt:0,w:.12,art:'rocks'},
  {k:'krzew',n:'Suchy krzew',col:'#c9b46a',mv:1,cov:1,hgt:0,w:.16,art:'drybush'}],
  ridge:{th:.04,t:{k:'koryto',n:'Wyschłe koryto',col:'#bf9f60',mv:1,cov:1,hgt:0,art:'wadi'}}},
 4:{list:[
  {k:'skala',n:'Skała',col:'#8c969c',mv:2,cov:2,hgt:0,w:.30,art:'crag'},
  {k:'zwir',n:'Żwirowisko',col:'#a9b0b3',mv:1,cov:0,hgt:0,w:.22,art:'gravel'},
  {k:'gran',n:'Grań',col:'#b9c4c9',mv:3,cov:1,hgt:2,w:.18,art:'peak'},
  {k:'snieg',n:'Śnieg',col:'#e1ecf0',mv:2,cov:0,hgt:0,w:.16,art:'snow'},
  {k:'osuwisko',n:'Osuwisko',col:'#7b858a',mv:2,cov:1,hgt:0,w:.14,art:'scree'}],
  ridge:{th:.03,t:{k:'przepasc',n:'Przepaść',col:'#2b3036',mv:99,cov:0,hgt:0,art:'chasm'}}}
};
SUBT[0]=SUBT[1]={list:[
  {k:'glebia',n:'Głęboka woda',col:'#2a5f93',mv:99,cov:0,hgt:0,w:.5,art:'deep'},
  {k:'plycizna',n:'Płycizna',col:'#4a90bf',mv:2,cov:-1,hgt:0,w:.32,art:'shallow'},
  {k:'trzciny',n:'Trzciny',col:'#4f8f7a',mv:2,cov:1,hgt:0,w:.18,art:'reeds'}]};
const BN={5:['Złotymi Łąkami','Wierzbową Doliną','Białym Brodem','Zieloną Równiną','Skowronkowym Polem','Kamiennym Mostkiem'],
 3:['Szepczącym Lasem','Mrocznym Borem','Wilczym Jarem','Starym Dębem','Cichą Puszczą'],
 2:['Złotymi Wydmami','Spieczoną Studnią','Czerwonym Piaskiem','Suchym Wądołem'],
 4:['Orlą Przełęczą','Szarym Szczytem','Kamiennym Progiem','Zimną Granią','Czarnym Urwiskiem'],
 0:['Ciemną Wodą'],1:['Cichym Jeziorem']};
function battleName(q,r,ty,city,house,tower){
  if(city)return city.nm?'Bitwa o '+city.nm:'Bitwa pod Murami Cytadeli';if(tower)return 'Bitwa pod Strażnicą';if(house)return 'Bitwa pod Opuszczoną Chatą';
  const L=BN[ty];return 'Bitwa pod '+L[Math.floor(seeded(q*3.3,r*7.1)*L.length)]}
function hsh(x,y,sd){const v=Math.sin(x*127.1+y*311.7+sd*74.7)*43758.5453;return v-Math.floor(v)}
function vnoise(x,y,sd){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hsh(xi,yi,sd),b=hsh(xi+1,yi,sd),c=hsh(xi,yi+1,sd),d=hsh(xi+1,yi+1,sd);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function hd(c1,c2){const da=c1.a-c2.a,db=c1.b-c2.b;return(Math.abs(da)+Math.abs(db)+Math.abs(da+db))/2}
function makeCells(q,r,ty){
  const sq=Math.sqrt(3),cells=[],Rr=10,M=14,T_=SUBT[ty],sd=((q*31+r*17+ty*5+S.w*3)%997)+1;
  for(let b=-M;b<=M;b++)for(let a=-M;a<=M;a++){const ux=sq*(a+b/2),uy=1.5*b;
    if(Math.hypot(ux,uy)>Rr+1||!inHex(ux,uy,Rr+.4))continue;
    cells.push({a,b,ux,uy,play:inHex(ux,uy,Rr-.9),block:false,i:cells.length})}
  const nz=(x,y,s2)=>.65*vnoise(x/3.4,y/3.4,s2)+.35*vnoise(x/1.7,y/1.7,s2+5);
  const v1=cells.map(c=>nz(c.ux,c.uy,sd)),v2=cells.map(c=>vnoise(c.ux/4.2+7,c.uy/4.2+3,sd+11));
  const rk=v=>{const o=v.map((x,i)=>[x,i]).sort((p,t)=>p[0]-t[0]),res=new Array(v.length);o.forEach(([,i],j)=>res[i]=(j+.5)/v.length);return res};
  let rid=null;if(T_.ridge&&hsh(q,r,sd)<.65){const a0=hsh(q,r,3)*6.283,a1=a0+Math.PI+(hsh(q,r,4)-.5)*1.2,P=[Math.cos(a0)*9.5,Math.sin(a0)*9.5],Q=[Math.cos(a1)*9.5,Math.sin(a1)*9.5],nx=-(Q[1]-P[1]),ny=Q[0]-P[0],L=Math.hypot(nx,ny),ph=hsh(q,r,5)*6,am=1.5+hsh(q,r,6)*2,pts=[];
    for(let k=0;k<=48;k++){const t=k/48,o=Math.sin(t*Math.PI*2+ph)*am+(vnoise(t*4,sd,7)-.5)*2;pts.push([P[0]+(Q[0]-P[0])*t+nx/L*o,P[1]+(Q[1]-P[1])*t+ny/L*o])}
    rid=c=>pts.some(p=>Math.hypot(p[0]-c.ux,p[1]-c.uy)<1.05)}
  const r1=rk(v1),r2=rk(v2),tot=T_.list.reduce((p,t)=>p+t.w,0);
  cells.forEach((c,i)=>{let sub=null;
    if(rid&&rid(c)&&Math.hypot(c.ux,c.uy)>1.5)sub=T_.ridge.t;
    if(!sub){let acc=0;const x=r1[i]*tot;for(const t of T_.list){acc+=t.w;if(x<=acc){sub=t;break}}sub=sub||T_.list[0]}
    c.sub=sub;c.n=seeded(q*13+c.a*3.1,r*13+c.b*5.7)});
  const map=new Map(cells.map(c=>[c.a+','+c.b,c.i])),D=[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
  cells.forEach(c=>c.nb=D.map(([da,db])=>map.get((c.a+da)+','+(c.b+db))).filter(x=>x!==undefined));
  return cells}
const ST_KEEP={k:'cytadela',n:'Cytadela',col:'#8f969b',mv:2,cov:4,hgt:1,art:'keep',st:1},
 ST_WALL={k:'mur',n:'Mury miejskie',col:'#7f8589',mv:2,cov:3,hgt:1,art:'wall',st:1},
 ST_GATE={k:'brama',n:'Brama',col:'#8a8068',mv:1,cov:2,hgt:0,art:'gate',st:1},
 ST_ROOFS={k:'zabudowa',n:'Zabudowa miejska',col:'#b9a98a',mv:2,cov:2,hgt:0,art:'roofs',st:1},
 ST_HOUSE={k:'domek',n:'Domek',col:'#b7a27a',mv:2,cov:3,hgt:0,art:'house',st:1},
 ST_YARD={k:'zagroda',n:'Zagroda',col:'#9cb86a',mv:2,cov:2,hgt:0,art:'fence',st:1},
 ST_TOWER={k:'wieza',n:'Wieża strażnicza',col:'#8f969b',mv:2,cov:4,hgt:2,art:'tower',st:1},
 ST_PAL={k:'palisada',n:'Palisada',col:'#8a7350',mv:2,cov:2,hgt:0,art:'palisade',st:1};
function applyStructs(cells,o){
  const mid=cells.find(c=>c.a==0&&c.b==0);if(!mid)return;
  cells.forEach(c=>{if(c.sub0)c.sub=c.sub0});
  if(!(o.city||o.house||o.tower))return;
  const set=(c,sub)=>{if(!c||!c.play)return;if(!c.sub0)c.sub0=c.sub;c.sub=sub},ang=(a,b)=>Math.atan2(a.uy,a.ux)-Math.atan2(b.uy,b.ux);
  const r1=cells.filter(c=>hd(c,mid)==1).sort(ang),r2=cells.filter(c=>hd(c,mid)==2).sort(ang),sd=(((o.q||0)*31+(o.r||0)*17)%6+6)%6,gate=sd%Math.max(1,r1.length);
  if(o.city){const b=Math.max(0,((o.city&&o.city.lv)||1)-1),up=t=>b?{...t,cov:t.cov+b,n:t.n+' · poz. '+(b+1)}:t;
    set(mid,up(ST_KEEP));r1.forEach((c,i)=>set(c,up(i==gate?ST_GATE:ST_WALL)));r2.forEach((c,i)=>{if((i+sd)%2==0)set(c,up(ST_ROOFS))})}
  else if(o.tower){set(mid,ST_TOWER);r1.forEach((c,i)=>{if(i!=gate)set(c,ST_PAL)})}
  else if(o.house){set(mid,ST_HOUSE);set(r1[sd%r1.length],ST_YARD);set(r1[(sd+1)%r1.length],ST_YARD)}
}
function fxText(t){const p=['ruch '+(t.mv>=99?'—':t.mv)];if(t.cov>0)p.push('osłona +'+t.cov);if(t.cov<0)p.push('odsłonięty '+t.cov);if(t.hgt>0)p.push('wysokość +'+t.hgt);return p.join(' · ')}

/* ---- grafika podterenów ---- */
function subArt(g,art,x,y,s,n,sv){
  const u=s/16,rr=i=>seeded(sv+i*1.7,n*91+i*3.3);
  g.save();g.translate(x,y);g.scale(u,u);g.lineCap='round';g.lineJoin='round';
  const tree=(tx,ty,sc,c1,c2)=>{g.fillStyle='#5b4326';g.fillRect(tx-1.2*sc,ty+3*sc,2.4*sc,4*sc);g.fillStyle=c1;g.beginPath();g.moveTo(tx,ty-9*sc);g.lineTo(tx-6*sc,ty+2*sc);g.lineTo(tx+6*sc,ty+2*sc);g.closePath();g.fill();g.fillStyle=c2;g.beginPath();g.moveTo(tx,ty-12*sc);g.lineTo(tx-4.5*sc,ty-3*sc);g.lineTo(tx+4.5*sc,ty-3*sc);g.closePath();g.fill()};
  const rock=(rx,ry,sc,c)=>{g.fillStyle=c;g.strokeStyle='rgba(25,30,34,.55)';g.lineWidth=1;g.beginPath();g.moveTo(rx-5*sc,ry+3*sc);g.lineTo(rx-3*sc,ry-3*sc);g.lineTo(rx+2*sc,ry-4*sc);g.lineTo(rx+5*sc,ry+1*sc);g.lineTo(rx+3*sc,ry+4*sc);g.closePath();g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.moveTo(rx-3*sc,ry-3*sc);g.lineTo(rx+2*sc,ry-4*sc);g.lineTo(rx,ry);g.closePath();g.fill()};
  const wave=(w,yy,col,lw)=>{g.strokeStyle=col;g.lineWidth=lw||1.3;g.beginPath();g.moveTo(-w,yy);g.quadraticCurveTo(-w/2,yy-3,0,yy);g.quadraticCurveTo(w/2,yy+3,w,yy);g.stroke()};
  const cot=(cx0,cy0,sc,wall,roof)=>{g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx0,cy0+7*sc,9*sc,2.6*sc,0,0,7);g.fill();g.fillStyle=wall;g.fillRect(cx0-7*sc,cy0-3*sc,14*sc,10*sc);g.fillStyle=roof;g.beginPath();g.moveTo(cx0-10*sc,cy0-2*sc);g.lineTo(cx0,cy0-12*sc);g.lineTo(cx0+10*sc,cy0-2*sc);g.closePath();g.fill();g.strokeStyle='rgba(30,20,10,.6)';g.lineWidth=.8;g.stroke();g.fillStyle='#5a3a22';g.fillRect(cx0-1.8*sc,cy0+1.5*sc,3.6*sc,5.5*sc)};
  const merl=(x0,x1,y0)=>{for(let mx=x0;mx<x1;mx+=5){g.fillRect(mx,y0,3,3)}};
  switch(art){
  case'keep':{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,10,13,3.5,0,0,7);g.fill();g.fillStyle='#b6bbbe';g.strokeStyle='rgba(25,30,34,.7)';g.lineWidth=1;g.fillRect(-10,-6,20,16);g.strokeRect(-10,-6,20,16);g.fillRect(-12,-11,6,21);g.strokeRect(-12,-11,6,21);g.fillRect(6,-11,6,21);g.strokeRect(6,-11,6,21);g.fillStyle='#8e9599';merl(-12,-6,-14);merl(6,12,-14);merl(-8,8,-9);g.fillStyle='#3a2b22';g.beginPath();g.moveTo(-3,10);g.lineTo(-3,3);g.arc(0,3,3,Math.PI,0);g.lineTo(3,10);g.closePath();g.fill();g.strokeStyle='#5a4630';g.lineWidth=1;g.beginPath();g.moveTo(0,-9);g.lineTo(0,-19);g.stroke();g.fillStyle='#c9302c';g.beginPath();g.moveTo(0,-19);g.lineTo(7,-16.5);g.lineTo(0,-14);g.closePath();g.fill();break}
  case'wall':{g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(0,9,13,3,0,0,7);g.fill();g.fillStyle='#a2a8ac';g.strokeStyle='rgba(25,30,34,.65)';g.lineWidth=1;g.fillRect(-13,-3,26,12);g.strokeRect(-13,-3,26,12);g.fillStyle='#8a9094';merl(-13,13,-6);g.strokeStyle='rgba(40,45,50,.35)';for(let k=0;k<3;k++){g.beginPath();g.moveTo(-13,k*4);g.lineTo(13,k*4);g.stroke()}break}
  case'gate':{g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(0,9,13,3,0,0,7);g.fill();g.fillStyle='#a2a8ac';g.strokeStyle='rgba(25,30,34,.65)';g.lineWidth=1;g.fillRect(-12,-9,7,18);g.strokeRect(-12,-9,7,18);g.fillRect(5,-9,7,18);g.strokeRect(5,-9,7,18);g.fillStyle='#8a9094';merl(-12,-5,-12);merl(5,12,-12);g.fillStyle='#2c2118';g.beginPath();g.moveTo(-5,9);g.lineTo(-5,0);g.arc(0,0,5,Math.PI,0);g.lineTo(5,9);g.closePath();g.fill();break}
  case'roofs':{cot(-5,-1,.75,'#d9c9a3','#8c4a34');cot(6,5,.6,'#cdbb92','#6e4430');break}
  case'house':{cot(0,1,1.15,'#d7b77e','#70462f');break}
  case'fence':{g.fillStyle='#e0c36a';g.beginPath();g.ellipse(5,3,6,4,0,0,7);g.fill();g.strokeStyle='#7a5a32';g.lineWidth=1.4;for(let k=-10;k<=10;k+=4){g.beginPath();g.moveTo(k,6);g.lineTo(k,-1);g.stroke()}g.beginPath();g.moveTo(-10,1);g.lineTo(10,1);g.moveTo(-10,4);g.lineTo(10,4);g.stroke();break}
  case'tower':{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,10,9,3,0,0,7);g.fill();g.fillStyle='#a9aeb2';g.strokeStyle='rgba(25,30,34,.7)';g.lineWidth=1;g.fillRect(-6,-10,12,20);g.strokeRect(-6,-10,12,20);g.fillRect(-8,-14,16,5);g.strokeRect(-8,-14,16,5);g.fillStyle='#8e9599';merl(-8,8,-17);g.fillStyle='#2c2118';g.fillRect(-1.2,-6,2.4,5);g.beginPath();g.moveTo(-2.5,10);g.lineTo(-2.5,5);g.arc(0,5,2.5,Math.PI,0);g.lineTo(2.5,10);g.fill();break}
  case'palisade':{g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,8,12,2.6,0,0,7);g.fill();for(let k=-11;k<=11;k+=4.4){g.fillStyle='#8a6a3f';g.fillRect(k-1.7,-4,3.4,12);g.fillStyle='#b08a55';g.beginPath();g.moveTo(k-1.7,-4);g.lineTo(k,-8);g.lineTo(k+1.7,-4);g.closePath();g.fill()}break}
  case'grass':case'tall':{const L=art=='tall'?7:4,H=art=='tall'?7:4;g.strokeStyle=art=='tall'?'rgba(25,75,15,.6)':'rgba(40,95,25,.42)';g.lineWidth=1.3;
    for(let i=0;i<L;i++){const px=-9+rr(i)*18,py=-5+rr(i+9)*13;g.beginPath();g.moveTo(px-2,py+H*.5);g.lineTo(px-3,py-H);g.moveTo(px,py+H*.5);g.lineTo(px,py-H-1);g.moveTo(px+2,py+H*.5);g.lineTo(px+3,py-H);g.stroke()}break}
  case'flowers':{const C=['#ffffff','#ffd54a','#ff8aa8','#c9a0ff'];for(let i=0;i<7;i++){g.fillStyle=C[i%4];g.beginPath();g.arc(-10+rr(i)*20,-8+rr(i+5)*16,1.7,0,7);g.fill()}break}
  case'bush':{g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(0,7,10,3,0,0,7);g.fill();[[-4,2,6],[4,3,5.5],[0,-3,5.5]].forEach(([bx,by,br],i)=>{g.fillStyle=i==2?'#5f9440':'#4a7c32';g.beginPath();g.arc(bx,by,br,0,7);g.fill();g.fillStyle='rgba(180,230,120,.35)';g.beginPath();g.arc(bx-1.5,by-1.5,br*.45,0,7);g.fill()});break}
  case'hill':{g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(-13,8);g.quadraticCurveTo(0,-15,13,8);g.closePath();g.fill();g.fillStyle='rgba(60,95,30,.28)';g.beginPath();g.moveTo(1,-6);g.quadraticCurveTo(8,-4,13,8);g.lineTo(2,8);g.closePath();g.fill();g.strokeStyle='rgba(70,105,40,.65)';g.lineWidth=1.4;g.beginPath();g.moveTo(-13,8);g.quadraticCurveTo(0,-15,13,8);g.stroke();break}
  case'rocks':rock(-4,2,1.1,'#8f9693');rock(5,-2,.8,'#9aa19e');rock(4,6,.7,'#848b88');break;
  case'stream':wave(13,-5,'rgba(235,250,255,.7)');wave(13,3,'rgba(235,250,255,.55)');wave(11,9,'rgba(235,250,255,.4)',1);break;
  case'forest':tree(-7,2,1.15,'#1d5230','#2d7040');tree(7,3,1.1,'#1b4c2c','#2a6a3b');tree(0,-5,1.2,'#215a35','#33794a');break;
  case'sparse':tree(-5,3,1,'#2c6c3b','#3f8a4e');tree(7,-3,.85,'#2a6637','#3c8449');break;
  case'clearing':{g.strokeStyle='rgba(40,95,25,.4)';g.lineWidth=1.2;for(let i=0;i<4;i++){const px=-8+rr(i)*16,py=-4+rr(i+7)*10;g.beginPath();g.moveTo(px,py+3);g.lineTo(px-1,py-3);g.stroke()}const C=['#fff','#ffd54a'];for(let i=0;i<3;i++){g.fillStyle=C[i%2];g.beginPath();g.arc(-6+rr(i+3)*12,-6+rr(i+11)*12,1.6,0,7);g.fill()}break}
  case'undergrowth':tree(-6,3,.7,'#2c6f3d','#3e8a4f');g.fillStyle='#3c7a3a';[[4,3,4.5],[8,0,3.5],[-1,7,3.5]].forEach(([bx,by,br])=>{g.beginPath();g.arc(bx,by,br,0,7);g.fill()});break;
  case'log':{g.save();g.rotate(-.35+rr(1)*.6);g.fillStyle='#6b4a2a';g.strokeStyle='#3d2916';g.lineWidth=1.2;g.beginPath();g.rect(-10,-3,20,6);g.fill();g.stroke();g.fillStyle='#c9a46a';g.beginPath();g.ellipse(10,0,2.4,3,0,0,7);g.fill();g.stroke();g.restore();break}
  case'sand':{g.fillStyle='rgba(130,90,35,.35)';for(let i=0;i<6;i++){g.beginPath();g.arc(-10+rr(i)*20,-8+rr(i+4)*16,1.1,0,7);g.fill()}g.strokeStyle='rgba(150,105,45,.3)';g.lineWidth=1;g.beginPath();g.moveTo(-10,3);g.quadraticCurveTo(0,-1,10,3);g.stroke();break}
  case'dune':{g.fillStyle='rgba(255,240,190,.4)';g.beginPath();g.moveTo(-13,8);g.quadraticCurveTo(-3,-12,13,4);g.lineTo(13,8);g.closePath();g.fill();g.fillStyle='rgba(150,100,40,.35)';g.beginPath();g.moveTo(-3,-6);g.quadraticCurveTo(6,-5,13,4);g.lineTo(13,8);g.lineTo(0,8);g.closePath();g.fill();g.strokeStyle='rgba(140,95,35,.6)';g.lineWidth=1.3;g.beginPath();g.moveTo(-13,8);g.quadraticCurveTo(-3,-12,13,4);g.stroke();break}
  case'gravel':{for(let i=0;i<7;i++){g.fillStyle=i%2?'rgba(90,85,75,.5)':'rgba(255,255,255,.35)';g.beginPath();g.arc(-9+rr(i)*18,-7+rr(i+6)*14,1.3+rr(i+2)*1.2,0,7);g.fill()}break}
  case'drybush':{g.strokeStyle='#7d6a2f';g.lineWidth=1.3;for(let i=0;i<7;i++){const a=-Math.PI/2+(i-3)*.45;g.beginPath();g.moveTo(0,6);g.lineTo(Math.cos(a)*9,6+Math.sin(a)*11);g.stroke()}break}
  case'wadi':wave(13,-3,'rgba(110,75,30,.55)',1.8);wave(13,5,'rgba(110,75,30,.35)',1.2);break;
  case'crag':{g.fillStyle='#5c666c';g.beginPath();g.moveTo(-12,8);g.lineTo(-6,-8);g.lineTo(0,-1);g.lineTo(6,-11);g.lineTo(12,8);g.closePath();g.fill();g.fillStyle='#aab6bc';g.beginPath();g.moveTo(-6,-8);g.lineTo(-2,-2);g.lineTo(-8,-1);g.closePath();g.fill();g.beginPath();g.moveTo(6,-11);g.lineTo(9,-4);g.lineTo(3,-3);g.closePath();g.fill();break}
  case'peak':{g.fillStyle='#69757d';g.beginPath();g.moveTo(-13,8);g.lineTo(0,-14);g.lineTo(13,8);g.closePath();g.fill();g.fillStyle='#f4f8fa';g.beginPath();g.moveTo(0,-14);g.lineTo(5,-5);g.lineTo(1,-7);g.lineTo(-3,-4);g.lineTo(-5,-6);g.closePath();g.fill();break}
  case'snow':{g.fillStyle='rgba(120,160,190,.35)';for(let i=0;i<6;i++){g.beginPath();g.arc(-10+rr(i)*20,-8+rr(i+4)*16,1.4,0,7);g.fill()}g.strokeStyle='rgba(120,160,190,.4)';g.lineWidth=1;g.beginPath();g.moveTo(-9,4);g.quadraticCurveTo(-2,-2,9,3);g.stroke();break}
  case'scree':{for(let i=0;i<9;i++){g.fillStyle=i%2?'#667076':'#9aa4a9';const px=-10+rr(i)*20,py=-8+rr(i+5)*16;g.beginPath();g.moveTo(px-2,py+2);g.lineTo(px,py-2);g.lineTo(px+2.5,py+1.5);g.closePath();g.fill()}break}
  case'chasm':{g.strokeStyle='rgba(180,190,200,.45)';g.lineWidth=1.4;g.beginPath();g.moveTo(-12,-4);g.lineTo(-5,0);g.lineTo(-1,-6);g.lineTo(5,2);g.lineTo(12,-3);g.stroke();g.strokeStyle='rgba(0,0,0,.5)';g.beginPath();g.moveTo(-10,5);g.lineTo(-2,8);g.lineTo(4,4);g.lineTo(11,8);g.stroke();break}
  case'deep':wave(13,-4,'rgba(190,225,255,.35)');wave(13,5,'rgba(190,225,255,.25)');break;
  case'shallow':wave(13,-5,'rgba(235,250,255,.55)');wave(13,4,'rgba(235,250,255,.4)');g.fillStyle='rgba(210,200,160,.5)';g.beginPath();g.arc(-6,8,1.3,0,7);g.arc(7,7,1.1,0,7);g.fill();break;
  case'reeds':{g.strokeStyle='#2f6b3a';g.lineWidth=1.5;for(let i=0;i<6;i++){const px=-8+i*3.2,h=8+rr(i)*5;g.beginPath();g.moveTo(px,7);g.lineTo(px+rr(i+3)*2-1,7-h);g.stroke();g.fillStyle='#7a5a2e';g.fillRect(px-.8+rr(i+3)*2-1,7-h-3,1.8,4)}break}
  }
  g.restore()}

/* ---- otwieranie / zamykanie widoku ---- */
function openDetail(q,r,anim=true,force=false){
  if(!S||hold)return;
  const mi=meIdx();if(!force&&!spec&&S.pl[mi].seen[r*S.w+q]!='1')return;
  const wasOpen=!!FZ;FZ={q,r,force,sel:null,battle:null,zm:1,ox:0,oy:0,cells:makeCells(q,r,tt(q,r))};
  placeFz();fzw.classList.add('on');
  fzw.style.transition='none';fzw.style.transform='scale(1)';fzw.style.opacity='1';
  fzFull();
  if(anim&&!wasOpen){
    const rc=fzw.getBoundingClientRect(),b=cv.getBoundingClientRect(),[x,y]=C(q,r);
    const ox=Math.max(0,Math.min(rc.width,b.left+x*zoom-rc.left)),oy=Math.max(0,Math.min(rc.height,b.top+y*zoom-rc.top));
    const k0=Math.max(.04,Math.min(.5,R*zoom/(FZ.Rb||200)));
    fzw.style.transformOrigin=ox+'px '+oy+'px';fzw.style.transform='scale('+k0+')';fzw.style.opacity='0';
    void fzw.offsetWidth;
    fzw.style.transition='transform .5s cubic-bezier(.2,.8,.2,1),opacity .35s ease-out';
    fzw.style.transform='scale(1)';fzw.style.opacity='1';
  }
}
function closeDetail(){
  if(!FZ)return;const f=FZ;FZ=null;fzw.querySelector('#fzdie').style.display='none';
  const rc=fzw.getBoundingClientRect(),b=cv.getBoundingClientRect(),[x,y]=C(f.q,f.r);
  const ox=Math.max(0,Math.min(rc.width,b.left+x*zoom-rc.left)),oy=Math.max(0,Math.min(rc.height,b.top+y*zoom-rc.top));
  fzw.style.transformOrigin=ox+'px '+oy+'px';
  fzw.style.transition='transform .4s cubic-bezier(.5,0,.8,.4),opacity .3s ease-in';
  fzw.style.transform='scale('+Math.max(.04,Math.min(.5,R*zoom/(f.Rb||200)))+')';fzw.style.opacity='0';
  setTimeout(()=>{if(!FZ)fzw.classList.remove('on')},420);
}
function focusRefresh(){if(!FZ)return;if(hold){FZ=null;fzw.classList.remove('on');return}if(!FZ.battle)fzFull()}
function fzBack(){if(FZ&&FZ.battle){if(FZ.battle.phase==='over')ackBattle();return}closeDetail()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')fzBack()});
fzw.querySelector('#fzback').onclick=fzBack;
window.addEventListener('resize',()=>{if(FZ){placeFz();fzFull()}});
let fzRaf=0,fzD=null,fzMoved=false,fzJust=false;
function fzSched(){if(fzRaf)return;fzRaf=requestAnimationFrame(()=>{fzRaf=0;if(!FZ)return;fzGeom();buildBg();fzRedraw()})}
fzw.addEventListener('wheel',e=>{if(e.target.closest&&e.target.closest('#fzhud'))return;e.preventDefault();if(!FZ||!FZ.Wd)return;
  const b=fzw.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top,nz=Math.max(.5,Math.min(4,FZ.zm*(e.deltaY<0?1.15:1/1.15))),f=nz/FZ.zm;if(f===1)return;
  FZ.ox=px+(FZ.ccx-px)*f-FZ.bcx;FZ.oy=py+(FZ.ccy-py)*f-FZ.bcy;FZ.zm=nz;fzSched()},{passive:false});
fzc.addEventListener('mousedown',e=>{if(e.button!==0||!FZ)return;fzD={x:e.clientX,y:e.clientY,ox:FZ.ox,oy:FZ.oy};fzMoved=false});
window.addEventListener('mousemove',e=>{if(!fzD||!FZ)return;const dx=e.clientX-fzD.x,dy=e.clientY-fzD.y;if(!fzMoved&&Math.hypot(dx,dy)>5)fzMoved=true;if(fzMoved){FZ.ox=fzD.ox+dx;FZ.oy=fzD.oy+dy;fzc.style.cursor='grabbing';fzSched()}});
window.addEventListener('mouseup',()=>{if(fzD&&fzMoved){fzJust=true;setTimeout(()=>fzJust=false,80)}fzD=null;fzc.style.cursor=''});
fzw.querySelector('#fzreset').onclick=()=>{if(!FZ)return;FZ.zm=1;FZ.ox=0;FZ.oy=0;fzSched()};
/* ---- geometria, tło (cache), rysowanie ---- */
function fzGeom(){
  const Wd=fzw.clientWidth,Ht=fzw.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1),side=Wd>820;
  const availW=Wd-(side?300:0),zm=FZ.zm||1,Rb=Math.max(110,Math.min(availW*.30,Ht*.32))*zm,bcx=(side?300:0)+availW/2,bcy=Ht/2;
  FZ.ox=Math.max(-bcx,Math.min(Wd-bcx,FZ.ox||0));FZ.oy=Math.max(-bcy,Math.min(Ht-bcy,FZ.oy||0));
  Object.assign(FZ,{Wd,Ht,dpr,Rb,k:Rb/R,bcx,bcy,ccx:bcx+FZ.ox,ccy:bcy+FZ.oy,s:Rb/10});
  const z=document.getElementById('fzzv');if(z)z.textContent=Math.round(zm*100)+'%'}
function hexPath(g,x,y,rr){g.beginPath();for(let j=0;j<6;j++){const a=Math.PI/180*(60*j-30);g[j?'lineTo':'moveTo'](x+rr*Math.cos(a),y+rr*Math.sin(a))}g.closePath()}
function tileInfo(){
  const mi=meIdx(),V=vision(mi),{q,r}=FZ,i0=r*S.w+q,vis=!!V[i0]||!!FZ.force;
  FZ.vis=vis;FZ.ty=tt(q,r);
  FZ.units=vis?S.units.filter(u=>u.q==q&&u.r==r):[];
  FZ.city=vis?S.cities.find(c=>c.q==q&&c.r==r):null;FZ.house=vis&&(S.hs||[]).includes(i0);FZ.tower=vis&&(S.tw||[]).includes(i0);
  FZ.ow=S.own?+S.own[i0]:0;FZ.owners=[...new Set(FZ.units.map(u=>u.o))];
  FZ.bl=[FZ.city&&'🏰',FZ.house&&'🏠',FZ.tower&&'🗼'].filter(Boolean);
  const mid=FZ.cells.find(c=>c.a==0&&c.b==0);FZ.mid=mid;mid.block=false;applyStructs(FZ.cells,{city:FZ.city,house:FZ.house,tower:FZ.tower,q:FZ.q,r:FZ.r});
}
function buildBg(){
  const mi=meIdx(),V=vision(mi),seen=spec?'1'.repeat(S.w*S.h):S.pl[mi].seen,{q,r,Wd,Ht,dpr,Rb,k,ccx,ccy,s,cells}=FZ,[x0,y0]=C(q,r);
  const bg=document.createElement('canvas');bg.width=Wd*dpr;bg.height=Ht*dpr;
  const g=bg.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const prev=cx;cx=g;
  try{
    g.textAlign='center';g.textBaseline='middle';
    const rad=Math.ceil(Math.max(Wd,Ht)/(W*k))+2;
    for(let rr=Math.max(0,r-rad);rr<=Math.min(S.h-1,r+rad);rr++)for(let qq=Math.max(0,q-rad-1);qq<=Math.min(S.w-1,q+rad+1);qq++){
      if(qq==q&&rr==r)continue;const i=rr*S.w+qq;if(seen[i]!='1')continue;
      const[x,y]=C(qq,rr),px=ccx+(x-x0)*k,py=ccy+(y-y0)*k;
      if(px<-Rb||py<-Rb||px>Wd+Rb||py>Ht+Rb)continue;
      const ty=tt(qq,rr);hexPath(g,px,py,Rb-1.5);g.fillStyle=TC[ty];g.fill();
      g.save();g.globalAlpha=.34;g.fillStyle=ty===0?'#153d64':ty===1?'#82c9df':ty===2?'#f3d68b':ty===3?'#153e2c':ty===4?'#c0cbd0':'#b5d88b';hexPath(g,px,py,Rb-1.5);g.fill();g.restore();
      g.save();g.translate(px,py);g.scale(k,k);terrainArt(ty,0,0,qq,rr);g.restore();
      const ow=S.own?+S.own[i]:0;if(ow){g.save();g.globalAlpha=.23;g.fillStyle=N[S.pl[ow-1].ni].c;hexPath(g,px,py,Rb-1.5);g.fill();g.restore()}
      if(V[i]){
        g.font=(Rb*.55)+'px system-ui';
        const c=S.cities.find(c=>c.q==qq&&c.r==rr);if(c)g.fillText('🏰',px,py);else if((S.hs||[]).includes(i))g.fillText('🏠',px,py);else if((S.tw||[]).includes(i))g.fillText('🗼',px,py);
        const us=S.units.filter(u=>u.q==qq&&u.r==rr);
        us.forEach((u,j)=>{g.save();g.translate(px+(j-(us.length-1)/2)*Rb*.35,py+(c?Rb*.45:0));g.scale(k*.8,k*.8);drawAny(u,0,0,N[S.pl[u.o].ni].c,false,1);g.restore()});
      }else{g.save();g.globalAlpha=.55;g.fillStyle='#000';hexPath(g,px,py,Rb-1.5);g.fill();g.restore()}
      g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;hexPath(g,px,py,Rb-1.5);g.stroke();
    }
    {const d=rvData();if(d.segs.length)riverStroke(g,d.segs.filter(s=>(s.ia>=0&&seen[s.ia]=='1')||(s.ib>=0&&seen[s.ib]=='1')),(x,y)=>[ccx+(x-x0)*k,ccy+(y-y0)*k],k,1)}
    g.fillStyle='rgba(8,14,24,.38)';g.fillRect(0,0,Wd,Ht);
    // wybrane pole: mozaika podterenów
    const ow=FZ.ow,ty=FZ.ty;
    g.save();hexPath(g,ccx,ccy,Rb-1);g.clip();
    g.fillStyle=SUBT[ty].list[0].col;g.fillRect(ccx-Rb,ccy-Rb,2*Rb,2*Rb);
    const sv=q*7+r*3;
    cells.forEach(c=>{const x=ccx+c.ux*s,y=ccy+c.uy*s,t=c.sub;
      hexPath(g,x,y,s-.6);g.fillStyle=t.col;g.fill();
      g.save();g.globalAlpha=.07+c.n*.16;g.fillStyle=c.n>.5?'#fff':'#000';hexPath(g,x,y,s-.6);g.fill();g.restore();
      if(ow){g.save();g.globalAlpha=.10;g.fillStyle=N[S.pl[ow-1].ni].c;hexPath(g,x,y,s-.6);g.fill();g.restore()}
      if(t.hgt>0){g.save();g.globalAlpha=.10*t.hgt;g.fillStyle='#fff';hexPath(g,x,y,s-.6);g.fill();g.restore()}
      g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=1.1;hexPath(g,x,y,s-.6);g.stroke();
      if(c.n>.12||t.mv>=99||t.art=='stream'||t.st)subArt(g,t.art,x,y,s,c.n,sv+c.a*1.3+c.b*2.1);
      if(!c.play){g.save();g.globalAlpha=.22;g.fillStyle='#000';hexPath(g,x,y,s-.6);g.fill();g.restore()}
    });
    g.restore();
    g.strokeStyle='#f0d9ad';g.lineWidth=4;hexPath(g,ccx,ccy,Rb-1);g.stroke();
    {const d=rvData(),fi=r*S.w+q;if(d.segs.length)riverStroke(g,d.segs.filter(s=>s.ia==fi||s.ib==fi),(x,y)=>[ccx+(x-x0)*k,ccy+(y-y0)*k],k,.96)}
  }finally{cx=prev}
  FZ.bg=bg;
}
function fzFull(){
  if(!FZ)return;fzGeom();tileInfo();
  fzc.width=FZ.Wd*FZ.dpr;fzc.height=FZ.Ht*FZ.dpr;
  buildBg();
  // podgląd jednostek (poza bitwą)
  const{cells,s}=FZ,used=new Set(),inner=cells.filter(c=>inHex(c.ux,c.uy,8.9)&&c.sub.mv<99&&!c.block&&!(FZ.bl.length&&Math.hypot(c.ux,c.uy)<2.4)),place={};
  FZ.owners.forEach((o,si)=>{const lx=(si-(FZ.owners.length-1)/2)*9,col=N[S.pl[o].ni].c,us=FZ.units.filter(u=>u.o==o);
    const ord=inner.slice().sort((p,t)=>Math.hypot(p.ux-lx,p.uy)-Math.hypot(t.ux-lx,t.uy));
    us.forEach(u=>{const c=ord.find(c=>!used.has(c));if(!c)return;used.add(c);place[c.i]=[u,col]})});
  FZ.prev=place;
  fzHud();fzRedraw();
}
function fzRedraw(){
  if(!FZ)return;fzDraw();
  const act=()=>{const B=FZ&&FZ.battle,n=performance.now();return B&&(B.fl.length||(B.pr&&B.pr.length)||B.units.some(u=>u.anim&&n-u.anim.t0<u.anim.dur)||fzFxActive(n))};
  if(act()&&!fzAnim){fzAnim=true;const loop=()=>{if(!FZ){fzAnim=false;return}fzDraw();if(act())requestAnimationFrame(loop);else{fzAnim=false;fzDraw()}};requestAnimationFrame(loop)}
}
function upos(u,now){const{ccx,ccy,s,cells}=FZ,c=cells[u.cell];let x=ccx+c.ux*s,y=ccy+c.uy*s;
  if(u.anim){const t=Math.min(1,(now-u.anim.t0)/u.anim.dur);if(t<1){const f=cells[u.anim.from],e=1-Math.pow(1-t,3);x=ccx+(f.ux+(c.ux-f.ux)*e)*s;y=ccy+(f.uy+(c.uy-f.uy)*e)*s}}const o_=curOff(u.id,now);return[x+o_[0],y+o_[1]]}
/* ===== Animacja walki wręcz (tylko wizualna, nic nie jest zapisywane) ===== */
const eOut=t=>1-Math.pow(1-t,3),eIn=t=>t*t*t,eBack=t=>{const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
function curOff(id,now){const e=FZ&&FZ.off&&FZ.off[id];if(!e)return[0,0];const t=Math.min(1,(now-e.t0)/e.dur),k=e.ease(t);return[e.from[0]+(e.to[0]-e.from[0])*k,e.from[1]+(e.to[1]-e.from[1])*k]}
function fzGo(id,to,dur,ease){if(!FZ)return;const now=performance.now();FZ.off=FZ.off||{};FZ.off[id]={from:curOff(id,now),to,t0:now,dur,ease:ease||eOut};fzRedraw()}
function fzFx(o){if(!FZ)return;(FZ.fx=FZ.fx||[]).push(Object.assign({t0:performance.now()},o));fzRedraw()}
function fzShake(amp,dur){if(!FZ)return;FZ.shake={t0:performance.now(),amp,dur};fzRedraw()}
function fzBurst(x,y,n,cols,o){const p=[],a0=o.a==null?0:o.a,sp=o.sp==null?Math.PI*2:o.sp;for(let i=0;i<n;i++){const a=a0+(Math.random()-.5)*sp,v=.7+Math.random()*2.1;p.push({vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:cols[i%cols.length],line:!!o.line,r:.06+Math.random()*.07,g:o.g||0})}fzFx({k:'burst',x,y,p,dur:o.dur||500})}
function fzGeo(a,b){const{ccx,ccy,s,cells}=FZ,ca=cells[a.cell],cb=cells[b.cell],dx=(cb.ux-ca.ux)*s,dy=(cb.uy-ca.uy)*s,L=Math.hypot(dx,dy)||1;return{s,dx,dy,L,ux:dx/L,uy:dy/L,ax:ccx+ca.ux*s,ay:ccy+ca.uy*s,bx:ccx+cb.ux*s,by:ccy+cb.uy*s}}
function fzWindup(att,def,fast){if(!FZ)return;const g=fzGeo(att,def);fzGo(att.id,[-g.ux*g.s*.36,-g.uy*g.s*.36],fast?120:200,eOut)}
function fzImpact(att,def,o){if(!FZ)return;const g=o.g||fzGeo(att,def),s=g.s,ang=Math.atan2(g.uy,g.ux),bx=g.bx,by=g.by;
  if(o.melee)fzFx({k:'slash',cx:bx-g.ux*s*.55,cy:by-g.uy*s*.55,ang:ang+(Math.random()-.5)*.7,col:o.crit?'#ffd34d':'#ffb86b',big:o.crit,dur:o.crit?340:260});
  fzFx({k:'flash',x:bx,y:by,col:o.crit?'#fff1a8':'#fff',dur:o.crit?260:170});
  fzBurst(bx,by,o.crit?16:9,['#fff3c4','#ffd27a','#ffae42'],{line:1,a:ang,sp:2.6,dur:420});
  fzBurst(bx,by,o.crit?12:7,['#c0392b','#e74c3c','#8e2a22'],{a:ang,sp:2.2,g:2.4,dur:620});
  if(o.crit)fzFx({k:'ring',x:bx,y:by,col:'#ffd34d',dur:420});
  fzShake(o.crit?8:3.5,o.crit?360:200);sfx('clang');setTimeout(()=>sfx('thud'),30)}
async function fzStrike(att,def,hit,crit,fumb){
  if(!FZ)return;const g=fzGeo(att,def),s=g.s,px=-g.uy,py=g.ux;
  fzGo(att.id,[g.dx*.68,g.dy*.68],115,eIn);sfx('swish');await sleep(112);if(!FZ)return;
  if(hit){fzImpact(att,def,{crit,melee:true,g});const k=crit?.62:.34;
    fzGo(def.id,[g.ux*s*k,g.uy*s*k],80,eOut);
    setTimeout(()=>fzGo(def.id,[0,0],320,eBack),crit?210:150);
    setTimeout(()=>fzGo(att.id,[0,0],280,eOut),crit?200:130);
    await sleep(crit?120:80)}
  else{const sd=Math.random()<.5?1:-1;
    fzGo(def.id,[px*sd*s*.5-g.ux*s*.12,py*sd*s*.5-g.uy*s*.12],110,eOut);
    const mx=g.bx-g.ux*s*.75,my=g.by-g.uy*s*.75;
    fzBurst(mx,my,7,['#ffffff','#cfe3ff'],{line:1,a:Math.atan2(-g.uy,-g.ux),sp:2.4,dur:300});fzFx({k:'ring',x:mx,y:my,col:'#cfe3ff',dur:300});sfx('clang');
    setTimeout(()=>fzGo(def.id,[0,0],300,eOut),170);
    if(fumb)fzGo(att.id,[g.dx*.68-px*sd*s*.5,g.dy*.68-py*sd*s*.5],140,eOut);
    setTimeout(()=>fzGo(att.id,[0,0],300,eOut),fumb?260:170);
    await sleep(90)}}
function fzGhost(u,Bt,ang){if(!FZ)return;const{ccx,ccy,s,cells}=FZ,c=cells[u.cell],now=performance.now(),o=curOff(u.id,now);
  (FZ.gh=FZ.gh||[]).push({u,x:ccx+c.ux*s+o[0],y:ccy+c.uy*s+o[1],dx:Math.cos(ang)*.7,dy:Math.sin(ang)*.7,rot:(Math.random()<.5?-1:1)*(.9+Math.random()*.5),col:Bt.col[u.side],ni:Bt.civ[u.side],t0:now,dur:750});fzRedraw()}
function fzFxActive(n){return!!((FZ.fx&&FZ.fx.length)||(FZ.gh&&FZ.gh.length)||(FZ.shake&&n-FZ.shake.t0<FZ.shake.dur)||(FZ.off&&Object.values(FZ.off).some(e=>n-e.t0<e.dur)))}
function fzFxDraw(g,now,s){
  FZ.fx=(FZ.fx||[]).filter(f=>now-f.t0<f.dur);
  FZ.fx.forEach(f=>{const t=(now-f.t0)/f.dur;g.save();
    if(f.k==='slash'){const a0=f.ang-1.15,sw=2.3*Math.min(1,t*2.4);g.globalAlpha=Math.max(0,1-t*1.15);g.lineCap='round';g.shadowColor=f.col;g.shadowBlur=s*.8;
      g.strokeStyle='#fff';g.lineWidth=s*(f.big?.5:.34)*(1-t*.6);g.beginPath();g.arc(f.cx,f.cy,s*1.25,a0,a0+sw);g.stroke();
      g.strokeStyle=f.col;g.lineWidth=s*.14;g.beginPath();g.arc(f.cx,f.cy,s*1.43,a0+.1,a0+sw*.9);g.stroke()}
    else if(f.k==='burst'){f.p.forEach(p=>{const x=f.x+p.vx*t*s,y=f.y+p.vy*t*s+p.g*t*t*s;g.globalAlpha=Math.max(0,1-t*t);
      if(p.line){g.strokeStyle=p.c;g.lineWidth=Math.max(1,s*.07);g.beginPath();g.moveTo(x,y);g.lineTo(x-p.vx*.12*s,y-p.vy*.12*s);g.stroke()}
      else{g.fillStyle=p.c;g.beginPath();g.arc(x,y,Math.max(.5,p.r*s*(1-t*.5)),0,7);g.fill()}})}
    else if(f.k==='flash'){hexPath(g,f.x,f.y,s-2);g.globalAlpha=.75*(1-t);g.fillStyle=f.col;g.fill()}
    else if(f.k==='ring'){g.globalAlpha=1-t;g.strokeStyle=f.col;g.lineWidth=Math.max(.5,s*.22*(1-t));g.beginPath();g.arc(f.x,f.y,s*(.3+1.5*t),0,7);g.stroke()}
    g.restore()})}
function fzGhostDraw(g,now,s){
  FZ.gh=(FZ.gh||[]).filter(o=>now-o.t0<o.dur);
  FZ.gh.forEach(o=>{const t=(now-o.t0)/o.dur,e=1-Math.pow(1-t,2),k=s/15*(1-.3*t);g.save();g.translate(o.x+o.dx*e*s,o.y+o.dy*e*s+t*t*s*.4);g.rotate(o.rot*e);g.globalAlpha=Math.max(0,1-t*t);g.scale(k,k);drawAny(o.u,0,0,o.col,false,.15,o.ni);g.restore()})}
function fzDraw(){
  if(!FZ||!FZ.bg)return;
  const g=fzc.getContext('2d'),{Wd,Ht,dpr,ccx,ccy,s,cells}=FZ,now=performance.now(),Bt=FZ.battle;
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,Wd,Ht);
  let shx=0,shy=0;if(FZ.shake&&now-FZ.shake.t0<FZ.shake.dur){const a=FZ.shake.amp*(1-(now-FZ.shake.t0)/FZ.shake.dur);shx=(Math.random()-.5)*2*a;shy=(Math.random()-.5)*2*a}
  g.setTransform(dpr,0,0,dpr,shx*dpr,shy*dpr);g.drawImage(FZ.bg,0,0,Wd,Ht);
  const prev=cx;cx=g;
  try{
    g.textAlign='center';g.textBaseline='middle';
    const P=c=>[ccx+c.ux*s,ccy+c.uy*s];
    if(FZ.sel!=null&&cells[FZ.sel]&&!Bt){const[x,y]=P(cells[FZ.sel]);hexPath(g,x,y,s-1);g.strokeStyle='#fff';g.lineWidth=3;g.stroke();g.save();g.globalAlpha=.18;g.fillStyle='#fff';g.fill();g.restore()}
    if(!Bt){
      Object.entries(FZ.prev||{}).forEach(([ix,[u,col]])=>{const[x,y]=P(cells[ix]);hexPath(g,x,y,s-2);g.save();g.globalAlpha=.3;g.fillStyle=col;g.fill();g.restore();g.strokeStyle=col;g.lineWidth=2;g.stroke();
        g.save();g.translate(x,y);g.scale(s/15,s/15);drawAny(u,0,0,col,false,1);g.restore();if(MIL(u.k)){g.save();g.font='bold '+Math.round(s*.5)+'px system-ui';g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.8)';g.fillStyle='#fff';g.strokeText('100',x,y+s*.78);g.fillText('100',x,y+s*.78);g.restore()}});
    }else{
      const su=Bt.units.find(u=>u.id===Bt.sel);let R_=null;
      if(su&&canAct(Bt)&&su.side===Bt.turnSide){R_=getReach(Bt,su);
        R_.forEach((cost,ci)=>{const[x,y]=P(cells[ci]);hexPath(g,x,y,s-1.5);g.save();g.globalAlpha=.28;g.fillStyle='#7fc4ff';g.fill();g.restore();g.setLineDash([4,3]);g.strokeStyle='#bfe3ff';g.lineWidth=1.6;g.stroke();g.setLineDash([])});
        if(!su.attacked){const st=ustat(Bt,su);Bt.units.filter(e=>e.side!==su.side&&hd(cells[su.cell],cells[e.cell])<=st.rng).forEach(e=>{const[x,y]=P(cells[e.cell]);hexPath(g,x,y,s-1);g.save();g.globalAlpha=.30;g.fillStyle='#ff5a4d';g.fill();g.restore();g.strokeStyle='#ff6a5d';g.lineWidth=2.6;g.stroke()})}}
      const selU=Bt.units.find(x=>x.id===Bt.sel),selFb=selU?formBonus(Bt,selU):null,partner=new Set(selFb?selFb.tp.flatMap(f=>f.ids):[]);
      g.save();g.lineCap='round';Bt.units.forEach(u=>{const a=upos(u,now);formBonus(Bt,u).tp.forEach(f=>{const ki=FCK.indexOf(f.k);f.ids.forEach(id=>{const o=Bt.units.find(x=>x.id===id);if(!o)return;const b=upos(o,now),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,off=(ki-1.5)*s*.14,hl=selU&&(u.id===selU.id||o.id===selU.id);g.strokeStyle=FC[f.k][0];g.globalAlpha=hl?1:.75;g.lineWidth=Math.max(2,s*(hl?.2:.14));g.setLineDash([s*.45,s*.22]);g.beginPath();g.moveTo(a[0]-dy/L*off,a[1]+dx/L*off);g.lineTo(b[0]-dy/L*off,b[1]+dx/L*off);g.stroke()})})});g.restore();
      if(FZ.off)for(const id in FZ.off){const e=FZ.off[id];if(now-e.t0>=e.dur&&!e.to[0]&&!e.to[1])delete FZ.off[id]}
      fzGhostDraw(g,now,s);
      const pr_=u=>cells[u.cell].uy+Math.hypot(...curOff(u.id,now))/s*2,order=Bt.units.slice().sort((a,b)=>pr_(a)-pr_(b));
      order.forEach(u=>{const[x,y]=upos(u,now),o_=curOff(u.id,now),hx=x-o_[0],hy=y-o_[1],col=Bt.col[u.side],st=ustat(Bt,u),done=u.side===Bt.turnSide&&Bt.phase==='play'&&u.attacked&&u.mvLeft<=0;
        hexPath(g,hx,hy,s-2);g.save();g.globalAlpha=.3;g.fillStyle=col;g.fill();g.restore();g.strokeStyle=u.id===Bt.sel?'#fff':col;g.lineWidth=u.id===Bt.sel?3.2:2;g.stroke();
        g.save();g.globalAlpha=done?.55:1;g.translate(x,y);g.scale(s/15,s/15);drawAny(u,0,0,col,u.id===Bt.sel,Math.max(0,u.hp/st.hp),Bt.civ[u.side]);g.restore();if(MIL(u.k)){g.save();g.font='bold '+Math.round(s*.5)+'px system-ui';g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.8)';g.fillStyle='#fff';const tx=String(Math.max(1,Math.ceil(u.hp/st.hp*100)));g.strokeText(tx,hx,hy+s*.78);g.fillText(tx,hx,hy+s*.78);g.restore()}
        const bw=s*1.5,bh=Math.max(4,s*.2),bx=hx-bw/2,by=hy-s*1.05;g.fillStyle='rgba(0,0,0,.65)';g.fillRect(bx-1,by-1,bw+2,bh+2);
        const f=Math.max(0,u.hp/st.hp);g.fillStyle=f>.6?'#6fd36f':f>.3?'#e8c24a':'#e65a4d';g.fillRect(bx,by,bw*f,bh);if(u.cut){g.save();g.beginPath();g.arc(bx-s*.2,by+bh/2,s*.42,0,7);g.fillStyle='#d62d20';g.fill();g.strokeStyle='#fff';g.lineWidth=1.6;g.stroke();g.font='bold '+Math.round(s*.6)+'px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText('!',bx-s*.2,by+bh/2+1);g.restore()}});
      Bt.units.forEach(u=>{const tp=formBonus(Bt,u).tp;if(!tp.length)return;const[x,y]=upos(u,now),isP=partner.has(u.id)||(selU&&selU.id===u.id);g.save();
        tp.forEach((f,i)=>{hexPath(g,x,y,s-3-i*s*.13);g.strokeStyle=FC[f.k][0];g.lineWidth=Math.max(2,s*(isP?.16:.1));g.stroke()});
        g.textAlign='center';g.textBaseline='middle';g.font=Math.round(s*.42)+'px system-ui';
        tp.forEach((f,i)=>{const ix=x+(i-(tp.length-1)/2)*s*.75,iy=y-s*1.55;g.fillStyle=FC[f.k][0];g.beginPath();g.arc(ix,iy,s*.34,0,7);g.fill();g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=1.5;g.stroke();g.fillStyle='#fff';g.fillText(FC[f.k][1],ix,iy+1)});g.restore()});
      Bt.pr=(Bt.pr||[]).filter(pj=>now-pj.t0<650);
      Bt.pr.forEach(pj=>{const a=P(cells[pj.a]),b=P(cells[pj.b]);g.strokeStyle='#f2e3b3';g.lineWidth=Math.max(1.2,s*.07);for(let j=0;j<9;j++){const t=(now-pj.t0)/650*1.3-j*.045;if(t<=0||t>=1)continue;const at=u=>[a[0]+(b[0]-a[0])*u+Math.sin(j*2.1)*s*.35*Math.sin(u*Math.PI),a[1]+(b[1]-a[1])*u-Math.sin(u*Math.PI)*s*2.2],p1=at(t),p0=at(Math.max(0,t-.04));g.beginPath();g.moveTo(p0[0],p0[1]);g.lineTo(p1[0],p1[1]);g.stroke()}});
      fzFxDraw(g,now,s);
      Bt.fl=Bt.fl.filter(f=>now-f.t0<1100);
      Bt.fl.forEach(f=>{const t=(now-f.t0)/1100,[x,y]=P(cells[f.ci]);g.save();g.globalAlpha=1-t*t;g.font='bold '+Math.round(s*1.05)+'px system-ui';g.lineWidth=4;g.strokeStyle='rgba(0,0,0,.8)';g.fillStyle=f.col;g.strokeText(f.text,x,y-s*1.2-t*s*1.6);g.fillText(f.text,x,y-s*1.2-t*s*1.6);g.restore()});
      g.save();g.font='bold 15px system-ui';g.fillStyle='#f0d9ad';g.shadowColor='#000';g.shadowBlur=8;
      g.fillText(Bt.name+' · tura '+Bt.round+(Bt.phase==='play'?' · ruch: '+sideLabel(Bt,Bt.turnSide):''),Wd/2+(Wd>820?150:0),24);g.restore();
      if(Bt.phase==='over'){g.save();g.font='bold '+Math.round(Math.min(Wd*.07,64))+'px system-ui';g.textAlign='center';g.lineWidth=7;g.strokeStyle='rgba(0,0,0,.85)';
        g.fillStyle=resultInfo(Bt)[1]?'#ffe28a':'#ff8a7d';const tx=Wd/2+(Wd>820?150:0);const txt=resultInfo(Bt)[0];g.strokeText(txt,tx,Ht*.14);g.fillText(txt,tx,Ht*.14);g.restore()}
    }
  }finally{cx=prev}
}

/* ---- panel boczny ---- */
const nmP=n=>`${esc(S.pl[n].name)}${n===meIdx()?' ('+N[S.pl[n].ni].n+')':''}`;
function fzHud(){
  if(!FZ)return;
  if(FZ.battle)return hudBattle();
  const{q,r,ty,vis,units,owners,city,house,tower,ow,cells}=FZ;
  const cnt={};cells.forEach(c=>{if(c.play)cnt[c.sub.k]=(cnt[c.sub.k]||0)+1});
  const play=cells.filter(c=>c.play).length;
  let h=`<h3>${T[ty]}</h3><small>Pole ${q+1}:${r+1} · ${cells.length} pól taktycznych</small>`;
  h+=`<h4>Rodzaje terenu na polu</h4>`;
  SUBT[ty].list.concat(SUBT[ty].ridge?[SUBT[ty].ridge.t]:[],[ST_KEEP,ST_WALL,ST_GATE,ST_ROOFS,ST_HOUSE,ST_YARD,ST_TOWER,ST_PAL]).filter(t=>cnt[t.k]).map(t=>t.st?((cells.find(c=>c.sub.k==t.k)||{}).sub||t):t).forEach(t=>{
    h+=`<div class="lg"><i style="background:${t.col}"></i><span><b>${t.n}</b> <small>×${cnt[t.k]}</small><br><small>${fxText(t)}</small></span></div>`});
  h+=`<h4>Pole</h4><div class="kv"><span>Właściciel</span><b>${ow?nmP(ow-1):'brak'}</b></div><div class="kv"><span>Widoczność</span><b>${vis?'aktualna':'zapamiętane'}</b></div>`;
  const st=[];if(city)st.push('🏰 Miasto '+esc(city.nm||'')+((city.lv||1)>1?' ('+'★'.repeat((city.lv||1)-1)+') ':'')+' – '+nmP(city.o));if(house)st.push('🏠 Domek');if(tower)st.push('🗼 Wieża');
  if(st.length)h+=st.map(x=>`<div class="kv"><span>${x}</span></div>`).join('');
  {const d=rvData(),fi=r*S.w+q,n=d.segs.filter(s=>s.ia==fi||s.ib==fi).length;if(n)h+=`<div class="kv"><span>🌊 Rzeka na granicy pola</span><b>${n} odc.</b></div><small>Przeprawa: +2 ruchu. Atak przez rzekę: napastnik −1 atak, obrońca +1 obrona.</small>`}
  h+=`<h4>Jednostki</h4>`;
  if(!vis)h+='<small>Poza zasięgiem widzenia – brak aktualnych danych.</small>';
  else if(!units.length)h+='<small>Pusto.</small>';
  else owners.forEach(o=>{const us=units.filter(u=>u.o==o);h+=`<div class="sd" style="border-left-color:${N[S.pl[o].ni].c}"><b>${nmP(o)}</b><br>`+['W','A','S','C'].filter(kk=>us.some(u=>u.k==kk)).map(kk=>`${us.filter(u=>u.k==kk).length}× ${UN[kk]}`).join(', ')+'</div>'});
  h+=`<h4>Bitwa</h4><small>Bitwa taktyczna zaczyna się, gdy ktoś wkroczy wojownikiem na pole z wrogiem – atakujący i obrońca grają ją naprzemiennie (AI steruje się samo).</small>`;
  h+=`<p><small>Kliknij małe pole, by je zaznaczyć. Najedź kursorem, by zobaczyć jego cechy. Kliknij sąsiedni heks, by przejść do niego. <b>Kółko myszy</b> przybliża/oddala widok, a przeciągnięcie myszą go przesuwa.</small></p>`;
  fzhud.innerHTML=h;
}
fzc.addEventListener('mousemove',e=>{
  if(!FZ||!FZ.cells||!FZ.s){return}
  const b=fzc.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top,{ccx,ccy,s,cells,Rb}=FZ;
  if(!inHex(px-ccx,py-ccy,Rb)){fzhint.style.display='none';return}
  let bi=-1,bd=1e9;cells.forEach(c=>{const d=(ccx+c.ux*s-px)**2+(ccy+c.uy*s-py)**2;if(d<bd){bd=d;bi=c.i}});
  const c=cells[bi];let t=`<b>${c.sub.n}</b> · ${fxText(c.sub)}`;
  const Bt=FZ.battle;
  if(Bt){const u=Bt.units.find(u=>u.cell===bi);if(u){const st=ustat(Bt,u);t+=`<br>${u.side===viewSide(Bt)?'Twój':'Wrogi'} ${BU[u.k].n}: HP ${u.hp}/${st.hp} · atak +${st.atk} · obrona ${st.def}`+(formBonus(Bt,u).names.length?'<br><span style="color:#f0cc83">⚜ '+formBonus(Bt,u).names.join(', ')+'</span>':'');
      const su=Bt.units.find(x=>x.id===Bt.sel);if(su&&u.side!==su.side&&canAct(Bt)&&!su.attacked&&hd(cells[su.cell],c)<=ustat(Bt,su).rng){const h=calcHit(Bt,su,u,su.cell,0);t+=`<br>Szansa trafienia ≈ <b>${Math.round(hitProb(h.mod,h.need)*100)}%</b>${h.flank?' (okrążenie +1)':''}${h.hg?' (wysokość +'+h.hg+')':''}`}}
    else if(!c.play)t+='<br><small>Krawędź pola – nie można tu wejść</small>'}
  fzhint.innerHTML=t;fzhint.style.display='block';
});
fzc.addEventListener('mouseleave',()=>{fzhint.style.display='none'});
fzc.addEventListener('click',e=>{
  if(fzJust||!FZ||!FZ.cells)return;
  const b=fzc.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top,{ccx,ccy,Rb,k,cells,s,q,r}=FZ;
  if(FZ.battle)return battleClick(px,py);
  if(inHex(px-ccx,py-ccy,Rb)){
    let bi=-1,bd=1e9;cells.forEach((c,i)=>{const d=(ccx+c.ux*s-px)**2+(ccy+c.uy*s-py)**2;if(d<bd){bd=d;bi=i}});
    FZ.sel=FZ.sel===bi?null:bi;sfx('tap');fzDraw();return}
  const[x0,y0]=C(q,r),x=x0+(px-ccx)/k,y=y0+(py-ccy)/k;let best=null,bd=1e9;
  for(let rr=0;rr<S.h;rr++)for(let qq=0;qq<S.w;qq++){const[tx,ty]=C(qq,rr),d=(tx-x)**2+(ty-y)**2;if(d<bd){bd=d;best=[qq,rr]}}
  if(best&&bd<=R*R&&!(best[0]==q&&best[1]==r))openDetail(best[0],best[1],false);
});

/* ================= BITWA TAKTYCZNA ================= */
/* Zasady (szkic): k20 + atak ≥ 10 + obrona + osłona pola. 20 = trafienie krytyczne (×2 obrażeń), 1 = pudło.
   Wysokość: +1 do ataku za każdy poziom przewagi. Okrążenie: +1, gdy sojusznik stoi przy celu. Kontratak w zwarciu: −2. */
const BU={W:{n:'Wojownik',hp:12,atk:3,def:2,die:6,db:1,mov:3,rng:1},A:{n:'Łucznik',hp:9,atk:2,def:1,die:6,db:0,mov:3,rng:3},C:{n:'Zwiadowca',hp:7,atk:1,def:1,die:4,db:0,mov:5,rng:2},S:{n:'Osadnik',hp:5,atk:0,def:0,die:3,db:0,mov:2,rng:1}};
const FC={mur:['#ffd34d','🛡','Mur tarcz'],wsp:['#ff8a3d','🏹','Wsparcie łuczników'],osl:['#4dd0e1','🔰','Osłona wojowników'],sal:['#ff6bb5','🎯','Salwa']},FCK=Object.keys(FC);
/* Formacje: bonusy za ustawienie wojsk (liczone na bieżąco z pozycji jednostek) */
function formBonus(Bt,u){const r={atk:0,def:0,names:[],links:[],tp:[]};if(!FZ||!FZ.cells)return r;const cl=FZ.cells,me=cl[u.cell];if(!me)return r;
  const al=Bt.units.filter(x=>x.side===u.side&&x.id!==u.id&&cl[x.cell]),near=n=>al.filter(x=>hd(cl[x.cell],me)<=n),adj=near(1);
  if(u.k==='W'){const w=adj.filter(x=>x.k==='W');if(w.length>=2){r.def++;r.names.push('Mur tarcz (+1 obrona)');r.tp.push({k:'mur',ids:w.map(x=>x.id)});r.links.push(...w.map(x=>x.id))}
    const a=near(2).filter(x=>x.k==='A');if(a.length){r.atk++;r.names.push('Wsparcie łuczników (+1 atak)');r.tp.push({k:'wsp',ids:a.map(x=>x.id)});r.links.push(...a.map(x=>x.id))}}
  if(u.k==='A'){const w=adj.filter(x=>x.k==='W');if(w.length){r.def++;r.names.push('Osłona wojowników (+1 obrona)');r.tp.push({k:'osl',ids:w.map(x=>x.id)});r.links.push(...w.map(x=>x.id))}
    const a=near(2).filter(x=>x.k==='A');if(a.length){r.atk++;r.names.push('Salwa (+1 atak)');r.tp.push({k:'sal',ids:a.map(x=>x.id)});r.links.push(...a.map(x=>x.id))}}
  return r}
function ustat(Bt,u){const b=BU[u.k],ni=Bt.civ[u.side],fb=formBonus(Bt,u);return{hp:b.hp,atk:b.atk+fb.atk+(ni==1?1:0)-([0,2,4].includes(ni)?1:0)-(u.cut?1:0)-(Bt.rvx&&u.side===0&&u.rv?1:0),def:b.def+fb.def+(ni==4?1:0)-([1,3,5].includes(ni)?1:0)-(u.cut?1:0)+(u.side===1?(Bt.defB||0):0),die:b.die,db:b.db,mov:b.mov+(ni==3?1:0),rng:b.rng}}
const nmU=(B,u)=>BU[u.k].n+' ('+sideLabel(B,u.side)+')';
function hitProb(mod,need){let c=0;for(let r=2;r<=19;r++)if(r+mod>=need)c++;return(c+1)/20}
function calcHit(Bt,att,def,from,pen){
  const A=ustat(Bt,att),D=ustat(Bt,def),cells=FZ.cells,ac=cells[from],dc=cells[def.cell];
  const flank=Bt.units.some(x=>x.side==att.side&&x.id!==att.id&&hd(cells[x.cell],dc)==1)?1:0,hg=Math.max(0,ac.sub.hgt-dc.sub.hgt);
  const rp=att.k==='A'&&hd(ac,dc)===1?-2:0;return{mod:A.atk+hg+flank+(pen||0)+rp,need:10+D.def+dc.sub.cov,flank,hg}
}
function blog(Bt,t,cls){Bt.log.push({t,cls});if(Bt.log.length>40)Bt.log.shift()}
function getReach(Bt,u){
  if(Bt._rc&&Bt._rc.ver===Bt.ver&&Bt._rc.id===u.id)return Bt._rc.m;
  const cells=FZ.cells,dist=new Map([[u.cell,0]]),pq=[[0,u.cell]],occ=new Map(Bt.units.map(x=>[x.cell,x]));
  while(pq.length){pq.sort((a,b)=>a[0]-b[0]);const[d,ci]=pq.shift();if(d>dist.get(ci))continue;
    for(const nb of cells[ci].nb){const c=cells[nb];if(!c.play||c.sub.mv>=99||c.block)continue;const o=occ.get(nb);if(o&&o.side!==u.side)continue;
      const nd=d+c.sub.mv;if(nd>u.mvLeft)continue;if(nd<(dist.has(nb)?dist.get(nb):1e9)){dist.set(nb,nd);pq.push([nd,nb])}}}
  const m=new Map();dist.forEach((d,ci)=>{if(!occ.has(ci))m.set(ci,d)});
  Bt._rc={ver:Bt.ver,id:u.id,m};return m}
const aiSide=(B,s)=>!!S.pl[s?B.defP:B.atkP].ai,sideLabel=(B,s)=>S.pl[s?B.defP:B.atkP].name,isPart=B=>local||meIdx()===B.atkP||meIdx()===B.defP;
const viewSide=B=>local?(aiSide(B,0)?1:aiSide(B,1)?0:B.turnSide):(meIdx()===B.defP?1:0);
const canAct=B=>!!B&&B.phase==='play'&&!aiSide(B,B.turnSide)&&(local||meIdx()===(B.turnSide?B.defP:B.atkP));
const bothHuman=B=>local&&!aiSide(B,0)&&!aiSide(B,1),isFin=B=>local||meIdx()===(S.pl[B.atkP].ai?B.defP:B.atkP);
function bsave(B){B.sv=(B.sv||0)+1;S.bt=B;save()}
function resultInfo(B){if(B.retreat)return['WYCOFANIE',true];if(bothHuman(B))return['WYGRYWA '+sideLabel(B,B.win).toUpperCase(),true];return B.win===viewSide(B)?['ZWYCIĘSTWO',true]:['PORAŻKA',false]}
function initBattle(atkP,A0,D0,q,r){
  const defP=D0[0].o,ty=tt(q,r),i0=r*S.w+q,cells=makeCells(q,r,ty),city=S.cities.find(c=>c.q==q&&c.r==r),house=(S.hs||[]).includes(i0),tower=(S.tw||[]).includes(i0),blk=!!(city||house||tower);
  applyStructs(cells,{city,house,tower,q,r});
  const A=A0.slice(0,20),D=D0.slice(0,20),myNi=S.pl[atkP].ni,foeNi=S.pl[defP].ni,ec=S.cities.find(c=>c.q==q&&c.r==r&&c.o!=atkP),defB=A.some(a=>riverX(a.q,a.r,q,r))?1:0;
  const Bt={id:Date.now().toString(36)+rnd(1e6).toString(36),name:battleName(q,r,ty,city,house,tower),q,r,atkP,defP,blk,atkIds:A.map(u=>u.id),defIds:D.map(u=>u.id),units:[],civ:[myNi,foeNi],col:[N[myNi].c,N[foeNi].c],defB,round:1,turnSide:0,phase:'play',win:null,retreat:false,log:[],nid:1,sv:1,ack:[],sel:null,fl:[],ver:0,busy:false};
  Bt.rvx=!!defB;
  const[ox,oy]=C(A[0].q,A[0].r),[tx,ty2]=C(q,r);let vx=ox-tx,vy=oy-ty2;const nn=Math.hypot(vx,vy);if(nn<1){vx=-1;vy=0}else{vx/=nn;vy/=nn}
  const free=cells.filter(c=>c.play&&c.sub.mv<99&&!c.block),used=new Set();
  [[A,vx*5.6,vy*5.6],[D,-vx*5.6,-vy*5.6]].forEach(([list,lx,ly],side)=>{
    let ord=free.slice().sort((a,b)=>Math.hypot(a.ux-lx,a.uy-ly)-Math.hypot(b.ux-lx,b.uy-ly));
    if(side===1)ord=[...free.filter(c=>c.sub.st).sort((a,b)=>b.sub.cov-a.sub.cov||Math.hypot(a.ux,a.uy)-Math.hypot(b.ux,b.uy)),...ord.filter(c=>!c.sub.st)];
    list.forEach(g=>{const c=ord.find(c=>!used.has(c.i));if(!c)return;used.add(c.i);Bt.units.push({id:Bt.nid++,gid:g.id,side,k:g.k,hp:0,cell:c.i,mvLeft:0,attacked:false,cut:isCut(g.o,g.q,g.r),rv:side===0&&riverX(g.q,g.r,q,r)})})});
  Bt.units.forEach(u=>{const st=ustat(Bt,u);u.hp=st.hp;u.mvLeft=st.mov});
  [0,1].forEach(sd=>{if(Bt.units.some(u=>u.side===sd&&u.cut))blog(Bt,sideLabel(Bt,sd)+' jest okrążony i odcięty od własnego królestwa: −1 atak i −1 obrona.','')});
    blog(Bt,`${Bt.name}! ${S.pl[atkP].name} atakuje ${S.pl[defP].name}: ${Bt.units.filter(u=>!u.side).length} vs ${Bt.units.filter(u=>u.side).length}${defB?' (obrońcy +'+defB+' do obrony)':''}.`);
    if(city||house||tower)blog(Bt,'Fortyfikacje dają dużą osłonę stojącym na nich jednostkom (cytadela i wieża +4, mury +3, domek +3).','win');
    if(defB)blog(Bt,'Atak przez rzekę! Napastnicy −1 do ataku, obrońcy +1 do obrony.','');
  return Bt}
function beginBattle(atk,en,q,r){const Bt=initBattle(atk[0].o,atk,en,q,r);S.bt=Bt;save();openBattleView(Bt)}
function startAIBattle(atk,en,q,r){S.bt=initBattle(atk[0].o,atk,en,q,r);const dp=en[0].o;
  if(local){lastH=dp;if(S.pl.filter(x=>!x.ai).length>1){hold=true;holdFor=dp}}}
function openBattleView(B){
  openDetail(B.q,B.r,true,true);if(!FZ)return;
  Object.assign(B,{sel:null,fl:[],ver:0,busy:false,aiRun:false});B.ack=B.ack||[];B.units.forEach(u=>{u.anim=null});
  FZ.cells.find(c=>c.a==0&&c.b==0).block=false;FZ.battle=B;S.bt=B;FZ.sel=null;
  fzw.querySelector('#fzdie').style.display='block';fzw.querySelector('#fzdn').textContent='–';fzw.querySelector('#fzdielbl').textContent='k20';
  fzw.querySelector('#fzback').style.display='none';document.body.classList.add('inbattle');
  try{sfx('fight')}catch(e){}
  fzHud();fzRedraw();setTimeout(()=>battleAIRun(B),700)}
function closeBattleView(){if(!FZ)return;FZ.battle=null;fzw.querySelector('#fzdie').style.display='none';fzw.querySelector('#fzback').style.display='';fzhint.style.display='none';document.body.classList.remove('inbattle');closeDetail()}
function adoptState(ns){const B=FZ&&FZ.battle;
  if(B&&ns){if(ns.bt&&ns.bt.id===B.id){if((ns.bt.sv||0)>(B.sv||0))syncBattleFrom(B,ns.bt);ns.bt=B}else if(!ns.bt&&B.phase!=='over'&&!B.fin)ns.bt=B}
  S=ns}
function syncBattleFrom(B,R){if(B.busy||B.aiRun)return;const now=performance.now(),old=new Map(B.units.map(u=>[u.id,u]));
  R.units.forEach(n=>{const o=old.get(n.id);if(!o)return;if(o.cell!==n.cell)n.anim={from:o.cell,t0:now,dur:240};if(n.hp<o.hp)B.fl.push({ci:n.cell,text:'−'+(o.hp-n.hp),col:'#ff6b5e',t0:now})});
  old.forEach((o,id)=>{if(!R.units.some(n=>n.id===id))B.fl.push({ci:o.cell,text:'✖',col:'#ffd34d',t0:now})});
  ['units','round','turnSide','phase','win','retreat','log','ack','nid','sv'].forEach(k=>B[k]=R[k]);B.sel=null;B.ver++;needBR=true}
function battleHook(){
  if(!S||hold)return;const B=S.bt,cur=FZ&&FZ.battle;
  if(!B){if(cur)closeBattleView();return}
  if(!isPart(B))return;
  if(cur&&cur.id===B.id){if(needBR){needBR=false;fzHud();fzRedraw()}tryFinalize(cur);battleAIRun(cur);return}
  if(cur)closeBattleView();openBattleView(B)}
const UPRICE={W:15,A:20,S:15,C:8};
function battleLosses(Bt){const alive=new Set(Bt.units.map(u=>u.gid));return[Bt.atkIds,Bt.defIds].map(ids=>{const L={W:0,A:0,S:0,C:0};ids.forEach(id=>{if(alive.has(id))return;const u=S.units.find(x=>x.id==id);if(u&&L[u.k]!=null)L[u.k]++});const gold=Object.keys(L).reduce((a,k)=>a+L[k]*UPRICE[k],0),n=Object.values(L).reduce((a,b)=>a+b,0);return{L,gold,n}})}
function battleSummaryHtml(Bt){const NM={W:'Wojownik',A:'Łucznik',S:'Osadnik',C:'Zwiadowca'},R=battleLosses(Bt);let h='<h4>Podsumowanie strat</h4>';[0,1].forEach(s=>{const r=R[s];h+=`<div class="sd" style="border-left-color:${Bt.col[s]}"><b>${s?'🛡':'⚔'} ${esc(sideLabel(Bt,s))}</b>: `+(r.n?Object.keys(r.L).filter(k=>r.L[k]).map(k=>`${NM[k]} ×${r.L[k]}`).join(', ')+` · <b>${r.n}</b> jedn. (~${r.n*100} żołn.) · wartość <b>${r.gold} 🪙</b>`:'brak strat')+'</div>'});return h}
function ackBattle(){const B=FZ&&FZ.battle;if(!B||B.phase!=='over')return;
  if(local)[B.atkP,B.defP].filter(p=>!S.pl[p].ai).forEach(p=>{if(!B.ack.includes(p))B.ack.push(p)});else if(!B.ack.includes(meIdx()))B.ack.push(meIdx());
  bsave(B);fzHud();tryFinalize(B)}
function tryFinalize(B){if(!B||B.phase!=='over'||B.fin||!isFin(B))return;if([B.atkP,B.defP].filter(p=>!S.pl[p].ai).every(p=>B.ack.includes(p)))finishBattle()}
function retreatBattle(){const B=FZ&&FZ.battle;if(!B||B.busy||!canAct(B)||B.turnSide!==0)return;
  if(!confirm('Wycofać oddział? Polegli do tej pory zostaną straceni, ocaleli wrócą na swoje pole.'))return;
  B.phase='over';B.win=1;B.retreat=true;B.sel=null;B.ack=[];blog(B,sideLabel(B,0)+' wycofuje się z bitwy.','lose');bsave(B);ackBattle()}
function finishBattle(){
  const Bt=FZ&&FZ.battle;if(!Bt||Bt.phase!=='over'||Bt.fin)return;Bt.fin=true;
  const ids0=new Set(Bt.atkIds),ids1=new Set(Bt.defIds),alive=new Set(Bt.units.map(u=>u.gid));
  {const cnt=ids=>ids.filter(i=>!alive.has(i)&&MIL((S.units.find(x=>x.id==i)||{}).k)).length,la=cnt(Bt.atkIds),ld=cnt(Bt.defIds),aw=Bt.win===0;recB(aw?Bt.atkP:Bt.defP,aw?Bt.defP:Bt.atkP,aw?ld:la,aw?la:ld)}
  S.units=S.units.filter(x=>!((ids0.has(x.id)||ids1.has(x.id))&&!alive.has(x.id)));
  const at=S.units.filter(x=>ids0.has(x.id));at.forEach(x=>{x.mp=0});
  const left=S.units.filter(x=>x.q==Bt.q&&x.r==Bt.r&&x.o!=Bt.atkP),vs=viewSide(Bt),att=vs===0,me=Bt.atkP;
  if(!Bt.retreat&&Bt.win===0&&!left.length&&at.length){
    at.forEach(x=>{const old={q:x.q,r:x.r};x.q=Bt.q;x.r=Bt.r;try{animateMove(x,old,{q:Bt.q,r:Bt.r})}catch(e){}});
    const ec=S.cities.find(k=>k.q==Bt.q&&k.r==Bt.r&&k.o!=me);
    if(ec){ec.o=me;claim(me,Bt.q,Bt.r,1,2);msg=att?'Bitwa wygrana – miasto zdobyte!':'Wróg zdobył miasto!'}else{claim(me,Bt.q,Bt.r,0,1);msg=att?'Bitwa wygrana! Pole zajęte.':'Wróg zajął pole.'}
    try{sfx('win')}catch(e){}
  }else msg=Bt.retreat?(att?'Wycofano się z bitwy.':'Wróg wycofał się z bitwy.'):Bt.win===vs?(att?'Bitwa wygrana, lecz na polu zostali wrogowie.':'Obroniłeś pole!'):'Bitwa przegrana.';
  S.bt=null;sel=null;closeBattleView();chk();save();render()}
async function rollDie(sides,label){
  const v=1+Math.floor(Math.random()*sides),dn=fzw.querySelector('#fzdn');fzw.querySelector('#fzdielbl').textContent=label+' · k'+sides;
  for(let t=0;t<8;t++){dn.textContent=1+Math.floor(Math.random()*sides);await sleep(55)}
  dn.textContent=v;return v}
function checkEnd(Bt){const a=Bt.units.some(u=>!u.side),b=Bt.units.some(u=>u.side);if(a&&b)return false;
  Bt.phase='over';Bt.win=a?0:1;Bt.sel=null;Bt.busy=false;Bt.ack=[];blog(Bt,`Koniec bitwy – wygrywa ${sideLabel(Bt,Bt.win)}!`,'win');return true}
async function doAttack(Bt,att,def,isCounter){
  const h=calcHit(Bt,att,def,att.cell,isCounter?-2:0),A=ustat(Bt,att),melee=att.k!=='A'&&A.rng<=1,live=()=>FZ&&FZ.battle===Bt;
  if(att.k==='A'){(Bt.pr=Bt.pr||[]).push({a:att.cell,b:def.cell,t0:performance.now()});fzRedraw();await sleep(520);if(!live())return}
  else if(melee)fzWindup(att,def,isCounter);
  const nat=await rollDie(20,isCounter?'Kontratak':'Trafienie');if(!live())return;
  const crit=nat===20,fumb=nat===1,hit=crit||(!fumb&&nat+h.mod>=h.need);
  if(melee)await fzStrike(att,def,hit,crit,fumb);else if(hit)fzImpact(att,def,{crit,melee:false});
  if(!live())return;
  let line=`${isCounter?'↩ ':''}${nmU(Bt,att)} → ${nmU(Bt,def)}: k20=${nat}${h.mod>=0?'+':''}${h.mod} vs ${h.need}`,dmg=0;
  if(hit){const d=await rollDie(A.die,'Obrażenia');if(!live())return;dmg=(d+A.db)*(crit?2:1);
    line+=` → ${crit?'KRYTYK! ':'trafienie, '}${dmg} obr.`;def.hp-=dmg;Bt.fl.push({ci:def.cell,text:'−'+dmg,col:crit?'#ffd34d':'#ff6b5e',t0:performance.now()})}
  else{line+=fumb?' → pudło (1)':' → pudło';Bt.fl.push({ci:def.cell,text:'pudło',col:'#cfd8e3',t0:performance.now()})}
  blog(Bt,line,hit?(crit?'crit':'hit'):'miss');
  if(def.hp<=0){const gg=fzGeo(att,def);fzGhost(def,Bt,Math.atan2(gg.uy,gg.ux));Bt.units=Bt.units.filter(u=>u!==def);blog(Bt,`✖ ${nmU(Bt,def)} poległ.`,'lose');if(Bt.sel===def.id)Bt.sel=null}
  Bt.ver++;if(!isCounter){att.attacked=true;att.mvLeft=0}
  const over=checkEnd(Bt);bsave(Bt);fzHud();fzRedraw();if(over)return;
  if(!isCounter&&def.hp>0&&hd(FZ.cells[att.cell],FZ.cells[def.cell])<=ustat(Bt,def).rng){await sleep(380);if(!live())return;await doAttack(Bt,def,att,true)}
}
async function moveUnit(Bt,u,ci,cost){u.anim={from:u.cell,t0:performance.now(),dur:240};u.cell=ci;u.mvLeft-=cost;Bt.ver++;bsave(Bt);fzHud();fzRedraw();await sleep(260);u.anim=null}
async function battleClick(px,py){
  const Bt=FZ.battle,{ccx,ccy,s,cells}=FZ;if(!Bt||Bt.busy||!canAct(Bt))return;
  let bi=-1,bd=1e9;cells.forEach(c=>{const d=(ccx+c.ux*s-px)**2+(ccy+c.uy*s-py)**2;if(d<bd){bd=d;bi=c.i}});
  if(bd>s*s*1.1||!cells[bi].play){Bt.sel=null;Bt.ver++;fzHud();fzRedraw();return}
  const at=Bt.units.find(u=>u.cell===bi),su=Bt.units.find(u=>u.id===Bt.sel&&u.side===Bt.turnSide);
  if(at&&at.side===Bt.turnSide){Bt.sel=at.id;Bt.ver++;fzHud();fzRedraw();return}
  if(!su)return;
  if(at&&at.side!==su.side&&!su.attacked&&hd(cells[su.cell],cells[bi])<=ustat(Bt,su).rng){Bt.busy=true;fzHud();await doAttack(Bt,su,at,false);if(FZ&&FZ.battle===Bt&&Bt.phase==='play')Bt.busy=false;fzHud();fzRedraw();return}
  const R_=getReach(Bt,su);
  if(!at&&R_.has(bi)){Bt.busy=true;await moveUnit(Bt,su,bi,R_.get(bi));Bt.busy=false;fzHud();fzRedraw();return}
  Bt.sel=null;Bt.ver++;fzHud();fzRedraw()}
async function aiAct(Bt,u){
  const cells=FZ.cells,st=ustat(Bt,u);u.mvLeft=st.mov;u.attacked=false;
  const foes=Bt.units.filter(x=>x.side!==u.side);if(!foes.length)return;
  const R_=getReach(Bt,u),opts=[[u.cell,0],...R_];let best=null;const ff=ci=>{const f=formBonus(Bt,Object.assign({},u,{cell:ci}));return(f.atk+f.def)*.9};const avg=(st.die+1)/2+st.db;
  opts.forEach(([ci,cost])=>foes.forEach(e=>{const d=hd(cells[ci],cells[e.cell]);if(d>st.rng||d<1)return;
    const h=calcHit(Bt,Object.assign({},u,{cell:ci}),e,ci,0),p=hitProb(h.mod,h.need);
    const sc=p*avg+(e.hp<=avg?3:0)+cells[ci].sub.cov*.7+cells[ci].sub.hgt*.6-cost*.05+(st.rng>1&&d>1?1.2:0)+ff(ci);
    if(!best||sc>best.sc)best={sc,ci,cost,e}}));
  if(best){if(best.ci!==u.cell){await moveUnit(Bt,u,best.ci,best.cost);if(!FZ||FZ.battle!==Bt)return}await doAttack(Bt,u,best.e,false);return}
  let bc=null;const near=ci=>Math.min(...foes.map(e=>hd(cells[ci],cells[e.cell])));
  opts.forEach(([ci,cost])=>{const sc=(st.rng>1?Math.abs(near(ci)-st.rng):near(ci))*10-cells[ci].sub.cov-ff(ci)*3;if(!bc||sc<bc.sc)bc={sc,ci,cost}});
  if(bc&&bc.ci!==u.cell){await moveUnit(Bt,u,bc.ci,bc.cost);blog(Bt,`${nmU(Bt,u)} nacierra.`);fzHud()}}
async function passTurn(Bt,side){const nx=1-side;Bt.turnSide=nx;if(side===1)Bt.round++;
  Bt.units.forEach(u=>{if(u.side===nx){u.mvLeft=ustat(Bt,u).mov;u.attacked=false}});Bt.sel=null;Bt.ver++;
  blog(Bt,`— Tura ${Bt.round}: ruch ${sideLabel(Bt,nx)} —`);bsave(Bt);fzHud();fzRedraw();setTimeout(()=>battleAIRun(Bt),60)}
async function endBattleTurn(){const Bt=FZ&&FZ.battle;if(!Bt||Bt.busy||!canAct(Bt))return;Bt.busy=true;await passTurn(Bt,Bt.turnSide);Bt.busy=false;fzHud();fzRedraw()}
async function battleAIRun(Bt){
  if(!FZ||FZ.battle!==Bt||Bt.phase!=='play'||!aiSide(Bt,Bt.turnSide)||!isPart(Bt)||Bt.aiRun||Bt.busy)return;
  const side=Bt.turnSide;Bt.aiRun=true;Bt.busy=true;Bt.sel=null;fzHud();fzRedraw();
  try{await sleep(450);
    for(const u of Bt.units.filter(x=>x.side===side)){if(!FZ||FZ.battle!==Bt)return;if(!Bt.units.includes(u))continue;
      await aiAct(Bt,u);if(!FZ||FZ.battle!==Bt||Bt.phase==='over')return;await sleep(220)}
    if(Bt.phase==='play')await passTurn(Bt,side)
  }finally{Bt.aiRun=false;Bt.busy=false;if(FZ&&FZ.battle===Bt){fzHud();fzRedraw()}}}
function hudBattle(){
  const Bt=FZ.battle,cells=FZ.cells,su=Bt.units.find(u=>u.id===Bt.sel),vs=viewSide(Bt),both=bothHuman(Bt),act=canAct(Bt);
  const cntS=s=>Bt.units.filter(u=>u.side===s),sol=s=>cntS(s).filter(u=>MIL(u.k)).reduce((p,u)=>p+Math.ceil(u.hp/BU[u.k].hp*100),0),hp=s=>cntS(s).reduce((p,u)=>p+u.hp,0);
  const stt=Bt.phase==='over'?resultInfo(Bt)[0].toLowerCase():act?'<b style="color:#f0d9ad">twój ruch'+(both?' – '+esc(sideLabel(Bt,Bt.turnSide)):'')+'</b>':aiSide(Bt,Bt.turnSide)?'ruch przeciwnika (AI)…':'ruch gracza '+esc(sideLabel(Bt,Bt.turnSide))+' – czekaj…';
  let h=`<h3>${esc(Bt.name)}</h3><small>Tura ${Bt.round} · ${stt}</small>`;
  h+=[0,1].map(s=>`<div class="sd" style="border-left-color:${Bt.col[s]}"><b>${s?'🛡':'⚔'} ${esc(sideLabel(Bt,s))}${!both&&s===vs?' (Ty)':''}</b>${!both&&s===vs?' ('+N[Bt.civ[s]].n+')':''}${Bt.units.some(u=>u.side===s&&u.cut)?' <b style="color:#ff8a7a">⚠ OKRĄŻENI (−1 atak/obr.)</b>':''}: ${cntS(s).length} jedn. (~${sol(s)} żołn.) · ${hp(s)} HP</div>`).join('');
  if(Bt.rvx)h+=`<div class="sd" style="border-left-color:#3f9fd8;background:rgba(63,159,216,.16)"><b>🌊 Atak przez rzekę</b><br><small>Napastnicy: <b>−1 do ataku</b> · Obrońcy: <b>+1 do obrony</b></small></div>`;
  if(!both)h+=`<small>${vs===0?'Atakujesz to pole.':'Bronisz tego pola.'}</small>`;
  {const fl=s=>{const m={};cntS(s).forEach(u=>formBonus(Bt,u).tp.forEach(f=>m[f.k]=(m[f.k]||0)+1));return Object.entries(m).map(([k,n])=>`<span style="color:${FC[k][0]}">${FC[k][1]} ${FC[k][2]} ×${n}</span>`).join('<br>')||'<small>brak</small>'};
  h+=`<h4>Aktywne formacje</h4><div class="sd" style="border-left-color:${Bt.col[vs]}"><small>${both?'Ruchome strony':'Twoje'}:</small><br>${fl(vs)}</div><div class="sd" style="border-left-color:${Bt.col[1-vs]}"><small>${both?'Druga strona':'Wróg'}:</small><br>${fl(1-vs)}</div><small>Kolorowa ramka + ikona nad jednostką = formacja, linia łączy jednostki, które ją tworzą. Zaznacz jednostkę, by wyróżnić jej partnerów.</small>`}
  h+=`<h4>Wybrana jednostka</h4>`;
  if(su){const st=ustat(Bt,su),c=cells[su.cell];
    h+=`<b>${BU[su.k].n}</b> · HP ${su.hp}/${st.hp}${MIL(su.k)?' · ~'+Math.ceil(su.hp/st.hp*100)+' żołnierzy':''}<br><small>atak +${st.atk}${Bt.rvx&&su.side===0&&su.rv?' (rzeka −1)':''} · obrona ${st.def}${Bt.rvx&&su.side===1?' (rzeka +1)':''} · obr. k${st.die}${st.db?'+'+st.db:''} · zasięg ${st.rng} · ruch ${su.mvLeft}/${st.mov}${su.attacked?' · atak wykonany':''}</small><br><small>Stoi na: ${c.sub.n} (${fxText(c.sub)})</small>${(()=>{const f=formBonus(Bt,su);return f.names.length?'<br><small style="color:#f0cc83">⚜ Formacja: '+f.names.join(', ')+'</small>':'<br><small>Brak formacji – ustaw wojska obok siebie.</small>'})()}`}
  else h+='<small>Kliknij swoją jednostkę. Niebieskie pola = ruch, czerwone = cele w zasięgu.</small>';
  if(Bt.phase==='over')h+=battleSummaryHtml(Bt);
  h+=`<h4>Dziennik</h4><div class="blog">`+Bt.log.slice(-9).map(l=>`<div class="${l.cls||''}">${esc(l.t)}</div>`).join('')+`</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">`;
  if(Bt.phase==='over'){const mine=local?false:Bt.ack.includes(meIdx());
    h+=mine?`<button class="p" style="flex:1" disabled>Czekanie na drugiego gracza…</button>`+(isFin(Bt)?`<button style="flex:1" onclick="finishBattle()">Zakończ bez czekania</button>`:''):`<button class="p" style="flex:1" onclick="ackBattle()">Zakończ bitwę</button>`}
  else h+=`<button class="p" style="flex:1" ${act&&!Bt.busy?'':'disabled'} onclick="endBattleTurn()">Zakończ turę</button>`+(!aiSide(Bt,0)&&(local||vs===0)?`<button style="flex:1" ${act&&!Bt.busy&&Bt.turnSide===0?'':'disabled'} onclick="retreatBattle()">Wycofaj się</button>`:'');
  h+=`</div><p><small>Zasady: k20 + atak ≥ 10 + obrona + osłona pola. 20 = krytyk (×2), 1 = pudło. Wysokość i okrążenie dają +1. Kontratak −2 (tylko gdy cel sięga napastnika). Łucznik strzela z odległości do 3 pól (z bliska −2). <b>Rzeki:</b> przeprawa kosztuje +2 ruchu, a atak przez rzekę daje napastnikom −1 do ataku i obrońcom +1 do obrony. <b>Formacje</b> (złote linie): Mur tarcz – wojownik z 2+ wojownikami obok +1 obrona; Wsparcie łuczników – wojownik z łucznikiem w zasięgu 2 pól +1 atak; Osłona – łucznik obok wojownika +1 obrona; Salwa – łucznicy w odległości 2 pól +1 atak. Atakujący i obrońca grają naprzemiennie; AI steruje się samo. Wynik trafia do gry: polegli znikają, zwycięzca atakujący zajmuje pole.</small></p>`;
  fzhud.innerHTML=h}

/* ---------- przeciąganie mapy myszą ---------- */
(()=>{const w=$('wrap');let d=null,moved=false,justDragged=false;
  w.addEventListener('mousedown',e=>{if(e.button!==0)return;d={x:e.clientX,y:e.clientY,sl:w.scrollLeft,st:w.scrollTop};moved=false});
  window.addEventListener('mousemove',e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(!moved&&Math.hypot(dx,dy)>5){moved=true;w.classList.add('drag')}
    if(moved){w.scrollLeft=d.sl-dx;w.scrollTop=d.st-dy}});
  window.addEventListener('mouseup',()=>{if(d&&moved){justDragged=true;setTimeout(()=>justDragged=false,80)}d=null;w.classList.remove('drag')});
  w.addEventListener('click',e=>{if(justDragged){e.stopPropagation();e.preventDefault()}},true);
  w.addEventListener('dragstart',e=>e.preventDefault());
})();
impLobbyInfo();localCivUI();
