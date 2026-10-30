'use strict';
const $=s=>document.querySelector(s), lessons=window.LESSONS;
const chapters=['Espaços e transformações','Subespaços, geradores e bases','Matrizes e sistemas','Determinantes','Dualidade e quocientes','Produto interno','Multilinearidade e exatidão','Autovalores e diagonalização','Espectral e formas quadráticas'];
const C={u:'#4b78a7',v:'#c57945',r:'#267a60',pink:'#b45c7a',grid:'#e9eee6',axis:'#b0bdb0',ink:'#294b40'};
let lesson,progress=0,playing=false,lastTime=0,params={},frame=0;
let zoom=1,pan=[400,230],drag=null,renderTime=0;
const fmt=n=>Math.abs(n)<1e-7?'0':Number(n.toFixed(2)).toLocaleString('pt-BR');
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const add=(a,b)=>a.map((v,i)=>v+b[i]), mul=(a,k)=>a.map(v=>v*k), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), norm=a=>Math.hypot(...a), mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t), clamp=(t)=>Math.max(0,Math.min(1,t));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const point=a=>`(${a.map(fmt).join('; ')})`;
const transform=(A,v)=>[A[0]*v[0]+A[1]*v[1],A[2]*v[0]+A[3]*v[1]];
let svg='',scale=43;
function xy(v){return [400+scale*v[0],230-scale*v[1]]}
function line(a,b,color=C.axis,width=1,dash=''){const [x1,y1]=xy(a),[x2,y2]=xy(b);svg+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?'stroke-dasharray="'+dash+'"':''}/>`}
function text(v,label,color=C.ink,size=13){const [x,y]=xy(v);svg+=`<text x="${x}" y="${y}" fill="${color}" font-size="${size}">${esc(label)}</text>`}
function dotAt(v,label='',color=C.r){const [x,y]=xy(v);svg+=`<circle cx="${x}" cy="${y}" r="4.5" fill="${color}"/>`;if(label)text(add(v,[.15,.2]),label,color)}
function arrow(v,color=C.r,label='',origin=[0,0]){const tip=add(origin,v);line(origin,tip,color,2.8);const [x,y]=xy(tip),a=Math.atan2(-v[1],v[0]);if(norm(v)>.025){svg+=`<path d="M${x},${y} L${x-10*Math.cos(a-.4)},${y-10*Math.sin(a-.4)} L${x-10*Math.cos(a+.4)},${y-10*Math.sin(a+.4)} Z" fill="${color}"/>`;}if(label)text(add(tip,[.14,.2]),label,color)}
function poly(points,color=C.r,opacity=.15){svg+=`<polygon points="${points.map(xy).map(v=>v.join(',')).join(' ')}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="1.3"/>`}
function curve(points,color=C.r,width=2.2,dash=''){svg+=`<polyline points="${points.filter(v=>v.every(Number.isFinite)).map(xy).map(v=>v.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?'stroke-dasharray="'+dash+'"':''}/>`}
function fn(f,color=C.r,start=-6,end=6){const pts=[];for(let x=start;x<=end+.001;x+=(end-start)/180)pts.push([x,f(x)]);curve(pts,color)}
function grid(A=[1,0,0,1],offset=[0,0]){for(let i=-9;i<=9;i++){line(add(transform(A,[i,-6]),offset),add(transform(A,[i,6]),offset),i===0?C.axis:C.grid,i===0?1.4:1);line(add(transform(A,[-9,i]),offset),add(transform(A,[9,i]),offset),i===0?C.axis:C.grid,i===0?1.4:1)}text([.12,-.35],'0','#8f9f92',10);text([8.5,-.35],'x','#8f9f92',12);text([.14,4.9],'y','#8f9f92',12);for(let i=-6;i<=6;i+=2)if(i)text([i-.08,-.35],String(i),'#95a292',10)}
function matrix(A,x,y,label='',high=[]){const rows=A.length,cols=A[0].length,w=cols*48,h=rows*44;svg+=`<path d="M${x-5},${y-8}h-8v${h}h8 M${x+w+5},${y-8}h8v${h}h-8" fill="none" stroke="${C.ink}" stroke-width="2"/>`;if(label)svg+=`<text x="${x+w/2}" y="${y-32}" text-anchor="middle" fill="${C.ink}" font-size="15">${esc(label)}</text>`;A.forEach((row,i)=>row.forEach((v,j)=>{if(high.some(([r,c])=>r===i&&c===j))svg+=`<rect x="${x+j*48-1}" y="${y+i*44-3}" width="44" height="36" rx="4" fill="#d8ebcd"/>`;svg+=`<text x="${x+j*48+22}" y="${y+i*44+23}" text-anchor="middle" fill="${C.ink}" font-size="19">${typeof v==='number'?fmt(v):esc(v)}</text>`}));}
function caption(x,y,label,color=C.ink,size=14){svg+=`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle">${esc(label)}</text>`}
function pr(v){const a=(params.view??35)*Math.PI/180,b=.55;const x=v[0]*Math.cos(a)-v[1]*Math.sin(a),y=v[0]*Math.sin(a)+v[1]*Math.cos(a);return [x,-y*Math.sin(b)+v[2]*Math.cos(b)]}
function axes3(){for(let k=0;k<3;k++){const p=[0,0,0];p[k]=3.6;arrow(pr(p),C.axis,['x','y','z'][k]);}for(let i=-3;i<=3;i++){line(pr([i,-3,0]),pr([i,3,0]),C.grid);line(pr([-3,i,0]),pr([3,i,0]),C.grid)}}
function arrow3(v,c,label,origin=[0,0,0]){arrow(pr(v),c,label,pr(origin))}
const range=(key,label,min,max,value,step=.1)=>({key,label,min,max,value,step});
const is3=['planes','completion','ranknull','gram','cross','cylinder','twoSheet','oneSheet','cone','ellipsoid'];
function controls(kind){
 if(kind==='scale')return [range('a','Escalar a',-2,3,1)];
 if(kind==='subspace')return [range('a','Deslocamento',-2,3,0)];
 if(is3.includes(kind))return [range('view','Girar vista',-180,180,35,1),...(kind==='cross'?[range('a','Componente de v',-2,2,1)]:[])];
 if(['sum','scale','union','direct','span','dot','cauchy','nearest','area','wedge','subspace'].includes(kind))return [range('a',kind==='span'?'Altura de v':kind==='scale'?'Escalar a':kind==='subspace'?'Deslocamento':'a',-2,3,kind==='span'?1:kind==='subspace'?0:1),range('b',kind==='nearest'?'Ponto s em S':'b',-2,3,1)];
 if(['rotation','eigen','reflection','rayleigh','spectral'].includes(kind))return [range('angle',kind==='rotation'?'Ângulo da rotação':'Ângulo do vetor',-180,180,30,1)];
 if(kind==='systems')return [{key:'system',label:'Tipo de sistema',options:['Única solução','Sem solução','Infinitas soluções']}];
 if(kind==='fibonacci')return [range('n','Índice n',1,12,6,1)];
 if(kind==='powers')return [range('n','Potência n',0,4,1,1)];
 if(kind==='least')return [range('a','Intercepto a',0,3,1.5,.05),range('b','Inclinação b',-1,2,1,.05)];
 if(kind==='approx')return [range('a','Inclinação a',-1,2,.6,.05)];
 if(kind==='signature')return [range('a','Coeficiente de y²',-2,2,1,.1)];
 if(['superposition','polynomial','complex','dual'].includes(kind))return [range('a','Coeficiente a',-2,2,1),range('b','Coeficiente b',-2,2,1)];
 if(['derivative','parity','fibers','functional','transpose','annihilator','quotient','isomorphism','riesz','detops','shear','translation','matrixmap'].includes(kind))return [range('a',kind==='quotient'||kind==='isomorphism'?'Representante x':'Parâmetro a',-2,2,1)];
 if(kind==='lagrange')return [range('a','Valor em t = 0',-2,2,1)];
 return [];
}
function draw(){
 const k=lesson.id,t=progress/1000,s=Math.min(lesson.steps.length-1,Math.floor(t*(lesson.steps.length-1)+1e-8)),a=params.a??1,b=params.b??1;
 const phase=(n)=>clamp(t*3-n), v=[2,1],u=[1,2];let formula='';scale=43;
 if(k==='powers')scale=135/Math.max(3,.75*3**(params.n??1)+.25);
 if(['sum','union','direct'].includes(k)){const x=k==='union'?[2*a,0]:k==='direct'?[a,a]:[2*a,a],y=k==='union'?[0,2*b]:k==='direct'?[b,-b]:[-b,2*b],total=add(x,y);scale=Math.min(43,170/Math.max(1,...[x,y,total].map(v=>Math.abs(v[1]))),330/Math.max(1,...[x,y,total].map(v=>Math.abs(v[0]))));}
 svg=`<title id="sceneTitle">${esc(lesson.title)}</title><desc id="sceneDesc">${esc(lesson.steps[s])}. ${esc(lesson.description)}</desc>`;
 if(is3.includes(k)){
  scale=61;axes3();$('#sceneType').textContent='ESPAÇO 3D · VISTA AJUSTÁVEL';
  if(k==='planes'){poly([[-3,-3,0],[3,-3,0],[3,3,0],[-3,3,0]].map(pr),C.u,.12);if(t>0)poly([[-3,0,-3],[3,0,-3],[3,0,3],[-3,0,3]].map(p=>pr(mul(p,phase(0)))),C.v,.12);if(t>.5)line(pr([-3.5,0,0]),pr([3.5,0,0]),C.r,4);formula='dim(S + T) = 2 + 2 − 1 = 3';}
  else if(k==='completion'||k==='ranknull'){const vs=[[2,0,0],[0,2,0],[0,0,2]];vs.forEach((q,i)=>{let f=k==='completion'?clamp(t*3-i+1):i===2?1-t:1;arrow3(mul(q,f),[C.u,C.v,C.r][i],k==='ranknull'&&i===2&&t===1?'T(e₃)=0':['e₁','e₂','e₃'][i])});if(k==='completion'&&t>.34)poly([[0,0,0],[2,0,0],[2,2,0],[0,2,0]].map(pr));formula=k==='ranknull'?'T(x,y,z) = (x,y,0)  ·  3 = dim N(T) + dim Im(T) = 1 + 2':'reta ⊂ plano ⊂ R³  ·  dimensão: 1 → 2 → 3';}
  else if(k==='gram'){const vs=[[1,1,0],[1,0,1],[0,1,1]],ws=[[1,1,0],[.5,-.5,1],[-2/3,2/3,2/3]];vs.forEach((q,i)=>{line([0,0],pr(mul(q,2)),C.axis,1,'5 5');let r=mix(q,ws[i],phase(i===2?1:0));if(t>2/3)r=mix(ws[i],mul(ws[i],1/norm(ws[i])),phase(2));arrow3(mul(r,2),[C.u,C.v,C.r][i],(t>2/3?['u₁','u₂','u₃']:['w₁','w₂','w₃'])[i]);});formula=t<2/3?'w₁=(1,1,0) · w₂=(½,−½,1) · w₃=(−⅔,⅔,⅔)':'uᵢ = wᵢ / ‖wᵢ‖  ·  uᵢ·uⱼ = 0 para i ≠ j';}
  else if(k==='cross'){const x=[2,0,0],y=[1,a,0],z=cross(x,y);arrow3(x,C.u,'u');arrow3(y,C.v,'v');poly([[0,0,0],x,add(x,y),y].map(pr),C.r,.1+phase(0)*.1);arrow3(mul(z,phase(1)),C.r,'u × v');formula=`u × v = ${point(z)} · área = ${fmt(norm(z))}`;}
  else drawSurface(k,t);
  if(!formula)formula={cylinder:'(x + y)² + z² = 1 · eixo: (1,−1,0)',twoSheet:'xy + yz + zx = 1 · assinatura (1,2)',oneSheet:'x² + y² − z² = 1 · raio = √(1+z²)',cone:'x² + y² − z² = 0 · raio = |z|',ellipsoid:'x² + 2y² + 3z² − 2xz = 1'}[k];
 }
 else if(['symmetric','gauss','inverse','laplace','cayley','fibonacci','contraction','euler','similarity'].includes(k)){
 $('#sceneType').textContent='ÁLGEBRA · CÁLCULO GUIADO';
 if(k==='symmetric'){const A=[[2,3],[1,4]],B=[[2,1],[3,4]],S=[[2,2],[2,4]],K=[[0,1],[-1,0]];matrix(A,80,180,'A');if(s>=1)matrix(B,275,180,'Aᵀ');if(s>=2)matrix(S,470,180,'(A+Aᵀ)/2');if(s>=3)matrix(K,655,180,'(A−Aᵀ)/2');formula='A = S + K  ·  Sᵀ = S  ·  Kᵀ = −K';}
 if(k==='gauss'){const states=[[[1,1,3],[2,-1,0]],[[1,1,3],[0,-3,-6]],[[1,1,3],[0,1,2]],[[1,0,1],[0,1,2]]];matrix(states[s],326,175,'[A | b]',s===0?[]:[[1,1],[1,2]]);caption(400,330,lesson.steps[s]);formula=s===3?'x = 1, y = 2 · verificação: 1 + 2 = 3; 2·1 − 2 = 0':'Operações reversíveis preservam as soluções';}
 if(k==='inverse'){matrix(s<2?[[1,1,1,0],[0,1,0,1]]:[[1,0,1,-1],[0,1,0,1]],300,180,s<2?'[A | I]':'[I | A⁻¹]');formula='A · A⁻¹ = I';}
 if(k==='laplace'){const A=[[1,2,3],[0,4,5],[1,0,6]];matrix(A,100,155,'A',s?[[0,Math.min(2,s-1)]]:[]);if(s){const j=s-1,M=A.slice(1).map(row=>row.filter((_,c)=>c!==j));matrix(M,390,177,`Menor da coluna ${j+1}`);caption(640,210,['1 × (+24)','2 × (+5)','3 × (−4)'][j],C.r,21)}formula=s===3?'det A = 1·24 + 2·5 + 3·(−4) = 22':'C₁ⱼ = (−1)¹⁺ʲ det M₁ⱼ';}
 if(k==='cayley'){const As=[[[2,1],[1,2]],[[5,4],[4,5]],[[-3,0],[0,-3]],[[0,0],[0,0]]];matrix(As[s],351,175,['A','A²','A² − 4A','A² − 4A + 3I'][s]);formula='p(A) = A² − 4A + 3I = 0';}
 if(k==='fibonacci'){const n=Math.max(0,Math.round(t*params.n));let f=[0,1];for(let i=2;i<=14;i++)f.push(f[i-1]+f[i-2]);const vals=f.slice(0,params.n+2),max=vals[vals.length-1];vals.forEach((q,i)=>{const x=65+i*660/vals.length,h=q/max*220;svg+=`<rect x="${x}" y="${340-h}" width="${Math.min(35,600/vals.length)}" height="${h}" rx="3" fill="${i<=n+1?C.r:'#e5ebe1'}"/>`;caption(x+15,363,String(q),C.ink,11)});caption(400,65,`F${n+2} = F${n+1} + F${n} = ${f[n+1]} + ${f[n]} = ${f[n+2]}`,C.r,24);formula=`(Fₙ₊₁,Fₙ) = (${f[n+1]},${f[n]}) → (${f[n+2]},${f[n+1]})`;}
 if(k==='contraction'){caption(400,100,'ω = dx ∧ dy',C.u,27);caption(400,180,s>=1?'ιₑ₁ω = dy':'ω(e₁,e₂) = 1',C.v,25);if(s>=2)caption(400,270,'ιₑ₁(dy) = dy(e₁) = 0',C.r,25);if(s>=3)caption(400,355,'ω(e₁,e₁) = 0 por alternância',C.ink,18);formula='ιᵥ ◦ ιᵥ = 0';}
 if(k==='euler'){const dims=[[0,1,2],[2,2,1],[1,1,0]];dims.forEach((ds,i)=>{let y=325;ds.forEach((n,j)=>{const h=n*44;y-=h;svg+=`<rect x="${110+i*240}" y="${y}" width="100" height="${h}" fill="${[C.r,'#aab3a6',C.u][j]}" opacity="${s>=2&&j!==1?.15:1}"/>`;if(n)caption(160+i*240,y+h/2+5,String(n),'white',20)});caption(160+i*240,360,['V₀: 3','V₁: 5','V₂: 2'][i]);});caption(400,65,'Verde: imagem · cinza: cohomologia · azul: complemento',C.ink,14);formula=s>=2?'3 − 5 + 2 = 1 − 2 + 1 = 0':'dim Vᵢ = rᵢ₋₁ + dim Hᵢ + rᵢ · exemplo ilustrativo';}
 if(k==='similarity'){const labels=['[v]B','P[v]B','AP[v]B','P⁻¹AP[v]B'];const vals=[[[2],[1]],[[3],[1]],[[7],[5]],[[6],[1]]];matrix([[1,1],[1,-1]],110,175,'P');matrix(vals[s],380,175,labels[s]);matrix(s===3?[[3,0],[0,1]]:[[2,1],[1,2]],560,175,s===3?'P⁻¹AP':'A');formula='P = [[1,1],[1,−1]] · P⁻¹AP = diag(3,1)';}
 }
 else if(['superposition','polynomial','derivative','parity','legendre','approx','least','lagrange'].includes(k)){
 grid();$('#sceneType').textContent='FUNÇÕES · COMBINAÇÕES';
 if(k==='superposition'){fn(x=>a*Math.cos(x),C.u);if(t>0)fn(x=>b*Math.sin(x)*phase(0),C.v);if(t>1/3)fn(x=>a*Math.cos(x)+b*Math.sin(x),C.r);const x=-5+10*t;line([x,0],[x,a*Math.cos(x)+b*Math.sin(x)],C.r,1.5,'4 4');dotAt([x,a*Math.cos(x)+b*Math.sin(x)]);formula=`f(t) = ${fmt(a)} cos t + ${fmt(b)} sen t  ·  f″ + f = 0`;}
 if(k==='polynomial'){fn(x=>a,C.u);if(t>0)fn(x=>a+phase(0)*b*x,C.v);if(t>1/3)fn(x=>a+b*x+phase(1)*x*x,C.r);formula=`p(t) = ${fmt(a)} + ${fmt(b)}t + t² · coordenadas (${fmt(a)}, ${fmt(b)}, 1)`;}
 if(k==='derivative'){fn(x=>x*x+a,C.u);if(s>=1)fn(x=>2*x,C.v);if(s>=2)fn(x=>x*x,C.r);formula='Azul: t²+a · laranja: 2t · verde: t² · f − JDf = a';}
 if(k==='parity'){fn(x=>x*x+a*x,C.u);if(s>=1)fn(x=>x*x-a*x,C.axis);if(s>=2)fn(x=>x*x,C.r);if(s>=3)fn(x=>a*x,C.v);formula='fpar(t) = t² · fímpar(t) = at · f = fpar + fímpar';}
 if(k==='legendre'){fn(()=>1,C.u,-1,1);if(s>=1)fn(x=>x,C.v,-1,1);fn(x=>x*x-phase(1)/3,C.r,-1,1);line([-1,-2],[-1,2],C.axis,1,'3 3');line([1,-2],[1,2],C.axis,1,'3 3');formula='⟨1,t⟩ = 0 · ∫₋₁¹ (t² − ⅓) dt = 0';}
 if(k==='approx'){scale=140;grid();fn(x=>x*x*x,C.u,-1,1);if(s>=1)fn(x=>a*x,C.r,-1,1);if(s>=2)for(let x=-1;x<=1;x+=.1)line([x,x*x*x],[x,a*x],C.pink,1);const e=2/7-4*a/5+2*a*a/3;formula=`∫₋₁¹(t³ − at)² dt = ${fmt(e)} · mínimo: a = 0,6; erro = 8/175`;}
 if(k==='least'){const ps=[[0,1],[1,3],[2,4],[3,4]];ps.forEach(p=>dotAt(p,point(p),C.u));if(t>0)fn(x=>a+b*x,C.r,-2,5);if(s>=2)ps.forEach(p=>line(p,[p[0],a+b*p[0]],C.pink,2));formula=`y = ${fmt(a)} + ${fmt(b)}x · soma dos quadrados = ${fmt(ps.reduce((sum,[x,y])=>sum+(y-a-b*x)**2,0))} · mínimo = 1`;}
 if(k==='lagrange'){const L=[x=>x*(x-1)/2,x=>1-x*x,x=>x*(x+1)/2];[[-1,1],[0,a],[1,2]].forEach(p=>dotAt(p,point(p),C.r));if(s>=1)L.forEach((f,i)=>fn(x=>f(x)*(s>=2?[1,a,2][i]:1),[C.u,C.v,C.pink][i],-2,2));if(s>=3)fn(x=>L[0](x)+a*L[1](x)+2*L[2](x),C.r,-2,2);formula=`p(t) = L₀(t) + ${fmt(a)}L₁(t) + 2L₂(t) · nós: −1, 0, 1`;}
 }
 else{
 $('#sceneType').textContent='PLANO CARTESIANO';
 let A=[1,0,0,1],off=[0,0],customGrid=false;
 if(['rotation','projection','translation','matrixmap','composition','detproduct','reflection','shear','complex','nilpotent','spectral'].includes(k)){
  if(k==='rotation'){const z=(params.angle||0)*Math.PI/180*t;A=[Math.cos(z),-Math.sin(z),Math.sin(z),Math.cos(z)];formula=`θ = ${fmt((params.angle||0)*t)}° · ‖Rθv‖ = ‖v‖`;}
  if(k==='projection'){A=[1,0,0,1-t];formula='T(x,y) = (x,0) · N(T) = eixo y · Im(T) = eixo x';}
  if(k==='translation'){off=[a*t,t];formula=`T(0) = ${point(off)} · no estado final, T(0) = (${fmt(a)},1) ≠ 0`;}
  if(k==='matrixmap'){A=[1+t,a*t,t,1];formula=`A = [[2,${fmt(a)}],[1,1]] · colunas: T(e₁), T(e₂)`;}
  if(k==='composition'||k==='detproduct'){const p=phase(0),q=phase(1);A=[1+q,p*(1+q),0,1];formula='B=[[1,1],[0,1]] · A=[[2,0],[0,1]] · AB=[[2,2],[0,1]]';}
  if(k==='reflection'){A=[1,0,0,1-2*t];formula='R(x,y)=(x,−y) · λhorizontal=1 · λvertical=−1';}
  if(k==='shear'){A=[1,a*t,0,1];formula=a===0?'a=0: identidade, diagonalizável':'A=[[1,a],[0,1]] · único autoespaço: eixo x';}
  if(k==='complex'){A=[1+(a-1)*t,-b*t,b*t,1+(a-1)*t];formula=`a+ib = ${fmt(a)} + (${fmt(b)})i · módulo = ${fmt(Math.hypot(a,b))}`;}
  if(k==='nilpotent'){A=t<=.5?[1-2*t,2*t,0,1-2*t]:[0,2-2*t,0,0];formula='N(x,y)=(y,0) · N²(x,y)=(0,0)';}
  if(k==='spectral'){const z=t*Math.PI/4;A=[Math.cos(z),-Math.sin(z),Math.sin(z),Math.cos(z)];formula='QᵀAQ = diag(3,1) · QᵀQ = I';}
  grid(A,off);customGrid=true;const ang=(params.angle??30)*Math.PI/180,vec=['reflection','spectral'].includes(k)?[2*Math.cos(ang),2*Math.sin(ang)]:v;
  arrow(vec,C.axis,'v');arrow(transform(A,vec),C.r,k==='spectral'?'novo eixo':'T(v)',off);arrow(transform(A,[1,0]),C.u,'e₁′',off);arrow(transform(A,[0,1]),C.v,'e₂′',off);
  if(k==='translation')dotAt(off,'T(0)',C.pink);
  if(k==='detproduct'){poly([[0,0],[1,0],[1,1],[0,1]].map(x=>transform(A,x)),C.r,.25);formula+=` · área atual = ${fmt(A[0]*A[3]-A[1]*A[2])}`;}
 }
 if(!customGrid)grid();
 if(['sum','scale','union','direct','span','basis','subspace'].includes(k)){
  let x=[2,1],y=[-1,2];if(['union','subspace'].includes(k)){x=[2,0];y=[0,2];}if(k==='direct'){x=[1,1];y=[1,-1];}if(k==='basis'){x=[1,1];y=[1,-1];}if(k==='span'){x=[2,0];y=[1,a];}
  if(k==='subspace'){const d=a;line([-7,d],[7,d],C.r,2);arrow([2,d],C.u,'u');arrow([-1,d],C.v,'v');if(t>.5)arrow([1,2*d],C.pink,'u+v');formula=d===0?'a=0: reta pela origem, fechada por soma e escala':`a=${fmt(d)} ≠ 0: a reta y=a não contém a origem`;}
  else if(k==='scale'){arrow(x,C.u,'u');arrow(mul(x,1+(a-1)*t),C.r,'au');formula=`a = ${fmt(a)} · au = ${point(mul(x,a))}`;}
  else{if(['direct','basis','union'].includes(k)){line(mul(x,-5),mul(x,5),C.u,1.4);line(mul(y,-5),mul(y,5),C.v,1.4)}let c=k==='basis'?2:k==='span'?b:a,d=k==='basis'?1:k==='span'?1:b;const U=mul(x,c),V=mul(y,d);arrow(U,C.u,k==='basis'?'2u₁':'au');arrow(V,C.v,k==='basis'?'u₂':'bv',mul(U,phase(0)));if(t>1/3){poly([[0,0],U,add(U,V),V],C.r,.08);arrow(mul(add(U,V),phase(1)),C.r,'soma');}if(k==='span')for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++)dotAt(add(mul(x,i*.6),mul(y,j*.6)),'','#aac0a5');formula=k==='basis'?'(3,1) = 2(1,1) + (1,−1) · [v]B = (2,1)':k==='span'?`det(u,v) = ${fmt(2*a)} · dimensão = ${a===0?1:2}`:`${point(U)} + ${point(V)} = ${point(add(U,V))}`;}
 }
 if(['area','detops','wedge'].includes(k)){let x=[2,1],y=k==='detops'?add([-1,2],mul(x,a*t)):[-b,a+1];if(k==='wedge'&&s>=2)[x,y]=[y,x];arrow(x,C.u,'u');arrow(y,C.v,'v');const d=x[0]*y[1]-x[1]*y[0];poly([[0,0],x,add(x,mul(y,phase(0))),mul(y,phase(0))],d>=0?C.r:C.pink,.22);formula=`det(u,v) = ${fmt(d)} · área = ${fmt(Math.abs(d))}${k==='wedge'?' · u∧v = −v∧u':''}`;}
 if(['fibers','functional','dual','transpose','annihilator','quotient','isomorphism','riesz','exact'].includes(k)){
  if(k==='fibers'){for(let i=-4;i<=4;i++)line([i,-4],[i,4],i===0?C.pink:C.grid,i===0?2:1);line([a,-4],[a,4],C.r,3);dotAt([a,2*(1-t)],'v',C.u);dotAt([a,0],'T(v)',C.v);formula=`T(x,y)=x · fibra sobre ${fmt(a)}: x=${fmt(a)}`;}
  else if(['quotient','isomorphism','exact'].includes(k)){for(let i=-4;i<=4;i++)line([-7*(1-t),i],[7*(1-t),i],i===2?C.r:C.axis,i===2?3:1);dotAt([a*(1-t),2],'[(a,2)]',C.r);if(k==='exact'){arrow([2*(1-phase(1)),0],C.u,'i(x)');formula='i(x)=(x,0) · π(x,y)=y · Im i = N(π)';}else formula='(x,y) + S ↦ y · cada reta horizontal é uma classe';}
  else if(k==='dual'){const v=[a+b,a-b];arrow([a,a],C.u,'a u₁');arrow(mul([b,-b],phase(0)),C.v,'b u₂',[a,a]);arrow(mul(v,phase(1)),C.r,'v');formula=`v = ${point(v)} · φ₁(v)=${fmt(a)} · φ₂(v)=${fmt(b)}`;}
  else{let n=k==='annihilator'?[-a,1]:[1,a];for(let j=-4;j<=4;j++){const base=mul(n,j/dot(n,n)),d=[-n[1],n[0]];line(add(base,mul(d,-8)),add(base,mul(d,8)),j===0?C.r:C.axis,j===0?2:1);if(j)text(add(base,[.1,.1]),`φ=${j}`,C.axis,10);}arrow(mul(n,phase(0)),C.u,k==='riesz'?'u':'coeficientes');dotAt([2,1],'v',C.v);formula=k==='annihilator'?`φ(x,y)=−${fmt(a)}x+y · φ(1,${fmt(a)})=0`:`φ(x,y)=x+${fmt(a)}y · φ(2,1)=${fmt(2+a)}`;if(k==='transpose')formula=`Aᵀ(1,0)=(1,${fmt(a)}) · φ∘T(x,y)=x+${fmt(a)}y`;}
 }
 if(['dot','cauchy','nearest'].includes(k)){const U=[2,1],V=[a,b+1],P=mul(U,dot(U,V)/dot(U,U));line(mul(U,-4),mul(U,4),C.axis,1.5);arrow(U,C.u,'u');arrow(V,C.v,'v');if(t>0){arrow(mul(P,phase(0)),C.r,'Pv');line(V,P,C.pink,1.5,'5 4');}if(k==='nearest'){const q=mul(U,b);dotAt(q,'s',C.pink);if(t>.5)line(V,q,C.pink,2);formula=`‖v−Pv‖² = ${fmt(dot(add(V,mul(P,-1)),add(V,mul(P,-1))))} ≤ ‖v−s‖² = ${fmt(dot(add(V,mul(q,-1)),add(V,mul(q,-1))))}`;}else formula=`u·v = ${fmt(dot(U,V))} · ‖u‖‖v‖ = ${fmt(norm(U)*norm(V))}${norm(V)>0?' · θ = '+fmt(Math.acos(Math.max(-1,Math.min(1,dot(U,V)/(norm(U)*norm(V)))))*180/Math.PI)+'°':' · ângulo indefinido para v=0'}`;}
 if(k==='systems'){fn(x=>3-x,C.u);if(t>0)fn(x=>params.system==='Sem solução'?4-x:params.system==='Infinitas soluções'?3-x:2*x,C.v);if(s>=2&&params.system==='Única solução')dotAt([1,2],'(1,2)',C.r);formula=params.system==='Sem solução'?'x+y=3 e x+y=4 ⇒ 0=1: incompatível':params.system==='Infinitas soluções'?'x+y=3 e 2x+2y=6: a mesma reta':'x+y=3 e 2x−y=0: solução única (1,2)';}
 if(['eigen','rayleigh','powers'].includes(k)){const z=(params.angle??30)*Math.PI/180,V=k==='powers'?[1,.5]:[Math.cos(z),Math.sin(z)],n=params.n??1;let av=k==='powers'?add(mul([1,1],.75*3**n),mul([1,-1],.25)):transform([2,1,1,2],V);line([-4,-4],[4,4],C.u,1,'5 5');line([-4,4],[4,-4],C.v,1,'5 5');arrow(V,C.u,'v');arrow(mix(V,av,t),C.r,k==='powers'?'Aⁿv':'Av');if(k==='rayleigh'){curve(Array.from({length:101},(_,i)=>[Math.cos(i*Math.PI/50),Math.sin(i*Math.PI/50)]),C.axis);const q=dot(V,av);formula=`R(v) = vᵀAv = ${fmt(q)} · 1 ≤ R(v) ≤ 3`;caption(400,400,`1 ${'━'.repeat(Math.round((q-1)*10))}●${'━'.repeat(20-Math.round((q-1)*10))} 3`,C.r,16);}else formula=k==='powers'?`A${n===1?'':'^'+n}v = ${point(av)} · escala ajustada`:`v = ${point(V)} · Av = ${point(av)} · λ = 3 ou 1 nas direções próprias`;}
 if(['quadratic','signature','ellipse','parabola','hyperbola','parallel'].includes(k)){
  if(['quadratic','ellipse'].includes(k)){const theta=Math.atan(.5)*(k==='quadratic'?1-t:t),rot=p=>transform([Math.cos(theta),-Math.sin(theta),Math.sin(theta),Math.cos(theta)],p);curve(Array.from({length:161},(_,i)=>rot([3*Math.cos(i*Math.PI/80),2*Math.sin(i*Math.PI/80)])),C.r,3);line(rot([-4,0]),rot([4,0]),C.u,1.5,'5 4');line(rot([0,-3]),rot([0,3]),C.v,1.5,'5 4');formula='5x²−4xy+8y²=36 ↔ 4u²+9v²=36 · semieixos 3 e 2';}
  if(k==='signature'){if(a>0)curve(Array.from({length:161},(_,i)=>[2*Math.cos(i*Math.PI/80*(.05+.95*t)),2/Math.sqrt(a)*Math.sin(i*Math.PI/80*(.05+.95*t))]),C.r,3);else if(a<0)for(const sign of [-1,1])curve(Array.from({length:121},(_,i)=>{const h=-2+i/30*(.05+.95*t);return [sign*2*Math.cosh(h),2*Math.sinh(h)/Math.sqrt(-a)]}),C.r,3);else{line([2,-5],[2,5],C.r,3);line([-2,-5],[-2,5],C.r,3);}formula=`Nível q=4 · assinatura: ${a>0?'(2,0), elipse':a<0?'(1,1), hipérbole':'(1,0), degenerada, nulidade 1'} · det A=${fmt(a)}`;}
  if(k==='parabola'){const p=phase(0),q=phase(1),pts=[];for(let u=-3;u<=3;u+=.03){const v=u*u/Math.SQRT2-p*3/(2*Math.SQRT2);pts.push(mix([u,v],[(u+v)/Math.SQRT2,(u-v)/Math.SQRT2],q));}curve(pts,C.r,3);if(t===1)dotAt([-.75,.75],'vértice',C.v);formula='v = u²/√2 − 3/(2√2) · (x,y)=((u+v)/√2,(u−v)/√2)';}
  if(k==='hyperbola'){const offset=[-phase(1),2*phase(1)];for(const sign of [-1,1]){curve(Array.from({length:121},(_,i)=>{const h=-2.4+i*.04;return add([sign*Math.cosh(h),Math.sinh(h)],offset)}),C.r,3);if(t>1/3)line(add([-5,sign*-5],offset),add([5,sign*5],offset),C.axis,1,'5 5');}dotAt(offset,'centro',C.v);formula='(x+1)² − (y−2)² = 1 · centro (−1,2)';}
  if(k==='parallel'){fn(x=>(2-x)/2,C.u);if(t>.5)fn(x=>(4-x)/2,C.r);formula='(x+2y−2)(x+2y−4)=0';}
 }
 }
 $('#scene').innerHTML=svg;$('#formula').textContent=formula||lesson.steps[s];$('#timeline').value=progress;$('#stepCount').textContent=`${s+1} / ${lesson.steps.length}`;
 document.querySelectorAll('.step').forEach((b,i)=>{b.classList.toggle('current',i===s);b.setAttribute('aria-current',i===s?'step':'false')});$('#prev').disabled=progress===0;$('#next').disabled=progress===1000;
}
function drawSurface(kind,t){
 const rt=phase=>clamp(t*3-phase), extent=.05+2.05*rt(0);let surf;
 const rotate=(p,ang)=>[p[0]*Math.cos(ang)+p[2]*Math.sin(ang),p[1],-p[0]*Math.sin(ang)+p[2]*Math.cos(ang)];
 if(kind==='cylinder')surf=(u,v)=>{const p=[Math.cos(u)/Math.SQRT2,v,Math.sin(u)],ang=-Math.PI/4*rt(1);return [p[0]*Math.cos(ang)+p[1]*Math.sin(ang),-p[0]*Math.sin(ang)+p[1]*Math.cos(ang),p[2]]};
 if(kind==='oneSheet')surf=(u,v)=>[Math.sqrt(1+v*v)*Math.cos(u),Math.sqrt(1+v*v)*Math.sin(u),v];
 if(kind==='cone')surf=(u,v)=>[Math.abs(v)*Math.cos(u),Math.abs(v)*Math.sin(u),v];
 if(kind==='twoSheet')surf=(u,v,sign=1)=>{const p=[Math.sqrt(2)*Math.sinh(v)*Math.cos(u),Math.sqrt(2)*Math.sinh(v)*Math.sin(u),sign*Math.cosh(v)];const q=[p[0]/Math.SQRT2+p[1]/Math.sqrt(6)+p[2]/Math.sqrt(3),-p[0]/Math.SQRT2+p[1]/Math.sqrt(6)+p[2]/Math.sqrt(3),-2*p[1]/Math.sqrt(6)+p[2]/Math.sqrt(3)];return mix(p,q,rt(2));};
 if(kind==='ellipsoid')surf=(u,v)=>{const p=[Math.cos(v)*Math.cos(u)/Math.sqrt(2-Math.SQRT2),Math.cos(v)*Math.sin(u)/Math.SQRT2,Math.sin(v)/Math.sqrt(2+Math.SQRT2)];return rotate(p,-Math.PI/8*rt(2));};
 const lo=kind==='ellipsoid'?-Math.PI/2:kind==='twoSheet'?0:-extent,hi=kind==='ellipsoid'?-Math.PI/2+Math.PI*Math.max(.03,rt(0)):kind==='twoSheet'?extent*.65:extent;
 for(const sign of kind==='twoSheet'&&t>1/3?[1,-1]:[1]){
 for(let j=0;j<=18;j++){const v=lo+(hi-lo)*j/18;curve(Array.from({length:81},(_,i)=>pr(surf(i*Math.PI/40,v,sign))),j%3===0?C.r:'#8fb7a3',j%3===0?1.4:.7);}
 for(let i=0;i<24;i++){const u=i*Math.PI/12;curve(Array.from({length:41},(_,j)=>pr(surf(u,lo+(hi-lo)*j/40,sign))),'#6c9f8a',.8);}}
}
function normalize(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function navigation(){const query=normalize($('#search').value),shown=lessons.filter(l=>normalize(`${l.title} ${l.description} ${chapters[l.chapter-1]} ${l.ref}`).includes(query));$('#count').textContent=`${shown.length} experimentos`;$('#clear').hidden=!query;$('#navigation').innerHTML=chapters.map((c,i)=>{const list=shown.filter(l=>l.chapter===i+1);return list.length?`<details ${query||lesson?.chapter===i+1?'open':''}><summary><span>${String(i+1).padStart(2,'0')}</span>${c}</summary>${list.map(l=>`<a href="#${l.id}" class="${l.id===lesson?.id?'active':''}" ${l.id===lesson?.id?'aria-current="page"':''}>${l.title}</a>`).join('')}</details>`:''}).join('')||(query?'<p class="empty">Nenhum experimento encontrado. Tente outro conceito.</p>':'');}
function stop(){playing=false;$('#play').textContent='▶ Reproduzir';cancelAnimationFrame(frame)}
function load(){stop();zoom=1;pan=[400,230];applyView();lesson=lessons.find(l=>l.id===decodeURIComponent(location.hash.slice(1)))||lessons[0];progress=0;params={};$('#title').textContent=lesson.title;document.title=`${lesson.title} — Álgebra em movimento`;$('#description').textContent=lesson.description;$('#reference').textContent=`APOSTILA · ITEM ${lesson.ref}`;$('#chapterLabel').textContent=`${String(lesson.chapter).padStart(2,'0')} / ${chapters[lesson.chapter-1]}`;$('#lessonNumber').textContent=`${String(lessons.indexOf(lesson)+1).padStart(2,'0')} de ${lessons.length}`;
 const cs=controls(lesson.id);$('#parameters').hidden=!cs.length;$('#parameters').innerHTML=cs.map(c=>{params[c.key]=c.options?c.options[0]:c.value;return `<div class="parameter"><label for="param-${c.key}">${c.label}</label>${c.options?`<select id="param-${c.key}" data-key="${c.key}">${c.options.map(x=>`<option>${x}</option>`).join('')}</select>`:`<input id="param-${c.key}" data-key="${c.key}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"><output for="param-${c.key}">${fmt(c.value)}</output>`}</div>`}).join('');
 $('#steps').innerHTML=lesson.steps.map((s,i)=>`<button class="step" data-step="${i}"><span class="num">${i+1}</span>${esc(s)}</button>`).join('');

 renderLessonMath();
 navigation();draw();closeMenu();
 $('#nextLesson').textContent=lessons.indexOf(lesson)===lessons.length-1?'Voltar ao início ↺':'Próximo experimento →';
}
function tick(now){if(!playing)return;const dt=Math.min(100,now-lastTime);lastTime=now;progress=Math.min(1000,progress+dt/12*Number($('#speed').value));if(now-renderTime>=33||progress>=1000){draw();renderTime=now;}if(progress>=1000)stop();else frame=requestAnimationFrame(tick)}
$('#play').onclick=()=>{if(playing){stop();return}if(progress>=1000)progress=0;playing=true;$('#play').textContent='Ⅱ Pausar';lastTime=performance.now();frame=requestAnimationFrame(tick)};
function move(delta){stop();const unit=1000/(lesson.steps.length-1);progress=Math.max(0,Math.min(1000,(delta>0?Math.floor(progress/unit+.00001)+1:Math.ceil(progress/unit-.00001)-1)*unit));draw()}
$('#next').onclick=()=>move(1);$('#prev').onclick=()=>move(-1);$('#reset').onclick=()=>{stop();progress=0;draw()};$('#timeline').oninput=e=>{stop();progress=Number(e.target.value);draw()};
$('#parameters').oninput=e=>{if(!e.target.dataset.key)return;params[e.target.dataset.key]=e.target.type==='range'?Number(e.target.value):e.target.value;const out=e.target.parentElement.querySelector('output');if(out)out.textContent=fmt(Number(e.target.value));draw()};
$('#steps').onclick=e=>{const b=e.target.closest('[data-step]');if(b){stop();progress=Number(b.dataset.step)*1000/(lesson.steps.length-1);draw()}};
$('#search').oninput=navigation;$('#clear').onclick=()=>{$('#search').value='';navigation();$('#search').focus()};
function closeMenu(){ $('.sidebar').classList.remove('open');$('#backdrop').hidden=true;$('#menu').setAttribute('aria-expanded','false');document.body.classList.remove('menu-open');}
$('#menu').onclick=()=>{const open=$('.sidebar').classList.toggle('open');$('#backdrop').hidden=!open;$('#menu').setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open);if(open)$('#search').focus()};
$('#closeMenu').onclick=()=>{closeMenu();$('#menu').focus()};$('#backdrop').onclick=closeMenu;
function fullscreenLabel(){const on=!!document.fullscreenElement||$('#experiment').classList.contains('expanded');$('#fullscreen').innerHTML=on?'⛶ <span>Sair da tela cheia</span>':'⛶ <span>Tela cheia</span>';$('#fullscreen').setAttribute('aria-label',on?'Sair da tela cheia':'Abrir em tela cheia');}
function closeExpanded(){ $('#experiment').classList.remove('expanded');document.body.classList.remove('expanded-open');fullscreenLabel();}
$('#fullscreen').onclick=async()=>{if($('#experiment').classList.contains('expanded')){closeExpanded();return}if(document.fullscreenElement){await document.exitFullscreen();return}try{if(!$('#experiment').requestFullscreen)throw new Error('fallback');await $('#experiment').requestFullscreen()}catch{ $('#experiment').classList.add('expanded');document.body.classList.add('expanded-open');}fullscreenLabel();};
document.addEventListener('fullscreenchange',fullscreenLabel);
function applyView(){const w=800/zoom,h=460/zoom;$('#scene').setAttribute('viewBox',`${pan[0]-w/2} ${pan[1]-h/2} ${w} ${h}`);$('#scene').style.touchAction=zoom>1?'none':'pan-y';$('#scene').style.cursor=zoom>1?'grab':'default';$('#zoomValue').textContent=Math.round(zoom*100)+'%';$('#zoomOut').disabled=zoom<=1;$('#zoomIn').disabled=zoom>=3;}
$('#zoomIn').onclick=()=>{zoom=Math.min(3,zoom+.5);applyView()};$('#zoomOut').onclick=()=>{zoom=Math.max(1,zoom-.5);if(zoom===1)pan=[400,230];applyView()};$('#zoomReset').onclick=()=>{zoom=1;pan=[400,230];applyView()};
$('#scene').addEventListener('pointerdown',e=>{if(zoom<=1)return;drag={x:e.clientX,y:e.clientY,pan:pan.slice()};$('#scene').setPointerCapture(e.pointerId)});
$('#scene').addEventListener('pointermove',e=>{if(!drag)return;const rect=$('#scene').getBoundingClientRect(),factor=Math.max(800/zoom/rect.width,460/zoom/rect.height);pan=[Math.max(0,Math.min(800,drag.pan[0]-(e.clientX-drag.x)*factor)),Math.max(0,Math.min(460,drag.pan[1]-(e.clientY-drag.y)*factor))];applyView()});
$('#scene').addEventListener('pointerup',()=>{drag=null});$('#scene').addEventListener('pointercancel',()=>{drag=null});
$('#nextLesson').onclick=()=>{location.hash=lessons[(lessons.indexOf(lesson)+1)%lessons.length].id;$('#experiment').scrollIntoView({behavior:'auto'})};
window.addEventListener('hashchange',load);document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closeExpanded();return}if(e.target.matches('input,select,textarea,button,a,summary'))return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}if(e.key===' '){e.preventDefault();$('#play').click()}if(e.key==='Escape'){closeMenu();closeExpanded();}});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});load();

function richMath(value){
 const re=/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g;let out='',pos=0,m;
 while((m=re.exec(value))){out+=esc(value.slice(pos,m.index));const display=m[0].startsWith('$$'),tex=m[0].slice(display?2:1,display?-2:-1);try{out+=`<${display?'div':'span'} class="${display?'math-display':'math-inline'}">${window.katex.renderToString(tex,{displayMode:display,throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml'})}</${display?'div':'span'}>`}catch(error){out+=`<code class="math-error">${esc(tex)}</code>`;console.error(error)}pos=re.lastIndex;}
 return out+esc(value.slice(pos));
}
function renderLessonMath(){const m=window.MATH_CONTENT[lesson.id];$('#mathReference').textContent=m.refs;$('#mathExplanation').innerHTML=richMath(m.explanation);$('#mathProof').innerHTML=richMath(m.proof);$('#proofLabel').textContent=m.label;$('#latexSource').textContent=m.explanation+'\n\n'+m.label+'\n\n'+m.proof;}
