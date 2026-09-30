# NEXURA - Runbook de Operaciones

## Introducción

Este runbook contiene los procedimientos operativos estándar para mantener y operar NEXURA en producción.

---

## Tabla de Contenidos

1. [Procedimientos de Inicio](#procedimientos-de-inicio)
2. [Procedimientos de Reinicio](#procedimientos-de-reinicio)
3. [Procedimientos de Monitoreo](#procedimientos-de-monitoreo)
4. [Procedimientos de Incidentes](#procedimientos-de-incidentes)
5. [Procedimientos de Backup](#procedimientos-de-backup)
6. [Procedimientos de Restauración](#procedimientos-de-restauración)
7. [Procedimientos de Actualización](#procedimientos-de-actualización)
8. [Procedimientos de Rollback](#procedimientos-de-rollback)

---

## Procedimientos de Inicio

### Iniciar Aplicación NEXURA

```bash
# Verificar estado
sudo systemctl status nexura

# Iniciar si está detenido
sudo systemctl start nexura

# Verificar logs
sudo journalctl -u nexura -f
```

### Iniciar MediaMTX

```bash
# Verificar estado
sudo systemctl status mediamtx

# Iniciar si está detenido
sudo systemctl start mediamtx

# Verificar logs
sudo journalctl -u mediamtx -f
```

### Iniciar Todos los Servicios

```bash
# Iniciar PostgreSQL
sudo systemctl start postgresql

# Iniciar Redis
sudo systemctl start redis

# Iniciar NEXURA
sudo systemctl start nexura

# Iniciar MediaMTX
sudo systemctl start mediamtx

# Iniciar Nginx
sudo systemctl start nginx

# Verificar todos los servicios
sudo systemctl status postgresql redis nexura mediamtx nginx
```

---

## Procedimientos de Reinicio

### Reiniciar Aplicación NEXURA

```bash
# Reinicio graceful
sudo systemctl restart nexura

# Verificar que inició correctamente
sudo systemctl status nexura
sudo journalctl -u nexura -n 50
```

### Reiniciar MediaMTX

```bash
# Reinicio graceful
sudo systemctl restart mediamtx

# Verificar que inició correctamente
sudo systemctl status mediamtx
sudo journalctl -u mediamtx -n 50
```

### Reiniciar Base de Datos

⚠️ **ADVERTENCIA**: Reiniciar PostgreSQL interrumpirá todas las conexiones activas.

```bash
# Verificar conexiones activas
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar que inició correctamente
sudo systemctl status postgresql
```

### Reiniciar Redis

```bash
# Reiniciar Redis
sudo systemctl restart redis

# Verificar que inició correctamente
sudo systemctl status redis
```

### Reinicio Completo del Sistema

```bash
# Orden de reinicio recomendado
sudo systemctl restart postgresql
sleep 5
sudo systemctl restart redis
sleep 5
sudo systemctl restart nexura
sleep 5
sudo systemctl restart mediamtx
sleep 5
sudo systemctl restart nginx

# Verificar todos los servicios
sudo systemctl status postgresql redis nexura mediamtx nginx
```

---

## Procedimientos de Monitoreo

### Verificar Health Checks

```bash
# Health check de la aplicación
curl -s https://nexura.example/api/health | jq

# Readiness check
curl -s https://nexura.example/api/ready | jq

# Live check
curl -s https://nexura.example/api/live
```

### Monitorear Logs en Tiempo Real

```bash
# Logs de la aplicación
sudo journalctl -u nexura -f

# Logs de MediaMTX
sudo journalctl -u mediamtx -f

# Logs de Nginx (acceso)
sudo tail -f /var/log/nginx/access.log

# Logs de Nginx (errores)
sudo tail -f /var/log/nginx/error.log

# Logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Monitorear Recursos del Sistema

```bash
# Uso de CPU y memoria
top

# Uso de disco
df -h

# Uso de red
iftop -i eth0

# Procesos de Node.js
ps aux | grep node

# Procesos de PostgreSQL
ps aux | grep postgres

# Procesos de Redis
ps aux | grep redis
```

### Monitorear Base de Datos

```bash
# Conexiones activas
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Queries lentas
sudo -u postgres psql -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Tamaño de la base de datos
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('nexura'));"

# Tablas más grandes
sudo -u postgres psql -d nexura -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

### Monitorear Redis

```bash
# Información de Redis
redis-cli info

# Uso de memoria
redis-cli info memory

# Claves en base de datos
redis-cli dbsize

# Comandos más lentos
redis-cli --latency

# Slowlog
redis-cli slowlog get 10
```

### Monitorear MediaMTX

```bash
# Paths activos
curl -s http://localhost:9997/v3/paths/list | jq

# Estadísticas
curl -s http://localhost:9998/metrics
```

### Monitorear Colas

```bash
# Ver estadísticas de colas (desde la aplicación)
curl -s https://nexura.example/api/admin/queues/stats | jq
```

---

## Procedimientos de Incidentes

### Incidente: Aplicación No Responde

**Síntomas**: La aplicación no responde a requests HTTP.

**Diagnóstico**:
```bash
# Verificar que el servicio está corriendo
sudo systemctl status nexura

# Verificar logs
sudo journalctl -u nexura -n 100

# Verificar uso de recursos
top
df -h

# Verificar puertos
sudo netstat -tlnp | grep 3000
```

**Resolución**:
```bash
# Reiniciar la aplicación
sudo systemctl restart nexura

# Si no funciona, verificar logs de error
sudo journalctl -u nexura -n 200 --no-pager

# Si es un problema de memoria, reiniciar y monitorear
sudo systemctl restart nexura
sudo journalctl -u nexura -f
```

**Escalation**: Si el problema persiste, contactar al equipo de desarrollo.

---

### Incidente: Base de Datos No Disponible

**Síntomas**: Errores de conexión a la base de datos en los logs.

**Diagnóstico**:
```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Intentar conectar
sudo -u postgres psql -c "SELECT 1;"

# Verificar logs de PostgreSQL
sudo tail -n 50 /var/log/postgresql/postgresql-*.log

# Verificar espacio en disco
df -h
```

**Resolución**:
```bash
# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar que inició correctamente
sudo systemctl status postgresql

# Si hay problemas de espacio, limpiar logs antiguos
sudo find /var/log/postgresql -name "*.log" -mtime +7 -delete
```

**Escalation**: Si el problema persiste, restaurar desde backup.

---

### Incidente: Redis No Disponible

**Síntomas**: Errores de conexión a Redis en los logs.

**Diagnóstico**:
```bash
# Verificar que Redis está corriendo
sudo systemctl status redis

# Intentar conectar
redis-cli ping

# Verificar logs
sudo journalctl -u redis -n 50

# Verificar uso de memoria
redis-cli info memory
```

**Resolución**:
```bash
# Reiniciar Redis
sudo systemctl restart redis

# Verificar que inició correctamente
redis-cli ping

# Si hay problemas de memoria, flush de bases no críticas
redis-cli flushdb  # Solo si es aceptable perder datos de cache
```

**Escalation**: Si el problema persiste, verificar configuración de Redis.

---

### Incidente: MediaMTX No Disponible

**Síntomas**: Streams no funcionan, errores de RTMP/HLS.

**Diagnóstico**:
```bash
# Verificar que MediaMTX está corriendo
sudo systemctl status mediamtx

# Verificar logs
sudo journalctl -u mediamtx -n 100

# Verificar puertos
sudo netstat -tlnp | grep 1935
sudo netstat -tlnp | grep 8888

# Verificar API
curl -s http://localhost:9997/v3/paths/list
```

**Resolución**:
```bash
# Reiniciar MediaMTX
sudo systemctl restart mediamtx

# Verificar que inició correctamente
sudo systemctl status mediamtx

# Verificar que los streams se reconectan
curl -s http://localhost:9997/v3/paths/list | jq
```

**Escalation**: Si el problema persiste, verificar configuración de MediaMTX.

---

### Incidente: Alto Uso de CPU/Memoria

**Síntomas**: Sistema lento, timeouts, errores.

**Diagnóstico**:
```bash
# Identificar procesos que consumen recursos
top -o %CPU
top -o %MEM

# Verificar procesos de Node.js
ps aux | grep node | awk '{print $2, $3, $4, $11}'

# Verificar queries lentas
sudo -u postgres psql -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

**Resolución**:
```bash
# Si es la aplicación, reiniciar
sudo systemctl restart nexura

# Si es PostgreSQL, identificar y matar queries lentas
sudo -u postgres psql -c "SELECT pid, query FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';"
sudo -u postgres psql -c "SELECT pg_terminate_backend(PID);"

# Si es un problema persistente, escalar horizontalmente
```

**Escalation**: Si el problema persiste, escalar recursos o optimizar queries.

---

### Incidente: Espacio en Disco Lleno

**Síntomas**: Errores de escritura, aplicación no puede guardar datos.

**Diagnóstico**:
```bash
# Verificar uso de disco
df -h

# Identificar directorios grandes
sudo du -h /var/log | sort -rh | head -20
sudo du -h /var/lib/postgresql | sort -rh | head -20
sudo du -h /var/www/nexura | sort -rh | head -20
```

**Resolución**:
```bash
# Limpiar logs antiguos
sudo journalctl --vacuum-time=7d
sudo find /var/log -name "*.log" -mtime +7 -delete

# Limpiar backups antiguos
sudo find /backups -name "*.sql.gz" -mtime +30 -delete

# Limpiar archivos temporales
sudo rm -rf /tmp/nexura-*

# Si es PostgreSQL, vacuum
sudo -u postgres psql -d nexura -c "VACUUM ANALYZE;"
```

**Escalation**: Si el problema persiste, expandir disco o migrar datos.

---

## Procedimientos de Backup

### Backup Manual de Base de Datos

```bash
# Crear backup
sudo -u postgres pg_dump nexura | gzip > /backups/postgresql/nexura_manual_$(date +%Y%m%d_%H%M%S).sql.gz

# Verificar backup
gunzip -t /backups/postgresql/nexura_manual_*.sql.gz
```

### Backup Manual de Storage

```bash
# Si usas S3/R2, usar aws cli
aws s3 sync s3://nexura-assets /backups/storage/$(date +%Y%m%d)

# Si usas MinIO local
rsync -av /data/minio /backups/storage/$(date +%Y%m%d)
```

### Verificar Backups

```bash
# Listar backups recientes
ls -lh /backups/postgresql/

# Verificar integridad de un backup
gunzip -t /backups/postgresql/nexura_*.sql.gz

# Verificar tamaño
du -sh /backups/postgresql/
```

---

## Procedimientos de Restauración

### Restaurar Base de Datos desde Backup

⚠️ **ADVERTENCIA**: Esto sobrescribirá la base de datos actual.

```bash
# 1. Detener la aplicación
sudo systemctl stop nexura

# 2. Crear backup de la base de datos actual (por seguridad)
sudo -u postgres pg_dump nexura | gzip > /backups/postgresql/nexura_before_restore_$(date +%Y%m%d_%H%M%S).sql.gz

# 3. Eliminar base de datos actual
sudo -u postgres psql -c "DROP DATABASE nexura;"

# 4. Crear nueva base de datos
sudo -u postgres psql -c "CREATE DATABASE nexura OWNER nexura;"

# 5. Restaurar desde backup
gunzip -c /backups/postgresql/nexura_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql -d nexura

# 6. Ejecutar migraciones
cd /var/www/nexura
sudo npx prisma migrate deploy

# 7. Reiniciar aplicación
sudo systemctl start nexura

# 8. Verificar que todo funciona
curl -s https://nexura.example/api/health | jq
```

### Restaurar Storage desde Backup

```bash
# Si usas S3/R2
aws s3 sync /backups/storage/20240101/ s3://nexura-assets

# Si usas MinIO local
rsync -av /backups/storage/20240101/ /data/minio/
```

---

## Procedimientos de Actualización

### Actualización Regular de NEXURA

```bash
# 1. Crear backup
sudo -u postgres pg_dump nexura | gzip > /backups/postgresql/nexura_before_update_$(date +%Y%m%d_%H%M%S).sql.gz

# 2. Ir al directorio de la aplicación
cd /var/www/nexura

# 3. Descargar nueva versión
sudo git fetch origin
sudo git checkout v1.1.0  # Nueva versión

# 4. Instalar dependencias
sudo npm ci --production

# 5. Ejecutar migraciones
sudo npx prisma migrate deploy

# 6. Reiniciar aplicación
sudo systemctl restart nexura

# 7. Verificar que todo funciona
curl -s https://nexura.example/api/health | jq
sudo journalctl -u nexura -n 50
```

### Actualización de Dependencias

```bash
# 1. Crear backup
sudo -u postgres pg_dump nexura | gzip > /backups/postgresql/nexura_before_deps_$(date +%Y%m%d_%H%M%S).sql.gz

# 2. Actualizar dependencias
cd /var/www/nexura
sudo npm update

# 3. Ejecutar tests
sudo npm test

# 4. Reiniciar aplicación
sudo systemctl restart nexura

# 5. Verificar que todo funciona
curl -s https://nexura.example/api/health | jq
```

### Actualización del Sistema

```bash
# 1. Crear backup
sudo -u postgres pg_dump nexura | gzip > /backups/postgresql/nexura_before_sysupdate_$(date +%Y%m%d_%H%M%S).sql.gz

# 2. Actualizar sistema
sudo apt update
sudo apt upgrade -y

# 3. Reiniciar servicios si es necesario
sudo systemctl restart postgresql redis nexura mediamtx nginx

# 4. Verificar que todo funciona
curl -s https://nexura.example/api/health | jq
```

---

## Procedimientos de Rollback

### Rollback de Aplicación

```bash
# 1. Identificar versión anterior
cd /var/www/nexura
sudo git log --oneline -10

# 2. Volver a versión anterior
sudo git checkout v1.0.0  # Versión anterior

# 3. Reinstalar dependencias
sudo npm ci --production

# 4. Rollback de migraciones (si es necesario)
sudo npx prisma migrate rollback

# 5. Reiniciar aplicación
sudo systemctl restart nexura

# 6. Verificar que todo funciona
curl -s https://nexura.example/api/health | jq
```

### Rollback de Base de Datos

```bash
# 1. Detener la aplicación
sudo systemctl stop nexura

# 2. Restaurar desde backup
gunzip -c /backups/postgresql/nexura_before_update_*.sql.gz | sudo -u postgres psql -d nexura

# 3. Reiniciar aplicación
sudo systemctl start nexura

# 4. Verificar que todo funciona
curl -s https://nexura.example/api/health | jq
```

---

## Contactos de Escalation

### Nivel 1: Operaciones
- **Email**: operaciones@nexura.example
- **Teléfono**: +1-XXX-XXX-XXXX
- **Horario**: 24/7

### Nivel 2: Desarrollo
- **Email**: dev@nexura.example
- **Teléfono**: +1-XXX-XXX-XXXX
- **Horario**: 9 AM - 6 PM (Lun-Vie)

### Nivel 3: Management
- **Email**: management@nexura.example
- **Teléfono**: +1-XXX-XXX-XXXX
- **Horario**: 9 AM - 6 PM (Lun-Vie)

### Proveedores Externos
- **Hosting**: soporte@hosting-provider.example
- **Base de datos**: soporte@db-provider.example
- **CDN**: soporte@cdn-provider.example
- **Pagos**: soporte@payment-provider.example

---

## Checklist de Incidentes

Cuando ocurre un incidente:

- [ ] Identificar el problema
- [ ] Notificar al equipo
- [ ] Diagnosticar la causa
- [ ] Implementar solución
- [ ] Verificar que el problema está resuelto
- [ ] Comunicar a los usuarios
- [ ] Documentar el incidente
- [ ] Realizar post-mortem
- [ ] Implementar mejoras preventivas

---

**Última actualización**: Enero 2024  
**Versión**: 1.0.0
