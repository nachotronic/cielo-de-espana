// Facts for the spoken/written forecast ("El Parte"): per city, today's and tomorrow's daily outlook from wx.json.
// Writes parte.json and prints a compact copy as a run annotation (readable via the API; logs are not).
const fs=require('fs');const WX=JSON.parse(fs.readFileSync(__dirname+'/wx.json','utf8'));
const C=[['A Coruña',-8.41,43.36],['Lugo',-7.56,43.01],['Ourense',-7.86,42.34],['Vigo',-8.72,42.24],['Oviedo',-5.85,43.36],['Santander',-3.8,43.46],['Bilbao',-2.93,43.26],['San Sebastián',-1.98,43.32],
 ['Pamplona',-1.64,42.81],['Logroño',-2.45,42.47],['Zaragoza',-0.88,41.65],['Huesca',-0.41,42.14],['Lleida',0.62,41.62],['Girona',2.82,41.98],['Barcelona',2.17,41.39],['Tarragona',1.25,41.12],
 ['León',-5.57,42.6],['Burgos',-3.7,42.34],['Valladolid',-4.72,41.65],['Salamanca',-5.66,40.97],['Soria',-2.47,41.76],['Segovia',-4.12,40.95],['Madrid',-3.7,40.42],['Guadalajara',-3.17,40.63],
 ['Cuenca',-2.13,40.07],['Toledo',-4.02,39.86],['Ciudad Real',-3.93,38.99],['Albacete',-1.86,38.99],['Cáceres',-6.37,39.47],['Badajoz',-6.97,38.88],['Teruel',-1.11,40.34],['Castellón',-0.04,39.99],
 ['Valencia',-0.38,39.47],['Alicante',-0.49,38.35],['Murcia',-1.13,37.99],['Palma',2.65,39.57],['Sevilla',-5.98,37.39],['Córdoba',-4.78,37.89],['Jaén',-3.79,37.77],['Granada',-3.6,37.18],
 ['Almería',-2.46,36.84],['Málaga',-4.42,36.72],['Cádiz',-6.29,36.53],['Huelva',-6.95,37.26],['Las Palmas',-15.43,28.12],['S. C. de Tenerife',-16.25,28.47]];
const dec=s=>Buffer.from(s,'base64');const G=WX.grids.map(g=>({...g,day:g.day&&{wc:dec(g.day.wc),tx:dec(g.day.tx),tn:dec(g.day.tn),pr:dec(g.day.pr),ws:dec(g.day.ws)}}));
const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'}),e0=Math.round((Date.parse(today)-Date.parse(WX.dstart))/864e5);
const out={updated:WX.updated,today,cities:[]};
for(const [n,lon,lat] of C){for(const g of G){const i=Math.round((lon-g.lon0)/g.d),j=Math.round((lat-g.lat0)/g.d);if(!g.day||i<0||j<0||i>=g.nx||j>=g.ny)continue;const N=g.nx*g.ny;
  const d=e=>{const k=e*N+j*g.nx+i;return [g.day.wc[k],Math.round(g.day.tx[k]/3-40),Math.round(g.day.tn[k]/3-40),g.day.pr[k]/2,g.day.ws[k]];};
  out.cities.push([n,d(e0),d(e0+1)]);break;}}
fs.writeFileSync(__dirname+'/parte.json',JSON.stringify(out));
// one annotation per ~12 cities so none is truncated
console.log(`::notice::parte ${today} (datos ${WX.updated}) wc,max,min,mm,viento hoy|mañana`);
for(let a=0;a<out.cities.length;a+=12)console.log('::notice::'+out.cities.slice(a,a+12).map(([n,h,m])=>n+' '+h.join(',')+'|'+m.join(',')).join('; '));
