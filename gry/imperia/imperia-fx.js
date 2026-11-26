/* ==========================================================
   Imperia – efekty wizualne (shader WebGL)
   Nakładka na mapę, która nie blokuje klikania i nie zmienia logiki gry:
   - animowana woda (fale, odbłyski słońca, kaustyki, piana przy brzegu,
     głębia: płycizny jaśniejsze, głębiny ciemniejsze) – morze i jeziora bez szwów między heksami,
   - zimą: lód przy brzegach i kry, zamarznięte rzeki; deszcz: kręgi na wodzie; burza: wyższe fale,
   - płynące rzeki (kierunek przepływu wg danych rzek z gry),
   - miękkie cienie rzucane przez góry, lasy, domki, wieże i zamki (słońce z lewej-góry,
     długość cieni zależy od pory roku, pogoda je rozjaśnia/zanika),
   - przesuwające się cienie chmur, mgiełka nad bagnami, delikatna winieta.
   Szanuje mgłę wojny (pola niewidoczne są przyciemnione jak na mapie).
   Przycisk „✨ Efekty” (lewy górny róg mapy): Wysokie / Niskie / Wył. (zapamiętywane).
   Jakość dopasowuje się automatycznie do wydajności (skalowanie rozdzielczości).
   Wymaga: imperia-lib1.js (S, draw, rvData, C, R, W), imperia-weather.js (wxKey, wxSeasonIdx).
   ========================================================== */
(function(){
'use strict';

var FX = {q:'high', cv:null, gl:null, pg:null, U:{}, mask:null, maskW:0, maskH:0, maskOK:false,
          rivTex:null, rivKey:null, rivW:1, rivH:1, scale:1, ema:16, slow:0, fast:0, lastTs:0, lastDraw:0, fail:false, btn:null, t0:performance.now()};
try { var sv = localStorage.getItem('imp_fx'); if (sv === 'off' || sv === 'low' || sv === 'high') FX.q = sv; } catch (e) {}
FX.opt = {blend: true, zoom: true, anim: true, shadow: true, cloud: true};
try {
  var o2 = JSON.parse(localStorage.getItem('imp_fx2') || 'null');
  if (o2){
    if (o2.q === 'off' || o2.q === 'low' || o2.q === 'high') FX.q = o2.q;
    Object.keys(FX.opt).forEach(function(k){ if (typeof o2[k] === 'boolean') FX.opt[k] = o2[k]; });
  }
} catch (e) {}
FX.save = function(){ try { localStorage.setItem('imp_fx2', JSON.stringify(Object.assign({q: FX.q}, FX.opt))); } catch (e) {} };
window.IFX = FX;

/* ---------- shadery ---------- */
var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

function fsSource(){
  return [
'#ifdef GL_FRAGMENT_PRECISION_HIGH',
'precision highp float;',
'#else',
'precision mediump float;',
'#endif',
'const float HR=' + R.toFixed(2) + ';',
'const float HW=' + W.toFixed(5) + ';',
'uniform vec2 uSize;uniform float uPx;uniform vec2 uOrg;uniform float uS;uniform float uT;',
'uniform vec2 uGrid;uniform sampler2D uMask;uniform sampler2D uRiv;uniform vec2 uRivSize;',
'uniform float uSeason,uRain,uStorm,uFog,uSnow,uHeat,uTan,uShade,uCloud,uQ;',

'float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'vec2 h22(vec2 p){return vec2(h21(p),h21(p+vec2(41.7,13.3)));}',
'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
'  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}',
'float fbm(vec2 p){return .5*vn(p)+.3*vn(p*2.1+7.)+.2*vn(p*4.3+3.);}',

/* siatka heksów (odd-r, jak C(q,r) w grze) */
'vec2 hexOf(vec2 p){',
'  vec2 d=p-vec2(HW*.5+5.,HR+5.);',
'  float x=(.57735027*d.x-.33333333*d.y)/HR,z=(.66666667*d.y)/HR,y=-x-z;',
'  float rx=floor(x+.5),ry=floor(y+.5),rz=floor(z+.5);',
'  float dx=abs(rx-x),dy=abs(ry-y),dz=abs(rz-z);',
'  if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;',
'  return vec2(rx+(rz-mod(rz,2.))/2.,rz);}',
'vec2 hexCenter(vec2 c){return vec2(HW*(c.x+mod(c.y,2.)*.5)+HW*.5+5.,1.5*HR*c.y+HR+5.);}',
'vec4 tileAt(vec2 c){',
'  if(c.x<0.||c.y<0.||c.x>=uGrid.x||c.y>=uGrid.y)return vec4(0.);',
'  return texture2D(uMask,(c+.5)/uGrid);}',
'float tyOf(vec4 t){return floor(t.r*255./32.+.5);}',
'vec2 nbOff(int k,float odd){',
'  if(k==0)return vec2(1.,0.);',
'  if(k==1)return vec2(odd>.5?1.:0.,1.);',
'  if(k==2)return vec2(odd>.5?0.:-1.,1.);',
'  if(k==3)return vec2(-1.,0.);',
'  if(k==4)return vec2(odd>.5?0.:-1.,-1.);',
'  return vec2(odd>.5?1.:0.,-1.);}',
'float landAt(vec2 p){vec4 t=tileAt(hexOf(p));return(t.g>.5&&tyOf(t)>1.5)?1.:0.;}',

/* wysokość terenu/budynków (px mapy) – do cieni */
'float hAt(vec2 p){',
'  vec2 c=hexOf(p);vec4 t=tileAt(c);if(t.g<.5)return 0.;',
'  float ty=tyOf(t),st=floor(t.a*3.+.5),d=length(p-hexCenter(c))/HR,h=0.;',
'  if(ty>3.5&&ty<4.5)h=15.*(1.-smoothstep(.2,1.1,d));',
'  else if(ty>2.5&&ty<3.5)h=5.5*(1.-smoothstep(.55,1.15,d));',
'  if(st>.5){float sh=st<1.5?5.:(st<2.5?9.:13.);h+=sh*(1.-smoothstep(.15,.65,d));}',
'  return h;}',
'float shadowAt(vec2 p){',
'  float hp=hAt(p),occ=0.;vec2 L=normalize(vec2(-.62,-.78));',
'  for(int i=1;i<=7;i++){float t=float(i)*4.;float hh=hAt(p+L*t)-hp-t*uTan;occ=max(occ,clamp(hh/5.,0.,1.));}',
'  return occ;}',

/* fale: gradient sumy sinusoid */
'void addW(inout vec2 g,vec2 p,vec2 d,float k,float sp,float a,float t){',
'  g+=d*k*a*cos(dot(d,p)*k-t*sp);}',

/* woda: zwraca (rgb, alfa krawędzi) */
'vec4 water(vec2 p,vec2 cr,float ty,float vis){',
'  float t=uT,odd=mod(cr.y,2.),shore=99.;',
'  vec2 loc=p-hexCenter(cr);',
'  for(int k=0;k<6;k++){',
'    vec4 nb=tileAt(cr+nbOff(k,odd));',
'    if(nb.g>.5&&tyOf(nb)>1.5){float a=1.0471976*float(k);float d=HW*.5-dot(loc,vec2(cos(a),sin(a)));shore=min(shore,d);}',
'  }',
'  float land=0.;',
'  if(uQ>.5){for(int k=0;k<6;k++){float a=1.0471976*float(k)+.5236;vec2 d=vec2(cos(a),sin(a));',
'    land+=landAt(p+d*HW*.9)+landAt(p+d*HW*1.8)*.6;}}',
'  float shallow=clamp(max(land/4.,1.-smoothstep(0.,HW*.85,shore)),0.,1.);',
'  shallow=shallow*shallow*(3.-2.*shallow);',
'  float winter=uSeason>2.5?1.:0.;',
'  bool ocean=ty<.5;',
'  vec3 deep=ocean?vec3(.06,.25,.44):vec3(.13,.42,.60);',
'  vec3 shal=ocean?vec3(.19,.60,.75):vec3(.30,.74,.78);',
'  vec3 col=mix(deep,shal,shallow);',
'  col=mix(col,col*vec3(.9,1.,1.08)+vec3(.05,.08,.10),winter*.6);',
'  col*=1.-.28*uStorm-.10*uRain;',
'  col=mix(col,vec3(.58,.63,.65),uFog*.35);',
/* fale i oświetlenie */
'  float amp=.75*(1.+1.8*uStorm+.5*uRain);',
'  vec2 q=p+vec2(sin(p.y*.07+t*.7),cos(p.x*.06+t*.6))*4.;',
'  vec2 g=vec2(0.);',
'  addW(g,q,vec2(.8,.6),.21,1.3,1.,t);',
'  addW(g,q,vec2(-.5,.87),.34,1.7,.7,t);',
'  addW(g,q,vec2(.95,-.3),.55,2.3,.5,t);',
'  addW(g,q,vec2(-.2,-.98),.9,3.1,.3,t);',
'  vec3 n=normalize(vec3(-g*amp*.55,1.));',
'  vec3 Ls=normalize(vec3(-.45,-.6,.66));',
'  col*=1.+(dot(n,Ls)-Ls.z)*1.5;',
'  float spec=pow(max(dot(n,normalize(Ls+vec3(0.,0.,1.))),0.),70.)*(1.-.75*uFog-.5*uStorm-.3*uRain-.4*shallow);',
'  vec2 sc=floor(p/3.2);float hs=h21(sc);',
'  float spark=step(.987,hs)*(.5+.5*sin(t*3.+hs*60.))*(1.-.8*uFog-.5*uStorm);',
'  col+=vec3(1.,.97,.88)*(spec*.8+spark*.7);',
/* kaustyki w płyciznach */
'  if(uQ>.5){float c1=sin(p.x*.23+sin(p.y*.19+t*.9)*2.+t*.6),c2=sin(p.y*.27+sin(p.x*.17-t*.8)*2.-t*.5);',
'    col+=vec3(.5,.9,1.)*smoothstep(.55,1.,c1*c2)*shallow*.22;}',
/* lód zimą */
'  float ice=0.;',
'  if(winter>.5){float nz=fbm(p*.045+3.);ice=smoothstep(.52,.68,nz+shallow*.28-(ocean?.12:0.));',
'    float cr1=(1.-smoothstep(0.,.05,abs(sin(p.x*.17+sin(p.y*.21)*2.)*sin(p.y*.13+p.x*.05))));',
'    col=mix(col,vec3(.86,.94,.98)-cr1*.10,ice*.85);}',
/* piana / lód przy brzegu */
'  float foamW=4.2+2.2*sin(t*1.7+p.x*.04+p.y*.05)+winter*2.;',
'  float fd=shore+(sin(p.y*.3+t*2.)+sin(p.x*.23-t*1.7))*.9;',
'  float lace=.55+.45*smoothstep(.1,.6,.5+.5*sin(p.x*.7+p.y*.4+t*1.3)*sin(p.y*.8-p.x*.3));',
'  float foam=(1.-smoothstep(foamW-2.5,foamW,fd))*lace;',
'  foam+=(1.-smoothstep(0.,1.2,abs(fd-(foamW+4.5+3.*sin(t*1.7-1.)))))*.4*(1.-winter);',
'  col=mix(col,mix(vec3(1.),vec3(.85,.94,1.),winter),clamp(foam,0.,1.)*.9);',
/* kręgi deszczu */
'  if(uRain>.01&&uQ>.5){vec2 cc=p/16.;vec2 id=floor(cc),f=fract(cc)-.5;float hh=h21(id);',
'    float ph=fract(t*(.8+hh*.5)+hh*7.);float rd=length(f+(h22(id)-.5)*.4);',
'    float ring=(1.-smoothstep(0.,.07,abs(rd-ph*.5)))*(1.-ph)*step(hh,uRain*.9);col+=vec3(.9,.95,1.)*ring*.35*(1.-ice);}',
'  float ea=smoothstep(-.5,1.,shore);',
'  return vec4(col,ea);}',

'void main(){',
'  vec2 css=vec2(gl_FragCoord.x,uSize.y*uPx-gl_FragCoord.y)/uPx;',
'  vec2 p=(css-uOrg)/uS;',
'  vec3 P=vec3(0.);float A=0.;',
'  vec2 cr=hexOf(p);vec4 t=tileAt(cr);',
'  if(t.g>.5){',
'    float ty=tyOf(t),dim=t.b>.5?1.:.45;',
'    vec3 sc=vec3(.03,.07,.14);',
/* cienie + cienie chmur */
'    float sh=shadowAt(p)*.34*uShade;',
'    float cl=smoothstep(.52,.78,fbm(p*.0042+vec2(uT*.006,uT*.003)))*.17*uCloud;',
'    float sa=(sh+cl)*(t.b>.5?1.:.5);',
'    P+=sc*sa;A+=sa;',
/* woda */
'    if(ty<1.5){',
'      vec4 w=water(p,cr,ty,t.b);',
'      vec3 wc=mix(w.rgb*dim,sc,clamp(sa*.9,0.,.7));',
'      P=P*(1.-w.a)+wc*w.a;A=A*(1.-w.a)+w.a;',
'    }',
/* rzeki */
'    if(p.x>=0.&&p.y>=0.&&p.x<uRivSize.x&&p.y<uRivSize.y){',
'      vec4 rv=texture2D(uRiv,p/uRivSize);',
'      if(rv.a>.02){',
'        vec2 dir=rv.rg*2.-1.;float dl=length(dir);dir=dl>.01?dir/dl:vec2(1.,0.);',
'        vec2 pp=vec2(-dir.y,dir.x);float winter=uSeason>2.5?1.:0.;',
'        float sp=mix(26.,3.,winter);',
'        float fl=vn(vec2(dot(p,dir)*.13-uT*sp*.1,dot(p,pp)*.55));',
'        float fl2=vn(vec2(dot(p,dir)*.31-uT*sp*.17,dot(p,pp)*.9+5.));',
'        float streak=smoothstep(.55,.85,fl*.6+fl2*.4+.1)*rv.a;',
'        float ra=clamp(streak*.5+winter*rv.a*.35,0.,.8)*dim;',
'        vec3 rc=mix(vec3(.75,.93,1.),vec3(.9,.96,1.),winter);',
'        P=P*(1.-ra)+rc*ra;A=ra+A*(1.-ra);',
'      }',
'    }',
/* mgiełka nad bagnami */
'    if(ty>6.5&&ty<7.5&&uQ>.5){',
'      float m=smoothstep(.4,.8,fbm(p*.03+vec2(uT*.02,-uT*.012)))*.20*dim;',
'      vec3 mc=vec3(.78,.86,.72);P=P*(1.-m)+mc*m;A=m+A*(1.-m);',
'    }',
'  }',
/* winieta */
'  vec2 uv=css/uSize-.5;',
'  float vg=smoothstep(.42,.95,length(uv*vec2(1.05,1.2)))*.24;',
'  P*=(1.-vg);A=A*(1.-vg)+vg;',
'  gl_FragColor=vec4(P,A);',
'}'
  ].join('\n');
}

/* ---------- inicjalizacja GL ---------- */
function compile(gl, type, src){
  var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ var e = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(e); }
  return s;
}
function initGL(){
  var cv = document.createElement('canvas');
  cv.id = 'ifx'; cv.setAttribute('aria-hidden', 'true');
  var gl = cv.getContext('webgl', {alpha:true, premultipliedAlpha:true, antialias:false, depth:false, stencil:false}) ||
           cv.getContext('experimental-webgl', {alpha:true, premultipliedAlpha:true, antialias:false});
  if (!gl) throw new Error('Brak WebGL');
  var pg = gl.createProgram();
  gl.attachShader(pg, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(pg, compile(gl, gl.FRAGMENT_SHADER, fsSource()));
  gl.linkProgram(pg);
  if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pg));
  gl.useProgram(pg);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ['uSize','uPx','uOrg','uS','uT','uGrid','uMask','uRiv','uRivSize','uSeason','uRain','uStorm','uFog','uSnow','uHeat','uTan','uShade','uCloud','uQ']
    .forEach(function(n){ FX.U[n] = gl.getUniformLocation(pg, n); });
  FX.mask = gl.createTexture(); FX.rivTex = gl.createTexture();
  [FX.mask, FX.rivTex].forEach(function(t, i){
    gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, i ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, i ? gl.LINEAR : gl.NEAREST);
  });
  gl.uniform1i(FX.U.uMask, 0); gl.uniform1i(FX.U.uRiv, 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.clearColor(0, 0, 0, 0);
  cv.addEventListener('webglcontextlost', function(e){ e.preventDefault(); FX.fail = true; cv.style.display = 'none'; });
  document.body.appendChild(cv);
  FX.cv = cv; FX.gl = gl; FX.pg = pg;
}

/* ---------- dane z gry: maska pól (typ terenu, widoczność, budowle) ---------- */
function buildMask(V){
  if (!FX.gl || typeof S === 'undefined' || !S || !S.t) return;
  var gl = FX.gl, w = S.w, h = S.h, n = w * h, d = new Uint8Array(n * 4), i;
  var all = (typeof spec !== 'undefined' && spec), seen = all ? null : S.pl[meIdx()].seen;
  for (i = 0; i < n; i++){
    d[i*4] = (+S.t[i]) * 32;
    d[i*4+1] = (all || seen[i] == '1') ? 255 : 0;
    d[i*4+2] = (V && V[i]) ? 255 : 0;
  }
  (S.hs || []).forEach(function(k){ if (k >= 0 && k < n) d[k*4+3] = 85; });
  (S.tw || []).forEach(function(k){ if (k >= 0 && k < n) d[k*4+3] = 170; });
  (S.cities || []).forEach(function(c){ var k = c.r * w + c.q; if (k >= 0 && k < n) d[k*4+3] = 255; });
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FX.mask);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
  FX.maskW = w; FX.maskH = h; FX.maskOK = true;
}

/* tekstura rzek: kolor = kierunek przepływu, alfa = pokrycie */
function buildRivers(){
  if (!FX.gl || !S) return;
  var key = (S.rv || null);
  if (FX.rivKey === key && FX.rivW === S.w && FX.rivH === S.h && key !== null) return;
  if (FX.rivKey === key && key === null && FX.rivW === S.w && FX.rivH === S.h) return;
  var gl = FX.gl, bw = Math.ceil(W * (S.w + .5) + 10), bh = Math.ceil(R * 1.5 * S.h + R * .5 + 10);
  var mx = gl.getParameter(gl.MAX_TEXTURE_SIZE), k = Math.min(1, mx / Math.max(bw, bh), 2048 / Math.max(bw, bh) * 1.6);
  var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bw * k)); c.height = Math.max(1, Math.round(bh * k));
  var g = c.getContext('2d'); g.scale(k, k); g.lineCap = 'round'; g.lineWidth = 7;
  var segs = (typeof rvData === 'function') ? rvData().segs : [];
  segs.forEach(function(s){
    var dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1;
    g.strokeStyle = 'rgb(' + Math.round(128 + dx / L * 127) + ',' + Math.round(128 + dy / L * 127) + ',255)';
    g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.stroke();
  });
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, FX.rivTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  FX.rivKey = key; FX.rivW = S.w; FX.rivH = S.h; FX.rivSize = [bw, bh];
}

/* po każdym rysowaniu mapy odśwież maskę (V = widoczność) */
function hookDraw(){
  if (typeof window.draw !== 'function' || window.draw.__ifx) return;
  var orig = window.draw;
  var wrapped = function(V){
    var r = orig.apply(this, arguments);
    try { if (FX.gl) { buildMask(V); buildRivers(); } else FX.pendingV = V; } catch (e) {}
    return r;
  };
  wrapped.__ifx = true;
  window.draw = wrapped;
}

/* ---------- panel ustawień efektów ---------- */
function redrawAll(){
  try { if (typeof S !== 'undefined' && S && typeof draw === 'function') draw(vision(meIdx())); } catch (e) {}
  try { if (typeof FZ !== 'undefined' && FZ && typeof fzSched === 'function') fzSched(); } catch (e) {}
}
function syncPanel(){
  if (!FX.panel) return;
  FX.panel.querySelectorAll('[data-q]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-q') === FX.q); });
  FX.panel.querySelectorAll('input[data-o]').forEach(function(c){ c.checked = FX.opt[c.getAttribute('data-o')] !== false; });
}
function ensureBtn(){
  if (FX.btn) return;
  var st = document.createElement('style');
  st.textContent = '#ifx{position:fixed;z-index:3;pointer-events:none;display:none}' +
    '#ifxBtn{position:fixed;z-index:45;display:none;padding:5px 10px;font:600 11.5px system-ui,sans-serif;color:#f0d9ad;' +
    'background:rgba(13,23,38,.72);border:1px solid rgba(214,170,91,.4);border-radius:999px;cursor:pointer;backdrop-filter:blur(6px)}' +
    '#ifxBtn:hover{background:rgba(30,45,68,.88)}' +
    '#ifxPanel{position:fixed;z-index:46;display:none;width:268px;padding:12px 14px;font:12.5px system-ui,sans-serif;color:#d6dfeb;' +
    'background:rgba(13,23,38,.96);border:1px solid rgba(214,170,91,.45);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.5)}' +
    '#ifxPanel b{display:block;color:#f0d9ad;font-size:13.5px;margin-bottom:8px}' +
    '#ifxPanel .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid rgba(164,184,211,.1)}' +
    '#ifxPanel .seg{display:flex;gap:3px}' +
    '#ifxPanel .seg button{padding:3px 8px;font:600 11px system-ui,sans-serif;color:#c5d0df;background:rgba(255,255,255,.06);border:1px solid rgba(164,184,211,.25);border-radius:7px;cursor:pointer}' +
    '#ifxPanel .seg button.on{background:#d6aa5b;color:#1a1408;border-color:#d6aa5b}' +
    '#ifxPanel label.row{cursor:pointer}#ifxPanel input{accent-color:#d6aa5b;width:15px;height:15px}' +
    '#ifxPanel small{display:block;margin-top:8px;color:#8d9db0;font-size:11px;line-height:1.35}';
  document.head.appendChild(st);
  var b = document.createElement('button'); b.id = 'ifxBtn'; b.type = 'button'; b.textContent = '✨ Efekty';
  b.title = 'Ustawienia efektów wizualnych (woda, cienie, przejścia, grafika przybliżenia)';
  var p = document.createElement('div'); p.id = 'ifxPanel';
  p.innerHTML = '<b>✨ Efekty wizualne</b>' +
    '<div class="row"><span>Shader mapy<br><small style="margin:0">woda, rzeki, cienie</small></span><span class="seg"><button type="button" data-q="high">Wysoki</button><button type="button" data-q="low">Niski</button><button type="button" data-q="off">Wył.</button></span></div>' +
    '<label class="row"><span>Cienie</span><input type="checkbox" data-o="shadow"></label>' +
    '<label class="row"><span>Cienie chmur</span><input type="checkbox" data-o="cloud"></label>' +
    '<label class="row"><span>Płynne przejścia kolorów między polami</span><input type="checkbox" data-o="blend"></label>' +
    '<label class="row"><span>Ulepszona grafika przybliżenia i bitwy</span><input type="checkbox" data-o="zoom"></label>' +
    '<label class="row"><span>Animacja wody w przybliżeniu</span><input type="checkbox" data-o="anim"></label>' +
    '<small>Przy słabszym sprzęcie wybierz „Niski” albo „Wył.”. Ustawienia są zapamiętywane.</small>';
  b.onclick = function(e){ e.stopPropagation(); p.style.display = p.style.display === 'block' ? 'none' : 'block'; syncPanel(); };
  p.addEventListener('click', function(e){ e.stopPropagation(); });
  p.addEventListener('wheel', function(e){ e.stopPropagation(); }, {passive: true});
  p.querySelectorAll('[data-q]').forEach(function(x){
    x.onclick = function(){ FX.q = x.getAttribute('data-q'); FX.scale = 1; FX.slow = FX.fast = 0; FX.save(); syncPanel(); redrawAll(); };
  });
  p.querySelectorAll('input[data-o]').forEach(function(x){
    x.onchange = function(){ FX.opt[x.getAttribute('data-o')] = x.checked; FX.save(); redrawAll(); };
  });
  document.addEventListener('pointerdown', function(e){ if (p.style.display === 'block' && !p.contains(e.target) && e.target !== b) p.style.display = 'none'; }, true);
  document.body.appendChild(b); document.body.appendChild(p); FX.btn = b; FX.panel = p; syncPanel();
}
function placeUI(rc){
  var fz = (typeof FZ !== 'undefined' && FZ) ? document.getElementById('fzw') : null, x, y;
  if (fz){ var fr = fz.getBoundingClientRect(); x = fr.right - 104; y = fr.top + 108; }
  else { x = rc.left + 10; y = rc.top + 10; }
  FX.btn.style.display = 'block'; FX.btn.style.left = x + 'px'; FX.btn.style.top = y + 'px';
  var pw = FX.panel, pl = Math.max(8, Math.min(window.innerWidth - 280, x)), pt = y + 32;
  if (pt + 330 > window.innerHeight) pt = Math.max(8, y - 330);
  pw.style.left = pl + 'px'; pw.style.top = pt + 'px';
}

/* ---------- pętla ---------- */
function frame(ts){
  requestAnimationFrame(frame);
  ensureBtn();
  var game = document.getElementById('game'), wrap = document.getElementById('wrap');
  var active = typeof S !== 'undefined' && S && game && game.style.display !== 'none' && wrap && !document.hidden;
  var rc = active ? wrap.getBoundingClientRect() : null;
  if (!active || rc.width < 10 || rc.height < 10){ if (FX.cv) FX.cv.style.display = 'none'; FX.btn.style.display = 'none'; FX.panel.style.display = 'none'; return; }
  placeUI(rc);
  var battle = (typeof FZ !== 'undefined' && FZ);
  if (FX.q === 'off' || FX.fail || battle){ if (FX.cv) FX.cv.style.display = 'none'; return; }
  if (!FX.gl){
    try { initGL(); hookDraw(); if (FX.pendingV) { buildMask(FX.pendingV); buildRivers(); } else { buildMask(null); buildRivers(); } }
    catch (e) { FX.fail = true; if (window.console) console.warn('Imperia FX wyłączone:', e.message || e); return; }
  }
  hookDraw();
  if (!FX.maskOK) return;
  /* niska jakość: 30 kl./s */
  if (FX.q === 'low' && ts - FX.lastDraw < 30) return;
  FX.lastDraw = ts;
  /* adaptacyjna rozdzielczość */
  var dt = ts - FX.lastTs; FX.lastTs = ts;
  if (dt > 0 && dt < 200){
    FX.ema = FX.ema * .94 + dt * .06;
    var budget = FX.q === 'low' ? 36 : 22;
    if (FX.ema > budget) { if (++FX.slow > 40){ FX.scale = Math.max(.45, FX.scale * .85); FX.slow = 0; } } else FX.slow = 0;
    if (FX.ema < budget * .6) { if (++FX.fast > 240){ FX.scale = Math.min(1, FX.scale * 1.12); FX.fast = 0; } } else FX.fast = 0;
  }
  var cv = FX.cv, gl = FX.gl, wv = Math.round(rc.width), hv = Math.round(rc.height);
  var base = FX.q === 'low' ? .6 : Math.min(1.5, window.devicePixelRatio || 1);
  var pr = Math.max(.4, base * FX.scale);
  var cw = Math.max(2, Math.round(wv * pr)), ch = Math.max(2, Math.round(hv * pr));
  if (cv.width !== cw || cv.height !== ch){ cv.width = cw; cv.height = ch; }
  cv.style.display = 'block'; cv.style.left = rc.left + 'px'; cv.style.top = rc.top + 'px';
  cv.style.width = wv + 'px'; cv.style.height = hv + 'px';
  gl.viewport(0, 0, cw, ch);

  var map = document.getElementById('cv'), cr = map.getBoundingClientRect();
  var bw = (typeof boardW !== 'undefined' && boardW) ? boardW : (W * (S.w + .5) + 10);
  var sc = cr.width / bw;
  var se = (typeof wxSeasonIdx === 'function') ? wxSeasonIdx(S.round) : 1;
  var wk = (typeof wxKey === 'function') ? wxKey() : 'clear';
  var rain = wk === 'rain' ? .7 : wk === 'storm' ? 1 : 0;
  var storm = wk === 'storm' ? 1 : wk === 'blizzard' ? .6 : 0;
  var fog = wk === 'fog' ? 1 : 0, snow = wk === 'snow' ? .6 : wk === 'blizzard' ? 1 : 0, heat = wk === 'heat' ? 1 : 0;
  var shade = 1 - .75 * fog - .6 * (wk === 'storm' ? 1 : 0) - .45 * (wk === 'rain' ? 1 : 0) - .3 * (wk === 'blizzard' ? 1 : 0);
  var cloud = wk === 'clear' ? 1 : wk === 'heat' ? .7 : wk === 'snow' ? .5 : .2;
  var U = FX.U;
  gl.uniform2f(U.uSize, wv, hv); gl.uniform1f(U.uPx, cw / wv);
  gl.uniform2f(U.uOrg, cr.left - rc.left, cr.top - rc.top); gl.uniform1f(U.uS, sc);
  gl.uniform1f(U.uT, ((performance.now() - FX.t0) / 1000) % 3600);
  gl.uniform2f(U.uGrid, FX.maskW, FX.maskH); gl.uniform2f(U.uRivSize, FX.rivSize[0], FX.rivSize[1]);
  gl.uniform1f(U.uSeason, se); gl.uniform1f(U.uRain, rain); gl.uniform1f(U.uStorm, storm);
  gl.uniform1f(U.uFog, fog); gl.uniform1f(U.uSnow, snow); gl.uniform1f(U.uHeat, heat);
  gl.uniform1f(U.uTan, [.85, .75, .65, .55][se] || .75);
  gl.uniform1f(U.uShade, FX.opt.shadow ? Math.max(.15, shade) : 0); gl.uniform1f(U.uCloud, FX.opt.cloud ? cloud : 0);
  gl.uniform1f(U.uQ, FX.q === 'high' ? 1 : 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

hookDraw();
requestAnimationFrame(frame);
})();
