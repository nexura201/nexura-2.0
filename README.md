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
