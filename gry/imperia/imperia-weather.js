/* ==========================================================
   Imperia – pory roku i pogoda
   - Pora roku zmienia się co WX_LEN rund (rok = 4 pory).
   - Pogoda jest losowana deterministycznie z ziarna gry (S.wx) i numeru rundy,
     więc wszyscy gracze (online/lokalnie) widzą to samo, a zapis gry nie
     wymaga żadnych dodatkowych danych. Można też zajrzeć o 1 rundę w przód.
   Typy terenu: 2 Pustynia, 3 Las, 4 Góry, 5 Nizina, 6 Wybrzeże, 7 Bagna.
   ========================================================== */
var WX_LEN = 10; /* rund w jednej porze roku */

var WX_SEASONS = [
  {k:'spring', n:'Wiosna', ic:'🌱', desc:'Roztopy: bagna +1 koszt ruchu.', terr:{7:1}},
  {k:'summer', n:'Lato',   ic:'☀️', desc:'Długie dni: wzrok +1. Upał: pustynia +1 koszt ruchu.', vis:1, terr:{2:1}},
  {k:'autumn', n:'Jesień', ic:'🍂', desc:'Żniwa: +1 złota za każde miasto.', cityInc:1},
  {k:'winter', n:'Zima',   ic:'❄️', desc:'Opał i zapasy: −1 złota za każde 4 jednostki wojska. Góry +1 koszt ruchu.', terr:{4:1}, army:1}
];

var WX_TYPES = {
  clear:   {n:'Słonecznie', ic:'☀️', desc:'Bez zmian.'},
  rain:    {n:'Deszcz',     ic:'🌧️', desc:'Błoto: nizina, wybrzeże i bagna +1 koszt ruchu.', terr:{5:1,6:1,7:1}},
  storm:   {n:'Burza',      ic:'⛈️', desc:'Ruch −1, wzrok −1.', mov:1, vis:-1},
  fog:     {n:'Mgła',       ic:'🌫️', desc:'Wzrok −1.', vis:-1},
  heat:    {n:'Upał',       ic:'🔥', desc:'Pustynia +2 koszt ruchu.', terr:{2:2}},
  snow:    {n:'Śnieg',      ic:'🌨️', desc:'Las, góry i nizina +1 koszt ruchu.', terr:{3:1,4:1,5:1}},
  blizzard:{n:'Zamieć',     ic:'🌬️', desc:'Ruch −1, wzrok −1, góry +1 koszt ruchu.', mov:1, vis:-1, terr:{4:1}}
};

/* skumulowane szanse na pogodę w danej porze roku (kolejność = kolejność wpisów) */
var WX_ODDS = [
  [['clear',.40],['rain',.35],['fog',.15],['storm',.10]],
  [['clear',.50],['heat',.20],['rain',.15],['storm',.15]],
  [['clear',.30],['rain',.30],['fog',.30],['storm',.10]],
  [['clear',.30],['snow',.45],['fog',.10],['blizzard',.15]]
];

function wxSeed(s){ s = s || S; return ((s.wx != null ? s.wx : (s.w * 131 + s.h * 7 + 12345)) | 0); }
function wxRoll(seed, n){
  var x = (seed ^ Math.imul(n + 1, 0x9E3779B1)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x85EBCA6B) >>> 0;
  x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function wxSeasonIdx(round){ return Math.floor((Math.max(1, round) - 1) / WX_LEN) % 4; }
function wxSeason(s, round){ s = s || S; return WX_SEASONS[wxSeasonIdx(round != null ? round : s.round)]; }
function wxKey(s, round){
  s = s || S; round = round != null ? round : s.round;
  if (round <= 1) return 'clear';           /* pierwsza runda zawsze spokojna */
  var odds = WX_ODDS[wxSeasonIdx(round)], r = wxRoll(wxSeed(s), round), acc = 0;
  for (var i = 0; i < odds.length; i++){ acc += odds[i][1]; if (r < acc) return odds[i][0]; }
  return 'clear';
}
function wxWeather(s, round){ return WX_TYPES[wxKey(s, round)]; }

/* ---------- efekty na rozgrywkę ---------- */
function wxMov(s){ s = s || S; var w = s ? wxWeather(s) : null; return w && w.mov ? w.mov : 0; }
function wxVis(s){
  s = s || S; if (!s) return 0;
  var se = wxSeason(s), w = wxWeather(s);
  return (se.vis || 0) + (w.vis || 0);
}
function wxTerr(t, s){
  s = s || S; if (!s) return 0;
  var se = wxSeason(s), w = wxWeather(s);
  return ((se.terr && se.terr[t]) || 0) + ((w.terr && w.terr[t]) || 0);
}
function wxInc(i, s){
  s = s || S; if (!s || !s.cities) return 0;
  var se = wxSeason(s), v = 0;
  if (se.cityInc) v += se.cityInc * s.cities.filter(function(c){ return c.o == i; }).length;
  if (se.army) v -= Math.ceil(milCount(i) / 4);
  return v;
}

/* ---------- interfejs ---------- */
function wxEffects(s){
  s = s || S;
  var se = wxSeason(s), w = wxWeather(s);
  return se.ic + ' ' + se.n + ': ' + se.desc + ' | ' + w.ic + ' ' + w.n + ': ' + w.desc;
}
function wxPill(){
  if (!S) return '';
  var se = wxSeason(), w = wxWeather();
  return '<span class="wx-pill" title="' + esc(wxEffects()) + '">' + se.ic + ' ' + se.n + ' · ' + w.ic + ' ' + w.n + '</span>';
}
function wxPanel(){
  if (!S) return '';
  var se = wxSeason(), w = wxWeather(), nx = wxWeather(S, S.round + 1);
  var day = ((S.round - 1) % WX_LEN) + 1, left = WX_LEN - day;
  var nextSe = WX_SEASONS[(wxSeasonIdx(S.round) + 1) % 4];
  return '<hr><b>Pogoda</b><div class="wx-box">' +
    '<div class="wx-now"><span class="wx-ic">' + w.ic + '</span><div><b>' + w.n + '</b><small>' + w.desc + '</small></div></div>' +
    '<div class="wx-row"><span class="wx-ic s">' + se.ic + '</span><div><b>' + se.n + '</b> <small>(runda ' + day + '/' + WX_LEN + ')</small><small>' + se.desc + '</small></div></div>' +
    '<div class="wx-fc">Następna runda: ' + nx.ic + ' ' + nx.n + ' · ' + nextSe.ic + ' ' + nextSe.n + ' za ' + (left + 1) + ' ' + (left + 1 === 1 ? 'rundę' : (left + 1) < 5 ? 'rundy' : 'rund') + '</div></div>';
}

/* komunikat przy zmianie rundy */
var _wxLast = null;
function wxAnnounce(){
  if (!S) return;
  var key = S.round;
  if (_wxLast === null){ _wxLast = key; return; }
  if (key === _wxLast) return;
  var prev = _wxLast; _wxLast = key;
  if (key < prev || spec) return;
  var se = wxSeason(), w = wxWeather(), newSeason = wxSeasonIdx(prev) !== wxSeasonIdx(key);
  try {
    showToast((newSeason ? se.ic + ' Nowa pora roku: ' + se.n + '! ' : '') + w.ic + ' ' + w.n + ' – ' + w.desc);
  } catch (e) {}
}

/* ---------- efekty wizualne (nakładka na mapę, nie blokuje klikania) ---------- */
var WXSIG = '', WXC = null, WXG = null, WXP = [], WXMODE = '', WXW = 0, WXH = 0, WXFLASH = 0, WXNEXT = 0, WXT = 0, WXRUN = false;
var WX_TINT_SEASON = ['rgba(120,200,120,.025)', 'rgba(255,210,90,.035)', 'rgba(210,110,30,.06)', 'rgba(200,225,255,.09)'];
var WX_TINT_WEATHER = {clear:'', rain:'rgba(40,70,110,.12)', storm:'rgba(15,25,45,.25)', fog:'rgba(220,225,230,.22)',
  heat:'rgba(255,150,40,.07)', snow:'rgba(255,255,255,.05)', blizzard:'rgba(230,240,255,.18)'};

function wxReduced(){ try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

function wxSpawn(){
  WXP = [];
  var k = WXMODE, area = WXW * WXH, n = 0;
  if (k === 'rain') n = Math.min(260, Math.round(area / 5000));
  else if (k === 'storm') n = Math.min(420, Math.round(area / 3000));
  else if (k === 'snow') n = Math.min(160, Math.round(area / 9000));
  else if (k === 'blizzard') n = Math.min(300, Math.round(area / 5000));
  else if (k === 'fog') n = 7;
  else if (k === 'heat') n = 0;
  for (var i = 0; i < n; i++){
    WXP.push({x: Math.random() * WXW, y: Math.random() * WXH, z: .5 + Math.random() * .8, a: Math.random() * 6.28});
  }
}

function wxFrame(ts){
  if (!WXRUN) return;
  requestAnimationFrame(wxFrame);
  var wrap = document.getElementById('wrap'), game = document.getElementById('game');
  if (!S || !wrap || !game || game.style.display === 'none' || document.hidden){ if (WXC) WXC.style.display = 'none'; return; }
  var rc = wrap.getBoundingClientRect();
  if (rc.width < 10 || rc.height < 10){ WXC.style.display = 'none'; return; }
  var w = Math.round(rc.width), h = Math.round(rc.height);
  WXC.style.display = 'block';
  WXC.style.left = rc.left + 'px'; WXC.style.top = rc.top + 'px';
  var key = wxKey();
  /* bez cząsteczek (słonecznie / upał / tryb ograniczonych animacji) nakładka jest statyczna – nie przerysowuj co klatkę */
  var still = key === 'clear' || key === 'heat' || wxReduced(), sig = w + 'x' + h + key + wxSeasonIdx(S.round) + '@' + Math.round(rc.left) + ',' + Math.round(rc.top);
  if (still && sig === WXSIG) return;
  WXSIG = still ? sig : '';
  if (!still && ts - WXT < 30) return;   /* deszcz/śnieg/mgła: ~33 fps wystarcza */
  if (w !== WXW || h !== WXH || key !== WXMODE){
    WXW = w; WXH = h; WXC.width = w; WXC.height = h; WXMODE = key; wxSpawn();
  }
  var dt = Math.min(.05, (ts - WXT) / 1000 || .016); WXT = ts;
  var g = WXG; g.clearRect(0, 0, w, h);
  var st = WX_TINT_SEASON[wxSeasonIdx(S.round)], wt = WX_TINT_WEATHER[key];
  if (st){ g.fillStyle = st; g.fillRect(0, 0, w, h); }
  if (wt){ g.fillStyle = wt; g.fillRect(0, 0, w, h); }
  if (wxReduced()) return;
  var i, p;
  if (key === 'rain' || key === 'storm'){
    var sp = key === 'storm' ? 1100 : 760, sl = key === 'storm' ? .35 : .18;
    g.strokeStyle = 'rgba(190,215,255,.45)'; g.lineWidth = 1; g.beginPath();
    for (i = 0; i < WXP.length; i++){
      p = WXP[i]; p.y += sp * p.z * dt; p.x -= sp * sl * p.z * dt;
      if (p.y > h){ p.y = -20; p.x = Math.random() * (w + 120); }
      if (p.x < -20) p.x += w + 40;
      g.moveTo(p.x, p.y); g.lineTo(p.x + 9 * sl * p.z * 4, p.y - 14 * p.z);
    }
    g.stroke();
    if (key === 'storm'){
      if (ts > WXNEXT){ WXFLASH = .28; WXNEXT = ts + 3500 + Math.random() * 6000; }
      if (WXFLASH > .01){ g.fillStyle = 'rgba(235,240,255,' + WXFLASH.toFixed(3) + ')'; g.fillRect(0, 0, w, h); WXFLASH *= Math.pow(.02, dt); }
    }
  } else if (key === 'snow' || key === 'blizzard'){
    var bz = key === 'blizzard';
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath();
    for (i = 0; i < WXP.length; i++){
      p = WXP[i]; p.a += dt * 1.5;
      p.y += (bz ? 260 : 55) * p.z * dt;
      p.x += (bz ? -330 : Math.sin(p.a) * 22) * p.z * dt;
      if (p.y > h){ p.y = -6; p.x = Math.random() * w; }
      if (p.x < -6) p.x += w + 12;
      var r = (bz ? 1.3 : 1.8) * p.z;
      g.moveTo(p.x + r, p.y); g.arc(p.x, p.y, r, 0, 6.283);
    }
    g.fill();
  } else if (key === 'fog'){
    for (i = 0; i < WXP.length; i++){
      p = WXP[i]; p.x += 9 * p.z * dt; if (p.x > w + 220) p.x = -220;
      var R = 180 + p.z * 140, gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      gr.addColorStop(0, 'rgba(235,238,242,.16)'); gr.addColorStop(1, 'rgba(235,238,242,0)');
      g.fillStyle = gr; g.fillRect(p.x - R, p.y - R, R * 2, R * 2);
    }
  }
}

function wxFx(){
  try { wxAnnounce(); } catch (e) {}
  if (WXC) return;
  WXC = document.createElement('canvas');
  WXC.id = 'wxfx';
  WXC.setAttribute('aria-hidden', 'true');
  document.body.appendChild(WXC);
  WXG = WXC.getContext('2d');
  WXRUN = true;
  requestAnimationFrame(wxFrame);
}
