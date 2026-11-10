/* Czas gry – automatyczny pomiar czasu spędzonego w poszczególnych grach. */
(()=>{
  'use strict';
  const LABELS={
    monopoly:'Monopoly piłkarskie',litery:'Zgadywanie literek',isla:'Tukan',czolko:'Czółko',
    panstwa:'Państwa Miasta',podboj:'Podbój',statki:'Statki',kod:'Łamanie kodu',
    imperia:'Imperia',kj:'Kim jestem?',zycie:'Prawdziwe życie',ttt:'Kółko i krzyżyk',
    kulki:'Kulki',snl:'Węże i drabiny',pcw:'Prawda czy Wyzwanie',dobble:'Dobble',
    grzyb:'Grzybobranie',wisielec:'Wisielec',gofish:'Go Fish',kropki:'Kropki i Kwadraty',
    uno:'UNO',bierze:'6 bierze!',chinczyk:'Chińczyk',holearena:'Hole Arena',
    postaw:'Postaw na milion',szept:'Szept',guessr:'GuessR',darksweep:'Dark Sweep',
    krzyzowka:'Krzyżówka',tabu:'Tabu'
  };
  const TAB_GAME={
    1:'monopoly',2:'litery',3:'isla',4:'czolko',5:'panstwa',6:'podboj',7:'statki',8:'kod',
    12:'imperia',13:'kj',14:'zycie',15:'ttt',16:'kulki',17:'snl',18:'pcw',19:'dobble',
    20:'grzyb',21:'wisielec',22:'gofish',23:'kropki',24:'uno',25:'bierze',26:'chinczyk',
    27:'holearena',28:'postaw',29:'szept',30:'guessr',32:'darksweep',33:'krzyzowka',34:'tabu'
  };
  let active=null, listener=null, shownUid=null, currentData={};

  const uidNow=()=>{try{return typeof ACC!=='undefined'&&ACC.user&&ACC.user.uid?ACC.user.uid:'guest'}catch(e){return 'guest'}};
  const fmt=s=>{
    s=Math.max(0,Math.floor(Number(s)||0));
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    if(h)return `${h} godz. ${m} min`;
    if(m)return `${m} min ${sec} s`;
    return `${sec} s`;
  };
  const localKey=uid=>'fm_playtime_'+uid;
  function localRead(uid){try{return JSON.parse(localStorage.getItem(localKey(uid))||'{}')||{}}catch(e){return {}}}
  function localAdd(uid,game,seconds,session){
    const d=localRead(uid),v=d[game]||{seconds:0,sessions:0};
    v.seconds=(Number(v.seconds)||0)+seconds;
    if(session)v.sessions=(Number(v.sessions)||0)+1;
    d[game]=v;try{localStorage.setItem(localKey(uid),JSON.stringify(d))}catch(e){}
  }
  function dbAdd(uid,game,seconds,session){
    localAdd(uid,game,seconds,session);
    try{
      if(typeof fbDB!=='undefined'&&uid!=='guest'){
        fbDB.ref(`playtime/${uid}/${game}`).transaction(cur=>({
          seconds:(Number(cur&&cur.seconds)||0)+seconds,
          sessions:(Number(cur&&cur.sessions)||0)+(session?1:0)
        })).catch(()=>{});
      }
    }catch(e){}
  }
  function start(game){
    if(!game||!LABELS[game])return;
    if(active&&active.game===game)return;
    stop();
    const uid=uidNow();
    active={uid,game,last:Date.now(),paused:false};
    dbAdd(uid,game,0,true);
    try{sessionStorage.setItem('fm_active_playtime',JSON.stringify({uid,game}))}catch(e){}
  }
  function flush(){
    if(!active||active.paused)return;
    const now=Date.now(),seconds=Math.floor((now-active.last)/1000);
    if(seconds>0){dbAdd(active.uid,active.game,seconds,false);active.last+=seconds*1000}
  }
  function stop(){
    if(!active)return;
    flush();
    active=null;
    try{sessionStorage.removeItem('fm_active_playtime')}catch(e){}
  }
  function pause(){
    if(!active||active.paused)return;
    flush();active.paused=true;
  }
  function resume(){
    if(!active||!active.paused)return;
    active.paused=false;active.last=Date.now();
  }
  // Rozpocznij pomiar w momencie kliknięcia „Graj”.
  document.addEventListener('click',e=>{
    const play=e.target.closest&&e.target.closest('.hubgo');
    if(play){
      let n=1;try{n=Number(HUBLAST&&HUBLAST.g)||1}catch(x){}
      start(TAB_GAME[n]);
      return;
    }
    const btn=e.target.closest&&e.target.closest('button');
    if(btn){
      const label=(btn.innerText||btn.textContent||'').trim().toLowerCase();
      const handler=btn.getAttribute('onclick')||'';
      if(label.includes('menu główne')||/Exit\s*\(/i.test(handler)||/location\.reload/i.test(handler)){
        stop();
      }
    }
  },true);
  document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
  window.addEventListener('pagehide',flush);
  window.addEventListener('beforeunload',flush);
  setInterval(flush,15000);

  function render(){
    const box=document.getElementById('ptbox');if(!box)return;
    const rows=Object.keys(LABELS).map(k=>({key:k,label:LABELS[k],seconds:Number(currentData[k]&&currentData[k].seconds)||0,sessions:Number(currentData[k]&&currentData[k].sessions)||0}))
      .filter(x=>x.seconds>0||x.sessions>0).sort((a,b)=>b.seconds-a.seconds);
    const total=rows.reduce((s,x)=>s+x.seconds,0);
    const sessions=rows.reduce((s,x)=>s+x.sessions,0);
    box.innerHTML=`
      <div class="stbx">
        <div><b>${fmt(total)}</b><span>łączny czas gry</span></div>
        <div><b>${sessions}</b><span>sesje gier</span></div>
        <div><b>${rows.length}</b><span>różne gry</span></div>
      </div>
      <h3>Czas w poszczególnych grach</h3>
      ${rows.length?`<div class="stt">${rows.map(x=>`<div class="strow"><b>${x.label}</b><span>${fmt(x.seconds)} · ${x.sessions} ${x.sessions===1?'sesja':'sesji'}</span></div>`).join('')}</div>`:'<p class="lgnote">Nie ma jeszcze zarejestrowanego czasu gry. Wejdź do dowolnej gry przez przycisk „Graj”, a czas zacznie być liczony automatycznie.</p>'}
      <p class="lgnote">Czas zapisuje się na Twoim koncie. Pomiar zatrzymuje się po wyjściu z gry lub ukryciu karty przeglądarki.</p>`;
  }
  function open(){
    const box=document.getElementById('hubp');if(!box)return;
    box.innerHTML='<h2>Czas gry</h2><div id="ptbox"><p class="lgnote">Wczytywanie czasu gry…</p></div>';
    const uid=uidNow();shownUid=uid;currentData=localRead(uid);render();
    if(listener&&typeof fbDB!=='undefined'){try{listener.ref.off('value',listener.fn)}catch(e){}listener=null}
    if(uid!=='guest'){
      try{
        const ref=fbDB.ref(`playtime/${uid}`),fn=s=>{
          const remote=s.val()||{},local=localRead(uid);
          // Dane z bazy są główne; lokalny zapis służy jako kopia awaryjna.
          currentData=remote;
          Object.keys(local).forEach(k=>{if(!currentData[k])currentData[k]=local[k]});
          render();
        };
        ref.on('value',fn,()=>{currentData=localRead(uid);render()});
        listener={ref,fn};
      }catch(e){currentData=localRead(uid);render()}
    }else{
      const b=document.getElementById('ptbox');
      if(b)b.insertAdjacentHTML('beforeend','<p class="lgnote">Zaloguj się, aby synchronizować czas gry między urządzeniami. Na razie dane są zapisywane tylko w tej przeglądarce.</p>');
    }
  }
  // Rozszerz istniejącą nawigację bez ingerowania w pozostałe zakładki.
  const originalHubTab=window.hubTab;
  if(typeof originalHubTab==='function'){
    window.hubTab=function(n){
      originalHubTab(n);
      const tab=document.getElementById('hubtab9');
      if(tab){tab.classList.toggle('on',n===35);tab.setAttribute('aria-selected',n===35?'true':'false')}
      if(n===35)open();
    };
  }
  window.addEventListener('pagehide',()=>{if(listener){try{listener.ref.off('value',listener.fn)}catch(e){}}});
})();
