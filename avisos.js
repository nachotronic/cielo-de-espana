// AEMET OpenData warnings (avisos_cap, latest issue for all Spain) -> avisos.json for tpl.html.
// Needs AEMET_API_KEY in the environment and opendata.aemet.es allowed. Node 18+, system `tar`.
// The archive holds every CAP message still in force (Alert + its Updates); a message named in
// another's <references> has been superseded, so only the unreferenced ones are kept.
const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const KEY=process.env.AEMET_API_KEY;if(!KEY){console.error('Falta AEMET_API_KEY');process.exit(1);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url,opt){for(let a=0;a<6;a++){try{const r=await fetch(url,{...opt,signal:AbortSignal.timeout(60000)});
  if(r.ok)return r;console.log('AEMET',r.status,(await r.text()).slice(0,120));}catch(e){console.log('net',e.name);}await sleep(10000);}
  throw new Error('AEMET: too many retries');}
const tag=(s,n)=>{const m=s.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`));return m?m[1].trim():null;};
const tags=(s,n)=>[...s.matchAll(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`,'g'))].map(m=>m[1].trim());
const param=(s,name)=>{for(const p of tags(s,'parameter'))if(tag(p,'valueName')===name)return tag(p,'value');return null;};
(async()=>{
  const meta=await (await get('https://opendata.aemet.es/opendata/api/avisos_cap/ultimoelaborado/area/esp',{headers:{api_key:KEY,accept:'application/json'}})).json();
  if(!meta.datos)throw new Error('AEMET sin datos: '+JSON.stringify(meta));
  const buf=Buffer.from(await (await get(meta.datos)).arrayBuffer());
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'avisos-'));fs.writeFileSync(dir+'/a.tar',buf);execFileSync('tar',['xf','a.tar'],{cwd:dir});
  const msgs=fs.readdirSync(dir).filter(f=>f.endsWith('.xml')).map(f=>fs.readFileSync(path.join(dir,f),'utf8'));
  fs.rmSync(dir,{recursive:true,force:true});
  const superseded=new Set();for(const m of msgs){const r=tag(m,'references');if(r)for(const ref of r.split(/\s+/))superseded.add(ref.split(',')[1]);}
  const LV={amarillo:1,naranja:2,rojo:3},zones={},warnings=[];
  for(const m of msgs){if(superseded.has(tag(m,'identifier'))||tag(m,'msgType')==='Cancel')continue;
    const info=tags(m,'info').find(i=>tag(i,'language')==='es-ES');if(!info)continue;
    const lv=LV[param(info,'AEMET-Meteoalerta nivel')];if(!lv)continue; // verde = no warning
    const ph=(info.match(/<value>[A-Z]{2};([^;<]+)/)||[])[1]||tag(info,'event');
    const z=[];for(const a of tags(info,'area')){const code=tag(a,'value');z.push(code);
      if(!zones[code])zones[code]={n:tag(a,'areaDesc'),p:tags(a,'polygon').map(s=>s.split(/\s+/).map(q=>{const [la,lo]=q.split(',').map(Number);return [lo,la];}))};}
    warnings.push({z,lv,ph,on:new Date(tag(info,'onset')).toISOString(),off:new Date(tag(info,'expires')).toISOString(),
      d:(tag(info,'description')||'').replace(/\s+/g,' '),pr:param(info,'AEMET-Meteoalerta probabilidad')});}
  // only zones that carry a warning are embedded
  const used=new Set(warnings.flatMap(w=>w.z));for(const k in zones)if(!used.has(k))delete zones[k];
  const out={source:'AEMET',updated:new Date().toISOString(),zones,warnings};
  fs.writeFileSync(__dirname+'/avisos.json',JSON.stringify(out));
  const c=[0,0,0,0];warnings.forEach(w=>c[w.lv]++);
  console.log('mensajes',msgs.length,'avisos',warnings.length,'amarillo',c[1],'naranja',c[2],'rojo',c[3],'zonas',Object.keys(zones).length,'bytes',fs.statSync(__dirname+'/avisos.json').size);
})().catch(e=>{console.error(e);process.exit(1);});
