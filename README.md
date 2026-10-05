# El Parte — el tiempo, en el mapa

Mapa del tiempo de España: nubes y precipitación, temperatura, lluvia acumulada y viento por horas (últimos 7 días y previsión a 48 h, Open-Meteo), avisos de AEMET y límites municipales del INE.

Se publica en GitHub Pages y se regenera solo cada 6 horas con la acción **Actualizar mapa** (`.github/workflows/actualizar.yml`).

## Cómo funciona

- `wx.js` descarga la previsión de Open-Meteo en una rejilla de 0,4° y escribe `wx.json`.
- `avisos.js` descarga los avisos CAP de AEMET (necesita el secreto `AEMET_API_KEY`) y escribe `avisos.json`.
- `build.js` junta `tpl.html` con `geo.json`, `dem.json`, `mun.json` y los datos, y genera `cielo.html` (todo en un solo archivo).
- `geo.json`, `dem.json` y `mun.json` son fijos; los scripts que los generaron están en `tools/`.

## Probar en local

```sh
node wx.js
AEMET_API_KEY=... node avisos.js   # opcional
node build.js                      # abre cielo.html
```

Datos: Open-Meteo (CC BY 4.0), AEMET OpenData, INE.
