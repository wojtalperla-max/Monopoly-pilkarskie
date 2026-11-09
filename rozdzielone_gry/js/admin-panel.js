
/* ===== PANEL ADMINA: edycja wygranych / przegranych / remisów graczy ===== */
const ADMS={users:null,uid:'',game:'monopoly',n:1,data:null,msg:'',busy:false};
function adminStatsOpen(){
  if(typeof ACC==='undefined'||!ACC.admin)return;
  msgClose();const d=document.createElement('div');d.id='msgpop';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.onclick=e=>{if(e.target===d)msgClose()};document.body.appendChild(d);
  ADMS.msg='';ADMS.data=null;adminStatsRender();
  fbDB.ref('publicUsers').once('value').then(sn=>{
    const v=sn.val()||{};
    ADMS.users=Object.keys(v).map(id=>({id,nick:String((v[id]&&v[id].nick)||'Gracz')})).sort((a,b)=>a.nick.localeCompare(b.nick,'pl'));
    if((!ADMS.uid||!v[ADMS.uid])&&ADMS.users.length)ADMS.uid=ADMS.users[0].id;
    adminStatsRender();return adminStatsLoad();
  }).catch(e=>{ADMS.msg='Błąd: '+(e&&e.message||e);adminStatsRender()});
}
async function adminStatsLoad(){
  if(!ADMS.uid){ADMS.data={};adminStatsRender();return}
  const uid=ADMS.uid;ADMS.data=null;adminStatsRender();
  try{const sn=await fbDB.ref('stats/'+uid).once('value');if(uid===ADMS.uid)ADMS.data=sn.val()||{}}
  catch(e){ADMS.data={};ADMS.msg='Nie udało się wczytać statystyk: '+(e&&e.message||e)}
  adminStatsRender();
}
function adminStatsPick(k,v){ADMS[k]=v;ADMS.msg='';if(k==='uid')adminStatsLoad();else adminStatsRender()}
function adminStatsRender(){
  const d=document.getElementById('msgpop');if(!d)return;
  const sel='font:inherit;padding:7px 12px;border-radius:6px;border:2px solid #52715d;background:#07150f;color:#fff;max-width:100%';
  const users=ADMS.users;
  let h='<div class="accbox"><h2>Statystyki graczy</h2><p class="lgnote">Dodawanie i usuwanie wygranych, przegranych i remisów wybranego gracza. Zmiana działa na statystyki gracza, podział na gry i ranking wygranych.</p>';
  if(!users){h+='<p class="lgnote">Ładowanie graczy…</p>'}
  else if(!users.length){h+='<p class="lgnote">Brak graczy.</p>'}
  else{
    h+='<div class="lgrow"><label>Gracz <select style="'+sel+'" onchange="adminStatsPick(\'uid\',this.value)">'+users.map(u=>`<option value="${lgEsc(u.id)}" ${u.id===ADMS.uid?'selected':''}>${lgEsc(u.nick)}</option>`).join('')+'</select></label></div>';
    h+='<div class="lgrow"><label>Gra <select style="'+sel+'" onchange="adminStatsPick(\'game\',this.value)">'+Object.keys(ST_GAMES).map(k=>`<option value="${k}" ${k===ADMS.game?'selected':''}>${lgEsc(ST_GAMES[k])}</option>`).join('')+'</select></label>';
    h+='<label>Ilość <input type="number" min="1" max="100" value="'+(+ADMS.n||1)+'" style="width:5.5em" oninput="ADMS.n=this.value"></label></div>';
    if(ADMS.data==null){h+='<p class="lgnote">Wczytywanie statystyk…</p>'}
    else{
      const arr=Object.keys(ADMS.data).map(k=>Object.assign({id:k},ADMS.data[k]));
      const q=stSum(arr.filter(x=>x.g===ADMS.game)),all=stSum(arr);
      h+=`<p class="lgnote">W tej grze: ${q.n} rozegranych · wszystkie gry: ${all.n} rozegranych (${all.w} W / ${all.l} P / ${all.d} R)</p>`;
      [['w','Wygrane',q.w],['l','Przegrane',q.l],['d','Remisy',q.d]].forEach(a=>{
        h+=`<div class="lgrow"><b style="min-width:130px">${a[1]}: ${a[2]}</b><button class="lgbtn go" ${ADMS.busy?'disabled':''} onclick="adminStatsChange('${a[0]}',1)">+ Dodaj</button><button class="lgbtn" ${ADMS.busy?'disabled':''} onclick="adminStatsChange('${a[0]}',-1)">− Usuń</button></div>`;
      });
    }
  }
  if(ADMS.msg)h+=`<div class="lgmsg">${lgEsc(ADMS.msg)}</div>`;
  h+='<div class="lgrow"><button class="lgbtn" onclick="adminPanelOpen()">← Panel admina</button><button class="lgbtn" onclick="msgClose()">Zamknij</button></div></div>';
  d.innerHTML=h;
}
async function adminStatsChange(r,sign){
  if(typeof ACC==='undefined'||!ACC.admin||ADMS.busy||!ADMS.uid)return;
  const n=Math.max(1,Math.min(100,parseInt(ADMS.n,10)||1)),uid=ADMS.uid,g=ADMS.game;
  const u=(ADMS.users||[]).find(x=>x.id===uid),nick=((u&&u.nick)||'Gracz').replace(/[<>&]/g,'').slice(0,14);
  const pref=(LB_WPREF.find(a=>a[1]===g)||[''])[0];
  const winKey=k=>k.indexOf('adm_')===0?lbSafe('win_'+pref+k+'_'+uid):lbSafe('win_'+k+'_'+uid);
  const T=firebase.database.ServerValue.TIMESTAMP,up={};
  ADMS.busy=true;ADMS.msg='';adminStatsRender();
  try{
    let info='';
    if(sign>0){
      for(let i=0;i<n;i++){
        const k='adm_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)+i;
        up['stats/'+uid+'/'+k]={g,r,n:1,t:T,adm:1};
        if(r==='w')up['bestScores/wins/'+winKey(k)]={u:uid,n:nick,p:1,t:T};
      }
      info='Dodano: '+n;
    }else{
      const v=(await fbDB.ref('stats/'+uid).once('value')).val()||{};
      const list=Object.keys(v).filter(k=>v[k]&&v[k].g===g&&v[k].r===r)
        .sort((a,b)=>((b.indexOf('adm_')===0)-(a.indexOf('adm_')===0))||((v[b].t||0)-(v[a].t||0))).slice(0,n);
      if(!list.length)throw new Error('Ten gracz nie ma takich wpisów w tej grze.');
      list.forEach(k=>{up['stats/'+uid+'/'+k]=null;if(r==='w')up['bestScores/wins/'+winKey(k)]=null});
      info='Usunięto: '+list.length+(list.length<n?' (tyle było dostępnych)':'');
    }
    await fbDB.ref().update(up);
    try{if(typeof LB!=='undefined'&&LB.cache)delete LB.cache.wins}catch(e){}
    ADMS.msg=info;
  }catch(e){ADMS.msg='Nie udało się zapisać: '+(e&&e.message||e)}
  ADMS.busy=false;
  await adminStatsLoad();
}
