// Builds cielo.html from tpl.html + geo.json + wx.json + dem.json + avisos.json (AEMET warnings) + mun.json (municipal borders); the last two optional
const fs=require('fs');const d=__dirname;
const opt=f=>fs.existsSync(d+'/'+f)?fs.readFileSync(d+'/'+f,'utf8'):'null';
const av=fs.existsSync(d+'/avisos.json')?fs.readFileSync(d+'/avisos.json','utf8'):'null';
const html=fs.readFileSync(d+'/tpl.html','utf8').replace('__GEO__',()=>fs.readFileSync(d+'/geo.json','utf8')).replace('__WX__',()=>fs.readFileSync(d+'/wx.json','utf8')).replace('__DEM__',()=>fs.readFileSync(d+'/dem.json','utf8')).replace('__AV__',()=>av.replace(/</g,'\\u003c')).replace('__MUN__',()=>opt('mun.json').replace(/</g,'\\u003c'));
fs.writeFileSync(d+'/cielo.html',html);console.log('cielo.html',html.length);
