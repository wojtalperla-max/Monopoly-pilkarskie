
/* ===== MONOPOLY KLASYCZNE (zwykłe) ===== */
const CM=(function(){
'use strict';
const T=[
['go','START'],
['st','Bytom','br',60,[2,10,30,90,160,250],50],
['ch','Kasa społeczna'],
['st','Radom','br',60,[4,20,60,180,320,450],50],
['tx','Podatek dochodowy',200],
['rr','Warszawa Centralna'],
['st','Kielce','lb',100,[6,30,90,270,400,550],50],
['sz','Szansa'],
['st','Opole','lb',100,[6,30,90,270,400,550],50],
['st','Rzeszów','lb',120,[8,40,100,300,450,600],50],
['jl','Więzienie'],
['st','Olsztyn','pk',140,[10,50,150,450,625,750],100],
['ut','Elektrownia'],
['st','Białystok','pk',140,[10,50,150,450,625,750],100],
['st','Toruń','pk',160,[12,60,180,500,700,900],100],
['rr','Kraków Główny'],
['st','Częstochowa','or',180,[14,70,200,550,750,950],100],
['ch','Kasa społeczna'],
['st','Bydgoszcz','or',180,[14,70,200,550,750,950],100],
['st','Gdynia','or',200,[16,80,220,600,800,1000],100],
['fp','Parking'],
['st','Lublin','rd',220,[18,90,250,700,875,1050],150],
['sz','Szansa'],
['st','Łódź','rd',220,[18,90,250,700,875,1050],150],
['st','Szczecin','rd',240,[20,100,300,750,925,1100],150],
['rr','Wrocław Główny'],
['st','Poznań','yl',260,[22,110,330,800,975,1150],150],
['st','Wrocław','yl',260,[22,110,330,800,975,1150],150],
['ut','Wodociągi'],
['st','Katowice','yl',280,[24,120,360,850,1025,1200],150],
['gj','Idź do więzienia'],
['st','Sopot','gr',300,[26,130,390,900,1100,1275],200],
['st','Zakopane','gr',300,[26,130,390,900,1100,1275],200],
['ch','Kasa społeczna'],
['st','Gdańsk','gr',320,[28,150,450,1000,1200,1400],200],
['rr','Gdańsk Główny'],
['sz','Szansa'],
['st','Kraków','db',350,[35,175,500,1100,1300,1500],200],
['tx','Podatek od luksusu',100],
['st','Warszawa','db',400,[50,200,600,1400,1700,2000],200]];
const GC={br:'#8b5a3c',lb:'#9fd8f2',pk:'#e0539b',or:'#f39a2d',rd:'#e03b3b',yl:'#f5d742',gr:'#2faa5c',db:'#2a56c6'};
const GN={br:'Brązowe',lb:'Błękitne',pk:'Różowe',or:'Pomarańczowe',rd:'Czerwone',yl:'Żółte',gr:'Zielone',db:'Granatowe'};
const SZ=[
{x:'go',text:'Idź na START. Pobierz 200 €.'},
{x:'mv',to:39,text:'Przejdź do Warszawy.'},
{x:'mv',to:24,text:'Jedź do Szczecina. Mijając START, pobierz 200 €.'},
{x:'mv',to:11,text:'Jedź do Olsztyna. Mijając START, pobierz 200 €.'},
{x:'rr',text:'Idź na najbliższy dworzec. Właściciel dostaje podwójny czynsz.'},
{x:'ut',text:'Idź do najbliższej spółki. Zapłać 10× wyrzucone oczka.'},
{x:'cash',a:50,text:'Bank wypłaca Ci dywidendę 50 €.'},
{x:'gf',text:'Karta „Wyjdź z więzienia za darmo”.'},
{x:'back',text:'Cofnij się o 3 pola.'},
{x:'jail',text:'Idź prosto do więzienia. Nie mijasz STARTU.'},
{x:'rep',h:25,H:100,text:'Remonty: 25 € za dom i 100 € za hotel.'},
{x:'cash',a:-15,text:'Mandat za przekroczenie prędkości: 15 €.'},
{x:'mv',to:5,text:'Jedź na Warszawa Centralna. Mijając START, pobierz 200 €.'},
{x:'eachpay',a:50,text:'Wybrano Cię na prezesa. Zapłać każdemu graczowi 50 €.'},
{x:'cash',a:150,text:'Twoja pożyczka budowlana dojrzała. Pobierz 150 €.'},
{x:'cash',a:-100,text:'Opłać przegląd techniczny: 100 €.'}];
const CH=[
{x:'go',text:'Idź na START. Pobierz 200 €.'},
{x:'cash',a:200,text:'Błąd bankowy na Twoją korzyść. Pobierz 200 €.'},
{x:'cash',a:-50,text:'Wizyta u lekarza: zapłać 50 €.'},
{x:'cash',a:50,text:'Sprzedaż akcji przynosi Ci 50 €.'},
{x:'gf',text:'Karta „Wyjdź z więzienia za darmo”.'},
{x:'jail',text:'Idź prosto do więzienia. Nie mijasz STARTU.'},
{x:'cash',a:100,text:'Fundusz wakacyjny dojrzał. Pobierz 100 €.'},
{x:'cash',a:20,text:'Zwrot podatku dochodowego: 20 €.'},
{x:'eachget',a:10,text:'Urodziny! Każdy gracz daje Ci 10 €.'},
{x:'cash',a:100,text:'Polisa na życie dojrzała. Pobierz 100 €.'},
{x:'cash',a:-100,text:'Opłata szpitalna: 100 €.'},
{x:'cash',a:-50,text:'Opłata szkolna: 50 €.'},
{x:'cash',a:25,text:'Honorarium za doradztwo: 25 €.'},
{x:'rep',h:40,H:115,text:'Remonty ulic: 40 € za dom i 115 € za hotel.'},
{x:'cash',a:10,text:'Wygrywasz konkurs piękności. Pobierz 10 €.'},
{x:'cash',a:100,text:'Dostajesz spadek: 100 €.'}];
const GRP={};T.forEach((f,i)=>{if(f[0]==='st')(GRP[f[2]]=GRP[f[2]]||[]).push(i)});
const RR=[5,15,25,35],UT=[12,28];
const PROP=['st','rr','ut'];
const price=i=>T[i][0]==='rr'?200:T[i][0]==='ut'?150:T[i][3];
const unmCost=i=>Math.ceil(price(i)/2*1.1);
const r6=()=>1+Math.floor(Math.random()*6);
const shuf=n=>{const a=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s==null?'':s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const arr=a=>Array.isArray(a)?a.map(Number):Object.values(a||{}).map(Number);
const myUid=()=>typeof onlinePlayerId!=='undefined'?onlinePlayerId:null;

let G=null,ONL=false,ROOM=null,CODE='',root=null,shown={rid:-1,m:[],ev:0},vis=[],anim=false,aid=0,modal=null,toastT=null,statDone=false;
const mine=()=>!ONL||(!!G&&!!G.P[G.cur]&&G.P[G.cur].uid===myUid());
const cp=()=>G.P[G.cur];
function log(t){G.lg.push(t);if(G.lg.length>40)G.lg.shift()}
function ev(k,t){G.ev={id:(G.ev?G.ev.id:0)+1,k,t}}
function snd(k){try{const m={dice:typeof SND5!=='undefined'?SND5:null,pay:typeof SND3!=='undefined'?SND3:null,buy:typeof SND!=='undefined'?SND:null,step:typeof SND4!=='undefined'?SND4:null}[k];if(!m)return;const c=k==='step'?m.cloneNode():m;c.volume=typeof vol!=='undefined'?vol:1;if(k!=='step')c.currentTime=0;c.play().catch(()=>{})}catch(e){}}

/* ---------- stan ---------- */
function create(players,money){
  return {P:players.map(p=>({uid:p.uid||null,n:p.n,c:p.c,m:money,pos:0,j:0,jt:0,out:0,gf:0})),cur:0,ph:'roll',d:[1,1],dbl:0,
    o:Array(40).fill(-1),h:Array(40).fill(0),mg:Array(40).fill(0),k1:shuf(SZ.length),k2:shuf(CH.length),p1:0,p2:0,
    lg:['Gra rozpoczęta! Powodzenia!'],rid:0,pend:null,win:-1,rev:1,ev:null,by:null,mode:'classic'};
}
function norm(s){
  const d=arr(s.d);
  return {P:Object.values(s.P||{}).map(p=>({uid:p.uid||null,n:String(p.n||'Gracz'),c:String(p.c||'#e63946'),m:Number(p.m)||0,pos:Number(p.pos)||0,j:Number(p.j)||0,jt:Number(p.jt)||0,out:Number(p.out)||0,gf:Number(p.gf)||0})),
    cur:Number(s.cur)||0,ph:s.ph||'roll',d:d.length===2?d:[1,1],dbl:Number(s.dbl)||0,o:arr(s.o),h:arr(s.h),mg:arr(s.mg),
    k1:arr(s.k1),k2:arr(s.k2),p1:Number(s.p1)||0,p2:Number(s.p2)||0,lg:Object.values(s.lg||{}).map(String),rid:Number(s.rid)||0,
    pend:s.pend?{t:s.pend.t,i:Number(s.pend.i)||0,amt:Number(s.pend.amt)||0,cred:s.pend.cred==null?-1:Number(s.pend.cred),each:Number(s.pend.each)||0}:null,
    win:s.win==null?-1:Number(s.win),rev:Number(s.rev)||0,ev:s.ev?{id:Number(s.ev.id)||0,k:s.ev.k||'',t:String(s.ev.t||'')}:null,by:s.by||null,mode:'classic'};
}
const clean=o=>JSON.parse(JSON.stringify(o));

/* ---------- reguły ---------- */
function rent(i,opt){
  const f=T[i],o=G.o[i];
  if(f[0]==='st'){const h=G.h[i];if(h>0)return f[4][h];const full=GRP[f[2]].every(j=>G.o[j]===o);return f[4][0]*(full?2:1)}
  if(f[0]==='rr'){const n=RR.filter(j=>G.o[j]===o).length;return 25*Math.pow(2,n-1)*(opt&&opt.rr2?2:1)}
  const n=UT.filter(j=>G.o[j]===o).length;return (G.d[0]+G.d[1])*(opt&&opt.ut10?10:(n===2?10:4));
}
function credit(cred,amt,each){
  if(cred>=0)G.P[cred].m+=amt;
  else if(cred===-2)G.P.forEach((q,i)=>{if(i!==G.cur&&!q.out)q.m+=each});
}
function pay(p,amt,cred,each){
  if(amt<=0)return;
  if(p.m>=amt){p.m-=amt;credit(cred,amt,each||0)}
  else{G.pend={t:'debt',amt,cred,each:each||0};log(p.n+' musi zapłacić '+amt+' €, ale brakuje gotówki!');ev('debt',p.n+' nie ma pieniędzy! Sprzedaj domy lub zastaw posesje.')}
}
function moveTo(p,to,collect){
  if(collect&&to<p.pos){p.m+=200;log(p.n+' mija START: +200 €')}
  p.pos=to;
}
function goJail(p){p.pos=10;p.j=1;p.jt=0;G.dbl=0;log(p.n+' idzie do więzienia!');ev('jail','👮 '+p.n+' trafia do więzienia!')}
function drawCard(p,kind){
  const deck=kind==='sz'?SZ:CH,ord=kind==='sz'?G.k1:G.k2,ptr=kind==='sz'?G.p1:G.p2;
  const c=deck[ord[ptr%ord.length]];
  if(kind==='sz')G.p1++;else G.p2++;
  ev('card',(kind==='sz'?'🎲 SZANSA\n':'📦 KASA SPOŁECZNA\n')+c.text);log(p.n+' ('+(kind==='sz'?'Szansa':'Kasa')+'): '+c.text);
  switch(c.x){
    case 'go':moveTo(p,0,true);break;
    case 'mv':moveTo(p,c.to,true);land(p);break;
    case 'rr':{const r=RR.find(x=>x>p.pos)||5;moveTo(p,r,true);land(p,{rr2:1});break}
    case 'ut':{const u=UT.find(x=>x>p.pos)||12;moveTo(p,u,true);land(p,{ut10:1});break}
    case 'cash':if(c.a>=0)p.m+=c.a;else pay(p,-c.a,-1);break;
    case 'gf':p.gf++;break;
    case 'back':p.pos=(p.pos+37)%40;land(p);break;
    case 'jail':goJail(p);break;
    case 'rep':{let t=0;for(let i=0;i<40;i++)if(G.o[i]===G.cur&&G.h[i]>0)t+=G.h[i]===5?c.H:G.h[i]*c.h;if(t>0)pay(p,t,-1);break}
    case 'eachpay':{const n=G.P.filter((q,i)=>i!==G.cur&&!q.out).length;pay(p,c.a*n,-2,c.a);break}
    case 'eachget':G.P.forEach((q,i)=>{if(i!==G.cur&&!q.out){const t=Math.min(q.m,c.a);q.m-=t;p.m+=t}});break;
  }
}
function land(p,opt){
  const i=p.pos,f=T[i];
  if(PROP.includes(f[0])){
    const o=G.o[i];
    if(o===-1)G.pend={t:'buy',i};
    else if(o!==G.cur){
      if(G.mg[i])log(f[1]+' jest zastawione: brak czynszu.');
      else{const r=rent(i,opt);log(p.n+' płaci '+r+' € czynszu graczowi '+G.P[o].n+' ('+f[1]+')');pay(p,r,o)}
    }
  }else if(f[0]==='tx'){log(p.n+' płaci '+f[2]+' € ('+f[1]+')');pay(p,f[2],-1)}
  else if(f[0]==='gj')goJail(p);
  else if(f[0]==='sz'||f[0]==='ch')drawCard(p,f[0]);
}
function settle(){
  const p=cp();
  if(G.pend&&G.pend.t==='debt')G.ph='debt';
  else if(G.pend&&G.pend.t==='buy'){
    if(p.m>=price(G.pend.i))G.ph='buy';
    else{log(p.n+' nie stać na zakup: '+T[G.pend.i][1]);G.pend=null;G.ph='after'}
  }else G.ph='after';
  if(p.j||p.out)G.dbl=0;
}
function nextPlayer(){
  let g=0;do{G.cur=(G.cur+1)%G.P.length}while(G.P[G.cur].out&&++g<20);
  G.dbl=0;G.pend=null;G.ph='roll';
}
function checkWin(){
  const al=G.P.map((p,i)=>p.out?-1:i).filter(i=>i>=0);
  if(al.length===1){G.win=al[0];G.ph='over';G.pend=null;ev('win','🏆 '+G.P[al[0]].n+' wygrywa grę!');log(G.P[al[0]].n+' wygrywa!');return true}
  return false;
}

/* ---------- akcje ---------- */
function commit(){
  G.rev++;
  if(ONL&&ROOM){G.by=myUid();try{ROOM.child('cm').set(clean(G)).catch(e=>console.error('Zapis gry:',e))}catch(e){console.error(e)}}
  present();
  stats();
}
function act(f){if(!G||anim||!mine()||G.ph==='over')return;if(f()!==false)commit()}
function roll(mode){
  act(()=>{
    if(G.ph!=='roll')return false;
    const p=cp();
    if(p.j&&mode==='pay'){if(p.m<50)return false;p.m-=50;p.j=0;p.jt=0;log(p.n+' płaci 50 € i wychodzi z więzienia.')}
    else if(p.j&&mode==='card'){if(p.gf<1)return false;p.gf--;p.j=0;p.jt=0;log(p.n+' używa karty i wychodzi z więzienia.')}
    const a=r6(),b=r6(),dbl=a===b,s=a+b;G.d=[a,b];G.rid++;
    log(p.n+' rzuca: '+a+' + '+b+' = '+s+(dbl?' (dublet!)':''));
    if(p.j){
      if(dbl){p.j=0;p.jt=0;G.dbl=0;log(p.n+' wyrzuca dublet i wychodzi z więzienia.');p.pos=(p.pos+s)%40;land(p)}
      else{
        p.jt++;
        if(p.jt>=3){
          p.j=0;p.jt=0;G.dbl=0;log(p.n+' po 3 próbach płaci 50 € i wychodzi.');pay(p,50,-1);
          if(!G.pend){const o=p.pos;p.pos=(p.pos+s)%40;if(p.pos<o)p.m+=0;land(p)}
        }else log(p.n+' nie wyrzuca dubletu (próba '+p.jt+'/3).');
      }
    }else{
      if(dbl){G.dbl++;if(G.dbl>=3){log(p.n+' wyrzuca trzeci dublet z rzędu!');goJail(p);settle();return}}else G.dbl=0;
      const np=p.pos+s;if(np>=40){p.m+=200;log(p.n+' mija START: +200 €')}
      p.pos=np%40;land(p);
    }
    settle();
  });
}
function buy(){
  act(()=>{
    if(G.ph!=='buy'||!G.pend)return false;
    const p=cp(),i=G.pend.i,pr=price(i);if(p.m<pr)return false;
    p.m-=pr;G.o[i]=G.cur;G.pend=null;G.ph='after';log(p.n+' kupuje '+T[i][1]+' za '+pr+' €');snd('buy');ev('buy','🏠 '+p.n+' kupuje '+T[i][1]+'!');
  });
}
function skip(){act(()=>{if(G.ph!=='buy')return false;log(cp().n+' rezygnuje z zakupu: '+T[G.pend.i][1]);G.pend=null;G.ph='after'})}
function endTurn(){act(()=>{if(G.ph!=='after')return false;nextPlayer();log('Tura: '+cp().n)})}
function payDebt(){
  act(()=>{
    if(G.ph!=='debt'||!G.pend)return false;
    const p=cp(),d=G.pend;if(p.m<d.amt)return false;
    p.m-=d.amt;credit(d.cred,d.amt,d.each);G.pend=null;G.ph='after';if(p.j)G.dbl=0;log(p.n+' spłaca dług: '+d.amt+' €');
  });
}
function bankrupt(){
  act(()=>{
    if(G.ph!=='debt'||!G.pend)return false;
    const p=cp(),cred=G.pend.cred;
    log(p.n+' ogłasza bankructwo!');ev('bk','💥 '+p.n+' bankrutuje!');
    if(cred>=0){const c=G.P[cred];c.m+=p.m;c.gf+=p.gf;for(let i=0;i<40;i++)if(G.o[i]===G.cur){G.o[i]=cred;G.h[i]=0}}
    else{
      if(cred===-2){const al=G.P.map((q,i)=>(i!==G.cur&&!q.out)?i:-1).filter(i=>i>=0);if(al.length){const share=Math.floor(p.m/al.length);al.forEach(i=>G.P[i].m+=share)}}
      for(let i=0;i<40;i++)if(G.o[i]===G.cur){G.o[i]=-1;G.h[i]=0;G.mg[i]=0}
    }
    p.m=0;p.gf=0;p.out=1;G.pend=null;
    if(!checkWin())nextPlayer();
  });
}
function canBuild(i){const f=T[i];if(f[0]!=='st'||G.o[i]!==G.cur||G.mg[i]||G.h[i]>=5)return false;const g=GRP[f[2]];if(!g.every(j=>G.o[j]===G.cur&&!G.mg[j]))return false;if(G.h[i]>Math.min(...g.map(j=>G.h[j])))return false;return cp().m>=f[5]}
function canSell(i){const f=T[i];if(f[0]!=='st'||G.o[i]!==G.cur||G.h[i]<=0)return false;return G.h[i]>=Math.max(...GRP[f[2]].map(j=>G.h[j]))}
function canMort(i){if(G.o[i]!==G.cur||G.mg[i])return false;const f=T[i];if(f[0]==='st'&&GRP[f[2]].some(j=>G.h[j]>0))return false;return true}
function canUnm(i){return G.o[i]===G.cur&&!!G.mg[i]&&cp().m>=unmCost(i)}
function build(i){act(()=>{if(!canBuild(i))return false;cp().m-=T[i][5];G.h[i]++;log(cp().n+' buduje '+(G.h[i]===5?'hotel':'dom')+': '+T[i][1]);snd('buy')})}
function sell(i){act(()=>{if(!canSell(i))return false;cp().m+=T[i][5]/2;G.h[i]--;log(cp().n+' sprzedaje dom: '+T[i][1])})}
function mort(i){act(()=>{if(!canMort(i))return false;cp().m+=price(i)/2;G.mg[i]=1;log(cp().n+' zastawia '+T[i][1])})}
function unm(i){act(()=>{if(!canUnm(i))return false;cp().m-=unmCost(i);G.mg[i]=0;log(cp().n+' wykupuje zastaw: '+T[i][1])})}

/* ---------- statystyki ---------- */
function stats(){
  if(!ONL||!G||G.win<0||statDone)return;statDone=true;
  try{
    if(typeof statsRecord!=='function'||typeof ACC==='undefined'||!ACC.user)return;
    const me=G.P.find(p=>p.uid===ACC.user.uid);if(!me)return;
    statsRecord('monopoly_'+CODE,'monopoly',me.out?'l':'w',G.P.map(p=>({uid:p.uid,name:p.n})),window.onlineTest);
  }catch(e){console.error(e)}
}

/* ---------- widok ---------- */
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const die=n=>'<div class="cmdie">'+[...Array(9).keys()].map(k=>'<i'+(PIPS[n].includes(k)?' on':'')+'></i>').join('')+'</div>';
function cellPos(i){let r,c;if(i<=10){r=10;c=10-i}else if(i<20){c=0;r=20-i}else if(i<=30){r=0;c=i-20}else{c=10;r=i-30}return [r,c]}
function sideOf(i){return i<10?'b':i<20?'l':i<30?'t':'r'}
function cellHTML(i){
  const f=T[i],[r,c]=cellPos(i),o=G.o[i],corner=i%10===0;
  let inner='',cls='cmc '+(corner?'corner ':'cs'+sideOf(i)+' ');
  if(f[0]==='st'){
    const h=G.h[i];
    const hs=h===5?'<u class="hot"></u>':'<u></u>'.repeat(h);
    inner=`<div class="bar" style="background:${GC[f[2]]}">${hs}</div><div class="nm">${f[1]}</div><div class="pr">${f[3]} €</div>`;
  }else if(f[0]==='rr')inner=`<div class="ic">🚆</div><div class="nm">${f[1]}</div><div class="pr">200 €</div>`;
  else if(f[0]==='ut')inner=`<div class="ic">${i===12?'💡':'🚰'}</div><div class="nm">${f[1]}</div><div class="pr">150 €</div>`;
  else if(f[0]==='tx')inner=`<div class="ic">💸</div><div class="nm">${f[1]}</div><div class="pr">${f[2]} €</div>`;
  else if(f[0]==='sz')inner=`<div class="ic big">❓</div><div class="nm">SZANSA</div>`;
  else if(f[0]==='ch')inner=`<div class="ic big">📦</div><div class="nm">KASA SPOŁECZNA</div>`;
  else if(f[0]==='go')inner=`<div class="ic big">🏁</div><div class="nm">START</div><div class="pr">+200 €</div>`;
  else if(f[0]==='jl')inner=`<div class="ic big">⛓️</div><div class="nm">WIĘZIENIE</div><div class="pr">odwiedziny</div>`;
  else if(f[0]==='fp')inner=`<div class="ic big">🅿️</div><div class="nm">PARKING</div>`;
  else inner=`<div class="ic big">👮</div><div class="nm">IDŹ DO WIĘZIENIA</div>`;
  if(o>=0){cls+='own ';if(G.mg[i])cls+='mg '}
  const tks=G.P.map((p,k)=>(!p.out&&vis[k]===i)?`<span class="cmtk${k===G.cur?' me':''}" style="background:${esc(p.c)}" title="${esc(p.n)}"></span>`:'').join('');
  const own=o>=0?`style="grid-area:${r+1}/${c+1};--oc:${esc(G.P[o].c)}"`:`style="grid-area:${r+1}/${c+1}"`;
  return `<div class="${cls}" ${own} onclick="CM.info(${i})"><div class="in">${inner}</div>${G.mg[i]&&o>=0?'<div class="mgl">ZASTAW</div>':''}<div class="tks">${tks}</div></div>`;
}
function centerHTML(){
  const p=cp(),d=G.d;
  let ctl='';
  if(G.ph==='over'){
    ctl=`<div class="cmwin">🏆 ${esc(G.P[G.win].n)} wygrywa!</div><button class="cmb go" onclick="CM.exit(true)">Menu główne</button>`;
  }else if(anim){ctl='<div class="cmwait">…</div>'}
  else if(!mine()){ctl=`<div class="cmwait">Teraz gra <b style="color:${esc(p.c)}">${esc(p.n)}</b><span class="dots"><i>.</i><i>.</i><i>.</i></span></div>`}
  else if(G.ph==='roll'){
    if(p.j){
      ctl=`<div class="cmq">⛓️ Jesteś w więzieniu (próba ${p.jt+1}/3)</div><button class="cmb go" onclick="CM.roll()">🎲 Rzuć (dublet wypuszcza)</button><button class="cmb" ${p.m<50?'disabled':''} onclick="CM.roll('pay')">Zapłać 50 € i rzuć</button>${p.gf?'<button class="cmb" onclick="CM.roll(\'card\')">Użyj karty</button>':''}`;
    }else ctl='<button class="cmb go pulse" onclick="CM.roll()">🎲 Rzuć kośćmi</button>';
  }else if(G.ph==='buy'&&G.pend){
    const i=G.pend.i,f=T[i];
    ctl=`<div class="cmq">Kupić <b>${f[1]}</b> za <b>${price(i)} €</b>?</div><button class="cmb go" onclick="CM.buy()">Kup</button><button class="cmb" onclick="CM.skip()">Pomiń</button>`;
  }else if(G.ph==='debt'&&G.pend){
    ctl=`<div class="cmq bad">Dług: <b>${G.pend.amt} €</b><br><small>Sprzedaj domy lub zastaw posesje (przycisk Posesje)</small></div><button class="cmb go" ${p.m<G.pend.amt?'disabled':''} onclick="CM.payDebt()">Zapłać ${G.pend.amt} €</button><button class="cmb red" onclick="if(confirm('Na pewno ogłosić bankructwo?'))CM.bankrupt()">Bankructwo</button>`;
  }else if(G.ph==='after'){
    ctl=(G.dbl>0&&!p.j)?'<button class="cmb go pulse" onclick="CM.setRoll()">🎲 Dublet! Rzuć ponownie</button>':'<button class="cmb go pulse" onclick="CM.endTurn()">Zakończ turę ➜</button>';
  }
  const man=(G.ph!=='over'&&!anim&&mine())?'<button class="cmb ghost" onclick="CM.manage()">🏠 Posesje</button>':'';
  return `<div class="cmlogo">MONOPOLY</div><div class="cmturn" style="--tc:${esc(p.c)}">Tura: <b>${esc(p.n)}</b></div><div id="cmd">${die(d[0])}${die(d[1])}</div><div class="cmctl">${ctl}${man}</div><div class="cmlast">${esc(G.lg[G.lg.length-1]||'')}</div>`;
}
function sideHTML(){
  let h='';
  G.P.forEach((p,k)=>{
    const props=[];for(let i=0;i<40;i++)if(G.o[i]===k)props.push(i);
    const chips=props.map(i=>{const f=T[i];const col=f[0]==='st'?GC[f[2]]:f[0]==='rr'?'#555':'#aaa';return `<span class="cmchip${G.mg[i]?' mg':''}" style="background:${col}" onclick="CM.info(${i})" title="${esc(f[1])}">${G.h[i]>0?(G.h[i]===5?'H':G.h[i]):''}</span>`}).join('');
    h+=`<div class="cmpl${k===G.cur&&G.ph!=='over'?' act':''}${p.out?' out':''}" data-pl="${k}"><div class="plh"><span class="dot" style="background:${esc(p.c)}"></span><b>${esc(p.n)}</b>${p.j?'<span title="W więzieniu">⛓️</span>':''}${p.gf?'<span title="Karta wyjścia z więzienia">🎫'+p.gf+'</span>':''}<span class="mn">${p.out?'BANKRUT':p.m+' €'}</span></div><div class="chips">${chips||'<small>brak posesji</small>'}</div></div>`;
  });
  h+='<div class="cmlgh">Dziennik gry</div><div class="cmlgl">'+G.lg.slice(-14).reverse().map(x=>'<div>'+esc(x)+'</div>').join('')+'</div>';
  return h;
}
function ensureRoot(){
  if(root&&document.body.contains(root))return;
  root=document.createElement('div');root.id='cm';
  root.innerHTML='<div id="cmbar"><button class="cmb ghost" onclick="CM.exit()">← Menu główne</button><b>MONOPOLY</b><span id="cmbadge"></span></div><div id="cmwrap"><div id="cmb"></div><div id="cmside"></div></div><div id="cmmodal" hidden></div><div id="cmtoast"></div>';
  document.body.appendChild(root);
  root.querySelector('#cmmodal').addEventListener('click',e=>{if(e.target.id==='cmmodal')closeModal()});
}
function render(){
  if(!G)return;ensureRoot();
  const b=root.querySelector('#cmb');
  let h='';for(let i=0;i<40;i++)h+=cellHTML(i);
  h+=`<div id="cmmid">${centerHTML()}</div>`;
  b.innerHTML=h;
  root.querySelector('#cmside').innerHTML=sideHTML();
  root.querySelector('#cmbadge').textContent=ONL?'online · '+CODE:'lokalnie';
  if(modal)drawModal();
}
function fx(diffs){
  let neg=false;
  diffs.forEach((d,i)=>{
    if(!d)return;if(d<0)neg=true;
    const el=root&&root.querySelector('[data-pl="'+i+'"]');if(!el)return;
    const s=document.createElement('span');s.className='fl '+(d>0?'up':'dn');s.textContent=(d>0?'+':'−')+Math.abs(d)+' €';
    el.appendChild(s);setTimeout(()=>s.remove(),1700);
  });
  if(neg)snd('pay');
}
function toast(t){
  if(!root)return;const e=root.querySelector('#cmtoast');e.innerHTML=esc(t).replace(/\n/g,'<br>');e.classList.remove('show');void e.offsetWidth;e.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('show'),3200);
}
function diceAnim(id,cb){
  snd('dice');let n=0;
  const iv=setInterval(()=>{
    if(id!==aid){clearInterval(iv);return}
    n++;const e=root&&root.querySelector('#cmd');
    if(e&&n<8){e.classList.add('shake');e.innerHTML=die(r6())+die(r6())}
    if(n>=8){clearInterval(iv);if(e){e.classList.remove('shake');e.innerHTML=die(G.d[0])+die(G.d[1])}cb()}
  },75);
}
function walk(id,cb){
  const step=()=>{
    if(id!==aid)return;let any=false;
    G.P.forEach((p,i)=>{
      if(vis[i]!==p.pos){any=true;const dist=(p.pos-vis[i]+40)%40;if(dist>12||dist===0)vis[i]=p.pos;else{vis[i]=(vis[i]+1)%40;snd('step')}}
    });
    render();
    if(any)setTimeout(step,95);else cb();
  };
  step();
}
function present(first){
  const id=++aid;
  const rolled=!first&&G.rid!==shown.rid;
  const diffs=G.P.map((p,i)=>shown.m.length&&shown.m[i]!=null?p.m-shown.m[i]:0);
  shown.m=G.P.map(p=>p.m);shown.rid=G.rid;
  const evn=G.ev&&G.ev.id!==shown.ev?G.ev:null;if(G.ev)shown.ev=G.ev.id;
  if(first){vis=G.P.map(p=>p.pos);anim=false;render();return}
  const moving=G.P.some((p,i)=>vis[i]!==p.pos);
  const fin=()=>{if(id!==aid)return;anim=false;render();fx(diffs);if(evn)toast(evn.t)};
  if(!rolled&&!moving){fin();return}
  anim=true;render();
  if(rolled)diceAnim(id,()=>walk(id,fin));else walk(id,fin);
}

/* ---------- okna ---------- */
function closeModal(){modal=null;const m=root&&root.querySelector('#cmmodal');if(m){m.hidden=true;m.innerHTML=''}}
function propBtns(i){
  const f=T[i];if(!G||G.o[i]!==G.cur||!mine()||anim||G.ph==='over')return '';
  let b='';
  if(f[0]==='st')b+=`<button ${canBuild(i)?'':'disabled'} onclick="CM.build(${i})">＋ ${G.h[i]===4?'hotel':'dom'} (${f[5]} €)</button><button ${canSell(i)?'':'disabled'} onclick="CM.sell(${i})">－ dom (+${f[5]/2} €)</button>`;
  b+=G.mg[i]?`<button ${canUnm(i)?'':'disabled'} onclick="CM.unm(${i})">Wykup (${unmCost(i)} €)</button>`:`<button ${canMort(i)?'':'disabled'} onclick="CM.mort(${i})">Zastaw (+${price(i)/2} €)</button>`;
  return b;
}
function infoHTML(i){
  const f=T[i],o=G.o[i];
  if(!PROP.includes(f[0]))return `<h3>${f[1]}</h3><p>${f[0]==='tx'?'Zapłać '+f[2]+' € bankowi.':f[0]==='go'?'Mijając START lub stając na nim, pobierasz 200 €.':f[0]==='jl'?'Zwykłe odwiedziny. Z więzienia wychodzisz dubletem, za 50 € lub kartą.':f[0]==='gj'?'Idziesz prosto do więzienia.':f[0]==='fp'?'Odpoczywasz. Nic się nie dzieje.':'Dobierz kartę.'}</p>`;
  let t=`<h3>${f[0]==='st'?`<span class="sw" style="background:${GC[f[2]]}"></span>`:''}${f[1]}</h3><p>Cena: <b>${price(i)} €</b> · Zastaw: ${price(i)/2} €${f[0]==='st'?' · '+GN[f[2]]:''}</p>`;
  if(f[0]==='st')t+=`<table class="cmrt"><tr><td>Czynsz</td><td>${f[4][0]} €</td></tr><tr><td>Cały kolor (bez domów)</td><td>${f[4][0]*2} €</td></tr>${[1,2,3,4].map(k=>`<tr><td>${k} ${k===1?'dom':k<5?'domy':'domów'}</td><td>${f[4][k]} €</td></tr>`).join('')}<tr><td>Hotel</td><td>${f[4][5]} €</td></tr><tr><td>Koszt domu / hotelu</td><td>${f[5]} €</td></tr></table>`;
  else if(f[0]==='rr')t+='<p>Czynsz: 25 € · 2 dworce 50 € · 3 dworce 100 € · 4 dworce 200 €</p>';
  else t+='<p>Czynsz: 4× oczka na kostkach (jedna spółka) lub 10× (obie).</p>';
  t+=o>=0?`<p>Właściciel: <b style="color:${esc(G.P[o].c)}">${esc(G.P[o].n)}</b>${G.mg[i]?' (zastawione)':''}${f[0]==='st'&&G.h[i]?' · '+(G.h[i]===5?'hotel':G.h[i]+' dom.'):''}</p>`:'<p>Wolne pole.</p>';
  return t+'<div class="mbt">'+propBtns(i)+'</div>';
}
function drawModal(){
  const m=root.querySelector('#cmmodal');let h='';
  if(modal.k==='info')h=infoHTML(modal.i);
  else{
    if(!mine()||G.ph==='over'){closeModal();return}
    const list=[];for(let i=0;i<40;i++)if(G.o[i]===G.cur)list.push(i);
    h=`<h3>Posesje: ${esc(cp().n)} · ${cp().m} €</h3>`+(list.length?list.map(i=>{const f=T[i];return `<div class="mrow"><span class="sw" style="background:${f[0]==='st'?GC[f[2]]:'#666'}"></span><b>${f[1]}</b><small>${G.mg[i]?'zastawione':f[0]==='st'?(G.h[i]===5?'hotel':G.h[i]+' dom.'):''}</small><div class="mbt">${propBtns(i)}</div></div>`}).join(''):'<p>Nie masz jeszcze posesji.</p>');
  }
  m.innerHTML='<div class="mbox">'+h+'<button class="cmb go" onclick="CM.closeModal()">Zamknij</button></div>';m.hidden=false;
}
function info(i){if(!G)return;modal={k:'info',i};render()}
function manage(){if(!G||!mine())return;modal={k:'manage'};render()}

/* ---------- wejścia ---------- */
function startLocal(players,money){
  ONL=false;ROOM=null;CODE='';statDone=false;
  G=create(players,money);shown={rid:G.rid,m:[],ev:0};modal=null;
  const g=document.getElementById('onlineGate');if(g)g.remove();
  const s=document.getElementById('setup');if(s)s.remove();
  present(true);
}
async function hostStart(rp,money,room){
  ONL=true;ROOM=room;CODE=(typeof onlineRoomCode!=='undefined'?onlineRoomCode:'');statDone=false;
  G=create(rp.map(p=>({uid:p.id,n:String(p.name||'Gracz').replace(/[<>&]/g,'').slice(0,14),c:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#e63946'})),money);
  G.by=myUid();shown={rid:G.rid,m:[],ev:0};modal=null;
  await room.child('cm').set(clean(G));
  await room.child('status').set('started');
  const g=document.getElementById('onlineGate');if(g)g.remove();
  const s=document.getElementById('setup');if(s)s.remove();
  present(true);
}
function remote(s){
  const n=norm(s);
  if(G&&n.rev<=G.rev)return;
  const first=!G;
  ONL=true;ROOM=(typeof onlineRoom!=='undefined'?onlineRoom:null);CODE=(typeof onlineRoomCode!=='undefined'?onlineRoomCode:'');
  G=n;
  if(first){shown={rid:G.rid,m:[],ev:G.ev?G.ev.id:0};const s2=document.getElementById('setup');if(s2)s2.remove()}
  present(first);stats();
}
function exit(force){
  if(force||confirm('Wyjść do menu głównego? Obecna gra zostanie przerwana.'))location.reload();
}
function setRoll(){act(()=>{if(G.ph!=='after')return false;G.ph='roll';log(cp().n+' rzuca ponownie (dublet)')})}

return {roll,buy,skip,endTurn,payDebt,bankrupt,build,sell,mort,unm,info,manage,closeModal,startLocal,hostStart,remote,exit,setRoll};
})();

