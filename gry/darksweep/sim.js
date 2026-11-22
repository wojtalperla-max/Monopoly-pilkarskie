/* DARK SWEEP – silnik gry (mapa, widoczność, strzelanie, boty).
   Działa w przeglądarce i w Node (do testów). Autorytatywna symulacja chodzi u hosta. */
(function (root) {
  'use strict';

  const TILE = 32, MW = 48, MH = 30;
  const C = {
    TILE, MW, MH,
    R: 12, SPEED: 185, MAG: 24, RELOAD: 1.4, FIRE_CD: 1 / 7, DMG: 26,
    BSPEED: 820, BLIFE: 0.75, MAXHP: 100, RESPAWN: 3, PROT: 1.0,
    WIN: 25, OVER: 8, NEAR_R: 0, CONE_R: 460, CONE_HALF: 0.62, MAX_HUMANS: 8,
    SPOT_R: 30,        // ukryty w ścianie gracz jest widoczny dla wroga tylko, gdy ten niemal go dotyka
    HIDE_SPEED: 0.4,   // mnożnik prędkości podczas ukrywania
  };

  // ---------- mapa (lewa połowa + lustrzane odbicie = uczciwa dla obu drużyn) ----------
  const grid = new Uint8Array(MW * MH).fill(1);
  const setT = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < MH) grid[y * MW + x] = v; };
  function rect(x, y, w, h, v) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { setT(x + i, y + j, v); setT(MW - 1 - (x + i), y + j, v); }
  }
  const carve = (x, y, w, h) => rect(x, y, w, h, 0);
  const block = (x, y, w, h) => rect(x, y, w, h, 1);

  carve(2, 11, 5, 8);    // pokój startowy
  carve(7, 14, 5, 2);    // drzwi do hali
  carve(11, 8, 6, 14);   // hala
  carve(4, 4, 2, 7);     // korytarz w górę
  carve(4, 19, 2, 7);    // korytarz w dół
  carve(3, 3, 21, 2);    // górny pas
  carve(3, 25, 21, 2);   // dolny pas
  carve(13, 5, 2, 3);    // hala -> górny pas
  carve(13, 22, 2, 3);   // hala -> dolny pas
  carve(17, 12, 3, 2);   // hala -> centrum
  carve(17, 17, 3, 2);
  carve(19, 10, 5, 10);  // centrum
  carve(21, 5, 2, 5);    // centrum -> górny pas
  carve(21, 20, 2, 5);   // centrum -> dolny pas
  // osłony
  block(13, 14, 2, 2); block(21, 14, 2, 2); block(20, 11, 1, 1); block(20, 18, 1, 1);
  block(10, 3, 1, 1); block(10, 26, 1, 1); block(17, 3, 1, 1); block(17, 26, 1, 1);
  block(12, 10, 1, 1); block(15, 19, 1, 1);

  const spawns = [[], []], floor = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (!grid[y * MW + x]) {
      floor.push([x, y]);
      if (y >= 11 && y <= 18 && x >= 2 && x <= 6) spawns[0].push([x, y]);
      if (y >= 11 && y <= 18 && x >= MW - 7 && x <= MW - 3) spawns[1].push([x, y]);
    }
  }

  const isSolid = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || grid[ty * MW + tx] === 1;

  // Raycast po siatce (DDA). (dx,dy) – wektor jednostkowy. Zwraca odległość do ściany lub maxD.
  function raycast(x, y, dx, dy, maxD) {
    let tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
    const tdy = dy !== 0 ? Math.abs(TILE / dy) : Infinity;
    let tmx = dx > 0 ? ((tx + 1) * TILE - x) / dx : dx < 0 ? (tx * TILE - x) / dx : Infinity;
    let tmy = dy > 0 ? ((ty + 1) * TILE - y) / dy : dy < 0 ? (ty * TILE - y) / dy : Infinity;
    for (let i = 0; i < 400; i++) {
      let t;
      if (tmx < tmy) { t = tmx; tmx += tdx; tx += sx; } else { t = tmy; tmy += tdy; ty += sy; }
      if (t >= maxD) return maxD;
      if (isSolid(tx, ty)) return t;
    }
    return maxD;
  }
  function los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    if (d < 1) return true;
    return raycast(x0, y0, dx / d, dy / d, d) >= d - 0.5;
  }
  function collides(x, y, r) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(tx, ty)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }
  function moveCircle(p, dx, dy, r) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
    const sx = dx / n, sy = dy / n;
    for (let i = 0; i < n; i++) {
      if (!collides(p.x + sx, p.y, r)) p.x += sx;
      if (!collides(p.x, p.y + sy, r)) p.y += sy;
    }
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // Czy punkt (x,y) jest widoczny dla obserwatora v {x,y,ang}: stożek latarki + mały krąg wokół.
  function sees(v, x, y) {
    const dx = x - v.x, dy = y - v.y, d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const lim = Math.abs(angDiff(Math.atan2(dy, dx), v.ang)) <= C.CONE_HALF ? C.CONE_R : C.NEAR_R;
    return d <= lim && los(v.x, v.y, x, y);
  }

  // BFS po kafelkach (dla botów)
  function bfs(sx, sy, gx, gy) {
    const start = sy * MW + sx, goal = gy * MW + gx;
    if (start === goal) return [];
    const prev = new Int32Array(MW * MH).fill(-1); prev[start] = start;
    const q = [start]; let h = 0;
    while (h < q.length) {
      const c = q[h++]; if (c === goal) break;
      const cx = c % MW, cy = (c / MW) | 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ox, ny = cy + oy;
        if (isSolid(nx, ny)) continue;
        const n = ny * MW + nx; if (prev[n] !== -1) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (prev[goal] === -1) return [];
    const path = []; let c = goal;
    while (c !== start) { path.push([(c % MW) * TILE + TILE / 2, ((c / MW) | 0) * TILE + TILE / 2]); c = prev[c]; }
    return path.reverse();
  }

  const BOT_NAMES = ['Viper', 'Ghost', 'Rook', 'Nova', 'Echo', 'Blade', 'Hawk', 'Onyx', 'Raven', 'Zero', 'Fang', 'Dusk'];
  const r1 = v => Math.round(v * 10) / 10;
  const randomWeapon = () => (Math.random() * 4) | 0;
  const WEAPONS = [
    { name: 'Pistolet', damage: 26, cd: 1/7, speed: 820, mag: 24, reload: 1.4, tier: 1 },
    { name: 'Karabin', damage: 34, cd: 1/8, speed: 900, mag: 30, reload: 1.5, tier: 2 },
    { name: 'SMG', damage: 20, cd: 1/12, speed: 780, mag: 36, reload: 1.3, tier: 2 },
    { name: 'Strzelba', damage: 15, cd: 1/4, speed: 760, mag: 8, reload: 1.8, tier: 3 },
  ];

  class HostSim {
    constructor(opts = {}) {
      this.players = new Map(); this.bullets = []; this.events = [];
      this.score = [0, 0]; this.phase = 'play'; this.phaseT = 0; this.winner = -1;
      this.nextId = 1; this.snapN = 0; this.botsPerTeam = opts.botsPerTeam ?? 3;
      this.difficulty = opts.difficulty || 'normal'; this.items = []; this.itemTimer = 8;
      this.seedItems();
      this.rosterDirty = true; this.botCounter = 0;
    }
    seedItems() {
      const spots = floor.filter(([x,y]) => x > 7 && x < MW-8 && y > 3 && y < MH-4);
      for (let i=0;i<12;i++) {
        const [tx,ty] = spots[(Math.random()*spots.length)|0];
        const roll = Math.random();
        const type = roll < 0.45 ? 'knife' : 'medkit';
        const weapon = 0;
        this.items.push({ type, x:tx*TILE+16, y:ty*TILE+16, weapon });
      }
    }
    spawnRandomItem() {
      const spots = floor.filter(([x,y]) => x > 7 && x < MW-8 && y > 3 && y < MH-4);
      if (!spots.length || this.items.length >= 28) return;
      const [tx,ty] = spots[(Math.random()*spots.length)|0];
      const roll = Math.random();
      const type = roll < 0.5 ? 'medkit' : 'knife';
      const weapon = 0;
      this.items.push({ type, x:tx*TILE+16, y:ty*TILE+16, weapon });
    }
    humans() { return [...this.players.values()].filter(p => !p.isBot); }
    // Drużyna 0 (zielona) = wszyscy ludzie (+ ewentualne zielone boty). Drużyna 1 (czerwona) = zawsze boty.
    addPlayer(name, isBot, team) {
      const id = this.nextId++;
      if (team === undefined) team = isBot ? 1 : 0;
      // czerwone boty nie mają nicków
      const nm = (isBot && team === 1) ? '' : String(name || 'Gracz').slice(0, 12);
      const p = {
        id, name: nm, isBot: !!isBot, team,
        x: 0, y: 0, ang: team === 0 ? 0 : Math.PI, hp: C.MAXHP, alive: false, resp: 0, prot: 0,
        hidden: false, reveal: 0,
        ammo: WEAPONS[0].mag, reload: 0, cd: 0, weapon: 0, knife: false, kills: 0, deaths: 0,
        input: { mx: 0, my: 0, ang: team === 0 ? 0 : Math.PI, fire: false, reload: false, hide: false },
        bot: isBot ? { think: 0, target: 0, last: null, lastT: 0, path: [], repath: 0, strafe: 1, strafeT: 0, react: 0, stuckT: 0, lx: 0, ly: 0 } : null,
      };
      this.players.set(id, p); this.spawn(p); this.rosterDirty = true;
      if (!isBot) this.rebalanceBots();
      return p;
    }
    removePlayer(id) {
      const p = this.players.get(id); if (!p) return;
      this.players.delete(id); this.rosterDirty = true;
      if (!p.isBot) this.rebalanceBots();
    }
    setBotsPerTeam(n) { this.botsPerTeam = n; this.rebalanceBots(); }
    rebalanceBots() {
      const humans = this.humans();
      const counts = [humans.filter(p => p.team === 0).length, humans.filter(p => p.team === 1).length];
      const total = Math.max(this.botsPerTeam, counts[0], counts[1]);
      for (const t of [0, 1]) {
        const want = Math.max(0, total - counts[t]);
        const bots = [...this.players.values()].filter(p => p.isBot && p.team === t);
        while (bots.length < want) bots.push(this.addPlayer('BOT ' + BOT_NAMES[this.botCounter++ % BOT_NAMES.length], true, t));
        while (bots.length > want) {
          bots.sort((a, b) => (a.alive - b.alive));
          const bot = bots.shift(); this.players.delete(bot.id); this.rosterDirty = true;
        }
      }
    }
    setInput(id, i) {
      const p = this.players.get(id); if (!p) return;
      const f = v => (Number.isFinite(v) ? v : 0);
      p.input.mx = Math.max(-1, Math.min(1, f(i.mx))); p.input.my = Math.max(-1, Math.min(1, f(i.my)));
      p.input.ang = f(i.ang); p.input.fire = !!i.fire; p.input.hide = !!i.hide; if (i.knife) p.input.knife = true; if (i.reload) p.input.reload = true; p.input.swap = !!i.swap; // Broń zmieniasz klawiszem F przy upuszczonej broni.
    }
    spawn(p) {
      const list = spawns[p.team];
      let best = null, bd = -1;
      for (let k = 0; k < 8; k++) {
        const [tx, ty] = list[(Math.random() * list.length) | 0];
        const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
        let md = 1e9; for (const q of this.players.values()) if (q !== p && q.alive) md = Math.min(md, Math.hypot(q.x - x, q.y - y));
        if (md > bd) { bd = md; best = [x, y]; }
      }
      p.x = best[0]; p.y = best[1]; p.hp = C.MAXHP; p.alive = true; p.weapon = randomWeapon(); p.ammo = WEAPONS[p.weapon].mag; p.knife = false; p.reload = 0; p.cd = 0.3; p.prot = C.PROT; p.hidden = false; p.reveal = 0;
      p.ang = p.input.ang = p.team === 0 ? 0 : Math.PI;
    }
    resetMatch() {
      this.score = [0, 0]; this.winner = -1; this.phase = 'play'; this.bullets.length = 0;
      for (const p of this.players.values()) { p.kills = p.deaths = 0; this.spawn(p); }
    }
    damage(q, dmg, ownerId, x, y, ang) {
      if (!q.alive || q.prot > 0) return;
      q.hp -= dmg; q.reveal = 1.0; q.hidden = false; this.events.push(['h', r1(x), r1(y), r1(ang * 100) / 100]);
      if (q.hp > 0) return;
      q.alive = false; q.resp = C.RESPAWN;
      // Każdy zabity przeciwnik upuszcza aktualnie trzymaną broń, także pistolet.
      this.items.push({ type: 'weapon', x: q.x, y: q.y, weapon: q.weapon });
      q.deaths++; q.input.fire = false;
      const o = this.players.get(ownerId);
      if (o) { o.kills++; this.score[o.team]++; }
      this.events.push(['k', ownerId, q.id, r1(q.x), r1(q.y), r1(q.ang * 100) / 100]);
      if (o && this.phase === 'play' && this.score[o.team] >= C.WIN) { this.phase = 'over'; this.phaseT = C.OVER; this.winner = o.team; }
    }
    step(dt) {
      if (this.phase === 'over') {
        this.phaseT -= dt; this.bullets.length = 0;
        if (this.phaseT <= 0) this.resetMatch();
        return;
      }
      this.itemTimer -= dt;
      if (this.itemTimer <= 0) { this.spawnRandomItem(); this.itemTimer = 7 + Math.random() * 6; }
      for (const p of this.players.values()) {
        if (!p.alive) { p.resp -= dt; if (p.resp <= 0) this.spawn(p); continue; }
        if (p.prot > 0) p.prot -= dt;
        if (p.bot) this.botThink(p, dt);
        const inp = p.input; let mx = inp.mx, my = inp.my; const l = Math.hypot(mx, my);
        if (l > 1) { mx /= l; my /= l; }
        // ukrywanie: tylko przy ścianie, nie od razu po strzale/trafieniu
        p.reveal = Math.max(0, p.reveal - dt);
        p.hidden = !!inp.hide && p.reveal <= 0 && collides(p.x, p.y, C.R + 5);
        const spd = C.SPEED * (p.hidden ? C.HIDE_SPEED : 1);
        // Automatyczne podnoszenie przedmiotów.
        for (let ii = this.items.length - 1; ii >= 0; ii--) {
          const it = this.items[ii];
          if (Math.hypot(p.x - it.x, p.y - it.y) > 25) continue;
          if (it.type === 'medkit' && p.hp < C.MAXHP) p.hp = Math.min(C.MAXHP, p.hp + 45);
          else if (it.type === 'knife') p.knife = true;
          else if (it.type === 'weapon') {
            // Wymiana działa w obie strony: niezależnie od tego, czy broń z ziemi jest lepsza czy gorsza.
            // Dotychczasowa broń gracza zostaje w miejscu podniesionej, więc można ją później odzyskać.
            if (!inp.swap || p.isBot) continue;
            const oldWeapon = p.weapon;
            p.weapon = it.weapon;
            p.ammo = WEAPONS[p.weapon].mag;
            p.reload = 0;
            it.weapon = oldWeapon;
            this.events.push(['p', p.id, 'weapon', r1(it.x), r1(it.y), p.weapon]);
            inp.swap = false;
            continue;
          }
          else continue;
          this.events.push(['p', p.id, it.type, r1(it.x), r1(it.y), it.weapon || 0]); this.items.splice(ii, 1);
        }
        if (inp.knife) {
          inp.knife = false;
          if (p.knife) {
            let target = null, bestD = 34;
            for (const q of this.players.values()) {
              if (!q.alive || q.team === p.team) continue;
              const d = Math.hypot(q.x-p.x,q.y-p.y);
              const toward = Math.atan2(p.y-q.y,p.x-q.x);
              if (d < bestD && Math.abs(angDiff(toward,q.ang)) > 2.15 && los(p.x,p.y,q.x,q.y)) { target=q; bestD=d; }
            }
            if (target) { p.knife = false; this.damage(target, 999, p.id, target.x, target.y, p.ang); }
          }
        }
        moveCircle(p, mx * spd * dt, my * spd * dt, C.R);
        p.ang = inp.ang;
        p.cd -= dt;
        
        if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; p.ammo = WEAPONS[p.weapon].mag; } }
        if (inp.reload) { inp.reload = false; if (p.ammo < WEAPONS[p.weapon].mag && p.reload <= 0) p.reload = WEAPONS[p.weapon].reload; }
        if (inp.fire && p.cd <= 0 && p.reload <= 0) {
          if (p.ammo <= 0) p.reload = WEAPONS[p.weapon].reload;
          else {
            p.ammo--; p.cd = WEAPONS[p.weapon].cd; p.prot = 0; p.reveal = 0.7; p.hidden = false;
            const spread = (Math.random() - 0.5) * 2 * (p.isBot ? 0.09 : 0.04), a = p.ang + spread;
            const bx = p.x + Math.cos(p.ang) * 24, by = p.y + Math.sin(p.ang) * 24;
            this.bullets.push({ x: bx, y: by, vx: Math.cos(a) * WEAPONS[p.weapon].speed, vy: Math.sin(a) * WEAPONS[p.weapon].speed, team: p.team, owner: p.id, damage: WEAPONS[p.weapon].damage, life: C.BLIFE });
            this.events.push(['s', r1(bx), r1(by), r1(p.ang * 100) / 100, p.team]);
          }
        }
      }
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i]; let dead = false;
        for (let s = 0; s < 3 && !dead; s++) {
          b.x += b.vx * dt / 3; b.y += b.vy * dt / 3;
          if (isSolid(Math.floor(b.x / TILE), Math.floor(b.y / TILE))) { this.events.push(['w', r1(b.x), r1(b.y)]); dead = true; break; }
          for (const q of this.players.values()) {
            if (!q.alive || q.team === b.team) continue;
            if (Math.hypot(q.x - b.x, q.y - b.y) < C.R + 2) { this.damage(q, b.damage || C.DMG, b.owner, b.x, b.y, Math.atan2(b.vy, b.vx)); dead = true; break; }
          }
        }
        b.life -= dt;
        if (dead || b.life <= 0) this.bullets.splice(i, 1);
      }
    }

    // ---------- boty ----------
    botThink(p, dt) {
      const b = p.bot, inp = p.input;
      b.think -= dt; b.strafeT -= dt; b.lastT -= dt;
      if (b.think <= 0) {
        b.think = this.difficulty === 'easy' ? 0.22 + Math.random()*.2 : this.difficulty === 'hard' ? 0.06 + Math.random()*.06 : 0.12 + Math.random()*.12;
        let best = null, bd = 1e9;
        for (const q of this.players.values()) {
          if (!q.alive || q.team === p.team) continue;
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (q.hidden && d > C.SPOT_R) continue;   // ukrytego gracza boty zauważą dopiero z bliska
          if (d < 520 && d < bd && los(p.x, p.y, q.x, q.y)) { bd = d; best = q; }
        }
        if (best) { if (b.target !== best.id) b.react = 0; b.target = best.id; b.last = { x: best.x, y: best.y }; b.lastT = 4; }
        else b.target = 0;
      }
      if (b.strafeT <= 0) { b.strafeT = 0.6 + Math.random() * 1.2; b.strafe = Math.random() < 0.5 ? -1 : 1; }
      const t = b.target ? this.players.get(b.target) : null;
      let want = null; inp.fire = false; inp.mx = inp.my = 0;
      if (t && t.alive) {
        const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        want = Math.atan2(dy, dx); b.react += dt;
        let mx = -uy * b.strafe * 0.8, my = ux * b.strafe * 0.8;
        if (d > 280) { mx += ux * 0.7; my += uy * 0.7; } else if (d < 150) { mx -= ux * 0.7; my -= uy * 0.7; }
        inp.mx = mx; inp.my = my;
        if (b.react > (this.difficulty === 'easy' ? .55 : this.difficulty === 'hard' ? .16 : .3) && Math.abs(angDiff(want, p.ang)) < 0.14 && d < C.CONE_R - 40) inp.fire = true;
      } else {
        b.react = 0;
        b.repath -= dt;
        if (!b.path.length || b.repath <= 0) {
          let gx, gy;
          if (b.lastT > 0 && b.last) { gx = Math.floor(b.last.x / TILE); gy = Math.floor(b.last.y / TILE); b.lastT = 0; b.last = null; }
          else if (Math.random() < 0.5) { const s = spawns[1 - p.team][(Math.random() * spawns[1 - p.team].length) | 0]; gx = s[0]; gy = s[1]; }
          else { const f = floor[(Math.random() * floor.length) | 0]; gx = f[0]; gy = f[1]; }
          b.path = bfs(Math.floor(p.x / TILE), Math.floor(p.y / TILE), gx, gy); b.repath = 3 + Math.random() * 3;
        }
        if (b.path.length) {
          const [wx, wy] = b.path[0], dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy);
          if (d < 9) b.path.shift(); else { inp.mx = dx / d; inp.my = dy / d; want = Math.atan2(dy, dx); }
        }
        if (p.ammo < WEAPONS[p.weapon].mag / 2 && p.reload <= 0) inp.reload = true;
      }
      if (want !== null) {
        const diff = angDiff(want, p.ang), step = 6.5 * dt;
        inp.ang = p.ang + Math.max(-step, Math.min(step, diff));
      } else inp.ang = p.ang;
      // wykrywanie utknięcia
      b.stuckT += dt;
      if (b.stuckT > 0.6) { if (Math.hypot(p.x - b.lx, p.y - b.ly) < 5 && (inp.mx || inp.my)) { b.path = []; b.repath = 0; } b.lx = p.x; b.ly = p.y; b.stuckT = 0; }
    }

    // ---------- sieć ----------
    roster() { return [...this.players.values()].map(p => [p.id, p.name, p.team, p.isBot ? 1 : 0]); }
    snapshot() {
      const players = [];
      for (const p of this.players.values()) players.push([p.id, r1(p.x), r1(p.y), Math.round(p.ang * 100) / 100, Math.max(0, Math.round(p.hp)), p.alive ? 1 : 0, p.ammo, p.reload > 0 ? 1 : 0, p.kills, p.deaths, r1(Math.max(0, p.resp)), p.hidden ? 1 : 0, p.weapon, p.knife ? 1 : 0]);
      const b = this.bullets.map(q => [r1(q.x), r1(q.y), Math.round(q.vx), Math.round(q.vy), q.team]);
      const e = this.events; this.events = [];
      return { t: 's', n: ++this.snapN, p: players, b, it: this.items.map(q => [q.type, r1(q.x), r1(q.y), q.weapon || 0]), sc: this.score.slice(), ph: this.phase, pt: r1(this.phaseT), w: this.winner, e };
    }
  }

  const Sim = { C, WEAPONS, grid, spawns, floor, isSolid, raycast, los, collides, moveCircle, sees, angDiff, bfs, HostSim };
  root.Sim = Sim;
  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
