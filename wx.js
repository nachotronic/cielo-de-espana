// Open-Meteo hourly cloud_cover, precipitation, temperature_2m and 10 m wind: last 7 days + 48 h forecast, on 0.4° grids.
// Plus a 7-day daily outlook per point (sky code, max/min, rain total, max wind) for the tooltip; 10 variables in all keep each call at weight 1.
// 0.4° keeps each run near 1.5k locations so 4 runs a day stay inside the free API quota.
// Run with Node 18+ (global fetch). Writes wx.json in the format tpl.html expects.
const fs=require('fs');
const grids=[{id:'pen',lon0:-14,lat0:34.5,d:0.4,nx:51,ny:27},{id:'can',lon0:-18.6,lat0:27.4,d:0.4,nx:15,ny:6}];
const PAST=168,FUT=48,T=PAST+FUT,BATCH=100,D=7;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(pts){
  const q=new URLSearchParams({latitude:pts.map(p=>p.lat.toFixed(3)).join(','),longitude:pts.map(p=>p.lon.toFixed(3)).join(','),
    hourly:'cloud_cover,precipitation,temperature_2m,wind_speed_10m,wind_direction_10m',past_hours:String(PAST),forecast_hours:String(FUT),
    daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',forecast_days:String(D),
    // days run midnight to midnight in Spain; hourly times come back in local time too, so start is shifted back to UTC below
    timezone:'Europe/Madrid',models:'best_match'});
  // the free API throttles bursts (429s, stalled connections), so retry patiently
  for(let a=0;a<20;a++){
    try{const r=await fetch('https://api.open-meteo.com/v1/forecast?'+q,{signal:AbortSignal.timeout(30000)});
      if(r.ok){const j=await r.json();return Array.isArray(j)?j:[j];}
      console.log('\nOpen-Meteo',r.status,(await r.text()).slice(0,120));await sleep(r.status==429?30000:5000);}
    catch(e){console.log('\nnet',e.name);await sleep(5000);}}
  throw new Error('Open-Meteo: too many retries');
}
(async()=>{
  let start=null,dstart=null;
  for(const g of grids){
    const n=g.nx*g.ny;g.cloud=Buffer.alloc(T*n);g.rain=Buffer.alloc(T*n);g.temp=Buffer.alloc(T*n);g.ws=Buffer.alloc(T*n);g.wd=Buffer.alloc(T*n);
    g.dwc=Buffer.alloc(D*n);g.dtx=Buffer.alloc(D*n);g.dtn=Buffer.alloc(D*n);g.dpr=Buffer.alloc(D*n);g.dws=Buffer.alloc(D*n);
    const pts=[];for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++)pts.push({i,j,lon:g.lon0+i*g.d,lat:g.lat0+j*g.d});
    for(let b=0;b<pts.length;b+=BATCH){
      const chunk=pts.slice(b,b+BATCH);const res=await get(chunk);
      res.forEach((o,m)=>{const p=chunk[m],h=o.hourly;if(!start)start=Date.parse(h.time[0]+':00Z')-(o.utc_offset_seconds||0)*1000;
        const dd=o.daily;if(!dstart&&dd)dstart=dd.time[0];
        // daily bytes: WMO code, max/min like temp, rain total in ½ mm (≤127 mm), max wind km/h
        if(dd)for(let e=0;e<D;e++){const k=e*n+p.j*g.nx+p.i,tb=x=>Math.round(Math.max(0,Math.min(255,((x??15)+40)*3)));
          g.dwc[k]=Math.max(0,Math.min(99,dd.weather_code[e]??0));g.dtx[k]=tb(dd.temperature_2m_max[e]);g.dtn[k]=tb(dd.temperature_2m_min[e]);
          g.dpr[k]=Math.round(Math.max(0,Math.min(127,dd.precipitation_sum[e]??0))*2);g.dws[k]=Math.round(Math.max(0,Math.min(255,dd.wind_speed_10m_max[e]??0)));}
        for(let t=0;t<T;t++){const k=t*n+p.j*g.nx+p.i;
          g.cloud[k]=Math.round(Math.max(0,Math.min(100,h.cloud_cover[t]??0)));
          g.rain[k]=Math.round(Math.max(0,Math.min(25,h.precipitation[t]??0))*10);
          // bytes: temp (°C+40)*3 (−40…45 °C, 1/3° steps), wind km/h, direction 0–255 for 0–360° (where it blows from)
          g.temp[k]=Math.round(Math.max(0,Math.min(255,((h.temperature_2m[t]??15)+40)*3)));
          g.ws[k]=Math.round(Math.max(0,Math.min(255,h.wind_speed_10m[t]??0)));
          g.wd[k]=Math.round((h.wind_direction_10m[t]??0)/360*256)&255;}});
      process.stdout.write(`\r${g.id} ${Math.min(b+BATCH,pts.length)}/${pts.length}`);
      await sleep(1500);}
    console.log();}
  const out={example:false,source:'Open-Meteo',past:PAST,updated:new Date().toISOString(),start:new Date(start).toISOString(),step:3600,T,dstart,D,
    grids:grids.map(g=>({id:g.id,lon0:g.lon0,lat0:g.lat0,d:g.d,nx:g.nx,ny:g.ny,cloud:g.cloud.toString('base64'),rain:g.rain.toString('base64'),temp:g.temp.toString('base64'),ws:g.ws.toString('base64'),wd:g.wd.toString('base64'),
      day:{wc:g.dwc.toString('base64'),tx:g.dtx.toString('base64'),tn:g.dtn.toString('base64'),pr:g.dpr.toString('base64'),ws:g.dws.toString('base64')}}))};
  fs.writeFileSync(__dirname+'/wx.json',JSON.stringify(out));
  let mx=0,wet=0;for(const g of grids)for(const v of g.rain){mx=Math.max(mx,v);if(v>=2)wet++;}
  console.log('bytes',fs.statSync(__dirname+'/wx.json').size,'start',out.start,'max mm/h',mx/10,'wet cells',wet);
})().catch(e=>{console.error(e);process.exit(1);});
