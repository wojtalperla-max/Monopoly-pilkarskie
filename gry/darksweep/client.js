/* DARK SWEEP – klient: render, sterowanie, sieć (PeerJS, host-autorytatywny). */
(function () {
  'use strict';
  const S = window.Sim, C = S.C, TILE = C.TILE;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const STEP = 1 / 60, PREFIX = 'dsweep-';

  // ---------- rozmiar ----------
  let dpr = 1, VW = 0, VH = 0, zoom = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * dpr; cv.height = VH * dpr; cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
    zoom = Math.max(0.6, Math.min(2.2, Math.min(VW, VH) / 600));
  }
  addEventListener('resize', resize); resize();

  // ---------- stan ----------
  const net = { mode: null, sim: null, peer: null, conn: null, conns: new Map(), localId: 0, code: '', worker: null, timer: 0, started: false, entered: false };
  let roster = new Map();          // id -> {name,team,bot}
  let buf = [];                    // bufor snapshotów {at,s}
  let lastProcN = 0;
  let me = { x: 0, y: 0, ang: 0, init: false };
  let myTeam = 0, view = null, cam = { x: 0, y: 0 };
  let corpses = [], decals = [], flashes = [], parts = [], feed = [];
  let lastPhase = 'play', touchDevice = false;
  const inp = { mx: 0, my: 0, ang: 0, fire: false, reload: false, hide: false, knife: false, swap: false };
  let touchHide = false; const anims = new Map();   // animacje ludzików: id -> {x,y,ph,h}

  // ---------- dźwięk ----------
  let ac = null;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } return ac; }
  function noise(dur, freq, vol) {
    const a = audio(); if (!a || vol < 0.01) return;
    const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(); s.buffer = b;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  const distVol = (x, y) => me.init ? Math.max(0, 1 - Math.hypot(x - me.x, y - me.y) / 700) * 0.25 : 0.1;

  // ---------- tekstura podłogi ----------
  const floorPat = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#7b7b7b'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,.09)'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) { g.beginPath(); let x = Math.random() * 128, y = Math.random() * 128; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 60; y += (Math.random() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
    return ctx.createPattern(c, 'repeat');
  })();

  // ---------- sterowanie ----------
  const keys = {}; const mouse = { x: 0, y: 0, down: false };
  const touch = { move: null, aim: null };
  let showScore = false;
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (k === 'r') inp.reload = true;
    if (k === 'e') inp.knife = true;
    if (k === 'f') inp.swap = true;
    if (k === 'tab') { showScore = true; e.preventDefault(); }
    if (k === 'h') $('controls').style.display = $('controls').style.display === 'none' ? 'block' : 'none';
  });
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === 'tab') showScore = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; showScore = false; mouse.down = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    audio();
    if (e.pointerType === 'touch') {
      touchDevice = true; $('reload').style.display = 'block'; $('hide').style.display = 'block';
      const t = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      if (e.clientX < VW / 2) { if (!touch.move) touch.move = t; } else if (!touch.aim) touch.aim = t;
    } else { mouse.x = e.clientX; mouse.y = e.clientY; if (e.button === 0) mouse.down = true; }
    try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') { for (const k of ['move', 'aim']) if (touch[k] && touch[k].id === e.pointerId) { touch[k].x = e.clientX; touch[k].y = e.clientY; } }
    else { mouse.x = e.clientX; mouse.y = e.clientY; }
  });
  const up = e => {
    if (e.pointerType === 'touch') { for (const k of ['move', 'aim']) if (touch[k] && touch[k].id === e.pointerId) touch[k] = null; }
    else if (e.button === 0) mouse.down = false;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  $('reload').addEventListener('pointerdown', e => { e.stopPropagation(); inp.reload = true; });
  $('hide').addEventListener('pointerdown', e => { e.stopPropagation(); touchHide = !touchHide; $('hide').classList.toggle('on', touchHide); });

  function updateInput() {
    let mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    let my = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    if (touch.move) {
      const dx = touch.move.x - touch.move.ox, dy = touch.move.y - touch.move.oy, R = 55;
      mx = Math.max(-1, Math.min(1, dx / R)); my = Math.max(-1, Math.min(1, dy / R));
    }
    inp.mx = mx; inp.my = my; inp.hide = !!(keys['shift'] || keys['c'] || touchHide);
    if (touch.aim) {
      const dx = touch.aim.x - touch.aim.ox, dy = touch.aim.y - touch.aim.oy, d = Math.hypot(dx, dy);
      if (d > 10) inp.ang = Math.atan2(dy, dx);
      inp.fire = d > 30;
    } else if (!touchDevice && me.init) {
      inp.ang = Math.atan2(mouse.y - ((me.y - cam.y) * zoom + VH / 2), mouse.x - ((me.x - cam.x) * zoom + VW / 2));
      inp.fire = mouse.down;
    } else inp.fire = false;
  }

  // ---------- UI / menu ----------
  const status = t => { $('status').textContent = t || ''; };
  const nick = () => ($('name').value.trim() || 'Gracz' + Math.floor(Math.random() * 900 + 100));
  try { $('name').value = localStorage.getItem('ds-name') || ''; } catch (_) { }
  const qs = new URLSearchParams(location.search); if (qs.get('room')) $('code').value = qs.get('room').toUpperCase().slice(0, 5);

  function resetClientState() {
    roster = new Map(); buf = []; lastProcN = 0; me = { x: 0, y: 0, ang: 0, init: false };
    corpses = []; decals = []; flashes = []; parts = []; feed = []; view = null; lastPhase = 'play'; anims.clear(); touchHide = false;
    $('hide').classList.remove('on');
  }
  function enterGame() {
    $('menu').style.display = 'none'; $('hud').style.display = 'flex'; $('controls').style.display = 'block'; audio();
    if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) { touchDevice = true; $('reload').style.display = 'block'; $('hide').style.display = 'block'; }
  }
  function leave() {
    if (net.worker) { net.worker.terminate(); net.worker = null; }
    if (net.timer) { clearInterval(net.timer); net.timer = 0; }
    try { if (net.conn) net.conn.close(); } catch (_) { }
    for (const c of net.conns.keys()) try { c.close(); } catch (_) { }
    try { if (net.peer) net.peer.destroy(); } catch (_) { }
    if (net.sendTimer) clearInterval(net.sendTimer);
    Object.assign(net, { mode: null, sim: null, peer: null, conn: null, conns: new Map(), localId: 0, code: '', sendTimer: 0, started: false, entered: false });
    resetClientState(); hideLobby();
    $('menu').style.display = 'flex'; $('hud').style.display = 'none'; $('controls').style.display = 'none'; $('reload').style.display = 'none'; $('hide').style.display = 'none';
  }
  $('leave').onclick = leave;
  addEventListener('beforeunload', () => { try { if (net.conn) net.conn.close(); } catch (_) { } });
  $('roomBtn').onclick = () => {
    if (!net.code) return;
    const link = location.origin + location.pathname + '?room=' + net.code;
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => { $('roomBtn').textContent = 'Skopiowano link!'; setTimeout(roomLabel, 1500); }, () => prompt('Link zaproszenia:', link));
  };
  function roomLabel() { $('roomBtn').textContent = net.code ? 'Pokój: ' + net.code + ' (kopiuj link)' : 'Tryb offline'; }

  const peerOK = () => typeof window.Peer === 'function';
  function saveName(n) { try { localStorage.setItem('ds-name', n); } catch (_) { } }

  // ---------- HOST ----------
  function startHost(online) {
    resetClientState();
    const name = nick(); saveName(name);
    net.mode = 'host'; net.sim = new S.HostSim({ botsPerTeam: +$('bots').value, difficulty: $('difficulty').value });
    const p = net.sim.addPlayer(name, false, +$('team').value); net.localId = p.id; myTeam = p.team;
    net.code = ''; net.started = false; roomLabel();
    if (online && peerOK()) { status(''); lobbyShow(true); lobbyRefresh(); openPeer(0); return; }   // poczekalnia z kodem pokoju
    net.started = true; enterGame(); startHostLoop();
    if (online) status('Nie udało się załadować PeerJS – działa tylko tryb offline.');
  }
  function hostStartGame() {
    if (net.mode !== 'host' || net.started) return;
    net.started = true; hideLobby();
    for (const c of net.conns.keys()) if (c.open) c.send({ t: 'start' });
    enterGame(); startHostLoop();
  }
  function randCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[(Math.random() * a.length) | 0]; return s; }
  function openPeer(tries) {
    const code = randCode(); const peer = new Peer(PREFIX + code);
    net.peer = peer;
    peer.on('open', () => { net.code = code; roomLabel(); lobbyRefresh(); });
    peer.on('error', e => {
      if (e.type === 'unavailable-id' && tries < 5) { try { peer.destroy(); } catch (_) { } openPeer(tries + 1); }
      else { $('roomBtn').textContent = 'Błąd sieci: ' + e.type; if (!net.started) lobbyStatus('Błąd sieci: ' + e.type); }
    });
    peer.on('connection', conn => {
      conn.on('data', m => {
        if (!m || typeof m !== 'object') return;
        if (m.t === 'join') {
          if (net.conns.has(conn)) return;
          if (net.sim.humans().length >= C.MAX_HUMANS) { try { conn.send({ t: 'full' }); } catch (_) { } setTimeout(() => conn.close(), 200); return; }
          const pl = net.sim.addPlayer(String(m.name || 'Gracz'), false, m.team === 1 ? 1 : 0);
          net.conns.set(conn, pl.id);
          conn.send({ t: 'welcome', id: pl.id, started: net.started });
          lobbyRefresh();
        } else if (m.t === 'in') { const id = net.conns.get(conn); if (id) net.sim.setInput(id, m); }
      });
      const drop = () => { const id = net.conns.get(conn); if (id) { net.sim.removePlayer(id); net.conns.delete(conn); lobbyRefresh(); } };
      conn.on('close', drop); conn.on('error', drop);
    });
  }
  function startHostLoop() {
    let last = performance.now(), acc = 0, k = 0;
    const tick = () => {
      const sim = net.sim; if (!sim) return;
      const n = performance.now(); acc += Math.min(0.25, (n - last) / 1000); last = n;
      while (acc >= STEP) {
        sim.setInput(net.localId, inp); inp.reload = false; inp.knife = false; inp.swap = false;
        sim.step(STEP); acc -= STEP;
        if (++k % 3 === 0) broadcast();
      }
    };
    try {
      const blob = new Blob(['setInterval(function(){postMessage(0)},16)'], { type: 'text/javascript' });
      net.worker = new Worker(URL.createObjectURL(blob)); net.worker.onmessage = tick;
    } catch (_) { net.timer = setInterval(tick, 16); }
  }
  function broadcast() {
    const sim = net.sim;
    if (sim.rosterDirty) {
      sim.rosterDirty = false; const r = sim.roster(); applyRoster(r);
      for (const c of net.conns.keys()) if (c.open) c.send({ t: 'roster', r });
    }
    const s = sim.snapshot(); pushSnap(s);
    for (const c of net.conns.keys()) if (c.open) c.send(s);
  }

  // ---------- KLIENT ----------
  function startJoin() {
    const code = $('code').value.trim().toUpperCase();
    if (code.length < 5) { status('Wpisz 5-znakowy kod pokoju.'); return; }
    if (!peerOK()) { status('Nie udało się załadować PeerJS (brak dostępu do unpkg.com?).'); return; }
    resetClientState(); const name = nick(); saveName(name); status('Łączenie…');
    net.mode = 'client'; net.code = code;
    const peer = new Peer(); net.peer = peer; let done = false;
    const fail = m => { if (done) return; done = true; leave(); status(m); };
    const to = setTimeout(() => fail('Nie można połączyć z pokojem – sprawdź kod.'), 15000);
    peer.on('error', e => fail(e.type === 'peer-unavailable' ? 'Nie ma takiego pokoju.' : 'Błąd sieci: ' + e.type));
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }); net.conn = conn;
      conn.on('open', () => { conn.send({ t: 'join', name, team: +$('team').value }); });
      conn.on('data', m => {
        if (!m) return;
        if (m.t === 'welcome') { clearTimeout(to); done = true; net.localId = m.id; status(''); roomLabel(); if (m.started) clientEnter(); else lobbyShow(false); }
        else if (m.t === 'lobby') lobbyRender(m);
        else if (m.t === 'start') clientEnter();
        else if (m.t === 'roster') applyRoster(m.r);
        else if (m.t === 's') { if (!net.entered) clientEnter(); pushSnap(m); }
        else if (m.t === 'full') fail('Pokój jest pełny.');
      });
      conn.on('close', () => { if (net.mode === 'client') { leave(); status('Połączenie z hostem zostało zakończone.'); } });
      conn.on('error', () => fail('Błąd połączenia.'));
    });
  }
  function clientEnter() {
    if (net.entered || net.mode !== 'client') return;
    net.entered = true; hideLobby(); status(''); roomLabel(); enterGame(); startSendLoop();
  }
  function startSendLoop() {
    net.sendTimer = setInterval(() => {
      if (net.conn && net.conn.open) { net.conn.send({ t: 'in', mx: inp.mx, my: inp.my, ang: inp.ang, fire: inp.fire, reload: inp.reload, hide: inp.hide, knife: inp.knife, swap: inp.swap }); inp.reload = false; inp.knife = false; inp.swap = false; }
    }, 33);
  }


  // ---------- POCZEKALNIA POKOJU (kod, lista graczy, start) ----------
  const TEAM_COL = ['#3dff7a', '#ff4d4d'], TEAM_NAME = ['zielona', 'czerwona'], DIFF_NAME = { easy: 'łatwy', normal: 'normalny', hard: 'trudny' };
  function lobbyStatus(t) { $('lbStatus').textContent = t || ''; }
  function lobbyShow(isHost) {
    $('menu').classList.add('in-lobby');
    $('lbBadge').textContent = isHost ? '👑 Gospodarz pokoju' : '🎮 Gość w pokoju';
    $('lbStart').style.display = isHost ? '' : 'none';
    $('lbCode').textContent = net.code || '…'; $('lbInfo').textContent = '';
    lobbyStatus(isHost ? 'Oczekiwanie na graczy…' : 'Czekaj, aż host rozpocznie grę.');
  }
  function hideLobby() { const m = $('menu'); if (m) m.classList.remove('in-lobby'); const b = $('lbPlayers'); if (b) b.textContent = ''; }
  function lobbyRender(d) {
    if (!d || !Array.isArray(d.p)) return;
    $('lbCode').textContent = d.code || net.code || '…';
    const box = $('lbPlayers'); box.textContent = '';
    d.p.forEach((p, i) => {
      const row = document.createElement('div'), dot = document.createElement('span'), nm = document.createElement('span');
      dot.className = 'ds-dot'; dot.style.background = TEAM_COL[p.t === 1 ? 1 : 0];
      nm.textContent = (i + 1) + '. ' + String(p.n || 'Gracz').slice(0, 14) + (p.h ? ' (host)' : '') + (p.i === net.localId ? ' (Ty)' : '') + ' – ' + TEAM_NAME[p.t === 1 ? 1 : 0];
      row.append(dot, nm); box.appendChild(row);
    });
    $('lbInfo').textContent = 'Boty: ' + (d.b | 0) + ' na drużynę · poziom: ' + (DIFF_NAME[d.d] || d.d);
    lobbyStatus('Gracze: ' + d.p.length + '/' + (d.max || C.MAX_HUMANS) + '. ' + (net.mode === 'host' ? 'Możesz rozpocząć grę w każdej chwili.' : 'Czekaj, aż host rozpocznie grę.'));
  }
  function lobbyRefresh() {
    const sim = net.sim; if (net.mode !== 'host' || !sim || net.started) return;
    const d = { t: 'lobby', code: net.code, b: sim.botsPerTeam, d: sim.difficulty, max: C.MAX_HUMANS,
      p: [...sim.players.values()].filter(p => !p.isBot).map(p => ({ i: p.id, n: p.name, t: p.team, h: p.id === net.localId ? 1 : 0 })) };
    lobbyRender(d);
    for (const c of net.conns.keys()) if (c.open) { try { c.send(d); } catch (_) { } }
  }
  $('lbStart').onclick = hostStartGame;
  $('lbLeave').onclick = leave;
  $('lbCopy').onclick = () => {
    if (!net.code) return;
    const link = location.origin + location.pathname + '?room=' + net.code, b = $('lbCopy');
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => { b.lastChild.textContent = 'Skopiowano!'; setTimeout(() => { b.lastChild.textContent = 'Kopiuj link zaproszenia'; }, 1500); }, () => prompt('Link zaproszenia:', link));
  };

  $('btnHost').onclick = () => startHost(true);
  $('btnOffline').onclick = () => startHost(false);
  $('btnJoin').onclick = startJoin;

  // ---------- snapshoty ----------
  function applyRoster(r) { roster = new Map(r.map(a => [a[0], { name: a[1], team: a[2], bot: !!a[3] }])); const m = roster.get(net.localId); if (m) myTeam = m.team; }
  function pushSnap(s) { buf.push({ at: performance.now(), s }); if (buf.length > 40) buf.shift(); }

  const lerpA = (a, b, t) => a + S.angDiff(b, a) * t;
  function buildView(now) {
    if (!buf.length) return null;
    const rt = now - (net.mode === 'host' ? 60 : 110);
    let i = 0; for (let k = buf.length - 1; k >= 0; k--) if (buf[k].at <= rt) { i = k; break; }
    const A = buf[i], B = buf[i + 1];
    let al = B ? (rt - A.at) / Math.max(1, B.at - A.at) : 0; al = Math.max(0, Math.min(1, al));
    const bm = B ? new Map(B.s.p.map(a => [a[0], a])) : null;
    const players = A.s.p.map(a => {
      const b = bm && bm.get(a[0]);
      return { id: a[0], x: b ? a[1] + (b[1] - a[1]) * al : a[1], y: b ? a[2] + (b[2] - a[2]) * al : a[2], ang: b ? lerpA(a[3], b[3], al) : a[3], hp: a[4], alive: !!a[5], ammo: a[6], rel: !!a[7], kills: a[8], deaths: a[9], resp: a[10], hid: !!a[11], weapon: a[12] || 0, knife: !!a[13], team: (roster.get(a[0]) || { team: 0 }).team, name: (roster.get(a[0]) || { name: '?' }).name };
    });
    const dt = Math.min(0.15, Math.max(0, (rt - A.at) / 1000));
    const bullets = A.s.b.map(b => ({ x: b[0] + b[2] * dt, y: b[1] + b[3] * dt, vx: b[2], vy: b[3], team: b[4] }));
    // zdarzenia
    const evs = [];
    for (const e of buf) if (e.s.n > lastProcN && e.at <= rt) { lastProcN = e.s.n; for (const ev of e.s.e) evs.push(ev); }
    return { players, bullets, items: (A.s.it || []).map(q => ({type:q[0],x:q[1],y:q[2],weapon:q[3]})), score: A.s.sc, phase: A.s.ph, phaseT: A.s.pt, winner: A.s.w, evs };
  }

  function updateSelf(dt, v) {
    const sp = v.players.find(p => p.id === net.localId);
    if (net.mode === 'host') {
      const p = net.sim.players.get(net.localId); if (!p) return sp;
      me.x = p.x; me.y = p.y; me.init = true; me.ang = inp.ang;
      return Object.assign(sp || {}, { id: p.id, x: p.x, y: p.y, ang: inp.ang, hp: p.hp, alive: p.alive, ammo: p.ammo, rel: p.reload > 0, resp: p.resp, hid: p.hidden, weapon: p.weapon, knife: p.knife, team: p.team, name: p.name, kills: p.kills, deaths: p.deaths });
    }
    if (!sp) return null;
    if (!me.init || !sp.alive || Math.hypot(sp.x - me.x, sp.y - me.y) > 120) { if (sp.alive || !me.init) { me.x = sp.x; me.y = sp.y; me.init = true; } }
    if (sp.alive && v.phase === 'play') {
      let mx = inp.mx, my = inp.my; const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
      const sm = sp.hid ? C.HIDE_SPEED : 1;
      S.moveCircle(me, mx * C.SPEED * sm * dt, my * C.SPEED * sm * dt, C.R);
      if (!l) { const k = Math.min(1, dt * 6); me.x += (sp.x - me.x) * k; me.y += (sp.y - me.y) * k; }
    } else if (!sp.alive) { me.x = sp.x; me.y = sp.y; }
    me.ang = inp.ang;
    sp.x = me.x; sp.y = me.y; sp.ang = inp.ang; return sp;
  }

  // ---------- widoczność ----------
  let viewers = [];
  function isVisible(x, y) { for (const v of viewers) if (S.sees(v, x, y)) return true; return false; }

  function handleEvents(v) {
    for (const ev of v.evs) {
      const k = ev[0];
      if (k === 's') {
        if (ev[4] === myTeam || isVisible(ev[1], ev[2])) { flashes.push({ x: ev[1], y: ev[2], ang: ev[3], t: 0.07 }); noise(0.07, 2500, distVol(ev[1], ev[2])); }
      } else if (k === 'h') {
        if (isVisible(ev[1], ev[2])) { for (let i = 0; i < 6; i++) { const a = ev[3] + (Math.random() - .5) * 1.2, sp = 60 + Math.random() * 120; parts.push({ x: ev[1], y: ev[2], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0.35, c: '#d00' }); } decals.push({ x: ev[1] + (Math.random() - .5) * 8, y: ev[2] + (Math.random() - .5) * 8, r: 2 + Math.random() * 3 }); noise(0.05, 900, distVol(ev[1], ev[2]) * 0.8); }
      } else if (k === 'w') {
        if (isVisible(ev[1], ev[2])) for (let i = 0; i < 3; i++) parts.push({ x: ev[1], y: ev[2], vx: (Math.random() - .5) * 140, vy: (Math.random() - .5) * 140, t: 0.2, c: '#ffd166' });
      } else if (k === 'k') {
        const vic = roster.get(ev[2]) || { team: 1, name: '' }, kil = roster.get(ev[1]) || { team: 1, name: '' };
        feed.push({ t: 5, a: kil.name || 'Bot', at: kil.team, b: vic.name || 'Bot', bt: vic.team });
        if (feed.length > 5) feed.shift();
        corpses.push({ x: ev[3], y: ev[4], ang: ev[5], team: vic.team });
        if (corpses.length > 40) corpses.shift();
        for (let i = 0; i < 4; i++) decals.push({ x: ev[3] + (Math.random() - .5) * 26, y: ev[4] + (Math.random() - .5) * 26, r: 3 + Math.random() * 5 });
        while (decals.length > 120) decals.shift();
        noise(0.25, 500, distVol(ev[3], ev[4]) * 1.5);
      }
    }
  }

  // ---------- render ----------
  function visPoly(v) {
    const pts = [], H = C.CONE_HALF, E = 1e-4;
    const rel = [];
    for (let a = -Math.PI; a < Math.PI; a += 0.07) rel.push(a);
    for (let a = -H; a <= H; a += 0.02) rel.push(a);
    rel.push(-H - E, -H + E, H - E, H + E); rel.sort((a, b) => a - b);
    for (const r of rel) {
      const lim = Math.abs(r) <= H ? C.CONE_R : C.NEAR_R, a = v.ang + r, dx = Math.cos(a), dy = Math.sin(a);
      const d = S.raycast(v.x, v.y, dx, dy, lim) + 2; pts.push([v.x + dx * d, v.y + dy * d]);
    }
    return pts;
  }

  // ---------- ludziki ----------
  const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };
  const PAL = {
    g: { body: '#2fbf5f', dark: '#17703a', helm: '#1f8a45', edge: '#3dff7a' },
    r: { body: '#d83a3a', dark: '#7d1818', helm: '#a32424', edge: '#ff7a7a' },
  };
  const WALLC = '#0b0b0b', SKIN = '#e0b48a';

  // animacja: faza kroku (z przesunięcia) i płynne wtapianie w ścianę (h: 0..1)
  function animOf(p, dt) {
    let a = anims.get(p.id);
    if (!a) { a = { x: p.x, y: p.y, ph: 0, h: 0 }; anims.set(p.id, a); }
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    if (d < 40) a.ph += d * 0.16;
    a.x = p.x; a.y = p.y;
    a.h += ((p.hid ? 1 : 0) - a.h) * Math.min(1, dt * 7);
    if (Math.abs(a.h - (p.hid ? 1 : 0)) < 0.01) a.h = p.hid ? 1 : 0;
    return a;
  }
  // wróg jest widoczny: w świetle latarki, a gdy wtopiony w ścianę – tylko z bliska
  function spotted(p) {
    for (const v of viewers) {
      if (!S.sees(v, p.x, p.y)) continue;
      if (!p.hid || Math.hypot(p.x - v.x, p.y - v.y) <= C.SPOT_R) return true;
    }
    return false;
  }
  // kierunek do najbliższej ściany (do „przytulenia się" ukrytego ludzika)
  function wallDir(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); let bd = 1e9, bx = 0, by = 0;
    for (let j = ty - 1; j <= ty + 1; j++) for (let i = tx - 1; i <= tx + 1; i++) {
      if (!S.isSolid(i, j)) continue;
      const cx = Math.max(i * TILE, Math.min(x, i * TILE + TILE)), cy = Math.max(j * TILE, Math.min(y, j * TILE + TILE));
      const d = Math.hypot(x - cx, y - cy); if (d < bd && d > 0.01) { bd = d; bx = (cx - x) / d; by = (cy - y) / d; }
    }
    return [bx, by];
  }

  function drawHuman(c, sw, gunOut) {
    // widok z góry, ludzik patrzy w prawo (+x). sw = wychylenie kroku (-1..1)
    ctx.lineCap = 'round';
    // buty / nogi
    ctx.fillStyle = c.boots;
    ctx.beginPath(); ctx.ellipse(sw * 5, -4.5, 5, 3, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-sw * 5, 4.5, 5, 3, 0, 0, 6.283); ctx.fill();
    // plecak
    ctx.fillStyle = c.dark; ctx.beginPath(); ctx.roundRect(-11, -5.5, 6, 11, 2); ctx.fill();
    // broń
    ctx.fillStyle = c.gun; ctx.fillRect(4, -1.8, gunOut, 3.6); ctx.fillRect(4 + gunOut * 0.45, 1.2, 5, 3);
    // ramiona
    ctx.strokeStyle = c.body; ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(-1, -8); ctx.lineTo(10, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, 8); ctx.lineTo(17, 2.2); ctx.stroke();
    // dłonie
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(11, -1.6, 2.1, 0, 6.283); ctx.arc(18, 2, 2.1, 0, 6.283); ctx.fill();
    // tułów
    ctx.fillStyle = c.body; ctx.strokeStyle = c.dark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(-1, 0, 6.5, 11, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    // głowa + hełm
    ctx.fillStyle = c.helm; ctx.beginPath(); ctx.arc(1, 0, 6.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.ellipse(4.4, 0, 2.2, 3.6, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = c.dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(1, 0, 6.2, 0, 6.283); ctx.stroke();
  }

  function drawPlayer(p, friendly, an) {
    const h = an.h, pal = friendly ? PAL.g : PAL.r;
    const c = {
      body: mix(pal.body, WALLC, h * 0.85), dark: mix(pal.dark, WALLC, h * 0.85), helm: mix(pal.helm, WALLC, h * 0.85),
      skin: mix(SKIN, WALLC, h * 0.85), boots: mix('#222222', WALLC, h), gun: mix('#2b2b2b', WALLC, h * 0.8),
    };
    const alpha = friendly ? 1 - 0.55 * h : 1 - 0.2 * h;
    let ox = 0, oy = 0;
    if (h > 0.01) { const [dx, dy] = wallDir(p.x, p.y); ox = dx * 5 * h; oy = dy * 5 * h; }
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x + ox, p.y + oy); ctx.rotate(p.ang);
    if (!friendly) { ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 14 * (1 - h); }
    drawHuman(c, Math.sin(an.ph) * (1 - h * 0.7), 22);
    ctx.restore();
    // pasek życia + nick (nick tylko gdy istnieje – czerwone boty go nie mają)
    ctx.save(); ctx.globalAlpha = friendly ? 1 - 0.6 * h : 1;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(p.x - 14, p.y - 26, 28, 4);
    ctx.fillStyle = friendly ? '#3dff7a' : '#ff4040'; ctx.fillRect(p.x - 14, p.y - 26, 28 * p.hp / C.MAXHP, 4);
    if (p.name) { ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#9dffbb'; ctx.fillText(p.name, p.x, p.y - 30); }
    ctx.restore();
  }

  function drawCorpse(cp) {
    const pal = cp.team === myTeam ? PAL.g : PAL.r;
    ctx.save(); ctx.translate(cp.x, cp.y); ctx.rotate(cp.ang + Math.PI); ctx.globalAlpha = 0.85;
    ctx.strokeStyle = mix(pal.dark, '#000000', 0.3); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-18, -9); ctx.moveTo(-6, 4); ctx.lineTo(-17, 8); ctx.moveTo(4, -8); ctx.lineTo(-4, -16); ctx.moveTo(4, 8); ctx.lineTo(12, 15); ctx.stroke();
    ctx.fillStyle = mix(pal.dark, '#000000', 0.25); ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = mix(pal.helm, '#000000', 0.35); ctx.beginPath(); ctx.arc(11, 0, 5.2, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function render(dt, v, self) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!v || !self) return;
    const lead = 45; cam.x = me.x + Math.cos(inp.ang) * lead; cam.y = me.y + Math.sin(inp.ang) * lead;
    const k = zoom * dpr; ctx.setTransform(k, 0, 0, k, (VW / 2 - cam.x * zoom) * dpr, (VH / 2 - cam.y * zoom) * dpr);
    const x0 = Math.max(0, Math.floor((cam.x - VW / 2 / zoom) / TILE)), x1 = Math.min(C.MW - 1, Math.ceil((cam.x + VW / 2 / zoom) / TILE));
    const y0 = Math.max(0, Math.floor((cam.y - VH / 2 / zoom) / TILE)), y1 = Math.min(C.MH - 1, Math.ceil((cam.y + VH / 2 / zoom) / TILE));
    const walls = (fill, stroke) => {
      ctx.fillStyle = fill; ctx.beginPath();
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (S.isSolid(x, y)) ctx.rect(x * TILE, y * TILE, TILE, TILE);
      ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    };
    // ciemna warstwa
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, C.MW * TILE, C.MH * TILE); walls('#000');

    // obserwatorzy = żywi koledzy z drużyny
    viewers = v.players.filter(p => p.alive && p.team === myTeam && !p.hid).map(p => ({ x: p.x, y: p.y, ang: p.ang }));
    if (!self.alive && !viewers.length) viewers = [{ x: me.x, y: me.y, ang: me.ang }];
    handleEvents(v);

    // oświetlona warstwa
    ctx.save(); ctx.beginPath();
    for (const vw of viewers) { const poly = visPoly(vw); ctx.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]); ctx.closePath(); }
    ctx.clip();
    ctx.fillStyle = floorPat; ctx.fillRect(0, 0, C.MW * TILE, C.MH * TILE);
    for (const vw of viewers) {
      const g = ctx.createRadialGradient(vw.x, vw.y, 10, vw.x, vw.y, C.CONE_R);
      g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = g; ctx.fillRect(vw.x - C.CONE_R, vw.y - C.CONE_R, C.CONE_R * 2, C.CONE_R * 2);
    }
    ctx.fillStyle = 'rgba(150,0,0,.55)'; for (const d of decals) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }
    for (const c of corpses) drawCorpse(c);
    for (const it of (v.items || [])) if (isVisible(it.x,it.y)) {
      ctx.save(); ctx.translate(it.x,it.y);
      if (it.type === 'medkit') { ctx.fillStyle='#eee'; ctx.fillRect(-8,-8,16,16); ctx.fillStyle='#d22'; ctx.fillRect(-2,-6,4,12); ctx.fillRect(-6,-2,12,4); }
      else if (it.type === 'knife') { ctx.rotate(-.55); ctx.fillStyle='#ddd'; ctx.fillRect(-2,-10,4,14); ctx.fillStyle='#8b5a2b'; ctx.fillRect(-3,3,6,8); }
      else { drawGroundWeapon(it.weapon || 0); }
      ctx.restore();
    }
    walls('#000', 'rgba(255,255,255,.35)');
    ctx.restore();

    // encje
    for (const b of v.bullets) if (b.team === myTeam || isVisible(b.x, b.y)) {
      const l = Math.hypot(b.vx, b.vy); ctx.strokeStyle = b.team === myTeam ? '#b6ffcb' : '#ffb0b0'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx / l * 20, b.y - b.vy / l * 20); ctx.stroke(); ctx.shadowBlur = 0;
    }
    for (const p of v.players) {
      if (!p.alive) { anims.delete(p.id); continue; }
      const an = animOf(p, dt);
      if (p.team === myTeam) drawPlayer(p, true, an);
      else if (spotted(p)) drawPlayer(p, false, an);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.t -= dt; if (f.t <= 0) { flashes.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 26); g.addColorStop(0, 'rgba(255,240,150,.95)'); g.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, 6.283); ctx.fill();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t -= dt; if (p.t <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    hud(v, self);
  }

  // Szczegółowa ilustracja aktualnej broni w prawym dolnym rogu.
  // Małe, czytelne sprite'y broni leżących na mapie – każda klasa ma własną sylwetkę.
  function drawGroundWeapon(index) {
    ctx.save(); ctx.rotate(-0.12); ctx.scale(0.78, 0.78);
    const metal='#56616b', hi='#aeb8bf', dark='#20272d', black='#101519', wood='#684a32';
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(1,5,20,7,0,0,Math.PI*2); ctx.fill();
    if (index===0) { // pistolet
      ctx.fillStyle=dark; ctx.fillRect(-13,-3,25,7); ctx.fillStyle=metal; ctx.fillRect(-12,-5,20,3);
      ctx.fillStyle=black; ctx.fillRect(10,-3,7,3); ctx.fillStyle=wood; ctx.beginPath(); ctx.moveTo(-5,3);ctx.lineTo(3,3);ctx.lineTo(1,13);ctx.lineTo(-5,13);ctx.closePath();ctx.fill();
      ctx.fillStyle=hi;ctx.fillRect(-9,-6,13,1);ctx.fillStyle=black;ctx.fillRect(-1,-7,4,2);
    } else if(index===1) { // karabin
      ctx.fillStyle=wood;ctx.fillRect(-25,-3,11,5);ctx.fillStyle=dark;ctx.fillRect(-15,-4,27,7);ctx.fillStyle=metal;ctx.fillRect(-12,-6,25,3);ctx.fillStyle=black;ctx.fillRect(11,-3,17,3);ctx.fillRect(26,-4,3,5);
      ctx.fillStyle=dark;ctx.fillRect(-2,2,5,11);ctx.fillStyle=black;ctx.fillRect(4,3,5,8);ctx.fillStyle=hi;ctx.fillRect(-10,-7,18,1);
    } else if(index===2) { // SMG
      ctx.fillStyle=dark;ctx.fillRect(-18,-4,26,7);ctx.fillStyle=metal;ctx.fillRect(-13,-6,22,3);ctx.fillStyle=black;ctx.fillRect(7,-3,18,3);ctx.fillRect(23,-5,4,6);
      ctx.fillStyle=wood;ctx.fillRect(-21,-3,5,6);ctx.fillStyle=dark;ctx.fillRect(-1,2,5,10);ctx.fillRect(3,-8,8,3);ctx.fillStyle=hi;ctx.fillRect(-10,-7,14,1);
    } else { // strzelba
      ctx.fillStyle=wood;ctx.fillRect(-26,-3,12,6);ctx.fillStyle=dark;ctx.fillRect(-15,-4,25,7);ctx.fillStyle=metal;ctx.fillRect(-13,-7,35,3);ctx.fillStyle=black;ctx.fillRect(9,-4,17,4);ctx.fillRect(25,-5,3,6);
      ctx.fillStyle=wood;ctx.fillRect(-4,3,5,7);ctx.fillStyle=metal;ctx.fillRect(-10,-1,17,2);ctx.fillStyle=hi;ctx.fillRect(-10,-8,27,1);
    }
    ctx.restore();
  }

  function drawWeaponHUD(weapon, index) {
    const w = Math.min(250, VW * 0.34), h = 92, x = VW - w - 14, y = VH - 145;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,12,.72)'; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(x + w * .52, y + 47); ctx.scale(w / 230, 1);
    const metal = '#343b42', edge = '#78818a', dark = '#171b20', black = '#090c10', grip = '#29231e';
    // Sylwetki różnią się zależnie od klasy broni.
    if (index === 0) { // pistolet
      ctx.fillStyle=dark; ctx.beginPath(); ctx.moveTo(-82,-12); ctx.lineTo(52,-12); ctx.lineTo(61,-6); ctx.lineTo(57,5); ctx.lineTo(15,7); ctx.lineTo(8,31); ctx.lineTo(-23,31); ctx.lineTo(-30,7); ctx.lineTo(-72,7); ctx.closePath(); ctx.fill();
      ctx.fillStyle=metal; ctx.fillRect(-79,-15,133,12); ctx.fillStyle=edge; ctx.fillRect(-73,-16,116,2); ctx.fillStyle=black; ctx.fillRect(48,-12,27,5); ctx.fillRect(70,-13,8,7);
      ctx.fillStyle=grip; ctx.beginPath(); ctx.moveTo(-24,7); ctx.lineTo(9,7); ctx.lineTo(3,34); ctx.lineTo(-17,34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#8b7964'; ctx.lineWidth=1; for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-19,13+i*5);ctx.lineTo(5,13+i*5);ctx.stroke();}
      ctx.fillStyle='#0a0d10'; ctx.fillRect(-5,-20,18,4); ctx.fillRect(22,-20,8,4); ctx.fillRect(-6,-3,12,3);
    } else { // karabin / SMG / strzelba
      const shotgun = index === 3, smg = index === 2;
      ctx.fillStyle=dark; ctx.fillRect(-100,-10, shotgun?188:155,12);
      ctx.fillStyle=metal; ctx.fillRect(-72,-16, shotgun?145:130,8); ctx.fillStyle=edge; ctx.fillRect(-66,-17,shotgun?125:115,2);
      ctx.fillStyle=black; ctx.fillRect(shotgun?77:61,-14,shotgun?48:66,5); ctx.fillRect(shotgun?121:122,-16,8,9);
      ctx.fillStyle=metal; ctx.fillRect(-30,-21,smg?35:48,6); ctx.fillStyle=black; ctx.fillRect(-21,-25,22,4);
      // chwyt i magazynek
      ctx.fillStyle=grip; ctx.beginPath(); ctx.moveTo(-12,1);ctx.lineTo(13,1);ctx.lineTo(7,30);ctx.lineTo(-5,30);ctx.closePath();ctx.fill();
      ctx.fillStyle=dark; ctx.beginPath(); ctx.moveTo(22,0);ctx.lineTo(44,0);ctx.lineTo(40,29);ctx.lineTo(26,29);ctx.closePath();ctx.fill();
      ctx.fillStyle=edge; ctx.fillRect(27,5,12,2);ctx.fillRect(27,12,12,2);ctx.fillRect(27,19,12,2);
      // kolba
      ctx.fillStyle=metal; ctx.fillRect(-112,-13,34,7);ctx.fillRect(-116,-17,8,15);ctx.fillStyle=black;ctx.fillRect(-118,-18,4,17);
      // detale korpusu
      ctx.strokeStyle='#9ba3aa';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-58,-8);ctx.lineTo(49,-8);ctx.stroke();
      ctx.fillStyle='#b7a66a';ctx.fillRect(-45,-5,4,3);ctx.fillRect(48,-5,4,3);
      if (shotgun) {ctx.fillStyle='#11161a';ctx.fillRect(-4,-20,9,4);ctx.fillRect(8,-20,9,4);}
    }
    // delikatne refleksy i cień pod modelem
    ctx.restore();
    ctx.textAlign='left';ctx.font='700 10px system-ui';ctx.fillStyle='#aeb7c0';ctx.fillText('AKTUALNA BROŃ  ·  ' + (index+1) + '/4',x+11,y+15);
    ctx.textAlign='right';ctx.font='10px system-ui';ctx.fillStyle='#77818a';ctx.fillText('ZNAJDŹ BROŃ',x+w-10,y+h-8);
    ctx.restore();
  }

  function hud(v, self) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.textAlign = 'center';
    const my = v.score[myTeam], en = v.score[1 - myTeam];
    ctx.font = '900 30px system-ui'; ctx.fillStyle = '#3dff7a'; ctx.fillText(my, VW / 2 - 50, 38);
    ctx.fillStyle = '#ff4040'; ctx.fillText(en, VW / 2 + 50, 38); ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.fillText('do ' + C.WIN, VW / 2, 36);
    // feed
    ctx.textAlign = 'right'; ctx.font = '13px system-ui';
    for (let i = 0; i < feed.length; i++) {
      const f = feed[i]; f.t -= 1 / 60; const y = 28 + i * 18, a = Math.min(1, f.t);
      ctx.globalAlpha = Math.max(0, a); const bw = ctx.measureText(f.b).width; ctx.fillStyle = f.bt === myTeam ? '#3dff7a' : '#ff6060'; ctx.fillText(f.b, VW - 12, y);
      ctx.fillStyle = '#aaa'; ctx.fillText('✕', VW - 18 - bw, y); const aw = ctx.measureText('✕').width;
      ctx.fillStyle = f.at === myTeam ? '#3dff7a' : '#ff6060'; ctx.fillText(f.a, VW - 24 - bw - aw, y); ctx.globalAlpha = 1;
    }
    while (feed.length && feed[0].t <= 0) feed.shift();
    // Zdrowie w formie pięciu serc (20 HP na serce)
    ctx.textAlign = 'left';
    for (let i = 0; i < 5; i++) {
      const full = self.hp >= (i + 1) * (C.MAXHP / 5);
      ctx.font = '900 27px system-ui';
      ctx.fillStyle = full ? '#ff416d' : 'rgba(220,225,235,.28)';
      ctx.shadowColor = full ? '#ff174f' : 'transparent';
      ctx.shadowBlur = full ? 7 : 0;
      ctx.fillText(full ? '♥' : '♡', 14 + i * 29, VH - 9);
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = 'right'; ctx.font = '800 22px system-ui'; ctx.fillStyle = self.rel ? '#ffd166' : '#fff';
    const weapon = S.WEAPONS[self.weapon || 0];
    ctx.fillText(self.rel ? 'PRZEŁADOWANIE…' : self.ammo + ' / ' + weapon.mag + '  ·  ' + weapon.name, VW - 16, VH - 22);
    drawWeaponHUD(weapon, self.weapon || 0);
    if (self.knife) { ctx.textAlign='left'; ctx.font='800 13px system-ui'; ctx.fillStyle='#ffd166'; ctx.fillText('NÓŻ: E – ciche zabójstwo od tyłu',14,VH-52); }
    ctx.textAlign = 'center';
    if (self.alive && self.hid) { ctx.textAlign = 'left'; ctx.font = '800 14px system-ui'; ctx.fillStyle = '#9aa'; ctx.fillText('UKRYTY – wtopiony w ścianę', 14, VH - 42); ctx.textAlign = 'center'; }
    if (!self.alive && v.phase === 'play') { ctx.font = '800 26px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText('Nie żyjesz – odrodzenie za ' + Math.ceil(self.resp) + ' s', VW / 2, VH / 2 - 60); }
    if (v.phase === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, VH / 2 - 70, VW, 120);
      const win = v.winner === myTeam; ctx.font = '900 38px system-ui'; ctx.fillStyle = win ? '#3dff7a' : '#ff4040'; ctx.fillText(win ? 'ZWYCIĘSTWO!' : 'PORAŻKA', VW / 2, VH / 2 - 15);
      ctx.font = '16px system-ui'; ctx.fillStyle = '#ddd'; ctx.fillText('Następna runda za ' + Math.ceil(v.phaseT) + ' s', VW / 2, VH / 2 + 20);
    }
    if (showScore) {
      const rows = v.players.slice().sort((a, b) => b.kills - a.kills);
      const w = Math.min(420, VW - 24), x = VW / 2 - w / 2, y = 70, h = 36 + rows.length * 22;
      ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x, y, w, h); ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = '#888'; ctx.fillText('GRACZ', x + 12, y + 20); ctx.textAlign = 'right'; ctx.fillText('ZAB.', x + w - 70, y + 20); ctx.fillText('ZG.', x + w - 14, y + 20);
      rows.forEach((p, i) => { const yy = y + 42 + i * 22; ctx.font = '14px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = p.team === myTeam ? '#3dff7a' : '#ff6060'; ctx.fillText((p.name || 'Bot') + (p.id === net.localId ? ' (ty)' : ''), x + 12, yy); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(p.kills, x + w - 70, yy); ctx.fillText(p.deaths, x + w - 14, yy); });
    }
    // drążki dotykowe
    for (const t of [touch.move, touch.aim]) if (t) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.ox, t.oy, 55, 0, 6.283); ctx.stroke();
      const dx = t.x - t.ox, dy = t.y - t.oy, d = Math.hypot(dx, dy) || 1, m = Math.min(55, d);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(t.ox + dx / d * m, t.oy + dy / d * m, 22, 0, 6.283); ctx.fill();
    }
  }

  // ---------- pętla ----------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (net.mode) {
      updateInput();
      const v = buildView(now);
      if (v) {
        const self = updateSelf(dt, v);
        if (v.phase === 'play' && lastPhase === 'over') { corpses = []; decals = []; }
        lastPhase = v.phase;
        render(dt, v, self);
      } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, cv.width, cv.height); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // do testów
  window.__ds = { net, get view() { return view; }, startHost, startJoin };
})();
