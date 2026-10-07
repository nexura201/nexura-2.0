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
