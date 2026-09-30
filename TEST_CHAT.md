# TEST_CHAT.md - Guía de Pruebas del Chat

## Requisitos

- Navegador moderno (Chrome, Firefox, Edge)
- Aplicación STREAMHUB corriendo (`npm run dev`)
- Dos cuentas de usuario diferentes

## Configuración Inicial

### 1. Iniciar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5173

### 2. Preparar Usuarios

Usar las cuentas de prueba existentes:

**Usuario 1 (Streamer):**
- Email: `user@streamhub.com`
- Contraseña: `User@12345`
- Username: `streamergirl`

**Usuario 2 (Espectador):**
- Email: `tech@streamhub.com`
- Contraseña: `User@12345`
- Username: `techstreamer`

**Usuario 3 (Admin/Owner):**
- Email: `admin@streamhub.com`
- Contraseña: `Admin@12345`
- Username: `admin`

## Prueba 1: Chat Básico en Tiempo Real

### Objetivo
Verificar que los mensajes se envían y reciben en tiempo real entre pestañas.

### Pasos

1. **Abrir dos pestañas del navegador**
   - Pestaña A: http://localhost:5173
   - Pestaña B: http://localhost:5173

2. **Iniciar sesión en Pestaña A**
   - Usar: `user@streamhub.com` / `User@12345`
   - Verificar que se redirige al dashboard

3. **Iniciar sesión en Pestaña B**
   - Usar: `tech@streamhub.com` / `User@12345`
   - Verificar que se redirige al dashboard

4. **Iniciar stream (en Pestaña A)**
   - Ir a: http://localhost:5173/stream-test
   - Hacer clic en "Iniciar Stream (Simulación)"
   - Verificar que el estado cambia a "🔴 EN VIVO"

5. **Abrir el canal en ambas pestañas**
   - Pestaña A: http://localhost:5173/channel/streamergirl
   - Pestaña B: http://localhost:5173/channel/streamergirl
   - Verificar que el chat aparece en ambas pestañas

6. **Enviar mensajes**
   - Desde Pestaña A: Escribir "Hola desde A" y enviar
   - Verificar que el mensaje aparece en Pestaña B instantáneamente
   - Desde Pestaña B: Escribir "Hola desde B" y enviar
   - Verificar que el mensaje aparece en Pestaña A instantáneamente

7. **Verificar contador de presencia**
   - En ambas pestañas, verificar que muestra "2 conectados"

### Resultado Esperado
✅ Mensajes aparecen instantáneamente en ambas pestañas
✅ Contador de presencia muestra el número correcto
✅ No se necesitan recargas de página

## Prueba 2: Slow Mode

### Objetivo
Verificar que el Slow Mode limita la frecuencia de mensajes.

### Pasos

1. **Como streamer (Pestaña A)**
   - Ir a: http://localhost:5173/dashboard
   - En "Controles del Chat", seleccionar "5 segundos" en Slow Mode
   - Verificar que se guarda la configuración

2. **Como espectador (Pestaña B)**
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Enviar un mensaje: "Primer mensaje"
   - Inmediatamente intentar enviar otro: "Segundo mensaje"
   - Verificar que se muestra: "Slow mode activo, espera antes de enviar otro mensaje"
   - Esperar 5 segundos
   - Intentar enviar otro mensaje: "Tercer mensaje"
   - Verificar que se envía correctamente

3. **Desactivar Slow Mode**
   - Como streamer, cambiar Slow Mode a "Desactivado"
   - Como espectador, enviar múltiples mensajes rápidamente
   - Verificar que todos se envían sin restricción

### Resultado Esperado
✅ Slow Mode limita mensajes a 1 cada 5 segundos
✅ Mensaje de error claro cuando se intenta enviar demasiado rápido
✅ Desactivar Slow Mode elimina la restricción

## Prueba 3: Followers Only

### Objetivo
Verificar que solo los seguidores pueden escribir cuando está activado.

### Pasos

1. **Como streamer (Pestaña A)**
   - Ir a: http://localhost:5173/dashboard
   - En "Controles del Chat", activar "Solo Seguidores"
   - Verificar que el toggle cambia a "Activado"

2. **Como espectador NO seguidor (Pestaña B)**
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Intentar escribir: "Hola"
   - Verificar que se muestra: "Solo seguidores pueden escribir en este chat"
   - El mensaje NO se envía

3. **Seguir el canal (Pestaña B)**
   - Hacer clic en el botón "Seguir" en el canal
   - Verificar que cambia a "Siguiendo"

4. **Intentar escribir nuevamente (Pestaña B)**
   - Escribir: "Ahora soy seguidor"
   - Verificar que el mensaje se envía correctamente
   - Verificar que aparece en Pestaña A

5. **Desactivar Followers Only**
   - Como streamer, desactivar "Solo Seguidores"
   - Como espectador, dejar de seguir el canal
   - Intentar escribir: "Ya no soy seguidor pero puedo escribir"
   - Verificar que se envía correctamente

### Resultado Esperado
✅ Usuarios no seguidores ven mensaje de error
✅ Seguidores pueden escribir normalmente
✅ Streamer siempre puede escribir (incluso si no se sigue a sí mismo)
✅ Desactivar permite a todos escribir

## Prueba 4: Ban de Usuario

### Objetivo
Verificar que el ban impide escribir y se puede revertir.

### Pasos

1. **Como streamer (Pestaña A)**
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Hacer clic en un mensaje del espectador (Pestaña B)
   - En el menú de moderación, seleccionar "Banear permanentemente"
   - Confirmar la acción

2. **Como espectador baneado (Pestaña B)**
   - Verificar que aparece: "Has sido baneado del chat"
   - Intentar escribir: "¿Puedo escribir?"
   - Verificar que el input está deshabilitado
   - Verificar que no se puede enviar mensajes

3. **Como streamer (Pestaña A)**
   - Ir a: http://localhost:5173/dashboard/bans
   - Verificar que el usuario aparece en la lista
   - Hacer clic en "Desbanear"
   - Confirmar la acción

4. **Como espectador (Pestaña B)**
   - Verificar que aparece: "Has sido desbaneado del chat"
   - Intentar escribir: "Ya puedo escribir de nuevo"
   - Verificar que el mensaje se envía correctamente

### Resultado Esperado
✅ Usuario baneado no puede escribir
✅ Mensaje claro de ban
✅ Desbanear restaura la capacidad de escribir
✅ Lista de baneados accesible desde dashboard

## Prueba 5: Timeout (Silenciar Temporalmente)

### Objetivo
Verificar que el timeout silencia al usuario por un tiempo limitado.

### Pasos

1. **Como streamer (Pestaña A)**
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Hacer clic en un mensaje del espectador
   - Seleccionar "1 minuto" en el menú de timeout
   - Confirmar la acción

2. **Como espectador (Pestaña B)**
   - Verificar que aparece: "Silenciado por 60 segundos"
   - Verificar el countdown: "Silenciado por 59 segundos", "58 segundos", etc.
   - Intentar escribir durante el timeout
   - Verificar que el input está deshabilitado

3. **Esperar a que expire el timeout**
   - Esperar 60 segundos
   - Verificar que el mensaje de timeout desaparece
   - Intentar escribir: "Ya puedo escribir de nuevo"
   - Verificar que el mensaje se envía correctamente

### Resultado Esperado
✅ Timeout silencia al usuario
✅ Countdown visible en tiempo real
✅ Input deshabilitado durante el timeout
✅ Capacidad de escribir se restaura automáticamente

## Prueba 6: Eliminación de Mensajes

### Objetivo
Verificar que los mensajes se pueden eliminar y desaparecen para todos.

### Pasos

1. **Como espectador (Pestaña B)**
   - Enviar varios mensajes: "Mensaje 1", "Mensaje 2", "Mensaje 3"
   - Verificar que aparecen en Pestaña A

2. **Como streamer (Pestaña A)**
   - Hacer clic en "Mensaje 2"
   - Seleccionar "Eliminar mensaje"
   - Confirmar la acción

3. **Verificar en ambas pestañas**
   - En Pestaña A: Verificar que "Mensaje 2" muestra "[Mensaje eliminado]"
   - En Pestaña B: Verificar que "Mensaje 2" muestra "[Mensaje eliminado]"
   - Verificar que "Mensaje 1" y "Mensaje 3" siguen visibles

### Resultado Esperado
✅ Mensaje eliminado muestra "[Mensaje eliminado]"
✅ Cambio se refleja instantáneamente en todas las pestañas
✅ Otros mensajes no se ven afectados

## Prueba 7: Moderadores

### Objetivo
Verificar que los moderadores tienen permisos de moderación.

### Pasos

1. **Como streamer (Pestaña A)**
   - Ir a: http://localhost:5173/dashboard/moderators
   - Hacer clic en "Agregar moderador"
   - Seleccionar el usuario "techstreamer"
   - Confirmar la acción

2. **Como moderador (Pestaña B)**
   - Recargar la página
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Verificar que aparece el badge "MOD" junto al nombre
   - Hacer clic en un mensaje de otro usuario
   - Verificar que aparece el menú de moderación
   - Eliminar un mensaje
   - Verificar que se elimina correctamente

3. **Como streamer (Pestaña A)**
   - Verificar que el mensaje eliminado por el moderador muestra "[Mensaje eliminado]"
   - Ir a: http://localhost:5173/dashboard/moderators
   - Hacer clic en "Quitar moderador" junto a "techstreamer"
   - Confirmar la acción

4. **Como ex-moderador (Pestaña B)**
   - Recargar la página
   - Verificar que el badge "MOD" ya no aparece
   - Intentar hacer clic en un mensaje para moderar
   - Verificar que NO aparece el menú de moderación

### Resultado Esperado
✅ Moderadores tienen badge "MOD" visible
✅ Moderadores pueden eliminar mensajes
✅ Moderadores pueden banear/timeout usuarios
✅ Quitar moderador revoca los permisos

## Prueba 8: VIPs

### Objetivo
Verificar que los VIPs tienen badge especial.

### Pasos

1. **Como streamer (Pestaña A)**
   - Ir a: http://localhost:5173/dashboard/vips
   - Hacer clic en "Agregar VIP"
   - Seleccionar el usuario "techstreamer"
   - Confirmar la acción

2. **Como VIP (Pestaña B)**
   - Recargar la página
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Enviar un mensaje: "Soy VIP"
   - Verificar que aparece el badge "VIP" junto al nombre
   - Verificar que el nombre tiene color especial (dorado/amarillo)

3. **Como streamer (Pestaña A)**
   - Verificar que el mensaje del VIP muestra el badge "VIP"
   - Verificar que el nombre del VIP tiene color especial

### Resultado Esperado
✅ VIPs tienen badge "VIP" visible
✅ VIPs tienen color de nombre especial
✅ Badge visible para todos los usuarios

## Prueba 9: Reconexión Automática

### Objetivo
Verificar que el chat se reconecta automáticamente después de una desconexión.

### Pasos

1. **Como espectador (Pestaña B)**
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Verificar que el indicador de conexión muestra "Conectado" (punto verde)

2. **Simular desconexión**
   - Abrir DevTools (F12)
   - Ir a la pestaña "Network"
   - Seleccionar "Offline" en el dropdown de throttling
   - Verificar que el indicador cambia a "Desconectado" (punto rojo)

3. **Restaurar conexión**
   - En DevTools, cambiar a "No throttling"
   - Verificar que el indicador cambia a "Reconectando..." (punto amarillo)
   - Esperar unos segundos
   - Verificar que el indicador cambia a "Conectado" (punto verde)

4. **Verificar funcionalidad**
   - Enviar un mensaje: "Me reconecté"
   - Verificar que se envía correctamente
   - Verificar que aparece en Pestaña A

### Resultado Esperado
✅ Indicador de conexión cambia correctamente
✅ Reconexión automática funciona
✅ Chat vuelve a funcionar después de reconectar
✅ No se pierden mensajes durante la reconexión

## Prueba 10: Rate Limiting

### Objetivo
Verificar que el rate limiting previene spam.

### Pasos

1. **Como espectador (Pestaña B)**
   - Ir al canal: http://localhost:5173/channel/streamergirl
   - Enviar 10 mensajes rápidamente: "1", "2", "3", ..., "10"
   - Verificar que todos se envían

2. **Intentar enviar más mensajes**
   - Inmediatamente intentar enviar: "11"
   - Verificar que se muestra: "Estás enviando mensajes demasiado rápido"
   - El mensaje NO se envía

3. **Esperar a que se resetee el rate limit**
   - Esperar 5 segundos
   - Intentar enviar: "12"
   - Verificar que se envía correctamente

### Resultado Esperado
✅ Rate limit permite 10 mensajes por 5 segundos
✅ Mensaje de error claro cuando se supera el límite
✅ Rate limit se resetea después de la ventana de tiempo

## Checklist de Pruebas

- [ ] Chat básico funciona entre pestañas
- [ ] Slow Mode limita frecuencia de mensajes
- [ ] Followers Only restringe a no seguidores
- [ ] Ban impide escribir permanentemente
- [ ] Unban restaura capacidad de escribir
- [ ] Timeout silencia temporalmente
- [ ] Countdown de timeout visible
- [ ] Eliminación de mensajes funciona
- [ ] Moderadores tienen permisos correctos
- [ ] VIPs tienen badge especial
- [ ] Reconexión automática funciona
- [ ] Rate limiting previene spam
- [ ] Presencia de usuarios se actualiza
- [ ] Indicadores de conexión visibles
- [ ] Badges de roles (Streamer, Mod, VIP) visibles

## Troubleshooting

### El chat no aparece
- Verificar que el stream está activo
- Verificar que estás en la página del canal correcto
- Recargar la página

### Los mensajes no se envían
- Verificar que no estás baneado
- Verificar que no estás en timeout
- Verificar que no se superó el rate limit
- Verificar que el mensaje no está vacío

### El contador de presencia no se actualiza
- Recargar la página
- Verificar que la conexión está activa (punto verde)
- Verificar que el stream está activo

### Los cambios de moderación no se reflejan
- Recargar la página
- Verificar que tienes permisos de moderador
- Verificar que el streamer no ha cambiado la configuración

## Notas Importantes

1. **BroadcastChannel API:** Esta implementación usa BroadcastChannel para comunicación entre pestañas del mismo navegador. Para producción con múltiples servidores, se necesitan WebSockets reales.

2. **Persistencia:** Los mensajes se guardan en localStorage y persisten entre recargas. Se limpian automáticamente después de 24 horas.

3. **Seguridad:** Todas las validaciones de permisos se realizan en el servicio de chat, no solo en la UI. Un usuario no puede bypasser las restricciones modificando el frontend.

4. **Rendimiento:** El sistema está optimizado para manejar cientos de mensajes por minuto sin problemas de rendimiento.
