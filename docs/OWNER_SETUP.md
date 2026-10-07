# NEXURA — Usuario OWNER del Control Center

## Usuario

| Campo | Valor |
|---|---|
| Usuario | `nexura_owner` |
| Email (alternativa de login) | `owner@nexura.live` |
| Rol | `OWNER` (inmutable desde el panel; no se pierde al cambiar la contraseña) |
| Contraseña inicial | Entregada **únicamente** al responsable de la plataforma (no se guarda en texto plano en ningún archivo del repositorio) |

## Cómo iniciar sesión

1. Abrir la app → **Iniciar sesión** (`/login`).
2. Ingresar `nexura_owner` (o `owner@nexura.live`) y la contraseña inicial.
3. Acceder al **Control Center**: ruta `/owner` (Panel del Propietario).
   Submódulos: `/owner/support`, `/owner/infrastructure`, `/admin`.

## Cambiar la contraseña

- Ruta: **Ajustes → Seguridad** (`/settings`, pestaña *Seguridad*).
- El formulario ahora es real (antes era simulado): verifica la contraseña
  actual, exige mínimo 8 caracteres, actualiza solo el hash y **conserva el
  rol y todos los demás campos del usuario**. Cierra las sesiones activas
  para forzar re-login con la nueva contraseña.
- API utilizada: `changeUserPassword()` en `src/services/database.ts`.

## Persistencia del rol OWNER

- `updateUser()` elimina cualquier intento de modificar `role` (invariante).
- `setUserRole()` rechaza asignar o quitar el rol `OWNER`.
- `provisionOwner()` es idempotente: si ya existe un OWNER, no lo duplica,
  no lo resetea ni le cambia la contraseña.
- No se modificó ningún usuario normal (`streamergirl` / `user@nexura.live`
  sigue igual).

## Dónde vive realmente la credencial (advertencia de arquitectura)

⚠️ **NEXURA hoy es 100% frontend**: el "backend" simulado es
`src/services/database.ts`, que persiste usuarios, hashes y sesiones en
**localStorage del navegador**. Esto significa:

- La credencial (hash) y la sesión del OWNER viven en el navegador donde se
  hizo login, **no en un servidor**. localStorage NO es un mecanismo de
  seguridad válido para roles privilegiados: puede inspeccionarse, copiarse
  o manipularse por cualquier persona con acceso a ese navegador.
- En un despliegue nuevo (otra máquina/navegador), el OWNER se recrea
  automáticamente desde el hash de bootstrap con la contraseña inicial.

### ¿Por qué el OWNER fallaba en Vercel? (causa raíz)

El login busca al usuario en `localStorage['nexura_users']` del navegador.
En producción, si ese storage ya contenía una versión anterior de la base
(creada antes de existir el OWNER), `provisionOwner()` no lo agregaba porque
la colección ya estaba sembrada → `authenticateUser('nexura_owner', …)` no
encontraba al usuario → "Credenciales inválidas". El código y el build eran
correctos; el problema era el estado viejo del navegador + falta de override
por entorno.

### Solución aplicada

1. `provisionOwner()` ahora corre siempre en `seedDatabase()` y es
   idempotente por rol (si ya hay un OWNER no lo duplica ni resetea).
2. El hash de bootstrap puede sobrecribirse por entorno con la env var de
   build `VITE_OWNER_PASSWORD_HASH` (leída vía `import.meta.env`; solo
   contiene el HASH, nunca la contraseña en claro). Si está ausente, se usa
   el hash default embebido → primera visita en un navegador limpio ya crea
   al OWNER sin configurar nada.

### Configuración requerida en Vercel

| Variable | Valor | Tipo | Cuándo |
|---|---|---|---|
| *(ninguna obligatoria)* | — | — | Con `Deploy → Redeploy` alcanza para servir el bundle actual |
| `VITE_OWNER_PASSWORD_HASH` | `hashed_…` (solo el hash) | **Pública / Build** | Opcional: solo si se quiere rotar la semilla del OWNER |

Importante: las `VITE_*` son variables de BUILD, quedan embebidas en el JS
del navegador. Por eso NUNCA va ahí la contraseña en claro, solo el hash de
bootstrap. Tras cambiar la env var hay que redeployar para que se inyecte.

### Verificación del flujo Vercel → Login → OWNER → Control Center

1. Vercel → **Redeploy** (asegura que el sitio sirva el bundle actual).
2. En el navegador afectado: DevTools → Application → Local Storage → borrar
   claves `nexura_*` (estado viejo).
3. Recargar → `/login` → `nexura_owner` o `owner@nexura.live` + contraseña
   inicial → OK.
4. Navegar a `/owner` → Control Center accesible (guard `role === 'OWNER'`).
5. `/settings` → Seguridad → cambiar contraseña → logout automático → re-login
   con la nueva → sigue siendo OWNER (`updateUser` borra todo intento de
   modificar `role`; `setUserRole` rechaza OWNER; `provisionOwner` no resetea).

**Migración recomendada (producción)** — usar el sistema de autenticación
previsto en la arquitectura, sin crear un segundo sistema:

1. **Supabase Auth** (`@supabase/supabase-js` ya es dependencia del proyecto):
   - Crear el usuario `owner@nexura.live` en Supabase Auth (el hash bcrypt
     queda del lado del servidor).
   - Guardar el rol `OWNER` en una tabla `profiles` + RLS, o como
     *custom claim* del JWT (`app_metadata.role = "OWNER"`).
   - Reemplazar `authenticateUser`/`getUserByToken` de
     `src/services/database.ts` por `supabase.auth.getSession()` y mover los
     guards de `OwnerPage`/`authorization.service.ts` a validar contra el
     token firmado por Supabase (nunca contra datos del cliente).
2. Alternativamente, **PostgreSQL vía Prisma** (`prisma/schema.prisma` ya
   define `User.role` con enum `OWNER`): implementar un backend API que use
   `DATABASE_URL` y cookies httpOnly para las sesiones.

Hasta esa migración, el hash de bootstrap convive en el bundle del frontend
(es el único mecanismo disponible); la contraseña en texto plano **nunca**
se escribió en código, commits, `.env.example`, GitHub ni sessionStorage.
Para overrides por entorno existe la variable opcional
`VITE_OWNER_PASSWORD_HASH` (solo nombre en `.env.example`, jamás valores).
