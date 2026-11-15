/* Wspólne klocki ekranów lobby (patrz lobby.css). */
(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let last='';
  const FL={cz:['🧠','❓','💬','🎭','🤔','⭐','🎈','🎪','💡','🔮'],kj:['🕵️','👤','❓','🎭','🔍','🧩','⭐','🃏','🎯','👀'],kod:['🔐','🔑','🔢','💣','🧮','⭐','🕵️','🗝️','7️⃣','🎯'],pm:['🌍','🏙️','🐘','🍎','🌷','🎬','📚','⚽','🎵','🍕'],stk:['⚓','🚢','💥','🌊','🐟','🧭','🏝️','⛵','🐙','🛟'],uno:['🟥','🟨','🟩','🟦','🃏','⛔','🔄','✨','➕','🎴'],lg:['Ł','A','B','C','D','E','F','G','H','I','Ż','Ó']};
  window.obEsc=esc;
  /* tło (pływające emotki) żyje w kontenerze gry i nie jest odtwarzane przy każdym odświeżeniu */
  function ensureBg(host,floats){
    setTimeout(()=>{
      const h=document.querySelector(host)||document.body;
      let bg=document.getElementById('obBg');
      if(!bg||bg.parentElement!==h){
        if(bg)bg.remove();
        bg=document.createElement('div');bg.id='obBg';bg.setAttribute('aria-hidden','true');h.insertBefore(bg,h.firstChild);
      }
      const key=(floats||[]).join('');
      if(bg.dataset.k!==key){
        bg.dataset.k=key;bg.innerHTML='';
        (floats||[]).forEach((e,i)=>{const s=document.createElement('span');s.textContent=e;
          s.style.left=((i*8.7+3)%96)+'%';s.style.animationDuration=(14+(i*5)%11)+'s';s.style.animationDelay='-'+((i*3.3)%14)+'s';bg.appendChild(s)});
      }
    },0);
  }
  /* o: {key,host,theme,words:[..],small:[..],tiles:[..],floats:[..],sub,body,msg,back:{label,onclick},compact} */
  window.obShell=function(o){
    const still=last===o.key;last=o.key;
    const lines=(o.words||[]).map(w=>{const ch=[...w];let i=0;return `<div class="ob-line" style="--n:${ch.length}">${ch.map(c=>c===' '?'<b style="width:.3em"></b>':`<b style="--i:${i++};--n:${ch.length}">${esc(c)}</b>`).join('')}</div>`}).join('');
    ensureBg(o.host||'body',o.floats||FL[o.theme]);
    return `<div class="ob${o.compact?' ob-compact':''}${still?' ob-still':''}" data-t="${esc(o.theme)}">
      ${o.back?`<button class="ob-back" onclick="${o.back.onclick}">${esc(o.back.label||'← Wstecz')}</button>`:''}
      <div class="ob-wrap">
        <div class="ob-logo" role="img" aria-label="${esc((o.words||[]).join(' '))}">${lines}</div>
        ${o.tiles&&o.tiles.length?`<div class="ob-tiles" aria-hidden="true">${o.tiles.map(t=>`<i>${esc(t)}</i>`).join('')}</div>`:''}
        ${o.sub?`<p class="ob-sub">${o.sub}</p>`:''}
        ${o.msg||''}
        ${o.body||''}
      </div></div>`;
  };
  window.obBtn=function(label,icon,onclick,kind,disabled,extra){
    return `<button class="ob-btn ob-${kind||'gold'}${extra?' '+extra:''}" ${disabled?'disabled':''} onclick="${onclick}">${icon?`<span class="ob-ic">${icon}</span>`:''}<span>${label}</span></button>`;
  };
  window.obRules=function(html){return `<details class="ob-rules"><summary>📖 Zasady gry</summary>${html}</details>`};
  window.obChip=function(label,on,onclick,disabled){return `<button class="ob-chip${on?' on':''}" ${disabled?'disabled':''} onclick="${onclick}">${label}</button>`};
  /* poczekalnia pokoju: o:{code,copy,players:[{name,color,host,me}],max,extra,test,note,start:{label,onclick,disabled}|null,leave:{label,onclick}} */
  window.obRoom=function(o){
    const pl=(o.players||[]).map((p,i)=>`<div class="ob-pl${p.me?' me':''}"><i style="background:${/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:'#888'}"></i><span>${i+1}. ${esc(p.name)}</span>${p.host?'<small>HOST</small>':(p.me?'<small>(Ty)</small>':'')}</div>`).join('');
    return `<div class="ob-pane ob-center"><label>Kod pokoju – podaj go znajomym</label><div class="ob-code">${esc(o.code)}</div>
        ${obBtn('Kopiuj kod','📋',`navigator.clipboard&amp;&amp;navigator.clipboard.writeText(${o.copy})`,'white',false,'ob-sm')}</div>
      <div class="ob-pane"><label>Gracze${o.max?` (${(o.players||[]).length}/${o.max})`:''}</label><div style="margin-top:8px">${pl}</div></div>
      ${o.extra||''}${o.test||''}
      ${o.note?`<p class="ob-note">${o.note}</p>`:''}
      ${o.start?obBtn(o.start.label||'Rozpocznij grę','🚀',o.start.onclick,'gold',o.start.disabled):''}
      ${o.leave?obBtn(o.leave.label||'Wyjdź z pokoju','🚪',o.leave.onclick,'white'):''}`;
  };
})();
