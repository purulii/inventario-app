# Inventario Restaurante (PWA)
Correr: `npm install && npm start` → http://localhost:3000
Túnel público: `cloudflared tunnel --url http://localhost:3000`
PINs demo: Empleado Carlos 1111, María 2222 · Dueño 9999 (en tabla users).
Datos: `inventario.db` (SQLite vía sql.js), o la ruta en `DB_PATH`. Borrar el archivo resetea a datos de ejemplo.

## Deploy en Railway

1. Conecta este repositorio en Railway.
2. Añade un Volume montado en `/data`.
3. Define la variable de entorno `DB_PATH=/data/inventario.db`.

Railway inyecta `PORT`. El servidor escucha en `process.env.PORT` o en `3000`, y guarda el SQLite en `DB_PATH` (por defecto `./inventario.db`). Requiere Node.js 20 o superior.
