# Datos de OpenStreetMap

`osm-api-centro.json`: descarga única de la API 0.6 de OpenStreetMap (formato JSON) para la caja
`-76.2455,-9.9355,-76.2340,-9.9240` (centro de Huánuco), realizada el 18/11/2026.

© Colaboradores de OpenStreetMap. Datos disponibles bajo la Open Database License (ODbL):
https://www.openstreetmap.org/copyright

Se usa para generar `src/data/pilot-dataset.json` (`npm run pilot:build`). La geometría y los lugares son reales;
los estados de accesibilidad de los tramos son simulados, salvo el tramo con fuente oficial (ver `docs/research.md`).
