/* Zimowy event DGW – wspólny dla strony i osadzonych gier. */
(() => {
  'use strict';
  const hub = document.getElementById('hub');
  const paths = { event:'winterEvent/enabled', gifts:'winterGifts/' };
  const games = [...document.querySelectorAll('body > div[id] > iframe')].map(f=>f.parentElement.id);
  const tabs = [...document.querySelectorAll('#hubsubg button')].map(b=>b.getAttribute('onclick'));
  const pool = ['home', ...tabs.map(t=>'tab:'+t), ...games.map(g=>'game:'+g)];
  let enabled=false, known=false, uid='', collected={}, loaded=false, saving=new Set(), ref=null, listener=null, config=null, layout=[], elapsed=0, last=Date.now(), error='';
  const visible = el => !!el && !el.hidden && el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden';
  const make = (tag,cls,text) => {const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
  const btn=make('button','lgbtn winter-counter','🎁 Prezenty');btn.type='button';btn.hidden=true;
  document.getElementById('randomGameBtn').after(btn);
  const snow=make('div','winter-snow');snow.setAttribute('aria-hidden','true');hub.append(snow);
  for(let i=0;i<70;i++){const f=make('i','winter-flake',i%3?'•':'❄');f.style.cssText=`left:${Math.random()*100}%;font-size:${7+Math.random()*13}px;--fall:${5+Math.random()*12}s;--delay:${-Math.random()*15}s;--drift:${Math.random()*90-45}px`;snow.append(f);}
  const gift=make('button','winter-hidden-gift','🎁');gift.type='button';gift.hidden=true;gift.setAttribute('aria-label','Podnieś ukryty prezent');document.body.append(gift);
  const toast=make('div','winter-toast');toast.hidden=true;toast.setAttribute('role','status');document.body.append(toast);
  let toastTimer, shownId=-1, adminUpdate=null;
  function notify(s){toast.textContent=s;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3200);}
  function randomFor(str){let a=2166136261;for(const c of str)a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  function plan(){const r=randomFor(uid+'-winter-2026'), a=pool.filter(x=>x!=='home');for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}const selected=['home',...a.slice(0,19)];return selected.map((place,id)=>({id,place,x:r(),y:r()}));}
  function count(){return Array.from({length:20},(_,i)=>collected[i]===true).filter(Boolean).length;}
  function refresh(){btn.hidden=!enabled;btn.textContent='🎁 Prezenty'+(uid&&loaded?' '+count()+'/20':'');if(document.getElementById('winterProgress')) renderProgress();}
  function setEnabled(v){if(enabled!==v){elapsed=0;last=Date.now();}enabled=v;known=true;hub.classList.toggle('winter-active',v);if(!v)gift.hidden=true;refresh();}
  function syncAccount(){const next=ACC.user?ACC.user.uid:'';if(uid===next)return;if(ref&&listener)ref.off('value',listener);uid=next;collected={};saving=new Set();loaded=false;error='';layout=uid?plan():[];gift.hidden=true;ref=null;listener=null;if(uid&&fbDB){const owner=uid;ref=fbDB.ref(paths.gifts+uid);listener=s=>{if(uid!==owner)return;collected=s.val()||{};loaded=true;error='';refresh();};ref.on('value',listener,e=>{if(uid!==owner)return;loaded=false;error=e.message;refresh();});}refresh();}
  function modal(title){msgClose();const d=make('div','');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.onclick=e=>{if(e.target===d)msgClose();};const box=make('div','accbox');box.append(make('h2','',title));d.append(box);document.body.append(d);return box;}
  function action(label,fn){const b=make('button','lgbtn',label);b.type='button';b.onclick=fn;return b;}
  function renderProgress(){const p=document.getElementById('winterProgress');if(!p)return;p.replaceChildren();if(!enabled){p.append(make('p','','Event jest wyłączony.'));return;}if(!uid){p.append(make('p','','Zaloguj się, aby zbierać prezenty i zapisywać postęp na swoim koncie.'));p.append(action('Zaloguj się',()=>{msgClose();accOpen('login');}));return;}if(!loaded){p.append(make('p','',error?'Nie udało się wczytać prezentów: '+error:'Wczytywanie prezentów…'));return;}const n=count();p.append(make('h3','',`${n} / 20 zebranych`));const bar=make('progress','winter-progress');bar.max=20;bar.value=n;p.append(bar);const grid=make('div','winter-gift-grid');for(let i=0;i<20;i++){const found=collected[i]===true;const cell=make('span',found?'found':'',found?'🎁':'?');cell.setAttribute('aria-label',`Prezent ${i+1}: ${found?'zebrany':'ukryty'}`);grid.append(cell);}p.append(grid,make('p','lgnote',n===20?'Brawo! Wszystkie prezenty odnalezione!':'Szukaj na stronie głównej, kartach gier i w grach. Każdy prezent można zdobyć tylko raz.'));}
  btn.onclick=()=>{const box=modal('🎁 Zimowe prezenty');const p=make('div','');p.id='winterProgress';box.append(p,action('Zamknij',msgClose));renderProgress();};
  window.winterAdminOpen=()=>{if(!ACC.admin)return;const box=modal('❄ Zimowy event');const status=make('p','','');const toggle=action('',async()=>{if(!ACC.admin||!known||!config)return;toggle.disabled=true;try{await config.set(!enabled);status.textContent='Zapisano ustawienie.';}catch(e){status.textContent='Błąd zapisu: '+e.message;}finally{update();}});function update(){toggle.textContent=enabled?'Wyłącz zimowy event':'Włącz zimowy event';toggle.disabled=!known||!ACC.admin;}adminUpdate=update;box.append(make('p','lgnote','Ustawienie obowiązuje wszystkich graczy. Wyłączenie eventu nie usuwa zebranych prezentów.'),status,toggle,action('← Panel admina',adminPanelOpen));update();};
  const originalAdmin=window.adminPanelOpen;
  window.adminPanelOpen=function(...args){originalAdmin.apply(this,args);if(!ACC.admin)return;const row=document.querySelector('#msgpop .accbox .lgrow');if(row)row.append(action('❄ Zimowy event',window.winterAdminOpen));};
  function locate(){if(visible(hub)){const t=document.querySelector('#hubsubg:not([hidden]) button.on');return {places:['home',t?'tab:'+t.getAttribute('onclick'):''],rect:hub.getBoundingClientRect()};}const g=games.find(id=>visible(document.getElementById(id)));if(g){const el=document.getElementById(g),frame=el.querySelector('iframe');return {places:['game:'+g],rect:(visible(frame)?frame:el).getBoundingClientRect()};}return null;}
  function tick(){syncAccount();if(!config&&typeof fbDB!=='undefined'&&fbDB){config=fbDB.ref(paths.event);config.on('value',s=>{setEnabled(s.val()===true);if(adminUpdate)adminUpdate();},e=>{known=false;if(adminUpdate)adminUpdate();console.warn('Zimowy event:',e.message);});}
    const now=Date.now();if(enabled&&visible(hub)){elapsed+=Math.min(now-last,1000);hub.style.setProperty('--winter-cap',Math.min(8,elapsed/6500)+'px');}last=now;
    if(!enabled||!uid||!loaded||document.querySelector('#msgpop,#acc')){gift.hidden=true;return;}const loc=locate();if(!loc){gift.hidden=true;return;}const g=layout.find(x=>loc.places.includes(x.place)&&collected[x.id]!==true&&!saving.has(x.id));if(!g){gift.hidden=true;return;}const r=loc.rect;if(r.width<65||r.height<65){gift.hidden=true;return;}shownId=g.id;const w=innerWidth,h=innerHeight;const left=Math.max(5,r.left),right=Math.min(w-38,r.right-38),top=Math.max(5,r.top),bottom=Math.min(h-40,r.bottom-40);if(right<=left||bottom<=top){gift.hidden=true;return;}gift.style.left=(left+g.x*(right-left))+'px';gift.style.top=(top+g.y*(bottom-top))+'px';gift.hidden=false;
  }
  gift.onclick=async()=>{const id=shownId,owner=uid;if(!enabled||!loaded||!ref||id<0||saving.has(id)||collected[id]===true)return;const target=ref.child(String(id));const pending=saving;pending.add(id);gift.hidden=true;try{const result=await target.transaction(v=>v===true?undefined:true);if(uid===owner&&result.committed){collected[id]=true;refresh();notify('🎁 Prezent zdobyty! '+count()+'/20');}}catch(e){if(uid===owner)notify('Nie udało się zapisać prezentu: '+e.message);}finally{pending.delete(id);}};
  setInterval(tick,350);tick();
})();
