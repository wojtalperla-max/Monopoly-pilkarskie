(function(){
  let isPaused = false;
  let isDead = false;
  const pauseScreen = document.getElementById('pauseScreen');
  const pauseBtn = document.getElementById('pauseBtn');
  function setPaused(value){
    if(isDead) return;
    isPaused = !!value;
    pauseScreen.style.display = isPaused ? 'flex' : 'none';
    pauseBtn.textContent = isPaused ? '▶ Wznów' : '⏸ Pauza';
    if(!isPaused){ const mpp = document.getElementById('mpPanel'); if(mpp) mpp.style.display = 'none'; closeSettings(); }
    if(isPaused){
      // Usuń wciśnięte klawisze i sterowanie dotykowe, aby postać nie ruszyła po wznowieniu.
      for(const key in keys) keys[key] = false;
      joy.x = joy.y = 0;
      knob.style.transform = '';
    }
  }
  pauseBtn.addEventListener('click', () => setPaused(!isPaused));
  document.getElementById('resumeBtn').addEventListener('click', () => setPaused(false));

  // ===== Ustawienia (menu pauzy): dźwięk + „Zmień sterowanie” =====
  // Zmiana sterowania działa jako warstwa tłumacząca: wciśnięty klawisz jest zamieniany na domyślny kod akcji,
  // więc cała reszta gry (która nasłuchuje np. KeyF, KeyI…) działa bez zmian.
  const CTRL_ACTIONS = [
    {id:'forward', g:'Ruch',     n:'Do przodu',                       def:'KeyW'},
    {id:'back',    g:'Ruch',     n:'Do tyłu',                         def:'KeyS'},
    {id:'left',    g:'Ruch',     n:'W lewo',                          def:'KeyA'},
    {id:'right',   g:'Ruch',     n:'W prawo',                         def:'KeyD'},
    {id:'run',     g:'Ruch',     n:'Bieg / wstań / zsiądź / wysiądź', def:'ShiftLeft'},
    {id:'jump',    g:'Ruch',     n:'Skok / hamulec auta',             def:'Space'},
    {id:'cam',     g:'Kamera',   n:'Widok 1. / 3. osoby',             def:'KeyV'},
    {id:'camL',    g:'Kamera',   n:'Obrót kamery w lewo',             def:'KeyQ'},
    {id:'camR',    g:'Kamera',   n:'Obrót kamery w prawo',            def:'KeyE'},
    {id:'act',     g:'Akcje',    n:'Interakcja / rower / kilof',      def:'KeyF'},
    {id:'pick',    g:'Akcje',    n:'Podnieś mebel / współrzędne mapy',def:'KeyG'},
    {id:'rot',     g:'Akcje',    n:'Obróć stawiany przedmiot',        def:'KeyR'},
    {id:'inv',     g:'Akcje',    n:'Ekwipunek',                       def:'KeyI'},
    {id:'map',     g:'Akcje',    n:'Mapa',                            def:'KeyM'},
    {id:'phone',   g:'Akcje',    n:'Telefon',                         def:'KeyP'},
    {id:'sigL',    g:'Samochód', n:'Kierunkowskaz lewy',              def:'KeyZ'},
    {id:'sigR',    g:'Samochód', n:'Kierunkowskaz prawy',             def:'KeyC'},
    {id:'hazard',  g:'Samochód', n:'Światła awaryjne',                def:'KeyX'},
    {id:'brake',   g:'Samochód', n:'Hamulec ręczny',                  def:'KeyB'},
    {id:'horn',    g:'Samochód', n:'Klakson',                         def:'KeyH'},
    {id:'lights',  g:'Samochód', n:'Światła przednie',                def:'KeyL'}
  ];
  const CTRL_DEFAULT_CODES = new Set(CTRL_ACTIONS.map(a => a.def));
  const CTRL_FORBIDDEN = /^(Escape|Enter|NumpadEnter|Tab|Backspace|Delete|ContextMenu|Meta.*|OS.*|F\d+|CapsLock|NumLock|ScrollLock|Pause|PrintScreen|Insert|Home|End|PageUp|PageDown)$/;
  let ctrlMap = {};
  function ctrlResetMap(){ CTRL_ACTIONS.forEach(a => { ctrlMap[a.id] = a.def; }); }
  function ctrlLoad(){
    ctrlResetMap();
    try{
      const s = JSON.parse(localStorage.getItem('pz_keys') || 'null');
      if(!s || typeof s !== 'object') return;
      const used = new Set(), tmp = {};
      for(const a of CTRL_ACTIONS){
        const c = s[a.id];
        if(typeof c === 'string' && c.length < 30 && !CTRL_FORBIDDEN.test(c) && !used.has(c)){ tmp[a.id] = c; used.add(c); }
        else tmp[a.id] = null;
      }
      // akcje bez poprawnego wpisu dostają domyślny klawisz, o ile nie jest już zajęty
      for(const a of CTRL_ACTIONS){ if(!tmp[a.id] && !used.has(a.def)){ tmp[a.id] = a.def; used.add(a.def); } }
      if(CTRL_ACTIONS.every(a => tmp[a.id])) ctrlMap = tmp;
    }catch(err){}
  }
  function ctrlSave(){ try{ localStorage.setItem('pz_keys', JSON.stringify(ctrlMap)); }catch(err){} }
  ctrlLoad();

  // fizyczny klawisz → kod, który ma zobaczyć gra (string), false = klawisz został przeniesiony (zablokuj), null = bez zmian
  function ctrlTranslate(code){
    for(const a of CTRL_ACTIONS) if(ctrlMap[a.id] === code) return a.def;
    return CTRL_DEFAULT_CODES.has(code) ? false : null;
  }
  function ctrlKeyName(code){
    const m = {Space:'Spacja', ShiftLeft:'Lewy Shift', ShiftRight:'Prawy Shift', ControlLeft:'Lewy Ctrl', ControlRight:'Prawy Ctrl',
      AltLeft:'Lewy Alt', AltRight:'Prawy Alt', ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→',
      Backquote:'`', Minus:'-', Equal:'=', BracketLeft:'[', BracketRight:']', Backslash:'\\', Semicolon:';', Quote:"'", Comma:',', Period:'.', Slash:'/'};
    if(m[code]) return m[code];
    if(/^Key[A-Z]$/.test(code)) return code.slice(3);
    if(/^Digit\d$/.test(code)) return code.slice(5);
    if(/^Numpad/.test(code)) return 'Num ' + code.slice(6);
    return code;
  }

  const stPanel = document.getElementById('settingsPanel');
  const stMain = document.getElementById('stMain'), stCtrl = document.getElementById('stCtrl');
  const ctrlListEl = document.getElementById('ctrlList');
  let ctrlListening = null, ctrlSynth = false;

  function ctrlRender(){
    ctrlListEl.innerHTML = '';
    let grp = '';
    for(const a of CTRL_ACTIONS){
      if(a.g !== grp){ grp = a.g; const gh = document.createElement('div'); gh.className = 'ctrlGroup'; gh.textContent = grp; ctrlListEl.appendChild(gh); }
      const row = document.createElement('div'); row.className = 'ctrlRow';
      const lb = document.createElement('span'); lb.textContent = a.n;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ctrlKey';
      if(ctrlListening === a.id){ b.classList.add('listen'); b.textContent = 'naciśnij klawisz…'; }
      else { b.textContent = ctrlKeyName(ctrlMap[a.id]); if(ctrlMap[a.id] !== a.def) b.classList.add('mod'); }
      b.addEventListener('click', () => { ctrlListening = (ctrlListening === a.id) ? null : a.id; ctrlRender(); });
      row.appendChild(lb); row.appendChild(b); ctrlListEl.appendChild(row);
    }
  }
  function ctrlAssign(id, code){
    const a = CTRL_ACTIONS.find(x => x.id === id), old = ctrlMap[id];
    const other = CTRL_ACTIONS.find(x => x.id !== id && ctrlMap[x.id] === code);
    if(other){ ctrlMap[other.id] = old; try{ toast('Zamieniono klawisze: ' + other.n); }catch(err){} }
    ctrlMap[id] = code;
    ctrlSave();
  }
  function showSettings(){
    document.getElementById('pauseCard').style.display = 'none';
    const mpp = document.getElementById('mpPanel'); if(mpp) mpp.style.display = 'none';
    stMain.style.display = 'block'; stCtrl.style.display = 'none';
    stPanel.style.display = 'block';
  }
  function closeSettings(){
    ctrlListening = null;
    stPanel.style.display = 'none';
    stMain.style.display = 'block'; stCtrl.style.display = 'none';
    document.getElementById('pauseCard').style.display = '';
  }
  function showCtrl(){ ctrlListening = null; ctrlRender(); stMain.style.display = 'none'; stCtrl.style.display = 'block'; }
  function backToSettingsMain(){ ctrlListening = null; stMain.style.display = 'block'; stCtrl.style.display = 'none'; }
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.getElementById('stCloseBtn').addEventListener('click', closeSettings);
  document.getElementById('stCtrlBtn').addEventListener('click', showCtrl);
  document.getElementById('ctrlBack').addEventListener('click', backToSettingsMain);
  document.getElementById('ctrlReset').addEventListener('click', () => { ctrlResetMap(); ctrlListening = null; ctrlSave(); ctrlRender(); });

  // Warstwa tłumacząca – musi być zarejestrowana jako pierwsza (faza przechwytywania), przed pozostałymi nasłuchami klawiszy
  function ctrlOnKey(e){
    if(ctrlSynth) return;
    const t = e.target;
    const settingsOpen = stPanel.style.display === 'block';
    if(settingsOpen){
      if(e.type === 'keydown'){
        if(ctrlListening){
          e.preventDefault(); e.stopImmediatePropagation();
          if(e.repeat) return;
          if(e.code === 'Escape'){ ctrlListening = null; ctrlRender(); return; }
          if(CTRL_FORBIDDEN.test(e.code)){ try{ toast('Tego klawisza nie można przypisać'); }catch(err){} return; }
          const id = ctrlListening; ctrlListening = null;
          ctrlAssign(id, e.code); ctrlRender();
          return;
        }
        if(e.code === 'Escape'){            // Esc w ustawieniach cofa o krok, a nie wznawia gry
          e.preventDefault(); e.stopImmediatePropagation();
          if(e.repeat) return;
          if(stCtrl.style.display === 'block') backToSettingsMain(); else closeSettings();
          return;
        }
      }
      e.stopImmediatePropagation(); return;   // w ustawieniach klawisze nie trafiają do gry
    }
    if(t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]')) return;
    const cu = document.getElementById('computerUI');
    if(cu && cu.classList.contains('show')) return;                  // w komputerze (ShortCut, Internet) obowiązują klawisze domyślne
    const to = ctrlTranslate(e.code);
    if(to === null || to === e.code) return;
    e.stopImmediatePropagation();
    if(to === false) return;                                         // klawisz przeniesiony na inną akcję – nic nie robi
    if(e.code === 'Space' || to === 'Space') e.preventDefault();
    ctrlSynth = true;
    try{
      window.dispatchEvent(new KeyboardEvent(e.type, {code: to, key: to, bubbles: true, cancelable: true, repeat: e.repeat,
        shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey}));
    }finally{ ctrlSynth = false; }
  }
  addEventListener('keydown', ctrlOnKey, true);
  addEventListener('keyup', ctrlOnKey, true);

  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const HORIZON = 0xcfe8f5;
  scene.fog = new THREE.Fog(HORIZON, 60, 220);
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 600);

  // Niebo (gradient)
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms:{top:{value:new THREE.Color(0x2f7fd8)}, bottom:{value:new THREE.Color(HORIZON)}},
      vertexShader:'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying float h;void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(0.,.6,h)),1.);}'
    })
  );
  scene.add(sky);

  // Światło
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6a9a50, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 0.9);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left:-30,right:30,top:30,bottom:-30,near:1,far:150});
  scene.add(sun); scene.add(sun.target);

  // Trawa
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4c9a3a'; g.fillRect(0,0,256,256);
  for(let i=0;i<5000;i++){
    const l = 30 + Math.random()*30;
    g.fillStyle = `hsl(${90+Math.random()*30},55%,${l}%)`;
    g.fillRect(Math.random()*256, Math.random()*256, 2, 3+Math.random()*4);
  }
  const grassTex = new THREE.CanvasTexture(c);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(120,120);
  grassTex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000,1000), new THREE.MeshLambertMaterial({map:grassTex}));
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Chmury
  const cloudMat = new THREE.MeshBasicMaterial({color:0xffffff, fog:false});
  for(let i=0;i<25;i++){
    const cl = new THREE.Group();
    for(let j=0;j<4;j++){
      const s = new THREE.Mesh(new THREE.SphereGeometry(4+Math.random()*4, 8, 6), cloudMat);
      s.position.set(j*5-8, Math.random()*2, Math.random()*3);
      s.scale.y = .6; cl.add(s);
    }
    cl.position.set((Math.random()-.5)*400, 70+Math.random()*30, (Math.random()-.5)*400);
    scene.add(cl);
  }

  // Ulica główna (biegnie wzdłuż osi X, przed postacią)
  const ROAD_Z = -14, ROAD_W = 10, SIDEWALK_W = 3, TILE = 8, ROAD_LEN = 160;
  const WR = {x:-80, z:ROAD_Z, rOut:14, rIn:5.5};            // zachodnie rondo na końcu Długiej (jedyny wlot od wschodu)
  const SIGN_COLL = [];                                   // kolizje słupków znaków drogowych i tabliczek z nazwami ulic (okręgi jak pnie drzew)
  const solidPole = (x, z) => SIGN_COLL.push({x, z, r:0.32});
  const rc = document.createElement('canvas'); rc.width = 256; rc.height = 320;
  const r = rc.getContext('2d');
  r.fillStyle = '#3b3b40'; r.fillRect(0,0,256,320);
  for(let i=0;i<3000;i++){
    const v = 40 + Math.random()*35;
    r.fillStyle = `rgb(${v},${v},${v+4})`;
    r.fillRect(Math.random()*256, Math.random()*320, 2, 2);
  }
  r.fillStyle = '#e8e8e8';
  r.fillRect(0, 8, 256, 6);  r.fillRect(0, 306, 256, 6);      // linie krawędziowe
  r.fillStyle = '#f2c230';
  r.fillRect(0, 157, 128, 6);                                  // przerywana linia środkowa
  const roadTex = new THREE.CanvasTexture(rc);
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(ROAD_LEN/TILE, 1);
  roadTex.anisotropy = 8;

  const street = new THREE.Group();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_LEN, ROAD_W), new THREE.MeshLambertMaterial({map: roadTex}));
  road.rotation.x = -Math.PI/2; road.position.set(0, 0.02, ROAD_Z); road.receiveShadow = true;
  street.add(road);
  const walkMat = new THREE.MeshLambertMaterial({color:0xb8b8b0});

  // Ulica boczna odchodzi od GÓRNEJ krawędzi głównej jezdni.
  // Chodniki są zawsze poza obrysem asfaltu, po obu zewnętrznych stronach.
  const SIDE_ROAD_X = 0;
  const SIDEWALK_GAP = 0.15;
  const MAIN_ROAD_NORTH_EDGE = ROAD_Z + ROAD_W/2;
  const SIDE_ROAD_START = MAIN_ROAD_NORTH_EDGE;
  const SIDE_ROAD_END = 72;
  const SIDE_ROAD_LEN = SIDE_ROAD_END - SIDE_ROAD_START;
  const SIDE_ROAD_CENTER = (SIDE_ROAD_START + SIDE_ROAD_END) / 2;
  const SIDEWALK_OFFSET = ROAD_W/2 + SIDEWALK_GAP + SIDEWALK_W/2;
  // Ulica Poprzeczna: w prawo (+z) z Długiej, za domem nr 10 – salon samochodowy po wschodniej stronie
  const POP_X = 78, POP_END = 62, POP_EDGE = ROAD_W/2 + SIDEWALK_GAP + SIDEWALK_W;   // POP_EDGE = 8.15
  // Ulica Górnicza: odchodzi z Długiej na północ (−z) w przerwie między domami nr 5 (x=38) i nr 6 (x=58); wąska, bo przerwa ma tylko ~11 m
  const GORN_X = 47.75, GORN_W = 7, GORN_SW = 1.2, GORN_END = -92, GORN_START = ROAD_Z - ROAD_W/2;
  const GORN_EDGE = GORN_W/2 + SIDEWALK_GAP + GORN_SW;                                // połowa szerokości z chodnikami (4,85)
  const MINE_ROCKS = []; let mineRocksHidden = false;                                  // skały zewnętrznego wzgórza – chowane, gdy gracz jest w środku kopalni
  let MINE_GROUND = null;                                                              // ustawiane przez kopalnię: wysokość wykopanego terenu
  const MINE = {x:37.5, z:-62, depth:16.5};                                           // wejście do kopalni po lewej (zachodniej) stronie Górniczej, wejściem na wschód; x – lico skały

  // Dwa chodniki przy głównej ulicy. Przy wlocie bocznej ulicy
  // górny chodnik jest przerwany, żeby nie przecinał skrzyżowania.
  const junctionHalfWidth = ROAD_W/2 + SIDEWALK_W + SIDEWALK_GAP;
  [-1, 1].forEach(side => {
    const z = ROAD_Z + side*SIDEWALK_OFFSET;
    if (side === 1) {
      const segmentLen = (ROAD_LEN - junctionHalfWidth*2) / 2;
      [-1, 1].forEach(direction => {
        // wschodni odcinek (od x=8,15 do 80) jest przerwany na wlocie ulicy Poprzecznej
        const pieces = direction === -1 ? [[WR.x + WR.rOut, -junctionHalfWidth]]
          : [[junctionHalfWidth, POP_X - POP_EDGE], [POP_X + POP_EDGE, junctionHalfWidth + segmentLen]];
        pieces.forEach(([x0, x1]) => {
          const sidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(x1 - x0, 0.2, SIDEWALK_W), walkMat
          );
          sidewalk.position.set((x0 + x1)/2, 0.1, z);
          sidewalk.receiveShadow = true;
          street.add(sidewalk);
        });
      });
    } else {
      [[WR.x + WR.rOut, GORN_X - GORN_EDGE], [GORN_X + GORN_EDGE, ROAD_LEN/2]].forEach(([x0, x1]) => {   // chodnik od ronda do x=80, przerwany na wlocie ulicy Górniczej
        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.2, SIDEWALK_W), walkMat);
        sidewalk.position.set((x0 + x1)/2, 0.1, z);
        sidewalk.receiveShadow = true;
        street.add(sidewalk);
      });
    }
  });

  const sideRoad = new THREE.Group();
  // Ta sama tekstura asfaltu (z liniami) co na ulicy Długiej; tekstura biegnie wzdłuż ulicy, więc jezdnia leży w obróconej grupie.
  const sideRoadTex = roadTex.clone(); sideRoadTex.needsUpdate = true; sideRoadTex.repeat.set(SIDE_ROAD_LEN/TILE, 1);
  const sideRoadG = new THREE.Group();
  sideRoadG.position.set(SIDE_ROAD_X, 0, SIDE_ROAD_CENTER); sideRoadG.rotation.y = Math.PI/2;
  const sideRoadMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(SIDE_ROAD_LEN, ROAD_W),
    new THREE.MeshLambertMaterial({map:sideRoadTex})
  );
  sideRoadMesh.rotation.x = -Math.PI/2;
  sideRoadMesh.position.y = 0.025;
  sideRoadMesh.receiveShadow = true;
  sideRoadG.add(sideRoadMesh);
  sideRoad.add(sideRoadG);

  // Chodniki bocznej ulicy: wyłącznie po lewej i prawej stronie asfaltu.
  // Ich wewnętrzne krawędzie są odsunięte od jezdni o mały margines.
  [-1,1].forEach(side => {
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(SIDEWALK_W,0.2,SIDE_ROAD_LEN), walkMat
    );
    sidewalk.position.set(
      SIDE_ROAD_X + side*SIDEWALK_OFFSET,
      0.1,
      SIDE_ROAD_CENTER
    );
    sidewalk.receiveShadow = true;
    sideRoad.add(sidewalk);
  });
  street.add(sideRoad);

  // Ulica Poprzeczna (x = POP_X, od krawędzi Długiej w stronę +z)
  (function buildPoprzeczna(){
    const len = POP_END - SIDE_ROAD_START;
    const tex = roadTex.clone(); tex.needsUpdate = true; tex.repeat.set(len/TILE, 1);
    const g = new THREE.Group(); g.position.set(POP_X, 0, (SIDE_ROAD_START + POP_END)/2); g.rotation.y = Math.PI/2;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, ROAD_W), new THREE.MeshLambertMaterial({map:tex}));
    mesh.rotation.x = -Math.PI/2; mesh.position.y = 0.025; mesh.receiveShadow = true; g.add(mesh); street.add(g);
    [-1,1].forEach(sd => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_W, 0.2, len), walkMat);
      sw.position.set(POP_X + sd*SIDEWALK_OFFSET, 0.1, (SIDE_ROAD_START + POP_END)/2); sw.receiveShadow = true; street.add(sw);
    });
    // tabliczka „POPRZECZNA” (czytelna z Długiej i z ulicy)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const c2 = cv.getContext('2d'); c2.fillStyle = '#174b78'; c2.fillRect(0,0,512,128);
    c2.strokeStyle = '#fff'; c2.lineWidth = 9; c2.strokeRect(6,6,500,116);
    c2.fillStyle = '#fff'; c2.font = 'bold 60px sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('POPRZECZNA', 256, 66);
    const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 8;
    const px = POP_X - 7.2, pz = SIDE_ROAD_START + 4.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10), new THREE.MeshLambertMaterial({color:0x55585c}));
    pole.position.set(px, 1.6, pz); pole.castShadow = true; street.add(pole); solidPole(px, pz);
    [1,-1].forEach(sd => {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.64), new THREE.MeshBasicMaterial({map:tx, side:THREE.FrontSide}));
      face.position.set(px + sd*0.11, 2.65, pz); face.rotation.y = sd > 0 ? Math.PI/2 : -Math.PI/2; street.add(face);
    });
  })();

  // Ulica Górnicza (x = GORN_X, od krawędzi Długiej w stronę −z, do ślepego końca)
  (function buildGornicza(){
    const len = GORN_START - GORN_END, cz = (GORN_START + GORN_END)/2;
    const tex = roadTex.clone(); tex.needsUpdate = true; tex.repeat.set(len/TILE, 1);
    const g = new THREE.Group(); g.position.set(GORN_X, 0, cz); g.rotation.y = Math.PI/2;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, GORN_W), new THREE.MeshLambertMaterial({map:tex}));
    mesh.rotation.x = -Math.PI/2; mesh.position.y = 0.025; mesh.receiveShadow = true; g.add(mesh); street.add(g);
    [-1,1].forEach(sd => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(GORN_SW, 0.2, len), walkMat);
      sw.position.set(GORN_X + sd*(GORN_W/2 + SIDEWALK_GAP + GORN_SW/2), 0.1, cz); sw.receiveShadow = true; street.add(sw);
    });
    // tabliczka „GÓRNICZA” na rogu skrzyżowania (na chodniku Długiej, po zachodniej stronie wlotu)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const c2 = cv.getContext('2d'); c2.fillStyle = '#174b78'; c2.fillRect(0,0,512,128);
    c2.strokeStyle = '#fff'; c2.lineWidth = 9; c2.strokeRect(6,6,500,116);
    c2.fillStyle = '#fff'; c2.font = 'bold 60px sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('GÓRNICZA', 256, 66);
    const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 8;
    const px = GORN_X - GORN_EDGE - 0.6, pz = ROAD_Z - ROAD_W/2 - 1.9;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10), new THREE.MeshLambertMaterial({color:0x55585c}));
    pole.position.set(px, 1.6, pz); pole.castShadow = true; street.add(pole); solidPole(px, pz);
    [1,-1].forEach(sd => {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.64), new THREE.MeshBasicMaterial({map:tx, side:THREE.FrontSide}));
      face.position.set(px + sd*0.11, 2.65, pz); face.rotation.y = sd > 0 ? Math.PI/2 : -Math.PI/2; street.add(face);
    });
    // zakończenie ulicy: biało-czerwona rogatka (ślepy koniec)
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 32; const bg = bc.getContext('2d');
    for(let i=0;i<8;i++){ bg.fillStyle = i%2 ? '#f4f4f4' : '#d32f2f'; bg.fillRect(i*32,0,32,32); }
    const bt = new THREE.CanvasTexture(bc);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(GORN_W - 1, 0.22, 0.12), new THREE.MeshLambertMaterial({map:bt}));
    bar.position.set(GORN_X, 1.0, GORN_END + 1); bar.castShadow = true; street.add(bar);
    [-1,1].forEach(sd => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), new THREE.MeshLambertMaterial({color:0x55585c})); post.position.set(GORN_X + sd*(GORN_W/2 - 0.4), 0.6, GORN_END + 1); street.add(post); });
  })();

  // Nazwy ulic na tabliczkach przy skrzyżowaniu.
  const streetSignPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10),
    new THREE.MeshLambertMaterial({color:0x55585c})
  );
  streetSignPole.position.set(7.2, 1.6, ROAD_Z + ROAD_W/2 + 1.1); solidPole(7.2, ROAD_Z + ROAD_W/2 + 1.1);
  street.add(streetSignPole);
  function addStreetNameSign(name, y, rotationY=0) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#174b78'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 68px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 66);
    // Dwie jednostronne tabliczki plecami do siebie (po obu stronach słupka), każda z tekstem
    // czytelnym (nie odbitym lustrzanie) – napis jest poprawny z każdej strony.
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    const signGroup = new THREE.Group();
    signGroup.position.set(7.2, y, ROAD_Z + ROAD_W/2 + 1.1);
    signGroup.rotation.y = rotationY;
    const OFF = 0.11;                                            // poza średnicą słupka, żeby go nie przesłaniał
    [1, -1].forEach(side => {
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(2.55, 0.64),
        new THREE.MeshBasicMaterial({map:tex, side:THREE.FrontSide})
      );
      face.position.z = side*OFF;
      if(side < 0) face.rotation.y = Math.PI;
      signGroup.add(face);
    });
    street.add(signGroup);
  }
  addStreetNameSign('DŁUGA', 2.65, 0);
  addStreetNameSign('KRÓTKA', 1.95, Math.PI/2);

  // ===== Pierwszeństwo na skrzyżowaniu: Długa = droga z pierwszeństwem (D-3), Krótka = podporządkowana (A-7) =====
  (function buildPriorityRules(){
    const poleMat = new THREE.MeshLambertMaterial({color:0x55585c});
    const mkTex = (draw) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
    };
    // D-3 "droga z pierwszeństwem": żółty romb z białą obwódką i czarnym obrysem
    const d3Tex = mkTex(g => {
      const poly = (r, fill, stroke, lw) => {
        g.beginPath(); g.moveTo(128,128-r); g.lineTo(128+r,128); g.lineTo(128,128+r); g.lineTo(128-r,128); g.closePath();
        if(fill){ g.fillStyle = fill; g.fill(); } if(stroke){ g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
      };
      poly(124, '#111111');
      poly(116, '#ffffff');
      poly(88,  '#f7c600');
    });
    // A-7 "ustąp pierwszeństwa": trójkąt wierzchołkiem w dół, biały z czerwoną obwódką
    const a7Tex = mkTex(g => {
      const tri = (inset, fill) => {
        g.beginPath(); g.moveTo(8+inset*1.15,22+inset*0.6); g.lineTo(248-inset*1.15,22+inset*0.6); g.lineTo(128,238-inset*1.55); g.closePath();
        g.fillStyle = fill; g.fill();
      };
      g.lineJoin = 'round';
      tri(0, '#d4141c'); tri(30, '#ffffff');
    });
    const placeSign = (tex, x, z, rotY, size, isTriangle) => {
      const signY = 2.4, OFFN = 0.08;   // środek znaku; znak przesunięty przed słupek, żeby go nie przebijał
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,signY,8), poleMat);
      pole.position.set(x, signY/2, z); pole.castShadow = true; street.add(pole); solidPole(x, z);   // słupek kończy się za środkiem znaku
      const g = new THREE.Group(); g.position.set(x + Math.sin(rotY)*OFFN, signY, z + Math.cos(rotY)*OFFN); g.rotation.y = rotY;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({color:0x9aa0a6, side:THREE.BackSide}));
      back.position.z = -0.02; g.add(back);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({map:tex, transparent:true, alphaTest:0.3, side:THREE.FrontSide}));
      face.position.z = 0.02; g.add(face);
      // szara tarcza z tyłu przycięta do kształtu znaku (tło tylko dla czytelności z tyłu)
      back.material.alphaMap = tex; back.material.transparent = true; back.material.alphaTest = 0.3;
      street.add(g);
    };
    const MAIN_N = ROAD_Z + ROAD_W/2 + 0.9;   // prawa strona dla jadących na wschód (po stronie skrzyżowania)
    const MAIN_S = ROAD_Z - ROAD_W/2 - 0.9;   // prawa strona dla jadących na zachód
    // D-3 na Długiej, przed skrzyżowaniem, dla obu kierunków (tarcza zwrócona do nadjeżdżających)
    placeSign(d3Tex, -12, MAIN_N, -Math.PI/2, 0.95, false);   // jadący na wschód (+x), normalna znaku = -x
    placeSign(d3Tex,  12, MAIN_S,  Math.PI/2, 0.95, false);   // jadący na zachód (-x), normalna znaku = +x
    // A-7 na Krótkiej, przy wjeździe na skrzyżowanie, po prawej stronie jadących w stronę Długiej (-z)
    placeSign(a7Tex, SIDE_ROAD_X + ROAD_W/2 + 0.8, SIDE_ROAD_START + 2.2, 0, 0.95, true);   // normalna znaku = +z (do nadjeżdżających)
    // A-7 także na Poprzecznej – tak samo jak na Krótkiej, po prawej stronie jadących w stronę Długiej
    placeSign(a7Tex, POP_X + ROAD_W/2 + 0.8, SIDE_ROAD_START + 2.2, 0, 0.95, true);
    // P-13 linia warunkowego zatrzymania (przerywana) w poprzek pasa jadącego w stronę Długiej
    const lineMat = new THREE.MeshLambertMaterial({color:0xf4f4f4});
    for(let x = SIDE_ROAD_X + 0.4; x < SIDE_ROAD_X + ROAD_W/2 - 0.3; x += 1.2){
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.012, 0.35), lineMat);
      dash.position.set(x + 0.4, 0.036, SIDE_ROAD_START + 1.0); dash.receiveShadow = true; street.add(dash);
    }
    for(let x = POP_X + 0.4; x < POP_X + ROAD_W/2 - 0.3; x += 1.2){                 // P-13 także na Poprzecznej
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.012, 0.35), lineMat);
      dash.position.set(x + 0.4, 0.036, SIDE_ROAD_START + 1.0); dash.receiveShadow = true; street.add(dash);
    }
  })();

  // Przejście dla pieszych na ulicy Długiej: między sklepem (x=18) a domem nr 4 (x=18, po drugiej stronie jezdni)
  (function buildCrosswalk(){
    const CW_X = 18, stripeMat = new THREE.MeshLambertMaterial({color:0xf4f4f4});
    for(let i=-4;i<=4;i++){   // pasy równoległe do chodnika, rozmieszczone w poprzek jezdni
      const st = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.012, 0.55), stripeMat);
      st.position.set(CW_X, 0.032, ROAD_Z + i*1.0); st.receiveShadow = true; street.add(st);
    }
    // znaki "przejście dla pieszych" po obu stronach jezdni
    const poleMat = new THREE.MeshLambertMaterial({color:0x55585c});
    const signMat = new THREE.MeshLambertMaterial({color:0x1e66c8});
    const whiteMat = new THREE.MeshLambertMaterial({color:0xffffff});
    [-1,1].forEach(side => {
      const z = ROAD_Z + side*(ROAD_W/2 + 0.15 + 2.6);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.6,8), poleMat);
      pole.position.set(CW_X + 3.2, 1.4, z); pole.castShadow = true; street.add(pole); solidPole(CW_X + 3.2, z);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.7,0.06), signMat);
      plate.position.set(CW_X + 3.2, 2.75, z); plate.rotation.y = side > 0 ? 0 : Math.PI; street.add(plate);
      const tri = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.36,0.02), whiteMat);
      tri.position.set(CW_X + 3.2, 2.75, z + (side > 0 ? -0.04 : 0.04)); tri.rotation.y = plate.rotation.y; street.add(tri);
    });
  })();
  scene.add(street);

  // Sklep
  const SHOP = {x:18, z:-3, w:10, d:6, h:3.6};
  // Dom gracza przy krótkiej ulicy (x=0), drzwiami (lokalne +z) zwrócony w stronę jezdni.
  const HOME = {x:14, z:10, w:9, d:8, h:3.5, rot:-Math.PI/2};   // AKTYWNY dom (ten, w którym jesteś); jego położenie podmienia setActiveHome()
  const HOMES = [                                               // domy gracza – do wynajęcia (B: 30 monet / dobę, pozostałe: 20)
    {id:'A', label:'Dom A', x:14,  z:10, rot:-Math.PI/2, rented:false, paidUntil:0, exterior:[]},
    {id:'B', label:'Dom B', x:-15, z:19, w:14, d:10, rot: Math.PI/2, rented:false, paidUntil:0, exterior:[]},   // większy: 14 × 10, trzy pomieszczenia (salon z kuchnią, sypialnia, łazienka)
    // ulica Społeczna (prawy zjazd z ronda): zachodnia strona – drzwi na wschód, wschodnia – drzwi na zachód
    {id:'C', label:'Dom C', x:116, z:14, rot: Math.PI/2, rented:false, paidUntil:0, exterior:[]},
    {id:'D', label:'Dom D', x:116, z:33, rot: Math.PI/2, rented:false, paidUntil:0, exterior:[]},
    {id:'E', label:'Dom E', x:116, z:52, rot: Math.PI/2, rented:false, paidUntil:0, exterior:[]},
    {id:'F', label:'Dom F', x:144, z:14, rot:-Math.PI/2, rented:false, paidUntil:0, exterior:[]},
    {id:'G', label:'Dom G', x:144, z:33, rot:-Math.PI/2, rented:false, paidUntil:0, exterior:[]}
  ];
  let homeCur = HOMES[0];
  // Układ wnętrza (współrzędne lokalne domu: +z = przód z drzwiami, x w poprzek). Standardowy dom ma jedno pomieszczenie 9 × 8.
  const HOME_LAY_STD = {bed:{x:-2.4,z:-1.5}, fridge:{x:2.8,z:-2.5}, outlet:{x:0.6,z:-3.6}, sleep:{x:-2.4,z:-0.7}, wake:{x:-0.6,z:-1.0}, rooms:false, reserve:[]};
  // Dom B (14 × 10): z = 0 – ściana działowa; z przodu salon z kuchnią (drzwi wejściowe), z tyłu po lewej sypialnia, po prawej łazienka (przejścia na x = ∓3,5)
  const HOME_LAY_B = {bed:{x:-4.4,z:-3.0}, fridge:{x:5.6,z:0.6}, outlet:{x:-1.8,z:0.55,wallZ:0.14}, sleep:{x:-4.4,z:-2.2}, wake:{x:-2.6,z:-2.5}, rooms:true, reserve:[[-3.5,0,1.8,1.8],[3.5,0,1.8,1.8]]};
  function homeDimsOf(H){ const q = Math.abs(Math.sin(H.rot)) > 0.5, w = H.w || 9, d = H.d || 8; return {w, d, ww:q ? d : w, wd:q ? w : d}; }
  function setActiveHome(H){
    homeCur = H; HOME.x = H.x; HOME.z = H.z; HOME.rot = H.rot;
    const D = homeDimsOf(H); HOME.w = D.w; HOME.d = D.d; HOME.ww = D.ww; HOME.wd = D.wd;
    HOME.lay = H.id === 'B' ? HOME_LAY_B : HOME_LAY_STD;
  }
  const homeQuarter = Math.abs(Math.sin(HOME.rot)) > 0.5;      // obrócony o 90° – wymiary w świecie zamienione
  HOME.ww = homeQuarter ? HOME.d : HOME.w;                      // szerokość w osi X świata
  HOME.wd = homeQuarter ? HOME.w : HOME.d;                      // głębokość w osi Z świata
  function homeW(lx, lz){                                       // punkt lokalny domu -> współrzędne świata
    const c = Math.cos(HOME.rot), sn = Math.sin(HOME.rot);
    return {x: HOME.x + lx*c + lz*sn, z: HOME.z - lx*sn + lz*c};
  }
  function homeRect(lx, lz, bw, bd){                            // prostokąt kolizji w świecie
    const q = homeW(lx, lz);
    return homeQuarter ? {x:q.x, z:q.z, w:bd, d:bw} : {x:q.x, z:q.z, w:bw, d:bd};
  }
  const BUILDINGS = [{x:SHOP.x, z:SHOP.z, w:SHOP.w, d:SHOP.d, open:true}];
  function inShop(x, z, m){ return BUILDINGS.some(b => Math.abs(x-b.x) < b.w/2+m && Math.abs(z-b.z) < b.d/2+m); }

  // Domy przy drodze
  const HOUSES = [];
  (function buildHouses(){
    const walls = [0xf3e5c8,0xcfd8dc,0xf5c6a5,0xc8e6c9,0xffe0b2,0xd7ccc8];
    const roofs = [0x8d3b2e,0x4e5d6c,0x6d4c41,0x37474f];
    const doors = [0x5a3820,0x2e5f8a,0x7a2e2e,0x2e6b3a];
    const roofGeo = new THREE.ConeGeometry(1, 1, 4); roofGeo.rotateY(Math.PI/4);
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    function house(x, z, w, d, h, i, front, sideStreet=false){
      const g = new THREE.Group();
      const add = (geo, c, px, py, pz) => { const m = new THREE.Mesh(geo, lamb(c)); m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      add(new THREE.BoxGeometry(w,h,d), walls[i%walls.length], 0, h/2, 0);
      const rh = 2.2;
      const roof = add(roofGeo, roofs[i%roofs.length], 0, h + rh/2, 0);
      roof.scale.set((w+0.9)/Math.SQRT2, rh, (d+0.9)/Math.SQRT2);
      add(new THREE.BoxGeometry(1.3,2.3,0.1), doors[i%doors.length], 0, 1.15, d/2+0.05);
      add(new THREE.BoxGeometry(1.8,0.15,0.8), 0x9e9e9e, 0, 0.075, d/2+0.4);
      [-1,1].forEach(s => add(new THREE.BoxGeometry(1.6,1.2,0.08), 0x9fd3f0, s*(w/2-1.7), 1.9, d/2+0.04));
      add(new THREE.BoxGeometry(0.6,1.4,0.6), 0x8d6e63, -w/4, h+1.5, -d/4);
      g.position.set(x, 0, z);
      g.rotation.y = sideStreet ? (x < 0 ? Math.PI/2 : -Math.PI/2) : (front > 0 ? 0 : Math.PI);
      scene.add(g);
      BUILDINGS.push({x, z, w:sideStreet ? d : w, d:sideStreet ? w : d});
      const no = HOUSES.length + 1;                               // tabliczka z numerem nad drzwiami
      const nc = document.createElement('canvas'); nc.width = 128; nc.height = 80;
      const ng = nc.getContext('2d');
      ng.fillStyle = '#fff'; ng.fillRect(0,0,128,80);
      ng.strokeStyle = '#1b3a5c'; ng.lineWidth = 6; ng.strokeRect(3,3,122,74);
      ng.fillStyle = '#1b3a5c'; ng.font = 'bold 54px sans-serif'; ng.textAlign = 'center'; ng.textBaseline = 'middle';
      ng.fillText(String(no), 64, 44);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.375), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(nc)}));
      plate.position.set(0, 2.7, d/2 + 0.04); g.add(plate);
      const doorX = sideStreet ? x + (x < 0 ? d/2 : -d/2) : x;
      const doorZ = sideStreet ? z : z + (front > 0 ? d/2 : -d/2);
      HOUSES.push({no, x, z, dx:doorX, dz:doorZ});
    }
    [-62,-42,-24,18,38,58].forEach((x,i) => house(x, -26.5, 7 + i%3, 6, 3.4 + (i%3)*0.4, i, 1));      // po drugiej stronie drogi
    [-55,-33,42,64].forEach((x,i) => house(x, -1.5, 7 + (i+1)%3, 6, 3.6 + (i%2)*0.5, i+2, -1));       // po stronie startu
    // Domy po obu stronach nowej ulicy, zwrócone wejściami w jej stronę.
    [-13,13].forEach((x,side) => [1,19,37,55].forEach((z,j) => {
      const idx = 10 + side*4 + j;
      if(x === -13 && z === 19){ HOUSES.push({no:HOUSES.length+1, skip:true}); return; }   // nr 12: zamiast domu stoi drugi dom gracza (Dom B)
      house(x,z,7,6,3.5+(j%2)*0.3,idx,1,true);
    }));
  })();

  // ===== Przedłużenie ulicy Długiej, rondo i zjazd do przyszłego supermarketu =====
  // Jadąc Długą na wschód (+x) za domami nr 10 i 6: rondo, a jego lewy zjazd (w stronę -z) prowadzi do wielkiego, pustego budynku.
  const RB = {x:130, z:ROAD_Z, rOut:14, rIn:5.5};

  // ===== Wzgórze za ulicą Społeczną: ulica biegnie dalej na południe (+z) i wspina się na podwyższony teren =====
  const SPOL_END = 84;                                                // dotychczasowy koniec jezdni Społecznej
  // Ścieżka przedłużonej Społecznej: od z=84 prosto na południe do z=134, łuk (R=16) i dalej prosto na zachód wzdłuż z=150 aż do x=0
  const SPOL_TURN_R = 16, SPOL_TURN_Z = 150, SPOL_WEST_END = 0;
  const SPOL_PATH = (function(){
    const pts = [[RB.x, SPOL_END], [RB.x, SPOL_TURN_Z - SPOL_TURN_R]];
    const cx = RB.x - SPOL_TURN_R, cz = SPOL_TURN_Z - SPOL_TURN_R;
    for(let i=1;i<=12;i++){ const a = i/12*Math.PI/2; pts.push([cx + Math.cos(a)*SPOL_TURN_R, cz + Math.sin(a)*SPOL_TURN_R]); }
    pts.push([SPOL_WEST_END, SPOL_TURN_Z]);
    return pts;
  })();
  const HILL = {zMin:92, zStart:96, zTop:SPOL_TURN_Z - SPOL_TURN_R, h:7, flatHalf:15, fadeHalf:24};
  const sstep = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3 - 2*t); };
  function pathNearest(x, z){                                         // najbliższy punkt ścieżki: {d, qz}
    let bd = Infinity, bqz = 0;
    for(let i=0;i<SPOL_PATH.length-1;i++){
      const ax = SPOL_PATH[i][0], az = SPOL_PATH[i][1], bx = SPOL_PATH[i+1][0], bz = SPOL_PATH[i+1][1];
      const vx = bx - ax, vz = bz - az, L2 = vx*vx + vz*vz;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((x-ax)*vx + (z-az)*vz)/L2)) : 0;
      const qx = ax + vx*t, qz = az + vz*t, d = Math.hypot(x - qx, z - qz);
      if(d < bd){ bd = d; bqz = qz; }
    }
    return {d:bd, qz:bqz};
  }
  const HILL_REACH = HILL.flatHalf + HILL.fadeHalf;
  const STATION = {x:67, z:170, w:34, d:22, blend:12, y:HILL.h + 0.2};   // stacja paliw: płaska platforma (w – wzdłuż X, d – wzdłuż Z) na poziomie chodnika Społecznej
  // PKS (dworzec autobusowy): płaski plac za stacją paliw, na tym samym poziomie co stacja. Dojazd: w lewo ze Społecznej (jadąc na zachód) w osi x = jx.
  const PKS = {x:17, z:178, w:62, d:30, blend:12, y:HILL.h + 0.2, jx:38, zq:177.5};   // plac x -14…48, z 163…193; zq – oś pasa ze stanowiskami
  function platBlend(h, x, z, P){                                     // wtopienie płaskiej platformy P w teren o wysokości h
    const ex = Math.abs(x - P.x) - P.w/2, ez = Math.abs(z - P.z) - P.d/2;
    if(ex >= P.blend || ez >= P.blend) return h;
    const t = 1 - sstep(Math.hypot(Math.max(0, ex), Math.max(0, ez))/P.blend);
    return h + (P.y - h)*t;
  }
  function terrainH(x, z){                                            // wysokość terenu (0 na całej reszcie mapy) z platformami stacji i PKS
    return platBlend(platBlend(hillH(x, z), x, z, STATION), x, z, PKS);
  }
  function hillH(x, z){                                               // wysokość samego wzgórza
    if(z <= HILL.zMin || z > SPOL_TURN_Z + HILL_REACH || x < SPOL_WEST_END - HILL_REACH || x > RB.x + HILL_REACH) return 0;
    const n = pathNearest(x, z);
    const side = 1 - sstep((n.d - HILL.flatHalf)/HILL.fadeHalf);
    if(side <= 0) return 0;
    return HILL.h * sstep((n.qz - HILL.zStart)/(HILL.zTop - HILL.zStart)) * side;
  }
  const HILL_BOX = {minX: SPOL_WEST_END - HILL_REACH, maxX: RB.x + HILL_REACH, minZ: HILL.zMin, maxZ: Math.max(SPOL_TURN_Z + HILL_REACH, STATION.z + STATION.d/2 + STATION.blend, PKS.z + PKS.d/2 + PKS.blend)};
  // Zasięg świata widoczny na mapie. Mapa sama dobiera skalę tak, by zmieścić WSZYSTKIE zarejestrowane prostokąty –
  // gdy dodasz nowy teren, wywołaj registerMapExtent(minX, minZ, maxX, maxZ), a mapa się oddali.
  const MAP_EXTENTS = [{minX:-96, maxX:152, minZ:-94, maxZ:92}];
  const registerMapExtent = (minX, minZ, maxX, maxZ) => MAP_EXTENTS.push({minX, maxX, minZ, maxZ});
  registerMapExtent(HILL_BOX.minX, HILL_BOX.minZ, HILL_BOX.maxX, HILL_BOX.maxZ);
  const onHill = (x, z, m) => z > HILL.zMin - m && pathNearest(x, z).d < HILL_REACH + m;
  const AGD = {x:90, z:-74, w:26, d:20, h:5.4};                      // sklep AGD obok Pandy (po zachodniej stronie), front (+z) na z = -64
  const SUPER = {x:130, z:-76, w:44, d:24, h:7.5};                 // front budynku (+z) na z = -64
  const PAINT = {x:93, z:46, w:12, d:9, h:3.8};                    // lakiernik za salonem (dalej wzdłuż Poprzecznej)
  const MECH = {x:62, z:42, w:14, d:11, h:4.4};                    // mechanik po zachodniej stronie Poprzecznej (naprzeciw salonu i lakiernika); drzwi na wschód, wjazd autem
  const CAR = {x:93, z:25, w:16, d:10, h:4.2};                     // salon samochodowy: w – wzdłuż Z świata, d – wzdłuż X
  const ROUND_COLL = [];                                            // kolizje wyspy środkowej (okręgi, jak pnie drzew)
  const NEW_STREET_EDGE = ROAD_W/2 + SIDEWALK_GAP + SIDEWALK_W;
  const onNewStreets = (x, z, m) =>
    Math.hypot(x - WR.x, z - WR.z) < WR.rOut + 3 + m ||                                         // zachodnie rondo z chodnikiem
    Math.hypot(x - RB.x, z - RB.z) < RB.rOut + 3 + m ||                                         // rondo z chodnikiem
    (x > 78 - m && x < RB.x && Math.abs(z - ROAD_Z) < NEW_STREET_EDGE + m) ||                   // przedłużenie Długiej
    (Math.abs(x - RB.x) < NEW_STREET_EDGE + m && z < RB.z && z > SUPER.z + SUPER.d/2 - m) ||    // zjazd do supermarketu
    (Math.abs(x - SUPER.x) < SUPER.w/2 + m && z < -44 + m && z > SUPER.z - SUPER.d/2 - m) ||    // parking i budynek (plac sięga do z = -44)
    (Math.abs(x - (AGD.x + 2)) < 16 + m && z < -44 + m && z > AGD.z - AGD.d/2 - m) ||           // sklep AGD z parkingiem (plac sięga do z = -44)
    (Math.abs(x - RB.x) < 22 + m && z > RB.z + 8 - m && z < 90 + m) ||                          // ulica Społeczna z domami i sklepem odzieżowym
    (Math.abs(x - POP_X) < POP_EDGE + m && z > SIDE_ROAD_START - m && z < POP_END + m) ||       // ulica Poprzeczna
    (Math.abs(x - GORN_X) < GORN_EDGE + m && z < GORN_START + m && z > GORN_END - m) ||         // ulica Górnicza
    (x > MINE.x - 32 - m && x < GORN_X - GORN_EDGE + m && Math.abs(z - MINE.z) < 14 + m) ||     // kopalnia z placem
    onHill(x, z, m) ||                                                                          // wzgórze za Społeczną
    (Math.abs(x - PKS.x) < PKS.w/2 + PKS.blend + m && Math.abs(z - PKS.z) < PKS.d/2 + PKS.blend + m) ||   // plac PKS
    (Math.abs(x - CAR.x) < CAR.d/2 + 2 + m && Math.abs(z - CAR.z) < CAR.w/2 + 2 + m) ||        // salon samochodowy
    (Math.abs(x - MECH.x) < MECH.d/2 + 4 + m && Math.abs(z - MECH.z) < MECH.w/2 + 2 + m) ||    // mechanik
    (Math.abs(x - PAINT.x) < PAINT.d/2 + 2 + m && Math.abs(z - PAINT.z) < PAINT.w/2 + 2 + m);  // lakiernik                            // ulica Społeczna z domami i sklepem odzieżowym
  (function buildWestRoundabout(){   // rondo na końcu Długiej (x=-80, z=-15): tarcza asfaltu, wyspa z drzewem, wlot tylko od wschodu
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g2 = cv.getContext('2d'); g2.fillStyle = '#3b3b40'; g2.fillRect(0,0,256,256);
    for(let i=0;i<2500;i++){ const v = 40 + Math.random()*35; g2.fillStyle = `rgb(${v},${v},${v+4})`; g2.fillRect(Math.random()*256, Math.random()*256, 2, 2); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(WR.rOut*2/TILE, WR.rOut*2/TILE); tex.anisotropy = 8;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(WR.rOut, 72), new THREE.MeshLambertMaterial({map:tex}));
    disc.rotation.x = -Math.PI/2; disc.position.set(WR.x, 0.03, WR.z); disc.receiveShadow = true; street.add(disc);
    const gap = 0.47, edgeMat = new THREE.MeshBasicMaterial({color:0xe8e8e8});      // biała krawędź z przerwą przy wlocie od wschodu
    const arc = new THREE.Mesh(new THREE.RingGeometry(WR.rOut-0.55, WR.rOut-0.4, 64, 1, gap, Math.PI*2 - 2*gap), edgeMat);
    arc.rotation.x = -Math.PI/2; arc.position.set(WR.x, 0.04, WR.z); street.add(arc);
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(WR.rIn+0.3, WR.rIn+0.3, 0.2, 48), lamb(0xb8b8b0));
    curb.position.set(WR.x, 0.1, WR.z); curb.receiveShadow = true; street.add(curb);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(WR.rIn, WR.rIn, 0.26, 48), lamb(0x5f9a4a));
    grass.position.set(WR.x, 0.13, WR.z); grass.receiveShadow = true; street.add(grass);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), lamb(0x6b4423));
    trunk.position.set(WR.x, 1.76, WR.z); trunk.castShadow = true; street.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 1), new THREE.MeshLambertMaterial({color:0x3f8f3a, flatShading:true}));
    crown.position.set(WR.x, 4.6, WR.z); crown.castShadow = true; street.add(crown);
    for(let i=0;i<36;i++){ const a = i/36*Math.PI*2; ROUND_COLL.push({x: WR.x + Math.cos(a)*5.0, z: WR.z + Math.sin(a)*5.0, r: 0.4}); }   // wyspa jest przeszkodą
  })();
  (function buildRoundabout(){
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const asphaltTex = len => { const t = roadTex.clone(); t.needsUpdate = true; t.repeat.set(len/TILE, 1); return t; };
    // 1) przedłużenie głównej jezdni od x=80 do ronda
    const extLen = (RB.x - 12.5) - 80;
    const ext = new THREE.Mesh(new THREE.PlaneGeometry(extLen, ROAD_W), new THREE.MeshLambertMaterial({map:asphaltTex(extLen)}));
    ext.rotation.x = -Math.PI/2; ext.position.set(80 + extLen/2, 0.02, ROAD_Z); ext.receiveShadow = true; street.add(ext);
    // chodniki wzdłuż przedłużenia
    [-1,1].forEach(sd => {
      const sx0 = sd === 1 ? POP_X + POP_EDGE : 80, swLen = (RB.x - 14) - sx0;   // północny chodnik zaczyna się za wlotem Poprzecznej
      const sw = new THREE.Mesh(new THREE.BoxGeometry(swLen, 0.2, SIDEWALK_W), walkMat);
      sw.position.set(sx0 + swLen/2, 0.1, ROAD_Z + sd*SIDEWALK_OFFSET); sw.receiveShadow = true; street.add(sw);
    });
    // 2) rondo: asfaltowa tarcza, białe łuki krawędzi (z przerwami przy wjazdach), wyspa z drzewem
    const grainTex = (rx, ry) => {                                   // asfalt jak na Długiej (te same kolory i ziarno), bez linii
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const g2 = cv.getContext('2d'); g2.fillStyle = '#3b3b40'; g2.fillRect(0,0,256,256);
      for(let i=0;i<2500;i++){ const v = 40 + Math.random()*35; g2.fillStyle = `rgb(${v},${v},${v+4})`; g2.fillRect(Math.random()*256, Math.random()*256, 2, 2); }
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
    };
    const disc = new THREE.Mesh(new THREE.CircleGeometry(RB.rOut, 72), new THREE.MeshLambertMaterial({map:grainTex(RB.rOut*2/TILE, RB.rOut*2/TILE)}));
    disc.rotation.x = -Math.PI/2; disc.position.set(RB.x, 0.03, RB.z); disc.receiveShadow = true; street.add(disc);
    const gap = 0.47, edgeMat = new THREE.MeshBasicMaterial({color:0xe8e8e8});
    [[Math.PI/2 + gap, Math.PI - gap], [Math.PI + gap, 1.5*Math.PI - gap], [1.5*Math.PI + gap, 2.5*Math.PI - gap]].forEach(([a0,a1]) => {
      const arc = new THREE.Mesh(new THREE.RingGeometry(RB.rOut-0.55, RB.rOut-0.4, 48, 1, a0, a1-a0), edgeMat);
      arc.rotation.x = -Math.PI/2; arc.position.set(RB.x, 0.04, RB.z); street.add(arc);
    });
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(RB.rIn+0.3, RB.rIn+0.3, 0.2, 48), lamb(0xb8b8b0));
    curb.position.set(RB.x, 0.1, RB.z); curb.receiveShadow = true; street.add(curb);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(RB.rIn, RB.rIn, 0.26, 48), lamb(0x5f9a4a));
    grass.position.set(RB.x, 0.13, RB.z); grass.receiveShadow = true; street.add(grass);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), lamb(0x6b4423));
    trunk.position.set(RB.x, 1.76, RB.z); trunk.castShadow = true; street.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 1), new THREE.MeshLambertMaterial({color:0x3f8f3a, flatShading:true}));
    crown.position.set(RB.x, 4.6, RB.z); crown.castShadow = true; street.add(crown);
    for(let i=0;i<36;i++){                                           // wyspa jest przeszkodą dla gracza
      const a = i/36*Math.PI*2;
      ROUND_COLL.push({x: RB.x + Math.cos(a)*5.0, z: RB.z + Math.sin(a)*5.0, r: 0.4});
    }
    // 3) lewy zjazd (w stronę -z) do supermarketu
    const exitStart = RB.z - 12.5, exitEnd = -44, exitLen = exitStart - exitEnd < 0 ? exitEnd - exitStart : exitStart - exitEnd;
    const exitG = new THREE.Group(); exitG.position.set(RB.x, 0, (exitStart + exitEnd)/2); exitG.rotation.y = Math.PI/2; street.add(exitG);
    const exitRoad = new THREE.Mesh(new THREE.PlaneGeometry(exitLen, ROAD_W), new THREE.MeshLambertMaterial({map:asphaltTex(exitLen)}));
    exitRoad.rotation.x = -Math.PI/2; exitRoad.position.y = 0.02; exitRoad.receiveShadow = true; exitG.add(exitRoad);
    const exSwLen = (RB.z - 13) - exitEnd; const exSwLenAbs = Math.abs(exSwLen);
    [-1,1].forEach(sd => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_W, 0.2, exSwLenAbs), walkMat);
      sw.position.set(RB.x + sd*SIDEWALK_OFFSET, 0.1, (RB.z - 13 + exitEnd)/2); sw.receiveShadow = true; street.add(sw);
    });
    // 3b) prawy zjazd (w stronę +z): ulica Społeczna – 5 domów gracza i sklep z ubraniami
    const spStart = RB.z + 12.5, spLen = SPOL_END - spStart;
    const spG = new THREE.Group(); spG.position.set(RB.x, 0, (spStart + SPOL_END)/2); spG.rotation.y = Math.PI/2; street.add(spG);
    const spRoad = new THREE.Mesh(new THREE.PlaneGeometry(spLen, ROAD_W), new THREE.MeshLambertMaterial({map:asphaltTex(spLen)}));
    spRoad.rotation.x = -Math.PI/2; spRoad.position.y = 0.02; spRoad.receiveShadow = true; spG.add(spRoad);
    const spSwLen = SPOL_END - (RB.z + 13);
    [-1,1].forEach(sd => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_W, 0.2, spSwLen), walkMat);
      sw.position.set(RB.x + sd*SIDEWALK_OFFSET, 0.1, (RB.z + 13 + SPOL_END)/2); sw.receiveShadow = true; street.add(sw);
    });
    {   // tabliczka „SPOŁECZNA” przy wlocie (dwie strony – czytelna z obu kierunków)
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const g3 = cv.getContext('2d'); g3.fillStyle = '#174b78'; g3.fillRect(0,0,512,128);
      g3.strokeStyle = '#fff'; g3.lineWidth = 9; g3.strokeRect(6,6,500,116);
      g3.fillStyle = '#fff'; g3.font = 'bold 62px sans-serif'; g3.textAlign = 'center'; g3.textBaseline = 'middle'; g3.fillText('SPOŁECZNA', 256, 66);
      const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 8;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10), new THREE.MeshLambertMaterial({color:0x55585c}));
      pole.position.set(RB.x + 7.2, 1.6, RB.z + 17); pole.castShadow = true; street.add(pole); solidPole(RB.x + 7.2, RB.z + 17);
      [1,-1].forEach(sd => {
        const face = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.64), new THREE.MeshBasicMaterial({map:tx, side:THREE.FrontSide}));
        face.position.set(RB.x + 7.2, 2.65, RB.z + 17 + sd*0.11); if(sd < 0) face.rotation.y = Math.PI; street.add(face);
      });
    }
    // 4) parking przed supermarketem
    const APRON_D = 20, APRON_Z = -54;                                    // plac: z od -64 (chodnik) do -44; miejsca postojowe z = -61,5…-56,5, dalej dwa pasy ruchu (z = -54,2 na zachód, z = -49,2 na wschód) i miejsce na nawrót autobusu
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(SUPER.w, APRON_D), new THREE.MeshLambertMaterial({map:grainTex(SUPER.w/TILE, APRON_D/TILE)}));
    apron.rotation.x = -Math.PI/2; apron.position.set(SUPER.x, 0.03, APRON_Z); apron.receiveShadow = true; street.add(apron);
    const lineMat = new THREE.MeshBasicMaterial({color:0xe8e8e8});
    for(let i=0;i<=10;i++){
      const ln = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 5), lineMat);
      ln.position.set(SUPER.x - 20 + i*4, 0.05, -59); street.add(ln);
    }
    const frontWalk = new THREE.Mesh(new THREE.BoxGeometry(SUPER.w, 0.2, 2), walkMat);
    frontWalk.position.set(SUPER.x, 0.1, -63); frontWalk.receiveShadow = true; street.add(frontWalk);
    for(let x = 80; x <= 150; x += 4){                                      // przerywana linia środkowa placu (rozdziela pas na zachód i pas na wschód) – bez odcinka na zjeździe
      if(x > 120 && x < 136) continue;
      const dash = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.12), lineMat);
      dash.position.set(x, 0.05, -51.7); street.add(dash);
    }
    // 5) budynek supermarketu: patrz buildSupermarket() niżej (po deklaracji WALLS)
  })();

  // ===== Wzgórze i przedłużenie ulicy Społecznej (prosto, zakręt i odcinek na zachód do x=0) =====
  (function buildHill(){
    const X0 = HILL_BOX.minX, X1 = HILL_BOX.maxX, Z0 = HILL_BOX.minZ, Z1 = HILL_BOX.maxZ, STEP = 2;
    const nx = Math.round((X1 - X0)/STEP), nz = Math.round((Z1 - Z0)/STEP);
    // trawa wzgórza: siatka leży 2 cm pod płaską łąką, więc wynurza się dopiero tam, gdzie teren faktycznie się wznosi (bez migotania)
    const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, nx, nz); geo.rotateX(-Math.PI/2);
    const pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const wx = pos.getX(i) + (X0 + X1)/2, wz = pos.getZ(i) + (Z0 + Z1)/2;
      pos.setXYZ(i, wx, terrainH(wx, wz) - 0.02, wz);
    }
    const uv = geo.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i, (pos.getX(i) + 500)*0.12, (500 - pos.getZ(i))*0.12);
    geo.computeVertexNormals();
    const gt = grassTex.clone(); gt.needsUpdate = true; gt.repeat.set(1, 1);
    const hm = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({map:gt})); hm.receiveShadow = true; scene.add(hm);

    // próbki osi ulicy co ≤2 m: pozycja, styczna, długość narastająco
    const S = []; let acc = 0;
    for(let i=0;i<SPOL_PATH.length-1;i++){
      const ax = SPOL_PATH[i][0], az = SPOL_PATH[i][1], bx = SPOL_PATH[i+1][0], bz = SPOL_PATH[i+1][1];
      const L = Math.hypot(bx-ax, bz-az), n = Math.max(1, Math.ceil(L/2));
      for(let k=0;k<n;k++){ const t = k/n; S.push({x:ax+(bx-ax)*t, z:az+(bz-az)*t, len:acc + L*t}); }
      acc += L;
    }
    const last = SPOL_PATH[SPOL_PATH.length-1]; S.push({x:last[0], z:last[1], len:acc});
    for(let i=0;i<S.length;i++){                                       // styczna = uśredniony kierunek sąsiednich próbek
      const a = S[Math.max(0,i-1)], b = S[Math.min(S.length-1,i+1)];
      const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
      S[i].nx = tz/tl; S[i].nz = -tx/tl;                               // normalna boczna
    }
    const off = (q, o) => [q.x + q.nx*o, q.z + q.nz*o];

    // jezdnia: wstęga wzdłuż osi, tekstura biegnie wzdłuż ulicy jak na reszcie dróg
    const tex = roadTex.clone(); tex.needsUpdate = true; tex.repeat.set(1, 1);
    const P = [], U = [], I = [];
    const RCOLS = 6;                                                   // punkty na szerokości jezdni: wysokość liczona osobno dla każdego (teren przy stacji/PKS unosi się też w poprzek ulicy, inaczej trawa przebija przez asfalt)
    S.forEach((q, i) => {
      const u = q.len/TILE;
      for(let j=0;j<RCOLS;j++){
        const v = j/(RCOLS-1), c = off(q, -ROAD_W/2 + v*ROAD_W);
        P.push(c[0], terrainH(c[0], c[1]) + 0.05, c[1]); U.push(u, v);
      }
      if(i < S.length-1){
        for(let j=0;j<RCOLS-1;j++){ const a = i*RCOLS + j, b = a + 1, c = a + RCOLS, d = c + 1; I.push(a, b, c,  b, d, c); }
      }
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    rg.setIndex(I); rg.computeVertexNormals();
    const rm = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({map:tex, side:THREE.DoubleSide})); rm.receiveShadow = true; street.add(rm);

    // chodniki po obu stronach: ciągłe wstęgi z krawężnikiem
    for(const sd of [-1, 1]){
      const Q = [], J = [];
      S.forEach((q, i) => {
        const a = off(q, sd*SIDEWALK_OFFSET - SIDEWALK_W/2), b = off(q, sd*SIDEWALK_OFFSET + SIDEWALK_W/2);
        const h = terrainH((a[0]+b[0])/2, (a[1]+b[1])/2), t = h + 0.2, bt = h - 0.3;
        Q.push(a[0],t,a[1], b[0],t,b[1], a[0],bt,a[1], b[0],bt,b[1]);
        const nq = S[Math.min(S.length-1, i+1)], mx = (q.x + nq.x)/2, mz = (q.z + nq.z)/2;
        const atStationGate = sd === 1 && Math.abs(mz - SPOL_TURN_Z) < 1 && [STATION.x - 9, STATION.x + 9].some(gx => Math.abs(mx - gx) < 4);   // brak chodnika na wjeździe i wyjeździe ze stacji paliw
        if(i < S.length-1 && !atStationGate){ const k = i*4, n = k + 4;
          J.push(k,k+1,n,  k+1,n+1,n);
          J.push(k,n,k+2,  n,n+2,k+2);
          J.push(k+1,k+3,n+1,  n+1,k+3,n+3);
        }
      });
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); sg.setIndex(J); sg.computeVertexNormals();
      const sm = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({color:0xb8b8b0, side:THREE.DoubleSide})); sm.receiveShadow = true; street.add(sm);
    }
  })();

  // Restauracja (z wnętrzem, do którego można wejść)
  const REST = {x:-4, z:-26.5, w:14, d:8, h:3.6};
  const WALLS = [];                       // prostokątne kolizje ścian i mebli
  const PLATFORMS = [];                   // powierzchnie, na które można wskoczyć (łóżko): {x,z,w,d,top,enter}
  function groundAt(x, z, y){                // wysokość podłoża pod graczem (0 albo blat platformy, jeśli już jest nad jej krawędzią)
    let g = terrainH(x, z);
    if(MINE_GROUND){ const mg = MINE_GROUND(x, z); if(mg !== null) g = mg; }
    for(const p of PLATFORMS) if(y >= p.enter && Math.abs(x-p.x) < p.w/2-0.05 && Math.abs(z-p.z) < p.d/2-0.05 && p.top > g) g = p.top;
    return g;
  }

  // ===== Kopalnia: wejście w skalne wzgórze po zachodniej stronie ulicy Górniczej – sztolnia (16,5 m) z szynami, wózkiem i latarniami =====
  (function buildMine(){
    const MX = MINE.x, MZ = MINE.z, TW = 1.8, TH = 3.2, TD = MINE.depth;             // TW – połowa szerokości sztolni, TH – wysokość, TD – głębokość
    const g = new THREE.Group(); scene.add(g);
    const lamb = (c, flat) => new THREE.MeshLambertMaterial({color:c, flatShading:!!flat});
    const bx = (w,h,d,c,x,y,z,shadow) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), lamb(c)); m.position.set(x,y,z); if(shadow) m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    function rockGeo(rx, ry, rz, seed){                                                // chropowata bryła skalna (szum zależny od pozycji – szwy się nie rozchodzą)
      const geo = new THREE.IcosahedronGeometry(1, 2), pos = geo.attributes.position;
      for(let i=0;i<pos.count;i++){
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const n = Math.sin(x*4.1 + seed)*Math.cos(z*3.7 - seed*1.3)*0.5 + Math.sin(y*5.3 + x*2.1 + seed*2.1)*0.5;
        const k = 1 + 0.1*n; pos.setXYZ(i, x*k*rx, y*k*ry, z*k*rz);
      }
      geo.computeVertexNormals(); return geo;
    }
    const rock = (rx,ry,rz,x,y,z,c,seed) => { const m = new THREE.Mesh(rockGeo(rx,ry,rz,seed), lamb(c, true)); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; g.add(m); MINE_ROCKS.push(m); return m; };
    // bryła wzgórza: masyw z tyłu, dwa boki i „most” nad wejściem
    rock(9.5, 5.4, 10.5, MX-12, 2.8, MZ, 0x716b63, 1);
    rock(8, 4.0, 4.6, MX-8, 2.0, MZ-6.8, 0x7d766d, 2);
    rock(8, 4.0, 4.6, MX-8, 2.0, MZ+6.8, 0x6a645c, 3);
    rock(5, 2.8, 5.2, MX-4.5, 6.0, MZ, 0x78726a, 4);
    rock(3.2, 2.0, 3.0, MX-3, 1.0, MZ-8.8, 0x857d73, 5);                                // kilka głazów przy podstawie
    rock(2.6, 1.6, 2.6, MX-2.5, 0.8, MZ+9.2, 0x6f695f, 6);
    rock(10.5, 4.6, 10, 13.5, 1.9, MZ, 0x6f6960, 7); rock(4.5, 3, 4.5, 8.5, 1.2, MZ-6.5, 0x7a736a, 8); rock(4.5, 3, 4.5, 8.5, 1.2, MZ+6.5, 0x6a645c, 9);   // wzgórze nad wykopaliskiem
    // sztolnia: podłoga, ściany, strop, ściana końcowa
    bx(TD-0.2, 0.06, TW*2, 0x4b4238, MX-0.2-(TD-0.2)/2, 0.04, MZ);
    bx(TD-0.2, TH, 0.3, 0x3d362f, MX-0.2-(TD-0.2)/2, TH/2, MZ-TW-0.15);
    bx(TD-0.2, TH, 0.3, 0x3d362f, MX-0.2-(TD-0.2)/2, TH/2, MZ+TW+0.15);
    bx(TD-0.2, 0.3, TW*2+0.6, 0x2f2a25, MX-0.2-(TD-0.2)/2, TH+0.15, MZ);
    // drewniana podpora wejścia i obudowa sztolni
    const wood = 0x6b4a2a, woodD = 0x4f3720;
    [-1,1].forEach(sd => bx(0.34, 5.4, 0.34, wood, MX+0.2, 2.7, MZ + sd*(TW+0.4), true));
    bx(0.4, 0.42, TW*2 + 1.4, woodD, MX+0.2, TH+0.4, MZ, true);
    for(let i=0;i<5;i++){
      const x = MX - 2.4 - i*3.1;                                                       // ramy podporowe w głębi
      [-1,1].forEach(sd => bx(0.22, TH-0.1, 0.22, wood, x, (TH-0.1)/2, MZ + sd*(TW-0.12), true));
      bx(0.24, 0.22, TW*2, woodD, x, TH-0.2, MZ, true);
    }
    // szyld „KOPALNIA”
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128; const sg = sc.getContext('2d');
    sg.fillStyle = '#5a3d22'; sg.fillRect(0,0,512,128); sg.strokeStyle = '#2d1d0e'; sg.lineWidth = 8; sg.strokeRect(4,4,504,120);
    sg.fillStyle = '#f1d9a0'; sg.font = 'bold 74px sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('⛏ KOPALNIA', 256, 68);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(MX+0.42, 4.65, MZ); sign.rotation.y = Math.PI/2; g.add(sign);
    // plac przed wejściem (żwir do chodnika ulicy)
    const yardLen = (GORN_X - GORN_EDGE) - MX;
    bx(yardLen, 0.05, 9, 0x8a8170, MX + yardLen/2, 0.03, MZ);
    // szyny wychodzące na plac, podkłady, wózek z węglem
    const railZ = MZ - 1.0;
    for(let x = MX + 3.8; x > MX - TD + 0.6; x -= 0.9) bx(0.16, 0.06, 1.1, 0x4a3520, x, 0.1, railZ);
    const railLen = TD + 3.4;
    [-0.28,0.28].forEach(o => bx(railLen, 0.07, 0.06, 0x8c949c, MX + 3.8 - railLen/2, 0.17, railZ + o));
    const cart = new THREE.Group(); cart.position.set(MX - 6, 0, railZ); g.add(cart);
    const cm = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), lamb(c)); m.position.set(x,y,z); m.castShadow = true; cart.add(m); };
    cm(1.5, 0.62, 0.95, 0x7a4b2d, 0, 0.72, 0); cm(1.58, 0.08, 1.03, 0x5b3720, 0, 1.05, 0);
    [[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5],[0.5,0.5]].forEach(([x,z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.08,12), lamb(0x2a2d31)); w.rotation.x = Math.PI/2; w.position.set(x, 0.3, z*0.95); cart.add(w); });
    for(let i=0;i<7;i++){ const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + (i%3)*0.04, 0), lamb(0x1b1c1e, true)); c.position.set(-0.5 + (i%4)*0.34, 1.1 + (i%2)*0.08, -0.22 + Math.floor(i/4)*0.4); cart.add(c); }
    // latarnie wzdłuż sztolni + jedno stałe światło (liczba świateł w scenie nie może się zmieniać w trakcie gry)
    const lampMat = new THREE.MeshBasicMaterial({color:0xffc46b});
    [MX-3.5, MX-9, MX-14.2].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.26,0.18), lampMat); l.position.set(x, TH-0.55, MZ+TW-0.35); g.add(l); bx(0.04, 0.3, 0.04, 0x222222, x, TH-0.3, MZ+TW-0.35); });
    const mineLight = new THREE.PointLight(0xffb55a, 1.0, 17); mineLight.position.set(MX - 8.5, TH-0.6, MZ); scene.add(mineLight);
    // kolizje: lita skała z korytarzem (korytarz: |z−MZ| < TW, x od MX−TD do MX), wózek
    const fx0 = MX - TD, fx1 = MX + 0.1, fz = 11.4;
    WALLS.push({x:(fx0+fx1)/2, z:MZ - (fz+TW)/2, w:fx1-fx0, d:fz-TW});                 // północny bok
    WALLS.push({x:(fx0+fx1)/2, z:MZ + (fz+TW)/2, w:fx1-fx0, d:fz-TW});                 // południowy bok
    WALLS.push({x:MX - 6, z:railZ, w:1.6, d:1.05});                                      // wózek
  })();
  const restWallMat = new THREE.MeshLambertMaterial({color:0xf0e6d2});
  const restExterior = [];                // elementy ukrywane, gdy jesteś w środku
  (function buildRestaurant(){
    const RX = REST.x, RZ = REST.z, w = REST.w, d = REST.d, h = REST.h, t = 0.3, gap = 2.4;
    const grp = new THREE.Group(); grp.position.set(RX, 0, RZ); scene.add(grp);
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const box = (bw,bh,bd,mat,px,py,pz,collide) => {
      if(collide) WALLS.push({x:RX+px, z:RZ+pz, w:bw, d:bd});
      return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz);
    };
    const cyl = (rt,rb,hh,mat,px,py,pz) => put(new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,hh,14), mat), px, py, pz);
    const wood = lamb(0x8a5a2b), dark = lamb(0x3b2a1a);

    // ściany: tył, boki, front z wejściem pośrodku
    box(w, h, t, restWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, restWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, restWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, restWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, restWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-2.7, t, restWallMat, 0, 2.7+(h-2.7)/2, d/2-t/2, false);   // nadproże nad drzwiami

    // dach (ukrywany w środku) i sufit (widoczny tylko od dołu)
    restExterior.push(box(w+0.6, 0.35, d+0.6, lamb(0x7a4a32), 0, h+0.17, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xfaf3e3));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);

    // podłoga w szachownicę
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fg = fc.getContext('2d');
    fg.fillStyle = '#d9c7a3'; fg.fillRect(0,0,128,128);
    fg.fillStyle = '#9c7b4f'; fg.fillRect(0,0,64,64); fg.fillRect(64,64,64,64);
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    ft.repeat.set((w-2*t)/2, (d-2*t)/2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), new THREE.MeshLambertMaterial({map:ft}));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    box(2, 0.03, 0.9, lamb(0xa8322d), 0, 0.06, d/2-0.8, false);            // wycieraczka

    // elewacja: okna, daszek, szyld
    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.55});
    [-1,1].forEach(sd => box(2.4, 1.3, 0.06, glass, sd*4.1, 1.7, d/2+0.03, false));
    restExterior.push(box(5.6, 0.1, 1.4, lamb(0xc0392b), 0, 2.7, d/2+0.75, false));
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 96;
    const sg = sc.getContext('2d');
    sg.fillStyle = '#7a1f1f'; sg.fillRect(0,0,512,96);
    sg.fillStyle = '#ffd54a'; sg.font = 'bold 54px sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.fillText('RESTAURACJA', 256, 50);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.9), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.15, d/2+0.04); grp.add(sign); restExterior.push(sign);

    // lada, półka z butelkami, kasa
    const cz = -d/2 + t + 1.05;
    box(8, 1.1, 0.9, dark, 0, 0.55, cz, true);
    box(8.3, 0.08, 1.1, lamb(0xd7b98a), 0, 1.14, cz, false);
    box(0.5, 0.35, 0.4, lamb(0x222222), 2.5, 1.36, cz, false);
    const sz = -d/2 + t + 0.2;
    box(7, 0.08, 0.4, wood, 0, 2.55, sz, false);
    const bc = [0x2e7d32,0xc62828,0x1565c0,0xf9a825,0x6a1b9a];
    for(let i=0;i<10;i++) cyl(0.06,0.06,0.3, lamb(bc[i%bc.length]), -3+i*0.67, 2.74, sz);

    // tablica z menu
    const mc = document.createElement('canvas'); mc.width = 256; mc.height = 190;
    const mg = mc.getContext('2d');
    mg.fillStyle = '#26382b'; mg.fillRect(0,0,256,190);
    mg.strokeStyle = '#8a5a2b'; mg.lineWidth = 8; mg.strokeRect(0,0,256,190);
    mg.fillStyle = '#fff'; mg.textBaseline = 'middle';
    mg.font = 'bold 34px sans-serif'; mg.textAlign = 'center'; mg.fillText('MENU', 128, 30);
    mg.font = '22px sans-serif';
    [['Pizza','12 zł'],['Zupa dnia','8 zł'],['Burger','15 zł'],['Kawa','6 zł']].forEach((r,i) => {
      mg.textAlign = 'left'; mg.fillText(r[0], 22, 76+i*30);
      mg.textAlign = 'right'; mg.fillText(r[1], 234, 76+i*30);
    });
    const menu = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.63), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(mc)}));
    menu.position.set(-5.2, 2.1, -d/2 + t + 0.02); grp.add(menu);

    // stoliki z krzesłami i lampami
    const chairM = lamb(0xa0522d);
    function chair(cx, cz, dir){
      WALLS.push({x:RX+cx, z:RZ+cz, w:0.55, d:0.55});
      box(0.5, 0.08, 0.5, chairM, cx, 0.45, cz, false);
      box(0.1, 0.42, 0.1, dark, cx, 0.21, cz, false);
      box(0.5, 0.5, 0.06, chairM, cx, 0.75, cz + dir*0.22, false);
    }
    [-5,-2.6,2.6,5].forEach(tx => {
      const tz = 0.4;
      WALLS.push({x:RX+tx, z:RZ+tz, w:1.3, d:1.3});
      cyl(0.65,0.65,0.08, wood, tx, 0.78, tz);
      cyl(0.07,0.07,0.75, dark, tx, 0.375, tz);
      cyl(0.3,0.3,0.04, dark, tx, 0.02, tz);
      cyl(0.2,0.2,0.02, lamb(0xffffff), tx-0.25, 0.83, tz);
      cyl(0.05,0.05,0.2, lamb(0x4aa3df), tx+0.2, 0.93, tz);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.08,8,6), lamb(0xe84a5f)), tx+0.2, 1.07, tz);
      chair(tx, tz+1.0, 1); chair(tx, tz-1.0, -1);
      cyl(0.015,0.015,h-2.55, lamb(0x111111), tx, 2.55+(h-2.55)/2, tz);   // lampa wisząca
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.35,0.25,14), new THREE.MeshBasicMaterial({color:0xffe08a})), tx, 2.42, tz);
    });

    // rośliny w rogach
    [-1,1].forEach(sd => {
      WALLS.push({x:RX+sd*6.1, z:RZ+3.0, w:0.6, d:0.6});
      cyl(0.25,0.3,0.5, lamb(0x8d4b2a), sd*6.1, 0.25, 3.0);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8), lamb(0x2e7d32)), sd*6.1, 1.0, 3.0);
    });

    BUILDINGS.push({x:RX, z:RZ, w:w, d:d, open:true});
  })();
  let restInside = false;
  function updateRestaurant(){
    const inside = Math.abs(player.position.x - REST.x) < REST.w/2 - 0.15 && Math.abs(player.position.z - REST.z) < REST.d/2 - 0.15;
    if(inside === restInside) return;
    restInside = inside;
    restExterior.forEach(m => m.visible = !inside);
    restWallMat.transparent = false; restWallMat.opacity = 1;
    restWallMat.depthWrite = true;
  }

  // Supermarket Pandy (z wnętrzem, do którego można wejść)
  const supWallMat = new THREE.MeshLambertMaterial({color:0xdcd6c8});
  const supExterior = [];
  let supDoor = null, supOpen = true, supToastAt = 0;                          // drzwi zamykane poza godzinami otwarcia (8:00–22:00)
  let supRoof = null;                                                           // dach: w środku niewidoczny, ale nadal rzuca cień (stałe oświetlenie wnętrza)
  (function buildSupermarket(){
    const SX = SUPER.x, SZ = SUPER.z, w = SUPER.w, d = SUPER.d, H = 6, t = 0.4, gap = 5, fz = d/2;
    const grp = new THREE.Group(); grp.position.set(SX, 0, SZ); scene.add(grp);
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => {
      if(collide) WALLS.push({x:SX+px, z:SZ+pz, w:bw, d:bd});
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat);
      m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m;
    };
    const plane = (pw,ph,mat,px,py,pz,ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw,ph), mat); m.position.set(px,py,pz); m.rotation.y = ry||0; grp.add(m); return m; };
    const tex = (cw,ch,draw) => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'),cw,ch); const tt = new THREE.CanvasTexture(c); tt.anisotropy = 8; return tt; };
    const dark = lamb(0x222222);
    // ściany: tył, boki, front z wejściem pośrodku
    box(w,H,t,supWallMat,0,H/2,-fz+t/2,true);
    box(t,H,d,supWallMat,-w/2+t/2,H/2,0,true);
    box(t,H,d,supWallMat, w/2-t/2,H/2,0,true);
    const seg = (w-gap)/2;
    box(seg,H,t,supWallMat,-(gap/2+seg/2),H/2,fz-t/2,true);
    box(seg,H,t,supWallMat, (gap/2+seg/2),H/2,fz-t/2,true);
    box(gap,H-3.4,t,supWallMat,0,3.4+(H-3.4)/2,fz-t/2,false);                    // nadproże nad wejściem
    // dach (ukrywany w środku), sufit, podłoga
    supRoof = box(w+0.6,0.4,d+0.6,lamb(0x5f656b),0,H+0.2,0,false);              // nie trafia do supExterior – patrz updateSupermarket
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t,d-2*t), lamb(0xf4f4f0));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0,H,0); grp.add(ceil);
    const ft = tex(128,128,(g)=>{ g.fillStyle='#e9e9e4'; g.fillRect(0,0,128,128); g.fillStyle='#c9ccc8'; g.fillRect(0,0,64,64); g.fillRect(64,64,64,64); });
    ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set((w-2*t)/3,(d-2*t)/3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t,d-2*t), new THREE.MeshLambertMaterial({map:ft}));
    floor.rotation.x = -Math.PI/2; floor.position.set(0,0.04,0); floor.receiveShadow = true; grp.add(floor);
    // elewacja: okna, framugi, wycieraczka, daszek, szyld
    const glass = new THREE.MeshLambertMaterial({color:0x2a4562});
    [-18,-14,-10,-6,6,10,14,18].forEach(x => box(3.6,2.4,0.1,glass,x,2.2,fz+0.04,false));
    [-1,1].forEach(sd => box(0.3,3.4,0.5,dark,sd*gap/2,1.7,fz,false));
    // drzwi zamknięte poza godzinami otwarcia + tablica z godzinami
    (function(){
      const doorMat = new THREE.MeshLambertMaterial({color:0x7fb2d6, transparent:true, opacity:0.45});
      const dm = new THREE.Mesh(new THREE.BoxGeometry(gap-0.3, 3.4, 0.08), doorMat);
      dm.position.set(0, 1.7, fz-0.25); dm.visible = false; grp.add(dm);
      const cs = tex(512,160,(g,cw,ch)=>{ g.fillStyle='#b71c1c'; g.fillRect(0,0,cw,ch); g.strokeStyle='#fff'; g.lineWidth=6; g.strokeRect(5,5,cw-10,ch-10);
        g.fillStyle='#fff'; g.font='bold 78px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('ZAMKNIĘTE', cw/2, ch/2+3); });
      const sg = plane(2.8, 0.88, new THREE.MeshBasicMaterial({map:cs}), 0, 1.7, fz-0.19); sg.visible = false;
      const hs = tex(256,160,(g,cw,ch)=>{ g.fillStyle='#111'; g.fillRect(0,0,cw,ch); g.strokeStyle='#fff'; g.lineWidth=5; g.strokeRect(4,4,cw-8,ch-8);
        g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle'; g.font='bold 38px sans-serif'; g.fillText('OTWARTE', cw/2, 50); g.font='bold 44px sans-serif'; g.fillStyle='#ffd54f'; g.fillText('8:00–22:00', cw/2, 108); });
      supExterior.push(plane(1.3, 0.81, new THREE.MeshBasicMaterial({map:hs}), -3.35, 1.7, fz+0.1));
      supDoor = {mesh:dm, sign:sg, rect:{x:SX, z:SZ+fz-0.25, w:gap, d:0.6}};
    })();
    box(4,0.03,1.4,lamb(0x333333),0,0.06,fz-1,false);
    supExterior.push(box(8,0.25,2.5,dark,0,3.7,fz+1.2,false));
    const signMat = new THREE.MeshBasicMaterial({map:tex(1024,102,(g,cw,ch)=>{ g.fillStyle='#111111'; g.fillRect(0,0,cw,ch); g.strokeStyle='#ffffff'; g.lineWidth=6; g.strokeRect(5,5,cw-10,ch-10);
      g.fillStyle='#ffffff'; g.font='bold 66px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('🐼 SUPERMARKET PANDY 🐼', cw/2, ch/2+3); })});
    supExterior.push(plane(22,2.2,signMat,0,4.9,fz+0.05));
    plane(14,1.4,signMat,0,4.6,-fz+t+0.9+0.05);                                    // szyld także nad lodówkami w środku
    // regały (6 rzędów, środkowa aleja wolna): sama konstrukcja, towary to modele 3D jak w sklepie
    const BY = [0.3,0.8,1.3,1.8], boardMat = lamb(0xc9ced3), frameMat = lamb(0x8f979e);
    [-18,-12,-6,6,12,18].forEach(lx => {
      WALLS.push({x:SX+lx, z:SZ-3, w:1.2, d:12});
      box(1.2,0.25,12,frameMat,lx,0.125,-3,false);
      box(0.06,2.1,12,boardMat,lx,1.05,-3,false);
      BY.forEach(y => box(1.1,0.04,12,boardMat,lx,y,-3,false));
      [-9,3].forEach(ez => box(1.2,2.1,0.06,frameMat,lx,1.05,ez,false));
    });
    // chłodnia przy tylnej ścianie: szklane drzwi, półki, cola w środku
    const bz = -fz+t+0.4;
    WALLS.push({x:SX, z:SZ+bz, w:38, d:0.8});
    box(38,0.25,0.8,frameMat,0,0.125,bz,false);
    box(38,2.6,0.1,lamb(0xb8c4cc),0,1.3,-fz+t+0.05,false);
    BY.forEach(y => box(38,0.04,0.7,boardMat,0,y,bz,false));
    box(38,0.5,0.8,lamb(0x1e88e5),0,2.85,bz,false);
    plane(38,2.3,new THREE.MeshLambertMaterial({transparent:true,depthWrite:false,map:tex(1024,128,(g,cw,ch)=>{ g.fillStyle='rgba(190,225,240,0.22)'; g.fillRect(0,0,cw,ch);
      for(let x=0;x<cw;x+=128){ g.fillStyle='rgba(120,140,150,0.9)'; g.fillRect(x,0,4,ch); g.fillRect(x+100,ch*0.3,6,ch*0.4); } })}),0,1.3,bz+0.42,0);
    // towary na dwóch regałach (instancje, żeby było lekko)
    const inst = (geo, mat, list, off) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(); off = off || [0,0,0];
      list.forEach(([x,y,z,ry],i) => { const c = Math.cos(ry), sn = Math.sin(ry);
        o.position.set(x + off[0]*c + off[2]*sn, y + off[1], z - off[0]*sn + off[2]*c); o.rotation.set(0,ry,0); o.updateMatrix(); im.setMatrixAt(i,o.matrix); });
      im.castShadow = true; grp.add(im); return im;
    };
    const row = (lx, side, y, z0, z1, step) => { const out = []; for(let z=z0; z<=z1; z+=step) out.push([lx+side*0.3, y+0.02, z, side*Math.PI/2]); return out; };
    const header = (lx, text, hy, hz) => plane(2.8,0.5,new THREE.MeshBasicMaterial({map:tex(512,92,(g,cw,ch)=>{ g.fillStyle='#1b1b1b'; g.fillRect(0,0,cw,ch); g.fillStyle='#ffffff'; g.font='bold 46px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,cw/2,ch/2+3); })}),lx,hy||2.55,hz||3.4,0);
    // regał z jabłkami (z tyłu) i chlebem (z przodu), strona od środkowej alei
    const RA = -6;
    header(RA,'🍎 JABŁKA I CHLEB 🍞');
    const loaf = new THREE.SphereGeometry(1,14,10).scale(0.16,0.07,0.08), slash = new THREE.BoxGeometry(0.025,0.006,0.07);
    BY.forEach(y => { const LA = row(RA,1,y,-8.5,-3.4,0.36), LB = row(RA,1,y,-2.6,2.5,0.36);
      inst(new THREE.SphereGeometry(0.09,12,10), lamb(0xd32f2f), LA, [0,0.09,0]);
      inst(new THREE.CylinderGeometry(0.008,0.008,0.05,6), lamb(0x5d4037), LA, [0,0.19,0]);
      inst(loaf, lamb(0xcf8f4a), LB, [0,0.06,0]);
      [-0.06,0,0.06].forEach(ox => inst(slash, lamb(0x8d5a2b), LB, [ox,0.125,0])); });
    // cola w chłodni (towar na półkach za szklanymi drzwiami)
    header(0,'🥤 NAPOJE – COLA 🥤',2.85,bz+0.43);
    BY.forEach(y => { const LC = []; for(let x=-6; x<=6; x+=0.3) LC.push([x,y+0.02,bz+0.05,0]);
      inst(new THREE.CylinderGeometry(0.05,0.05,0.26,12), lamb(0xb71c1c), LC, [0,0.13,0]);
      inst(new THREE.CylinderGeometry(0.053,0.053,0.09,12), lamb(0xf5f5f5), LC, [0,0.13,0]);
      inst(new THREE.CylinderGeometry(0.03,0.03,0.03,8), lamb(0x222222), LC, [0,0.275,0]); });
    // mrożona pizza w prawej części chłodni
    header(13,'🍕 PIZZA MROŻONA 🍕',2.85,bz+0.43);
    BY.forEach(y => { const LZ = []; for(let x=8; x<=18; x+=0.34) LZ.push([x,y+0.02,bz+0.05,0]);
      inst(new THREE.BoxGeometry(0.3,0.3,0.04), lamb(0xe8c27a), LZ, [0,0.15,0]);
      inst(new THREE.CylinderGeometry(0.115,0.115,0.01,14).rotateX(Math.PI/2), lamb(0xf2b134), LZ, [0,0.16,0.025]);
      inst(new THREE.CylinderGeometry(0.03,0.03,0.012,8).rotateX(Math.PI/2), lamb(0xc62828), LZ, [0.045,0.19,0.03]);
      inst(new THREE.CylinderGeometry(0.03,0.03,0.012,8).rotateX(Math.PI/2), lamb(0xc62828), LZ, [-0.045,0.13,0.03]); });
    // regał z elektroniką: komputery, telefony, ładowarki (trzy strefy)
    const RB2 = 6;
    header(RB2,'📱🔌🖥️ ELEKTRONIKA');
    [BY[0],BY[1]].forEach(y => [-8.2,-7.2,-6.2].forEach(z => { const c = makeComputer(false); c.scale.setScalar(0.65); c.rotation.y = -Math.PI/2; c.position.set(RB2-0.2, y+0.02, z); grp.add(c); }));
    const white = lamb(0xf2f2f2), metal = lamb(0x9aa0a6), pg = new THREE.BoxGeometry(0.012,0.025,0.01);
    BY.forEach(y => { const LP = row(RB2,-1,y,-4.9,-1.7,0.32), LH = row(RB2,-1,y,-0.8,2.5,0.3);
      inst(new THREE.BoxGeometry(0.1,0.19,0.014), lamb(0x1b1b20), LP, [0,0.095,0]);
      inst(new THREE.BoxGeometry(0.088,0.17,0.004), lamb(0x2f6fb0), LP, [0,0.095,0.008]);
      inst(new THREE.BoxGeometry(0.08,0.1,0.06), white, LH, [0,0.05,0]);
      inst(pg, metal, LH, [-0.018,0.05,-0.035]); inst(pg, metal, LH, [0.018,0.05,-0.035]);
      inst(new THREE.BoxGeometry(0.014,0.07,0.014), white, LH, [0,0.035,0.04]); });
    // stoisko z warzywami i owocami (skrzynie)
    [[-19.5,0xfb8c00],[-16.5,0x7cb342],[-13.5,0xfdd835]].forEach(([lx,c]) => { box(2.6,0.7,1.2,lamb(0x8a5a2b),lx,0.35,7,true); box(2.4,0.1,1.0,lamb(c),lx,0.75,7,false); });
    // kasy z kasjerami
    const person = (x,z,c) => { box(0.4,0.7,0.25,lamb(0x2b3a55),x,0.45,z,false); box(0.5,0.9,0.3,lamb(c),x,1.15,z,false); box(0.3,0.3,0.3,lamb(0xf1c27d),x,1.75,z,false); };
    [8,13,18].forEach((lx,i) => {
      box(1.0,1.0,2.8,lamb(0x7a7f85),lx,0.5,6.2,true);
      box(0.8,0.05,2.4,dark,lx,1.03,6.0,false);
      box(0.6,0.45,0.5,lamb(0x333a40),lx,1.22,7.3,false);
      person(lx,8.3,[0xc62828,0x1565c0,0x2e7d32][i]);
    });
    // wózki przy wejściu
    for(let i=0;i<3;i++){ box(0.7,0.5,1.0,lamb(0x9aa0a6),-4-i*0.9,0.65,10.2,false); box(0.7,0.06,0.06,dark,-4-i*0.9,1.1,10.7,false); }
    // oświetlenie sufitowe
    const lightMat = new THREE.MeshBasicMaterial({color:0xffffff});
    [-7,-1,5].forEach(lz => [-14,-5,5,14].forEach(lx => box(3,0.08,0.5,lightMat,lx,H-0.06,lz,false)));
    [-10,10].forEach(lx => { const pl = new THREE.PointLight(0xfff4e0,0.7,40); pl.position.set(SX+lx,4.6,SZ); scene.add(pl); });
    BUILDINGS.push({x:SX, z:SZ, w:w, d:d, open:true});
  })();
  let supInside = false;
  function updateSupermarket(){
    const hour = ((START_HOUR/24 + gameElapsed/DAY_SECONDS) % 1) * 24, open = hour >= 8 && hour < 22;
    if(supDoor && open !== supOpen){
      supOpen = open; supDoor.mesh.visible = supDoor.sign.visible = !open;
      const i = WALLS.indexOf(supDoor.rect);
      if(!open && i < 0) WALLS.push(supDoor.rect); else if(open && i >= 0) WALLS.splice(i, 1);
    }
    if(!supOpen){
      const px = player.position.x - SUPER.x, pz = player.position.z - SUPER.z;
      if(Math.abs(px) < SUPER.w/2 - 0.2 && Math.abs(pz) < SUPER.d/2 - 0.2){          // zamknięcie: ochrona wyprowadza gracza
        player.position.set(SUPER.x, player.position.y, SUPER.z + SUPER.d/2 + 1.5);
        toast('Supermarket Pandy zamyka się – zapraszamy od 8:00 🐼');
      } else if(Math.abs(px) < 6 && pz > SUPER.d/2 && pz < SUPER.d/2 + 3 && performance.now() - supToastAt > 4000){
        supToastAt = performance.now(); toast('Supermarket Pandy jest zamknięty – otwarte codziennie 8:00–22:00 🐼');
      }
    }
    const inside = Math.abs(player.position.x - SUPER.x) < SUPER.w/2 - 0.2 && Math.abs(player.position.z - SUPER.z) < SUPER.d/2 - 0.2;
    if(inside === supInside) return;
    supInside = inside;
    supExterior.forEach(m => m.visible = !inside);
    // Dach znika z widoku (kamera patrzy z góry), ale dalej zasłania słońce: bez tego po wejściu słońce zalewałoby wnętrze
    // i oświetlenie zmieniałoby się skokowo. Teraz wnętrze wygląda tak samo z zewnątrz i w środku.
    if(supRoof){ supRoof.material.colorWrite = !inside; supRoof.material.depthWrite = !inside; }
    if(!inside && basket){ basket = null; renderBasket(); toast('Wyszedłeś bez płacenia – koszyk odłożony, towary wróciły na regały'); }
  }

  // ===== Sklep „Dom i AGD” obok Pandy (po zachodniej stronie): inny układ niż supermarket – salon ze ścianami sprzętu i ladą =====
  const agdExterior = [];
  let agdRoof = null, agdInside = false, agdNpc = null;
  const agdNpcDist = () => agdNpc ? Math.hypot(player.position.x - agdNpc.position.x, player.position.z - agdNpc.position.z) : 99;
  const AGD_GOODS = [
    {id:'oven',      p:40, n:'Piekarnik', big:true},
    {id:'toilet',    p:45, n:'Toaleta'},
    {id:'bathtub',   p:80, n:'Wanna'},
    {id:'mirror',    p:35, n:'Lustro stojące'}
  ];
  (function buildApplianceStore(){
    const SX = AGD.x, SZ = AGD.z, w = AGD.w, d = AGD.d, H = AGD.h, t = 0.4, gap = 4, fz = d/2;
    const grp = new THREE.Group(); grp.position.set(SX, 0, SZ); scene.add(grp);
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => {
      if(collide) WALLS.push({x:SX+px, z:SZ+pz, w:bw, d:bd});
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat);
      m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m;
    };
    const plane = (pw,ph,mat,px,py,pz,ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw,ph), mat); m.position.set(px,py,pz); m.rotation.y = ry||0; grp.add(m); return m; };
    const tex = (cw,ch,draw) => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'),cw,ch); const tt = new THREE.CanvasTexture(c); tt.anisotropy = 8; return tt; };
    const dark = lamb(0x222a30), wallMat = lamb(0xcfdde8), orange = lamb(0xe0702a);
    const M = {white:lamb(0xf2f4f6), silver:lamb(0xb8c2ca), steel:lamb(0x8d98a2), black:lamb(0x1d2228), glass:lamb(0x2b4a63),
               blue:new THREE.MeshBasicMaterial({color:0x4fc3f7}), graphite:lamb(0x3a4249)};

    // parking i chodnik przed sklepem (przedłużenie parkingu Pandy)
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(32, 20), lamb(0x3d3d42));                 // plac 20 m (z od -64 do -44), jak przy Pandzie
    apron.rotation.x = -Math.PI/2; apron.position.set(SX + 2, 0.03, -54); apron.receiveShadow = true; street.add(apron);
    const lineMat = new THREE.MeshBasicMaterial({color:0xe8e8e8});
    for(let i=0;i<=6;i++){ const ln = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 5), lineMat); ln.position.set(SX - 12 + i*4, 0.05, -59); street.add(ln); }
    const walk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 2), walkMat); walk.position.set(SX, 0.025, -63); walk.receiveShadow = true; street.add(walk);

    // ściany: tył, boki, front z wejściem pośrodku
    box(w,H,t,wallMat,0,H/2,-fz+t/2,true);
    box(t,H,d,wallMat,-w/2+t/2,H/2,0,true);
    box(t,H,d,wallMat, w/2-t/2,H/2,0,true);
    const seg = (w-gap)/2;
    box(seg,H,t,wallMat,-(gap/2+seg/2),H/2,fz-t/2,true);
    box(seg,H,t,wallMat, (gap/2+seg/2),H/2,fz-t/2,true);
    box(gap,H-3.4,t,wallMat,0,3.4+(H-3.4)/2,fz-t/2,false);
    box(w+0.02,0.35,0.12,orange,0,H-0.2,fz+0.02,false);                           // pomarańczowy pas pod dachem
    agdRoof = box(w+0.6,0.4,d+0.6,lamb(0x5b6670),0,H+0.2,0,false);               // dach: w środku niewidoczny, ale nadal rzuca cień
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t,d-2*t), lamb(0xf6f8fa));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0,H,0); grp.add(ceil);
    const ft = tex(128,128,(g)=>{ g.fillStyle='#dfe9f0'; g.fillRect(0,0,128,128); g.fillStyle='#b9ccda'; g.fillRect(0,0,64,64); g.fillRect(64,64,64,64); g.strokeStyle='#a4b8c7'; g.strokeRect(0,0,128,128); });
    ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set((w-2*t)/2.5,(d-2*t)/2.5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t,d-2*t), new THREE.MeshLambertMaterial({map:ft}));
    floor.rotation.x = -Math.PI/2; floor.position.set(0,0.04,0); floor.receiveShadow = true; grp.add(floor);

    // elewacja: okna (świecą nocą), framugi, wycieraczka, daszek, szyld
    const glass = lamb(0x9fd3f0);
    [-9,-5,5,9].forEach(x => box(3.2,2.2,0.1,glass,x,2.1,fz+0.04,false));
    [-1,1].forEach(sd => box(0.3,3.4,0.5,dark,sd*gap/2,1.7,fz,false));
    box(3.6,0.03,1.4,lamb(0x333333),0,0.07,fz-1,false);
    agdExterior.push(box(7,0.25,2.2,orange,0,3.7,fz+1.1,false));
    const signTex = tex(1024,128,(g,cw,ch)=>{ g.fillStyle='#e0702a'; g.fillRect(0,0,cw,ch); g.strokeStyle='#fff'; g.lineWidth=6; g.strokeRect(5,5,cw-10,ch-10);
      g.fillStyle='#fff'; g.font='bold 78px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('⚡ DOM I AGD ⚡', cw/2, ch/2+4); });
    agdExterior.push(plane(15,1.9,new THREE.MeshBasicMaterial({map:signTex}),0,H-1.45,fz+0.07));
    const label = (text, pw, px, py, pz, ry, bg) => {
      const lt = tex(512,96,(g,cw,ch)=>{ g.fillStyle=bg||'#1f3a52'; g.fillRect(0,0,cw,ch); g.strokeStyle='#fff'; g.lineWidth=4; g.strokeRect(4,4,cw-8,ch-8);
        g.fillStyle='#fff'; g.font='bold 46px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text, cw/2, ch/2+3); });
      return plane(pw, pw*96/512, new THREE.MeshBasicMaterial({map:lt}), px, py, pz, ry);
    };

    // wystawa: cały asortyment ze sprzedawcy (piekarniki, wanny, toalety, lustra) – te same modele, które się kupuje
    const place = (g, x, y, z, ry) => { g.position.set(x, y, z); g.rotation.y = ry || 0; grp.add(g); return g; };

    // piekarniki przy prawej ścianie (front w stronę −X)
    [-7,-5.2,-3.4,-1.6].forEach(z => place(makeOven(false), w/2-t-0.4, 0, z, -Math.PI/2));
    WALLS.push({x:SX+w/2-t-0.4, z:SZ-4.3, w:0.8, d:7.2});
    label('🍳 PIEKARNIKI', 3.4, w/2-t-0.05, 2.2, -4.3, -Math.PI/2, '#8a3a1a');

    // wanny przy lewej ścianie (front w stronę +X, długi bok wzdłuż ściany)
    [-7,-4.6,-2.2].forEach(z => place(makeBathtub(false), -w/2+t+0.45, 0, z, Math.PI/2));
    WALLS.push({x:SX-w/2+t+0.45, z:SZ-4.6, w:0.8, d:6.6});
    label('🛁 WANNY', 3.4, -w/2+t+0.05, 2.2, -4.6, Math.PI/2, '#1f5f7a');

    // toalety przy tylnej ścianie, po lewej stronie (front w stronę +Z)
    [-8,-6.6,-5.2,-3.8].forEach(x => place(makeToilet(false), x, 0, -d/2+t+0.35, 0));
    WALLS.push({x:SX-5.9, z:SZ-d/2+t+0.4, w:4.64, d:0.8});
    label('🚽 TOALETY', 3.4, -5.9, 2.2, -d/2+t+0.05, 0, '#4a5d6b');

    // lustra stojące przy tylnej ścianie, po prawej stronie: w sklepie to zwykła szyba (prawdziwe odbicie działa dopiero w domu gracza)
    const glassTex = tex(64,128,(g,cw,ch)=>{ const gr = g.createLinearGradient(0,0,cw,ch); gr.addColorStop(0,'#e9f6ff'); gr.addColorStop(.45,'#9fd3f0'); gr.addColorStop(.55,'#d6eefc'); gr.addColorStop(1,'#7fb8d8'); g.fillStyle = gr; g.fillRect(0,0,cw,ch); });
    const makeShopMirror = () => {
      const mg = new THREE.Group();
      const mb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; mg.add(m); };
      mb(0.9,1.9,0.08,0x6d4c41,0,1.0,0);                                            // rama
      [-0.38,0.38].forEach(x => mb(0.06,0.05,0.42,0x4e342e,x,0.025,-0.05));         // nóżki
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.78,1.74), new THREE.MeshBasicMaterial({map:glassTex}));
      gl.position.set(0,1.0,0.045); mg.add(gl);                                     // szyba
      return mg;
    };
    [3.5,5.1,6.7,8.3].forEach(x => place(makeShopMirror(), x, 0, -d/2+t+0.3, 0));
    WALLS.push({x:SX+5.9, z:SZ-d/2+t+0.3, w:5.7, d:0.6});
    label('🪞 LUSTRA', 3.4, 5.9, 2.9, -d/2+t+0.05, 0, '#6d4c41');

    // lada kasowa przy wejściu (prawa strona) i kasjer
    box(6,1.1,1.0,orange,8.5,0.55,6.6,true);
    box(6.2,0.06,1.2,M.white,8.5,1.13,6.6,false);
    box(0.5,0.3,0.4,M.black,7.2,1.31,6.55,false);
    box(0.4,0.02,0.3,M.blue,7.2,1.48,6.5,false);
    label('KASA', 1.6, 8.5, 2.4, 7.2, Math.PI, '#b3541c');

    // oświetlenie sufitowe i światło wnętrza
    const lightMat = new THREE.MeshBasicMaterial({color:0xf2f8ff});
    [-8,0,8].forEach(lz => [-8,0,8].forEach(lx => box(3,0.08,0.5,lightMat,lx,H-0.06,lz,false)));
    [-6,6].forEach(lx => { const pl = new THREE.PointLight(0xf4f8ff,0.8,32); pl.position.set(SX+lx,4.2,SZ); scene.add(pl); });

    // sprzedawca
    const npc5 = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc5.add(m); };
    nb(0.7,0.9,0.4,0xe0702a,0,1.25,0);           // koszulka w kolorze sklepu
    nb(0.55,0.8,0.04,0x2c3e50,0,1.2,0.22);       // kamizelka
    nb(0.5,0.5,0.5,0xe0ac69,0,1.95,0);           // głowa
    nb(0.54,0.14,0.54,0x2b2b2b,0,2.27,0);        // włosy
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.25,0.8,0.25,0xe0702a,-0.48,1.25,0); nb(0.25,0.8,0.25,0xe0702a,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x37474f,-0.18,0.4,0); nb(0.25,0.8,0.25,0x37474f,0.18,0.4,0);
    npc5.position.set(SX + 8.5, 0, SZ + 5.0);
    scene.add(npc5); agdNpc = npc5;
    const tc = document.createElement('canvas'); tc.width = 256; tc.height = 64; const tg = tc.getContext('2d');
    tg.fillStyle = 'rgba(0,0,0,.55)'; tg.fillRect(0,8,256,48); tg.fillStyle = '#fff'; tg.font = 'bold 26px sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.fillText('Adam • AGD', 128, 33);
    const tsp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(tc), transparent:true}));
    tsp.scale.set(1.8, 0.45, 1); tsp.position.set(npc5.position.x, 2.7, npc5.position.z); scene.add(tsp);

    BUILDINGS.push({x:SX, z:SZ, w:w, d:d, open:true});
  })();
  function updateApplianceStore(dt, time){
    const inside = Math.abs(player.position.x - AGD.x) < AGD.w/2 - 0.2 && Math.abs(player.position.z - AGD.z) < AGD.d/2 - 0.2;
    if(inside !== agdInside){
      agdInside = inside;
      agdExterior.forEach(m => m.visible = !inside);
      if(agdRoof){ agdRoof.material.colorWrite = !inside; agdRoof.material.depthWrite = !inside; }
    }
    if(agdInside && agdNpc){                                                        // sprzedawca patrzy na gracza
      const target = Math.atan2(player.position.x - agdNpc.position.x, player.position.z - agdNpc.position.z);
      agdNpc.rotation.y += Math.atan2(Math.sin(target - agdNpc.rotation.y), Math.cos(target - agdNpc.rotation.y)) * Math.min(1, dt*5);
    }
  }
  function buyAgd(g){
    if(g.big){
      if(freeSlots() < BIG[g.id].slots){ toast(`${g.n} zajmuje ${BIG[g.id].slots} slotów – zrób miejsce w ekwipunku (wolne: ${freeSlots()})`); return; }
    } else {
      const canHold = inv.some(x => x && x.id === g.id) || inv.indexOf(null) >= 0;
      if(!canHold){ toast('Ekwipunek pełny – zrób miejsce'); return; }
    }
    if(!payAny(g.p, 'zakup w Dom i AGD: ' + g.n.toLowerCase())){
      toast(`${g.n} kosztuje ${g.p} monet 🪙 (masz ${coins()}${bank.opened ? ' + ' + bank.balance + ' na koncie' : ''})`); return;
    }
    if(g.big) addBig(g.id); else addItem(g.id);
    renderInv();
    openAgdTalk('Dziękuję za zakup! Czy mogę jeszcze w czymś pomóc?');
    toast(`Kupiono: ${ITEMS[g.id].i} ${ITEMS[g.id].n}`);
  }
  function openAgdTalk(msg){
    say(msg || 'Witaj w Dom i AGD! Kliknij kwadrat z towarem, żeby go kupić. Wszystko ustawisz w swoim domu; piekarnik zajmie w ekwipunku 8 slotów.',
      [{label:'Wyjdź', fn:closeDialog}],
      '🔌 Adam, sprzedawca AGD', 'agd');
    const grid = document.createElement('div');                       // kwadraty z ikonkami – jak sloty w ekwipunku
    grid.id = 'dlgGrid';
    AGD_GOODS.forEach(g => {
      const it = ITEMS[g.id], el = document.createElement('div');
      el.className = 'slot';
      el.title = `${g.n} – ${g.p} monet` + (g.big ? ` (zajmuje ${BIG[g.id].slots} slotów)` : '');
      el.innerHTML = `<span class="nm">${g.n}</span>${it.i}<span class="n">${coinHTML(g.p + ' 🪙')}</span>`;
      el.onclick = () => buyAgd(g);
      grid.appendChild(el);
    });
    $('dlgText').insertAdjacentElement('afterend', grid);
  }

  // Sklep z wnętrzem (front od strony ulicy, grupa obrócona o 180°)
  const shopWallMat = new THREE.MeshLambertMaterial({color:0xe8d9b5});
  const shopExterior = [];
  let shopInside = false, shopNpc = null;
  const shopNpcDist = () => shopNpc ? Math.hypot(player.position.x - shopNpc.position.x, player.position.z - shopNpc.position.z) : 99;
  (function buildShop(){
    const SX = SHOP.x, SZ = SHOP.z, w = SHOP.w, d = SHOP.d, h = SHOP.h, t = 0.3, gap = 2.4;
    const grp = new THREE.Group(); grp.position.set(SX, 0, SZ); grp.rotation.y = Math.PI; scene.add(grp);
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:SX-px, z:SZ-pz, w:bw, d:bd});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const wood = lamb(0x8a5a2b), dark = lamb(0x3b2a1a);

    // ściany; front (z lokalnym +z) wychodzi na ulicę
    box(w, h, t, shopWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, shopWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, shopWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, shopWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, shopWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-2.7, t, shopWallMat, 0, 2.7+(h-2.7)/2, d/2-t/2, false);

    // dach, sufit, podłoga
    shopExterior.push(box(w+0.6, 0.4, d+0.6, lamb(0xa0452b), 0, h+0.2, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xf5f5f0));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fg = fc.getContext('2d');
    fg.fillStyle = '#e4e4e0'; fg.fillRect(0,0,128,128);
    fg.fillStyle = '#b5bcc4'; fg.fillRect(0,0,64,64); fg.fillRect(64,64,64,64);
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    ft.repeat.set((w-2*t)/2, (d-2*t)/2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), new THREE.MeshLambertMaterial({map:ft}));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    box(2, 0.03, 0.9, lamb(0x2d6cdf), 0, 0.06, d/2-0.8, false);       // wycieraczka

    // elewacja: okna, daszek, szyld
    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.55});
    [-1,1].forEach(sd => box(2.2, 1.3, 0.06, glass, sd*3.2, 1.7, d/2+0.03, false));
    shopExterior.push(box(4.6, 0.1, 1.3, lamb(0xb23a3a), 0, 2.7, d/2+0.65, false));
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64;
    const sg = sc.getContext('2d');
    sg.fillStyle = '#1b3a5c'; sg.fillRect(0,0,256,64);
    sg.fillStyle = '#fff'; sg.font = 'bold 42px sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.fillText('SKLEP', 128, 34);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.15, d/2+0.04); grp.add(sign); shopExterior.push(sign);

    // lada na całą szerokość – za nią stoi sprzedawczyni
    const cz = -1.2;
    box(8.4, 1.1, 0.8, dark, 0, 0.55, cz, true);
    box(8.6, 0.08, 1.0, lamb(0xd7b98a), 0, 1.14, cz, false);
    box(0.5, 0.35, 0.4, lamb(0x222222), 2.8, 1.36, cz, false);        // kasa
    box(0.5, 0.05, 0.35, lamb(0xffffff), -2.0, 1.2, cz, false);       // stojak z telefonem
    const ph = box(0.22, 0.4, 0.03, lamb(0x1d2a44), -2.0, 1.45, cz-0.05, false); ph.rotation.x = -0.25;
    const scr = box(0.18, 0.33, 0.01, new THREE.MeshBasicMaterial({color:0x4aa3df}), -2.0, 1.45, cz-0.03, false); scr.rotation.x = -0.25;

    // regały po bokach
    const gc = [0xe53935,0x1e88e5,0x43a047,0xfdd835,0x8e24aa,0xfb8c00];
    [-1,1].forEach(sd => {
      box(0.2, 2.0, 3.6, lamb(0x6d4c41), sd*4.6, 1.0, -0.3, false);
      col(sd*4.42, -0.3, 0.6, 3.6);
      for(let k=0;k<3;k++){
        box(0.55, 0.05, 3.6, wood, sd*4.42, 0.45+k*0.6, -0.3, false);
        for(let j=0;j<5;j++) box(0.25, 0.28, 0.42, lamb(gc[(j+k*2+(sd>0?1:0))%gc.length]), sd*4.38, 0.45+k*0.6+0.17, -1.8+j*0.7, false);
      }
    });
    // stoiska na środku
    [-1,1].forEach((sd,n) => {
      box(1.4, 0.8, 0.9, wood, sd*2.4, 0.4, 1.0, true);
      for(let j=0;j<3;j++) box(0.3, 0.3, 0.35, lamb(gc[(j+n*3)%gc.length]), sd*2.4 + (j-1)*0.42, 0.95, 1.0, false);
    });
    // rośliny w rogach
    [-1,1].forEach(sd => {
      col(sd*4.1, 2.2, 0.6, 0.6);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.3,0.5,12), lamb(0x8d4b2a)), sd*4.1, 0.25, 2.2);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8), lamb(0x2e7d32)), sd*4.1, 1.0, 2.2);
    });
    // oświetlenie sufitowe
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [[-2.2,0.5],[2.2,0.5],[0,-1.0]].forEach(p => put(new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.5), lampM), p[0], h-0.04, p[1]));

    // szyldy na tylnej ścianie
    const poster = (cw, ch, pw, ph2, draw, px, py) => {
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'), cw, ch);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph2), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));
      m.position.set(px, py, -d/2 + t + 0.02); grp.add(m);
    };
    poster(512, 128, 3, 0.75, (g,cw,ch) => { g.fillStyle = '#1b3a5c'; g.fillRect(0,0,cw,ch); g.fillStyle = '#fff'; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Real Shop', cw/2, ch/2+4); }, 0, 2.95);
    poster(256, 160, 1.3, 0.81, (g,cw,ch) => { g.fillStyle = '#f2c230'; g.fillRect(0,0,cw,ch); g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 40px sans-serif'; g.fillText('TELEFON', cw/2, 50); g.font = 'bold 46px sans-serif'; g.fillText('5 monet', cw/2, 110); }, -3.2, 2.2);
    poster(256, 160, 1.3, 0.81, (g,cw,ch) => { g.fillStyle = '#c62828'; g.fillRect(0,0,cw,ch); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 44px sans-serif'; g.fillText('NOWOŚĆ!', cw/2, ch/2); }, 3.2, 2.2);

    // sprzedawczyni
    const npc2 = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc2.add(m); };
    nb(0.7,0.9,0.4,0x4a90d9,0,1.25,0);          // bluzka
    nb(0.55,0.6,0.04,0x37474f,0,1.3,0.22);      // kamizelka
    nb(0.5,0.5,0.5,0xf1c27d,0,1.95,0);          // głowa
    nb(0.54,0.18,0.54,0x5b3a1a,0,2.25,-0.02);   // włosy
    nb(0.54,0.6,0.1,0x5b3a1a,0,1.95,-0.28);     // długie włosy z tyłu
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.14,0.04,0.02,0xc0392b,0,1.82,0.26);    // usta
    nb(0.25,0.8,0.25,0x4a90d9,-0.48,1.25,0); nb(0.25,0.8,0.25,0x4a90d9,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x333333,-0.18,0.4,0); nb(0.25,0.8,0.25,0x333333,0.18,0.4,0);
    npc2.position.set(SX, 0, SZ + 2.15); npc2.rotation.y = Math.PI;   // stoi za ladą, twarzą do wejścia
    scene.add(npc2); shopNpc = npc2;
    const tag = (draw, sw, sh, y) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
      sp.scale.set(sw, sh, 1); sp.position.set(npc2.position.x, y, npc2.position.z); scene.add(sp); return sp;
    };
    tag(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ola • sprzedawczyni', 128, 33); }, 1.8, 0.45, 2.7);
    shopNpc.userData.mark = tag(g => { g.fillStyle = '#ffd54a'; g.strokeStyle = '#000'; g.lineWidth = 6; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('!', 128, 34); g.fillText('!', 128, 34); }, 1.0, 0.25, 3.1);
  })();
  function updateShopInterior(dt, time){
    const dx = player.position.x - shopNpc.position.x, dz = player.position.z - shopNpc.position.z;
    const target = (shopInside && Math.hypot(dx,dz) < 7) ? Math.atan2(dx, dz) : Math.PI;
    shopNpc.rotation.y += Math.atan2(Math.sin(target - shopNpc.rotation.y), Math.cos(target - shopNpc.rotation.y)) * Math.min(1, dt*5);
    const mk = shopNpc.userData.mark; mk.visible = !hasPhone(); mk.position.y = 3.1 + Math.sin(time*3)*0.07;
    const inside = Math.abs(player.position.x - SHOP.x) < SHOP.w/2 - 0.15 && Math.abs(player.position.z - SHOP.z) < SHOP.d/2 - 0.15;
    if(inside === shopInside) return;
    shopInside = inside;
    shopExterior.forEach(m => m.visible = !inside);
    shopWallMat.transparent = false; shopWallMat.opacity = 1;
    shopWallMat.depthWrite = true;
  }
  function openShopTalk(){
    say('Witaj w Real Shop! Mam dziś w ofercie telefon za 5 monet 🪙. Interesuje cię?', [
      {label:'Zobacz ofertę', fn:() => { closeDialog(); openShop(); }},
      {label:'Tylko się rozglądam', fn:closeDialog}
    ], '🧑‍💼 Ola, sprzedawczyni');
  }


  // ===== Bank z wnętrzem, bankierem i kontem widocznym w telefonie =====
  const BANK = {x:-23, z:-2.5, w:9, d:7, h:3.8};
  BUILDINGS.push({x:BANK.x, z:BANK.z, w:BANK.w, d:BANK.d, open:true});
  const bank = {opened:false, balance:0, number:'', tx:[]};
  let curScreen = 'home', domConfirm = null;
  const bankWallMat = new THREE.MeshLambertMaterial({color:0xdde3ea});
  const bankExterior = [];
  let bankInside = false, bankNpc = null;
  const bankNpcDist = () => bankNpc ? Math.hypot(player.position.x - bankNpc.position.x, player.position.z - bankNpc.position.z) : 99;
  const bankLight = new THREE.PointLight(0xfff0d0, 0, 12);
  (function buildBank(){
    const BX = BANK.x, BZ = BANK.z, w = BANK.w, d = BANK.d, h = BANK.h, t = 0.3, gap = 2.4;
    const grp = new THREE.Group(); grp.position.set(BX, 0, BZ); grp.rotation.y = Math.PI; scene.add(grp);   // front (+z lokalnie) → ulica
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:BX-px, z:BZ-pz, w:bw, d:bd});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const navy = lamb(0x1b3a5c), gold = lamb(0xd4a72c), dark = lamb(0x2b3a55);

    // ściany
    box(w, h, t, bankWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, bankWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, bankWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, bankWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, bankWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-2.8, t, bankWallMat, 0, 2.8+(h-2.8)/2, d/2-t/2, false);

    // dach, sufit, podłoga (marmur)
    bankExterior.push(box(w+0.6, 0.4, d+0.6, navy, 0, h+0.2, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xf5f5f0));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fg = fc.getContext('2d');
    fg.fillStyle = '#eceff1'; fg.fillRect(0,0,128,128);
    fg.fillStyle = '#90a4ae'; fg.fillRect(0,0,64,64); fg.fillRect(64,64,64,64);
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    ft.repeat.set((w-2*t)/2, (d-2*t)/2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), new THREE.MeshLambertMaterial({map:ft}));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    box(2, 0.03, 0.9, navy, 0, 0.06, d/2-0.8, false);       // wycieraczka

    // elewacja: okna, portyk z kolumnami, szyld
    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.55});
    [-1,1].forEach(sd => box(1.8, 1.4, 0.06, glass, sd*3.3, 1.8, d/2+0.03, false));
    bankExterior.push(box(w+0.4, 0.35, 1.5, navy, 0, 3.45, d/2+0.75, false));      // daszek portyku
    bankExterior.push(box(w+0.4, 0.08, 1.5, gold, 0, 3.24, d/2+0.75, false));      // złota listwa
    [-1,1].forEach(sd => [2.2, 4.0].forEach(cx => {
      col(sd*cx, d/2+1.1, 0.5, 0.5);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.25,3.2,14), lamb(0xf4f1e8)), sd*cx, 1.6, d/2+1.1);
    }));
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128;
    const sg = sc.getContext('2d');
    sg.fillStyle = '#1b3a5c'; sg.fillRect(0,0,512,128);
    sg.fillStyle = '#d4a72c'; sg.beginPath(); sg.arc(90,64,38,0,Math.PI*2); sg.fill();
    sg.fillStyle = '#1b3a5c'; sg.font = 'bold 44px sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('$', 90, 66);
    sg.fillStyle = '#fff'; sg.font = 'bold 60px sans-serif'; sg.fillText('REAL BANK', 320, 68);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.95 - 0.1, d/2+1.52); grp.add(sign); bankExterior.push(sign);

    // lada z szybą (okienko kasowe) – za nią stoi bankier
    const cz = -1.3;
    box(w-0.6, 1.1, 0.9, dark, 0, 0.55, cz, true);
    box(w-0.4, 0.08, 1.1, lamb(0xe8e8e8), 0, 1.14, cz, false);
    box(w-0.8, 1.0, 0.04, glass, 0, 1.68, cz+0.35, false);                               // szyba
    box(0.5, 0.35, 0.05, lamb(0x222222), 1.8, 1.4, cz+0.1, false);                       // monitor
    box(0.12, 0.1, 0.12, lamb(0x222222), 1.8, 1.25, cz+0.1, false);

    // bankomat
    box(0.6, 1.9, 0.8, lamb(0x37474f), -w/2+0.6, 0.95, 0.8, true);
    box(0.02, 0.4, 0.5, new THREE.MeshBasicMaterial({color:0x4aa3df}), -w/2+0.91, 1.45, 0.8, false);
    box(0.02, 0.18, 0.3, lamb(0x111111), -w/2+0.91, 1.0, 0.8, false);
    box(0.02, 0.9, 0.9, lamb(0x1b3a5c), -w/2+0.91, 2.05+0.15, 0.8, false);               // podświetlany baner

    // ławka dla klientów + rośliny
    box(0.6, 0.45, 2.2, lamb(0x5d4037), w/2-0.7, 0.23, 1.2, true);
    box(0.12, 0.6, 2.2, lamb(0x5d4037), w/2-0.45, 0.75, 1.2, false);
    [-1,1].forEach(sd => {
      col(sd*(w/2-0.6), 2.6, 0.6, 0.6);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.3,0.5,12), lamb(0x8d4b2a)), sd*(w/2-0.6), 0.25, 2.6);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8), lamb(0x2e7d32)), sd*(w/2-0.6), 1.0, 2.6);
    });
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [[-2.2,0.8],[2.2,0.8],[0,-1.4]].forEach(p => put(new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.5), lampM), p[0], h-0.04, p[1]));

    // plakaty na tylnej ścianie
    const poster = (cw, ch, pw, ph2, draw, px, py) => {
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'), cw, ch);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph2), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));
      m.position.set(px, py, -d/2 + t + 0.02); grp.add(m);
    };
    poster(512, 128, 3, 0.75, (g,cw,ch) => { g.fillStyle = '#1b3a5c'; g.fillRect(0,0,cw,ch); g.fillStyle = '#d4a72c'; g.font = 'bold 58px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Real Bank', cw/2, ch/2+4); }, 0, 3.0);
    poster(256, 160, 1.5, 0.94, (g,cw,ch) => { g.fillStyle = '#f2c230'; g.fillRect(0,0,cw,ch); g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 36px sans-serif'; g.fillText('KONTO', cw/2, 42); g.font = 'bold 50px sans-serif'; g.fillText('0 zł', cw/2, 98); }, -2.9, 2.1);
    poster(256, 256, 1.5, 1.5, (g,cw,ch) => {                                           // drzwi skarbca
      g.fillStyle = '#546e7a'; g.fillRect(0,0,cw,ch);
      g.fillStyle = '#b0bec5'; g.beginPath(); g.arc(128,128,100,0,Math.PI*2); g.fill();
      g.strokeStyle = '#37474f'; g.lineWidth = 10; g.beginPath(); g.arc(128,128,100,0,Math.PI*2); g.stroke();
      g.lineWidth = 12; for(let a=0;a<6;a++){ g.beginPath(); g.moveTo(128,128); g.lineTo(128+Math.cos(a*Math.PI/3)*55, 128+Math.sin(a*Math.PI/3)*55); g.stroke(); }
      g.fillStyle = '#d4a72c'; g.beginPath(); g.arc(128,128,18,0,Math.PI*2); g.fill();
    }, 2.9, 1.9);

    // bankier
    const npc3 = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc3.add(m); };
    nb(0.7,0.9,0.4,0x263238,0,1.25,0);          // garnitur
    nb(0.22,0.6,0.04,0xffffff,0,1.3,0.21);      // koszula
    nb(0.08,0.5,0.05,0xb71c1c,0,1.28,0.23);     // krawat
    nb(0.5,0.5,0.5,0xe0ac69,0,1.95,0);          // głowa
    nb(0.54,0.14,0.54,0x9e9e9e,0,2.25,-0.02);   // siwe włosy
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.2,0.04,0.02,0x222222,-0.12,2.02,0.27); nb(0.2,0.04,0.02,0x222222,0.12,2.02,0.27);  // okulary
    nb(0.25,0.8,0.25,0x263238,-0.48,1.25,0); nb(0.25,0.8,0.25,0x263238,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x1c252a,-0.18,0.4,0); nb(0.25,0.8,0.25,0x1c252a,0.18,0.4,0);
    npc3.position.set(BX, 0, BZ + 2.5); npc3.rotation.y = Math.PI;    // za ladą, twarzą do wejścia
    scene.add(npc3); bankNpc = npc3;
    const tag = (draw, sw, sh, y) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
      sp.scale.set(sw, sh, 1); sp.position.set(npc3.position.x, y, npc3.position.z); scene.add(sp); return sp;
    };
    tag(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Piotr • bankier', 128, 33); }, 1.8, 0.45, 2.7);
    bankNpc.userData.mark = tag(g => { g.fillStyle = '#ffd54a'; g.strokeStyle = '#000'; g.lineWidth = 6; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('!', 128, 34); g.fillText('!', 128, 34); }, 1.0, 0.25, 3.1);
    bankLight.position.set(BX, 3.0, BZ); scene.add(bankLight);
  })();
  function updateBankInterior(dt, time){
    const dx = player.position.x - bankNpc.position.x, dz = player.position.z - bankNpc.position.z;
    const target = (bankInside && Math.hypot(dx,dz) < 7) ? Math.atan2(dx, dz) : Math.PI;
    bankNpc.rotation.y += Math.atan2(Math.sin(target - bankNpc.rotation.y), Math.cos(target - bankNpc.rotation.y)) * Math.min(1, dt*5);
    const mk = bankNpc.userData.mark; mk.visible = !bank.opened; mk.position.y = 3.1 + Math.sin(time*3)*0.07;
    const inside = Math.abs(player.position.x - BANK.x) < BANK.w/2 - 0.15 && Math.abs(player.position.z - BANK.z) < BANK.d/2 - 0.15;
    if(inside === bankInside) return;
    bankInside = inside;
    bankExterior.forEach(m => m.visible = !inside);
    bankWallMat.transparent = false; bankWallMat.opacity = 1;
    bankWallMat.depthWrite = true;
  }
  function logTx(text){ bank.tx.unshift({t:gameClock, text}); if(bank.tx.length > 8) bank.tx.length = 8; }
  function refreshPhoneBank(){ if(phoneEl.style.display === 'flex' && curScreen === 'bank') showScreen('bank'); }
  function openAccount(){
    const rd = n => Array.from({length:n}, () => Math.floor(Math.random()*10)).join('');
    bank.opened = true; bank.balance = 0;
    bank.number = `PL${rd(2)} ${rd(4)} ${rd(4)} ${rd(4)} ${rd(4)} ${rd(4)} ${rd(4)}`;
    logTx('Otwarcie konta');
    refreshPhoneBank();
    say(`Gotowe! Konto zostało założone. Twój numer rachunku: ${bank.number}.` + (hasPhone() ? ' Zobaczysz je w aplikacji Bank w telefonie 📱.' : ' Aby zobaczyć je w aplikacji, kup telefon w sklepie obok 📱.'),
      [{label:'Dziękuję', fn:closeDialog}, {label:'Mam monety do wpłaty', fn:openBankTalk}], '🏦 Piotr, bankier', 'bank');
    toast('Założono konto bankowe 🏦');
  }
  function bankDeposit(n){
    n = Math.min(n, coins());
    if(n <= 0){ toast('Nie masz monet do wpłaty'); return; }
    for(let i=0;i<n;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    bank.balance += n; logTx(`+${n} 🪙 wpłata`);
    renderInv(); renderShop(); refreshPhoneBank(); toast(`Wpłacono ${n} 🪙`); openBankTalk();
  }
  function bankWithdraw(n){
    n = Math.min(n, bank.balance);
    if(n <= 0){ toast('Brak środków na koncie'); return; }
    let got = 0;
    for(let i=0;i<n;i++){ if(addItem('coin')) got++; else break; }
    if(got < n) toast('Ekwipunek pełny!');
    if(got <= 0) return;
    bank.balance -= got; logTx(`−${got} 🪙 wypłata`);
    renderInv(); renderShop(); refreshPhoneBank(); toast(`Wypłacono ${got} 🪙`); openBankTalk();
  }
  function openBankTalk(){
    const who = '🏦 Piotr, bankier';
    if(!bank.opened){
      say('Dzień dobry! Witamy w Real Banku. Założenie konta jest bezpłatne – dostaniesz numer rachunku i podgląd salda w aplikacji bankowej w telefonie. Chcesz założyć konto?',
        [{label:'Załóż konto (0 🪙)', fn:openAccount}, {label:'Nie teraz', fn:closeDialog}], who, 'bank');
    } else {
      say(`Witaj ponownie! Saldo twojego konta: ${bank.balance} 🪙 (masz przy sobie: ${coins()} 🪙). W czym mogę pomóc?`,
        [{label:'Wpłać 5 🪙', fn:() => bankDeposit(5)}, {label:'Wpłać wszystkie', fn:() => bankDeposit(coins())},
         {label:'Wypłać 5 🪙', fn:() => bankWithdraw(5)}, {label:'Do widzenia', fn:closeDialog}], who, 'bank');
    }
  }


  // ===== Biurko (model) =====
  const deskGhostMat = new THREE.MeshBasicMaterial({color:0x4caf50, transparent:true, opacity:0.55, depthWrite:false});
  function makeDesk(ghost){
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    bx(1.6,0.06,0.8,0xb07a43,0,0.75,0);                                           // blat
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(p => { if(p[0] === 1) return; bx(0.06,0.72,0.06,0x5d4037,p[0]*0.74,0.36,p[1]*0.34); });
    bx(0.5,0.68,0.72,0x8a5a2b,0.52,0.37,0);                                       // szafka z szufladami
    bx(0.44,0.2,0.02,0xc49a63,0.52,0.6,0.37); bx(0.44,0.2,0.02,0xc49a63,0.52,0.36,0.37); bx(0.44,0.2,0.02,0xc49a63,0.52,0.12,0.37);
    bx(0.12,0.03,0.03,0x37474f,0.52,0.6,0.39); bx(0.12,0.03,0.03,0x37474f,0.52,0.36,0.39); bx(0.12,0.03,0.03,0x37474f,0.52,0.12,0.39);
    bx(1.0,0.5,0.03,0x8a5a2b,-0.3,0.5,-0.36);                                     // panel z tyłu
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.1,10), M(0xe53935)); mug.position.set(-0.7,0.83,0.2); g.add(mug);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,0.03,10), M(0x263238)); lb.position.set(0.65,0.8,-0.2); g.add(lb);
    bx(0.03,0.35,0.03,0x263238,0.65,0.97,-0.2);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.13,0.14,10), M(0xffd54a)); sh.position.set(0.65,1.2,-0.2); g.add(sh);
    return g;
  }

  function makeChair(ghost){
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    bx(0.5,0.06,0.5,0xb07a43,0,0.45,0);                                            // siedzisko
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(p => bx(0.05,0.42,0.05,0x5d4037,p[0]*0.21,0.21,p[1]*0.21));   // nogi
    bx(0.5,0.45,0.05,0x8a5a2b,0,0.73,-0.225);                                      // oparcie
    return g;
  }

  function makeWardrobe(ghost){
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    bx(1.2,2.1,0.6,0x7a4e2a,0,1.05,0);                                             // korpus
    bx(1.28,0.08,0.66,0x5d3a1a,0,2.14,0);                                          // gzyms
    bx(0.56,1.9,0.03,0xa6733c,-0.29,1.05,0.315); bx(0.56,1.9,0.03,0xa6733c,0.29,1.05,0.315);   // drzwi
    bx(0.03,0.2,0.04,0xd9c79a,-0.07,1.05,0.345); bx(0.03,0.2,0.04,0xd9c79a,0.07,1.05,0.345);   // uchwyty
    bx(1.1,0.06,0.5,0x4a2c12,0,0.03,0);                                            // cokół
    return g;
  }

  function makeToilet(ghost){
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    bx(0.34,0.2,0.4,0xf4f6f7,0,0.12,0.08);                                          // cokół miski
    bx(0.4,0.22,0.52,0xf4f6f7,0,0.32,0.1);                                          // miska
    bx(0.42,0.04,0.5,0xdfe5e8,0,0.45,0.1);                                          // deska
    bx(0.38,0.05,0.34,0xeef1f3,0,0.5,-0.0);                                         // klapa (uchylona do tyłu)
    bx(0.44,0.46,0.2,0xf4f6f7,0,0.62,-0.22);                                        // spłuczka
    bx(0.1,0.03,0.06,0xaab4ba,0,0.87,-0.22);                                        // przycisk
    return g;
  }
  function makeBathtub(ghost){
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    bx(1.8,0.56,0.8,0xf4f6f7,0,0.3,0);                                              // korpus wanny
    bx(1.6,0.03,0.6,0x6ab7e8,0,0.58,0);                                             // woda
    [-0.75,0.75].forEach(x => [-0.32,0.32].forEach(z => bx(0.08,0.04,0.08,0x9aa5ad,x,0.02,z)));   // nóżki
    bx(0.08,0.3,0.08,0xaab4ba,-0.78,0.75,0); bx(0.06,0.06,0.2,0xaab4ba,-0.78,0.9,0.1);              // bateria z wylewką
    return g;
  }
  function makeMirrorFurn(ghost){                                                   // lustro stojące: szyba z odbiciem skierowana w lokalne +z
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    bx(0.9,1.9,0.08,0x6d4c41,0,1.0,0);                                              // rama
    [-0.38,0.38].forEach(x => bx(0.06,0.05,0.42,0x4e342e,x,0.025,-0.05));           // nóżki
    if(ghost){ bx(0.78,1.74,0.02,0x9fd3f0,0,1.0,0.045); }
    else { const mm = makeMirrorPlane(0.78,1.74); mm.position.set(0,1.0,0.045); g.add(mm); }
    return g;
  }

  function makeOven(ghost){
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    const cy = (rt,rb,h,c,x,y,z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,14), M(c)); m.position.set(x,y,z); g.add(m); return m; };
    bx(0.9,0.82,0.7,0xe9edf0,0,0.41,0);                                            // korpus
    bx(0.9,0.04,0.7,0x1d2228,0,0.84,0);                                            // płyta grzewcza
    [[-0.22,-0.15],[0.22,-0.15],[-0.22,0.15],[0.22,0.15]].forEach(p => cy(0.1,0.1,0.015,0x555c63,p[0],0.865,p[1]));   // palniki
    bx(0.9,0.14,0.05,0xcfd6db,0,0.77,0.33);                                        // panel z pokrętłami
    [-0.3,-0.1,0.1,0.3].forEach(x => { const k = cy(0.035,0.035,0.04,0x20252b,x,0.77,0.375); k.rotation.x = Math.PI/2; });
    bx(0.78,0.5,0.03,0x2b2f35,0,0.4,0.355);                                        // drzwi
    g.userData.glass = bx(0.62,0.3,0.012,0x14262f,0,0.42,0.373);                  // szyba (świeci podczas pieczenia)
    bx(0.66,0.03,0.04,0xb0bec5,0,0.62,0.39);                                       // uchwyt
    bx(0.84,0.06,0.03,0xcfd6db,0,0.08,0.34);                                       // cokół
    return g;
  }

  function makeComputer(ghost){
    const g = new THREE.Group();
    const M = c => ghost ? deskGhostMat : new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); m.position.set(x,y,z); if(!ghost) m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    // Monitor z ekranem skierowanym w stronę lokalnego +Z.
    bx(0.62,0.39,0.055,0x20252b,0,0.39,-0.12);
    bx(0.55,0.32,0.012,0x286b9b,0,0.40,-0.086);
    bx(0.13,0.12,0.12,0x343a40,0,0.16,-0.12);
    bx(0.34,0.035,0.22,0x343a40,0,0.075,-0.02);
    // Klawiatura i obudowa komputera.
    bx(0.48,0.035,0.17,0x252a30,0,0.035,0.22);
    for(let i=0;i<3;i++) bx(0.40,0.008,0.018,0x8c969e,0,0.056,0.16+i*0.045);
    bx(0.22,0.52,0.34,0x343a40,0.53,0.27,-0.12);
    bx(0.12,0.025,0.02,0x5bc0eb,0.53,0.36,0.055);
    return g;
  }

  // ===== Lampa sufitowa: wisi na suficie (początek modelu = punkt mocowania), nie zajmuje miejsca na podłodze =====
  function makeLamp(ghost){
    const g = new THREE.Group();
    const M = (c, o) => ghost ? deskGhostMat : new THREE.MeshLambertMaterial(Object.assign({color:c}, o || {}));
    const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
    add(new THREE.CylinderGeometry(0.14,0.14,0.04,16), M(0xeeeeee), -0.02);                                   // rozeta przy suficie
    add(new THREE.CylinderGeometry(0.012,0.012,0.4,6), M(0x263238), -0.24);                                   // przewód
    add(new THREE.CylinderGeometry(0.08,0.26,0.24,18,1,true), M(0xe07b39, {side:THREE.DoubleSide}), -0.56);   // klosz
    add(new THREE.SphereGeometry(0.09,12,10), ghost ? deskGhostMat : new THREE.MeshBasicMaterial({color:0xfff4cc}), -0.64);   // żarówka
    if(!ghost){
      if(!makeLamp.glowTex){
        const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c2 = cv.getContext('2d');
        const gr = c2.createRadialGradient(64,64,0,64,64,64);
        gr.addColorStop(0,'rgba(255,236,180,1)'); gr.addColorStop(0.25,'rgba(255,214,140,0.55)'); gr.addColorStop(1,'rgba(255,190,100,0)');
        c2.fillStyle = gr; c2.fillRect(0,0,128,128); makeLamp.glowTex = new THREE.CanvasTexture(cv);
      }
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:makeLamp.glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false}));
      glow.scale.set(1.5,1.5,1); glow.position.y = -0.66; g.add(glow);                                                           // ciepła poświata wokół żarówki
    }
    if(ghost) add(new THREE.CylinderGeometry(0.25,0.25,0.02,20), deskGhostMat, 0.09 - HOME.h);                  // znacznik na podłodze pod lampą
    return g;
  }
  // Stała pula świateł (zmiana liczby świateł w scenie wymuszałaby przekompilowanie shaderów) – świecą pierwsze 3 lampy.
  const lampPool = [];
  for(let i = 0; i < 3; i++){ const l = new THREE.PointLight(0xffd9a0, 0, 12); l.userData.used = false; scene.add(l); lampPool.push(l); }
  function attachLampLight(pd){
    const l = lampPool.find(q => !q.userData.used); if(!l) return;
    l.userData.used = true; l.position.set(pd.wall.x, HOME.h - 0.75, pd.wall.z); pd.light = l;
  }
  function releaseLampLight(pd){ if(pd.light){ pd.light.userData.used = false; pd.light.intensity = 0; pd.light = null; } }

  // ===== Sklep meblowy Mebelek =====
  const FURN = {x:-44, z:-2.5, w:9, d:7, h:3.8};
  BUILDINGS.push({x:FURN.x, z:FURN.z, w:FURN.w, d:FURN.d, open:true});
  const furn = {bought:0};
  const furnWallMat = new THREE.MeshLambertMaterial({color:0xf1e2c6});
  const furnExterior = [];
  let furnInside = false, furnNpc = null;
  const furnNpcDist = () => furnNpc ? Math.hypot(player.position.x - furnNpc.position.x, player.position.z - furnNpc.position.z) : 99;
  const furnLight = new THREE.PointLight(0xfff0d0, 0, 12);
  const DESK_PRICE = 15;
  const CHAIR_PRICE = 15;
  const WARDROBE_PRICE = 25;
  const LAMP_PRICE = 16;
  (function buildFurnShop(){
    const FX = FURN.x, FZ = FURN.z, w = FURN.w, d = FURN.d, h = FURN.h, t = 0.3, gap = 2.4;
    const grp = new THREE.Group(); grp.position.set(FX, 0, FZ); grp.rotation.y = Math.PI; scene.add(grp);   // front → ulica
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:FX-px, z:FZ-pz, w:bw, d:bd});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const wood = lamb(0x8a5a2b), dark = lamb(0x4e342e), orange = lamb(0xe07b39);

    box(w, h, t, furnWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, furnWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, furnWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, furnWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, furnWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-2.8, t, furnWallMat, 0, 2.8+(h-2.8)/2, d/2-t/2, false);

    furnExterior.push(box(w+0.6, 0.4, d+0.6, lamb(0x6d4c41), 0, h+0.2, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xf5f0e6));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fg = fc.getContext('2d');
    fg.fillStyle = '#c8a26a'; fg.fillRect(0,0,128,128);
    fg.strokeStyle = '#a07a46'; fg.lineWidth = 3; for(let i=0;i<4;i++){ fg.beginPath(); fg.moveTo(0,i*32+16); fg.lineTo(128,i*32+16); fg.stroke(); }
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set((w-2*t)/2, (d-2*t)/2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), new THREE.MeshLambertMaterial({map:ft}));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    box(2, 0.03, 0.9, orange, 0, 0.06, d/2-0.8, false);

    // elewacja
    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.55});
    [-1,1].forEach(sd => box(1.9, 1.4, 0.06, glass, sd*3.3, 1.8, d/2+0.03, false));
    furnExterior.push(box(5.0, 0.1, 1.3, orange, 0, 2.85, d/2+0.65, false));
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128;
    const sg = sc.getContext('2d');
    sg.fillStyle = '#5d3a1a'; sg.fillRect(0,0,512,128);
    sg.fillStyle = '#e07b39'; sg.fillRect(38,40,44,10); sg.fillRect(40,50,8,34); sg.fillRect(72,50,8,34); sg.fillRect(40,28,8,12);   // krzesło
    sg.fillStyle = '#fff'; sg.font = 'bold 64px sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('MEBELEK', 300, 68);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.25, d/2+0.04); grp.add(sign); furnExterior.push(sign);

    // lada sprzedawcy (po prawej, za nią stoi Janusz)
    box(3.7, 1.1, 0.8, dark, 2.45, 0.55, -2.0, true);
    box(3.9, 0.08, 1.0, lamb(0xd7b98a), 2.45, 1.14, -2.0, false);
    box(0.5, 0.35, 0.4, lamb(0x222222), 3.4, 1.36, -2.0, false);

    // wystawa: szafa, regał, sofa, biurko demonstracyjne, dywan, lampa
    box(1.7, 2.3, 0.6, wood, -3.2, 1.15, -2.85, true);
    box(0.04, 2.0, 0.02, dark, -3.2, 1.15, -2.54, false);
    box(1.2, 1.9, 0.35, lamb(0x6d4c41), -1.4, 0.95, -3.0, true);
    const bc = [0xc62828,0x1565c0,0x2e7d32,0xf9a825,0x6a1b9a];
    for(let r=0;r<3;r++){ box(1.1,0.04,0.33,wood,-1.4,0.4+r*0.6,-3.0,false); for(let j=0;j<5;j++) box(0.14,0.3,0.22,lamb(bc[(j+r)%5]),-1.8+j*0.2,0.57+r*0.6,-3.0,false); }
    box(0.9, 0.45, 2.0, lamb(0x5b7a99), -3.55, 0.28, 0.9, true);                 // sofa
    box(0.25, 0.9, 2.0, lamb(0x4a6784), -3.95, 0.55, 0.9, false);
    box(0.7, 0.2, 0.9, lamb(0x7f9cba), -3.45, 0.55, 0.45, false); box(0.7, 0.2, 0.9, lamb(0x7f9cba), -3.45, 0.55, 1.35, false);
    box(2.4, 0.03, 1.6, lamb(0xa8322d), -1.4, 0.06, 1.1, false);                   // dywan
    const dd = makeDesk(false); dd.position.set(-1.4, 0.07, 1.1); grp.add(dd); col(-1.4, 1.1, 1.6, 0.8);
    box(0.04, 0.9, 0.04, dark, -1.4, 0.45, 2.1, false);                            // stojak z ceną
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128;
    const pg = pc.getContext('2d'); pg.fillStyle = '#fff6d6'; pg.fillRect(0,0,256,128); pg.strokeStyle = '#e07b39'; pg.lineWidth = 8; pg.strokeRect(4,4,248,120);
    pg.fillStyle = '#222'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.font = 'bold 40px sans-serif'; pg.fillText('BIURKO', 128, 40); pg.font = 'bold 44px sans-serif'; pg.fillStyle = '#c0392b'; pg.fillText(DESK_PRICE + ' monet', 128, 92);
    const price = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(pc)}));
    price.position.set(-1.4, 1.05, 2.12); grp.add(price);
    const cc = makeChair(false); cc.position.set(0.4, 0.07, 1.1); grp.add(cc); col(0.4, 1.1, 0.5, 0.5);   // krzesło na wystawie
    box(0.04, 0.9, 0.04, dark, 0.4, 0.45, 1.9, false);
    const kc = document.createElement('canvas'); kc.width = 256; kc.height = 128;
    const kg = kc.getContext('2d'); kg.fillStyle = '#fff6d6'; kg.fillRect(0,0,256,128); kg.strokeStyle = '#e07b39'; kg.lineWidth = 8; kg.strokeRect(4,4,248,120);
    kg.fillStyle = '#222'; kg.textAlign = 'center'; kg.textBaseline = 'middle'; kg.font = 'bold 40px sans-serif'; kg.fillText('KRZESŁO', 128, 40); kg.font = 'bold 44px sans-serif'; kg.fillStyle = '#c0392b'; kg.fillText(CHAIR_PRICE + ' monet', 128, 92);
    const kprice = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(kc)}));
    kprice.position.set(0.4, 1.05, 1.92); grp.add(kprice);
    const ww = makeWardrobe(false); ww.position.set(2.6, 0.07, 0.9); grp.add(ww); col(2.6, 0.9, 1.2, 0.6);   // szafa na wystawie
    box(0.04, 0.9, 0.04, dark, 2.6, 0.45, 1.75, false);
    const wc = document.createElement('canvas'); wc.width = 256; wc.height = 128;
    const wg = wc.getContext('2d'); wg.fillStyle = '#fff6d6'; wg.fillRect(0,0,256,128); wg.strokeStyle = '#e07b39'; wg.lineWidth = 8; wg.strokeRect(4,4,248,120);
    wg.fillStyle = '#222'; wg.textAlign = 'center'; wg.textBaseline = 'middle'; wg.font = 'bold 40px sans-serif'; wg.fillText('SZAFA', 128, 40); wg.font = 'bold 44px sans-serif'; wg.fillStyle = '#c0392b'; wg.fillText(WARDROBE_PRICE + ' monet', 128, 92);
    const wprice = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(wc)}));
    wprice.position.set(2.6, 1.05, 1.77); grp.add(wprice);
    const lmp = makeLamp(false); lmp.position.set(1.4, h, 1.95); grp.add(lmp);                      // lampa sufitowa na wystawie
    box(0.04, 0.9, 0.04, dark, 1.4, 0.45, 1.95, false);
    const lc = document.createElement('canvas'); lc.width = 256; lc.height = 128;
    const lg = lc.getContext('2d'); lg.fillStyle = '#fff6d6'; lg.fillRect(0,0,256,128); lg.strokeStyle = '#e07b39'; lg.lineWidth = 8; lg.strokeRect(4,4,248,120);
    lg.fillStyle = '#222'; lg.textAlign = 'center'; lg.textBaseline = 'middle'; lg.font = 'bold 40px sans-serif'; lg.fillText('LAMPA', 128, 40); lg.font = 'bold 44px sans-serif'; lg.fillStyle = '#c0392b'; lg.fillText(LAMP_PRICE + ' monet', 128, 92);
    const lprice = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(lc)}));
    lprice.position.set(1.4, 1.05, 1.97); grp.add(lprice);
    box(0.4, 0.04, 0.4, dark, 0.2, 0.02, -2.9, false);                              // lampa stojąca
    box(0.05, 1.7, 0.05, dark, 0.2, 0.87, -2.9, false);
    put(new THREE.Mesh(new THREE.ConeGeometry(0.28,0.4,12), new THREE.MeshBasicMaterial({color:0xffe08a})), 0.2, 1.85, -2.9);
    [-1,1].forEach(sd => {                                                          // rośliny
      col(sd*(w/2-0.6), 2.6, 0.6, 0.6);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.3,0.5,12), lamb(0x8d4b2a)), sd*(w/2-0.6), 0.25, 2.6);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8), lamb(0x2e7d32)), sd*(w/2-0.6), 1.0, 2.6);
    });
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [[-2.2,0.6],[2.2,0.6],[0,-1.6]].forEach(p => put(new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.5), lampM), p[0], h-0.04, p[1]));

    const poster = (cw, ch, pw, ph2, draw, px, py) => {
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'), cw, ch);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph2), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));
      m.position.set(px, py, -d/2 + t + 0.02); grp.add(m);
    };
    poster(512, 128, 3, 0.75, (g,cw,ch) => { g.fillStyle = '#5d3a1a'; g.fillRect(0,0,cw,ch); g.fillStyle = '#ffb066'; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Mebelek', cw/2, ch/2+4); }, 0.6, 3.05);
    poster(256, 160, 1.4, 0.88, (g,cw,ch) => { g.fillStyle = '#e07b39'; g.fillRect(0,0,cw,ch); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 34px sans-serif'; g.fillText('Urządź swój', cw/2, 52); g.fillText('dom!', cw/2, 100); }, 3.2, 2.2);

    // sprzedawca
    const npc4 = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc4.add(m); };
    nb(0.7,0.9,0.4,0xb23a3a,0,1.25,0);          // koszula w kratę
    nb(0.7,0.12,0.42,0x3b2a1a,0,1.0,0);          // pas
    nb(0.55,0.5,0.04,0x6d4c41,0,1.2,0.22);       // fartuch
    nb(0.5,0.5,0.5,0xe0ac69,0,1.95,0);           // głowa
    nb(0.5,0.18,0.05,0x5d4037,0,1.78,0.26);      // broda
    nb(0.56,0.12,0.56,0x5d4037,0,2.25,-0.02);    // włosy
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.25,0.8,0.25,0xb23a3a,-0.48,1.25,0); nb(0.25,0.8,0.25,0xb23a3a,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x37474f,-0.18,0.4,0); nb(0.25,0.8,0.25,0x37474f,0.18,0.4,0);
    npc4.position.set(FX - 2.45, 0, FZ + 2.75); npc4.rotation.y = Math.PI;
    scene.add(npc4); furnNpc = npc4;
    const tag = (draw, sw, sh, y) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
      sp.scale.set(sw, sh, 1); sp.position.set(npc4.position.x, y, npc4.position.z); scene.add(sp); return sp;
    };
    tag(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Janusz • meble', 128, 33); }, 1.8, 0.45, 2.7);
    furnNpc.userData.mark = tag(g => { g.fillStyle = '#ffd54a'; g.strokeStyle = '#000'; g.lineWidth = 6; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('!', 128, 34); g.fillText('!', 128, 34); }, 1.0, 0.25, 3.1);
    furnLight.position.set(FX, 3.0, FZ); scene.add(furnLight);
  })();
  function updateFurnInterior(dt, time){
    const dx = player.position.x - furnNpc.position.x, dz = player.position.z - furnNpc.position.z;
    const target = (furnInside && Math.hypot(dx,dz) < 7) ? Math.atan2(dx, dz) : Math.PI;
    furnNpc.rotation.y += Math.atan2(Math.sin(target - furnNpc.rotation.y), Math.cos(target - furnNpc.rotation.y)) * Math.min(1, dt*5);
    const mk = furnNpc.userData.mark; mk.visible = furn.bought === 0; mk.position.y = 3.1 + Math.sin(time*3)*0.07;
    const inside = Math.abs(player.position.x - FURN.x) < FURN.w/2 - 0.15 && Math.abs(player.position.z - FURN.z) < FURN.d/2 - 0.15;
    if(inside === furnInside) return;
    furnInside = inside;
    furnExterior.forEach(m => m.visible = !inside);
    furnWallMat.transparent = false; furnWallMat.opacity = 1;
    furnWallMat.depthWrite = true;
  }
  function buyDesk(){
    if(coins() < DESK_PRICE){ toast(`Biurko kosztuje ${DESK_PRICE} monet 🪙 (masz ${coins()})`); return; }
    const k = inv.findIndex(x => x && x.id === 'coin');
    for(let i=0;i<DESK_PRICE;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    if(!addDesk()){
      for(let i=0;i<DESK_PRICE;i++) addItem('coin');
      toast(`Biurko zajmuje ${DESK_SLOTS} slotów – zrób miejsce w ekwipunku (wolne: ${freeSlots()})`); renderInv(); return;
    }
    furn.bought++; renderInv(); renderShop(); openFurnTalk('Dziękuję za zakup biurka! Czy mogę jeszcze w czymś pomóc?');
    toast('Kupiono biurko 🗄️ Zajmuje 10 slotów – ustaw je w swoim domu');
  }
  function buyChair(){
    if(coins() < CHAIR_PRICE){ toast(`Krzesło kosztuje ${CHAIR_PRICE} monet 🪙 (masz ${coins()})`); return; }
    for(let i=0;i<CHAIR_PRICE;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    if(!addItem('chair')){
      for(let i=0;i<CHAIR_PRICE;i++) addItem('coin');
      toast('Ekwipunek pełny – zrób miejsce na krzesło'); renderInv(); return;
    }
    furn.bought++; renderInv(); renderShop(); openFurnTalk('Dziękuję za zakup krzesła! Czy mogę jeszcze w czymś pomóc?');
    toast('Kupiono krzesło 🪑 – ustaw je w swoim domu');
  }
  function buyWardrobe(){
    if(coins() < WARDROBE_PRICE){ toast(`Szafa kosztuje ${WARDROBE_PRICE} monet 🪙 (masz ${coins()})`); return; }
    for(let i=0;i<WARDROBE_PRICE;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    if(!addItem('wardrobe')){
      for(let i=0;i<WARDROBE_PRICE;i++) addItem('coin');
      toast('Ekwipunek pełny – zrób miejsce na szafę'); renderInv(); return;
    }
    furn.bought++; renderInv(); renderShop(); openFurnTalk('Dziękuję za zakup szafy! Czy mogę jeszcze w czymś pomóc?');
    toast('Kupiono szafę 🚪 – ustaw ją w swoim domu');
  }
  function buyLamp(){
    if(coins() < LAMP_PRICE){ toast(`Lampa kosztuje ${LAMP_PRICE} monet 🪙 (masz ${coins()})`); return; }
    for(let i=0;i<LAMP_PRICE;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    if(!addItem('lamp')){
      for(let i=0;i<LAMP_PRICE;i++) addItem('coin');
      toast('Ekwipunek pełny – zrób miejsce na lampę'); renderInv(); return;
    }
    furn.bought++; renderInv(); renderShop(); openFurnTalk('Dziękuję za zakup lampy! Czy mogę jeszcze w czymś pomóc?');
    toast('Kupiono lampę 💡 – zamontujesz ją na suficie w swoim domu');
  }
  function openFurnTalk(msg){
    say(msg || `Witaj w Mebelku! Mam solidne biurko z szufladami za ${DESK_PRICE} monet 🪙 (w ekwipunku zajmie ${DESK_SLOTS} slotów) wygodne krzesło za ${CHAIR_PRICE} monet 🪙 (1 slot), pojemną szafę za ${WARDROBE_PRICE} monet 🪙 (1 slot) i lampę sufitową za ${LAMP_PRICE} monet 🪙 (1 slot). Meble postawisz w dowolnym miejscu w swoim domu, a lampę zamontujesz na jego suficie.`,
      [{label:`Kup biurko (${DESK_PRICE} 🪙)`, fn:buyDesk}, {label:`Kup krzesło (${CHAIR_PRICE} 🪙)`, fn:buyChair}, {label:`Kup szafę (${WARDROBE_PRICE} 🪙)`, fn:buyWardrobe}, {label:`Kup lampę (${LAMP_PRICE} 🪙)`, fn:buyLamp}, {label:'Wyjdź', fn:closeDialog}], '🪑 Janusz, sprzedawca mebli', 'furn');
  }

  // ===== Sklep z ubraniami przy ulicy Społecznej (wschodnia strona, drzwi na zachód – w stronę jezdni) =====
  const CLOTH = {x:144, z:56, w:10, d:7, h:3.6};                 // w – wzdłuż osi Z świata, d – wzdłuż osi X świata
  BUILDINGS.push({x:CLOTH.x, z:CLOTH.z, w:CLOTH.d, d:CLOTH.w, open:true});
  const HAT_PRICE = 10, CAP_PRICE = 8, SHIRT_PRICE = 6, SHOES_PRICE = 12, PANTS_PRICE = 10, PANTS_DEF = 0x333333;
  // Buty mają dwa kolory (cholewka + podeszwa) zapisane w jednej liczbie: cholewka + podeszwa * 0x1000000
  const SH_DEF_UP = 0x1d1d1f, SH_DEF_SOLE = 0xe8e8e8;
  const shoeEnc = (u, so) => (u & 0xffffff) + (so & 0xffffff) * 0x1000000;
  const shoeUp = v => v % 0x1000000, shoeSole = v => Math.floor(v / 0x1000000);
  const NOSTACK = id => id === 'shirt' || id === 'shoes' || id === 'pants';        // każda sztuka w osobnym slocie
  function buildCapGroup(color){                         // czapka z daszkiem: kopuła + półokrągły daszek + guzik, jeden materiał (jeden kolor)
    const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({color});
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI*2, 0, Math.PI/2), m); crown.scale.y = 0.8;
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 18, 1, false, -Math.PI/2, Math.PI), m);
    visor.position.set(0, 0.02, 0.2); visor.rotation.x = 0.18;                 // daszek z przodu (+z), lekko opuszczony
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m); knob.position.y = 0.24;
    g.add(crown, visor, knob); g.userData.mat = m; return g;
  }
  const clothWallMat = new THREE.MeshLambertMaterial({color:0xf4e4ee});
  const clothExterior = [];
  let clothInside = false, clothNpc = null;
  const clothNpcDist = () => clothNpc ? Math.hypot(player.position.x - clothNpc.position.x, player.position.z - clothNpc.position.z) : 99;
  const clothLight = new THREE.PointLight(0xfff0e8, 0, 12);
  (function buildClothShop(){
    const CX = CLOTH.x, CZ = CLOTH.z, w = CLOTH.w, d = CLOTH.d, h = CLOTH.h, t = 0.3, gap = 2.4;
    const grp = new THREE.Group(); grp.position.set(CX, 0, CZ); grp.rotation.y = -Math.PI/2; scene.add(grp);   // front (lokalne +z) → -x
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:CX - pz, z:CZ + px, w:bd, d:bw});                         // lokalne → świat (obrót -90°)
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const dark = lamb(0x4e342e), pink = lamb(0xd1477a), metal = lamb(0xb0b4b8);

    box(w, h, t, clothWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, clothWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, clothWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, clothWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, clothWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-2.7, t, clothWallMat, 0, 2.7+(h-2.7)/2, d/2-t/2, false);

    clothExterior.push(box(w+0.6, 0.4, d+0.6, lamb(0x7b3f5c), 0, h+0.2, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xfaf3f6));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xc9b4a2));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    box(2, 0.03, 0.9, pink, 0, 0.06, d/2-0.8, false);

    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.55});
    [-1,1].forEach(sd => box(2.4, 1.4, 0.06, glass, sd*3.6, 1.8, d/2+0.03, false));
    clothExterior.push(box(5.0, 0.1, 1.3, pink, 0, 2.7, d/2+0.65, false));
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128;
    const sg = sc.getContext('2d'); sg.fillStyle = '#7b3f5c'; sg.fillRect(0,0,512,128);
    sg.fillStyle = '#ffd6e8'; sg.font = 'bold 60px sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('👕 ZARA\'Z 🎩', 256, 68);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.1, d/2+0.04); grp.add(sign); clothExterior.push(sign);

    // wieszaki z ubraniami przy tylnej ścianie (dekoracja)
    const cc = [0xc62828,0x1565c0,0x2e7d32,0xf9a825,0x6a1b9a,0x00838f];
    [-2.6,0.2].forEach(rx => {
      box(2.4, 0.05, 0.05, metal, rx, 1.7, -d/2+t+0.5, false);
      col(rx, -d/2+t+0.5, 2.4, 0.5);
      for(let i=0;i<7;i++) box(0.16, 0.8, 0.3, lamb(cc[(i+(rx>0?2:0))%cc.length]), rx-1.0+i*0.33, 1.25, -d/2+t+0.5, false);
    });
    // stojak z kapeluszem i ceną
    box(0.5, 0.9, 0.5, dark, -3.6, 0.45, 1.6, true);
    const hd = new THREE.Group(), hmat = new THREE.MeshLambertMaterial({color:0x222222});
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.05,16), hmat);
    const ht = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.27,0.35,16), hmat); ht.position.y = 0.2;
    hd.add(hb, ht); hd.position.set(-3.6, 0.95, 1.6); hd.children.forEach(m => m.castShadow = true); grp.add(hd);
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128;
    const pg = pc.getContext('2d'); pg.fillStyle = '#fff6d6'; pg.fillRect(0,0,256,128); pg.strokeStyle = '#d1477a'; pg.lineWidth = 8; pg.strokeRect(4,4,248,120);
    pg.fillStyle = '#222'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.font = 'bold 40px sans-serif'; pg.fillText('KAPELUSZ', 128, 40);
    pg.font = 'bold 44px sans-serif'; pg.fillStyle = '#c0392b'; pg.fillText(HAT_PRICE + ' monet', 128, 92);
    const price = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(pc)}));
    price.position.set(-3.6, 0.7, 1.86); grp.add(price);
    // stojak z czapką z daszkiem i ceną
    box(0.5, 0.9, 0.5, dark, -2.4, 0.45, 1.6, true);
    const cdisp = buildCapGroup(0xc62828); cdisp.position.set(-2.4, 0.9, 1.6); cdisp.rotation.y = 0.35;
    cdisp.traverse(o => { if(o.isMesh) o.castShadow = true; }); grp.add(cdisp);
    const cpc = document.createElement('canvas'); cpc.width = 256; cpc.height = 128;
    const cpg = cpc.getContext('2d'); cpg.fillStyle = '#fff6d6'; cpg.fillRect(0,0,256,128); cpg.strokeStyle = '#d1477a'; cpg.lineWidth = 8; cpg.strokeRect(4,4,248,120);
    cpg.fillStyle = '#222'; cpg.textAlign = 'center'; cpg.textBaseline = 'middle'; cpg.font = 'bold 27px sans-serif'; cpg.fillText('CZAPKA Z DASZKIEM', 128, 40);
    cpg.font = 'bold 44px sans-serif'; cpg.fillStyle = '#c0392b'; cpg.fillText(CAP_PRICE + ' monet', 128, 92);
    const cprice = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cpc)}));
    cprice.position.set(-2.4, 0.7, 1.86); grp.add(cprice);

    // stojak z koszulką i ceną
    box(0.5, 0.9, 0.5, dark, -1.2, 0.45, 1.6, true);
    const sdisp = new THREE.Group(), smat = new THREE.MeshLambertMaterial({color:0x2d6cdf});
    const sTorso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.26), smat); sTorso.position.y = 0.3;
    const sArmL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.2), smat), sArmR = sArmL.clone();
    sArmL.position.set(-0.33, 0.38, 0); sArmR.position.set(0.33, 0.38, 0); sArmL.rotation.z = 0.5; sArmR.rotation.z = -0.5;
    sdisp.add(sTorso, sArmL, sArmR); sdisp.position.set(-1.2, 0.95, 1.6); sdisp.rotation.y = 0.2;
    sdisp.children.forEach(m => m.castShadow = true); grp.add(sdisp);
    const spc = document.createElement('canvas'); spc.width = 256; spc.height = 128;
    const spg = spc.getContext('2d'); spg.fillStyle = '#fff6d6'; spg.fillRect(0,0,256,128); spg.strokeStyle = '#d1477a'; spg.lineWidth = 8; spg.strokeRect(4,4,248,120);
    spg.fillStyle = '#222'; spg.textAlign = 'center'; spg.textBaseline = 'middle'; spg.font = 'bold 40px sans-serif'; spg.fillText('KOSZULKA', 128, 40);
    spg.font = 'bold 44px sans-serif'; spg.fillStyle = '#c0392b'; spg.fillText(SHIRT_PRICE + ' monet', 128, 92);
    const sprice = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(spc)}));
    sprice.position.set(-1.2, 0.7, 1.86); grp.add(sprice);

    // stojak z butami i ceną
    box(0.5, 0.9, 0.5, dark, 3.6, 0.45, 1.6, true);
    const bdisp = new THREE.Group(), bTop = lamb(0x1d1d1f), bSole = lamb(0xe8e8e8);
    [-0.13, 0.13].forEach(ox => {
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.12,0.38), bTop); t1.position.set(ox, 0.09, 0);
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.21,0.05,0.4), bSole); s1.position.set(ox, 0.025, 0);
      t1.castShadow = s1.castShadow = true; bdisp.add(t1, s1);
    });
    bdisp.position.set(3.6, 0.9, 1.6); bdisp.rotation.y = -0.3; grp.add(bdisp);
    const bpc = document.createElement('canvas'); bpc.width = 256; bpc.height = 128;
    const bpg = bpc.getContext('2d'); bpg.fillStyle = '#fff6d6'; bpg.fillRect(0,0,256,128); bpg.strokeStyle = '#d1477a'; bpg.lineWidth = 8; bpg.strokeRect(4,4,248,120);
    bpg.fillStyle = '#222'; bpg.textAlign = 'center'; bpg.textBaseline = 'middle'; bpg.font = 'bold 40px sans-serif'; bpg.fillText('BUTY', 128, 40);
    bpg.font = 'bold 44px sans-serif'; bpg.fillStyle = '#c0392b'; bpg.fillText(SHOES_PRICE + ' monet', 128, 92);
    const bprice = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(bpc)}));
    bprice.position.set(3.6, 0.7, 1.86); grp.add(bprice);

    // stojak ze spodniami i ceną
    box(0.5, 0.9, 0.5, dark, 2.4, 0.45, 1.6, true);
    const pdisp = new THREE.Group(), pmat = lamb(0x333333);
    const pWaist = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.1,0.18), pmat); pWaist.position.y = 0.45;
    const pLegL = new THREE.Mesh(new THREE.BoxGeometry(0.17,0.5,0.16), pmat), pLegR = pLegL.clone();
    pLegL.position.set(-0.1, 0.2, 0); pLegR.position.set(0.1, 0.2, 0);
    pdisp.add(pWaist, pLegL, pLegR); pdisp.position.set(2.4, 0.95, 1.6); pdisp.rotation.y = -0.2;
    pdisp.children.forEach(m => m.castShadow = true); grp.add(pdisp);
    const ppc = document.createElement('canvas'); ppc.width = 256; ppc.height = 128;
    const ppg = ppc.getContext('2d'); ppg.fillStyle = '#fff6d6'; ppg.fillRect(0,0,256,128); ppg.strokeStyle = '#d1477a'; ppg.lineWidth = 8; ppg.strokeRect(4,4,248,120);
    ppg.fillStyle = '#222'; ppg.textAlign = 'center'; ppg.textBaseline = 'middle'; ppg.font = 'bold 40px sans-serif'; ppg.fillText('SPODNIE', 128, 40);
    ppg.font = 'bold 44px sans-serif'; ppg.fillStyle = '#c0392b'; ppg.fillText(PANTS_PRICE + ' monet', 128, 92);
    const pprice = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(ppc)}));
    pprice.position.set(2.4, 0.7, 1.86); grp.add(pprice);

    // lada sprzedawcy
    box(3.7, 1.1, 0.8, dark, 2.45, 0.55, -1.2, true);
    box(3.9, 0.08, 1.0, lamb(0xd7b98a), 2.45, 1.14, -1.2, false);
    box(0.5, 0.35, 0.4, lamb(0x222222), 3.4, 1.36, -1.2, false);
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [[-2.2,0.6],[2.2,0.6],[0,-1.6]].forEach(q => put(new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.5), lampM), q[0], h-0.04, q[1]));

    // sprzedawczyni
    const npc = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc.add(m); };
    nb(0.7,0.9,0.4,0xd1477a,0,1.25,0); nb(0.5,0.5,0.5,0xf0c8a0,0,1.95,0); nb(0.56,0.2,0.56,0x6d3b1a,0,2.25,-0.02); nb(0.56,0.45,0.1,0x6d3b1a,0,2.0,-0.25);
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.25,0.8,0.25,0xd1477a,-0.48,1.25,0); nb(0.25,0.8,0.25,0xd1477a,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x37474f,-0.18,0.4,0); nb(0.25,0.8,0.25,0x37474f,0.18,0.4,0);
    npc.position.set(CX + 2.3, 0, CZ + 2.45); npc.rotation.y = -Math.PI/2;
    scene.add(npc); clothNpc = npc;
    const tag = (draw, sw, sh, y) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
      sp.scale.set(sw, sh, 1); sp.position.set(npc.position.x, y, npc.position.z); scene.add(sp); return sp;
    };
    tag(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ola • ZARA\'Z', 128, 33); }, 1.8, 0.45, 2.7);
    clothNpc.userData.mark = tag(g => { g.fillStyle = '#ffd54a'; g.strokeStyle = '#000'; g.lineWidth = 6; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('!', 128, 34); g.fillText('!', 128, 34); }, 1.0, 0.25, 3.1);
    clothLight.position.set(CX, 3.0, CZ); scene.add(clothLight);
  })();
  function updateClothInterior(dt, time){
    const dx = player.position.x - clothNpc.position.x, dz = player.position.z - clothNpc.position.z;
    const target = (clothInside && Math.hypot(dx,dz) < 7) ? Math.atan2(dx, dz) : -Math.PI/2;
    clothNpc.rotation.y += Math.atan2(Math.sin(target - clothNpc.rotation.y), Math.cos(target - clothNpc.rotation.y)) * Math.min(1, dt*5);
    const mk = clothNpc.userData.mark; mk.position.y = 3.1 + Math.sin(time*3)*0.07;
    const inside = Math.abs(player.position.x - CLOTH.x) < CLOTH.d/2 - 0.15 && Math.abs(player.position.z - CLOTH.z) < CLOTH.w/2 - 0.15;
    if(inside === clothInside) return;
    clothInside = inside;
    clothExterior.forEach(m => m.visible = !inside);
    clothWallMat.transparent = false; clothWallMat.opacity = 1; clothWallMat.depthWrite = true;
  }
  const HEAD_DEF = {
    hat:{price:HAT_PRICE, name:'Kapelusz', acc:'kapelusz', gen:'kapelusza', emoji:'🎩', def:0x222222},
    cap:{price:CAP_PRICE, name:'Czapka z daszkiem', acc:'czapkę z daszkiem', gen:'czapki z daszkiem', emoji:'🧢', def:0xc62828},
    shirt:{price:SHIRT_PRICE, name:'Koszulka', acc:'koszulkę', gen:'koszulki', emoji:'👕', get def(){ return accShirtCol; }},   // domyślnie w kolorze konta
    shoes:{price:SHOES_PRICE, name:'Buty', acc:'buty', gen:'butów', emoji:'👟', def:SH_DEF_UP},
    pants:{price:PANTS_PRICE, name:'Spodnie', acc:'spodnie', gen:'spodni', emoji:'👖', def:PANTS_DEF}
  };
  const canAddItem = (id, color) => (!NOSTACK(id) && inv.some(x => x && x.id === id && x.color === color)) || inv.indexOf(null) >= 0;   // koszulki się nie stackują
  function buyHeadwear(kind, color){
    const D = HEAD_DEF[kind];
    if(coins() < D.price){ toast(`${D.name} kosztuje ${D.price} monet 🪙 (masz ${coins()})`); return false; }
    if(!canAddItem(kind, color)){ toast(`Ekwipunek pełny – zrób miejsce na ${D.acc}`); return false; }
    for(let i=0;i<D.price;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    addItem(kind, color);
    renderInv(); renderShop();
    return true;
  }
  // okno wyboru koloru RGB kapelusza / czapki (podgląd na żywo na postaci)
  let headUiKind = null, headPrevWorn = null, headColor = 0, headColor2 = 0, headPart = 0;   // headColor2/headPart: buty mają 2 kolory (0 = cholewka, 1 = podeszwa)
  const headUI = document.createElement('div'); headUI.id = 'headUI';
  headUI.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(330px,calc(100vw - 28px));background:rgba(20,24,30,.97);color:#fff;border-radius:14px;padding:16px;display:none;z-index:40;box-sizing:border-box;font-size:14px';
  const hRow = (id, name, col) => `<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><b style="width:16px;color:${col}">${name}</b><input id="${id}" type="range" min="0" max="255" value="0" style="flex:1"><input id="${id}n" type="number" min="0" max="255" value="0" style="width:58px;padding:3px;border-radius:6px;border:0;background:#2b3340;color:#fff"></div>`;
  const HEAD_PRESETS = [0x222222,0xffffff,0xc62828,0xef6c00,0xf9a825,0x2e7d32,0x1565c0,0x6a1b9a,0xd1477a,0x6d4c41];
  headUI.innerHTML = `<h3 id="headTitle" style="margin:0 0 10px"></h3>
    <div id="headTabs" style="display:none;gap:8px;margin-bottom:10px"><button id="headTab0" type="button" style="flex:1;padding:8px;border:0;border-radius:8px;background:#333;color:#fff;cursor:pointer"><i id="headTab0c" style="display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid #fff;margin-right:6px;vertical-align:middle"></i>Cholewka</button><button id="headTab1" type="button" style="flex:1;padding:8px;border:0;border-radius:8px;background:#333;color:#fff;cursor:pointer"><i id="headTab1c" style="display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid #fff;margin-right:6px;vertical-align:middle"></i>Podeszwa</button></div>
    <div id="headSwatch" style="height:54px;border-radius:10px;border:2px solid rgba(255,255,255,.25);margin-bottom:10px"></div>
    <div style="display:flex;align-items:center;gap:10px"><span>Paleta:</span><input id="headPick" type="color" style="width:56px;height:32px;border:0;background:none;padding:0"><span id="headHex" style="opacity:.8;font-family:monospace"></span></div>
    <div id="headPresets" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px"></div>
    ${hRow('headR','R','#ff6b6b')}${hRow('headG','G','#6bff8a')}${hRow('headB','B','#6bb5ff')}
    <div style="opacity:.75;font-size:12px;margin:4px 0 10px">Podgląd widzisz na swojej postaci.</div>
    <div style="display:flex;gap:8px"><button id="headOk" type="button" style="flex:1;padding:10px;border:0;border-radius:8px;background:#2e7d32;color:#fff;cursor:pointer;font-size:14px"></button><button id="headNo" type="button" style="padding:10px 14px;border:0;border-radius:8px;background:#555;color:#fff;cursor:pointer;font-size:14px">Anuluj</button></div>`;
  document.body.appendChild(headUI);
  const hEl = id => document.getElementById(id);
  HEAD_PRESETS.forEach(c => {
    const b = document.createElement('button'); b.type = 'button'; b.title = '#' + c.toString(16).padStart(6,'0');
    b.style.cssText = `width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.55);cursor:pointer;padding:0;background:#${c.toString(16).padStart(6,'0')}`;
    b.onclick = () => headSet(c >> 16 & 255, c >> 8 & 255, c & 255);
    hEl('headPresets').appendChild(b);
  });
  function headSet(r, g, b){
    const c = v => Math.max(0, Math.min(255, Math.round(+v || 0)));
    r = c(r); g = c(g); b = c(b);
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
    hEl('headR').value = hEl('headRn').value = r; hEl('headG').value = hEl('headGn').value = g; hEl('headB').value = hEl('headBn').value = b;
    hEl('headPick').value = hex; hEl('headHex').textContent = hex.toUpperCase() + `  (${r}, ${g}, ${b})`; hEl('headSwatch').style.background = hex;
    const c24 = (r << 16) | (g << 8) | b;
    if(headPart === 1) headColor2 = c24; else headColor = c24;
    if(headUiKind === 'shoes'){ hEl('headTab0c').style.background = '#' + hex6(headColor); hEl('headTab1c').style.background = '#' + hex6(headColor2); }
    if(headUiKind) setWorn({id:headUiKind, color: headUiKind === 'shoes' ? shoeEnc(headColor, headColor2) : headColor});   // podgląd na postaci
  }
  ['R','G','B'].forEach(k => ['','n'].forEach(sfx => { hEl('head'+k+sfx).oninput = e => {
    const v = {R:hEl('headR').value, G:hEl('headG').value, B:hEl('headB').value}; v[k] = e.target.value; headSet(v.R, v.G, v.B);
  }; }));
  hEl('headPick').oninput = () => { const h = hEl('headPick').value; headSet(parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)); };
  function headTab(n){                                                         // buty: przełączanie edycji cholewka / podeszwa
    headPart = n; const v = n ? headColor2 : headColor;
    hEl('headTab0').style.outline = n ? 'none' : '2px solid #fff'; hEl('headTab1').style.outline = n ? '2px solid #fff' : 'none';
    headSet(v >> 16 & 255, v >> 8 & 255, v & 255);
  }
  hEl('headTab0').onclick = () => headTab(0); hEl('headTab1').onclick = () => headTab(1);
  function closeHeadUI(cancel, reopenTalk){
    if(!headUiKind) return;
    if(headUiKind === 'shirt') setShirt(headPrevWorn); else if(headUiKind === 'shoes') setShoes(headPrevWorn); else if(headUiKind === 'pants') setPants(headPrevWorn); else setWorn(headPrevWorn);   // wracamy do tego, co gracz miał na sobie
    headUiKind = null; headUI.style.display = 'none';
    if(reopenTalk) openClothTalk();
  }
  function openHeadPicker(kind){
    closeDialog();
    const pw = kind === 'shirt' ? wornShirt : kind === 'shoes' ? wornShoes : kind === 'pants' ? wornPants : worn;
    headPrevWorn = pw ? {id:pw.id, color:pw.color} : null; headUiKind = kind;
    const D = HEAD_DEF[kind];
    hEl('headTitle').textContent = `${D.emoji} ${D.name} – wybierz kolor`;
    hEl('headOk').innerHTML = coinHTML(`Kup (${D.price} 🪙)`);
    headUI.style.display = 'block';
    hEl('headTabs').style.display = kind === 'shoes' ? 'flex' : 'none'; headPart = 0;
    if(kind === 'shoes'){ headColor = SH_DEF_UP; headColor2 = SH_DEF_SOLE; headTab(0); }
    else headSet(D.def >> 16 & 255, D.def >> 8 & 255, D.def & 255);
    if(document.pointerLockElement) try{ document.exitPointerLock(); }catch(e){}
    hEl('headOk').focus();
  }
  hEl('headOk').onclick = () => {
    const kind = headUiKind, color = kind === 'shoes' ? shoeEnc(headColor, headColor2) : headColor; if(!kind) return;
    const D = HEAD_DEF[kind];
    if(!buyHeadwear(kind, color)) return;
    closeHeadUI(false);
    openClothTalk(`Dziękuję za zakup ${D.gen}! Czy mogę jeszcze w czymś pomóc?`);
    toast(`Kupiono ${D.acc} ${D.emoji} – załóż w ekwipunku (I)`);
  };
  hEl('headNo').onclick = () => closeHeadUI(true, true);
  headUI.addEventListener('keydown', e => { e.stopPropagation(); if(e.code === 'Escape') closeHeadUI(true, true); });
  headUI.addEventListener('keyup', e => e.stopPropagation());
  function openClothTalk(msg){
    say(msg || `Witaj w ZARA'Z! Mam elegancki kapelusz za ${HAT_PRICE} monet 🪙, czapkę z daszkiem za ${CAP_PRICE} monet 🪙 koszulkę za ${SHIRT_PRICE} monet 🪙, buty za ${SHOES_PRICE} monet 🪙 i spodnie za ${PANTS_PRICE} monet 🪙. Kolory wybierzesz sam z palety RGB. Założysz je w ekwipunku (I).`,
      [{label:`Kup kapelusz (${HAT_PRICE} 🪙)`, fn:() => openHeadPicker('hat')}, {label:`Kup czapkę z daszkiem (${CAP_PRICE} 🪙)`, fn:() => openHeadPicker('cap')}, {label:`Kup koszulkę (${SHIRT_PRICE} 🪙)`, fn:() => openHeadPicker('shirt')}, {label:`Kup buty (${SHOES_PRICE} 🪙)`, fn:() => openHeadPicker('shoes')}, {label:`Kup spodnie (${PANTS_PRICE} 🪙)`, fn:() => openHeadPicker('pants')}, {label:'Wyjdź', fn:closeDialog}], '👗 Ola, sprzedawczyni', 'cloth');
  }

  // ===== Salon samochodowy przy ulicy Poprzecznej (wschodnia strona, drzwi na zachód) =====

  const CAR_PRICE = 300, PLAYER_CAR_COLOR = 0x16a085;
  const SIG_ON = 0xffa000, SIG_OFF = 0x5c3c08;                               // kierunkowskaz: zapalony / zgaszony
  let blinkT = 0;                                                            // zegar migania (aktualizowany w updateTraffic)
  function buildCarModel(color){                                   // identyczna bryła jak auta jeżdżące po ulicy; przód auta = +Z grupy zwróconej
    const g = new THREE.Group();
    const lm = c => new THREE.MeshLambertMaterial({color:c});
    const part = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x,y,z); o.castShadow = true; g.add(o); return o; };
    const bodyMat = lm(color);
    part(new THREE.BoxGeometry(4.2,.7,1.9), bodyMat, 0, .68, 0);
    const cabin = part(new THREE.BoxGeometry(2.3,.62,1.7), bodyMat, -.2, 1.3, 0);
    const glassBand = part(new THREE.BoxGeometry(2.35,.45,1.72), lm(0x2b3a46), -.2, 1.32, 0); glassBand.scale.set(.97,1,1);
    const headMat = new THREE.MeshBasicMaterial({color:0xfff2b0}), tailMat = new THREE.MeshBasicMaterial({color:0xc01818});
    part(new THREE.BoxGeometry(.04,.14,1.5), headMat, 2.11, .78, 0);
    part(new THREE.BoxGeometry(.04,.14,1.5), tailMat, -2.11, .78, 0);
    const sigGeo = new THREE.BoxGeometry(.1,.17,.3), sigL = new THREE.MeshBasicMaterial({color:SIG_OFF}), sigR = new THREE.MeshBasicMaterial({color:SIG_OFF});
    [2.12,-2.12].forEach(x => { part(sigGeo, sigL, x, .78, -.84); part(sigGeo, sigR, x, .78, .84); });   // lokalny +z = prawa strona
    const wheelGeo = new THREE.CylinderGeometry(.36,.36,.26,14), wheelMat = lm(0x16161a), wheels = [];
    [[1.3,.95],[1.3,-.95],[-1.3,.95],[-1.3,-.95]].forEach(([x,z]) => {
      const pivot = new THREE.Group(); pivot.position.set(x, .36, z); g.add(pivot);
      const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.x = Math.PI/2; w.castShadow = true; pivot.add(w); wheels.push(pivot);
    });
    g.rotation.y = -Math.PI/2;                                      // przód (+X modelu) → +Z grupy zewnętrznej
    const wrap = new THREE.Group(); wrap.add(g);
    return {group:wrap, wheels, bodyMat, sigL, sigR, headMat, tailMat, root:g, cabin, glassBand};
  }
  BUILDINGS.push({x:CAR.x, z:CAR.z, w:CAR.d, d:CAR.w, open:true});
  const carWallMat = new THREE.MeshLambertMaterial({color:0xe9edf2});
  const carExterior = [];
  let carInside = false, carNpc = null;
  const carNpcDist = () => carNpc ? Math.hypot(player.position.x - carNpc.position.x, player.position.z - carNpc.position.z) : 99;
  const carLight = new THREE.PointLight(0xf2f6ff, 0, 14);
  (function buildCarShop(){
    const CX = CAR.x, CZ = CAR.z, w = CAR.w, d = CAR.d, h = CAR.h, t = 0.3, gap = 3.2;
    const grp = new THREE.Group(); grp.position.set(CX, 0, CZ); grp.rotation.y = -Math.PI/2; scene.add(grp);   // front (lokalne +z) → -x
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:CX - pz, z:CZ + px, w:bd, d:bw});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const dark = lamb(0x37474f), red = lamb(0xc62828);

    box(w, h, t, carWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, carWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, carWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, carWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, carWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-2.9, t, carWallMat, 0, 2.9+(h-2.9)/2, d/2-t/2, false);

    carExterior.push(box(w+0.6, 0.4, d+0.6, lamb(0x455a64), 0, h+0.2, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xf7f9fb));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fg = fc.getContext('2d'); fg.fillStyle = '#cfd4d8'; fg.fillRect(0,0,128,128); fg.fillStyle = '#b9bfc4'; fg.fillRect(0,0,64,64); fg.fillRect(64,64,64,64);
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set((w-2*t)/2, (d-2*t)/2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), new THREE.MeshLambertMaterial({map:ft}));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    box(2.4, 0.03, 0.9, red, 0, 0.06, d/2-0.8, false);

    // duże witryny i szyld
    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.5});
    [-1,1].forEach(sd => box(5.4, 2.3, 0.06, glass, sd*5.1, 1.6, d/2+0.03, false));
    carExterior.push(box(6.0, 0.1, 1.3, red, 0, 2.95, d/2+0.65, false));
    const sc = document.createElement('canvas'); sc.width = 768; sc.height = 128;
    const sg = sc.getContext('2d'); sg.fillStyle = '#263238'; sg.fillRect(0,0,768,128);
    sg.fillStyle = '#ffffff'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    let fs = 70; sg.font = `bold ${fs}px sans-serif`;
    while(sg.measureText('SALON SAMOCHODOWY').width > 680 && fs > 24){ fs -= 2; sg.font = `bold ${fs}px sans-serif`; }   // napis zawsze mieści się na szyldzie
    sg.fillText('SALON SAMOCHODOWY', 384, 68);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.2), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.55, d/2+0.04); grp.add(sign); carExterior.push(sign);

    // puste podesty wystawowe (nic jeszcze nie ma na sprzedaż)
    [[-4.6,-0.6],[2.2,-0.6]].forEach(q => {
      put(new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.18,28), lamb(0x90a4ae)), q[0], 0.13, q[1]);
      col(q[0], q[1], 2.4, 2.4);
    });
    box(2.8, 0.18, 4.9, lamb(0x90a4ae), -1.2, 0.13, -0.6, false);                  // podest z autem na sprzedaż
    col(-1.2, -0.6, 2.8, 4.9);
    const dispCar = buildCarModel(PLAYER_CAR_COLOR); dispCar.group.position.set(-1.2, 0.22, -0.6); grp.add(dispCar.group);   // przodem do witryny
    const pc = document.createElement('canvas'); pc.width = 512; pc.height = 160;
    const pg = pc.getContext('2d'); pg.fillStyle = '#263238'; pg.fillRect(0,0,512,160); pg.strokeStyle = '#c62828'; pg.lineWidth = 8; pg.strokeRect(4,4,504,152);
    pg.fillStyle = '#fff'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.font = 'bold 46px sans-serif'; pg.fillText('AUTO NA SPRZEDAŻ', 256, 60); pg.font = 'bold 40px sans-serif'; pg.fillStyle = '#ffd54a'; pg.fillText(CAR_PRICE + ' monet', 256, 114);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(pc)}));
    poster.position.set(-2.0, 2.3, -d/2 + t + 0.02); grp.add(poster);

    // biurko doradcy
    box(3.2, 1.0, 0.8, dark, 5.6, 0.5, -2.6, true);
    box(3.4, 0.08, 1.0, lamb(0xd7b98a), 5.6, 1.04, -2.6, false);
    box(0.5, 0.35, 0.4, lamb(0x222222), 6.3, 1.26, -2.6, false);
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [[-4,0.5],[0,0.5],[4,0.5]].forEach(q => put(new THREE.Mesh(new THREE.BoxGeometry(1.6,0.06,0.6), lampM), q[0], h-0.04, q[1]));

    // doradca
    const npc = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc.add(m); };
    nb(0.7,0.9,0.4,0x263238,0,1.25,0); nb(0.2,0.7,0.04,0xc62828,0,1.3,0.21); nb(0.5,0.5,0.5,0xe0ac69,0,1.95,0); nb(0.56,0.14,0.56,0x2b2b2b,0,2.25,-0.02);
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.25,0.8,0.25,0x263238,-0.48,1.25,0); nb(0.25,0.8,0.25,0x263238,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x1c2429,-0.18,0.4,0); nb(0.25,0.8,0.25,0x1c2429,0.18,0.4,0);
    npc.position.set(CX + 3.4, 0, CZ + 5.6); npc.rotation.y = -Math.PI/2;   // lokalnie (5.6, -3.4)
    scene.add(npc); carNpc = npc;
    const tag = (draw, sw, sh, y) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
      sp.scale.set(sw, sh, 1); sp.position.set(npc.position.x, y, npc.position.z); scene.add(sp); return sp;
    };
    tag(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Darek • auta', 128, 33); }, 1.8, 0.45, 2.7);
    carLight.position.set(CX, 3.4, CZ); scene.add(carLight);
  })();
  function updateCarInterior(dt, time){
    const dx = player.position.x - carNpc.position.x, dz = player.position.z - carNpc.position.z;
    const target = (carInside && Math.hypot(dx,dz) < 8) ? Math.atan2(dx, dz) : -Math.PI/2;
    carNpc.rotation.y += Math.atan2(Math.sin(target - carNpc.rotation.y), Math.cos(target - carNpc.rotation.y)) * Math.min(1, dt*5);
    const inside = Math.abs(player.position.x - CAR.x) < CAR.d/2 - 0.15 && Math.abs(player.position.z - CAR.z) < CAR.w/2 - 0.15;
    if(inside === carInside) return;
    carInside = inside;
    carExterior.forEach(m => m.visible = !inside);
    carWallMat.transparent = false; carWallMat.opacity = 1; carWallMat.depthWrite = true;
  }
  function buyCar(){
    if(hasCar){ toast('Masz już auto 🚗'); return; }
    if(!payAny(CAR_PRICE, 'zakup auta')){ toast(`Auto kosztuje ${CAR_PRICE} monet 🪙 – masz ${coins()}${bank.opened?` + ${bank.balance} na koncie`:''}`); return; }
    placeCar(POP_X + 2.6, CAR.z, 0); carFuel = 100; fuelLowWarned = fuelEmptyWarned = false;   // nowe auto ma pełny bak
    closeDialog(); renderInv(); renderShop();
    toast('Kupiłeś auto 🚗 Czeka przed salonem na ulicy Poprzecznej – podejdź i naciśnij F');
  }
  function openCarTalk(){
    if(hasCar){ say('Auto już masz – jeździ się nim świetnie! Na razie nic więcej nie mamy na sprzedaż 🚗', [{label:'Wyjdź', fn:closeDialog}], '🚗 Darek, doradca', 'car'); return; }
    say(`Witaj w salonie samochodowym! Mam jedno auto na sprzedaż – wygląda jak te na ulicach, ale jest twoje. Cena: ${CAR_PRICE} 🪙. Płacisz monetami przy sobie, a brakującą część pobiorę z konta bankowego. Po zakupie auto czeka przed salonem.`,
      [{label:`Kup auto (${CAR_PRICE} 🪙)`, fn:buyCar}, {label:'Wyjdź', fn:closeDialog}], '🚗 Darek, doradca', 'car');
  }

  // ===== Lakiernik za salonem: przemalowanie auta na dowolny kolor RGB za 50 monet =====
  const PAINT_PRICE = 50;
  BUILDINGS.push({x:PAINT.x, z:PAINT.z, w:PAINT.d, d:PAINT.w, open:true});
  const paintWallMat = new THREE.MeshLambertMaterial({color:0xeceff1});
  const paintExterior = [];
  let paintInside = false, paintNpc = null, paintUiOpen = false, paintOrig = 0;
  const paintNpcDist = () => paintNpc ? Math.hypot(player.position.x - paintNpc.position.x, player.position.z - paintNpc.position.z) : 99;
  const paintLight = new THREE.PointLight(0xfff4e8, 0, 13);
  (function buildPaintShop(){
    const CX = PAINT.x, CZ = PAINT.z, w = PAINT.w, d = PAINT.d, h = PAINT.h, t = 0.3, gap = 2.6;
    const grp = new THREE.Group(); grp.position.set(CX, 0, CZ); grp.rotation.y = -Math.PI/2; scene.add(grp);   // front (lokalne +z) → -x
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:CX - pz, z:CZ + px, w:bd, d:bw});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const dark = lamb(0x37474f), orange = lamb(0xef6c00);

    box(w, h, t, paintWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, paintWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, paintWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, paintWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, paintWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-2.8, t, paintWallMat, 0, 2.8+(h-2.8)/2, d/2-t/2, false);

    paintExterior.push(box(w+0.6, 0.4, d+0.6, lamb(0x5d4037), 0, h+0.2, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xf7f9fb));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xb0b6ba));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    box(2.4, 0.03, 0.9, orange, 0, 0.06, d/2-0.8, false);

    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.5});
    [-1,1].forEach(sd => box(3.0, 1.6, 0.06, glass, sd*4.0, 1.8, d/2+0.03, false));
    paintExterior.push(box(4.4, 0.1, 1.3, orange, 0, 2.8, d/2+0.65, false));
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128;
    const sg = sc.getContext('2d'); sg.fillStyle = '#263238'; sg.fillRect(0,0,512,128);
    const sw = [ '#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#8e24aa' ]; sw.forEach((c,i) => { sg.fillStyle = c; sg.fillRect(16 + i*16, 108, 14, 12); });
    sg.fillStyle = '#fff'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    let fs = 70; sg.font = `bold ${fs}px sans-serif`;
    while(sg.measureText('LAKIERNIK').width > 440 && fs > 24){ fs -= 2; sg.font = `bold ${fs}px sans-serif`; }
    sg.fillText('LAKIERNIK', 266, 56);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.3, d/2+0.04); grp.add(sign); paintExterior.push(sign);

    // paleta kolorów i plakat na tylnej ścianie
    const pal = [0xe53935,0xfb8c00,0xfdd835,0x43a047,0x00acc1,0x1e88e5,0x8e24aa,0xec407a];
    pal.forEach((c,i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.9), new THREE.MeshBasicMaterial({color:c})); m.position.set(-5.0 + i*0.85, 2.3, -d/2 + t + 0.02); grp.add(m); });
    const pc = document.createElement('canvas'); pc.width = 640; pc.height = 96;
    const pg = pc.getContext('2d'); pg.fillStyle = '#263238'; pg.fillRect(0,0,640,96); pg.strokeStyle = '#ef6c00'; pg.lineWidth = 6; pg.strokeRect(3,3,634,90);
    pg.fillStyle = '#fff'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.font = 'bold 40px sans-serif'; pg.fillText('PRZEMALUJ AUTO – ' + PAINT_PRICE + ' MONET', 320, 50);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(pc)}));
    poster.position.set(-2.4, 3.3, -d/2 + t + 0.02); grp.add(poster);
    // regał z puszkami farby
    box(5.6, 0.06, 0.5, dark, -2.4, 1.1, -d/2+t+0.3, false);
    for(let i=0;i<10;i++) put(new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.3,12), lamb(pal[i%pal.length])), -4.9 + i*0.55, 1.28, -d/2+t+0.3);
    box(0.08, 1.1, 0.08, dark, -5.1, 0.55, -d/2+t+0.3, false); box(0.08, 1.1, 0.08, dark, 0.3, 0.55, -d/2+t+0.3, false);
    [[-4.6,-3.4],[-3.9,-3.4],[-4.25,-2.75]].forEach(q => { put(new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.5,14), lamb(0x1e88e5)), q[0], 0.29, q[1]); col(q[0], q[1], 0.6, 0.6); });

    // lada i lakiernik
    box(3.6, 1.1, 0.8, dark, 3.6, 0.55, -1.6, true);
    box(3.8, 0.08, 1.0, lamb(0xd7b98a), 3.6, 1.14, -1.6, false);
    box(0.5, 0.35, 0.4, lamb(0x222222), 4.5, 1.36, -1.6, false);
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [[-3.5,0.4],[0,0.4],[3.5,0.4]].forEach(q => put(new THREE.Mesh(new THREE.BoxGeometry(1.6,0.06,0.6), lampM), q[0], h-0.04, q[1]));
    const npc = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc.add(m); };
    nb(0.7,0.9,0.4,0xef6c00,0,1.25,0); nb(0.5,0.5,0.5,0xe0ac69,0,1.95,0); nb(0.56,0.14,0.56,0x37474f,0,2.25,-0.02);
    nb(0.5,0.22,0.12,0xeeeeee,0,1.82,0.27);                                          // maska
    nb(0.08,0.08,0.02,0x000000,-0.12,2.02,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.02,0.26);
    nb(0.25,0.8,0.25,0xef6c00,-0.48,1.25,0); nb(0.25,0.8,0.25,0xef6c00,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x37474f,-0.18,0.4,0); nb(0.25,0.8,0.25,0x37474f,0.18,0.4,0);
    npc.position.set(CX + 2.7, 0, CZ + 3.6); npc.rotation.y = -Math.PI/2;               // lokalnie (3.6, -2.7)
    scene.add(npc); paintNpc = npc;
    const tag = (draw, sw2, sh, y) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
      sp.scale.set(sw2, sh, 1); sp.position.set(npc.position.x, y, npc.position.z); scene.add(sp); return sp;
    };
    tag(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Wojtek • lakier', 128, 33); }, 1.8, 0.45, 2.7);
    paintLight.position.set(CX, 3.2, CZ); scene.add(paintLight);
  })();
  function updatePaintInterior(dt, time){
    const dx = player.position.x - paintNpc.position.x, dz = player.position.z - paintNpc.position.z;
    const target = (paintInside && Math.hypot(dx,dz) < 8) ? Math.atan2(dx, dz) : -Math.PI/2;
    paintNpc.rotation.y += Math.atan2(Math.sin(target - paintNpc.rotation.y), Math.cos(target - paintNpc.rotation.y)) * Math.min(1, dt*5);
    const inside = Math.abs(player.position.x - PAINT.x) < PAINT.d/2 - 0.15 && Math.abs(player.position.z - PAINT.z) < PAINT.w/2 - 0.15;
    if(inside === paintInside) return;
    paintInside = inside;
    paintExterior.forEach(m => m.visible = !inside);
    paintWallMat.transparent = false; paintWallMat.opacity = 1; paintWallMat.depthWrite = true;
  }
  // okno wyboru koloru RGB (podgląd na żywo na samym aucie)
  const paintUI = document.createElement('div'); paintUI.id = 'paintUI';
  paintUI.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(330px,calc(100vw - 28px));background:rgba(20,24,30,.97);color:#fff;border-radius:14px;padding:16px;display:none;z-index:40;box-sizing:border-box;font-size:14px';
  const pRow = (id, name, col) => `<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><b style="width:16px;color:${col}">${name}</b><input id="${id}" type="range" min="0" max="255" value="0" style="flex:1"><input id="${id}n" type="number" min="0" max="255" value="0" style="width:58px;padding:3px;border-radius:6px;border:0;background:#2b3340;color:#fff"></div>`;
  paintUI.innerHTML = `<h3 style="margin:0 0 10px">🎨 Lakiernik – wybierz kolor</h3>
    <div id="paintSwatch" style="height:54px;border-radius:10px;border:2px solid rgba(255,255,255,.25);margin-bottom:10px"></div>
    <div style="display:flex;align-items:center;gap:10px"><span>Paleta:</span><input id="paintPick" type="color" style="width:56px;height:32px;border:0;background:none;padding:0"><span id="paintHex" style="opacity:.8;font-family:monospace"></span></div>
    ${pRow('paintR','R','#ff6b6b')}${pRow('paintG','G','#6bff8a')}${pRow('paintB','B','#6bb5ff')}
    <div style="opacity:.75;font-size:12px;margin:4px 0 10px">Podgląd widzisz na swoim aucie przed lakiernią.</div>
    <div style="display:flex;gap:8px"><button id="paintOk" type="button" style="flex:1;padding:10px;border:0;border-radius:8px;background:#2e7d32;color:#fff;cursor:pointer;font-size:14px"></button><button id="paintNo" type="button" style="padding:10px 14px;border:0;border-radius:8px;background:#555;color:#fff;cursor:pointer;font-size:14px">Anuluj</button></div>`;
  document.body.appendChild(paintUI);
  const pEl = id => document.getElementById(id);
  pEl('paintOk').innerHTML = coinHTML(`Maluj (${PAINT_PRICE} 🪙)`);
  function paintSet(r, g, b){
    const c = v => Math.max(0, Math.min(255, Math.round(+v || 0)));
    r = c(r); g = c(g); b = c(b);
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
    pEl('paintR').value = pEl('paintRn').value = r; pEl('paintG').value = pEl('paintGn').value = g; pEl('paintB').value = pEl('paintBn').value = b;
    pEl('paintPick').value = hex; pEl('paintHex').textContent = hex.toUpperCase() + `  (${r}, ${g}, ${b})`; pEl('paintSwatch').style.background = hex;
    pcar.bodyMat.color.setRGB(r/255, g/255, b/255);
  }
  ['R','G','B'].forEach(k => ['','n'].forEach(sfx => { pEl('paint'+k+sfx).oninput = e => {
    const v = {R:pEl('paintR').value, G:pEl('paintG').value, B:pEl('paintB').value}; v[k] = e.target.value; paintSet(v.R, v.G, v.B);
  }; }));
  pEl('paintPick').oninput = () => { const h = pEl('paintPick').value; paintSet(parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)); };
  function closePaintUI(cancel){
    if(!paintUiOpen) return;
    if(cancel) pcar.bodyMat.color.setHex(paintOrig);
    paintUiOpen = false; paintUI.style.display = 'none';
  }
  function openPaintUI(){
    closeDialog(); paintOrig = pcar.bodyMat.color.getHex();
    const c = pcar.bodyMat.color; paintUiOpen = true; paintUI.style.display = 'block';
    paintSet(c.r*255, c.g*255, c.b*255);
    if(document.pointerLockElement) try{ document.exitPointerLock(); }catch(e){}
  }
  function paintCarNear(){ return hasCar && !carDriving && Math.hypot(pcar.group.position.x - (PAINT.x - 9), pcar.group.position.z - PAINT.z) < 18; }
  pEl('paintOk').onclick = () => {
    if(!paintCarNear()){ toast('Auto musi stać przed lakiernią 🚗'); return; }
    const chosen = pcar.bodyMat.color.getHex();
    pcar.bodyMat.color.setHex(paintOrig);                                              // płatność przy oryginalnym kolorze – gdy zabraknie monet, nic się nie zmienia
    if(!payAny(PAINT_PRICE, 'malowanie auta')){ pcar.bodyMat.color.setHex(chosen); toast(`Malowanie kosztuje ${PAINT_PRICE} monet 🪙 – masz ${coins()}${bank.opened?` + ${bank.balance} na koncie`:''}`); return; }
    pcar.bodyMat.color.setHex(chosen); paintOrig = chosen; closePaintUI(false); renderInv(); renderShop();
    toast('Auto przemalowane 🎨');
  };
  pEl('paintNo').onclick = () => closePaintUI(true);
  paintUI.addEventListener('keydown', e => { e.stopPropagation(); if(e.code === 'Escape') closePaintUI(true); });
  paintUI.addEventListener('keyup', e => e.stopPropagation());
  function openPaintTalk(){
    if(!hasCar){ say('Witaj w lakierni! Przemaluję ci auto na dowolny kolor, ale najpierw kup je w salonie obok 🚗', [{label:'Wyjdź', fn:closeDialog}], '🎨 Wojtek, lakiernik', 'paint'); return; }
    if(!paintCarNear()){ say('Witaj w lakierni! Podjedź swoim autem pod lakiernię (stań przed budynkiem), a potem wróć do mnie – przemaluję je na dowolny kolor 🎨', [{label:'Wyjdź', fn:closeDialog}], '🎨 Wojtek, lakiernik', 'paint'); return; }
    say(`Witaj w lakierni! Przemaluję twoje auto na dowolny kolor RGB za ${PAINT_PRICE} 🪙. Płacisz monetami przy sobie, a brakującą część pobiorę z konta bankowego. Podgląd zobaczysz na żywo na aucie.`,
      [{label:`Przemaluj auto (${PAINT_PRICE} 🪙)`, fn:openPaintUI}, {label:'Wyjdź', fn:closeDialog}], '🎨 Wojtek, lakiernik', 'paint');
  }

  // ===== Stacja paliw na wzgórzu (x=67, z=170) – na razie tylko wygląd, bez funkcji =====
  BUILDINGS.push({x:STATION.x, z:STATION.z, w:STATION.w, d:STATION.d, open:true});
  const STATION_PUMPS = [];                                          // pozycje dystrybutorów w świecie (tankowanie)
  (function buildGasStation(){
    const SX = STATION.x, SZ = STATION.z, W = STATION.w, D = STATION.d, B = 0.02;
    const grp = new THREE.Group(); grp.position.set(SX, STATION.y, SZ); scene.add(grp);          // front (lokalne -z) → ulica Społeczna
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:SX + px, z:SZ + pz, w:bw, d:bd});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const plane = (pw,ph,mat,px,py,pz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw,ph), mat); m.position.set(px,py,pz); m.rotation.y = Math.PI; grp.add(m); return m; };   // zwrócona w stronę -z
    const flat = (pw,pd,mat,px,py,pz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw,pd), mat); m.rotation.x = -Math.PI/2; m.position.set(px,py,pz); m.receiveShadow = true; grp.add(m); return m; };
    const textMat = (text, cw, ch, bg, fg) => {
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0,0,cw,ch); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let fs = Math.floor(ch*0.62); g.font = `bold ${fs}px sans-serif`;
      while(g.measureText(text).width > cw*0.92 && fs > 12){ fs -= 2; g.font = `bold ${fs}px sans-serif`; }
      g.fillText(text, cw/2, ch/2 + 2); return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)});
    };
    const red = lamb(0xd32f2f), white = lamb(0xf4f4f4), dark = lamb(0x37474f), concrete = lamb(0xbdbdb5), yellow = lamb(0xfdd835);

    // nawierzchnia, strefa dystrybutorów, krawężniki i dwa wjazdy od strony ulicy
    flat(W, D, new THREE.MeshLambertMaterial({color:0x3b3b40}), 0, B, 0);
    flat(22, 10, lamb(0x7b8086), 0, B + 0.015, -2);
    box(W, 0.18, 0.3, concrete, 0, 0.07, D/2 - 0.15, false);
    box(0.3, 0.18, D, concrete, -(W/2 - 0.15), 0.07, 0, false);
    box(0.3, 0.18, D, concrete,  (W/2 - 0.15), 0.07, 0, false);
    [-9, 9].forEach(x => box(7, 0.4, 4.3, lamb(0x3b3b40), x, -0.17, -13.1, false));            // wjazd/wyjazd przez chodnik
    [[-W/2, -12.5], [-5.5, 5.5], [12.5, W/2]].forEach(([x0, x1]) => box(x1 - x0, 0.18, 0.3, concrete, (x0 + x1)/2, 0.07, -D/2 + 0.15, false));   // krawężnik z przerwami na wjazd i wyjazd

    // wiata nad dystrybutorami
    const CZ = -2;
    box(22, 0.3, 10, white, 0, B + 5.25, CZ, false);
    box(22.4, 0.8, 0.2, red, 0, B + 5.0, CZ - 5.1, false);
    box(22.4, 0.8, 0.2, red, 0, B + 5.0, CZ + 5.1, false);
    box(0.2, 0.8, 10.4, red, -11.1, B + 5.0, CZ, false);
    box(0.2, 0.8, 10.4, red,  11.1, B + 5.0, CZ, false);
    plane(7, 0.62, textMat('STACJA PALIW', 512, 64, '#d32f2f', '#ffffff'), 0, B + 5.0, CZ - 5.21);
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [-8, 0, 8].forEach(x => [-4.5, 0.5].forEach(z => put(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.6), lampM), x, B + 5.07, z)));
    [[-4,CZ],[4,CZ],[-10.3,CZ],[10.3,CZ]].forEach(q => {                                         // słupy wiaty
      box(0.5, 5.1, 0.5, white, q[0], B + 2.55, q[1], Math.abs(q[0]) > 5);
      box(0.52, 0.5, 0.52, red, q[0], B + 4.6, q[1], false);
    });

    // dwie wyspy po dwa dystrybutory
    [-4, 4].forEach(ix => {
      box(1.4, 0.2, 6.4, concrete, ix, B + 0.1, CZ, true);
      [CZ - 1.5, CZ + 1.5].forEach(pz => {
        STATION_PUMPS.push({x:SX + ix, z:SZ + pz});
        box(0.56, 1.4, 0.95, white, ix, B + 0.9, pz, false);
        box(0.58, 0.18, 0.97, red, ix, B + 0.45, pz, false);
        box(0.62, 0.22, 1.0, red, ix, B + 1.71, pz, false);
        [-1, 1].forEach(sd => {
          box(0.04, 0.32, 0.55, lamb(0x12304a), ix + sd*0.29, B + 1.25, pz, false);               // wyświetlacz
          box(0.1, 0.36, 0.14, dark, ix + sd*0.3, B + 0.8, pz + 0.3, false);                      // uchwyt pistoletu
          box(0.05, 0.12, 0.12, lamb(0x43a047), ix + sd*0.34, B + 0.95, pz - 0.3, false);         // znacznik paliwa
        });
      });
      [CZ - 3.4, CZ + 3.4].forEach(bz => put(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 10), yellow), ix, B + 0.6, bz));   // słupki
    });

    // sklep przy tylnej krawędzi platformy
    const SHZ = 7.6;
    box(16, 3.6, 5.4, lamb(0xe8e0d0), 0, B + 1.8, SHZ, true);
    box(16.8, 0.7, 6.2, red, 0, B + 3.95, SHZ - 0.1, false);
    plane(7, 0.55, textMat('SKLEP 24h', 512, 64, '#d32f2f', '#ffffff'), 0, B + 3.95, SHZ - 0.1 - 3.11);
    const glass = new THREE.MeshLambertMaterial({color:0x7fb8d8, transparent:true, opacity:0.85});
    [-4.8, 4.8].forEach(x => plane(5, 1.7, glass, x, B + 1.7, SHZ - 2.72));
    plane(1.9, 2.6, dark, 0, B + 1.3, SHZ - 2.71);
    plane(1.5, 2.3, glass, 0, B + 1.2, SHZ - 2.72);
    box(0.5, 0.9, 0.5, dark, 6.8, B + 0.45, SHZ - 3.3, false);                                   // kosz
    box(1.2, 0.5, 0.5, lamb(0x8d6e63), -6.4, B + 0.25, SHZ - 3.2, false);                        // ławka

    // totem z nazwą stacji przy ulicy
    box(0.45, 7.2, 0.45, lamb(0x78828a), -14.6, B + 3.6, -9.6, true);
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 320; const pg = pc.getContext('2d');
    pg.fillStyle = '#fff'; pg.fillRect(0,0,256,320); pg.fillStyle = '#d32f2f'; pg.fillRect(0,0,256,110);
    pg.fillStyle = '#fff'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.font = 'bold 54px sans-serif';
    pg.fillText('STACJA', 128, 34); pg.fillText('PALIW', 128, 84);
    pg.fillStyle = '#263238'; pg.font = 'bold 40px sans-serif';
    [['Pb95', 150], ['ON', 210], ['LPG', 270]].forEach(r => { pg.fillText(r[0], 74, r[1]); pg.fillText('—', 190, r[1]); });
    const pm = new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(pc)}), pe = lamb(0xd32f2f);
    const totem = box(2.4, 3.0, 0.3, [pe, pe, pe, pe, pm, pm], -14.6, B + 8.2, -9.6, false);
    totem.material.forEach(m => m.side = THREE.FrontSide);

    // dwie latarnie
    [[15.2, -7], [-15.2, 6]].forEach(q => {
      box(0.18, 5.2, 0.18, dark, q[0], B + 2.6, q[1], false);
      put(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5), lampM), q[0], B + 5.25, q[1]);
    });
  })();

  // ===== PKS (dworzec autobusowy): skręt w lewo ze Społecznej tuż za stacją paliw (jadąc na zachód), plac na wzgórzu i 3 stanowiska =====
  const PKS_JX = PKS.jx, PKS_ZQ = PKS.zq;                              // oś drogi dojazdowej, oś pasa ze stanowiskami
  const PKS_BAYS = [31, 19, 7].map(x => ({x, z:PKS_ZQ}));              // stanowiska 1–3 (środek autobusu, przód na wschód); 1 = przód kolejki
  const PKS_BLD = {x:19, z:188.75, w:32, d:5.5, h:3.8};                // budynek dworca
  BUILDINGS.push({x:PKS_BLD.x, z:PKS_BLD.z, w:PKS_BLD.w, d:PKS_BLD.d, open:true});
  (function buildPKS(){
    const B = 0.02;
    const grp = new THREE.Group(); grp.position.set(0, PKS.y, 0); scene.add(grp);                 // x, z – świata; y – względem poziomu placu
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) WALLS.push({x:px, z:pz, w:bw, d:bd}); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const plane = (pw,ph,mat,px,py,pz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw,ph), mat); m.position.set(px,py,pz); m.rotation.y = Math.PI; grp.add(m); return m; };   // zwrócona w stronę -z (północ)
    const flat = (pw,pd,mat,px,py,pz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw,pd), mat); m.rotation.x = -Math.PI/2; m.position.set(px,py,pz); m.receiveShadow = true; grp.add(m); return m; };
    const textMat = (text, cw, ch, bg, fg) => {
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0,0,cw,ch); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let fs = Math.floor(ch*0.62); g.font = `bold ${fs}px sans-serif`;
      while(g.measureText(text).width > cw*0.92 && fs > 12){ fs -= 2; g.font = `bold ${fs}px sans-serif`; }
      g.fillText(text, cw/2, ch/2 + 2); return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)});
    };
    const red = lamb(0xb71c1c), white = lamb(0xf4f4f4), dark = lamb(0x37474f), concrete = lamb(0xbdbdb5), asphalt = lamb(0x3b3b40), wallM = lamb(0xe4ddcd);
    const glass = new THREE.MeshLambertMaterial({color:0x7fb8d8, transparent:true, opacity:0.85});
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});

    // --- droga dojazdowa: skręt w lewo ze Społecznej (z = 155 to południowa krawędź jezdni), wstęga podąża za terenem; przejazd przez chodnik Społecznej lekko wyniesiony ---
    {
      const zs = [155, 155.35, 158.05, 158.35, 164], off = [0.04, 0.26, 0.26, 0.04, 0.04];
      const P = [], U = [], I = [];
      zs.forEach((z, i) => {
        const y = terrainH(PKS_JX, z) + off[i], u = (z - 155)/TILE;
        P.push(PKS_JX - ROAD_W/2, y, z,  PKS_JX + ROAD_W/2, y, z); U.push(u, 0,  u, 1);
        if(i < zs.length-1){ const k = i*2; I.push(k, k+1, k+2,  k+1, k+3, k+2); }
      });
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      rg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      rg.setIndex(I); rg.computeVertexNormals();
      const tex = roadTex.clone(); tex.needsUpdate = true; tex.repeat.set(1, 1);
      const rm = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({map:tex, side:THREE.DoubleSide})); rm.receiveShadow = true; street.add(rm);
      [-1, 1].forEach(sd => {                                                                      // chodniki po obu stronach drogi dojazdowej
        const cx = PKS_JX + sd*SIDEWALK_OFFSET, h = terrainH(cx, 161);
        const sw = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_W, 0.5, 164 - 158.15), walkMat);
        sw.position.set(cx, h - 0.05, (158.15 + 164)/2); sw.receiveShadow = true; street.add(sw);
      });
      {   // drogowskaz „PKS” przy skręcie – czytelny dla jadących Społeczną na zachód (stoi na południowym chodniku Społecznej)
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
        const g3 = cv.getContext('2d'); g3.fillStyle = '#174b78'; g3.fillRect(0,0,256,128);
        g3.strokeStyle = '#fff'; g3.lineWidth = 7; g3.strokeRect(5,5,246,118);
        g3.fillStyle = '#fff'; g3.beginPath(); g3.moveTo(26,64); g3.lineTo(70,32); g3.lineTo(70,50); g3.lineTo(96,50); g3.lineTo(96,78); g3.lineTo(70,78); g3.lineTo(70,96); g3.closePath(); g3.fill();
        g3.font = 'bold 62px sans-serif'; g3.textAlign = 'center'; g3.textBaseline = 'middle'; g3.fillText('PKS', 172, 66);
        const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 8;
        const sx = 48.2, sz = 156.9, sh = terrainH(sx, sz);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10), new THREE.MeshLambertMaterial({color:0x55585c}));
        pole.position.set(sx, sh + 1.7, sz); pole.castShadow = true; street.add(pole); solidPole(sx, sz);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), new THREE.MeshBasicMaterial({map:tx}));
        face.position.set(sx + 0.1, sh + 2.8, sz); face.rotation.y = Math.PI/2; street.add(face);   // zwrócony na wschód
      }
      {   // tabliczka „GÓRNA” – nazwa odcinka Społecznej biegnącego na zachód przy stacji paliw (północny chodnik, jak znaki DŁUGA / KRÓTKA)
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
        const g4 = cv.getContext('2d'); g4.fillStyle = '#174b78'; g4.fillRect(0,0,512,128);
        g4.strokeStyle = '#ffffff'; g4.lineWidth = 9; g4.strokeRect(6,6,500,116);
        g4.fillStyle = '#ffffff'; g4.font = 'bold 68px sans-serif'; g4.textAlign = 'center'; g4.textBaseline = 'middle'; g4.fillText('GÓRNA', 256, 66);
        const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 8;
        const gx = 62, gz = 143.5, gh = terrainH(gx, gz);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10), new THREE.MeshLambertMaterial({color:0x55585c}));
        pole.position.set(gx, gh + 1.6, gz); pole.castShadow = true; street.add(pole); solidPole(gx, gz);
        [1, -1].forEach(side => {                                        // dwie tabliczki plecami do siebie, napis czytelny z obu stron
          const face = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.64), new THREE.MeshBasicMaterial({map:tx, side:THREE.FrontSide}));
          face.position.set(gx, gh + 2.65, gz + side*0.11);
          if(side < 0) face.rotation.y = Math.PI;
          street.add(face);
        });
      }
    }

    // --- plac: asfalt, krawężniki (od północy z przerwą na wjazd), oznaczenia stanowisk ---
    const YX0 = -12, YX1 = 47, YZ0 = 164, YZ1 = 192;
    flat(YX1 - YX0, YZ1 - YZ0, asphalt, (YX0 + YX1)/2, B, (YZ0 + YZ1)/2);
    box(YX1 - YX0, 0.18, 0.3, concrete, (YX0 + YX1)/2, B + 0.07, YZ1 - 0.15, false);
    box(0.3, 0.18, YZ1 - YZ0, concrete, YX0 + 0.15, B + 0.07, (YZ0 + YZ1)/2, false);
    box(0.3, 0.18, YZ1 - YZ0, concrete, YX1 - 0.15, B + 0.07, (YZ0 + YZ1)/2, false);
    const nx1 = PKS_JX - ROAD_W/2 - SIDEWALK_GAP - SIDEWALK_W, nx2 = PKS_JX + ROAD_W/2 + SIDEWALK_GAP + SIDEWALK_W;
    box(nx1 - YX0, 0.18, 0.3, concrete, (YX0 + nx1)/2, B + 0.07, YZ0 + 0.15, false);
    box(YX1 - nx2, 0.18, 0.3, concrete, (nx2 + YX1)/2, B + 0.07, YZ0 + 0.15, false);
    [25, 13, 1].forEach(x => box(0.14, 0.02, 3.4, lamb(0xe8e8e8), x, B + 0.02, PKS_ZQ, false));  // linie między stanowiskami

    // --- peron (wyspa od strony drzwi autobusów) z wiatą ---
    box(42, 0.2, 6.7, concrete, 18, B + 0.1, 182.65, false);
    box(42.4, 0.25, 6.4, white, 18, 3.9, 182.85, false);
    box(42.6, 0.4, 0.2, red, 18, 3.75, 179.65, false);
    [-2, 10, 22, 34].forEach(x => { box(0.4, 3.8, 0.4, white, x, B + 1.9, 180.4, true); box(0.42, 0.4, 0.42, red, x, B + 0.4, 180.4, false); });
    [0, 12, 24, 36].forEach(x => put(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.6), lampM), x, 3.74, 182.8));
    PKS_BAYS.forEach((bay, i) => plane(1.9, 0.5, textMat('STANOWISKO ' + (i + 1), 512, 128, '#1565c0', '#ffffff'), bay.x, 3.45, 179.5));
    [7, 31].forEach(x => box(2.4, 0.5, 0.5, lamb(0x8d6e63), x, B + 0.45, 184.7, true));          // ławki pod ścianą dworca

    // --- budynek dworca ---
    const BX = PKS_BLD.x, BZ = PKS_BLD.z, BW = PKS_BLD.w, BD = PKS_BLD.d, BH = PKS_BLD.h, FZ = BZ - BD/2;   // FZ = front (z = 186)
    box(BW, BH, BD, wallM, BX, B + BH/2, BZ, true);
    box(BW + 0.8, 0.3, BD + 1.0, red, BX, B + BH + 0.15, BZ - 0.2, false);
    [8, 13, 25, 30].forEach(x => plane(3.6, 1.8, glass, x, B + 1.7, FZ - 0.03));
    plane(2.2, 2.6, dark, BX, B + 1.3, FZ - 0.04); plane(1.8, 2.3, glass, BX, B + 1.2, FZ - 0.05);   // drzwi
    plane(14, 0.7, textMat('DWORZEC AUTOBUSOWY', 1024, 64, '#b71c1c', '#ffffff'), BX, B + 3.3, FZ - 0.04);
    box(7, 1.5, 0.3, red, BX, B + BH + 1.1, FZ + 0.3, false);                                      // duży szyld „PKS” na dachu
    plane(6.6, 1.3, textMat('PKS', 384, 96, '#b71c1c', '#ffffff'), BX, B + BH + 1.1, FZ + 0.3 - 0.16);
    {   // tablica z rozkładem jazdy obok drzwi
      const tc = document.createElement('canvas'); tc.width = 256; tc.height = 180; const tg = tc.getContext('2d');
      tg.fillStyle = '#fff'; tg.fillRect(0,0,256,180); tg.fillStyle = '#b71c1c'; tg.fillRect(0,0,256,44);
      tg.fillStyle = '#fff'; tg.font = 'bold 26px sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.fillText('ROZKŁAD JAZDY', 128, 24);
      tg.fillStyle = '#263238'; tg.font = 'bold 22px sans-serif'; tg.fillText('Linia 1', 128, 66);
      tg.font = '18px sans-serif'; tg.fillText('PKS → Górna → Społeczna', 128, 94); tg.fillText('→ Pasaż → Długa → PKS', 128, 118);
      tg.font = '15px sans-serif'; tg.fillText('Kursy jeden po drugim', 128, 142); tg.fillText('Stanowiska 1–3', 128, 162);
      plane(2.0, 1.4, new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(tc)}), 21.7, B + 1.6, FZ - 0.045);
    }
  })();

  // ===== Przystanki autobusowe: (1) Długa, między domami nr 2 i 3; (2) między sklepem AGD a supermarketem Pandy =====
  const BUS_STOPS = [
    {name:'DŁUGA',       x:-33.25, z:-25.7, slab:3.55},    // domy 2 (x -46…-38) i 3 (x -28,5…-19,5): środek przerwy; płyta sięga chodnika (z = -22,15)
    {name:'PASAŻ', x:105.5,  z:-65.5, slab:1.5},     // przerwa AGD (do x=103) – Pandy (od x=108); płyta kończy się na linii frontów (z = -64)
    {name:'SPOŁECZNA', x:141.9, z:44.25, slab:3.8, rot:-Math.PI/2},   // Społeczna, wschodnia strona: przerwa między Domem G (z do 37,5) a Ubraniami (od z=51); front na zachód do chodnika (x=138,15)
    {name:'GÓRNA', x:91, z:162, slab:3.8, rot:Math.PI},                // obok stacji (od wschodu), na płaskim grzbiecie wzgórza; front na północ do chodnika (z=158,15)
    // ===== Przystanki równoległe – po przeciwnej stronie ulicy (ta sama nazwa) =====
    {name:'DŁUGA',     x:-65,   z:-2.35, slab:3.5, rot:Math.PI},             // południowa strona Długiej, za domem nr 7 (x -59…-51) – pusty odcinek na zachód od niego; front na północ do chodnika (z = -5,85)
    {name:'SPOŁECZNA', x:118.05, z:42.5, slab:3.8, rot:Math.PI/2},           // zachodnia strona Społecznej, w przerwie między Domem D (z do 37,5) a Domem E (od z=47,5); front na wschód do chodnika (x = 121,85)
    {name:'GÓRNA',     x:91,    z:138.05, slab:3.8}                       // północna strona Górnej, naprzeciwko przystanku przy stacji; front na południe do chodnika (z = 141,85)
  ];
  const BENCH_SEATS = [];                                                                         // ławki na przystankach: twarde i można na nich siedzieć (F)
  BUS_STOPS.forEach(bs => {
    const rot = bs.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), quarter = Math.abs(sr) > 0.5;
    const grp = new THREE.Group(); grp.position.set(bs.x, terrainH(bs.x, bs.z), bs.z); grp.rotation.y = rot; scene.add(grp);   // front (lokalne +z) → ulica / parking
    const toWorld = (px, pz) => ({x:bs.x + px*cr + pz*sr, z:bs.z - px*sr + pz*cr});
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => { const q = toWorld(px, pz); const wl = {x:q.x, z:q.z, w:quarter ? bd : bw, d:quarter ? bw : bd}; WALLS.push(wl); return wl; };
    let lastCol = null;
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) lastCol = col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const dark = lamb(0x37474f), blue = lamb(0x1565c0), wood = lamb(0x8d6e63);
    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.38});
    const SW = 3.6;
    box(4.0, 0.12, bs.slab + 0.1, lamb(0xb8b8b0), 0, 0.06, bs.slab/2 - 0.05, false);               // betonowa płyta
    box(SW, 1.7, 0.06, glass, 0, 1.0, 0.1, true);                                                  // tylna szyba
    [-1,1].forEach(sd => box(0.06, 1.7, 1.4, glass, sd*(SW/2 - 0.03), 1.0, 0.85, true));            // szyby boczne
    [[-1,0.1],[1,0.1],[-1,1.55],[1,1.55]].forEach(q => box(0.1, 2.4, 0.1, dark, q[0]*(SW/2 - 0.05), 1.25, q[1], false));   // słupki
    box(SW + 0.3, 0.12, 1.9, blue, 0, 2.46, 0.8, false);                                           // dach
    box(2.4, 0.08, 0.45, wood, 0, 0.5, 0.45, true);                                                // ławka (twarda – kolizja)
    { const bq = toWorld(0, 0.45); BENCH_SEATS.push({x:bq.x, z:bq.z, pd:{kind:'bench', mesh:{rotation:{y:rot}}, wall:lastCol}}); }   // pd jak przy krześle: siadanie/wstawanie przez sitOn/standUp
    box(2.4, 0.4, 0.05, wood, 0, 0.82, 0.25, false);
    [-1,1].forEach(sd => box(0.08, 0.44, 0.4, dark, sd*1.0, 0.28, 0.45, false));
    // znak „przystanek autobusowy” na maszcie nad dachem (widoczny z ulicy z obu stron)
    const c = document.createElement('canvas'); c.width = 256; c.height = 352; const g = c.getContext('2d');
    g.fillStyle = '#0d47a1'; g.fillRect(0,0,256,256); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(8,8,240,240);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect ? g.roundRect(46,70,164,110,18) : g.rect(46,70,164,110); g.fill();
    g.fillStyle = '#0d47a1'; [[62,84],[110,84],[158,84]].forEach(q => g.fillRect(q[0],q[1],40,42)); g.fillRect(62,138,132,10);
    g.fillStyle = '#fff'; [[78,190],[178,190]].forEach(q => { g.beginPath(); g.arc(q[0],q[1],19,0,Math.PI*2); g.fill(); });
    g.fillStyle = '#fff'; g.fillRect(0,256,256,96); g.fillStyle = '#0d2a4a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 44; g.font = `bold ${fs}px sans-serif`; while(g.measureText(bs.name).width > 230 && fs > 16){ fs -= 2; g.font = `bold ${fs}px sans-serif`; }
    g.fillText(bs.name, 128, 306);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    const sm = new THREE.MeshBasicMaterial({map:tex});
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), dark), 1.1, 2.97, 0.8);
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.24), sm); f1.position.set(1.1, 3.7, 0.84); grp.add(f1);
    const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.24), sm); f2.position.set(1.1, 3.7, 0.76); f2.rotation.y = Math.PI; grp.add(f2);
    const bc = toWorld(0, bs.slab/2);
    BUILDINGS.push({x:bc.x, z:bc.z, w:quarter ? bs.slab + 0.4 : 4.2, d:quarter ? 4.2 : bs.slab + 0.4, open:true});   // bez drzew; niebieski znacznik na mapie
  });

  // ===== Mechanik na Poprzecznej (zachodnia strona): wjeżdżasz autem do środka, wysiadasz i rozmawiasz – ulepszenie skrętu =====
  const MECH_PRICES = [40, 80, 140];                                     // cena kolejnych poziomów skrętu (maks. 3)
  const MECH_TITLES = ['Sportowa kolumna kierownicza', 'Szybsza przekładnia i sztywniejsze zawieszenie', 'Pełny pakiet rajdowy'];
  BUILDINGS.push({x:MECH.x, z:MECH.z, w:MECH.d, d:MECH.w, open:true});
  const mechWallMat = new THREE.MeshLambertMaterial({color:0xdfe3e6});
  const mechExterior = [];
  let mechInside = false, mechNpc = null;
  const mechNpcDist = () => mechNpc ? Math.hypot(player.position.x - mechNpc.position.x, player.position.z - mechNpc.position.z) : 99;
  const mechLight = new THREE.PointLight(0xfff4e8, 0, 15);
  (function buildMechanic(){
    const CX = MECH.x, CZ = MECH.z, w = MECH.w, d = MECH.d, h = MECH.h, t = 0.3, gap = 4.6;
    const grp = new THREE.Group(); grp.position.set(CX, 0, CZ); grp.rotation.y = Math.PI/2; scene.add(grp);   // front (lokalne +z) → +x (w stronę ulicy)
    const lamb = c => new THREE.MeshLambertMaterial({color:c});
    const put = (m, px, py, pz) => { m.position.set(px,py,pz); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
    const col = (px, pz, bw, bd) => WALLS.push({x:CX + pz, z:CZ - px, w:bd, d:bw});
    const box = (bw,bh,bd,mat,px,py,pz,collide) => { if(collide) col(px,pz,bw,bd); return put(new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat), px, py, pz); };
    const dark = lamb(0x37474f), blue = lamb(0x1565c0), yellow = lamb(0xfdd835), steel = lamb(0x90a4ae);

    box(w, h, t, mechWallMat, 0, h/2, -d/2+t/2, true);
    box(t, h, d, mechWallMat, -w/2+t/2, h/2, 0, true);
    box(t, h, d, mechWallMat,  w/2-t/2, h/2, 0, true);
    const seg = (w-gap)/2;
    box(seg, h, t, mechWallMat, -(gap/2+seg/2), h/2, d/2-t/2, true);
    box(seg, h, t, mechWallMat,  (gap/2+seg/2), h/2, d/2-t/2, true);
    box(gap, h-3.3, t, mechWallMat, 0, 3.3+(h-3.3)/2, d/2-t/2, false);          // nadproże – brama jest podniesiona, wjazd wolny

    mechExterior.push(box(w+0.6, 0.4, d+0.6, lamb(0x455a64), 0, h+0.2, 0, false));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0xf7f9fb));
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, h, 0); grp.add(ceil);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w-2*t, d-2*t), lamb(0x9aa1a6));
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0.04, 0); floor.receiveShadow = true; grp.add(floor);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(gap+2.4, 2.3), lamb(0x8a9196));                // płyta przed wjazdem
    apron.rotation.x = -Math.PI/2; apron.position.set(0, 0.035, d/2+1.15); apron.receiveShadow = true; grp.add(apron);

    // stanowisko serwisowe na środku (obrys w żółtych pasach)
    box(2.9, 0.03, 5.2, yellow, 0, 0.06, 0, false);
    box(2.5, 0.035, 4.8, dark, 0, 0.065, 0, false);
    box(2.4, 0.04, 0.12, yellow, 0, 0.09, d/2-0.9, false);

    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.5});
    [-1,1].forEach(sd => box(3.0, 1.6, 0.06, glass, sd*(gap/2+seg/2), 1.9, d/2+0.03, false));
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128;
    const sg = sc.getContext('2d'); sg.fillStyle = '#0d2a4a'; sg.fillRect(0,0,512,128);
    sg.fillStyle = '#fdd835'; for(let i=0;i<16;i++) sg.fillRect(i*32, 112, 16, 10);
    sg.fillStyle = '#fff'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    let fs = 74; sg.font = `bold ${fs}px sans-serif`;
    while(sg.measureText('MECHANIK').width > 440 && fs > 24){ fs -= 2; sg.font = `bold ${fs}px sans-serif`; }
    sg.fillText('MECHANIK', 256, 52);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}));
    sign.position.set(0, 3.85, d/2+0.04); grp.add(sign); mechExterior.push(sign);

    // plakat na tylnej ścianie
    const pc = document.createElement('canvas'); pc.width = 640; pc.height = 96;
    const pg = pc.getContext('2d'); pg.fillStyle = '#0d2a4a'; pg.fillRect(0,0,640,96); pg.strokeStyle = '#fdd835'; pg.lineWidth = 6; pg.strokeRect(3,3,634,90);
    pg.fillStyle = '#fff'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.font = 'bold 38px sans-serif'; pg.fillText('ULEPSZ SKRĘT – OD ' + MECH_PRICES[0] + ' MONET', 320, 50);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(pc)}));
    poster.position.set(1.5, 3.2, -d/2 + t + 0.02); grp.add(poster);

    // wyposażenie: stosy opon i beczki pod tylną ścianą, szafka z narzędziami
    const tireM = lamb(0x1b1b1f), barrelM = lamb(0x1e88e5);
    [[5.3,-4.7],[5.3,-3.9],[4.3,-4.7]].forEach(q => { for(let k=0;k<3;k++) put(new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.22,16), tireM), q[0], 0.15 + k*0.23, q[1]); col(q[0], q[1], 0.95, 0.95); });
    [[-5.4,-4.8],[-4.5,-4.8]].forEach(q => { put(new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.85,14), barrelM), q[0], 0.46, q[1]); col(q[0], q[1], 0.62, 0.62); });
    box(0.7, 1.1, 1.4, blue, -2.4, 0.55, -d/2+t+0.75, true);                             // szafka z narzędziami
    box(0.72, 0.06, 1.44, steel, -2.4, 1.13, -d/2+t+0.75, false);
    // ława robocza przy bocznej ścianie (świat: +z), przy niej mechanik
    box(0.7, 1.0, 4.4, dark, -6.2, 0.5, -1.5, true);
    box(0.76, 0.07, 4.5, lamb(0xd7b98a), -6.2, 1.03, -1.5, false);
    box(0.4, 0.3, 0.5, lamb(0xe53935), -6.2, 1.22, -0.2, false);                       // skrzynka narzędziowa
    box(0.1, 0.9, 0.1, steel, -6.2, 1.5, -2.8, false);                                  // imadło
    const lampM = new THREE.MeshBasicMaterial({color:0xfff4cc});
    [[-3.5,-2.4],[3.5,-2.4],[-3.5,2.4],[3.5,2.4]].forEach(q => put(new THREE.Mesh(new THREE.BoxGeometry(1.8,0.06,0.6), lampM), q[0], h-0.04, q[1]));

    // mechanik: niebieski kombinezon, czapka
    const npc = new THREE.Group();
    const nb = (bw,bh,bd,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), lamb(c)); m.position.set(x,y,z); m.castShadow = true; npc.add(m); };
    nb(0.7,0.9,0.4,0x1565c0,0,1.25,0); nb(0.5,0.5,0.5,0xd9a066,0,1.95,0); nb(0.56,0.16,0.6,0xfdd835,0,2.28,0.02);
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.3,0.06,0.02,0x5d4037,0,1.82,0.26);                                           // wąsy
    nb(0.25,0.8,0.25,0x1565c0,-0.48,1.25,0); nb(0.25,0.8,0.25,0x1565c0,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x0d47a1,-0.18,0.4,0); nb(0.25,0.8,0.25,0x0d47a1,0.18,0.4,0);
    nb(0.08,0.5,0.08,0x9e9e9e,0.62,1.05,0.15);                                         // klucz w dłoni
    npc.position.set(CX - 2.4, 0, CZ + 4.9); npc.rotation.y = Math.PI;                   // domyślnie patrzy w stronę stanowiska
    scene.add(npc); mechNpc = npc;
    const tag = (draw, sw2, sh, y) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; draw(c.getContext('2d'));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
      sp.scale.set(sw2, sh, 1); sp.position.set(npc.position.x, y, npc.position.z); scene.add(sp); return sp;
    };
    tag(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Staszek • mechanik', 128, 33); }, 1.9, 0.45, 2.75);
    mechLight.position.set(CX, 3.4, CZ); scene.add(mechLight);
  })();
  function updateMechInterior(dt, time){
    const dx = player.position.x - mechNpc.position.x, dz = player.position.z - mechNpc.position.z;
    const target = (mechInside && Math.hypot(dx,dz) < 8) ? Math.atan2(dx, dz) : Math.PI;
    mechNpc.rotation.y += Math.atan2(Math.sin(target - mechNpc.rotation.y), Math.cos(target - mechNpc.rotation.y)) * Math.min(1, dt*5);
    const inside = Math.abs(player.position.x - MECH.x) < MECH.d/2 - 0.15 && Math.abs(player.position.z - MECH.z) < MECH.w/2 - 0.15;
    if(inside === mechInside) return;
    mechInside = inside;
    mechExterior.forEach(m => m.visible = !inside);
    mechWallMat.transparent = false; mechWallMat.opacity = 1; mechWallMat.depthWrite = true;
  }
  // auto musi stać w środku warsztatu (cały zmieścić się za bramą)
  function mechCarInside(){ return hasCar && !carDriving && Math.abs(pcar.group.position.x - MECH.x) < MECH.d/2 - 2.4 && Math.abs(pcar.group.position.z - MECH.z) < 3.5; }
  function buySteer(){
    if(steerLvl >= MECH_PRICES.length){ openMechTalk(); return; }
    if(!mechCarInside()){ toast('Auto musi stać w warsztacie 🚗'); closeDialog(); return; }
    const price = MECH_PRICES[steerLvl];
    if(!payAny(price, 'ulepszenie skrętu')){ toast(`Ulepszenie kosztuje ${price} monet 🪙 – masz ${coins()}${bank.opened?` + ${bank.balance} na koncie`:''}`); return; }
    steerLvl++; renderInv(); renderShop();
    toast(`Skręt ulepszony 🔧 poziom ${steerLvl}/${MECH_PRICES.length}`);
    openMechTalk();
  }
  function openMechTalk(){
    const W = '🔧 Staszek, mechanik';
    if(!hasCar){ say('Witaj w warsztacie! Ulepszam skręt w samochodach, ale najpierw musisz mieć auto – kup je w salonie po drugiej stronie ulicy 🚗', [{label:'Wyjdź', fn:closeDialog}], W, 'mech'); return; }
    if(!mechCarInside()){ say('Witaj w warsztacie! Wjedź swoim autem do środka, na stanowisko z żółtymi pasami, wysiądź (Shift) i wróć do mnie – wtedy ulepszę ci skręt 🔧', [{label:'Wyjdź', fn:closeDialog}], W, 'mech'); return; }
    if(steerLvl >= MECH_PRICES.length){ say(`Twoje auto ma już pełny pakiet rajdowy – skręt na poziomie ${steerLvl}/${MECH_PRICES.length}. Lepiej już się nie da! 🏁`, [{label:'Wyjdź', fn:closeDialog}], W, 'mech'); return; }
    const price = MECH_PRICES[steerLvl];
    say(`Fajne auto! Mogę poprawić jego skręt, żeby wchodziło w zakręty dużo lepiej. Teraz masz poziom ${steerLvl}/${MECH_PRICES.length}. Następny: ${MECH_TITLES[steerLvl]} – ${price} 🪙. Płacisz monetami przy sobie, a brakującą część pobiorę z konta bankowego.`,
      [{label:`Ulepsz skręt (${price} 🪙)`, fn:buySteer}, {label:'Wyjdź', fn:closeDialog}], W, 'mech');
  }
  const dlgDist = () => dlgWho === 'miner' ? minerDist() : dlgWho === 'nbr' ? nbrDist() : dlgWho === 'fuel' ? pumpDist() : dlgWho === 'agd' ? agdNpcDist() : dlgWho === 'mech' ? mechNpcDist() : dlgWho === 'paint' ? paintNpcDist() : dlgWho === 'car' ? carNpcDist() : dlgWho === 'cloth' ? clothNpcDist() : dlgWho === 'shop' ? shopNpcDist() : dlgWho === 'bank' ? bankNpcDist() : dlgWho === 'furn' ? furnNpcDist() : dlgWho === 'home' ? (dlgHome ? Math.hypot(player.position.x-homeDoorPos(dlgHome).x, player.position.z-homeDoorPos(dlgHome).z) : 0) : npcDist();

  // ===== Ustawianie biurka w domu =====
  const placedDesks = [];
  let placing = null;
  const deskDims = r => (r % 2) ? {w:0.8, d:1.6} : {w:1.6, d:0.8};
  const furnDimsBase = (kind, r) => kind === 'lamp' ? {w:0.5, d:0.5} : kind === 'chair' ? {w:0.5, d:0.5} : kind === 'wardrobe' ? ((r % 2) ? {w:0.68, d:1.3} : {w:1.3, d:0.68}) : kind === 'computer' ? {w:0.82, d:0.62} : kind === 'oven' ? ((r % 2) ? {w:0.7, d:0.9} : {w:0.9, d:0.7}) : deskDims(r);
  const furnNounBase = kind => kind === 'lamp' ? {nom:'lampa', gen:'lampy'} : kind === 'chair' ? {nom:'krzesło', gen:'krzesła'} : kind === 'wardrobe' ? {nom:'szafa', gen:'szafy'} : kind === 'computer' ? {nom:'komputer', gen:'komputera'} : kind === 'oven' ? {nom:'piekarnik', gen:'piekarnika'} : {nom:'biurko', gen:'biurka'};
  const makeFurnBase = (kind, ghost) => kind === 'lamp' ? makeLamp(ghost) : kind === 'chair' ? makeChair(ghost) : kind === 'wardrobe' ? makeWardrobe(ghost) : kind === 'computer' ? makeComputer(ghost) : kind === 'oven' ? makeOven(ghost) : makeDesk(ghost);
  // Wyposażenie łazienki sprzedawane w Dom i AGD: toaleta, wanna, lustro stojące (ustawiane i podnoszone jak meble)
  const FIXT = ['toilet','bathtub','mirror'];
  const FIXT_DIMS = {toilet:[0.5,0.8], bathtub:[1.8,0.8], mirror:[0.9,0.52]}, FIXT_NOUN = {toilet:{nom:'toaleta', gen:'toalety'}, bathtub:{nom:'wanna', gen:'wanny'}, mirror:{nom:'lustro', gen:'lustra'}};
  const furnDims = (kind, r) => FIXT_DIMS[kind] ? ((r % 2) ? {w:FIXT_DIMS[kind][1], d:FIXT_DIMS[kind][0]} : {w:FIXT_DIMS[kind][0], d:FIXT_DIMS[kind][1]}) : furnDimsBase(kind, r);
  const furnNoun = kind => FIXT_NOUN[kind] || furnNounBase(kind);
  const makeFurn = (kind, ghost) => kind === 'toilet' ? makeToilet(ghost) : kind === 'bathtub' ? makeBathtub(ghost) : kind === 'mirror' ? makeMirrorFurn(ghost) : makeFurnBase(kind, ghost);
  const overlap = (ax,az,aw,ad,b) => Math.abs(ax-b.x) < (aw+b.w)/2 - 0.001 && Math.abs(az-b.z) < (ad+b.d)/2 - 0.001;
  const homeReserved = () => [
    homeRect(HOME.lay.bed.x, HOME.lay.bed.z, 2.3, 3.2),          // łóżko
    homeRect(HOME.lay.fridge.x, HOME.lay.fridge.z, 1.3, 1.1),    // lodówka
    homeRect(0, HOME.d/2-0.9, 2.4, 1.8),                         // wolne przejście przy drzwiach
    ...HOME.lay.reserve.map(r => homeRect(r[0], r[1], r[2], r[3]))   // wolne przejścia między pomieszczeniami
  ];
  function startPlacement(k){
    if(!homeInside){ toast('Meble możesz ustawiać tylko w swoim domu 🏠'); return; }
    if(placing) return;
    if(sitting){ toast('Najpierw wstań z krzesła'); return; }
    const kind = inv[k] && ['chair','wardrobe','computer','lamp','oven','toilet','bathtub','mirror'].includes(inv[k].id) ? inv[k].id : 'desk';
    const ghost = makeFurn(kind, true); scene.add(ghost);
    placing = {slot:k, kind, rot:0, ghost, valid:false, x:0, z:0};
    invEl.style.display = 'none';
    $('placeUI').style.display = 'block'; promptEl.style.display = 'none';
    $('pRot').textContent = kind === 'computer' ? '↔ Odwróć przód/tył (R)' : '⟳ Obróć (R)';
    $('pRot').style.display = kind === 'lamp' ? 'none' : '';
    $('placeMsg').textContent = kind === 'lamp' ? 'Montaż lampy: idź tam, gdzie ma wisieć – podgląd jest na suficie, a zielone kółko na podłodze pokazuje miejsce pod nią' : kind === 'computer' ? 'Ustawianie komputera: podejdź do biurka – komputer stanie na blacie' : 'Ustawianie mebla: idź tam, gdzie ma stanąć – podgląd jest przed tobą';
  }
  function cancelPlacement(msg){
    if(!placing) return;
    scene.remove(placing.ghost); placing = null;
    $('placeUI').style.display = 'none'; $('pRot').style.display = '';
    if(msg) toast(msg);
  }
  function rotatePlacement(){ if(placing) placing.rot = placing.kind === 'computer' ? (placing.rot + 1) % 2 : (placing.rot + 1) % 4; }
  // Czy odcinek (x0,z0)→(x1,z1) przecina którąś ścianę domu (meble stojące w domu nie liczą się jako ściana).
  function wallBetween(x0, z0, x1, z1){
    const furn = new Set(placedDesks.map(pd => pd.wall));
    if(sitting) furn.add(sitting.wall);
    for(const w of WALLS){
      if(furn.has(w) || w.enter !== undefined) continue;
      const lo = [w.x - w.w/2, w.x + w.w/2, w.z - w.d/2, w.z + w.d/2];
      if(Math.min(x0, x1) > lo[1] + 0.01 || Math.max(x0, x1) < lo[0] - 0.01 || Math.min(z0, z1) > lo[3] + 0.01 || Math.max(z0, z1) < lo[2] - 0.01) continue;
      let t0 = 0, t1 = 1, hit = true;
      for(const [d, q, a0, a1] of [[x1 - x0, x0, lo[0], lo[1]], [z1 - z0, z0, lo[2], lo[3]]]){
        if(Math.abs(d) < 1e-9){ if(q < a0 || q > a1){ hit = false; break; } }
        else { let u = (a0 - q)/d, v = (a1 - q)/d; if(u > v){ const tmp = u; u = v; v = tmp; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if(t0 > t1){ hit = false; break; } }
      }
      if(hit) return true;
    }
    return false;
  }
  function updatePlacement(){
    if(!placing) return;
    if(!homeInside){ cancelPlacement('Wyszedłeś z domu – anulowano ustawianie mebla'); return; }
    const dm = furnDims(placing.kind, placing.rot), t = 0.28;
    if(placing.kind === 'computer'){
      const tx = player.position.x + Math.sin(facing)*1.5, tz = player.position.z + Math.cos(facing)*1.5;
      let target = null, best = 2.8;
      for(const pd of placedDesks){
        if((pd.kind || 'desk') !== 'desk' || pd.computer) continue;
        const d = Math.hypot(pd.wall.x-tx, pd.wall.z-tz);
        if(d < best){ best = d; target = pd; }
      }
      placing.targetDesk = target;
      const ok = !!target && homeInside;
      if(target){
        const pos = target.mesh.localToWorld(new THREE.Vector3(0,0.78,0));
        placing.x = pos.x; placing.z = pos.z;
        placing.ghost.position.copy(pos);
        placing.ghost.rotation.y = target.mesh.rotation.y + placing.rot*Math.PI;
      }
      placing.valid = ok;
      deskGhostMat.color.setHex(ok ? 0x4caf50 : 0xe53935);
      const msg = $('placeMsg'); msg.classList.toggle('bad', !ok);
      msg.textContent = ok ? `Komputer na biurku – R: ${placing.rot ? 'tyłem' : 'przodem'}` : 'Podejdź do wolnego biurka, aby postawić na nim komputer';
      return;
    }
    const lx = HOME.ww/2 - t - dm.w/2, lz = HOME.wd/2 - t - dm.d/2;
    let cx = player.position.x + Math.sin(facing)*1.8, cz = player.position.z + Math.cos(facing)*1.8;
    const clX = v => HOME.x + Math.max(-lx, Math.min(lx, v - HOME.x)), clZ = v => HOME.z + Math.max(-lz, Math.min(lz, v - HOME.z));
    cx = clX(cx); cz = clZ(cz);
    // Ściana jest twardą granicą: podgląd idzie od gracza w stronę celu i zatrzymuje się przed pierwszą ścianą (też działową) – nie przeskakuje na drugą stronę
    const hitsWall = (x, z) => WALLS.some(b => b.struct && overlap(x, z, dm.w, dm.d, b));
    {
      const sx = clX(player.position.x), sz = clZ(player.position.z), N = 60;
      let free = 0, blocked = 1;
      for(let i = 1; i <= N; i++){ const u = i/N; if(hitsWall(sx + (cx-sx)*u, sz + (cz-sz)*u)){ blocked = u; break; } free = u; }
      if(blocked < 1) for(let k = 0; k < 10; k++){ const m = (free + blocked)/2; if(hitsWall(sx + (cx-sx)*m, sz + (cz-sz)*m)) blocked = m; else free = m; }
      cx = sx + (cx-sx)*free; cz = sz + (cz-sz)*free;
      const snx = Math.round(cx*20)/20, snz = Math.round(cz*20)/20;
      if(!hitsWall(snx, snz)){ cx = snx; cz = snz; }                                           // przyciąganie do siatki 5 cm tylko jeśli nie wchodzi w ścianę
    }
    let ok = placing.kind === 'lamp' ? !placedDesks.some(pd => pd.kind === 'lamp' && Math.hypot(pd.wall.x-cx, pd.wall.z-cz) < 0.6)   // lampa wisi pod sufitem – meble jej nie przeszkadzają
      : !homeReserved().some(b => overlap(cx,cz,dm.w,dm.d,b)) && !WALLS.some(b => overlap(cx,cz,dm.w,dm.d,b));
    const px = Math.max(Math.abs(player.position.x-cx) - dm.w/2, 0), pz = Math.max(Math.abs(player.position.z-cz) - dm.d/2, 0);
    if(placing.kind !== 'lamp' && Math.hypot(px,pz) < 0.4) ok = false;                         // nie na postaci
    let behindWall = false;
    if(ok){                                                                                    // nie przez ścianę: między tobą a miejscem docelowym (środek i cztery rogi mebla) nie może być ściany
      const hw = Math.max(0, dm.w/2 - 0.1), hd = Math.max(0, dm.d/2 - 0.1);   // rogi odsunięte do środka, żeby mebel przy samej ścianie nie był uznany za „za ścianą”
      for(const [ox, oz] of [[0,0],[-hw,-hd],[hw,-hd],[-hw,hd],[hw,hd]]){
        if(wallBetween(player.position.x, player.position.z, cx + ox, cz + oz)){ behindWall = true; break; }
      }
      if(behindWall) ok = false;
    }
    placing.x = cx; placing.z = cz; placing.valid = ok;
    placing.ghost.position.set(cx, placing.kind === 'lamp' ? HOME.h : 0.07, cz); placing.ghost.rotation.y = placing.rot*Math.PI/2;
    deskGhostMat.color.setHex(ok ? 0x4caf50 : 0xe53935);
    const msg = $('placeMsg'); msg.classList.toggle('bad', !ok);
    const nn = furnNoun(placing.kind);
    msg.textContent = placing.kind === 'lamp' ? (ok ? 'Idź tam, gdzie ma wisieć lampa. Zielone = można zamontować' : behindWall ? 'Nie zamontujesz lampy przez ścianę – przejdź na drugą stronę' : 'Tu nie da się zamontować lampy (inna lampa jest zbyt blisko)')
      : ok ? `Idź tam, gdzie ma stanąć ${nn.nom}. Zielone = można postawić` : behindWall ? `Nie postawisz ${nn.gen} przez ścianę – przejdź na drugą stronę` : `Tu nie da się postawić ${nn.gen} (zajęte miejsce)`;
  }
  function confirmPlacement(){
    if(!placing) return;
    const {x,z,rot,slot,kind} = placing, dm = furnDims(kind, rot), nn = furnNoun(kind);
    if(!placing.valid){ toast(kind === 'computer' ? 'Podejdź do wolnego biurka' : `Tu nie da się postawić ${nn.gen}`); return; }
    if(kind === 'computer'){
      const target = placing.targetDesk;
      if(!target || target.computer){ toast('To biurko jest już zajęte'); return; }
      removeOne(slot);
      const mesh = makeComputer(false); mesh.position.set(0,0.78,0); mesh.rotation.y = rot*Math.PI; target.mesh.add(mesh);
      target.computer = mesh;
      cancelPlacement(); renderInv();
      toast('Komputer ustawiony na biurku 🖥️ (R podczas ustawiania – przód/tył)');
      return;
    }
    if(kind === 'lamp'){
      removeOne(slot);
      const mesh = makeLamp(false); mesh.position.set(x, HOME.h, z); scene.add(mesh);
      const pd = {mesh, wall:{x, z, w:dm.w, d:dm.d}, kind};              // bez wpisu w WALLS – lampa nie blokuje przejścia
      attachLampLight(pd); placedDesks.push(pd);
      cancelPlacement(); renderInv();
      toast('Lampa zamontowana na suficie 💡 (F / G pod lampą – zdejmij)'); return;
    }
    removeOne(slot);
    const mesh = makeFurn(kind, false); mesh.position.set(x, 0.07, z); mesh.rotation.y = rot*Math.PI/2; scene.add(mesh);
    const wall = {x, z, w:dm.w, d:dm.d}; WALLS.push(wall);
    placedDesks.push({mesh, wall, kind});
    cancelPlacement(); renderInv();
    toast(FIXT.includes(kind) ? `Ustawiono: ${ITEMS[kind].i} ${ITEMS[kind].n} (F lub G przy przedmiocie – podnieś)` : kind === 'oven' ? 'Piekarnik ustawiony 🍳 (F lub G przy piekarniku – podnieś)' : kind === 'chair' ? 'Krzesło ustawione 🪑 (G przy krześle – podnieś)' : kind === 'wardrobe' ? 'Szafa ustawiona 🚪 (F – otwórz, G – podnieś)' : 'Biurko ustawione 🗄️ (F przy biurku – podnieś)');
  }
  function pickupComputer(pd){
    if(!pd || !pd.computer) return;
    if(!addItem('computer')){ toast('Ekwipunek pełny!'); return; }
    pd.mesh.remove(pd.computer); pd.computer = null; renderInv(); toast('Podniesiono komputer 🖥️');
  }
  function nearLamp(){                                               // lampa wisi nad głową – liczy się odległość w poziomie
    if(!homeInside) return null;
    for(const pd of placedDesks){
      if(pd.kind !== 'lamp') continue;
      if(Math.hypot(player.position.x - pd.wall.x, player.position.z - pd.wall.z) < 0.8) return pd;
    }
    return null;
  }
  function nearDesk(kind){                                         // kind 'chair' = tylko krzesła, brak = tylko biurka
    for(const pd of placedDesks){
      if((pd.kind || 'desk') !== (kind || 'desk')) continue;
      const w = pd.wall;
      const dx = Math.max(Math.abs(player.position.x - w.x) - w.w/2, 0), dz = Math.max(Math.abs(player.position.z - w.z) - w.d/2, 0);
      if(Math.hypot(dx,dz) < 1.1) return pd;
    }
    return null;
  }
  // Komputer na biurku – dostępny podczas siedzenia na krześle obok biurka.
  let computerUiOpen = false, computerBootTimer = null;
  const computerUI = document.getElementById('computerUI');
  const computerBoot = document.getElementById('computerBoot');
  const computerDesktop = document.getElementById('computerDesktop');
  function closeComputer(){
    computerUiOpen = false;
    if(computerBootTimer){ clearTimeout(computerBootTimer); computerBootTimer = null; }
    computerUI.classList.remove('show'); computerUI.setAttribute('aria-hidden','true');
    computerBoot.style.display = 'flex'; computerDesktop.classList.remove('active'); pcInternetWindow.classList.remove('open'); try{ pcSixWindow.classList.remove('open'); pcSixFrame.removeAttribute('srcdoc'); }catch(e){} try{ pepStop(); pcPepperWindow.classList.remove('open'); }catch(e){} try{ closeFiles(); }catch(e){} try{ scCloseWin(); }catch(e){}
  }
  function turnOnComputer(){
    if(!sitting) return;
    if(computerUiOpen){ closeComputer(); return; }
    computerUiOpen = true; computerUI.classList.add('show'); computerUI.setAttribute('aria-hidden','false');
    computerBoot.style.display = 'flex'; computerDesktop.classList.remove('active');
    computerBootTimer = setTimeout(()=>{
      if(!computerUiOpen) return;
      computerBoot.style.display = 'none'; computerDesktop.classList.add('active'); computerBootTimer = null;
    },3000);
  }
  document.getElementById('pcPower').addEventListener('click',closeComputer);
  const pcInternetWindow = document.getElementById('pcInternetWindow');
  const pcInternetBlank = document.getElementById('pcInternetBlank');
  const pcInstallersPage = document.getElementById('pcInstallersPage');
  const pcInstallShortcutBtn = document.getElementById('pcInstallShortcutBtn');
  const pcInstallStatus = document.getElementById('pcInstallStatus');
  const pcInstallProgress = document.getElementById('pcInstallProgress');
  const pcInstallProgressBar = document.getElementById('pcInstallProgressBar');
  const pcShortcutDesktopIcon = document.getElementById('pcShortcutDesktopIcon');
  let shortcutInstalled = localStorage.getItem('realLifeShortcutInstalled') === 'true';
  let shortcutInstalling = false;
  pcShortcutDesktopIcon.style.display = shortcutInstalled ? 'flex' : 'none';
  if(shortcutInstalled){ pcInstallStatus.textContent = 'ShortCut jest już zainstalowany.'; pcInstallShortcutBtn.textContent = 'Zainstalowano'; pcInstallShortcutBtn.disabled = true; }
  pcInstallShortcutBtn.addEventListener('click',()=>{
    if(shortcutInstalled || shortcutInstalling) return;
    shortcutInstalling = true; pcInstallShortcutBtn.disabled = true; pcInstallShortcutBtn.textContent = 'Instalowanie…';
    pcInstallProgress.style.display = 'block'; pcInstallProgressBar.style.width = '0%';
    pcInstallStatus.textContent = 'Trwa instalacja ShortCut… (15 s)';
    const started = Date.now();
    const tick = ()=>{
      const progress = Math.min(100, ((Date.now()-started)/15000)*100);
      pcInstallProgressBar.style.width = progress + '%';
      if(progress < 100){ setTimeout(tick,100); return; }
      shortcutInstalling = false; shortcutInstalled = true;
      localStorage.setItem('realLifeShortcutInstalled','true');
      pcInstallStatus.textContent = 'Instalacja zakończona! ShortCut pojawił się na pulpicie.';
      pcInstallShortcutBtn.textContent = 'Zainstalowano';
      pcShortcutDesktopIcon.style.display = 'flex';
    };
    setTimeout(tick,100);
  });

  /* ===== Instalator „6 bierze!” (30 s) ===== */
  const SIX_B64 = 'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InBsIj48aGVhZD48bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MSwgdmlld3BvcnQtZml0PWNvdmVyIj4KPHRpdGxlPjYgYmllcnplISDigJMgR3J5IHBsYW5zem93ZSBER1c8L3RpdGxlPgo8c3R5bGU+Cjpyb290e2NvbG9yLXNjaGVtZTpkYXJrOy0tYmc6IzFhMTAzMzstLWFjYzojZmZkMjNmOy0tcGluazojZmY1ZmEyfQoqe2JveC1zaXppbmc6Ym9yZGVyLWJveH0KaHRtbCxib2R5e21hcmdpbjowO2hlaWdodDoxMDAlO2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOiNmZmY7Zm9udC1mYW1pbHk6IkZyZWRva2EiLCJUcmVidWNoZXQgTVMiLHN5c3RlbS11aSxzYW5zLXNlcmlmfQpib2R5e2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47cGFkZGluZy10b3A6ZW52KHNhZmUtYXJlYS1pbnNldC10b3AsMHB4KTtwYWRkaW5nLWJvdHRvbTplbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSwwcHgpfQojYmFye2ZsZXg6bm9uZTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxMnB4O3BhZGRpbmc6OHB4IDEycHg7YmFja2dyb3VuZDojMmExYjUyO2JvcmRlci1ib3R0b206M3B4IHNvbGlkIHZhcigtLWFjYyl9CiNiYXIgYXtjb2xvcjojMWExMDMzO2JhY2tncm91bmQ6dmFyKC0tYWNjKTt0ZXh0LWRlY29yYXRpb246bm9uZTtmb250LXdlaWdodDo3MDA7cGFkZGluZzo2cHggMTRweDtib3JkZXItcmFkaXVzOjE0cHg7Ym94LXNoYWRvdzoycHggM3B4IDAgIzAwMGE7Zm9udC1zaXplOjE1cHh9CiNiYXIgYntmb250LXNpemU6MTdweDtsZXR0ZXItc3BhY2luZzouMDNlbTt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9CiNne2ZsZXg6MTttaW4taGVpZ2h0OjA7d2lkdGg6MTAwJTtib3JkZXI6MDtiYWNrZ3JvdW5kOiNmZmZ9Cjwvc3R5bGU+CjxzY3JpcHQgc3JjPSJodHRwczovL3d3dy5nc3RhdGljLmNvbS9maXJlYmFzZWpzLzEwLjE0LjEvZmlyZWJhc2UtYXBwLWNvbXBhdC5qcyI+PC9zY3JpcHQ+CjxzY3JpcHQgc3JjPSJodHRwczovL3d3dy5nc3RhdGljLmNvbS9maXJlYmFzZWpzLzEwLjE0LjEvZmlyZWJhc2UtYXV0aC1jb21wYXQuanMiPjwvc2NyaXB0Pgo8c2NyaXB0IHNyYz0iaHR0cHM6Ly93d3cuZ3N0YXRpYy5jb20vZmlyZWJhc2Vqcy8xMC4xNC4xL2ZpcmViYXNlLWRhdGFiYXNlLWNvbXBhdC5qcyI+PC9zY3JpcHQ+Cgo8L2hlYWQ+PGJvZHk+CjxkaXYgaWQ9ImJhciI+PGEgaHJlZj0iIyIgaWQ9ImJhY2siPuKclSBaYW1rbmlqIGdyxJk8L2E+PGI+NiBiaWVyemUhPC9iPjwvZGl2Pgo8aWZyYW1lIGlkPSJnIiB0aXRsZT0iNiBiaWVyemUhIiBhbGxvdz0iYXV0b3BsYXk7IGZ1bGxzY3JlZW4iPjwvaWZyYW1lPgo8c2NyaXB0PgoKY29uc3QgZmlyZWJhc2VDb25maWcgPSB7CiAgICBhcGlLZXk6ICJBSXphU3lEb3hqdWJuaXhESVYtWlUySFdoRnJBUG5FOWF6Znk2ODgiLAogICAgYXV0aERvbWFpbjogImZvb3RiYWxsLW1vbm9wb2x5LW9ubGluZS5maXJlYmFzZWFwcC5jb20iLAogICAgZGF0YWJhc2VVUkw6ICJodHRwczovL2Zvb3RiYWxsLW1vbm9wb2x5LW9ubGluZS1kZWZhdWx0LXJ0ZGIuZXVyb3BlLXdlc3QxLmZpcmViYXNlZGF0YWJhc2UuYXBwIiwKICAgIHByb2plY3RJZDogImZvb3RiYWxsLW1vbm9wb2x5LW9ubGluZSIsCiAgICBzdG9yYWdlQnVja2V0OiAiZm9vdGJhbGwtbW9ub3BvbHktb25saW5lLmZpcmViYXNlc3RvcmFnZS5hcHAiLAogICAgbWVzc2FnaW5nU2VuZGVySWQ6ICI4MzEzOTUyMTY0MzQiLAogICAgYXBwSWQ6ICIxOjgzMTM5NTIxNjQzNDp3ZWI6YmQ2NmNjZGI5MmQ4ZmJlYjUyNTAyYiIsCiAgICBtZWFzdXJlbWVudElkOiAiRy03NlBSNUZXOTRZIgogIH07CmxldCBmYkFwcD1udWxsLGZiQXV0aD1udWxsLGZiREI9bnVsbCxmYkF1dGhSZWFkeT1udWxsLG9ubGluZVBsYXllcklkPW51bGw7CnRyeXtmYkFwcD1maXJlYmFzZS5pbml0aWFsaXplQXBwKGZpcmViYXNlQ29uZmlnKTtmYkF1dGg9ZmlyZWJhc2UuYXV0aCgpO2ZiREI9ZmlyZWJhc2UuZGF0YWJhc2UoKX1jYXRjaChlKXtjb25zb2xlLmVycm9yKCdGaXJlYmFzZSBpbml0OicsZSl9CmZ1bmN0aW9uIGF1dGhSZWFkeSgpewogIGlmKCFmYkF1dGgpcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOwogIGlmKCFmYkF1dGhSZWFkeSl7CiAgICBjb25zdCBwZXJzPWZiQXV0aC5zZXRQZXJzaXN0ZW5jZShmaXJlYmFzZS5hdXRoLkF1dGguUGVyc2lzdGVuY2UuTE9DQUwpLmNhdGNoKCgpPT57fSk7CiAgICBmYkF1dGhSZWFkeT1wZXJzLnRoZW4oKCk9Pm5ldyBQcm9taXNlKHJlcz0+e2NvbnN0IHVuPWZiQXV0aC5vbkF1dGhTdGF0ZUNoYW5nZWQoKCk9Pnt1bigpO3JlcygpfSk7fSkpOwogIH0KICByZXR1cm4gZmJBdXRoUmVhZHk7Cn0KYXN5bmMgZnVuY3Rpb24gb25saW5lRW5zdXJlQXV0aCgpewogIGlmKCFmYkF1dGh8fCFmYkRCKXRocm93IG5ldyBFcnJvcignTmllIHVkYcWCbyBzacSZIHVydWNob21pxIcgRmlyZWJhc2UuIFNwcmF3ZMW6IHBvxYLEhWN6ZW5pZSB6IGludGVybmV0ZW0uJyk7CiAgYXdhaXQgYXV0aFJlYWR5KCk7CiAgaWYoIWZiQXV0aC5jdXJyZW50VXNlcilhd2FpdCBmYkF1dGguc2lnbkluQW5vbnltb3VzbHkoKTsKICBjb25zdCB1PWZiQXV0aC5jdXJyZW50VXNlcjsKICBpZighdXx8IXUudWlkKXRocm93IG5ldyBFcnJvcignRmlyZWJhc2UgbmllIHBvdHdpZXJkemnFgiBhbm9uaW1vd2VnbyBsb2dvd2FuaWEuIE9kxZt3aWXFvCBzdHJvbsSZIGkgc3Byw7NidWogcG9ub3duaWUuJyk7CiAgb25saW5lUGxheWVySWQ9dS51aWQ7cmV0dXJuIG9ubGluZVBsYXllcklkOwp9CmZ1bmN0aW9uIG1rQnJpZGdlKGV4dHJhKXsKICByZXR1cm4gT2JqZWN0LmFzc2lnbih7ZGI6ZmJEQixhdXRoOm9ubGluZUVuc3VyZUF1dGgsdHM6ZmlyZWJhc2UuZGF0YWJhc2UuU2VydmVyVmFsdWUuVElNRVNUQU1QLG5ldDooKT0+ISEoZmJEQiYmZmJBdXRoKSwKICAgIG5pY2s6KCk9PicnLGNvbDooKT0+Jycsc3RhdHM6KCk9Pnt9fSxleHRyYXx8e30pOwp9Cgp3aW5kb3cuc2JCcmlkZ2U9KCk9Pm1rQnJpZGdlKCk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWNrJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe2UucHJldmVudERlZmF1bHQoKTt0cnl7cGFyZW50LnBvc3RNZXNzYWdlKCdzYi1jbG9zZScsJyonKX1jYXRjaChfKXt9CiAgdHJ5e2NvbnN0IHc9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2cnKS5jb250ZW50V2luZG93O2lmKHcmJncuX19zYkxlYXZlKXcuX19zYkxlYXZlKCl9Y2F0Y2goXyl7fQp9KTsKY29uc3QgQjY0PSdQQ0ZFVDBOVVdWQkZJR2gwYld3K0NqeG9kRzFzSUd4aGJtYzlJbkJzSWo0OGFHVmhaRDQ4YldWMFlTQmphR0Z5YzJWMFBTSjFkR1l0T0NJK0NqeHRaWFJoSUc1aGJXVTlJblpwWlhkd2IzSjBJaUJqYjI1MFpXNTBQU0ozYVdSMGFEMWtaWFpwWTJVdGQybGtkR2dzSUdsdWFYUnBZV3d0YzJOaGJHVTlNU3dnZG1sbGQzQnZjblF0Wm1sMFBXTnZkbVZ5SWo0S1BIUnBkR3hsUGpZZ1ltbGxjbnBsSVR3dmRHbDBiR1UrQ2p4c2FXNXJJR2h5WldZOUltaDBkSEJ6T2k4dlptOXVkSE11WjI5dloyeGxZWEJwY3k1amIyMHZZM056TWo5bVlXMXBiSGs5Um5KbFpHOXJZVHAzWjJoMFFEUXdNRHMxTURBN05qQXdPemN3TUNabVlXMXBiSGs5UW05M2JHSjVLMDl1WlNaa2FYTndiR0Y1UFhOM1lYQWlJSEpsYkQwaWMzUjViR1Z6YUdWbGRDSStDanh6ZEhsc1pUNEtPbkp2YjNSN0xTMWlaem9qTVdFeE1ETXpPeTB0WW1jeU9pTXlZVEV5TmpBN0xTMWpZWEprT2lObVptWm1abVl4TkRzdExYUjRPaU5tTldZeVptWTdMUzF0ZFhRNkkyRTNPV1prTURzdExXeHVPaU5tWm1abVptWXlZVHN0TFdGall6b2pabVprTWpObU95MHRjR2x1YXpvalptWTFabUV5T3kwdGJXbHVkRG9qTldWbE5tTTRPeTB0YzJ0NU9pTTNZV0V5Wm1ZN0xTMWpjbVZoYlRvalptWm1ObVJrT3kwdGFXNXJPaU14WVRFd016TTdMUzFqZHpwamJHRnRjQ2cwTUhCNExERXhMalYyZHl3Mk5IQjRLVHRpYjNndGMybDZhVzVuT21KdmNtUmxjaTFpYjNnN2NHRmtaR2x1WnkxMGIzQTZaVzUyS0hOaFptVXRZWEpsWVMxcGJuTmxkQzEwYjNBc01IQjRLVHR3WVdSa2FXNW5MV0p2ZEhSdmJUcGxibllvYzJGbVpTMWhjbVZoTFdsdWMyVjBMV0p2ZEhSdmJTd3djSGdwTzJOdmJHOXlMWE5qYUdWdFpUcGtZWEpyZlFvcWUySnZlQzF6YVhwcGJtYzZZbTl5WkdWeUxXSnZlSDFvZEcxc2UzTmpjbTlzYkMxd1lXUmthVzVuTFhSdmNEcGxibllvYzJGbVpTMWhjbVZoTFdsdWMyVjBMWFJ2Y0N3d2NIZ3BmUXBpYjJSNWUyMWhjbWRwYmpvd08yMXBiaTFvWldsbmFIUTZNVEF3ZG1nN1ptOXVkQzFtWVcxcGJIazZSbkpsWkc5cllTeDFhUzF5YjNWdVpHVmtMQ0pVY21WaWRXTm9aWFFnVFZNaUxITjVjM1JsYlMxMWFTeHpZVzV6TFhObGNtbG1PMk52Ykc5eU9uWmhjaWd0TFhSNEtUdGlZV05yWjNKdmRXNWtPbkpoWkdsaGJDMW5jbUZrYVdWdWRDaGphWEpqYkdVZ1lYUWdNVElsSURnbExDTm1aalZtWVRJMU5TeDBjbUZ1YzNCaGNtVnVkQ0EwTWlVcExISmhaR2xoYkMxbmNtRmthV1Z1ZENoamFYSmpiR1VnWVhRZ09EZ2xJRGt5SlN3ak5XVmxObU00TlRVc2RISmhibk53WVhKbGJuUWdORElsS1N4c2FXNWxZWEl0WjNKaFpHbGxiblFvTVRZd1pHVm5MSFpoY2lndExXSm5NaWtzZG1GeUtDMHRZbWNwSURjd0pTa2dabWw0WldRN2IzWmxjbVpzYjNjdGVEcG9hV1JrWlc1OUNtSnZaSGs2T21KbFptOXlaWHRqYjI1MFpXNTBPaUlpTzNCdmMybDBhVzl1T21acGVHVmtPMmx1YzJWME9qQTdjRzlwYm5SbGNpMWxkbVZ1ZEhNNmJtOXVaVHRpWVdOclozSnZkVzVrTFdsdFlXZGxPbkpoWkdsaGJDMW5jbUZrYVdWdWRDZ2pabVptWm1abU1UY2dNbkI0TEhSeVlXNXpjR0Z5Wlc1MElESXVOWEI0S1R0aVlXTnJaM0p2ZFc1a0xYTnBlbVU2TWpod2VDQXlPSEI0ZlFvallYQndlM0J2YzJsMGFXOXVPbkpsYkdGMGFYWmxPMjFoZUMxM2FXUjBhRG8zT0RCd2VEdHRZWEpuYVc0Nk1DQmhkWFJ2TzNCaFpHUnBibWM2TVRKd2VDQXhOSEI0SURJNGNIZzdiV2x1TFdobGFXZG9kRG94TURCMmFEdGthWE53YkdGNU9tWnNaWGc3Wm14bGVDMWthWEpsWTNScGIyNDZZMjlzZFcxdWZRcG9aV0ZrWlhKN1pHbHpjR3hoZVRwbWJHVjRPMkZzYVdkdUxXbDBaVzF6T21ObGJuUmxjanRxZFhOMGFXWjVMV052Ym5SbGJuUTZjM0JoWTJVdFltVjBkMlZsYmp0bllYQTZPSEI0ZlFvdWJHOW5iM3RtYjI1MExXWmhiV2xzZVRvaVFtOTNiR0o1SUU5dVpTSXNSbkpsWkc5cllTeHpZVzV6TFhObGNtbG1PMlp2Ym5RdGQyVnBaMmgwT2pRd01EdG1iMjUwTFhOcGVtVTZZMnhoYlhBb01qWndlQ3cyZG5jc016aHdlQ2s3YkdWMGRHVnlMWE53WVdOcGJtYzZMakF5WlcwN1ltRmphMmR5YjNWdVpEcHNhVzVsWVhJdFozSmhaR2xsYm5Rb09UQmtaV2NzZG1GeUtDMHRjR2x1YXlrc2RtRnlLQzB0WVdOaktTeDJZWElvTFMxdGFXNTBLU3gyWVhJb0xTMXphM2twS1RzdGQyVmlhMmwwTFdKaFkydG5jbTkxYm1RdFkyeHBjRHAwWlhoME8ySmhZMnRuY205MWJtUXRZMnhwY0RwMFpYaDBPMk52Ykc5eU9uUnlZVzV6Y0dGeVpXNTBmUW91YUdKN1pHbHpjR3hoZVRwbWJHVjRPMmRoY0RvMmNIaDlDbUoxZEhSdmJudG1iMjUwT21sdWFHVnlhWFE3WTI5c2IzSTZhVzVvWlhKcGREdGpkWEp6YjNJNmNHOXBiblJsY2p0aWIzSmtaWEk2TTNCNElITnZiR2xrSUNObVptWm1abVkxTlR0aWIzSmtaWEl0Y21Ga2FYVnpPakUwY0hnN2NHRmtaR2x1WnpvdU5uSmxiU0F4TGpGeVpXMDdZbUZqYTJkeWIzVnVaRG9qWm1abVptWm1NV1k3WW05NExYTm9ZV1J2ZHpvd0lEUndlQ0F3SUNNd01EQTJMR2x1YzJWMElEQWdMVE53ZUNBd0lDTXdNREF5TzNSeVlXNXphWFJwYjI0NmRISmhibk5tYjNKdElDNHhNbk1zWW05NExYTm9ZV1J2ZHlBdU1USnpPMlp2Ym5RdGQyVnBaMmgwT2pZd01IMEtZblYwZEc5dU9taHZkbVZ5T201dmRDZzZaR2x6WVdKc1pXUXBlM1J5WVc1elptOXliVHAwY21GdWMyeGhkR1ZaS0MweWNIZ3BJSEp2ZEdGMFpTZ3RNV1JsWnlsOUNtSjFkSFJ2YmpwaFkzUnBkbVU2Ym05MEtEcGthWE5oWW14bFpDbDdkSEpoYm5ObWIzSnRPblJ5WVc1emJHRjBaVmtvTTNCNEtUdGliM2d0YzJoaFpHOTNPakFnTVhCNElEQWdJekF3TURaOUNtSjFkSFJ2Ympwa2FYTmhZbXhsWkh0dmNHRmphWFI1T2k0ME8yTjFjbk52Y2pwa1pXWmhkV3gwZlFwaWRYUjBiMjQ2Wm05amRYTXRkbWx6YVdKc1pTeHBibkIxZERwbWIyTjFjeTEyYVhOcFlteGxlMjkxZEd4cGJtVTZNM0I0SUhOdmJHbGtJSFpoY2lndExYQnBibXNwTzI5MWRHeHBibVV0YjJabWMyVjBPakZ3ZUgwS0xuTnhlM0JoWkdScGJtYzZMalJ5WlcwZ0xqYzFjbVZ0TzIxcGJpMTNhV1IwYURvME5IQjRmUW91WW1sbmUySmhZMnRuY205MWJtUTZiR2x1WldGeUxXZHlZV1JwWlc1MEtERXpOV1JsWnl4MllYSW9MUzF3YVc1cktTd2pZVGMzWW1abUtUdGliM0prWlhJdFkyOXNiM0k2STJabVpqZzdZMjlzYjNJNkkyWm1aanRtYjI1MExYTnBlbVU2TVM0eE5YSmxiVHRtYjI1MExYZGxhV2RvZERvM01EQjlDaTVuYjN0aVlXTnJaM0p2ZFc1a09teHBibVZoY2kxbmNtRmthV1Z1ZENneE16VmtaV2NzZG1GeUtDMHRZV05qS1N3alptWmhZVE5tS1R0aWIzSmtaWEl0WTI5c2IzSTZJMlptWmpnN1kyOXNiM0k2ZG1GeUtDMHRhVzVyS1R0bWIyNTBMWE5wZW1VNk1TNHhOWEpsYlR0bWIyNTBMWGRsYVdkb2REbzNNREI5Q2k1dGJudGlZV05yWjNKdmRXNWtPbXhwYm1WaGNpMW5jbUZrYVdWdWRDZ3hNelZrWldjc2RtRnlLQzB0YldsdWRDa3NkbUZ5S0MwdGMydDVLU2s3WW05eVpHVnlMV052Ykc5eU9pTm1abVk0TzJOdmJHOXlPblpoY2lndExXbHVheWs3Wm05dWRDMXphWHBsT2pFdU1YSmxiVHRtYjI1MExYZGxhV2RvZERvM01EQjlDaTVuYUc5emRIdGlZV05yWjNKdmRXNWtPblJ5WVc1emNHRnlaVzUwZlFvdWMyTnllMlJwYzNCc1lYazZibTl1WlR0bWJHVjRPakU3Wm14bGVDMWthWEpsWTNScGIyNDZZMjlzZFcxdU8yRnNhV2R1TFdsMFpXMXpPbU5sYm5SbGNqdG5ZWEE2TVRSd2VEdHdZV1JrYVc1bkxYUnZjRG94TkhCNGZRb3VjMk55TG05dWUyUnBjM0JzWVhrNlpteGxlRHRoYm1sdFlYUnBiMjQ2YVc0Z0xqUnpJR1ZoYzJVZ1ltOTBhSDFBYTJWNVpuSmhiV1Z6SUdsdWUyWnliMjE3YjNCaFkybDBlVG93TzNSeVlXNXpabTl5YlRwMGNtRnVjMnhoZEdWWktERTBjSGdwZlgwS0xuQmhibVZzZTJKaFkydG5jbTkxYm1RNmRtRnlLQzB0WTJGeVpDazdZbUZqYTJSeWIzQXRabWxzZEdWeU9tSnNkWElvTVRCd2VDazdZbTl5WkdWeU9qTndlQ0J6YjJ4cFpDQjJZWElvTFMxaFkyTXBPMkp2Y21SbGNpMXlZV1JwZFhNNk1qSndlRHR3WVdSa2FXNW5PakU0Y0hnN1pHbHpjR3hoZVRwbWJHVjRPMlpzWlhndFpHbHlaV04wYVc5dU9tTnZiSFZ0Ymp0bllYQTZNVEp3ZUR0M2FXUjBhRHB0YVc0b05EUXdjSGdzTVRBd0pTazdZbTk0TFhOb1lXUnZkem80Y0hnZ09IQjRJREFnSXpBd01HRjlDaTV5YjNjeWUyUnBjM0JzWVhrNlpteGxlRHRuWVhBNk9IQjRPMlpzWlhndGQzSmhjRHAzY21Gd08ycDFjM1JwWm5rdFkyOXVkR1Z1ZERwalpXNTBaWEk3WVd4cFoyNHRhWFJsYlhNNlkyVnVkR1Z5ZlFwcGJuQjFkSHRtYjI1ME9tbHVhR1Z5YVhRN1kyOXNiM0k2YVc1b1pYSnBkRHRpWVdOclozSnZkVzVrT2lNeE5UQmhNekE3WW05eVpHVnlPakp3ZUNCemIyeHBaQ0FqT0dJMlltWm1PMkp2Y21SbGNpMXlZV1JwZFhNNk1USndlRHR3WVdSa2FXNW5PaTQyY21WdE8yWnNaWGc2TVR0dGFXNHRkMmxrZEdnNk1EdDBaWGgwTFdGc2FXZHVPbU5sYm5SbGNqdDBaWGgwTFhSeVlXNXpabTl5YlRwMWNIQmxjbU5oYzJVN2JHVjBkR1Z5TFhOd1lXTnBibWM2TGpKbGJUdG1iMjUwTFhkbGFXZG9kRG8zTURCOUNpNXRaWHRrYVhOd2JHRjVPbVpzWlhnN1lXeHBaMjR0YVhSbGJYTTZZMlZ1ZEdWeU8yZGhjRG94TUhCNE8yWnZiblF0YzJsNlpUb3hMakZ5WlcwN2JXRnlaMmx1TFhSdmNEbzRjSGg5TG0xbElHbDdkMmxrZEdnNk1qSndlRHRvWldsbmFIUTZNakp3ZUR0aWIzSmtaWEl0Y21Ga2FYVnpPalV3SlR0aVlXTnJaM0p2ZFc1a09uWmhjaWd0TFdNcE8ySnZlQzF6YUdGa2IzYzZNQ0F3SURFMGNIZ2dkbUZ5S0MwdFl5azdZbTl5WkdWeU9qSndlQ0J6YjJ4cFpDQWpabVptZlFvamJtbGphM3QwWlhoMExYUnlZVzV6Wm05eWJUcHViMjVsTzJ4bGRIUmxjaTF6Y0dGamFXNW5PakE3Wm05dWRDMTNaV2xuYUhRNk5UQXdPMlpzWlhnNmJtOXVaVHQzYVdSMGFEb3hNV1Z0TzNSbGVIUXRZV3hwWjI0NmJHVm1kRHRtYjI1MExYTnBlbVU2TVM0d05YSmxiWDBqYm1samExdHlaV0ZrYjI1c2VWMTdZbTl5WkdWeUxXTnZiRzl5T25SeVlXNXpjR0Z5Wlc1ME8ySmhZMnRuY205MWJtUTZkSEpoYm5Od1lYSmxiblI5Q2k1b2FXNTBMQzV1YjNSbGUyTnZiRzl5T25aaGNpZ3RMVzExZENrN1ptOXVkQzF6YVhwbE9pNDVNbkpsYlR0dFlYSm5hVzQ2TUR0MFpYaDBMV0ZzYVdkdU9tTmxiblJsY24wS0xtaGxjbTk3WkdsemNHeGhlVHBtYkdWNE8yZGhjRG8yY0hnN2FuVnpkR2xtZVMxamIyNTBaVzUwT21ObGJuUmxjanR0WVhKbmFXNDZOSEI0SURBZ01uQjRPeTB0WTNjNk5UUndlSDBLTG1obGNtOGdMbU5rZTNSeVlXNXpabTl5YlRweWIzUmhkR1VvZG1GeUtDMHRjaWtwTzJGdWFXMWhkR2x2YmpwbWJDQXpjeUJsWVhObExXbHVMVzkxZENCcGJtWnBibWwwWlNCaGJIUmxjbTVoZEdVN1lXNXBiV0YwYVc5dUxXUmxiR0Y1T25aaGNpZ3RMV1FwZlVCclpYbG1jbUZ0WlhNZ1pteDdkRzk3ZEhKaGJuTm1iM0p0T25KdmRHRjBaU2gyWVhJb0xTMXlLU2tnZEhKaGJuTnNZWFJsV1NndE4zQjRLWDE5Q2k1MGIzQjdaR2x6Y0d4aGVUcG1iR1Y0TzJwMWMzUnBabmt0WTI5dWRHVnVkRHB6Y0dGalpTMWlaWFIzWldWdU8yRnNhV2R1TFdsMFpXMXpPbU5sYm5SbGNqdDNhV1IwYURveE1EQWxPMmRoY0RvNGNIaDlDaTVqYjJSbGUyWnZiblF0YzJsNlpUb3hMamx5WlcwN2JHVjBkR1Z5TFhOd1lXTnBibWM2TGpObGJUdG1iMjUwTFhkbGFXZG9kRG8zTURBN2NHRmtaR2x1WnpvdU1YSmxiU0F4Y21WdElDNHhjbVZ0SURFdU0zSmxiVHRpYjNKa1pYSXRjbUZrYVhWek9qRTJjSGc3WW1GamEyZHliM1Z1WkRwMllYSW9MUzFqWVhKa0tUdGliM0prWlhJNk1uQjRJR1JoYzJobFpDQjJZWElvTFMxdGFXNTBLVHRqZFhKemIzSTZjRzlwYm5SbGNuMEtMbkJzZTJScGMzQnNZWGs2Wm14bGVEdG1iR1Y0TFhkeVlYQTZkM0poY0R0bllYQTZPSEI0TzJwMWMzUnBabmt0WTI5dWRHVnVkRHBqWlc1MFpYSTdkMmxrZEdnNk1UQXdKWDBLTG5CamV5MHRZem9qWm1abU8yUnBjM0JzWVhrNlpteGxlRHRoYkdsbmJpMXBkR1Z0Y3pwalpXNTBaWEk3WjJGd09pNDFjbVZ0TzNCaFpHUnBibWM2TGpSeVpXMGdMamh5WlcwN1ltOXlaR1Z5TFhKaFpHbDFjem94Tm5CNE8ySmhZMnRuY205MWJtUTZkbUZ5S0MwdFkyRnlaQ2s3WW05eVpHVnlPakp3ZUNCemIyeHBaQ0IwY21GdWMzQmhjbVZ1ZER0MGNtRnVjMmwwYVc5dU9tRnNiQ0F1TTNNN2JXbHVMWGRwWkhSb09qQjlDaTV3WXlCcGUzZHBaSFJvT2pFMGNIZzdhR1ZwWjJoME9qRTBjSGc3WW05eVpHVnlMWEpoWkdsMWN6bzFNQ1U3WW1GamEyZHliM1Z1WkRwMllYSW9MUzFqS1R0aWIzZ3RjMmhoWkc5M09qQWdNQ0F4TUhCNElIWmhjaWd0TFdNcE8yWnNaWGc2Ym05dVpUdGliM0prWlhJNk1uQjRJSE52Ykdsa0lDTm1abVo5Q2k1d1l5QmxiWHRtYjI1MExYTjBlV3hsT201dmNtMWhiRHR2ZG1WeVpteHZkenBvYVdSa1pXNDdkR1Y0ZEMxdmRtVnlabXh2ZHpwbGJHeHBjSE5wY3p0M2FHbDBaUzF6Y0dGalpUcHViM2R5WVhBN2JXRjRMWGRwWkhSb09qazJjSGg5Q2k1d1l5QmllMjFoY21kcGJpMXNaV1owT21GMWRHODdabTl1ZEMxemFYcGxPakV1TWpWeVpXMDdjR0ZrWkdsdVp5MXNaV1owT2pad2VIMHVjR01nYzIxaGJHeDdiM0JoWTJsMGVUb3VOelU3Wm05dWRDMXphWHBsT2k0NGNtVnRmUW91Y0dNdWIyNTdZbTl5WkdWeUxXTnZiRzl5T25aaGNpZ3RMV01wTzJKdmVDMXphR0ZrYjNjNk1DQXdJREl5Y0hnZ1kyOXNiM0l0YldsNEtHbHVJSE55WjJJc2RtRnlLQzB0WXlrZ05qQWxMSFJ5WVc1emNHRnlaVzUwS1R0MGNtRnVjMlp2Y20wNmRISmhibk5zWVhSbFdTZ3RNM0I0S1gwS0xuQmpMbmQwZTJKdmNtUmxjaTF6ZEhsc1pUcGtZWE5vWldRN1ltOXlaR1Z5TFdOdmJHOXlPblpoY2lndExXTXBPMkZ1YVcxaGRHbHZianAzZENBeExqRnpJR2x1Wm1sdWFYUmxmVUJyWlhsbWNtRnRaWE1nZDNSN05UQWxlMkpoWTJ0bmNtOTFibVE2STJabVptWm1aakpqZlgwS0xuQmpMbWR2Ym1WN2IzQmhZMmwwZVRvdU5IMHVjR011WW5WdGNDQmllMkZ1YVcxaGRHbHZianBpYlNBdU5uTjlRR3RsZVdaeVlXMWxjeUJpYlhzMU1DVjdkSEpoYm5ObWIzSnRPbk5qWVd4bEtERXVOaWw5ZlFvdWNHTXViRzlpZTNkcFpIUm9PbTFwYmlneU1EQndlQ3cwTmlVcGZRb3ViM0IwZTJScGMzQnNZWGs2Wm14bGVEdG5ZWEE2T0hCNE8yWnNaWGd0ZDNKaGNEcDNjbUZ3TzJwMWMzUnBabmt0WTI5dWRHVnVkRHBqWlc1MFpYSjlDaTV2Y0hRZ1luVjBkRzl1TG5ObGJIdGlZV05yWjNKdmRXNWtPblpoY2lndExXRmpZeWs3WTI5c2IzSTZkbUZ5S0MwdGFXNXJLVHRpYjNKa1pYSXRZMjlzYjNJNkkyWm1abjBLTHlvZ2EyRnlkSGtnS2k4S0xtTmtleTB0WVRvak4yRmhNbVptTzNkcFpIUm9PblpoY2lndExXTjNLVHRvWldsbmFIUTZZMkZzWXloMllYSW9MUzFqZHlrcU1TNDBNaWs3WW05eVpHVnlMWEpoWkdsMWN6cGpZV3hqS0haaGNpZ3RMV04zS1NvdU1UWXBPMkpoWTJ0bmNtOTFibVE2ZG1GeUtDMHRZM0psWVcwcE8ySnZjbVJsY2pwallXeGpLSFpoY2lndExXTjNLU291TURZcElITnZiR2xrSUhaaGNpZ3RMV0VwTzNCdmMybDBhVzl1T25KbGJHRjBhWFpsTzJOdmJHOXlPblpoY2lndExXbHVheWs3Wm14bGVEcHViMjVsTzNWelpYSXRjMlZzWldOME9tNXZibVU3WW05NExYTm9ZV1J2ZHpvd0lEUndlQ0F3SUNNd01EQTJPMlp2Ym5RdGQyVnBaMmgwT2pjd01EdHZkbVZ5Wm14dmR6cG9hV1JrWlc1OUNpNWpaQ0J6ZTNCdmMybDBhVzl1T21GaWMyOXNkWFJsTzJ4bFpuUTZZMkZzWXloMllYSW9MUzFqZHlrcUxqQTNLVHQwYjNBNlkyRnNZeWgyWVhJb0xTMWpkeWtxTGpBeUtUdG1iMjUwTFhOcGVtVTZZMkZzWXloMllYSW9MUzFqZHlrcUxqSXBPM1JsZUhRdFpHVmpiM0poZEdsdmJqcHViMjVsTzJOdmJHOXlPblpoY2lndExXRXBPMlpwYkhSbGNqcGljbWxuYUhSdVpYTnpLQzQyTlNsOUNpNWpaQ0JpZTNCdmMybDBhVzl1T21GaWMyOXNkWFJsTzJ4bFpuUTZNRHR5YVdkb2REb3dPM1J2Y0RwallXeGpLSFpoY2lndExXTjNLU291TVRJcE8ySnZkSFJ2YlRwallXeGpLSFpoY2lndExXTjNLU291TXpZcE8yUnBjM0JzWVhrNlpteGxlRHRoYkdsbmJpMXBkR1Z0Y3pwalpXNTBaWEk3YW5WemRHbG1lUzFqYjI1MFpXNTBPbU5sYm5SbGNqdG1iMjUwTFhOcGVtVTZZMkZzWXloMllYSW9MUzFqZHlrcUxqVXBPMnhwYm1VdGFHVnBaMmgwT2pFN1ptOXVkQzEzWldsbmFIUTZOekF3ZlFvdVkyUWdMbUpzZTNCdmMybDBhVzl1T21GaWMyOXNkWFJsTzJ4bFpuUTZOaVU3Y21sbmFIUTZOaVU3WW05MGRHOXRPbU5oYkdNb2RtRnlLQzB0WTNjcEtpNHdOU2s3WkdsemNHeGhlVHBtYkdWNE8yWnNaWGd0ZDNKaGNEcDNjbUZ3TzJwMWMzUnBabmt0WTI5dWRHVnVkRHBqWlc1MFpYSTdaMkZ3T2pGd2VIMEtMbU5rSUM1aWJDQnpkbWQ3ZDJsa2RHZzZZMkZzWXloMllYSW9MUzFqZHlrcUxqRTJLVHRvWldsbmFIUTZZMkZzWXloMllYSW9MUzFqZHlrcUxqRTBLVHRtYVd4c09uWmhjaWd0TFdFcE8yWnBiSFJsY2pwaWNtbG5hSFJ1WlhOektDNDNPQ2w5Q2k1alpDNXhNWHN0TFdFNkl6ZGhZVEptWm4wdVkyUXVjVEo3TFMxaE9pTXlabVEyWWpSOUxtTmtMbkV6ZXkwdFlUb2paalZpT0RBd2ZTNWpaQzV4TlhzdExXRTZJMlptTjJFeVpYMHVZMlF1Y1RkN0xTMWhPaU5tWmpOa05tVjlDaTVqWkNBdWIzZDdjRzl6YVhScGIyNDZZV0p6YjJ4MWRHVTdjbWxuYUhRNlkyRnNZeWgyWVhJb0xTMWpkeWtxTGpBMUtUdDBiM0E2WTJGc1l5aDJZWElvTFMxamR5a3FMakExS1R0M2FXUjBhRHBqWVd4aktIWmhjaWd0TFdOM0tTb3VNaWs3YUdWcFoyaDBPbU5oYkdNb2RtRnlLQzB0WTNjcEtpNHlLVHRpYjNKa1pYSXRjbUZrYVhWek9qVXdKVHRpWVdOclozSnZkVzVrT25aaGNpZ3RMVzlqS1R0aWIzSmtaWEk2TW5CNElITnZiR2xrSUNObVptWTdZbTk0TFhOb1lXUnZkem93SURBZ05uQjRJSFpoY2lndExXOWpLWDBLTG1Oa0xtSnJlMkpoWTJ0bmNtOTFibVE2Y21Wd1pXRjBhVzVuTFd4cGJtVmhjaTFuY21Ga2FXVnVkQ2cwTldSbFp5eDJZWElvTFMxdll5a2dNQ0EzY0hnc1kyOXNiM0l0YldsNEtHbHVJSE55WjJJc2RtRnlLQzB0YjJNcElEY3lKU3dqTURBd0tTQTNjSGdnTVRSd2VDazdZbTl5WkdWeUxXTnZiRzl5T2lObVptWjlDaTVqWkM1aWF5QnpkbWQ3Y0c5emFYUnBiMjQ2WVdKemIyeDFkR1U3YkdWbWREb3lOU1U3ZEc5d09qTXdKVHQzYVdSMGFEbzFNQ1U3YUdWcFoyaDBPalF3SlR0bWFXeHNPaU5tWm1ZN2IzQmhZMmwwZVRvdU9EVjlDaTVqWkM1d2IzQjdZVzVwYldGMGFXOXVPbkJ3SUM0MWN5QmpkV0pwWXkxaVpYcHBaWElvTGpNc01TNDJMQzQxTERFcGZVQnJaWGxtY21GdFpYTWdjSEI3Wm5KdmJYdDBjbUZ1YzJadmNtMDZjMk5oYkdVb0xqUXBJSFJ5WVc1emJHRjBaVmtvTFRNd2NIZ3BPMjl3WVdOcGRIazZNSDE5Q2k4cUlISjZ4SmxrZVNBcUx3b2pjbTkzYzN0a2FYTndiR0Y1T21keWFXUTdaMkZ3T2pod2VEdDNhV1IwYURveE1EQWxmUW91Y25kN1pHbHpjR3hoZVRwbWJHVjRPMmRoY0RvMWNIZzdZV3hwWjI0dGFYUmxiWE02WTJWdWRHVnlPM0JoWkdScGJtYzZPSEI0TzJKdmNtUmxjaTF5WVdScGRYTTZNVGh3ZUR0aVlXTnJaM0p2ZFc1a09uWmhjaWd0TFdOaGNtUXBPMkp2Y21SbGNqb3ljSGdnYzI5c2FXUWdkbUZ5S0MwdGJHNHBPM0J2YzJsMGFXOXVPbkpsYkdGMGFYWmxmUW91Y25jZ0xuTnNlM2RwWkhSb09uWmhjaWd0TFdOM0tUdG9aV2xuYUhRNlkyRnNZeWgyWVhJb0xTMWpkeWtxTVM0ME1pazdZbTl5WkdWeU9qSndlQ0JrWVhOb1pXUWdkbUZ5S0MwdGJHNHBPMkp2Y21SbGNpMXlZV1JwZFhNNlkyRnNZeWgyWVhJb0xTMWpkeWtxTGpFMktUdG1iR1Y0T201dmJtVTdaR2x6Y0d4aGVUcG1iR1Y0TzJGc2FXZHVMV2wwWlcxek9tTmxiblJsY2p0cWRYTjBhV1o1TFdOdmJuUmxiblE2WTJWdWRHVnlmUW91Y25jZ0xuTnNMbXcxT2pwaFpuUmxjbnRqYjI1MFpXNTBPaUkySVNJN1ptOXVkQzEzWldsbmFIUTZOekF3TzJOdmJHOXlPaU5tWmpOa05tVTdiM0JoWTJsMGVUb3VOenRtYjI1MExYTnBlbVU2WTJGc1l5aDJZWElvTFMxamR5a3FMak0yS1gwS0xuSjNJQzV6YkRwb1lYTW9MbU5rS1h0aWIzSmtaWEk2TUgwdWNuY2dMbk5zT21oaGN5Z3VZMlFwT2pwaFpuUmxjbnRrYVhOd2JHRjVPbTV2Ym1WOUNpNXlkeUF1Y25ON2JXRnlaMmx1TFd4bFpuUTZZWFYwYnp0bWIyNTBMWGRsYVdkb2REbzNNREE3Y0dGa1pHbHVaem96Y0hnZ01UQndlRHRpYjNKa1pYSXRjbUZrYVhWek9qRXljSGc3WW1GamEyZHliM1Z1WkRvak1EQXdORHQzYUdsMFpTMXpjR0ZqWlRwdWIzZHlZWEI5Q2k1eWR5NXdhM3RpYjNKa1pYSXRZMjlzYjNJNmRtRnlLQzB0Y0dsdWF5azdZM1Z5YzI5eU9uQnZhVzUwWlhJN1lXNXBiV0YwYVc5dU9uQnJjQ0F4Y3lCcGJtWnBibWwwWlgxQWEyVjVabkpoYldWeklIQnJjSHMxTUNWN1ltRmphMmR5YjNWdVpEb2pabVkxWm1FeU16TTdZbTl5WkdWeUxXTnZiRzl5T25aaGNpZ3RMV0ZqWXlsOWZRb3VjbmN1ZEd0N1lXNXBiV0YwYVc5dU9uUnJJQzQ1YzMxQWEyVjVabkpoYldWeklIUnJlekFsTERFd01DVjdkSEpoYm5ObWIzSnRPbTV2Ym1WOU1UVWxlM1J5WVc1elptOXliVHAwY21GdWMyeGhkR1ZZS0MwNGNIZ3BPMkpoWTJ0bmNtOTFibVE2STJabU0yUTJaVFUxZlRNd0pYdDBjbUZ1YzJadmNtMDZkSEpoYm5Oc1lYUmxXQ2c0Y0hncGZUUTFKWHQwY21GdWMyWnZjbTA2ZEhKaGJuTnNZWFJsV0NndE5uQjRLWDAyTUNWN2RISmhibk5tYjNKdE9uUnlZVzV6YkdGMFpWZ29OWEI0S1R0aVlXTnJaM0p2ZFc1a09pTm1aak5rTm1VMU5YMTlDaTV5ZHk1MGF5QXVZMlI3Wm1sc2RHVnlPbk5oZEhWeVlYUmxLQzR6S1NCaWNtbG5hSFJ1WlhOektDNDNLVHQwY21GdWMybDBhVzl1T2k0MGMzMEtMeW9nYjJScmNubDBaU0JyWVhKMGVTQXFMd29qY0d4aGVYdGthWE53YkdGNU9tWnNaWGc3Wm14bGVDMTNjbUZ3T25keVlYQTdaMkZ3T2pod2VDQXhNSEI0TzJwMWMzUnBabmt0WTI5dWRHVnVkRHBqWlc1MFpYSTdiV2x1TFdobGFXZG9kRHBqWVd4aktIWmhjaWd0TFdOM0tTb3hMalF5SUNzZ01qaHdlQ2s3ZDJsa2RHZzZNVEF3SlgwS0xuQmpaSHRrYVhOd2JHRjVPbVpzWlhnN1pteGxlQzFrYVhKbFkzUnBiMjQ2WTI5c2RXMXVPMkZzYVdkdUxXbDBaVzF6T21ObGJuUmxjanRuWVhBNk0zQjRPMlp2Ym5RdGMybDZaVG91TnpoeVpXMDdiV0Y0TFhkcFpIUm9PbU5oYkdNb2RtRnlLQzB0WTNjcEtqRXVOQ2w5Q2k1d1kyUWdjM0JoYm50d1lXUmthVzVuT2pBZ09IQjRPMkp2Y21SbGNpMXlZV1JwZFhNNk9UbHdlRHRpWVdOclozSnZkVzVrT25aaGNpZ3RMV01wTzJOdmJHOXlPaU5tWm1ZN1ptOXVkQzEzWldsbmFIUTZOakF3TzNSbGVIUXRjMmhoWkc5M09qQWdNWEI0SUROd2VDQWpNREF3T0R0M2FHbDBaUzF6Y0dGalpUcHViM2R5WVhBN2IzWmxjbVpzYjNjNmFHbGtaR1Z1TzNSbGVIUXRiM1psY21ac2IzYzZaV3hzYVhCemFYTTdiV0Y0TFhkcFpIUm9PakV3TUNWOUNpNXdZMlF1WTNWeUlDNWpaSHR2ZFhSc2FXNWxPalJ3ZUNCemIyeHBaQ0IyWVhJb0xTMWhZMk1wTzI5MWRHeHBibVV0YjJabWMyVjBPakp3ZUR0MGNtRnVjMlp2Y20wNmRISmhibk5zWVhSbFdTZ3RObkI0S1NCelkyRnNaU2d4TGpBMktYMEtMbkJqWkM1a2JudHZjR0ZqYVhSNU9pNDBmUW9qY0d4N2NHOXphWFJwYjI0NmMzUnBZMnQ1TzJKdmRIUnZiVHBqWVd4aktERXljSGdnS3lCbGJuWW9jMkZtWlMxaGNtVmhMV2x1YzJWMExXSnZkSFJ2YlN3d2NIZ3BLVHQ2TFdsdVpHVjRPalU3YldGeVoybHVMWFJ2Y0RveE1IQjRPMkp2ZUMxemFHRmtiM2M2TUNBMGNIZ2dNQ0FqTURBd05pd3dJREV3Y0hnZ016QndlQ0FqTURBd1lYMEtJMmhwYm5SN2JXbHVMV2hsYVdkb2REb3hMalZsYlR0bWIyNTBMWE5wZW1VNk1TNHdOWEpsYlR0bWIyNTBMWGRsYVdkb2REbzJNREE3ZEdWNGRDMWhiR2xuYmpwalpXNTBaWEo5Q2lOb2FXNTBJR0o3WTI5c2IzSTZkbUZ5S0MwdFlXTmpLWDBLSTNSdGUyTnZiRzl5T25aaGNpZ3RMVzFwYm5RcE8yWnZiblF0ZG1GeWFXRnVkQzF1ZFcxbGNtbGpPblJoWW5Wc1lYSXRiblZ0YzMwS0kyaGhibVI3TFMxamR6cGpiR0Z0Y0NnME5uQjRMREV6ZG5jc056SndlQ2s3WkdsemNHeGhlVHBtYkdWNE8yWnNaWGd0ZDNKaGNEcDNjbUZ3TzJkaGNEbzJjSGc3YW5WemRHbG1lUzFqYjI1MFpXNTBPbU5sYm5SbGNqdDNhV1IwYURveE1EQWxPM0JoWkdScGJtY3RkRzl3T2pFd2NIaDlDaU5vWVc1a0lDNWpaSHRqZFhKemIzSTZjRzlwYm5SbGNqdDBjbUZ1YzJsMGFXOXVPblJ5WVc1elptOXliU0F1TVRKekxHSnZlQzF6YUdGa2IzY2dMakV5YzMwS0kyaGhibVFnTG1Oa09taHZkbVZ5ZTNSeVlXNXpabTl5YlRwMGNtRnVjMnhoZEdWWktDMDJjSGdwZlFvamFHRnVaQ0F1WTJRdWMyVnNlM1J5WVc1elptOXliVHAwY21GdWMyeGhkR1ZaS0MweE5IQjRLU0J6WTJGc1pTZ3hMakEyS1R0aWIzZ3RjMmhoWkc5M09qQWdNQ0F3SURSd2VDQjJZWElvTFMxaFkyTXBMREFnTUNBeU5IQjRJSFpoY2lndExXRmpZeWw5Q2lOb1lXNWtMbTltWmlBdVkyUjdiM0JoWTJsMGVUb3VOVFU3Y0c5cGJuUmxjaTFsZG1WdWRITTZibTl1WlgwS0xuTmllMlJwYzNCc1lYazZaM0pwWkR0bmNtbGtMWFJsYlhCc1lYUmxMV052YkhWdGJuTTZjbVZ3WldGMEtHRjFkRzh0Wm1sc2JDeHRhVzV0WVhnb01UVXdjSGdzTVdaeUtTazdaMkZ3T2pad2VEdDNhV1IwYURveE1EQWxmUW91YzJJZ0xuQmplM0JoWkdScGJtYzZMak55WlcwZ0xqWnlaVzA3Wm05dWRDMXphWHBsT2k0NU5YSmxiWDB1YzJJZ0xuQmpJR1Z0ZTIxaGVDMTNhV1IwYURvM01IQjRmUW9qYVc1bWIzdG1iMjUwTFhkbGFXZG9kRG8yTURCOUNpTm1lSHR3YjNOcGRHbHZianBtYVhobFpEdHBibk5sZERvd08zQnZhVzUwWlhJdFpYWmxiblJ6T201dmJtVTdlaTFwYm1SbGVEb3lOVHR2ZG1WeVpteHZkenBvYVdSa1pXNTlDaTVqYUdsd2UzQnZjMmwwYVc5dU9tRmljMjlzZFhSbE8yeGxablE2TlRBbE8zUnZjRG96T0NVN2RISmhibk5tYjNKdE9uUnlZVzV6YkdGMFpWZ29MVFV3SlNrN2NHRmtaR2x1WnpvdU5ISmxiU0F4TGpKeVpXMDdZbTl5WkdWeUxYSmhaR2wxY3pvNU9UbHdlRHRpWVdOclozSnZkVzVrT25aaGNpZ3RMV01wTzJOdmJHOXlPaU5tWm1ZN1ptOXVkQzF6YVhwbE9qRXVObkpsYlR0bWIyNTBMWGRsYVdkb2REbzNNREE3ZEdWNGRDMXphR0ZrYjNjNk1DQXljSGdnTkhCNElDTXdNREE0TzJKdmVDMXphR0ZrYjNjNk1DQTRjSGdnTWpSd2VDQWpNREF3T0R0aWIzSmtaWEk2TTNCNElITnZiR2xrSUNObVptWTdZVzVwYldGMGFXOXVPbU5vSURFdU5uTWdaV0Z6WlMxdmRYUWdabTl5ZDJGeVpITTdkMmhwZEdVdGMzQmhZMlU2Ym05M2NtRndmUXBBYTJWNVpuSmhiV1Z6SUdOb2V6QWxlMjl3WVdOcGRIazZNRHQwY21GdWMyWnZjbTA2ZEhKaGJuTnNZWFJsS0MwMU1DVXNNekJ3ZUNrZ2MyTmhiR1VvTGpVcGZUSXdKWHR2Y0dGamFYUjVPakU3ZEhKaGJuTm1iM0p0T25SeVlXNXpiR0YwWlNndE5UQWxMREFwSUhOallXeGxLREV1TVNsOU9EQWxlMjl3WVdOcGRIazZNWDB4TURBbGUyOXdZV05wZEhrNk1EdDBjbUZ1YzJadmNtMDZkSEpoYm5Oc1lYUmxLQzAxTUNVc0xUY3djSGdwSUhOallXeGxLREVwZlgwS0kyVnVaQ3dqY25Wc1pYTjdjRzl6YVhScGIyNDZabWw0WldRN2FXNXpaWFE2TUR0a2FYTndiR0Y1T201dmJtVTdZV3hwWjI0dGFYUmxiWE02WTJWdWRHVnlPMnAxYzNScFpua3RZMjl1ZEdWdWREcGpaVzUwWlhJN1ltRmphMmR5YjNWdVpEb2pNREF3WVR0aVlXTnJaSEp2Y0MxbWFXeDBaWEk2WW14MWNpZzJjSGdwTzNvdGFXNWtaWGc2TWpBN2NHRmtaR2x1WnpveE5uQjRPMjkyWlhKbWJHOTNPbUYxZEc5OUNpTmxibVF1YjI0c0kzSjFiR1Z6TG05dWUyUnBjM0JzWVhrNlpteGxlSDBLTG0xdlpHRnNlMkpoWTJ0bmNtOTFibVE2SXpKaE1XSTFNanRpYjNKa1pYSTZNM0I0SUhOdmJHbGtJSFpoY2lndExXRmpZeWs3WW05eVpHVnlMWEpoWkdsMWN6b3lOSEI0TzJKdmVDMXphR0ZrYjNjNk9IQjRJRGh3ZUNBd0lDTXdNREJoTzNCaFpHUnBibWM2TWpKd2VEdDNhV1IwYURwdGFXNG9ORFF3Y0hnc01UQXdKU2s3WkdsemNHeGhlVHBtYkdWNE8yWnNaWGd0WkdseVpXTjBhVzl1T21OdmJIVnRianRuWVhBNk1UQndlRHQwWlhoMExXRnNhV2R1T21ObGJuUmxjanRoYm1sdFlYUnBiMjQ2Y0hBZ0xqWnpJR04xWW1sakxXSmxlbWxsY2lndU15d3hMallzTGpVc01TazdiV0Y0TFdobGFXZG9kRG81TW5ab08yOTJaWEptYkc5M09tRjFkRzk5Q2k1dGIyUmhiQ0JvTW50dFlYSm5hVzQ2TUR0amIyeHZjanAyWVhJb0xTMWhZMk1wZlM1dGIyUmhiQ0F1Y0dON2QybGtkR2c2TVRBd0pYMHViVzlrWVd3Z2NIdHRZWEpuYVc0Nk1EdDBaWGgwTFdGc2FXZHVPbXhsWm5RN2JHbHVaUzFvWldsbmFIUTZNUzQwZlFvdWJXOWtZV3dnZFd4N2JXRnlaMmx1T2pBN2NHRmtaR2x1Wnkxc1pXWjBPakl3Y0hnN2RHVjRkQzFoYkdsbmJqcHNaV1owTzJ4cGJtVXRhR1ZwWjJoME9qRXVORFY5Q2k1d1l5QXVjbXQ3Wm05dWRDMTNaV2xuYUhRNk56QXdPM2RwWkhSb09qRXVObVZ0TzNSbGVIUXRZV3hwWjI0NlkyVnVkR1Z5ZlFvalkyOXVabnR3YjNOcGRHbHZianBtYVhobFpEdHBibk5sZERvd08zQnZhVzUwWlhJdFpYWmxiblJ6T201dmJtVTdiM1psY21ac2IzYzZhR2xrWkdWdU8zb3RhVzVrWlhnNk16QjlDaU5qYjI1bUlHbDdjRzl6YVhScGIyNDZZV0p6YjJ4MWRHVTdkRzl3T2kweE5uQjRPM2RwWkhSb09qbHdlRHRvWldsbmFIUTZNVFZ3ZUR0aWIzSmtaWEl0Y21Ga2FYVnpPakp3ZUR0aGJtbHRZWFJwYjI0NlkyWWdiR2x1WldGeUlHWnZjbmRoY21SemZVQnJaWGxtY21GdFpYTWdZMlo3ZEc5N2RISmhibk5tYjNKdE9uUnlZVzV6YkdGMFpTaDJZWElvTFMxa2VDa3NNVEV3ZG1ncElISnZkR0YwWlNnNU1EQmtaV2NwZlgwS0kzUnZZWE4wZTNCdmMybDBhVzl1T21acGVHVmtPMnhsWm5RNk5UQWxPMkp2ZEhSdmJUcGpZV3hqS0RJMGNIZ2dLeUJsYm5Zb2MyRm1aUzFoY21WaExXbHVjMlYwTFdKdmRIUnZiU3d3Y0hncEtUdDBjbUZ1YzJadmNtMDZkSEpoYm5Oc1lYUmxLQzAxTUNVc016QndlQ2s3WW1GamEyZHliM1Z1WkRwMllYSW9MUzFqY21WaGJTazdZMjlzYjNJNmRtRnlLQzB0YVc1cktUdG1iMjUwTFhkbGFXZG9kRG8yTURBN2NHRmtaR2x1WnpvdU5uSmxiU0F4TGpKeVpXMDdZbTl5WkdWeUxYSmhaR2wxY3pvNU9UbHdlRHR2Y0dGamFYUjVPakE3ZEhKaGJuTnBkR2x2YmpwaGJHd2dMak56TzNvdGFXNWtaWGc2TkRBN2NHOXBiblJsY2kxbGRtVnVkSE02Ym05dVpUdDBaWGgwTFdGc2FXZHVPbU5sYm5SbGNuMEtJM1J2WVhOMExtOXVlMjl3WVdOcGRIazZNVHQwY21GdWMyWnZjbTA2ZEhKaGJuTnNZWFJsS0MwMU1DVXNNQ2w5Q2k1emRIQjdaR2x6Y0d4aGVUcG1iR1Y0TzJGc2FXZHVMV2wwWlcxek9tTmxiblJsY2p0bllYQTZNVEJ3ZUgwdWMzUndJR0o3YldsdUxYZHBaSFJvT2pVdU5XVnRPM1JsZUhRdFlXeHBaMjQ2WTJWdWRHVnlmUXBBYldWa2FXRW9jSEpsWm1WeWN5MXlaV1IxWTJWa0xXMXZkR2x2YmpweVpXUjFZMlVwZXlwN1lXNXBiV0YwYVc5dU9tNXZibVVoYVcxd2IzSjBZVzUwTzNSeVlXNXphWFJwYjI0NmJtOXVaU0ZwYlhCdmNuUmhiblI5ZlFvOEwzTjBlV3hsUGp3dmFHVmhaRDQ4WW05a2VUNEtQSE4yWnlCM2FXUjBhRDBpTUNJZ2FHVnBaMmgwUFNJd0lpQnpkSGxzWlQwaWNHOXphWFJwYjI0NllXSnpiMngxZEdVaVBqeHplVzFpYjJ3Z2FXUTlJbUpvSWlCMmFXVjNRbTk0UFNJd0lEQWdNVEF3SURnd0lqNDhjR0YwYUNCa1BTSk5NVEFnT0VNeE1pQXpOU0F5TlNBME1DQXpNaUEwTUV3ek1pQTJNa3cwTWlBM05rZzFPRXcyT0NBMk1rdzJPQ0EwTUVNM05TQTBNQ0E0T0NBek5TQTVNQ0E0UXpnd0lESTBJRGN5SURJMklEWTBJREkyU0RNMlF6STRJREkySURJd0lESTBJREV3SURoYUlpOCtQQzl6ZVcxaWIydytQQzl6ZG1jK0NqeGthWFlnYVdROUltRndjQ0krQ2p4b1pXRmtaWEkrUEdJZ1kyeGhjM005SW14dloyOGlQallnWW1sbGNucGxJVHd2WWo0OFpHbDJJR05zWVhOelBTSm9ZaUkrUEdKMWRIUnZiaUJwWkQwaWNtd2lJR05zWVhOelBTSnpjU0lnWVhKcFlTMXNZV0psYkQwaVdtRnpZV1I1SWo0L1BDOWlkWFIwYjI0K1BHSjFkSFJ2YmlCcFpEMGliWFVpSUdOc1lYTnpQU0p6Y1NJZ1lYSnBZUzFzWVdKbGJEMGlSTVc2ZDJuRW1Xc2lQdkNmbElvOEwySjFkSFJ2Ymo0OEwyUnBkajQ4TDJobFlXUmxjajRLQ2p4elpXTjBhVzl1SUdsa1BTSnRaVzUxSWlCamJHRnpjejBpYzJOeUlHOXVJajRLUEdScGRpQmpiR0Z6Y3owaWFHVnlieUlnYVdROUltaGxjbThpUGp3dlpHbDJQZ284WkdsMklHTnNZWE56UFNKdFpTSWdhV1E5SW0xbElqNDhhVDQ4TDJrK1BHbHVjSFYwSUdsa1BTSnVhV05ySWlCdFlYaHNaVzVuZEdnOUlqRTBJaUJ3YkdGalpXaHZiR1JsY2owaVZIZkRzMm9nYm1samF5SWdZWFYwYjJOdmJYQnNaWFJsUFNKdlptWWlJR0Z5YVdFdGJHRmlaV3c5SWxSM3c3TnFJRzVwWTJzaVBqd3ZaR2wyUGdvOFpHbDJJR05zWVhOelBTSndZVzVsYkNJK0NqeGlkWFIwYjI0Z2FXUTlJbUpESWlCamJHRnpjejBpWW1sbklqNVZkSGZEczNKNklIQnZhOE96YWp3dlluVjBkRzl1UGdvOFpHbDJJR05zWVhOelBTSnliM2N5SWo0OGFXNXdkWFFnYVdROUltTmtJaUJ0WVhoc1pXNW5kR2c5SWpVaUlIQnNZV05sYUc5c1pHVnlQU0pMVDBRaUlHRjFkRzlqYjIxd2JHVjBaVDBpYjJabUlqNDhZblYwZEc5dUlHbGtQU0ppU2lJZ1kyeGhjM005SW0xdUlqNUViOFdDeElWamVqd3ZZblYwZEc5dVBqd3ZaR2wyUGdvOFluVjBkRzl1SUdsa1BTSmlUQ0lnWTJ4aGMzTTlJbWRvYjNOMElqNUhjbUVnZWlCaWIzUmhiV2tnS0hOdmJHOHBQQzlpZFhSMGIyNCtDanh3SUdOc1lYTnpQU0p1YjNSbElqNHk0b0NUTVRBZ1ozSmhZM3A1SU1LM0lIVnVhV3RoYWlCNlltbGxjbUZ1YVdFZ2EyRnlkQ0RpZ0pNZ2QzbG5jbmwzWVNCdVlXcHRibWxsYWlEaWw0OGdLR0o1WTNwNVkyZ2daOFdDdzdOM0tUd3ZjRDQ4Y0NCcFpEMGliblF5SWlCamJHRnpjejBpYUdsdWRDSStQQzl3UGdvOEwyUnBkajQ4TDNObFkzUnBiMjQrQ2dvOGMyVmpkR2x2YmlCcFpEMGliRzlpWW5raUlHTnNZWE56UFNKelkzSWlQZ284WkdsMklHTnNZWE56UFNKMGIzQWlQanhpZFhSMGIyNGdhV1E5SW14MklpQmpiR0Z6Y3owaVoyaHZjM1FpUHVLR2tDQlhlV3BreGJvOEwySjFkSFJ2Ymo0OFpHbDJJR05zWVhOelBTSmpiMlJsSWlCcFpEMGliR01pSUhScGRHeGxQU0pMYjNCcGRXb2dhMjlrSWo0OEwyUnBkajQ4YzNCaGJqNDhMM053WVc0K1BDOWthWFkrQ2p4a2FYWWdZMnhoYzNNOUluQnNJaUJwWkQwaWNHeHpJajQ4TDJScGRqNEtQR1JwZGlCamJHRnpjejBpY0dGdVpXd2lJR2xrUFNKdmNIUnpJajRLUEdScGRpQmpiR0Z6Y3owaWIzQjBJaUJwWkQwaWJXUWlQand2WkdsMlBnbzhaR2wySUdOc1lYTnpQU0p5YjNjeUlqNDhjM0JoYmo1Q2IzUjVPand2YzNCaGJqNDhaR2wySUdOc1lYTnpQU0p6ZEhBaVBqeGlkWFIwYjI0Z2FXUTlJbTFwSWlCamJHRnpjejBpYzNFaVB1S0lrand2WW5WMGRHOXVQanhpSUdsa1BTSnViaUkrUEM5aVBqeGlkWFIwYjI0Z2FXUTlJbkIxSWlCamJHRnpjejBpYzNFaVBpczhMMkoxZEhSdmJqNDhMMlJwZGo0OEwyUnBkajRLUEhBZ1kyeGhjM005SW1ocGJuUWlJR2xrUFNKb2JpSStQQzl3UGdvOFluVjBkRzl1SUdsa1BTSnpkQ0lnWTJ4aGMzTTlJbWR2SWo1VGRHRnlkQ0JuY25rOEwySjFkSFJ2Ymo0S1BDOWthWFkrQ2p3dmMyVmpkR2x2Ymo0S0NqeHpaV04wYVc5dUlHbGtQU0puWVcxbElpQmpiR0Z6Y3owaWMyTnlJajRLUEdScGRpQmpiR0Z6Y3owaWRHOXdJajQ4WW5WMGRHOXVJR2xrUFNKaWF5SWdZMnhoYzNNOUltZG9iM04wSUhOeElqN2locEE4TDJKMWRIUnZiajQ4WkdsMklHbGtQU0pwYm1adklqNDhMMlJwZGo0OGMzQmhiaUJwWkQwaVoyTWlJR05zWVhOelBTSm9hVzUwSWo0OEwzTndZVzQrUEM5a2FYWStDanhrYVhZZ1kyeGhjM005SW5OaUlpQnBaRDBpYzJJaVBqd3ZaR2wyUGdvOFpHbDJJR2xrUFNKeWIzZHpJajQ4TDJScGRqNEtQR1JwZGlCcFpEMGljR3hoZVNJK1BDOWthWFkrQ2p4a2FYWWdhV1E5SW1ocGJuUWlQand2WkdsMlBnbzhaR2wySUdsa1BTSm9ZVzVrSWo0OEwyUnBkajRLUEdKMWRIUnZiaUJwWkQwaWNHd2lJR05zWVhOelBTSm5ieUlnYzNSNWJHVTlJbVJwYzNCc1lYazZibTl1WlNJK1dtRm5jbUZxSUd0aGNuVEVtVHd2WW5WMGRHOXVQZ284TDNObFkzUnBiMjQrQ2p3dlpHbDJQZ284WkdsMklHbGtQU0psYm1RaVBqd3ZaR2wyUGdvOFpHbDJJR2xrUFNKeWRXeGxjeUkrUEdScGRpQmpiR0Z6Y3owaWJXOWtZV3dpUGp4b01qNWFZWE5oWkhrZ05pQmlhV1Z5ZW1VaFBDOW9NajRLUEhWc1BqeHNhVDVMWWNXOFpIa2daRzl6ZEdGcVpTQXhNQ0JyWVhKMElDZ3g0b0NUTVRBMEtTNGdUbUVnYzNSdmJHVWdiR1hGdk1TRklEUWdjbnJFbVdSNUlIQnZJR3BsWkc1bGFpQnJZWEpqYVdVdVBDOXNhVDRLUEd4cFBsZHplbmx6WTNrZ2FtVmtibTlqZW1YRm0yNXBaU0IzZVdKcFpYSmhhc1NGSUd0aGNuVEVtU3dnY0c5MFpXMGdiMlJyY25sM1lXckVoU0RpZ0pNZ2IyUWdibUZxYm1uRnZITjZaV29nWkc4Z2JtRnFkM25GdkhONlpXb3VQQzlzYVQ0S1BHeHBQa3RoY25SaElIUnlZV1pwWVNCa2J5Qnllc1NaWkhVc0lHdDB3N055WldkdklHOXpkR0YwYm1saElHdGhjblJoSUdwbGMzUWdQR0krYm1GcVlteHB4Ynh6ZW1FZ2JtbkZ2SE42WVR3dllqNHVJRkp2YzI3RWhXTnZMand2YkdrK0NqeHNhVDQ4WWo0MkxpQnJZWEowWVNCM0lISjZ4SmxrZW1sbFBDOWlQaURpZ0pNZ2VtRmlhV1Z5WVhONklIZHplbmx6ZEd0cFpTQTFJSEJ2Y0hKNlpXUnVhV05vSUdrZ1pHOXpkR0ZxWlhONklHbGphQ0RpbDQ4Z0tHSjVZM3A1WTJnZ1o4V0N3N04zS1M0OEwyeHBQZ284YkdrK1NtWEZtMnhwSUZSM2IycGhJR3RoY25SaElHcGxjM1FnUEdJK2JtbkZ2SE42WVNCdlpDQjNjM3A1YzNScmFXTm9QQzlpUGlCcmI4V0VZOE96ZHlCeWVzU1paTU96ZHlEaWdKTWdkM2xpYVdWeVlYTjZJSEo2eElWa0xDQnJkTU96Y25rZ2VtRmlhV1Z5WVhONkxqd3ZiR2srQ2p4c2FUNU1hV042WW1FZzRwZVBPaUI2ZDNscnhZSmhJR3RoY25SaElERXNJR3R2eFlSamVzU0ZZMkVnYzJuRW1TQnVZU0ExSU9LQWt5QXlMQ0J1WVNBd0lPS0FreUF6TENCd2IyUjN3N05xYm1FZ0tERXhMQ0F5TXVLQXBpa2c0b0NUSURVc0lHRWdQR0krTlRVOEwySStJR0hGdkNBM0xqd3ZiR2srQ2p4c2FUNVhlV2R5ZVhkaElHZHlZV042SUhvZ1BHSStibUZxYlc1cFpXcHplc1NGUEM5aVBpQnNhV042WXNTRklPS1hqeTRnVnlCMGNubGlhV1VnNG9DZVJHOGdOallnNHBlUDRvQ2RJR2R5WVNCMGNuZGhJR3RwYkd0aElISjFibVFzSUdIRnZDQnJkRy9GbXlCNlltbGxjbnBsSURZMklHeDFZaUIzYWNTWlkyVnFMand2YkdrK1BDOTFiRDRLUEdKMWRIUnZiaUJwWkQwaWNuZ2lJR05zWVhOelBTSm5ieUkrVW05NmRXMXBaVzA4TDJKMWRIUnZiajQ4TDJScGRqNDhMMlJwZGo0S1BHUnBkaUJwWkQwaVkyOXVaaUkrUEM5a2FYWStQR1JwZGlCcFpEMGlabmdpUGp3dlpHbDJQanhrYVhZZ2FXUTlJblJ2WVhOMElqNDhMMlJwZGo0S0NqeHpZM0pwY0hRK0NpOHFJRzF2YzNRZ1pHOGdSbWx5WldKaGMyVWdhRzl6ZEdFZ0tHbHVaR1Y0TG1oMGJXd3BPaUJ3YjJ0dmFtVWdiMjVzYVc1bElDc2dibWxqYXlBcklHdHZiRzl5SUNzZ2MzUmhkSGx6ZEhscmFTQXFMd29vWm5WdVkzUnBiMjRvS1hzS2RtRnlJRkE5ZDJsdVpHOTNMbkJoY21WdWRDeENQVzUxYkd3N0NuUnllWHRDUFZBbUpsQWhQVDEzYVc1a2IzY21KbEF1YzJKQ2NtbGtaMlVtSmxBdWMySkNjbWxrWjJVb0tYMWpZWFJqYUNobEtYdENQVzUxYkd4OUNuZHBibVJ2ZHk1ZlgzTmlUbWxqYXoxbWRXNWpkR2x2YmlncGUzUnllWHR5WlhSMWNtNGdRaVltUWk1dWFXTnJLQ2w4ZkNjbmZXTmhkR05vS0dVcGUzSmxkSFZ5YmljbmZYMDdDbmRwYm1SdmR5NWZYM05pUTI5c1BXWjFibU4wYVc5dUtDbDdkSEo1ZTNKbGRIVnliaUJDSmlaQ0xtTnZiQ2dwZkh3bkozMWpZWFJqYUNobEtYdHlaWFIxY200bkozMTlPd3AzYVc1a2IzY3VYMTl6WWxOMFlYUnpQV1oxYm1OMGFXOXVLR052WkdVc1oybGtMSEJzWVhsbGNuTXNjaWw3ZEhKNWUybG1LRUlwUWk1emRHRjBjeWhqYjJSbExHZHBaQ3h3YkdGNVpYSnpMSElwZldOaGRHTm9LR1VwZTMxOU93cDNhVzVrYjNjdVgxOXpZazVsZEQwaElTaENKaVpDTG01bGRDZ3BLVHNLYVdZb0lVSjhmQ0ZDTG01bGRDZ3BLWEpsZEhWeWJqc0tkMmx1Wkc5M0xsOWZjMkpLYjJsdVBXRnplVzVqSUdaMWJtTjBhVzl1S0c1aGJXVXBld29nSUhaaGNpQjFhV1E5WVhkaGFYUWdRaTVoZFhSb0tDazdDaUFnZG1GeUlIQmhkR2c5SjNSMGRGSnZiMjF6THljclUzUnlhVzVuS0c1aGJXVXBMblJ2VEc5M1pYSkRZWE5sS0NrdWNtVndiR0ZqWlNndlcxNWhMWG93TFRrdFhTOW5MQ2NuS1M1emJHbGpaU2d3TERRd0tUc0tJQ0IyWVhJZ2NtVm1QVUl1WkdJdWNtVm1LSEJoZEdncExIQnlQWEpsWmk1amFHbHNaQ2duY0dWbGNuTW5LU3h0Y3oxeVpXWXVZMmhwYkdRb0oyMXpaM01uS1RzS0lDQjJZWElnWTJGamFHVTllMzBzY0dNOVcxMHNhRDE3ZlN4bmIyNWxQV1poYkhObExHWnBjbk4wUFhSeWRXVTdDaUFnZG1GeUlITjBZWEowUzJWNVBXMXpMbkIxYzJnb0tTNXJaWGs3Q2lBZ1lYZGhhWFFnY0hJdVkyaHBiR1FvZFdsa0tTNXpaWFFvZTNRNlFpNTBjMzBwT3dvZ0lIUnllWHR3Y2k1amFHbHNaQ2gxYVdRcExtOXVSR2x6WTI5dWJtVmpkQ2dwTG5KbGJXOTJaU2dwZldOaGRHTm9LR1VwZTMwS0lDQm1kVzVqZEdsdmJpQm1hWEpsS0dNcGUzQmpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9aaWw3ZEhKNWUyWW9ZeWw5WTJGMFkyZ29aU2w3WTI5dWMyOXNaUzVsY25KdmNpaGxLWDE5S1gwS0lDQjJZWElnYjI1V1lXdzljSEl1YjI0b0ozWmhiSFZsSnl4bWRXNWpkR2x2YmloektYc0tJQ0FnSUhaaGNpQjJQWE11ZG1Gc0tDbDhmSHQ5TEdwdmFXNWxaRDFiWFN4c1pXWjBQVnRkTEdOb1lXNW5aV1E5VzEwN0NpQWdJQ0JQWW1wbFkzUXVhMlY1Y3loMktTNW1iM0pGWVdOb0tHWjFibU4wYVc5dUtHc3BlM1poY2lCd1BYWmJhMTBtSm5aYmExMHVjSHg4ZTMwN0NpQWdJQ0FnSUdsbUtDRmpZV05vWlZ0clhTWW1JV1pwY25OMEppWnJJVDA5ZFdsa0tXcHZhVzVsWkM1d2RYTm9LSHR3WldWeU9tdDlLVHNLSUNBZ0lDQWdaV3h6WlNCcFppaGpZV05vWlZ0clhTWW1heUU5UFhWcFpDWW1TbE5QVGk1emRISnBibWRwWm5rb1kyRmphR1ZiYTEwcElUMDlTbE5QVGk1emRISnBibWRwWm5rb2NDa3BZMmhoYm1kbFpDNXdkWE5vS0h0d1pXVnlPbXQ5S1RzS0lDQWdJQ0FnWTJGamFHVmJhMTA5Y0gwcE93b2dJQ0FnVDJKcVpXTjBMbXRsZVhNb1kyRmphR1VwTG1admNrVmhZMmdvWm5WdVkzUnBiMjRvYXlsN2FXWW9JWFpiYTEwcGUyUmxiR1YwWlNCallXTm9aVnRyWFR0cFppaHJJVDA5ZFdsa0tXeGxablF1Y0hWemFDaDdjR1ZsY2pwcmZTbDlmU2s3Q2lBZ0lDQm1hWEp6ZEQxbVlXeHpaVHRtYVhKbEtIdHFiMmx1WldRNmFtOXBibVZrTEd4bFpuUTZiR1ZtZEN4amFHRnVaMlZrT21Ob1lXNW5aV1I5S1RzS0lDQjlLVHNLSUNCaGQyRnBkQ0J3Y2k1dmJtTmxLQ2QyWVd4MVpTY3BMblJvWlc0b1puVnVZM1JwYjI0b2N5bDdkbUZ5SUhZOWN5NTJZV3dvS1h4OGUzMDdUMkpxWldOMExtdGxlWE1vZGlrdVptOXlSV0ZqYUNobWRXNWpkR2x2YmlocktYdGpZV05vWlZ0clhUMTJXMnRkSmlaMlcydGRMbkI4Zkh0OWZTbDlLVHNLSUNCMllYSWdjVDF0Y3k1dmNtUmxja0o1UzJWNUtDa3VjM1JoY25SQmRDaHpkR0Z5ZEV0bGVTazdDaUFnZG1GeUlHOXVUWE5uUFhFdWIyNG9KMk5vYVd4a1gyRmtaR1ZrSnl4bWRXNWpkR2x2YmloektYdDJZWElnZGoxekxuWmhiQ2dwTzJsbUtDRjJmSHdoZGk1MEtYSmxkSFZ5Ymp0MllYSWdabk05YUZ0MkxuUmRPMmxtS0NGbWN5bHlaWFIxY200N0NpQWdJQ0IyWVhJZ2JUMTdjR1ZsY2pwMkxuQmxaWElzYVhOTlpUcDJMbkJsWlhJOVBUMTFhV1FzZEhNNkszWXVkSE44ZkVSaGRHVXVibTkzS0Nrc1pHRjBZVHAyTG1SaGRHRTlQVDExYm1SbFptbHVaV1EvYm5Wc2JEcDJMbVJoZEdGOU93b2dJQ0FnWm5NdWMyeHBZMlVvS1M1bWIzSkZZV05vS0daMWJtTjBhVzl1S0dZcGUzUnllWHRtS0cwcGZXTmhkR05vS0dVcGUyTnZibk52YkdVdVpYSnliM0lvWlNsOWZTbDlLVHNLSUNCeVpYUjFjbTU3Q2lBZ0lDQjFhV1E2ZFdsa0xBb2dJQ0FnY0dWbGNuTTZablZ1WTNScGIyNG9LWHR5WlhSMWNtNGdUMkpxWldOMExtdGxlWE1vWTJGamFHVXBMbTFoY0NobWRXNWpkR2x2YmlocktYdHlaWFIxY201N2NHVmxjanByTEdselRXVTZhejA5UFhWcFpDeHdjbVZ6Wlc1alpUcGpZV05vWlZ0clhYeDhlMzE5ZlNsOUxBb2dJQ0FnY0hKbGMyVnVZMlU2Wm5WdVkzUnBiMjRvYnlsN1kyRmphR1ZiZFdsa1hUMXZPM0psZEhWeWJpQndjaTVqYUdsc1pDaDFhV1FwTG5ObGRDaDdkRHBDTG5SekxIQTZiMzBwZlN3S0lDQWdJRzl1T21aMWJtTjBhVzl1S0hRc1ppbDdLR2hiZEYwOWFGdDBYWHg4VzEwcExuQjFjMmdvWmlrN2NtVjBkWEp1SUdaMWJtTjBhVzl1S0NsN2FGdDBYVDBvYUZ0MFhYeDhXMTBwTG1acGJIUmxjaWhtZFc1amRHbHZiaWg0S1h0eVpYUjFjbTRnZUNFOVBXWjlLWDE5TEFvZ0lDQWdiMjVRWldWeWN6cG1kVzVqZEdsdmJpaG1LWHR3WXk1d2RYTm9LR1lwTzNKbGRIVnliaUJtZFc1amRHbHZiaWdwZTNCalBYQmpMbVpwYkhSbGNpaG1kVzVqZEdsdmJpaDRLWHR5WlhSMWNtNGdlQ0U5UFdaOUtYMTlMQW9nSUNBZ1pXMXBkRHBtZFc1amRHbHZiaWgwTEdRcGUybG1LR2R2Ym1VcGNtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2dwTzNaaGNpQnlQVzF6TG5CMWMyZ29LVHQyWVhJZ2NEMXlMbk5sZENoN2REcDBMSEJsWlhJNmRXbGtMR1JoZEdFNlpEMDlQWFZ1WkdWbWFXNWxaRDl1ZFd4c09tUXNkSE02UWk1MGMzMHBPM05sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjRvS1h0eUxuSmxiVzkyWlNncExtTmhkR05vS0daMWJtTjBhVzl1S0NsN2ZTbDlMREl3TURBd0tUdHlaWFIxY200Z2NIMHNDaUFnSUNCc1pXRjJaVHBtZFc1amRHbHZiaWdwZTJsbUtHZHZibVVwY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTZ3BPMmR2Ym1VOWRISjFaVHQwY25sN2NISXViMlptS0NkMllXeDFaU2NzYjI1V1lXd3BPM0V1YjJabUtDZGphR2xzWkY5aFpHUmxaQ2NzYjI1TmMyY3BmV05oZEdOb0tHVXBlMzBLSUNBZ0lDQWdkSEo1ZTNCeUxtTm9hV3hrS0hWcFpDa3ViMjVFYVhOamIyNXVaV04wS0NrdVkyRnVZMlZzS0NsOVkyRjBZMmdvWlNsN2ZRb2dJQ0FnSUNCeVpYUjFjbTRnY0hJdVkyaHBiR1FvZFdsa0tTNXlaVzF2ZG1Vb0tTNTBhR1Z1S0daMWJtTjBhVzl1S0NsN2NtVjBkWEp1SUhCeUxtOXVZMlVvSjNaaGJIVmxKeWw5S1M1MGFHVnVLR1oxYm1OMGFXOXVLSE1wZTJsbUtDRnpMblpoYkNncEtYSmxkSFZ5YmlCeVpXWXVjbVZ0YjNabEtDbDlLUzVqWVhSamFDaG1kVzVqZEdsdmJpZ3BlMzBwZlFvZ0lIMDdDbjA3Q24wcEtDazdDand2YzJOeWFYQjBQZ284YzJOeWFYQjBQZ3BqYjI1emRDQWtQWE05UG1SdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9jeWtzSkNROWN6MCtXeTR1TG1SdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvY3lsZE93cGpiMjV6ZENCUVFVdzlXeWNqWm1ZMVpEY3pKeXduSXpKbVlqaG1aaWNzSnlObVptTTVNamduTENjak1tWmtOamhtSnl3bkkyRTNOMkptWmljc0p5Tm1aamhoTTJRbkxDY2pabVkxWm1FeUp5d25JelZsWlRaak9DY3NKeU01WW1VeE5XUW5MQ2NqWXpSalpHWm1KMTA3Q21OdmJuTjBJRTFCV0ZBOU1UQXNVRWxEUzE5VVBUUTFMRkpQVjE5VVBUTXdMRXhKVFQwMk5qc0tZMjl1YzNRZ1FrOVVUajFiSjBGc1lTY3NKMEpoY25SbGF5Y3NKME5sYkdsdVlTY3NKMFJoY21Wckp5d25SWGRoSnl3blJuSmhibVZySnl3blIyOXphV0VuTENkSVpXNXBaV3NuTENkSmVtRW5YVHNLWTI5dWMzUWdTRVZZUFM5ZUkxc3dMVGxoTFdaZGV6WjlKQzlwTEdOc1pXRnVUajEyUFQ1VGRISnBibWNvZG54OEp5Y3BMbkpsY0d4aFkyVW9MMXRjZFRBd01EQXRYSFV3TURGbVhIVXlNREJpTFZ4MU1qQXdabHgxTWpBeU9DMWNkVEl3TW1ZOFBpWmRMMmNzSnljcExuUnlhVzBvS1M1emJHbGpaU2d3TERFMEtUc0tZMjl1YzNRZ2NtZGlQV2c5UGxzeExETXNOVjB1YldGd0tHazlQbkJoY25ObFNXNTBLR2d1YzNWaWMzUnlLR2tzTWlrc01UWXBLU3hqYkc5elpUMG9ZU3hpS1QwK2UyTnZibk4wSUhnOWNtZGlLR0VwTEhrOWNtZGlLR0lwTzNKbGRIVnliaUJOWVhSb0xtaDVjRzkwS0hoYk1GMHRlVnN3WFN4NFd6RmRMWGxiTVYwc2VGc3lYUzE1V3pKZEtUdzJNSDA3Q21aMWJtTjBhVzl1SUhCcFkydERiMndvZDJGdWRDeDFjMlZrS1h0amIyNXpkQ0JqUFVoRldDNTBaWE4wS0hkaGJuUjhmQ2NuS1Q5M1lXNTBMblJ2VEc5M1pYSkRZWE5sS0NrNkp5YzdhV1lvWXlZbUlYVnpaV1F1YzI5dFpTaDFQVDVqYkc5elpTaDFMR01wS1NseVpYUjFjbTRnWXp0bWIzSW9ZMjl1YzNRZ2NDQnZaaUJRUVV3cGFXWW9JWFZ6WldRdWMyOXRaU2gxUFQ1amJHOXpaU2gxTEhBcEtTbHlaWFIxY200Z2NEdHlaWFIxY200Z1VFRk1XM1Z6WldRdWJHVnVaM1JvSlZCQlRDNXNaVzVuZEdoZGZRcGpiMjV6ZENCbGMyTTljejArVTNSeWFXNW5LSE1wTG5KbGNHeGhZMlVvTDFzbVBENGlYUzluTEdNOVBpaDdKeVluT2ljbVlXMXdPeWNzSnp3bk9pY21iSFE3Snl3blBpYzZKeVpuZERzbkxDY2lKem9uSm5GMWIzUTdKMzFiWTEwcEtUc0tZMjl1YzNRZ1luVnNiSE05YmowK2JqMDlQVFUxUHpjNmJpVXhNVDA5UFRBL05UcHVKVEV3UFQwOU1EOHpPbTRsTlQwOVBUQS9Nam94T3dwamIyNXpkQ0J6ZFcwOWNqMCtjaTV5WldSMVkyVW9LR0VzWXlrOVBtRXJZblZzYkhNb1l5a3NNQ2s3Q21OdmJuTjBJSE5zWldWd1BXMXpQVDV1WlhjZ1VISnZiV2x6WlNoeVBUNXpaWFJVYVcxbGIzVjBLSElzYlhNcEtUc0tZMjl1YzNRZ1FrZzlKenh6ZG1jZ2RtbGxkMEp2ZUQwaU1DQXdJREV3TUNBNE1DSStQSFZ6WlNCb2NtVm1QU0lqWW1naUx6NDhMM04yWno0bk93b3ZLaUJreGJwM2FjU1pheUFxTHdwc1pYUWdRVU1zYlhWMFpUMW1ZV3h6WlRzS1kyOXVjM1FnWVhVOUtDazlQbnRwWmlnaFFVTXBkSEo1ZTBGRFBXNWxkeWgzYVc1a2IzY3VRWFZrYVc5RGIyNTBaWGgwZkh4M2FXNWtiM2N1ZDJWaWEybDBRWFZrYVc5RGIyNTBaWGgwS1NncGZXTmhkR05vS0dVcGUzMXBaaWhCUXlZbVFVTXVjM1JoZEdVOVBUMG5jM1Z6Y0dWdVpHVmtKeWxCUXk1eVpYTjFiV1VvS1R0eVpYUjFjbTRnUVVOOU93cG1kVzVqZEdsdmJpQjBiaWhtTEdRc2RIa3NkaXhoZENsN2FXWW9iWFYwWlNseVpYUjFjbTQ3WTI5dWMzUWdZVDFoZFNncE8ybG1LQ0ZoS1hKbGRIVnlianRqYjI1emRDQnZQV0V1WTNKbFlYUmxUM05qYVd4c1lYUnZjaWdwTEdjOVlTNWpjbVZoZEdWSFlXbHVLQ2tzZEQxaExtTjFjbkpsYm5SVWFXMWxLeWhoZEh4OE1DazdieTUwZVhCbFBYUjVmSHduYzJsdVpTYzdieTVtY21WeGRXVnVZM2t1YzJWMFZtRnNkV1ZCZEZScGJXVW9aaXgwS1R0bkxtZGhhVzR1YzJWMFZtRnNkV1ZCZEZScGJXVW9NQ3gwS1R0bkxtZGhhVzR1YkdsdVpXRnlVbUZ0Y0ZSdlZtRnNkV1ZCZEZScGJXVW9kbng4TGpFMUxIUXJMakF4S1R0bkxtZGhhVzR1Wlhod2IyNWxiblJwWVd4U1lXMXdWRzlXWVd4MVpVRjBWR2x0WlNndU1EQXdNU3gwSzJRcE8yOHVZMjl1Ym1WamRDaG5LVHRuTG1OdmJtNWxZM1FvWVM1a1pYTjBhVzVoZEdsdmJpazdieTV6ZEdGeWRDaDBLVHR2TG5OMGIzQW9kQ3RrS3k0d05TbDlDbU52Ym5OMElGTkdQWHQxYVRvb0tUMCtkRzRvTkRRd0xDNHdPQ3duYzNGMVlYSmxKeXd1TURVcExHWnNhWEE2S0NrOVBudDBiaWczTURBc0xqQTJMQ2QwY21saGJtZHNaU2NzTGpFcE8zUnVLRGt3TUN3dU1EWXNKM1J5YVdGdVoyeGxKeXd1TURnc0xqQTFLWDBzWTJGeVpEb29LVDArZTNSdUtETXpNQ3d1TVN3bmRISnBZVzVuYkdVbkxDNHhPQ2s3ZEc0b05USXdMQzR3Tml3bmMybHVaU2NzTGpBM0xDNHdNaWw5TEhSaGEyVTZLQ2s5UG50MGJpZ3hPREFzTGpJMUxDZHpZWGQwYjI5MGFDY3NMakV5S1R0MGJpZ3hNekFzTGpNMUxDZHpZWGQwYjI5MGFDY3NMakVzTGpFcGZTeHRlVG9vS1QwK2UzUnVLRFkyTUN3dU1Td25jMmx1WlNjc0xqRXlLVHQwYmlnNE9EQXNMakUwTENkemFXNWxKeXd1TVRJc0xqRXBmU3gzYVc0NktDazlQbHMxTWpNc05qVTVMRGM0TkN3eE1EUTNMRGM0TkN3eE1EUTNMREV6TVRsZExtWnZja1ZoWTJnb0tHWXNhU2s5UG5SdUtHWXNMalFzSjNSeWFXRnVaMnhsSnl3dU1UZ3NhU291TVRFcEtTeGxibVE2S0NrOVBsc3pPVElzTXpNd0xESTJNbDB1Wm05eVJXRmphQ2dvWml4cEtUMCtkRzRvWml3dU16VXNKM1J5YVdGdVoyeGxKeXd1TVRVc2FTb3VNVFVwS1gwN0NpOHFJSE4wWVc0Z0tpOEtiR1YwSUZNOWJuVnNiQ3hqZEhnOWUyMXZaR1U2SjIxbGJuVW5mU3h0WlQxN2JtRnRaVG9uUjNKaFkzb25MR052YkRwUVFVeGJNRjE5TEZJOWJuVnNiQ3hwYzBodmMzUTlabUZzYzJVc2IzSmtQVnRkT3dwc1pYUWdTRDFiWFN4dGVVaGhibVE5VzEwc2MyVnNQVzUxYkd3c1IwVk9QVEFzVnoxdWRXeHNMRkpYUFc1MWJHd3NkRk05TUN4V1BYdDlPd3BqYjI1emRDQnRlVkJsWlhJOUtDazlQbEltSmxJdWRXbGtPd3BqYjI1emRDQnRlVWxrZUQwb0tUMCtJVk44ZkNGVExuQnNQeTB4T21OMGVDNXRiMlJsUFQwOUoyeHZZMkZzSno4d09sTXVjR3d1Wm1sdVpFbHVaR1Y0S0hBOVBuQXVjRDA5UFcxNVVHVmxjaWdwS1RzS1kyOXVjM1FnWjJWMFNHRnVaRDBvS1QwK1kzUjRMbTF2WkdVOVBUMG5ibVYwSnlZbUlXbHpTRzl6ZEQ5dGVVaGhibVE2S0VoYmJYbEpaSGdvS1YxOGZGdGRLVHNLWTI5dWMzUWdjMmh2ZHoxcFpEMCtKQ1FvSnk1elkzSW5LUzVtYjNKRllXTm9LSE05UG5NdVkyeGhjM05NYVhOMExuUnZaMmRzWlNnbmIyNG5MSE11YVdROVBUMXBaQ2twT3dwamIyNXpkQ0IwYjJGemREMTBQVDU3WTI5dWMzUWdaVDBrS0NjamRHOWhjM1FuS1R0bExuUmxlSFJEYjI1MFpXNTBQWFE3WlM1amJHRnpjMHhwYzNRdVlXUmtLQ2R2YmljcE8yTnNaV0Z5VkdsdFpXOTFkQ2gwYjJGemRDNTBLVHQwYjJGemRDNTBQWE5sZEZScGJXVnZkWFFvS0NrOVBtVXVZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25iMjRuS1N3eU5qQXdLWDA3Q21OdmJuTjBJR0Z5Y2owb1lTeHVMSFlwUFQ1QmNuSmhlUzVwYzBGeWNtRjVLR0VwUDJFNlQySnFaV04wTG5aaGJIVmxjeWhoZkh4N2ZTa3ViR1Z1WjNSb1AwOWlhbVZqZEM1MllXeDFaWE1vWVNrNlFYSnlZWGtvYm54OE1Da3VabWxzYkNoMktUc0tablZ1WTNScGIyNGdibTl5YlZNb2N5bDdhV1lvSVhNcGNtVjBkWEp1SUhNN2N5NXdiRDFoY25Jb2N5NXdiQ2s3Y3k1eWIzZHpQV0Z5Y2loekxuSnZkM01wTG0xaGNDaHlQVDVoY25Jb2Npa3BPM011Y0d4aGVXVmtQV0Z5Y2loekxuQnNZWGxsWkNrN2N5NXdhV05yWldROVlYSnlLSE11Y0dsamEyVmtMSE11Y0d3dWJHVnVaM1JvTEdaaGJITmxLVHR6TG5SdmREMWhjbklvY3k1MGIzUXNjeTV3YkM1c1pXNW5kR2dzTUNrN2N5NXdaVzQ5WVhKeUtITXVjR1Z1TEhNdWNHd3ViR1Z1WjNSb0xEQXBPM011YUdNOVlYSnlLSE11YUdNc2N5NXdiQzVzWlc1bmRHZ3NNQ2s3Y3k1eWNEMWhjbklvY3k1eWNDeHpMbkJzTG14bGJtZDBhQ3d3S1R0ekxtRnNiRDFoY25Jb2N5NWhiR3dwTzNNdWIzZHVQWE11YjNkdWZIeDdmVHR5WlhSMWNtNGdjMzBLWTI5dWMzUWdZMnh2Ym1VOWJ6MCtTbE5QVGk1d1lYSnpaU2hLVTA5T0xuTjBjbWx1WjJsbWVTaHZLU2s3Q21OdmJuTjBJR0pqUFNncFBUNTdhV1lvVWlZbWFYTkliM04wSmlaVEtWSXVaVzFwZENnbmMzUmhkR1VuTEdOc2IyNWxLRk1wS1M1allYUmphQ2dvS1QwK2UzMHBmVHNLWTI5dWMzUWdiR2wyWlQxblBUNW5QVDA5UjBWT093cGpiMjV6ZENCemFIVm1abXhsUFdFOVBudG1iM0lvYkdWMElHazlZUzVzWlc1bmRHZ3RNVHRwUGpBN2FTMHRLWHRqYjI1emRDQnFQVTFoZEdndVpteHZiM0lvVFdGMGFDNXlZVzVrYjIwb0tTb29hU3N4S1NrN1cyRmJhVjBzWVZ0cVhWMDlXMkZiYWwwc1lWdHBYVjE5Y21WMGRYSnVJR0Y5T3dwamIyNXpkQ0IwYjNSaGJEMXBQVDRvVXk1MGIzUmJhVjE4ZkRBcEt5aFRMbkJsYmx0cFhYeDhNQ2s3Q2k4cUlHdGhjblI1SUNvdkNtWjFibU4wYVc5dUlHTmhjbVJJS0c0c2J5bDdiejF2Zkh4N2ZUdGpiMjV6ZENCaVBXSjFiR3h6S0c0cE93b2dJSEpsZEhWeWJpQmdQR1JwZGlCamJHRnpjejBpWTJRZ2NTUjdZbjBrZTI4dWNHOXdQeWNnY0c5d0p6b25KMzBrZTI4dWMyVnNQeWNnYzJWc0p6b25KMzBpSUdSaGRHRXRiajBpSkh0dWZTSStQSE0rSkh0dWZUd3ZjejQ4WWo0a2UyNTlQQzlpUGp4a2FYWWdZMnhoYzNNOUltSnNJajRrZTBKSUxuSmxjR1ZoZENoaUtYMDhMMlJwZGo0a2UyOHViM2NoUFQxMWJtUmxabWx1WldRbUptOHViM2MrUFRBbUpsTXVjR3hiYnk1dmQxMC9ZRHhwSUdOc1lYTnpQU0p2ZHlJZ2MzUjViR1U5SWkwdGIyTTZKSHRUTG5Cc1cyOHViM2RkTG1OOUlqNDhMMmsrWURvbkozMDhMMlJwZGo1Z2ZRcGpiMjV6ZENCaVlXTnJTRDFqUFQ1Z1BHUnBkaUJqYkdGemN6MGlZMlFnWW1zaUlITjBlV3hsUFNJdExXOWpPaVI3WTMwaVBpUjdRa2g5UEM5a2FYWStZRHNLTHlvZ1BUMDlQVDA5UFQwOVBUMDlQVDA5UFQwZ1UwbE1Ua2xMSUNob2IzTjBJQzhnYkc5cllXeHVhV1VwSUQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5SUNvdkNtWjFibU4wYVc5dUlHSnZkRkJwWTJzb2FTbDdDaUFnWTI5dWMzUWdhR0Z1WkQxSVcybGRmSHhiWFR0c1pYUWdZbVZ6ZEQxb1lXNWtXekJkTEdKelBURmxPVHNLSUNCbWIzSW9ZMjl1YzNRZ1l5QnZaaUJvWVc1a0tYdHNaWFFnY21rOUxURXNaVEE5TUR0VExuSnZkM011Wm05eVJXRmphQ2dvY2l4cUtUMCtlMk52Ym5OMElHVTljbHR5TG14bGJtZDBhQzB4WFR0cFppaGxQR01tSm1VK1pUQXBlMlV3UFdVN2NtazlhbjE5S1RzS0lDQWdJR3hsZENCek93b2dJQ0FnYVdZb2NtazhNQ2x6UFUxaGRHZ3ViV2x1S0M0dUxsTXVjbTkzY3k1dFlYQW9jM1Z0S1NrcU1TNDFLelE3Q2lBZ0lDQmxiSE5sZTJOdmJuTjBJSEk5VXk1eWIzZHpXM0pwWFN4emRUMXpkVzBvY2lrN2N6MXlMbXhsYm1kMGFEMDlQVFUvYzNVcU16b29jaTVzWlc1bmRHZ3FjaTVzWlc1bmRHZ3FLR010WlRBcEtTODRmUW9nSUNBZ2N5czlUV0YwYUM1eVlXNWtiMjBvS1NveExqVTdhV1lvY3p4aWN5bDdZbk05Y3p0aVpYTjBQV045ZlFvZ0lISmxkSFZ5YmlCaVpYTjBmUXBtZFc1amRHbHZiaUJ5YjNkQ2IzUW9LWHRzWlhRZ1lqMHdMR0p6UFRGbE9UdFRMbkp2ZDNNdVptOXlSV0ZqYUNnb2NpeHFLVDArZTJOdmJuTjBJSE05YzNWdEtISXBLMDFoZEdndWNtRnVaRzl0S0NrcUxqQXhPMmxtS0hNOFluTXBlMkp6UFhNN1lqMXFmWDBwTzNKbGRIVnliaUJpZlFwbWRXNWpkR2x2YmlCelpYUlFhV05yS0drc1l5bDdDaUFnYVdZb0lWZDhmRmN1WTJoYmFWMGhQVDF1ZFd4c2ZId2hTRnRwWFh4OElVaGJhVjB1YVc1amJIVmtaWE1vWXlrcGNtVjBkWEp1SUdaaGJITmxPd29nSUZjdVkyaGJhVjA5WXp0VExuQnBZMnRsWkZ0cFhUMTBjblZsTzJKaktDazdjbVZ1WkdWeUtDazdDaUFnYVdZb1Z5NWphQzVsZG1WeWVTaDRQVDU0SVQwOWJuVnNiQ2twZTJOc1pXRnlWR2x0Wlc5MWRDaFhMblJ2S1R0amIyNXpkQ0IzUFZjN1Z6MXVkV3hzTzNjdWNtVnpLSGN1WTJncGZRb2dJSEpsZEhWeWJpQjBjblZsZlFwbWRXNWpkR2x2YmlCamIyeHNaV04wVUdsamEzTW9aeWw3Y21WMGRYSnVJRzVsZHlCUWNtOXRhWE5sS0hKbGN6MCtld29nSUdOdmJuTjBJR05vUFZNdWNHd3ViV0Z3S0NncFBUNXVkV3hzS1R0WFBYdGphQ3h5WlhNc2RHODZNSDA3Q2lBZ1V5NXdiQzVtYjNKRllXTm9LQ2h3TEdrcFBUNTdhV1lvY0M1aWIzUjhmSEF1WjI5dVpTbHpaWFJVYVcxbGIzVjBLQ2dwUFQ1N2FXWW9iR2wyWlNobktTWW1WeVltVnk1amFEMDlQV05vS1hObGRGQnBZMnNvYVN4aWIzUlFhV05yS0drcEtYMHNNelV3SzAxaGRHZ3VjbUZ1Wkc5dEtDa3FNVEF3TUNsOUtUc0tJQ0JwWmloamRIZ3ViVzlrWlQwOVBTZHVaWFFuS1h0WExuUnZQWE5sZEZScGJXVnZkWFFvS0NrOVBudHBaaWdoYkdsMlpTaG5LWHg4SVZkOGZGY3VZMmdoUFQxamFDbHlaWFIxY200N1V5NXdiQzVtYjNKRllXTm9LQ2h3TEdrcFBUNTdhV1lvVnlZbVZ5NWphRDA5UFdOb0ppWmphRnRwWFQwOVBXNTFiR3dwYzJWMFVHbGpheWhwTEdKdmRGQnBZMnNvYVNrcGZTbDlMRkJKUTB0ZlZDb3hNREF3S3pFMU1EQXBmUXA5S1gwS1puVnVZM1JwYjI0Z2MyVjBVbTkzS0drc2NpbDdhV1lvSVZKWGZIeFNWeTVwSVQwOWFYeDhJU2h5UGowd0ppWnlQRFFwS1hKbGRIVnlianRqYkdWaGNsUnBiV1Z2ZFhRb1VsY3VkRzhwTzJOdmJuTjBJSGM5VWxjN1VsYzliblZzYkR0M0xuSmxjeWh5S1gwS1puVnVZM1JwYjI0Z1kyaHZiM05sVW05M0tHY3NhU2w3Y21WMGRYSnVJRzVsZHlCUWNtOXRhWE5sS0hKbGN6MCtld29nSUdOdmJuTjBJSEE5VXk1d2JGdHBYVHNLSUNCcFppaHdMbUp2ZEh4OGNDNW5iMjVsS1h0elpYUlVhVzFsYjNWMEtDZ3BQVDV5WlhNb2NtOTNRbTkwS0NrcExEY3dNQ2s3Y21WMGRYSnVmUW9nSUZKWFBYdHBMSEpsY3l4MGJ6b3dmVHNLSUNCcFppaGpkSGd1Ylc5a1pUMDlQU2R1WlhRbktWSlhMblJ2UFhObGRGUnBiV1Z2ZFhRb0tDazlQbnRwWmloU1Z5WW1VbGN1YVQwOVBXa3BlMk52Ym5OMElIYzlVbGM3VWxjOWJuVnNiRHQzTG5KbGN5aHliM2RDYjNRb0tTbDlmU3hTVDFkZlZDb3hNREF3S3pFMU1EQXBmU2w5Q21GemVXNWpJR1oxYm1OMGFXOXVJSEJzWVdObFEyRnlaQ2huTEdrc1l5bDdDaUFnYkdWMElISnBQUzB4TEdKbGMzUTlNRHRUTG5KdmQzTXVabTl5UldGamFDZ29jaXhxS1QwK2UyTnZibk4wSUdVOWNsdHlMbXhsYm1kMGFDMHhYVHRwWmlobFBHTW1KbVUrWW1WemRDbDdZbVZ6ZEQxbE8zSnBQV3A5ZlNrN0NpQWdiR1YwSUhSaGEyVTlabUZzYzJVN0NpQWdhV1lvY21rOE1DbDdDaUFnSUNCVExtRnphejE3YVN4amZUdHBaaWhqZEhndWJXOWtaVDA5UFNkdVpYUW5KaVloVXk1d2JGdHBYUzVpYjNRbUppRlRMbkJzVzJsZExtZHZibVVwZTFNdWNtVnRQVkpQVjE5VU8xTXVkR3M5UkdGMFpTNXViM2NvS1gxbGJITmxlMU11Y21WdFBXNTFiR3g5Q2lBZ0lDQmlZeWdwTzNKbGJtUmxjaWdwT3dvZ0lDQWdjbWs5WVhkaGFYUWdZMmh2YjNObFVtOTNLR2NzYVNrN2FXWW9JV3hwZG1Vb1p5a3BjbVYwZFhKdU93b2dJQ0FnVXk1aGMyczliblZzYkR0VExuSmxiVDF1ZFd4c08zUmhhMlU5ZEhKMVpYMEtJQ0JsYkhObElHbG1LRk11Y205M2MxdHlhVjB1YkdWdVozUm9QVDA5TlNsMFlXdGxQWFJ5ZFdVN0NpQWdZMjl1YzNRZ2F6MG9VeTVsZGo5VExtVjJMbXM2TUNrck1Uc0tJQ0JwWmloMFlXdGxLWHNLSUNBZ0lHTnZibk4wSUhNOWMzVnRLRk11Y205M2MxdHlhVjBwTzFNdWNHVnVXMmxkS3oxek93b2dJQ0FnVXk1bGRqMTdheXgwT2lkMFlXdGxKeXhwTEhNc2NqcHlhU3h3YURveGZUdGlZeWdwTzNKbGJtUmxjaWdwTzJGM1lXbDBJSE5zWldWd0tERXdNREFwTzJsbUtDRnNhWFpsS0djcEtYSmxkSFZ5YmpzS0lDQWdJRk11Y205M2MxdHlhVjA5VzJOZE8xTXViM2R1VzJOZFBXazdVeTVsZGoxN2F5eDBPaWQwWVd0bEp5eHBMSE1zY2pweWFTeHdhRG95ZlR0VExteGhjM1E5WXp0aVl5Z3BPM0psYm1SbGNpZ3BPMkYzWVdsMElITnNaV1Z3S0RVd01Da0tJQ0I5Wld4elpYc0tJQ0FnSUZNdWNtOTNjMXR5YVYwdWNIVnphQ2hqS1R0VExtOTNibHRqWFQxcE8xTXVaWFk5ZTJzc2REb25jSFYwSnl4cExISTZjbWw5TzFNdWJHRnpkRDFqTzJKaktDazdjbVZ1WkdWeUtDazdZWGRoYVhRZ2MyeGxaWEFvTlRVd0tYMTlDbVoxYm1OMGFXOXVJSE5sYm1SSVlXNWtjeWdwZXdvZ0lHbG1LQ0ZTZkh3aGFYTkliM04wS1hKbGRIVnlianNLSUNCVExuQnNMbVp2Y2tWaFkyZ29LSEFzYVNrOVBudHBaaWdoY0M1aWIzUW1KbkF1Y0NFOVBXMTVVR1ZsY2lncEtWSXVaVzFwZENnbmFHRnVaQ2NzZTNSdk9uQXVjQ3hvWVc1a09raGJhVjE4ZkZ0ZGZTa3VZMkYwWTJnb0tDazlQbnQ5S1gwcGZRcGhjM2x1WXlCbWRXNWpkR2x2YmlCd2JHRjVVbTkxYm1Rb1p5bDdDaUFnWTI5dWMzUWdaR1ZqYXoxemFIVm1abXhsS0ZzdUxpNUJjbkpoZVNneE1EUXBYUzV0WVhBb0tGOHNhU2s5UG1rck1Ta3BPd29nSUVnOVV5NXdiQzV0WVhBb0tDazlQbVJsWTJzdWMzQnNhV05sS0RBc01UQXBMbk52Y25Rb0tHRXNZaWs5UG1FdFlpa3BPd29nSUZNdWNtOTNjejFiVzJSbFkyc3VjRzl3S0NsZExGdGtaV05yTG5CdmNDZ3BYU3hiWkdWamF5NXdiM0FvS1Ywc1cyUmxZMnN1Y0c5d0tDbGRYVHNLSUNCVExtOTNiajE3ZlR0VExuQmxiajFUTG5Cc0xtMWhjQ2dvS1QwK01DazdVeTUwZFhKdVBUQTdVeTV3YkdGNVpXUTlXMTA3VXk1amRYSTlMVEU3VXk1aGMyczliblZzYkR0VExtVjJQVzUxYkd3N1V5NXNZWE4wUFRBN1V5NW9ZejFJTG0xaGNDaG9QVDVvTG14bGJtZDBhQ2s3VXk1eVpXMDliblZzYkRzS0lDQnpaVzVrU0dGdVpITW9LVHRUTG5OMFpYQTlKMlJsWVd3bk8ySmpLQ2s3Y21WdVpHVnlLQ2s3WVhkaGFYUWdjMnhsWlhBb01UQXdNQ2s3YVdZb0lXeHBkbVVvWnlrcGNtVjBkWEp1T3dvZ0lHWnZjaWhzWlhRZ2REMHhPM1E4UFRFd08zUXJLeWw3Q2lBZ0lDQlRMblIxY200OWREdFRMbk4wWlhBOUozQnBZMnNuTzFNdWNHbGphMlZrUFZNdWNHd3ViV0Z3S0NncFBUNW1ZV3h6WlNrN1V5NXdiR0Y1WldROVcxMDdVeTVqZFhJOUxURTdVeTVoYzJzOWJuVnNiRHNLSUNBZ0lHbG1LR04wZUM1dGIyUmxQVDA5SjI1bGRDY3BlMU11Y21WdFBWQkpRMHRmVkR0VExuUnJQVVJoZEdVdWJtOTNLQ2w5Wld4elpTQlRMbkpsYlQxdWRXeHNPd29nSUNBZ1ltTW9LVHR5Wlc1a1pYSW9LVHNLSUNBZ0lHTnZibk4wSUdOb1BXRjNZV2wwSUdOdmJHeGxZM1JRYVdOcmN5aG5LVHRwWmlnaGJHbDJaU2huS1NseVpYUjFjbTQ3Q2lBZ0lDQlRMbkpsYlQxdWRXeHNPd29nSUNBZ1kyZ3VabTl5UldGamFDZ29ZeXhwS1QwK1NGdHBYUzV6Y0d4cFkyVW9TRnRwWFM1cGJtUmxlRTltS0dNcExERXBLVHNLSUNBZ0lGTXVhR005U0M1dFlYQW9hRDArYUM1c1pXNW5kR2dwT3dvZ0lDQWdVeTV6ZEdWd1BTZHphRzkzSnp0VExuQnNZWGxsWkQxamFDNXRZWEFvS0dNc2FTazlQaWg3YVgwcEtUdGlZeWdwTzNKbGJtUmxjaWdwTzJGM1lXbDBJSE5zWldWd0tEWTFNQ2s3YVdZb0lXeHBkbVVvWnlrcGNtVjBkWEp1T3dvZ0lDQWdVeTV3YkdGNVpXUTlZMmd1YldGd0tDaGpMR2twUFQ0b2Uya3NZMzBwS1M1emIzSjBLQ2hoTEdJcFBUNWhMbU10WWk1aktUdGlZeWdwTzNKbGJtUmxjaWdwTzJGM1lXbDBJSE5zWldWd0tERXdNREFwTzJsbUtDRnNhWFpsS0djcEtYSmxkSFZ5YmpzS0lDQWdJR1p2Y2loc1pYUWdhejB3TzJzOFV5NXdiR0Y1WldRdWJHVnVaM1JvTzJzckt5bDdDaUFnSUNBZ0lGTXVZM1Z5UFdzN1ltTW9LVHR5Wlc1a1pYSW9LVHRoZDJGcGRDQnpiR1ZsY0NnMk1EQXBPMmxtS0NGc2FYWmxLR2NwS1hKbGRIVnlianNLSUNBZ0lDQWdZWGRoYVhRZ2NHeGhZMlZEWVhKa0tHY3NVeTV3YkdGNVpXUmJhMTB1YVN4VExuQnNZWGxsWkZ0clhTNWpLVHRwWmlnaGJHbDJaU2huS1NseVpYUjFjbTU5Q2lBZ0lDQlRMbU4xY2owdE1UdHpaVzVrU0dGdVpITW9LVHRpWXlncE8zSmxibVJsY2lncGZRb2dJRk11ZEc5MFBWTXVkRzkwTG0xaGNDZ29lQ3hwS1QwK0tIaDhmREFwSzFNdWNHVnVXMmxkS1R0VExuSndQVk11Y0dWdUxuTnNhV05sS0NrN1V5NXdaVzQ5VXk1d2JDNXRZWEFvS0NrOVBqQXBPMU11Y0d4aGVXVmtQVnRkTzFNdWMzUmxjRDBuY21WdVpDZDlDbUZ6ZVc1aklHWjFibU4wYVc5dUlISjFia2RoYldVb1p5bDdDaUFnVXk1MGIzUTlVeTV3YkM1dFlYQW9LQ2s5UGpBcE8xTXVjbTVrUFRBN0NpQWdkMmhwYkdVb2RISjFaU2w3Q2lBZ0lDQlRMbkp1WkNzck8yRjNZV2wwSUhCc1lYbFNiM1Z1WkNobktUdHBaaWdoYkdsMlpTaG5LU2x5WlhSMWNtNDdDaUFnSUNCamIyNXpkQ0J2ZG1WeVBWTXViVzlrWlQwOVBTZHlKM3g4VFdGMGFDNXRZWGdvTGk0dVV5NTBiM1FwUGoxTVNVMDdDaUFnSUNCcFppaHZkbVZ5S1h0VExuQm9QU2RsYm1Rbk8xTXVjM1JsY0Qwbkp6dGlZeWdwTzNKbGJtUmxjaWdwTzNKbGRIVnlibjBLSUNBZ0lHSmpLQ2s3Y21WdVpHVnlLQ2s3WVhkaGFYUWdjMnhsWlhBb056QXdNQ2s3YVdZb0lXeHBkbVVvWnlrcGNtVjBkWEp1ZlgwS1puVnVZM1JwYjI0Z2MzUmhjblJIWVcxbEtDbDdDaUFnYVdZb0lWTjhmRk11Y0d3dWJHVnVaM1JvUERJcGNtVjBkWEp1T3dvZ0lFZEZUaXNyTzJOdmJuTjBJR2M5UjBWT093b2dJRk05ZXk0dUxsTXNjR2c2SjNCc1lYa25MSE5wWkRwVExuTnBaQ3N4TEdkcFpEcEVZWFJsTG01dmR5Z3BMblJ2VTNSeWFXNW5LRE0yS1N4aGJHdzZZM1I0TG0xdlpHVTlQVDBuYm1WMEp6OVRMbkJzTG1acGJIUmxjaWh3UFQ0aGNDNWliM1FwTG0xaGNDaHdQVDRvZTNWcFpEcHdMbkFzYm1GdFpUcHdMbTU5S1NrNlcxMHNjbTkzY3pwYlhTeHdiR0Y1WldRNlcxMHNjR2xqYTJWa09sdGRMSFJ2ZERwYlhTeHdaVzQ2VzEwc2NuQTZXMTBzYUdNNlcxMHNiM2R1T250OUxITjBaWEE2SjJSbFlXd25MSFIxY200Nk1DeHlibVE2TUgwN0NpQWdjMlZzUFc1MWJHdzdiWGxJWVc1a1BWdGRPMkpqS0NrN2NtVnVaR1Z5S0NrN2NuVnVSMkZ0WlNobktYMEtMeW9nUFQwOVBUMDlQVDA5UFQwOVBUMDlQVDBnVlVrZ1BUMDlQVDA5UFQwOVBUMDlQVDA5UFQwZ0tpOEtablZ1WTNScGIyNGdjbVZ1WkdWeUtDbDdhV1lvSVZNcGNtVjBkWEp1TzJsbUtGTXVjR2c5UFQwbmJHOWlZbmtuS1hza0tDY2paVzVrSnlrdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmIyNG5LVHR6YUc5M0tDZHNiMkppZVNjcE8zSmxibVJsY2t4dlltSjVLQ2w5Wld4elpYdHphRzkzS0NkbllXMWxKeWs3Y21WdVpHVnlSMkZ0WlNncGZYMEtablZ1WTNScGIyNGdjbVZ1WkdWeVRHOWlZbmtvS1hzS0lDQmpiMjV6ZENCdVpYUTlZM1I0TG0xdlpHVTlQVDBuYm1WMEp6c0tJQ0FrS0NjamJHTW5LUzV6ZEhsc1pTNWthWE53YkdGNVBXNWxkRDhuSnpvbmJtOXVaU2M3SkNnbkkyeGpKeWt1ZEdWNGRFTnZiblJsYm5ROVkzUjRMbU52WkdWOGZDY25Pd29nSUdOdmJuTjBJR05oYmowaGJtVjBmSHhwYzBodmMzUTdDaUFnSkNnbkkzQnNjeWNwTG1sdWJtVnlTRlJOVEQxVExuQnNMbTFoY0Nod1BUNWdQR1JwZGlCamJHRnpjejBpY0dNZ2JHOWlJRzl1SWlCemRIbHNaVDBpTFMxak9pUjdjQzVqZlNJK1BHaytQQzlwUGp4bGJUNGtlMlZ6WXlod0xtNHBmU1I3Y0M1b2IzTjBQeWNnOEorUmtTYzZKeWQ5Skh0d0xtSnZkRDhuSVBDZnBKWW5PaWNuZlR3dlpXMCtQQzlrYVhZK1lDa3VhbTlwYmlnbkp5bDhmQ2M4Y0NCamJHRnpjejBpYUdsdWRDSSt4WUhFaFdONlpXNXBaU0I2SUhCdmEyOXFaVzNpZ0tZOEwzQStKenNLSUNBa0tDY2piV1FuS1M1cGJtNWxja2hVVFV3OVcxc25jaWNzSjBwbFpHNWhJSEoxYm1SaEoxMHNXeWRuSnl3blJHOGdKeXRNU1Uwckp5RGlsNDhuWFYwdWJXRndLQ2hiYXl4MFhTazlQbUE4WW5WMGRHOXVJR05zWVhOelBTSWtlMU11Ylc5a1pUMDlQV3MvSjNObGJDYzZKeWQ5SWlCa1lYUmhMVzA5SWlSN2EzMGlKSHRqWVc0L0p5YzZKeUJrYVhOaFlteGxaQ2Q5UGlSN2RIMDhMMkoxZEhSdmJqNWdLUzVxYjJsdUtDY25LVHNLSUNCamIyNXpkQ0JvZFcwOVV5NXdiQzVtYVd4MFpYSW9jRDArSVhBdVltOTBLUzVzWlc1bmRHZzdDaUFnSkNnbkkyNXVKeWt1ZEdWNGRFTnZiblJsYm5ROVV5NXVZaXNuSUNjcktGTXVibUk5UFQweFB5ZGliM1FuT2lkaWIzVERzM2NuS1RzS0lDQWtLQ2NqYldrbktTNWthWE5oWW14bFpEMGhZMkZ1Zkh4VExtNWlQRDB3Zkh3b1kzUjRMbTF2WkdVOVBUMG5iRzlqWVd3bkppWlRMbTVpUEQweEtUc0tJQ0FrS0NjamNIVW5LUzVrYVhOaFlteGxaRDBoWTJGdWZIeFRMbkJzTG14bGJtZDBhRDQ5VFVGWVVEc0tJQ0FrS0NjamMzUW5LUzV6ZEhsc1pTNWthWE53YkdGNVBXTmhiajhuSnpvbmJtOXVaU2M3SkNnbkkzTjBKeWt1WkdsellXSnNaV1E5VXk1d2JDNXNaVzVuZEdnOE1qc0tJQ0FrS0NjamFHNG5LUzUwWlhoMFEyOXVkR1Z1ZEQxdVpYUS9LR05oYmo4b1V5NXdiQzVzWlc1bmRHZzhNajhuVUc5a1lXb2dlbTVoYW05dGVXMGdhMjlrSUhCdmEyOXFkU0JzZFdJZ1pHOWtZV29nWW05MFlTQW9NdUtBa3pFd0lHZHlZV042ZVNrbk9pZFhlV0pwWlhKNklIUnllV0lnYVNCNllXTjZibWxxSVNjcE9pZEliM04wSUhkNVltbGxjbUVnZEhKNVlpQnBJSE4wWVhKMGRXcGxJR2R5eEprbktUb25WM2xpYVdWeWVpQjBjbmxpSUdrZ2JHbGplbUxFbVNCaWIzVERzM2NnS0RIaWdKTTVLU2Q5Q21aMWJtTjBhVzl1SUdOb2FYQklLR2tzWlhoMGNtRXBlMk52Ym5OMElIQTlVeTV3YkZ0cFhTeHRhVDF0ZVVsa2VDZ3BPd29nSUdOdmJuTjBJSGRoYVhROVV5NXpkR1Z3UFQwOUozQnBZMnNuSmlZaFV5NXdhV05yWldSYmFWMG1KaUZ3TG1kdmJtVXNZV04wUFZNdVlYTnJKaVpUTG1GemF5NXBQVDA5YVRzS0lDQmpiMjV6ZENCMFBYUnZkR0ZzS0drcExHbHVZejFXTG1KMWJYQW1KbFl1WW5WdGNGdHBYVHNLSUNCeVpYUjFjbTRnWUR4a2FYWWdZMnhoYzNNOUluQmpKSHRoWTNRL0p5QnZiaWM2ZDJGcGREOG5JSGQwSnpvbkozMGtlM0F1WjI5dVpUOG5JR2R2Ym1Vbk9pY25mU1I3YVc1alB5Y2dZblZ0Y0NjNkp5ZDlJaUJ6ZEhsc1pUMGlMUzFqT2lSN2NDNWpmU0krUEdrK1BDOXBQanhsYlQ0a2UyVnpZeWh3TG00cGZTUjdhVDA5UFcxcEppWmpkSGd1Ylc5a1pUMDlQU2R1WlhRblB5Y2dLRlI1S1NjNkp5ZDlKSHR3TG1KdmREOG5JUENmcEpZbk9pY25mVHd2WlcwK0pIdFRMbk4wWlhBOVBUMG5jR2xqYXljbUpsTXVjR2xqYTJWa1cybGRQeWM4YzIxaGJHdys0cHlVUEM5emJXRnNiRDRuT2ljbmZUeGlQaVI3ZEgwOEwySStQQzlrYVhZK1lIMEtablZ1WTNScGIyNGdjbVZ1WkdWeVIyRnRaU2dwZXdvZ0lHTnZibk4wSUcxcFBXMTVTV1I0S0Nrc2NHdzlVeTV3YkRzS0lDQmpiMjV6ZENCemFXdzlWaTV6YVdRaFBUMVRMbk5wWkh4OFZpNXlibVFoUFQxVExuSnVaRHNLSUNCcFppaFdMbk5wWkNFOVBWTXVjMmxrS1h0V1BYdHphV1E2VXk1emFXUXNjMlZsYmpwdVpYY2dVMlYwS0Nrc2RHOTBPbE11Y0d3dWJXRndLQ2dwUFQ0d0tYMDdjMlZzUFc1MWJHeDlDaUFnYVdZb1ZpNXlibVFoUFQxVExuSnVaQ2w3Vmk1eWJtUTlVeTV5Ym1RN1ZpNXpaV1Z1UFc1bGR5QlRaWFFvS1R0V0xtVjJhejB3TzFZdVpXNWtVMmh2ZDI0OVptRnNjMlU3SkNnbkkyVnVaQ2NwTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjI5dUp5azdjMlZzUFc1MWJHeDlDaUFnVmk1aWRXMXdQWEJzTG0xaGNDZ29jQ3hwS1QwK2RHOTBZV3dvYVNrK0tGWXVkRzkwVzJsZGZId3dLU1ltSVhOcGJDazdDaUFnWTI5dWMzUWdZblZ0Y0hNOVZpNWlkVzF3T3dvZ0lDUW9KeU5wYm1adkp5a3VkR1Y0ZEVOdmJuUmxiblE5VXk1emRHVndQVDA5SjJSbFlXd25QeWRTYjNwa1lXcGxiWG5pZ0tZbk9tQlNkVzVrWVNBa2UxTXVjbTVrZlNEQ3R5QlVkWEpoSUNSN1V5NTBkWEp1Zkh3eGZTOHhNR0E3Q2lBZ0pDZ25JMmRqSnlrdWRHVjRkRU52Ym5SbGJuUTlZM1I0TG1OdlpHVjhmQ2NuT3dvZ0lDUW9KeU56WWljcExtbHVibVZ5U0ZSTlREMXdiQzV0WVhBb0tIQXNhU2s5UG1Ob2FYQklLR2twS1M1cWIybHVLQ2NuS1RzS0lDQldMblJ2ZEQxd2JDNXRZWEFvS0hBc2FTazlQblJ2ZEdGc0tHa3BLVHNLSUNBdktpQnllc1NaWkhrZ0tpOEtJQ0JqYjI1emRDQmhjMnM5VXk1aGMyc21KbE11WVhOckxtazlQVDF0YVNZbWJXaytQVEFzWlhZOVV5NWxkanNLSUNBa0tDY2pjbTkzY3ljcExtbHVibVZ5U0ZSTlREMVRMbkp2ZDNNdWJXRndLQ2h5TEdvcFBUNTdDaUFnSUNCamIyNXpkQ0J6Ykc5MGN6MWJMaTR1UVhKeVlYa29OU2xkTG0xaGNDZ29YeXhyS1QwK2UyTnZibk4wSUdNOWNsdHJYVHNLSUNBZ0lDQWdhV1lvWXowOVBYVnVaR1ZtYVc1bFpDbHlaWFIxY200Z1lEeGthWFlnWTJ4aGMzTTlJbk5zSkh0clBUMDlORDhuSUd3MUp6b25KMzBpUGp3dlpHbDJQbUE3Q2lBZ0lDQWdJR052Ym5OMElHNDlJVll1YzJWbGJpNW9ZWE1vWXlrc2IzYzlVeTV2ZDI0bUpsTXViM2R1VzJOZE8zSmxkSFZ5YmlCZ1BHUnBkaUJqYkdGemN6MGljMndpUGlSN1kyRnlaRWdvWXl4N2NHOXdPbTRtSmlGemFXd21KbU05UFQxVExteGhjM1FzYjNjNmRIbHdaVzltSUc5M1BUMDlKMjUxYldKbGNpYy9iM2M2TFRGOUtYMDhMMlJwZGo1Z2ZTa3VhbTlwYmlnbkp5azdDaUFnSUNCamIyNXpkQ0JtYkdGemFEMWxkaVltWlhZdWREMDlQU2QwWVd0bEp5WW1aWFl1Y0dnOVBUMHhKaVpsZGk1eVBUMDlhaVltVmk1bGRtc2hQVDFsZGk1ck93b2dJQ0FnY21WMGRYSnVJR0E4WkdsMklHTnNZWE56UFNKeWR5UjdZWE5yUHljZ2NHc25PaWNuZlNSN1pteGhjMmcvSnlCMGF5YzZKeWQ5SWlCa1lYUmhMWEk5SWlSN2FuMGlQaVI3YzJ4dmRITjlQSE53WVc0Z1kyeGhjM005SW5KeklqNGtlM04xYlNoeUtYMGc0cGVQUEM5emNHRnVQand2WkdsMlBtQjlLUzVxYjJsdUtDY25LVHNLSUNCVExuSnZkM011Wm05eVJXRmphQ2h5UFQ1eUxtWnZja1ZoWTJnb1l6MCtWaTV6WldWdUxtRmtaQ2hqS1NrcE93b2dJQzhxSUdWbVpXdDBlU0FxTHdvZ0lHbG1LR1YySmlaV0xtVjJheUU5UFdWMkxtc21KaUZ6YVd3cGV3b2dJQ0FnYVdZb1pYWXVkRDA5UFNkMFlXdGxKeVltWlhZdWNHZzlQVDB4S1h0V0xtVjJhejFsZGk1ck8xTkdMblJoYTJVb0tUdGpiMjV6ZENCd1BYQnNXMlYyTG1sZE8ybG1LSEFwZTJOdmJuTjBJR1k5Wkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25aR2wySnlrN1ppNWpiR0Z6YzA1aGJXVTlKMk5vYVhBbk8yWXVjM1I1YkdVdWMyVjBVSEp2Y0dWeWRIa29KeTB0WXljc2NDNWpLVHRtTG5SbGVIUkRiMjUwWlc1MFBXQWtlM0F1Ym4wNklDc2tlMlYyTG5OOUlPS1hqMkE3SkNnbkkyWjRKeWt1WVhCd1pXNWtRMmhwYkdRb1ppazdjMlYwVkdsdFpXOTFkQ2dvS1QwK1ppNXlaVzF2ZG1Vb0tTd3hOekF3S1gxOUNpQWdJQ0JsYkhObElHbG1LR1YyTG5ROVBUMG5jSFYwSnlsN1ZpNWxkbXM5WlhZdWF6dFRSaTVqWVhKa0tDbDlmUW9nSUdWc2MyVWdhV1lvWlhZbUptVjJMblE5UFQwbmRHRnJaU2NtSm1WMkxuQm9QVDA5TWlZbVZpNWxkbXM5UFQxbGRpNXJLVk5HTG1OaGNtUW9LVHNLSUNCcFppaFdMblIxY200aFBUMVRMblIxY200cFZpNXpaVzUwUFRBN0NpQWdhV1lvVmk1emRHVndJVDA5VXk1emRHVndmSHhXTG5SMWNtNGhQVDFUTG5SMWNtNHBlMmxtS0ZNdWMzUmxjRDA5UFNkemFHOTNKeVltVmk1emRHVndJVDA5SjNOb2IzY25KaVloYzJsc0tWTkdMbVpzYVhBb0tUdHBaaWhUTG5OMFpYQTlQVDBuY0dsamF5Y21KbTFwUGowd0ppWmpkSGd1Ylc5a1pUMDlQU2R1WlhRbkppWWhjMmxzS1ZOR0xtMTVLQ2s3Vmk1emRHVndQVk11YzNSbGNEdFdMblIxY200OVV5NTBkWEp1ZlFvZ0lDOHFJSHBoWjNKaGJtVWdLaThLSUNBa0tDY2pjR3hoZVNjcExtbHVibVZ5U0ZSTlREMVRMbkJzWVhsbFpDNXRZWEFvS0hnc2F5azlQbnRqYjI1emRDQndQWEJzVzNndWFWMDdhV1lvSVhBcGNtVjBkWEp1SnljN0NpQWdJQ0JqYjI1emRDQmpkWEk5YXowOVBWTXVZM1Z5TEdSdVBWTXVZM1Z5UG1zN0NpQWdJQ0J5WlhSMWNtNGdZRHhrYVhZZ1kyeGhjM005SW5CalpDUjdZM1Z5UHljZ1kzVnlKem9uSjMwa2UyUnVQeWNnWkc0bk9pY25mU0lnYzNSNWJHVTlJaTB0WXpva2UzQXVZMzBpUGlSN2VDNWpQVDA5ZFc1a1pXWnBibVZrZkh4NExtTTlQVDF1ZFd4c1AySmhZMnRJS0hBdVl5azZZMkZ5WkVnb2VDNWpLWDA4YzNCaGJqNGtlMlZ6WXlod0xtNHBmVHd2YzNCaGJqNDhMMlJwZGo1Z2ZTa3VhbTlwYmlnbkp5azdDaUFnTHlvZ2NHOWtjRzkzYVdWa3hib2dLaThLSUNCc1pYUWdhRDBuSnp0amIyNXpkQ0J1WVcxbGN6MXBQVDVsYzJNb2NHeGJhVjAvY0d4YmFWMHViam9uUHljcE93b2dJR2xtS0ZNdWMzUmxjRDA5UFNka1pXRnNKeWxvUFNkVVlYTnZkMkZ1YVdVZ2FTQnliM3BrWVhkaGJtbGxJR3RoY25UaWdLWW5Pd29nSUdWc2MyVWdhV1lvVXk1emRHVndQVDA5SjNCcFkyc25LWHNLSUNBZ0lHbG1LRzFwUERBcGFEMG5UMkp6WlhKM2RXcGxjM29nWjNMRW1TYzdDaUFnSUNCbGJITmxJR2xtS0ZNdWNHbGphMlZrVzIxcFhTbG9QV0JEZW1WcllYTjZJRzVoT2lBOFlqNGtlM0JzTG0xaGNDZ29jQ3hwS1QwK0lWTXVjR2xqYTJWa1cybGRQM0F1Ympvbkp5a3VabWxzZEdWeUtFSnZiMnhsWVc0cExtMWhjQ2hsYzJNcExtcHZhVzRvSnl3Z0p5bDhmQ2ZpZ0tZbmZUd3ZZajVnT3dvZ0lDQWdaV3h6WlNCb1BTZFhlV0pwWlhKNklHdGhjblRFbVN3Z2EzVERzM0xFaFNCamFHTmxjM29nZW1GbmNtSEVoeWQ5Q2lBZ1pXeHpaU0JwWmloVExuTjBaWEE5UFQwbmMyaHZkeWNwYUQwblQyUnJjbmwzWVcxNUlHdGhjblI1SVNjN0NpQWdaV3h6WlNCcFppaFRMbUZ6YXlsb1BXRnphejhuUEdJK1ZIZHZhbUVnYTJGeWRHRWdhbVZ6ZENCNllTQnVhWE5yWVNFOEwySStJRXRzYVd0dWFXb2djbnJFaFdRc0lHdDB3N055ZVNCNllXSnBaWEpoYzNvbk9tQThZajRrZTI1aGJXVnpLRk11WVhOckxta3BmVHd2WWo0Z2QzbGlhV1Z5WVNCeWVzU0ZaQ0JrYnlCNllXSnlZVzVwWWVLQXBtQTdDaUFnWld4elpTQnBaaWhUTG5OMFpYQTlQVDBuY21WdVpDY21KbE11Y0dnOVBUMG5jR3hoZVNjcGFEMG5TMjl1YVdWaklISjFibVI1SU9LQWt5QjZZU0JqYUhkcGJNU1pJR3R2YkdWcWJtRW5Pd29nSUdWc2MyVWdhV1lvVXk1amRYSStQVEFtSmxNdWNHeGhlV1ZrVzFNdVkzVnlYU2xvUFdCTFlYSjBZU0E4WWo0a2UxTXVjR3hoZVdWa1cxTXVZM1Z5WFM1amZUd3ZZajRnNG9DVElDUjdibUZ0WlhNb1V5NXdiR0Y1WldSYlV5NWpkWEpkTG1rcGZXQTdDaUFnWTI5dWMzUWdkRDEwYVcxbGNsUjRkQ2dwT3dvZ0lDUW9KeU5vYVc1MEp5a3VhVzV1WlhKSVZFMU1QV2dyS0hRL1lDREN0eUE4YzNCaGJpQnBaRDBpZEcwaVBpUjdkSDA4TDNOd1lXNCtZRG9uSnlrN0NpQWdMeW9nY3NTWmEyRWdLaThLSUNCeVpXNWtaWEpJWVc1a0tDazdDaUFnTHlvZ2EyOXVhV1ZqSUhKMWJtUjVJQzhnWjNKNUlDb3ZDaUFnYVdZb1V5NXdhRDA5UFNkbGJtUW5KaVloVmk1bGJtUlRhRzkzYmlsN1ZpNWxibVJUYUc5M2JqMTBjblZsTzNKbFkxTjBZWFJ6S0NrN2MyVjBWR2x0Wlc5MWRDZ29LVDArWlc1a1UyTnlLR1poYkhObEtTeHphV3cvTWpBd09qRTBNREFwZlFvZ0lHVnNjMlVnYVdZb1V5NXpkR1Z3UFQwOUozSmxibVFuSmlaVExuQm9QVDA5SjNCc1lYa25KaVpXTG5KbGJtUlNibVFoUFQxVExuSnVaQ2w3Vmk1eVpXNWtVbTVrUFZNdWNtNWtPMU5HTG1WdVpDZ3BPM05sZEZScGJXVnZkWFFvS0NrOVBtVnVaRk5qY2loMGNuVmxLU3cwTURBcGZRb2dJR2xtS0ZNdWMzUmxjQ0U5UFNkeVpXNWtKeVltVXk1d2FEMDlQU2R3YkdGNUp5WW1JU1FvSnlObGJtUW5LUzVrWVhSaGMyVjBMbVpwYm1Gc0tTUW9KeU5sYm1RbktTNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHZiaWNwZlFwbWRXNWpkR2x2YmlCMGFXMWxjbFI0ZENncGV3b2dJR2xtS0ZNdWNtVnRQVDF1ZFd4c2ZId2hVeTUwYXlseVpYUjFjbTRuSnpzS0lDQnBaaWhXTG5ScmF5RTlQVk11ZEdzcGUxWXVkR3RyUFZNdWRHczdWaTUwYTNJOVJHRjBaUzV1YjNjb0tYMEtJQ0JqYjI1emRDQnlaVzA5VFdGMGFDNXRZWGdvTUN4TllYUm9MbU5sYVd3b1V5NXlaVzB0S0VSaGRHVXVibTkzS0NrdFZpNTBhM0lwTHpFd01EQXBLVHNLSUNCeVpYUjFjbTRnWU9LUHNTQWtlM0psYlgxellIMEtjMlYwU1c1MFpYSjJZV3dvS0NrOVBudGpiMjV6ZENCbFBTUW9KeU4wYlNjcE8ybG1LR1VtSmxNcFpTNTBaWGgwUTI5dWRHVnVkRDEwYVcxbGNsUjRkQ2dwZlN3MU1EQXBPd3BtZFc1amRHbHZiaUJ5Wlc1a1pYSklZVzVrS0NsN0NpQWdZMjl1YzNRZ2JXazliWGxKWkhnb0tTeG9ZVzVrUFdkbGRFaGhibVFvS1M1emJHbGpaU2dwTG5OdmNuUW9LR0VzWWlrOVBtRXRZaWs3Q2lBZ1kyOXVjM1FnWTJGdVBWTW1KbE11Y0dnOVBUMG5jR3hoZVNjbUpsTXVjM1JsY0QwOVBTZHdhV05ySnlZbWJXaytQVEFtSmlGVExuQnBZMnRsWkZ0dGFWMG1KaUZXTG5ObGJuUTdDaUFnYVdZb2MyVnNJVDA5Ym5Wc2JDWW1JV2hoYm1RdWFXNWpiSFZrWlhNb2MyVnNLU2x6Wld3OWJuVnNiRHNLSUNCamIyNXpkQ0JvWkQwa0tDY2phR0Z1WkNjcE8yaGtMbU5zWVhOelRtRnRaVDFqWVc0L0p5YzZKMjltWmljN0NpQWdhR1F1YVc1dVpYSklWRTFNUFcxcFBEQS9KeWM2YUdGdVpDNXRZWEFvWXowK1kyRnlaRWdvWXl4N2MyVnNPbU05UFQxelpXeDlLU2t1YW05cGJpZ25KeWs3Q2lBZ1kyOXVjM1FnWWowa0tDY2pjR3duS1R0aUxuTjBlV3hsTG1ScGMzQnNZWGs5WTJGdUppWnpaV3doUFQxdWRXeHNQeWNuT2lkdWIyNWxKenRpTG5SbGVIUkRiMjUwWlc1MFBYTmxiQ0U5UFc1MWJHdy9ZRnBoWjNKaGFpQnJZWEoweEprZ0pIdHpaV3g5WURvbkozMEtablZ1WTNScGIyNGdjR3hoZVVOaGNtUW9ZeWw3Q2lBZ1kyOXVjM1FnYldrOWJYbEpaSGdvS1R0cFppaHRhVHd3Zkh3aFUzeDhVeTV6ZEdWd0lUMDlKM0JwWTJzbmZIeFRMbkJwWTJ0bFpGdHRhVjBwY21WMGRYSnVPd29nSUZOR0xuVnBLQ2s3Q2lBZ2FXWW9ZM1I0TG0xdlpHVTlQVDBuYm1WMEp5WW1JV2x6U0c5emRDbDdWaTV6Wlc1MFBXTTdVaTVsYldsMEtDZHdhV05ySnl4N1kzMHBMbU5oZEdOb0tDZ3BQVDU3ZlNrN2MyVnNQVzUxYkd3N2NtVnVaR1Z5U0dGdVpDZ3BPeVFvSnlOb2FXNTBKeWt1YVc1dVpYSklWRTFNUFNkTFlYSjBZU0I2WVdkeVlXNWhJT0tBa3lCamVtVnJZVzE1SUc1aElIQnZlbTl6ZEdIRmdubGphT0tBcGlkOUNpQWdaV3h6Wlh0elpXdzliblZzYkR0elpYUlFhV05yS0cxcExHTXBmWDBLWm5WdVkzUnBiMjRnY205M1EyeHBZMnNvYWlsN1kyOXVjM1FnYldrOWJYbEpaSGdvS1R0cFppZ2hVM3g4SVZNdVlYTnJmSHhUTG1GemF5NXBJVDA5YldrcGNtVjBkWEp1TzFOR0xuVnBLQ2s3Q2lBZ2FXWW9ZM1I0TG0xdlpHVTlQVDBuYm1WMEp5WW1JV2x6U0c5emRDbDdVaTVsYldsMEtDZHliM2NuTEh0eU9tcDlLUzVqWVhSamFDZ29LVDArZTMwcE8xTXVZWE5yUFc1MWJHdzdjbVZ1WkdWeVIyRnRaU2dwZldWc2MyVWdjMlYwVW05M0tHMXBMR29wZlFva0tDY2pjbTkzY3ljcExtOXVZMnhwWTJzOVpUMCtlMk52Ym5OMElISTlaUzUwWVhKblpYUXVZMnh2YzJWemRDZ25MbkozSnlrN2FXWW9jaVltY2k1amJHRnpjMHhwYzNRdVkyOXVkR0ZwYm5Nb0ozQnJKeWtwY205M1EyeHBZMnNvSzNJdVpHRjBZWE5sZEM1eUtYMDdDaVFvSnlOb1lXNWtKeWt1YjI1amJHbGphejFsUFQ1N1kyOXVjM1FnWXoxbExuUmhjbWRsZEM1amJHOXpaWE4wS0NjdVkyUW5LVHRwWmlnaFl5bHlaWFIxY200N1kyOXVjM1FnYmowcll5NWtZWFJoYzJWMExtNDdDaUFnYVdZb2MyVnNQVDA5Ymlsd2JHRjVRMkZ5WkNodUtUdGxiSE5sZTNObGJEMXVPMU5HTG5WcEtDazdjbVZ1WkdWeVNHRnVaQ2dwZlgwN0NpUW9KeU53YkNjcExtOXVZMnhwWTJzOUtDazlQbnRwWmloelpXd2hQVDF1ZFd4c0tYQnNZWGxEWVhKa0tITmxiQ2w5T3dvdktpQjNlVzVwYTJrZ0tpOEtablZ1WTNScGIyNGdjbVZqVTNSaGRITW9LWHNLSUNCcFppaGpkSGd1Ylc5a1pTRTlQU2R1WlhRbmZId2hkMmx1Wkc5M0xsOWZjMkpUZEdGMGMzeDhJVk11WjJsa2ZId2hVeTVoYkd4OGZGTXVZV3hzTG14bGJtZDBhRHd5S1hKbGRIVnlianNLSUNCamIyNXpkQ0JwUFcxNVNXUjRLQ2s3YVdZb2FUd3dLWEpsZEhWeWJqc0tJQ0JqYjI1emRDQmlaWE4wUFUxaGRHZ3ViV2x1S0M0dUxsTXVkRzkwS1N4M1BWTXVkRzkwTG1acGJIUmxjaWg0UFQ1NFBUMDlZbVZ6ZENrdWJHVnVaM1JvT3dvZ0lIZHBibVJ2ZHk1ZlgzTmlVM1JoZEhNb1kzUjRMbU52WkdVc1V5NW5hV1FzVXk1aGJHd3NVeTUwYjNSYmFWMDlQVDFpWlhOMFB5aDNQakUvSjJRbk9pZDNKeWs2SjJ3bktYMEtablZ1WTNScGIyNGdaVzVrVTJOeUtHMXBaQ2w3Q2lBZ2FXWW9JVk1wY21WMGRYSnVPd29nSUdOdmJuTjBJR1pwYm1Gc1BWTXVjR2c5UFQwblpXNWtKenRwWmlnaFptbHVZV3dtSmxNdWMzUmxjQ0U5UFNkeVpXNWtKeWx5WlhSMWNtNDdDaUFnWTI5dWMzUWdjbXM5VXk1d2JDNXRZWEFvS0hBc2FTazlQaWg3Y0N4cExITTZVeTUwYjNSYmFWMThmREFzWkRvb1V5NXljQ1ltVXk1eWNGdHBYU2w4ZkRCOUtTa3VjMjl5ZENnb1lTeGlLVDArWVM1ekxXSXVjeWtzZEc5d1BYSnJMbVpwYkhSbGNpaDRQVDU0TG5NOVBUMXlhMXN3WFM1ektUc0tJQ0JqYjI1emRDQnRaV1JoYkQxYkovQ2ZwWWNuTENmd242V0lKeXduOEorbGlTZGRPMnhsZENCd2IzTTlNQ3h3Y21WMlBXNTFiR3c3Q2lBZ1kyOXVjM1FnY205M2N6MXlheTV0WVhBb0tIZ3NheWs5UG50cFppaDRMbk1oUFQxd2NtVjJLWHR3YjNNOWF6dHdjbVYyUFhndWMzMXlaWFIxY200Z1lEeGthWFlnWTJ4aGMzTTlJbkJqSUc5dUlpQnpkSGxzWlQwaUxTMWpPaVI3ZUM1d0xtTjlJajQ4YzNCaGJpQmpiR0Z6Y3owaWNtc2lQaVI3Wm1sdVlXd21KbkJ2Y3p3elAyMWxaR0ZzVzNCdmMxMDZjRzl6S3pFckp5NG5mVHd2YzNCaGJqNDhhVDQ4TDJrK1BHVnRQaVI3WlhOaktIZ3VjQzV1S1gwOEwyVnRQanh6YldGc2JENGtlMU11Ylc5a1pUMDlQU2RuSjN4OElXWnBibUZzUHljckp5dDRMbVE2SnlkOVBDOXpiV0ZzYkQ0OFlqNGtlM2d1YzMwZzRwZVBQQzlpUGp3dlpHbDJQbUI5S1M1cWIybHVLQ2NuS1RzS0lDQnNaWFFnWm05dmREMG5KenNLSUNCcFppaG1hVzVoYkNsN1kyOXVjM1FnWVdkaGFXNDlZM1I0TG0xdlpHVTlQVDBuYkc5allXd25mSHhwYzBodmMzUS9KenhpZFhSMGIyNGdhV1E5SW1GbklpQmpiR0Z6Y3owaVoyOGlQbHBoWjNKaGFpQndiMjV2ZDI1cFpUd3ZZblYwZEc5dVBpYzZKenh3SUdOc1lYTnpQU0pvYVc1MElqNURlbVZyWVcxNUlHNWhJR2h2YzNSaDRvQ21QQzl3UGljN1ptOXZkRDFnUEdScGRpQmpiR0Z6Y3owaWNtOTNNaUkrSkh0aFoyRnBibjA4WW5WMGRHOXVJR2xrUFNKdGJqSWlJR05zWVhOelBTSm5hRzl6ZENJK1RXVnVkVHd2WW5WMGRHOXVQand2WkdsMlBtQjlDaUFnWld4elpTQm1iMjkwUFNjOGNDQmpiR0Z6Y3owaWFHbHVkQ0krV21FZ1kyaDNhV3pFbVNCcmIyeGxhbTVoSUhKMWJtUmhJQ2hrYnlBbksweEpUU3NuSU9LWGp5azhMM0ErSnpzS0lDQWtLQ2NqWlc1a0p5a3VaR0YwWVhObGRDNW1hVzVoYkQxbWFXNWhiRDhuTVNjNkp5YzdDaUFnSkNnbkkyVnVaQ2NwTG1sdWJtVnlTRlJOVEQxZ1BHUnBkaUJqYkdGemN6MGliVzlrWVd3aVBqeG9NajRrZTJacGJtRnNQeWgwYjNBdWJHVnVaM1JvUGpFL0oxSmxiV2x6SVNEd242U2RKenBsYzJNb2RHOXdXekJkTG5BdWJpa3JKeUIzZVdkeWVYZGhJU0R3bjQrR0p5azZKMHR2Ym1sbFl5QnlkVzVrZVNBbksxTXVjbTVrZlR3dmFESStKSHRtYVc1aGJEOG5QSEFnWTJ4aGMzTTlJbWhwYm5RaUlITjBlV3hsUFNKMFpYaDBMV0ZzYVdkdU9tTmxiblJsY2lJK1YzbG5jbmwzWVNCdVlXcHRibWxsYWlEaWw0OGdLR0o1WTNwNVkyZ2daOFdDdzdOM0tUd3ZjRDRuT2ljbmZTUjdjbTkzYzMwa2UyWnZiM1I5UEM5a2FYWStZRHNLSUNBa0tDY2paVzVrSnlrdVkyeGhjM05NYVhOMExtRmtaQ2duYjI0bktUc0tJQ0JwWmlobWFXNWhiQ2w3VTBZdWQybHVLQ2s3WTI5dVptVjBkR2tvS1R0amIyNXpkQ0JoUFNRb0p5TmhaeWNwTzJsbUtHRXBZUzV2Ym1Oc2FXTnJQU2dwUFQ1N1IwVk9LeXM3VnoxU1Z6MXVkV3hzTzFNOWV5NHVMbE1zY0dnNkoyeHZZbUo1Snl4emFXUTZVeTV6YVdSOU8ybG1LR04wZUM1dGIyUmxQVDA5SjI1bGRDY3BjM2x1WXlncE8yVnNjMlY3Y21WdVpHVnlLQ2w5ZlRza0tDY2piVzR5SnlrdWIyNWpiR2xqYXoxc1pXRjJaWDE5Q21aMWJtTjBhVzl1SUdOdmJtWmxkSFJwS0NsN1kyOXVjM1FnZHowa0tDY2pZMjl1WmljcE8zY3VhVzV1WlhKSVZFMU1QU2NuTzJadmNpaHNaWFFnYVQwd08yazhPREE3YVNzcktYdGpiMjV6ZENCelBXUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjJrbktUdHpMbk4wZVd4bExtTnpjMVJsZUhROVlHeGxablE2Skh0TllYUm9MbkpoYm1SdmJTZ3BLakV3TUgwbE8ySmhZMnRuY205MWJtUTZKSHRRUVV4YmFTVlFRVXd1YkdWdVozUm9YWDA3WVc1cGJXRjBhVzl1TFdSbGJHRjVPaVI3VFdGMGFDNXlZVzVrYjIwb0tYMXpPMkZ1YVcxaGRHbHZiaTFrZFhKaGRHbHZiam9rZXpJclRXRjBhQzV5WVc1a2IyMG9LU295ZlhNN0xTMWtlRG9rZXloTllYUm9MbkpoYm1SdmJTZ3BMUzQxS1NveU5EQjljSGhnTzNjdVlYQndaVzVrUTJocGJHUW9jeWw5YzJWMFZHbHRaVzkxZENnb0tUMCtkeTVwYm01bGNraFVUVXc5Snljc05UVXdNQ2w5Q2k4cUlEMDlQVDA5UFQwOVBUMDlQVDA5UFQwOUlGTkpSY1NHSUQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5SUNvdkNtWjFibU4wYVc5dUlHeHZZMkZzVUd3b2JtSXBlMk52Ym5OMElIVTlXMjFsTG1OdmJGMHNZVDFiZTNBNkoyMWxKeXh1T20xbExtNWhiV1VzWXpwdFpTNWpiMng5WFR0bWIzSW9iR1YwSUdrOU1EdHBQRzVpTzJrckt5bDdZMjl1YzNRZ1l6MXdhV05yUTI5c0tDY25MSFVwTzNVdWNIVnphQ2hqS1R0aExuQjFjMmdvZTNBNkoySnZkQ2NyYVN4dU9rSlBWRTViYVYwc1l5eGliM1E2ZEhKMVpYMHBmWEpsZEhWeWJpQmhmUXBtZFc1amRHbHZiaUJ6ZVc1aktDbDdDaUFnYVdZb0lWSjhmQ0ZwYzBodmMzUXBjbVYwZFhKdU93b2dJR052Ym5OMElIQnlQWEE5UG5BdWNISmxjMlZ1WTJWOGZIdDlMSEJsWlhKelBWSXVjR1ZsY25Nb0tTNXpiR2xqWlNncExuTnZjblFvS0dFc1lpazlQaWh3Y2loaUtTNW9iM04wUHpFNk1Da3RLSEJ5S0dFcExtaHZjM1EvTVRvd0tYeDhLQ3R3Y2loaEtTNTBjM3g4TUNrdEtDdHdjaWhpS1M1MGMzeDhNQ2w4ZkNoaExuQmxaWEk4WWk1d1pXVnlQeTB4T2pFcEtTeGhiR2wyWlQxdVpYY2dVMlYwS0hCbFpYSnpMbTFoY0Nod1BUNXdMbkJsWlhJcEtUc0tJQ0JwWmloVExuQm9QVDA5SjJ4dlltSjVKeWw3Q2lBZ0lDQndaV1Z5Y3k1bWIzSkZZV05vS0hBOVBudHBaaWdoYjNKa0xtbHVZMngxWkdWektIQXVjR1ZsY2lrcGIzSmtMbkIxYzJnb2NDNXdaV1Z5S1gwcE93b2dJQ0FnYjNKa1BXOXlaQzVtYVd4MFpYSW9lRDArWVd4cGRtVXVhR0Z6S0hncEtUc0tJQ0FnSUdOdmJuTjBJSFZ6WldROVcxMHNjR3c5VzEwN0NpQWdJQ0J2Y21RdWMyeHBZMlVvTUN4TlFWaFFLUzVtYjNKRllXTm9LSEJsUFQ1N1kyOXVjM1FnY0Qxd1pXVnljeTVtYVc1a0tIRTlQbkV1Y0dWbGNqMDlQWEJsS1N4eFBYQnlLSEFwTEdNOWNHbGphME52YkNoeExtTnZiQ3gxYzJWa0tUdDFjMlZrTG5CMWMyZ29ZeWs3Y0d3dWNIVnphQ2g3Y0Rwd1pTeHVPbU5zWldGdVRpaHhMbTVoYldVcGZId25SM0poWTNvbkxHTXNhRzl6ZERvaElYRXVhRzl6ZEgwcGZTazdDaUFnSUNCd2JDNXpiM0owS0NoaExHSXBQVDRvWWk1b2IzTjBQekU2TUNrdEtHRXVhRzl6ZEQ4eE9qQXBLVHNLSUNBZ0lHTnZibk4wSUc1aVBVMWhkR2d1YldGNEtEQXNUV0YwYUM1dGFXNG9VeTV1WWl4TlFWaFFMWEJzTG14bGJtZDBhQ2twT3dvZ0lDQWdabTl5S0d4bGRDQnBQVEE3YVR4dVlqdHBLeXNwZTJOdmJuTjBJR005Y0dsamEwTnZiQ2duSnl4MWMyVmtLVHQxYzJWa0xuQjFjMmdvWXlrN2NHd3VjSFZ6YUNoN2NEb25ZbTkwSnl0cExHNDZRazlVVGx0cFhTeGpMR0p2ZERwMGNuVmxmU2w5Q2lBZ0lDQlRQWHN1TGk1VExIQnNMRzVpZlFvZ0lIMWxiSE5sZXdvZ0lDQWdVejE3TGk0dVV5eHdiRHBUTG5Cc0xtMWhjQ2h3UFQ0b2V5NHVMbkFzWjI5dVpUb2hjQzVpYjNRbUppRmhiR2wyWlM1b1lYTW9jQzV3S1gwcEtYMDdDaUFnSUNCcFppaFhLVk11Y0d3dVptOXlSV0ZqYUNnb2NDeHBLVDArZTJsbUtIQXVaMjl1WlNZbVZ5NWphRnRwWFQwOVBXNTFiR3dwYzJWMFZHbHRaVzkxZENnb0tUMCtWeVltYzJWMFVHbGpheWhwTEdKdmRGQnBZMnNvYVNrcExEUXdNQ2w5S1RzS0lDQWdJR2xtS0ZKWEppWlRMbkJzVzFKWExtbGRKaVpUTG5Cc1cxSlhMbWxkTG1kdmJtVXBlMk52Ym5OMElIYzlVbGM3VWxjOWJuVnNiRHRqYkdWaGNsUnBiV1Z2ZFhRb2R5NTBieWs3ZHk1eVpYTW9jbTkzUW05MEtDa3BmWDBLSUNCaVl5Z3BPM0psYm1SbGNpZ3BmUXBoYzNsdVl5Qm1kVzVqZEdsdmJpQnFiMmx1VG1WMEtHTnZaR1VzYUc5emRDbDdDaUFnYVdZb0lYZHBibVJ2ZHk1ZlgzTmlTbTlwYmlsN2RHOWhjM1FvSjBkeVlTQnZibXhwYm1VZ2FtVnpkQ0J1YVdWa2IzTjB4Smx3Ym1FZ2R5QjBlVzBnZDJsa2IydDFKeWs3Y21WMGRYSnVmUW9nSUNRb0p5TmlReWNwTG1ScGMyRmliR1ZrUFNRb0p5TmlTaWNwTG1ScGMyRmliR1ZrUFhSeWRXVTdDaUFnZEhKNWUxSTlZWGRoYVhRZ2QybHVaRzkzTGw5ZmMySktiMmx1S0NkaWFXVnllbVV0Snl0amIyUmxMblJ2VEc5M1pYSkRZWE5sS0NrcGZXTmhkR05vS0dVcGUxSTliblZzYkR0MGIyRnpkQ2duVG1sbElIVmtZY1dDYnlCemFjU1pJSEJ2eFlMRWhXTjZlY1NISnlrN0pDZ25JMkpESnlrdVpHbHpZV0pzWldROUpDZ25JMkpLSnlrdVpHbHpZV0pzWldROUlYZHBibVJ2ZHk1ZlgzTmlUbVYwTzNKbGRIVnlibjBLSUNBa0tDY2pZa01uS1M1a2FYTmhZbXhsWkQwa0tDY2pZa29uS1M1a2FYTmhZbXhsWkQwaGQybHVaRzkzTGw5ZmMySk9aWFE3Q2lBZ1IwVk9LeXM3WTNSNFBYdHRiMlJsT2lkdVpYUW5MR052WkdWOU8ybHpTRzl6ZEQxb2IzTjBPMjl5WkQxYlhUdFRQVzUxYkd3N2RGTTlNRHRXUFh0OU8yMTVTR0Z1WkQxYlhUdElQVnRkTzNObGJEMXVkV3hzT3dvZ0lGSXViMjRvSjNOMFlYUmxKeXh0UFQ1N2FXWW9hWE5JYjNOMEtYSmxkSFZ5Ymp0amIyNXpkQ0JvUFZJdWNHVmxjbk1vS1M1bWFXNWtLSEE5UG5BdWNHVmxjajA5UFcwdWNHVmxjaWs3YVdZb0lXaDhmQ0ZvTG5CeVpYTmxibU5sZkh3aGFDNXdjbVZ6Wlc1alpTNW9iM04wS1hKbGRIVnlianRwWmlnaFV5bDBVejFFWVhSbExtNXZkeWdwTzFNOWJtOXliVk1vYlM1a1lYUmhLVHR5Wlc1a1pYSW9LWDBwT3dvZ0lGSXViMjRvSjJoaGJtUW5MRzA5UG50cFppaHBjMGh2YzNRcGNtVjBkWEp1TzJOdmJuTjBJR1E5YlM1a1lYUmhPMmxtS0dRbUptUXVkRzg5UFQxdGVWQmxaWElvS1NsN2JYbElZVzVrUFdGeWNpaGtMbWhoYm1RcExtMWhjQ2hPZFcxaVpYSXBMbk52Y25Rb0tHRXNZaWs5UG1FdFlpazdhV1lvVXlZbVV5NXdhRDA5UFNkd2JHRjVKeWx5Wlc1a1pYSklZVzVrS0NsOWZTazdDaUFnVWk1dmJpZ25jR2xqYXljc2JUMCtlMmxtS0NGcGMwaHZjM1I4ZkNGVGZIeFRMbkJvSVQwOUozQnNZWGtuS1hKbGRIVnlianRqYjI1emRDQnBQVk11Y0d3dVptbHVaRWx1WkdWNEtIQTlQbkF1Y0QwOVBXMHVjR1ZsY2lrN2FXWW9hVDQ5TUNZbWJTNWtZWFJoS1hObGRGQnBZMnNvYVN3cmJTNWtZWFJoTG1NcGZTazdDaUFnVWk1dmJpZ25jbTkzSnl4dFBUNTdhV1lvSVdselNHOXpkSHg4SVZOOGZGTXVjR2doUFQwbmNHeGhlU2NwY21WMGRYSnVPMk52Ym5OMElHazlVeTV3YkM1bWFXNWtTVzVrWlhnb2NEMCtjQzV3UFQwOWJTNXdaV1Z5S1R0cFppaHBQajB3SmladExtUmhkR0VwYzJWMFVtOTNLR2tzSzIwdVpHRjBZUzV5S1gwcE93b2dJRkl1YjI0b0oyRnpheWNzS0NrOVBudHBaaWhwYzBodmMzUW1KbE1wZTNONWJtTW9LVHR6Wlc1a1NHRnVaSE1vS1gxOUtUc0tJQ0JTTG05dVVHVmxjbk1vS0NrOVBuc0tJQ0FnSUdsbUtHbHpTRzl6ZENsemVXNWpLQ2s3Q2lBZ0lDQmxiSE5sZTJsbUtGTW1Ka1JoZEdVdWJtOTNLQ2t0ZEZNK05EQXdNQ1ltSVZJdWNHVmxjbk1vS1M1emIyMWxLSEE5UG5BdWNISmxjMlZ1WTJVbUpuQXVjSEpsYzJWdVkyVXVhRzl6ZENrcGUzUnZZWE4wS0NkSWIzTjBJRzl3ZGNXYlkybkZnaUJ3YjJ2RHMyb25LVHRzWldGMlpTZ3BPM0psZEhWeWJuMXBaaWhUS1hKbGJtUmxjaWdwZlgwcE93b2dJSFJ5ZVh0aGQyRnBkQ0JTTG5CeVpYTmxibU5sS0h0dVlXMWxPbTFsTG01aGJXVXNZMjlzT20xbExtTnZiQ3hvYjNOMExIUnpPa1JoZEdVdWJtOTNLQ2w5S1gxallYUmphQ2hsS1h0OUNpQWdhV1lvSVZJcGNtVjBkWEp1T3dvZ0lHbG1LR2h2YzNRcGUxTTllM0JvT2lkc2IySmllU2NzYlc5a1pUb25jaWNzYm1JNk1DeHdiRHBiWFN4emFXUTZNSDA3YzJodmR5Z25iRzlpWW5rbktUdHplVzVqS0NsOUNpQWdaV3h6Wlh0emFHOTNLQ2RzYjJKaWVTY3BPeVFvSnlOd2JITW5LUzVwYm01bGNraFVUVXc5Snp4d0lHTnNZWE56UFNKb2FXNTBJajdGZ2NTRlkzcGxibWxsSUhvZ2NHOXJiMnBsYmVLQXBqd3ZjRDRuTzFJdVpXMXBkQ2duWVhOckp5eDdmU2t1WTJGMFkyZ29LQ2s5UG50OUtUc0tJQ0FnSUhObGRGUnBiV1Z2ZFhRb0tDazlQbnRwWmloU0ppWWhVeWxTTG1WdGFYUW9KMkZ6YXljc2UzMHBMbU5oZEdOb0tDZ3BQVDU3ZlNsOUxERTFNREFwT3dvZ0lDQWdjMlYwVkdsdFpXOTFkQ2dvS1QwK2UybG1LRkltSmlGVEtYdDBiMkZ6ZENnblRtbGxJSHB1WVd4bGVtbHZibThnY0c5cmIycDFJQ2NyWTI5a1pTazdiR1ZoZG1Vb0tYMTlMRFl3TURBcGZYMEtablZ1WTNScGIyNGdiR1ZoZG1Vb0tYdEhSVTRyS3p0WFBWSlhQVzUxYkd3N2FXWW9VaWw3ZEhKNWUxSXViR1ZoZG1Vb0tYMWpZWFJqYUNobEtYdDlVajF1ZFd4c2ZWTTliblZzYkR0amRIZzllMjF2WkdVNkoyMWxiblVuZlR0cGMwaHZjM1E5Wm1Gc2MyVTdWajE3ZlR0elpXdzliblZzYkRza0tDY2paVzVrSnlrdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmIyNG5LVHNrS0NjalpXNWtKeWt1WkdGMFlYTmxkQzVtYVc1aGJEMG5KenNrS0NjalkyOXVaaWNwTG1sdWJtVnlTRlJOVEQwbkp6dHphRzkzS0NkdFpXNTFKeWw5Q2k4cUlEMDlQVDA5UFQwOVBUMDlQVDA5UFQwOUlGVkpJRDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlJQ292Q21OdmJuTjBJRzFyUTI5a1pUMG9LVDArZTJOdmJuTjBJR0U5SjBGQ1EwUkZSa2RJU2t0TlRsQlJVbE5VVlZaWFdGbGFKenRzWlhRZ2N6MG5KenRtYjNJb2JHVjBJR2s5TUR0cFBEUTdhU3NyS1hNclBXRmJUV0YwYUM1bWJHOXZjaWhOWVhSb0xuSmhibVJ2YlNncEttRXViR1Z1WjNSb0tWMDdjbVYwZFhKdUlITjlPd29rS0NjallrTW5LUzV2Ym1Oc2FXTnJQU2dwUFQ1N1lYVW9LVHRUUmk1MWFTZ3BPMnB2YVc1T1pYUW9iV3REYjJSbEtDa3NkSEoxWlNsOU93b2tLQ2NqWWtvbktTNXZibU5zYVdOclBTZ3BQVDU3WVhVb0tUdFRSaTUxYVNncE8yTnZibk4wSUdNOUpDZ25JMk5rSnlrdWRtRnNkV1V1ZEhKcGJTZ3BMblJ2VlhCd1pYSkRZWE5sS0NrN2FXWW9ZeTVzWlc1bmRHZzhOQ2w3ZEc5aGMzUW9KMWR3YVhONklHdHZaQ0J3YjJ0dmFuVW5LVHR5WlhSMWNtNTlhbTlwYms1bGRDaGpMR1poYkhObEtYMDdDaVFvSnlOalpDY3BMbTl1YTJWNVpHOTNiajFsUFQ1N2FXWW9aUzVyWlhrOVBUMG5SVzUwWlhJbktTUW9KeU5pU2ljcExtTnNhV05yS0NsOU93b2tLQ2NqWWt3bktTNXZibU5zYVdOclBTZ3BQVDU3WVhVb0tUdFRSaTUxYVNncE8yTjBlRDE3Ylc5a1pUb25iRzlqWVd3bmZUdHBjMGh2YzNROWRISjFaVHRUUFh0d2FEb25iRzlpWW5rbkxHMXZaR1U2SjNJbkxHNWlPak1zY0d3NmJHOWpZV3hRYkNnektTeHphV1E2TUgwN2NtVnVaR1Z5S0NsOU93b2tLQ2NqYkhZbktTNXZibU5zYVdOclBTZ3BQVDU3VTBZdWRXa29LVHRzWldGMlpTZ3BmVHNLSkNnbkkySnJKeWt1YjI1amJHbGphejBvS1QwK2UxTkdMblZwS0NrN1kyOXVjM1FnWWowa0tDY2pZbXNuS1R0cFppaGlMbVJoZEdGelpYUXVZWE5yS1h0amJHVmhjbFJwYldWdmRYUW9ZaTUwS1R0aUxtUmhkR0Z6WlhRdVlYTnJQU2NuTzJJdWRHVjRkRU52Ym5SbGJuUTlKK0tHa0NjN2JHVmhkbVVvS1R0eVpYUjFjbTU5WWk1a1lYUmhjMlYwTG1GemF6MG5NU2M3WWk1MFpYaDBRMjl1ZEdWdWREMG5WM2xxeFp2RWh6OG5PMkl1ZEQxelpYUlVhVzFsYjNWMEtDZ3BQVDU3WWk1a1lYUmhjMlYwTG1GemF6MG5KenRpTG5SbGVIUkRiMjUwWlc1MFBTZmlocEFuZlN3ek1EQXdLWDA3Q2lRb0p5TnNZeWNwTG05dVkyeHBZMnM5S0NrOVBudDBjbmw3Ym1GMmFXZGhkRzl5TG1Oc2FYQmliMkZ5WkM1M2NtbDBaVlJsZUhRb1kzUjRMbU52WkdVcE8zUnZZWE4wS0NkVGEyOXdhVzkzWVc1dklHdHZaQ2NwZldOaGRHTm9LR1VwZTNSdllYTjBLQ2RMYjJRNklDY3JZM1I0TG1OdlpHVXBmWDA3Q2lRb0p5TnRaQ2NwTG05dVkyeHBZMnM5WlQwK2UyTnZibk4wSUdJOVpTNTBZWEpuWlhRdVkyeHZjMlZ6ZENnblluVjBkRzl1SnlrN2FXWW9JV0o4ZkdJdVpHbHpZV0pzWldRcGNtVjBkWEp1TzFOR0xuVnBLQ2s3VXoxN0xpNHVVeXh0YjJSbE9tSXVaR0YwWVhObGRDNXRmVHRpWXlncE8zSmxibVJsY2t4dlltSjVLQ2w5T3dwbWRXNWpkR2x2YmlCelpYUkNiM1J6S0c0cGUxTkdMblZwS0NrN1V6MTdMaTR1VXl4dVlqcHVmVHRwWmloamRIZ3ViVzlrWlQwOVBTZHVaWFFuS1hONWJtTW9LVHRsYkhObGUxTXVjR3c5Ykc5allXeFFiQ2h1S1R0eVpXNWtaWElvS1gxOUNpUW9KeU50YVNjcExtOXVZMnhwWTJzOUtDazlQbnRwWmloVExtNWlQakFwYzJWMFFtOTBjeWhUTG01aUxURXBmVHNLSkNnbkkzQjFKeWt1YjI1amJHbGphejBvS1QwK2UybG1LRk11Y0d3dWJHVnVaM1JvUEUxQldGQXBjMlYwUW05MGN5aFRMbTVpS3pFcGZUc0tKQ2duSTNOMEp5a3ViMjVqYkdsamF6MG9LVDArZTJGMUtDazdhV1lvSVZOOGZGTXVjR3d1YkdWdVozUm9QRElwY21WMGRYSnVPM04wWVhKMFIyRnRaU2dwZlRzS0pDZ25JMjExSnlrdWIyNWpiR2xqYXowb0tUMCtlMjExZEdVOUlXMTFkR1U3SkNnbkkyMTFKeWt1ZEdWNGRFTnZiblJsYm5ROWJYVjBaVDhuOEorVWh5YzZKL0NmbElvbk8ybG1LQ0Z0ZFhSbEtWTkdMblZwS0NsOU93b2tLQ2NqY213bktTNXZibU5zYVdOclBTZ3BQVDU3VTBZdWRXa29LVHNrS0NjamNuVnNaWE1uS1M1amJHRnpjMHhwYzNRdVlXUmtLQ2R2YmljcGZUc2tLQ2NqY25nbktTNXZibU5zYVdOclBTZ3BQVDRrS0NjamNuVnNaWE1uS1M1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkdmJpY3BPd29rS0NjamNuVnNaWE1uS1M1dmJtTnNhV05yUFdVOVBudHBaaWhsTG5SaGNtZGxkQzVwWkQwOVBTZHlkV3hsY3ljcEpDZ25JM0oxYkdWekp5a3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25iMjRuS1gwN0NtWjFibU4wYVc5dUlIQmhhVzUwVFdVb0tYdGpiMjV6ZENCdVBTUW9KeU51YVdOckp5azdhV1lvYmlZbVpHOWpkVzFsYm5RdVlXTjBhWFpsUld4bGJXVnVkQ0U5UFc0cGJpNTJZV3gxWlQxdFpTNXVZVzFsT3lRb0p5TnRaU0JwSnlrdWMzUjViR1V1YzJWMFVISnZjR1Z5ZEhrb0p5MHRZeWNzYldVdVkyOXNLWDBLWm5WdVkzUnBiMjRnYVc1cGRGQnlaV1p6S0NsN0NpQWdZMjl1YzNRZ2JqMTNhVzVrYjNjdVgxOXpZazVwWTJzbUpuZHBibVJ2ZHk1ZlgzTmlUbWxqYXlncExHTTlkMmx1Wkc5M0xsOWZjMkpEYjJ3bUpuZHBibVJ2ZHk1ZlgzTmlRMjlzS0NrN0NpQWdiV1V1WTI5c1BVaEZXQzUwWlhOMEtHTjhmQ2NuS1Q5akxuUnZURzkzWlhKRFlYTmxLQ2s2VUVGTVd6QmRPd29nSUdsbUtHNHBlMjFsTG01aGJXVTlZMnhsWVc1T0tHNHBmSHduUjNKaFkzb25PeVFvSnlOdWFXTnJKeWt1Y21WaFpFOXViSGs5ZEhKMVpUc2tLQ2NqYm1samF5Y3BMblJwZEd4bFBTZE9hV05ySUhvZ1ZIZHZhbVZuYnlCcmIyNTBZU2Q5Q2lBZ1pXeHpaWHNrS0NjamJtbGpheWNwTG5KbFlXUlBibXg1UFdaaGJITmxPM1J5ZVh0amIyNXpkQ0IyUFdOc1pXRnVUaWhzYjJOaGJGTjBiM0poWjJVdVoyVjBTWFJsYlNnbmMySmZibWxqYXljcEtUdHBaaWgyS1cxbExtNWhiV1U5ZG4xallYUmphQ2hsS1h0OWZRb2dJSEJoYVc1MFRXVW9LVHNLSUNCcFppZ2hkMmx1Wkc5M0xsOWZjMkpPWlhRcGV5UW9KeU5pUXljcExtUnBjMkZpYkdWa1BTUW9KeU5pU2ljcExtUnBjMkZpYkdWa1BYUnlkV1U3SkNnbkkyNTBNaWNwTG5SbGVIUkRiMjUwWlc1MFBTZFFiMnR2YW1VZ2IyNXNhVzVsSUhQRWhTQnVhV1ZrYjNOMHhKbHdibVVnS0dKeVlXc2djRy9GZ3NTRlkzcGxibWxoSUhvZ1JtbHlaV0poYzJVcElPS0FreUI2WVdkeVlXb2dlaUJpYjNSaGJXa3VKMzBLSUNCbGJITmxJR2xtS0c0cEpDZ25JMjUwTWljcExuUmxlSFJEYjI1MFpXNTBQU2RIY21GemVpQnFZV3R2SUNjcmJXVXVibUZ0WlNzbklPS0FreUIzZVc1cGEya2dkSEpoWm1uRWhTQmtieUJVZDI5cFkyZ2djM1JoZEhsemRIbHJMaWM3Q2lBZ1pXeHpaU0FrS0NjamJuUXlKeWt1ZEdWNGRFTnZiblJsYm5ROUoxcGhiRzluZFdvZ2MybkVtU0J1WVNCcmIyNTBieXdnWVdKNUlIZDVibWxyYVNCc2FXTjZlY1dDZVNCemFjU1pJR1J2SUhOMFlYUjVjM1I1YXk0bmZRb2tLQ2NqYm1samF5Y3BMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMmx1Y0hWMEp5eGxQVDU3YVdZb1pTNTBZWEpuWlhRdWNtVmhaRTl1YkhrcGNtVjBkWEp1TzIxbExtNWhiV1U5WTJ4bFlXNU9LR1V1ZEdGeVoyVjBMblpoYkhWbEtYeDhKMGR5WVdONkp6dDBjbmw3Ykc5allXeFRkRzl5WVdkbExuTmxkRWwwWlcwb0ozTmlYMjVwWTJzbkxHMWxMbTVoYldVcGZXTmhkR05vS0hncGUzMXdZV2x1ZEUxbEtDbDlLVHNLS0daMWJtTjBhVzl1S0NsN1kyOXVjM1FnWVQxYk5Td3lNeXcxTlN3M01Dd3hNREZkTzJOdmJuTjBJSEk5V3kwNUxDMDBMREFzTlN3eE1GMDdKQ2duSTJobGNtOG5LUzVwYm01bGNraFVUVXc5WVM1dFlYQW9LRzRzYVNrOVBtQThaR2wySUhOMGVXeGxQU0l0TFhJNkpIdHlXMmxkZldSbFp6c3RMV1E2SkhzdGFTb3VOWDF6SWlCamJHRnpjejBpWTJRZ2NTUjdZblZzYkhNb2JpbDlJaUJrWVhSaExXNDlJaVI3Ym4waVBqeHpQaVI3Ym4wOEwzTStQR0krSkh0dWZUd3ZZajQ4WkdsMklHTnNZWE56UFNKaWJDSStKSHRDU0M1eVpYQmxZWFFvWW5Wc2JITW9iaWtwZlR3dlpHbDJQand2WkdsMlBtQXBMbXB2YVc0b0p5Y3BmU2tvS1RzS2QybHVaRzkzTGw5ZmMySk1aV0YyWlQxbWRXNWpkR2x2YmlncGUzUnllWHRwWmloU2ZIeFRLV3hsWVhabEtDbDlZMkYwWTJnb1pTbDdmWDA3Q25kcGJtUnZkeTVmWDNOaVVtVm1jbVZ6YUQxbWRXNWpkR2x2YmlncGUybG1LQ0ZTS1dsdWFYUlFjbVZtY3lncGZUc0thVzVwZEZCeVpXWnpLQ2s3Q2p3dmMyTnlhWEIwUGp3dlltOWtlVDQ4TDJoMGJXdytDZz09JzsKY29uc3QgYj1hdG9iKEI2NCksdT1uZXcgVWludDhBcnJheShiLmxlbmd0aCk7Zm9yKGxldCBpPTA7aTxiLmxlbmd0aDtpKyspdVtpXT1iLmNoYXJDb2RlQXQoaSk7CmNvbnN0IGY9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2cnKTsKZi5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywoKT0+e3RyeXtmLmNvbnRlbnRXaW5kb3cuZm9jdXMoKX1jYXRjaChlKXt9fSk7CmYuc3JjZG9jPW5ldyBUZXh0RGVjb2RlcigndXRmLTgnKS5kZWNvZGUodSk7Cjwvc2NyaXB0Pgo8L2JvZHk+PC9odG1sPgo=';
  const pcSixWindow = document.getElementById('pcSixWindow');
  const pcSixFrame = document.getElementById('pcSixFrame');
  const pcSixIcon = document.getElementById('pcSixDesktopIcon');
  const pcInstallSixBtn = document.getElementById('pcInstallSixBtn');
  const pcSixStatus = document.getElementById('pcSixStatus');
  const pcSixProgress = document.getElementById('pcSixProgress');
  const pcSixBar = document.getElementById('pcSixProgressBar');
  let sixInstalled = false, sixInstalling = false;
  try{ sixInstalled = localStorage.getItem('realLifeSixInstalled') === 'true'; }catch(e){}
  pcSixIcon.style.display = sixInstalled ? 'flex' : 'none';
  if(sixInstalled){ pcSixStatus.textContent = '6 bierze! jest już zainstalowane.'; pcInstallSixBtn.textContent = 'Zainstalowano'; pcInstallSixBtn.disabled = true; }
  function closeSix(){
    try{ const w = pcSixFrame.contentWindow.document.getElementById('g').contentWindow; if(w && w.__sbLeave) w.__sbLeave(); }catch(e){}
    pcSixWindow.classList.remove('open'); pcSixWindow.setAttribute('aria-hidden','true');
    pcSixFrame.removeAttribute('srcdoc');
  }
  function openSix(){
    const bin = atob(SIX_B64), u = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
    pcSixFrame.srcdoc = new TextDecoder('utf-8').decode(u);
    pcSixWindow.classList.add('open'); pcSixWindow.setAttribute('aria-hidden','false');
  }
  pcSixIcon.addEventListener('click', openSix);
  window.addEventListener('message', e => { if(e.data === 'sb-close') closeSix(); });
  document.getElementById('pcPower').addEventListener('click', closeSix);
  pcInstallSixBtn.addEventListener('click',()=>{
    if(sixInstalled || sixInstalling) return;
    sixInstalling = true; pcInstallSixBtn.disabled = true; pcInstallSixBtn.textContent = 'Instalowanie…';
    pcSixProgress.style.display = 'block'; pcSixBar.style.width = '0%';
    pcSixStatus.textContent = 'Pobieranie i instalacja 6 bierze!… (30 s)';
    const started = Date.now();
    const tick = ()=>{
      const sec = (Date.now()-started)/1000;
      const progress = Math.min(100, sec/30*100);
      pcSixBar.style.width = progress + '%';
      if(progress < 100){ pcSixStatus.textContent = 'Pobieranie i instalacja 6 bierze!… ' + Math.max(0, Math.ceil(30-sec)) + ' s'; setTimeout(tick,100); return; }
      sixInstalling = false; sixInstalled = true;
      try{ localStorage.setItem('realLifeSixInstalled','true'); }catch(e){}
      pcSixStatus.textContent = 'Instalacja zakończona! 6 bierze! pojawiło się na pulpicie.';
      pcInstallSixBtn.textContent = 'Zainstalowano';
      pcSixIcon.style.display = 'flex';
    };
    setTimeout(tick,100);
  });


  /* ===== Pliki – nagrania zapisane w komputerze w grze (IndexedDB przeglądarki) ===== */
  const pcFilesWindow = document.getElementById('pcFilesWindow');
  const pcFilesList = document.getElementById('pcFilesList');
  const pcFilesPlayer = document.getElementById('pcFilesPlayer');
  const pcFilesVideo = document.getElementById('pcFilesVideo');
  const pcFilesBack = document.getElementById('pcFilesBack');
  const pcFilesTitle = document.getElementById('pcFilesTitle');
  let pcFilesDb = null, pcFilesMem = [], pcFilesUrl = null;
  function pcFilesOpenDb(){
    if(pcFilesDb) return Promise.resolve(pcFilesDb);
    return new Promise((res,rej)=>{
      try{
        const rq = indexedDB.open('realLifeFiles',1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('videos',{keyPath:'id'});
        rq.onsuccess = () => { pcFilesDb = rq.result; res(pcFilesDb); };
        rq.onerror = () => rej(rq.error);
      }catch(e){ rej(e); }
    });
  }
  function pcFilesAll(){
    return pcFilesOpenDb().then(db=>new Promise((res,rej)=>{
      const rq = db.transaction('videos').objectStore('videos').getAll();
      rq.onsuccess = () => res(rq.result.sort((a,b)=>b.id-a.id)); rq.onerror = () => rej(rq.error);
    })).catch(()=>pcFilesMem.slice().sort((a,b)=>b.id-a.id));
  }
  function pcFilesSave(blob, dur){
    const rec = {id:Date.now(), name:'Nagranie ' + new Date().toLocaleString('pl-PL'), dur:dur, size:blob.size, blob:blob};
    return pcFilesOpenDb().then(db=>new Promise((res,rej)=>{
      const tx = db.transaction('videos','readwrite'); tx.objectStore('videos').put(rec);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    })).catch(()=>{ pcFilesMem.push(rec); });
  }
  function pcFilesSaveNamed(blob, dur, name, desk){
    const rec = {id:Date.now(), name:name, dur:dur, size:blob.size, blob:blob, desk:!!desk};
    return pcFilesOpenDb().then(db=>new Promise((res,rej)=>{
      const tx = db.transaction('videos','readwrite'); tx.objectStore('videos').put(rec);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    })).catch(()=>{ pcFilesMem.push(rec); });
  }
  function pcFilesDelete(id){
    return pcFilesOpenDb().then(db=>new Promise((res,rej)=>{
      const tx = db.transaction('videos','readwrite'); tx.objectStore('videos').delete(id);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    })).catch(()=>{ pcFilesMem = pcFilesMem.filter(r=>r.id !== id); });
  }
  function pcFilesStopPlayer(){
    try{ pcFilesVideo.pause(); }catch(e){}
    pcFilesVideo.removeAttribute('src'); pcFilesVideo.load();
    if(pcFilesUrl){ URL.revokeObjectURL(pcFilesUrl); pcFilesUrl = null; }
    pcFilesPlayer.style.display = 'none'; pcFilesBack.style.display = 'none';
    pcFilesList.style.display = 'block'; pcFilesTitle.textContent = '📁 Pliki — Nagrania';
  }
  function pcFilesRender(){
    pcFilesAll().then(items=>{
      pcFilesList.innerHTML = '';
      if(!items.length){ pcFilesList.innerHTML = '<div id="pcFilesEmpty">Brak plików. Nagraj coś w programie Pepper 🔴</div>'; return; }
      items.forEach(r=>{
        const row = document.createElement('div'); row.className = 'pcFile';
        const mb = (r.size/1048576).toFixed(1);
        row.innerHTML = '<div class="ic">🎞️</div><div class="nm"><b></b><small>' + r.dur + ' · ' + mb + ' MB</small></div><button class="play" type="button">▶ Odtwórz</button><button class="del" type="button">🗑</button>';
        row.querySelector('b').textContent = r.name;
        row.querySelector('.play').addEventListener('click',()=>{
          pcFilesUrl = URL.createObjectURL(r.blob); pcFilesVideo.src = pcFilesUrl;
          pcFilesList.style.display = 'none'; pcFilesPlayer.style.display = 'flex';
          pcFilesBack.style.display = 'inline-block'; pcFilesTitle.textContent = '▶ ' + r.name;
          pcFilesVideo.play().catch(()=>{});
        });
        row.querySelector('.del').addEventListener('click',()=>{ pcFilesDelete(r.id).then(()=>{ pcFilesRender(); scDeskRefresh(); }); });
        pcFilesList.appendChild(row);
      });
    });
  }
  function openFiles(){ pcFilesStopPlayer(); pcFilesWindow.classList.add('open'); pcFilesWindow.setAttribute('aria-hidden','false'); pcFilesRender(); }
  function closeFiles(){ pcFilesStopPlayer(); pcFilesWindow.classList.remove('open'); pcFilesWindow.setAttribute('aria-hidden','true'); }
  document.getElementById('pcFilesIcon').addEventListener('click', openFiles);
  document.getElementById('pcFilesClose').addEventListener('click', closeFiles);
  pcFilesBack.addEventListener('click', ()=>{ pcFilesStopPlayer(); pcFilesRender(); });
  document.getElementById('pcPower').addEventListener('click', closeFiles);
  /* ===== ShortCut – edytor wideo: pliki komputera → oś czasu → cięcie → render na pulpit ===== */
  const scWin = document.getElementById('pcShortcutWindow');
  const scVideo = document.getElementById('scVideo'), scEmpty = document.getElementById('scEmpty');
  const scBinList = document.getElementById('scBinList'), scTrack = document.getElementById('scTrack');
  const scRuler = document.getElementById('scRuler'), scInner = document.getElementById('scInner');
  const scScroll = document.getElementById('scScroll'), scPlayhead = document.getElementById('scPlayhead');
  const scTimeEl = document.getElementById('scTime'), scMsgEl = document.getElementById('scMsg');
  const scPlayBtn = document.getElementById('scPlay'), scModal = document.getElementById('scModal'), scDialog = document.getElementById('scDialog');
  const sc = {clips:[], sel:null, t:0, playing:false, pps:70, urls:{}, cur:null, raf:0, rendering:false, cancel:false, nextId:1};
  let scMsgTimer = null;
  const scMsg = (t) => { scMsgEl.textContent = t; clearTimeout(scMsgTimer); scMsgTimer = setTimeout(()=>{ scMsgEl.textContent = ''; }, 3500); };
  const scLen = c => c.out - c.in;
  const scTotal = () => sc.clips.reduce((a,c)=>a + scLen(c), 0);
  const scLayout = () => { let t = 0; sc.clips.forEach(c => { c.start = t; t += scLen(c); }); };
  const scFmt = t => { t = Math.max(0, t); return Math.floor(t/60) + ':' + (t%60).toFixed(1).padStart(4,'0'); };
  const scFmtDur = t => { t = Math.round(t); return String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0'); };
  const scParseDur = s => { const m = /^(\d+):(\d+)/.exec(s || ''); return m ? (+m[1])*60 + (+m[2]) : 5; };
  const scSel = () => sc.clips.find(c => c.id === sc.sel) || null;
  function scProbe(url, fb){                                              // długość pliku (nagrania z przeglądarki często nie mają jej w nagłówku)
    return new Promise(res => {
      const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; let done = false;
      const fin = d => { if(done) return; done = true; v.removeAttribute('src'); try{ v.load(); }catch(e){} res(isFinite(d) && d > 0 ? d : fb); };
      v.onloadedmetadata = () => { if(isFinite(v.duration) && v.duration > 0) fin(v.duration); else v.currentTime = 1e7; };
      v.ondurationchange = v.ontimeupdate = () => { if(isFinite(v.duration) && v.duration > 0) fin(v.duration); };
      v.onerror = () => fin(fb); setTimeout(() => fin(fb), 4000); v.src = url;
    });
  }
  function scClipAt(t){
    const n = sc.clips.length; if(!n) return null;
    for(const c of sc.clips) if(t >= c.start && t < c.start + scLen(c)) return c;
    return sc.clips[n-1];
  }
  function scSeekVideo(time){
    if(scVideo.readyState >= 1) { try{ scVideo.currentTime = time; }catch(e){} }
    else scVideo.addEventListener('loadedmetadata', () => { try{ scVideo.currentTime = time; }catch(e){} }, {once:true});
  }
  function scShow(t){                                                     // ustawia kursor w czasie t i pokazuje właściwą klatkę
    scLayout(); const tot = scTotal(); t = Math.max(0, Math.min(t, tot)); sc.t = t;
    const c = scClipAt(t); sc.cur = c;
    scVideo.style.display = c ? 'block' : 'none'; scEmpty.style.display = c ? 'none' : 'block';
    if(c){
      if(scVideo.getAttribute('data-src') !== c.src){ scVideo.setAttribute('data-src', c.src); scVideo.src = c.src; }
      scSeekVideo(c.in + Math.min(scLen(c), t - c.start));
    } else { scVideo.removeAttribute('src'); scVideo.removeAttribute('data-src'); }
    scUpdateUi();
  }
  function scUpdateUi(){
    const pps = sc.pps;
    scPlayhead.style.left = (sc.t*pps) + 'px';
    scTimeEl.textContent = scFmt(sc.t) + ' / ' + scFmt(scTotal());
    scPlayBtn.textContent = sc.playing ? '⏸' : '▶';
  }
  function scPause(){ sc.playing = false; cancelAnimationFrame(sc.raf); try{ scVideo.pause(); }catch(e){} scUpdateUi(); }
  function scPlay(){
    if(!sc.clips.length){ scMsg('Dodaj film na linię czasu'); return; }
    if(sc.t >= scTotal() - 0.05) scShow(0);
    sc.playing = true; scVideo.play().catch(()=>{}); scLoop(); scUpdateUi();
  }
  function scLoop(){
    if(!sc.playing) return;
    const c = sc.cur;
    if(c){
      sc.t = c.start + Math.max(0, Math.min(scLen(c), scVideo.currentTime - c.in));
      if(scVideo.currentTime >= c.out - 0.04 || scVideo.ended){
        const nx = sc.clips[sc.clips.indexOf(c) + 1];
        if(nx){ scShow(nx.start); scVideo.play().catch(()=>{}); }
        else { sc.t = scTotal(); scPause(); scRender_(); return; }
      }
    }
    scUpdateUi();
    const sl = scScroll;                                                  // kursor nie ucieka poza widok
    const px = sc.t*sc.pps; if(px > sl.scrollLeft + sl.clientWidth - 30) sl.scrollLeft = px - 60;
    sc.raf = requestAnimationFrame(scLoop);
  }
  function scRender_(){                                                   // rysuje linię czasu (linijka, klipy, kursor)
    scLayout(); const pps = sc.pps, tot = scTotal();
    scInner.style.width = Math.max(scScroll.clientWidth, (tot + 6)*pps + 40) + 'px';
    const step = pps >= 120 ? 1 : pps >= 60 ? 2 : pps >= 30 ? 5 : 10;
    scRuler.innerHTML = '';
    for(let s = 0; s*pps < parseFloat(scInner.style.width); s += step){
      const k = document.createElement('div'); k.className = 'scTick'; k.style.left = (s*pps) + 'px';
      k.textContent = Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); scRuler.appendChild(k);
    }
    scTrack.innerHTML = '';
    sc.clips.forEach(c => {
      const el = document.createElement('div'); el.className = 'scClip' + (c.id === sc.sel ? ' sel' : '');
      el.style.left = (c.start*pps) + 'px'; el.style.width = Math.max(14, scLen(c)*pps) + 'px';
      el.innerHTML = '<div class="scH l"></div><div class="scH r"></div><div class="nm"></div><div class="du"></div>';
      el.querySelector('.nm').textContent = '🎞️ ' + c.name; el.querySelector('.du').textContent = scFmt(scLen(c)) + ' s';
      scTrack.appendChild(el);
      el.querySelector('.scH.l').addEventListener('pointerdown', e => scTrimStart(e, c, el, 'l'));
      el.querySelector('.scH.r').addEventListener('pointerdown', e => scTrimStart(e, c, el, 'r'));
      el.addEventListener('pointerdown', e => { if(!e.target.classList.contains('scH')) scClipDrag(e, c, el); });
    });
    scUpdateUi();
  }
  function scTrimStart(e, c, el, side){                                   // przeciąganie uchwytu: przycinanie początku / końca klipu
    e.stopPropagation(); e.preventDefault(); sc.sel = c.id; scPause();
    const h = e.currentTarget, x0 = e.clientX, in0 = c.in, out0 = c.out;
    try{ h.setPointerCapture(e.pointerId); }catch(err){}
    const mv = ev => {
      const d = (ev.clientX - x0)/sc.pps;
      if(side === 'l') c.in = Math.max(0, Math.min(out0 - 0.2, in0 + d)); else c.out = Math.max(in0 + 0.2, Math.min(c.src_dur, out0 + d));
      el.style.width = Math.max(14, scLen(c)*sc.pps) + 'px'; el.querySelector('.du').textContent = scFmt(scLen(c)) + ' s';
    };
    const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); scRender_(); scShow(Math.min(sc.t, scTotal())); };
    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  }
  function scClipDrag(e, c, el){                                          // klik = zaznacz i ustaw kursor; przeciągnięcie = zmiana kolejności
    e.preventDefault(); const x0 = e.clientX, left0 = c.start*sc.pps; let moved = false;
    sc.sel = c.id; scTrack.querySelectorAll('.scClip').forEach(n => n.classList.toggle('sel', n === el));
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    const clickT = (e.clientX - el.getBoundingClientRect().left)/sc.pps + c.start;
    const mv = ev => { const dx = ev.clientX - x0; if(Math.abs(dx) > 5) moved = true; if(moved){ el.style.left = Math.max(0, left0 + dx) + 'px'; el.style.zIndex = 3; el.style.opacity = .85; } };
    const up = ev => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if(moved){
        const centre = parseFloat(el.style.left) + el.offsetWidth/2;
        const others = sc.clips.filter(o => o !== c);
        let idx = 0; others.forEach(o => { if((o.start + scLen(o)/2)*sc.pps < centre) idx++; });
        sc.clips = others; sc.clips.splice(idx, 0, c); scPause(); scRender_(); scShow(c.start);
      } else { scPause(); scShow(clickT); }
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  async function scAddFile(r){
    if(sc.rendering) return;
    if(!sc.urls[r.id]) sc.urls[r.id] = URL.createObjectURL(r.blob);
    scMsg('Wczytywanie…');
    const dur = await scProbe(sc.urls[r.id], scParseDur(r.dur));
    const c = {id:sc.nextId++, fid:r.id, name:r.name, src:sc.urls[r.id], src_dur:dur, in:0, out:dur, start:0};
    sc.clips.push(c); sc.sel = c.id; scPause(); scLayout(); scRender_(); scShow(c.start); scMsg('Dodano: ' + r.name);
    scScroll.scrollLeft = Math.max(0, c.start*sc.pps - 20);
  }
  function scBinRender(){
    pcFilesAll().then(items => {
      scBinList.innerHTML = '';
      if(!items.length){ scBinList.innerHTML = '<div class="scNone">Brak plików. Nagraj coś w programie Pepper 🔴 – pojawi się tutaj.</div>'; return; }
      items.forEach(r => {
        const row = document.createElement('div'); row.className = 'scFile';
        row.innerHTML = '<div class="ic">🎞️</div><div class="nm"><b></b><small></small></div><button type="button" title="Dodaj na linię czasu">＋</button>';
        row.querySelector('b').textContent = r.name; row.querySelector('small').textContent = r.dur + ' · ' + (r.size/1048576).toFixed(1) + ' MB';
        row.querySelector('button').addEventListener('click', () => scAddFile(r));
        scBinList.appendChild(row);
      });
    });
  }
  function scSplit(){
    const c = scClipAt(sc.t); if(!c) return;
    const local = sc.t - c.start;
    if(local < 0.15 || local > scLen(c) - 0.15){ scMsg('Ustaw kursor wewnątrz klipu, aby go podzielić'); return; }
    scPause();
    const cut = c.in + local, b = {id:sc.nextId++, fid:c.fid, name:c.name, src:c.src, src_dur:c.src_dur, in:cut, out:c.out, start:0};
    c.out = cut; sc.clips.splice(sc.clips.indexOf(c) + 1, 0, b); sc.sel = b.id;
    const t = sc.t; scRender_(); scShow(t); scMsg('Klip podzielony ✂');
  }
  function scDelete(){
    const c = scSel(); if(!c){ scMsg('Zaznacz klip, który chcesz usunąć'); return; }
    scPause(); sc.clips = sc.clips.filter(o => o !== c); sc.sel = null; scRender_(); scShow(Math.min(sc.t, scTotal())); scMsg('Klip usunięty');
  }
  function scMove(dir){
    const c = scSel(); if(!c){ scMsg('Zaznacz klip'); return; }
    const i = sc.clips.indexOf(c), j = i + dir; if(j < 0 || j >= sc.clips.length) return;
    sc.clips[i] = sc.clips[j]; sc.clips[j] = c; scPause(); scRender_(); scShow(c.start);
  }
  function scClear(){
    if(sc.rendering) return; scPause(); sc.clips = []; sc.sel = null; sc.t = 0; sc.cur = null;
    Object.values(sc.urls).forEach(u => URL.revokeObjectURL(u)); sc.urls = {};
    scVideo.removeAttribute('src'); scVideo.removeAttribute('data-src'); scShow(0); scRender_(); scMsg('Nowy projekt');
  }
  /* --- eksport: render w czasie rzeczywistym do pliku, który ląduje na pulpicie --- */
  function scDialogShow(html){ scDialog.innerHTML = html; scModal.classList.add('show'); }
  function scDialogHide(){ scModal.classList.remove('show'); scDialog.innerHTML = ''; }
  function scExportDialog(){
    if(sc.rendering) return;
    if(!sc.clips.length){ scMsg('Najpierw dodaj film na linię czasu'); return; }
    scPause(); const tot = scTotal();
    scDialogShow('<h3>⬆ Eksportuj film</h3><label for="scName">Nazwa filmu</label><input id="scName" type="text" maxlength="40" value="Mój film" autocomplete="off">'
      + '<div class="scNote">Długość: ' + scFmt(tot) + ' s. Renderowanie trwa tyle co film. Gotowy plik pojawi się na pulpicie komputera.</div>'
      + '<div class="scBtns"><button id="scDlgCancel" type="button">Anuluj</button><button id="scDlgGo" type="button" class="scPrimary">🎬 Renderuj</button></div>');
    const inp = document.getElementById('scName'); inp.focus(); inp.select();
    const go = () => { const nm = inp.value.trim(); if(!nm){ inp.focus(); return; } scStartRender(nm); };
    inp.addEventListener('keydown', e => { e.stopPropagation(); if(e.code === 'Enter') go(); else if(e.code === 'Escape') scDialogHide(); });
    document.getElementById('scDlgCancel').addEventListener('click', scDialogHide);
    document.getElementById('scDlgGo').addEventListener('click', go);
  }
  async function scStartRender(name){
    if(typeof MediaRecorder === 'undefined'){ scDialogShow('<h3>Błąd</h3><div class="scNote">Ta przeglądarka nie obsługuje renderowania.</div><div class="scBtns"><button id="scOk" type="button">OK</button></div>'); document.getElementById('scOk').addEventListener('click', scDialogHide); return; }
    sc.rendering = true; sc.cancel = false;
    const clips = sc.clips.map(c => Object.assign({}, c)), tot = clips.reduce((a,c) => a + scLen(c), 0);
    scDialogShow('<h3>🎬 Renderowanie „' + name.replace(/[<>&]/g,'') + '”…</h3><div class="scProg"><div id="scProgBar"></div></div><div class="scNote" id="scProgTxt">0%</div><div class="scBtns"><button id="scRenderCancel" type="button">Anuluj</button></div>');
    const bar = document.getElementById('scProgBar'), txt = document.getElementById('scProgTxt');
    document.getElementById('scRenderCancel').addEventListener('click', () => { sc.cancel = true; });
    const rv = document.createElement('video'); rv.muted = true; rv.playsInline = true; rv.preload = 'auto';
    const load = c => new Promise(res => { rv.onloadedmetadata = () => res(); rv.onerror = () => res(); rv.src = c.src; setTimeout(res, 5000); });
    const seek = t => new Promise(res => { rv.onseeked = () => { rv.onseeked = null; res(); }; try{ rv.currentTime = t; }catch(e){ res(); } setTimeout(res, 2500); });
    let lastSrc = null, rec = null, iv = null;
    try{
      await load(clips[0]); lastSrc = clips[0].src;
      let W = rv.videoWidth || 1280, H = rv.videoHeight || 720; const k = Math.min(1, 1280/W); W = Math.round(W*k/2)*2; H = Math.round(H*k/2)*2;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      const draw = () => { g.fillStyle = '#000'; g.fillRect(0,0,W,H); const vw = rv.videoWidth, vh = rv.videoHeight; if(!vw || !vh) return; const s = Math.min(W/vw, H/vh); try{ g.drawImage(rv, (W - vw*s)/2, (H - vh*s)/2, vw*s, vh*s); }catch(e){} };
      const mime = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t => MediaRecorder.isTypeSupported(t));
      const chunks = []; rec = mime ? new MediaRecorder(cv.captureStream(30), {mimeType:mime}) : new MediaRecorder(cv.captureStream(30));
      rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise(res => { rec.onstop = res; });
      await seek(clips[0].in); draw(); rec.start(500);
      let done = 0;
      for(const c of clips){
        if(sc.cancel) break;
        if(c.src !== lastSrc){ await load(c); lastSrc = c.src; }
        await seek(c.in); draw(); rv.play().catch(()=>{});
        const began = Date.now();
        await new Promise(res => {
          iv = setInterval(() => {
            draw(); const lt = Math.max(0, rv.currentTime - c.in), p = Math.min(1, (done + lt)/tot);
            bar.style.width = (p*100) + '%'; txt.textContent = Math.round(p*100) + '%';
            if(sc.cancel || rv.currentTime >= c.out - 0.04 || rv.ended || Date.now() - began > scLen(c)*1000 + 8000){ clearInterval(iv); iv = null; rv.pause(); res(); }
          }, 33);
        });
        done += scLen(c);
      }
      draw(); await new Promise(r => setTimeout(r, 250)); if(rec.state !== 'inactive') rec.stop(); await stopped;
      if(sc.cancel || !chunks.length){ sc.rendering = false; scDialogHide(); scMsg(sc.cancel ? 'Renderowanie anulowane' : 'Renderowanie nie powiodło się'); return; }
      await pcFilesSaveNamed(new Blob(chunks, {type:'video/webm'}), scFmtDur(tot), name, true);
      scDeskRefresh(); sc.rendering = false;
      scDialogShow('<h3>✅ Gotowe!</h3><div class="scNote">Film „<b></b>” został wyrenderowany i czeka na pulpicie komputera.</div><div class="scBtns"><button id="scOk" type="button" class="scPrimary">OK</button></div>');
      scDialog.querySelector('b').textContent = name; document.getElementById('scOk').addEventListener('click', scDialogHide);
    }catch(err){
      if(iv) clearInterval(iv); try{ if(rec && rec.state !== 'inactive') rec.stop(); }catch(e){}
      sc.rendering = false; scDialogShow('<h3>Błąd</h3><div class="scNote">Nie udało się wyrenderować filmu.</div><div class="scBtns"><button id="scOk" type="button">OK</button></div>'); document.getElementById('scOk').addEventListener('click', scDialogHide);
    }
  }
  /* --- pulpit: wyrenderowane filmy jako ikony --- */
  function pcFilesPlay(r){
    openFiles(); pcFilesUrl = URL.createObjectURL(r.blob); pcFilesVideo.src = pcFilesUrl;
    pcFilesList.style.display = 'none'; pcFilesPlayer.style.display = 'flex';
    pcFilesBack.style.display = 'inline-block'; pcFilesTitle.textContent = '▶ ' + r.name; pcFilesVideo.play().catch(()=>{});
  }
  function scDeskRefresh(){
    pcFilesAll().then(items => {
      const box = document.getElementById('pcIcons');
      box.querySelectorAll('.pcDeskVid').forEach(n => n.remove());
      items.filter(r => r.desk).reverse().forEach(r => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pcIcon pcDeskVid'; b.title = r.name + ' (' + r.dur + ')';
        b.innerHTML = '<span>🎞️</span><em style="font-style:normal;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></em>';
        b.querySelector('em').textContent = r.name; b.addEventListener('click', () => pcFilesPlay(r)); box.appendChild(b);
      });
    }).catch(()=>{});
  }
  function scOpenWin(){
    scWin.classList.add('open'); scWin.setAttribute('aria-hidden','false'); scBinRender(); scRender_(); scShow(sc.t);
  }
  function scCloseWin(){
    if(sc.rendering) sc.cancel = true;
    scPause(); scDialogHide(); scWin.classList.remove('open'); scWin.setAttribute('aria-hidden','true');
  }
  pcShortcutDesktopIcon.addEventListener('click', scOpenWin);
  document.getElementById('scClose').addEventListener('click', scCloseWin);
  document.getElementById('pcPower').addEventListener('click', scCloseWin);
  document.getElementById('scPlay').addEventListener('click', () => { sc.playing ? scPause() : scPlay(); });
  document.getElementById('scSplit').addEventListener('click', scSplit);
  document.getElementById('scDel').addEventListener('click', scDelete);
  document.getElementById('scLeft').addEventListener('click', () => scMove(-1));
  document.getElementById('scRight').addEventListener('click', () => scMove(1));
  document.getElementById('scClear').addEventListener('click', scClear);
  document.getElementById('scExport').addEventListener('click', scExportDialog);
  document.getElementById('scZoom').addEventListener('input', e => { sc.pps = +e.target.value; scRender_(); });
  scWin.addEventListener('click', e => { const b = e.target.closest('button'); if(b) b.blur(); });   // Spacja nie ma „klikać” ostatniego przycisku
  function scSeekFromPointer(e){ const r = scInner.getBoundingClientRect(); scPause(); scShow((e.clientX - r.left)/sc.pps); }
  scRuler.addEventListener('pointerdown', e => {
    scSeekFromPointer(e); try{ scRuler.setPointerCapture(e.pointerId); }catch(err){}
    const mv = ev => scSeekFromPointer(ev), up = () => { scRuler.removeEventListener('pointermove', mv); scRuler.removeEventListener('pointerup', up); };
    scRuler.addEventListener('pointermove', mv); scRuler.addEventListener('pointerup', up);
  });
  scTrack.addEventListener('pointerdown', e => { if(e.target === scTrack){ sc.sel = null; scTrack.querySelectorAll('.scClip').forEach(n => n.classList.remove('sel')); scSeekFromPointer(e); } });
  addEventListener('keydown', e => {                                      // skróty: Spacja, S, Delete
    if(!scWin.classList.contains('open') || scModal.classList.contains('show')) return;
    if(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if(e.code === 'Space'){ e.preventDefault(); sc.playing ? scPause() : scPlay(); }
    else if(e.code === 'KeyS'){ e.preventDefault(); scSplit(); }
    else if(e.code === 'Delete' || e.code === 'Backspace'){ e.preventDefault(); scDelete(); }
  });
  scDeskRefresh();
  /* ===== Pepper – nagrywarka (instalacja 20 s) ===== */
  const pcPepperWindow = document.getElementById('pcPepperWindow');
  const pcPepIcon = document.getElementById('pcPepDesktopIcon');
  const pcInstallPepBtn = document.getElementById('pcInstallPepBtn');
  const pcPepStatus = document.getElementById('pcPepStatus');
  const pcPepProgress = document.getElementById('pcPepProgress');
  const pcPepBar = document.getElementById('pcPepProgressBar');
  const pepDot = document.getElementById('pcPepperDot'), pepTime = document.getElementById('pcPepperTime');
  const pepMsg = document.getElementById('pcPepperMsg'), pepLink = document.getElementById('pcPepperLink');
  let pepInstalled = false, pepInstalling = false, pepRec = null, pepChunks = [], pepTimer = null, pepStart = 0, pepUrl = null;
  try{ pepInstalled = localStorage.getItem('realLifePepperInstalled') === 'true'; }catch(e){}
  pcPepIcon.style.display = pepInstalled ? 'flex' : 'none';
  if(pepInstalled){ pcPepStatus.textContent = 'Pepper jest już zainstalowany.'; pcInstallPepBtn.textContent = 'Zainstalowano'; pcInstallPepBtn.disabled = true; }
  function pepStop(){
    if(pepRec && pepRec.state !== 'inactive') pepRec.stop();
    if(typeof pepCleanup === 'function' && pepCleanup){ const c = pepCleanup; pepCleanup = null; setTimeout(c,300); }
    clearInterval(pepTimer); pepTimer = null; pepDot.classList.remove('rec');
  }
  let pepCleanup = null;
  function pepFallbackStream(){
    // Zapasowy tryb: Pepper sam rysuje ekran komputera z gry (gdy przeglądarka nie pozwala nagrać karty).
    const ui = document.getElementById('computerUI');
    const r0 = ui.getBoundingClientRect();
    const cv = document.createElement('canvas');
    cv.width = Math.max(320, Math.round(r0.width)); cv.height = Math.max(240, Math.round(r0.height));
    const g = cv.getContext('2d');
    const wins = ['pcInternetWindow','pcFilesWindow','pcSixWindow','pcPepperWindow'];
    function lines(el, x, y, w, k, color){
      g.fillStyle = color; g.font = Math.round(13*k) + 'px system-ui,sans-serif'; g.textBaseline = 'top';
      const t = (el.innerText || '').split('\n').map(a=>a.trim()).filter(Boolean).slice(0,16);
      t.forEach((ln,n)=>g.fillText(ln.slice(0,60), x, y + n*18*k, w));
    }
    function draw(){
      const R = ui.getBoundingClientRect(); const k = cv.width / Math.max(1,R.width);
      const bg = g.createLinearGradient(0,0,cv.width,cv.height);
      bg.addColorStop(0,'#1679a8'); bg.addColorStop(.55,'#164b78'); bg.addColorStop(1,'#242b65');
      g.fillStyle = bg; g.fillRect(0,0,cv.width,cv.height);
      document.querySelectorAll('#pcIcons .pcIcon').forEach(b=>{
        if(!b.offsetParent) return;
        const r = b.getBoundingClientRect(), x = (r.left-R.left)*k, y = (r.top-R.top)*k;
        g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#fff';
        g.font = Math.round(32*k) + 'px system-ui,sans-serif'; g.fillText(b.querySelector('span').textContent, x + r.width*k/2, y);
        g.font = Math.round(12*k) + 'px system-ui,sans-serif'; g.fillText(b.textContent.replace(b.querySelector('span').textContent,''), x + r.width*k/2, y + 42*k);
      });
      g.textAlign = 'left';
      wins.forEach(id=>{
        const w = document.getElementById(id);
        if(!w || !w.classList.contains('open')) return;
        const r = w.getBoundingClientRect(), x = (r.left-R.left)*k, y = (r.top-R.top)*k, ww = r.width*k, hh = r.height*k;
        const dark = id === 'pcPepperWindow' || id === 'pcSixWindow';
        g.fillStyle = dark ? '#1c1f26' : '#f3f5f8'; g.fillRect(x,y,ww,hh);
        g.fillStyle = dark ? '#12151a' : '#e4e9f0'; g.fillRect(x,y,ww,40*k);
        const title = w.querySelector('span'); g.fillStyle = dark ? '#fff' : '#17202b';
        g.font = 'bold ' + Math.round(14*k) + 'px system-ui,sans-serif'; g.textBaseline = 'middle';
        g.fillText(id === 'pcSixWindow' ? '🐮 6 bierze!' : (title ? title.textContent : ''), x + 12*k, y + 20*k);
        if(id === 'pcSixWindow'){ g.fillStyle = '#fff'; g.textBaseline = 'top'; g.fillText('Gra jest otwarta (jej obraz nie jest widoczny w tym trybie nagrywania).', x + 12*k, y + 60*k, ww - 24*k); return; }
        lines(w, x + 12*k, y + 52*k, ww - 24*k, k, dark ? '#fff' : '#17202b');
        const v = id === 'pcFilesWindow' ? document.getElementById('pcFilesVideo') : null;
        if(v && v.offsetParent && v.readyState >= 2){ const vr = v.getBoundingClientRect(); try{ g.drawImage(v,(vr.left-R.left)*k,(vr.top-R.top)*k,vr.width*k,vr.height*k); }catch(e){} }
      });
      const tb = document.getElementById('pcTaskbar');
      if(tb){ const r = tb.getBoundingClientRect(); g.fillStyle = 'rgba(10,18,30,.9)'; g.fillRect((r.left-R.left)*k,(r.top-R.top)*k,r.width*k,r.height*k); lines(tb,(r.left-R.left)*k + 12*k,(r.top-R.top)*k + 12*k, r.width*k, k, '#fff'); }
      if(pepRec && pepRec.state === 'recording'){ g.fillStyle = '#e53935'; g.beginPath(); g.arc(cv.width-24*k,22*k,7*k,0,7); g.fill(); }
    }
    draw(); const iv = setInterval(draw, 1000/30);
    return {stream: cv.captureStream(30), cleanup: ()=>clearInterval(iv)};
  }
  async function pepGetSource(){
    const ui = document.getElementById('computerUI');
    if(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia){
      try{
        const st = await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30}, audio:false, preferCurrentTab:true, selfBrowserSurface:'include'});
        const track = st.getVideoTracks()[0];
        if(window.CropTarget && track.cropTo){ try{ await track.cropTo(await CropTarget.fromElement(ui)); }catch(e){} }
        track.addEventListener('ended', pepStop);
        return {stream: st, cleanup: ()=>st.getTracks().forEach(t=>t.stop()), real:true};
      }catch(e){ /* odmowa lub brak obsługi – użyj trybu zapasowego */ }
    }
    return pepFallbackStream();
  }
  async function pepToggle(){
    if(pepRec && pepRec.state === 'recording'){ pepStop(); return; }
    if(typeof MediaRecorder === 'undefined'){ pepMsg.textContent = 'Ta przeglądarka nie obsługuje nagrywania.'; return; }
    let src;
    try{
      src = await pepGetSource();
      const mime = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
      pepRec = mime ? new MediaRecorder(src.stream,{mimeType:mime}) : new MediaRecorder(src.stream);
    }catch(e){ if(src) src.cleanup(); pepMsg.textContent = 'Nie udało się rozpocząć nagrywania.'; return; }
    pepCleanup = src.cleanup;
    pepChunks = []; pepLink.style.display = 'none';
    pepRec.ondataavailable = e => { if(e.data && e.data.size) pepChunks.push(e.data); };
    pepRec.onstop = () => {
      if(!pepChunks.length){ pepMsg.textContent = 'Nagranie jest puste.'; return; }
      const dur = pepTime.textContent;
      pcFilesSave(new Blob(pepChunks,{type:'video/webm'}), dur).then(()=>{
        pepLink.style.display = 'inline-block';
        pepMsg.textContent = 'Nagranie ekranu (' + dur + ') zapisane w Plikach na komputerze w grze.';
      }).catch(()=>{ pepMsg.textContent = 'Nie udało się zapisać nagrania w Plikach.'; });
    };
    pepRec.start(1000); pepStart = Date.now(); pepDot.classList.add('rec');
    pepTime.textContent = '00:00';
    pepMsg.textContent = 'Nagrywanie ekranu komputera… kliknij ponownie, aby zatrzymać.';
    pepTimer = setInterval(()=>{ const t = Math.floor((Date.now()-pepStart)/1000); pepTime.textContent = String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'); },250);
  }
  pepDot.addEventListener('click', pepToggle);
  pepLink.addEventListener('click',e=>{ e.preventDefault(); openFiles(); });
  pcPepIcon.addEventListener('click',()=>{ pcPepperWindow.classList.add('open'); pcPepperWindow.setAttribute('aria-hidden','false'); });
  document.getElementById('pcPepperClose').addEventListener('click',()=>{ pcPepperWindow.classList.remove('open'); pcPepperWindow.setAttribute('aria-hidden','true'); });
  document.getElementById('pcPower').addEventListener('click',()=>{ pepStop(); pcPepperWindow.classList.remove('open'); });
  pcInstallPepBtn.addEventListener('click',()=>{
    if(pepInstalled || pepInstalling) return;
    pepInstalling = true; pcInstallPepBtn.disabled = true; pcInstallPepBtn.textContent = 'Instalowanie…';
    pcPepProgress.style.display = 'block'; pcPepBar.style.width = '0%';
    const started = Date.now();
    const tick = ()=>{
      const sec = (Date.now()-started)/1000, progress = Math.min(100, sec/20*100);
      pcPepBar.style.width = progress + '%';
      if(progress < 100){ pcPepStatus.textContent = 'Pobieranie i instalacja Pepper… ' + Math.max(0, Math.ceil(20-sec)) + ' s'; setTimeout(tick,100); return; }
      pepInstalling = false; pepInstalled = true;
      try{ localStorage.setItem('realLifePepperInstalled','true'); }catch(e){}
      pcPepStatus.textContent = 'Instalacja zakończona! Pepper pojawił się na pulpicie.';
      pcInstallPepBtn.textContent = 'Zainstalowano'; pcPepIcon.style.display = 'flex';
    };
    setTimeout(tick,100);
  });
  const pcYoutubePage = document.getElementById('pcYoutubePage');
  const pcYoutubeCreate = document.getElementById('pcYoutubeCreate');
  const pcYoutubeChannel = document.getElementById('pcYoutubeChannel');
  const pcYoutubeNameInput = document.getElementById('pcYoutubeChannelName');
  const pcYoutubeMessage = document.getElementById('pcYoutubeMessage');
  let youtubeChannelName = localStorage.getItem('realLifeYoutubeChannel') || '';
  function renderYoutubePage(){
    const hasChannel = !!youtubeChannelName;
    pcYoutubeCreate.style.display = hasChannel ? 'none' : 'block';
    pcYoutubeChannel.style.display = hasChannel ? 'block' : 'none';
    document.getElementById('pcYoutubeChannelTitle').textContent = youtubeChannelName;
    pcYoutubeMessage.textContent = '';
  }
  document.getElementById('pcInternetIcon').addEventListener('click',()=>{
    pcInternetWindow.classList.add('open'); pcInternetWindow.setAttribute('aria-hidden','false');
  });
  document.getElementById('pcInternetClose').addEventListener('click',()=>{
    pcInternetWindow.classList.remove('open'); pcInternetWindow.setAttribute('aria-hidden','true');
  });
  document.querySelectorAll('.pcInternetTab').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.pcInternetTab').forEach(t=>t.classList.toggle('active',t===tab));
    const isYoutube = tab.dataset.page === 'youtube';
    const isInstallers = tab.dataset.page === 'installers';
    pcInternetBlank.style.display = 'none';
    pcInstallersPage.style.display = isInstallers ? 'block' : 'none';
    pcYoutubePage.style.display = isYoutube ? 'block' : 'none';
    if(isYoutube) renderYoutubePage();
  }));
  document.getElementById('pcYoutubeCreateBtn').addEventListener('click',()=>{
    const name = pcYoutubeNameInput.value.trim();
    if(!name){ pcYoutubeMessage.textContent = 'Wpisz nazwę kanału.'; pcYoutubeNameInput.focus(); return; }
    youtubeChannelName = name;
    localStorage.setItem('realLifeYoutubeChannel', name);
    renderYoutubePage();
  });
  // Siedzenie na krześle: postać siada na siedzisku, twarzą do przodu krzesła
  let sitting = null;
  function sitOn(pd){
    sitting = pd;
    const th = pd.mesh.rotation.y + (pd.kind === 'bathtub' ? Math.PI/2 : 0);      // w wannie postać siedzi wzdłuż jej długiej osi, plecami do baterii
    player.position.set(pd.wall.x, 0, pd.wall.z); vy = 0;
    facing = th; player.rotation.y = th;
    toast(pd.kind === 'bathtub' ? 'Kąpiesz się 🛁 Higiena rośnie • F lub Shift – wyjdź' : pd.kind === 'bench' ? 'Siedzisz na ławce 🪑 F lub Shift – wstań' : 'Siedzisz 🪑 F lub Shift – wstań');
  }
  // Bezpieczne miejsce po zsiadnięciu / wyjściu (rower, wanna, krzesło, ławka, auto): od (ox,oz) próbuje kierunku (bx,bz), a potem innych stron i krótszych odległości.
  // Odrzuca punkty w ścianie/meblu/budynku oraz takie, do których odcinek od miejsca startu przecinałby ścianę (inaczej lądowałeś po drugiej stronie ściany).
  function safeExitSpot(ox, oz, bx, bz, ignoreWall, minDist){
    const rects = [];
    for(const w of WALLS){
      if(w === ignoreWall || w.enter !== undefined) continue;
      if(Math.abs(w.x - ox) > w.w/2 + 7 || Math.abs(w.z - oz) > w.d/2 + 7) continue;
      rects.push([w.x - w.w/2, w.x + w.w/2, w.z - w.d/2, w.z + w.d/2]);
    }
    for(const b of BUILDINGS){
      if(b.open) continue;
      if(Math.abs(b.x - ox) > b.w/2 + 7 || Math.abs(b.z - oz) > b.d/2 + 7) continue;
      rects.push([b.x - b.w/2 - 0.4, b.x + b.w/2 + 0.4, b.z - b.d/2 - 0.4, b.z + b.d/2 + 0.4]);
    }
    const segHit = (x0, z0, x1, z1, r, e) => {
      let t0 = 0, t1 = 1; const dx = x1 - x0, dz = z1 - z0;
      for(const [pp, q, lo, hi] of [[dx, x0, r[0]-e, r[1]+e], [dz, z0, r[2]-e, r[3]+e]]){
        if(Math.abs(pp) < 1e-9){ if(q < lo || q > hi) return false; }
        else { let a = (lo - q)/pp, c = (hi - q)/pp; if(a > c){ const tmp = a; a = c; c = tmp; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); if(t0 > t1) return false; }
      }
      return true;
    };
    const base = Math.hypot(bx, bz) || 1, phi = Math.atan2(bx, bz), mn = minDist || 0.8;
    for(const f of [1, 0.85, 0.7, 0.6]){
      const dist = Math.max(mn, base*f);
      for(const da of [0, Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2, Math.PI*0.75, -Math.PI*0.75, Math.PI]){
        const x = ox + Math.sin(phi + da)*dist, z = oz + Math.cos(phi + da)*dist;
        if(rects.some(r => segHit(x, z, x, z, r, 0.45) || segHit(ox, oz, x, z, r, 0.05))) continue;
        return {x, z};
      }
    }
    return {x:ox + bx, z:oz + bz};                                                  // nic wolnego wokół – stare zachowanie (kolizje i tak wypchną postać)
  }
  function standUp(){
    if(!sitting) return;
    if(computerUiOpen) closeComputer();
    const th = sitting.mesh.rotation.y;
    const sp = safeExitSpot(sitting.wall.x, sitting.wall.z, Math.sin(th)*0.95, Math.cos(th)*0.95, sitting.wall, 0.8);
    player.position.set(sp.x, 0, sp.z);
    sitting = null;
  }
  function pickupDesk(pd){
    if(sitting){ toast('Najpierw wstań z krzesła'); return; }
    if(pd.kind === 'lamp'){
      if(!addItem('lamp')){ toast('Ekwipunek pełny!'); return; }
      releaseLampLight(pd); scene.remove(pd.mesh); placedDesks.splice(placedDesks.indexOf(pd), 1);
      renderInv(); toast('Zdjęto lampę 💡'); return;
    }
    if(pd.kind === 'oven'){
      if(pd.pizza){ toast('Najpierw wyjmij pizzę z piekarnika 🍕'); return; }
      if(freeSlots() < OVEN_SLOTS){ toast(`Potrzebujesz ${OVEN_SLOTS} wolnych slotów w ekwipunku (wolne: ${freeSlots()})`); return; }
      addBig('oven'); scene.remove(pd.mesh);
      WALLS.splice(WALLS.indexOf(pd.wall), 1); placedDesks.splice(placedDesks.indexOf(pd), 1);
      renderInv(); toast('Podniesiono piekarnik 🍳'); return;
    }
    if(pd.kind === 'chair' || pd.kind === 'wardrobe' || FIXT.includes(pd.kind)){
      if(!addItem(pd.kind)){ toast('Ekwipunek pełny!'); return; }
      if(pd.kind === 'wardrobe') closeWardrobe();
      disposeFurnMesh(pd.mesh); scene.remove(pd.mesh);
      WALLS.splice(WALLS.indexOf(pd.wall), 1); placedDesks.splice(placedDesks.indexOf(pd), 1);
      renderInv(); toast(FIXT.includes(pd.kind) ? `Podniesiono: ${ITEMS[pd.kind].n} ${ITEMS[pd.kind].i}` : pd.kind === 'chair' ? 'Podniesiono krzesło 🪑' : 'Podniesiono szafę 🚪'); return;
    }
    if(freeSlots() < DESK_SLOTS){ toast(`Potrzebujesz ${DESK_SLOTS} wolnych slotów w ekwipunku (wolne: ${freeSlots()})`); return; }
    addDesk();
    scene.remove(pd.mesh);
    WALLS.splice(WALLS.indexOf(pd.wall), 1); placedDesks.splice(placedDesks.indexOf(pd), 1);
    renderInv(); toast('Podniesiono biurko 🗄️');
  }
  document.getElementById('pRot').onclick = rotatePlacement; document.getElementById('pOk').onclick = confirmPlacement; document.getElementById('pNo').onclick = () => cancelPlacement();

  // ===== Piekarnik: pizza z paskiem pieczenia. Pasek napełnia się przez OVEN_BAKE s (gotowe), potem jeszcze OVEN_OVER s „przepełnienia”;
  // wyjęta w tym czasie jest dobra, a po przepełnieniu paska – spalona. Wyjęta przed napełnieniem paska wraca surowa.
  const OVEN_BAKE = 25, OVEN_OVER = 8;
  const ovenEl = document.getElementById('ovenUI');
  let ovenCur = null;
  const ovenOpen = () => ovenEl.style.display === 'block';
  const ovenState = pd => !pd.pizza ? 'empty' : pd.pizza.t < OVEN_BAKE ? 'raw' : pd.pizza.t <= OVEN_BAKE + OVEN_OVER ? 'ready' : 'burnt';
  function ovenGlow(pd){
    const gl = pd.mesh && pd.mesh.userData && pd.mesh.userData.glass; if(!gl) return;
    const st = ovenState(pd); if(pd.glow === st) return; pd.glow = st;
    gl.material.emissive.setHex(st === 'empty' ? 0x000000 : st === 'raw' ? 0x7a3208 : st === 'ready' ? 0xd98a14 : 0x2a0000);
  }
  function updateOvens(dt){
    for(const pd of placedDesks){
      if(pd.kind !== 'oven') continue;
      if(pd.pizza){
        const before = ovenState(pd);
        pd.pizza.t = Math.min(pd.pizza.t + dt, OVEN_BAKE + OVEN_OVER + 30);
        const after = ovenState(pd);
        if(before !== after){
          if(after === 'ready') toast('Pizza gotowa! 🍕 Wyjmij ją z piekarnika, zanim się przepali');
          else if(after === 'burnt') toast('Pizza się przepaliła 🔥 Wyjmij ją z piekarnika');
        }
      }
      ovenGlow(pd);
    }
  }
  function openOven(pd){
    if(!pd) return;
    ovenCur = pd; invEl.style.display = 'none'; promptEl.style.display = 'none';
    ovenEl.style.display = 'block'; refreshOvenUI();
  }
  function closeOven(){ ovenEl.style.display = 'none'; ovenCur = null; }
  function refreshOvenUI(){
    const pd = ovenCur; if(!pd) return;
    const st = ovenState(pd), t = pd.pizza ? pd.pizza.t : 0;
    const bake = Math.min(1, t / OVEN_BAKE), over = Math.max(0, Math.min(1, (t - OVEN_BAKE) / OVEN_OVER));
    const fill = document.getElementById('ovenFill'), ofill = document.getElementById('ovenOverFill');
    fill.style.width = (bake*100).toFixed(1) + '%'; fill.className = bake >= 1 ? 'full' : '';
    ofill.style.width = (over*100).toFixed(1) + '%';
    document.getElementById('ovenPct').textContent = st === 'empty' ? '—' : Math.floor(bake*100) + '%';
    document.getElementById('ovenOverWrap').style.display = (st === 'ready' || st === 'burnt') ? 'block' : 'none';
    const msg = document.getElementById('ovenMsg');
    msg.textContent = st === 'empty' ? 'Piekarnik jest pusty. Włóż mrożoną pizzę 🍕'
      : st === 'raw' ? 'Pizza się piecze… poczekaj, aż pasek się napełni'
      : st === 'ready' ? 'Pasek pełny – wyjmij pizzę! Jeśli pasek się przepełni, pizza się spali'
      : 'Pasek się przepełnił – pizza jest spalona 🔥';
    msg.className = st === 'ready' ? 'ok' : st === 'burnt' ? 'bad' : '';
    document.getElementById('ovenPut').disabled = st !== 'empty';
    document.getElementById('ovenTake').disabled = st === 'empty';
  }
  function ovenPut(){
    const pd = ovenCur; if(!pd || pd.pizza) return;
    const k = inv.findIndex(x => x && x.id === 'pizzafrozen');
    if(k < 0){ toast('Nie masz mrożonej pizzy 🍕 – kupisz ją w lodówce w Pandy'); return; }
    removeOne(k); pd.pizza = {t:0}; ovenGlow(pd); renderInv(); refreshOvenUI();
    toast('Pizza w piekarniku 🍳 Wyjmij ją, gdy pasek się napełni');
  }
  function ovenTake(){
    const pd = ovenCur; if(!pd || !pd.pizza) return;
    const st = ovenState(pd), id = st === 'raw' ? 'pizzafrozen' : st === 'ready' ? 'pizza' : 'pizzaburnt';
    if(!(inv.some(x => x && x.id === id) || inv.indexOf(null) >= 0)){ toast('Ekwipunek pełny – zrób miejsce'); return; }
    addItem(id); pd.pizza = null; ovenGlow(pd); renderInv(); refreshOvenUI();
    toast(st === 'raw' ? 'Pizza jeszcze się nie upiekła – wyjęto ją surową 🍕' : st === 'ready' ? 'Wyjęto upieczoną pizzę 🍕 Smacznego!' : 'Wyjęto spaloną pizzę 🔥');
  }
  document.getElementById('ovenPut').onclick = ovenPut; document.getElementById('ovenTake').onclick = ovenTake; document.getElementById('ovenClose').onclick = closeOven;
  addEventListener('keydown', e => { if(e.code === 'Escape' && ovenOpen()) closeOven(); });
  setInterval(() => { if(!ovenOpen()) return; if(!homeInside || !ovenCur || !placedDesks.includes(ovenCur) || nearDesk('oven') !== ovenCur){ closeOven(); return; } refreshOvenUI(); }, 120);

  // Drzewa (instancje – szybkie nawet przy setkach sztuk)
  const treeColl = [];
  const spots = [];
  function rnd(a,b){ return a + Math.random()*(b-a); }
  const streetEdge = ROAD_W/2 + SIDEWALK_GAP + SIDEWALK_W;
  // rząd drzew wzdłuż chodników
  for(let x=-76; x<=100; x+=12){
    [-1, 1].forEach(s => spots.push({x: x+rnd(-1,1), z: ROAD_Z + s*(streetEdge+1.8), s: rnd(0.8,1.0)}));
  }
  // drzewa rozsiane po łące
  for(let i=0;i<350;i++){
    const x = rnd(-220,220), z = rnd(-220,220);
    if(Math.abs(z-ROAD_Z) < streetEdge+4) continue;   // nie na ulicy
    if(Math.hypot(x,z) < 8) continue;                 // wolne miejsce na starcie
    spots.push({x, z, s: rnd(0.7,1.5)});
  }
  // Drzewa nigdy nie stoją na jezdni ani chodniku – ani głównej, ani bocznej ulicy (z zapasem m na pień).
  const onStreet = (x, z, m) =>
    (Math.abs(x) < ROAD_LEN/2 + m && Math.abs(z - ROAD_Z) < streetEdge + m) ||                          // główna ulica z chodnikami
    (Math.abs(x - SIDE_ROAD_X) < streetEdge + m && z > SIDE_ROAD_START - m && z < SIDE_ROAD_END + m) ||  // boczna ulica z chodnikami
    onNewStreets(x, z, m);                                                                              // rondo, zjazd i supermarket
  for(let i=spots.length-1;i>=0;i--) if(onStreet(spots[i].x, spots[i].z, 1.2)) spots.splice(i,1);
  for(let i=spots.length-1;i>=0;i--) if(inShop(spots[i].x, spots[i].z, 1.5) || HOMES.some(H => { const D = homeDimsOf(H); return Math.abs(spots[i].x-H.x) < D.ww/2+2 && Math.abs(spots[i].z-H.z) < D.wd/2+2; })) spots.splice(i,1);
  const FOUNT = {x:39, z:28};                                     // fontanna: środek między Krótką (x=0) a Poprzeczną (x=78), na wolnym placu za domami
  for(let i=spots.length-1;i>=0;i--) if(Math.hypot(spots[i].x-FOUNT.x, spots[i].z-FOUNT.z) < 9.5) spots.splice(i,1);   // bez drzew na placu fontanny
  const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25,0.35,3,7), new THREE.MeshLambertMaterial({color:0x6b4423}), spots.length);
  const crownM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8,1), new THREE.MeshLambertMaterial({flatShading:true}), spots.length);
  trunkM.castShadow = crownM.castShadow = true;
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  spots.forEach((t,i) => {
    dummy.rotation.set(0, Math.random()*6.28, 0);
    dummy.scale.setScalar(t.s);
    dummy.position.set(t.x, 1.5*t.s, t.z); dummy.updateMatrix(); trunkM.setMatrixAt(i, dummy.matrix);
    dummy.scale.set(t.s, t.s*rnd(0.9,1.2), t.s);
    dummy.position.set(t.x, 4.2*t.s, t.z); dummy.updateMatrix(); crownM.setMatrixAt(i, dummy.matrix);
    col.setHSL(rnd(0.24,0.36), 0.55, rnd(0.25,0.38)); crownM.setColorAt(i, col);
    treeColl.push({x:t.x, z:t.z, r:0.35*t.s + 0.3});
  });
  ROUND_COLL.forEach(c => treeColl.push(c));   // wyspa ronda
  SIGN_COLL.forEach(c => treeColl.push(c));    // słupki znaków i tabliczek ulic

  // ===== Fontanna na placu między Krótką a Poprzeczną =====
  const fountainJets = (function buildFountain(){
    const g = new THREE.Group(); g.position.set(FOUNT.x, 0, FOUNT.z);
    const lm = (c, o) => new THREE.MeshLambertMaterial(Object.assign({color:c}, o||{}));
    const stone = lm(0xc9c6bd), stoneDark = lm(0x9b978d), WATER_Y = 0.72;
    const part = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    part(new THREE.CylinderGeometry(7.8, 7.8, 0.12, 48), lm(0xd8d4c8), 0.06);               // utwardzony plac
    part(new THREE.CylinderGeometry(7.0, 7.0, 0.16, 48), lm(0xbdb9ae), 0.14);                // pierścień płyt
    const wall = new THREE.Mesh(new THREE.LatheGeometry([[3.0,0.1],[3.0,0.95],[3.15,1.0],[3.65,1.0],[3.7,0.95],[3.7,0.1]].map(([r,y]) => new THREE.Vector2(r,y)), 40),
      new THREE.MeshLambertMaterial({color:0xcfccc2, side:THREE.DoubleSide}));
    wall.castShadow = wall.receiveShadow = true; g.add(wall);                                  // obrzeże basenu
    const water = new THREE.Mesh(new THREE.CircleGeometry(3.0, 40), new THREE.MeshLambertMaterial({color:0x3f9fe0, emissive:0x0b3a66, transparent:true, opacity:0.82}));
    water.rotation.x = -Math.PI/2; water.position.y = WATER_Y; g.add(water);
    part(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 20), stoneDark, 0.35);                      // cokół
    part(new THREE.CylinderGeometry(0.35, 0.5, 1.5, 16), stone, 1.0);                          // trzon
    part(new THREE.CylinderGeometry(1.5, 0.55, 0.38, 24), stone, 1.9);                         // dolna misa
    part(new THREE.CylinderGeometry(0.22, 0.3, 0.9, 12), stone, 2.45);                         // górna kolumna
    part(new THREE.CylinderGeometry(0.85, 0.3, 0.28, 20), stone, 2.95);                        // górna misa
    part(new THREE.SphereGeometry(0.22, 12, 8), stoneDark, 3.2);                               // zwieńczenie
    const lvl = new THREE.Mesh(new THREE.CircleGeometry(1.32, 24), new THREE.MeshLambertMaterial({color:0x3f9fe0, emissive:0x0b3a66, transparent:true, opacity:0.85}));
    lvl.rotation.x = -Math.PI/2; lvl.position.y = 2.1; g.add(lvl);                             // woda w dolnej misie
    // Strumienie: kropelki lecące parabolą (z górnej misy na boki, z dolnej do basenu, plus pionowy strumień)
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const cx = cv.getContext('2d'), gr = cx.createRadialGradient(16,16,0,16,16,16);
    gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.5,'rgba(190,225,255,0.7)'); gr.addColorStop(1,'rgba(190,225,255,0)');
    cx.fillStyle = gr; cx.fillRect(0,0,32,32);
    const N = 150, arr = new Float32Array(N*3), jets = [];
    for(let i=0;i<N;i++){
      if(i < 96) jets.push({kind:0, a:(i%8)/8*Math.PI*2, ph:Math.random(), R:1.8 + Math.random()*0.5});          // 8 łuków z górnej misy
      else if(i < 126) jets.push({kind:1, a:(i%10)/10*Math.PI*2, ph:Math.random(), R:1.0 + Math.random()*0.35});   // opadanie z dolnej misy
      else jets.push({kind:2, a:Math.random()*6.28, ph:Math.random(), R:Math.random()*0.18});                      // pionowy strumień
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({size:0.2, map:new THREE.CanvasTexture(cv), transparent:true, depthWrite:false, color:0xffffff}));
    pts.frustumCulled = false; g.add(pts);
    scene.add(g);
    treeColl.push({x:FOUNT.x, z:FOUNT.z, r:3.9});                                              // basen jest przeszkodą
    return {pts, arr, jets, water, WATER_Y};
  })();
  // 4 ławki dookoła fontanny (na pierścieniu płyt, siedziskiem do basenu): twarde i można na nich siedzieć (F), jak na przystankach
  (function buildFountainBenches(){
    const wood = new THREE.MeshLambertMaterial({color:0x8a5a32}), iron = new THREE.MeshLambertMaterial({color:0x2f3338});
    const R = 6.4, BASE = 0.22;
    [0, 1, 2, 3].forEach(k => {
      const a = k*Math.PI/2;                                                                   // E, S, W, N – ławka równoległa do osi, więc kolizja prostokątna pasuje idealnie
      const g = new THREE.Group();
      const add = (w,h,d,mat,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; g.add(m); };
      add(1.9,0.07,0.52,wood,0,0.28,0);                                                        // siedzisko (góra ok. 0,53 nad ziemią – jak na przystankach)
      add(1.9,0.4,0.06,wood,0,0.62,-0.27);                                                     // oparcie (od strony zewnętrznej)
      [-0.85,0.85].forEach(x => { add(0.07,0.26,0.5,iron,x,0.13,0); add(0.07,0.55,0.07,iron,x,0.52,-0.27); });   // boki ze stali
      const bx = FOUNT.x + Math.cos(a)*R, bz = FOUNT.z + Math.sin(a)*R;
      g.position.set(bx, BASE, bz);
      const th = Math.atan2(-Math.cos(a), -Math.sin(a));                                       // przód ławki (+z) w stronę fontanny
      g.rotation.y = th; scene.add(g);
      const quarter = Math.abs(Math.sin(th)) > 0.5;                                            // ławka obrócona o 90° – wymiary w świecie zamienione
      const wl = {x:bx, z:bz, w:quarter ? 0.52 : 1.9, d:quarter ? 1.9 : 0.52};
      WALLS.push(wl);                                                                          // twarda ławka; siedzący gracz jest z niej „wyłączony” (pd.wall)
      BENCH_SEATS.push({x:bx, z:bz, pd:{kind:'bench', mesh:{rotation:{y:th}}, wall:wl}});     // F – usiądź / wstań (sitOn / standUp)
    });
  })();
  function updateFountain(t){
    const F = fountainJets, p = player.position;
    if(Math.hypot(p.x - FOUNT.x, p.z - FOUNT.z) > 90) return;                                  // daleko – nie animujemy
    const a = F.arr;
    F.jets.forEach((j, i) => {
      const u = (t*0.7 + j.ph) % 1;
      let r, y;
      if(j.kind === 0){ r = (0.25 + (j.R - 0.25)*u) * (1.2 + 0.5*u); y = 3.3 + (F.WATER_Y - 3.3)*u*u + 1.1*4*u*(1-u); }
      else if(j.kind === 1){ r = 1.0 + (j.R + 0.8)*u; y = 2.1 + (F.WATER_Y - 2.1)*u*u + 0.3*4*u*(1-u); }
      else { r = j.R*u; y = 3.4 + 1.5*4*u*(1-u); }
      a[i*3] = Math.cos(j.a)*r; a[i*3+1] = y; a[i*3+2] = Math.sin(j.a)*r;
    });
    F.pts.geometry.attributes.position.needsUpdate = true;
    F.water.material.opacity = 0.8 + Math.sin(t*2.0)*0.04;
  }
  let streetLampHalo = null;
  const streetLampHeadMat = new THREE.MeshBasicMaterial({color:0x666660}), streetLampOn = new THREE.Color(0xfff0c0);

  // ===== Lampy uliczne: słup + ramię + świecąca oprawa, poświata i kilka prawdziwych świateł przy graczu =====
  const streetLampList = [];
  (function buildStreetLamps(){
    const OFF = ROAD_W/2 + 0.75;                       // przy krawężniku, po stronie jezdni
    const add = (x, z, dx, dz, solid = true) => streetLampList.push({x, z, dx, dz, solid});
    [-52,-32,-14,14,34,54,98,108].forEach(x => add(x, ROAD_Z + OFF, 0, -1));         // Długa, strona północna (bez x=-72: stała na zachodnim rondzie)
    [-66,-42,-18,6,30,54,78,102].forEach(x => add(x, ROAD_Z - OFF, 0, 1));            // Długa, strona południowa
    [6,30,54].forEach(z => add(SIDE_ROAD_X + OFF, z, -1, 0));                         // Krótka
    [18,42,66].forEach(z => add(SIDE_ROAD_X - OFF, z, 1, 0));
    [6,30,54].forEach(z => add(POP_X + OFF, z, -1, 0));                               // Poprzeczna
    [18,42].forEach(z => add(POP_X - OFF, z, 1, 0));
    [-30,-48,-66,-84].forEach(z => add(GORN_X + GORN_W/2 + 0.65, z, -1, 0));          // Górnicza
    [-39,-57,-75].forEach(z => add(GORN_X - GORN_W/2 - 0.65, z, 1, 0));
    [12,60].forEach(z => add(RB.x + OFF, z, -1, 0));                                  // Społeczna
    [36,84].forEach(z => add(RB.x - OFF, z, 1, 0));
    add(RB.x + OFF, -32, -1, 0); add(RB.x - OFF, -41, 1, 0);
    add(AGD.x - 9, -61.5, 0, 1); add(AGD.x + 9, -61.5, 0, 1);                         // parking przed sklepem AGD                          // zjazd do supermarketu
    [90, 210, 330].forEach(deg => {                                                    // wyspa ronda
      const a = deg*Math.PI/180;
      add(RB.x + Math.cos(a)*3.8, RB.z + Math.sin(a)*3.8, Math.cos(a), Math.sin(a), false);
    });

    const H = 5.6, ARM = 1.3, n = streetLampList.length;
    const poleM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.11, H, 8), new THREE.MeshLambertMaterial({color:0x33363b}), n);
    const armM  = new THREE.InstancedMesh(new THREE.BoxGeometry(ARM, 0.09, 0.09), new THREE.MeshLambertMaterial({color:0x33363b}), n);
    const headM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 0.12, 0.34), streetLampHeadMat, n);
    const d = new THREE.Object3D();
    const haloPos = new Float32Array(n*3);
    streetLampList.forEach((l, i) => {
      const rot = Math.atan2(-l.dz, l.dx);
      d.rotation.set(0, 0, 0); d.position.set(l.x, 0.2 + H/2, l.z); d.updateMatrix(); poleM.setMatrixAt(i, d.matrix);
      d.rotation.set(0, rot, 0);
      d.position.set(l.x + l.dx*ARM/2, 0.2 + H, l.z + l.dz*ARM/2); d.updateMatrix(); armM.setMatrixAt(i, d.matrix);
      d.position.set(l.x + l.dx*ARM, 0.2 + H - 0.06, l.z + l.dz*ARM); d.updateMatrix(); headM.setMatrixAt(i, d.matrix);
      l.hx = l.x + l.dx*ARM; l.hy = 0.2 + H - 0.2; l.hz = l.z + l.dz*ARM;            // punkt, z którego świeci lampa
      haloPos.set([l.hx, l.hy + 0.1, l.hz], i*3);
      if(l.solid) treeColl.push({x:l.x, z:l.z, r:0.32});
    });
    [poleM, armM, headM].forEach(m => { m.frustumCulled = false; scene.add(m); });
    poleM.castShadow = true;

    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const cg = cv.getContext('2d'), grd = cg.createRadialGradient(32,32,0,32,32,32);
    grd.addColorStop(0, 'rgba(255,240,200,1)'); grd.addColorStop(0.25, 'rgba(255,220,150,.55)'); grd.addColorStop(1, 'rgba(255,200,120,0)');
    cg.fillStyle = grd; cg.fillRect(0,0,64,64);
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    streetLampHalo = new THREE.Points(hg, new THREE.PointsMaterial({map:new THREE.CanvasTexture(cv), size:3.2, sizeAttenuation:true, transparent:true, opacity:0,
      blending:THREE.AdditiveBlending, depthWrite:false}));
    streetLampHalo.frustumCulled = false; streetLampHalo.visible = false; scene.add(streetLampHalo);
  })();
  // Stała pula świateł (zmiana liczby świateł wymusiłaby rekompilację shaderów) – świecą lampy najbliższe graczowi.
  const streetLampLights = [];
  for(let i = 0; i < 6; i++){ const pl = new THREE.PointLight(0xffd79a, 0, 24); scene.add(pl); streetLampLights.push(pl); }
  const streetLampOrder = streetLampList.map((_, i) => i), streetLampD2 = new Float32Array(streetLampList.length);
  function updateStreetLamps(night, p){
    const k = Math.min(1, Math.max(0, night*1.25 - 0.05));                           // zapalają się o zmierzchu, gasną o świcie
    streetLampHeadMat.color.setRGB(0.4, 0.4, 0.38).lerp(streetLampOn, k);
    streetLampHalo.material.opacity = k; streetLampHalo.visible = k > 0.01;
    if(k <= 0.01){ streetLampLights.forEach(l => l.intensity = 0); return; }
    streetLampList.forEach((l, i) => { const dx = l.x - p.x, dz = l.z - p.z; streetLampD2[i] = dx*dx + dz*dz; });
    streetLampOrder.sort((a, b) => streetLampD2[a] - streetLampD2[b]);
    streetLampLights.forEach((pl, i) => {
      const l = streetLampList[streetLampOrder[i]];
      pl.position.set(l.hx, l.hy, l.hz); pl.intensity = 1.6*k;
    });
  }
  scene.add(trunkM, crownM);

  // Postać
  const player = new THREE.Group();
  const mat = col => new THREE.MeshLambertMaterial({color:col});
  function box(w,h,d,col,x,y,z,parent,pivotY){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(col));
    m.position.set(x,y,z); m.castShadow = true; parent.add(m); return m;
  }
  // body – cała postać (przesuwana na rowerze), upper – tułów + głowa + ramiona (pochylany na rowerze)
  const body = new THREE.Group(); player.add(body);
  const upper = new THREE.Group(); upper.position.set(0,0.8,0); body.add(upper);   // oś obrotu w biodrach
  box(0.7,0.9,0.4,0x2d6cdf,0,0.45,0,upper);           // tułów
  box(0.5,0.5,0.5,0xf1c27d,0,1.15,0,upper);           // głowa
  const hair = box(0.52,0.15,0.52,0x4a2c12,0,1.45,-0.02,upper);    // włosy (chowane pod czapką z daszkiem)
  box(0.08,0.08,0.02,0x000000,-0.12,1.18,0.26,upper); // oczy
  box(0.08,0.08,0.02,0x000000,0.12,1.18,0.26,upper);
  function limb(x,y,col,parent){
    const p = new THREE.Group(); p.position.set(x,y,0); parent.add(p);
    box(0.25,0.8,0.25,col,0,-0.4,0,p);
    return p;
  }
  const shinL = box(0.25,0.5,0.25,0x333333,-0.18,0.425,0.315,body), shinR = box(0.25,0.5,0.25,0x333333,0.18,0.425,0.315,body);   // podudzia widoczne tylko na siedząco
  shinL.visible = shinR.visible = false;
  const armL = limb(-0.48,0.85,0x2d6cdf,upper), armR = limb(0.48,0.85,0x2d6cdf,upper);
  const legL = limb(-0.18,0.8,0x333333,body), legR = limb(0.18,0.8,0x333333,body);
  // Buty: ciemny but z jasną podeszwą na końcu nogi (chód, rower) oraz na podudziach (na siedząco)
  const shoeMat = mat(0x1d1d1f), soleMat = mat(0xe8e8e8);
  function addShoe(parent, y){
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.29,0.12,0.4), shoeMat); top.position.set(0,0.07,0.06);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.05,0.42), soleMat); sole.position.set(0,0.025,0.06);
    top.castShadow = sole.castShadow = true; g.add(top, sole); g.position.y = y; parent.add(g); return g;
  }
  const legShoeL = addShoe(legL, -0.8), legShoeR = addShoe(legR, -0.8);
  addShoe(shinL, -0.25); addShoe(shinR, -0.25);
  // Zielony plecak dostawcy – widoczny na plecach (−z; postać patrzy w stronę +z), gdy niesiesz zamówienie z restauracji
  const deliveryBackpack = new THREE.Group(); deliveryBackpack.visible = false; upper.add(deliveryBackpack);
  // bryła jak termiczny box kuriera (Glovo): prawie sześcian, zielony, z jaśniejszym pasem i logo z tyłu
  box(0.7,0.7,0.62,0x2e9e4f,0,0.6,-0.53,deliveryBackpack);            // korpus-sześcian
  box(0.72,0.1,0.64,0x23803f,0,0.92,-0.53,deliveryBackpack);          // pokrywa (ciemniejszy brzeg)
  box(0.72,0.05,0.64,0x1b6a34,0,0.84,-0.53,deliveryBackpack);         // linia zamknięcia pokrywy
  box(0.5,0.34,0.03,0x7ddc96,0,0.55,-0.85,deliveryBackpack);          // jasny panel z tyłu
  box(0.2,0.2,0.035,0x1b6a34,0,0.55,-0.86,deliveryBackpack);          // znak/logo na panelu
  box(0.72,0.06,0.64,0xd9f2df,0,0.36,-0.53,deliveryBackpack);         // odblaskowy pasek wokół
  box(0.08,0.12,0.04,0xd9f2df,-0.28,0.9,-0.86,deliveryBackpack);      // zapięcia pokrywy
  box(0.08,0.12,0.04,0xd9f2df,0.28,0.9,-0.86,deliveryBackpack);
  box(0.07,0.8,0.05,0x16572b,-0.2,0.5,0.215,deliveryBackpack);        // szelki przed tułowiem
  box(0.07,0.8,0.05,0x16572b,0.2,0.5,0.215,deliveryBackpack);
  box(0.07,0.05,0.5,0x16572b,-0.2,0.9,0,deliveryBackpack);            // szelki na ramionach
  box(0.07,0.05,0.5,0x16572b,0.2,0.9,0,deliveryBackpack);
  box(0.07,0.07,0.2,0x16572b,-0.2,0.7,-0.25,deliveryBackpack);        // łączniki szelek z boxem
  box(0.07,0.07,0.2,0x16572b,0.2,0.7,-0.25,deliveryBackpack);
  scene.add(player);

  // Rower gracza – pojawia się przed sklepem po zakupie
  let bikePurchased = false, bikeMounted = false;
  const bike = new THREE.Group();
  bike.rotation.order = 'YXZ';                                      // najpierw kierunek jazdy, potem przechył (nos góra/dół) w układzie roweru
  let bikePitch = 0;                                                // aktualny przechył roweru (rad; ujemny = przód w górę)
  bike.visible = false;
  const BIKE_COLL = [-0.65, 0, 0.65].map(o => ({x:1e5, z:1e5, r:0.28, o}));   // twardy rower: trzy okręgi wzdłuż ramy (kolizja jak pnie drzew), aktywne tylko gdy rower stoi
  BIKE_COLL.forEach(c => treeColl.push(c));
  const bikeWheels = [];
  const bikeBlack = new THREE.MeshLambertMaterial({color:0x20252b});
  const bikeFrame = new THREE.MeshLambertMaterial({color:0x7b3fd1});
  const bikeMetal = new THREE.MeshLambertMaterial({color:0xb9c2cc});
  function bikeRod(a,b,r,mat){
    const va=new THREE.Vector3(...a), vb=new THREE.Vector3(...b), diff=new THREE.Vector3().subVectors(vb,va);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,diff.length(),8),mat);
    mesh.position.copy(va).add(vb).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());
    mesh.castShadow=true; bike.add(mesh); return mesh;
  }
  [-0.88,0.88].forEach(z=>{
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(.48,.055,8,24),bikeBlack);
    wheel.rotation.y=Math.PI/2; wheel.position.set(0,.52,z); wheel.castShadow=true; bike.add(wheel);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.16,10),bikeMetal);
    hub.rotation.z=Math.PI/2; hub.position.set(0,.52,z); bike.add(hub);
    bikeWheels.push(wheel);
  });
  const rear=[0,.52,-.88], front=[0,.52,.88], crank=[0,.48,-.05], seat=[0,1.02,-.28], handle=[0,1.08,.72];
  bikeRod(rear,crank,.045,bikeFrame); bikeRod(crank,front,.045,bikeFrame);
  bikeRod(rear,seat,.045,bikeFrame); bikeRod(seat,crank,.045,bikeFrame);
  bikeRod(seat,handle,.045,bikeFrame); bikeRod(handle,front,.045,bikeFrame);
  bikeRod([-.22,.98,-.28],[.22,.98,-.28],.055,bikeBlack);
  bikeRod([-.32,1.1,.72],[.32,1.1,.72],.035,bikeBlack);
  bikeRod([0,.48,-.05],[0,.48,.12],.035,bikeMetal);
  const pedal1=new THREE.Mesh(new THREE.BoxGeometry(.28,.06,.1),bikeBlack); pedal1.position.set(0,.48,.12); bike.add(pedal1);
  scene.add(bike);
  function placeBikeOutsideShop(){
    bike.position.set(SHOP.x+7,0,SHOP.z-0.2);
    bike.rotation.y=Math.PI/2;
    bike.visible=true;
  }
  function mountBike(){
    if(!bikePurchased || bikeMounted) return;
    bikeMounted=true; player.visible=true;
    player.position.copy(bike.position); player.position.y=0; vy=0;
    toast('Wsiadłeś na rower 🚲  Shift – zsiądź');
  }
  function dismountBike(){
    if(!bikeMounted) return;
    bikeMounted=false; player.visible=true; riderBlend=0;
    const a=bike.rotation.y;
    const sp=safeExitSpot(bike.position.x,bike.position.z,Math.cos(a)*1.0,-Math.sin(a)*1.0,null,0.8);   // zsiadasz z boku (rower jest twardy) – a jeśli tam ściana, z drugiej strony
    player.position.set(sp.x,0,sp.z);
    toast('Zsiadłeś z roweru');
  }

  // Czapka (przedmiot do założenia)
  const hat = new THREE.Group();
  const hm = new THREE.MeshLambertMaterial({color:0x222222});
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.05,16), hm);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.27,0.35,16), hm); top.position.y = 0.2;
  hat.add(brim, top); hat.position.set(0, 1.58, 0); hat.visible = false;
  hat.children.forEach(m => m.castShadow = true);
  upper.add(hat);
  // Czapka z daszkiem (przedmiot do założenia) + stan „co mam na głowie”
  const capG = buildCapGroup(0xc62828); capG.position.set(0, 1.40, -0.01); capG.visible = false;
  capG.traverse(o => { if(o.isMesh) o.castShadow = true; });
  upper.add(capG);
  // Głowa (głowa, włosy, oczy) i nakrycia głowy na warstwie 1: kamera pierwszoosobowa ją pomija, żeby nie patrzeć „od środka” głowy,
  // a reszta ciała (tułów, ręce, nogi) zostaje widoczna.
  upper.children.forEach(o => { if((o.isMesh && o.position.y > 1) || o === hat || o === capG) o.traverse(m => m.layers.set(1)); });
  camera.layers.enable(1);
  let worn = null;                                                // {id:'hat'|'cap', color} albo null
  const isWorn = s => s && (s.id === 'shirt' || s.id === 'shoes' || s.id === 'pants') ? false : !!(worn && s && s.id === worn.id && s.color === worn.color);   // założona koszulka nie leży w ekwipunku
  // Koszulka: osobny slot od nakrycia głowy. Zdjęta = kolor konta gracza.
  let wornShirt = null;                                           // {id:'shirt', color} albo null
  let accShirtCol = 0x2d6cdf;                                     // kolor konta (domyślny niebieski)
  function refreshShirt(){
    const c = wornShirt ? wornShirt.color : accShirtCol;
    upper.children[0].material.color.setHex(c);
    armL.children[0].material.color.setHex(c); armR.children[0].material.color.setHex(c);
  }
  function setShirt(w){ wornShirt = w ? {id:'shirt', color:w.color} : null; refreshShirt(); }
  // Buty: osobny slot; zdjęte = czarne z białą podeszwą. Dwa kolory zakodowane w jednej liczbie (shoeEnc).
  let wornShoes = null;
  function refreshShoes(){
    const v = wornShoes ? wornShoes.color : shoeEnc(SH_DEF_UP, SH_DEF_SOLE);
    shoeMat.color.setHex(shoeUp(v)); soleMat.color.setHex(shoeSole(v));
  }
  function setShoes(w){ wornShoes = w ? {id:'shoes', color:w.color} : null; refreshShoes(); }
  // Spodnie: osobny slot, jeden kolor (nogi + podudzia na siedząco); zdjęte = domyślne ciemnoszare.
  let wornPants = null;
  function refreshPants(){
    const c = wornPants ? wornPants.color : PANTS_DEF;
    [legL.children[0], legR.children[0], shinL, shinR].forEach(o => o.material.color.setHex(c));
  }
  function setPants(w){ wornPants = w ? {id:'pants', color:w.color} : null; refreshPants(); }
  const unwear = s => { if(s && s.id === 'shirt') setShirt(null); else if(s && s.id === 'shoes') setShoes(null); else if(s && s.id === 'pants') setPants(null); else setWorn(null); };
  function setWorn(w){
    if(w && w.id === 'shirt'){ setShirt(w); return; }
    if(w && w.id === 'shoes'){ setShoes(w); return; }
    if(w && w.id === 'pants'){ setPants(w); return; }
    worn = w ? {id:w.id, color:w.color} : null;
    if(w){ const c = w.color !== undefined ? w.color : HEAD_DEF[w.id].def; (w.id === 'cap' ? capG.userData.mat : hm).color.setHex(c); }
    hat.visible = !!w && w.id === 'hat'; capG.visible = !!w && w.id === 'cap';
    hair.visible = !(w && w.id === 'cap');                         // czapka z daszkiem: bez włosów
  }

  // ===== Działające lustro: płaskie odbicie – scena renderowana z „lustrzanej” kamery do tekstury szyby. Każde lustro (wbudowane w łazience Domu B
  // i kupione w Dom i AGD) ma własną teksturę; w danej klatce odbicie liczymy tylko dla najbliższego lustra, które jest w kadrze. =====
  const mirrorPlanes = [];
  const mirrorCam = new THREE.PerspectiveCamera(); mirrorCam.layers.enable(1);     // warstwa 1 = głowa postaci (w odbiciu widać całą postać)
  const mirrorPlane = new THREE.Plane(), mirrorTM = new THREE.Matrix4(), mirrorPM = new THREE.Matrix4(), mirrorFrustum = new THREE.Frustum();
  const mV = {rp:new THREE.Vector3(), cp:new THREE.Vector3(), n:new THREE.Vector3(), view:new THREE.Vector3(), look:new THREE.Vector3(), tgt:new THREE.Vector3(), rot:new THREE.Matrix4(), sky:new THREE.Vector3()};
  const mirrorVS = 'uniform mat4 textureMatrix; varying vec4 vUv; void main(){ vUv = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const mirrorFS = 'uniform sampler2D tDiffuse; varying vec4 vUv; void main(){ gl_FragColor = vec4(texture2DProj(tDiffuse, vUv).rgb * vec3(0.96, 0.98, 1.0), 1.0); }';
  function makeMirrorPlane(w, h){
    const rt = new THREE.WebGLRenderTarget(640, 360, {minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter});
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({uniforms:{tDiffuse:{value:rt.texture}, textureMatrix:{value:new THREE.Matrix4()}}, vertexShader:mirrorVS, fragmentShader:mirrorFS}));
    mm.userData.isMirror = true; mm.userData.rt = rt; mm.userData.asp = 16/9; mirrorPlanes.push(mm);
    return mm;
  }
  function disposeMirrorPlane(mm){
    const i = mirrorPlanes.indexOf(mm); if(i >= 0) mirrorPlanes.splice(i, 1);
    try{ mm.userData.rt.dispose(); mm.geometry.dispose(); mm.material.dispose(); }catch(e){}
  }
  function disposeFurnMesh(mesh){ mesh.traverse(o => { if(o.userData && o.userData.isMirror) disposeMirrorPlane(o); }); }
  function updateMirror(){
    if(isPaused || typeof homeIn === 'undefined' || !homeIn || !mirrorPlanes.length) return;
    const D = homeDimsOf(homeIn);
    camera.updateMatrixWorld();
    mirrorPM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); mirrorFrustum.setFromProjectionMatrix(mirrorPM);
    mV.cp.setFromMatrixPosition(camera.matrixWorld);
    let m = null, bd = 1e9;
    for(const c of mirrorPlanes){
      c.updateMatrixWorld(); mV.rp.setFromMatrixPosition(c.matrixWorld);
      if(Math.abs(mV.rp.x - homeIn.x) > D.ww/2 + 0.5 || Math.abs(mV.rp.z - homeIn.z) > D.wd/2 + 0.5) continue;   // tylko lustra w domu, w którym jesteś
      if(!mirrorFrustum.intersectsObject(c)) continue;                                                              // lustra nie widać – bez odbicia
      mV.rot.extractRotation(c.matrixWorld); mV.n.set(0,0,1).applyMatrix4(mV.rot);
      mV.view.subVectors(mV.rp, mV.cp);
      if(mV.view.dot(mV.n) > 0) continue;                                                                           // patrzysz na lustro od tyłu
      const dd = mV.view.length(); if(dd < bd){ bd = dd; m = c; }
    }
    if(!m) return;
    const rt = m.userData.rt;
    if(Math.abs(camera.aspect - m.userData.asp) > 0.01){ m.userData.asp = camera.aspect; rt.setSize(640, Math.max(64, Math.round(640/camera.aspect))); }
    mV.rp.setFromMatrixPosition(m.matrixWorld);
    mV.rot.extractRotation(m.matrixWorld); mV.n.set(0,0,1).applyMatrix4(mV.rot);
    mV.view.subVectors(mV.rp, mV.cp);
    mV.view.reflect(mV.n).negate().add(mV.rp);
    mV.rot.extractRotation(camera.matrixWorld);
    mV.look.set(0,0,-1).applyMatrix4(mV.rot).add(mV.cp);
    mV.tgt.subVectors(mV.rp, mV.look).reflect(mV.n).negate().add(mV.rp);
    mirrorCam.position.copy(mV.view); mirrorCam.up.set(0,1,0).applyMatrix4(mV.rot).reflect(mV.n); mirrorCam.lookAt(mV.tgt);
    mirrorCam.far = camera.far; mirrorCam.updateMatrixWorld(); mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
    mirrorTM.set(0.5,0,0,0.5, 0,0.5,0,0.5, 0,0,0.5,0.5, 0,0,0,1);
    mirrorTM.multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse).multiply(m.matrixWorld);
    m.material.uniforms.textureMatrix.value.copy(mirrorTM);
    mV.n.set(0,0,1).applyMatrix4(mV.rot.extractRotation(m.matrixWorld));
    mirrorPlane.setFromNormalAndCoplanarPoint(mV.n, mV.rp);                         // obcinamy wszystko za szybą (ścianę, świat na zewnątrz)
    const prevRT = renderer.getRenderTarget(), prevAuto = renderer.shadowMap.autoUpdate;
    mV.sky.copy(sky.position); sky.position.copy(mirrorCam.position);
    renderer.shadowMap.autoUpdate = false;                                          // cienie z poprzedniej klatki – bez drugiego przebiegu cieni
    renderer.clippingPlanes = [mirrorPlane]; m.visible = false;
    renderer.setRenderTarget(rt); renderer.render(scene, mirrorCam);
    renderer.setRenderTarget(prevRT); renderer.clippingPlanes = []; m.visible = true;
    renderer.shadowMap.autoUpdate = prevAuto; sky.position.copy(mV.sky);
  }

  // Dom gracza (budowa)
  const homeWallMat = new THREE.MeshPhongMaterial({color:0xe8d9c4, shininess:8, specular:0x151515});   // Phong: światło lampy liczone per piksel
  const OUTLET_LOCAL = {x:0.6, z:-3.6};                         // gniazdko na tylnej ścianie domu (współrzędne lokalne)
  // Ceny domów: Dom B – czynsz 30 / dobę, kupno 750; wszystkie pozostałe domy gracza – czynsz 20 / dobę, kupno 500. Sprzedaż = 80% ceny kupna.
  const MAX_PREPAID_DAYS = 7;
  const rentOf = H => H.id === 'B' ? 30 : 20;                   // czynsz: monet za dobę gry
  const buyOf  = H => H.id === 'B' ? 750 : 500;                 // zakup domu na stałe (bez czynszu)
  const sellOf = H => Math.round(buyOf(H) * 0.8);
  let dlgHome = null;
  function drawHomeSign(H){
    const g=H.signCtx; g.clearRect(0,0,320,84);
    g.fillStyle=H.owned?'#7a4e12':H.rented?'#315b79':'#2e7d32'; g.fillRect(0,0,320,84);
    g.fillStyle='white'; g.textAlign='center';
    g.font='bold 36px sans-serif'; g.fillText(H.rented?'DOM GRACZA':'DO WYNAJĘCIA',160,41);
    g.font='22px sans-serif'; g.fillText(H.owned?(H.label+' • twój na stałe'):H.rented?(H.label+' • wynajęty'):(rentOf(H)+' / dobę • kup: '+buyOf(H)+' monet'),160,70);
    H.signTex.needsUpdate=true;
  }
  function buildHome(H){
    setActiveHome(H);
    const homeExterior=H.exterior, homeDoor=H.door={pivot:null, rect:null, open:false, angle:0, blocking:false};   // drzwi domu: do czasu wynajmu zamknięte
    let homeCharger=null, chargerLed=null, homePhone=null, phoneScreenMat=null;
    const {x:X,z:Z,w,h,d}=HOME, t=.28, gap=1.4, doorH=2.2, L=HOME.lay, OZ=(L.wallZ!==undefined?L.wallZ:-d/2+t);   // otwór dopasowany do drzwi
    const grp=new THREE.Group(); grp.position.set(X,0,Z); grp.rotation.y=HOME.rot; scene.add(grp);
    const mat=c=>new THREE.MeshPhongMaterial({color:c, shininess:8, specular:0x151515});
    const put=(geo,m,px,py,pz)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.castShadow=o.receiveShadow=true;grp.add(o);return o;};
    const wall=(bw,bh,bd,px,py,pz,collide=true)=>{if(collide){const wr=homeRect(px,pz,bw,bd); wr.struct=true; WALLS.push(wr);}return put(new THREE.BoxGeometry(bw,bh,bd,Math.min(10,Math.max(1,Math.ceil(bw))),Math.min(4,Math.max(1,Math.ceil(bh))),Math.min(10,Math.max(1,Math.ceil(bd)))),homeWallMat,px,py,pz);};
    wall(w,h,t,0,h/2,-d/2+t/2); wall(t,h,d,-w/2+t/2,h/2,0); wall(t,h,d,w/2-t/2,h/2,0);
    const seg=(w-gap)/2; wall(seg,h,t,-(gap/2+seg/2),h/2,d/2-t/2); wall(seg,h,t,(gap/2+seg/2),h/2,d/2-t/2); wall(gap,h-doorH,t,0,doorH+(h-doorH)/2,d/2-t/2,false);
    if(L.rooms){
      // Ściana działowa z = 0 (dwa przejścia 1,6 m na x = ∓3,5) i ściana x = 0 między sypialnią a łazienką
      const iw=w/2-t, dg=1.6, lintelH=h-doorH, dz=d/2-t;
      wall(iw-dg/2-3.5,h,t,-(iw+3.5+dg/2)/2,h/2,0); wall(2*(3.5-dg/2),h,t,0,h/2,0); wall(iw-dg/2-3.5,h,t,(iw+3.5+dg/2)/2,h/2,0);
      [-3.5,3.5].forEach(px=>wall(dg,lintelH,t,px,doorH+lintelH/2,0,false));
      wall(t,h,dz,0,h/2,-dz/2);
      const tile=mat(0xcfd8dc), white=mat(0xf4f6f7), chrome=mat(0xaab4ba);
      put(new THREE.BoxGeometry(iw-t/2,.02,dz-t/2),tile,iw/2+t/4,.09,-dz/2-t/4);                       // płytki w łazience
      // (wanna, sedes, umywalka i lustro: wyposażenie łazienki kupisz w Dom i AGD i ustawisz samemu)
    }
    homeExterior.push(put(new THREE.BoxGeometry(w+.5,.35,d+.5),mat(0x69452f),0,h+.17,0));
    const floor=put(new THREE.BoxGeometry(w-t,.12,d-t,Math.ceil(w-t),1,Math.ceil(d-t)),mat(0xb98d61),0,.02,0);   // gęsta siatka – światło lampy (Lambert = per wierzchołek) widać na podłodze
    // Ościeżnica (bez szpar wokół otworu) i otwarte drzwi odchylone do wnętrza
    const frameM=mat(0x4a2e1a), fz=d/2-t/2, fd=t+.06;
    put(new THREE.BoxGeometry(.08,doorH,fd),frameM,-gap/2+.04,doorH/2,fz);
    put(new THREE.BoxGeometry(.08,doorH,fd),frameM, gap/2-.04,doorH/2,fz);
    put(new THREE.BoxGeometry(gap,.08,fd),frameM,0,doorH-.04,fz);
    put(new THREE.BoxGeometry(gap,.03,fd),mat(0x9e9e9e),0,.015,fz);          // próg
    // Skrzydło na zawiasie przy lewej framudze: kąt 0 = zamknięte, π/2 = otwarte do wnętrza
    const hinge=new THREE.Group(); hinge.position.set(-gap/2+.08,0,fz); grp.add(hinge);
    const leafW=gap-.16;
    const leaf=new THREE.Mesh(new THREE.BoxGeometry(leafW,doorH-.06,.06),mat(0x70452b));
    leaf.position.set(leafW/2,(doorH-.06)/2+.03,0); leaf.castShadow=leaf.receiveShadow=true; hinge.add(leaf);
    const knob=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.14),mat(0xd4af37)); knob.position.set(leafW-.12,1.05,0); hinge.add(knob);
    hinge.rotation.y=homeDoor.angle;
    homeDoor.pivot=hinge; homeDoor.rect=homeRect(0,fz,gap,t);
    [-1,1].forEach(sd=>put(new THREE.BoxGeometry(1.7,1.2,.08),mat(0x9fd3f0),sd*3.1,2,d/2+.03));
    if(L.rooms){ [-1,1].forEach(sd=>{ put(new THREE.BoxGeometry(1.7,1.2,.08),mat(0x9fd3f0),sd*5.4,2,d/2+.03); put(new THREE.BoxGeometry(1.7,1.2,.08),mat(0x9fd3f0),sd*3.5,2,-d/2-.03); }); }
    // Kolizje mebli – nie da się przez nie przejść (łóżko, lodówka)
    // Łóżko i wezgłowie to platformy: blokują z podłogi, ale można na nie wskoczyć
    const bedW = Object.assign(homeRect(L.bed.x,L.bed.z,2.2,3.1), {top:0.745, enter:0.6});
    const headW = Object.assign(homeRect(L.bed.x,L.bed.z-1.05,2.05,.65), {top:1.055, enter:0.9});
    WALLS.push(bedW, headW, homeRect(L.fridge.x,L.fridge.z,1.15,.9)); PLATFORMS.push(bedW, headW);
    // Łóżko
    put(new THREE.BoxGeometry(2.2,.35,3.1),mat(0x65432b),L.bed.x,.35,L.bed.z);
    put(new THREE.BoxGeometry(2.05,.25,2.9),mat(0xf2f0e8),L.bed.x,.62,L.bed.z);
    put(new THREE.BoxGeometry(2.05,.35,.65),mat(0x5878ad),L.bed.x,.88,L.bed.z-1.05);
    // Lodówka z przodu pokoju
    put(new THREE.BoxGeometry(1.15,2.35,.9),mat(0xe8edf0),L.fridge.x,1.18,L.fridge.z);
    put(new THREE.BoxGeometry(.06,2.1,.04),mat(0x9aa5ad),L.fridge.x,1.18,L.fridge.z+.47);
    put(new THREE.BoxGeometry(.08,.55,.08),mat(0x555f66),L.fridge.x+.38,1.2,L.fridge.z+.5);
    const sign=document.createElement('canvas');sign.width=320;sign.height=84;H.signCtx=sign.getContext('2d');H.signTex=new THREE.CanvasTexture(sign);drawHomeSign(H);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.84),new THREE.MeshBasicMaterial({map:H.signTex}));label.position.set(0,2.95,d/2+.05);grp.add(label);homeExterior.push(label);
    // Gniazdko elektryczne na tylnej ścianie (między łóżkiem a lodówką)
    const plateMat=mat(0xfafafa), holeMat=mat(0x222222);
    const plate=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.03),plateMat); plate.position.set(L.outlet.x,.55,OZ+.015); grp.add(plate);
    [-.035,.035].forEach(ox=>{const hole=new THREE.Mesh(new THREE.BoxGeometry(.022,.04,.012),holeMat); hole.position.set(L.outlet.x+ox,.55,OZ+.032); grp.add(hole);});
    // Ładowarka wpięta w gniazdko (widoczna tylko, gdy jest podłączona)
    homeCharger=new THREE.Group(); homeCharger.visible=false;
    const chBody=new THREE.Mesh(new THREE.BoxGeometry(.12,.17,.1),mat(0xf2f2f2)); chBody.position.set(L.outlet.x,.55,OZ+.08);
    const chCable=new THREE.Mesh(new THREE.BoxGeometry(.025,.5,.025),mat(0xf2f2f2)); chCable.position.set(L.outlet.x,.2,OZ+.12);
    chargerLed=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.012),new THREE.MeshBasicMaterial({color:0xffa000})); chargerLed.position.set(L.outlet.x,.6,OZ+.134);
    homeCharger.add(chBody,chCable,chargerLed); grp.add(homeCharger);
    // Telefon podłączony do ładowarki – leży na podłodze przy gniazdku
    homePhone=new THREE.Group(); homePhone.visible=false;
    const phBody=new THREE.Mesh(new THREE.BoxGeometry(.085,.014,.17),mat(0x1b1b20));
    phoneScreenMat=new THREE.MeshBasicMaterial({color:0x4fc3f7});
    const phScreen=new THREE.Mesh(new THREE.BoxGeometry(.07,.004,.15),phoneScreenMat); phScreen.position.y=.008;
    const phPlug=new THREE.Mesh(new THREE.BoxGeometry(.02,.01,.1),mat(0xf2f2f2)); phPlug.position.set(0,0,-.13);
    homePhone.add(phBody,phScreen,phPlug); homePhone.position.set(L.outlet.x,.09,OZ+.3); grp.add(homePhone);
    chCable.scale.y=.76; chCable.position.y=.28;
    BUILDINGS.push({x:X,z:Z,w:HOME.ww,d:HOME.wd,open:true});
    H.charger=homeCharger; H.chargerLed=chargerLed; H.phone=homePhone; H.phoneMat=phoneScreenMat;
  }
  HOMES.forEach(buildHome); setActiveHome(HOMES[0]);
  // Drzwi każdego domu: płynna animacja, a zamknięte drzwi blokują przejście
  function updateHomeDoor(dt){
    for(const H of HOMES){
      const door = H.door;
      const target = door.open ? Math.PI/2 : 0;
      const diff = target - door.angle;
      if(Math.abs(diff) > 0.001){
        door.angle += Math.sign(diff) * Math.min(Math.abs(diff), 4.5*dt);
        door.pivot.rotation.y = door.angle;
      }
      const shouldBlock = door.angle < 1.0;
      if(shouldBlock !== door.blocking){
        door.blocking = shouldBlock;
        if(shouldBlock) WALLS.push(door.rect);
        else { const i = WALLS.indexOf(door.rect); if(i >= 0) WALLS.splice(i, 1); }
      }
    }
  }
  const homeDoorPos = H => { const hd = (H.d || 8)/2; return {x: H.x + hd*Math.sin(H.rot), z: H.z + hd*Math.cos(H.rot)}; };
  function playerInDoorway(H){
    const r = H.door.rect;
    return Math.abs(player.position.x-r.x) < r.w/2+0.6 && Math.abs(player.position.z-r.z) < r.d/2+0.6;
  }
  function toggleHomeDoor(H){
    if(H.door.open && playerInDoorway(H)){ toast('Wyjdź z przejścia, żeby zamknąć drzwi 🚪'); return; }
    H.door.open = !H.door.open;
    toast(H.door.open ? 'Otworzyłeś drzwi 🚪' : 'Zamknąłeś drzwi 🚪');
  }
  // Wynajem: 30 monet za dobę gry (Dom B) lub 20 (pozostałe domy). Czynsz jest pobierany automatycznie z monet w ekwipunku; gdy ich brakuje, umowa wygasa.
  function payCoins(n){
    if(coins() < n) return false;
    for(let i=0;i<n;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    renderInv(); renderShop(); return true;
  }
  function rentHome(H){
    if(!payCoins(rentOf(H))){ toast(`Wynajem ${H.label}: ${rentOf(H)} 🪙 za dobę – masz ${coins()} 🪙`); return; }
    H.rented = true; H.paidUntil = gameElapsed + DAY_SECONDS; H.door.open = true; drawHomeSign(H);
    toast(`Wynająłeś ${H.label} za ${rentOf(H)} 🪙 na dobę. Czynsz pobierany co dobę 🔑`);
  }
  function endRent(H, msg){
    H.rented = false; H.door.open = false; drawHomeSign(H);
    if(chargerHome === H && phoneDocked && addItem('phone')){ phoneDocked = false; H.phone.visible = false; renderInv(); }   // telefon nie zostaje zamknięty w domu
    if(homeIn === H){                                          // wyproszenie z domu
      if(isSleeping){ isSleeping = false; body.rotation.x = 0; body.position.set(0,0,0); }
      if(sitting) standUp();
      if(placing) cancelPlacement('Umowa najmu wygasła – anulowano ustawianie mebla');
      setActiveHome(H); const p = homeW(0, HOME.d/2 + 1.8);
      player.position.set(p.x, 0, p.z); vy = 0;
    }
    toast(msg || `Brak ${rentOf(H)} 🪙 na czynsz – umowa najmu ${H.label} wygasła 🔒`);
    refreshPhoneDom();
  }
  function updateRent(){
    for(const H of HOMES){
      while(H.rented && gameElapsed >= H.paidUntil){
        if(payCoins(rentOf(H))){ H.paidUntil += DAY_SECONDS; toast(`Pobrano czynsz ${rentOf(H)} 🪙 za ${H.label}`); }
        else endRent(H);
      }
    }
  }
  function payAny(n, txText){                                   // najpierw monety z ekwipunku, brakującą część pobiera konto bankowe
    const fromBank = bank.opened ? bank.balance : 0;
    if(coins() + fromBank < n) return false;
    const cash = Math.min(coins(), n); if(cash > 0) payCoins(cash);
    const rest = n - cash;
    if(rest > 0){ bank.balance -= rest; logTx(`−${rest} 🪙 ${txText}`); refreshPhoneBank(); }
    renderInv(); renderShop(); return true;
  }
  function refreshPhoneDom(){ if(phoneEl.style.display === 'flex' && curScreen === 'dom') showScreen('dom'); }
  function sellHome(H){
    if(!bank.opened) return false;
    H.owned = false; H.paidUntil = 0;
    endRent(H, `Sprzedałeś ${H.label} za ${sellOf(H)} 🪙`);
    bank.balance += sellOf(H); logTx(`+${sellOf(H)} 🪙 sprzedaż domu`); refreshPhoneBank();
    refreshPhoneDom(); return true;
  }
  function buyHome(H){
    if(!payAny(buyOf(H), 'zakup domu')){ toast(`Dom ${H.label} kosztuje ${buyOf(H)} 🪙 – masz ${coins()} 🪙${bank.opened?` + ${bank.balance} 🪙 na koncie`:''}`); return; }
    H.owned = true; H.rented = true; H.paidUntil = Infinity; H.door.open = true; drawHomeSign(H);
    closeDialog(); renderInv(); renderShop(); refreshPhoneDom();
    toast(`Kupiłeś ${H.label} na stałe za ${buyOf(H)} 🪙 – żadnego czynszu 🔑`);
  }
  function openHomeOffer(H){
    dlgHome = H;
    const btns = [];
    if(H.rented){
      btns.push({label: H.door.open ? 'Zamknij drzwi 🚪' : 'Otwórz drzwi 🚪', fn:() => { closeDialog(); toggleHomeDoor(H); }});
      btns.push({label:`Kup na stałe (${buyOf(H)} 🪙)`, fn:() => buyHome(H)});
      btns.push({label:'Zamknij', fn:closeDialog});
      say(`${H.label} masz wynajęty (${rentOf(H)} 🪙 / dobę). Możesz go wykupić na stałe za ${buyOf(H)} 🪙 – wtedy koniec z czynszem. Płatność z monet przy sobie, a brakującą część pobierzemy z konta bankowego.`, btns, '🏠 Oferta domu', 'home');
    } else {
      btns.push({label:`Wynajmij (${rentOf(H)} 🪙 / dobę)`, fn:() => { closeDialog(); rentHome(H); }});
      btns.push({label:`Kup na stałe (${buyOf(H)} 🪙)`, fn:() => buyHome(H)});
      btns.push({label:'Anuluj', fn:closeDialog});
      say(`${H.label} jest do wzięcia. Wynajem: ${rentOf(H)} 🪙 za dobę. Kupno na stałe: ${buyOf(H)} 🪙 jednorazowo, bez czynszu. Masz przy sobie ${coins()} 🪙${bank.opened?` i ${bank.balance} 🪙 na koncie`:''}.`, btns, '🏠 Oferta domu', 'home');
    }
  }
  function homeDoorAction(H){
    if(H.owned) return {text: H.door.open ? 'F – zamknij drzwi 🚪' : 'F – otwórz drzwi 🚪', run:() => toggleHomeDoor(H)};
    if(!H.rented) return {text:`F – ${H.label}: wynajmij (${rentOf(H)}/dobę) lub kup (${buyOf(H)} 🪙)`, run:() => openHomeOffer(H)};
    return {text:`F – drzwi / kup ${H.label} na stałe (${buyOf(H)} 🪙)`, run:() => openHomeOffer(H)};
  }
  let homeInside=false, homeIn=null;
  function updateHomeInterior(){
    let cur = null;
    for(const H of HOMES){ const D = homeDimsOf(H); if(Math.abs(player.position.x-H.x)<D.ww/2-.2 && Math.abs(player.position.z-H.z)<D.wd/2-.2){ cur = H; break; } }
    if(cur===homeIn)return; homeIn=cur; homeInside=!!cur;
    if(cur) setActiveHome(cur);
    HOMES.forEach(H=>H.exterior.forEach(o=>o.visible=H!==cur));
    homeWallMat.transparent=false;homeWallMat.opacity=1;homeWallMat.depthWrite=true;
  }

  // ===== Ruch uliczny: 6 samochodów NPC =====
  // Jeżdżą ruchem prawostronnym po Długiej, Krótkiej, Poprzecznej, Społecznej, rondzie i zjeździe do parkingu supermarketu. Gdy dojadą do końca trasy, znikają,
  // a po chwili pojawia się nowe auto (inny kolor) na losowo wybranym wjeździe.
  const TRAFFIC_LANE_E = ROAD_Z + 2.5, TRAFFIC_LANE_W = ROAD_Z - 2.5;     // pasy głównej jezdni (jadąc na +x prawa strona to +z)
  const TR_R = 9.7;                                                          // promień pasa jazdy na rondzie (wyspa ma 5,5, asfalt 14)
  const LANE_SOUTH = RB.x + 2.5, LANE_NORTH = RB.x - 2.5;                    // pasy zjazdu do supermarketu: na południe (-z) i z powrotem
  const circ = (from, to) => { const pts = []; for(let a = from; a > to - 0.01; a -= 0.5) pts.push([RB.x + Math.cos(a)*TR_R, RB.z + Math.sin(a)*TR_R, 1]); return pts; };   // trzeci element = 1: punkt na rondzie (do kierunkowskazów)   // rondo: kierunek przeciwny do ruchu wskazówek w mapie (wyspa po lewej)
  const wcirc = (from, to) => { const pts = []; for(let a = from; a > to - 0.01; a -= 0.5) pts.push([WR.x + Math.cos(a)*TR_R, WR.z + Math.sin(a)*TR_R, 1]); return pts; };   // zachodnie rondo (ten sam kierunek jazdy)
  const wTurn = () => {                                                      // wjazd na zachodnie rondo, objazd i jazda dalej na wschód: losowo w Krótką albo w Poprzeczną
    const out = wcirc(-0.2, -5.8).concat([[-58, TRAFFIC_LANE_E]]);
    return Math.random() < 0.5 ? out.concat([[-9,TRAFFIC_LANE_E],[-2.5,-8],[-2.5,-3],[-2.5,71]])
                               : out.concat([[POP_X-9,TRAFFIC_LANE_E],[POP_X-2.5,-8],[POP_X-2.5,-3],[POP_X-2.5,POP_END-1]]);
  };
  const wStart = wcirc(-3.4, -5.9).concat([[-64, TRAFFIC_LANE_E]]);         // start auta na rondzie → wyjazd na Długą na wschód
  const AGD_PARK_X = [80,84,88,92,96,100];                                    // miejsca przed sklepem AGD (między liniami placu, z = -59,3)
  const parkSlot = () => {
    if(Math.random() < 0.4) return {agd:true, west:true, x:AGD_PARK_X[Math.floor(Math.random()*AGD_PARK_X.length)]};   // parking przed AGD
    const west = Math.random() < 0.5; return {west, x: west ? [112,116,120,124][Math.floor(Math.random()*4)] : [140,144,148][Math.floor(Math.random()*3)]};
  };
  const toParking = () => {                                                  // zjazd z ronda na parking i zaparkowanie przodem do budynku
    const sl = parkSlot(), pts = [[LANE_SOUTH,-27],[LANE_SOUTH,-50]];
    if(sl.agd) pts.push([131,-52.8],[125,-54.2],[110,-54.2],[sl.x+6,-54.2],[sl.x+2.2,-55.6],[sl.x,-57.6],[sl.x,-59.3]);   // przez parking Pandy na plac AGD – pas na zachód (z = -54,2), przy miejscach postojowych
    else if(sl.west) pts.push([131,-53],[sl.x+2.2,-55],[sl.x,-57.4],[sl.x,-59.3]);
    else pts.push([133.5,-52.5],[sl.x-2.2,-54.3],[sl.x,-57.2],[sl.x,-59.3]);
    return pts;
  };
  const fromParking = () => {                                                // odjazd z miejsca parkingowego na północ, do ronda
    const sl = parkSlot();
    return (sl.agd ? [[sl.x,-59.3],[sl.x,-56.8],[sl.x+2.2,-52.4],[sl.x+6,-49.4],[110,-49.2],[123,-49.2],[126.4,-47.8],[LANE_NORTH,-45.5]]     // odjazd z placu AGD – pas na wschód (z = -49,2), do ronda
          : sl.west ? [[sl.x,-59.3],[sl.x,-56.8],[sl.x+2.0,-52.6],[Math.min(sl.x+4.5,125.5),-49.3],[LANE_NORTH,-46]]
                    : [[sl.x,-59.3],[sl.x,-57.3],[sl.x-2.2,-54.2],[131,-54.2],[128.6,-52.4],[LANE_NORTH,-48.5]]).concat([[LANE_NORTH,-27]]);
  };
  const westExit = () => [[118,TRAFFIC_LANE_W],[112,TRAFFIC_LANE_W],[-68,TRAFFIC_LANE_W]].concat(wTurn());
  const SPOL_CAR_END = 82;                                                  // koniec trasy aut na Społecznej (jezdnia kończy się na 84)
  // Pełna pętla po przedłużonej Społecznej: pas w stronę wzgórza (po prawej stronie jazdy), zakręt, odcinek na zachód do końca drogi,
  // nawrót na końcu i pas powrotny. Pasy są przesunięte o 2,5 m od osi drogi (SPOL_PATH), więc podążają za zakrętem.
  const spolHill = () => {
    const n = SPOL_PATH.length, LANE = 2.5, pts = [];
    const lane = (i, sgn) => {                                           // punkt pasa przy wierzchołku i osi: sgn=+1 pas „w stronę wzgórza”, -1 pas powrotny
      const a = SPOL_PATH[Math.max(0, i-1)], b = SPOL_PATH[Math.min(n-1, i+1)];
      const tx = b[0]-a[0], tz = b[1]-a[1], tl = Math.hypot(tx, tz) || 1;
      return [SPOL_PATH[i][0] + sgn*LANE*(-tz/tl), SPOL_PATH[i][1] + sgn*LANE*(tx/tl)];   // prawa strona kierunku jazdy = (-tz, tx)
    };
    for(let i = 0; i <= n-2; i++) pts.push(lane(i, 1));                  // do końca łuku (przedostatni wierzchołek = początek odcinka na zachód)
    const endX = SPOL_WEST_END, cxU = endX + 5;                          // nawrót: półokrąg o promieniu 2,5 m na końcu drogi
    pts.push([endX + 12, SPOL_TURN_Z - LANE]);
    for(let k = 0; k <= 4; k++){ const a = k*Math.PI/4; pts.push([cxU - LANE*Math.sin(a), SPOL_TURN_Z - LANE*Math.cos(a)]); }
    pts.push([endX + 12, SPOL_TURN_Z + LANE]);
    for(let i = n-2; i >= 0; i--) pts.push(lane(i, -1));                 // powrót pasem po drugiej stronie
    return pts;
  };
  const withPark = pts => { pts.park = true; return pts; };
  const withYield = (pts, kind, jx) => { pts.yield = {wp:1, kind, jx: jx || 0}; return pts; };      // wp = punkt linii zatrzymania; kind = kierunek skrętu
  const TRAFFIC_ROUTES = [
    // Długa na wschód → rondo → parking supermarketu
    () => withPark([...wStart,[113,TRAFFIC_LANE_E]].concat(circ(2.6,-0.9), [[136,-23]], toParking())),
    // Długa na wschód → pełne okrążenie ronda → z powrotem na zachód
    () => [...wStart,[113,TRAFFIC_LANE_E]].concat(circ(2.6,-2.4), westExit()),
    // ulica boczna → w prawo na Długą → rondo → parking
    () => withYield(withPark([[2.5,71],[2.5,-6.5],[5.5,TRAFFIC_LANE_E],[14,TRAFFIC_LANE_E],[113,TRAFFIC_LANE_E]].concat(circ(2.6,-0.9), [[136,-23]], toParking())), 'right'),
    // ulica boczna → Długa → okrążenie ronda → powrót na zachód
    () => withYield([[2.5,71],[2.5,-6.5],[5.5,TRAFFIC_LANE_E],[14,TRAFFIC_LANE_E],[113,TRAFFIC_LANE_E]].concat(circ(2.6,-2.4), westExit()), 'right'),
    // Długa na zachód (wjazd od strony ronda)
    () => [[116,TRAFFIC_LANE_W],[-68,TRAFFIC_LANE_W]].concat(wTurn()),
    // ulica boczna → w LEWO na Długą (na zachód): trzeba ustąpić jadącym główną ulicą z obu stron
    () => withYield([[2.5,71],[2.5,-6.5],[2.2,-10],[0.5,-14],[-3,TRAFFIC_LANE_W],[-8,TRAFFIC_LANE_W],[-68,TRAFFIC_LANE_W]].concat(wTurn()), 'left'),
    // z Długiej w prawo w ulicę boczną
    () => [...wStart,[-9,TRAFFIC_LANE_E],[-2.5,-8],[-2.5,-3],[-2.5,71]],
    // wyjazd z parkingu → rondo → Długa na zachód
    () => [].concat(fromParking(), circ(-1.9,-2.4), westExit()),
    // ===== Ulica Poprzeczna (x = POP_X): pasy x-2,5 (na +z) i x+2,5 (na -z) =====
    // z Długiej w prawo w Poprzeczną
    () => [...wStart,[POP_X-9,TRAFFIC_LANE_E],[POP_X-2.5,-8],[POP_X-2.5,-3],[POP_X-2.5,POP_END-1]],
    // Poprzeczna → w prawo na Długą → rondo → parking
    () => withYield(withPark([[POP_X+2.5,POP_END-1],[POP_X+2.5,-6.5],[POP_X+5.5,TRAFFIC_LANE_E],[POP_X+14,TRAFFIC_LANE_E],[113,TRAFFIC_LANE_E]].concat(circ(2.6,-0.9), [[136,-23]], toParking())), 'right', POP_X),
    // Poprzeczna → w prawo na Długą → okrążenie ronda → powrót na zachód
    () => withYield([[POP_X+2.5,POP_END-1],[POP_X+2.5,-6.5],[POP_X+5.5,TRAFFIC_LANE_E],[POP_X+14,TRAFFIC_LANE_E],[113,TRAFFIC_LANE_E]].concat(circ(2.6,-2.4), westExit()), 'right', POP_X),
    // Poprzeczna → w LEWO na Długą (na zachód): ustąpić jadącym z obu stron
    () => withYield([[POP_X+2.5,POP_END-1],[POP_X+2.5,-6.5],[POP_X+2.2,-10],[POP_X+0.5,-14],[POP_X-3,TRAFFIC_LANE_W],[POP_X-8,TRAFFIC_LANE_W],[-68,TRAFFIC_LANE_W]].concat(wTurn()), 'left', POP_X),
    // ===== Ulica Społeczna (x = RB.x): pasy RB.x-2,5 (na +z, zjazd z ronda) i RB.x+2,5 (na -z, wjazd na rondo) =====
    // Długa na wschód → rondo → zjazd w Społeczną
    () => [...wStart,[113,TRAFFIC_LANE_E]].concat(circ(2.6,2.0), [[RB.x-2.5,-4.6],[RB.x-2.5,-1]], spolHill(), [[RB.x+2.5,0]], circ(1.3,-2.4), westExit()),
    // Społeczna → rondo → parking supermarketu
    () => withPark([[RB.x+2.5,SPOL_CAR_END],[RB.x+2.5,0]].concat(circ(1.3,-0.7), [[136,-23]], toParking())),
    // Społeczna → rondo → pełne okrążenie → Długa na zachód
    () => [[RB.x+2.5,SPOL_CAR_END],[RB.x+2.5,0]].concat(circ(1.3,-2.4), westExit()),
    // parking supermarketu → rondo (pełne 3/4 okrążenia) → Społeczna
    () => [].concat(fromParking(), circ(-1.9,-4.4), [[RB.x-2.5,-1]], spolHill(), [[RB.x+2.5,0]], circ(1.3,-2.4), westExit()),
    // Długa → rondo → Społeczna aż do końca wzgórza i z powrotem → rondo → parking supermarketu
    () => withPark([...wStart,[113,TRAFFIC_LANE_E]].concat(circ(2.6,2.0), [[RB.x-2.5,-4.6],[RB.x-2.5,-1]], spolHill(), [[RB.x+2.5,0]], circ(1.3,-0.7), [[136,-23]], toParking()))
  ];
  const TRAFFIC_COLORS = [0xc0392b,0x2e6fb5,0xe0b020,0x2e8b57,0xeeeeee,0x6c3483,0xe67e22,0x333840];
  const trafficCars = [];
  function makeTrafficCar(){
    const g = new THREE.Group();
    const lm = c => new THREE.MeshLambertMaterial({color:c});
    const part = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x,y,z); o.castShadow = true; g.add(o); return o; };
    const bodyMat = lm(0xc0392b);
    part(new THREE.BoxGeometry(4.2,.7,1.9), bodyMat, 0, .68, 0);
    part(new THREE.BoxGeometry(2.3,.62,1.7), bodyMat, -.2, 1.3, 0);
    const glass = lm(0x2b3a46);
    part(new THREE.BoxGeometry(2.35,.45,1.72), glass, -.2, 1.32, 0).scale.set(.97,1,1);
    part(new THREE.BoxGeometry(.04,.14,1.5), new THREE.MeshBasicMaterial({color:0xfff2b0}), 2.11, .78, 0);
    part(new THREE.BoxGeometry(.04,.14,1.5), new THREE.MeshBasicMaterial({color:0xc01818}), -2.11, .78, 0);
    const wheelGeo = new THREE.CylinderGeometry(.36,.36,.26,14), wheelMat = lm(0x16161a);
    [[1.3,.95],[1.3,-.95],[-1.3,.95],[-1.3,-.95]].forEach(([x,z]) => { const w = part(wheelGeo, wheelMat, x, .36, z); w.rotation.x = Math.PI/2; });
    // kierunkowskazy: lokalny +x = przód auta, +z = prawa strona (ruch prawostronny)
    const sigGeo = new THREE.BoxGeometry(.1,.17,.3), sigL = new THREE.MeshBasicMaterial({color:SIG_OFF}), sigR = new THREE.MeshBasicMaterial({color:SIG_OFF});
    [2.12,-2.12].forEach(x => { part(sigGeo, sigL, x, .78, -.84); part(sigGeo, sigR, x, .78, .84); });
    g.rotation.order = 'YXZ'; g.visible = false; scene.add(g);   // przechył (z) liczony po obrocie kierunku jazdy
    return {group:g, pitch:0, bodyMat, sigL, sigR, sig:0, sigT:0, active:false, wait:0.5, route:null, wp:1, heading:0, speed:0, cruise:9,
            bt:0, freeT:0, hr:0, hb:0, ht:0, hornF:380 + Math.random()*130};   // klakson: czas blokady, rundy, pozostałe sygnały, licznik
  }
  for(let i=0;i<6;i++){ const c = makeTrafficCar(); c.wait = 0.5 + i*1.5; trafficCars.push(c); }   // różne opóźnienia startu


  // ===== Autobus miejski (linia 1): jedzie po przystankach GÓRNA → SPOŁECZNA → PASAŻ → DŁUGA, okrąża zachodnie rondo i wraca tą samą trasą (przystanki po przeciwnej stronie: DŁUGA → PASAŻ → SPOŁECZNA → GÓRNA) na PKS =====
  // Po kilkudziesięciu sekundach pojawia się na początku trasy i kurs się powtarza. Zatrzymuje się przy każdym przystanku (BUS_DWELL s).
  const BUS_DWELL = 10;                                                     // postój na przystanku (s): drzwi otwarte, można wsiąść / wysiąść
  const BUS_GAP = [40, 70];                                                 // przerwa między kursami (s): min, max
  const BUS_ROUTE = (function(){
    const Z_SP = SPOL_TURN_Z + 2.5, pts = [];                               // pas „w stronę ronda” na odcinku wschód–zachód Społecznej (z = 152,5), obok przystanku przy stacji
    const flat = arr => arr.forEach(q => pts.push([q[0], q[1]]));           // circ() zwraca trzeci element (flaga ronda) – tu niepotrzebny
    pts.push([52, Z_SP], [91, Z_SP, 'GÓRNA']);                       // start tuż przed przystankiem (przy stacji paliw), postój
    const n = SPOL_PATH.length;
    for(let i = n-2; i >= 0; i--){                                          // pas powrotny Społecznej (ten sam co w spolHill): łuk i prosta na północ
      const a = SPOL_PATH[Math.max(0, i-1)], b = SPOL_PATH[Math.min(n-1, i+1)];
      const tx = b[0]-a[0], tz = b[1]-a[1], tl = Math.hypot(tx, tz) || 1;
      pts.push([SPOL_PATH[i][0] + 2.5*tz/tl, SPOL_PATH[i][1] - 2.5*tx/tl]);
    }
    pts.push([RB.x + 2.5, 44.25, 'SPOŁECZNA']);                       // przystanek po wschodniej stronie Społecznej (między Domem G a sklepem z ubraniami)
    pts.push([RB.x + 2.5, 0]);
    flat(circ(1.3, -0.7));                                                  // rondo → zjazd do supermarketu
    pts.push([136, -23], [LANE_SOUTH, -27], [LANE_SOUTH, -47], [131.6, -50.6], [128.8, -53.3], [124, -54.2], [112, -54.2]);
    pts.push([105.5, -54.2, 'PASAŻ']);                                // przystanek w przerwie między sklepem AGD a supermarketem Pandy (autobus staje na placu przed nimi)
    pts.push([100, -54.2], [95, -54.0], [91.5, -53.2], [89.6, -51.4], [89.4, -49.4], [91, -47.8], [94, -47.2], [98, -47.6], [103, -48.8], [110, -49.2]);   // nawrót na placu (cały na asfalcie)
    pts.push([123, -49.2], [126.4, -47.8], [LANE_NORTH, -45.5], [LANE_NORTH, -27]);   // pas na wschód (z = -49,2), potem na rondo
    flat(circ(-1.9, -2.4));                                                 // rondo → Długa na zachód
    pts.push([118, TRAFFIC_LANE_W], [112, TRAFFIC_LANE_W], [-33.25, TRAFFIC_LANE_W, 'DŁUGA'], [-68, TRAFFIC_LANE_W]);
    flat(wcirc(-0.2, -5.8));                                                // objazd zachodniego ronda – nawrót
    // ----- powrót na PKS tą samą trasą, po przeciwnej stronie ulic: Długa → Pasaż → Społeczna → Górna -----
    pts.push([-65, TRAFFIC_LANE_E, 'DŁUGA'], [113, TRAFFIC_LANE_E]);        // przystanek równoległy Długa (południowa strona), potem na wschód do ronda
    flat(circ(2.6, -0.9));                                                  // rondo → zjazd do supermarketu
    pts.push([136, -23], [LANE_SOUTH, -27], [LANE_SOUTH, -47], [131.6, -50.6], [128.8, -53.3], [124, -54.2], [112, -54.2]);
    pts.push([105.5, -54.2, 'PASAŻ']);                                      // ten sam przystanek co w drodze tam (plac przed AGD i Pandy)
    pts.push([100, -54.2], [95, -54.0], [91.5, -53.2], [89.6, -51.4], [89.4, -49.4], [91, -47.8], [94, -47.2], [98, -47.6], [103, -48.8], [110, -49.2]);   // nawrót na placu (cały na asfalcie)
    pts.push([123, -49.2], [126.4, -47.8], [LANE_NORTH, -45.5], [LANE_NORTH, -27]);   // pas na wschód (z = -49,2), potem na rondo
    flat(circ(-1.9, -4.4));                                                 // rondo → w Społeczną (pas w stronę wzgórza)
    pts.push([RB.x - 2.5, -1], [RB.x - 2.5, 42.5, 'SPOŁECZNA']);            // przystanek równoległy Społeczna (zachodnia strona, między Domem D a E)
    for(let i = 0; i <= n-2; i++){                                          // pas „z ronda” (po drugiej stronie niż w drodze tam): prosta, łuk i Górna na zachód
      const a = SPOL_PATH[Math.max(0, i-1)], b = SPOL_PATH[Math.min(n-1, i+1)];
      const tx = b[0]-a[0], tz = b[1]-a[1], tl = Math.hypot(tx, tz) || 1;
      pts.push([SPOL_PATH[i][0] + 2.5*(-tz/tl), SPOL_PATH[i][1] + 2.5*(tx/tl)]);
    }
    pts.push([100, 147.5], [91, 147.5, 'GÓRNA'], [84, 147.5]);               // przystanek równoległy Górna (północna strona, naprzeciwko stacji); tuż za nim koniec kursu – dalej autobus wraca na PKS
    return pts;
  })();
  // --- Model autobusu: pusta w środku skorupa (podłoga, ściany z oknami i otworami drzwi, dach) + wnętrze (fotele, poręcze, kabina kierowcy) ---
  const BUS_YF = 1.05;                                                      // wysokość podłogi wnętrza nad ziemią
  const BUS_DOORS_X = [2.4, -1.0];                                          // drzwi po prawej stronie: lokalne x środka otworu (przednie i tylne)
  const BUS_SEATS = [];                                                     // przeszkody wewnątrz (lokalnie: x do przodu, z w prawo): {x, z, hx, hz}
  function makeBusModel(opt){ opt = opt || {}; const seatsLen = BUS_SEATS.length;                                                  // przód = +X, prawa strona (drzwi) = +Z, jak w autach ruchu
    const g = new THREE.Group();
    const lm = (c, em) => new THREE.MeshLambertMaterial({color:c, emissive:em || 0x000000});   // lekka emisja: wnętrze nie jest czarne w nocy
    const bx = (w, h, d, m, x, y, z, shadow) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if(shadow) o.castShadow = true; g.add(o); return o; };
    const white = lm(0xf4f6f8, 0x2c2c2c), blue = lm(opt.color || 0x1565c0, opt.emissive || 0x0a2a55), floorM = lm(0x55595e, 0x1c1d1f), dark = lm(0x2b2f33, 0x111213);
    const steel = lm(0xb8c0c8, 0x303338), seatM = lm(0x2a5fa8, 0x10284a);
    const glass = new THREE.MeshLambertMaterial({color:0x9fd3f0, transparent:true, opacity:0.32, emissive:0x10202a});
    const L = 9.6, T = 0.08, ZC = 1.25;                                     // długość, grubość ścian, oś ścian bocznych (z = ±1,25)
    bx(9.4, 0.65, 2.42, floorM, 0, 0.725, 0);                               // podłoga (góra na wysokości BUS_YF)
    const roof = bx(L, 0.12, 2.64, white, 0, 3.26, 0, true);                // dach (chowany w widoku 3. osoby podczas jazdy)
    bx(2.2, 0.3, 1.6, steel, -2.5, 3.5, 0, true);                           // klimatyzacja na dachu
    // ściana lewa (bez drzwi)
    bx(L, 0.65, T, blue, 0, 0.725, -ZC, true); bx(L, 0.35, T, white, 0, 1.225, -ZC, true);
    bx(L, 1.1, T*0.5, glass, 0, 1.95, -ZC); bx(L, 0.7, T, white, 0, 2.85, -ZC, true);
    [-3.5, -1.5, 0.5, 2.5, 4.0].forEach(x => bx(0.12, 1.1, T + 0.02, white, x, 1.95, -ZC));   // słupki między oknami
    // ściana prawa: dwa otwory na drzwi (x ∈ [1,85; 2,95] i [-1,55; -0,45])
    bx(L, 0.65, T, blue, 0, 0.725, ZC, true); bx(L, 0.7, T, white, 0, 2.85, ZC, true);
    [[-4.8, -1.55], [-0.45, 1.85], [2.95, 4.8]].forEach(([a, b]) => {
      const w = b - a, cx = (a + b)/2;
      bx(w, 0.35, T, white, cx, 1.225, ZC, true); bx(w, 1.1, T*0.5, glass, cx, 1.95, ZC);
    });
    [-3.2, 0.7].forEach(x => bx(0.12, 1.1, T + 0.02, white, x, 1.95, ZC));
    // ściana przednia i tylna (z szybami)
    [[4.76, 1.2], [-4.76, 1.0]].forEach(([x, wh]) => {
      bx(T, 1.0, 2.58, white, x, 0.9, 0, true); bx(T*0.5, 1.1, 2.4, glass, x, 1.95, 0); bx(T, 0.7, 2.58, white, x, 2.85, 0, true);
    });
    const lampOn = new THREE.MeshBasicMaterial({color:0xfff2b0}), lampRed = new THREE.MeshBasicMaterial({color:0xc01818});
    [-0.85, 0.85].forEach(z => { bx(0.06, 0.2, 0.4, lampOn, 4.81, 0.95, z); bx(0.06, 0.2, 0.4, lampRed, -4.81, 0.95, z); });
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), wheelMat = lm(0x16161a);
    [[3.1, 1.36], [3.1, -1.36], [-3.1, 1.36], [-3.1, -1.36]].forEach(([x, z]) => { const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.5, z); w.rotation.x = Math.PI/2; w.castShadow = true; g.add(w); });
    // drzwi: dwie rozsuwane połówki w każdym otworze (animowane w updateBus → applyBusDoors)
    const leafM = new THREE.MeshLambertMaterial({color:0x2a5b86, transparent:true, opacity:0.6, emissive:0x0a1a28});
    const doors = BUS_DOORS_X.map(dx => ({dx, l:bx(0.55, 1.45, 0.05, leafM, dx - 0.275, 1.775, ZC), r:bx(0.55, 1.45, 0.05, leafM, dx + 0.275, 1.775, ZC)}));
    // wnętrze: fotele (oparcie z tyłu, siedzisko zwrócone do przodu)
    const seat = (x, z, w, solid) => {
      bx(0.5, 0.1, w, seatM, x, BUS_YF + 0.45, z); bx(0.1, 0.6, w, seatM, x - 0.23, BUS_YF + 0.8, z); bx(0.1, 0.4, Math.max(0.1, w - 0.3), steel, x, BUS_YF + 0.22, z);
      if(solid) BUS_SEATS.push({x:x - 0.05, z, hx:0.32, hz:w/2});
    };
    [[1.3, -0.77, 0.9], [0.4, -0.77, 0.9], [-2.1, -0.77, 0.9], [-3.1, -0.77, 0.9], [-2.1, 0.8, 0.45], [-3.1, 0.8, 0.45], [2.8, -0.77, 0.9]].forEach(a => seat(a[0], a[1], a[2], true));
    seat(-4.25, 0, 2.2, true);                                              // tylna kanapa na całą szerokość
    // kabina kierowcy: szyba, fotel, kierownica, deska rozdzielcza, kierowca
    bx(0.05, 1.3, 1.1, glass, 3.45, BUS_YF + 0.75, -0.7);
    seat(3.8, -0.6, 0.5, false);
    bx(0.5, 0.5, 2.2, dark, 4.5, BUS_YF + 0.45, 0);
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 20), dark); sw.position.set(4.15, BUS_YF + 0.95, -0.6); sw.rotation.y = Math.PI/2; g.add(sw);
    const orange = lm(0xf39c12, 0x4a2e04), skin = lm(0xe0b090, 0x3a2a20);
    bx(0.3, 0.5, 0.45, orange, 3.82, BUS_YF + 0.95, -0.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin); head.position.set(3.85, BUS_YF + 1.38, -0.6); g.add(head);
    bx(0.45, 0.09, 0.09, orange, 4.0, BUS_YF + 0.98, -0.78); bx(0.45, 0.09, 0.09, orange, 4.0, BUS_YF + 0.98, -0.42);
    BUS_SEATS.push({x:4.1, z:-0.65, hx:0.75, hz:0.6}, {x:4.5, z:0, hx:0.35, hz:1.25});   // kabina i deska rozdzielcza – nie wejdziesz
    // poręcze i oświetlenie sufitu
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.15, 8);
    [[1.7, 0.75], [3.1, 0.75], [-0.3, 0.75], [-1.7, 0.75]].forEach(([x, z]) => { const p = new THREE.Mesh(poleGeo, steel); p.position.set(x, BUS_YF + 1.075, z); g.add(p); });
    [-0.35, 0.35].forEach(z => bx(7.6, 0.04, 0.04, steel, -0.8, 3.0, z));
    const strip = new THREE.MeshBasicMaterial({color:0xfffbe0});
    [-3.4, -1.2, 1.0, 3.0].forEach(x => bx(1.2, 0.03, 0.18, strip, x, 3.18, 0));
    const sign = (cw, ch, draw, pw, ph, x, y, z, ry) => {                  // napisy na płaskich panelach
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'), cw, ch);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({map:t}));
      m.position.set(x, y, z); m.rotation.y = ry; g.add(m);
    };
    const front = (gc, w, h) => { gc.fillStyle = '#111'; gc.fillRect(0,0,w,h); gc.fillStyle = '#ffb300'; gc.font = 'bold 40px sans-serif'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(opt.front || '1  DŁUGA', w/2, h/2 + 2); };
    const back = (gc, w, h) => { gc.fillStyle = '#111'; gc.fillRect(0,0,w,h); gc.fillStyle = '#ffb300'; gc.font = 'bold 44px sans-serif'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(opt.back || '1', w/2, h/2 + 2); };
    const side = (gc, w, h) => { gc.fillStyle = opt.sideBg || '#1565c0'; gc.fillRect(0,0,w,h); gc.fillStyle = '#fff'; gc.font = 'bold 44px sans-serif'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(opt.side || '🚌 AUTOBUS • LINIA 1', w/2, h/2 + 2); };
    sign(256, 64, front, 2.0, 0.22, 4.805, 2.85, 0, Math.PI/2);
    sign(128, 64, back, 0.6, 0.22, -4.805, 2.85, 0, -Math.PI/2);
    sign(512, 56, side, 5.2, 0.46, 0.0, 0.72, ZC + 0.045, 0);
    sign(512, 56, side, 5.2, 0.46, 0.0, 0.72, -ZC - 0.045, Math.PI);
    if(opt.extra) BUS_SEATS.length = seatsLen;                              // kolejne egzemplarze (PKS) nie dublują przeszkód wnętrza autobusu miejskiego
    g.rotation.order = 'YXZ'; g.visible = false; scene.add(g);              // jak auta: przechył liczony po obrocie kierunku jazdy
    return {group:g, roof, doors};
  }
  const BUS_MODEL = makeBusModel();
  const BUS = {group:BUS_MODEL.group, roof:BUS_MODEL.roof, doors:BUS_MODEL.doors, door:0, doorTarget:0, active:false, route:BUS_ROUTE, wp:1, heading:0, speed:0, pitch:0, wait:3, dwell:0, stuck:0, hl:4.8, hw:1.35};
  function applyBusDoors(){                                                 // 0 = zamknięte, 1 = otwarte: połówki najpierw wsuwają się do wnętrza, potem rozjeżdżają
    const d = BUS.door, e = d*d*(3 - 2*d), sl = Math.min(1, e*2), sx = Math.max(0, e*2 - 1);
    BUS.doors.forEach(D => {
      D.l.position.set(D.dx - 0.275 - 0.58*sx, 1.775, 1.25 - 0.13*sl);
      D.r.position.set(D.dx + 0.275 + 0.58*sx, 1.775, 1.25 - 0.13*sl);
    });
  }
  // --- Jazda autobusem: gracz porusza się po wnętrzu we współrzędnych lokalnych autobusu (x do przodu, z w prawo) i jest przez niego wożony ---
  let busRide = false, busPrevH = 0, busPrevFP = false;
  const busLocal = {x:0, z:0};
  const busToWorld = (lx, lz) => {
    const c = Math.cos(BUS.heading), s = Math.sin(BUS.heading), cp = Math.cos(BUS.pitch);
    return {x: BUS.group.position.x + lx*cp*c - lz*s, z: BUS.group.position.z + lx*cp*s + lz*c};
  };
  const busFloorY = () => BUS.group.position.y + BUS_YF*Math.cos(BUS.pitch) + busLocal.x*Math.sin(BUS.pitch);
  function boardBus(dx){
    if(!BUS.active || busRide) return;
    busRide = true; busLocal.x = dx; busLocal.z = 0.55; busPrevH = BUS.heading; busPrevFP = firstPerson;
    if(!firstPerson){ firstPerson = true; body.visible = true; refreshInteriorWallVisibility(); }   // w środku domyślnie widok z oczu
    yaw = -BUS.heading - Math.PI/2; pitch = 0; facing = Math.PI/2 - BUS.heading; player.rotation.y = facing;   // patrzysz w stronę jazdy
    vy = 0;
    toast('Jedziesz autobusem 🚌  WASD – chodź po autobusie, F przy otwartych drzwiach – wysiądź, V – kamera');
  }
  function leaveBus(forced){
    if(!busRide) return;
    busRide = false;
    let dx = BUS_DOORS_X[0]; if(Math.abs(busLocal.x - BUS_DOORS_X[1]) < Math.abs(busLocal.x - dx)) dx = BUS_DOORS_X[1];
    const w = busToWorld(forced ? busLocal.x : dx, forced ? 2.8 : 2.6);      // wysiadasz po prawej stronie, przy najbliższych drzwiach
    player.position.set(w.x, terrainH(w.x, w.z), w.z); vy = 0;
    facing = -BUS.heading; player.rotation.y = facing;
    if(!busPrevFP){ firstPerson = false; body.visible = true; refreshInteriorWallVisibility(); }
    BUS.roof.visible = true;
    toast(forced ? 'Koniec kursu 🚌 – wysiadasz' : 'Wysiadłeś z autobusu 🚌');
  }
  function busBoardAction(){                                                 // F przy otwartych drzwiach stojącego autobusu
    if(!BUS.active || BUS.door < 0.6 || busRide || carDriving || bikeMounted) return null;
    for(const dx of BUS_DOORS_X){
      const w = busToWorld(dx, 2.0);
      if(Math.hypot(player.position.x - w.x, player.position.z - w.z) < 2.3) return {text:'F – wsiądź do autobusu 🚌 (linia 1)', run:() => boardBus(dx)};
    }
    return null;
  }
  function busCarry(mx, mz, spd, dt){                                        // wołane co klatkę po updateBus: przenosi gracza razem z autobusem
    const h = BUS.heading, c = Math.cos(h), s = Math.sin(h);
    let dh = h - busPrevH; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); busPrevH = h;
    yaw -= dh; facing -= dh; player.rotation.y = facing;                     // widok obraca się razem z autobusem na zakrętach
    const sp = Math.min(spd, 3.2);
    busLocal.x += (mx*c + mz*s)*sp*dt; busLocal.z += (-mx*s + mz*c)*sp*dt;
    const R = 0.3, clampLocal = () => { busLocal.x = Math.max(-4.35, Math.min(4.25, busLocal.x)); busLocal.z = Math.max(-1.05, Math.min(1.05, busLocal.z)); };
    clampLocal();
    for(const q of BUS_SEATS){                                               // fotele i kabina kierowcy są bryłami
      const cx = Math.max(q.x - q.hx, Math.min(q.x + q.hx, busLocal.x)), cz = Math.max(q.z - q.hz, Math.min(q.z + q.hz, busLocal.z));
      const ddx = busLocal.x - cx, ddz = busLocal.z - cz, dd = Math.hypot(ddx, ddz);
      if(dd < R){
        if(dd > 1e-5){ busLocal.x += ddx/dd*(R - dd); busLocal.z += ddz/dd*(R - dd); }
        else {
          const ox = q.hx - Math.abs(busLocal.x - q.x), oz = q.hz - Math.abs(busLocal.z - q.z);
          if(ox < oz) busLocal.x += Math.sign(busLocal.x - q.x || 1)*(ox + R); else busLocal.z += Math.sign(busLocal.z - q.z || 1)*(oz + R);
        }
      }
    }
    clampLocal();
    const w = busToWorld(busLocal.x, busLocal.z);
    player.position.x = w.x; player.position.z = w.z;
  }
  function updateBus(dt){
    if(BUS.dwell <= 0) BUS.doorTarget = 0;                                   // w ruchu drzwi są zawsze zamknięte
    BUS.door += Math.max(-dt*1.6, Math.min(dt*1.6, BUS.doorTarget - BUS.door));
    applyBusDoors();
    BUS.roof.visible = !(busRide && !firstPerson);                           // w widoku z zewnątrz dach znika, żeby było widać wnętrze
    if(!BUS.active){                                                         // kursu nie ma: autobus linii 1 rusza wyłącznie z PKS (patrz updatePksBuses)
      if(BUS.wait > 0) BUS.wait -= dt;
      else if(pksAway) pksReturn();                                         // po przerwie autobus wraca na PKS
      return;
    }
    if(BUS.dwell > 0){                                                       // postój: drzwi otwarte, na koniec zamykają się przed odjazdem
      BUS.dwell -= dt; BUS.speed = 0; BUS.doorTarget = BUS.dwell > 1.4 ? 1 : 0;
      return;
    }
    if(BUS.door > 0.02){ BUS.speed = 0; return; }                            // czeka, aż drzwi się domkną
    const p = BUS.group.position, tgt = BUS_ROUTE[BUS.wp], tx = tgt[0], tz = tgt[1], stopName = tgt[2];
    const dist = Math.hypot(tx-p.x, tz-p.z);
    let da = Math.atan2(tz-p.z, tx-p.x) - BUS.heading; while(da > Math.PI) da -= Math.PI*2; while(da < -Math.PI) da += Math.PI*2;
    BUS.heading += Math.sign(da) * Math.min(Math.abs(da), 1.7*dt);
    const hx = Math.cos(BUS.heading), hz = Math.sin(BUS.heading);
    const ahead = (x, z, range, side) => { const dx = x-p.x, dz = z-p.z, fwd = dx*hx + dz*hz, lat = -dx*hz + dz*hx; return fwd > 0 && fwd < range && Math.abs(lat) < side; };
    let blocked = false;
    if(BUS.stuck < 4){                                                       // po 4 s zakleszczenia autobus przejeżdża „przez” przeszkodę (jak auta)
      blocked = trafficCars.some(o => o.active && ahead(o.group.position.x, o.group.position.z, 12, 2.5))
             || pksBuses.some(o => ahead(o.group.position.x, o.group.position.z, 12, 2.6))
             || (hasCar && !carDriving && pcar.group.visible && ahead(pcar.group.position.x, pcar.group.position.z, 11, 2.5));
    }
    if(!blocked && !busRide) blocked = ahead(player.position.x, player.position.z, 10, 2.2);   // gracz (pieszo lub autem) na jezdni; pasażer się nie liczy
    BUS.stuck = (blocked && BUS.speed < 0.5) ? BUS.stuck + dt : 0;
    if(BUS.stuck > 7) BUS.stuck = 0;
    let cap = 8;
    if(Math.abs(da) > 0.35) cap = Math.min(cap, 4);                          // zakręty i nawrót
    if(Math.hypot(p.x-RB.x, p.z-RB.z) < 17 || Math.hypot(p.x-WR.x, p.z-WR.z) < 17) cap = Math.min(cap, 5);          // rondo
    let target = blocked ? 0 : cap;
    if(stopName) target = Math.min(target, Math.max(0, dist - 0.4) * 1.3);   // łagodne hamowanie do przystanku
    BUS.speed += (target - BUS.speed) * Math.min(1, 2.5*dt);
    p.x += hx * BUS.speed * dt; p.z += hz * BUS.speed * dt;
    BUS.group.rotation.y = -BUS.heading;
    { // wysokość i przechył wg nachylenia drogi (wzgórze): średnia pod osiami, dłuższy rozstaw niż w aucie
      const hf = terrainH(p.x + hx*4, p.z + hz*4), hb = terrainH(p.x - hx*4, p.z - hz*4);
      BUS.pitch += (Math.atan2(hf - hb, 8) - BUS.pitch) * Math.min(1, dt*8);
      p.y = (hf + hb)/2 + 0.02; BUS.group.rotation.z = BUS.pitch;
    }
    const rel = (tx-p.x)*hx + (tz-p.z)*hz;                                   // <0: punkt jest już za autobusem
    if(stopName){
      if((dist < 1.0 && BUS.speed < 1.2) || (rel < 0 && dist < 5)){          // dojechał do przystanku – postój z otwartymi drzwiami
        BUS.speed = 0; BUS.dwell = BUS_DWELL; BUS.doorTarget = 1; BUS.wp++;
        if(busRide) toast('🚌 Przystanek: ' + stopName);
      }
    } else if(dist < 3.5) BUS.wp++;
    if(BUS.wp >= BUS_ROUTE.length){                                          // koniec trasy: autobus znika, za jakiś czas pojawi się nowy kurs
      if(busRide) leaveBus(true);                                            // pasażer wysiada przed zniknięciem
      BUS.active = false; BUS.group.visible = false; BUS.speed = 0; BUS.door = 0; BUS.doorTarget = 0;
      BUS.wait = pksAway ? 0 : BUS_GAP[0] + Math.random()*(BUS_GAP[1] - BUS_GAP[0]);   // kurs kończy się na Górnej – autobus od razu jedzie na PKS
    }
  }

  // ===== Autobusy PKS: 3 autobusy stoją na stanowiskach 1–3; gdy jeden kończy kurs (Społeczna → rondo → z powrotem), wyjeżdża kolejny =====
  // Kolejka: z przodu (stanowisko 1) stoi autobus, który pojedzie następny. Po jego wyjeździe reszta podjeżdża o jedno stanowisko do przodu,
  // a wracający autobus objeżdża plac i staje na końcu kolejki (stanowisko 3). Po krótkim postoju wyjeżdża następny.
  const PKS_DWELL = [7, 11];                                               // postój po powrocie (s): min, max, zanim ruszy kolejny autobus
  const PKS_COURSE = (function(){
    const Zq = PKS_ZQ, JX = PKS_JX, xs = JX + 2.5, xe = JX - 2.5;          // pas wyjazdu (na północ) i wjazdu (na południe)
    const strip = a => a.map(q => [q[0], q[1]]);                           // circ() dodaje trzeci element (flaga ronda) – tu byłby odczytany jako „przystanek”
    const n = SPOL_PATH.length, east = [], west = [];
    for(let i = n-2; i >= 0; i--){                                         // pas w stronę ronda (wschodni / północny) – jak w trasie autobusu miejskiego
      const a = SPOL_PATH[Math.max(0, i-1)], b = SPOL_PATH[Math.min(n-1, i+1)];
      const tx = b[0]-a[0], tz = b[1]-a[1], tl = Math.hypot(tx, tz) || 1;
      east.push([SPOL_PATH[i][0] + 2.5*tz/tl, SPOL_PATH[i][1] - 2.5*tx/tl]);
    }
    for(let i = 0; i <= n-2; i++){                                         // pas z ronda (zachodni / południowy) – jak w ruchu drogowym
      const a = SPOL_PATH[Math.max(0, i-1)], b = SPOL_PATH[Math.min(n-1, i+1)];
      const tx = b[0]-a[0], tz = b[1]-a[1], tl = Math.hypot(tx, tz) || 1;
      west.push([SPOL_PATH[i][0] + 2.5*(-tz/tl), SPOL_PATH[i][1] + 2.5*(tx/tl)]);
    }
    const pts = [[PKS_BAYS[0].x, Zq], [36.2, Zq], [39.4, 175.6], [xs, 171.5], [xs, 165], [xs, 159], [xs + 0.6, 155.4], [xs + 3, 153.2], [xs + 8, 152.5], [70, 152.5], [100, 152.5]];   // wyjazd z peronu i w prawo na Społeczną
    pts.push(...east, [RB.x + 2.5, 40], [RB.x + 2.5, 0]);                  // Społeczna aż do ronda
    pts.push(...strip(circ(1.3, -4.4)), [RB.x - 2.5, -1], [RB.x - 2.5, 40]);   // pełne okrążenie ronda (nawrót) i powrót
    pts.push(...west, [100, 147.5], [72, 147.5], [50, 147.5]);             // Społeczna na zachód
    pts.push([43.5, 148.2], [38, 150], [xe, 153], [xe, 158], [xe, 164.5]);  // skręt w lewo za stacją paliw, w drogę do PKS
    pts.push([33.5, 168.2], [28, 168.5], [10, 168.5], [-4, 168.5], [-8.5, 171], [-8.5, 175], [-5.5, Zq], [-3, Zq]);   // objazd placu od północy i wjazd na koniec kolejki od zachodu
    pts.push([PKS_BAYS[2].x, Zq, true]);                                   // stanowisko 3 (trzeci element = zatrzymanie)
    return pts;
  })();
  let pksAway = null;                                                      // autobus PKS aktualnie jadący jako linia 1 (model BUS); po kursie wraca na PKS
  const pksBuses = [], pksBays = [null, null, null];                       // pksBays[i] – autobus zajmujący stanowisko i+1
  let pksTimer = 6, pksOnCourse = null;                                    // czas do wyjazdu kolejnego, autobus na kursie
  function applyPksDoors(b){                                               // 0 = zamknięte, 1 = otwarte (jak w autobusie miejskim)
    const d = b.door, e = d*d*(3 - 2*d), sl = Math.min(1, e*2), sx = Math.max(0, e*2 - 1);
    b.doors.forEach(D => {
      D.l.position.set(D.dx - 0.275 - 0.58*sx, 1.775, 1.25 - 0.13*sl);
      D.r.position.set(D.dx + 0.275 + 0.58*sx, 1.775, 1.25 - 0.13*sl);
    });
  }
  for(let i = 0; i < 3; i++){
    const m = makeBusModel({extra:true});   // ten sam wygląd i napisy co autobus miejski linii 1
    const b = {group:m.group, roof:m.roof, doors:m.doors, door:1, doorTarget:1, active:true, state:'parked', bay:i, route:null, wp:0, heading:0, speed:0, pitch:0, stuck:0, hl:4.8, hw:1.35};
    b.group.position.set(PKS_BAYS[i].x, terrainH(PKS_BAYS[i].x, PKS_ZQ) + 0.02, PKS_ZQ);
    b.group.rotation.y = 0; b.group.visible = true; applyPksDoors(b);
    pksBuses.push(b); pksBays[i] = b;
  }
  function pksHandOff(b){                                                  // autobus z PKS wyjeżdża na Społeczną jako linia 1: przejmuje go model BUS (przystanki, wsiadanie)
    const p = b.group.position;
    BUS.wp = 1; BUS.speed = b.speed; BUS.dwell = 0; BUS.stuck = 0; BUS.pitch = b.pitch; BUS.door = 0; BUS.doorTarget = 0;
    BUS.heading = Math.atan2(BUS_ROUTE[1][1]-p.z, BUS_ROUTE[1][0]-p.x);
    BUS.group.position.set(p.x, p.y, p.z); BUS.group.rotation.y = -BUS.heading; BUS.group.rotation.z = BUS.pitch;
    BUS.group.visible = true; BUS.active = true;
    b.group.visible = false; b.group.position.set(-9999, 0, -9999); b.speed = 0; b.state = 'away'; pksAway = b;
  }
  function pksReturn(){                                                    // koniec kursu linii 1: autobus wraca ze Społecznej na PKS (na koniec kolejki)
    const b = pksAway; pksAway = null;
    const wi = PKS_COURSE.findIndex(q => q[0] === 72 && q[1] === 147.5);
    b.route = PKS_COURSE; b.wp = wi; b.state = 'course'; b.stuck = 0; b.speed = 0; b.pitch = 0; b.door = 0; b.doorTarget = 0;
    const bx = BUS.group.position.x, bz = BUS.group.position.z;             // zaczyna tam, gdzie kurs się skończył (przystanek Górna)
    b.heading = Math.PI; b.group.position.set(bx, terrainH(bx, bz) + 0.02, bz); b.group.rotation.y = -b.heading; b.group.rotation.z = 0;
    b.group.visible = true;
  }
  function pksDrive(b, dt){                                                // jazda po b.route; true = dojechał do punktu zatrzymania
    const p = b.group.position, tgt = b.route[b.wp], tx = tgt[0], tz = tgt[1], stop = !!tgt[2], dist = Math.hypot(tx-p.x, tz-p.z);
    let da = Math.atan2(tz-p.z, tx-p.x) - b.heading; while(da > Math.PI) da -= Math.PI*2; while(da < -Math.PI) da += Math.PI*2;
    b.heading += Math.sign(da) * Math.min(Math.abs(da), 1.7*dt);
    const hx = Math.cos(b.heading), hz = Math.sin(b.heading);
    const ahead = (x, z, range, side) => { const dx = x-p.x, dz = z-p.z, fwd = dx*hx + dz*hz, lat = -dx*hz + dz*hx; return fwd > 0 && fwd < range && Math.abs(lat) < side; };
    let blocked = false;
    if(b.stuck < 4){                                                       // po 4 s zakleszczenia przejeżdża „przez” przeszkodę (jak auta i autobus miejski)
      blocked = trafficCars.some(o => o.active && ahead(o.group.position.x, o.group.position.z, 12, 2.5))
             || (BUS.active && [-3.5, 0, 3.5].some(k => ahead(BUS.group.position.x + Math.cos(BUS.heading)*k, BUS.group.position.z + Math.sin(BUS.heading)*k, 11, 2.6)))
             || pksBuses.some(o => o !== b && ahead(o.group.position.x, o.group.position.z, 12, 2.6))
             || (hasCar && !carDriving && pcar.group.visible && ahead(pcar.group.position.x, pcar.group.position.z, 11, 2.5));
    }
    if(!blocked) blocked = ahead(player.position.x, player.position.z, 10, 2.2);   // gracz (pieszo lub autem) przed autobusem
    b.stuck = (blocked && b.speed < 0.5) ? b.stuck + dt : 0;
    if(b.stuck > 7) b.stuck = 0;
    let cap = 8;
    if(Math.abs(da) > 0.35) cap = Math.min(cap, 4);                        // zakręty
    if(p.z > 163 && p.x < 48) cap = Math.min(cap, 4.5);                    // na placu PKS wolniej
    if(Math.hypot(p.x-RB.x, p.z-RB.z) < 17 || Math.hypot(p.x-WR.x, p.z-WR.z) < 17) cap = Math.min(cap, 5);        // rondo
    let target = blocked ? 0 : cap;
    if(stop) target = Math.min(target, Math.max(0, dist - 0.4) * 1.3);     // łagodne hamowanie do stanowiska
    b.speed += (target - b.speed) * Math.min(1, 2.5*dt);
    p.x += hx * b.speed * dt; p.z += hz * b.speed * dt;
    b.group.rotation.y = -b.heading;
    {   // wysokość i przechył wg nachylenia terenu
      const hf = terrainH(p.x + hx*4, p.z + hz*4), hb = terrainH(p.x - hx*4, p.z - hz*4);
      b.pitch += (Math.atan2(hf - hb, 8) - b.pitch) * Math.min(1, dt*8);
      p.y = (hf + hb)/2 + 0.02; b.group.rotation.z = b.pitch;
    }
    const rel = (tx-p.x)*hx + (tz-p.z)*hz;
    if(stop){ if((dist < 1.0 && b.speed < 1.2) || (rel < 0 && dist < 5)){ b.speed = 0; return true; } }
    else if(dist < 3.5) b.wp++;
    return false;
  }
  function updatePksBuses(dt){
    for(const b of pksBuses){                                              // drzwi: otwarte na stanowisku, zamknięte w ruchu
      if(b.state !== 'parked' && b.state !== 'closing') b.doorTarget = 0;
      b.door += Math.max(-dt*1.6, Math.min(dt*1.6, b.doorTarget - b.door));
      applyPksDoors(b);
    }
    for(let i = 1; i < pksBays.length; i++){                               // kolejka podjeżdża do przodu, gdy zwolni się stanowisko przed autobusem
      const b = pksBays[i];
      if(b && b.state === 'parked' && !pksBays[i-1]){
        pksBays[i-1] = b; pksBays[i] = null; b.bay = i-1; b.state = 'shift';
        b.doorTarget = 0; b.route = [[PKS_BAYS[i-1].x, PKS_ZQ, true]]; b.wp = 0;
      }
    }
    const front = pksBays[0];                                              // wyjazd kolejnego autobusu dopiero gdy poprzedni skończył kurs
    if(!pksOnCourse && front && front.state === 'parked'){
      pksTimer -= dt;
      if(pksTimer <= 0){ front.state = 'closing'; front.doorTarget = 0; }
    }
    for(const b of pksBuses){
      const p = b.group.position;
      if(b.state === 'closing'){
        if(b.door < 0.02){ b.state = 'leaving'; b.route = PKS_COURSE; b.wp = 1; b.stuck = 0; pksOnCourse = b; }
      } else if(b.state === 'shift'){
        if(pksDrive(b, dt)){ b.state = 'parked'; b.doorTarget = 1; b.heading = 0; b.group.rotation.y = 0; }
      } else if(b.state === 'leaving' || b.state === 'course'){
        if(b.state === 'leaving' && Math.hypot(p.x - PKS_BAYS[0].x, p.z - PKS_ZQ) > 14){ pksBays[0] = null; b.state = 'course'; }   // stanowisko 1 wolne dopiero, gdy autobus odjechał
        if(b.state === 'course' && b.wp === 9 && p.x >= 52 && !BUS.active){ pksHandOff(b); continue; }   // na Społecznej autobus zaczyna kurs linii 1
        if(pksDrive(b, dt)){                                               // koniec kursu: stoi na końcu kolejki, za chwilę wyjedzie następny
          b.state = 'parked'; b.bay = 2; pksBays[2] = b; b.doorTarget = 1; b.heading = 0; b.group.rotation.y = 0; b.route = null;
          pksOnCourse = null; pksTimer = PKS_DWELL[0] + Math.random()*(PKS_DWELL[1] - PKS_DWELL[0]);
        }
      }
    }
  }

  // ===== Auto gracza (kupione w salonie za 300 monet): W/S gaz i hamulec / wsteczny, A/D skręt, Spacja – hamulec, B – hamulec ręczny, F – wsiądź / wysiądź =====
  let hasCar = false, carDriving = false, carV = 0, carHeading = 0;
  let handbrake = true, hbHintT = 0;                                   // hamulec ręczny (B): zaciągnięty = auto stoi, zwolniony = stacza się z pochyłości
  let carFuel = 100, fuelLowWarned = false, fuelEmptyWarned = false;   // paliwo auta w % (pełny bak po zakupie)
  let steerLvl = 0;                                                    // poziom ulepszenia skrętu u mechanika (0–3)
  const pcar = buildCarModel(PLAYER_CAR_COLOR);
  pcar.group.rotation.order = 'YXZ';                                   // najpierw kierunek jazdy, potem przechył (nos góra/dół) w układzie auta
  let carPitch = 0;                                                    // aktualny przechył auta (rad; ujemny = nos w górę)
  let carBank = 0;                                                     // przechył boczny auta (rad; dodatni = prawa strona wyżej), gdy stoi bokiem do stoku
  function carTilt(x, z, h){                                           // przechył i wysokość środka auta wg nachylenia drogi pod osiami
    const L = 2.0, sn = Math.sin(h), cs = Math.cos(h);
    const W = 0.95, hf = terrainH(x + sn*L, z + cs*L), hb = terrainH(x - sn*L, z - cs*L);
    const hr = terrainH(x + cs*W, z - sn*W), hl = terrainH(x - cs*W, z + sn*W);   // teren pod prawym i lewym bokiem auta
    return {pitch: -Math.atan2(hf - hb, 2*L), roll: Math.atan2(hr - hl, 2*W), y: (hf + hb + hr + hl)/4};
  }
  pcar.group.visible = false; scene.add(pcar.group);
  // Wnętrze: bez niego w widoku pierwszoosobowym kamera jest w pustej bryle (ściany są jednostronne) i auto wygląda na przezroczyste.
  // Układ lokalny modelu: przód = +X, prawa strona = +Z, kierowca po lewej (z = −0,42).
  (function buildCarInterior(){
    const g = new THREE.Group(), lm = c => new THREE.MeshLambertMaterial({color:c});
    const bx = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), lm(c)); m.position.set(x,y,z); g.add(m); return m; };
    bx(2.3,0.06,1.7,0x6b7078,-0.2,1.62,0);                                              // podsufitka
    [[0.92,-0.8],[0.92,0.8],[-0.3,-0.82],[-0.3,0.82],[-1.3,-0.8],[-1.3,0.8]].forEach(([x,z]) => bx(0.08,0.62,0.08,0x2a2f35,x,1.3,z));   // słupki A / B / C
    bx(0.5,0.16,1.62,0x2f343a,0.7,1.11,0);                                              // deska rozdzielcza
    bx(0.2,0.1,0.5,0x15181c,0.78,1.22,-0.42);                                           // zegary przed kierowcą
    bx(2.1,0.2,0.05,0x3b4046,-0.3,1.13,-0.8); bx(2.1,0.2,0.05,0x3b4046,-0.3,1.13,0.8);  // wnętrza drzwi (dolna część)
    bx(0.5,0.13,0.46,0x4a3f36,-0.2,0.99,-0.42); bx(0.1,0.52,0.46,0x4a3f36,-0.48,1.21,-0.42);   // fotel kierowcy
    bx(0.5,0.13,0.46,0x4a3f36,-0.2,0.99,0.42);  bx(0.1,0.52,0.46,0x4a3f36,-0.48,1.21,0.42);    // fotel pasażera
    bx(0.5,0.13,1.5,0x4a3f36,-0.95,0.99,0); bx(0.1,0.5,1.5,0x4a3f36,-1.22,1.2,0);              // tylna kanapa
    bx(0.06,0.06,0.3,0x20242a,0.82,1.5,0);                                              // lusterko wsteczne
    const steer = new THREE.Group(); steer.position.set(0.5,1.22,-0.42); g.add(steer);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17,0.022,8,22), lm(0x15181c)); wheel.rotation.y = Math.PI/2; steer.add(wheel);   // koło skierowane do kierowcy
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.03,10), lm(0x2a2f35)); hub.rotation.z = Math.PI/2; steer.add(hub);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.015,0.02,0.32), lm(0x15181c)); steer.add(spoke);
    g.visible = false; pcar.root.add(g);
    pcar.interior = g; pcar.steer = steer;
  })();
  function placeCar(x, z, h){ hasCar = true; handbrake = true; carHeading = h; carV = 0; const tt = carTilt(x, z, h); carPitch = tt.pitch; carBank = tt.roll; pcar.group.position.set(x, tt.y + 0.02, z); pcar.group.rotation.y = h; pcar.group.rotation.x = carPitch; pcar.group.rotation.z = carBank; pcar.group.visible = true; }
  // Kierunkowskazy gracza: Z – lewy, C – prawy, X – awaryjne. Skręt wyłącza się sam po wykonaniu manewru (jak w prawdziwym aucie).
  let pSig = 0, pHazard = false, pSigStart = 0, pSigTurned = false;
  function setPlayerSignal(v){ pSig = (pSig === v) ? 0 : v; pSigStart = carHeading; pSigTurned = false; }
  addEventListener('keydown', e => {
    if(e.repeat || isDead || isPaused || !carDriving) return;
    if(e.code === 'KeyZ') setPlayerSignal(-1);
    else if(e.code === 'KeyC') setPlayerSignal(1);
    else if(e.code === 'KeyX') pHazard = !pHazard;
    else if(e.code === 'KeyB'){ handbrake = !handbrake; toast(handbrake ? 'Hamulec ręczny zaciągnięty 🅿️' : 'Hamulec ręczny zwolniony'); }
  });
  // ===== Klakson: syntezator Web Audio (bez plików) – gracz trzyma H, a auta ruchu trąbią, gdy zastawisz im drogę =====
  let audioCtx = null;
  let soundOn = true;                                                                // ustawienie z menu pauzy: dźwięki włączone / wyłączone
  try{ soundOn = localStorage.getItem('pz_sound') !== '0'; }catch(err){}
  function getAudio(){
    if(!soundOn) return null;                                                        // wyciszone: żaden syntezowany dźwięk nie powstaje
    try{
      if(!audioCtx){ const A = window.AudioContext || window.webkitAudioContext; if(!A) return null; audioCtx = new A(); }
      if(audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }catch(err){ return null; }
  }
  // dur = czas w sekundach albo Infinity (trzymany klakson); zwraca uchwyt z stop()
  // Obwiednia: szybkie narastanie (30 ms), stała głośność, potem łagodne wyciszenie (setTargetAtTime) – bez skoków i trzasków.
  function hornTone(freq, dur, vol){
    const a = getAudio(); if(!a || vol < 0.01) return null;
    try{
      const t = a.currentTime, g = a.createGain(), lp = a.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1700;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03);
      const oscs = [['sawtooth', freq], ['square', freq*1.26]].map(([type, f]) => { const o = a.createOscillator(); o.type = type; o.frequency.value = f; o.connect(lp); o.start(t); return o; });
      lp.connect(g); g.connect(a.destination);
      let stopped = false;
      const release = (at) => {
        if(stopped) return; stopped = true;
        at = Math.max(at, t + 0.03);                                    // nigdy przed końcem narastania
        g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(vol, at);
        g.gain.setTargetAtTime(0, at, 0.03);                            // wyciszenie ~0,1 s
        oscs.forEach(o => o.stop(at + 0.4));
      };
      if(isFinite(dur)) release(t + dur);
      return {stop:() => release(a.currentTime)};
    }catch(err){ return null; }
  }
  let playerHorn = null;
  // Przycisk „Dźwięk” w Ustawieniach (menu pauzy): wycisza klakson, kliknięcia kierunkowskazów i nagrania w Plikach komputera
  const soundBtn = document.createElement('button');
  soundBtn.id = 'soundBtn'; soundBtn.type = 'button';
  soundBtn.style.cssText = 'display:block;width:100%;margin-top:0;border:0;border-radius:8px;padding:10px 20px;color:#fff;font-size:15px;font-weight:600;cursor:pointer';
  function applySound(){
    if(!soundOn && playerHorn){ playerHorn.stop(); playerHorn = null; }
    try{ if(audioCtx){ if(soundOn) audioCtx.resume(); else audioCtx.suspend(); } }catch(err){}
    try{ document.getElementById('pcFilesVideo').muted = !soundOn; }catch(err){}
    soundBtn.textContent = soundOn ? '🔊 Dźwięk: włączony' : '🔇 Dźwięk: wyłączony';
    soundBtn.style.background = soundOn ? 'rgba(46,125,50,.9)' : '#3d4654';
  }
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    try{ localStorage.setItem('pz_sound', soundOn ? '1' : '0'); }catch(err){}
    applySound();
    if(soundOn) signalClick(true, 0.09);                                             // krótki klik na potwierdzenie
  });
  { const slot = document.getElementById('stSoundSlot'); if(slot) slot.appendChild(soundBtn); else document.getElementById('pauseCard').appendChild(soundBtn); }
  applySound();
  addEventListener('keydown', e => {
    if(e.code !== 'KeyH' || e.repeat || isDead || isPaused || !carDriving || playerHorn) return;
    playerHorn = hornTone(430, Infinity, 0.32) || {stop(){}};
  });
  addEventListener('keyup', e => { if(e.code === 'KeyH' && playerHorn){ playerHorn.stop(); playerHorn = null; } });
  addEventListener('blur', () => { if(playerHorn){ playerHorn.stop(); playerHorn = null; } });
  // Auto ruchu zajechane drogę przez auto gracza (jadące albo zaparkowane na jezdni)
  function blockedByPlayerCar(car){
    if(!hasCar || !pcar.group.visible) return false;
    const hx = Math.cos(car.heading), hz = Math.sin(car.heading), p = car.group.position;
    const dx = pcar.group.position.x - p.x, dz = pcar.group.position.z - p.z;
    const fwd = dx*hx + dz*hz, lat = -dx*hz + dz*hx;
    return fwd > 0 && fwd < 8 && Math.abs(lat) < 2.3;
  }
  // Eskalacja: po ~1 s postoju jeden krótki sygnał, potem rundy po 2, 3, 4 sygnały, za każdym razem dłuższe (do ok. 1,2 s)
  function trafficHorn(car, dt){
    if(isPaused) return;
    if(blockedByPlayerCar(car) && car.speed < 1.5){ car.bt += dt; car.freeT = 0; }
    else {
      car.freeT += dt;
      if(car.freeT > 2){ car.bt = 0; car.hr = 0; car.hb = 0; car.ht = 0; }          // droga wolna dłużej niż 2 s: zaczynamy od nowa
      if(car.hb === 0) return;
    }
    car.ht -= dt;
    if(car.hb === 0 && car.ht <= 0 && car.bt >= 1.0){ car.hb = Math.min(car.hr + 1, 4); car.hornDur = Math.min(0.18 + 0.12*car.hr, 1.2); }
    if(car.hb > 0 && car.ht <= 0){
      const d = Math.hypot(car.group.position.x - player.position.x, car.group.position.z - player.position.z);
      hornTone(car.hornF, car.hornDur, 0.3*Math.pow(Math.max(0, 1 - d/70), 1.4));
      car.hb--; car.ht = car.hornDur + 0.12;
      if(car.hb === 0){ car.hr++; car.ht = car.hornDur + 1.4; }                     // koniec rundy – dłuższa przerwa
    }
  }
  let sigSndActive = false, sigPhase = false;
  function signalClick(high, vol){                                                   // krótki mechaniczny klik: impuls prostokątny z szybkim zanikiem
    const a = getAudio(); if(!a || vol < 0.004) return;
    try{
      const t = a.currentTime, o = a.createOscillator(), g = a.createGain(), hp = a.createBiquadFilter();
      o.type = 'square'; o.frequency.value = high ? 1900 : 1350;
      hp.type = 'highpass'; hp.frequency.value = 900;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      o.connect(hp); hp.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.05);
    }catch(err){}
  }
  function updatePlayerSignals(steer){
    if(carDriving && pSig){
      const turned = pSig === 1 ? pSigStart - carHeading : carHeading - pSigStart;      // D (prawo) zmniejsza carHeading
      if(turned > 0.6) pSigTurned = true;
      if(pSigTurned && Math.abs(steer) < 0.1) pSig = 0;                                 // skręt zrobiony i kierownica prosto
    }
    const on = (blinkT % 0.8) < 0.4;
    const sigActive = hasCar && (pSig !== 0 || pHazard);
    if(sigActive && (!sigSndActive ? on : on !== sigPhase)){                           // klik przekaźnika przy każdej zmianie fazy (tik przy zapaleniu, tak przy zgaśnięciu)
      const dc = carDriving ? 0 : Math.hypot(pcar.group.position.x - player.position.x, pcar.group.position.z - player.position.z);
      signalClick(on, 0.09*(carDriving ? 1 : Math.pow(Math.max(0, 1 - dc/25), 1.5)));   // w aucie głośno, z zewnątrz coraz ciszej z odległością
    }
    sigSndActive = sigActive; sigPhase = on;
    pcar.sigL.color.setHex(((pSig === -1) || pHazard) && on ? SIG_ON : SIG_OFF);
    pcar.sigR.color.setHex(((pSig === 1) || pHazard) && on ? SIG_ON : SIG_OFF);
  }
  function enterCar(){
    if(!hasCar || carDriving) return;
    if(bikeMounted) dismountBike();
    carDriving = true; carV = 0; player.visible = false; vy = 0;
    if(nightLevel > 0.45 && !headOn){ headOn = true; }                                // po zmroku światła zapalają się same
    player.position.set(pcar.group.position.x, 0, pcar.group.position.z);
    toast('Jedziesz autem 🚗  W/S – gaz i hamulec, A/D – skręt, Spacja – hamulec, B – hamulec ręczny, Z / C – kierunkowskazy, X – awaryjne, L – światła, H – klakson, Shift – wysiądź');
  }
  function exitCar(){
    if(!carDriving) return;
    carDriving = false; carV = 0; player.visible = true; pSig = 0;                    // awaryjne zostają włączone po wysiadce
    const side = 2.4, c = Math.cos(carHeading), sn = Math.sin(carHeading);          // wysiadasz z lewej strony auta
    const sp = safeExitSpot(pcar.group.position.x, pcar.group.position.z, c*side, -sn*side, null, 1.8);
    player.position.set(sp.x, 0, sp.z);
    facing = carHeading; player.rotation.y = facing; vy = 0;
    toast(handbrake ? 'Wysiadłeś z auta' : 'Wysiadłeś z auta – hamulec ręczny nie jest zaciągnięty! ⚠️ Auto może się stoczyć');
  }
  function driveCar(ix, iz, dt){
    const MAXF = 20, MAXR = 6;
    if(handbrake){                                                                   // zaciągnięty ręczny blokuje tylne koła – gaz nic nie daje
      if(Math.abs(iz) > 0.05 && performance.now() - hbHintT > 2500){ hbHintT = performance.now(); toast('Zwolnij hamulec ręczny – B 🅿️'); }
      iz = 0;
    }
    if(carFuel <= 0) iz = 0;                                                         // bez paliwa silnik nie reaguje na gaz (hamować i toczyć się można)
    if(iz > 0.05) carV += (carV < 0 ? 26 : 10)*iz*dt;
    else if(iz < -0.05) carV -= (carV > 0 ? 26 : 8)*(-iz)*dt;
    else { const f = 6*dt; carV = Math.abs(carV) <= f ? 0 : carV - Math.sign(carV)*f; }
    if(keys.Space){ const f = 30*dt; carV = Math.abs(carV) <= f ? 0 : carV - Math.sign(carV)*f; }
    if(handbrake){ const f = 18*dt; carV = Math.abs(carV) <= f ? 0 : carV - Math.sign(carV)*f; }   // ręczny też wyhamowuje jadące auto
    carV = Math.max(-MAXR, Math.min(MAXF, carV));
    const grip = Math.min(1, Math.abs(carV)/4);                                      // w miejscu nie da się skręcać
    carHeading -= ix * 1.9*(1 + 0.3*steerLvl)/(1 + Math.abs(carV)/(22 + 10*steerLvl)) * grip * Math.sign(carV) * dt;   // ulepszenia: ostrzejszy skręt także przy dużej prędkości
    player.position.x += Math.sin(carHeading)*carV*dt;
    player.position.z += Math.cos(carHeading)*carV*dt;
    if(carFuel > 0){                                                                 // zużycie: bieg jałowy + droga + mocniejszy gaz
      carFuel = Math.max(0, carFuel - (FUEL_IDLE + Math.abs(carV)*FUEL_PER_M)*dt - Math.max(0, iz)*FUEL_THROTTLE*dt);
      if(carFuel < 15 && !fuelLowWarned){ fuelLowWarned = true; toast('Rezerwa paliwa ⛽ Zatankuj na stacji przy ulicy Społecznej'); }
      if(carFuel <= 0 && !fuelEmptyWarned){ fuelEmptyWarned = true; toast('Skończyło się paliwo! ⛽ Silnik zgasł'); }
    }
    if(carFuel > 25) fuelLowWarned = false;
    if(carFuel > 0) fuelEmptyWarned = false;
  }
  // ===== Staczanie: zaparkowane auto bez zaciągniętego ręcznego rusza w dół pochyłości (grawitacja wzdłuż osi auta) =====
  function rollBlocked(x, z, h){                                                     // czy auto (przód, środek, tył) uderzyłoby w przeszkodę
    const sn = Math.sin(h), cs = Math.cos(h);
    for(const k of [-1.6, 0, 1.6]){
      const px = x + sn*k, pz = z + cs*k;
      for(const t of treeColl){ if(Math.abs(px - t.x) < 3 && Math.abs(pz - t.z) < 3 && Math.hypot(px - t.x, pz - t.z) < t.r + 1.0) return true; }
      for(const b of BUILDINGS){ if(!b.open && Math.abs(px - b.x) < b.w/2 + 1.0 && Math.abs(pz - b.z) < b.d/2 + 1.0) return true; }
      for(const w of WALLS){ if(w.enter === undefined && Math.abs(px - w.x) < w.w/2 + 1.0 && Math.abs(pz - w.z) < w.d/2 + 1.0) return true; }
    }
    for(const o of trafficCars.concat(pksBuses, [BUS])){ if(o.active && o.group.visible && Math.hypot(o.group.position.x - x, o.group.position.z - z) < 3.4) return true; }
    return false;
  }
  function updateCarRoll(dt){
    if(!hasCar || carDriving || !pcar.group.visible) return;
    if(handbrake){ carV = 0; return; }
    const p = pcar.group.position, L = 2.0, sn = Math.sin(carHeading), cs = Math.cos(carHeading);
    const slope = (terrainH(p.x + sn*L, p.z + cs*L) - terrainH(p.x - sn*L, p.z - cs*L))/(2*L);   // >0: przód wyżej niż tył
    carV -= slope*9.8*0.9*dt;                                                                   // składowa grawitacji wzdłuż auta
    const fr = 0.35*dt; carV = Math.abs(carV) <= fr ? 0 : carV - Math.sign(carV)*fr;            // opory toczenia – na prawie płaskim terenie stoi
    carV = Math.max(-12, Math.min(12, carV*(1 - 0.04*dt)));
    if(Math.abs(carV) < 0.005) return;
    const nx = p.x + sn*carV*dt, nz = p.z + cs*carV*dt;
    if(rollBlocked(nx, nz, carHeading)){ carV = 0; return; }                                    // uderzyło w przeszkodę – staje
    const tt = carTilt(nx, nz, carHeading); carPitch += (tt.pitch - carPitch)*Math.min(1, dt*8); carBank += (tt.roll - carBank)*Math.min(1, dt*8);
    p.set(nx, tt.y + 0.02, nz); pcar.group.rotation.x = carPitch; pcar.group.rotation.z = carBank;
    pcar.wheels.forEach(w => { w.rotation.z -= carV*dt/0.36; });
  }
  // ===== Paliwo: wskaźnik w aucie, zużycie i tankowanie na stacji (F przy dystrybutorze) =====
  const FUEL_IDLE = 0.008, FUEL_PER_M = 0.02, FUEL_THROTTLE = 0.03;                   // % baku: na sekundę, na metr, na sekundę pełnego gazu
  const FUEL_PRICE = 0.2;                                                            // monet za 1% baku (pełny bak = 20 🪙)
  const fuelEl = document.createElement('div'); fuelEl.id = 'fuelGauge';
  fuelEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);display:none;align-items:center;gap:8px;background:rgba(0,0,0,.55);color:#fff;padding:8px 14px;border-radius:10px;font:bold 13px system-ui,sans-serif;pointer-events:none;z-index:9';
  fuelEl.innerHTML = '<span>⛽</span><span style="opacity:.7">E</span><div style="width:150px;height:12px;border-radius:6px;background:rgba(255,255,255,.22);overflow:hidden"><div id="fuelFill" style="height:100%;width:100%;background:#66bb6a"></div></div><span style="opacity:.7">F</span><span id="fuelVal" style="min-width:38px;text-align:right">100%</span>';
  const hbEl = document.createElement('span'); hbEl.style.cssText = 'margin-left:6px;padding:2px 8px;border-radius:6px;font-size:12px'; fuelEl.appendChild(hbEl);   // wskaźnik hamulca ręcznego
  document.body.appendChild(fuelEl);
  const fuelFill = fuelEl.querySelector('#fuelFill'), fuelVal = fuelEl.querySelector('#fuelVal');
  let fuelVisible = false;
  function updateFuelGauge(){
    const show = carDriving && hasCar;
    if(show !== fuelVisible){ fuelVisible = show; fuelEl.style.display = show ? 'flex' : 'none'; }
    if(!show) return;
    fuelFill.style.width = carFuel + '%';
    fuelFill.style.background = carFuel < 15 ? '#ef5350' : carFuel < 30 ? '#ffa726' : '#66bb6a';
    fuelVal.textContent = Math.round(carFuel) + '%';
    hbEl.textContent = handbrake ? '🅿️ Ręczny (B)' : 'Ręczny: luz (B)'; hbEl.style.background = handbrake ? '#c62828' : 'rgba(255,255,255,.18)';
    fuelEl.style.opacity = carFuel < 15 && Math.sin(performance.now()/180) > 0 ? 0.55 : 1;   // miganie przy rezerwie
  }
  function pumpDist(){ let bd = 99; for(const q of STATION_PUMPS) bd = Math.min(bd, Math.hypot(player.position.x - q.x, player.position.z - q.z)); return bd; }
  function nearestPump(){ let best = null, bd = 2.6; for(const q of STATION_PUMPS){ const d = Math.hypot(player.position.x - q.x, player.position.z - q.z); if(d < bd){ bd = d; best = q; } } return best; }
  function fuelAction(){
    if(bikeMounted) return null;
    const pump = nearestPump(); if(!pump) return null;
    if(!hasCar) return {text:'F – dystrybutor ⛽ (najpierw kup auto)', run:() => toast('Nie masz auta 🚗 – kupisz je w salonie przy ulicy Poprzecznej')};
    if(Math.hypot(pcar.group.position.x - pump.x, pcar.group.position.z - pump.z) > 7) return {text:'F – dystrybutor ⛽ (podstaw auto bliżej)', run:() => toast('Podjedź autem bliżej dystrybutora ⛽')};
    if(carFuel >= 99.5) return {text:'F – dystrybutor ⛽ (bak pełny)', run:() => toast('Masz już pełny bak ⛽')};
    return {text:`F – zatankuj auto ⛽ (bak: ${Math.round(carFuel)}%)`, run:openFuelTalk};
  }
  const fuelCost = pct => Math.max(1, Math.ceil(pct*FUEL_PRICE));
  function openFuelTalk(){
    const missing = 100 - carFuel, q = Math.min(25, missing);
    const btns = [];
    if(missing > 25.5) btns.push({label:`Dolej 25% (${fuelCost(q)} 🪙)`, fn:() => refuel(q)});
    btns.push({label:`Do pełna (${fuelCost(missing)} 🪙)`, fn:() => refuel(missing)}, {label:'Wyjdź', fn:closeDialog});
    say(`Stacja paliw ⛽ Bak: ${Math.round(carFuel)}%. Pełny bak kosztuje ${Math.round(100*FUEL_PRICE)} 🪙. Płacisz monetami przy sobie, a brakującą część pobiorę z konta bankowego.`, btns, '⛽ Dystrybutor', 'fuel');
  }
  function refuel(pct){
    pct = Math.min(pct, 100 - carFuel);
    if(!hasCar || pumpDist() > 3.6 || pct <= 0.01){ closeDialog(); return; }
    const price = fuelCost(pct);
    if(!payAny(price, 'paliwo')){ toast(`Tankowanie kosztuje ${price} monet 🪙 – masz ${coins()}${bank.opened?` + ${bank.balance} na koncie`:''}`); return; }
    carFuel = Math.min(100, carFuel + pct); fuelLowWarned = fuelEmptyWarned = false;
    closeDialog(); toast(`Zatankowano ⛽ +${Math.round(pct)}% (−${price} 🪙) – bak: ${Math.round(carFuel)}%`);
  }
  function svApplyCar(c){
    if(carDriving){ carDriving = false; carV = 0; player.visible = true; }
    if(paintUiOpen) closePaintUI(false);
    steerLvl = (c && c.has) ? Math.max(0, Math.min(MECH_PRICES.length, (+c.s) | 0)) : 0;
    carFuel = (c && c.has && c.f !== undefined && isFinite(+c.f)) ? Math.max(0, Math.min(100, +c.f)) : 100; fuelLowWarned = fuelEmptyWarned = false;   // stary zapis bez paliwa → pełny bak
    if(c && c.has && isFinite(+c.x) && isFinite(+c.z)){ placeCar(+c.x, +c.z, +c.r || 0); pcar.bodyMat.color.setHex(isFinite(+c.c) ? (+c.c & 0xffffff) : PLAYER_CAR_COLOR); handbrake = c.hb === undefined ? true : !!(+c.hb); }
    else { hasCar = false; pcar.group.visible = false; pcar.bodyMat.color.setHex(PLAYER_CAR_COLOR); }
  }
  function spawnTrafficCar(car){
    const route = TRAFFIC_ROUTES[Math.floor(Math.random()*TRAFFIC_ROUTES.length)]();
    const [sx, sz] = route[0];
    if(trafficCars.some(o => o !== car && o.active && Math.hypot(o.group.position.x-sx, o.group.position.z-sz) < 14) || pksBuses.some(o => Math.hypot(o.group.position.x-sx, o.group.position.z-sz) < 14) || (BUS.active && Math.hypot(BUS.group.position.x-sx, BUS.group.position.z-sz) < 14)) return false;   // miejsce zajęte
    if(route.park){ const lx = route[route.length-1][0]; if(trafficCars.some(o => o !== car && o.active && o.route && o.route.park && o.route[o.route.length-1][0] === lx)) return false; }   // to miejsce parkingowe już zajmuje inne auto
    car.route = route; car.wp = 1; car.parked = false; car.stuck = 0; car.yieldWait = 0; car.sig = 0; car.sigT = 0;
    car.heading = Math.atan2(route[1][1]-sz, route[1][0]-sx);
    car.cruise = 7 + Math.random()*4; car.speed = car.cruise;
    car.bodyMat.color.setHex(TRAFFIC_COLORS[Math.floor(Math.random()*TRAFFIC_COLORS.length)]);
    car.group.position.set(sx, 0.02, sz); car.pitch = 0; car.group.rotation.z = 0;
    car.group.rotation.y = -car.heading;
    car.group.visible = true; car.active = true;
    car.bt = car.freeT = car.hr = car.hb = car.ht = 0;                          // klakson od nowa
    return true;
  }
  function junctionClear(car, kind, jx){                                           // czy na głównej jezdni przy skrzyżowaniu z ulicą boczną (x=jx: Krótka 0, Poprzeczna POP_X) nikt nie nadjeżdża
    for(const o of trafficCars.concat(BUS)){
      if(o === car || !o.active) continue;
      const oz = o.group.position.z, ox = o.group.position.x;
      if(oz > -8 || oz < -20) continue;                                          // poza główną jezdnią
      const hx = Math.cos(o.heading);
      const rx = ox - (jx || 0);
      if(hx > 0.5 && rx > -30 && rx < (kind === 'left' ? 8 : 12)) return false;  // z zachodu na wschód (pas wschodni)
      if(kind === 'left' && hx < -0.5 && rx > -4 && rx < 32) return false;       // ze wschodu na zachód (pas zachodni)
    }
    return true;
  }
  function trafficBlocked(car){
    const hx = Math.cos(car.heading), hz = Math.sin(car.heading), p = car.group.position;
    const check = (x, z, range, side) => {
      const dx = x - p.x, dz = z - p.z, fwd = dx*hx + dz*hz, lat = -dx*hz + dz*hx;
      return fwd > 0 && fwd < range && Math.abs(lat) < side;
    };
    if(car.stuck < 4){                                                         // po 4 s zakleszczenia auto przejeżdża „przez” przeszkodę
      for(const o of trafficCars) if(o !== car && o.active && check(o.group.position.x, o.group.position.z, 9, 2.3)) return true;
      if(BUS.active){ const bp = BUS.group.position, bcx = Math.cos(BUS.heading), bsz = Math.sin(BUS.heading); for(const k of [-3.5, 0, 3.5]) if(check(bp.x + bcx*k, bp.z + bsz*k, 8, 2.6)) return true; }   // autobus (długi): sprawdź tył, środek i przód
      for(const o of pksBuses){ const bcx = Math.cos(o.heading), bsz = Math.sin(o.heading); for(const k of [-3.5, 0, 3.5]) if(check(o.group.position.x + bcx*k, o.group.position.z + bsz*k, 8, 2.6)) return true; }   // autobusy PKS
      if(hasCar && !carDriving && pcar.group.visible && check(pcar.group.position.x, pcar.group.position.z, 8, 2.3)) return true;   // zaparkowane auto gracza
      if(bike.visible){ const bsn = Math.sin(bike.rotation.y), bcs = Math.cos(bike.rotation.y); for(const k of [-0.9, 0, 0.9]) if(check(bike.position.x + bsn*k, bike.position.z + bcs*k, 8, 1.6)) return true; }   // rower (stojący lub jadący): przód, środek i tył
    }
    return check(player.position.x, player.position.z, 8, 2.0);                // gracz na jezdni – auto zwalnia i staje
  }
  // Kierunkowskaz: -1 lewy, 1 prawy, 0 brak. Na rondzie – prawy tylko przy zjeździe; poza rondem – gdy w ciągu ~20 m trasy
  // czeka skręt o więcej niż ~30° (wjazd na rondo bez sygnalizowania).
  function desiredSignal(car){
    const r = car.route, i = car.wp, p = car.group.position;
    if(i >= r.length) return 0;
    if(r[i][2]){
      const out1 = i+1 < r.length && !r[i+1][2];
      const out2 = i+2 < r.length && r[i+1][2] && !r[i+2][2];
      return (out1 || out2) ? 1 : 0;
    }
    let cx = p.x, cz = p.z, dist = 0, ang = null;
    for(let j = i; j < r.length && !r[j][2] && dist < 20; j++){
      const dx = r[j][0]-cx, dz = r[j][1]-cz, l = Math.hypot(dx, dz);
      if(l > 0.01){ ang = Math.atan2(dz, dx); dist += l; }
      cx = r[j][0]; cz = r[j][1];
    }
    if(ang === null) return 0;
    let d = ang - car.heading; while(d > Math.PI) d -= Math.PI*2; while(d < -Math.PI) d += Math.PI*2;
    return d > 0.55 ? 1 : (d < -0.55 ? -1 : 0);
  }
  let npcSigPhase = false;
  function updateTraffic(dt){
    blinkT += dt;
    const blinkOn = (blinkT % 0.8) < 0.4;
    for(const car of trafficCars){
      if(car.active && !car.parked){
        const ds = desiredSignal(car);
        if(ds){ car.sig = ds; car.sigT = 1.0; }                                // po manewrze kierunkowskaz świeci jeszcze ok. sekundy
        else if(car.sigT > 0){ car.sigT -= dt; if(car.sigT <= 0) car.sig = 0; }
      } else car.sig = 0;
      car.sigL.color.setHex(car.sig === -1 && blinkOn ? SIG_ON : SIG_OFF);
      car.sigR.color.setHex(car.sig === 1 && blinkOn ? SIG_ON : SIG_OFF);
    }
    if(blinkOn !== npcSigPhase){                                                // jeden wspólny klik na zmianę fazy – głośność wg najbliższego auta z kierunkowskazem
      npcSigPhase = blinkOn;
      let vol = 0;
      for(const car of trafficCars){
        if(!car.active || !car.sig) continue;
        const dc = Math.hypot(car.group.position.x - player.position.x, car.group.position.z - player.position.z);
        vol = Math.max(vol, 0.07*Math.pow(Math.max(0, 1 - dc/30), 1.5));
      }
      if(vol > 0) signalClick(blinkOn, vol);
    }
    for(const car of trafficCars){
      if(!car.active){ car.wait -= dt; if(car.wait <= 0 && !spawnTrafficCar(car)) car.wait = 0.5; continue; }
      const p = car.group.position;
      if(car.parked){                                                             // postój na parkingu, potem auto znika
        car.parkTimer -= dt;
        if(car.parkTimer <= 0){ car.active = false; car.group.visible = false; car.wait = 1.5 + Math.random()*3; car.speed = 0; }
        continue;
      }
      const [tx, tz] = car.route[car.wp];
      const yw = car.route.yield && car.wp === car.route.yield.wp;               // jedzie do linii zatrzymania przed główną ulicą
      let mustWait = false;
      if(yw){
        mustWait = !junctionClear(car, car.route.yield.kind, car.route.yield.jx) && car.yieldWait < 15;
        car.yieldWait = mustWait ? car.yieldWait + dt : 0;
      }
      const want = Math.atan2(tz-p.z, tx-p.x);
      let da = want - car.heading; while(da > Math.PI) da -= Math.PI*2; while(da < -Math.PI) da += Math.PI*2;
      car.heading += Math.sign(da) * Math.min(Math.abs(da), 2.6*dt);
      const blocked = trafficBlocked(car);
      trafficHorn(car, dt);
      car.stuck = (blocked && car.speed < 0.5) ? car.stuck + dt : 0;              // zakleszczenie dwóch aut: po 4 s jedno przejeżdża „przez” drugie
      if(car.stuck > 7) car.stuck = 0;
      let cap = car.cruise;
      if(Math.abs(da) > 0.35) cap = Math.min(cap, 5);
      if(Math.hypot(p.x-RB.x, p.z-RB.z) < 17 || Math.hypot(p.x-WR.x, p.z-WR.z) < 17) cap = Math.min(cap, 6);              // rondo
      if(car.route.park && car.wp >= car.route.length-4) cap = Math.min(cap, 4);   // manewr parkowania
      if(yw && Math.hypot(tx-p.x, tz-p.z) < 14) cap = Math.min(cap, 5);          // hamowanie przed linią zatrzymania
      const target = blocked ? 0 : (mustWait ? Math.min(cap, Math.max(0, Math.hypot(tx-p.x, tz-p.z) - 0.3) * 1.5) : cap);
      car.speed += (target - car.speed) * Math.min(1, 3*dt);
      p.x += Math.cos(car.heading) * car.speed * dt;
      p.z += Math.sin(car.heading) * car.speed * dt;
      car.group.rotation.y = -car.heading;
      { // jazda po wzgórzu: wysokość środka = średnia pod osiami, nos wychyla się wg nachylenia drogi (płynnie)
        const cx = Math.cos(car.heading), cz = Math.sin(car.heading);
        const hf = terrainH(p.x + cx*2, p.z + cz*2), hb = terrainH(p.x - cx*2, p.z - cz*2);
        car.pitch += (Math.atan2(hf - hb, 4) - car.pitch)*Math.min(1, dt*8);
        p.y = (hf + hb)/2 + 0.02; car.group.rotation.z = car.pitch;
      }
      if(!mustWait && Math.hypot(tx-p.x, tz-p.z) < ((car.route.park && car.wp === car.route.length-1) ? 0.5 : 2.5)){   // ostatni punkt parkowania – dokładnie w miejscu
        if(++car.wp >= car.route.length){
          if(car.route.park){ car.parked = true; car.parkTimer = 3 + Math.random()*4; car.speed = 0; }   // zaparkował
          else { car.active = false; car.group.visible = false; car.wait = 1.5 + Math.random()*3; car.speed = 0; }   // koniec trasy: znika, nowe pojawi się gdzie indziej
        }
      }
    }
  }

  // ===== Minimapa i pełna mapa miasta =====
  const miniMapCanvas = document.getElementById('mapCanvas');
  const bigMapCanvas = document.getElementById('mapBigCanvas');
  const mapOverlay = document.getElementById('mapOverlay');
  const miniMapCtx = miniMapCanvas.getContext('2d');
  const bigMapCtx = bigMapCanvas.getContext('2d');
  let mapCoords = true;                                                // współrzędne na mapie: włączone / wyłączone (zapamiętywane)
  try{ if(localStorage.getItem('mapCoords') === '0') mapCoords = false; }catch(_){}
  let fullMapOpen = false, mapView = null, mapCursor = null;          // mapCursor: {px,py} w pikselach płótna dużej mapy
  const MAP_BOUNDS = {minX:0, maxX:1, minZ:0, maxZ:1};                 // liczone na bieżąco z MAP_EXTENTS (auto-dopasowanie)
  function drawCityMap(ctx, canvas, view){
    const w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#8aa879'; ctx.fillRect(0,0,w,h);
    const k=view?view.k:1;
    ctx.save(); if(view){ctx.translate(view.tx,view.ty);ctx.scale(k,k);}   // przybliżenie dużej mapy
    // Auto-dopasowanie: obejmij cały teren, zachowaj proporcje (jedna skala na obu osiach) i wyśrodkuj
    const pad=22, M=MAP_BOUNDS;
    M.minX=Infinity; M.maxX=-Infinity; M.minZ=Infinity; M.maxZ=-Infinity;
    for(const e of MAP_EXTENTS){ M.minX=Math.min(M.minX,e.minX); M.maxX=Math.max(M.maxX,e.maxX); M.minZ=Math.min(M.minZ,e.minZ); M.maxZ=Math.max(M.maxZ,e.maxZ); }
    const fit=Math.min((w-2*pad)/(M.maxX-M.minX),(h-2*pad)/(M.maxZ-M.minZ)), sx=fit, sz=fit;
    const offX=(w-(M.maxX-M.minX)*fit)/2, offY=(h-(M.maxZ-M.minZ)*fit)/2;
    // Orientacja mapy: północ (−Z) u góry, wschód (+X) po prawej, zachód (−X) po lewej
    const pt=(x,z)=>({x:offX+(x-MAP_BOUNDS.minX)*sx,y:offY+(z-MAP_BOUNDS.minZ)*sz});
    const isBig = canvas===bigMapCanvas;
    // Siatka współrzędnych świata (co 20 m, po przybliżeniu co 10 m) z opisem osi X i Z
    if(isBig && mapCoords){
      const step = k>=2 ? 10 : 20, gx0=Math.ceil(M.minX/step)*step, gz0=Math.ceil(M.minZ/step)*step;
      const gf = 10*Math.max(.62,Math.min(1.35,w/660))*(view?1.4/k:1);
      ctx.save(); ctx.lineWidth=1/k; ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.fillStyle='rgba(255,255,255,.78)';
      ctx.font=`${gf}px system-ui`; ctx.shadowColor='#18232c'; ctx.shadowBlur=3;
      for(let gx=gx0; gx<=M.maxX; gx+=step){ const a=pt(gx,M.minZ), b=pt(gx,M.maxZ); ctx.strokeStyle=gx===0?'rgba(255,255,255,.4)':'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('x'+gx,a.x,a.y+2/k); }
      for(let gz=gz0; gz<=M.maxZ; gz+=step){ const a=pt(M.minX,gz), b=pt(M.maxX,gz); ctx.strokeStyle=gz===0?'rgba(255,255,255,.4)':'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText('z'+gz,a.x+3/k,a.y); }
      ctx.restore();
    }
    // Ulice i chodniki
    ctx.fillStyle='#c4c1b5';
    let a=pt(-80,ROAD_Z-11), b=pt(80,ROAD_Z+11); ctx.fillRect(Math.min(a.x,b.x),b.y,Math.abs(b.x-a.x),a.y-b.y);
    ctx.fillStyle='#454b50';
    a=pt(-80,ROAD_Z-ROAD_W/2); b=pt(80,ROAD_Z+ROAD_W/2); ctx.fillRect(a.x,b.y,b.x-a.x,a.y-b.y);
    a=pt(-SIDEWALK_OFFSET, SIDE_ROAD_END); b=pt(SIDEWALK_OFFSET,SIDE_ROAD_START); ctx.fillStyle='#c4c1b5';ctx.fillRect(Math.min(a.x,b.x),b.y,Math.abs(b.x-a.x),a.y-b.y);
    a=pt(-ROAD_W/2,SIDE_ROAD_END);b=pt(ROAD_W/2,SIDE_ROAD_START);ctx.fillStyle='#454b50';ctx.fillRect(Math.min(a.x,b.x),b.y,Math.abs(b.x-a.x),a.y-b.y);
    // Przedłużenie Długiej, rondo, zjazd i parking supermarketu
    const mrect=(x0,z0,x1,z1,color)=>{const p0=pt(x0,z0),p1=pt(x1,z1);ctx.fillStyle=color;ctx.fillRect(Math.min(p0.x,p1.x),Math.min(p0.y,p1.y),Math.abs(p1.x-p0.x),Math.abs(p1.y-p0.y));};
    mrect(80,ROAD_Z-11,RB.x-14,ROAD_Z+11,'#c4c1b5'); mrect(RB.x-11,RB.z-12,RB.x+11,-44,'#c4c1b5');
    mrect(80,ROAD_Z-ROAD_W/2,RB.x-12,ROAD_Z+ROAD_W/2,'#454b50'); mrect(RB.x-ROAD_W/2,RB.z-12,RB.x+ROAD_W/2,-44,'#454b50');
    mrect(SUPER.x-SUPER.w/2,-44,SUPER.x+SUPER.w/2,-64,'#454b50'); mrect(AGD.x+2-16,-44,AGD.x+2+16,-64,'#454b50');
    mrect(GORN_X-GORN_EDGE,GORN_START,GORN_X+GORN_EDGE,GORN_END,'#c4c1b5'); mrect(GORN_X-GORN_W/2,GORN_START,GORN_X+GORN_W/2,GORN_END,'#454b50'); mrect(MINE.x-31.5,MINE.z-11.4,MINE.x,MINE.z+11.4,'#7a746c'); mrect(MINE.x-MINE.depth,MINE.z-1.8,MINE.x,MINE.z+1.8,'#25221f'); mrect(MINE.x-31,MINE.z-6.5,MINE.x-MINE.depth,MINE.z+6.5,'#3a3631'); mrect(MINE.x,MINE.z-4.5,GORN_X-GORN_EDGE,MINE.z+4.5,'#8a8170');   // ulica Górnicza i kopalnia
    mrect(POP_X-POP_EDGE,SIDE_ROAD_START,POP_X+POP_EDGE,POP_END,'#c4c1b5'); mrect(POP_X-ROAD_W/2,SIDE_ROAD_START,POP_X+ROAD_W/2,POP_END,'#454b50');   // ulica Poprzeczna
    { const c0=pt(FOUNT.x,FOUNT.z), c1=pt(FOUNT.x+4,FOUNT.z); ctx.fillStyle='#4aa8e8'; ctx.beginPath(); ctx.arc(c0.x,c0.y,Math.max(2,Math.abs(c1.x-c0.x)),0,Math.PI*2); ctx.fill(); }   // fontanna
    { // wzgórze: obraz policzony raz (jaśniejsza zieleń = wyżej), rysowany w skali mapy
      if(!window.__hillMapImg){
        const B=HILL_BOX, cw=Math.round((B.maxX-B.minX)/2), ch=Math.round((B.maxZ-B.minZ)/2), hc=document.createElement('canvas'); hc.width=cw; hc.height=ch;
        const hx=hc.getContext('2d'), id=hx.createImageData(cw,ch);
        for(let j=0;j<ch;j++) for(let i=0;i<cw;i++){
          const wx=B.minX+(i+.5)*2, wz=B.minZ+(j+.5)*2, hh=terrainH(wx,wz)/HILL.h, o=(j*cw+i)*4;
          id.data[o]=110-30*hh; id.data[o+1]=140-20*hh; id.data[o+2]=95-20*hh; id.data[o+3]=hh<0.02?0:255*(0.35+0.4*hh);
        }
        hx.putImageData(id,0,0); window.__hillMapImg=hc;
      }
      const B=HILL_BOX, p0=pt(B.minX,B.minZ), p1=pt(B.maxX,B.maxZ);
      ctx.drawImage(window.__hillMapImg,p0.x,p0.y,p1.x-p0.x,p1.y-p0.y);
    }
    mrect(RB.x-11,RB.z+12,RB.x+11,SPOL_END,'#c4c1b5'); mrect(RB.x-ROAD_W/2,RB.z+12,RB.x+ROAD_W/2,SPOL_END,'#454b50');   // ulica Społeczna
    { // przedłużenie Społecznej ze zakrętem: chodnik i jezdnia jako grube linie po osi ścieżki
      const strokePath=(wm,color)=>{ ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=wm*sx; ctx.lineJoin='round'; ctx.lineCap='butt'; ctx.beginPath();
        SPOL_PATH.forEach((q,i)=>{ const c=pt(q[0],q[1]); if(i) ctx.lineTo(c.x,c.y); else ctx.moveTo(c.x,c.y); }); ctx.stroke(); ctx.restore(); };
      strokePath(22,'#c4c1b5'); strokePath(ROAD_W,'#454b50');
    }
    mrect(PKS_JX-ROAD_W/2-3.15,155,PKS_JX+ROAD_W/2+3.15,164,'#c4c1b5'); mrect(PKS_JX-ROAD_W/2,155,PKS_JX+ROAD_W/2,164,'#454b50'); mrect(-12,164,47,192,'#454b50');   // PKS: dojazd i plac
    {const c=pt(WR.x,WR.z);ctx.fillStyle='#454b50';ctx.beginPath();ctx.arc(c.x,c.y,WR.rOut*sx,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#8aa879';ctx.beginPath();ctx.arc(c.x,c.y,WR.rIn*sx,0,Math.PI*2);ctx.fill();}
    {const c=pt(RB.x,RB.z);ctx.fillStyle='#454b50';ctx.beginPath();ctx.arc(c.x,c.y,RB.rOut*sx,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#8aa879';ctx.beginPath();ctx.arc(c.x,c.y,RB.rIn*sx,0,Math.PI*2);ctx.fill();}
    // Budynki z rzeczywistych współrzędnych świata
    for(const bld of BUILDINGS){
      const q=pt(bld.x-bld.w/2,bld.z-bld.d/2), r=pt(bld.x+bld.w/2,bld.z+bld.d/2);
      ctx.fillStyle=bld.open?'#397fa8':'#777d80';ctx.strokeStyle='rgba(20,30,35,.8)';ctx.lineWidth=1.5/k;
      ctx.fillRect(Math.min(q.x,r.x),r.y,Math.abs(r.x-q.x),q.y-r.y);ctx.strokeRect(Math.min(q.x,r.x),r.y,Math.abs(r.x-q.x),q.y-r.y);
    }
    // Podpisy najważniejszych miejsc
    const labels=[['Real Shop',SHOP.x,SHOP.z],['Restauracja',REST.x,REST.z],['Bank',BANK.x,BANK.z],['Mebelek',FURN.x,FURN.z],...HOMES.map(H=>[H.owned?H.label+' (twój)':H.label,H.x,H.z]),['Supermarket Pandy (8–22)',SUPER.x,SUPER.z],['Dom i AGD',AGD.x,AGD.z],['Kopalnia ⛏️',MINE.x-9,MINE.z],['ZARA\'Z',CLOTH.x,CLOTH.z],['Salon samochodowy',CAR.x,CAR.z],['Lakiernik',PAINT.x,PAINT.z],['Mechanik',MECH.x,MECH.z],['Stacja paliw',STATION.x,STATION.z],['PKS',PKS_BLD.x,PKS_BLD.z],...BUS_STOPS.map(b=>['Przystanek',b.x,b.z])];
    const scaleUI=Math.max(.62,Math.min(1.35,w/660)), scale=scaleUI*(view?1.4/k:1);
    ctx.font=`bold ${12*scale}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [name,x,z] of labels){const q=pt(x,z);ctx.fillStyle='#fff';ctx.shadowColor='#18232c';ctx.shadowBlur=4;ctx.fillText(name,q.x,q.y-10*scale);}
    ctx.shadowBlur=0;
    // Nazwy ulic
    ctx.fillStyle='#fff';ctx.font=`bold ${11*scale}px system-ui`;ctx.textAlign='center';
    let q=pt(-47,ROAD_Z+1);ctx.fillText('DŁUGA',q.x,q.y);
    q=pt(4,40);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-Math.PI/2);ctx.fillText('KRÓTKA',0,0);ctx.restore();
    q=pt(POP_X+1,30);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-Math.PI/2);ctx.fillText('POPRZECZNA',0,0);ctx.restore();
    q=pt(GORN_X+1,-52);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-Math.PI/2);ctx.fillText('GÓRNICZA',0,0);ctx.restore();
    q=pt(RB.x+1,45);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-Math.PI/2);ctx.fillText('SPOŁECZNA',0,0);ctx.restore();
    q=pt(22,150);ctx.fillText('GÓRNA',q.x,q.y);                                   // odcinek Społecznej na zachód przy stacji paliw
    // Upper: punkt odbioru (A) lub celu (B) aktywnego kursu
    for(const um of upperMapMarks()){
      const uq=pt(um.x,um.z), ur=(9+Math.sin(performance.now()/250)*1.5)*scale;
      ctx.save(); ctx.fillStyle=um.color; ctx.strokeStyle='#fff'; ctx.lineWidth=2/k;
      ctx.beginPath(); ctx.arc(uq.x,uq.y,ur,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font=`bold ${12*scale}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(um.label,uq.x,uq.y+1*scale);
      if(bigMapCanvas===canvas){ ctx.shadowColor='#18232c'; ctx.shadowBlur=4; ctx.fillText(um.name,uq.x,uq.y+ur+9*scale); }
      ctx.restore();
    }
    // Gracz i kierunek patrzenia
    const p=pt(player.position.x,player.position.z);const ang=Math.PI-((carDriving?carHeading:player.rotation.y)||0);   // w aucie znacznik obraca się razem z autem
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang);ctx.fillStyle='#ffd54a';ctx.strokeStyle='#342600';ctx.lineWidth=2/k;
    ctx.beginPath();ctx.moveTo(0,-11*scale);ctx.lineTo(7*scale,8*scale);ctx.lineTo(0,5*scale);ctx.lineTo(-7*scale,8*scale);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.restore();
    // Współrzędne: pozycja gracza (x, y, z) na obu mapach + wskaźnik kursora na dużej mapie
    if(mapCoords){
      const f=isBig?15:22, pp=player.position;
      const txt=`📍 x ${pp.x.toFixed(1)}  y ${pp.y.toFixed(1)}  z ${pp.z.toFixed(1)}`;
      ctx.font=`bold ${f}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign='left'; ctx.textBaseline='bottom';
      const tw=ctx.measureText(txt).width;
      ctx.fillStyle='rgba(12,20,27,.78)'; ctx.fillRect(6,h-f-14,tw+12,f+10);
      ctx.fillStyle='#ffd54a'; ctx.fillText(txt,12,h-9);
      if(isBig && mapCursor){
        const lx=(mapCursor.px-(view?view.tx:0))/k, ly=(mapCursor.py-(view?view.ty:0))/k;
        const wx=M.minX+(lx-offX)/sx, wz=M.minZ+(ly-offY)/sz;
        if(wx>=M.minX-5&&wx<=M.maxX+5&&wz>=M.minZ-5&&wz<=M.maxZ+5){
          ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=1; ctx.setLineDash([5,4]);
          ctx.beginPath(); ctx.moveTo(mapCursor.px,0); ctx.lineTo(mapCursor.px,h); ctx.moveTo(0,mapCursor.py); ctx.lineTo(w,mapCursor.py); ctx.stroke(); ctx.setLineDash([]);
          const ct=`🎯 x ${wx.toFixed(1)}  y ${terrainH(wx,wz).toFixed(1)}  z ${wz.toFixed(1)}`, hint='PPM – kopiuj';
          ctx.font=`bold ${f}px ui-monospace,Menlo,Consolas,monospace`; const cw=Math.max(ctx.measureText(ct).width,ctx.measureText(hint).width);
          const bx=Math.min(w-cw-18,Math.max(4,mapCursor.px+12)), by=Math.min(h-2*f-18,Math.max(4,mapCursor.py+12));
          ctx.fillStyle='rgba(12,20,27,.85)'; ctx.fillRect(bx,by,cw+14,2*f+14);
          ctx.fillStyle='#8be9ff'; ctx.textBaseline='top'; ctx.fillText(ct,bx+7,by+5);
          ctx.fillStyle='#b8c4cc'; ctx.font=`${f-3}px system-ui`; ctx.fillText(hint,bx+7,by+f+8);
          mapCursor.wx=wx; mapCursor.wy=terrainH(wx,wz); mapCursor.wz=wz;
        }
      }
    }
    // Ramka mapy i kompas
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.strokeRect(1,1,w-2,h-2);
    ctx.fillStyle='#fff';ctx.font=`bold ${12*scaleUI}px system-ui`;ctx.textAlign='right';ctx.fillText('N ↑',w-10,18);
  }
  function setFullMap(open){
    fullMapOpen=!!open;mapOverlay.classList.toggle('open',fullMapOpen);
    miniMapCanvas.style.display=fullMapOpen?'none':'block';
    mapView=null; bigMapCanvas.style.cursor='zoom-in';
    if(fullMapOpen)drawCityMap(bigMapCtx,bigMapCanvas,mapView);
  }
  // Klik w pełną mapę przybliża wybrane miejsce, kolejny klik wraca do widoku początkowego
  bigMapCanvas.addEventListener('click',e=>{
    if(mapView){ mapView=null; bigMapCanvas.style.cursor='zoom-in'; }
    else{
      const r=bigMapCanvas.getBoundingClientRect(), w=bigMapCanvas.width, h=bigMapCanvas.height, k=3;
      const px=(e.clientX-r.left)*w/r.width, py=(e.clientY-r.top)*h/r.height;
      mapView={k, tx:Math.min(0,Math.max(w-w*k,w/2-px*k)), ty:Math.min(0,Math.max(h-h*k,h/2-py*k))};
      bigMapCanvas.style.cursor='zoom-out';
    }
    drawCityMap(bigMapCtx,bigMapCanvas,mapView);
  });
  const mapPx=e=>{ const r=bigMapCanvas.getBoundingClientRect(); return {px:(e.clientX-r.left)*bigMapCanvas.width/r.width, py:(e.clientY-r.top)*bigMapCanvas.height/r.height}; };
  bigMapCanvas.addEventListener('mousemove',e=>{ mapCursor=mapPx(e); });
  bigMapCanvas.addEventListener('mouseleave',()=>{ mapCursor=null; });
  bigMapCanvas.addEventListener('contextmenu',e=>{             // prawy klik: skopiuj współrzędne klikniętego miejsca
    e.preventDefault(); mapCursor=mapPx(e); drawCityMap(bigMapCtx,bigMapCanvas,mapView);
    if(!mapCoords || mapCursor.wx===undefined) return;
    const t=`x ${mapCursor.wx.toFixed(1)}, y ${mapCursor.wy.toFixed(1)}, z ${mapCursor.wz.toFixed(1)}`;
    try{ navigator.clipboard.writeText(t); }catch(_){}
    toast('📋 Skopiowano: '+t);
  });
  document.getElementById('mapClose').onclick=()=>setFullMap(false);
  const coordBtn=document.createElement('button');                     // przełącznik współrzędnych w oknie dużej mapy
  coordBtn.type='button'; coordBtn.id='mapCoordBtn';
  coordBtn.style.cssText='position:absolute;right:170px;top:14px;border:0;border-radius:7px;padding:7px 11px;background:#2e7d32;color:#fff;font-size:14px;cursor:pointer';
  document.getElementById('mapCard').appendChild(coordBtn);
  function setMapCoords(on){
    mapCoords=!!on; try{ localStorage.setItem('mapCoords', mapCoords?'1':'0'); }catch(_){}
    coordBtn.textContent = mapCoords ? '📍 Współrzędne: WŁ (G)' : '📍 Współrzędne: WYŁ (G)';
    coordBtn.style.background = mapCoords ? '#2e7d32' : '#6b7580';
    if(!mapCoords) mapCursor=null;
    if(fullMapOpen) drawCityMap(bigMapCtx,bigMapCanvas,mapView);
  }
  coordBtn.onclick=()=>setMapCoords(!mapCoords);
  setMapCoords(mapCoords);
  mapOverlay.addEventListener('click',e=>{if(e.target===mapOverlay)setFullMap(false);});
  addEventListener('keydown',e=>{
    if(e.code==='KeyM'&&!e.repeat&&!isPaused&&!isDead){e.preventDefault();setFullMap(!fullMapOpen);}
    if(e.code==='KeyG'&&!e.repeat&&fullMapOpen&&!isPaused&&!isDead){e.preventDefault();setMapCoords(!mapCoords);}
    if(e.code==='Escape'&&fullMapOpen)setFullMap(false);
  });

  // Głód i energia
  const stats = {hunger:100, energy:100, hygiene:100};
  const hungerFill = document.getElementById('hungerFill'), energyFill = document.getElementById('energyFill'), hygieneFill = document.getElementById('hygieneFill');
  // Higiena: spada powoli, a podczas pracy w kopalni (kilof w ręku, gracz w sztolni / na polu kopania) znacznie szybciej – punkty na sekundę
  const HYGIENE_DRAIN = 0.04, HYGIENE_DRAIN_RUN = 0.10, HYGIENE_DRAIN_MINE = 1.00, HYGIENE_BATH = 8;   // w wannie higiena rośnie o 8 pkt/s (pełny pasek ≈ 12 s)
  let dirtyWarned = false, bathDoneToast = false;
  let hungryWarned = false, tiredWarned = false;
  function statColor(v, hue){ return v < 20 ? '#e53935' : hue; }
  function renderStats(){
    const h = Math.round(stats.hunger), e = Math.round(stats.energy), y = Math.round(stats.hygiene);
    hungerFill.style.width = h + '%'; energyFill.style.width = e + '%'; hygieneFill.style.width = y + '%';
    hygieneFill.style.background = statColor(y, '#2196f3');
    document.getElementById('hygieneVal').textContent = y; document.getElementById('stHygiene').classList.toggle('low', y < 20);
    hungerFill.style.background = statColor(h, '#ff9800'); energyFill.style.background = statColor(e, '#ffd54a');
    document.getElementById('hungerVal').textContent = h; document.getElementById('energyVal').textContent = e;
    document.getElementById('stHunger').classList.toggle('low', h < 20);
    document.getElementById('stEnergy').classList.toggle('low', e < 20);
  }
  function addStats(h, e){
    stats.hunger = Math.min(100, Math.max(0, stats.hunger + h));
    stats.energy = Math.min(100, Math.max(0, stats.energy + e));
    renderStats();
  }
  renderStats();

  // Śmierć: głód lub energia na 0
  function checkDeath(){
    const starved = stats.hunger <= 0, exhausted = stats.energy <= 0;
    if(!starved && !exhausted) return false;
    die(starved && exhausted ? 'z głodu i zmęczenia' : starved ? 'z głodu' : 'ze zmęczenia');
    return true;
  }
  function die(cause){
    if(isDead) return;
    isDead = true; try{ svClear(); }catch(e){}
    document.getElementById('deathCause').textContent = 'Umarłeś ' + cause + '.';
    for(const key in keys) keys[key] = false;
    joy.x = joy.y = 0;
    knob.style.transform = '';
    closeShop(); closePhone(); closeDialog(); closeFridge(); closeWardrobe(); cancelPlacement();
    document.getElementById('deathScreen').style.display = 'flex';
  }
  document.getElementById('deathBtn').addEventListener('click', () => location.reload());

  // Ekwipunek
  const ITEMS = {
    apple:{n:'Jabłko', i:'🍎', color:0xd32f2f, use:'Zjedz'},
    cola:{n:'Cola', i:'🥤', color:0xb71c1c, use:'Wypij'},
    bread:{n:'Chleb', i:'🍞', color:0xcf8f4a, use:'Zjedz'},
    coin:{n:'Moneta', i:'🪙', color:0xffc107},
    key:{n:'Klucz', i:'🔑', color:0xb0bec5},
    wood:{n:'Drewno', i:'🪵', color:0x8d5a2b},
    hat:{n:'Kapelusz', i:'🎩', color:0x222222, use:'Załóż / zdejmij'},
    cap:{n:'Czapka z daszkiem', i:'🧢', color:0xc62828, use:'Załóż / zdejmij'},
    shirt:{n:'Koszulka', i:'👕', color:0x2d6cdf, use:'Załóż'},
    shoes:{n:'Buty', i:'👟', color:0x1d1d1f, use:'Załóż'},
    pants:{n:'Spodnie', i:'👖', color:0x333333, use:'Załóż'},
    phone:{n:'Telefon', i:'📱', color:0x2b2b30, use:'Otwórz'},
    charger:{n:'Ładowarka', i:'🔌', color:0xf2f2f2, use:'Podłącz do gniazdka'},
    computer:{n:'Komputer', i:'🖥️', color:0x343a40, use:'Ustaw na biurku'},
    order:{n:'Zamówienie', i:'📦', color:0xd9a441},
    desk:{n:'Biurko', i:'🗄️', color:0xb07a43, use:'Ustaw w domu'},
    deskpart:{n:'Biurko (część)', i:'🗄️', color:0xb07a43},
    oven:{n:'Piekarnik', i:'🍳', color:0x9aa5ae, use:'Ustaw w domu'},
    pizzafrozen:{n:'Pizza mrożona', i:'🍕', color:0xe8c27a, use:'Włóż do piekarnika'},
    pizza:{n:'Upieczona pizza', i:'🍕', color:0xf2b134, use:'Zjedz'},
    pizzaburnt:{n:'Spalona pizza', i:'🔥', color:0x2b2118, use:'Zjedz'},
    ovenpart:{n:'Piekarnik (część)', i:'🍳', color:0x9aa5ae},
    chair:{n:'Krzesło', i:'🪑', color:0xb07a43, use:'Ustaw w domu'},
    wardrobe:{n:'Szafa', i:'🚪', color:0x7a4e2a, use:'Ustaw w domu'},
    lamp:{n:'Lampa sufitowa', i:'💡', color:0xe07b39, use:'Zamontuj na suficie'},
    toilet:{n:'Toaleta', i:'🚽', color:0xf4f6f7, use:'Ustaw w domu'},
    bathtub:{n:'Wanna', i:'🛁', color:0xdfe9ee, use:'Ustaw w domu'},
    mirror:{n:'Lustro stojące', i:'🪞', color:0x9fd3f0, use:'Ustaw w domu'},
    kettle:{n:'Czajnik elektryczny', i:'☕', color:0xb8c2ca},
    toaster:{n:'Toster', i:'🥪', color:0x9aa5ae},
    blender:{n:'Blender', i:'🍹', color:0x2b2f35},
    microwave:{n:'Mikrofalówka', i:'🍲', color:0xc3ccd3},
    vacuum:{n:'Odkurzacz', i:'🧹', color:0xd9412f},
    pickaxe:{n:'Kilof', i:'⛏️', color:0x8d6e63},
    stone:{n:'Kamień', i:'🪨', color:0x8a8a8a}
  };
  const inv = new Array(20).fill(null);
  const $ = id => document.getElementById(id);
  const fridgeStock = {apple:3, cola:0};
  const FRIDGE_ITEMS = [
    {id:'apple', i:'🍎', label:'Jabłka', acc:'jabłko', gen:'jabłka'},
    {id:'cola',  i:'🥤', label:'Cola',   acc:'colę',   gen:'coli'}
  ];
  function renderFridge(){
    const list=$('fridgeList'); list.innerHTML='';
    FRIDGE_ITEMS.forEach(it => {
      const row=document.createElement('div');row.className='foodrow';
      row.innerHTML=`<span>${it.i} ${it.label} w lodówce: <b>${fridgeStock[it.id]}</b></span>`;
      const controls=document.createElement('span');controls.style.display='flex';controls.style.gap='6px';
      const take=document.createElement('button');take.textContent='Wyjmij';take.disabled=fridgeStock[it.id]<1;
      take.onclick=()=>{
        if(fridgeStock[it.id]>0&&addItem(it.id)){fridgeStock[it.id]--;renderFridge();renderInv();toast('Wyjęto '+it.acc+' z lodówki');}
        else toast('Brak miejsca w ekwipunku');
      };
      const put=document.createElement('button');put.textContent='Włóż';put.disabled=!inv.some(q=>q&&q.id===it.id);
      put.onclick=()=>{
        const k=inv.findIndex(q=>q&&q.id===it.id);
        if(k<0){toast('Nie masz '+it.gen);return;}
        removeOne(k);fridgeStock[it.id]++;renderFridge();renderInv();toast('Włożono '+it.acc+' do lodówki');
      };
      controls.appendChild(take);controls.appendChild(put);row.appendChild(controls);list.appendChild(row);
    });
  }
  function openFridge(){renderFridge();$('fridge').style.display='block';promptEl.style.display='none';}
  function closeFridge(){$('fridge').style.display='none';}
  // Szafa: przechowuje ubrania (kapelusze i czapki, z zachowaniem koloru)
  const WARDROBE_MAX = 40;
  const wardrobeClothes = [];                                      // {id:'hat'|'cap', color, count}
  const isClothing = id => id === 'hat' || id === 'cap' || id === 'shirt' || id === 'shoes' || id === 'pants';
  const clothColor = c => c.color !== undefined ? c.color : ITEMS[c.id].color;
  // ===== Szafa: podgląd postaci + 4 sloty (nakrycie głowy, koszulka, spodnie, buty) z wymianą ubrań =====
  const WD_SLOTS = [
    {key:'head',  label:'Nakrycie głowy', ids:['hat','cap']},
    {key:'shirt', label:'Koszulka', ids:['shirt']},
    {key:'pants', label:'Spodnie', ids:['pants']},
    {key:'shoes', label:'Buty', ids:['shoes']}
  ];
  let wdSel = 'head';
  const wdCurrent = key => key === 'head' ? (worn ? {id:worn.id, color:worn.color} : null)
    : key === 'shirt' ? {id:'shirt', color:wornShirt ? wornShirt.color : accShirtCol, def:!wornShirt}
    : key === 'pants' ? {id:'pants', color:wornPants ? wornPants.color : PANTS_DEF, def:!wornPants}
    : {id:'shoes', color:wornShoes ? wornShoes.color : shoeEnc(SH_DEF_UP, SH_DEF_SOLE), def:!wornShoes};
  const wdSw = h => `<span style="display:inline-block;width:13px;height:13px;border-radius:50%;border:1px solid rgba(255,255,255,.8);vertical-align:middle;margin-left:4px;background:#${h}"></span>`;
  const wdDots = it => !it || it.color === undefined ? '' : it.id === 'shoes' ? wdSw(hex6(shoeUp(it.color))) + wdSw(hex6(shoeSole(it.color))) : wdSw(hex6(it.color));
  const wdSet = (key, color) => key === 'shirt' ? setShirt({color}) : key === 'pants' ? setPants({color}) : setShoes({color});
  function wdStore(id, color){                                     // dodaje sztukę do szafy
    const w = wardrobeClothes.find(c => c.id === id && c.color === color);
    if(w) w.count++; else wardrobeClothes.push(color === undefined ? {id, count:1} : {id, color, count:1});
  }
  const wdCount = () => wardrobeClothes.reduce((a, c) => a + c.count, 0);
  function wdWearInv(key, k){                                      // koszulka / spodnie / buty z ekwipunku; zdjęte wracają do ekwipunku
    const s = inv[k]; if(!s || s.id !== key) return;
    const cur = wdCurrent(key), c = s.color;
    removeOne(k);
    if(!addItem(key, cur.color)){ addItem(key, c); renderInv(); toast('Brak miejsca w ekwipunku na zdjęte ubranie'); return; }
    wdSet(key, c); toast('Założono: ' + ITEMS[key].n); renderInv(); renderWardrobe();
  }
  function wdWearStore(key, w){                                    // koszulka / spodnie / buty z szafy; zdjęte trafiają do szafy
    const cur = wdCurrent(key), c = w.color;
    if(--w.count <= 0) wardrobeClothes.splice(wardrobeClothes.indexOf(w), 1);
    wdStore(key, cur.color);
    wdSet(key, c); toast('Założono: ' + ITEMS[key].n); renderInv(); renderWardrobe();
  }
  function wdWearHead(src){                                        // nakrycia głowy zostają w ekwipunku (jak dotąd), z szafy trafiają do ekwipunku
    if(src.w){
      const w = src.w;
      if(!addItem(w.id, w.color)){ toast('Brak miejsca w ekwipunku'); return; }
      if(--w.count <= 0) wardrobeClothes.splice(wardrobeClothes.indexOf(w), 1);
      setWorn({id:w.id, color:w.color}); toast('Założono: ' + ITEMS[w.id].n);
    }else{
      const s = inv[src.k]; if(!s) return;
      setWorn({id:s.id, color:s.color}); toast('Założono: ' + ITEMS[s.id].n);
    }
    renderInv(); renderWardrobe();
  }
  // Podgląd postaci w szafie: własny mały renderer, klon modelu gracza (materiały są wspólne, więc kolory są aktualne)
  let wdR = null, wdScene = null, wdCam = null, wdClone = null;
  function wdPreview(){
    try{
      if(!wdR){
        wdR = new THREE.WebGLRenderer({antialias:true, alpha:true});
        wdR.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); wdR.setSize(150, 225, false); wdR.setClearColor(0x000000, 0);
        wdR.domElement.style.cssText = 'width:150px;height:225px;border-radius:10px;background:linear-gradient(#cfe8ff,#6fa8e0);flex:none';
        wdScene = new THREE.Scene(); wdScene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dl = new THREE.DirectionalLight(0xfff2d8, 0.85); dl.position.set(1.5, 2.5, 3); wdScene.add(dl);
        wdCam = new THREE.OrthographicCamera(-0.93, 0.93, 2.7, -0.1, 0.1, 20); wdCam.layers.enable(1);
        wdCam.position.set(0, 0, 5); wdCam.lookAt(0, 0, 0);
      }
      if(wdClone) wdScene.remove(wdClone);
      const bi = player.children.indexOf(body), ui = body.children.indexOf(upper);
      wdClone = player.clone(true);
      wdClone.position.set(0, 0, 0); wdClone.rotation.set(0.0, 0.45, 0); wdClone.scale.set(1, 1, 1); wdClone.visible = true;
      const rm = []; wdClone.traverse(o => { if(o.isLight || o.isSprite || o.isPoints || o.isLine) rm.push(o); });
      rm.forEach(o => o.parent && o.parent.remove(o));
      wdClone.children.forEach((c, i) => { if(i !== bi) c.visible = false; });     // tylko postać
      const cb = wdClone.children[bi];
      if(cb){
        cb.position.set(0, 0, 0); cb.rotation.set(0, 0, 0);
        cb.traverse(o => { if(o.isGroup){ o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); } });   // bez pozy chodu / siedzenia
        const cu = cb.children[ui]; if(cu) cu.position.set(0, 0.8, 0);
      }
      wdScene.add(wdClone); wdR.render(wdScene, wdCam);
      return wdR.domElement;
    }catch(err){ return null; }
  }
  function renderWardrobe(){
    const list = $('wardrobeList'); list.innerHTML = '';
    const sec = t => { const h = document.createElement('div'); h.className = 'wsub'; h.textContent = t; list.appendChild(h); };
    const empty = t => list.insertAdjacentHTML('beforeend', '<div class="empty">' + t + '</div>');
    const row = (it, tag, label, fn) => {
      const r = document.createElement('div'); r.className = 'cloth';
      const sp = document.createElement('span'); sp.innerHTML = ITEMS[it.id].i + ' ' + ITEMS[it.id].n + wdDots(it) + (it.count > 1 ? ' ×' + it.count : '') + (tag ? ' <small style="opacity:.65">' + tag + '</small>' : '');
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = fn;
      r.appendChild(sp); r.appendChild(b); list.appendChild(r);
    };
    // 1) postać + 4 sloty z tym, co masz na sobie
    const top = document.createElement('div'); top.style.cssText = 'display:flex;gap:10px;align-items:stretch';
    const cv = wdPreview(); if(cv) top.appendChild(cv);
    const col = document.createElement('div'); col.style.cssText = 'flex:1;display:grid;gap:6px;min-width:0';
    WD_SLOTS.forEach(sl => {
      const it = wdCurrent(sl.key), on = wdSel === sl.key;
      const b = document.createElement('button'); b.type = 'button';
      b.style.cssText = 'text-align:left;color:#fff;border-radius:10px;padding:6px 9px;cursor:pointer;font-size:13px;line-height:1.3;border:2px solid ' + (on ? '#fff' : 'transparent') + ';background:' + (on ? '#3a7bd5' : 'rgba(255,255,255,.1)');
      b.innerHTML = '<div style="opacity:.75;font-size:10px;text-transform:uppercase;letter-spacing:.04em">' + sl.label + '</div>' +
        (it ? ITEMS[it.id].i + ' ' + ITEMS[it.id].n + wdDots(it) + (it.def ? ' <small style="opacity:.65">· startowe</small>' : '') : '<span style="opacity:.6">— brak —</span>');
      b.onclick = () => { wdSel = sl.key; renderWardrobe(); };
      col.appendChild(b);
    });
    top.appendChild(col); list.appendChild(top);
    // 2) wymiana w wybranym slocie
    const sl = WD_SLOTS.find(x => x.key === wdSel), cur = wdCurrent(sl.key);
    sec('Zmień: ' + sl.label);
    let any = false;
    if(sl.key === 'head' && cur){ any = true; row(cur, 'masz na sobie', 'Zdejmij', () => { setWorn(null); toast('Zdjęto: ' + ITEMS[cur.id].n); renderInv(); renderWardrobe(); }); }
    inv.forEach((s, k) => {
      if(!s || sl.ids.indexOf(s.id) < 0) return;
      if(sl.key === 'head' && isWorn(s)) return;
      any = true; row(s, 'ekwipunek', 'Załóż', () => sl.key === 'head' ? wdWearHead({k}) : wdWearInv(sl.key, k));
    });
    wardrobeClothes.slice().forEach(w => {
      if(sl.ids.indexOf(w.id) < 0) return;
      any = true; row(w, 'szafa', 'Załóż', () => sl.key === 'head' ? wdWearHead({w}) : wdWearStore(sl.key, w));
    });
    if(!any) empty('Nie masz nic innego do założenia w tym miejscu.<br>Kup nowe ubrania w ZARA\'Z.');
    // 3) przechowywanie
    sec('W szafie (' + wdCount() + '/' + WARDROBE_MAX + ')');
    if(!wardrobeClothes.length) empty('Szafa jest pusta 👕<br>Włóż tu ubrania z ekwipunku.');
    wardrobeClothes.slice().forEach(c => row(c, '', 'Wyjmij', () => {
      if(!addItem(c.id, c.color)){ toast('Brak miejsca w ekwipunku'); return; }
      if(--c.count <= 0) wardrobeClothes.splice(wardrobeClothes.indexOf(c), 1);
      renderWardrobe(); renderInv(); toast('Wyjęto z szafy: ' + ITEMS[c.id].n);
    }));
    sec('W twoim ekwipunku');
    const mine = inv.map((s, k) => ({s, k})).filter(o => o.s && isClothing(o.s.id));
    if(!mine.length) empty('Nie masz przy sobie żadnych ubrań.');
    mine.forEach(o => row(o.s, '', 'Włóż', () => {
      if(wdCount() >= WARDROBE_MAX){ toast('Szafa jest pełna'); return; }
      const s = inv[o.k]; if(!s || !isClothing(s.id)) return;
      const id = s.id, color = s.color;
      const wasWorn = isWorn(s);
      if(wasWorn && s.count <= 1) unwear(s);                       // zdejmij, jeśli to ostatnia sztuka i jest na głowie
      removeOne(o.k); wdStore(id, color);
      renderWardrobe(); renderInv(); toast('Włożono do szafy: ' + ITEMS[id].n);
    }));
  }
  function openWardrobe(){ $('wardrobe').style.width = 'min(440px,calc(100vw - 28px))'; renderWardrobe(); $('wardrobe').style.display='block'; promptEl.style.display='none'; }
  function closeWardrobe(){ $('wardrobe').style.display='none'; }
  $('wardrobeClose').onclick = closeWardrobe;
  $('fridgeClose').onclick=closeFridge;
  let sel = -1;
  const gridEl = $('grid'), invEl = $('inv'), infoEl = $('info'), useBtn = $('useBtn'), dropBtn = $('dropBtn');

  // Zamienia emoji 🪙 w komunikatach na grafikę monety (ta sama co w sklepie)
  function coinHTML(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/🪙/g,'<i class="coin"></i>'); }
  function toast(msg){
    const t = $('toast'); t.innerHTML = coinHTML(msg); t.style.opacity = 1;
    clearTimeout(toast.h); toast.h = setTimeout(() => t.style.opacity = 0, 1800);
  }
  function addItem(id, color){
    color = ((id === 'hat' || id === 'cap' || id === 'shirt' || id === 'shoes' || id === 'pants') && typeof color === 'number') ? color : undefined;   // kolor mają tylko ubrania
    const s = NOSTACK(id) ? null : inv.find(x => x && x.id === id && x.color === color);   // każda koszulka = osobny slot
    if(s){ s.count++; return true; }
    const k = inv.indexOf(null);
    if(k < 0) return false;
    inv[k] = color === undefined ? {id, count:1} : {id, count:1, color}; return true;
  }
  const hex6 = c => (c >>> 0).toString(16).padStart(6, '0');
  const colorDot = s => !s || s.color === undefined ? '' : s.id === 'shoes'
    ? `<span class="cdot" style="background:#${hex6(shoeUp(s.color))}"></span><span class="cdot" style="background:#${hex6(shoeSole(s.color))};left:17px"></span>`
    : `<span class="cdot" style="background:#${hex6(s.color)}"></span>`;
  const colTxt = s => s.id === 'shoes' ? ' #' + hex6(shoeUp(s.color)).toUpperCase() + ' / #' + hex6(shoeSole(s.color)).toUpperCase() : ' #' + hex6(s.color).toUpperCase();
  const DESK_SLOTS = 10, OVEN_SLOTS = 8;
  const BIG = {desk:{slots:DESK_SLOTS, part:'deskpart'}, oven:{slots:OVEN_SLOTS, part:'ovenpart'}};   // przedmioty zajmujące wiele slotów
  const freeSlots = () => inv.filter(x => !x).length;
  function addBig(id){                                  // jeden slot główny + (slots-1) części
    const B = BIG[id], free = []; inv.forEach((x,i) => { if(!x) free.push(i); });
    if(!B || free.length < B.slots) return false;
    const k0 = free[0];
    inv[k0] = {id, count:1};
    for(let i=1;i<B.slots;i++) inv[free[i]] = {id:B.part, count:1, main:k0};
    return true;
  }
  const addDesk = () => addBig('desk');
  function removeOne(k){
    const s = inv[k]; if(!s) return;
    if(s.id === 'deskpart' || s.id === 'ovenpart') return;
    if(BIG[s.id]){ inv.forEach((q,i) => { if(q && q.main === k) inv[i] = null; }); inv[k] = null; return; }
    if(--s.count <= 0){
      inv[k] = null;
      if(isWorn(s)) unwear(s);
      if(s.id === 'phone') closePhone();
    }
  }
  // ===== Bagażnik auta: 30 slotów, kliknięcie przedmiotu przenosi cały stos (z ekwipunku do bagażnika i z powrotem) =====
  const TRUNK_SLOTS = 30;
  const trunk = new Array(TRUNK_SLOTS).fill(null);
  const trunkEl = document.getElementById('trunk');
  const trunkOpen = () => trunkEl.style.display === 'block';
  function trunkAdd(id, n, color){
    const t = trunk.find(x => x && x.id === id && x.color === color);
    if(t){ t.count += n; return true; }
    const k = trunk.indexOf(null); if(k < 0) return false;
    trunk[k] = color === undefined ? {id, count:n} : {id, count:n, color}; return true;
  }
  const trunkFree = () => trunk.filter(x => !x).length;
  function trunkAddBig(id){                              // duży przedmiot: slot główny + części (tak jak w ekwipunku)
    const B = BIG[id], free = []; trunk.forEach((x,i) => { if(!x) free.push(i); });
    if(!B || free.length < B.slots) return false;
    trunk[free[0]] = {id, count:1};
    for(let i = 1; i < B.slots; i++) trunk[free[i]] = {id:B.part, count:1, main:free[0]};
    return true;
  }
  function trunkSlotEl(s, onClick, inInv){
    const d = document.createElement('div'); d.className = 'slot' + (s && (s.id === 'deskpart' || s.id === 'ovenpart') ? ' part' : '');
    if(s){
      if(s.id === 'coin') d.innerHTML = '<i class="coin inventory-coin" aria-label="Monety"></i>'; else d.textContent = ITEMS[s.id].i;
      d.title = ITEMS[s.id].n + (s.color !== undefined ? colTxt(s) : '') + (s.count > 1 ? ' ×' + s.count : '');
      if(s.count > 1) d.insertAdjacentHTML('beforeend', `<span class="n">${s.count}</span>`);
      if(inInv && isWorn(s)) d.insertAdjacentHTML('beforeend', '<span class="eq">✓</span>');
      d.insertAdjacentHTML('beforeend', colorDot(s));
    }
    d.onclick = onClick; return d;
  }
  function renderTrunk(){
    const tg = document.getElementById('trunkGrid'), ig = document.getElementById('trunkInvGrid');
    tg.innerHTML = ''; ig.innerHTML = '';
    trunk.forEach((s, k) => tg.appendChild(trunkSlotEl(s, () => trunkTake(k), false)));
    inv.forEach((s, k) => ig.appendChild(trunkSlotEl(s, () => trunkPut(k), true)));
    document.getElementById('trunkCount').textContent = `(${trunk.filter(x => x).length}/${TRUNK_SLOTS})`;
  }
  function trunkPut(k){                                  // ekwipunek → bagażnik
    let s = inv[k]; if(!s) return;
    if(s.main !== undefined){ k = s.main; s = inv[k]; if(!s) return; }      // kliknięto część dużego przedmiotu
    if(s.id === 'order'){ toast('Zamówienia nie schowasz w bagażniku'); return; }
    if(BIG[s.id]){
      const need = BIG[s.id].slots;
      if(trunkFree() < need){ toast(`${ITEMS[s.id].n} zajmuje ${need} slotów – w bagażniku brakuje miejsca (wolne: ${trunkFree()})`); return; }
      trunkAddBig(s.id); removeOne(k); renderTrunk(); renderInv();
      toast(`Schowano do bagażnika: ${ITEMS[s.id].i} ${ITEMS[s.id].n}`); return;
    }
    if(!trunkAdd(s.id, s.count, s.color)){ toast('Bagażnik pełny 🧳'); return; }
    if(isWorn(s)) unwear(s);
    if(s.id === 'phone') closePhone();
    inv[k] = null; renderTrunk(); renderInv();
    toast(`Schowano do bagażnika: ${ITEMS[s.id].i} ${ITEMS[s.id].n}${s.count > 1 ? ' ×' + s.count : ''}`);
  }
  function trunkTake(k){                                 // bagażnik → ekwipunek
    let s = trunk[k]; if(!s) return;
    if(s.main !== undefined){ k = s.main; s = trunk[k]; if(!s) return; }
    if(BIG[s.id]){
      const need = BIG[s.id].slots;
      if(freeSlots() < need){ toast(`${ITEMS[s.id].n} zajmuje ${need} slotów – zrób miejsce w ekwipunku (wolne: ${freeSlots()})`); return; }
      addBig(s.id); trunk.forEach((q,i) => { if(q && q.main === k) trunk[i] = null; }); trunk[k] = null;
      renderTrunk(); renderInv(); toast(`Wyjęto z bagażnika: ${ITEMS[s.id].i} ${ITEMS[s.id].n}`); return;
    }
    if(!canAddItem(s.id, s.color) || (NOSTACK(s.id) && freeSlots() < s.count)){ toast('Ekwipunek pełny – zrób miejsce'); return; }
    for(let i = 0; i < s.count; i++) addItem(s.id, s.color);
    trunk[k] = null; renderTrunk(); renderInv();
    toast(`Wyjęto z bagażnika: ${ITEMS[s.id].i} ${ITEMS[s.id].n}${s.count > 1 ? ' ×' + s.count : ''}`);
  }
  function trunkNearRear(){                              // tył auta (bagażnik jest z tyłu, przód = +Z grupy)
    if(!hasCar || carDriving || !pcar.group.visible) return false;
    const rx = pcar.group.position.x - Math.sin(carHeading)*3.1, rz = pcar.group.position.z - Math.cos(carHeading)*3.1;
    return Math.hypot(player.position.x - rx, player.position.z - rz) < 2.0;
  }
  function openTrunk(){
    if(!hasCar) return;
    invEl.style.display = 'none'; promptEl.style.display = 'none';
    renderTrunk(); trunkEl.style.display = 'block';
  }
  function closeTrunk(){ trunkEl.style.display = 'none'; }
  document.getElementById('trunkClose').onclick = closeTrunk;
  addEventListener('keydown', e => { if(e.code === 'Escape' && trunkOpen()) closeTrunk(); });
  setInterval(() => { if(trunkOpen() && !trunkNearRear()) closeTrunk(); }, 300);   // odejście od auta zamyka bagażnik

  function renderInv(){
    gridEl.innerHTML = '';
    inv.forEach((s, k) => {
      const d = document.createElement('div');
      d.className = 'slot' + ((k === sel || (s && s.main !== undefined && s.main === sel)) ? ' sel' : '') + (s && (s.id === 'deskpart' || s.id === 'ovenpart') ? ' part' : '');
      if(s){
        // Monety w ekwipunku pokazuj jako tę samą złotą grafikę co w sklepie.
        if(s.id === 'coin'){
          d.innerHTML = '<i class="coin inventory-coin" aria-label="Monety"></i>';
        } else {
          d.textContent = ITEMS[s.id].i;
        }
        if(s.count > 1) d.insertAdjacentHTML('beforeend', `<span class="n">${s.count}</span>`);
        if(isWorn(s)) d.insertAdjacentHTML('beforeend', '<span class="eq">✓</span>');
        d.insertAdjacentHTML('beforeend', colorDot(s));
      }
      d.onclick = () => { sel = (s && s.main !== undefined) ? s.main : k; renderInv(); };
      gridEl.appendChild(d);
    });
    const s = inv[sel];
    infoEl.textContent = s ? (BIG[s.id] ? `${ITEMS[s.id].n} – zajmuje ${BIG[s.id].slots} slotów` : `${ITEMS[s.id].n}${s.color !== undefined ? colTxt(s) : ''} ×${s.count}`) : 'Wybierz przedmiot';
    useBtn.disabled = !(s && ITEMS[s.id].use);
    useBtn.textContent = s && ITEMS[s.id].use ? ITEMS[s.id].use : 'Użyj';
    dropBtn.disabled = !s;
  }
  useBtn.onclick = () => {
    const s = inv[sel]; if(!s) return;
    if(s.id === 'apple'){ removeOne(sel); addStats(15, 3); toast('Smaczne! 🍎 +15 sytości'); }
    else if(s.id === 'bread'){ removeOne(sel); addStats(30, 3); toast('Świeży chleb! 🍞 +30 sytości'); }
    else if(s.id === 'pizza'){ removeOne(sel); addStats(55, 5); toast('Pyszna pizza! 🍕 +55 sytości, +5 energii'); }
    else if(s.id === 'pizzaburnt'){ removeOne(sel); addStats(5, 0); toast('Spalona pizza… ledwo da się zjeść 🔥 +5 sytości'); }
    else if(s.id === 'pizzafrozen'){ const po = homeInside ? nearDesk('oven') : null; if(po) openOven(po); else toast('Włóż pizzę do piekarnika w swoim domu 🍳'); }
    else if(s.id === 'cola'){ removeOne(sel); addStats(5, 15); toast('Orzeźwiająca cola! 🥤 +15 energii, +5 sytości'); }
    else if(s.id === 'phone'){ openPhone(); }
    else if(s.id === 'charger'){ if(homeInside && nearOutlet() < 2.2) plugCharger(); else toast('Podłącz ładowarkę do gniazdka w swoim domu 🏠'); }
    else if(s.id === 'desk' || s.id === 'chair' || s.id === 'wardrobe' || s.id === 'computer' || s.id === 'lamp' || s.id === 'oven' || FIXT.includes(s.id)){ startPlacement(sel); }
    else if(s.id === 'shirt'){
      const c = s.color, old = wornShirt || {color:accShirtCol};   // pierwsza koszulka (w kolorze konta) też trafia do ekwipunku
      removeOne(sel);
      if(old && !addItem('shirt', old.color)){ addItem('shirt', c); renderInv(); toast('Brak miejsca w ekwipunku na zdjętą koszulkę'); return; }   // stara koszulka wraca do ekwipunku
      setShirt({color:c}); toast(old ? 'Założono koszulkę – poprzednia wróciła do ekwipunku' : 'Założono: Koszulka');
    }
    else if(s.id === 'pants'){
      const c = s.color, old = wornPants || {color:PANTS_DEF};   // pierwsze spodnie (ciemnoszare) też trafiają do ekwipunku
      removeOne(sel);
      if(!addItem('pants', old.color)){ addItem('pants', c); renderInv(); toast('Brak miejsca w ekwipunku na zdjęte spodnie'); return; }
      setPants({color:c}); toast('Założono spodnie – poprzednie wróciły do ekwipunku');
    }
    else if(s.id === 'shoes'){
      const c = s.color, old = wornShoes || {color:shoeEnc(SH_DEF_UP, SH_DEF_SOLE)};   // pierwsze buty (czarne z białą podeszwą) też trafiają do ekwipunku
      removeOne(sel);
      if(old && !addItem('shoes', old.color)){ addItem('shoes', c); renderInv(); toast('Brak miejsca w ekwipunku na zdjęte buty'); return; }   // stare buty wracają do ekwipunku
      setShoes({color:c}); toast(old ? 'Założono buty – poprzednie wróciły do ekwipunku' : 'Założono: Buty');
    }
    else if(s.id === 'hat' || s.id === 'cap'){ if(isWorn(s)){ unwear(s); toast('Zdjęto: ' + ITEMS[s.id].n); } else { setWorn({id:s.id, color:s.color}); toast('Założono: ' + ITEMS[s.id].n); } }
    renderInv();
  };
  dropBtn.onclick = () => {
    const s = inv[sel]; if(!s) return;
    if(s.id === 'order'){ toast('Nie możesz wyrzucić zamówienia'); return; }
    if(s.id === 'desk'){ toast('Biurka nie wyrzucisz – ustaw je w swoim domu 🏠'); return; }
    if(s.id === 'oven'){ toast('Piekarnika nie wyrzucisz – ustaw go w swoim domu 🏠'); return; }
    if(s.id === 'chair'){ toast('Krzesła nie wyrzucisz – ustaw je w swoim domu 🏠'); return; }
    if(s.id === 'wardrobe'){ toast('Szafy nie wyrzucisz – ustaw ją w swoim domu 🏠'); return; }
    if(FIXT.includes(s.id)){ toast(`${ITEMS[s.id].n} – nie wyrzucisz, ustaw w swoim domu 🏠`); return; }
    if(s.id === 'lamp'){ toast('Lampy nie wyrzucisz – zamontuj ją na suficie w swoim domu 🏠'); return; }
    if(s.id === 'computer'){ toast('Komputer ustawisz bezpośrednio na biurku 🖥️'); return; }
    const id = s.id, dcol = s.color; removeOne(sel);
    const a = player.rotation.y;
    spawnItem(id, player.position.x + Math.sin(a)*1.8, player.position.z + Math.cos(a)*1.8, 2, dcol);
    renderInv();
  };
  function toggleInv(){ invEl.style.display = invEl.style.display === 'block' ? 'none' : 'block'; renderInv(); }
  $('invBtn').onclick = toggleInv;
  addEventListener('keydown', e => {
    if(e.code === 'KeyI' && !e.repeat) toggleInv();
    if(e.code === 'Escape') invEl.style.display = 'none';
  });

  // Sklep i telefon
  const shopEl = $('shop'), promptEl = $('prompt'), phoneEl = $('phone'), screenEl = $('pscreen');
  const hasPhone = () => inv.some(s => s && s.id === 'phone');
  const coins = () => { const s = inv.find(x => x && x.id === 'coin'); return s ? s.count : 0; };
  function renderShop(){ $('coinCount').textContent = coins(); }
  // TESTOWO: dodaje 100 monet do ekwipunku (do usunięcia po testach)
  $('testCoinsBtn').onclick = () => {
    if(isDead || isPaused) return;
    let s = inv.find(x => x && x.id === 'coin');
    if(!s){
      const k = inv.indexOf(null);
      if(k < 0){ toast('Ekwipunek pełny – brak miejsca na monety'); return; }
      s = inv[k] = {id:'coin', count:0};
    }
    s.count += 100;
    renderInv(); renderShop(); toast('+100 monet 🪙 (test)');
    $('testCoinsBtn').blur();
  };
  // Menu gracza (kółko z awatarem pod przyciskiem testowym) – na razie pusty szkielet na przyszłe opcje
  (function(){
    const btn = $('avatarBtn'), menu = $('playerMenu');
    const open = () => menu.style.display === 'block';
    const close = () => { menu.style.display = 'none'; btn.blur(); };
    btn.addEventListener('pointerdown', e => e.stopPropagation());        // klik w awatar nie przechwytuje kursora
    btn.onclick = () => {
      if(isDead || isPaused) return;
      if(open()){ close(); return; }
      refreshPortrait(true);
      menu.style.display = 'block';                                         // najpierw okno (uiBlocking), potem zwolnienie kursora
      if(document.pointerLockElement) document.exitPointerLock();
    };
    $('playerMenuClose').onclick = close;

    // ===== Żywy portret: renderujemy klon prawdziwego modelu gracza, więc awatar odzwierciedla czapkę, plecak, kolory ubrań itd. =====
    let pr = null, prScene = null, prCam = null, prClone = null, prSig = '';
    const cvs = [$('avatarCanvas'), $('pmCanvas')];
    function initPortrait(){
      try{
        pr = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
        pr.setSize(256, 256, false); pr.setClearColor(0x000000, 0);
        prScene = new THREE.Scene();
        prScene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const dl = new THREE.DirectionalLight(0xfff2d8, 0.85); dl.position.set(1.5, 2.5, 3); prScene.add(dl);
        prCam = new THREE.OrthographicCamera(-0.95, 0.95, 2.75, 0.85, 0.1, 20); prCam.layers.enable(1);   // kadr: głowa, czapka i tułów
        prCam.position.set(0, 0, 5); prCam.lookAt(0, 0, 0);
      }catch(err){ pr = null; }
    }
    function playerSignature(){
      let s = '';
      player.traverse(o => { s += o.visible ? '1' : '0'; if(o.material && o.material.color) s += o.material.color.getHex().toString(16); });
      return s;
    }
    function rebuildClone(){
      if(prClone) prScene.remove(prClone);
      const bi = player.children.indexOf(body), ui = body.children.indexOf(upper);
      prClone = player.clone(true);
      prClone.position.set(0, 0, 0); prClone.rotation.set(0, 0, 0); prClone.scale.set(1, 1, 1); prClone.visible = true;
      const rm = [];
      prClone.traverse(o => { if(o.isLight || o.isSprite || o.isPoints || o.isLine) rm.push(o); });
      rm.forEach(o => o.parent && o.parent.remove(o));
      prClone.children.forEach((c, i) => { if(i !== bi) c.visible = false; });   // tylko postać – bez roweru i innych dodatków
      const cb = prClone.children[bi];
      if(cb){
        cb.position.set(0, 0, 0); cb.rotation.set(0, 0, 0);
        cb.traverse(o => { if(o.isGroup){ o.rotation.set(0, 0, 0); } });          // zerujemy animację chodu / pochylenie na rowerze
        const cu = cb.children[ui]; if(cu) cu.position.set(0, 0.8, 0);
      }
      prScene.add(prClone);
    }
    function drawPortrait(){
      if(!pr) return;
      pr.render(prScene, prCam);
      cvs.forEach(cv => {
        const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
        const gr = g.createRadialGradient(cv.width/2, cv.height*0.4, 10, cv.width/2, cv.height/2, cv.width*0.75);
        gr.addColorStop(0, '#cfe8ff'); gr.addColorStop(1, '#6fa8e0');
        g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
        g.drawImage(pr.domElement, 0, 0, cv.width, cv.height);
      });
    }
    function refreshPortrait(force){
      if(!pr && !prScene) initPortrait();
      if(!pr) return;
      const sig = playerSignature();
      if(force || sig !== prSig){ prSig = sig; rebuildClone(); drawPortrait(); }
    }
    setInterval(() => { if(!document.hidden && !isDead) refreshPortrait(false); }, 400);
    setTimeout(() => refreshPortrait(true), 300);
    addEventListener('keydown', e => { if(e.code === 'Escape' && open()){ close(); e.stopImmediatePropagation(); } }, true);
  })();
  function openShop(){ shopEl.style.display = 'block'; promptEl.style.display = 'none'; renderShop(); }
  function closeShop(){ shopEl.style.display = 'none'; }
  $('shopClose').onclick = closeShop;
  promptEl.onclick = () => { if(curAct) curAct.run(); };
  $('buyPhone').onclick = () => {
    if(hasPhone() || phoneDocked){ toast('Masz już telefon'); return; }
    if(coins() < 5){ toast('Potrzebujesz 5 monet 🪙 (masz ' + coins() + ')'); return; }
    const k = inv.findIndex(s => s && s.id === 'coin');
    for(let i=0;i<5;i++) removeOne(k);
    if(!addItem('phone')){ for(let i=0;i<5;i++) addItem('coin'); toast('Ekwipunek pełny!'); renderShop(); return; }
    toast('Kupiono telefon 📱'); renderInv(); renderShop();
  };
  $('buyComputer').onclick = () => {
    if(coins() < 100){ toast('Komputer kosztuje 100 monet 🪙 (masz ' + coins() + ')'); return; }
    for(let i=0;i<100;i++) removeOne(inv.findIndex(s => s && s.id === 'coin'));
    if(!addItem('computer')){
      for(let i=0;i<100;i++) addItem('coin');
      toast('Ekwipunek pełny – zrób miejsce na komputer'); renderInv(); renderShop(); return;
    }
    toast('Kupiono komputer 🖥️ – ustaw go bezpośrednio na biurku');
    renderInv(); renderShop();
  };
  $('buyCola').onclick = () => {
    if(coins() < 3){ toast('Potrzebujesz 3 monet 🪙 (masz ' + coins() + ')'); return; }
    for(let i=0;i<3;i++) removeOne(inv.findIndex(s => s && s.id === 'coin'));
    if(!addItem('cola')){ for(let i=0;i<3;i++) addItem('coin'); toast('Ekwipunek pełny!'); renderInv(); renderShop(); return; }
    toast('Kupiono colę 🥤'); renderInv(); renderShop();
  };
  // Bateria telefonu i ładowarka: telefon trzeba podłączyć do ładowarki w gniazdku i zostawić – ładuje się, dopóki go nie zabierzesz
  let chargerHome = null, phoneBattery = 100, chargerPlugged = false, phoneDocked = false, batFlag20 = false, batFlag10 = false, batFull = true;
  const hasCharger = () => chargerPlugged || inv.some(s => s && s.id === 'charger');
  const outletPos = () => homeW(HOME.lay.outlet.x, HOME.lay.outlet.z);
  function nearOutlet(){ const o = outletPos(); return Math.hypot(player.position.x - o.x, player.position.z - o.z); }
  const isCharging = () => phoneDocked && phoneBattery < 100;
  function plugCharger(){
    const k = inv.findIndex(s => s && s.id === 'charger'); if(k < 0) return;
    removeOne(k); chargerPlugged = true; chargerHome = homeCur; homeCur.charger.visible = true; renderInv();
    toast('Podłączono ładowarkę do gniazdka 🔌 Teraz podłącz do niej telefon (F)');
  }
  function dockPhone(){
    const k = inv.findIndex(s => s && s.id === 'phone'); if(k < 0) return;
    if(phoneEl.style.display === 'flex') closePhone();
    removeOne(k); phoneDocked = true; chargerHome.phone.visible = true; batFull = phoneBattery >= 100; renderInv();
    toast(phoneBattery >= 100 ? 'Telefon podłączony do ładowarki 🔌 (jest już naładowany)' : 'Telefon podłączony do ładowarki ⚡ Zostaw go, aż się naładuje');
  }
  function takePhone(){
    if(!addItem('phone')){ toast('Ekwipunek pełny – zrób miejsce na telefon'); return; }
    phoneDocked = false; chargerHome.phone.visible = false; renderInv();
    toast('Zabrano telefon 📱 Bateria: ' + Math.floor(phoneBattery) + '%');
  }
  function updatePhoneBattery(dt){
    if(chargerPlugged && chargerHome) chargerHome.chargerLed.material.color.setHex(!phoneDocked ? 0x777777 : (phoneBattery >= 100 ? 0x00e676 : 0xffa000));
    if(phoneDocked){
      phoneBattery = Math.min(100, phoneBattery + 0.8*dt);        // pełne ładowanie ≈ 2 min
      if(phoneBattery > 20) batFlag20 = false;
      if(phoneBattery > 10) batFlag10 = false;
      if(chargerHome) chargerHome.phoneMat.color.setHex(phoneBattery >= 100 ? 0x00e676 : 0x4fc3f7);
      if(phoneBattery >= 100 && !batFull){ batFull = true; toast('Telefon naładowany 🔋 – możesz go zabrać z ładowarki'); }
      return;
    }
    if(!hasPhone()) return;
    const prev = phoneBattery;
    if(phoneBattery < 100) batFull = false;
    const camOpen = phoneEl.style.display === 'flex' && curScreen === 'camera';
    phoneBattery = Math.max(0, phoneBattery - (100/1500)*(camOpen ? 3 : 1)*dt);   // pełna bateria ≈ 25 min, aparat zużywa 3× szybciej
    if(prev > 20 && phoneBattery <= 20 && !batFlag20){ batFlag20 = true; toast('Bateria telefonu: 20% 🪫'); }
    if(prev > 10 && phoneBattery <= 10 && !batFlag10){ batFlag10 = true; toast('Bateria telefonu: 10% 🪫 – naładuj go w domu'); }
    if(prev > 0 && phoneBattery <= 0){
      if(phoneEl.style.display === 'flex') closePhone();
      toast('Telefon się rozładował 🪫');
    }
  }
  setInterval(() => {
    const el = $('pbat'); if(!el) return;
    const b = Math.floor(phoneBattery);
    el.textContent = '📶 ' + (b <= 15 ? '🪫' : '🔋') + ' ' + b + '%';
  }, 500);
  $('buyCharger').onclick = () => {
    if(hasCharger()){ toast('Masz już ładowarkę 🔌'); return; }
    if(coins() < 8){ toast('Potrzebujesz 8 monet 🪙 (masz ' + coins() + ')'); return; }
    for(let i=0;i<8;i++) removeOne(inv.findIndex(s => s && s.id === 'coin'));
    if(!addItem('charger')){ for(let i=0;i<8;i++) addItem('coin'); toast('Ekwipunek pełny!'); renderInv(); renderShop(); return; }
    toast('Kupiono ładowarkę 🔌 – podłącz ją do gniazdka w swoim domu, a potem podłącz do niej telefon'); renderInv(); renderShop();
  };
  $('buyBike').onclick = () => {
    if(bikePurchased){ toast('Masz już rower 🚲'); return; }
    if(coins() < 25){ toast('Potrzebujesz 25 monet 🪙 (masz ' + coins() + ')'); return; }
    const k=inv.findIndex(s=>s&&s.id==='coin');
    for(let i=0;i<25;i++) removeOne(k);
    bikePurchased=true; placeBikeOutsideShop();
    toast('Kupiono rower! Czeka przed sklepem 🚲');
    renderInv(); renderShop();
  };

  function tickClock(){ $('pclock').textContent = gameClock; }
  setInterval(tickClock, 10000);
  function openPhone(){
    if(!hasPhone()){ toast('Nie masz telefonu – kup go w sklepie'); return; }
    if(phoneBattery < 1){ toast(hasCharger() ? 'Telefon jest rozładowany 🪫 – podłącz go do ładowarki w domu i zostaw na chwilę' : 'Telefon jest rozładowany 🪫 – kup ładowarkę w sklepie i podłącz ją w domu'); return; }
    phoneEl.style.display = 'flex'; tickClock(); showScreen('home');
  }
  function closePhone(){ stopPhoneCamera(); phoneEl.style.display = 'none'; }
  $('pClose').onclick = closePhone;
  $('pHome').onclick = () => showScreen('home');
  function showScreen(name){
    if(name !== 'camera') stopPhoneCamera();
    const head = t => `<div class="phead"><button id="pback">‹</button>${t}</div>`;
    curScreen = name;
    if(name === 'home'){
      screenEl.innerHTML = '<div class="apps"><div class="app" data-app="settings"><span>⚙️</span>Ustawienia</div><div class="app" data-app="bank"><span>🏦</span>Bank</div><div class="app" data-app="camera"><span>📷</span>Aparat</div><div class="app" data-app="gallery"><span>🖼️</span>Galeria</div><div class="app" data-app="dom"><span>🏠</span>DOM</div><div class="app" data-app="upper"><span>🚖</span>Upper</div></div>';
      screenEl.querySelectorAll('.app').forEach(a => a.onclick = () => showScreen(a.dataset.app));
    } else if(name === 'camera'){
      screenEl.innerHTML = head('📷 Aparat') + `<div class="cam-wrap"><video id="cameraPreview" autoplay playsinline muted></video><div class="cam-controls"><button id="flipCamera">🔄 Przednia</button><button class="capture" id="takePhoto">● Zdjęcie</button><button id="recordVideo">⏺ Nagraj</button></div><div id="cameraHint">Zrób zdjęcie lub nagraj film ze świata gry.</div></div>`;
      startPhoneCamera();
      $('flipCamera').onclick = async () => { cameraFacing = cameraFacing === 'user' ? 'environment' : 'user'; await startPhoneCamera(); };
      $('takePhoto').onclick = capturePhonePhoto;
      $('recordVideo').onclick = togglePhoneRecording;
    } else if(name === 'gallery'){
      screenEl.innerHTML = head('🖼️ Galeria') + `<div id="galleryGrid"></div><div id="galleryEmpty" style="padding:18px;text-align:center;font-size:12px;opacity:.8">Nie masz jeszcze zdjęć ani filmów.</div>`;
      renderPhoneGallery();
    } else if(name === 'settings'){
      screenEl.innerHTML = head('⚙️ Ustawienia') + `<div class="pbody">
        <label>Czułość kamery: <b id="sensV">${sens.toFixed(1)}</b></label>
        <input type="range" id="sensR" min="0.3" max="2" step="0.1" value="${sens}">
        <label>Pole widzenia: <b id="fovV">${Math.round(camera.fov)}</b>°</label>
        <input type="range" id="fovR" min="45" max="90" step="1" value="${camera.fov}">
        <div style="opacity:.6;font-size:11px">System: RealOS 1.0</div></div>`;
      $('sensR').oninput = e => { sens = +e.target.value; $('sensV').textContent = sens.toFixed(1); };
      $('fovR').oninput = e => { camera.fov = +e.target.value; camera.updateProjectionMatrix(); $('fovV').textContent = e.target.value; };
    } else if(name === 'bank'){
      if(!bank.opened){
        screenEl.innerHTML = head('🏦 Bank') + `<div class="pbody lock"><div class="big">🔒</div>
          <p><b>Nie masz jeszcze konta</b></p>
          <p style="opacity:.75">Odwiedź Real Bank przy głównej ulicy i załóż konto u bankiera.</p>
          <button disabled>Brak konta</button></div>`;
      } else {
        const rows = bank.tx.map(x => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:12px"><span>${coinHTML(x.text)}</span><span style="opacity:.6">${x.t}</span></div>`).join('');
        screenEl.innerHTML = head('🏦 Bank') + `<div class="pbody">
          <div style="background:linear-gradient(135deg,#1b3a5c,#3a7bd5);border-radius:12px;padding:12px;margin-bottom:12px">
            <div style="opacity:.8;font-size:11px">Saldo</div>
            <div style="font-size:26px;font-weight:700;margin:2px 0 8px">${bank.balance} <i class="coin"></i></div>
            <div style="font-size:10px;opacity:.85;word-break:break-all">${bank.number}</div>
          </div>
          <div style="font-weight:600;margin-bottom:4px">Ostatnie operacje</div>${rows}</div>`;
      }
    } else if(name === 'dom'){
      const bs = c => `background:${c};color:#fff;border:0;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;margin-top:8px;width:100%`;
      const cards = HOMES.map(H => {
        let status, actions = '';
        if(H.owned){
          status = '🔑 Twój na stałe – bez czynszu';
          actions = domConfirm === H.id
            ? `<div style="font-size:11px;opacity:.85;margin-top:8px">Na pewno sprzedać ${H.label} za ${sellOf(H)} 🪙? Pieniądze trafią na konto, a ty stracisz dostęp do domu.</div><button data-act="sellyes" data-id="${H.id}" style="${bs('#c0392b')}">Potwierdź sprzedaż (+${sellOf(H)} 🪙)</button><button data-act="sellno" data-id="${H.id}" style="${bs('rgba(255,255,255,.2)')}">Anuluj</button>`
            : `<button data-act="sell" data-id="${H.id}" style="${bs('#c0392b')}">Sprzedaj dom (+${sellOf(H)} 🪙 na konto)</button>`;
        } else if(H.rented){
          const left = Math.max(0, (H.paidUntil - gameElapsed) / DAY_SECONDS);
          status = `🔓 Wynajęty • opłacony jeszcze ${left.toFixed(1)} doby`;
          const can = left + 1 <= MAX_PREPAID_DAYS;
          actions = `<button data-act="extend" data-id="${H.id}" style="${bs(can ? '#3a7bd5' : '#666')}" ${can ? '' : 'disabled'}>${can ? `Przedłuż o dobę (${rentOf(H)} 🪙 z konta)` : `Maks. ${MAX_PREPAID_DAYS} dób z góry`}</button>`;
        } else {
          status = '🔒 Nie masz tego domu';
          actions = `<div style="font-size:11px;opacity:.75;margin-top:8px">Podejdź do drzwi, żeby wynająć (${rentOf(H)} 🪙 / dobę) lub kupić (${buyOf(H)} 🪙).</div>`;
        }
        if(!bank.opened && (H.owned || H.rented)) actions = `<button disabled style="${bs('#666')}">🔒 Wymaga konta bankowego</button>`;
        return `<div style="background:rgba(255,255,255,.12);border-radius:12px;padding:12px;margin-bottom:10px"><div style="font-weight:700;font-size:15px">🏠 ${H.label}</div><div style="font-size:12px;opacity:.9;margin-top:2px">${status}</div>${actions}</div>`;
      }).join('');
      screenEl.innerHTML = head('🏠 DOM') + `<div class="pbody">${bank.opened ? `<div style="font-size:12px;opacity:.85;margin-bottom:10px">Saldo konta: <b>${bank.balance}</b> 🪙</div>` : ''}${bank.opened ? '' : `<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;margin-bottom:10px;font-size:12px;line-height:1.4">🔒 <b>Brak konta bankowego</b><br>Żeby sprzedawać dom i przedłużać najem, załóż konto w Real Banku przy głównej ulicy.</div>`}${cards}</div>`.replace(/🪙/g, '<i class="coin"></i>');
      screenEl.querySelectorAll('[data-act]').forEach(btn => btn.onclick = () => {
        if(!bank.opened){ toast('Aby wykonywać działania w aplikacji DOM, załóż konto w Real Banku 🏦'); showScreen('dom'); return; }
        const H = HOMES.find(x => x.id === btn.dataset.id), act = btn.dataset.act;
        if(act === 'sell') domConfirm = H.id;
        else if(act === 'sellno') domConfirm = null;
        else if(act === 'sellyes'){ domConfirm = null; sellHome(H); }
        else if(act === 'extend'){
          if(!H.rented || H.owned) return;
          if(bank.balance < rentOf(H)) toast(`Brak środków na koncie: przedłużenie to ${rentOf(H)} 🪙 (saldo: ${bank.balance} 🪙)`);
          else { bank.balance -= rentOf(H); logTx(`−${rentOf(H)} 🪙 przedłużenie najmu ${H.label}`); refreshPhoneBank(); H.paidUntil += DAY_SECONDS; toast(`Przedłużono najem ${H.label} o dobę za ${rentOf(H)} 🪙 z konta`); }
        }
        showScreen('dom');
      });
    }
    else if(name === 'upper') renderUpperScreen(head);
    const b = $('pback'); if(b) b.onclick = () => showScreen('home');
  }

  // Aparat i galeria telefonu — zdjęcia oraz filmy są przechowywane lokalnie w przeglądarce.
  let phoneCameraStream = null, cameraFacing = 'environment', phoneRecorder = null, recordingChunks = [], recordingStartedAt = 0;
  let phoneMedia = [];
  const PHONE_MEDIA_KEY = 'realLifePhoneGalleryV1';
  try { phoneMedia = JSON.parse(localStorage.getItem(PHONE_MEDIA_KEY) || '[]'); if(!Array.isArray(phoneMedia)) phoneMedia=[]; } catch(e){ phoneMedia=[]; }
  function savePhoneMedia(){ try { localStorage.setItem(PHONE_MEDIA_KEY, JSON.stringify(phoneMedia)); } catch(e){ toast('Brak miejsca na zapis galerii'); } }
  // Aparat telefonu nagrywa świat gry (bez dostępu do prawdziwej kamery i mikrofonu).
  // Tylny = widok z oczu postaci w stronę, w którą patrzysz; przedni = selfie postaci.
  const PCW = 480, PCH = 360;
  let phoneCamIv = null, phoneCamRT = null, phoneCamCv = null, phoneCamCtx = null, phoneCamBuf = null, phoneCamImg = null, phoneCamObj = null;
  function renderPhoneCamFrame(){
    if(!phoneCamObj) return;
    const p = player.position, dx = -Math.sin(yaw), dz = -Math.cos(yaw), cam = phoneCamObj;
    const wasBody = body.visible, skyPos = sky.position.clone();
    if(cameraFacing === 'user'){
      cam.position.set(p.x + dx*2.0, p.y + 1.8, p.z + dz*2.0);
      cam.lookAt(p.x, p.y + 1.55, p.z);
      body.visible = true;
    } else {
      const vp = firstPerson ? pitch : -pitch*0.35, cp = Math.cos(vp);
      cam.position.set(p.x, p.y + 1.96, p.z);
      cam.lookAt(p.x + dx*cp, p.y + 1.96 + Math.sin(vp), p.z + dz*cp);
      body.visible = false;
    }
    sky.position.copy(cam.position);
    renderer.setRenderTarget(phoneCamRT);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
    sky.position.copy(skyPos); body.visible = wasBody;
    renderer.readRenderTargetPixels(phoneCamRT, 0, 0, PCW, PCH, phoneCamBuf);
    const row = PCW*4, out = phoneCamImg.data;
    for(let y = 0; y < PCH; y++) out.set(phoneCamBuf.subarray((PCH-1-y)*row, (PCH-y)*row), y*row);
    phoneCamCtx.putImageData(phoneCamImg, 0, 0);
  }
  async function startPhoneCamera(){
    const video = $('cameraPreview'); if(!video) return;
    stopPhoneCamera();
    if(!phoneCamCv){
      phoneCamCv = document.createElement('canvas'); phoneCamCv.width = PCW; phoneCamCv.height = PCH;
      phoneCamCtx = phoneCamCv.getContext('2d');
      phoneCamRT = new THREE.WebGLRenderTarget(PCW, PCH);
      phoneCamBuf = new Uint8Array(PCW*PCH*4);
      phoneCamImg = phoneCamCtx.createImageData(PCW, PCH);
      phoneCamObj = new THREE.PerspectiveCamera(65, PCW/PCH, 0.1, 600); phoneCamObj.layers.enable(1);
    }
    if(!phoneCamCv.captureStream){ $('cameraHint').textContent = 'Ta przeglądarka nie obsługuje nagrywania obrazu z gry.'; return; }
    try{
      renderPhoneCamFrame();
      phoneCameraStream = phoneCamCv.captureStream(30);
      video.srcObject = phoneCameraStream;
      phoneCamIv = setInterval(renderPhoneCamFrame, 1000/30);
      $('cameraHint').textContent = cameraFacing === 'user' ? 'Aparat przedni (selfie)' : 'Aparat tylny';
      const flip = $('flipCamera'); if(flip) flip.textContent = cameraFacing === 'user' ? '🔄 Tylna' : '🔄 Przednia';
    }catch(err){ $('cameraHint').textContent = 'Nie udało się uruchomić aparatu.'; }
  }
  function stopPhoneCamera(){
    if(phoneRecorder && phoneRecorder.state !== 'inactive'){ try{phoneRecorder.stop();}catch(e){} }
    if(phoneCamIv){ clearInterval(phoneCamIv); phoneCamIv = null; }
    if(phoneCameraStream){ phoneCameraStream.getTracks().forEach(t=>t.stop()); phoneCameraStream=null; }
  }
  function capturePhonePhoto(){
    if(!phoneCameraStream || !phoneCamCv){ $('cameraHint').textContent='Poczekaj, aż aparat się uruchomi.'; return; }
    renderPhoneCamFrame();
    const data = phoneCamCv.toDataURL('image/jpeg', .88);
    phoneMedia.unshift({id:Date.now()+Math.random(),type:'photo',data,created:new Date().toLocaleString('pl-PL')});
    savePhoneMedia(); $('cameraHint').textContent='Zdjęcie zapisane w galerii! 📸';
  }
  function togglePhoneRecording(){
    const btn=$('recordVideo'), hint=$('cameraHint'); if(!phoneCameraStream){hint.textContent='Najpierw uruchom kamerę.';return;}
    if(phoneRecorder && phoneRecorder.state==='recording'){ phoneRecorder.stop(); btn.textContent='⏺ Nagraj'; return; }
    if(!window.MediaRecorder){hint.textContent='Ta przeglądarka nie obsługuje nagrywania filmów.';return;}
    try{
      recordingChunks=[]; const stream=phoneCameraStream;
      const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
      phoneRecorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      phoneRecorder.ondataavailable=e=>{if(e.data && e.data.size) recordingChunks.push(e.data);};
      phoneRecorder.onstop=()=>{const blob=new Blob(recordingChunks,{type:phoneRecorder.mimeType||'video/webm'}); const reader=new FileReader(); reader.onload=()=>{phoneMedia.unshift({id:Date.now()+Math.random(),type:'video',data:reader.result,created:new Date().toLocaleString('pl-PL')});savePhoneMedia(); if($('cameraHint')) $('cameraHint').textContent='Film zapisany w galerii! 🎬';}; reader.readAsDataURL(blob);};
      phoneRecorder.start(); recordingStartedAt=Date.now(); btn.textContent='⏹ Zakończ'; hint.textContent='Nagrywanie filmu…';
    }catch(e){hint.textContent='Nie udało się rozpocząć nagrywania.';}
  }
  function renderPhoneGallery(){
    const grid=$('galleryGrid'), empty=$('galleryEmpty'); if(!grid)return; grid.innerHTML='';
    empty.style.display=phoneMedia.length?'none':'block';
    phoneMedia.forEach(item=>{const card=document.createElement('div');card.className='gallery-item';
      const media=document.createElement(item.type==='video'?'video':'img'); media.src=item.data;
      if(item.type==='video'){media.controls=true;media.playsInline=true;} else media.alt='Zdjęcie z aparatu';
      const footer=document.createElement('div'); const label=document.createElement('span');label.textContent=(item.type==='video'?'🎬 ':'📷 ')+item.created;
      const del=document.createElement('button');del.textContent='Usuń';del.onclick=()=>{phoneMedia=phoneMedia.filter(x=>x.id!==item.id);savePhoneMedia();renderPhoneGallery();};footer.append(label,del);card.append(media,footer);grid.append(card);
    });
  }
  const shopDoor = () => Math.hypot(player.position.x - SHOP.x, player.position.z - (SHOP.z - SHOP.d/2));
  function updateShop(){
    if(shopEl.style.display === 'block' && shopNpcDist() > 6) closeShop();
    if(dlgEl.style.display === 'flex' && dlgDist() > 6) closeDialog();
    curAct = findAction();
    if(curAct){ promptEl.innerHTML = coinHTML(curAct.text); promptEl.style.display = 'block'; }
    else promptEl.style.display = 'none';
  }
  addEventListener('keydown', e => {
    if(e.repeat || isDead) return;
    if(computerUiOpen){ if(e.code === 'Escape' || e.code === 'KeyF') closeComputer(); return; }
    if(e.code === 'KeyR' && placing) rotatePlacement();
    if(e.code === 'KeyF' && placing){ confirmPlacement(); return; }
    if(e.code === 'KeyF'){
      if(shopEl.style.display === 'block') closeShop();
      else if($('fridge').style.display === 'block') closeFridge();
      else if($('wardrobe').style.display === 'block') closeWardrobe();
      else if(trunkOpen()) closeTrunk();
      else if(ovenOpen()) closeOven();
      else if(dlgEl.style.display === 'flex') closeDialog();
      else if(carDriving) return;                                               // z auta wysiada się Shiftem
      else if(curAct && !bikeMounted) curAct.run();
    }
    if(e.code === 'KeyG' && homeInside && !sitting && !placing){ const pc = nearDesk('chair') || nearDesk('wardrobe') || nearDesk('oven') || FIXT.map(k => nearDesk(k)).find(Boolean) || nearLamp(); if(pc) pickupDesk(pc); }
    if(e.code === 'KeyP') phoneEl.style.display === 'flex' ? closePhone() : openPhone();
    if(e.code === 'Escape'){ closeShop(); closePhone(); closeDialog(); closeFridge(); closeWardrobe(); cancelPlacement(); closePaintUI(true); closeHeadUI(true); }
  });

  // NPC kucharz i praca dostawcy
  const dlgEl = $('dlg');
  const job = {accepted:false, order:null, carrying:false, delivered:0};
  let curAct = null, lastHouse = null, jobTxt = '', dlgWho = 'chef';
  const npc = new THREE.Group();
  (function(){
    const nb = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshLambertMaterial({color:c})); m.position.set(x,y,z); m.castShadow = true; npc.add(m); };
    nb(0.7,0.9,0.4,0xffffff,0,1.25,0);          // koszula
    nb(0.55,0.75,0.04,0xb0302a,0,1.2,0.22);     // fartuch
    nb(0.5,0.5,0.5,0xe0ac69,0,1.95,0);          // głowa
    nb(0.54,0.14,0.54,0xc62828,0,2.27,0);       // czapka
    nb(0.3,0.06,0.02,0x222222,0,1.82,0.26);     // wąsy
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.25,0.8,0.25,0xffffff,-0.48,1.25,0); nb(0.25,0.8,0.25,0xffffff,0.48,1.25,0);
    nb(0.25,0.8,0.25,0x333333,-0.18,0.4,0); nb(0.25,0.8,0.25,0x333333,0.18,0.4,0);
  })();
  npc.position.set(REST.x, 0, REST.z - 3.35);
  scene.add(npc);
  function sprite(draw, w, h, y){
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    draw(c.getContext('2d'));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
    sp.scale.set(w, h, 1); sp.position.set(npc.position.x, y, npc.position.z); scene.add(sp); return sp;
  }
  sprite(g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Marek • kucharz', 128, 33); }, 1.7, 0.42, 2.85);
  const mark = sprite(g => { g.fillStyle = '#ffd54a'; g.strokeStyle = '#000'; g.lineWidth = 6; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('!', 128, 34); g.fillText('!', 128, 34); }, 1.0, 0.25, 3.25);
  const npcDist = () => Math.hypot(player.position.x - npc.position.x, player.position.z - npc.position.z);

  // znacznik nad domem docelowym
  const beacon = new THREE.Group(); beacon.visible = false;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7,1.3,4), new THREE.MeshBasicMaterial({color:0xffd54a}));
  cone.rotation.x = Math.PI; beacon.add(cone);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,9,12,1,true), new THREE.MeshBasicMaterial({color:0xffd54a, transparent:true, opacity:0.2, side:THREE.DoubleSide, depthWrite:false}));
  beam.position.y = 4.5; beacon.add(beam);
  scene.add(beacon);

  function say(text, buttons, who, key){
    const oldGrid = $('dlgGrid'); if(oldGrid) oldGrid.remove();     // siatka towarów (Dom i AGD) z poprzedniej rozmowy
    dlgWho = key || (who ? 'shop' : 'chef');
    $('dlgName').textContent = who || '👨‍🍳 Marek, kucharz';
    $('dlgText').innerHTML = coinHTML(text);
    const b = $('dlgBtns'); b.innerHTML = '';
    buttons.forEach(x => { const el = document.createElement('button'); el.innerHTML = coinHTML(x.label); el.onclick = x.fn; b.appendChild(el); });
    dlgEl.style.display = 'flex'; promptEl.style.display = 'none';
  }
  function closeDialog(){ dlgEl.style.display = 'none'; }
  function quitJob(){
    const k = inv.findIndex(s => s && s.id === 'order'); if(k >= 0) removeOne(k);
    job.accepted = false; job.order = null; job.carrying = false;
    renderInv(); closeDialog(); toast('Zrezygnowałeś z pracy dostawcy');
  }
  function takeOrder(){
    if(!addItem('order')){ toast('Ekwipunek pełny!'); return; }
    job.carrying = true;
    beacon.position.set(job.order.house.x, 0, job.order.house.z);
    closeDialog(); renderInv();
    toast(`Odebrano: ${job.order.food} → dom nr ${job.order.house.no}`);
  }
  function offerOrder(){
    if(!job.order){
      const pool = HOUSES.filter(x => !x.skip); let h; do { h = pool[Math.floor(Math.random()*pool.length)]; } while(h === lastHouse && pool.length > 1);
      lastHouse = h;
      const foods = ['🍕 Pizza','🍔 Burger','🍜 Zupa dnia','☕ Kawa'];
      job.order = {food: foods[Math.floor(Math.random()*foods.length)], house: h};
    }
    say(`Mam dla ciebie zamówienie: ${job.order.food}. Dowieź je do domu nr ${job.order.house.no}. Numer jest nad drzwiami.`,
      [{label:'Weź zamówienie', fn:takeOrder}, {label:'Później', fn:closeDialog}, {label:'Zrezygnuj z pracy', fn:quitJob}]);
  }
  function eatMeal(){
    if(coins() < 2){ toast('Posiłek kosztuje 2 monety 🪙 (masz ' + coins() + ')'); return; }
    if(stats.hunger > 95){ toast('Nie jesteś głodny'); return; }
    const k = inv.findIndex(s => s && s.id === 'coin');
    removeOne(k); removeOne(inv.findIndex(s => s && s.id === 'coin'));
    addStats(45, 10); renderInv(); renderShop();
    toast('Pyszny posiłek! 🍕 +45 sytości, +10 energii');
  }
  function openDialog(){
    const meal = {label:'🍕 Zjedz posiłek (2 🪙)', fn:eatMeal};
    if(!job.accepted){
      say('Cześć! Mamy mnóstwo zamówień, a nie ma kto ich dowozić. Chcesz pracę dostawcy? Za każde dostarczone zamówienie dostaniesz 4 monety 🪙.',
        [{label:'Przyjmuję pracę', fn:() => { job.accepted = true; toast('Zostałeś dostawcą 🛵'); offerOrder(); }}, meal,
         {label:'Nie, dziękuję', fn:closeDialog}]);
    } else if(job.carrying){
      say(`Masz już zamówienie (${job.order.food}) dla domu nr ${job.order.house.no}. Dowieź je, a potem wróć po następne!`,
        [meal, {label:'OK', fn:closeDialog}]);
    } else offerOrder();
  }
  function deliver(){
    const k = inv.findIndex(s => s && s.id === 'order'); if(k >= 0) removeOne(k);
    for(let i=0;i<4;i++) addItem('coin');
    job.carrying = false; job.order = null; job.delivered++;
    renderInv(); renderShop(); toast('Dostarczono! +4 🪙');
  }

  // ===== Kopalnia: górnik Staszek (praca + kilof) i teren do kopania za końcem sztolni =====
  // Podłoga jaskini (14×13 m) to gładki teren (siatka wysokości, oczko 0,2 m). Kopiesz dokładnie tam, gdzie celujesz (środek ekranu):
  // lewy przycisk myszy (lub F) = jedno uderzenie kilofa = jeden okrągły dołek w miejscu trafienia. Żadnych bloków ani kwadratów.
  const MD = {x1: MINE.x - MINE.depth, nx: 14, nz: 13, L: 8}, MD_Z0 = MINE.z - 13/2;
  const MINER = {x: MINE.x + 3.2, z: MINE.z + 3};
  const S = 0.2, NX = 70, NZ = 65, W = NZ + 1;                                  // oczko siatki i liczba oczek pola
  const SCOOP_R = 0.45, DIG = 0.25, MAXD = 7.75, DIRT_D = 2, REACH = 2.4, SWING_T = 0.3;   // promień dołka, głębokość jednego uderzenia, max głębokość, ziemia do 2 m
  const STONE_CHANCE = 0.5, STONES_PER_COIN = 8;                                // szansa na kamień przy uderzeniu w kamień
  const mining = {t:0, ax:0, az:0};                                             // t – czas animacji zamachu
  const mineNodeH = new Float32Array((NX+1)*(NZ+1)), mineNoise = new Float32Array((NX+1)*(NZ+1));   // wysokość terenu w oczkach
  const mineYEl = document.createElement('div');                                // wskaźnik wysokości Y (widoczny w kopalni)
  mineYEl.style.cssText = 'position:fixed;left:12px;bottom:162px;color:#fff;background:rgba(0,0,0,.45);padding:6px 12px;border-radius:8px;font-size:14px;line-height:1.4;pointer-events:none;display:none;z-index:8';
  document.body.appendChild(mineYEl);
  let mineMesh = null, mineMark = null, mineAway = 0, mineLast = null, mineAimC = null;
  const hasPick = () => inv.some(s => s && s.id === 'pickaxe');
  const stoneCount = () => { const s = inv.find(q => q && q.id === 'stone'); return s ? s.count : 0; };
  const minerDist = () => Math.hypot(player.position.x - MINER.x, player.position.z - MINER.z);
  const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _ray = new THREE.Raycaster(), _v2 = new THREE.Vector2(0, 0), _zAx = new THREE.Vector3(0, 0, 1);
  function setNode(k, h){                          // ustaw wysokość i kolor oczka (ziemia → kamień)
    mineNodeH[k] = h; const n = mineNoise[k];
    mineMesh.geometry.attributes.position.setY(k, h);
    const t = Math.min(1, Math.max(0, (-h - 1.8)/0.4));
    _c1.setHSL(0.075, 0.5, 0.5 + n*0.12); _c2.setHSL(0.08, 0.04, 0.62 + n*0.28); _c1.lerp(_c2, t);
    mineMesh.geometry.attributes.color.setXYZ(k, _c1.r, _c1.g, _c1.b);
  }
  function refreshMesh(){ const g = mineMesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals(); }
  function mineGround(x, z){                       // dokładnie ta sama interpolacja trójkątów co w siatce
    const fi = (MD.x1 - x)/S, fj = (z - MD_Z0)/S;
    if(fi < 0 || fj < 0 || fi > NX || fj > NZ) return null;
    const i = Math.min(Math.floor(fi), NX-1), j = Math.min(Math.floor(fj), NZ-1), u = fi - i, v = fj - j;
    const ha = mineNodeH[i*W + j], hb = mineNodeH[(i+1)*W + j], hc = mineNodeH[i*W + j+1], hd = mineNodeH[(i+1)*W + j+1];
    return u + v <= 1 ? ha + u*(hb - ha) + v*(hc - ha) : hd + (1-u)*(hc - hd) + (1-v)*(hb - hd);
  }
  function mineAim(){                              // punkt terenu, w który celujesz (środek ekranu), w zasięgu ręki
    if(!mineMesh) return null;
    camera.updateMatrixWorld(); _ray.setFromCamera(_v2, camera); _ray.far = 14;
    const hit = _ray.intersectObject(mineMesh, false)[0]; if(!hit) return null;
    const p = hit.point, pl = player.position, d = Math.hypot(p.x - pl.x, p.z - pl.z);
    if(d > REACH || d < 0.4 || p.y < pl.y - 1.6 || p.y > pl.y + 1.3) return null;
    const fi = (MD.x1 - p.x)/S, fj = (p.z - MD_Z0)/S;
    if(fi < 4 || fj < 4 || fi > NX - 4 || fj > NZ - 4) return null;             // pas przy ścianach jaskini zostaje nietknięty
    return {x:p.x, y:p.y, z:p.z, fi, fj, n:hit.face.normal.clone()};
  }
  const mineLabel = (txt, w, y, fill, big) => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if(big){ g.fillStyle = fill; g.strokeStyle = '#000'; g.lineWidth = 6; g.font = 'bold 60px sans-serif'; g.strokeText(txt, 128, 34); g.fillText(txt, 128, 34); }
    else { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = fill; g.font = 'bold 28px sans-serif'; g.fillText(txt, 128, 33); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv), transparent:true}));
    sp.scale.set(w, w/4, 1); sp.position.set(MINER.x, y, MINER.z); scene.add(sp); return sp;
  };
  const minerNpc = new THREE.Group(), minerMark = mineLabel('!', 1.0, 3.25, '#ffd54a', true);
  mineLabel('Staszek • górnik', 1.7, 2.85, '#fff');
  const mineLight = new THREE.PointLight(0xffb55a, 1.0, 17);
  (function buildDig(){
    const nb = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshLambertMaterial({color:c})); m.position.set(x,y,z); m.castShadow = true; minerNpc.add(m); };
    nb(0.7,0.9,0.4,0x5b6b80,0,1.25,0); nb(0.74,0.6,0.44,0xff7a1a,0,1.3,0); nb(0.76,0.07,0.46,0xdfe6ea,0,1.2,0);
    nb(0.5,0.5,0.5,0xd8a47f,0,1.95,0); nb(0.56,0.2,0.56,0xffcc00,0,2.27,0); nb(0.6,0.05,0.66,0xffcc00,0,2.17,0.04);
    nb(0.4,0.16,0.04,0x9e9e9e,0,1.78,0.26); nb(0.08,0.08,0.02,0,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0,0.12,2.0,0.26);
    nb(0.25,0.8,0.25,0x5b6b80,-0.48,1.25,0); nb(0.25,0.8,0.25,0x5b6b80,0.48,1.25,0); nb(0.25,0.8,0.25,0x333333,-0.18,0.4,0); nb(0.25,0.8,0.25,0x333333,0.18,0.4,0);
    nb(0.07,1.2,0.07,0x6b4a2a,0.62,1.0,0.25); nb(0.07,0.07,0.6,0x9aa5ae,0.62,1.62,0.25);
    minerNpc.position.set(MINER.x, 0, MINER.z); minerNpc.rotation.y = Math.PI/2; scene.add(minerNpc);
    WALLS.push({x:MINER.x, z:MINER.z, w:0.8, d:0.8});
    // tekstura szumu kamienia/ziemi (kolor dochodzi z koloru instancji)
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
    g.fillStyle = '#9a9a9a'; g.fillRect(0,0,64,64);
    for(let i = 0; i < 160; i++){ const v = 90 + Math.random()*110|0; g.fillStyle = `rgb(${v},${v},${v-4})`; g.fillRect(Math.random()*64|0, Math.random()*64|0, 2+Math.random()*4|0, 2+Math.random()*3|0); }
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const nn = (NX+1)*(NZ+1), P = new Float32Array(nn*3), U = new Float32Array(nn*2), IDX = [];
    for(let i = 0; i <= NX; i++) for(let j = 0; j <= NZ; j++){
      const k = i*W + j; P[k*3] = MD.x1 - i*S; P[k*3+2] = MD_Z0 + j*S; U[k*2] = i*S; U[k*2+1] = j*S; mineNoise[k] = Math.random();
    }
    for(let i = 0; i < NX; i++) for(let j = 0; j < NZ; j++){
      const a = i*W + j, b = (i+1)*W + j, c = a + 1, d = b + 1; IDX.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nn*3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setIndex(IDX);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(MD.x1 - MD.nx/2, -1, MINE.z), 14);                       // stałe ramki (teren się obniża)
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(MD.x1 - MD.nx - 1, -6, MD_Z0 - 1), new THREE.Vector3(MD.x1 + 1, 1, MD_Z0 + MD.nz + 1));
    mineMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({map:tex, vertexColors:true}));
    mineMesh.frustumCulled = false; mineMesh.receiveShadow = true; scene.add(mineMesh);
    for(let k = 0; k < nn; k++) setNode(k, 0);
    refreshMesh();
    mineMark = new THREE.Mesh(new THREE.RingGeometry(SCOOP_R*0.82, SCOOP_R, 40), new THREE.MeshBasicMaterial({color:0xffd54a, transparent:true, opacity:0.75, depthWrite:false, side:THREE.DoubleSide}));
    mineMark.visible = false; scene.add(mineMark);                                  // okrąg pokazujący, gdzie uderzy kilof
    MINE_GROUND = mineGround;
    // dziura w płaszczyźnie terenu nad polem (prostokąt = przecięcie 4 półprzestrzeni), dno z litej skały, kamienne ściany jaskini
    const hole = [[-1,0,0,MD.x1-MD.nx],[1,0,0,-MD.x1],[0,0,-1,MD_Z0],[0,0,1,-(MD_Z0+MD.nz)]].map(a => new THREE.Plane(new THREE.Vector3(a[0],a[1],a[2]), a[3]));
    renderer.localClippingEnabled = true; ground.material.clippingPlanes = hole; ground.material.clipIntersection = true;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(MD.nx, 0.06, MD.nz), new THREE.MeshLambertMaterial({color:0x2c2a27}));
    fl.position.set(MD.x1 - MD.nx/2, -MD.L - 0.03, MINE.z); scene.add(fl);
    const wm = new THREE.MeshLambertMaterial({color:0x4a4540}), cx = MD.x1 - MD.nx/2, cz = MINE.z;
    [[1,3.2,MD.nz+2,MD.x1-MD.nx-0.5,cz],[MD.nx+2,3.2,1,cx,MD_Z0-0.5],[MD.nx+2,3.2,1,cx,MD_Z0+MD.nz+0.5],[0.5,3.2,4.9,MD.x1+0.25,cz-4.55],[0.5,3.2,4.9,MD.x1+0.25,cz+4.55]].forEach(([w,h,d,x,z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h+MD.L,d), wm); m.position.set(x, (h-MD.L)/2, z); scene.add(m);   // ściany sięgają od dna dołu w górę
      if(x < MD.x1) WALLS.push({x, z, w, d});                                      // ściany wschodnie już mają kolizję (bok sztolni)
    });
    mineLight.position.set(MD.x1 - 5.5, 2.6, MINE.z); scene.add(mineLight);        // światło tworzone raz, przed pierwszym renderem
  })();
  function stopMining(){ mining.t = 0; }
  const mineBusy = () => isDead || isPaused || computerUiOpen || fullMapOpen || carDriving || bikeMounted || sitting || busRide || isSleeping || placing || dlgEl.style.display === 'flex' || !hasPick();
  function climbOut(){ player.position.set(MD.x1 + 1.5, 0, MINE.z); vy = 0; toast('Wspiąłeś się na górę 🪢'); }
  function digOnce(){                              // jedno kliknięcie = jeden dołek dokładnie tam, gdzie celujesz
    if(mining.t > 0 || mineBusy()) return;
    const a = mineAim(); if(!a) return;
    if(stats.energy < 4){ toast('Brak sił – odpocznij ⚡'); return; }
    const stone = a.y < -DIRT_D;
    if(stone && !stoneCount() && !inv.includes(null)){ toast('Ekwipunek pełny!'); return; }
    addStats(-0.04, -0.15);
    const i0 = Math.round(a.fi), j0 = Math.round(a.fj), rr = Math.ceil(SCOOP_R/S) + 1;
    for(let i = i0 - rr; i <= i0 + rr; i++) for(let j = j0 - rr; j <= j0 + rr; j++){
      if(i < 1 || j < 1 || i >= NX || j >= NZ) continue;
      const r = Math.hypot((i - a.fi)*S, (j - a.fj)*S); if(r >= SCOOP_R) continue;
      const f = 1 - r*r/(SCOOP_R*SCOOP_R), k = i*W + j;
      setNode(k, Math.max(-MAXD, mineNodeH[k] - DIG*f*f));                         // gładki, okrągły dołek
    }
    refreshMesh();
    mining.t = SWING_T; mining.ax = a.x; mining.az = a.z;
    if(stone && Math.random() < STONE_CHANCE){
      const q = inv.find(x => x && x.id === 'stone');
      if(q) q.count++; else inv[inv.indexOf(null)] = {id:'stone', count:1};
      renderInv(); toast(`🪨 +1 kamień (razem ${stoneCount()})`);
    }
  }
  function mineAction(){
    if(minerDist() < 3.4) return {text:'F – porozmawiaj z górnikiem ⛏️', run:openMinerTalk};
    if(mineAimC) return {text:'LPM / F – kop kilofem ⛏️', run:digOnce};
    const px = player.position.x;
    if(player.position.y < -1.2 && px < MD.x1 && px > MD.x1 - MD.nx) return {text:'F – wydostań się z dołu 🪢', run:climbOut};   // zabezpieczenie, gdyby dół był za głęboki
    return null;
  }
  renderer.domElement.addEventListener('pointerdown', e => { if(e.pointerType === 'mouse' && e.button === 0) digOnce(); });   // lewy przycisk myszy
    function updateMine(dt, time){
    { const ix = player.position.x, iz = player.position.z;                         // wewnątrz kopalni (sztolnia + pole kopania) – bez widocznej tekstury skał z zewnątrz
      const inside = ix < MINE.x - 0.5 && ix > MD.x1 - MD.nx - 2 && Math.abs(iz - MINE.z) < 7.5;
      if(inside !== mineRocksHidden){ mineRocksHidden = inside; MINE_ROCKS.forEach(r => r.visible = !inside); }
      const showY = ix < MINE.x + 1 && ix > MD.x1 - MD.nx - 2 && Math.abs(iz - MINE.z) < 8;   // info o poziomie Y
      if(showY){
        const y = player.position.y, d = -y, layer = d < 0.3 ? 'poziom terenu' : d < DIRT_D ? 'warstwa ziemi' : 'warstwa kamienia';
        mineYEl.innerHTML = `⛏️ Y: <b>${(Math.abs(y) < 0.05 ? 0 : y).toFixed(1)} m</b><br><span style="font-size:12px;opacity:.85">${layer} · dno: −${MD.L} m</span>`;
        mineYEl.style.display = 'block';
      } else if(mineYEl.style.display !== 'none') mineYEl.style.display = 'none'; }
    const dx = player.position.x - MINER.x, dz = player.position.z - MINER.z;
    const tgt = Math.hypot(dx, dz) < 7 ? Math.atan2(dx, dz) : Math.PI/2;
    minerNpc.rotation.y += Math.atan2(Math.sin(tgt - minerNpc.rotation.y), Math.cos(tgt - minerNpc.rotation.y))*Math.min(1, dt*5);
    minerMark.visible = !hasPick(); minerMark.position.y = 3.25 + Math.sin(time*3)*0.07;
    if(mining.t > 0) mining.t = Math.max(0, mining.t - dt);
    // gdy nie ma cię przy polu przez 2 min, teren odrasta (nie dzieje się to, gdy jesteś w dole)
    const away = player.position.x > MD.x1 + 1.5 || player.position.x < MD.x1 - MD.nx - 2 || Math.abs(player.position.z - MINE.z) > 9;
    mineAway = away ? mineAway + dt : 0;
    if(mineAway > 120){
      if(mineNodeH.some(v => v !== 0)){ for(let k = 0; k < mineNodeH.length; k++) setNode(k, 0); refreshMesh(); }
      mineAway = 0;
    }
    // limit „schodka”: nie wejdziesz na teren wyższy niż ~0,6 m ponad twoimi stopami (z dołu trzeba wyskoczyć)
    const px = player.position.x, pz = player.position.z, py = player.position.y;
    if(!carDriving && !bikeMounted && !busRide && mineLast){
      const g = mineGround(px, pz);
      if(g !== null && py < g - 0.6){
        const gx = mineGround(mineLast.x, pz), gz = mineGround(px, mineLast.z);
        if(gx === null || py >= gx - 0.6) player.position.x = mineLast.x;
        else if(gz === null || py >= gz - 0.6) player.position.z = mineLast.z;
        else { player.position.x = mineLast.x; player.position.z = mineLast.z; }
      }
    }
    mineLast = mineLast || {x:0, z:0}; mineLast.x = player.position.x; mineLast.z = player.position.z;
    // okrąg w miejscu celowania
    const near = px < MD.x1 + 3 && px > MD.x1 - MD.nx - 3 && Math.abs(pz - MINE.z) < 9;
    mineAimC = near && !mineBusy() ? mineAim() : null;
    mineMark.visible = !!mineAimC;
    if(mineAimC){ mineMark.position.set(mineAimC.x, mineAimC.y, mineAimC.z).addScaledVector(mineAimC.n, 0.03); mineMark.quaternion.setFromUnitVectors(_zAx, mineAimC.n); }
  }
  const pickGroup = new THREE.Group(); armL.add(pickGroup); pickGroup.visible = false;   // armL (x = -0,48) to anatomicznie PRAWA ręka postaci (patrzy w +Z)
  box(0.07,0.07,0.9,0x6b4a2a,0,-0.78,0.35,pickGroup); box(0.07,0.6,0.09,0x9aa5ae,0,-0.78,0.78,pickGroup);   // kilof w ręce gracza
  function mineAnimate(time){
    const px = player.position.x, inMine = px < MINE.x + 1.2 && px > MD.x1 - MD.nx - 1 && Math.abs(player.position.z - MINE.z) < 8;
    pickGroup.visible = hasPick() && (mining.t > 0 || inMine) && !bikeMounted && !carDriving && !sitting && !busRide;
    if(mining.t > 0){
      facing = Math.atan2(mining.ax - px, mining.az - player.position.z); player.rotation.y = facing;
      armL.rotation.x = -1.45 - 0.95*Math.sin((1 - mining.t/SWING_T)*Math.PI); armR.rotation.x = -0.5;   // jeden zamach = jedno uderzenie
    } else if(pickGroup.visible) armL.rotation.x = -0.35;
  }
  function takePickaxe(){ if(!addItem('pickaxe')){ toast('Ekwipunek pełny!'); return; } closeDialog(); renderInv(); toast('Dostałeś kilof ⛏️ – w głębi sztolni celuj w ziemię i klikaj lewym przyciskiem myszy'); }
  function returnPickaxe(){ const k = inv.findIndex(s => s && s.id === 'pickaxe'); if(k >= 0) inv[k] = null; stopMining(); closeDialog(); renderInv(); toast('Oddałeś kilof'); }
  function sellStones(){
    const k = inv.findIndex(s => s && s.id === 'stone'), n = k < 0 ? 0 : inv[k].count, c = Math.floor(n/STONES_PER_COIN);
    if(c < 1){ toast(`Potrzeba ${STONES_PER_COIN} kamieni na 1 monetę`); return; }
    inv[k].count -= c*STONES_PER_COIN; if(inv[k].count <= 0) inv[k] = null;
    let rest = 0; for(let i = 0; i < c; i++) if(!addItem('coin')) rest++;
    for(let i = 0; i < Math.min(rest, 40); i++) spawnItem('coin', player.position.x + (Math.random()-.5)*2, player.position.z + (Math.random()-.5)*2, 0.5);
    renderInv(); renderShop(); toast(`Sprzedano kamień: +${c} 🪙`); openMinerTalk();
  }
  function openMinerTalk(){
    const who = '⛏️ Staszek, brygadzista', n = stoneCount(), c = Math.floor(n/STONES_PER_COIN);
    if(!hasPick()){
      say(`Cześć! Brakuje mi ludzi do kopania. Dam ci kilof – za darmo. Za końcem sztolni możesz kopać prosto w podłogę: najpierw ziemia, głębiej kamień. Celuj w ziemię i kliknij lewym przyciskiem myszy – jedno kliknięcie to jeden mały dołek. Kamień skupuję: ${STONES_PER_COIN} sztuk za 1 🪙. Kopanie męczy, pilnuj energii!`,
        [{label:'Przyjmuję pracę – daj kilof', fn:takePickaxe}, {label:'Nie, dziękuję', fn:closeDialog}], who, 'miner');
    } else {
      say(`Dobrze ci idzie! Masz ${n} kamieni. ${STONES_PER_COIN} kamieni = 1 🪙. Stań przy ziemi, wyceluj w nią środkiem ekranu i kliknij lewym przyciskiem myszy (albo F) – jedno kliknięcie to jeden dołek dokładnie tam, gdzie patrzysz. Nie kop zbyt głębokich dołów, bo trudno z nich wyjść.`,
        [{label:`Sprzedaj kamień (${c} 🪙)`, fn:sellStones}, {label:'Oddaj kilof (zrezygnuj)', fn:returnPickaxe}, {label:'OK', fn:closeDialog}], who, 'miner');
    }
  }

  // ===== Upper (aplikacja w telefonie): praca kierowcy – przewozisz pasażerów swoim autem, zarobek zależy od długości trasy =====
  // Zatrudnienie wymaga własnego auta. Zlecenie: punkt odbioru (zielone A) → pasażer czeka na chodniku, wsiada, gdy podjedziesz i zwolnisz →
  // punkt docelowy (czerwone B). Oba punkty są też na minimapie i na pełnej mapie.
  const upperApp = {hired:false, done:0, earned:0, offer:null, ride:null};
  const UPPER_SPOTS = [                                                    // miejsca odbioru / celu (chodniki przy ulicach)
    ['Real Shop',18,-7.4], ['Restauracja',-4,-20.6], ['Real Bank',-23,-7.4], ['Mebelek',-44,-7.4],
    ['ul. Długa (zachód)',-68,-7.4], ['ul. Długa (zachód)',-56,-20.6], ['ul. Długa (środek)',40,-20.6],
    ['ul. Krótka',6.65,20], ['ul. Krótka',-6.65,52],
    ['ul. Poprzeczna',71.35,8], ['Mechanik',71.35,42], ['Salon samochodowy',84.65,25], ['Lakiernik',84.65,46], ['ul. Poprzeczna',84.65,58],
    ['Rondo',112,-7.4], ['ul. Społeczna',123.35,30], ['ul. Społeczna',136.65,18], ['ZARA\'Z',136.65,56],
    ['Supermarket Pandy',124,-61], ['Dom i AGD',92,-61],
    // --- nowe miejsca ---
    ['Dom A',6.65,10], ['Dom B',-6.65,19],                                  // Krótka: domy do wynajęcia (chodnik przed drzwiami)
    ['Dom C',123.35,14], ['Dom D',123.35,33], ['Dom E',123.35,52],          // Społeczna, strona zachodnia
    ['Dom F',136.65,14], ['Dom G',136.65,33],                               // Społeczna, strona wschodnia
    ['Stacja paliw',67,156.65], ['PKS (dworzec)',19,183.5],                 // wzgórze: chodnik przed stacją, plac przed budynkiem dworca
    ['ul. Górna',20,143.4], ['ul. Górna',84,143.4],                         // północny chodnik ulicy Górnej
    ['Przystanek DŁUGA',-33.25,-20.6], ['Przystanek PASAŻ',105.5,-62.8],
    ['Przystanek SPOŁECZNA',136.65,44.25], ['Przystanek GÓRNA',91,156.65],
    ['Przystanek DŁUGA',-65,-7.35], ['Przystanek SPOŁECZNA',123.35,42.5], ['Przystanek GÓRNA',91,143.35]
  ];
  const upperRoute = (a, b) => Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);       // trasa ≈ odległość „po ulicach”
  const upperFare = m => Math.max(4, Math.round(3 + m*0.08));                    // zarobek rośnie z długością trasy (ok. 1 moneta na 12 m)
  const upperBeacon = color => {
    const g = new THREE.Group(); g.visible = false;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6,1.1,4), new THREE.MeshBasicMaterial({color}));
    cone.rotation.x = Math.PI; cone.position.y = 7.2; g.add(cone);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,7,12,1,true), new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.22, side:THREE.DoubleSide, depthWrite:false}));
    beam.position.y = 3.5; g.add(beam); scene.add(g); g.userData.cone = cone; return g;
  };
  const upperPickBeacon = upperBeacon(0x43a047), upperDestBeacon = upperBeacon(0xe53935);
  function makeRiderNpc(){
    const g = new THREE.Group(), lamb = c => new THREE.MeshLambertMaterial({color:c});
    const nb = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), lamb(c)); m.position.set(x,y,z); m.castShadow = true; g.add(m); };
    const shirt = [0xe53935,0x1e88e5,0x43a047,0xfdd835,0x8e24aa,0xfb8c00,0x00acc1][Math.floor(Math.random()*7)];
    const skin = [0xe0ac69,0xc68642,0xf1c27d,0x8d5524][Math.floor(Math.random()*4)];
    const pants = [0x37474f,0x263238,0x4e342e,0x1a237e][Math.floor(Math.random()*4)];
    nb(0.7,0.9,0.4,shirt,0,1.25,0); nb(0.5,0.5,0.5,skin,0,1.95,0); nb(0.54,0.14,0.54,0x3e2723,0,2.27,0);
    nb(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); nb(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nb(0.25,0.8,0.25,shirt,-0.48,1.25,0); nb(0.25,0.8,0.25,shirt,0.48,1.25,0);
    nb(0.25,0.8,0.25,pants,-0.18,0.4,0); nb(0.25,0.8,0.25,pants,0.18,0.4,0);
    g.visible = false; scene.add(g); return g;
  }
  const upperWalkers = [];                                                  // pasażerowie wysiadający z auta i odchodzący
  const upperHud = document.createElement('div');
  upperHud.style.cssText = 'position:fixed;right:12px;top:104px;color:#fff;background:rgba(0,0,0,.45);padding:8px 12px;border-radius:8px;font-size:13px;line-height:1.5;display:none;pointer-events:none;max-width:230px;z-index:7';
  document.body.appendChild(upperHud);
  let upperHudTxt = '';
  const upperRefreshPhone = () => { if(phoneEl.style.display === 'flex' && curScreen === 'upper') showScreen('upper'); };
  function upperPay(n){
    let rest = 0;
    for(let i=0;i<n;i++) if(!addItem('coin')) rest++;
    if(rest > 0){
      if(bank.opened){ bank.balance += rest; logTx(`+${rest} 🪙 kurs Upper`); refreshPhoneBank(); }
      else for(let i=0;i<Math.min(rest,40);i++) spawnItem('coin', player.position.x + (Math.random()-.5)*2, player.position.z + (Math.random()-.5)*2, 0.5);
    }
    renderInv(); renderShop();
  }
  function upperNewOffer(){
    let a, b, tries = 0;
    do {
      a = UPPER_SPOTS[Math.floor(Math.random()*UPPER_SPOTS.length)]; b = UPPER_SPOTS[Math.floor(Math.random()*UPPER_SPOTS.length)];
    } while((a === b || upperRoute(a,b) < 70 || a[0] === b[0]) && ++tries < 60);
    const m = Math.round(upperRoute(a,b)/5)*5;
    upperApp.offer = {pickup:a, dest:b, route:m, fare:upperFare(m)};
  }
  function upperAccept(){
    const o = upperApp.offer; if(!o || !hasCar) return;
    const npc = makeRiderNpc(); npc.position.set(o.pickup[1], terrainH(o.pickup[1], o.pickup[2]), o.pickup[2]); npc.visible = true;
    upperApp.ride = {stage:'pickup', pickup:o.pickup, dest:o.dest, route:o.route, fare:o.fare, npc, boarding:false};
    upperApp.offer = null;
    toast(`Zlecenie przyjęte 🚖 Odbierz pasażera: ${o.pickup[0]} (zielone A na mapie)`);
  }
  function upperClearRide(){
    const r = upperApp.ride; if(!r) return;
    if(r.npc){ scene.remove(r.npc); }
    upperApp.ride = null; upperPickBeacon.visible = upperDestBeacon.visible = false;
  }
  function upperCancel(){
    const r = upperApp.ride; if(!r) return;
    upperClearRide(); toast('Kurs anulowany');
  }
  function upperFinish(){
    const r = upperApp.ride; if(!r) return;
    const cp = pcar.group.position, c = Math.cos(carHeading), sn = Math.sin(carHeading);
    r.npc.position.set(cp.x - c*2.0, terrainH(cp.x - c*2.0, cp.z + sn*2.0), cp.z + sn*2.0); r.npc.visible = true;       // pasażer wysiada z prawej strony auta i idzie do celu
    upperWalkers.push({mesh:r.npc, tx:r.dest[1], tz:r.dest[2], life:5});
    const fare = r.fare; upperApp.done++; upperApp.earned += fare;
    r.npc = null; upperClearRide();
    upperPay(fare);
    toast(`Kurs zakończony! +${fare} 🪙 (Upper)`);
    upperRefreshPhone();
  }
  function renderUpperScreen(head){
    const bs = c => `background:${c};color:#fff;border:0;border-radius:8px;padding:9px 10px;font-size:13px;cursor:pointer;margin-top:8px;width:100%`;
    const card = h => `<div style="background:rgba(255,255,255,.12);border-radius:12px;padding:12px;margin-bottom:10px;font-size:13px;line-height:1.45">${h}</div>`;
    let body = '';
    if(!upperApp.hired){
      body = card(`<div style="font-size:16px;font-weight:700">🚖 Upper</div><div style="opacity:.9;margin-top:4px">Zarabiaj jako kierowca: przyjmuj zlecenia, zabieraj pasażerów swoim autem i wożą ich po mieście. Im dłuższa trasa, tym więcej monet.</div>`)
        + (hasCar ? `<button data-act="hire" style="${bs('#2e7d32')}">Zatrudnij się jako kierowca</button>`
                  : `<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;font-size:12px;line-height:1.4">🔒 <b>Potrzebujesz własnego auta</b><br>Kup je w salonie samochodowym przy ulicy Poprzecznej.</div><button disabled style="${bs('#666')}">Brak auta</button>`);
    } else if(upperApp.ride){
      const r = upperApp.ride, pickup = r.stage === 'pickup';
      body = card(`<div style="font-weight:700;font-size:15px">🚖 Kurs w toku</div><div style="margin-top:6px">${pickup ? '🟢 Odbierz pasażera' : '🔴 Zawieź pasażera'}: <b>${pickup ? r.pickup[0] : r.dest[0]}</b></div><div style="opacity:.85;margin-top:2px">Trasa: ${r.route} m • Zarobek: <b>${r.fare}</b> 🪙</div><div style="opacity:.7;font-size:11px;margin-top:6px">${pickup ? 'Podjedź autem do pasażera (zielone A na mapie) i zwolnij.' : 'Zatrzymaj się przy punkcie B na mapie.'}</div>`)
        + `<button data-act="cancel" style="${bs('#c0392b')}">Anuluj kurs</button>`;
    } else if(upperApp.offer){
      const o = upperApp.offer, dp = Math.round(Math.hypot(player.position.x - o.pickup[1], player.position.z - o.pickup[2])/5)*5;
      body = card(`<div style="font-weight:700;font-size:15px">Nowe zlecenie</div><div style="margin-top:6px">🟢 Odbiór: <b>${o.pickup[0]}</b> <span style="opacity:.7">(${dp} m od ciebie)</span></div><div>🔴 Cel: <b>${o.dest[0]}</b></div><div style="opacity:.85;margin-top:4px">Trasa: ${o.route} m</div><div style="font-size:16px;margin-top:4px">Zarobek: <b>${o.fare}</b> 🪙</div>`)
        + (hasCar ? `<button data-act="accept" style="${bs('#2e7d32')}">Przyjmij zlecenie</button>` : `<button disabled style="${bs('#666')}">Potrzebujesz auta</button>`)
        + `<button data-act="decline" style="${bs('rgba(255,255,255,.2)')}">Odrzuć i szukaj innego</button>`;
    } else {
      body = card(`<div style="font-weight:700;font-size:15px">🚖 Kierowca Upper</div><div style="opacity:.85;margin-top:4px">Zrealizowane kursy: <b>${upperApp.done}</b><br>Zarobione łącznie: <b>${upperApp.earned}</b> 🪙</div>`)
        + (hasCar ? `<button data-act="search" style="${bs('#3a7bd5')}">🔍 Szukaj zlecenia</button>` : `<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:10px;font-size:12px">🔒 Bez auta nie przyjmiesz zleceń.</div>`);
    }
    screenEl.innerHTML = head('🚖 Upper') + `<div class="pbody">${body}</div>`.replace(/🪙/g, '<i class="coin"></i>');
    screenEl.querySelectorAll('[data-act]').forEach(btn => btn.onclick = () => {
      const a = btn.dataset.act;
      if(a === 'hire'){ if(!hasCar) return; upperApp.hired = true; toast('Zatrudniono w Upper 🚖 Możesz przyjmować zlecenia'); }
      else if(a === 'search') upperNewOffer();
      else if(a === 'decline') upperNewOffer();
      else if(a === 'accept') upperAccept();
      else if(a === 'cancel') upperCancel();
      showScreen('upper');
    });
  }
  function upperMapMarks(){
    const r = upperApp.ride; if(!r) return [];
    return r.stage === 'pickup' ? [{x:r.pickup[1], z:r.pickup[2], label:'A', color:'#2e9e4f', name:r.pickup[0]}]
                                : [{x:r.dest[1], z:r.dest[2], label:'B', color:'#e53935', name:r.dest[0]}];
  }
  function updateUpper(dt, time){
    for(let i = upperWalkers.length-1; i >= 0; i--){                       // pasażerowie odchodzący po kursie
      const w = upperWalkers[i]; w.life -= dt;
      const dx = w.tx - w.mesh.position.x, dz = w.tz - w.mesh.position.z, d = Math.hypot(dx,dz);
      if(d > 0.3){ w.mesh.position.x += dx/d*Math.min(d, 2.6*dt); w.mesh.position.z += dz/d*Math.min(d, 2.6*dt); w.mesh.rotation.y = Math.atan2(dx,dz); }
      w.mesh.position.y = terrainH(w.mesh.position.x, w.mesh.position.z);
      if(w.life <= 0){ scene.remove(w.mesh); upperWalkers.splice(i,1); }
    }
    const r = upperApp.ride;
    upperPickBeacon.visible = !!r && r.stage === 'pickup';
    upperDestBeacon.visible = !!r && r.stage === 'dest';
    let txt = '';
    if(r){
      const cp = pcar.group.position, slow = Math.abs(carV) < 2.5;
      if(r.stage === 'pickup'){
        upperPickBeacon.position.set(r.pickup[1], terrainH(r.pickup[1], r.pickup[2]), r.pickup[2]); upperPickBeacon.userData.cone.position.y = 7.2 + Math.sin(time*3)*0.35;
        const dcar = Math.hypot(cp.x - r.npc.position.x, cp.z - r.npc.position.z);
        if(!r.boarding && carDriving && dcar < 9 && slow){ r.boarding = true; toast('Pasażer idzie do auta 🚶'); }
        if(r.boarding && (dcar > 20 || !hasCar)) r.boarding = false;
        const tx = r.boarding ? cp.x : r.pickup[1], tz = r.boarding ? cp.z : r.pickup[2];
        const dx = tx - r.npc.position.x, dz = tz - r.npc.position.z, d = Math.hypot(dx,dz);
        if(d > 0.3){ const st = Math.min(d, 3.2*dt); r.npc.position.x += dx/d*st; r.npc.position.z += dz/d*st; r.npc.rotation.y = Math.atan2(dx,dz); }
        r.npc.position.y = terrainH(r.npc.position.x, r.npc.position.z);
        if(r.boarding && d < 1.6){                                          // pasażer wsiadł
          r.stage = 'dest'; r.npc.visible = false; r.boarding = false;
          toast(`Pasażer wsiadł 🚖 Zawieź go: ${r.dest[0]} (czerwone B na mapie)`); upperRefreshPhone();
        }
        const dd = Math.round(Math.hypot(cp.x - r.pickup[1], cp.z - r.pickup[2])/5)*5;
        txt = `🚖 Upper<br>🟢 Odbierz pasażera: ${r.pickup[0]}<br>Odległość: ${dd} m<br>Zarobek: ${r.fare} 🪙`;
      } else {
        upperDestBeacon.position.set(r.dest[1], terrainH(r.dest[1], r.dest[2]), r.dest[2]); upperDestBeacon.userData.cone.position.y = 7.2 + Math.sin(time*3)*0.35;
        const d = Math.hypot(cp.x - r.dest[1], cp.z - r.dest[2]);
        if(carDriving && d < 8 && slow){ upperFinish(); return; }
        txt = `🚖 Upper – pasażer na pokładzie<br>🔴 Cel: ${r.dest[0]}<br>Odległość: ${Math.round(d/5)*5} m<br>Zarobek: ${r.fare} 🪙`;
      }
    }
    if(txt !== upperHudTxt){ upperHudTxt = txt; upperHud.style.display = txt ? 'block' : 'none'; upperHud.innerHTML = coinHTML(txt); }
  }
  function svApplyUpper(u){
    upperClearRide(); upperApp.offer = null;
    upperApp.hired = !!(u && u.h); upperApp.done = u ? Math.max(0, u.n|0) : 0; upperApp.earned = u ? Math.max(0, u.e|0) : 0;
  }
  // ===== Zakupy w Supermarkecie Pandy: koszyk, towary z regałów, płatność przy kasie =====
  const SUP_PRODUCTS = {apple:{n:'Jabłko',i:'🍎',p:2}, cola:{n:'Cola',i:'🥤',p:3}, bread:{n:'Chleb',i:'🍞',p:4}, computer:{n:'Komputer',i:'🖥️',p:100}, phone:{n:'Telefon',i:'📱',p:5}, charger:{n:'Ładowarka',i:'🔌',p:8}, pizzafrozen:{n:'Pizza mrożona',i:'🍕',p:6}};
  let basket = null;                        // null = brak koszyka; w koszyku: {id: liczba}
  const basketMesh = new THREE.Group();
  (function(){
    const mk = (w,h,d,c,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshLambertMaterial({color:c})); m.position.set(x,y,z); basketMesh.add(m); };
    mk(0.32,0.2,0.22,0xd32f2f,0,0,0); mk(0.34,0.03,0.24,0x8e1b1b,0,0.11,0);
    mk(0.03,0.2,0.03,0x555555,-0.14,0.22,0); mk(0.03,0.2,0.03,0x555555,0.14,0.22,0); mk(0.31,0.03,0.03,0x555555,0,0.33,0);
    basketMesh.position.set(0.55,0.8,0.12); basketMesh.visible = false; body.add(basketMesh);
  })();
  const basketHud = document.createElement('div'); basketHud.id = 'basketHud'; document.body.appendChild(basketHud);
  const basketTotal = () => Object.entries(basket || {}).reduce((t,[id,n]) => t + SUP_PRODUCTS[id].p*n, 0);
  function renderBasket(){
    basketMesh.visible = !!basket;
    if(!basket){ basketHud.style.display = 'none'; return; }
    const entries = Object.entries(basket);                           // podgląd koszyka: kwadraty z ikonkami jak w ekwipunku
    const slots = entries.map(([id,n]) => `<div class="slot" title="${SUP_PRODUCTS[id].n} (${SUP_PRODUCTS[id].p * n} monet)">${SUP_PRODUCTS[id].i}<span class="n">×${n}</span><span class="pr">${SUP_PRODUCTS[id].p * n}<i class="coin"></i></span></div>`).join('');
    basketHud.innerHTML = '<b>🧺 Koszyk</b>' + (entries.length ? `<div class="bgrid">${slots}</div><b>Razem: ${basketTotal()} <i class="coin"></i></b>` : '<div>pusty</div>');
    basketHud.style.display = 'block';
  }
  function takeBasket(){ basket = {}; renderBasket(); toast('Wziąłeś koszyk 🧺 – dodawaj towary z regałów i zapłać przy kasie'); }
  function returnBasket(){ basket = null; renderBasket(); toast('Odłożono koszyk'); }
  function putInBasket(id){
    const def = SUP_PRODUCTS[id];
    if(id === 'phone' && (hasPhone() || phoneDocked || basket.phone)){ toast('Masz już telefon'); return; }
    basket[id] = (basket[id] || 0) + 1; renderBasket(); toast(`Włożono do koszyka: ${def.i} ${def.n}`);
  }
  function payBasket(){
    const total = basketTotal();
    if(coins() < total){ toast(`Brakuje ${total - coins()} monet 🪙 (razem ${total}, masz ${coins()})`); return; }
    const ids = Object.keys(basket), need = ids.filter(id => !inv.some(x => x && x.id === id)).length;
    if(need > freeSlots()){ toast('Ekwipunek pełny – zrób miejsce przed zapłatą'); return; }
    for(let i=0;i<total;i++) removeOne(inv.findIndex(x => x && x.id === 'coin'));
    ids.forEach(id => { for(let i=0;i<basket[id];i++) addItem(id); });
    basket = null; renderBasket(); renderInv();
    toast(`Zapłacono ${total} 🪙 – dziękujemy za zakupy w Pandy! 🐼`);
  }
  function supShelfProduct(){                // towar, który leży przy graczu (regały mają strefy)
    const px = player.position.x - SUPER.x, zr = player.position.z - SUPER.z;
    if(zr < -9.2 && Math.abs(px) < 7.5) return 'cola';            // lodówka przy tylnej ścianie
    if(zr < -9.2 && px >= 7.5 && px < 19) return 'pizzafrozen';   // mrożonki w prawej części lodówki
    if(zr < -9.5 || zr > 3.8) return null;
    if(px > -5.3 && px < -3.2) return zr < -3 ? 'apple' : 'bread';
    if(px > 3.2 && px < 5.3) return zr < -5.5 ? 'computer' : zr < -1.15 ? 'phone' : 'charger';
    return null;
  }
  function supermarketAction(){
    if(!supInside) return null;
    const px = player.position.x - SUPER.x, zr = player.position.z - SUPER.z;
    if(Math.hypot(px + 4.9, zr - 10.2) < 3.2){
      if(!basket) return {text:'F – weź koszyk 🧺', run:takeBasket};
      if(!Object.keys(basket).length) return {text:'F – odłóż koszyk', run:returnBasket};
    }
    const id = supShelfProduct();
    if(id){
      const def = SUP_PRODUCTS[id];
      if(!basket) return {text:'Najpierw weź koszyk przy wejściu 🧺', run:() => toast('Weź koszyk przy wejściu 🧺')};
      return {text:`F – włóż ${def.i} ${def.n} do koszyka (${def.p} 🪙)`, run:() => putInBasket(id)};
    }
    if(basket && Object.keys(basket).length && zr > 2.8 && zr < 5.8 && [8,13,18].some(lx => Math.abs(px - lx) < 2.4))
      return {text:`F – zapłać za zakupy (${basketTotal()} 🪙)`, run:payBasket};
    return null;
  }
  function findAction(){
    if(paintUiOpen || headUiKind) return null;
    if(shopEl.style.display === 'block' || dlgEl.style.display === 'flex' || $('fridge').style.display === 'block' || $('wardrobe').style.display === 'block' || trunkOpen() || ovenOpen()) return null;
    if(placing) return null;
    if(busRide){                                                                  // pasażer autobusu: wysiadka tylko przy otwartych drzwiach
      if(BUS.door > 0.6) return {text:'F – wysiądź z autobusu 🚌', run:() => leaveBus(false)};
      return {text:'🚌 Autobus jedzie – wysiądziesz na przystanku', run:() => {}};
    }
    if(sitting && sitting.kind === 'bathtub') return {text:'F – wyjdź z wanny  •  rośnie higiena 🛁', run:standUp};
    if(sitting){
      let pcDesk = null, bestPc = 3.6;
      for(const pd of placedDesks){
        if((pd.kind || 'desk') !== 'desk' || !pd.computer) continue;
        const d = Math.hypot(player.position.x-pd.wall.x, player.position.z-pd.wall.z);
        if(d < bestPc){ bestPc = d; pcDesk = pd; }
      }
      if(pcDesk) return {text:computerUiOpen ? 'F – zamknij komputer' : 'F – włącz komputer 🖥️', run:turnOnComputer};
      return {text:sitting.kind === 'bathtub' ? 'F – wyjdź z wanny' : sitting.kind === 'bench' ? 'F – wstań z ławki' : 'F – wstań z krzesła', run:standUp};
    }
    if(carDriving) return {text:'Shift – wysiądź z auta 🚗', run:()=>{}};
    { const ba = busBoardAction(); if(ba) return ba; }                           // F przy otwartych drzwiach autobusu
    if(!bikeMounted && !homeInside){ let bb = null, bd = 1.7; for(const b of BENCH_SEATS){ const d = Math.hypot(player.position.x - b.x, player.position.z - b.z); if(d < bd){ bd = d; bb = b; } } if(bb) return {text:'F – usiądź na ławce 🪑', run:() => sitOn(bb.pd)}; }   // ławka na przystanku
    { const fa = fuelAction(); if(fa) return fa; }                              // dystrybutor ma pierwszeństwo przed „wsiądź do auta”
    if(trunkNearRear() && !bikeMounted) return {text:'F – otwórz bagażnik 🧳', run:openTrunk};
    if(hasCar && Math.hypot(player.position.x-pcar.group.position.x, player.position.z-pcar.group.position.z) < 3.6 && !bikeMounted) return {text:'F – wsiądź do auta 🚗', run:enterCar};
    if(bikeMounted) return {text:'Shift – zsiądź z roweru',run:dismountBike};
    if(bikePurchased && Math.hypot(player.position.x-bike.position.x,player.position.z-bike.position.z)<2.6)
      return {text:'F – wsiądź na rower',run:mountBike};
    { const sa = supermarketAction(); if(sa) return sa; }
    if(job.carrying){
      const h = job.order.house;
      if(Math.hypot(player.position.x - h.dx, player.position.z - h.dz) < 3.2)
        return {text:`F – dostarcz zamówienie (dom nr ${h.no})`, run:deliver};
    }
    for(const H of HOMES){                                  // drzwi domów: z zewnątrz i od środka (wynajem / otwieranie)
      const dp = homeDoorPos(H);
      if(Math.hypot(player.position.x-dp.x, player.position.z-dp.z) < 2.2) return homeDoorAction(H);
    }
    if(homeInside){
      const fp = homeW(HOME.lay.fridge.x, HOME.lay.fridge.z), bp = homeW(HOME.lay.bed.x, HOME.lay.bed.z);
      const fridgeDist=Math.hypot(player.position.x-fp.x,player.position.z-fp.z);
      const bedDist=Math.hypot(player.position.x-bp.x,player.position.z-bp.z);
      if(nearOutlet()<1.8){
        if(!chargerPlugged){ if(inv.some(x=>x&&x.id==='charger')) return {text:'F – podłącz ładowarkę do gniazdka 🔌',run:plugCharger}; }
        else if(chargerHome !== homeCur){}
        else if(phoneDocked) return {text:`F – zabierz telefon z ładowarki 📱 (${Math.floor(phoneBattery)}%${phoneBattery>=100?' – naładowany':' – ładuje się'})`,run:takePhone};
        else if(hasPhone()) return {text:'F – podłącz telefon do ładowania 📱',run:dockPhone};
      }
      if(fridgeDist<2.2) return {text:'F – otwórz lodówkę',run:openFridge};
      if(bedDist<2.5) return {text:'F – połóż się spać',run:()=>{
        closeDialog();
        isSleeping = true;
        keys.KeyF = false;
        keys.ShiftLeft = false;
        keys.ShiftRight = false;
        joy.x = 0; joy.y = 0;
        // położenie postaci w łóżku: na plecach, głową przy wezgłowiu
        const bp = homeW(HOME.lay.sleep.x, HOME.lay.sleep.z);
        player.position.set(bp.x, 0, bp.z); vy = 0;
        player.rotation.y = HOME.rot; facing = HOME.rot;
        body.rotation.x = -Math.PI/2; body.position.set(0, 1.0, 0);
        upper.rotation.x = 0; legL.rotation.x = legR.rotation.x = armL.rotation.x = armR.rotation.x = 0;
        promptEl.textContent = 'Shift – wstań z łóżka'; promptEl.style.display = 'block';
        toast('Śpisz… Przytrzymaj Shift, aby wstać 🛏️');
      }};
      const pch = nearDesk('chair'); if(pch) return {text:'F – usiądź na krześle  •  G – podnieś', run:() => sitOn(pch)};
      const pwd = nearDesk('wardrobe'); if(pwd) return {text:'F – otwórz szafę  •  G – podnieś', run:openWardrobe};
      const pov = nearDesk('oven'); if(pov) return {text:'F – użyj piekarnika 🍳  •  G – podnieś', run:() => openOven(pov)};
      const pbt = nearDesk('bathtub'); if(pbt) return {text:'F – wejdź do wanny 🛁 (higiena)  •  G – podnieś', run:() => sitOn(pbt)};
      const pfx = FIXT.map(k => nearDesk(k)).find(Boolean); if(pfx) return {text:`F – podnieś: ${ITEMS[pfx.kind].n} ${ITEMS[pfx.kind].i}`, run:() => pickupDesk(pfx)};
      const plp = nearLamp(); if(plp) return {text:'F – zdejmij lampę 💡', run:() => pickupDesk(plp)};
      const pdk = nearDesk(); if(pdk && pdk.computer) return {text:'F – podnieś komputer 🖥️', run:() => pickupComputer(pdk)};
      if(pdk) return {text: pdk.kind === 'chair' ? 'F – podnieś krzesło' : 'F – podnieś biurko', run:() => pickupDesk(pdk)};
    }
    { const na = nbrAction(); if(na) return na; }
    { const ma = mineAction(); if(ma) return ma; }
    if(restInside && npcDist() < 3.4) return {text:'F – porozmawiaj z kucharzem', run:openDialog};
    if(shopInside && shopNpcDist() < 3.4) return {text:'F – porozmawiaj ze sprzedawczynią', run:openShopTalk};
    if(bankInside && bankNpcDist() < 3.4) return {text:'F – porozmawiaj z bankierem', run:openBankTalk};
    if(furnInside && furnNpcDist() < 3.4) return {text:'F – porozmawiaj ze sprzedawcą mebli', run:openFurnTalk};
    if(agdInside && agdNpcDist() < 4.2) return {text:'F – porozmawiaj ze sprzedawcą AGD 🔌', run:openAgdTalk};
    if(mechInside && mechNpcDist() < 4.2) return {text:'F – porozmawiaj z mechanikiem 🔧', run:openMechTalk};
    if(paintInside && paintNpcDist() < 3.4) return {text:'F – porozmawiaj z lakiernikiem 🎨', run:openPaintTalk};
    if(carInside && carNpcDist() < 3.4) return {text:'F – porozmawiaj z doradcą salonu', run:openCarTalk};
    if(clothInside && clothNpcDist() < 3.4) return {text:'F – porozmawiaj ze sprzedawczynią ubrań', run:openClothTalk};
    return null;
  }
  function updateJob(dt, time){
    const dx = player.position.x - npc.position.x, dz = player.position.z - npc.position.z;
    const target = (restInside && Math.hypot(dx,dz) < 7) ? Math.atan2(dx, dz) : 0;
    npc.rotation.y += Math.atan2(Math.sin(target - npc.rotation.y), Math.cos(target - npc.rotation.y)) * Math.min(1, dt*5);
    deliveryBackpack.visible = !!job.carrying;                                   // zielony plecak, gdy niesiesz zamówienie
    mark.visible = !job.carrying; mark.position.y = 3.25 + Math.sin(time*3)*0.07;
    beacon.visible = job.carrying;
    if(job.carrying) cone.position.y = 9.6 + Math.sin(time*3)*0.4;
    let txt = '';
    if(job.accepted){
      if(job.carrying){
        const h = job.order.house, m = Math.round(Math.hypot(player.position.x - h.dx, player.position.z - h.dz)/5)*5;
        txt = `Dostarczono: ${job.delivered}<br>📦 ${job.order.food} → dom nr ${h.no}<br>Odległość: ${m} m`;
      } else txt = `Dostarczono: ${job.delivered}<br>Odbierz zamówienie u kucharza`;
    }
    if(txt !== jobTxt){ jobTxt = txt; $('job').style.display = txt ? 'block' : 'none'; $('jobInfo').innerHTML = txt; }
  }

  // ===== Henryk – sąsiad z domu nr 7 =====
  // Mieszka w domu nr 7 (nie da się do niego wejść). Wg zegara gry wychodzi na zakupy do Real Shop i na spacery po chodniku,
  // a gdy jest w domu – można zapukać (F). Przy wyjściu z domu / na chodniku można z nim porozmawiać (F).
  const nbH7 = HOUSES.find(h => h.no === 7);
  const NB_DOOR = {x:nbH7.dx, z:nbH7.dz - 0.55};
  const NB_LANE = -6.5;                                   // pas chodnika, którym chodzi (chodnik: z -8,85 … -5,85)
  // Wyjazd autobusem: czeka na przystanku DŁUGA (południowa strona Długiej, kilka metrów od jego domu), wsiada do autobusu linii 1
  // i wysiada na losowym przystanku trasy; po chwili „wraca innym autobusem” (znika), a po jakimś czasie jest znów w domu.
  const NB_BUS_STOP = BUS_STOPS.find(s => s.name === 'DŁUGA' && s.x < -60);
  const NB_BUS_WAIT = {x:NB_BUS_STOP.x - 0.3, z:-7.4};          // chodnik tuż przy jezdni, naprzeciwko drzwi stojącego autobusu
  const NB_BUS_MAX_WAIT = 480, NB_BUS_AWAY = [70, 120];          // s: jak długo czeka na autobus zanim zrezygnuje; jak długo go nie ma po wysiadce
  const NB_TRIPS = [
    {id:'bus',   from:11,   to:17.4, goal:NB_BUS_WAIT, bus:true, what:'czekam na autobus – chcę się gdzieś przejechać'},
    {id:'shop',  from:8.5,  to:11,   goal:{x:SHOP.x, z:NB_LANE}, enter:{x:SHOP.x, z:SHOP.z - SHOP.d/2 - 0.1}, stay:18, bag:true,  what:'idę na zakupy do Real Shop'},
    {id:'walk1', from:12.5, to:15,   goal:{x:-16, z:NB_LANE}, stay:10, what:'wyszedłem na spacer'},
    {id:'walk2', from:17.5, to:19.5, goal:{x:8,   z:NB_LANE}, stay:10, what:'wyszedłem na wieczorny spacer'}
  ];
  const NB = {state:'home', rideIdx:-1, target:null, trip:null, route:[], trail:[], pi:0, wait:0, done:{}, bag:false, apples:2, chats:0, chatDay:-1, giftDay:-1, tip:0, ph:0, baseYaw:0};
  const nbr = new THREE.Group(), nbParts = {};
  (function(){
    const box = (w,h,d,c,x,y,z,parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshLambertMaterial({color:c})); m.position.set(x,y,z); m.castShadow = true; (parent||nbr).add(m); return m; };
    const limb = (w,h,d,c,x,y) => { const p = new THREE.Group(); p.position.set(x,y,0); box(w,h,d,c,0,-h/2,0,p); nbr.add(p); return p; };
    box(0.7,0.9,0.4,0x5b7b9a,0,1.25,0);                   // sweter
    box(0.5,0.5,0.5,0xe3b07e,0,1.95,0);                   // głowa
    box(0.52,0.14,0.52,0xd6d6d6,0,2.2,-0.02);             // siwe włosy
    box(0.56,0.08,0.5,0x6d4c41,0,2.31,0.02);              // kaszkiet
    box(0.4,0.04,0.2,0x6d4c41,0,2.25,0.3);                // daszek
    box(0.3,0.06,0.02,0xbdbdbd,0,1.82,0.26);              // siwe wąsy
    box(0.08,0.08,0.02,0x000000,-0.12,2.0,0.26); box(0.08,0.08,0.02,0x000000,0.12,2.0,0.26);
    nbParts.armL = limb(0.25,0.8,0.25,0x5b7b9a,-0.48,1.65);
    nbParts.armR = limb(0.25,0.8,0.25,0x5b7b9a, 0.48,1.65);
    nbParts.legL = limb(0.25,0.8,0.25,0x3b3b3b,-0.18,0.8);
    nbParts.legR = limb(0.25,0.8,0.25,0x3b3b3b, 0.18,0.8);
    nbParts.bag = box(0.34,0.4,0.18,0x8bc34a,0,-0.85,0.12,nbParts.armR); nbParts.bag.visible = false;   // torba z zakupami
  })();
  nbr.visible = false; scene.add(nbr);
  const nbLabel = (function(){
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48); g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Henryk • sąsiad', 128, 33);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true}));
    sp.scale.set(1.7, 0.42, 1); sp.visible = false; scene.add(sp); return sp;
  })();
  const nbHour = () => ((START_HOUR/24 + gameElapsed/DAY_SECONDS) % 1) * 24;
  const nbDay  = () => Math.floor(START_HOUR/24 + gameElapsed/DAY_SECONDS);
  const nbrDist = () => Math.hypot(player.position.x - nbr.position.x, player.position.z - nbr.position.z);
  const nbTurn = (yaw, dt, k) => { nbr.rotation.y += Math.atan2(Math.sin(yaw - nbr.rotation.y), Math.cos(yaw - nbr.rotation.y)) * Math.min(1, dt*k); };
  const nbFacePlayer = dt => nbTurn(Math.atan2(player.position.x - nbr.position.x, player.position.z - nbr.position.z), dt, 6);
  function nbShow(v){ nbr.visible = v; nbLabel.visible = v; }
  function nbPlace(p){ nbr.position.set(p.x, 0, p.z); }
  function nbStep(dt, target){                            // idzie do punktu; true = dotarł
    const dx = target.x - nbr.position.x, dz = target.z - nbr.position.z, d = Math.hypot(dx, dz), sp = 2.1*dt;
    if(d <= sp){ nbr.position.x = target.x; nbr.position.z = target.z; return true; }
    nbr.position.x += dx/d*sp; nbr.position.z += dz/d*sp;
    nbTurn(Math.atan2(dx, dz), dt, 8);
    for(const t of treeColl){                             // omija słupki i latarnie
      const ox = nbr.position.x - t.x, oz = nbr.position.z - t.z;
      if(Math.abs(ox) > 2 || Math.abs(oz) > 2) continue;
      const dd = Math.hypot(ox, oz), min = t.r + 0.4;
      if(dd < min && dd > 0.0001){ nbr.position.x = t.x + ox/dd*min; nbr.position.z = t.z + oz/dd*min; }
    }
    NB.moving = true; return false;
  }
  function nbStart(t){
    NB.trip = t; NB.done[nbDay() + ':' + t.id] = true; NB.bag = false;
    nbPlace(NB_DOOR); nbr.rotation.y = Math.PI; nbShow(true);                    // wychodzi z drzwi (twarzą do ulicy)
    NB.route = [{x:NB_DOOR.x, z:NB_LANE}, t.goal].concat(t.enter ? [t.enter] : []);
    NB.trail = [{x:NB_DOOR.x, z:NB_DOOR.z}]; NB.pi = 0; NB.state = 'out';
  }
  function nbBack(){ NB.route = NB.trail.slice().reverse(); NB.pi = 0; NB.state = 'back'; }
  // autobus linii 1 stoi na przystanku DŁUGA (południowa strona, jazda na wschód) z otwartymi drzwiami
  const nbBusAtStop = () => BUS.active && BUS.dwell > 1.6 && BUS.door > 0.5 && Math.abs(BUS.group.position.x - NB_BUS_STOP.x) < 9
    && Math.abs(BUS.group.position.z - TRAFFIC_LANE_E) < 4 && Math.cos(BUS.heading) > 0.5;
  function nbAlight(forced){                          // wysiada tylnymi drzwiami (lub tam, gdzie kurs się skończył) i idzie do najbliższego przystanku
    const d = forced ? {x:nbr.position.x, z:nbr.position.z} : busToWorld(BUS_DOORS_X[1], 2.4);
    nbr.position.set(d.x, terrainH(d.x, d.z), d.z); nbShow(true);
    let best = null, bd = Infinity;
    for(const s of BUS_STOPS){
      const rot = s.rot || 0, q = {x:s.x + 1.7*Math.sin(rot), z:s.z + 1.7*Math.cos(rot)}, dd = Math.hypot(q.x - d.x, q.z - d.z);
      if(dd < bd){ bd = dd; best = q; }
    }
    NB.target = best || d; NB.state = 'alight';
  }
  function updateNeighbor(dt, time){
    const hour = nbHour(), day = nbDay();
    const talking = dlgEl.style.display === 'flex' && dlgWho === 'nbr';
    NB.moving = false;
    const late = hour >= 20.7 || hour < 6;
    switch(NB.state){
      case 'home':
        if(!late) for(const t of NB_TRIPS){ if(!NB.done[day + ':' + t.id] && hour >= t.from && hour < t.to){ nbStart(t); break; } }
        break;
      case 'door':                                        // otworzył na pukanie; po rozmowie wraca do środka
        nbFacePlayer(dt);
        if(talking) NB.wait = 2.5; else if((NB.wait -= dt) <= 0){ nbShow(false); NB.state = 'home'; }
        break;
      case 'out':
        if(late){ nbBack(); break; }
        if(talking){ nbFacePlayer(dt); break; }
        if(nbStep(dt, NB.route[NB.pi])){
          NB.trail.push(NB.route[NB.pi]); NB.pi++;
          if(NB.pi >= NB.route.length){
            NB.wait = NB.trip.stay; NB.baseYaw = nbr.rotation.y;
            if(NB.trip.bus){ NB.wait = NB_BUS_MAX_WAIT; NB.state = 'busWait'; }
            else if(NB.trip.enter){ nbShow(false); NB.state = 'inside'; } else NB.state = 'idle';
          }
        }
        break;
      case 'idle':                                        // stoi i rozgląda się
        if(talking) nbFacePlayer(dt); else { nbTurn(NB.baseYaw + Math.sin(time*0.8)*0.9, dt, 3); NB.wait -= dt; }
        if(NB.wait <= 0 || late) nbBack();
        break;
      case 'inside':                                      // w sklepie
        if((NB.wait -= dt) <= 0){ NB.bag = !!NB.trip.bag; nbShow(true); nbBack(); }
        break;
      case 'busWait':                                     // stoi na przystanku i czeka na autobus linii 1
        if(late){ nbBack(); break; }
        if(talking){ nbFacePlayer(dt); break; }
        if(!nbStep(dt, NB_BUS_WAIT)) break;
        nbTurn(Math.PI + Math.sin(time*0.6)*0.5, dt, 3);          // patrzy w stronę jezdni, skąd nadjeżdża autobus
        if(nbBusAtStop()){ NB.state = 'toBus'; break; }
        if((NB.wait -= dt) <= 0) nbBack();                         // za długo – rezygnuje i wraca do domu
        break;
      case 'toBus': {                                     // autobus stoi z otwartymi drzwiami – idzie do drzwi i wsiada
        if(!nbBusAtStop()){ NB.state = 'busWait'; break; }
        const d = busToWorld(BUS_DOORS_X[0], 2.3);
        nbStep(dt, d);
        if(Math.hypot(d.x - nbr.position.x, d.z - nbr.position.z) < 0.9){
          const stops = []; for(let i = BUS.wp; i < BUS_ROUTE.length; i++) if(BUS_ROUTE[i][2]) stops.push(i);
          NB.rideIdx = stops.length ? stops[Math.floor(Math.random()*stops.length)] : -1;   // losowy przystanek z reszty trasy
          NB.state = 'ride';
        }
        break; }
      case 'ride':                                        // jedzie w środku autobusu (stoi przy tylnych drzwiach)
        if(!BUS.active){ nbAlight(true); break; }
        { const w = busToWorld(-1.6, 0.9);
          nbr.position.set(w.x, BUS.group.position.y + BUS_YF*Math.cos(BUS.pitch) - 1.6*Math.sin(BUS.pitch), w.z);
          nbr.rotation.y = Math.PI/2 - BUS.heading; }
        if(BUS.dwell > 0 && BUS.door > 0.5 && BUS.wp - 1 >= NB.rideIdx) nbAlight(false);
        break;
      case 'alight':                                      // wysiadł – idzie pod wiatę przystanku
        if(talking){ nbFacePlayer(dt); break; }
        if(nbStep(dt, NB.target)){ NB.state = 'busIdle'; NB.wait = 14 + Math.random()*10; NB.baseYaw = nbr.rotation.y; }
        nbr.position.y = terrainH(nbr.position.x, nbr.position.z);
        break;
      case 'busIdle':                                     // rozgląda się po okolicy, a potem odjeżdża innym autobusem
        if(talking) nbFacePlayer(dt); else { nbTurn(NB.baseYaw + Math.sin(time*0.8)*0.9, dt, 3); NB.wait -= dt; }
        nbr.position.y = terrainH(nbr.position.x, nbr.position.z);
        if(NB.wait <= 0){ nbShow(false); NB.state = 'away'; NB.wait = NB_BUS_AWAY[0] + Math.random()*(NB_BUS_AWAY[1] - NB_BUS_AWAY[0]); }
        break;
      case 'away':                                        // wraca „innym autobusem” – w tym czasie nie ma go w domu
        if((NB.wait -= dt) <= 0) NB.state = 'home';
        break;
      case 'back':
        if(talking){ nbFacePlayer(dt); break; }
        if(nbStep(dt, NB.route[NB.pi])){
          NB.pi++;
          if(NB.pi >= NB.route.length){
            nbShow(false); NB.state = 'home';
            if(NB.bag){ NB.apples = Math.min(4, NB.apples + 2); NB.bag = false; }
          }
        }
        break;
    }
    // animacja chodu + pozycja podpisu
    if(NB.moving) NB.ph += dt*8;
    const sw = NB.moving ? Math.sin(NB.ph) : 0, k = Math.min(1, dt*10);
    nbParts.legL.rotation.x += (sw*0.7 - nbParts.legL.rotation.x)*k;
    nbParts.legR.rotation.x += (-sw*0.7 - nbParts.legR.rotation.x)*k;
    nbParts.armL.rotation.x += (-sw*0.5 - nbParts.armL.rotation.x)*k;
    nbParts.armR.rotation.x += ((NB.bag ? -0.25 : sw*0.5) - nbParts.armR.rotation.x)*k;
    nbParts.bag.visible = NB.bag;
    if(nbr.visible) nbLabel.position.set(nbr.position.x, 2.85 + nbr.position.y, nbr.position.z);
  }
  // --- rozmowa ---
  const nbCanTalk = () => nbr.visible && nbrDist() < 3.2;
  const nbOutdoors = () => !homeInside && !restInside && !shopInside && !bankInside && !furnInside && !agdInside && !mechInside && !paintInside && !carInside && !clothInside;
  function nbrAction(){
    if(!nbOutdoors()) return null;
    if(nbCanTalk()) return {text:'F – porozmawiaj z Henrykiem 👋', run:() => openNbrTalk(false)};
    if(NB.state === 'home' && Math.hypot(player.position.x - nbH7.dx, player.position.z - nbH7.dz) < 2.4) return {text:'F – zapukaj do domu nr 7 🚪', run:knockNbr};
    if(NB.state === 'away' && Math.hypot(player.position.x - nbH7.dx, player.position.z - nbH7.dz) < 2.4) return {text:'F – zapukaj do domu nr 7 🚪', run:() => toast('Pukasz… nikt nie otwiera. Henryk pojechał autobusem 🚌')};
    return null;
  }
  function knockNbr(){
    const h = nbHour();
    if(h < 7 || h >= 21){ toast('Pukasz… nikt nie otwiera. Pewnie już śpi 😴'); return; }
    nbPlace(NB_DOOR); nbShow(true); nbr.rotation.y = Math.PI; NB.state = 'door'; NB.wait = 2.5; NB.moving = false;
    toast('Pukasz do drzwi… 🚪');
    openNbrTalk(true);
  }
  function nbMenu(text){
    const day = nbDay(), btns = [
      {label:'Jak się masz?', fn:() => nbMenu(nbHowAreYou())},
      {label:'Co słychać w okolicy?', fn:() => nbMenu(nbNews())}
    ];
    if(NB.chats >= 3 && NB.apples > 0 && NB.giftDay !== day) btns.push({label:'🍎 Poproś o jabłko', fn:nbGift});
    btns.push({label:'Do widzenia', fn:closeDialog});
    say(text, btns, '🧓 Henryk, sąsiad (dom nr 7)', 'nbr');
  }
  function nbHowAreYou(){
    const h = nbHour();
    const pool = h < 12 ? ['Świetnie, kawa wypita, można żyć!', 'Rano człowiek ma najwięcej sił. A ty jak się trzymasz?']
      : h < 18 ? ['Nie narzekam. Po obiedzie dobrze się chodzi.', 'Dobrze, dziękuję. Dzień zleciał jakoś szybko.']
      : ['Zmęczony, ale zadowolony. Wieczór to najlepsza pora dnia.', 'Powoli myślę o kolacji i łóżku.'];
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function nbNews(){
    const tips = [
      'W sklepie „Real Shop” kupisz telefon za 5 monet, a rower za 25. Rower to wygoda, polecam 🚲',
      'Marek, kucharz, szuka dostawców. Płaci 4 monety za każde dostarczone zamówienie. Ja mam już nogi nie te, ale tobie się przyda.',
      'W banku założysz konto za darmo – dostaniesz numer rachunku i saldo w aplikacji w telefonie.',
      'Dbaj o siebie: jedz i śpij na czas. Ja zawsze mam w domu coś w lodówce.',
      'Supermarket jest otwarty od ósmej do dwudziestej drugiej, więc zakupy lepiej robić w dzień.'
    ];
    return tips[NB.tip++ % tips.length];
  }
  function nbGift(){
    if(!addItem('apple')){ toast('Ekwipunek pełny!'); return; }
    NB.apples--; NB.giftDay = nbDay(); renderInv();
    toast('Henryk dał ci jabłko 🍎');
    nbMenu('Masz, poczęstuj się. Prosto z mojej torby – tylko nie mów nikomu, że rozdaję! 😄');
  }
  function openNbrTalk(atDoor){
    const h = nbHour(), day = nbDay(), hello = h < 18 ? 'Dzień dobry!' : 'Dobry wieczór!';
    const first = NB.chats === 0;
    if(NB.chatDay !== day){ NB.chatDay = day; NB.chats++; }
    let act = '';
    if(atDoor || NB.state === 'door') act = 'Akurat byłem w domu.';
    else if(NB.state === 'out') act = NB.trip && NB.trip.what ? `Właśnie ${NB.trip.what}.` : '';
    else if(NB.state === 'idle') act = 'Postanowiłem zaczerpnąć trochę świeżego powietrza.';
    else if(NB.state === 'busWait' || NB.state === 'toBus') act = 'Czekam na autobus – wybieram się na małą przejażdżkę.';
    else if(NB.state === 'ride') act = 'Jadę autobusem. Sam jeszcze nie wiem, na którym przystanku wysiądę – lubię niespodzianki!';
    else if(NB.state === 'alight' || NB.state === 'busIdle') act = 'Wysiadłem sobie na przystanku, rozglądam się po okolicy.';
    else if(NB.state === 'back') act = NB.bag ? 'Wracam ze sklepu – kupiłem trochę zapasów.' : 'Wracam już do domu.';
    nbMenu(first ? `${hello} Jestem Henryk, mieszkam pod siódemką – to ten dom z numerem nad drzwiami. ${act} Ty chyba tu nowy?`
                 : `${hello} Miło cię widzieć! ${act}`);
  }

  // Przedmioty leżące w świecie
  const worldItems = [];
  function spawnItem(id, x, z, cool, color){
    const def = ITEMS[id], ccol = color !== undefined ? color : def.color, m = new THREE.MeshLambertMaterial({color:ccol});
    let mesh;
    if(id === 'apple') mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22,12,10), m);
    else if(id === 'coin') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.05,16), m); mesh.rotation.x = Math.PI/2; }
    else if(id === 'key') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.1,0.1), m);
    else if(id === 'wood') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.6,8), m);
    else if(id === 'phone') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.45,0.04), m);
    else if(id === 'cap'){ mesh = buildCapGroup(ccol); mesh.scale.setScalar(1.1); }
    else if(id === 'pants'){
      mesh = new THREE.Group();
      const pw2 = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.1,0.18), m); pw2.position.y = 0.3;
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.17,0.4,0.16), m), pr = pl.clone();
      pl.position.set(-0.1,0.1,0); pr.position.set(0.1,0.1,0); mesh.add(pw2, pl, pr);
    }
    else if(id === 'shoes'){
      mesh = new THREE.Group(); const sm = new THREE.MeshLambertMaterial({color:shoeSole(ccol)});
      [-0.13, 0.13].forEach(ox => {
        const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.12,0.38), m); t1.position.set(ox, 0.11, 0);
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.21,0.05,0.4), sm); s1.position.set(ox, 0.025, 0); mesh.add(t1, s1);
      });
    }
    else if(id === 'shirt'){
      mesh = new THREE.Group();
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.45,0.2), m); st.position.y = 0.25;
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.3,0.16), m), sr = sl.clone();
      sl.position.set(-0.26,0.3,0); sr.position.set(0.26,0.3,0); sl.rotation.z = 0.5; sr.rotation.z = -0.5;
      mesh.add(st, sl, sr);
    }
    else { mesh = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.04,12), m), t = new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.19,0.25,12), m); t.position.y = 0.14; mesh.add(b, t); }
    const holder = new THREE.Group(); holder.add(mesh);
    // jasna poświata pod przedmiotem
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35,0.5,20), new THREE.MeshBasicMaterial({color:0xffffaa, transparent:true, opacity:.6, side:THREE.DoubleSide}));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.04 - 0.5;
    holder.add(ring);
    holder.position.set(x, 0.6, z);
    mesh.castShadow = true;
    scene.add(holder);
    worldItems.push({id, color, holder, mesh, cool: cool||0, ph: Math.random()*6});
  }
  // Kapelusze nie leżą już na mapie – kupisz je w sklepie z ubraniami przy ulicy Społecznej.
  function updateItems(dt, time){
    for(let i = worldItems.length-1; i >= 0; i--){
      const w = worldItems[i];
      w.holder.position.y = 0.6 + Math.sin(time*2 + w.ph)*0.1;
      w.mesh.rotation.y += dt*2;
      if(w.cool > 0){ w.cool -= dt; continue; }
      const dx = player.position.x - w.holder.position.x, dz = player.position.z - w.holder.position.z;
      if(dx*dx + dz*dz < 1.6 && player.position.y < 1.2){
        if(addItem(w.id, w.color)){
          scene.remove(w.holder); worldItems.splice(i,1);
          toast(`Podniesiono: ${ITEMS[w.id].i} ${ITEMS[w.id].n}`);
          if(invEl.style.display === 'block') renderInv();
        } else if(!updateItems.warned){ toast('Ekwipunek pełny!'); updateItems.warned = true; setTimeout(()=>updateItems.warned=false, 2500); }
      }
    }
  }

  // Cykl dnia i nocy: 20 minut rzeczywistych = 24 godziny w grze (start o 8:00)
  const DAY_SECONDS = 20*60, START_HOUR = 8;
  let gameClock = '08:00';
  const skyU = sky.material.uniforms;
  const moon = new THREE.DirectionalLight(0x7f95d8, 0);
  scene.add(moon, moon.target);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(14,16,12), new THREE.MeshBasicMaterial({color:0xfff2b0, fog:false}));
  const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(10,16,12), new THREE.MeshBasicMaterial({color:0xdfe6ff, fog:false}));
  scene.add(sunDisc, moonDisc);
  const starPos = new Float32Array(1000*3);
  for(let i=0;i<1000;i++){
    const v = new THREE.Vector3(Math.random()-.5, Math.random()-.5, Math.random()-.5).normalize().multiplyScalar(370);
    starPos.set([v.x, v.y, v.z], i*3);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({color:0xffffff, size:2, sizeAttenuation:false, transparent:true, opacity:0, fog:false, depthWrite:false}));
  stars.frustumCulled = false; scene.add(stars);
  // ===== Światła auta gracza: L – reflektory (przód: realne światło na drodze + jaśniejsze lampy), tył: pozycyjne / hamowania / cofania =====
  let nightLevel = 0, headOn = false, headK = 0;
  const headSpot = new THREE.SpotLight(0xfff1cf, 0, 60, 0.6, 0.55, 1);        // jedno światło tworzone raz (liczba świateł w scenie jest stała)
  headSpot.castShadow = false; scene.add(headSpot, headSpot.target);
  const HEAD_OFF = new THREE.Color(0xb9b08a), HEAD_ON = new THREE.Color(0xffffff);
  const TAIL_OFF = new THREE.Color(0x7a1010), TAIL_POS = new THREE.Color(0xc01818), TAIL_BRAKE = new THREE.Color(0xff3a3a), TAIL_REV = new THREE.Color(0xf2f2f2);
  function setHeadlights(v){ headOn = v; toast(v ? 'Światła włączone 💡 (L)' : 'Światła wyłączone (L)'); }
  addEventListener('keydown', e => {
    if(e.code !== 'KeyL' || e.repeat || isDead || isPaused || !carDriving) return;
    setHeadlights(!headOn);
  });
  function updateCarLights(dt){
    const vis = hasCar && pcar.group.visible;
    headK += ((vis && headOn ? 1 : 0) - headK)*Math.min(1, dt*10);                // płynne zapalanie
    const p = pcar.group.position, sn = Math.sin(carHeading), cs = Math.cos(carHeading);
    headSpot.intensity = headK*(2.4 + 1.2*nightLevel);
    if(headK > 0.01){
      headSpot.position.set(p.x + sn*2.1, p.y + 0.85, p.z + cs*2.1);
      headSpot.target.position.set(p.x + sn*16, p.y + 0.35 - carPitch*16, p.z + cs*16);
      headSpot.target.updateMatrixWorld();
    }
    pcar.headMat.color.copy(HEAD_OFF).lerp(HEAD_ON, headK);
    const braking = carDriving && (keys.Space || handbrake || ((keys.KeyS || keys.ArrowDown) && carV > 0.3));
    const reversing = carDriving && carV < -0.2;
    const tc = braking ? TAIL_BRAKE : headOn ? TAIL_POS : TAIL_OFF;
    pcar.tailMat.color.copy(reversing && !braking ? TAIL_REV : tc);
  }
  // nocne światła we wnętrzach
  const restLight = new THREE.PointLight(0xffd9a0, 0, 13); restLight.position.set(REST.x, 3.0, REST.z);
  const shopLight = new THREE.PointLight(0xfff0d0, 0, 12); shopLight.position.set(SHOP.x, 3.0, SHOP.z);
  scene.add(restLight, shopLight);
  // okna świecą w nocy
  const glowMats = new Set();
  scene.traverse(o => { if(o.isMesh && o.material && o.material.emissive && o.material.color && o.material.color.getHex() === 0x9fd3f0) glowMats.add(o.material); });

  const C = c => new THREE.Color(c);
  const PAL = {topDay:C(0x2f7fd8), topNight:C(0x050a1c), horDay:C(0xcfe8f5), horNight:C(0x0c1430), duskHor:C(0xff9a5a), duskTop:C(0x5a5a9a),
    sunLow:C(0xff8040), sunHigh:C(0xfff2d0), hemiNight:C(0x5a6fb0), hemiDay:C(0xffffff), gndNight:C(0x182418), gndDay:C(0x6a9a50),
    cloudNight:C(0x2a3350), cloudDay:C(0xffffff), cloudDusk:C(0xffb080), discHigh:C(0xfff6c8)};
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const tv = new THREE.Vector3();
  function updateDayNight(time){
    const phase = (START_HOUR/24 + time/DAY_SECONDS) % 1;
    const a = (phase - 0.25) * Math.PI * 2, elev = Math.sin(a), cosA = Math.cos(a);
    const x = clamp01((elev + 0.1)/0.4), day = x*x*(3 - 2*x), night = 1 - day;
    nightLevel = night;                                                           // używane przez światła auta gracza
    const dusk = clamp01(1 - Math.abs(elev)/0.3);
    const p = player.position, cp = camera.position;

    // niebo i mgła
    skyU.top.value.copy(PAL.topNight).lerp(PAL.topDay, day).lerp(PAL.duskTop, dusk*0.35);
    skyU.bottom.value.copy(PAL.horNight).lerp(PAL.horDay, day).lerp(PAL.duskHor, dusk*0.75);
    scene.fog.color.copy(skyU.bottom.value);

    // słońce
    tv.set(cosA, Math.max(elev, 0.14), 0.35).normalize();
    sun.position.set(p.x + tv.x*80, p.y + tv.y*80, p.z + tv.z*80);
    sun.intensity = 0.95*day;
    sun.color.copy(PAL.sunLow).lerp(PAL.sunHigh, clamp01(elev/0.5));
    // księżyc
    tv.set(-cosA, Math.max(-elev, 0.14), -0.35).normalize();
    moon.position.set(p.x + tv.x*80, p.y + tv.y*80, p.z + tv.z*80);
    moon.target.position.copy(p);
    moon.intensity = 0.4*night;
    // światło otoczenia
    hemi.intensity = 0.18 + 0.52*day;
    hemi.color.copy(PAL.hemiNight).lerp(PAL.hemiDay, day);
    hemi.groundColor.copy(PAL.gndNight).lerp(PAL.gndDay, day);

    // tarcze słońca i księżyca oraz gwiazdy
    tv.set(cosA, elev, 0.35).normalize();
    sunDisc.position.set(cp.x + tv.x*330, cp.y + tv.y*330, cp.z + tv.z*330);
    sunDisc.visible = elev > -0.2;
    sunDisc.material.color.copy(PAL.sunLow).lerp(PAL.discHigh, clamp01(elev/0.4));
    moonDisc.position.set(cp.x - tv.x*330, cp.y - tv.y*330, cp.z - tv.z*330);
    moonDisc.visible = elev < 0.2;
    stars.position.copy(cp); stars.rotation.z = a;
    stars.material.opacity = clamp01(night*1.2 - 0.1); stars.visible = stars.material.opacity > 0.01;

    // chmury
    cloudMat.color.copy(PAL.cloudNight).lerp(PAL.cloudDay, day).lerp(PAL.cloudDusk, dusk*0.4);
    // wnętrza i okna
    restLight.intensity = shopLight.intensity = bankLight.intensity = furnLight.intensity = clothLight.intensity = carLight.intensity = paintLight.intensity = mechLight.intensity = 1.0*night;
    lampPool.forEach(l => l.intensity = l.userData.used ? 1.25 + 0.75*night : 0);   // lampy w domu
    updateStreetLamps(night, p);   // lampy uliczne
    glowMats.forEach(m => m.emissive.setRGB(1, 0.78, 0.4).multiplyScalar(night*0.85));

    // zegar
    const mins = Math.floor(phase*1440), str = String(Math.floor(mins/60)).padStart(2,'0') + ':' + String(mins%60).padStart(2,'0');
    if(str !== gameClock || !updateDayNight.init){
      updateDayNight.init = true; gameClock = str;
      const icon = dusk > 0.45 ? '🌅' : (elev > 0 ? '☀️' : '🌙');
      $('clock').textContent = icon + ' ' + str;
      $('pclock').textContent = str;
    }
  }

  // Sterowanie
  const keys = {};
  addEventListener('keydown', e => {
    if(e.code==='Space') e.preventDefault();
    if(e.code==='KeyV' && !e.repeat && !isPaused && !isDead){
      firstPerson = !firstPerson;
      body.visible = true;
      refreshInteriorWallVisibility();
      toast(firstPerson ? 'Kamera pierwszoosobowa' : 'Kamera trzecioosobowa');
    }
    if(!isPaused) keys[e.code] = true;
  });
  addEventListener('keyup', e => keys[e.code] = false);
  // Przyciski dotykowe: sprint (przytrzymaj) i skok – można używać obu naraz (wielodotyk)
  if('ontouchstart' in window){
    [['runBtn',76,'ShiftLeft','⚡'],['jumpBtn',14,'Space','⤒']].forEach(([id,left,code,icon])=>{
      const b = document.createElement('button');
      b.id = id; b.className = 'actBtn'; b.textContent = icon; b.style.left = left+'px'; b.style.bottom = '166px';   /* nad minimapą */ b.style.display = 'block';
      b.setAttribute('aria-label', id === 'runBtn' ? 'Sprint' : 'Skok');
      const down = e => { e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(_){} if(!isPaused) keys[code] = true; b.classList.add('on'); };
      const up = e => { e.preventDefault(); keys[code] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      ['pointerup','pointercancel','lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
      b.addEventListener('contextmenu', e => e.preventDefault());
      document.body.appendChild(b);
    });
  }
  let yaw = 0, pitch = 0.45, dist = 8, sens = 2;
  const minPitch = () => firstPerson ? -1.35 : -Math.asin(Math.min(1, 1.3/Math.max(dist, 1.3)));   // w 3. osobie kamera nie zejdzie pod ziemię
  let firstPerson = false;
  function refreshInteriorWallVisibility(){
    const insideStates = [
      [restWallMat, restInside],
      [shopWallMat, shopInside],
      [bankWallMat, bankInside],
      [furnWallMat, furnInside],
      [clothWallMat, clothInside],
      [carWallMat, carInside],
      [paintWallMat, paintInside],
      [mechWallMat, mechInside],
      [homeWallMat, homeInside]
    ];
    for(const [material, inside] of insideStates){
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
    }
  }
  const joy = {x:0,y:0};
  let camPtr = null, joyPtr = null, lx = 0, ly = 0;
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  if('ontouchstart' in window) stick.style.display = 'block';

  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => {
    if(e.pointerType==='mouse'){
      if(document.pointerLockElement === el) return;
      if(!uiBlocking()){ if(el.requestPointerLock) el.requestPointerLock(); return; }
    }
    el.setPointerCapture(e.pointerId);
    if(e.pointerType==='touch' && e.clientX >= innerWidth/2){ joyPtr = e.pointerId; }
    else { camPtr = e.pointerId; lx = e.clientX; ly = e.clientY; }
  });
  el.addEventListener('pointermove', e => {
    if(e.pointerId === camPtr && (e.pointerType !== 'mouse' || uiBlocking())){
      yaw -= (e.clientX-lx)*0.005*sens;
      pitch = Math.min(1.4, Math.max(minPitch(), pitch + (e.clientY-ly)*0.005*sens*(firstPerson ? -1 : 1)));
      lx = e.clientX; ly = e.clientY;
    } else if(e.pointerId === joyPtr){
      const r = stick.getBoundingClientRect();
      let dx = e.clientX-(r.left+55), dy = e.clientY-(r.top+55);
      const l = Math.hypot(dx,dy), m = 45;
      if(l>m){dx*=m/l; dy*=m/l;}
      joy.x = dx/m; joy.y = dy/m;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    }
  });
  document.addEventListener('mousemove', e => {
    if(!uiBlocking()){
      yaw -= e.movementX * 0.0025 * sens;
      pitch = Math.min(1.35, Math.max(minPitch(), pitch + e.movementY * 0.0025 * sens * (firstPerson ? -1 : 1)));
    }
  });
  // Kursor znika i kamera podąża za myszką; gdy otwarte jest jakieś okno (sklep, ekwipunek, telefon...), kursor wraca
  function uiBlocking(){
    if(isDead || isPaused || computerUiOpen || fullMapOpen || placing) return true;
    return ['shop','dlg','phone','fridge','wardrobe','trunk','ovenUI','inv','placeUI','paintUI','headUI','playerMenu'].some(id => {
      const e = document.getElementById(id);
      return e && getComputedStyle(e).display !== 'none';
    });
  }
  document.addEventListener('pointerdown', e => {
    if(e.pointerType !== 'mouse' || document.pointerLockElement === el || uiBlocking()) return;
    try{ const r = el.requestPointerLock(); if(r && r.catch) r.catch(() => {}); }catch(err){}
  });
  // Esc: pauza / wznowienie (gdy otwarte jest okno, Esc tylko je zamyka)
  addEventListener('keydown', e => {
    if(e.code !== 'Escape' || e.repeat) return;
    if(isPaused){ setPaused(false); e.stopImmediatePropagation(); return; }
    if(!uiBlocking()) setPaused(true);
  }, true);
  // Esc przy zablokowanym kursorze nie wysyła klawisza do strony – wtedy pauzujemy po utracie blokady
  document.addEventListener('pointerlockchange', () => {
    if(document.pointerLockElement !== el && !uiBlocking()) setPaused(true);
  });
  let relockAfterUi = false;
  setInterval(() => {
    const blocked = uiBlocking(), locked = document.pointerLockElement === el;
    if(blocked && locked){ document.exitPointerLock(); relockAfterUi = true; }
    else if(!blocked && !locked && relockAfterUi){
      relockAfterUi = false;
      try{ const r = el.requestPointerLock(); if(r && r.catch) r.catch(() => {}); }catch(err){}
    }
  }, 100);
  setTimeout(() => { try{ toast('Kamerą sterujesz myszką. Kliknij ekran, aby kręcić bez końca (Esc – kursor)'); }catch(err){} }, 1200);
  const end = e => {
    if(e.pointerId===camPtr) camPtr = null;
    if(e.pointerId===joyPtr){ joyPtr = null; joy.x = joy.y = 0; knob.style.transform = ''; }
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', e => { if(!firstPerson) dist = Math.min(20, Math.max(3, dist + e.deltaY*0.01)); e.preventDefault(); }, {passive:false});

  addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Pętla gry
  let vy = 0, walkT = 0, facing = 0, riderBlend = 0, pedalT = 0;
  // Start gry: postać pojawia się w domu gracza, tuż za drzwiami, zwrócona w głąb pokoju
  (function spawnAtHome(){
    const sp = homeW(0, HOME.d/2 + 2.2);                     // przed drzwiami Domu A (dom trzeba najpierw wynająć)
    player.position.set(sp.x, 0, sp.z);
    yaw = -Math.PI/2;                      // kamera za plecami, "do przodu" = w głąb domu
    facing = Math.atan2(-Math.sin(yaw), -Math.cos(yaw));
    player.rotation.y = facing;
  })();
  const clock = new THREE.Clock();
  let gameElapsed = 0;
  let isSleeping = false;
  let shiftPrev = false;
  const SLEEP_TIME_MULTIPLIER = 20;
  // Kamera pierwszo- lub trzecioosobowa (także podczas snu)
  const eyeTmp = new THREE.Vector3();
  function updateCamera(){
    const p = player.position;
    const inCab = firstPerson && carDriving && hasCar;
    if(pcar.interior){ pcar.cabin.visible = pcar.glassBand.visible = !inCab; pcar.interior.visible = inCab; }
    if(firstPerson) camera.layers.disable(1); else camera.layers.enable(1);   // w 1. osobie bez głowy
    body.visible = !(firstPerson && isSleeping);                              // podczas snu w 1. osobie ciała nie pokazujemy (kamera byłaby w łóżku)
    if(inCab){
      const c = Math.cos(carHeading), sn = Math.sin(carHeading), lx = 0.42, lz = -0.12;         // oczy kierowcy: lewa strona, lekko za środkiem
      const ex = p.x + lx*c + lz*sn, ez = p.z - lx*sn + lz*c;
      const ey = p.y + 1.5, tl = carPitch*Math.cos(yaw - carHeading);   // przechył auta pochyla widok, gdy patrzysz do przodu
      camera.position.set(ex, ey, ez);
      camera.lookAt(ex - Math.sin(yaw)*Math.cos(pitch), ey + Math.sin(pitch + tl), ez - Math.cos(yaw)*Math.cos(pitch));
    } else if(firstPerson){
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), fo = 0.22;                 // oczy na płaszczyźnie twarzy, lekko przed tułowiem
      let eyeY = p.y + 1.96;                                                    // wysokość oczu awatara na stojąco (oczy modelu: 0,8 + 1,18)
      if(!isSleeping){ player.updateMatrixWorld(true); eyeY = upper.localToWorld(eyeTmp.set(0, 1.18, 0)).y; }   // dokładnie na wysokości oczu – także na siedząco i na rowerze
      const ex = p.x + fx*fo, ez = p.z + fz*fo;
      camera.position.set(ex, eyeY, ez);
      camera.lookAt(ex + fx*Math.cos(pitch), eyeY + Math.sin(pitch), ez + fz*Math.cos(pitch));
    } else {
      pitch = Math.max(pitch, minPitch());                                         // także po zmianie zoomu / przełączeniu kamery
      const cx3 = p.x + Math.sin(yaw)*Math.cos(pitch)*dist, cz3 = p.z + Math.cos(yaw)*Math.cos(pitch)*dist;
      camera.position.set(cx3, Math.max(p.y + 1.6 + Math.sin(pitch)*dist, terrainH(cx3, cz3) + 0.3), cz3);   // nie pod terenem
      camera.lookAt(p.x, p.y + 1.5, p.z);
    }
    sun.target.position.copy(p);
    sky.position.copy(camera.position);
    ground.position.x = Math.round(p.x/10)*10; ground.position.z = Math.round(p.z/10)*10;
  }
  // Rozgrzewka shaderów: kompilacja z odkrytymi ukrytymi obiektami, żeby nie było przycinki przy pierwszym pokazaniu
  (function prewarm(){
    const hid=[...HOMES.flatMap(H=>[H.charger,H.phone]),hat,capG,bike].filter(o=>o&&!o.visible);
    hid.forEach(o=>o.visible=true);
    try{ renderer.compile(scene,camera); }catch(e){}
    hid.forEach(o=>o.visible=false);
  })();
  // ===== MULTIPLAYER: pokoje (kod 4 znaki) przez Firebase, most IMP_BRIDGE z głównej strony =====
  const MP_SERVERS = [{code:'SRV1',name:'Serwer 1'},{code:'SRV2',name:'Serwer 2'},{code:'SRV3',name:'Serwer 3'},{code:'SRV4',name:'Serwer 4'},{code:'SRV5',name:'Serwer 5'}];
  const MP_ROOT = 'rlRooms', MP_MAX = 8, MP_SEND_MS = 200, MP_BEAT_MS = 5000, MP_STALE_MS = 20000;
  const mp = {room:null, uid:null, nick:'Gracz', me:null, pl:null, handler:null, remotes:{}, lastSend:0, last:{x:0,y:0,z:0,r:0,c:''}};
  const mpEl = {btn:$('mpBtn'), panel:$('mpPanel'), off:$('mpOff'), on:$('mpOn'), code:$('mpCode'), room:$('mpRoomCode'), list:$('mpList'), msg:$('mpMsg')};
  function mpBridge(){ try{ return window.parent && window.parent !== window ? window.parent.IMP_BRIDGE : null; }catch(e){ return null; } }
  function mpMsg(t){ mpEl.msg.textContent = t || ''; }
  function mpTorsoCol(){ try{ return '#'+upper.children[0].material.color.getHexString(); }catch(e){ return '#2d6cdf'; } }
  // Domyślny kolor koszulki (tułów + ramiona) = kolor konta gracza z IMP_BRIDGE.acc(); kupiona koszulka go przesłania
  let accShirtKey = null;
  function applyAccountShirt(){
    try{
      const B = mpBridge(); const a = (B && B.acc && B.acc()) || {};
      const v = a.color !== undefined ? a.color : (a.col !== undefined ? a.col : (a.colour !== undefined ? a.colour : (a.kolor !== undefined ? a.kolor : (a.avatarColor !== undefined ? a.avatarColor : a.accountColor))));
      if(v === undefined || v === null || v === '') return;
      const key = String(v); if(key === accShirtKey) return;
      accShirtCol = new THREE.Color(typeof v === 'number' ? v : String(v).trim()).getHex();
      accShirtKey = key;
      refreshShirt();
    }catch(e){}
  }
  applyAccountShirt(); setInterval(applyAccountShirt, 2000);   // most bywa gotowy chwilę po starcie; reaguje też na zmianę koloru konta
  function mpMakeRemote(){
    const g = new THREE.Group(), m = c => new THREE.MeshLambertMaterial({color:c});
    const add = (w,h,d,c,x,y,z,p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m(c)); b.position.set(x,y,z); b.castShadow = true; (p||g).add(b); return b; };
    const torso = add(0.7,0.9,0.4,0x2d6cdf,0,1.25,0);
    add(0.5,0.5,0.5,0xf1c27d,0,1.95,0); add(0.52,0.15,0.52,0x4a2c12,0,2.25,-0.02);
    add(0.08,0.08,0.02,0,-0.12,1.98,0.26); add(0.08,0.08,0.02,0,0.12,1.98,0.26);
    const limb = (x,y,c) => { const p = new THREE.Group(); p.position.set(x,y,0); g.add(p); add(0.25,0.8,0.25,c,0,-0.4,0,p); return p; };
    const armL = limb(-0.48,1.65,0x2d6cdf), armR = limb(0.48,1.65,0x2d6cdf), legL = limb(-0.18,0.8,0x333333), legR = limb(0.18,0.8,0x333333);
    [legL, legR].forEach(l => { add(0.29,0.12,0.4,0x1d1d1f,0,-0.73,0.06,l); add(0.3,0.05,0.42,0xe8e8e8,0,-0.775,0.06,l); });   // buty
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv), transparent:true, depthTest:false}));
    tag.scale.set(2.4,0.6,1); tag.position.y = 2.9; tag.renderOrder = 10; g.add(tag);
    scene.add(g);
    return {g, torso, armL, armR, legL, legR, tag, cv, name:'', tx:0, ty:0, tz:0, tr:0, seen:Date.now(), t:null, phase:0, init:false, arms:[armL.children[0].material, armR.children[0].material]};
  }
  function mpDrawTag(R, name){
    R.name = name; const g = R.cv.getContext('2d'); g.clearRect(0,0,256,64);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0,8,256,48);
    g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 128, 33);
    R.tag.material.map.needsUpdate = true;
  }
  function mpRemoveRemote(id){ const R = mp.remotes[id]; if(!R) return; scene.remove(R.g); R.g.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material){ if(o.material.map) o.material.map.dispose(); o.material.dispose(); } }); delete mp.remotes[id]; }
  function mpRenderList(){
    const rows = [`<div><i style="background:${mpTorsoCol()}"></i><b>${mp.nick}</b> (ty)</div>`];
    for(const id in mp.remotes) rows.push(`<div><i style="background:${mp.remotes[id].col||'#888'}"></i>${mp.remotes[id].name}</div>`);
    mpEl.list.innerHTML = rows.join('');
    mpEl.btn.textContent = mp.room ? `👥 ${rows.length} • ${mp.room}` : '🌐 Multiplayer';
  }
  function mpOnPlayers(snap){
    const v = snap.val() || {}, now = Date.now();
    for(const id in v){
      if(id === mp.uid || !v[id] || typeof v[id] !== 'object') continue;
      const d = v[id];
      let R = mp.remotes[id];
      if(!R){ R = mp.remotes[id] = mpMakeRemote(); }
      if(R.t !== d.t){ R.t = d.t; R.seen = now; }
      R.tx = +d.x || 0; R.ty = +d.y || 0; R.tz = +d.z || 0; R.tr = +d.r || 0;
      if(!R.init){ R.init = true; R.g.position.set(R.tx, R.ty, R.tz); R.g.rotation.y = R.tr; }
      const nm = String(d.n || 'Gracz').slice(0,16);
      if(nm !== R.name) mpDrawTag(R, nm);
      if(/^#[0-9a-f]{6}$/i.test(d.c || '') && d.c !== R.col){ R.col = d.c; R.torso.material.color.set(d.c); R.arms.forEach(a => a.color.set(d.c)); }
    }
    for(const id in mp.remotes) if(!v[id]) mpRemoveRemote(id);
    mpRenderList();
  }
  async function mpJoin(create, forced){
    mpMsg('');
    const B = mpBridge();
    if(!B){ mpMsg('Multiplayer działa tylko po uruchomieniu gry z głównej strony (z Firebase).'); return; }
    try{
      const db = B.db(); if(!db){ mpMsg('Brak połączenia z serwerem.'); return; }
      const uid = await B.ensureAuth(); if(!uid){ mpMsg('Zaloguj się, żeby grać online.'); return; }
      const a = (B.acc && B.acc()) || {};
      applyAccountShirt();
      let code = create ? '' : (forced || mpEl.code.value.trim().toUpperCase());
      const perm = !create && MP_SERVERS.some(sv => sv.code === code);
      if(!create && code.length !== 4){ mpMsg('Kod pokoju ma 4 znaki.'); return; }
      const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for(let tries = 0; tries < 8; tries++){
        if(create) code = Array.from({length:4}, () => AL[Math.random()*AL.length|0]).join('');
        const ex = (await db.ref(MP_ROOT+'/'+code+'/players').once('value')).val() || {};
        const n = Object.keys(ex).filter(k => k !== uid).length;
        if(create){ if(n > 0) continue; }
        else{ if(n === 0 && !perm){ mpMsg('Nie ma pokoju '+code+'.'); return; } if(n >= MP_MAX){ mpMsg('Pokój jest pełny ('+MP_MAX+').'); return; } }
        break;
      }
      if(mp.room) await mpLeave(true);
      if(mp.had && mp.lastCode !== code) svFresh();             // inny serwer = osobny postęp (domy, monety, ekwipunek…)
      mp.had = true; mp.lastCode = code;
      mp.uid = uid; mp.room = code; mp.nick = String(a.nick || 'Gracz').slice(0,16);
      mp.pl = db.ref(MP_ROOT+'/'+code+'/players'); mp.me = mp.pl.child(uid);
      mp.last = {x:player.position.x, y:player.position.y, z:player.position.z, r:player.rotation.y, c:mpTorsoCol()};
      await mp.me.set({n:mp.nick, c:mp.last.c, x:+mp.last.x.toFixed(2), y:+mp.last.y.toFixed(2), z:+mp.last.z.toFixed(2), r:+mp.last.r.toFixed(2), t:B.fb().database.ServerValue.TIMESTAMP});
      mp.me.onDisconnect().remove();
      mp.handler = mp.pl.on('value', mpOnPlayers, e => mpMsg('Brak dostępu do bazy (reguły Firebase dla '+MP_ROOT+').'));
      mp.ts = B.fb().database.ServerValue.TIMESTAMP; mp.lastSend = performance.now();
      mpEl.room.textContent = code; mpEl.off.style.display = 'none'; mpEl.on.style.display = 'block';
      mpRenderList(); mpEl.btn.classList.add('on');
      await svInit(code); // osobny zapis dla tego konkretnego serwera/pokoju
      toast('🌐 '+(perm ? (MP_SERVERS.find(sv => sv.code === code).name) : 'Pokój '+code));
    }catch(e){
      mp.room = null; mpMsg(/permission/i.test(String(e)) ? 'Brak uprawnień w bazie – dodaj reguły dla "'+MP_ROOT+'".' : 'Błąd: '+(e && e.message || e));
    }
  }
  async function mpLeave(silent){
    // Najpierw zapisujemy postęp na serwerze, który właśnie opuszczamy.
    try{ await svSave(); }catch(e){}
    try{ if(mp.pl && mp.handler) mp.pl.off('value', mp.handler); }catch(e){}
    try{ if(mp.me){ mp.me.onDisconnect().cancel(); await mp.me.remove(); } }catch(e){}
    Object.keys(mp.remotes).forEach(mpRemoveRemote);
    mp.room = mp.me = mp.pl = mp.handler = null;
    sv.ref = null; sv.ready = false; sv.last = '';
    mpEl.on.style.display = 'none'; mpEl.off.style.display = 'block'; mpEl.btn.classList.remove('on'); mpRenderList(); mpRenderServers();
    if(!silent) toast('Opuszczono pokój');
  }
  async function mpRenderServers(){
    const box = $('mpServers'); if(!box) return;
    const draw = counts => { box.innerHTML = MP_SERVERS.map((sv,i) => `<div class="srv"><span>🖥️ ${sv.name} <small>${counts[i] == null ? '' : counts[i]+'/'+MP_MAX}</small></span><button type="button" data-srv="${sv.code}">➡ Dołącz</button><button type="button" class="no" data-reset-srv="${sv.code}" title="Usuń postęp na tym serwerze">🗑 Usuń postęp</button></div>`).join(''); };
    draw([]);
    try{
      const B = mpBridge(); const db = B && B.db(); if(!db) return;
      const counts = await Promise.all(MP_SERVERS.map(async sv => { try{ return Object.keys((await db.ref(MP_ROOT+'/'+sv.code+'/players').once('value')).val() || {}).length; }catch(e){ return null; } }));
      draw(counts);
    }catch(e){}
  }
  function mpTick(dt){
    const now = performance.now();
    if(mp.room && mp.me){
      const p = player.position, L = mp.last, c = mpTorsoCol();
      const moved = Math.abs(p.x-L.x) > 0.03 || Math.abs(p.y-L.y) > 0.03 || Math.abs(p.z-L.z) > 0.03 || Math.abs(player.rotation.y-L.r) > 0.03 || c !== L.c;
      if(now - mp.lastSend > (moved ? MP_SEND_MS : MP_BEAT_MS)){
        mp.lastSend = now; mp.last = {x:p.x, y:p.y, z:p.z, r:player.rotation.y, c};
        mp.me.update({n:mp.nick, c, x:+p.x.toFixed(2), y:+p.y.toFixed(2), z:+p.z.toFixed(2), r:+player.rotation.y.toFixed(2), t:mp.ts}).catch(() => {});
      }
    }
    const wall = Date.now(), k = 1 - Math.exp(-10*dt);
    for(const id in mp.remotes){
      const R = mp.remotes[id];
      if(wall - R.seen > MP_STALE_MS){ R.g.visible = false; continue; } R.g.visible = true;
      const ox = R.g.position.x, oz = R.g.position.z;
      R.g.position.x += (R.tx-ox)*k; R.g.position.z += (R.tz-oz)*k; R.g.position.y += (R.ty-R.g.position.y)*k;
      let dr = R.tr - R.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); R.g.rotation.y += dr*k;
      const sp = Math.hypot(R.g.position.x-ox, R.g.position.z-oz)/Math.max(dt,1e-3);
      R.phase += Math.min(sp,8)*dt*2.2; const sw = Math.min(sp/4,1)*0.8;
      R.legL.rotation.x = Math.sin(R.phase)*sw; R.legR.rotation.x = -Math.sin(R.phase)*sw;
      R.armL.rotation.x = -Math.sin(R.phase)*sw; R.armR.rotation.x = Math.sin(R.phase)*sw;
    }
  }
  mpEl.btn.addEventListener('click', () => { const open = mpEl.panel.style.display !== 'block'; mpEl.panel.style.display = open ? 'block' : 'none'; mpRenderList(); if(open && !mp.room) mpRenderServers(); });
  $('mpServers').addEventListener('click', e => {
    const reset = e.target.closest('button[data-reset-srv]');
    if(reset){ mpResetServerProgress(reset.dataset.resetSrv); return; }
    const join = e.target.closest('button[data-srv]');
    if(join) mpJoin(false, join.dataset.srv);
  });
  $('mpClose').addEventListener('click', () => mpEl.panel.style.display = 'none');
  $('mpCreate').addEventListener('click', () => mpJoin(true));
  $('mpJoin').addEventListener('click', () => mpJoin(false));
  $('mpLeave').addEventListener('click', () => mpLeave());
  ['keydown','keyup','keypress'].forEach(ev => mpEl.code.addEventListener(ev, e => { e.stopPropagation(); if(ev==='keydown' && e.key==='Enter') mpJoin(false); }));
  mpEl.code.addEventListener('focus', () => { for(const k in keys) keys[k] = false; });
  addEventListener('pagehide', () => { try{ mp.me && mp.me.remove(); }catch(e){} });

  // ===== ZAPIS STANU GRY: osobno dla konta i konkretnego serwera/pokoju =====
  // Ścieżka: rlSaves/{uid}/{serverCode}
  const SAVE_ROOT = 'rlSaves', SAVE_EVERY_MS = 15000, SAVE_VER = 2;
  const sv = {ref:null, ready:false, dead:false, busy:false, last:'', timer:null};
  const svRot4 = a => ((Math.round(a/(Math.PI/2)) % 4) + 4) % 4;
  function svPos(){                                              // pozycja bezpieczna do wczytania (nie wewnątrz mebla czy łóżka)
    let x = player.position.x, z = player.position.z;
    if(sitting){ const th = sitting.mesh.rotation.y; x = sitting.wall.x + Math.sin(th)*0.95; z = sitting.wall.z + Math.cos(th)*0.95; }
    else if(isSleeping && homeIn){ setActiveHome(homeIn); const p = homeW(0, HOME.d/2 - 0.9); x = p.x; z = p.z; }
    return {x:+x.toFixed(2), z:+z.toFixed(2), f:+facing.toFixed(2), yaw:+yaw.toFixed(2)};
  }
  function svSlot(s){ return s ? Object.assign({id:s.id, count:s.count}, s.main != null ? {main:s.main} : {}, s.color !== undefined ? {col:s.color} : {}) : null; }
  function svColOf(s){
    if(!s || s.col == null || !isFinite(+s.col)) return {};
    if(s.id === 'shoes') return {color:Math.max(0, Math.min(0xffffffffffff, Math.floor(+s.col)))};   // 2 kolory w jednej liczbie
    return (s.id === 'hat' || s.id === 'cap' || s.id === 'shirt' || s.id === 'pants') ? {color:Math.max(0, Math.min(0xffffff, +s.col | 0))} : {};
  }
  function svSnapshot(){
    return {
      v: SAVE_VER,
      coins: coins(),
      inv: JSON.stringify(inv.map(svSlot)),
      hunger: +stats.hunger.toFixed(1),
      energy: +stats.energy.toFixed(1),
      hygiene: +stats.hygiene.toFixed(1),
      elapsed: Math.round(gameElapsed),
      bank: JSON.stringify({opened:!!bank.opened, balance:bank.balance|0, number:String(bank.number||''), tx:(bank.tx||[]).slice(-40)}),
      trunk: JSON.stringify(trunk.map(svSlot)),
      fridge: JSON.stringify(fridgeStock),
      shirt: wornShirt ? String(wornShirt.color) : '',
      shoes: wornShoes ? String(wornShoes.color) : '',
      pants: wornPants ? String(wornPants.color) : '',
      wardrobe: JSON.stringify(wardrobeClothes.map(c => Object.assign({id:c.id, count:c.count}, c.color !== undefined ? {col:c.color} : {}))),
      homes: JSON.stringify(HOMES.map(H => ({id:H.id, rented:!!H.rented, owned:!!H.owned, paid:H.owned ? 0 : Math.round(H.paidUntil||0), open:!!(H.door && H.door.open)}))),
      furn: JSON.stringify(placedDesks.slice(0,40).map(pd => ({k:pd.kind||'desk', x:+pd.wall.x.toFixed(2), z:+pd.wall.z.toFixed(2), r:svRot4(pd.mesh.rotation.y), c:pd.computer ? (Math.round(pd.computer.rotation.y/Math.PI) & 1) : -1, p:pd.pizza ? +pd.pizza.t.toFixed(1) : -1}))),
      car: JSON.stringify(hasCar ? {has:true, x:+pcar.group.position.x.toFixed(2), z:+pcar.group.position.z.toFixed(2), r:+carHeading.toFixed(3), c:pcar.bodyMat.color.getHex(), s:steerLvl, f:+carFuel.toFixed(1), hb:handbrake ? 1 : 0} : {has:false}),
      upper: JSON.stringify({h:upperApp.hired?1:0, n:upperApp.done|0, e:upperApp.earned|0}),
      phone: JSON.stringify({plug:!!chargerPlugged, home:chargerHome ? chargerHome.id : '', dock:!!phoneDocked, bat:+(+phoneBattery).toFixed(1)}),
      pos: JSON.stringify(svPos())
    };
  }
  // Dom jest częścią postępu na KONKRETNYM serwerze – przy zmianie serwera czyścimy domy, meble i ładowarkę,
  // żeby nie „przeszły” na nowy serwer (i nie zapisały się tam przy najbliższym zapisie).
  function svResetHomes(){
    for(const H of HOMES){
      if(!(H.rented || H.owned)) continue;
      H.owned = false; H.rented = false; H.paidUntil = 0; H.door.open = false; drawHomeSign(H);
      if(homeIn === H){                                        // gracz stoi w domu, który znika – wyprowadzamy go przed drzwi
        if(isSleeping){ isSleeping = false; body.rotation.x = 0; body.position.set(0,0,0); }
        if(sitting) standUp();
        if(placing) cancelPlacement('Zmiana serwera – anulowano ustawianie mebla');
        setActiveHome(H); const p = homeW(0, HOME.d/2 + 1.8);
        player.position.set(p.x, 0, p.z); vy = 0;
      }
    }
    svApplyFurn([]);                                           // meble stoją tylko w domach
    chargerPlugged = false; chargerHome = null; phoneDocked = false; batFull = true;
    HOMES.forEach(H => { if(H.charger) H.charger.visible = false; if(H.phone) H.phone.visible = false; });
    refreshPhoneDom();
  }
  // Stan „nowego save’a” – zrobiony zaraz po załadowaniu gry (zanim cokolwiek zdążysz zrobić).
  let SV_DEFAULT = null;
  setTimeout(() => { try{ SV_DEFAULT = svSnapshot(); }catch(e){ console.error('Nie udało się zapamiętać stanu początkowego', e); } }, 0);
  // Serwer bez postępu = gra od zera: monety, ekwipunek, głód/energia, konto, lodówka, domy, meble, czas i pozycja startowa.
  function svFresh(){
    if(bikeMounted){ bikeMounted = false; player.visible = true; riderBlend = 0; }   // zsiadamy bez przenoszenia postaci przy rowerze
    bikePurchased = false; bike.visible = false;
    svApplyCar({has:false}); svApplyUpper(null); setShirt(null); setShoes(null); setPants(null);
    job.accepted = false; job.order = null; job.carrying = false; job.delivered = 0;
    try{ closeDialog(); }catch(e){}
    svResetHomes();
    if(SV_DEFAULT) svApply(SV_DEFAULT);
  }
  function svApplyHomes(arr){
    for(const h of arr){
      const H = HOMES.find(q => q.id === h.id); if(!H) continue;
      if(h.owned){ H.owned = true; H.rented = true; H.paidUntil = Infinity; }
      else if(h.rented){ H.owned = false; H.rented = true; H.paidUntil = Math.max(0, +h.paid || 0); }
      else continue;
      H.door.open = !!h.open; drawHomeSign(H);
    }
  }
  function svApplyFurn(arr){
    for(const pd of placedDesks.splice(0)){ disposeFurnMesh(pd.mesh); scene.remove(pd.mesh); const i = WALLS.indexOf(pd.wall); if(i >= 0) WALLS.splice(i, 1); }
    for(const f of arr.slice(0,40)){
      const kind = ['desk','chair','wardrobe','lamp','oven','toilet','bathtub','mirror'].includes(f.k) ? f.k : 'desk', x = +f.x, z = +f.z, r = ((f.r|0) % 4 + 4) % 4;
      if(!isFinite(x) || !isFinite(z) || !HOMES.some(H => { const D = homeDimsOf(H); return Math.abs(x-H.x) < Math.max(6, D.ww/2) && Math.abs(z-H.z) < Math.max(6, D.wd/2); })) continue;   // tylko wewnątrz domów
      if(kind === 'lamp'){
        const lm = makeLamp(false); lm.position.set(x, HOME.h, z); scene.add(lm);
        const lpd = {mesh:lm, wall:{x, z, w:0.5, d:0.5}, kind}; attachLampLight(lpd); placedDesks.push(lpd); continue;
      }
      const dm = furnDims(kind, r), mesh = makeFurn(kind, false);
      mesh.position.set(x, 0.07, z); mesh.rotation.y = r*Math.PI/2; scene.add(mesh);
      const wall = {x, z, w:dm.w, d:dm.d}; WALLS.push(wall);
      const pd = {mesh, wall, kind}; placedDesks.push(pd);
      if(kind === 'oven' && isFinite(+f.p) && +f.p >= 0){ pd.pizza = {t:Math.min(+f.p, OVEN_BAKE + OVEN_OVER + 30)}; ovenGlow(pd); }
      if(kind === 'desk' && (f.c|0) >= 0){ const cm = makeComputer(false); cm.position.set(0,0.78,0); cm.rotation.y = (f.c&1)*Math.PI; mesh.add(cm); pd.computer = cm; }
    }
  }
  function svApplyPhone(p){
    const H = HOMES.find(q => q.id === p.home);
    if(isFinite(+p.bat)) phoneBattery = Math.min(100, Math.max(0, +p.bat));
    if(p.plug && H){
      chargerPlugged = true; chargerHome = H; H.charger.visible = true;
      if(p.dock){ phoneDocked = true; H.phone.visible = true; batFull = phoneBattery >= 100; }
    }
  }
  function svApplyPos(p){
    const x = +p.x, z = +p.z;
    if(!isFinite(x) || !isFinite(z) || Math.abs(x) > 1000 || Math.abs(z) > 1000) return;
    if(WALLS.some(b => overlap(x, z, 0.6, 0.6, b))) return;                                  // zapisane miejsce zajęte – zostajesz na starcie
    for(const H of HOMES){ const D = homeDimsOf(H); if(!H.rented && Math.abs(x-H.x) < D.ww/2 && Math.abs(z-H.z) < D.wd/2) return; }   // dom już niewynajęty
    player.position.set(x, 0, z); vy = 0;
    if(isFinite(+p.f)){ facing = +p.f; player.rotation.y = facing; }
    if(isFinite(+p.yaw)) yaw = +p.yaw;
  }
  function svApply(d){
    try{
      const arr = JSON.parse(d.inv || '[]');
      for(let i = 0; i < inv.length; i++){
        const s = arr[i];
        inv[i] = (s && ITEMS[s.id]) ? Object.assign({id:s.id, count:Math.max(1, s.count|0)}, s.main != null ? {main:s.main|0} : {}, svColOf(s)) : null;
      }
      const cl = (v, def) => isFinite(+v) ? Math.min(100, Math.max(0, +v)) : def;
      stats.hunger = Math.max(1, cl(d.hunger, 100)); stats.energy = Math.max(1, cl(d.energy, 100)); stats.hygiene = cl(d.hygiene, 100);
      if(isFinite(+d.elapsed) && +d.elapsed >= 0) gameElapsed = +d.elapsed;
      try{ const b = JSON.parse(d.bank || '{}'); bank.opened = !!b.opened; bank.balance = Math.max(0, b.balance|0); bank.number = String(b.number || ''); bank.tx = Array.isArray(b.tx) ? b.tx.slice(-40) : []; }catch(e){}
      try{
        const t = JSON.parse(d.trunk || '[]');
        for(let i = 0; i < TRUNK_SLOTS; i++){
          const q = t[i];
          trunk[i] = (q && ITEMS[q.id] && q.id !== 'order') ? Object.assign({id:q.id, count:Math.max(1, q.count|0)}, q.main != null ? {main:q.main|0} : {}, svColOf(q)) : null;
        }
        for(let i = 0; i < TRUNK_SLOTS; i++){                  // duży przedmiot musi mieć komplet części, a część – swój przedmiot
          const q = trunk[i]; if(!q) continue;
          if(BIG[q.id] && trunk.filter(x => x && x.main === i && x.id === BIG[q.id].part).length !== BIG[q.id].slots - 1){ trunk.forEach((x,j) => { if(x && x.main === i) trunk[j] = null; }); trunk[i] = null; }
        }
        for(let i = 0; i < TRUNK_SLOTS; i++){ const q = trunk[i]; if(q && q.main !== undefined && !(trunk[q.main] && BIG[trunk[q.main].id])) trunk[i] = null; }
      }catch(e){}
      try{ const f = JSON.parse(d.fridge || '{}'); for(const k in fridgeStock) if(isFinite(+f[k])) fridgeStock[k] = Math.max(0, f[k]|0); }catch(e){}
      try{ const sc = d.shirt !== undefined && d.shirt !== '' ? +d.shirt : NaN; setShirt(isFinite(sc) ? {color:Math.max(0, Math.min(0xffffff, sc | 0))} : null); }catch(e){}
      try{ const hc = d.shoes !== undefined && d.shoes !== '' ? +d.shoes : NaN; setShoes(isFinite(hc) ? {color:Math.max(0, Math.min(0xffffffffffff, Math.floor(hc)))} : null); }catch(e){}
      try{ const pc = d.pants !== undefined && d.pants !== '' ? +d.pants : NaN; setPants(isFinite(pc) ? {color:Math.max(0, Math.min(0xffffff, pc | 0))} : null); }catch(e){}
      try{ wardrobeClothes.length = 0; (JSON.parse(d.wardrobe || '[]') || []).forEach(q => { if(q && isClothing(q.id)){ const c = svColOf(q); wardrobeClothes.push(Object.assign({id:q.id, count:Math.max(1, q.count|0)}, c)); } }); }catch(e){}
      if(d.homes) try{ svApplyHomes(JSON.parse(d.homes)); }catch(e){}
      if(d.furn) try{ svApplyFurn(JSON.parse(d.furn)); }catch(e){}
      if(d.car) try{ svApplyCar(JSON.parse(d.car)); }catch(e){}
      if(d.upper) try{ svApplyUpper(JSON.parse(d.upper)); }catch(e){}
      if(d.phone) try{ svApplyPhone(JSON.parse(d.phone)); }catch(e){}
      if(d.pos) try{ svApplyPos(JSON.parse(d.pos)); }catch(e){}
      renderInv(); renderShop(); renderStats(); updateDayNight(gameElapsed); refreshPhoneBank(); refreshPhoneDom();
      return true;
    }catch(e){ return false; }
  }
  async function svSave(){
    if(!sv.ref || !sv.ready || sv.dead || sv.busy || isDead) return false;
    const data = svSnapshot(), key = JSON.stringify(data);
    if(key === sv.last) return true;
    sv.busy = true;
    try{
      data.t = mpBridge().fb().database.ServerValue.TIMESTAMP;
      await sv.ref.set(data);
      sv.last = key;
      return true;
    }catch(e){
      if(/permission/i.test(String(e))) toast('Brak uprawnień w bazie – dodaj reguły dla "'+SAVE_ROOT+'".');
      else toast('Nie udało się zapisać postępu. Spróbuj ponownie.');
      return false;
    }finally{ sv.busy = false; }
  }
  async function svInit(serverCode){
    const B = mpBridge(); if(!B || !serverCode) return;
    try{
      const a = (B.acc && B.acc()) || {}; if(!a.logged) return;          // zapis tylko dla zalogowanego konta
      const db = B.db(); if(!db) return;
      const uid = await B.ensureAuth(); if(!uid) return;
      // Każdy serwer (także prywatny pokój) ma osobny zapis tego samego gracza.
      sv.ref = db.ref(SAVE_ROOT+'/'+uid+'/'+String(serverCode).toUpperCase());
      sv.ready = false; sv.dead = false; sv.last = '';
      const d = (await sv.ref.once('value')).val();
      if(d && d.v){ if(svApply(d)){ sv.last = ''; toast('💾 Wczytano zapis: '+serverCode); } }
      else{ svFresh(); sv.last = ''; toast('🆕 Nowa gra na serwerze '+serverCode); }
      sv.ready = true;
      if(!sv.timer) sv.timer = setInterval(svSave, SAVE_EVERY_MS);
    }catch(e){
      if(/permission/i.test(String(e))) toast('Brak uprawnień w bazie – dodaj reguły dla "'+SAVE_ROOT+'".');
    }
  }
  async function mpResetServerProgress(serverCode){
    const name = MP_SERVERS.find(x => x.code === serverCode)?.name || ('Pokój ' + serverCode);
    if(!confirm('Czy na pewno usunąć cały postęp na serwerze „'+name+'”? Tej operacji nie można cofnąć.')) return;
    const B = mpBridge();
    try{
      if(!B || !B.db()) throw new Error('Brak połączenia z bazą.');
      const account = (B.acc && B.acc()) || {};
      if(!account.logged) throw new Error('Zaloguj się, aby usunąć zapis.');
      const uid = await B.ensureAuth();
      if(!uid) throw new Error('Nie udało się potwierdzić konta.');
      const ref = B.db().ref(SAVE_ROOT+'/'+uid+'/'+String(serverCode).toUpperCase());
      // Zatrzymaj automatyczny zapis, jeśli właśnie jesteśmy na resetowanym serwerze.
      const active = mp.room && String(mp.room).toUpperCase() === String(serverCode).toUpperCase();
      if(active){ sv.dead = true; sv.ready = false; }
      await ref.remove();
      toast('🗑️ Usunięto postęp na serwerze '+name+'. '+(active ? 'Odświeżam grę…' : 'Możesz rozpocząć od nowa po dołączeniu.'));
      if(active) setTimeout(() => location.reload(), 700);
    }catch(err){
      toast(err && err.message ? err.message : 'Nie udało się usunąć postępu.');
    }
  }
  function svClear(){ sv.dead = true; try{ if(sv.ref) sv.ref.remove(); }catch(e){} }   // śmierć = nowa gra po przeładowaniu
  const saveBtn = $('saveBtn');
  if(saveBtn) saveBtn.addEventListener('click', async () => {
    if(!mp.room || !sv.ref || !sv.ready){ toast('Najpierw dołącz do serwera w Multiplayer.'); return; }
    if(saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Zapisywanie...';
    const roomCode = mp.room;
    try{
      const ok = await svSave();
      if(ok) toast('💾 Postęp zapisany na serwerze '+roomCode);
    }finally{
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 ZAPISZ';
    }
  });
  window.__rlSaveNow = svSave;
  document.addEventListener('visibilitychange', () => { if(document.hidden) svSave(); });
  addEventListener('pagehide', svSave);
  // Zapis jest inicjalizowany dopiero po wejściu na konkretny serwer.

  function loop(){
    requestAnimationFrame(loop);
    const frameDelta = clock.getDelta();
    mpTick(Math.min(frameDelta, 0.05));
    if(isDead){
      renderer.render(scene, camera);
      return;
    }
    if(isPaused || computerUiOpen){
      renderer.render(scene, camera);
      return;
    }
    const dt = Math.min(frameDelta, 0.05);

    // Sen przyspiesza zegar gry, a głód i energia zmieniają się wykładniczo.
    if(isSleeping){
      if(keys.ShiftLeft || keys.ShiftRight){
        isSleeping = false;
        keys.ShiftLeft = false;
        keys.ShiftRight = false;
        body.rotation.x = 0; body.position.set(0, 0, 0);
        const wp = homeW(HOME.lay.wake.x, HOME.lay.wake.z);
        player.position.set(wp.x, 0, wp.z);
        facing = Math.atan2(Math.cos(HOME.rot), -Math.sin(HOME.rot));   // twarzą do pokoju
        player.rotation.y = facing;
        toast('Wstałeś z łóżka. Czas płynie normalnie ☀️');
      } else {
        curAct = null;
        promptEl.textContent = 'Shift – wstań z łóżka'; promptEl.style.display = 'block';
        const sleepDt = dt * SLEEP_TIME_MULTIPLIER;
        gameElapsed += sleepDt;
        stats.hunger = Math.max(0, stats.hunger * Math.exp(-0.0032 * sleepDt));
        stats.energy = Math.min(100, 100 - (100 - stats.energy) * Math.exp(-0.004 * sleepDt));
        stats.hygiene = Math.max(0, stats.hygiene * Math.exp(-0.0005 * sleepDt));
        renderStats();
        updateRent();
        if(checkDeath()) return;
        updateCamera();
        updateDayNight(gameElapsed);
        renderer.render(scene, camera);
        return;
      }
    }

    gameElapsed += dt;
    updateRent();
    updatePhoneBattery(dt);

    if(sitting && (keys.ShiftLeft || keys.ShiftRight)){ standUp(); keys.ShiftLeft = false; keys.ShiftRight = false; }
    let ix = (keys.KeyD||keys.ArrowRight?1:0) - (keys.KeyA||keys.ArrowLeft?1:0) + joy.x;
    let iz = (keys.KeyW||keys.ArrowUp?1:0) - (keys.KeyS||keys.ArrowDown?1:0) - joy.y;
    if(sitting || paintUiOpen){ ix = 0; iz = 0; }
    let drvX = 0, drvZ = 0;
    if(carDriving){ drvX = ix; drvZ = iz; ix = 0; iz = 0; }                      // w aucie WASD steruje autem, nie postacią
    const len = Math.hypot(ix,iz);
    if(len > 1){ ix/=len; iz/=len; }
    const shiftNow = !!(keys.ShiftLeft||keys.ShiftRight);
    if(bikeMounted && shiftNow && !shiftPrev && !isSleeping) dismountBike();   // Shift zsiada z roweru
    if(carDriving && shiftNow && !shiftPrev && !isSleeping) exitCar();         // Shift wysiada z auta
    shiftPrev = shiftNow;
    const wantRun = shiftNow;
    const exhausted = stats.energy <= 0, tired = stats.energy < 15;
    const running = wantRun && !exhausted && !bikeMounted;                       // bez energii nie da się biec / sprintować
    let speed = bikeMounted ? (running ? 16 : 11) : (running ? 9 : 5);
    if(tired) speed *= 0.65;                                      // zmęczenie spowalnia

    // kierunek względem kamery
    const mx = ix*Math.cos(yaw) - iz*Math.sin(yaw);
    const mz = -ix*Math.sin(yaw) - iz*Math.cos(yaw);
    player.position.x += mx*speed*dt;
    player.position.z += mz*speed*dt;
    if(carDriving) driveCar(drvX, drvZ, dt);
    const CR = carDriving ? 1.15 : 0;                                            // auto jest większe od postaci – większy promień kolizji
    const preX = player.position.x, preZ = player.position.z;

    // kolizje z pniami drzew
    for(const t of treeColl){
      const dx = player.position.x - t.x, dz = player.position.z - t.z;
      if(Math.abs(dx) > 3.6 || Math.abs(dz) > 3.6) continue;
      const d = Math.hypot(dx, dz), min = t.r + 0.35 + CR;
      if(d < min && d > 0.0001){
        player.position.x = t.x + dx/d*min;
        player.position.z = t.z + dz/d*min;
      }
    }
    for(const b of BUILDINGS){ // kolizje ze ścianami budynków
      if(b.open) continue;
      const hx = b.w/2 + 0.4 + CR, hz = b.d/2 + 0.4 + CR;
      const dx = player.position.x - b.x, dz = player.position.z - b.z;
      if(Math.abs(dx) < hx && Math.abs(dz) < hz){
        if(hx - Math.abs(dx) < hz - Math.abs(dz)) player.position.x = b.x + Math.sign(dx || 1)*hx;
        else player.position.z = b.z + Math.sign(dz || 1)*hz;
      }
    }
    for(const w of WALLS){ // ściany i meble restauracji
      if(sitting && w === sitting.wall) continue;
      if(w.enter !== undefined && player.position.y >= w.enter) continue;   // wskoczono nad krawędź platformy
      const px = player.position.x, pz = player.position.z;
      if(Math.abs(px - w.x) > w.w/2 + 1 + CR || Math.abs(pz - w.z) > w.d/2 + 1 + CR) continue;
      const cx = Math.max(w.x - w.w/2, Math.min(w.x + w.w/2, px));
      const cz = Math.max(w.z - w.d/2, Math.min(w.z + w.d/2, pz));
      const dx = px - cx, dz = pz - cz, dd = Math.hypot(dx, dz), R = 0.35 + CR;
      if(dd < R){
        if(dd > 1e-5){ player.position.x += dx/dd*(R-dd); player.position.z += dz/dd*(R-dd); }
        else {
          const ox = w.w/2 - Math.abs(px - w.x), oz = w.d/2 - Math.abs(pz - w.z);
          if(ox < oz) player.position.x += Math.sign(px - w.x || 1)*(ox + R);
          else player.position.z += Math.sign(pz - w.z || 1)*(oz + R);
        }
      }
    }
    // Kolizje gracza z samochodami: obrócony prostokąt dopasowany do modelu auta (4,2 × 1,9 m), a nie duże koło.
    for(const car of trafficCars.concat(pksBuses, busRide ? [] : [BUS])){
      if(!car.active || !car.group.visible) continue;
      const cp = car.group.position, th = car.heading, vhl = car.hl || 2.1, vhw = car.hw || 0.95;
      const tfx = Math.cos(th), tfz = Math.sin(th);                      // przód auta ruchu; bok: (-tfz, tfx)
      const dx = player.position.x - cp.x, dz = player.position.z - cp.z;
      if(Math.abs(dx) > vhl + 4 || Math.abs(dz) > vhl + 4) continue;
      if(carDriving){
        // auto gracza (przód = (sin h, cos h)) kontra auto ruchu: twierdzenie o osiach rozdzielających (SAT), wypchnięcie najmniejszą penetracją
        const pfx = Math.sin(carHeading), pfz = Math.cos(carHeading);
        const axes = [[pfx,pfz],[pfz,-pfx],[tfx,tfz],[-tfz,tfx]];
        let best = Infinity, bax = 0, baz = 0, hit = true;
        for(const [ax, az] of axes){
          const rP = 2.1*Math.abs(pfx*ax + pfz*az) + 0.95*Math.abs(pfz*ax - pfx*az);
          const rT = vhl*Math.abs(tfx*ax + tfz*az) + vhw*Math.abs(-tfz*ax + tfx*az);
          const dist = dx*ax + dz*az, pen = rP + rT - Math.abs(dist);
          if(pen <= 0){ hit = false; break; }
          if(pen < best){ best = pen; bax = ax*(dist < 0 ? -1 : 1); baz = az*(dist < 0 ? -1 : 1); }
        }
        if(hit){ carV *= 0.5; player.position.x += bax*best; player.position.z += baz*best; }
      } else if(bikeMounted){
        // rower (prostokąt 2,7 × 0,6 m wzdłuż ramy: koła na ±0,88 + promień 0,48) kontra auto ruchu – SAT, wypchnięcie najmniejszą penetracją
        const bfx = Math.sin(facing), bfz = Math.cos(facing), BHL = 1.35, BHW = 0.3;
        const axes = [[bfx,bfz],[bfz,-bfx],[tfx,tfz],[-tfz,tfx]];
        let best = Infinity, bax = 0, baz = 0, hit = true;
        for(const [ax, az] of axes){
          const rB = BHL*Math.abs(bfx*ax + bfz*az) + BHW*Math.abs(bfz*ax - bfx*az);
          const rT = vhl*Math.abs(tfx*ax + tfz*az) + vhw*Math.abs(-tfz*ax + tfx*az);
          const dist = dx*ax + dz*az, pen = rB + rT - Math.abs(dist);
          if(pen <= 0){ hit = false; break; }
          if(pen < best){ best = pen; bax = ax*(dist < 0 ? -1 : 1); baz = az*(dist < 0 ? -1 : 1); }
        }
        if(hit){ player.position.x += bax*best; player.position.z += baz*best; }
      } else {
        // pieszy (koło r = 0,35) kontra prostokąt auta
        const R = 0.35, hl = vhl, hw = vhw;
        const along = dx*tfx + dz*tfz, lat = -dx*tfz + dz*tfx;
        const qa = Math.max(-hl, Math.min(hl, along)), ql = Math.max(-hw, Math.min(hw, lat));
        const ea = along - qa, el = lat - ql, dd = Math.hypot(ea, el);
        if(dd < R){
          let na, nl, push;
          if(dd > 1e-5){ na = ea/dd; nl = el/dd; push = R - dd; }
          else {                                                          // środek postaci wewnątrz prostokąta – wypchnij najbliższą krawędzią
            const oa = hl - Math.abs(along), ol = hw - Math.abs(lat);
            if(oa < ol){ na = Math.sign(along || 1); nl = 0; push = oa + R; } else { na = 0; nl = Math.sign(lat || 1); push = ol + R; }
          }
          player.position.x += (na*tfx - nl*tfz)*push;
          player.position.z += (na*tfz + nl*tfx)*push;
        }
      }
    }
    if(hasCar && !carDriving && pcar.group.visible && player.position.y < 1.6){          // zaparkowane auto gracza jest bryłą – nie da się przez nie przejść
      const cp = pcar.group.position, pfx = Math.sin(carHeading), pfz = Math.cos(carHeading);
      const dx = player.position.x - cp.x, dz = player.position.z - cp.z;
      if(Math.abs(dx) < 4 && Math.abs(dz) < 4){
        const R = 0.35, hl = 2.1, hw = 0.95;
        const along = dx*pfx + dz*pfz, lat = dx*pfz - dz*pfx;                            // oś wzdłuż auta i oś poprzeczna (prawa strona = +lat)
        const qa = Math.max(-hl, Math.min(hl, along)), ql = Math.max(-hw, Math.min(hw, lat));
        const ea = along - qa, el = lat - ql, dd = Math.hypot(ea, el);
        if(dd < R){
          let na, nl, push;
          if(dd > 1e-5){ na = ea/dd; nl = el/dd; push = R - dd; }
          else {                                                                           // środek postaci w prostokącie – wypchnij najbliższą krawędzią
            const oa = hl - Math.abs(along), ol = hw - Math.abs(lat);
            if(oa < ol){ na = Math.sign(along || 1); nl = 0; push = oa + R; } else { na = 0; nl = Math.sign(lat || 1); push = ol + R; }
          }
          player.position.x += (na*pfx + nl*pfz)*push;
          player.position.z += (na*pfz - nl*pfx)*push;
        }
      }
    }
    if(carDriving && Math.hypot(player.position.x - preX, player.position.z - preZ) > 0.02) carV *= Math.max(0, 1 - dt*9);   // uderzenie w przeszkodę hamuje auto
    updateShop();
    updateRestaurant();
    updateSupermarket();
    updateApplianceStore(dt, gameElapsed);
    updateHomeInterior();
    updateHomeDoor(dt);
    updateTraffic(dt);
    updateCarRoll(dt);
    updateBus(dt);
    updatePksBuses(dt);
    if(busRide) busCarry(mx, mz, speed, dt);                                     // gracz jedzie razem z autobusem
    updateOvens(dt);
    updateUpper(dt, gameElapsed);
    updatePlayerSignals(typeof drvX === 'number' ? drvX : 0);
    updateCarLights(dt);
    updateJob(dt, gameElapsed);
    updateMine(dt, gameElapsed);
    updateNeighbor(dt, gameElapsed);
    updateShopInterior(dt, gameElapsed);
    updateBankInterior(dt, gameElapsed);
    updateFurnInterior(dt, gameElapsed);
    updateClothInterior(dt, gameElapsed);
    updateCarInterior(dt, gameElapsed);
    updatePaintInterior(dt, gameElapsed);
    updateMechInterior(dt, gameElapsed);

    const moving = len > 0.1;
    if(moving){
      const target = Math.atan2(mx, mz);
      let d = target - facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      facing += d*Math.min(1, dt*12);
      player.rotation.y = facing;
      walkT += dt*speed*1.6;
    }
    if(carDriving){
      const tt = carTilt(player.position.x, player.position.z, carHeading); carPitch += (tt.pitch - carPitch)*Math.min(1, dt*8); carBank += (tt.roll - carBank)*Math.min(1, dt*8);   // płynne wychylanie nosa i boków
      pcar.group.position.set(player.position.x, tt.y + 0.02, player.position.z); pcar.group.rotation.y = carHeading; pcar.group.rotation.x = carPitch; pcar.group.rotation.z = carBank;
      pcar.wheels.forEach(w => { w.rotation.z -= carV*dt/0.36; });
      if(pcar.steer) pcar.steer.rotation.x = -(typeof drvX === 'number' ? drvX : 0)*0.9;
      if(carV > 2 && camPtr === null){                                          // kamera sama ustawia się za autem
        let dd = carHeading + Math.PI - yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); yaw += dd*Math.min(1, dt*1.8);
      }
    }
    if(bikeMounted){
      { const BL = 0.88, bsn = Math.sin(facing), bcs = Math.cos(facing), bx = player.position.x, bz = player.position.z;   // przechył wg nachylenia terenu pod kołami (jak w aucie)
        const tp = -Math.atan2(terrainH(bx + bsn*BL, bz + bcs*BL) - terrainH(bx - bsn*BL, bz - bcs*BL), 2*BL);
        bikePitch += (tp - bikePitch)*Math.min(1, dt*8); }
      bike.position.set(player.position.x,terrainH(player.position.x,player.position.z),player.position.z);
      bike.rotation.y=facing; bike.rotation.x = bikePitch;
      player.rotation.order = 'YXZ'; player.rotation.x = bikePitch;                       // rowerzysta przechyla się razem z rowerem
      bikeWheels.forEach(w=>{w.rotation.x += len*dt*speed*1.8;});
    } else if(player.rotation.x !== 0) player.rotation.x = 0;                              // po zsiadnięciu postać znów stoi pionowo
    { const bOn = bike.visible && !bikeMounted, ba = bike.rotation.y;                      // twardy zaparkowany rower (w czasie jazdy kolizja wyłączona)
      BIKE_COLL.forEach(c => { if(bOn){ c.x = bike.position.x + Math.sin(ba)*c.o; c.z = bike.position.z + Math.cos(ba)*c.o; } else { c.x = 1e5; c.z = 1e5; } }); }

    // skok
    const gy = groundAt(player.position.x, player.position.z, player.position.y);
    if(!bikeMounted && !carDriving && !busRide && !sitting && keys.Space && player.position.y <= gy + 0.001 && stats.energy >= 3){ vy = 7.5; addStats(0, -2); }
    vy -= 20*dt;
    player.position.y = Math.max(gy, player.position.y + vy*dt);
    if(player.position.y === gy && vy < 0) vy = 0;
    if(busRide){ player.position.y = busFloorY(); vy = 0; }                       // stoisz na podłodze autobusu (także na wzniesieniu)

    // animacja
    riderBlend += ((bikeMounted ? 1 : 0) - riderBlend) * Math.min(1, dt*10);
    const sw = moving ? Math.sin(walkT)*0.8 : 0;
    if(!sitting){ legL.scale.y = legR.scale.y = 1; shinL.visible = shinR.visible = false; legShoeL.visible = legShoeR.visible = true; }
    if(sitting){
      // siedzi na krześle: uda poziomo, podudzia w dół, ręce na kolanach
      body.position.set(0, -0.125, 0); upper.rotation.x = 0;
      legL.scale.y = legR.scale.y = 0.55; legL.rotation.x = legR.rotation.x = -Math.PI/2;
      shinL.visible = shinR.visible = true; legShoeL.visible = legShoeR.visible = false;   // na siedząco buty są na podudziach
      armL.rotation.x = armR.rotation.x = -0.9;
    } else if(riderBlend > 0.01){
      // postać siedzi na siodełku: biodra na wysokości siedzenia, tułów pochylony, ręce na kierownicy, nogi pedałują
      if(moving) pedalT += dt*speed*0.9;
      const b = riderBlend;
      body.position.set(0, 0.27*b, -0.28*b);
      upper.rotation.x = 0.7*b;
      const walkArm = -sw*(1-b);
      armL.rotation.x = walkArm + (-1.29)*b; armR.rotation.x = sw*(1-b) + (-1.29)*b;
      const ps = Math.sin(pedalT)*0.45;
      legL.rotation.x = sw*(1-b) + (-0.6 + ps)*b;
      legR.rotation.x = -sw*(1-b) + (-0.6 - ps)*b;
    } else {
      body.position.set(0,0,0); upper.rotation.x = 0;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw; armR.rotation.x = sw;
    }
    mineAnimate(gameElapsed);

    // głód i energia
    stats.hunger = Math.max(0, stats.hunger - dt*(0.12 + (running && moving ? 0.05 : 0)));
    { const px = player.position.x, workingInMine = hasPick() && px < MINE.x + 1.2 && px > MD.x1 - MD.nx - 1 && Math.abs(player.position.z - MINE.z) < 8;
      if(sitting && sitting.kind === 'bathtub'){
        stats.hygiene = Math.min(100, stats.hygiene + dt*HYGIENE_BATH);
        if(stats.hygiene >= 100 && !bathDoneToast){ bathDoneToast = true; toast('Jesteś czysty 🧼 Możesz wyjść z wanny'); }
      } else {
        bathDoneToast = false;
        stats.hygiene = Math.max(0, stats.hygiene - dt*(workingInMine ? HYGIENE_DRAIN_MINE : (running && moving ? HYGIENE_DRAIN_RUN : HYGIENE_DRAIN)));
      }
      if(stats.hygiene < 20 && !dirtyWarned){ dirtyWarned = true; toast('Jesteś brudny 🧼 Pora się umyć'); }
      if(stats.hygiene > 30) dirtyWarned = false; }
    let dE;
    if(carDriving) dE = 0;                                                           // jazda autem nie męczy
    else if(!moving) dE = stats.hunger > 15 ? 1.2 : 0;                                    // odpoczynek regeneruje energię
    else if(bikeMounted) dE = -(running ? 0.8 : 0.3);
    else dE = -(running ? 0.6 : 0.12);
    if(stats.hunger <= 0) dE = Math.min(dE, 0) - 0.15;                               // głód wyczerpuje
    stats.energy = Math.min(100, Math.max(0, stats.energy + dE*dt));
    if(stats.hunger < 20 && !hungryWarned){ hungryWarned = true; toast('Jesteś głodny! 🍖 Zjedz coś'); }
    if(stats.hunger > 30) hungryWarned = false;
    if(stats.energy < 15 && !tiredWarned){ tiredWarned = true; toast('Brakuje ci energii ⚡ Odpocznij'); }
    if(stats.energy > 30) tiredWarned = false;
    renderStats(); updateFuelGauge();
    if(checkDeath()) return;

    updatePlacement();

    // obrót kamery klawiszami Q / E
    yaw += ((keys.KeyQ?1:0) - (keys.KeyE?1:0)) * 1.8 * dt;
    updateItems(dt, gameElapsed);
    updateFountain(gameElapsed);

    updateCamera();
    drawCityMap(miniMapCtx,miniMapCanvas);
    if(fullMapOpen) drawCityMap(bigMapCtx,bigMapCanvas,mapView);
    updateDayNight(gameElapsed);

    updateMirror();
    renderer.render(scene, camera);
  }
  loop();
})();
