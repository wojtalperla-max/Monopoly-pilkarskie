
/* ===== HUB v2: miniatury gier + rozwijany podgląd ===== */
(function(){
const Y='#ffd23f',P='#ff5fa2',M='#5ee6c8',S='#7aa2ff',D='#1a1033',C='#fff6dd',O='#ff9f43',G='#6fd08c',W='#ffffff';
const R=(x,y,w,h,f,r=0,e='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${e}/>`;
const K=(x,y,r,f,e='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${e}/>`;
const T=(x,y,s,f,t,e='')=>`<text x="${x}" y="${y}" font-size="${s}" fill="${f}" text-anchor="middle" font-weight="700" ${e}>${t}</text>`;
const L=(a,b,c,d,col,w,e='')=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${e}/>`;
const PG=(p,f,e='')=>`<polygon points="${p}" fill="${f}" ${e}/>`;
const PA=(d,col,w,e='')=>`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${e}/>`;
const FL='class="fl"',F2='class="fl2"',ST='stroke="#1a1033" stroke-opacity=".35"';
const hex=(cx,cy,r)=>{let p=[];for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);p.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1))}return p.join(' ')};
const card=(x,y,w,h,f,t,tc,rot,e='')=>`<g transform="rotate(${rot} ${x+w/2} ${y+h/2})" ${e}>${R(x,y,w,h,f,6,'stroke="#fff" stroke-width="3"')}${T(x+w/2,y+h/2+8,Math.min(h/3,w*1.45/t.length),tc,t)}</g>`;
const PV={
1:['#2a1b52',()=>{let s='',w=170/6,c=[P,Y,M,S,O];s+=R(75,15,170,170,C,8,ST);
 for(let i=0;i<6;i++){s+=R(75+i*w,15,w,w,c[i%5],0,ST)+R(75+i*w,185-w,w,w,c[(i+2)%5],0,ST);if(i&&i<5){s+=R(75,15+i*w,w,w,c[(i+1)%5],0,ST)+R(245-w,15+i*w,w,w,c[(i+3)%5],0,ST)}}
 s+=R(75+w,15+w,170-2*w,170-2*w,'#2a1b52',4)+T(160,102,44,Y,'⚽',FL)+T(160,150,16,M,'POT 12 500')+K(96,36,7,P,ST+' '+F2)+K(228,160,7,S,ST);
 s+=R(20,140,36,36,W,7,FL)+K(30,150,3,D)+K(46,166,3,D)+K(38,158,3,D)+R(264,28,36,36,W,7,F2)+K(274,38,3,D)+K(290,54,3,D);return s}],
2:['#2a1b52',()=>{let s=T(160,40,22,Y,'ZGADUJ SŁOWO'),L1=['K','O','T','_','_'];
 L1.forEach((l,i)=>{s+=R(36+i*52,64,44,56,i<3?C:'#3b2575',9,'stroke="#ffd23f" stroke-width="3"')+T(58+i*52,104,36,i<3?D:Y,l=='_'?'?':l,i>2?FL:'')});
 s+=R(40,148,110,34,P,12)+T(95,172,18,W,'◀ PRZED')+R(170,148,110,34,M,12)+T(225,172,18,D,'PO ▶');return s}],
3:['#1d3f94',()=>{let s='';for(let i=0;i<5;i++)s+=PA('M0 '+(150+i*12)+' q40 -10 80 0 t80 0 t80 0 t80 0','#ffffff22',3);
 const I=[[70,60,'🌴',G],[165,45,'🦜',M],[255,80,'🐚',Y],[110,135,'⭐',O],[225,150,'🌺',P]];
 s+=PA('M70 60 L165 45 L255 80 L225 150 L110 135 Z','#fff',3,'stroke-dasharray="6 7" stroke-opacity=".8"');
 I.forEach(([x,y,e,c],i)=>{s+=`<g ${i%2?F2:FL}>`+`<ellipse cx="${x}" cy="${y}" rx="38" ry="26" fill="${c}" stroke="#fff" stroke-width="3"/>`+T(x,y+10,28,D,e)+'</g>'});return s}],
4:['#2a1b52',()=>{let s='';[[60,'PIES',P],[160,'KRÓL',Y],[260,'PIZZA',M]].forEach(([x,w,c],i)=>{
 s+=`<g ${i==1?FL:F2}>`+K(x,92,30,'#ffd9b0','stroke="#fff" stroke-width="3"')+R(x-36,52,72,24,c,6,'stroke="#fff" stroke-width="3"')+T(x,70,17,D,w)+K(x-10,96,3,D)+K(x+10,96,3,D)+PA(`M${x-10} 108 q10 8 20 0`,D,3)+'</g>'});
 s+=R(40,146,240,26,W,13)+T(160,165,17,D,'Czy to zwierzę?');s+=R(60,176,90,20,M,10)+T(105,191,14,D,'TAK')+R(170,176,90,20,P,10)+T(215,191,14,W,'NIE');return s}],
5:['#2a1b52',()=>{let s=K(46,46,30,Y,'stroke="#fff" stroke-width="3" '+FL)+T(46,60,42,D,'M')+T(190,34,18,W,'Litera!')+R(236,16,70,28,P,14)+T(271,36,17,W,'0:24');
 const H=['Państwo','Miasto','Zwierzę','Imię'];H.forEach((h,i)=>{s+=R(14+i*75,88,70,24,S,6)+T(49+i*75,105,13,D,h)});
 [['Maroko','Moskwa','Mors','Marta',1],['Malta','Mediolan','Małpa','Michał',0]].forEach((r,j)=>{for(let i=0;i<4;i++)s+=R(14+i*75,118+j*36,70,30,j?'#3b2575':C,6)+T(49+i*75,138+j*36,13,j?Y:D,j?'…':r[i])});return s}],
6:['#241347',()=>{let s='',cl=[P,M,S,Y,'#3b2575'];for(let j=0;j<5;j++)for(let i=0;i<8;i++){const o=((i>>1)*3+(j>>1)*2+(i+j>5?1:0))%5;s+=R(20+i*35,14+j*35,33,33,cl[o],5,ST)}
 return s+T(90,60,22,D,'🏰',FL)+T(230,130,22,D,'💣',F2)+K(160,100,13,Y,'stroke="#b8860b" stroke-width="3" '+FL)+T(160,106,14,D,'$')+T(265,50,20,D,'🪙',F2)}],
7:['#12295f',()=>{let s='',g=(x0,hit)=>{let q=R(x0-3,24,150,150,'#2b4ea8',8,'stroke="#fff" stroke-width="3"');for(let i=0;i<8;i++)for(let j=0;j<8;j++)q+=R(x0+i*18,27+j*18,17,17,'#3f66c9',2);return q};
 s+=g(12)+g(164);[[0,1,4,1],[2,3,1,3],[5,3,1,4],[1,6,3,1]].forEach(([i,j,a,b])=>{s+=R(12+i*18,27+j*18,a*18-1,b*18-1,'#cfd8e8',7,'stroke="#fff"')});
 [[2,2],[3,2],[4,5],[6,1]].forEach(([i,j],k)=>{s+=K(164+i*18+9,27+j*18+9,6,k<2?'#ff4d4d':W,k<2?FL:'')});s+=T(80,17,14,W,'TWOJA FLOTA')+T(232,17,14,Y,'ATAK!');return s}],
8:['#2a1b52',()=>{let s=T(160,30,20,Y,'ZŁAM KOD');[['4719',[1,0,1,0]],['4853',[1,0,0,0]],['4217',[1,1,1,1]]].forEach(([d,k],j)=>{[...d].forEach((c,i)=>{s+=R(52+i*56,48+j*46,48,38,k[i]?'#2fbf71':'#c0394f',9,'stroke="#fff" stroke-width="3"')+T(76+i*56,76+j*46,28,W,c)})});return s}],
12:['#1a1033',()=>{let s='',cl=['#4caf6a','#c9b458','#4f8fd9','#2f8f5a'],r=19;for(let j=0;j<5;j++)for(let i=0;i<9;i++){const x=34+i*33+(j%2)*16.5,y=30+j*32;s+=PG(hex(x,y,r),cl[(i*5+j*3+i*j)%4],'stroke="#1a1033" stroke-width="2"')}
 s+=PG(hex(116,62,r),P,'stroke="#fff" stroke-width="3"')+T(116,70,20,W,'🏰')+PG(hex(214,126,r),S,'stroke="#fff" stroke-width="3"')+T(214,134,20,W,'🏰')+T(165,94,22,Y,'⚔️',FL)+T(84,126,18,W,'🛡️',F2);return s}],
13:['#2a1b52',()=>{let s='',em=['😀','🧔','👩','🧑‍🎤','👴','👧'],cl=[P,Y,M,S,O,G];for(let j=0;j<4;j++)for(let i=0;i<6;i++){const x=24+i*46,y=10+j*47,off=(i*3+j*5)%7<3;s+=R(x,y,42,43,off?'#3b2575':cl[(i+j*2)%6],9,'stroke="#fff" stroke-width="2"')+(off?T(x+21,y+30,26,'#ffffff55','✖'):T(x+21,y+30,26,D,em[(i+j)%6]))}return s}],
14:['#6aa9ff',()=>{let s=K(260,40,22,Y,FL)+R(0,100,320,100,'#6fbf73')+PG('120,100 200,100 300,200 20,200','#4a4a5e')+L(160,100,160,200,'#ffd23f',3,'stroke-dasharray="10 8"');
 [[10,50,50,50,'#e0527a'],[60,30,45,70,'#7a5fd6'],[215,55,45,45,'#ff9f43'],[262,66,48,34,'#5ee6c8']].forEach(([x,y,w,h,c])=>{s+=R(x,y,w,h,c,3);for(let a=0;a<3;a++)for(let b=0;b<Math.floor(h/18);b++)s+=R(x+6+a*(w/3.4),y+6+b*16,8,9,'#fff6dd')});
 s+=K(160,150,14,'#ffd9b0','stroke="#1a1033" stroke-width="2"')+R(148,163,24,24,P,7)+R(10,10,110,26,'#0007',13)+T(65,29,15,W,'❤️ 90  💰 120')+R(250,170,56,22,'#0007',11)+T(278,186,13,W,'WASD');return s}],
15:['#2a1b52',()=>{let s=L(120,30,120,170,Y,7)+L(200,30,200,170,Y,7)+L(70,78,250,78,Y,7)+L(70,125,250,125,Y,7);
 s+=T(94,66,46,P,'✕')+T(160,112,46,M,'◯',FL)+T(226,158,46,P,'✕')+T(160,66,46,M,'◯')+T(94,158,46,P,'✕',F2);return s}],
16:['#3a1230',()=>{let s='',cl=[P,Y,M,S,O,G];s+=R(40,70,100,70,'#ffd9b0',30,'stroke="#fff" stroke-width="3" '+FL)+R(180,70,100,70,'#ffd9b0',30,'stroke="#fff" stroke-width="3" '+F2);
 for(let i=0;i<9;i++)s+=K(62+(i%3)*22,92+Math.floor(i/3)*18,9,cl[i%6],'stroke="#1a1033" stroke-width="2"');for(let i=0;i<5;i++)s+=K(206+(i%3)*22,96+Math.floor(i/3)*20,9,cl[(i+2)%6],'stroke="#1a1033" stroke-width="2"');
 return s+T(160,40,24,Y,'PARZYSTE?')+R(60,158,90,28,M,14)+T(105,178,15,D,'PARZYSTE')+R(170,158,90,28,P,14)+T(215,178,15,W,'NIEPARZYSTE')}],
17:['#2a1b52',()=>{let s='',cl=[P,Y,M,S];for(let j=0;j<5;j++)for(let i=0;i<8;i++){const n=(4-j)*8+((4-j)%2?8-i:i+1);s+=R(60+i*25,12+j*35,24,34,cl[(i+j)%4],3,ST)+T(72+i*25,34+j*35,11,D,n)}
 s+=L(90,162,135,60,'#a0612b',5)+L(104,166,149,64,'#a0612b',5);for(let k=0;k<5;k++)s+=L(95+k*9,146-k*20,111+k*9,150-k*20,'#a0612b',3);
 s+=PA('M215 24 C170 50 250 80 195 110 S190 140 175 150','#2fbf71',9,FL)+K(215,24,9,'#2fbf71')+K(212,22,2,D)+K(220,22,2,D);return s+T(80,190,16,W,'🎲',F2)}],
18:['#3a1230',()=>{let s=card(48,36,110,130,S,'PRAWDA',W,-8,FL)+card(164,32,110,130,P,'WYZWANIE',W,7,F2);return s+T(220,60,28,Y,'🔥')+T(100,60,28,Y,'🤫')+R(130,150,60,32,'#c0394f',16,'stroke="#fff" stroke-width="3"')+T(160,173,20,W,'18+')}],
19:['#2a1b52',()=>{let s='',em=['🐞','🌵','⭐','🍕','🔔','🎈','🐱','🍩'];[[88,100,88],[232,100,80]].forEach(([x,y,r],k)=>{s+=K(x,y,r,W,'stroke="#ffd23f" stroke-width="5"');for(let i=0;i<7;i++){const a=i*6.283/7+k,rr=i?r*.55:0;s+=T(x+rr*Math.cos(a),y+rr*Math.sin(a)+9,i%3?22:30,D,em[(i+k*2)%8],i==2?FL:'')}});return s+K(160,100,16,Y,'stroke="#fff" stroke-width="3"')+T(160,106,16,D,'=')}],
20:['#173d2a',()=>{let s='';[[24,40],[290,48],[40,160],[285,150],[160,20]].forEach(([x,y],i)=>{s+=T(x,y,34,G,'🌲',i%2?FL:F2)});
 s+=PA('M40 170 C100 170 100 110 160 110 S230 70 270 50','#c9a36a',16)+PA('M40 170 C100 170 100 110 160 110 S230 70 270 50','#fff6dd',3,'stroke-dasharray="3 10"');
 return s+T(90,130,24,W,'🍄',FL)+T(210,96,26,'#e53935','🍄',F2)+T(272,48,24,W,'🏁')+K(50,164,10,P,'stroke="#fff" stroke-width="3"')+T(150,190,14,Y,'+1 🟤  −1 🍄')}],
21:['#2a1b52',()=>{let s=L(40,180,130,180,C,6)+L(70,180,70,24,C,6)+L(70,24,130,24,C,6)+L(130,24,130,46,C,6)+K(130,60,14,'none','stroke="#ff5fa2" stroke-width="5"')+L(130,74,130,114,P,5)+L(130,84,110,102,P,5)+L(130,84,150,102,P,5)+L(130,114,114,140,P,5);
 [...'_A__A_'].forEach((l,i)=>{s+=R(172+(i%3)*44,36+Math.floor(i/3)*0,0,0,'none')});
 [...'_AN_A'].forEach((l,i)=>{s+=L(172+i*26,92,192+i*26,92,Y,4)+(l!='_'?T(182+i*26,86,24,W,l):'')});
 [...'ABCDEFGHIJKL'].forEach((l,i)=>{s+=R(168+(i%6)*26,112+Math.floor(i/6)*30,23,26,i%5==0?'#c0394f':'#3b2575',5)+T(179.5+(i%6)*26,131+Math.floor(i/6)*30,16,W,l)});return s}],
22:['#0f4c5c',()=>{let s='';[[40,170,6],[90,40,9],[250,150,8],[290,50,5],[200,30,7],[140,180,5]].forEach(([x,y,r],i)=>{s+=K(x,y,r,'#ffffff33','stroke="#fff" stroke-opacity=".5" '+(i%2?FL:F2))});
 s+=card(70,80,70,100,W,'7♥','#d62b4b',-16)+card(115,70,70,100,W,'K♠',D,-4)+card(160,72,70,100,W,'A♦','#d62b4b',9)+card(205,84,70,100,W,'Q♣',D,20);
 return s+T(70,52,36,O,'🐟',FL)+T(255,56,28,P,'🐠',F2)+R(98,10,124,28,Y,14)+T(160,30,18,D,'Go Fish!')}],
23:['#2a1b52',()=>{let s='',X=i=>60+i*50,Yy=j=>25+j*50;const sq=(i,j,c,t)=>R(X(i),Yy(j),50,50,c+'88',0)+T(X(i)+25,Yy(j)+34,22,W,t);
 s+=sq(0,0,P,'A')+sq(1,0,M,'B')+sq(2,1,P,'A');
 for(let j=0;j<4;j++)for(let i=0;i<4;i++){if(j<3)s+=L(X(i),Yy(j),X(i),Yy(j+1),(i+j)%3?M:P,(i+j)%2?5:0);if(i<4&&i<4)s+=L(X(i),Yy(j),X(i+1),Yy(j),(i*2+j)%3?P:M,(i+j)%3==1?0:5)}
 for(let j=0;j<4;j++)for(let i=0;i<5;i++)s+=K(X(i),Yy(j),6,W);return s}],
24:['#3a1230',()=>{let s='',cl=['#e53935',Y,'#43a047','#1e88e5','#222'],t=['7','⇄','2','+2','+4'];
 cl.forEach((c,i)=>{const x=60+i*38,rot=-30+i*15;s+=`<g transform="rotate(${rot} ${x+28} 200)" ${i==2?FL:''}>`+R(x,80,56,84,c,9,'stroke="#fff" stroke-width="4"')+`<ellipse cx="${x+28}" cy="122" rx="20" ry="30" fill="#fff" fill-opacity=".92" transform="rotate(20 ${x+28} 122)"/>`+T(x+28,132,26,c=='#222'?'#222':c,t[i])+'</g>'});
 return s+T(160,40,34,Y,'UNO!')}],
25:['#1f4d36',()=>{let s='',n=[[12,35,64,88],[7,18,50],[22,41,77,90,99],[3,29,56,71]];n.forEach((r,j)=>r.forEach((v,i)=>{s+=R(18+i*46,12+j*33,42,30,W,5,'stroke="#1a1033" stroke-width="2"')+T(39+i*46,32+j*33,15,D,v)+K(26+i*46,36+j*33,2.5,'#c0394f')}));
 [[200,'55'],[236,'86'],[272,'🐮']].forEach(([x,t],i)=>{s+=`<g ${i==1?FL:''}>`+R(x,140,36,50,Y,6,'stroke="#fff" stroke-width="3"')+T(x+18,172,16,D,t)+'</g>'});return s+T(110,185,15,W,'wybierz kartę!')}],
26:['#2a1b52',()=>{let s=R(70,10,180,180,C,12,ST);[[70,10,P],[190,10,Y],[70,130,M],[190,130,S]].forEach(([x,y,c],i)=>{s+=R(x,y,60,60,c,12,ST)+K(x+18,y+18,8,W,'stroke="#1a1033"')+K(x+42,y+18,8,W)+K(x+18,y+42,8,W)+K(x+42,y+42,8,W)});
 for(let k=0;k<5;k++){s+=K(160,22+k*13,5,k==4?P:C,ST)+K(160,138+k*13,5,k==0?M:C,ST)+K(98+k*13,100,5,k==0?P:C,ST)+K(222-k*13+ -0,100,5,k==4?S:C,ST)}
 return s+PG('160,84 176,100 160,116 144,100',Y,ST)+T(214,84,26,D,'🎲',FL)+K(88,28,7,W,'stroke="#1a1033" stroke-width="2"')+K(96,28,7,P,'stroke="#fff" stroke-width="2" '+F2)}],
27:['#0d0620',()=>{let s='';for(let i=0;i<9;i++)s+=L(i*40,0,i*40,200,'#ffffff12',1)+L(0,i*25,320,i*25,'#ffffff12',1);
 [[60,50],[90,160],[250,40],[270,150],[210,100],[130,30]].forEach(([x,y],i)=>{s+=R(x,y,12,12,[P,Y,M,S,O,G][i],3,i%2?FL:F2)});
 s+=K(150,105,46,'#000','stroke="#7aa2ff" stroke-width="5"')+K(150,105,64,'none','stroke="#7aa2ff" stroke-opacity=".35" stroke-width="3"')+K(150,105,28,'#1a1033')+T(150,70,13,W,'TY 1240')+K(250,70,26,'#000','stroke="#ff5fa2" stroke-width="4"')+T(250,40,12,W,'BOT 610');
 return s+R(12,10,64,22,'#0009',11)+T(44,26,14,Y,'⏱ 2:41')}],
28:['#2a1b52',()=>{let s=R(60,10,200,36,Y,18,FL)+T(160,35,20,D,'💰 1 000 000 zł')+R(30,58,260,42,W,12)+T(160,85,18,D,'Stolica Australii?');
 [['A Sydney',40,'#c0394f'],['B Canberra',200,'#2fbf71'],['C Perth',40,'#c0394f'],['D Melbourne',100,'#c0394f']].forEach(([n,w,c],i)=>{const x=20+(i%2)*150,y=112+Math.floor(i/2)*44;s+=R(x,y,140,38,'#3b2575',10,'stroke="#fff" stroke-width="2"')+R(x+4,y+24,Math.min(132,w*.66),10,c,5)+T(x+70,y+17,14,W,n)});return s}],
29:['#07070b',()=>{let s=PG('0,0 320,0 205,70 115,70','#15110e')+PG('0,200 320,200 205,130 115,130','#1d1813')+PG('0,0 115,70 115,130 0,200','#241c16')+PG('320,0 205,70 205,130 320,200','#1a140f')+R(115,70,90,60,'#050507');
 s+=PG('160,178 96,34 224,34','#fff3c4','fill-opacity=".12" '+F2)+PG('160,178 132,72 188,72','#fff3c4','fill-opacity=".14"');
 s+=`<g ${FL}>`+K(160,90,15,'#0d0d10')+R(146,98,28,32,'#0d0d10',8)+K(154,88,3.2,'#ff2a2a')+K(166,88,3.2,'#ff2a2a')+'</g>';
 s+=T(42,52,24,Y,'🗝️',F2)+T(280,150,20,Y,'🗝️',FL)+R(12,166,96,22,'#0009',11)+T(60,182,13,'#e8d9a0','KLUCZE 2/5')+R(238,12,70,20,'#0009',10)+K(252,22,4,'#b3262d')+T(284,27,12,W,'SZEPT');return s}],
32:['#05060a',()=>{let s='';
 [[0,0,64,72],[256,0,64,62],[0,134,52,66],[268,118,52,82],[118,8,84,22]].forEach(([x,y,w,h])=>{s+=R(x,y,w,h,'#12141c',2,'stroke="#ffffff22"')});
 s+=PG('160,178 62,34 258,34','#fff3c4','fill-opacity=".15" '+F2)+PG('160,178 112,64 208,64','#fff3c4','fill-opacity=".2"');
 s+=`<g ${FL}>`+K(262,46,10,'#d83a3a','stroke="#ff2020" stroke-width="3"')+R(244,44,14,4,'#2b2b2b',2)+`</g>`;
 [[160,150,'#4cc9f0'],[118,124,'#ef476f'],[204,118,'#06d6a0']].forEach(([x,y,c],i)=>{s+=K(x,y,10,c,'stroke="#3dff7a" stroke-opacity=".6" stroke-width="2"')+R(x+2,y-2,20,4,'#2b2b2b',2)+R(x-14,y-20,28,3,'#3dff7a',1)});
 s+=L(172,146,238,70,'#ffe066',2,F2)+K(176,142,5,'#fff3c4',FL);
 return s+T(160,24,16,'#ff2d8a','DARK SWEEP')+R(12,170,92,22,'#0009',11)+T(58,186,13,'#3dff7a','25 : 21')}]
};
const NAMES={};
function svg(n){const p=PV[n];if(!p)return '';return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" font-family="Fredoka,system-ui,sans-serif" aria-hidden="true">${R(0,0,320,200,p[0])}${K(280,10,60,'#ffffff0d')}${K(20,200,70,'#ffffff0a')}${p[1]()}</svg>`}
function init(){
  const sg=document.getElementById('hubsubg');if(!sg||sg.dataset.v2)return;sg.dataset.v2=1;
  sg.querySelectorAll('button').forEach(b=>{const m=/hubTab\((\d+)\)/.exec(b.getAttribute('onclick')||'');if(!m)return;const n=+m[1];NAMES[n]=b.textContent;b.dataset.n=n;b.innerHTML=`<span class="tp">${svg(n)}</span><span>${b.textContent}</span>`});
}
let pendingOpen=false,lastBtn=null,orig=window.hubTab;
function order(){return [...document.querySelectorAll('#hubsubg button[data-n]')].map(b=>+b.dataset.n)}
function closePop(){const hp=document.getElementById('hubp'),bd=document.getElementById('hubbd');if(bd)bd.remove();if(hp){hp.classList.remove('pop','swap');hp.classList.add('gm-off')}}
function nav(d){const o=order(),cur=document.querySelector('#hubsubg button.on'),i=o.indexOf(+(cur&&cur.dataset.n));if(i<0)return;pendingOpen='swap';window.hubTab(o[(i+d+o.length)%o.length])}
window.hubTab=function(n){
  const open=pendingOpen;pendingOpen=false;
  orig(n);
  const hp=document.getElementById('hubp');if(!hp)return;
  const isGame=document.getElementById('hubsubg')&&!document.getElementById('hubsubg').hidden&&PV[n];
  const old=document.getElementById('hubbd');if(old)old.remove();
  hp.classList.remove('pop','swap','gm-off');
  if(!isGame){return}
  if(!open){hp.classList.add('gm-off');return}
  const body=document.createElement('div');body.className='hpb';while(hp.firstChild)body.appendChild(hp.firstChild);
  const v=document.createElement('div');v.className='hpv';v.innerHTML=`<div class="hpbar"><i></i><i></i><i></i><span>podgląd: ${NAMES[n]||''}</span></div><div class="hpsc">${svg(n)}</div>`;
  hp.appendChild(v);hp.appendChild(body);
  const x=document.createElement('button');x.className='hpx';x.type='button';x.setAttribute('aria-label','Zamknij');x.textContent='✕';x.onclick=closePop;hp.appendChild(x);
  const a=document.createElement('button');a.className='hpnav pv';a.type='button';a.setAttribute('aria-label','Poprzednia gra');a.textContent='◀';a.onclick=()=>nav(-1);
  const b=document.createElement('button');b.className='hpnav nx';b.type='button';b.setAttribute('aria-label','Następna gra');b.textContent='▶';b.onclick=()=>nav(1);
  v.appendChild(a);v.appendChild(b);
  const bd=document.createElement('div');bd.id='hubbd';bd.onclick=closePop;hp.parentNode.insertBefore(bd,hp);
  hp.scrollTop=0;
  if(open==='swap'){hp.classList.add('pop','swap')}
  else{const r=lastBtn?lastBtn.getBoundingClientRect():null;hp.style.setProperty('--dx',r?(r.left+r.width/2-innerWidth/2)+'px':'0px');hp.style.setProperty('--dy',r?(r.top+r.height/2-innerHeight/2)+'px':'0px');hp.classList.add('pop')}
  const g=hp.querySelector('.hubgo');if(g)setTimeout(()=>{try{g.focus({preventScroll:true})}catch(e){}},600);
};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#hubsubg button[data-n]');if(b){lastBtn=b;pendingOpen=true}},true);
document.addEventListener('keydown',e=>{if(!document.getElementById('hubbd'))return;if(e.key==='Escape')closePop();else if(e.key==='ArrowLeft')nav(-1);else if(e.key==='ArrowRight')nav(1)});
init();
try{window.hubTab(HUBLAST&&HUBLAST.g?HUBLAST.g:1)}catch(e){}
})();
