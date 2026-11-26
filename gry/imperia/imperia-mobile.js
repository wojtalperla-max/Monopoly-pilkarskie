/* ==========================================================
   Imperia – obsługa telefonu (dotyk)
   Nie zmienia imperia-lib1.js. Dokłada:
   - widok przybliżonego pola / bitwy: przesuwanie jednym palcem, zoom dwoma palcami (+ przyciski − / +),
     większe pole bitwy dopasowane do ekranu, panel boczny na dole (pion) albo z lewej (poziom),
     przycisk „☰ Panel” do chowania panelu, żeby widzieć całe pole,
   - główna mapa: zoom szczypnięciem (przesuwanie palcem działa natywnie),
   - panel boczny pod mapą da się zwinąć przyciskiem,
   - brak powiększania strony dwuklikiem i „pull-to-refresh” podczas przesuwania.
   Na komputerze (mysz) nic się nie zmienia.
   ========================================================== */
(function(){
'use strict';

var coarse = false;
try { coarse = window.matchMedia('(pointer:coarse)').matches; } catch (e) {}
function isMobile(){ return coarse || window.innerWidth <= 820; }

/* ---------- style ---------- */
var st = document.createElement('style');
st.textContent = [
  'html,body{overscroll-behavior:none}',
  '#game button,#fzw button,#act button,#mbBar{touch-action:manipulation}',
  '#wrap{touch-action:pan-x pan-y}',
  '#fzw{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}',
  '#fzhtog{position:absolute;left:10px;top:10px;z-index:3;padding:9px 12px;font-size:13px;display:none}',
  '#fzw.mob #fzhtog{display:block}',
  '#fzw.mob #fzhud{font-size:12px;padding:10px 12px;-webkit-overflow-scrolling:touch}',
  '#fzw.mob:not(.land) #fzhud{left:8px;right:8px;bottom:8px;top:auto;width:auto;max-height:34%}',
  '#fzw.mob.land #fzhud{left:8px;top:56px;bottom:8px;right:auto;width:min(250px,36vw);max-height:none}',
  '#fzw.mob.fzmin #fzhud{display:none}',
  '#fzw.mob #fzhud button{padding:10px 12px;font-size:13px;min-height:40px}',
  '#fzw.mob #fzback{right:8px;top:8px;padding:9px 12px;font-size:13px}',
  '#fzw.mob #fzzoom{top:56px;right:8px;padding:4px 6px;gap:5px}',
  '#fzw.mob #fzzoom button{padding:7px 11px;font-size:14px}',
  '#fzw.mob #fzdie{width:64px;height:64px}',
  '#fzw.mob #fzdie b{font-size:22px}',
  '#fzw.mob #fzdie small{font-size:8px;margin-top:3px}',
  '#fzw.mob:not(.land) #fzdie{right:10px;bottom:calc(34% + 18px)}',
  '#fzw.mob:not(.land).fzmin #fzdie{bottom:12px}',
  '#fzw.mob.land #fzdie{right:10px;bottom:10px}',
  '#fzw.mob #fzhint{top:104px;bottom:auto;max-width:84%}',
  '#mbBar{display:none}',
  '@media(max-width:760px){',
  '  #mbBar{display:block;flex:0 0 auto;width:100%;margin:0;padding:7px;border:0;border-top:1px solid var(--bd);border-radius:0;background:#14202f;color:#f0d9ad;font-size:12px;font-weight:700}',
  '  #main.sidemin #side{display:none}',
  '  #side{max-height:38%}',
  '}'
].join('\n');
document.head.appendChild(st);

/* ---------- widok pola / bitwy ---------- */
var fzw = document.getElementById('fzw'), fzc = document.getElementById('fzc');
if (fzw && fzc){
  /* przyciski i napisy dopasowane do telefonu */
  var back = fzw.querySelector('#fzback');
  if (back && isMobile()) back.textContent = '← Mapa';
  var zoomBox = fzw.querySelector('#fzzoom');
  if (zoomBox && isMobile()){
    var sp = zoomBox.querySelector('span');
    if (sp) sp.innerHTML = '🔍 <b id="fzzv">100%</b>';
    var rs = zoomBox.querySelector('#fzreset');
    var bm = document.createElement('button'); bm.type = 'button'; bm.textContent = '−'; bm.id = 'fzzm';
    var bp = document.createElement('button'); bp.type = 'button'; bp.textContent = '+'; bp.id = 'fzzp';
    zoomBox.insertBefore(bm, rs); zoomBox.insertBefore(bp, rs);
    bm.onclick = function(){ zoomAtCenter(1 / 1.3); };
    bp.onclick = function(){ zoomAtCenter(1.3); };
  }
  var tog = document.createElement('button'); tog.type = 'button'; tog.id = 'fzhtog'; tog.textContent = '☰ Panel';
  fzw.appendChild(tog);
  tog.onclick = function(){
    fzw.classList.toggle('fzmin');
    tog.textContent = fzw.classList.contains('fzmin') ? '☰ Panel' : '✕ Panel';
    if (typeof FZ !== 'undefined' && FZ) fzSched();
  };

  /* geometria: na telefonie pole wypełnia wolne miejsce nad / obok panelu */
  var origGeom = window.fzGeom;
  if (typeof origGeom === 'function'){
    window.fzGeom = function(){
      if (!FZ || !isMobile()){ fzw.classList.remove('mob', 'land'); return origGeom.apply(this, arguments); }
      var Wd = fzw.clientWidth, Ht = fzw.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      var land = Wd > Ht * 1.15, min = fzw.classList.contains('fzmin');
      fzw.classList.add('mob'); fzw.classList.toggle('land', land);
      tog.textContent = min ? '☰ Panel' : '✕ Panel';
      var hudW = (land && !min) ? Math.min(250, Math.round(Wd * .36)) + 8 : 0;
      var hudH = (!land && !min) ? Math.round(Ht * .34) + 8 : 0;
      var availW = Wd - hudW, availH = Ht - hudH, zm = FZ.zm || 1;
      var Rb = Math.max(70, Math.min(availW * .54, availH * .49)) * zm;
      var bcx = hudW + availW / 2, bcy = availH / 2;
      var lx = Math.max(bcx, Rb), rx = Math.max(Wd - bcx, Rb), ly = Math.max(bcy, Rb), ry = Math.max(Ht - bcy, Rb);
      FZ.ox = Math.max(-lx, Math.min(rx, FZ.ox || 0)); FZ.oy = Math.max(-ly, Math.min(ry, FZ.oy || 0));
      Object.assign(FZ, {Wd: Wd, Ht: Ht, dpr: dpr, Rb: Rb, k: Rb / R, bcx: bcx, bcy: bcy, ccx: bcx + FZ.ox, ccy: bcy + FZ.oy, s: Rb / BR});
      var z = document.getElementById('fzzv'); if (z) z.textContent = Math.round(zm * 100) + '%';
    };
  }

  /* zoom wokół punktu (px, py względem fzw) – liczony na świeżych wartościach, bo kilka zdarzeń może przyjść przed klatką */
  function zoomAt(f, px, py){
    if (!FZ || !FZ.Wd) return;
    var nz = Math.max(.5, Math.min(10, FZ.zm * f)), ff = nz / FZ.zm;
    if (ff === 1) return;
    FZ.ox = px + (FZ.bcx + FZ.ox - px) * ff - FZ.bcx;
    FZ.oy = py + (FZ.bcy + FZ.oy - py) * ff - FZ.bcy;
    FZ.zm = nz; fzSched();
  }
  function zoomAtCenter(f){ if (FZ && FZ.Wd) zoomAt(f, FZ.bcx, FZ.bcy); }

  /* dotyk: jeden palec = przesuwanie, dwa palce = zoom + przesuwanie */
  var pts = {}, g0 = null, hintTimer = 0;
  function ids(){ return Object.keys(pts); }
  function hideHint(){ var h = document.getElementById('fzhint'); if (h) h.style.display = 'none'; }
  function startPan(p){ g0 = {mode: 'pan', x: p.x, y: p.y, ox: FZ.ox, oy: FZ.oy, moved: false}; }
  function startPinch(){
    var a = pts[ids()[0]], b = pts[ids()[1]];
    g0 = {mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, moved: true};
  }
  fzc.addEventListener('pointerdown', function(e){
    if (e.pointerType === 'mouse' || !FZ) return;
    pts[e.pointerId] = {x: e.clientX, y: e.clientY};
    try { fzc.setPointerCapture(e.pointerId); } catch (x) {}
    clearTimeout(hintTimer);
    var n = ids().length;
    if (n === 1) startPan(pts[e.pointerId]);
    else if (n === 2){ startPinch(); hideHint(); }
  });
  fzc.addEventListener('pointermove', function(e){
    if (e.pointerType === 'mouse' || !FZ || !pts[e.pointerId] || !g0) return;
    pts[e.pointerId] = {x: e.clientX, y: e.clientY};
    var rc = fzw.getBoundingClientRect();
    if (g0.mode === 'pan' && ids().length === 1){
      var dx = e.clientX - g0.x, dy = e.clientY - g0.y;
      if (!g0.moved && Math.hypot(dx, dy) > 8){ g0.moved = true; hideHint(); }
      if (g0.moved){ FZ.ox = g0.ox + dx; FZ.oy = g0.oy + dy; fzSched(); }
    } else if (g0.mode === 'pinch' && ids().length >= 2){
      var a = pts[ids()[0]], b = pts[ids()[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(d / g0.d, mx - rc.left, my - rc.top);
      FZ.ox += mx - g0.mx; FZ.oy += my - g0.my;
      g0.d = d; g0.mx = mx; g0.my = my; fzSched();
    }
  });
  function up(e){
    if (e.pointerType === 'mouse' || !pts[e.pointerId]) return;
    delete pts[e.pointerId];
    var n = ids().length, moved = g0 && g0.moved;
    if (moved){ fzJust = true; setTimeout(function(){ fzJust = false; }, 150); }
    if (n === 0){ g0 = null; hintTimer = setTimeout(hideHint, 4000); }
    else if (n === 1 && FZ){ startPan(pts[ids()[0]]); g0.moved = true; }   /* po puszczeniu jednego palca nie skacz */
  }
  fzc.addEventListener('pointerup', up);
  fzc.addEventListener('pointercancel', up);
  fzc.addEventListener('contextmenu', function(e){ e.preventDefault(); });
}

/* ---------- główna mapa: zoom szczypnięciem ---------- */
var wrap = document.getElementById('wrap'), pin = null;
function tdist(t){ return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; }
function mapZoomAt(next, mx, my){
  var rect = wrap.getBoundingClientRect(), px = mx - rect.left, py = my - rect.top, old = zoom;
  if (Math.abs(next - old) < .0001) return;
  var cb = cv.getBoundingClientRect(), mapX = (mx - cb.left) / old, mapY = (my - cb.top) / old;
  var cL = cb.left - rect.left + wrap.scrollLeft, cT = cb.top - rect.top + wrap.scrollTop;
  zoom = next; applyZoom();                      /* podczas szczypania tylko skalujemy obraz (szybko) */
  wrap.scrollLeft = cL + mapX * next - px; wrap.scrollTop = cT + mapY * next - py;
}
if (wrap){
  wrap.addEventListener('touchstart', function(e){
    if (e.touches.length === 2 && S && !(typeof FZ !== 'undefined' && FZ)) pin = {d: tdist(e.touches), z: zoom, any: false};
  }, {passive: true});
  wrap.addEventListener('touchmove', function(e){
    if (!pin || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    var t = e.touches, next = Math.max(.55, Math.min(8, pin.z * tdist(t) / pin.d));
    mapZoomAt(next, (t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2);
    pin.any = true;
  }, {passive: false});
  var endPin = function(e){
    if (!pin || e.touches.length >= 2) return;
    var any = pin.any; pin = null;
    if (any && S){ try { draw(vision(meIdx())); } catch (x) {} }   /* po puszczeniu – ostre przerysowanie */
  };
  wrap.addEventListener('touchend', endPin, {passive: true});
  wrap.addEventListener('touchcancel', endPin, {passive: true});
}

/* ---------- zwijany panel boczny (telefon, pion) ---------- */
var main = document.getElementById('main'), side = document.getElementById('side');
if (main && side){
  var bar = document.createElement('button'); bar.type = 'button'; bar.id = 'mbBar';
  var setBar = function(){ bar.textContent = main.classList.contains('sidemin') ? '▲ Pokaż panel' : '▼ Zwiń panel (więcej mapy)'; };
  bar.onclick = function(){ main.classList.toggle('sidemin'); setBar(); window.dispatchEvent(new Event('resize')); };
  setBar(); main.insertBefore(bar, side);
}

/* ---------- przycisk dźwięku: z nagłówka (rozpychał go do 2 linii) na pływający przycisk w lewym dolnym rogu mapy ---------- */
(function(){
  var css = document.createElement('style');
  css.textContent = '#hd button.sound{display:none!important}' +
    '@media(min-width:821px){#hd{gap:8px 12px}#hd button{padding:8px 11px}#hd .zoom-hint{display:none}}' +
    '#sndBtn{position:fixed;z-index:45;display:none;padding:5px 10px;font:600 11.5px system-ui,sans-serif;color:#f0d9ad;background:rgba(13,23,38,.72);border:1px solid rgba(214,170,91,.4);border-radius:999px;cursor:pointer;backdrop-filter:blur(6px);touch-action:manipulation}' +
    '#sndBtn:hover{background:rgba(30,45,68,.88)}';
  document.head.appendChild(css);
  var b = document.createElement('button'); b.type = 'button'; b.id = 'sndBtn'; b.title = 'Włącz / wyłącz dźwięk';
  document.body.appendChild(b);
  function on(){ try { return !!soundOn; } catch (e) { return true; } }
  b.onclick = function(e){ e.stopPropagation(); try { soundOn = !soundOn; } catch (x) {} sync(); };
  function sync(){ b.textContent = on() ? '🔊 Dźwięk' : '🔇 Wyciszony'; }
  function place(){
    var game = document.getElementById('game'), wr = document.getElementById('wrap');
    if (!game || !wr || game.style.display === 'none' || !window.S){ b.style.display = 'none'; return; }
    var rc = wr.getBoundingClientRect();
    if (rc.width < 40 || rc.height < 40){ b.style.display = 'none'; return; }
    b.style.display = 'block'; sync();
    b.style.left = (rc.left + 10) + 'px';
    b.style.top = Math.max(rc.top + 4, rc.bottom - b.offsetHeight - 10) + 'px';
  }
  setInterval(place, 300);
  window.addEventListener('resize', place);
})();
})();
