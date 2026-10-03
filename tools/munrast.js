// One-off: municipality lookup raster for the tooltip (which municipality is under the cursor).
// Also stores M.codes (INE code per labs entry). Fills every census-section polygon of pack.json onto a 0.01° lon/lat grid with its municipality, then run-length
// encodes rows. Adds {r:{x0,y0,d,w,h,runs}} to mun.json; values are 1 + index into mun.json labs (0 = none).
const fs=require('fs');const P=JSON.parse(fs.readFileSync(process.argv[2]||__dirname+'/pack.json'));
const M=JSON.parse(fs.readFileSync(__dirname+'/mun.json'));
const b64=s=>Buffer.from(s,'base64');
function reader(u){let p=0;const vu=()=>{let r=0,s=1,b;do{b=u[p++];r+=(b&127)*s;s*=128;}while(b&128);return r;};return{vu,vs:()=>{const n=vu();return n%2?-(n+1)/2:n/2;}};}
const [sx,sy]=P.tr.scale,[tx,ty]=P.tr.translate;
const ARCS=[];{const R=reader(b64(P.arcs));const n=R.vu();for(let a=0;a<n;a++){const m=R.vu();const o=[];let x=0,y=0;for(let i=0;i<m;i++){x+=R.vs();y+=R.vs();o.push([x*sx+tx,y*sy+ty]);}ARCS.push(o);}}
// same name normalisation as mun.js, to map municipality key -> labs index
const cap=a=>a[0].toUpperCase()+a.slice(1);
const art=n=>n.split('/').map(x=>x.replace(/^(.+), (el|la|los|las|els|les|o|a|os|as|es|sa|ses|lo)$/i,(_,b,a)=>cap(a)+' '+b).replace(/^(.+), l'$/i,(_,b)=>"L'"+b)).join('/');
const D=0.01,X0=-18.3,Y0=27.5,Wd=Math.ceil((4.5-X0)/D),Hd=Math.ceil((44-Y0)/D);
const grid=new Uint16Array(Wd*Hd);
const idxOf=new Map();M.labs.forEach((l,i)=>{const k=l[0]+'|'+l[1]+'|'+l[2];idxOf.set(k,i);});
// recompute centroids exactly like mun.js to find each municipality's labs entry
const secs=[],cen={};
{const R=reader(b64(P.geom));const N=P.cusec.length/10;
 for(let s=0;s<N;s++){const rings=[];const np=R.vu();for(let p=0;p<np;p++){const nr=R.vu();for(let r=0;r<nr;r++){const na=R.vu();const a=[];for(let k=0;k<na;k++)a.push(R.vs());rings.push(a);}}
  const mun=R.vu();R.vu();for(let k=0;k<5;k++)R.vu();
  const pr=rings.map(r=>{const o=[];for(const a of r){const i=a>=0?a:~a;const seg=a>=0?ARCS[i]:ARCS[i].slice().reverse();for(let j=o.length?1:0;j<seg.length;j++)o.push(seg[j]);}return o;});
  let ax=0,ay=0,an=0;for(const r of rings)for(const a of r){for(const [x,y] of ARCS[a>=0?a:~a]){ax+=x;ay+=y;an++;}}
  const c=cen[mun]=cen[mun]||{x:0,y:0,n:0};c.x+=ax;c.y+=ay;c.n+=an;secs.push([mun,pr]);}}
const lab={},codes=[];for(const k in cen){const c=cen[k],m=P.mun[+k];if(!m)continue;const i=idxOf.get(art(m[1])+'|'+(+(c.x/c.n).toFixed(3))+'|'+(+(c.y/c.n).toFixed(3)));if(i!=null){lab[k]=i+1;codes[i]=m[0];}}
let miss=0;
for(const [mun,rings] of secs){const v=lab[mun];if(!v){miss++;continue;}
  let y1=Infinity,y2=-Infinity;for(const r of rings)for(const p of r){if(p[1]<y1)y1=p[1];if(p[1]>y2)y2=p[1];}
  for(let row=Math.max(0,Math.ceil((y1-Y0)/D-.5));row<=Math.min(Hd-1,Math.floor((y2-Y0)/D-.5));row++){const y=Y0+(row+.5)*D,xs=[];
    for(const r of rings)for(let i=0,j=r.length-1;i<r.length;j=i++){const [xa,ya]=r[i],[xb,yb]=r[j];if((ya>y)!==(yb>y))xs.push(xa+(y-ya)/(yb-ya)*(xb-xa));}
    xs.sort((a,b)=>a-b);
    for(let k=0;k+1<xs.length;k+=2){const c1=Math.max(0,Math.ceil((xs[k]-X0)/D-.5)),c2=Math.min(Wd-1,Math.floor((xs[k+1]-X0)/D-.5));for(let c=c1;c<=c2;c++)grid[row*Wd+c]=v;}}}
// small municipalities that caught no cell centre: stamp their label point so they can still be found
let stamped=0;
const seen=new Set(grid);M.labs.forEach((l,i)=>{if(seen.has(i+1))return;const c=Math.round((l[1]-X0)/D-.5),r=Math.round((l[2]-Y0)/D-.5);if(r>=0&&r<Hd&&c>=0&&c<Wd){grid[r*Wd+c]=i+1;stamped++;}});
const out=[];const vu=n=>{while(n>=128){out.push((n&127)|128);n=Math.floor(n/128);}out.push(n);};
for(let r=0;r<Hd;r++){let c=0;while(c<Wd){const v=grid[r*Wd+c];let n=1;while(c+n<Wd&&grid[r*Wd+c+n]===v)n++;vu(n);vu(v);c+=n;}}
M.codes=codes; // INE municipality code per labs entry (for AEMET forecasts)
M.r={x0:X0,y0:Y0,d:D,w:Wd,h:Hd,runs:Buffer.from(out).toString('base64')};
fs.writeFileSync(__dirname+'/mun.json',JSON.stringify(M));
console.log('grid',Wd,Hd,'miss secs',miss,'muns found',Object.keys(lab).length,'of',M.labs.length,'stamped',stamped,'bytes',out.length,'json',fs.statSync(__dirname+'/mun.json').size);
