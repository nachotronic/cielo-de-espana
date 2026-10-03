// One-off generator (not part of the refresh). pack.json is the census-section topology embedded in the original INE map
// artifact (https://claude.ai/artifact/7c7wbQFtBbMZeRS4MFtDW4, <script id="pack">); extract it next to this file first.
// municipal borders + label points from the census-section topology of the original INE map (pack.json)
const fs=require('fs');const P=JSON.parse(fs.readFileSync(process.argv[2]||__dirname+'/pack.json'));
const b64=s=>Buffer.from(s,'base64');
function reader(u){let p=0;const vu=()=>{let r=0,s=1,b;do{b=u[p++];r+=(b&127)*s;s*=128;}while(b&128);return r;};return{vu,vs:()=>{const n=vu();return n%2?-(n+1)/2:n/2;}};}
const [sx,sy]=P.tr.scale,[tx,ty]=P.tr.translate;
const ARCS=[];{const R=reader(b64(P.arcs));const n=R.vu();for(let a=0;a<n;a++){const m=R.vu();const o=[];let x=0,y=0;for(let i=0;i<m;i++){x+=R.vs();y+=R.vs();o.push([x*sx+tx,y*sy+ty]);}ARCS.push(o);}}
const use=new Map(),cen={};
{const R=reader(b64(P.geom));const N=P.cusec.length/10;
 for(let s=0;s<N;s++){const rings=[];const np=R.vu();for(let p=0;p<np;p++){const nr=R.vu();for(let r=0;r<nr;r++){const na=R.vu();const a=[];for(let k=0;k<na;k++)a.push(R.vs());rings.push(a);}}
  const mun=R.vu(),cpro=R.vu();for(let k=0;k<5;k++)R.vu();const key=mun;
  let ax=0,ay=0,an=0;
  for(const r of rings)for(const a of r){const i=a>=0?a:~a;if(!use.has(i))use.set(i,new Set());use.get(i).add(key);for(const [x,y] of ARCS[i]){ax+=x;ay+=y;an++;}}
  const c=cen[key]=cen[key]||{x:0,y:0,n:0,s:0};c.x+=ax;c.y+=ay;c.n+=an;c.s++;}}
function dp(pts,eps){if(pts.length<3)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
 while(st.length){const [a,b]=st.pop();let md=0,mi=-1;const [x1,y1]=pts[a],[x2,y2]=pts[b];const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1e-12;
  for(let i=a+1;i<b;i++){const d=Math.abs(dy*(pts[i][0]-x1)-dx*(pts[i][1]-y1))/L;if(d>md){md=d;mi=i;}}
  if(md>eps){keep[mi]=1;st.push([a,mi],[mi,b]);}}return pts.filter((_,i)=>keep[i]);}
const Q=1e-3,out=[];let nl=0,np=0;const vu=n=>{while(n>=128){out.push((n&127)|128);n=Math.floor(n/128);}out.push(n);},vs=n=>vu(n<0?-2*n-1:2*n);
for(const [i,S] of use){if(S.size<2)continue;const pts=dp(ARCS[i],0.0015).map(([x,y])=>[Math.round(x/Q),Math.round(y/Q)]);
  const q=pts.filter((p,k)=>k===0||p[0]!==pts[k-1][0]||p[1]!==pts[k-1][1]);if(q.length<2)continue;
  vu(q.length);let px=0,py=0;for(const [x,y] of q){vs(x-px);vs(y-py);px=x;py=y;}nl++;np+=q.length;}
// INE writes "Casar, El"; show "El Casar" (also Catalan/Galician/Balearic articles, and L' without a space)
const cap=a=>a[0].toUpperCase()+a.slice(1);
const art=n=>n.split('/').map(x=>x.replace(/^(.+), (el|la|los|las|els|les|o|a|os|as|es|sa|ses|lo)$/i,(_,b,a)=>cap(a)+' '+b).replace(/^(.+), l'$/i,(_,b)=>"L'"+b)).join('/');
const names=P.mun;const labs=[];for(const k in cen){const c=cen[k],m=names[+k];if(!m||!c.n)continue;labs.push([art(m[1]),+(c.x/c.n).toFixed(3),+(c.y/c.n).toFixed(3),c.s]);}
// most census sections (≈ most people) first, so the label pass keeps the big towns
labs.sort((a,b)=>b[3]-a[3]);labs.forEach(l=>l.pop());
const res={q:Q,lines:Buffer.from(out).toString('base64'),labs};
fs.writeFileSync('/mnt/project-files/cielo-de-espana/mun.json',JSON.stringify(res));
console.log('lines',nl,'pts',np,'bytes',Buffer.from(out).length,'labs',labs.length,'json',fs.statSync('/mnt/project-files/cielo-de-espana/mun.json').size, names.length, labs.slice(0,3));
