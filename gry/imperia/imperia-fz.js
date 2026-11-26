/* ==========================================================
   Imperia – ulepszona grafika widoku przybliżonego (dwuklik na pole) i bitwy.
   Nie zmienia imperia-lib1.js: podmienia tylko funkcję buildBg() (tło widoku),
   a jednostki, zasięgi, animacje walki itd. rysuje dalej oryginalny kod.
   Co robi:
   - sąsiednie pola rysuje tą samą grafiką co główna mapa (gfxTerrain, budynki gfxCastle/House/Tower),
     z płynnym mieszaniem kolorów na styku pól,
   - środkowe pole: kolory podterenów są zmiękczone (rozmycie), siatka taktyczna zostaje delikatnie
     widoczna jako fazowane krawędzie (światło z lewej-góry), pod górami/murami/lasem są miękkie cienie,
     do tego światłocień i winieta całego pola oraz cień pola rzucany na otoczenie,
   - animacja wody (fale, błyski) na polach wodnych, cienie chmur i winieta – osobna lekka nakładka.
   Wszystko da się wyłączyć w panelu „✨ Efekty” (opcje: ulepszona grafika przybliżenia / animacja wody).
   ========================================================== */
(function(){
'use strict';

var origBuild = (typeof buildBg === 'function') ? buildBg : null;
function opt(){ return (window.IFX && window.IFX.opt) || {}; }
function enh(){ return opt().zoom !== false; }
function hash(n){ var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
var WATER_ART = {deep:1, shallow:1, stream:1};

function build(){
  var mi = meIdx(), V = vision(mi), seen = spec ? '1'.repeat(S.w * S.h) : S.pl[mi].seen;
  var q = FZ.q, r = FZ.r, Wd = FZ.Wd, Ht = FZ.Ht, dpr = FZ.dpr, Rb = FZ.Rb, k = FZ.k, ccx = FZ.ccx, ccy = FZ.ccy, s = FZ.s, cells = FZ.cells;
  var xy = C(q, r), x0 = xy[0], y0 = xy[1];
  var se = (typeof wxSeasonIdx === 'function') ? wxSeasonIdx(S.round) : 1;
  var bg = document.createElement('canvas'); bg.width = Wd * dpr; bg.height = Ht * dpr;
  var g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  var prev = cx; cx = g;
  FZ.bgWater = []; FZ.wcells = [];
  try {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var rad = Math.ceil(Math.max(Wd, Ht) / (W * k)) + 2, rr, qq;

    /* ---- sąsiednie pola: ta sama grafika co na głównej mapie ---- */
    for (rr = Math.max(0, r - rad); rr <= Math.min(S.h - 1, r + rad); rr++) for (qq = Math.max(0, q - rad - 1); qq <= Math.min(S.w - 1, q + rad + 1); qq++){
      if (qq == q && rr == r) continue;
      var i = rr * S.w + qq;
      var p = C(qq, rr), px = ccx + (p[0] - x0) * k, py = ccy + (p[1] - y0) * k;
      if (px < -Rb || py < -Rb || px > Wd + Rb || py > Ht + Rb) continue;
      if (seen[i] != '1'){ if (window.IFOG && !spec) window.IFOG.cell(g, px, py, Rb, qq, rr, i); continue; }
      var ty = tt(qq, rr), v = Math.floor(seeded(qq, rr) * 8) % 8, vis = !!V[i];
      g.save(); g.translate(px, py); g.scale(k, k);
      gfxTerrain(g, ty, v, se); gfxBlend(ty, qq, rr, 0, 0, se);
      g.restore();
      var ow = S.own ? +S.own[i] : 0;
      if (ow){ g.save(); g.globalAlpha = .23; g.fillStyle = N[S.pl[ow - 1].ni].c; hexPath(g, px, py, Rb); g.fill(); g.restore(); }
      if (vis){
        var c = S.cities.find(function(c){ return c.q == qq && c.r == rr; });
        g.save(); g.translate(px, py); g.scale(k, k);
        if (c) gfxCastle(g, 0, 0, N[S.pl[c.o].ni].c, c.lv || 1, false);
        else if ((S.hs || []).includes(i)) gfxHouse(g, 0, 0, ow ? N[S.pl[ow - 1].ni].c : '#9b9b9b', (S.hup || []).includes(i));
        else if ((S.tw || []).includes(i)) gfxTower(g, 0, 0, ow ? N[S.pl[ow - 1].ni].c : '#888');
        g.restore();
        var us = S.units.filter(function(u){ return u.q == qq && u.r == rr; });
        us.forEach(function(u, j){ g.save(); g.translate(px + (j - (us.length - 1) / 2) * Rb * .35, py + (c ? Rb * .45 : 0)); g.scale(k * .8, k * .8); drawAny(u, 0, 0, N[S.pl[u.o].ni].c, false, 1); g.restore(); });
      } else { g.save(); g.globalAlpha = .55; g.fillStyle = '#000'; hexPath(g, px, py, Rb); g.fill(); g.restore(); }
      if (ty < 2) FZ.bgWater.push({x: px, y: py, r: Rb, lake: ty === 1, vis: vis, h: hash(qq * 31 + rr)});
    }
    { var d = rvData(); if (d.segs.length) riverStroke(g, d.segs.filter(function(s){ return (s.ia >= 0 && seen[s.ia] == '1') || (s.ib >= 0 && seen[s.ib] == '1'); }),
        function(x, y){ return [ccx + (x - x0) * k, ccy + (y - y0) * k]; }, k, 1); }
    g.fillStyle = 'rgba(8,14,24,.34)'; g.fillRect(0, 0, Wd, Ht);

    /* ---- wybrane pole ---- */
    var owc = FZ.ow, tyc = FZ.ty, sv = q * 7 + r * 3;
    /* cień pola rzucany na otoczenie */
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = Rb * .22 * dpr; g.shadowOffsetX = Rb * .03 * dpr; g.shadowOffsetY = Rb * .07 * dpr;
    hexPath(g, ccx, ccy, Rb - 1); g.fillStyle = '#000'; g.fill(); g.restore();

    /* warstwa kolorów (do rozmycia): kolor podterenu + szum + właściciel + wysokość */
    var pad = Math.ceil(s * 1.2) + 4, bx = ccx - Rb - pad, by = ccy - Rb - pad, bw = 2 * Rb + 2 * pad;
    var lc = document.createElement('canvas'); lc.width = lc.height = Math.ceil(bw * dpr);
    var lg = lc.getContext('2d'); lg.setTransform(dpr, 0, 0, dpr, -bx * dpr, -by * dpr);
    lg.fillStyle = SUBT[tyc].list[0].col; lg.fillRect(bx, by, bw, bw);
    cells.forEach(function(c){
      var x = ccx + c.ux * s, y = ccy + c.uy * s, t = c.sub;
      hexPath(lg, x, y, s + .5); lg.fillStyle = t.col; lg.fill();
      lg.globalAlpha = .07 + c.n * .16; lg.fillStyle = c.n > .5 ? '#fff' : '#000'; hexPath(lg, x, y, s + .5); lg.fill();
      if (owc){ lg.globalAlpha = .10; lg.fillStyle = N[S.pl[owc - 1].ni].c; hexPath(lg, x, y, s + .5); lg.fill(); }
      if (t.hgt > 0){ lg.globalAlpha = .10 * t.hgt; lg.fillStyle = '#fff'; hexPath(lg, x, y, s + .5); lg.fill(); }
      if (!c.play){ lg.globalAlpha = .22; lg.fillStyle = '#000'; hexPath(lg, x, y, s + .5); lg.fill(); }
      lg.globalAlpha = 1;
      if (WATER_ART[t.art]) FZ.wcells.push(c.i);
    });
    g.save(); hexPath(g, ccx, ccy, Rb - 1); g.clip();
    try { g.filter = 'blur(' + (s * .3 * dpr).toFixed(2) + 'px)'; } catch (e) {}
    g.drawImage(lc, bx, by, bw, bw);
    try { g.filter = 'none'; } catch (e) {}
    /* miękkie cienie (światło z lewej-góry -> cień w prawo-dół) */
    cells.forEach(function(c){
      var t = c.sub, hgt = t.hgt || 0, tree = (t.art == 'forest' || t.art == 'undergrowth' || t.art == 'sparse');
      if (hgt <= 0 && !tree) return;
      var x = ccx + c.ux * s, y = ccy + c.uy * s, a = hgt > 0 ? .10 + .09 * Math.min(2, hgt) : .09;
      g.fillStyle = 'rgba(0,0,0,' + a + ')'; g.beginPath(); g.ellipse(x + s * .45, y + s * .55, s * .85, s * .5, 0, 0, 7); g.fill();
    });
    /* fazowane krawędzie podpól (zamiast ostrej siatki) + grafika podterenów */
    g.lineCap = 'round'; g.lineWidth = Math.max(.8, s * .07);
    cells.forEach(function(c){
      var x = ccx + c.ux * s, y = ccy + c.uy * s, t = c.sub, kk, a1, a2, rr2 = s - .9;
      g.beginPath();
      for (kk = 3; kk < 6; kk++){ a1 = Math.PI / 180 * (60 * kk - 30); a2 = a1 + Math.PI / 3; g.moveTo(x + rr2 * Math.cos(a1), y + rr2 * Math.sin(a1)); g.lineTo(x + rr2 * Math.cos(a2), y + rr2 * Math.sin(a2)); }
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.stroke();
      g.beginPath();
      for (kk = 0; kk < 3; kk++){ a1 = Math.PI / 180 * (60 * kk - 30); a2 = a1 + Math.PI / 3; g.moveTo(x + rr2 * Math.cos(a1), y + rr2 * Math.sin(a1)); g.lineTo(x + rr2 * Math.cos(a2), y + rr2 * Math.sin(a2)); }
      g.strokeStyle = 'rgba(0,0,0,.20)'; g.stroke();
      if (c.n > .12 || t.mv >= 99 || t.art == 'stream' || t.st) subArt(g, t.art, x, y, s, c.n, sv + c.a * 1.3 + c.b * 2.1);
    });
    g.lineCap = 'butt';
    /* światłocień całego pola + winieta */
    g.fillStyle = (function(){ var gr = g.createLinearGradient(ccx - Rb * .6, ccy - Rb, ccx + Rb * .6, ccy + Rb); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.16)'); return gr; })();
    g.fillRect(ccx - Rb, ccy - Rb, 2 * Rb, 2 * Rb);
    g.fillStyle = (function(){ var gr = g.createRadialGradient(ccx, ccy, Rb * .55, ccx, ccy, Rb); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.24)'); return gr; })();
    g.fillRect(ccx - Rb, ccy - Rb, 2 * Rb, 2 * Rb);
    g.restore();
    g.strokeStyle = '#f0d9ad'; g.lineWidth = 4; hexPath(g, ccx, ccy, Rb - 1); g.stroke();
    { var fi = r * S.w + q, d2 = rvData(); if (d2.segs.length) riverStroke(g, d2.segs.filter(function(s){ return s.ia == fi || s.ib == fi; }),
        function(x, y){ return [ccx + (x - x0) * k, ccy + (y - y0) * k]; }, k, .96); }
  } finally { cx = prev; }
  FZ.bg = bg;
}

window.buildBg = function(){
  if (!enh() || typeof gfxTerrain !== 'function' || !FZ) return origBuild && origBuild();
  try { build(); }
  catch (e) { if (window.console) console.warn('Imperia FZ: wróciłem do starej grafiki:', e); return origBuild && origBuild(); }
};

/* ---------- animacja wody, cienie chmur, winieta (lekka nakładka 2D) ---------- */
var oc = null, og = null;
function ensureOv(){
  if (oc) return;
  var fzc = document.getElementById('fzc'); if (!fzc) return;
  var st = document.createElement('style');
  st.textContent = '#ifxz{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none}';
  document.head.appendChild(st);
  oc = document.createElement('canvas'); oc.id = 'ifxz'; oc.setAttribute('aria-hidden', 'true');
  fzc.insertAdjacentElement('afterend', oc); og = oc.getContext('2d');
}
function waves(g, x, y, rad, seed, t, al){
  var j, w = rad * .55;
  g.lineCap = 'round'; g.lineWidth = Math.max(.8, rad * .07);
  for (j = 0; j < 3; j++){
    var yy = y + (j - 1) * rad * .5, ph = t * (.55 + j * .12) + seed * 6.28 + j * 2.1, off = Math.sin(ph) * rad * .25;
    g.strokeStyle = 'rgba(235,250,255,' + (al * (.5 + .5 * Math.sin(ph * 1.3 + j))).toFixed(3) + ')';
    g.beginPath(); g.moveTo(x - w + off, yy); g.quadraticCurveTo(x - w / 2 + off, yy - rad * .18, x + off, yy);
    g.quadraticCurveTo(x + w / 2 + off, yy + rad * .18, x + w + off, yy); g.stroke();
  }
  for (j = 0; j < 2; j++){
    var tw = Math.sin(t * 3 + seed * 20 + j * 5);
    if (tw > .8){
      var sx = x + (hash(seed * 7 + j) - .5) * rad * 1.1, sy = y + (hash(seed * 11 + j) - .5) * rad * 1.1, a = (tw - .8) * 5 * al * 2.2, l = rad * .1;
      g.strokeStyle = 'rgba(255,255,255,' + Math.min(.9, a).toFixed(3) + ')'; g.lineWidth = Math.max(.7, rad * .03);
      g.beginPath(); g.moveTo(sx - l, sy); g.lineTo(sx + l, sy); g.moveTo(sx, sy - l); g.lineTo(sx, sy + l); g.stroke();
    }
  }
}
function frame(ts){
  requestAnimationFrame(frame);
  var o = opt();
  var on = typeof FZ !== 'undefined' && FZ && FZ.bg && FZ.Wd && o.zoom !== false && !document.hidden;
  if (!on){ if (oc && oc.style.display !== 'none') oc.style.display = 'none'; return; }
  ensureOv(); if (!oc) return;
  var hi = !window.IFX || window.IFX.q === 'high', dpr = Math.min(FZ.dpr || 1, 1.5), w = FZ.Wd, h = FZ.Ht;
  var cw = Math.round(w * dpr), ch = Math.round(h * dpr);
  if (oc.width !== cw || oc.height !== ch){ oc.width = cw; oc.height = ch; }
  oc.style.display = 'block';
  var g = og, t = ts / 1000, s = FZ.s, ccx = FZ.ccx, ccy = FZ.ccy, i;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  if (o.anim !== false){
    var occ = {}, Bt = FZ.battle;
    if (Bt && Bt.units) Bt.units.forEach(function(u){ occ[u.cell] = 1; });
    else Object.keys(FZ.prev || {}).forEach(function(k){ occ[k] = 1; });
    var wc = FZ.wcells || [], cells = FZ.cells;
    for (i = 0; i < wc.length; i++){
      var c = cells[wc[i]]; if (!c || occ[c.i]) continue;
      var x = ccx + c.ux * s, y = ccy + c.uy * s;
      if (x < -s || y < -s || x > w + s || y > h + s) continue;
      waves(g, x, y, s * .8, hash(c.i * 3.7), t, .3);
    }
    var bw = FZ.bgWater || [];
    for (i = 0; i < bw.length; i++){
      var b = bw[i], al = b.vis ? .24 : .1;
      waves(g, b.x, b.y - b.r * .35, b.r * .62, b.h, t, al);
      waves(g, b.x, b.y + b.r * .4, b.r * .62, b.h + .37, t * 1.1, al);
    }
  }
  if (hi){
    for (i = 0; i < 3; i++){
      var cxp = ((t * 14 * (1 + i * .3) + i * w * .5) % (w + 700)) - 350, cyp = h * (.25 + .3 * i) + Math.sin(t * .1 + i) * 40;
      var gr = g.createRadialGradient(cxp, cyp, 0, cxp, cyp, 280);
      gr.addColorStop(0, 'rgba(5,10,20,.10)'); gr.addColorStop(1, 'rgba(5,10,20,0)');
      g.fillStyle = gr; g.fillRect(cxp - 280, cyp - 280, 560, 560);
    }
  }
  var vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .45, w / 2, h / 2, Math.hypot(w, h) * .6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
}
requestAnimationFrame(frame);
})();
