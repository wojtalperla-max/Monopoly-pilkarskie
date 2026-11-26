/* ==========================================================
   Imperia – lepsza mgła wojny
   Dotąd pola niezbadane w ogóle nie były rysowane, więc wyglądały tak samo jak
   pustka za krawędzią mapy. Teraz:
   - pola niezbadane (ale leżące na mapie) są rysowane jako gęsta, jasnoszara mgła z chmurkami,
   - pola niezbadane przy granicy odkrytego terenu mają jaśniejszą mgłę ze znakiem „?”
     (tam może być ciąg dalszy mapy),
   - cała mapa ma wyraźną złotą ramkę na krawędzi – za ramką świata już nic nie ma.
   Działa na głównej mapie i w widoku przybliżonego pola (sąsiednie, niezbadane pola).
   Nie zmienia logiki gry ani imperia-lib1.js.
   ========================================================== */
(function(){
'use strict';

var SC = 3;                 /* rozdzielczość sprite'ów mgły (px na jednostkę) */
var sprites = null;

function rnd(n){ var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function hexP(g, r){
  g.beginPath();
  for (var k = 0; k < 6; k++){ var a = Math.PI / 180 * (60 * k - 30); g[k ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); }
  g.closePath();
}

function makeSprite(kind, v){
  var SW = W + 4, SH = 2 * R + 4, w = Math.ceil(SW * SC), h = Math.ceil(SH * SC);
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var g = c.getContext('2d'); g.setTransform(SC, 0, 0, SC, w / 2, h / 2);
  var fr = kind === 1, seed = v * 17 + kind * 101;
  hexP(g, R - .3);
  var gr = g.createLinearGradient(-R * .6, -R, R * .6, R);
  if (fr){ gr.addColorStop(0, '#1b2635'); gr.addColorStop(1, '#0f1721'); }
  else   { gr.addColorStop(0, '#05080c'); gr.addColorStop(1, '#020305'); }
  g.fillStyle = gr; g.fill();
  g.save(); hexP(g, R - .3); g.clip();
  for (var i = 0; i < 6; i++){
    var x = (rnd(seed + i * 3.1) - .5) * R * 1.5, y = (rnd(seed + i * 5.7) - .5) * R * 1.5, rad = R * (.45 + rnd(seed + i * 9.3) * .5);
    var rg = g.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, 'rgba(205,220,238,' + (fr ? .10 : .035) + ')'); rg.addColorStop(1, 'rgba(205,220,238,0)');
    g.fillStyle = rg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  var dk = g.createRadialGradient(0, 0, R * .5, 0, 0, R);
  dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = dk; g.fillRect(-R, -R, 2 * R, 2 * R);
  g.restore();
  hexP(g, R - .8); g.strokeStyle = 'rgba(200,215,235,' + (fr ? .16 : .035) + ')'; g.lineWidth = .9; g.stroke();
  if (fr){
    g.font = 'bold ' + (R * .85) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(215,228,245,.45)'; g.fillText('?', 0, R * .05);
  }
  return c;
}
function getSprites(){
  if (sprites) return sprites;
  sprites = [[], []];
  for (var k = 0; k < 2; k++) for (var v = 0; v < 4; v++) sprites[k].push(makeSprite(k, v));
  return sprites;
}

function mySeen(){
  if (typeof S === 'undefined' || !S || !S.pl) return null;
  if (typeof spec !== 'undefined' && spec) return null;
  try { return S.pl[meIdx()].seen; } catch (e) { return null; }
}
function nbrs(r){
  return (r & 1) ? [[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]] : [[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]];
}
function isFrontier(seen, q, r){
  var nb = nbrs(r), k, nq, nr;
  for (k = 0; k < 6; k++){
    nq = q + nb[k][0]; nr = r + nb[k][1];
    if (nq < 0 || nr < 0 || nq >= S.w || nr >= S.h) continue;
    if (seen[nr * S.w + nq] == '1') return true;
  }
  return false;
}

/* rysuje jedno pole mgły; (px,py) = środek, rad = promień heksa (na głównej mapie = R) */
function cell(g, px, py, rad, q, r, i){
  var seen = mySeen(); if (!seen) return;
  if (!isFrontier(seen, q, r)) return;   /* tylko pola z „?” – reszta niezbadanych pól zostaje pusta */
  var sp = getSprites(), kind = 1, v = Math.floor(rnd(q * 31 + r * 17) * 4) % 4;
  var f = rad / R, SW = (W + 4) * f, SH = (2 * R + 4) * f;
  g.drawImage(sp[kind][v], px - SW / 2, py - SH / 2, SW, SH);
}

/* złota ramka na krawędzi mapy – pojawia się dopiero przy odkrytych polach brzegowych */
function border(g, seen){
  var path = [], q, r, k, nb, nq, nr, a1, a2, x, y, p;
  for (r = 0; r < S.h; r++) for (q = 0; q < S.w; q++){
    if (seen && seen[r * S.w + q] != '1') continue;   /* ramka tylko przy polach już odkrytych */
    nb = nbrs(r);
    for (k = 0; k < 6; k++){
      nq = q + nb[k][0]; nr = r + nb[k][1];
      if (nq >= 0 && nr >= 0 && nq < S.w && nr < S.h) continue;
      p = C(q, r); x = p[0]; y = p[1];
      a1 = Math.PI / 180 * (60 * k - 30); a2 = a1 + Math.PI / 3;
      path.push([x + R * Math.cos(a1), y + R * Math.sin(a1), x + R * Math.cos(a2), y + R * Math.sin(a2)]);
    }
  }
  if (!path.length) return;
  function stroke(col, lw){
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
    path.forEach(function(s){ g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); });
    g.stroke();
  }
  stroke('rgba(0,0,0,.55)', 7);
  stroke('rgba(240,205,130,.95)', 2.6);
  g.lineCap = 'butt';
}

function paintMap(){
  if (typeof S === 'undefined' || !S || !S.pl || typeof cv === 'undefined' || typeof boardW === 'undefined' || !boardW) return;
  var g = cv.getContext('2d'), pr = cv.width / boardW, seen = mySeen(), q, r, p;
  g.save(); g.setTransform(pr, 0, 0, pr, 0, 0);
  try {
    if (seen){
      for (r = 0; r < S.h; r++) for (q = 0; q < S.w; q++){
        if (seen[r * S.w + q] == '1') continue;
        p = C(q, r); cell(g, p[0], p[1], R, q, r, r * S.w + q);
      }
    }
    border(g, seen);
  } finally { g.restore(); }
}

function hook(){
  if (typeof window.draw !== 'function' || window.draw.__fog) return;
  var orig = window.draw;
  var wrapped = function(){
    var res = orig.apply(this, arguments);
    try { paintMap(); } catch (e) { if (window.console) console.warn('Imperia fog:', e); }
    return res;
  };
  wrapped.__fog = true; wrapped.__ifx = true;   /* __ifx: żeby imperia-fx.js nie owijał drugi raz */
  window.draw = wrapped;
}
hook();

window.IFOG = {cell: cell};

/* przerysuj od razu, jeśli gra już trwa */
try { if (typeof S !== 'undefined' && S && S.pl && typeof draw === 'function') draw(vision(meIdx())); } catch (e) {}
})();
