# NEXURA

Plataforma de streaming en vivo.

## 🚀 Despliegue en GitHub Pages

### Configuración inicial

1. Crea un repositorio en GitHub llamado `nexura1` (o el nombre que prefieras)
2. Sube el código al repositorio
3. Ve a **Settings > Pages** en tu repositorio
4. En **Source**, selecciona **GitHub Actions**

### Despliegue automático

El proyecto incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que:
- Se ejecuta automáticamente en cada push a la rama `main`
- Construye el proyecto con Vite
- Despliega a GitHub Pages

### URL de producción

Después del primer despliegue, tu aplicación estará disponible en:
```
https://tu-usuario.github.io/nexura1/
```

### Configuración del base path

Si cambias el nombre del repositorio, actualiza `vite.config.js`:

```javascript
export default defineConfig({
  base: "/nombre-de-tu-repo/",
  // ... resto de la configuración
});
```

## 🖥️ Despliegue en hosting tradicional

### Requisitos

- Node.js 18+ o superior
- npm o yarn

### Pasos

1. **Instalar dependencias**
   ```bash
   npm ci
   ```

2. **Construir para producción**
   ```bash
   npm run build
   ```

3. **Subir el contenido de `dist/` a tu servidor**

   El directorio `dist/` contiene todos los archivos estáticos necesarios:
   - `index.html`
   - `assets/` (JavaScript y CSS compilados)

4. **Configurar tu servidor web**

   Para Apache, crea un archivo `.htaccess` en la raíz:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   Para Nginx, agrega a tu configuración:
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

### Desarrollo local

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📝 Variables de entorno

Copia `.env.example` a `.env` y configura las variables necesarias:

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales. **Nunca subas `.env` al repositorio.**

### NEXURA IA (Google Gemini) — configuración para el comprador/administrador

NEXURA IA funciona mediante una Serverless Function de Vercel (`api/ai/chat.ts`). Para activarla:

1. Creá una API key de Gemini en Google AI Studio / Google Cloud.
2. En Vercel: **Project → Settings → Environment Variables**, agregá `GEMINI_API_KEY` (scope Production/Preview/Development).
   - **Sin prefijo `VITE_`** y **nunca** en código ni en el navegador: la key vive solo del lado servidor.
3. Opcional: `GEMINI_MODEL` (default `gemini-2.5-flash`) y `NEXURA_IA_BEHAVIOR` (`concisa|equilibrada|detallada`).
4. Redeployá. Verificá con `GET /api/ai/status` → `{ "ok": true, "configured": true }`.

Sin `GEMINI_API_KEY`, la app sigue funcionando: el chat muestra un aviso claro ("IA no configurada") indicando exactamente qué debe hacer el administrador. El historial del chat es de sesión (no requiere base de datos).

## 🔧 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run typecheck` - Verifica tipos TypeScript

## 📦 Estructura del proyecto

```
nexura/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── src/
│   ├── App.tsx                 # Componente principal
│   ├── main.tsx                # Punto de entrada
│   └── index.css               # Estilos globales
├── public/                     # Assets estáticos
├── index.html                  # HTML principal
├── package.json                # Dependencias
├── vite.config.js              # Configuración de Vite
├── tsconfig.json               # Configuración de TypeScript
└── .env.example                # Variables de entorno de ejemplo
```

## 📡 Infraestructura de streaming (RTMP/HLS)

NEXURA **no incluye un servidor RTMP/HLS propio**. La plataforma está preparada para conectar la infraestructura de streaming que el comprador despliegue y mantenga por separado.

### Variables de configuración

| Variable | Qué representa | Ejemplo |
|---|---|---|
| `VITE_RTMP_SERVER_URL` | URL de **ingestión** RTMP: la que se pega en OBS/Streamlabs como "Servidor". | `rtmp://stream.tu-dominio.ejemplo/live` |
| `VITE_HLS_BASE_URL` | Base pública de **reproducción** HLS donde el servidor publica los playlists `.m3u8`. | `https://stream.tu-dominio.ejemplo/hls` |

Se configuran en `.env.local` (desarrollo) o en las Environment Variables del proyecto en Vercel (producción), y requieren un rebuild/redeploy porque quedan embebidas en el bundle. Pueden definirse también desde **Owner → Servers** (`/owner/servers`), que registra servidores en el pool local; las variables `VITE_*` tienen prioridad.

⚠️ **Seguridad:** son variables `VITE_*`, visibles en el frontend. Colocar **solo URLs públicas**. Nunca secretos, tokens ni credenciales.

### Sin configurar = modo demo honesto

Si no definís ninguna URL, NEXURA usa un fallback claramente etiquetado **"DEMO"** (`localhost`) en las pantallas de streaming, y el reproductor muestra **"Streaming no configurado"** en lugar de intentar conectarse a un servidor inexistente. No se simula infraestructura real.

### MediaMTX (una opción posible)

[MediaMTX](https://github.com/bluenviron/mediamtx) es un servidor open-source compatible que puede servir tanto la ingestión RTMP (puerto 1935, ruta `/live`) como la salida HLS (puerto 8888, ruta `/hls`). Su despliegue queda a cargo del comprador: **este repositorio no lo instala, lo despliega ni lo ejecuta**. Una vez tengas tu servidor funcionando, apuntá las dos variables anteriores a él.

### Importante: "Configurado" ≠ "Online"

La app reporta el estado de la infraestructura como **Configurado** cuando existe una URL definida. Eso **no** afirma que el servidor responda: el health check real (verificación de conectividad y webhooks de eventos start/stop) queda pendiente para una futura etapa/backend. Ninguna pantalla debe mostrar — ni mostró — un falso "Online".

## 🧪 MODO DEMO

NEXURA incluye un **modo demo** pensado para demostrar la plataforma sin base de datos real.

- **Qué es:** un universo de contenido ficticio y coherente (canales `demo_*`, streams LIVE simulados, reels, clips, VODs, mensajes de chat de un bot de ejemplo, notificaciones y actividad) que se siembra en **localStorage del navegador**. No representa usuarios reales ni actividad compartida.
- **Cómo activarlo:** `VITE_DEMO_MODE=true` en `.env.local` / Environment Variables de Vercel (requiere rebuild), o desde **Configuración → Modo Demo** (override local, sin recompilar). Por defecto está ON en `npm run dev` y OFF en producción salvo activación explícita.
- **Cómo desactivarlo:** mismo toggle en Configuración → Modo Demo, o `VITE_DEMO_MODE=false`.
- **Identificación visual:** franja global "Modo demo" en la parte superior, badges `DEMO` junto a viewers/seguidores/LIVE/chat/notificaciones cuando el dato puede confundirse con real, y página pública **`/demo-info`** con el detalle completo.
- **Restaurar el seed:** botón "Restaurar datos demo" (con confirmación) elimina ÚNICAMENTE entidades demo (`demo_*` y lo que cuelga de ellas) y vuelve a sembrar los valores originales. Tus cuentas y creaciones locales no-demo no se ven afectadas.
- **Límites honestos:** los streams demo son metadatos ficticios (no hay transmisión real detrás); los videos de muestra de reels provienen de URLs públicas de ejemplo ya incluidas en el seed original. **No existen datos financieros falsos**: las secciones de monetización muestran configuración y estados vacíos explicativos.
- **Para producción:** el comprador debe conectar su propio backend/base de datos; el modo demo es solo material de demostración local.

## ⚠️ Notas importantes

### GitHub Pages

- El `base` en `vite.config.js` debe coincidir con el nombre del repositorio
- Las rutas son case-sensitive en GitHub Pages (Linux)
- SPA routing requiere configuración adicional (ver sección de hosting)

### SPA Routing

Si tu aplicación usa React Router, necesitas configurar redirecciones:

**GitHub Pages:**
Crea un archivo `404.html` en `public/` con el mismo contenido que `index.html`

**Hosting tradicional:**
Configura redirecciones en tu servidor web (ver sección de hosting)

## 🔒 Seguridad

- Nunca subas `.env` al repositorio
- Usa variables de entorno para secrets
- El archivo `.gitignore` ya excluye archivos sensibles

## 📄 Licencia

Privado - Todos los derechos reservados

NEXURA 2.0 — prueba de publicación GitHub
