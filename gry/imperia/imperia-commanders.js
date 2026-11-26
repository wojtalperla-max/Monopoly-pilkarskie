/* ==========================================================
   Imperia – DOWÓDCY (bohaterowie)
   Każda nacja ma 3 własnych, historycznych dowódców (np. Wikingowie: Ragnar Lodbrok, Iwar Bez Kości,
   Bjorn Żelaznoboki). Dowódcę zatrudniasz za złoto i przydzielasz do wojownika lub łucznika, który stoi
   w Twoim mieście (przycisk „⚜ Dowódcy” w nagłówku). Każdy dowódca daje:
   • BONUSY OSOBISTE – jednostce, którą dowodzi (atak, obrona, HP, obrażenia, ruch, zasięg),
   • AURĘ – sojusznikom w promieniu 2 pól w bitwie (+atak / +obrona),
   • BONUS KRÓLESTWA – dopóki żyje: dochód, zasięg widzenia, łupy, obrona w oblężeniu, zasadzka itd.
   Dowódca ginie razem z jednostką. Ponowne zatrudnienie jest droższe (+50% za każdy poprzedni raz).
   AI też zatrudnia dowódców (max 2).
   Portrety: pliki cmd-vk-*.jpg obok imperia.html (mapa PORT poniżej – dopisz kolejne dla innych nacji).
   Nie zmienia imperia-lib1.js – podpina się pod skB(), ustat(), draw(), fzDraw(), fzHud(), render(), runAI().
   Dane w stanie gry: jednostka.cm (id dowódcy), gracz.cm = {id: ile razy zatrudniony}.
   ========================================================== */
(function(){
'use strict';

/* ---------- dane dowódców ---------- */
/* self: bonusy osobiste (atk, def, hp, dmg, mov, rng) · aura: sojusznicy ≤2 pola (atk, def) · glob: bonus królestwa (klucze jak w skB) */
var CM = [
 /* 0 Polanie */ [
  {id:'pl-bol', n:'Bolesław Chrobry', t:'Pierwszy Król Polski', ic:'👑', cost:70, self:{atk:1,dmg:1,hp:2}, aura:{atk:1}, glob:{loot:1},
   lore:'Zjednoczył ziemie Piastów i sięgnął po Kijów. Jego wojowie walczą o łupy i chwałę.'},
  {id:'pl-zaw', n:'Zawisza Czarny', t:'Rycerz bez skazy', ic:'🛡️', cost:65, self:{def:1,hp:4}, aura:{def:1}, glob:{fort:1},
   lore:'Wzór rycerskiej cnoty spod Grunwaldu. Gdzie stoi Zawisza, tam linia się nie ugnie.'},
  {id:'pl-sob', n:'Jan III Sobieski', t:'Lew Lechistanu', ic:'🐎', cost:75, self:{atk:2,mov:1,hp:1}, aura:{atk:1}, glob:{amb:1},
   lore:'Zwycięzca spod Wiednia. Husarska szarża w pierwszej chwili bitwy jest nie do zatrzymania.'}
 ],
 /* 1 Wikingowie */ [
  {id:'vk-rag', n:'Ragnar Lodbrok', t:'Legendarny jarl', ic:'🪓', cost:70, self:{atk:1,dmg:1,hp:2}, aura:{atk:1}, glob:{loot:1},
   lore:'Postrach wybrzeży Europy. Z każdego najazdu wraca z pełnymi łodziami łupów.'},
  {id:'vk-iwa', n:'Iwar Bez Kości', t:'Przebiegły taktyk', ic:'🐍', cost:70, self:{def:1,hp:3,mov:1}, aura:{def:1}, glob:{amb:1},
   lore:'Nie chodził, a dowodził niesiony na tarczy – i pokonał całe królestwa sprytem. Uderza tam, gdzie wróg się nie spodziewa.'},
  {id:'vk-bjo', n:'Bjorn Żelaznoboki', t:'Żeglarz i zdobywca', ic:'⛵', cost:70, self:{atk:1,mov:1,hp:2}, aura:{atk:1}, glob:{vis:1,inc:1},
   lore:'Dotarł aż na Morze Śródziemne. Zwiad i handel to jego żywioł.'}
 ],
 /* 2 Rzymianie */ [
  {id:'rz-cez', n:'Juliusz Cezar', t:'Dyktator Rzymu', ic:'🏛️', cost:80, self:{atk:1,hp:2}, aura:{atk:1}, glob:{vis:1,disc:1},
   lore:'Przyszedł, zobaczył, zwyciężył. Jego legiony są dobrze zaopatrzone i świetnie poinformowane.'},
  {id:'rz-sci', n:'Scypion Afrykański', t:'Pogromca Hannibala', ic:'🦅', cost:70, self:{atk:1,dmg:1,mov:1}, aura:{atk:1}, glob:{amb:1},
   lore:'Pod Zamą pokonał Hannibala manewrem, którego nikt się nie spodziewał.'},
  {id:'rz-fab', n:'Fabiusz Kunktator', t:'Tarcza Rzymu', ic:'🐢', cost:65, self:{def:1,hp:4}, aura:{def:1}, glob:{fort:1,wall:1},
   lore:'Zwlekał i wyczerpywał wroga, aż ten sam się załamał. Twierdze pod jego opieką są nie do zdobycia.'}
 ],
 /* 3 Mongołowie */ [
  {id:'mg-cze', n:'Czyngis-chan', t:'Władca Stepów', ic:'🐺', cost:80, self:{atk:1,dmg:1,hp:2}, aura:{atk:1}, glob:{loot:1,inc:1},
   lore:'Zjednoczył plemiona i podbił pół świata. Pokonane ziemie płacą daninę.'},
  {id:'mg-sub', n:'Subutaj', t:'Wielki strateg', ic:'🧭', cost:75, self:{atk:1,mov:1,rng:1}, aura:{atk:1}, glob:{vis:1,amb:1},
   lore:'Planował kampanie na tysiące kilometrów. Jego zwiadowcy wiedzą o wrogu więcej niż on sam.'},
  {id:'mg-dze', n:'Dżebe „Strzała”', t:'Mistrz jazdy łuczniczej', ic:'🏹', cost:70, self:{atk:1,mov:1,rng:1}, aura:{atk:1}, glob:{bmov:1},
   lore:'Jeden strzał zabił konia samego chana – i zyskał przydomek. Jego jeźdźcy są wszędzie naraz.'}
 ],
 /* 4 Egipcjanie */ [
  {id:'eg-ram', n:'Ramzes II', t:'Faraon-Budowniczy', ic:'☀️', cost:75, self:{atk:1,def:1,hp:2}, aura:{def:1}, glob:{loot:1,inc:1},
   lore:'Bohater spod Kadesz i największy budowniczy Egiptu. Świątynie i łupy napełniają skarbiec.'},
  {id:'eg-tot', n:'Totmes III', t:'Napoleon starożytności', ic:'🦂', cost:70, self:{atk:1,rng:1,hp:1}, aura:{atk:1}, glob:{vis:1,amb:1},
   lore:'Siedemnaście kampanii, ani jednej przegranej. Zaskakuje wroga, zanim ten zdąży się rozstawić.'},
  {id:'eg-ahm', n:'Ahmose I', t:'Wyzwoliciel', ic:'🏺', cost:65, self:{def:1,hp:4}, aura:{def:1}, glob:{fort:1},
   lore:'Wypędził Hyksosów i zjednoczył kraj. Wojsko pod jego sztandarem broni się do ostatniego.'}
 ],
 /* 5 Inkowie */ [
  {id:'ik-pac', n:'Pachacuti', t:'Przebudziciel Świata', ic:'🏔️', cost:80, self:{atk:1,hp:2}, aura:{atk:1}, glob:{inc:2},
   lore:'Z małego miasta Cuzco zbudował Imperium Czterech Stron Świata. Drogi i spichlerze pracują na skarbiec.'},
  {id:'ik-rum', n:'Rumiñawi', t:'Obrońca Andów', ic:'🗿', cost:65, self:{def:1,hp:4}, aura:{def:1}, glob:{fort:1,wall:1},
   lore:'„Kamienne Oko” – stawiał opór najeźdźcom w górskich przełęczach i twierdzach.'},
  {id:'ik-tup', n:'Túpac Yupanqui', t:'Odkrywca i zdobywca', ic:'🦙', cost:70, self:{atk:1,mov:1,hp:2}, aura:{def:1}, glob:{vis:1,inc:1},
   lore:'Poprowadził Inków aż po wybrzeża Pacyfiku i dalej. Zwiad i daniny ze zdobytych krain.'}
 ]
];
var BY = {};
CM.forEach(function(l, ni){ l.forEach(function(d){ d.ni = ni; BY[d.id] = d; }); });

var L_SELF = {atk:'atak', def:'obrona', hp:'HP', dmg:'obrażenia', mov:'ruch w bitwie', rng:'zasięg (łucznik)'};
var L_AURA = {atk:'atak', def:'obrona'};
var L_GLOB = {loot:'złota za każdą zabitą jednostkę wroga', inc:'złota na turę', vis:'do zasięgu widzenia', fort:'do obrony, gdy się bronisz',
  amb:'do ataku w 1. turze bitwy (gdy atakujesz)', bmov:'do ruchu jednostek w bitwie', disc:'taniej wszystkie jednostki', wall:'osłony murów miast'};
function plus(o, L){ return Object.keys(o).map(function(k){ return '+' + o[k] + ' ' + L[k]; }).join(', '); }
function short(d){
  var a = [];
  a.push(plus(d.self, L_SELF));
  a.push('aura 2 pól: ' + plus(d.aura, L_AURA));
  return a.join(' · ');
}

/* ---------- stan ---------- */
var cmVer = 0, cache = {S: null, k: '', m: {}};
function myIdx(){ try { return meIdx(); } catch (e) { return -1; } }
function units(pi){
  if (!S || !S.units) return [];
  var k = S.nid + '|' + S.units.length + '|' + cmVer;
  if (cache.S !== S || cache.k !== k) cache = {S: S, k: k, m: {}};
  if (cache.m[pi]) return cache.m[pi];
  var out = []; S.units.forEach(function(u){ if (u.cm && u.o === pi && BY[u.cm]) out.push(u); });
  return cache.m[pi] = out;
}
function glob(pi, key){ var t = 0; units(pi).forEach(function(u){ var v = BY[u.cm].glob[key]; if (v) t += v; }); return t; }
function aliveUnit(pi, id){ var l = units(pi); for (var i = 0; i < l.length; i++) if (l[i].cm === id) return l[i]; return null; }
function costOf(pl, d){ return Math.round(d.cost * (1 + .5 * ((pl.cm && pl.cm[d.id]) || 0))); }
function cityAt(u){ return S.cities.find(function(c){ return c.q === u.q && c.r === u.r; }); }
function eligible(pi){
  return S.units.filter(function(u){ var c = cityAt(u); return u.o === pi && (u.k === 'W' || u.k === 'A') && !u.cm && c && c.o === pi; });
}
function hire(pi, id, uid, byAI){
  var d = BY[id], pl = S.pl[pi]; if (!d || !pl || d.ni !== pl.ni) return false;
  var u = S.units.find(function(x){ return x.id === uid; });
  if (!u || u.o !== pi || u.cm || (u.k !== 'W' && u.k !== 'A')) return false;
  if (aliveUnit(pi, id)) return false;
  var cost = costOf(pl, d); if ((pl.g || 0) < cost) return false;
  pl.g -= cost; u.cm = id; pl.cm = pl.cm || {}; pl.cm[id] = (pl.cm[id] || 0) + 1; cmVer++;
  if (!byAI){ try { sfx('build'); } catch (e) {} try { save(); } catch (e) {} }
  return true;
}

/* ---------- podpięcie: bonusy królestwa przez skB() ---------- */
var _skB = window.skB;
if (typeof _skB === 'function'){
  window.skB = function(pi, key){
    var v = _skB.apply(this, arguments);
    try { v += glob(pi, key); } catch (e) {}
    return v;
  };
}

/* ---------- podpięcie: bonusy w bitwie przez ustat() ---------- */
var BTC = (typeof WeakMap === 'function') ? new WeakMap() : null;
function btList(Bt){
  var c = BTC && BTC.get(Bt);
  if (c && c.ver === Bt.ver && c.len === Bt.units.length) return c.l;
  var l = [];
  Bt.units.forEach(function(x){
    var g = S.units.find(function(y){ return y.id === x.gid; });
    if (g && g.cm && BY[g.cm]) l.push({u: x, d: BY[g.cm]});
  });
  if (BTC) BTC.set(Bt, {ver: Bt.ver, len: Bt.units.length, l: l});
  return l;
}
var _ustat = window.ustat;
if (typeof _ustat === 'function'){
  window.ustat = function(Bt, u){
    var st = _ustat.apply(this, arguments);
    try {
      var l = btList(Bt); if (!l.length) return st;
      var cl = (typeof FZ !== 'undefined' && FZ && FZ.battle === Bt && FZ.cells) ? FZ.cells : null, me = cl && cl[u.cell], ad = {atk: 0, def: 0};
      l.forEach(function(e){
        if (e.u.side !== u.side) return;
        if (e.u.id === u.id){
          var s = e.d.self;
          if (s.atk) st.atk += s.atk; if (s.def) st.def += s.def; if (s.hp) st.hp += s.hp; if (s.dmg) st.db += s.dmg;
          if (s.mov) st.mov += s.mov; if (s.rng && u.k === 'A') st.rng += s.rng;
        } else if (cl && me && cl[e.u.cell] && hd(cl[e.u.cell], me) <= 2){
          if (e.d.aura.atk) ad.atk += e.d.aura.atk; if (e.d.aura.def) ad.def += e.d.aura.def;
        }
      });
      st.atk += Math.min(2, ad.atk); st.def += Math.min(2, ad.def);
    } catch (e) {}
    return st;
  };
}

/* ---------- portrety dowódców ---------- */
/* zdjęcia: pliki obok imperia.html (kwadraty 256×256). Dowódcy bez zdjęcia dostają złote kółko z ikoną. */
var PORT = {'ik-pac': 'cmd-ik-pac.jpg', 'ik-rum': 'cmd-ik-rum.jpg', 'ik-tup': 'cmd-ik-tup.jpg', 'rz-cez': 'cmd-rz-cez.jpg', 'rz-sci': 'cmd-rz-sci.jpg', 'rz-fab': 'cmd-rz-fab.jpg', 'eg-ram': 'cmd-eg-ram.jpg', 'eg-tot': 'cmd-eg-tot.jpg', 'eg-ahm': 'cmd-eg-ahm.jpg', 'mg-cze': 'cmd-mg-cze.jpg', 'mg-sub': 'cmd-mg-sub.jpg', 'mg-dze': 'cmd-mg-dze.jpg', 'pl-bol': 'cmd-pl-bol.jpg', 'pl-zaw': 'cmd-pl-zaw.jpg', 'pl-sob': 'cmd-pl-sob.jpg', 'vk-rag': 'cmd-vk-rag.jpg', 'vk-iwa': 'cmd-vk-iwa.jpg', 'vk-bjo': 'cmd-vk-bjo.jpg'};
var IMG = {};
function portrait(id){
  var f = PORT[id]; if (!f) return null;
  var o = IMG[id];
  if (!o){
    o = IMG[id] = {img: new Image(), ok: false};
    o.img.onload = function(){ o.ok = true; try { if (S && S.pl) draw(vision(meIdx())); } catch (e) {} try { if (FZ && FZ.bg) fzSched(); } catch (e) {} };
    o.img.src = f;
  }
  return o.ok ? o.img : null;
}
function preload(){ Object.keys(PORT).forEach(portrait); }
preload();

/* okrągły znaczek z twarzą dowódcy (mapa i bitwa) */
function badge(g, x, y, r, d){
  var im = d ? portrait(d.id) : null;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = r * .5; g.shadowOffsetY = r * .15;
  g.beginPath(); g.arc(x, y, r + r * .2, 0, 7); g.fillStyle = '#3a2a10'; g.fill();
  g.shadowColor = 'transparent';
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#f0cc83'; g.fill();
  if (im){
    g.save(); g.beginPath(); g.arc(x, y, r - Math.max(1, r * .16), 0, 7); g.clip();
    g.drawImage(im, x - r, y - r, r * 2, r * 2); g.restore();
  } else {
    g.font = Math.round(r * 1.25) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#3a2a10'; g.fillText(d ? d.ic : '⚜', x, y + r * .06);
  }
  g.beginPath(); g.arc(x, y, r, 0, 7); g.lineWidth = Math.max(1.4, r * .2); g.strokeStyle = '#f0cc83'; g.stroke();
  g.beginPath(); g.arc(x, y, r + r * .2, 0, 7); g.lineWidth = Math.max(1, r * .12); g.strokeStyle = '#3a2a10'; g.stroke();
  g.restore();
}
function paintMap(V){
  if (!S || !S.units || typeof cv === 'undefined' || !boardW) return;
  var any = S.units.some(function(u){ return u.cm && BY[u.cm]; }); if (!any) return;
  var g = cv.getContext('2d'), pr = cv.width / boardW;
  g.save(); g.setTransform(pr, 0, 0, pr, 0, 0);
  try {
    S.units.forEach(function(u){
      if (!u.cm || !BY[u.cm]) return;
      if (V && !V[u.r * S.w + u.q]) return;
      var p = unitPos(u);          /* unitPos uwzględnia animację ruchu – portret jedzie razem z jednostką */
      badge(g, p[0] + 12, p[1] - 14, 9, BY[u.cm]);
    });
  } finally { g.restore(); }
}
var _draw = window.draw;
if (typeof _draw === 'function'){
  var wd = function(V){
    var r = _draw.apply(this, arguments);
    try { paintMap(V); } catch (e) {}
    return r;
  };
  wd.__ifx = true; wd.__fog = true;
  window.draw = wd;
}
var _fzDraw = window.fzDraw;
if (typeof _fzDraw === 'function'){
  window.fzDraw = function(){
    var r = _fzDraw.apply(this, arguments);
    try {
      var Bt = FZ && FZ.battle;
      if (Bt && FZ.bg){
        var l = btList(Bt); if (l.length){
          var g = document.getElementById('fzc').getContext('2d'), s = FZ.s;
          g.save(); g.setTransform(FZ.dpr, 0, 0, FZ.dpr, 0, 0);
          var now = performance.now(), vis = (typeof vUn === 'function') ? vUn(Bt) : Bt.units;
          l.forEach(function(e){
            if (vis.indexOf(e.u) < 0 || !FZ.cells[e.u.cell]) return;
            var p = upos(e.u, now);   /* pozycja z animacją ruchu / ataku */
            badge(g, p[0] + s * .78, p[1] - s * .78, Math.max(9, s * .72), e.d);
          });
          g.restore();
        }
      }
    } catch (e) {}
    return r;
  };
}
var _fzHud = window.fzHud;
if (typeof _fzHud === 'function'){
  window.fzHud = function(){
    var r = _fzHud.apply(this, arguments);
    try {
      var Bt = FZ && FZ.battle;
      if (Bt){
        var l = btList(Bt);
        if (l.length){
          var h = '<h4>⚜ Dowódcy w bitwie</h4>' + l.map(function(e){
            var col = Bt.col[e.u.side];
            return '<div class="sd cmhud" style="border-left-color:' + col + '">' + face(e.d, 38) + '<div><b>' + esc(e.d.n) + '</b><br><small>' + esc(short(e.d)) + '</small></div></div>';
          }).join('');
          document.getElementById('fzhud').insertAdjacentHTML('beforeend', h);
        }
      }
    } catch (e) {}
    return r;
  };
}
/* informacja o dowódcy przy zaznaczonej jednostce */
var _render = window.render;
if (typeof _render === 'function'){
  window.render = function(){
    try { if (S && S.inf && S.pl) S.pl.forEach(function(p){ if ((p.g || 0) < 90000) p.g = 99999; }); } catch (e) {}   /* tryb nieskończonego złota */
    var r = _render.apply(this, arguments);
    try {
      if (sel && sel.k === 'u' && S){
        var u = S.units.find(function(x){ return x.id === sel.id; });
        if (u && u.cm && BY[u.cm]){
          var d = BY[u.cm], side = document.getElementById('side');
          if (side) side.insertAdjacentHTML('afterbegin', '<div class="sd cmhud" style="border-left:4px solid #f0cc83;padding:7px 9px;margin-bottom:8px;border-radius:10px;background:rgba(240,204,131,.08)">' + face(d, 44) + '<div><b>' + esc(d.n) + '</b> <small>(' + esc(d.t) + ')</small><br><small>' + esc(short(d)) + '</small></div></div>');
        }
      }
    } catch (e) {}
    return r;
  };
}

/* ---------- AI: zatrudnia dowódców (max 2) ---------- */
function aiHire(pi){
  var pl = S.pl[pi]; if (!pl || !pl.ai || !CM[pl.ni]) return;
  if (units(pi).length >= 2 || S.round < 3 || Math.random() < .5) return;
  var el = eligible(pi); if (!el.length) return;
  var opts = CM[pl.ni].filter(function(d){ return !aliveUnit(pi, d.id) && (pl.g || 0) >= costOf(pl, d) + 25; });
  if (!opts.length) return;
  var d = opts[Math.floor(Math.random() * opts.length)], u = el[Math.floor(Math.random() * el.length)];
  hire(pi, d.id, u.id, true);
}
var _runAI = window.runAI;
if (typeof _runAI === 'function'){
  window.runAI = function(){
    try { if (S && S.pl[S.turn] && S.pl[S.turn].ai) aiHire(S.turn); } catch (e) {}
    return _runAI.apply(this, arguments);
  };
}

/* ---------- interfejs: przycisk + okno ---------- */
function face(d, px){
  var f = PORT[d.id];
  return '<span class="cmface" style="width:' + px + 'px;height:' + px + 'px;flex:0 0 ' + px + 'px">' +
    (f ? '<img src="' + f + '" alt="' + esc(d.n) + '" draggable="false">' : '<i>' + d.ic + '</i>') + '</span>';
}
var st = document.createElement('style');
st.textContent = [
  '#cmBtn{position:relative}',
  '#cmOv{position:fixed;inset:0;z-index:60;background:radial-gradient(ellipse at 50% 0,rgba(40,30,12,.55),rgba(4,8,14,.88));backdrop-filter:blur(3px);display:none;overflow:auto;padding:16px;-webkit-overflow-scrolling:touch}',
  '#cmOv.on{display:block}',
  '#cmBox{max-width:900px;margin:0 auto;background:linear-gradient(180deg,#1b2a42,#121d30);border:1px solid rgba(240,204,131,.35);border-radius:20px;padding:20px 20px 22px;box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);color:var(--fg,#e8edf5);animation:cmIn .25s ease-out}',
  '@keyframes cmIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}',
  '#cmBox .cmtop{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid rgba(240,204,131,.2)}',
  '#cmBox h2{margin:0;font-size:22px;letter-spacing:.3px;color:#f6dfa6;text-shadow:0 2px 10px rgba(240,204,131,.25)}',
  '#cmBox .cmgold{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;background:rgba(240,204,131,.12);border:1px solid rgba(240,204,131,.45);color:#f6dfa6;font-weight:800;font-size:14px}',
  '#cmBox .cmtr{display:flex;align-items:center;gap:10px}',
  '#cmBox .cmsub{color:var(--muted,#9aa9bd);font-size:12.5px;line-height:1.55;margin:12px 0 4px}',
  '#cmBox .cmgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin-top:14px}',
  '.cmc{position:relative;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,rgba(14,24,40,.85),rgba(8,15,27,.92));border:1px solid rgba(164,184,211,.18);transition:transform .2s,border-color .2s,box-shadow .2s}',
  '.cmc:hover{transform:translateY(-3px);border-color:rgba(240,204,131,.55);box-shadow:0 12px 30px rgba(0,0,0,.45)}',
  '.cmc.al{border-color:rgba(240,204,131,.85);box-shadow:0 0 0 1px rgba(240,204,131,.4),0 0 28px rgba(240,204,131,.18)}',
  '.cmc .cmpt{position:relative;height:190px;background:#0b1320;overflow:hidden}',
  '.cmc .cmpt img{width:100%;height:100%;object-fit:cover;object-position:50% 25%;display:block;transition:transform .5s}',
  '.cmc:hover .cmpt img{transform:scale(1.06)}',
  '.cmc .cmpt .cmem{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:76px;background:radial-gradient(circle at 35% 30%,#f6dfa6,#b9873e)}',
  '.cmc .cmpt::after{content:\"\";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(10,16,28,.95) 100%);pointer-events:none}',
  '.cmc .cmnm{position:absolute;left:14px;right:14px;bottom:10px;z-index:1}',
  '.cmc h3{margin:0;font-size:18px;color:#f6dfa6;text-shadow:0 2px 8px #000}',
  '.cmc .cmt{font-size:12px;color:#d3c19a;text-shadow:0 1px 6px #000}',
  '.cmc .cmflag{position:absolute;right:10px;top:10px;z-index:2;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:800;background:rgba(240,204,131,.95);color:#3a2a10;box-shadow:0 2px 10px rgba(0,0,0,.5)}',
  '.cmc .cmbd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:9px;flex:1}',
  '.cmc .cml{font-size:12.2px;color:#b9c6d6;line-height:1.5;font-style:italic}',
  '.cmc .cmch{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
  '.cmc .cmch small{flex:0 0 100%;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:#8396ad;margin-top:2px}',
  '.cmc .chip{padding:3px 9px;border-radius:999px;font-size:11.8px;font-weight:700;background:rgba(240,204,131,.12);border:1px solid rgba(240,204,131,.3);color:#f0cc83}',
  '.cmc .chip.au{background:rgba(125,190,255,.12);border-color:rgba(125,190,255,.35);color:#a9d4ff}',
  '.cmc .chip.kr{background:rgba(125,220,160,.12);border-color:rgba(125,220,160,.35);color:#9fe8b8}',
  '.cmc .cmact{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:auto;padding-top:4px}',
  '.cmc select{padding:8px 9px;max-width:100%;flex:1 1 140px;font-size:12.5px}',
  '.cmc .cmact button{flex:1 1 auto}',
  '.cmc .cmst{font-size:12.5px;color:#f0cc83;font-weight:700;margin-top:auto}',
  '.cmc .cmhint{font-size:12px;color:#9aa9bd}',
  '.cmface{display:inline-block;border-radius:50%;overflow:hidden;border:2px solid #f0cc83;box-shadow:0 0 0 2px #3a2a10,0 3px 8px rgba(0,0,0,.5);background:#b9873e;vertical-align:middle}',
  '.cmface img{width:100%;height:100%;object-fit:cover;display:block}',
  '.cmface i{display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-style:normal;font-size:60%}',
  '.cmhud{display:flex;gap:9px;align-items:center}',
  '@media(max-width:520px){#cmBox{padding:14px}.cmc .cmpt{height:170px}#cmBox h2{font-size:18px}}'
].join('\n');
document.head.appendChild(st);

var ov = document.createElement('div'); ov.id = 'cmOv';
ov.innerHTML = '<div id="cmBox"></div>';
document.body.appendChild(ov);
var box = ov.firstChild, selMap = {}, lastHtml = '';

function cmShow(){
  try { return !!(S && S.pl && !spec && myIdx() >= 0 && getComputedStyle(document.getElementById('game')).display !== 'none'); } catch (e) { return false; }
}
function panelHtml(){
  var mi = myIdx(), pl = S.pl[mi], ni = pl.ni, list = CM[ni] || [], mine = mineTurn(), el = eligible(mi);
  var h = '<div class="cmtop"><h2>⚜ Dowódcy – ' + esc(N[ni].n) + '</h2><div class="cmtr"><span class="cmgold">💰 ' + (pl.g || 0) + '</span><button type="button" data-cm="close">✕ Zamknij</button></div></div>';
  h += '<div class="cmsub">Zatrudnij dowódcę i przydziel go do wojownika lub łucznika stojącego w Twoim mieście. Jego twarz pojawi się przy jednostce na mapie i w bitwie. Dowódca wzmacnia swoją jednostkę, daje aurę sojusznikom (promień 2 pól) oraz bonus całemu królestwu, dopóki żyje. Gdy jednostka zginie, dowódca też – ponowne zatrudnienie kosztuje o 50% więcej za każdy poprzedni raz. Zatrudniać możesz tylko w swojej turze.</div>';
  h += '<div class="cmgrid">';
  function chips(o, L, cls){ return Object.keys(o).map(function(k){ return '<span class="chip ' + cls + '">+' + o[k] + ' ' + esc(L[k]) + '</span>'; }).join(''); }
  list.forEach(function(d){
    var au = aliveUnit(mi, d.id), cost = costOf(pl, d), can = mine && !au && el.length && (pl.g || 0) >= cost;
    var f = PORT[d.id];
    h += '<div class="cmc' + (au ? ' al' : '') + '"><div class="cmpt">' + (f ? '<img src="' + f + '" alt="' + esc(d.n) + '" draggable="false">' : '<div class="cmem">' + d.ic + '</div>') +
      (au ? '<span class="cmflag">✔ W ARMII</span>' : '') +
      '<div class="cmnm"><h3>' + esc(d.n) + '</h3><div class="cmt">' + esc(d.t) + '</div></div></div>' +
      '<div class="cmbd"><div class="cml">' + esc(d.lore) + '</div>' +
      '<div class="cmch"><small>Dowódca</small>' + chips(d.self, L_SELF, '') + '</div>' +
      '<div class="cmch"><small>Aura – sojusznicy w bitwie (2 pola)</small>' + chips(d.aura, L_AURA, 'au') + '</div>' +
      '<div class="cmch"><small>Bonus królestwa</small>' + chips(d.glob, L_GLOB, 'kr') + '</div>';
    if (au){
      var c = cityAt(au);
      h += '<div class="cmst">' + esc(UN[au.k]) + ' · pole ' + au.q + ',' + au.r + (c ? ' (' + esc(c.nm || 'miasto') + ')' : '') + '</div>';
    } else {
      var opts = el.map(function(u){ var c = cityAt(u); return '<option value="' + u.id + '"' + (String(selMap[d.id]) === String(u.id) ? ' selected' : '') + '>' + esc(UN[u.k]) + ' · ' + esc(c && c.nm || 'miasto') + ' (' + u.q + ',' + u.r + ')</option>'; }).join('');
      h += '<div class="cmact">' + (el.length ? '<select data-cmsel="' + d.id + '">' + opts + '</select>' : '') +
        '<button type="button" class="p" data-cmhire="' + d.id + '" ' + (can ? '' : 'disabled') + '>Zatrudnij – ' + cost + ' 💰</button></div>';
      var why = !mine ? 'Poczekaj na swoją turę.' : !el.length ? 'Potrzebujesz wojownika lub łucznika bez dowódcy, stojącego w Twoim mieście.' : (pl.g || 0) < cost ? 'Za mało złota.' : '';
      if (why) h += '<div class="cmhint">' + why + '</div>';
    }
    h += '</div></div>';
  });
  return h + '</div>';
}
function paintPanel(force){
  if (!ov.classList.contains('on')) return;
  if (!cmShow()){ ov.classList.remove('on'); return; }
  var a = document.activeElement; if (!force && a && box.contains(a) && a.tagName === 'SELECT') return;
  var h = panelHtml(); if (h === lastHtml && !force) return; lastHtml = h;
  var sc = ov.scrollTop; box.innerHTML = h; ov.scrollTop = sc;
}
box.addEventListener('change', function(e){ var s = e.target.getAttribute && e.target.getAttribute('data-cmsel'); if (s) selMap[s] = e.target.value; });
ov.addEventListener('click', function(e){
  var t = e.target;
  if (t === ov || (t.getAttribute && t.getAttribute('data-cm') === 'close')){ ov.classList.remove('on'); return; }
  var id = t.getAttribute && t.getAttribute('data-cmhire');
  if (id){
    var mi = myIdx(), sel_ = box.querySelector('[data-cmsel="' + id + '"]'), uid = sel_ ? +sel_.value : -1;
    if (mineTurn() && hire(mi, id, uid)){
      try { msg = '⚜ ' + BY[id].n + ' dołącza do armii!'; render(); } catch (x) {}
    }
    paintPanel(true);
  }
});
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && ov.classList.contains('on')) ov.classList.remove('on'); });
setInterval(function(){ paintPanel(false); }, 600);

function syncBtn(){
  var hdEl = document.getElementById('hd'); if (!hdEl) return;
  var b = document.getElementById('cmBtn'), show = cmShow();
  if (!show){ if (b) b.remove(); return; }
  if (!b || b.parentNode !== hdEl){
    if (b) b.remove();
    b = document.createElement('button'); b.type = 'button'; b.id = 'cmBtn'; b.textContent = '⚜ Dowódcy';
    b.onclick = function(){ ov.classList.add('on'); paintPanel(true); };
    var anchor = document.getElementById('skBtn') || [].filter.call(hdEl.querySelectorAll('button'), function(x){ return (x.getAttribute('onclick') || '').indexOf('stats()') >= 0; })[0];
    if (anchor) hdEl.insertBefore(b, anchor); else hdEl.appendChild(b);
  }
}
var hdNode = document.getElementById('hd');
if (hdNode) new MutationObserver(syncBtn).observe(hdNode, {childList: true});
setInterval(syncBtn, 500);

window.CMD = {defs: BY, hire: hire, alive: aliveUnit, portraits: PORT};
})();
