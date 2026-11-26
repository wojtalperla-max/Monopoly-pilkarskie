/* ==========================================================
   Imperia – drzewko umiejętności (zakładka u góry, każda nacja ma własne)
   Koszt umiejętności: 40–80 złota (rośnie z poziomem). Bonusy działają w grze przez skB().
   ========================================================== */
var SK_COST = 40, SK_STEP = 96;

/* --- efekty (te same 4 gałęzie dla każdej nacji; nazwy i klimat są unikalne) --- */
var SK_EFF = {
  w: [{atk:1},{fort:1},{atk:1},{disc:1},{disc:1},{atk:1},{fort:1},{dmg:1},{crit:1},{hp:1},{dmg:1},{loot:1},{crit:1},{inc:1},{inc:1},{inc:1},{dmg:1}],
  e: [{inc:1},{inc:1},{disc:1},{inc:1},{inc:1},{vis:1},{inc:2},{inc:1},{inc:1},{inc:1},{inc:1},{inc:1},{inc:2},{loot:1},{inc:1},{inc:1},{inc:1}],
  z: [{vis:1},{inc:1},{mov:1},{vis:1},{inc:1},{inc:1},{inc:1},{amb:1},{bmov:1},{rng:1},{inc:1},{bmov:1},{inc:2},{amb:1},{inc:1},{inc:1},{inc:1}],
  d: [{def:1},{fort:1},{def:1},{inc:1},{def:1},{disc:1},{inc:1},{hp:1},{wall:1},{hp:1},{wall:1},{inc:1},{hp:1},{inc:1},{inc:1},{inc:1},{inc:1}]
};
/* nazwy dodatkowych umiejętności (wspólne dla nacji): indeksy 7-16 */
var SK_XN = {
  w:'Szlifowane Ostrza|Cios w Słaby Punkt|Weterani Bitew|Ciężkie Uderzenie|Zwycięski Rabunek|Mistrz Pola Bitwy|Kontrybucja Wojenna|Trofea Wojenne|Okup za Jeńców|Dobijanie Rannych'.split('|'),
  e:'Kopalnie|Rzemiosło|Spichlerze|Sieć Handlowa|Banki|Złoty Wiek|Konfiskata Łupów|Cło Graniczne|Targi Miejskie|Złote Żyły'.split('|'),
  z:'Zasadzka|Szybkie Nogi|Dalekosiężne Łuki|Mapy Wywiadu|Marsz Forsowny|Szpiedzy w Obozie|Atak z Zaskoczenia|Handel Informacją|Przemytnicy|Sieć Szpiegów'.split('|'),
  d:'Hartowane Zbroje|Wzmocnione Mury|Twarde Chłopy|Kamienne Bastiony|Spichlerz Oblężniczy|Niezłomna Obrona|Podatek Warowny|Warty Straży|Zapasy Twierdzy|Dziedzictwo Obrońców'.split('|')
};
var SK_ICON = {atk:'⚔️',def:'🛡️',fort:'🏰',disc:'🏷️',inc:'💰',vis:'👁️',mov:'🐎',hp:'❤️',rng:'🏹',crit:'🎯',dmg:'🗡️',bmov:'👟',loot:'💎',amb:'🌑',wall:'🧱'};
var SK_CAP = {atk:3,def:3,fort:3,disc:4,vis:3,mov:1,inc:99,hp:4,rng:1,crit:2,dmg:3,bmov:2,loot:2,amb:2,wall:2};
var SK_LBL = {w:['WOJNA','⚔️'],e:['GOSPODARKA','💰'],z:['ZWIAD','🧭'],d:['OBRONA','🛡️']};
/* gałęzie: góra = wojna, prawo = gospodarka, dół = zwiad, lewo = obrona */
var SK_ARMS = [{k:'w',dx:0,dy:-1},{k:'e',dx:1,dy:0},{k:'z',dx:0,dy:1},{k:'d',dx:-1,dy:0}];
/* a = odległość wzdłuż ramienia, l = odchylenie, p = rodzice (indeksy) – wystarczy jeden */
var SK_TPL = [{a:2,l:0,p:[]},{a:3,l:-1,p:[0]},{a:3,l:1,p:[0]},{a:4,l:0,p:[1,2]},{a:5,l:-1,p:[3]},{a:5,l:1,p:[3]},{a:6,l:0,p:[4,5]},
  {a:7,l:-1,p:[6]},{a:7,l:1,p:[6]},{a:8,l:0,p:[7,8]},{a:9,l:-1,p:[9]},{a:9,l:1,p:[9]},{a:10,l:0,p:[10,11]},
  {a:5,l:-2,p:[4]},{a:5,l:2,p:[5]},{a:8,l:-2,p:[7]},{a:8,l:2,p:[8]}];
function skCostOf(idx){ return idx < 7 ? 40 : idx === 12 ? 80 : idx < 12 ? 55 : 50 }

var SK_DATA = [
 {ic:'🦅',br:{w:'Husaria',e:'Szlak Bursztynowy',z:'Puszcza',d:'Grody'},
  nm:{w:'Kopia Husarska|Skrzydła Orle|Hart Piastów|Zbrojmistrz|Kuźnia Gniezna|Szarża Chrobrego|Orzeł Zwycięski',
      e:'Bursztyn|Targ w Gnieźnie|Cech Kupców|Sól z Wieliczki|Hanza Gdańska|Mennica|Skarbiec Królewski',
      z:'Leśni Zwiadowcy|Znaki Puszczy|Konni Posłańcy|Wieża Strażnicza|Ścieżki Bartników|Sokoli Wzrok|Oko Orła',
      d:'Gród Drewniany|Palisada|Wały Biskupina|Strzelnice|Mur Kazimierzowski|Barbakan|Twierdza Piastów'}},
 {ic:'🪓',br:{w:'Berserkerzy',e:'Łupy i Handel',z:'Żeglarze',d:'Długie Domy'},
  nm:{w:'Topór Berserka|Mur Tarcz|Szał Bitewny|Kuźnia Thora|Runy Wojny|Krwawy Orzeł|Ragnarök',
      e:'Łup z Wybrzeża|Targ w Birce|Srebro Danegeld|Kupcy Północy|Bursztynowy Szlak|Skarbiec Smoka|Złoto Odyna',
      z:'Smocza Łódź|Gwiezdny Kompas|Kruki Odyna|Żagiel Północy|Morskie Szlaki|Wizja Skalda|Oko Heimdalla',
      d:'Tarcza Drewniana|Długi Dom|Palisada Fiordu|Runy Ochrony|Bastion Jarla|Wieża Skalda|Dąb Yggdrasil'}},
 {ic:'🏛️',br:{w:'Legiony',e:'Imperium',z:'Wywiad',d:'Fortyfikacje'},
  nm:{w:'Gladius|Pilum|Szarża Legionu|Kuźnia Rzymu|Centurioni|Kohorty Elitarne|Triumf Cezara',
      e:'Podatek Prowincji|Forum Handlowe|Denary|Akwedukt|Via Appia|Mennica Cesarska|Skarbiec Cezara',
      z:'Speculatores|Drogi Rzymu|Cursus Publicus|Tablice Map|Eksploratorzy|Wieże Sygnałowe|Oko Imperium',
      d:'Castrum|Fosa i Wał|Tarcza Legionu|Wieże Obronne|Mur Hadriana|Limes|Forteca Aeterna'}},
 {ic:'🐎',br:{w:'Orda',e:'Jedwabny Szlak',z:'Zwiad Stepu',d:'Jurty i Step'},
  nm:{w:'Łuk Refleksyjny|Konny Łucznik|Szarża Kełeszów|Kuźnia Stepu|Tumeny|Gwardia Chana|Gniew Czyngis-chana',
      e:'Daniny|Karawana|Jedwab|Yam Pocztowy|Targ Karakorum|Skarbiec Chana|Złota Orda',
      z:'Jeździec Stepowy|Poczta Yam|Sokoły Łowne|Dym Sygnałowy|Szybkie Konie|Oko Stepu|Wiatr Wschodni',
      d:'Wóz Wojenny|Obóz Jurt|Spalona Ziemia|Kamienne Obo|Bastion Stepu|Strażnicy Chana|Niezłomna Orda'}},
 {ic:'🏺',br:{w:'Faraon',e:'Nil',z:'Piaski',d:'Piramidy'},
  nm:{w:'Włócznia Nilu|Rydwan|Khopesz|Łucznicy Nubii|Gwardia Faraona|Gniew Seta|Boskie Ostrze',
      e:'Wylew Nilu|Spichlerz|Papirus|Port Aleksandrii|Handel Złotem|Świątynia Amona|Skarbiec Ra',
      z:'Skrybowie Map|Pustynny Zwiadowca|Karawana Oazy|Oko Horusa|Gwiazdy Syriusza|Burza Piaskowa|Wizja Ra',
      d:'Mur z Cegły|Kamienne Bloki|Sfinks Strażnik|Pułapki Grobowca|Tarcza Horusa|Piramida|Wieczna Twierdza'}},
 {ic:'☀️',br:{w:'Słoneczna Armia',e:'Złoto Inków',z:'Chaskis',d:'Andyjskie Mury'},
  nm:{w:'Maczuga Inków|Proca|Wojownicy Słońca|Kuźnia Andów|Strażnicy Inty|Gniew Pachacutiego|Złoty Szturm',
      e:'Pola Tarasowe|Quipu|Spichlerze Qollqa|Złoto Andów|Droga Inków|Mennica Słońca|Skarb Słońca',
      z:'Biegacz Chaski|Mosty Linowe|Drogi Qhapaq|Kondor Zwiadowca|Sygnały Dymne|Oko Kondora|Wizja Inty',
      d:'Taras Obronny|Mur Sacsayhuamán|Przełęcz Górska|Kamień bez Zaprawy|Pueblo Obronne|Machu Picchu|Tarcza Inty'}}
];

/* --- budowa drzewka nacji --- */
var _skCache = {};
function skTree(ni){
  if(_skCache[ni]) return _skCache[ni];
  var D = SK_DATA[ni] || SK_DATA[0], nodes = [], i = 0;
  SK_ARMS.forEach(function(arm){
    var names = D.nm[arm.k].split('|').concat(SK_XN[arm.k]);
    SK_TPL.forEach(function(t, idx){
      var ef = SK_EFF[arm.k][idx], key = Object.keys(ef)[0];
      nodes.push({
        id: ni + '-' + arm.k + idx, br: arm.k, idx: idx, name: names[idx], cost: skCostOf(idx), eff: ef, key: key, ic: SK_ICON[key],
        x: (t.a * arm.dx + t.l * (-arm.dy)) * SK_STEP,
        y: (t.a * arm.dy + t.l * arm.dx) * SK_STEP,
        par: t.p.length ? t.p.map(function(q){return ni + '-' + arm.k + q}) : ['hub']
      });
    });
  });
  return _skCache[ni] = nodes;
}
function skOwnedList(pi){ var p = S && S.pl && S.pl[pi]; return (p && p.sk) || []; }

/* suma bonusów gracza (używane przez silnik gry) */
function skB(pi, key){
  try{
    var p = S && S.pl && S.pl[pi]; if(!p || !p.sk || !p.sk.length) return 0;
    var set = {}, t = 0; p.sk.forEach(function(id){ set[id] = 1 });
    skTree(p.ni).forEach(function(n){ if(set[n.id] && n.eff[key]) t += n.eff[key] });
    return Math.min(t, SK_CAP[key] == null ? 99 : SK_CAP[key]);
  }catch(e){ return 0 }
}
function skDesc(n){
  var e = n.eff;
  if(e.atk) return '+' + e.atk + ' do ataku Twoich jednostek w bitwie';
  if(e.def) return '+' + e.def + ' do obrony Twoich jednostek w bitwie';
  if(e.fort) return '+' + e.fort + ' do obrony, gdy to Ty się bronisz';
  if(e.disc) return 'Wszystkie jednostki tańsze o ' + e.disc + ' złota (min. cena 5)';
  if(e.inc) return '+' + e.inc + ' złota na turę';
  if(e.vis) return '+' + e.vis + ' do zasięgu widzenia';
  if(e.mov) return '+' + e.mov + ' do ruchu jednostek';
  if(e.hp) return '+' + e.hp + ' HP każdej jednostki w bitwie';
  if(e.rng) return 'Łucznicy strzelają o ' + e.rng + ' pole dalej';
  if(e.crit) return 'Trafienie krytyczne wypada już od ' + (20 - e.crit) + ' na k20';
  if(e.dmg) return '+' + e.dmg + ' do obrażeń Twoich jednostek';
  if(e.bmov) return '+' + e.bmov + ' do ruchu jednostek w bitwie';
  if(e.loot) return '+' + e.loot + ' złota za każdą zabitą jednostkę wroga';
  if(e.amb) return '+' + e.amb + ' do ataku w pierwszej turze bitwy (gdy atakujesz)';
  if(e.wall) return 'Mury Twoich miast dają +' + e.wall + ' osłony więcej';
  return '';
}

/* --- styl --- */
(function(){
  var st = document.createElement('style');
  st.textContent = [
  '#skBtn{position:relative}',
  '#skBtn.dot::after{content:"";position:absolute;right:-3px;top:-3px;width:9px;height:9px;background:#f0a030;border-radius:50%;box-shadow:0 0 8px #f0a030}',
  '#skBtn.on{background:#d9d6cb;color:#15191f}',
  '#sk{display:none;flex:1;min-height:0;position:relative;overflow:hidden;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;',
  ' background:radial-gradient(ellipse at 50% 45%,#1a1d22 0,#0d0f13 55%,#07080a 100%)}',
  '#sk::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;',
  ' background:repeating-radial-gradient(ellipse at 30% 30%,transparent 0 38px,rgba(255,255,255,.025) 39px 40px),repeating-radial-gradient(ellipse at 75% 70%,transparent 0 52px,rgba(255,255,255,.02) 53px 54px)}',
  '#sk.drag{cursor:grabbing}',
  '#game.sk-on #main,#game.sk-on #act,#game.sk-on #toast{display:none!important}',
  '#game.sk-on #sk{display:block}',
  '#skw{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0}',
  '#skw svg{position:absolute;left:-1400px;top:-1400px;width:2800px;height:2800px;pointer-events:none;overflow:visible}',
  '#skw line{stroke:#4a4d54;stroke-width:3;stroke-linecap:round}',
  '#skw line.av{stroke:#8c8f96}',
  '#skw line.ow{stroke:var(--nc);stroke-width:4;filter:drop-shadow(0 0 5px var(--nc))}',
  '.skn{position:absolute;width:66px;height:66px;margin:-33px 0 0 -33px;border-radius:11px;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;',
  ' background:linear-gradient(145deg,#2a2d33,#17191d);border:2px solid #3c3f46;cursor:pointer;transition:transform .15s,box-shadow .2s,filter .2s}',
  '.skn i{font-style:normal;font-size:27px;line-height:1;transform:rotate(-45deg);filter:grayscale(1) brightness(.7)}',
  '.skn:hover{transform:rotate(45deg) scale(1.1)}',
  '.skn.lk{opacity:.55}',
  '.skn.av{background:linear-gradient(145deg,#3b3e45,#22252a);border-color:#b9bcc4;box-shadow:0 0 0 0 rgba(240,204,131,.5);animation:skpulse 2s infinite}',
  '.skn.av i{filter:grayscale(.3) brightness(1)}',
  '.skn.ow{background:linear-gradient(145deg,#e6e3d8,#c9c6ba);border-color:var(--nc);box-shadow:0 0 16px -2px var(--nc)}',
  '.skn.ow i{filter:none}',
  '.skn.sel{outline:3px solid #f0cc83;outline-offset:5px}',
  '@keyframes skpulse{0%{box-shadow:0 0 0 0 rgba(240,204,131,.45)}70%{box-shadow:0 0 0 14px rgba(240,204,131,0)}100%{box-shadow:0 0 0 0 rgba(240,204,131,0)}}',
  '.skhub{position:absolute;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:14px;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;',
  ' background:linear-gradient(145deg,#32353c,#16181c);border:3px solid #e6e3d8;box-shadow:0 0 28px -4px var(--nc),inset 0 0 22px rgba(0,0,0,.5)}',
  '.skhub i{font-style:normal;font-size:44px;transform:rotate(-45deg)}',
  '.sklb{position:absolute;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;pointer-events:none;font-family:Fredoka,Inter,sans-serif;font-weight:700;letter-spacing:.08em;color:#cfd3da;font-size:15px;text-shadow:0 2px 6px #000}',
  '.sklb small{display:block;font-weight:500;letter-spacing:.04em;color:var(--nc);font-size:12px;filter:brightness(1.4)}',
  '.skbox{position:absolute;top:14px;z-index:4;display:flex;align-items:center;gap:12px;padding:10px 18px;background:linear-gradient(90deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1);',
  ' font-family:Fredoka,Inter,sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#e8edf5;pointer-events:none;cursor:default}',
  '.skbox b{font-size:34px;line-height:1;font-weight:600}',
  '.skbox span{font-size:15px;font-weight:600;color:#cfd3da}',
  '#skg{left:14px}',
  '#skc{right:14px;flex-direction:row-reverse;text-align:right;background:linear-gradient(270deg,color-mix(in srgb,var(--nc) 30%,transparent),rgba(255,255,255,.02));border-color:color-mix(in srgb,var(--nc) 50%,transparent)}',
  '#skc span{color:var(--nc);filter:brightness(1.4)}',
  '#skbon{position:absolute;right:14px;top:84px;z-index:4;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px;max-width:300px;pointer-events:none}',
  '#skbon em{font-style:normal;font-size:12px;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);color:#e8d5aa}',
  '#skd{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:5;width:min(560px,calc(100% - 24px));display:flex;gap:14px;align-items:center;padding:14px 16px;',
  ' background:linear-gradient(150deg,rgba(30,34,41,.97),rgba(14,16,20,.97));border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 14px 40px rgba(0,0,0,.5);cursor:default}',
  '#skd .ic{flex:none;width:56px;height:56px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;background:#d9d6cb;border:2px solid var(--nc)}',
  '#skd .tx{flex:1;min-width:0}',
  '#skd h4{margin:0;font-family:Fredoka,Inter,sans-serif;font-size:18px;color:#f0d9ad;letter-spacing:.02em}',
  '#skd p{margin:2px 0 0;font-size:13px;color:#b7c0cd;line-height:1.4}',
  '#skd .br{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--nc);filter:brightness(1.4)}',
  '#skd button{flex:none;min-width:130px;padding:11px 14px;font-weight:700;border-radius:12px;background:linear-gradient(#e9c982,#c9a054);color:#1a1408;border:0}',
  '#skd button:disabled{background:#2a2e36;color:#8c95a3;opacity:1}',
  '#skd button.done{background:#d9d6cb;color:#15191f}',
  '#skd.empty{justify-content:center;color:#9aa6b6;font-size:14px}',
  '#skz{position:absolute;left:14px;top:84px;z-index:4;display:flex;flex-direction:column;gap:6px}',
  '#skz button{width:38px;height:38px;padding:0;font-size:18px;border-radius:10px;background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12)}',
  '#sktoast{position:absolute;left:50%;bottom:112px;transform:translateX(-50%);z-index:6;padding:8px 14px;border-radius:12px;background:rgba(40,16,16,.95);border:1px solid #a24;color:#ffb3b3;font-size:13px;display:none;pointer-events:none}',
  '@media(max-width:700px){.skbox b{font-size:24px}.skbox span{font-size:11px}.skbox{padding:7px 11px;top:8px}#skbon{top:62px;max-width:170px}#skz{top:62px}#skd{flex-wrap:wrap}#skd button{width:100%}}'
  ].join('\n');
  document.head.appendChild(st);
})();

/* --- elementy --- */
var skTab = 'map', skSel = null, skView = {z:1, x:0, y:0, nation:-1}, skSig = '', skMsgT = 0;
var game = document.getElementById('game'), hdEl = document.getElementById('hd');
var skEl = document.createElement('div'); skEl.id = 'sk';
skEl.innerHTML = '<div id="skg" class="skbox"><b id="skgv">0</b><span>Złota</span></div><div id="skc" class="skbox"><b id="skcv">0</b><span>Umiejętności</span></div><div id="skbon"></div>'
  + '<div id="skz"><button type="button" data-z="1" title="Przybliż">＋</button><button type="button" data-z="-1" title="Oddal">－</button><button type="button" data-z="0" title="Wyśrodkuj">⌖</button></div>'
  + '<div id="skw"></div><div id="sktoast"></div><div id="skd" class="empty"></div>';
game.insertBefore(skEl, document.getElementById('main').nextSibling);

function skMe(){ try{ return S ? meIdx() : -1 }catch(e){ return -1 } }

function skSetTab(t){
  if(t === skTab) return;
  skTab = t;
  game.classList.toggle('sk-on', t === 'sk');
  skBtnSync();
  if(t === 'sk'){ skView.nation = -1; skRefresh(true) }
  else { try{ render() }catch(e){} try{ window.dispatchEvent(new Event('resize')) }catch(e){} }
}

/* --- rysowanie drzewka --- */
function skFit(){
  var w = skEl.clientWidth || 800, h = skEl.clientHeight || 600;
  var z = Math.min(w, h - 40) / 2450;
  skView.z = Math.max(.2, Math.min(1.05, z));
  skView.x = w / 2; skView.y = h / 2 - 10;
}
function skApply(){ document.getElementById('skw').style.transform = 'translate(' + skView.x + 'px,' + skView.y + 'px) scale(' + skView.z + ')' }

function skStates(pi){
  var ni = S.pl[pi].ni, owned = {}, st = {};
  skOwnedList(pi).forEach(function(id){ owned[id] = 1 });
  var nodes = skTree(ni);
  nodes.forEach(function(n){
    if(owned[n.id]) st[n.id] = 'ow';
    else st[n.id] = n.par.some(function(q){ return q === 'hub' || owned[q] }) ? 'av' : 'lk';
  });
  return {nodes: nodes, st: st, owned: owned};
}

function skRefresh(force){
  if(!S || !S.pl) return;
  var pi = skMe(); if(pi < 0 || !S.pl[pi]) return;
  var p = S.pl[pi], ni = p.ni, D = SK_DATA[ni] || SK_DATA[0], col = (typeof N !== 'undefined' && N[ni]) ? N[ni].c : '#d6aa5b';
  var sig = [pi, ni, p.g || 0, (p.sk || []).join(','), skSel, skTab, mineTurn() ? 1 : 0].join('|');
  if(!force && sig === skSig) return;
  skSig = sig;
  var info = skStates(pi), nodes = info.nodes, st = info.st;
  skEl.style.setProperty('--nc', col);
  if(skView.nation !== ni){ skView.nation = ni; skFit(); skSel = null }
  var pos = {hub: {x: 0, y: 0}}; nodes.forEach(function(n){ pos[n.id] = n });
  var lines = '', html = '';
  nodes.forEach(function(n){
    n.par.forEach(function(q){
      var a = pos[q], cls = (q === 'hub' || st[q] === 'ow') ? (st[n.id] === 'ow' ? 'ow' : (st[n.id] === 'av' ? 'av' : '')) : '';
      lines += '<line class="' + cls + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + n.x + '" y2="' + n.y + '"/>';
    });
  });
  html += '<svg viewBox="-1400 -1400 2800 2800">' + lines + '</svg>';
  SK_ARMS.forEach(function(arm){
    var d = 11.5 * SK_STEP, lb = SK_LBL[arm.k];
    html += '<div class="sklb" style="left:' + (arm.dx * d) + 'px;top:' + (arm.dy * d) + 'px">' + lb[1] + ' ' + lb[0] + '<small>' + D.br[arm.k] + '</small></div>';
  });
  html += '<div class="skhub' + (skSel === 'hub' ? ' sel' : '') + '" data-id="hub"><i>' + D.ic + '</i></div>';
  nodes.forEach(function(n){
    html += '<div class="skn ' + st[n.id] + (skSel === n.id ? ' sel' : '') + '" data-id="' + n.id + '" style="left:' + n.x + 'px;top:' + n.y + 'px"><i>' + n.ic + '</i></div>';
  });
  document.getElementById('skw').innerHTML = html;
  skApply();

  var cnt = (p.sk || []).length;
  document.getElementById('skgv').textContent = p.g || 0;
  document.getElementById('skcv').textContent = cnt + '/' + nodes.length;
  var chips = '';
  ['atk','def','fort','disc','inc','vis','mov','hp','rng','crit','dmg','bmov','loot','amb','wall'].forEach(function(k){
    var v = skB(pi, k); if(!v) return;
    var t = {atk:'atak',def:'obrona',fort:'obrona w defensywie',disc:'tańsze jednostki',inc:'złota/turę',vis:'wzrok',mov:'ruch',hp:'HP jednostek',rng:'zasięg łuczników',crit:'szansa na krytyk',dmg:'obrażenia',bmov:'ruch w bitwie',loot:'złota za zabitego',amb:'atak w 1. turze',wall:'osłona murów'}[k];
    chips += '<em>' + SK_ICON[k] + ' +' + v + ' ' + t + '</em>';
  });
  document.getElementById('skbon').innerHTML = chips;
  skDetail(pi, info);
  skBtnSync();
}

function skDetail(pi, info){
  var el = document.getElementById('skd'), p = S.pl[pi], ni = p.ni, D = SK_DATA[ni] || SK_DATA[0];
  if(!skSel){ el.className = 'empty'; el.innerHTML = 'Wybierz umiejętność, aby zobaczyć szczegóły · Koszt rośnie z poziomem (40–80 ✦)'; return }
  el.className = '';
  if(skSel === 'hub'){
    var nn = N[ni];
    el.innerHTML = '<div class="ic">' + D.ic + '</div><div class="tx"><div class="br">Twoja nacja</div><h4>' + nn.n + '</h4><p>Bonus: ' + nn.b + ' · Wada: ' + nn.d + '<br>Rozwijaj cztery ścieżki: wojnę, gospodarkę, zwiad i obronę.</p></div>';
    return;
  }
  var n = info.nodes.filter(function(x){ return x.id === skSel })[0]; if(!n){ skSel = null; return skDetail(pi, info) }
  var s = info.st[n.id], gold = p.g || 0, my = mineTurn();
  var btn;
  if(s === 'ow') btn = '<button class="done" disabled>✔ Odblokowana</button>';
  else if(s === 'lk') btn = '<button disabled>🔒 Najpierw sąsiednia</button>';
  else if(!my) btn = '<button disabled>Czekaj na swoją turę</button>';
  else if(gold < n.cost) btn = '<button disabled>Brak złota (' + n.cost + ' ✦)</button>';
  else btn = '<button data-buy="' + n.id + '">Odblokuj · ' + n.cost + ' ✦</button>';
  el.innerHTML = '<div class="ic">' + n.ic + '</div><div class="tx"><div class="br">' + SK_LBL[n.br][1] + ' ' + SK_LBL[n.br][0] + ' · ' + D.br[n.br] + '</div><h4>' + n.name + '</h4><p>' + skDesc(n) + '</p></div>' + btn;
}

function skToast(t){
  var e = document.getElementById('sktoast'); e.textContent = t; e.style.display = 'block';
  clearTimeout(skMsgT); skMsgT = setTimeout(function(){ e.style.display = 'none' }, 2200);
}

function skBuy(id){
  if(!S || !mineTurn()) return skToast('To nie Twoja tura.');
  var pi = skMe(), p = S.pl[pi], info = skStates(pi);
  var n = info.nodes.filter(function(x){ return x.id === id })[0];
  if(!n || info.st[id] !== 'av') return skToast('Ta umiejętność jest niedostępna.');
  if((p.g || 0) < n.cost) return skToast('Za mało złota (' + n.cost + ').');
  p.g -= n.cost; (p.sk = p.sk || []).push(id);
  try{ sfx('build') }catch(e){}
  try{ save() }catch(e){}
  try{ render() }catch(e){}
  skRefresh(true);
}

/* --- interakcje: klik, przesuwanie, zoom --- */
var skDrag = null, skMoved = false;
skEl.addEventListener('pointerdown', function(e){
  if(e.target.closest('#skd,#skz')) return;
  skDrag = {x: e.clientX, y: e.clientY, vx: skView.x, vy: skView.y, id: e.pointerId}; skMoved = false;
});
skEl.addEventListener('pointermove', function(e){
  if(!skDrag) return;
  var dx = e.clientX - skDrag.x, dy = e.clientY - skDrag.y;
  if(!skMoved && Math.abs(dx) + Math.abs(dy) > 6){ skMoved = true; skEl.classList.add('drag'); try{ skEl.setPointerCapture(skDrag.id) }catch(x){} }
  if(skMoved){ skView.x = skDrag.vx + dx; skView.y = skDrag.vy + dy; skApply() }
});
function skUp(){ skDrag = null; skEl.classList.remove('drag') }
skEl.addEventListener('pointerup', skUp); skEl.addEventListener('pointercancel', skUp);
skEl.addEventListener('click', function(e){
  if(skMoved){ skMoved = false; return }
  var b = e.target.closest('button[data-buy]'); if(b){ skBuy(b.dataset.buy); return }
  var z = e.target.closest('button[data-z]');
  if(z){ var v = +z.dataset.z; if(!v) skFit(); else skZoom(v > 0 ? 1.2 : 1 / 1.2, skEl.clientWidth / 2, skEl.clientHeight / 2); skApply(); return }
  var n = e.target.closest('.skn,.skhub');
  skSel = n ? n.dataset.id : null; skRefresh(true);
});
skEl.addEventListener('dblclick', function(e){
  var n = e.target.closest('.skn'); if(n && n.classList.contains('av') && mineTurn()) skBuy(n.dataset.id);
});
function skZoom(f, cx, cy){
  var nz = Math.max(.3, Math.min(1.8, skView.z * f)); f = nz / skView.z;
  skView.x = cx - (cx - skView.x) * f; skView.y = cy - (cy - skView.y) * f; skView.z = nz;
}
skEl.addEventListener('wheel', function(e){
  e.preventDefault(); var r = skEl.getBoundingClientRect();
  skZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); skApply();
}, {passive: false});
/* pinch (telefon) */
var skPts = {}, skPinch = 0;
skEl.addEventListener('pointerdown', function(e){ skPts[e.pointerId] = e });
skEl.addEventListener('pointermove', function(e){
  if(!skPts[e.pointerId]) return; skPts[e.pointerId] = e;
  var k = Object.keys(skPts); if(k.length !== 2){ skPinch = 0; return }
  var a = skPts[k[0]], b = skPts[k[1]], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  if(skPinch){ var r = skEl.getBoundingClientRect(); skZoom(d / skPinch, (a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top); skApply(); skMoved = true }
  skPinch = d;
});
['pointerup', 'pointercancel'].forEach(function(t){ skEl.addEventListener(t, function(e){ delete skPts[e.pointerId]; skPinch = 0 }) });
window.addEventListener('resize', function(){ if(skTab === 'sk'){ skFit(); skApply() } });

/* --- przycisk „Umiejętności” w nagłówku (obok Statystyk) --- */
function skShow(){
  var inGame = getComputedStyle(game).display !== 'none' && S && S.pl && skMe() >= 0, isSpec = false;
  try{ isSpec = !!spec }catch(e){}
  return !!inGame && !isSpec;
}
function skBtnSync(){
  var hd = document.getElementById('hd'); if(!hd) return;
  var b = document.getElementById('skBtn'), show = skShow();
  if(!show){ if(b) b.remove(); return }
  if(!b || b.parentNode !== hd){
    if(b) b.remove();
    b = document.createElement('button'); b.type = 'button'; b.id = 'skBtn';
    b.onclick = function(){ skSetTab(skTab === 'sk' ? 'map' : 'sk') };
    var st = [].filter.call(hd.querySelectorAll('button'), function(x){ return (x.getAttribute('onclick') || '').indexOf('stats()') >= 0 })[0];
    if(st) hd.insertBefore(b, st); else hd.appendChild(b);
  }
  var txt = skTab === 'sk' ? '🗺️ Mapa' : '🌳 Umiejętności';
  if(b.textContent !== txt) b.textContent = txt;
  b.classList.toggle('on', skTab === 'sk');
  var can = false;
  try{ var pi = skMe(), p = S.pl[pi]; var _i = skStates(pi); can = mineTurn() && _i.nodes.some(function(n){ return _i.st[n.id] === 'av' && (p.g || 0) >= n.cost }) }catch(e){}
  b.classList.toggle('dot', can && skTab !== 'sk');
}
new MutationObserver(function(){ skBtnSync() }).observe(document.getElementById('hd'), {childList: true});

setInterval(function(){
  if(!skShow()){
    if(skTab === 'sk'){ skTab = 'map'; game.classList.remove('sk-on') }
    skBtnSync(); return;
  }
  skBtnSync(); skRefresh(false);
}, 250);
