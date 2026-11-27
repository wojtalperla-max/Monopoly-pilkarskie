
/* ===== KROPKI I KWADRATY: gra w iframe, pokoje online przez Firebase, nick i kolor z konta, statystyki ===== */
function kroOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('kro').hidden=false;const f=document.getElementById('kroFrame');if(!f.dataset.loaded){f.src='gry/kropki-kwadraty/kropki-kwadraty.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__kroRefresh)f.contentWindow.__kroRefresh()}catch(e){}}}
function kroBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:kroStats}}
function kroStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('kropki_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'kropki',r,players);
}
function kroExit(){try{const f=document.getElementById('kroFrame');if(f&&f.contentWindow&&f.contentWindow.__kroLeave)f.contentWindow.__kroLeave()}catch(e){}document.getElementById('kro').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
/* ===== 6 BIERZE!: gra w iframe, pokoje online przez Firebase, nick i kolor z konta, statystyki ===== */
function bierzeOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('bie').hidden=false;const f=document.getElementById('bieFrame');if(!f.dataset.loaded){f.src='gry/bie/bie.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__sbRefresh)f.contentWindow.__sbRefresh()}catch(e){}}}
function sbBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:sbStats}}
function sbStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('bierze_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'bierze',r,players);
}
function bierzeExit(){try{const f=document.getElementById('bieFrame');if(f&&f.contentWindow&&f.contentWindow.__sbLeave)f.contentWindow.__sbLeave()}catch(e){}document.getElementById('bie').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
/* ===== CHIŃCZYK: gra w iframe, pokoje online przez Firebase, nick i kolor z konta, statystyki ===== */
function chinOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('chin').hidden=false;const f=document.getElementById('chinFrame');if(!f.dataset.loaded){f.src='gry/chin/chin.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__chRefresh)f.contentWindow.__chRefresh()}catch(e){}}}
function chinBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:chinStats}}
function chinStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('chinczyk_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'chinczyk',r,players);
}
function chinExit(){try{const f=document.getElementById('chinFrame');if(f&&f.contentWindow&&f.contentWindow.__chLeave)f.contentWindow.__chLeave()}catch(e){}document.getElementById('chin').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
/* ===== POSTAW NA MILION: gra w iframe, pokoje online przez Firebase, nick i kolor z konta, statystyki ===== */
function pnmOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('pnm').hidden=false;const f=document.getElementById('pnmFrame');if(!f.dataset.loaded){f.src='gry/postaw-na-milion/postaw-na-milion.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__pnmRefresh)f.contentWindow.__pnmRefresh()}catch(e){}}}
function pnmBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:pnmStats}}
function pnmStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('postaw_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'postaw',r,players);
}
function pnmExit(){try{const f=document.getElementById('pnmFrame');if(f&&f.contentWindow&&f.contentWindow.__pnmLeave)f.contentWindow.__pnmLeave()}catch(e){}document.getElementById('pnm').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}

/* ===== HOLE ARENA (pokoje online przez Firebase, nick i kolor z konta, statystyki rund) ===== */
function holeOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('hole').hidden=false;const f=document.getElementById('holeFrame');if(!f.dataset.loaded){f.src='gry/hole/hole.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__holeRefresh)f.contentWindow.__holeRefresh()}catch(e){}}}
function holeBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:holeStats,music:()=>new URL('assets/hole-music.mp3',document.baseURI).href}}
function holeStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('holearena_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'holearena',r,players);
}
function holeExit(){try{const f=document.getElementById('holeFrame');if(f&&f.contentWindow&&f.contentWindow.__holeLeave)f.contentWindow.__holeLeave()}catch(e){}document.getElementById('hole').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}

/* ===== SZEPT (horror 3D co-op: pokoje online przez Firebase, nick i kolor z konta, statystyki ucieczek) ===== */
let szeptMusicUrl='';
function szeptOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('szept').hidden=false;const f=document.getElementById('szeptFrame');if(!f.dataset.loaded){f.src='gry/szept/szept.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__szeptRefresh)f.contentWindow.__szeptRefresh()}catch(e){}}}
function szeptBin(key){return fetch(new URL('assets/szept/'+key+'.bin',document.baseURI)).then(r=>r.arrayBuffer())}
function szeptMusic(){return new URL('assets/szept/music.mp3',document.baseURI).href}
function szeptAnims(){return fetch(new URL('assets/szept/anims.json.gz',document.baseURI)).then(r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text())}
function szeptBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:szeptStats,asset:k=>szeptBin(k),anims:szeptAnims,music:szeptMusic}}
function szeptStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('szept_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'szept',r,players);
}
function szeptExit(){try{const f=document.getElementById('szeptFrame');if(f&&f.contentWindow&&f.contentWindow.__szeptLeave)f.contentWindow.__szeptLeave()}catch(e){}document.getElementById('szept').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}

/* ===== GUESSR (zgadywanka w iframe: pokoje online przez Firebase, nick i kolor z konta, statystyki rund) ===== */
function guessrOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('guessr').hidden=false;const f=document.getElementById('guessrFrame');if(!f.dataset.loaded){f.src='gry/guessr/guessr.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__guessrRefresh)f.contentWindow.__guessrRefresh()}catch(e){}}}
function guessrBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:guessrStats}}
function guessrStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('guessr_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'guessr',r,players);
}
function guessrExit(){try{const f=document.getElementById('guessrFrame');if(f&&f.contentWindow&&f.contentWindow.__guessrLeave)f.contentWindow.__guessrLeave()}catch(e){}document.getElementById('guessr').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}

/* ===== KRZYŻÓWKA (wspólna krzyżówka w iframe: pokoje online przez Firebase, nick i kolor z konta, statystyki) ===== */
function krzyzowkaOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('krzyzowka').hidden=false;const f=document.getElementById('krzyzowkaFrame');if(!f.dataset.loaded){f.src='gry/krzyzowka/krzyzowka.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__krzyzRefresh)f.contentWindow.__krzyzRefresh()}catch(e){}}}
function krzyzowkaBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:krzyzowkaStats}}
function krzyzowkaStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('krzyzowka_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'krzyzowka',r,players);
}
function krzyzowkaExit(){try{const f=document.getElementById('krzyzowkaFrame');if(f&&f.contentWindow&&f.contentWindow.__krzyzLeave)f.contentWindow.__krzyzLeave()}catch(e){}document.getElementById('krzyzowka').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}

/* ===== TABU (w iframe: pokoje online przez Firebase, nick i kolor z konta, statystyki meczów) ===== */
function tabuOpen(){const h=document.getElementById('hub');if(h)h.style.display='none';document.getElementById('tabu').hidden=false;const f=document.getElementById('tabuFrame');if(!f.dataset.loaded){f.src='gry/tabu/tabu.html';f.dataset.loaded='1'}else{try{if(f.contentWindow&&f.contentWindow.__tabuRefresh)f.contentWindow.__tabuRefresh()}catch(e){}}}
function tabuBridge(){return{db:fbDB,auth:onlineEnsureAuth,ts:firebase.database.ServerValue.TIMESTAMP,net:()=>!!(fbDB&&fbAuth),nick:()=>(typeof ACC!=='undefined'&&ACC.nick)||'',col:()=>(typeof ACC!=='undefined'&&/^#[0-9a-f]{6}$/i.test(ACC.col||'')?ACC.col:''),stats:tabuStats}}
function tabuStats(code,gid,players,r){
  if(!code||!gid||!players||players.length<2||!(r==='w'||r==='l'||r==='d'))return;
  statsRecord('tabu_'+String(code).toLowerCase().replace(/[^a-z0-9]/g,'')+'_'+String(gid).toLowerCase().replace(/[^a-z0-9]/g,''),'tabu',r,players);
}
function tabuExit(){try{const f=document.getElementById('tabuFrame');if(f&&f.contentWindow&&f.contentWindow.__tabuLeave)f.contentWindow.__tabuLeave()}catch(e){}document.getElementById('tabu').hidden=true;const h=document.getElementById('hub');if(h)h.style.display=''}
