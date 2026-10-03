const fs=require('fs');const P=JSON.parse(fs.readFileSync(__dirname+'/pack.json'));
function b64(s){return Buffer.from(s,'base64');}
function reader(u){let p=0;const vu=()=>{let r=0,s=1,b;do{b=u[p++];r+=(b&127)*s;s*=128;}while(b&128);return r;};return{vu,vs:()=>{const n=vu();return n%2?-(n+1)/2:n/2;}};}
const [sx,sy]=P.tr.scale,[tx,ty]=P.tr.translate;
const ARCS=[];{const R=reader(b64(P.arcs));const n=R.vu();for(let a=0;a<n;a++){const m=R.vu();const o=[];let x=0,y=0;for(let i=0;i<m;i++){x+=R.vs();y+=R.vs();o.push([x*sx+tx,y*sy+ty]);}ARCS.push(o);}}
const use=new Map(); // arc -> list of {prov,dir}
{const R=reader(b64(P.geom));const N=P.cusec.length/10;
 for(let s=0;s<N;s++){const rings=[];const np=R.vu();for(let p=0;p<np;p++){const nr=R.vu();for(let r=0;r<nr;r++){const na=R.vu();const a=[];for(let k=0;k<na;k++)a.push(R.vs());rings.push(a);}}
  const mun=R.vu(),cpro=R.vu();for(let k=0;k<5;k++)R.vu();
  for(const r of rings)for(const a of r){const i=a>=0?a:~a;if(!use.has(i))use.set(i,[]);use.get(i).push({cpro,a});}}}
// province rings: arcs where other side differs
const byProv={};const lines={coast:[],prov:[]};
for(const [i,L] of use){const provs=new Set(L.map(x=>x.cpro));
  if(L.length===1){lines.coast.push(i);}
  else if(provs.size>1){lines.prov.push(i);}
  for(const x of L){const other=L.filter(y=>y!==x);if(other.length===0||other.some(y=>y.cpro!==x.cpro)){(byProv[x.cpro]=byProv[x.cpro]||[]).push(x.a);}}}
const pts=a=>a>=0?ARCS[a]:[...ARCS[~a]].reverse();
const key=p=>p[0].toFixed(7)+','+p[1].toFixed(7);
function stitch(list){const segs=list.map(pts);const byStart=new Map();segs.forEach((s,i)=>{const k=key(s[0]);if(!byStart.has(k))byStart.set(k,[]);byStart.get(k).push(i);});
 const used=new Set();const rings=[];
 for(let i=0;i<segs.length;i++){if(used.has(i))continue;used.add(i);let ring=[...segs[i]];let guard=0;
  while(key(ring[ring.length-1])!==key(ring[0])&&guard++<100000){const c=(byStart.get(key(ring[ring.length-1]))||[]).find(j=>!used.has(j));if(c==null)break;used.add(c);ring.push(...segs[c].slice(1));}
  rings.push(ring);}
 return rings;}
function dp(pts,eps){const n=pts.length;if(n>3&&pts[0][0]===pts[n-1][0]&&pts[0][1]===pts[n-1][1]){let mi=1,md=0;for(let i=1;i<n-1;i++){const d=Math.hypot(pts[i][0]-pts[0][0],pts[i][1]-pts[0][1]);if(d>md){md=d;mi=i;}}const A=dp0(pts.slice(0,mi+1),eps),B=dp0(pts.slice(mi),eps);return A.concat(B.slice(1));}return dp0(pts,eps);}
function dp0(pts,eps){if(pts.length<4)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
 while(st.length){const [a,b]=st.pop();let md=0,mi=-1;const [x1,y1]=pts[a],[x2,y2]=pts[b];const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1e-12;
  for(let i=a+1;i<b;i++){const d=Math.abs(dy*(pts[i][0]-x1)-dx*(pts[i][1]-y1))/L;if(d>md){md=d;mi=i;}}
  if(md>eps){keep[mi]=1;st.push([a,mi],[mi,b]);}}
 return pts.filter((_,i)=>keep[i]);}
const EPS=0.004;const q=v=>Math.round(v*1000)/1000;
const out={prov:{},gaps:[],names:P.prov};
let open=0,npts=0;
for(const c in byProv){const rings=stitch(byProv[c]).map(r=>{if(key(r[0])!==key(r[r.length-1]))open++;return dp(r,EPS).map(p=>[q(p[0]),q(p[1])]);}).filter(r=>r.length>=4);
 // drop tiny rings
 out.prov[c]=rings.filter(r=>{let A=0;for(let i=0;i<r.length-1;i++)A+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return Math.abs(A/2)>2e-5;});npts+=out.prov[c].reduce((s,r)=>s+r.length,0);}
out.gaps=P.gaps.map(r=>dp(r,EPS).map(p=>[q(p[0]),q(p[1])]));
// coast lines & province border lines (simplified) for stroke
const ml=ids=>ids.map(i=>dp(ARCS[i],EPS).map(p=>[q(p[0]),q(p[1])])).filter(l=>l.length>=2);
out.provLines=ml(lines.prov);
fs.writeFileSync(__dirname+'/geo.json',JSON.stringify(out));
console.log('open rings',open,'pts',npts,'bytes',fs.statSync(__dirname+'/geo.json').size,'provs',Object.keys(out.prov).length);
