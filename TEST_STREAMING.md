# TEST_STREAMING.md - Guía de Pruebas de Streaming

## Arquitectura

```
OBS Studio
    ↓ (RTMP)
MediaMTX (Media Server)
    ↓ (HLS)
StreamHub Player (hls.js)
    ↓
Espectador
```

## Requisitos

1. Docker y Docker Compose instalados
2. OBS Studio instalado
3. Node.js 18+

## Paso 1: Levantar Infraestructura

```bash
# Levantar todos los servicios
docker compose up -d

# Verificar que todos los servicios estén corriendo
docker compose ps
```

Servicios esperados:
- `app` - Aplicación StreamHub (puerto 5173)
- `db` - PostgreSQL (puerto 5432)
- `redis` - Redis (puerto 6379)
- `media-server` - MediaMTX (puertos 1935, 8888, 9997)

## Paso 2: Levantar Aplicación

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

La aplicación estará disponible en: http://localhost:5173

## Paso 3: Obtener Stream Key

1. Inicia sesión en StreamHub (credenciales de prueba en README)
2. Ve a **Dashboard** → **Configurar Stream**
3. Copia la **URL del Servidor** y tu **Stream Key**

Ejemplo:
```
Servidor: rtmp://localhost:1935/live
Stream Key: abc123def456...
```

## Paso 4: Configurar OBS Studio

1. Abre OBS Studio
2. Ve a **Ajustes** → **Emisión**
3. Configura:
   - **Servicio**: Personalizado...
   - **Servidor**: `rtmp://localhost:1935/live`
   - **Clave de retransmisión**: Tu Stream Key
4. Ve a **Salida** → **Emisión**:
   - **Control de tasa**: CBR
   - **Tasa de bits**: 3500 Kbps (para 720p)
   - **Intervalo de fotogramas clave**: 2s
   - **Perfil de codificación**: high
5. Ve a **Video**:
   - **Resolución de la base**: 1280x720
   - **Resolución de salida**: 1280x720
   - **FPS**: 30
6. Ve a **Salida** → **Emisión**:
   - **Codificador**: x264
   - **Tasa de bits**: 3500 Kbps

## Paso 5: Iniciar Transmisión

1. En OBS, haz clic en **Iniciar transmisión**
2. OBS se conectará a MediaMTX vía RTMP
3. MediaMTX generará el stream HLS automáticamente

## Paso 6: Verificar Stream en StreamHub

### Opción A: Con MediaMTX Real

Si MediaMTX está corriendo correctamente:

1. Ve a tu canal: http://localhost:5173/channel/[tu-username]
2. Deberías ver el reproductor HLS reproduciendo tu stream
3. El indicador **🔴 EN VIVO** aparecerá

### Opción B: Modo de Prueba (Sin MediaMTX)

Si no tienes MediaMTX corriendo, usa el modo de prueba:

1. Ve a: http://localhost:5173/stream-test
2. Haz clic en **"Iniciar Stream (Simulación)"**
3. El canal cambiará a estado LIVE
4. Ve a tu canal para ver el reproductor (no reproducirá video real, pero mostrará la UI)

## Paso 7: Verificar en Explorar

1. Ve a: http://localhost:5173/explore
2. Tu stream debería aparecer en **"Canales en vivo"**
3. Verifica que se muestre:
   - Miniatura
   - Título
   - Nombre del canal
   - Indicador LIVE
   - Contador de espectadores

## Paso 8: Detener Transmisión

1. En OBS, haz clic en **Detener transmisión**
2. MediaMTX detectará la desconexión
3. Después del grace period (10s), el canal volverá a OFFLINE

### En Modo de Prueba:

1. Ve a: http://localhost:5173/stream-test
2. Haz clic en **"Detener Stream"**
3. El canal volverá a OFFLINE inmediatamente

## Paso 9: Verificar Base de Datos

### Con PostgreSQL Real:

```bash
# Conectar a la base de datos
docker compose exec db psql -U streamhub

# Ver streams
SELECT * FROM streams WHERE status = 'LIVE';

# Ver sesiones
SELECT * FROM stream_sessions ORDER BY startedAt DESC LIMIT 5;
```

### Con localStorage (Demo):

Abre la consola del navegador y ejecuta:

```javascript
// Ver streams activos
JSON.parse(localStorage.getItem('streamhub_streams')).filter(s => s.status === 'LIVE')

// Ver sesiones
JSON.parse(localStorage.getItem('streamhub_stream_sessions'))
```

## Troubleshooting

### OBS no se conecta

1. Verifica que MediaMTX esté corriendo:
   ```bash
   docker compose logs media-server
   ```

2. Verifica que el puerto 1935 esté abierto:
   ```bash
   netstat -an | grep 1935
   ```

3. Verifica tu Stream Key (debe ser exacta, sin espacios)

### El reproductor no carga

1. Verifica que MediaMTX esté generando HLS:
   ```bash
   curl http://localhost:8888/hls/[tu-username]/index.m3u8
   ```

2. Verifica la consola del navegador para errores de HLS

3. Asegúrate de que el stream esté realmente activo en MediaMTX:
   ```bash
   curl http://localhost:9997/v3/paths/list
   ```

### El stream no aparece como LIVE

1. Verifica que el webhook de MediaMTX esté configurado correctamente
2. Revisa los logs de la aplicación:
   ```bash
   docker compose logs app
   ```

3. En modo de prueba, verifica que el stream esté activo:
   ```javascript
   JSON.parse(localStorage.getItem('streamhub_streams'))
   ```

## Métricas y Monitoreo

### MediaMTX API

```bash
# Listar paths activos
curl http://localhost:9997/v3/paths/list

# Ver detalles de un path
curl http://localhost:9997/v3/paths/get/[username]
```

### Métricas

```bash
# Métricas de MediaMTX
curl http://localhost:9998/metrics
```

## Configuración de Producción

Para producción, ajusta:

1. **RTMP Server URL**: Usa tu dominio real
   ```
   rtmp://stream.tudominio.com/live
   ```

2. **HLS Base URL**: Configura CDN o servidor de distribución
   ```
   https://cdn.tudominio.com/hls
   ```

3. **MediaMTX**: Despliega en servidor dedicado con:
   - SSL/TLS para RTMPS
   - CDN para HLS
   - Auto-scaling para múltiples ingest servers

4. **Stream Keys**: Almacena con bcrypt/argon2 en PostgreSQL

## Pruebas Automatizadas

```bash
# Ejecutar tests de streaming
npm run test -- streaming

# Tests E2E
npm run test:e2e -- streaming
```

## Próximos Pasos (Fase 3)

- [ ] Chat en tiempo real (WebSockets)
- [ ] Moderación de chat
- [ ] Emotes personalizados
- [ ] Clips
- [ ] VOD (Video on Demand)
- [ ] Transcoding con FFmpeg
- [ ] Adaptive Bitrate (ABR)
- [ ] WebRTC para baja latencia
