/* ==========================================================
   Imperia – grafika: kafelki terenu (cieniowanie, pory roku), domki, wieże, zamki.
   Kafelki są rysowane raz do małych canvasów (cache) i potem tylko kopiowane,
   więc nawet duża mapa działa płynnie. Cache zależy od zoomu i pory roku.
   ========================================================== */
var GFX = {cache: {}, pr: 0};

function gRng(seed){ var s = (seed >>> 0) || 1; return function(){ s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function gHexPath(g, r){ g.beginPath(); for (var k = 0; k < 6; k++){ var a = Math.PI / 180 * (60 * k - 30); g[k ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); } g.closePath(); }
function gLin(g, x0, y0, x1, y1, a, b){ var gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
function gShade(hex, amt){
  var n = parseInt(String(hex).replace('#', '').slice(0, 6), 16); if (isNaN(n)) n = 0x888888;
  var r = n >> 16, g = (n >> 8) & 255, b = n & 255, f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return 'rgb(' + Math.round((f - r) * p + r) + ',' + Math.round((f - g) * p + g) + ',' + Math.round((f - b) * p + b) + ')';
}
function gEll(g, x, y, rx, ry, fill){ g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }

/* ---------- palety: [góra, dół] wg terenu i pory roku (0 wiosna, 1 lato, 2 jesień, 3 zima) ---------- */
function gPal(ty, se){
  switch (ty){
    case 0: return se === 3 ? ['#3f80ad', '#2a5f88'] : ['#2f78b0', '#1c5384'];
    case 1: return se === 3 ? ['#7cc0dc', '#5aa5c6'] : ['#62b9e0', '#3d93c0'];
    case 2: return se === 3 ? ['#f0dcA0', '#d9bb70'] : ['#efd58c', '#d4a94f'];
    case 3: return [['#52a455', '#357f3f'], ['#459049', '#2c6c36'], ['#98863f', '#756230'], ['#e6eef1', '#c3d3da']][se];
    case 4: return se === 3 ? ['#d3dde2', '#a9b8bf'] : ['#8e9aa0', '#6b777d'];
    case 6: return ['#f3e6b6', '#dcc78a'];
    case 7: return se === 3 ? ['#a3b1a8', '#808f87'] : se === 2 ? ['#6f8456', '#566a42'] : ['#6e9060', '#52744a'];
    default: return [['#aedb74', '#8bc25a'], ['#a2d068', '#80b84e'], ['#cbb865', '#a8943f'], ['#f1f6f8', '#d5e3ea']][se];
  }
}

/* ---------- elementy krajobrazu ---------- */
function gPine(g, x, y, s, c1, c2, snow){
  gEll(g, x + s * .25, y + s * .15, s * .55, s * .2, 'rgba(0,0,0,.25)');
  g.fillStyle = '#5a4026'; g.fillRect(x - s * .09, y - s * .1, s * .18, s * .32);
  for (var i = 0; i < 3; i++){
    var by = y - s * .05 - i * s * .42, w = s * (.62 - i * .13), top = by - s * .62;
    g.fillStyle = c1; g.beginPath(); g.moveTo(x, top); g.lineTo(x - w, by); g.lineTo(x, by); g.closePath(); g.fill();
    g.fillStyle = c2; g.beginPath(); g.moveTo(x, top); g.lineTo(x + w, by); g.lineTo(x, by); g.closePath(); g.fill();
    if (snow){ g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.moveTo(x, top); g.lineTo(x - w * .62, top + (by - top) * .62); g.quadraticCurveTo(x - w * .1, top + (by - top) * .5, x, top + (by - top) * .66); g.quadraticCurveTo(x + w * .2, top + (by - top) * .5, x + w * .62, top + (by - top) * .62); g.closePath(); g.fill(); }
  }
}
function gTree(g, x, y, s, c1, c2){
  gEll(g, x + s * .2, y + s * .12, s * .6, s * .2, 'rgba(0,0,0,.25)');
  g.fillStyle = '#5b4228'; g.fillRect(x - s * .08, y - s * .45, s * .16, s * .6);
  gEll(g, x, y - s * .75, s * .62, s * .5, c2);
  gEll(g, x - s * .22, y - s * .6, s * .42, s * .36, c2);
  gEll(g, x - s * .1, y - s * .92, s * .5, s * .4, c1);
  gEll(g, x - s * .25, y - s * 1.0, s * .22, s * .16, 'rgba(255,255,255,.18)');
}
function gPeak(g, x, y, w, h, snowFrac, c1, c2){
  g.fillStyle = c1; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y - h); g.lineTo(x + w * .12, y); g.closePath(); g.fill();
  g.fillStyle = c2; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w, y); g.lineTo(x + w * .12, y); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,38,46,.35)'; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w * .12, y); g.stroke();
  if (snowFrac > 0){
    var sy = y - h + h * snowFrac, sw = w * snowFrac;
    g.fillStyle = '#f5fafc'; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x - sw, sy);
    g.lineTo(x - sw * .55, sy - h * .08); g.lineTo(x - sw * .2, sy + h * .05); g.lineTo(x + sw * .12, sy - h * .06); g.closePath(); g.fill();
    g.fillStyle = '#b9ccd6'; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + sw * 1.0, sy);
    g.lineTo(x + sw * .6, sy - h * .06); g.lineTo(x + sw * .3, sy + h * .05); g.lineTo(x + sw * .12, sy - h * .06); g.closePath(); g.fill();
  }
}
function gTuft(g, x, y, col){ g.strokeStyle = col; g.lineWidth = .9; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 1.8, y - 4); g.moveTo(x, y); g.lineTo(x + .2, y - 5); g.moveTo(x, y); g.lineTo(x + 1.9, y - 3.6); g.stroke(); }
function gReed(g, x, y){ g.strokeStyle = '#3f5c34'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 1, y - 10); g.moveTo(x + 2, y); g.lineTo(x + 2.5, y - 8); g.stroke(); g.fillStyle = '#6b4a2a'; g.fillRect(x - 2, y - 13, 2.2, 4.5); g.fillRect(x + 1.6, y - 10.5, 2, 3.8); }

/* ---------- teren ---------- */
function gArtPlains(g, rn, v, se){
  var i, win = se === 3;
  for (i = 0; i < 6; i++){ g.fillStyle = i % 2 ? 'rgba(255,255,255,.10)' : 'rgba(30,70,20,.09)'; g.beginPath(); g.ellipse((rn() - .5) * 30, (rn() - .5) * 30, 5 + rn() * 7, 3 + rn() * 4, rn() * 3, 0, 7); g.fill(); }
  if (v % 4 === 0){
    var cols = win ? ['#f7fafb', '#e4edf1', '#f1f6f8'] : se === 2 ? ['#dcb84e', '#c99b36', '#bb8a2e'] : ['#86bb4c', '#c9c34c', '#6ba444'];
    for (var j = 0; j < 3; j++){
      g.save(); g.translate(-10 + j * 7.6, 0); g.rotate(-.38); g.fillStyle = cols[j]; g.fillRect(-3.6, -13, 7.2, 26);
      g.strokeStyle = 'rgba(60,40,10,.3)'; g.lineWidth = .7;
      for (var k = -2; k <= 2; k++){ g.beginPath(); g.moveTo(k * 1.4, -13); g.lineTo(k * 1.4, 13); g.stroke(); }
      g.restore();
    }
  } else {
    var tc = win ? 'rgba(120,140,120,.8)' : se === 2 ? '#8a7a2c' : '#4e8b34';
    for (i = 0; i < 10; i++) gTuft(g, (rn() - .5) * 30, (rn() - .5) * 28 + 2, tc);
    if (win){ for (i = 0; i < 4; i++) gEll(g, (rn() - .5) * 26, (rn() - .5) * 26, 4 + rn() * 4, 1.8 + rn() * 1.4, 'rgba(255,255,255,.85)'); }
    else if (se <= 1){ var fc = ['#ffffff', '#ffd54f', '#f48fb1', '#ce93d8']; for (i = 0; i < 7; i++) gEll(g, (rn() - .5) * 28, (rn() - .5) * 26, 1.2, 1.2, fc[i % 4]); }
    if (v % 4 === 2){ if (se === 3) gPine(g, 6, 4, 10, '#3b8060', '#25604a', true); else gTree(g, 6, 3, 9, se === 2 ? '#e0902f' : '#4fae55', se === 2 ? '#b5572a' : '#2f8a3c'); }
    if (v % 4 === 3){ gEll(g, -8, 5, 4.5, 3, se === 3 ? '#e6eef1' : '#3d8a3c'); gEll(g, -9, 3.6, 3, 2, se === 3 ? '#fff' : '#58a84a'); }
  }
}
function gArtForest(g, rn, v, se){
  var spots = [[-11, -8], [1, -13], [11, -7], [-13, 3], [-3, -2], [9, 4], [-6, 11], [4, 12], [14, -1]], i, list = [];
  for (i = 0; i < spots.length; i++) list.push([spots[i][0] + (rn() - .5) * 4, spots[i][1] + (rn() - .5) * 3, 9 + rn() * 4, rn()]);
  list.sort(function(a, b){ return a[1] - b[1]; });
  for (i = 0; i < list.length; i++){
    var t = list[i], decid = (t[3] < .38 && se !== 3) || (se === 2 && t[3] < .6);
    if (decid){ var A = se === 2 ? [['#e5a23a', '#c4682a'], ['#d9822b', '#b5472a'], ['#c9a227', '#9a7d1c']][i % 3] : [['#5cb85f', '#2f8a3c'], ['#4fae55', '#2a7a38']][i % 2]; gTree(g, t[0], t[1], t[2] * .85, A[0], A[1]); }
    else gPine(g, t[0], t[1], t[2], se === 3 ? '#3b8060' : '#2f8a47', se === 3 ? '#25604a' : '#1f6434', se === 3);
  }
}
function gArtMountain(g, rn, v, se){
  var sn = se === 3 ? .72 : se === 1 ? .3 : .42, c1 = se === 3 ? '#9fb0b9' : '#8d9aa2', c2 = se === 3 ? '#6d8190' : '#5b6770';
  gEll(g, 0, 10, 18, 5, 'rgba(0,0,0,.18)');
  gPeak(g, -12, 11, 9, 14 + rn() * 3, sn, c1, c2);
  gPeak(g, 12, 10, 10, 17 + rn() * 3, sn, c1, c2);
  gPeak(g, -1, 12, 15, 25 + rn() * 3, sn, c1, c2);
  for (var i = 0; i < 4; i++) gEll(g, (rn() - .5) * 30, 13 + rn() * 3, 2 + rn() * 1.5, 1.2, 'rgba(60,66,70,.55)');
  if (se !== 3) for (i = 0; i < 3; i++) gTuft(g, -14 + i * 14 + rn() * 3, 15, '#4f7a3c');
}
function gArtDesert(g, rn, v, se){
  var i;
  for (i = 0; i < 3; i++){
    var y = -9 + i * 9 + (rn() - .5) * 3, x = (rn() - .5) * 8;
    g.fillStyle = 'rgba(160,105,40,.28)'; g.beginPath(); g.moveTo(x - 20, y + 8); g.quadraticCurveTo(x - 6, y - 8, x + 20, y + 8); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,190,.55)'; g.beginPath(); g.moveTo(x - 20, y + 8); g.quadraticCurveTo(x - 6, y - 8, x + 2, y - 3); g.quadraticCurveTo(x - 7, y - 3, x - 20, y + 8); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(150,100,45,.3)'; g.lineWidth = .8;
  for (i = 0; i < 4; i++){ var yy = -12 + i * 8 + rn() * 3; g.beginPath(); g.moveTo(-14, yy); g.quadraticCurveTo(-6, yy - 2.5, 0, yy); g.quadraticCurveTo(6, yy + 2.5, 14, yy); g.stroke(); }
  if (v % 3 === 0){
    var cx0 = 7 + rn() * 3, cy0 = 6;
    gEll(g, cx0 + 2, cy0 + 1, 5, 1.8, 'rgba(0,0,0,.2)');
    g.fillStyle = '#4f8f46'; g.fillRect(cx0 - 1.6, cy0 - 12, 3.2, 13);
    g.fillRect(cx0 - 5.4, cy0 - 8, 2.4, 1.6); g.fillRect(cx0 - 5.4, cy0 - 10.5, 1.8, 3);
    g.fillRect(cx0 + 3, cy0 - 6, 2.4, 1.6); g.fillRect(cx0 + 3.6, cy0 - 9, 1.8, 3.6);
    g.fillStyle = '#6fae5f'; g.fillRect(cx0 - 1.6, cy0 - 12, 1.2, 13);
  } else { for (i = 0; i < 3; i++) gEll(g, (rn() - .5) * 28, (rn() - .5) * 26 + 4, 2.6, 1.7, '#a98558'); }
}
function gArtCoast(g, rn, v, se){
  var i;
  for (i = 0; i < 6; i++) gEll(g, (rn() - .5) * 28, (rn() - .5) * 28, 1.2 + rn() * 1.3, 1 + rn() * .8, i % 2 ? '#bda878' : '#fff4d0');
  g.strokeStyle = 'rgba(190,160,100,.35)'; g.lineWidth = .8;
  for (i = 0; i < 3; i++){ var y = -8 + i * 8; g.beginPath(); g.moveTo(-15, y); g.quadraticCurveTo(-5, y - 2, 4, y); g.quadraticCurveTo(10, y + 2, 15, y); g.stroke(); }
  var fy = 14; g.fillStyle = 'rgba(70,165,205,.55)'; g.beginPath(); g.moveTo(-24, fy + 3); g.quadraticCurveTo(-8, fy - 3, 0, fy); g.quadraticCurveTo(10, fy + 3, 24, fy - 1); g.lineTo(24, 26); g.lineTo(-24, 26); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-24, fy + 3); g.quadraticCurveTo(-8, fy - 3, 0, fy); g.quadraticCurveTo(10, fy + 3, 24, fy - 1); g.stroke();
  if (v % 3 === 0 && se !== 3){
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(-6, 7); g.quadraticCurveTo(-4, -3, -7, -9); g.stroke();
    g.strokeStyle = '#2f8a46'; g.lineWidth = 1.5;
    for (i = 0; i < 5; i++){ var a = -2.7 + i * .55; g.beginPath(); g.moveTo(-7, -9); g.quadraticCurveTo(-7 + Math.cos(a) * 5, -9 + Math.sin(a) * 4 - 2, -7 + Math.cos(a) * 9, -9 + Math.sin(a) * 7 + 2); g.stroke(); }
  }
}
function gArtSwamp(g, rn, v, se){
  var i, wc = se === 3 ? '#8aa6ac' : '#3f6b70';
  for (i = 0; i < 3; i++){ var x = (rn() - .5) * 22, y = (rn() - .5) * 22; gEll(g, x, y, 7 + rn() * 3, 3.6 + rn() * 1.5, wc); gEll(g, x - 1, y - 1, 5, 2.2, 'rgba(255,255,255,.14)'); g.strokeStyle = 'rgba(30,50,30,.5)'; g.lineWidth = .8; g.beginPath(); g.ellipse(x, y, 7.5, 4, 0, 0, 7); g.stroke(); }
  for (i = 0; i < 3; i++){ var lx = (rn() - .5) * 22, ly = (rn() - .5) * 20; g.fillStyle = se === 3 ? '#bfcfc6' : '#4f9a46'; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 2.4, .4, 5.9); g.closePath(); g.fill(); }
  for (i = 0; i < 3; i++) gReed(g, -12 + i * 11 + (rn() - .5) * 4, 11 + (rn() - .5) * 4);
  if (v % 3 === 1){ g.fillStyle = '#5a4630'; g.fillRect(8, -10, 3, 8); g.fillStyle = '#6e5a40'; g.fillRect(7, -11, 5, 2.5); }
}
function gArtWater(g, rn, v, se, lake){
  var i;
  for (i = 0; i < 4; i++) gEll(g, (rn() - .5) * 28, (rn() - .5) * 28, 6 + rn() * 5, 3 + rn() * 3, lake ? 'rgba(20,80,140,.12)' : 'rgba(0,25,70,.16)');
  g.lineCap = 'round'; g.lineWidth = 1.2;
  for (i = 0; i < 6; i++){
    var x = (rn() - .5) * 28, y = (rn() - .5) * 30, w = 4 + rn() * 5;
    g.strokeStyle = i % 3 === 0 ? 'rgba(0,30,80,.25)' : (lake ? 'rgba(255,255,255,.42)' : 'rgba(200,235,255,.34)');
    g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w / 2, y - 2.4, x, y); g.quadraticCurveTo(x + w / 2, y + 2.4, x + w, y); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.75)';
  for (i = 0; i < 3; i++){ var sx = (rn() - .5) * 26, sy = (rn() - .5) * 26; g.fillRect(sx - 1.4, sy - .4, 2.8, .8); g.fillRect(sx - .4, sy - 1.4, .8, 2.8); }
  g.lineCap = 'butt';
}

function gfxTerrain(g, ty, v, se){
  var rn = gRng(ty * 977 + v * 131 + 7), P = gPal(ty, se);
  g.save(); gHexPath(g, R + .6); g.clip();
  g.fillStyle = gLin(g, -14, -20, 14, 22, P[0], P[1]); g.fillRect(-W, -R - 3, 2 * W, 2 * R + 6);
  if (ty === 0) gArtWater(g, rn, v, se, false);
  else if (ty === 1) gArtWater(g, rn, v, se, true);
  else if (ty === 2) gArtDesert(g, rn, v, se);
  else if (ty === 3) gArtForest(g, rn, v, se);
  else if (ty === 4) gArtMountain(g, rn, v, se);
  else if (ty === 6) gArtCoast(g, rn, v, se);
  else if (ty === 7) gArtSwamp(g, rn, v, se);
  else gArtPlains(g, rn, v, se);
  /* światło z lewej-góry + delikatna winieta + losowa jasność kafelka */
  g.fillStyle = gLin(g, -W / 2, -R, W / 2, R, 'rgba(255,255,255,.16)', 'rgba(0,0,0,.16)'); g.fillRect(-W, -R - 3, 2 * W, 2 * R + 6);
  var vg = g.createRadialGradient(0, 0, 9, 0, 0, R + 2); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.2)');
  g.fillStyle = vg; g.fillRect(-W, -R - 3, 2 * W, 2 * R + 6);
  var br = (v - 3.5) * .014; g.fillStyle = br > 0 ? 'rgba(255,255,255,' + br + ')' : 'rgba(0,0,0,' + (-br) + ')'; g.fillRect(-W, -R - 3, 2 * W, 2 * R + 6);
  g.restore();
  /* fazowana krawędź: jasna z lewej-góry, ciemna z prawej-dołu */
  g.lineWidth = 1.3; g.lineCap = 'round';
  for (var k = 0; k < 6; k++){
    var a1 = Math.PI / 180 * (60 * k - 30), a2 = a1 + Math.PI / 3, rr = R - .9;
    g.strokeStyle = k >= 3 ? 'rgba(255,255,255,.34)' : 'rgba(0,0,0,.34)';
    g.beginPath(); g.moveTo(rr * Math.cos(a1), rr * Math.sin(a1)); g.lineTo(rr * Math.cos(a2), rr * Math.sin(a2)); g.stroke();
  }
  g.lineCap = 'butt';
}

/* rysuje kafelek (z cache) na głównym canvasie */
function gfxTile(ty, q, r, x, y, pr){
  var se = (typeof wxSeasonIdx === 'function' && S) ? wxSeasonIdx(S.round) : 1, v = Math.floor(seeded(q, r) * 8) % 8, prk = Math.round(pr * 40);
  if (GFX.pr !== prk){ GFX.cache = {}; GFX.pr = prk; }
  var key = ty + '|' + v + '|' + se, sp = GFX.cache[key], SW = W + 4, SH = 2 * R + 4;
  if (!sp){
    var w = Math.ceil(SW * pr), h = Math.ceil(SH * pr);
    sp = document.createElement('canvas'); sp.width = w; sp.height = h;
    var g = sp.getContext('2d'); g.setTransform(w / SW, 0, 0, h / SH, w / 2, h / 2);
    gfxTerrain(g, ty, v, se); GFX.cache[key] = sp;
  }
  cx.drawImage(sp, x - SW / 2, y - SH / 2, SW, SH);
  gfxBlend(ty, q, r, x, y, se);
}


/* ---------- płynne przejścia między polami ----------
   Każdy kafelek lekko „wciąga" kolor sąsiada przy wspólnej krawędzi (tylko w obrębie własnego heksa,
   więc kolejność rysowania nie ma znaczenia). Połowa przejścia z jednej strony + połowa z drugiej
   daje ciągły gradient. Sąsiedzi poza zasięgiem wzroku są pomijani (brak wycieku informacji).
   Woda <-> ląd: też mieszany kolor (bez dodatkowych fal na brzegu). */
function gRgba(hex, a){
  var n = parseInt(String(hex).replace('#', '').slice(0, 6), 16); if (isNaN(n)) n = 0x888888;
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function gfxBlend(ty, q, r, x, y, se){
  if (!S || !S.t || ty < 2) return;
  if (window.IFX && window.IFX.opt && window.IFX.opt.blend === false) return;
  var all = (typeof spec !== 'undefined' && spec), seen = all ? null : S.pl[meIdx()].seen;
  var dr = (r & 1) ? [[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]] : [[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]];
  var ap = W / 2, dep = 14;
  for (var k = 0; k < 6; k++){
    var nq = q + dr[k][0], nr = r + dr[k][1];
    if (nq < 0 || nr < 0 || nq >= S.w || nr >= S.h) continue;
    var i = nr * S.w + nq;
    if (seen && seen[i] != '1') continue;
    var nty = +S.t[i];
    if (nty === ty) continue;
    var a1 = Math.PI / 180 * (60 * k - 30), a2 = a1 + Math.PI / 3, an = Math.PI / 180 * 60 * k;
    var nx = Math.cos(an), ny = Math.sin(an);
    var c1x = R * Math.cos(a1), c1y = R * Math.sin(a1), c2x = R * Math.cos(a2), c2y = R * Math.sin(a2);
    var col = gPal(nty, se)[0], al = nty < 2 ? .6 : .5;
    var gr = cx.createLinearGradient(x + nx * ap, y + ny * ap, x + nx * (ap - dep), y + ny * (ap - dep));
    gr.addColorStop(0, gRgba(col, al)); gr.addColorStop(1, gRgba(col, 0));
    cx.fillStyle = gr;
    cx.beginPath();
    cx.moveTo(x + c1x, y + c1y); cx.lineTo(x + c2x, y + c2y);
    cx.lineTo(x + c2x - nx * dep, y + c2y - ny * dep); cx.lineTo(x + c1x - nx * dep, y + c1y - ny * dep);
    cx.closePath(); cx.fill();
  }
}

/* ---------- budynki ---------- */
function gfxHouse(g, x, y, col, up){
  var s = up ? 1.14 : 1, lit = gShade(col, .25), dk = gShade(col, -.3);
  g.save(); g.translate(x, y + 1); g.scale(s, s);
  gEll(g, 0, 8, 14, 4.2, 'rgba(0,0,0,.32)');
  gEll(g, 0, 7.5, 12.5, 3.6, 'rgba(150,120,70,.55)');
  g.fillStyle = '#8a8070'; g.fillRect(6, -16, 4, 9); g.fillStyle = '#a69d8b'; g.fillRect(6, -16, 1.6, 9); g.fillStyle = '#6f6759'; g.fillRect(5.2, -17.6, 5.6, 2);
  g.fillStyle = gLin(g, -9, 0, 9, 0, '#f0ddb0', '#cdb27c'); g.fillRect(-9, -4, 18, 12);
  g.fillStyle = '#8d8676'; g.fillRect(-9, 5, 18, 3.2);
  g.strokeStyle = '#6b4a30'; g.lineWidth = 1; g.beginPath();
  g.moveTo(-9, -4); g.lineTo(-9, 8); g.moveTo(9, -4); g.lineTo(9, 8); g.moveTo(-9, 1); g.lineTo(9, 1); g.moveTo(0, -4); g.lineTo(0, 1);
  g.moveTo(-9, -4); g.lineTo(-4.5, 1); g.moveTo(9, -4); g.lineTo(4.5, 1); g.stroke();
  g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(-3.2, 8); g.lineTo(-3.2, 3.2); g.arc(-.7, 3.2, 2.5, Math.PI, 0); g.lineTo(1.8, 8); g.closePath(); g.fill();
  g.fillStyle = '#e7c46a'; g.fillRect(.7, 5.4, .9, .9);
  g.fillStyle = col; g.fillRect(3.2, 1.6, 1.4, 4.2); g.fillRect(8.2, 1.6, 1.2, 4.2);
  g.fillStyle = '#f7dd90'; g.fillRect(4.6, 1.8, 3.6, 3.8); g.strokeStyle = '#5a3a24'; g.lineWidth = .8; g.strokeRect(4.6, 1.8, 3.6, 3.8);
  g.beginPath(); g.moveTo(6.4, 1.8); g.lineTo(6.4, 5.6); g.moveTo(4.6, 3.7); g.lineTo(8.2, 3.7); g.stroke();
  g.fillStyle = col; g.fillRect(-8, 2, 1.4, 4);
  g.fillStyle = '#cf5f3d'; g.beginPath(); g.moveTo(-12.5, -2.5); g.lineTo(0, -15.5); g.lineTo(0, -2.5); g.closePath(); g.fill();
  g.fillStyle = '#9b3d27'; g.beginPath(); g.moveTo(12.5, -2.5); g.lineTo(0, -15.5); g.lineTo(0, -2.5); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(60,20,10,.45)'; g.lineWidth = .8; g.beginPath(); g.moveTo(-8, -6.4); g.lineTo(8, -6.4); g.moveTo(-4.5, -10); g.lineTo(4.5, -10); g.stroke();
  g.strokeStyle = up ? '#e8c35a' : '#4a2418'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-12.5, -2.5); g.lineTo(0, -15.5); g.lineTo(12.5, -2.5); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-9, -2.5, 18, 1.6);
  g.strokeStyle = '#4a3a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -15.5); g.lineTo(0, -22); g.stroke();
  g.fillStyle = col; g.beginPath(); g.moveTo(0, -22); g.lineTo(6.5, -20); g.lineTo(0, -18); g.closePath(); g.fill();
  g.fillStyle = dk; g.beginPath(); g.moveTo(0, -20); g.lineTo(6.5, -20); g.lineTo(0, -18); g.closePath(); g.fill();
  g.restore();
}
function gfxTower(g, x, y, col){
  g.save(); g.translate(x, y + 1);
  gEll(g, 0, 9, 11, 3.4, 'rgba(0,0,0,.35)');
  g.fillStyle = gLin(g, -7, 0, 7, 0, '#d6d0c0', '#8a8476'); g.fillRect(-6.5, -10, 13, 19);
  g.fillStyle = '#7d776a'; g.fillRect(-8, 6, 16, 3.4);
  g.strokeStyle = 'rgba(50,45,38,.35)'; g.lineWidth = .7; g.beginPath();
  for (var j = 0; j < 4; j++){ var yy = -6 + j * 4.4; g.moveTo(-6.5, yy); g.lineTo(6.5, yy); for (var i = 0; i < 2; i++){ var xx = -3 + i * 6 + (j % 2 ? 2 : 0); g.moveTo(xx, yy); g.lineTo(xx, yy + 4.4); } }
  g.stroke();
  g.fillStyle = col; g.fillRect(-6.5, -9.4, 13, 2.4);
  g.fillStyle = '#aaa393'; g.fillRect(-9, -14, 18, 5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-9, -10, 18, 1.2);
  g.fillStyle = '#c9c2b0'; for (i = 0; i < 4; i++) g.fillRect(-9 + i * 5.4, -17.4, 3.2, 3.6);
  g.fillStyle = '#2b2620'; g.fillRect(-.8, -5, 1.6, 5);
  g.beginPath(); g.moveTo(-2.6, 8); g.lineTo(-2.6, 4); g.arc(0, 4, 2.6, Math.PI, 0); g.lineTo(2.6, 8); g.closePath(); g.fill();
  g.strokeStyle = '#3d3226'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -17.4); g.lineTo(0, -26); g.stroke();
  g.fillStyle = col; g.beginPath(); g.moveTo(0, -26); g.lineTo(7.5, -23.6); g.lineTo(0, -21.2); g.closePath(); g.fill();
  g.fillStyle = gShade(col, -.3); g.beginPath(); g.moveTo(0, -23.6); g.lineTo(7.5, -23.6); g.lineTo(0, -21.2); g.closePath(); g.fill();
  g.restore();
}
function gfxCastle(g, x, y, col, lv, sel){
  var lit = gShade(col, .22), dk = gShade(col, -.35), i;
  g.save(); g.translate(x, y + 2); g.scale(.86, .86);
  gEll(g, 0, 10, 20, 5.5, 'rgba(0,0,0,.38)');
  gEll(g, 0, 9.5, 18, 4.2, 'rgba(140,115,75,.6)');
  /* mur kurtynowy */
  g.fillStyle = gLin(g, 0, -2, 0, 10, '#dad4c3', '#a29b8a'); g.fillRect(-17, -2, 34, 12);
  g.strokeStyle = 'rgba(70,64,54,.35)'; g.lineWidth = .7; g.beginPath();
  for (i = 0; i < 3; i++){ var yy = 1.4 + i * 3.1; g.moveTo(-17, yy); g.lineTo(17, yy); for (var k = 0; k < 9; k++){ var xx = -15 + k * 4 + (i % 2 ? 2 : 0); g.moveTo(xx, yy); g.lineTo(xx, yy + 3.1); } }
  g.stroke();
  g.fillStyle = '#cfc9b6'; for (i = 0; i < 7; i++) g.fillRect(-17 + i * 5.2, -5, 3.2, 3.4);
  g.fillStyle = col; g.fillRect(-17, 7.4, 34, 2.4);
  /* baszty narożne */
  [-14.5, 14.5].forEach(function(tx){
    g.fillStyle = gLin(g, tx - 5, 0, tx + 5, 0, '#dcd6c6', '#8c8678'); g.fillRect(tx - 5, -11, 10, 21);
    g.fillStyle = '#b3ad9b'; g.fillRect(tx - 6, -13, 12, 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(tx - 6, -10, 12, 1);
    g.fillStyle = '#2d2822'; g.fillRect(tx - .8, -7, 1.6, 4.5);
    g.fillStyle = lit; g.beginPath(); g.moveTo(tx - 7, -13); g.lineTo(tx, -25); g.lineTo(tx, -13); g.closePath(); g.fill();
    g.fillStyle = dk; g.beginPath(); g.moveTo(tx + 7, -13); g.lineTo(tx, -25); g.lineTo(tx, -13); g.closePath(); g.fill();
    if (lv >= 3){ g.strokeStyle = '#4a3a2a'; g.lineWidth = .9; g.beginPath(); g.moveTo(tx, -25); g.lineTo(tx, -30); g.stroke(); g.fillStyle = col; g.fillRect(tx, -30, 4.5, 2.6); }
  });
  /* donżon */
  g.fillStyle = gLin(g, -7, 0, 7, 0, '#e4decd', '#968f7f'); g.fillRect(-7, -16, 14, 24);
  g.strokeStyle = 'rgba(70,64,54,.3)'; g.lineWidth = .7; g.beginPath(); for (i = 0; i < 5; i++){ g.moveTo(-7, -12 + i * 4.6); g.lineTo(7, -12 + i * 4.6); } g.stroke();
  g.fillStyle = '#b9b3a1'; g.fillRect(-8.5, -18.5, 17, 3.2); g.fillStyle = '#d3cdbb'; for (i = 0; i < 4; i++) g.fillRect(-8.5 + i * 4.6, -21.4, 2.8, 3);
  g.fillStyle = lit; g.beginPath(); g.moveTo(-6, -21.4); g.lineTo(0, -32); g.lineTo(0, -21.4); g.closePath(); g.fill();
  g.fillStyle = dk; g.beginPath(); g.moveTo(6, -21.4); g.lineTo(0, -32); g.lineTo(0, -21.4); g.closePath(); g.fill();
  if (lv >= 2){ g.strokeStyle = '#e8c35a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-8.5, -18.6); g.lineTo(8.5, -18.6); g.stroke(); }
  g.strokeStyle = '#3d3226'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -32); g.lineTo(0, -39); g.stroke();
  g.fillStyle = col; g.beginPath(); g.moveTo(0, -39); g.lineTo(9, -36.4); g.lineTo(0, -33.8); g.closePath(); g.fill();
  g.fillStyle = dk; g.beginPath(); g.moveTo(0, -36.4); g.lineTo(9, -36.4); g.lineTo(0, -33.8); g.closePath(); g.fill();
  g.fillStyle = '#f4d27a'; for (i = -1; i <= 1; i += 2){ g.beginPath(); g.moveTo(i * 3.2 - 1.2, -8); g.lineTo(i * 3.2 - 1.2, -11.6); g.arc(i * 3.2, -11.6, 1.2, Math.PI, 0); g.lineTo(i * 3.2 + 1.2, -8); g.closePath(); g.fill(); }
  g.fillStyle = col; g.fillRect(-2.2, -6, 4.4, 8); g.beginPath(); g.moveTo(-2.2, 2); g.lineTo(0, 4.4); g.lineTo(2.2, 2); g.closePath(); g.fill();
  /* brama */
  var gt = g.createLinearGradient(0, 2, 0, 10); gt.addColorStop(0, '#4a3220'); gt.addColorStop(1, '#2a1a10');
  g.fillStyle = gt; g.beginPath(); g.moveTo(-4, 10); g.lineTo(-4, 6); g.arc(0, 6, 4, Math.PI, 0); g.lineTo(4, 10); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(220,200,150,.55)'; g.lineWidth = .7; g.beginPath(); for (i = -2; i <= 2; i++){ g.moveTo(i * 1.4, 3); g.lineTo(i * 1.4, 10); } g.moveTo(-4, 6.5); g.lineTo(4, 6.5); g.stroke();
  if (sel){ g.strokeStyle = '#fff'; g.lineWidth = 2.6; gHexPath(g, (R - 1) / .86); g.stroke(); }
  g.restore();
}
