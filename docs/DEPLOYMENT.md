# NEXURA - Guía de Despliegue

## Introducción

Esta guía detalla el proceso completo para desplegar NEXURA en un entorno de producción.

---

## Requisitos Previos

### Hardware Mínimo
- **CPU**: 4 cores (8 cores recomendado)
- **RAM**: 8 GB (16 GB recomendado)
- **Storage**: 100 GB SSD (500 GB recomendado)
- **Network**: 1 Gbps

### Software Requerido
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker y Docker Compose
- Nginx o Caddy (reverse proxy)
- MediaMTX (media server)
- FFmpeg (procesamiento de video)

### Servicios Externos
- Proveedor de pagos (Stripe, PayPal, MercadoPago)
- Proveedor de email (Resend, SendGrid, SMTP)
- Object storage (S3, R2, MinIO)
- CDN (CloudFront, Cloudflare)
- Monitor de uptime (UptimeRobot, Pingdom)

---

## 1. Preparación del Servidor

### 1.1 Configurar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
sudo apt install -y curl git ufw fail2ban

# Configurar firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 1935/tcp  # RTMP
sudo ufw enable
```

### 1.2 Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install -y docker-compose-plugin

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
```

### 1.3 Instalar Node.js

```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

---

## 2. Configuración de la Base de Datos

### 2.1 Instalar PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar y habilitar
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.2 Crear Base de Datos y Usuario

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear usuario
CREATE USER nexura WITH PASSWORD 'tu_password_seguro';

# Crear base de datos
CREATE DATABASE nexura OWNER nexura;

# Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE nexura TO nexura;

# Salir
\q
```

### 2.3 Configurar Backups

```bash
# Crear script de backup
sudo nano /usr/local/bin/nexura-backup.sh
```

Contenido del script:
```bash
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup
pg_dump -U nexura -h localhost nexura | gzip > $BACKUP_DIR/nexura_$DATE.sql.gz

# Retener solo últimos 30 días
find $BACKUP_DIR -name "nexura_*.sql.gz" -mtime +30 -delete
```

```bash
# Hacer ejecutable
sudo chmod +x /usr/local/bin/nexura-backup.sh

# Agregar a cron
sudo crontab -e
```

Agregar línea:
```
0 2 * * * /usr/local/bin/nexura-backup.sh
```

---

## 3. Configuración de Redis

### 3.1 Instalar Redis

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis
sudo nano /etc/redis/redis.conf
```

Configuraciones importantes:
```conf
bind 127.0.0.1
requirepass tu_password_seguro
maxmemory 2gb
maxmemory-policy allkeys-lru
```

```bash
# Reiniciar Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

---

## 4. Desplegar NEXURA

### 4.1 Clonar el Repositorio

```bash
# Crear directorio de aplicación
sudo mkdir -p /var/www/nexura
cd /var/www/nexura

# Clonar repositorio
sudo git clone https://github.com/tu-organizacion/nexura.git .
```

### 4.2 Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
sudo cp .env.production.example .env.production

# Editar variables
sudo nano .env.production
```

Variables críticas:
```env
# Aplicación
NODE_ENV=production
APP_URL=https://nexura.example
APP_DOMAIN=nexura.example

# Base de datos
DATABASE_URL=postgresql://nexura:password@localhost:5432/nexura

# Redis
REDIS_URL=redis://:password@localhost:6379

# Storage
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_BUCKET=nexura-assets
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key

# CDN
CDN_URL=https://cdn.nexura.example

# Pagos
PAYMENT_PROVIDER=stripe
PAYMENT_SECRET_KEY=sk_live_xxx
PAYMENT_WEBHOOK_SECRET=whsec_xxx

# Email
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxx
EMAIL_FROM=noreply@nexura.example

# Media Server
MEDIA_SERVER_URL=rtmp://media.nexura.example:1935/live
HLS_BASE_URL=https://media.nexura.example/hls

# Seguridad
AUTH_SECRET=generar_con_openssl_rand_hex_32
OWNER_EMAIL=owner@nexura.example
OWNER_PASSWORD=cambiar_en_primer_login
```

### 4.3 Instalar Dependencias

```bash
# Instalar dependencias
sudo npm ci --production

# Ejecutar migraciones
sudo npx prisma migrate deploy

# Generar cliente Prisma
sudo npx prisma generate
```

### 4.4 Crear Servicio Systemd

```bash
sudo nano /etc/systemd/system/nexura.service
```

Contenido:
```ini
[Unit]
Description=NEXURA Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nexura
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Iniciar servicio
sudo systemctl start nexura
sudo systemctl enable nexura

# Verificar estado
sudo systemctl status nexura
```

---

## 5. Configurar MediaMTX

### 5.1 Desplegar MediaMTX

```bash
# Crear directorio
sudo mkdir -p /opt/mediamtx
cd /opt/mediamtx

# Descargar MediaMTX
wget https://github.com/bluenviron/mediamtx/releases/latest/download/mediamtx_linux_amd64.tar.gz
tar -xzf mediamtx_linux_amd64.tar.gz

# Crear configuración
sudo nano mediamtx.yml
```

Configuración básica:
```yaml
logLevel: info
logDestinations:
  - stdout

rtmp: true
rtmpEncryption: "no"
rtmpAddress: :1935

hls: true
hlsEncryption: "no"
hlsAddress: :8888
hlsAlwaysRemux: yes
hlsVariant: lowlatency
hlsSegmentCount: 8
hlsSegmentDuration: 1s
hlsPartDuration: 200ms

api: true
apiAddress: 127.0.0.1:9997

metrics: true
metricsAddress: 127.0.0.1:9998

playback: true
playbackAddress: :9996

pathDefaults:
  source: publisher
  overridePublishUser: ""
  overridePublishPass: ""
```

### 5.2 Crear Servicio Systemd para MediaMTX

```bash
sudo nano /etc/systemd/system/mediamtx.service
```

Contenido:
```ini
[Unit]
Description=MediaMTX Media Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mediamtx
ExecStart=/opt/mediamtx/mediamtx
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Iniciar servicio
sudo systemctl start mediamtx
sudo systemctl enable mediamtx
```

---

## 6. Configurar Reverse Proxy

### 6.1 Instalar Nginx

```bash
sudo apt install -y nginx
```

### 6.2 Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/nexura
```

Configuración:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name nexura.example www.nexura.example;
    return 301 https://$server_name$request_uri;
}

# Main application
server {
    listen 443 ssl http2;
    server_name nexura.example www.nexura.example;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/nexura.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexura.example/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# Media server (RTMP)
server {
    listen 1935;
    server_name media.nexura.example;

    location / {
        proxy_pass rtmp://127.0.0.1:1935;
    }
}

# Media server (HLS)
server {
    listen 443 ssl http2;
    server_name media.nexura.example;

    ssl_certificate /etc/letsencrypt/live/media.nexura.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/media.nexura.example/privkey.pem;

    location /hls {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept' always;
        
        # Cache
        add_header Cache-Control "public, max-age=3600";
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/nexura /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 7. Configurar SSL/TLS

### 7.1 Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 Obtener Certificados

```bash
# Certificado para dominio principal
sudo certbot --nginx -d nexura.example -d www.nexura.example

# Certificado para media server
sudo certbot --nginx -d media.nexura.example
```

### 7.3 Configurar Renovación Automática

```bash
# Verificar renovación automática
sudo certbot renew --dry-run

# Certbot ya configura el cron automáticamente
```

---

## 8. Configurar DNS

### 8.1 Registros DNS

Configurar los siguientes registros DNS:

```
Tipo    Nombre                  Valor                   TTL
A       nexura.example          IP_DEL_SERVIDOR         3600
A       www.nexura.example      IP_DEL_SERVIDOR         3600
A       media.nexura.example    IP_DEL_SERVIDOR         3600
CNAME   cdn.nexura.example      cdn-provider.example    3600
TXT     @                       "v=spf1 include:_spf.google.com ~all"  3600
TXT     _dmarc                  "v=DMARC1; p=quarantine; rua=mailto:dmarc@nexura.example"  3600
```

### 8.2 Verificar Propagación

```bash
# Verificar DNS
dig nexura.example
dig www.nexura.example
dig media.nexura.example

# Verificar SSL
openssl s_client -connect nexura.example:443
```

---

## 9. Verificación Post-Despliegue

### 9.1 Health Checks

```bash
# Verificar aplicación
curl https://nexura.example/api/health

# Verificar base de datos
curl https://nexura.example/api/ready

# Verificar media server
curl http://media.nexura.example:9997/v3/paths/list
```

### 9.2 Smoke Tests

1. **Registro de usuario**: Crear una cuenta de prueba
2. **Login**: Iniciar sesión con la cuenta de prueba
3. **Perfil**: Actualizar perfil de usuario
4. **Streaming**: Iniciar un stream de prueba con OBS
5. **Chat**: Enviar mensajes en el chat
6. **VOD**: Verificar que el VOD se genere correctamente
7. **Pagos**: Realizar una prueba de pago en sandbox

### 9.3 Monitoreo

```bash
# Ver logs de la aplicación
sudo journalctl -u nexura -f

# Ver logs de MediaMTX
sudo journalctl -u mediamtx -f

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 10. Rollback

Si algo sale mal durante el despliegue:

### 10.1 Rollback de Aplicación

```bash
# Volver a versión anterior
cd /var/www/nexura
sudo git checkout v1.0.0  # Versión anterior

# Reinstalar dependencias
sudo npm ci --production

# Reiniciar servicio
sudo systemctl restart nexura
```

### 10.2 Rollback de Base de Datos

```bash
# Restaurar desde backup
gunzip -c /backups/postgresql/nexura_YYYYMMDD_HHMMSS.sql.gz | psql -U nexura -h localhost nexura
```

---

## 11. Mantenimiento

### 11.1 Actualizaciones Regulares

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Actualizar NEXURA
cd /var/www/nexura
sudo git pull origin main
sudo npm ci --production
sudo npx prisma migrate deploy
sudo systemctl restart nexura
```

### 11.2 Limpieza

```bash
# Limpiar logs antiguos
sudo journalctl --vacuum-time=7d

# Limpiar backups antiguos
find /backups -name "*.sql.gz" -mtime +30 -delete

# Limpiar archivos temporales
sudo rm -rf /tmp/nexura-*
```

---

## 12. Soporte

Si encontrás problemas durante el despliegue:

- **Documentación**: `/docs/`
- **Soporte**: soporte@nexura.example
- **Status**: https://nexura.example/status

---

## Checklist Final

- [ ] Servidor configurado
- [ ] PostgreSQL instalado y configurado
- [ ] Redis instalado y configurado
- [ ] NEXURA desplegado
- [ ] MediaMTX desplegado
- [ ] Nginx configurado
- [ ] SSL/TLS configurado
- [ ] DNS configurado
- [ ] Health checks funcionando
- [ ] Smoke tests pasados
- [ ] Monitoreo configurado
- [ ] Backups configurados
- [ ] Documentación actualizada

---

**Última actualización**: Enero 2024  
**Versión**: 1.0.0
