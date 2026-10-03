// Free API is rate limited (~60 requests of 100 points per minute), so this paces itself; run once, not on every refresh.
// Elevation grids for hillshade (Open-Meteo elevation API, 100 points per request). Writes dem.json.
const fs=require('fs');
const grids=[{id:'pen',lon0:-9.6,lat0:35.8,d:0.08,nx:178,ny:103},{id:'can',lon0:-18.3,lat0:27.6,d:0.04,nx:126,ny:48}];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(pts){const q=`latitude=${pts.map(p=>p[1].toFixed(4)).join(',')}&longitude=${pts.map(p=>p[0].toFixed(4)).join(',')}`;
  for(let a=0;a<30;a++){try{const r=await fetch('https://api.open-meteo.com/v1/elevation?'+q,{signal:AbortSignal.timeout(25000)});
      if(r.ok)return (await r.json()).elevation;console.log('HTTP',r.status,'retry');await sleep(r.status==429?20000:5000);}
    catch(e){console.log('net',e.name,'retry');await sleep(3000);}}
  throw new Error('elevation: too many retries');}
(async()=>{const out={};
 for(const g of grids){const n=g.nx*g.ny,el=new Uint16Array(n),pts=[];
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++)pts.push([g.lon0+i*g.d,g.lat0+j*g.d]);
  const jobs=[];for(let b=0;b<n;b+=100)jobs.push(b);let done=0;
  async function worker(){while(jobs.length){const b=jobs.shift();const e=await get(pts.slice(b,b+100));e.forEach((v,k)=>el[b+k]=Math.max(0,Math.round(v||0)));done++;if(done%20==0)console.log(g.id,done);await sleep(2000);}}
  await worker();
  out[g.id]={lon0:g.lon0,lat0:g.lat0,d:g.d,nx:g.nx,ny:g.ny,el:Buffer.from(el.buffer).toString('base64')};
  console.log(g.id,'max',Math.max(...el));}
 fs.writeFileSync(__dirname+'/dem.json',JSON.stringify(out));console.log('bytes',fs.statSync(__dirname+'/dem.json').size);
})().catch(e=>{console.error(e);process.exit(1);});
