/* DARK SWEEP – silnik gry (mapa, widoczność, strzelanie, boty).
   Działa w przeglądarce i w Node (do testów). Autorytatywna symulacja chodzi u hosta. */
(function (root) {
  'use strict';

  let TILE = 32; let MW = 48, MH = 30;
  const C = {
    TILE, MW, MH,
    R: 12, SPEED: 185, MAG: 24, RELOAD: 1.4, FIRE_CD: 1 / 7, DMG: 26,
    BSPEED: 820, BLIFE: 2.0, MAXHP: 100, RESPAWN: 3, PROT: 1.0,
    WIN: 25, OVER: 8, NEAR_R: 0, CONE_R: 460, CONE_HALF: 0.62, MAX_HUMANS: 8,
    SPOT_R: 30,        // ukryty w ścianie gracz jest widoczny dla wroga tylko, gdy ten niemal go dotyka
    HIDE_SPEED: 0.4,   // mnożnik prędkości podczas ukrywania
  };

  // ---------- mapa (lewa połowa + lustrzane odbicie = uczciwa dla obu drużyn) ----------
  let grid = new Uint8Array(MW * MH).fill(1);
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

  const original = grid.slice();
  const spawns = [[], [], []], floor = [];
  // Separate hand-built arenas. All use the same 32px tiles and 12px player radius.
  const ARENAS = {
    1: {name:'Bunkier', w:24, h:16, spawn:[2,6,4,4],
      rooms:[[2,6,4,4],[5,7,3,2],[7,4,4,8],[9,6,3,4],[3,2,9,2],[3,12,9,2],[3,4,2,2],[3,10,2,2],[9,4,2,2],[9,10,2,2]],
      covers:[[8,7,1,2],[10,3,1,1],[10,12,1,1]]},
    2: {name:'Magazyn', w:32, h:22, spawn:[2,8,5,6],
      rooms:[[2,8,5,6],[6,10,3,2],[8,6,5,10],[12,9,4,4],[3,3,13,2],[3,17,13,2],[3,5,2,3],[3,14,2,3],[9,5,2,1],[9,16,2,1],[14,5,2,4],[14,13,2,4]],
      covers:[[10,9,1,3],[12,11,1,1],[7,3,1,1],[7,18,1,1],[14,7,1,1],[14,15,1,1]]},
    3: {name:'Kompleks', w:40, h:26, spawn:[2,10,5,6],
      rooms:[[2,10,5,6],[6,12,4,2],[9,7,6,12],[14,9,6,3],[14,15,6,3],[17,9,3,9],[3,3,17,2],[3,21,17,2],[3,5,2,5],[3,16,2,5],[10,5,2,2],[10,19,2,2],[17,5,2,4],[17,18,2,3]],
      covers:[[11,10,2,2],[11,15,2,2],[18,12,1,3],[7,3,1,1],[7,22,1,1],[15,4,1,1],[15,21,1,1]]},
    4: {name:'Oryginalna arena', w:48, h:30, spawn:[2,11,5,8]}
  };
  function configureMap(size) {
    const a = ARENAS[size] || ARENAS[4];
    TILE=32; C.TILE=TILE; C.R=12;
    MW=a.w; MH=a.h; C.MW=MW; C.MH=MH;
    grid=new Uint8Array(MW*MH).fill(1);
    if(a.rooms){for(const r of a.rooms) carve(...r); for(const r of a.covers) block(...r);}
    else grid.set(original);
    floor.length=0; spawns.forEach(a=>a.length=0);
    const [sx,sy,sw,sh]=a.spawn;
    for(let y=0;y<MH;y++) for(let x=0;x<MW;x++) {
      if(grid[y*MW+x]) continue;
      floor.push([x,y]);
      if(x>=MW/2-2 && x<MW/2+2 && y>=2 && y<6) spawns[2].push([x,y]);
      if(y>=sy&&y<sy+sh){
        if(x>=sx&&x<sx+sw) spawns[0].push([x,y]);
        if(MW-1-x>=sx&&MW-1-x<sx+sw) spawns[1].push([x,y]);
      }
    }
  }
  configureMap(4);

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
  const randomWeapon = () => 1 + ((Math.random() * (WEAPONS.length-1)) | 0);
  const WEAPONS = [
    { name: 'Pistolet', damage: 26, cd: 1/7, speed: 820, mag: 24, reload: 1.4, tier: 1 },
    { name: 'Karabin', damage: 34, cd: 1/8, speed: 900, mag: 30, reload: 1.5, tier: 2 },
    { name: 'SMG', damage: 20, cd: 1/12, speed: 780, mag: 36, reload: 1.3, tier: 2 },
    { name: 'Strzelba', damage: 15, cd: 1/4, speed: 760, mag: 8, reload: 1.8, tier: 3, pellets: 5 },
    { name: 'Rewolwer', damage: 55, cd: .48, speed: 950, mag: 6, reload: 1.8, tier: 2 },
    { name: 'Karabin precyzyjny', damage: 85, cd: .85, speed: 1200, mag: 5, reload: 2.2, tier: 4 },
    { name: 'Karabin ciężki', damage: 23, cd: .085, speed: 880, mag: 60, reload: 3, tier: 4 },
    { name: 'Karabinek', damage: 30, cd: .19, speed: 1000, mag: 20, reload: 1.6, tier: 3 },
  ];
  [0,1200,900,1100,700,2200,1900,1400].forEach((v,i)=>WEAPONS[i].price=v);
  // Shared projectile movement, including reflections, for host and local visual prediction.
  function advanceBullet(b,dt,ricochet,visit=()=>false,wall=()=>{}) {
    let remaining=Math.hypot(b.vx,b.vy)*dt;
    while(remaining>1e-6) {
      const speed=Math.hypot(b.vx,b.vy), ux=b.vx/speed, uy=b.vy/speed;
      const step=Math.min(remaining,4), d=raycast(b.x,b.y,ux,uy,step+0.001);
      if(d<=step) {
        const hx=b.x+ux*d, hy=b.y+uy*d;
        wall(hx,hy);
        if(!ricochet || (b.bounces||0)>=3) return false;
        const hitX=isSolid(Math.floor((hx+ux*.02)/TILE),Math.floor((hy-uy*.02)/TILE));
        const hitY=isSolid(Math.floor((hx-ux*.02)/TILE),Math.floor((hy+uy*.02)/TILE));
        if(hitX||!hitY) b.vx=-b.vx;
        if(hitY||!hitX&&!hitY) b.vy=-b.vy;
        b.x=hx-ux*.03; b.y=hy-uy*.03; b.bounces=(b.bounces||0)+1;
        remaining-=Math.max(d,.03);
      } else { b.x+=ux*step; b.y+=uy*step; remaining-=step; }
      if(visit(b)) return false;
    }
    b.life-=dt; return b.life>0;
  }

  class HostSim {
    constructor(opts = {}) {
      this.players = new Map(); this.bullets = []; this.events = [];
      this.score = [0, 0]; this.phase = 'play'; this.phaseT = 0; this.winner = -1;
      this.nextId = 1; this.snapN = 0; this.botsPerTeam = opts.botsPerTeam ?? 3;
      this.ffa = opts.rule === "ffa"; this.duel = opts.rule === "duel" || this.ffa; this.teams = this.ffa ? [0,1,2] : [0,1]; this.roundTarget = Math.max(1,Math.min(25,Math.floor(Number(opts.roundTarget)||3))); this.rounds=this.teams.map(()=>0); this.score=this.teams.map(()=>0); this.target = this.duel ? Math.max(1,Math.min(25,Math.floor(Number(opts.target)||5))) : C.WIN; this.teamSize = this.duel ? 1 : (opts.teamSize || 0); this.rule = opts.rule === "fight" ? "fight" : opts.rule === "ricochet" ? "ricochet" : "classic"; configureMap(this.ffa ? 2 : this.teamSize || 4);
      this.difficulty = opts.difficulty || 'normal'; this.items = []; this.itemTimer = 8;
      this.seedItems();
      this.rosterDirty = true; this.botCounter = 0;
    }
    seedItems() {
      const spots = floor.filter(([x,y]) => x > 7 && x < MW-8 && y > 3 && y < MH-4);
      for (let i=0;i<(this.teamSize || 4)*3;i++) {
        const [tx,ty] = spots[(Math.random()*spots.length)|0];
        const roll = Math.random();
        const type = this.rule==='fight' ? 'medkit' : this.rule==='classic' && roll<.55 ? 'weapon' : roll<.78 ? 'knife' : 'medkit';
        const weapon = type==='weapon'?randomWeapon():0;
        this.items.push({ type, x:tx*TILE+TILE/2, y:ty*TILE+TILE/2, weapon });
      }
    }
    spawnRandomItem() {
      const spots = floor.filter(([x,y]) => x > 7 && x < MW-8 && y > 3 && y < MH-4);
      if (!spots.length || this.items.length >= 28) return;
      const [tx,ty] = spots[(Math.random()*spots.length)|0];
      const roll = Math.random();
      const type = this.rule==='fight' ? 'medkit' : this.rule==='classic' && roll<.55 ? 'weapon' : roll<.78 ? 'medkit' : 'knife';
      const weapon = type==='weapon'?randomWeapon():0;
      this.items.push({ type, x:tx*TILE+TILE/2, y:ty*TILE+TILE/2, weapon });
    }
    humans() { return [...this.players.values()].filter(p => !p.isBot); }
    // Drużyna 0 (zielona) = wszyscy ludzie (+ ewentualne zielone boty). Drużyna 1 (czerwona) = zawsze boty.
    addPlayer(name, isBot, team) {
      if (team === undefined) team = isBot ? 1 : 0;
      if (!this.teams.includes(team) || (!isBot && (!this.canJoin(team) || this.humans().length >= C.MAX_HUMANS))) return null;
      const id = this.nextId++;
      // czerwone boty nie mają nicków
      const nm = String(name || 'Gracz').slice(0, 12);
      const p = {
        id, name: nm, isBot: !!isBot, team,
        x: 0, y: 0, ang: team === 0 ? 0 : Math.PI, hp: C.MAXHP, alive: false, resp: 0, prot: 0,
        hidden: false, reveal: 0,
        ammo: WEAPONS[0].mag, reload: 0, cd: 0, weapon: 0, knife: false, kills: 0, deaths: 0, money: 800,
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
    canJoin(team, except) { return this.teams.includes(team) && this.humans().filter(p => p.team === team && p.id !== except).length < (this.teamSize || C.MAX_HUMANS); }
    changeTeam(id, team) {
      const p = this.players.get(id);
      if (!p || p.isBot || !this.teams.includes(team) || !this.canJoin(team,id)) return false;
      if (p.team !== team) { p.team = team; this.spawn(p); this.rebalanceBots(); this.rosterDirty = true; }
      return true;
    }
    setBotsPerTeam(n) { this.botsPerTeam = n; this.rebalanceBots(); }
    rebalanceBots() {
      const humans = this.humans();
      const counts = this.teams.map(t=>humans.filter(p=>p.team===t).length);
      const total = this.teamSize || Math.max(this.botsPerTeam, counts[0], counts[1]);
      for (const t of this.teams) {
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
      p.input.ang = f(i.ang); p.input.fire = !!i.fire; if (i.trigger) p.input.trigger = true; if(i.heavy && this.rule==='fight') p.input.heavy=true; p.input.hide = !!i.hide; if (i.knife) p.input.knife = true; if (i.reload) p.input.reload = true; p.input.swap = !!i.swap; // Broń zmieniasz klawiszem F przy upuszczonej broni.
    }
    buy(id,index) {
      const p=this.players.get(id), w=WEAPONS[index];
      if(this.rule!=='ricochet'||this.phase!=='play'||!p?.alive||!Number.isInteger(index)||index<1||!w||p.money<w.price||!this.inBuyZone(p)||p.weapon===index) return false;
      p.money-=w.price; p.weapon=index; p.ammo=w.mag; p.reload=0; return true;
    }
    inBuyZone(p) {return spawns[p.team].some(([x,y])=>Math.floor(p.x/TILE)===x&&Math.floor(p.y/TILE)===y);}
    spawn(p) {
      const list = spawns[p.team];
      let best = null, bd = -1;
      for (let k = 0; k < 8; k++) {
        const [tx, ty] = list[(Math.random() * list.length) | 0];
        const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
        let md = 1e9; for (const q of this.players.values()) if (q !== p && q.alive) md = Math.min(md, Math.hypot(q.x - x, q.y - y));
        if (md > bd) { bd = md; best = [x, y]; }
      }
      p.x = best[0]; p.y = best[1]; p.hp = C.MAXHP; p.alive = true; p.weapon = 0; p.ammo = WEAPONS[p.weapon].mag; p.knife = false; p.reload = 0; p.cd = 0.3; p.prot = C.PROT; p.hidden = false; p.reveal = 0;
      p.ang = p.input.ang = p.team === 0 ? 0 : Math.PI;
    }
    resetMatch() {
      this.score = this.teams.map(()=>0); this.rounds=this.teams.map(()=>0); this.winner = -1; this.phase = 'play'; this.bullets.length = 0;
      this.items=[]; this.seedItems(); this.itemTimer=8;
      for (const p of this.players.values()) { p.kills = p.deaths = 0; p.money=800; this.spawn(p); }
    }
    resetRound() {
      this.score=this.teams.map(()=>0); this.phase = "play"; this.phaseT = 0; this.winner = -1; this.bullets.length = 0; this.items = []; this.seedItems(); this.itemTimer = 8;
      for (const p of this.players.values()) { this.spawn(p); p.resp=0; Object.assign(p.input,{fire:false,trigger:false,heavy:false,knife:false,reload:false,swap:false}); if(p.bot) Object.assign(p.bot,{think:0,target:0,last:null,lastT:0,path:[],repath:0}); }
    }
    damage(q, dmg, ownerId, x, y, ang) {
      if (this.phase !== "play" || !q.alive || q.prot > 0) return;
      q.hp -= dmg; q.reveal = 1.0; q.hidden = false; this.events.push(['h', r1(x), r1(y), r1(ang * 100) / 100]);
      if (q.hp > 0) return;
      q.alive = false; q.resp = C.RESPAWN;
      // Każdy zabity przeciwnik upuszcza aktualnie trzymaną broń, także pistolet.
      if(this.rule!=='fight') this.items.push({ type: 'weapon', x: q.x, y: q.y, weapon: q.weapon });
      q.deaths++; q.input.fire = false;
      const o = this.players.get(ownerId);
      if (o && o !== q) { o.kills++; this.score[o.team]++; if(this.rule==='ricochet') o.money=Math.min(16000,o.money+350); }
      this.events.push(['k', ownerId, q.id, r1(q.x), r1(q.y), r1(q.ang * 100) / 100]);
      if (o && o !== q && this.score[o.team] >= this.target) { this.winner=o.team; if(this.duel){ this.rounds[o.team]++; this.phase=this.rounds[o.team]>=this.roundTarget?'over':'round'; this.phaseT=this.phase==='over'?C.OVER:3; } else {this.phase='over';this.phaseT=C.OVER;} }
    }
    step(dt) {
      if (this.phase === 'round' || this.phase === 'over') {
        this.phaseT -= dt; this.bullets.length = 0;
        if (this.phaseT <= 0) { if(this.phase==='round') this.resetRound(); else this.resetMatch(); }
        return;
      }
      this.itemTimer -= dt;
      if (this.itemTimer <= 0) { this.spawnRandomItem(); this.itemTimer = 7 + Math.random() * 6; }
      for (const p of this.players.values()) {
        if (!p.alive) { p.resp -= dt; if (p.resp <= 0) this.spawn(p); continue; }
        if (p.prot > 0) p.prot -= dt;
        if (p.bot) { if(this.rule==='ricochet' && p.weapon===0 && this.inBuyZone(p)) { const choices=WEAPONS.map((w,i)=>i).filter(i=>i>0&&WEAPONS[i].price<=p.money); if(choices.length) this.buy(p.id,choices[choices.length-1]); } this.botThink(p, dt); }
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
            if (p.isBot ? WEAPONS[it.weapon].tier<=WEAPONS[p.weapon].tier : !inp.swap) continue;
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
            if (target) { p.knife = false; this.damage(target, 999, p.id, target.x, target.y, p.ang); if(this.duel && this.phase!=='play') return; }
          }
        }
        moveCircle(p, mx * spd * dt, my * spd * dt, C.R);
        p.ang = inp.ang;
        p.cd -= dt;
        
        if (this.rule==='fight') {
          if ((inp.fire || inp.trigger || inp.heavy) && p.cd<=0) {
            const heavy=!!inp.heavy; p.cd=heavy?.85:.48; p.prot=0; p.reveal=.7; p.hidden=false;
            this.events.push(['f',r1(p.x),r1(p.y),p.id,heavy?1:0]);
            let target=null, best=38;
            for(const q of this.players.values()) {
              if(!q.alive || q.team===p.team || q.prot>0) continue;
              const d=Math.hypot(q.x-p.x,q.y-p.y);
              if(d<best && Math.abs(angDiff(Math.atan2(q.y-p.y,q.x-p.x),p.ang))<.85 && los(p.x,p.y,q.x,q.y)){target=q;best=d;}
            }
            if(target) this.damage(target,heavy?40:25,p.id,target.x,target.y,p.ang);
          }
          inp.trigger=false; inp.heavy=false; inp.reload=false; inp.swap=false; inp.knife=false;
          if(this.phase!=='play') return;
          continue;
        }
        if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; p.ammo = WEAPONS[p.weapon].mag; } }
        if (inp.reload) { inp.reload = false; if (p.ammo < WEAPONS[p.weapon].mag && p.reload <= 0) p.reload = WEAPONS[p.weapon].reload; }
        if ((inp.fire || inp.trigger) && p.cd <= 0 && p.reload <= 0) {
          if (p.ammo <= 0) p.reload = WEAPONS[p.weapon].reload;
          else {
            p.ammo--; p.cd = WEAPONS[p.weapon].cd; p.prot = 0; p.reveal = 0.7; p.hidden = false;
            const w=WEAPONS[p.weapon];
            const muzzle=raycast(p.x,p.y,Math.cos(p.ang),Math.sin(p.ang),24);
            const offset=Math.max(0,Math.min(24,muzzle-.1));
            const bx=p.x+Math.cos(p.ang)*offset, by=p.y+Math.sin(p.ang)*offset;
            for(let j=0;j<(w.pellets||1);j++) {
              const a=p.ang+(Math.random()-.5)*2*(w.pellets?.16:p.isBot?.09:.04);
              this.bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,team:p.team,owner:p.id,damage:w.damage,life:C.BLIFE,bounces:0});
            }
            this.events.push(['s', r1(bx), r1(by), r1(p.ang * 100) / 100, p.team, p.id]);
          }
        }
        inp.trigger = false;
      }
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b=this.bullets[i];
        const alive=advanceBullet(b,dt,this.rule==='ricochet',()=>{
          for(const q of this.players.values()) {
            if(!q.alive||q.team===b.team) continue;
            if(Math.hypot(q.x-b.x,q.y-b.y)<C.R+2) {this.damage(q,b.damage,b.owner,b.x,b.y,Math.atan2(b.vy,b.vx));return true;}
          }
          return false;
        },(x,y)=>this.events.push(['w',r1(x),r1(y)]));
        if(!alive) this.bullets.splice(i,1);
        if(this.duel && this.phase!=='play') { this.bullets.length=0; return; }
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
        if(this.rule==='fight'){mx=d>25?ux:0;my=d>25?uy:0;}
        inp.mx = mx; inp.my = my;
        if (b.react > (this.difficulty === 'easy' ? .55 : this.difficulty === 'hard' ? .16 : .3) && Math.abs(angDiff(want, p.ang)) < 0.14 && d < (this.rule==='fight'?37:C.CONE_R - 40)) inp.fire = true;
      } else {
        b.react = 0;
        b.repath -= dt;
        if (!b.path.length || b.repath <= 0) {
          let gx, gy;
          if (b.lastT > 0 && b.last) { gx = Math.floor(b.last.x / TILE); gy = Math.floor(b.last.y / TILE); b.lastT = 0; b.last = null; }
          else if (Math.random() < 0.5) { const enemies=this.teams.filter(t=>t!==p.team); const pool=spawns[enemies[(Math.random()*enemies.length)|0]]; const s=pool[(Math.random()*pool.length)|0]; gx = s[0]; gy = s[1]; }
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
      for (const p of this.players.values()) players.push([p.id, r1(p.x), r1(p.y), Math.round(p.ang * 100) / 100, Math.max(0, Math.round(p.hp)), p.alive ? 1 : 0, p.ammo, p.reload > 0 ? 1 : 0, p.kills, p.deaths, r1(Math.max(0, p.resp)), p.hidden ? 1 : 0, p.weapon, p.knife ? 1 : 0, p.money, this.inBuyZone(p)?1:0]);
      const b = this.bullets.map(q => [r1(q.x), r1(q.y), Math.round(q.vx), Math.round(q.vy), q.team, q.owner]);
      const e = this.events; this.events = [];
      return { t: 's', n: ++this.snapN, p: players, b, it: this.items.map(q => [q.type, r1(q.x), r1(q.y), q.weapon || 0]), sc: this.score.slice(), rs:this.rounds.slice(), ph: this.phase, pt: r1(this.phaseT), w: this.winner, e };
    }
  }

  const Sim = { C, WEAPONS, ARENAS, configureMap, advanceBullet, get grid(){return grid;}, spawns, floor, isSolid, raycast, los, collides, moveCircle, sees, angDiff, bfs, HostSim };
  root.Sim = Sim;
  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
