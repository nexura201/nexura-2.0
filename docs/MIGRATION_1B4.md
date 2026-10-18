# NEXURA 2.0 — Documentación de la migración Etapa 1B.4

**Archivo SQL:** `supabase/migrations/20261019000000_etapa_1b4_profiles_categories.sql`
**Estado:** 🟡 Preparada — **NO aplicada**. Requiere revisión y autorización humana antes de ejecutarse contra el proyecto Supabase.

## Qué crea
| Objeto | Propósito |
|---|---|
| enum `user_role`, `user_status` | Espejo exacto de `prisma/schema.prisma` y `src/types/index.ts` |
| tabla `public.categories` | Espejo del modelo Prisma `Category` + campos reales de `src/services/category.ts` (`icon`, `active`) |
| tabla `public.profiles` | Perfil público 1:1 con `auth.users(id)` (FK `ON DELETE CASCADE`). Sin `passwordHash`/email/tokens: viven en Auth |
| función `current_app_role()` | SECURITY DEFINER, `search_path` fijo; reservada para las policies ADMIN/MODERATOR de Etapa 1C. **Sin EXECUTE concedido** (ninguna policy de esta migración la invoca; ver §Correcciones fix3). Solo lee el rol propio (`auth.uid()`) |
| trigger `on_auth_user_created` → `handle_new_user()` | Crea perfil automático al registrarse; rol forzado `'USER'`; username derivado del email-local con dedupe numérico; errores propagados (no deja cuentas huérfanas) |
| trigger `profiles_protect_privileges` | Guardia anti-escalada (`SECURITY INVOKER`, verificado en §Cómo se creará el primer OWNER): TODO cambio de `role`/`status` exige `current_user = 'postgres'` (contexto del Editor SQL); rechazado siempre para `anon`/`authenticated`/`service_role`, incluso antes de existir el primer OWNER. Nadie degrada al OWNER activo ni promueve un segundo OWNER por UPDATE; fija `updated_at` |
| índice único parcial (`where role='OWNER'`) | Garantiza matemáticamente un solo OWNER en la tabla, sin importar qué ejecute el SQL futuro |
| seed de 11 categorías | Idempotente (`ON CONFLICT (slug) DO NOTHING`), mismas 11 de `initializeDefaultCategories()` |
| RLS en ambas tablas | Habilitada de inmediato, deny-by-default. Policies: SELECT público (categories+profiles); INSERT self solo USER/ACTIVE; UPDATE propio cosmético (role/status inmutables); DELETE denegado a todos vía API |

## Decisiones de diseño (mapeo código → SQL)
- `User.usernameLower` (Prisma) → columna explícita `username_key text` + CHECK `username_key = lower(username)` en vez de índice funcional, porque el frontend actual lee/escribe ese campo directamente. `username` es `citext` (único case-insensitive).
- Invariantes portadas literalmente desde `database.ts`: `updateUser` ignora `role` (l.171) → policy UPDATE + trigger; `setUserRole` prohíbe tocar OWNER (l.187) → trigger; default `role:'USER'` en registro (l.108) → default de columna + trigger + WITH CHECK (triple capa).
- Slugs de categorías generados con la misma normalización que `toSlug()` de `category.ts` (acentos removidos: Música→musica, Tecnología→tecnologia).

## Incompatibilidades Prisma ↔ Supabase documentadas (no resueltas "inventando")
1. **Doble gestión de schema**: Prisma espera ser dueño del schema (con sus propias `_prisma_migrations`); Supabase usa su runner. Aplicar esta SQL hace que `prisma migrate` futuro diverja. Decisión propuesta: usar Prisma solo como *documentación* o generar diffs con `prisma migrate diff`. No se tocó `schema.prisma`.
2. **Modelo `User` de Prisma vs `auth.users`**: password/email/sessions/reset-tokens ya existen en Auth; la tabla `profiles` es intencionalmente incompleta respecto a Prisma (sin `passwordHash`, `emailVerified`, etc.). El login local sigue intacto hasta 1B.5.
3. **`Session`, `PasswordResetToken`, `VerificationToken`**: deliberadamente NO creadas (Supabase Auth las provee). Quedan obsoletas en el blueprint cuando llegue 1B.5.
4. **`updatedAt`**: Prisma lo maneja en cliente; aquí lo fija el trigger `profiles_protect_privileges` (BEFORE UPDATE). Para `categories` aún no hay equivalente (sin writes API por ahora).

## Cómo se creará el primer OWNER (mecanismo corregido en 1B.4-fix2)

**No existe ni se crea una RPC `bootstrap_owner()`.** Decisión deliberada: cualquier función `SECURITY DEFINER` que asigne OWNER sería invocable vía PostgREST por `authenticated`; abriría una ventana de *takeover* del Control Center para quien llegara primero tras la migración. El mecanismo es **exclusivamente SQL administrativo directo**:

1. Aplicar la migración (SQL Editor / dashboard, rol `postgres`).
2. Crear la cuenta real vía el flujo normal de registro → el trigger genera perfil con rol `USER`.
3. En el **Editor SQL de Supabase**, ejecutar:
   ```sql
   update public.profiles set role = 'OWNER' where id = '<uuid-del-usuario>'::uuid;
   ```
4. Verificar: `select id, username, role from public.profiles where role = 'OWNER';` (debe devolver exactamente 1 fila).

Garantías del diseño (tras corrección 1B.4-fix2):
- **Sin ventana de bootstrap accesible por API**: el trigger `protect_profile_privileges()` es ahora **SECURITY INVOKER** y verifica explícitamente `current_user = 'postgres'` para TODO cambio de `role`/`status`. Los roles de API (`anon`, `authenticated`, incluso con JWT válido o `service_role`) nunca son `postgres` ⇒ rechazados con `NEXURA_ROLE_STATUS_IMMUTABLE`, **incluso antes de existir el OWNER**. Se eliminó la heurística por `request.jwt.claims` (era evadible: un contexto sin claims pasaba a la rama FASE A-permitida).
- **El procedimiento del Editor SQL funciona sin desactivar RLS ni retirar protecciones**: Supabase SQL Editor ejecuta como `postgres` (dueño de la tabla; RLS no aplica a su dueño) y el trigger reconoce ese rol efectivo legítimo. No requiere pasos adicionales.
- **Usuario común jamás llega a OWNER**: doble capa — la policy `profiles_update_own_limited` WITH CHECK compara `role`/`status` de la fila resultante contra los valores almacenados (subconsulta sobre el snapshot MVCC pre-sentencia = equivalente seguro de `old.role`/`old.status`; los alias old/new NO existen en expresiones de policies) y rechaza ANTES del trigger; el trigger además bloquea por rol efectivo. El INSERT público exige `role='USER' AND status='ACTIVE'`.
- **Segundo OWNER imposible**: índice único parcial **corregido** — `unique index on profiles (role) where role='OWNER'` (la versión anterior sobre `(id)` era trivialmente satisfecha porque `id` ya es PK ⇒ no impedía dos OWNER). Refuerzo en trigger: `new.role='OWNER'` con OWNER existente ⇒ `NEXURA_SECOND_OWNER_FORBIDDEN`.
- **OWNER activo inalcanzable**: nadie degrada/quita el rol del OWNER actual (rama `old.role='OWNER'` ⇒ `NEXURA_CANNOT_MODIFY_OWNER_ROLE`, espejo de database.ts:187). Remover al OWNER requiere desactivar manualmente el trigger en Dashboard (operación consciente, documentada).
- Endurecimiento futuro (Etapa 1C): RPC `admin_set_role` SECURITY DEFINER con verificación interna `caller=OWNER` + auditoría, solo para ADMIN/MODERATOR (nunca conceder OWNER). Al crearla, revisar la limitación §Limitaciones abajo.

## Riesgos conocidos
- ⚠️ La base remota **puede no estar vacía** (el 401 no demuestra nada). Antes de aplicar: inspeccionar via Dashboard/SQL read-only si existen `public.profiles`, `public.categories`, los enums o un trigger `on_auth_user_created` previo (el `drop trigger if exists` lo reemplazaría — verificar que no haya uno de otro sistema).
- ⚠️ `create extension citext/pgcrypto` requiere permisos de superusuario/provisioned; normalmente disponibles en SQL Editor de Supabase.
- ⚠️ Si Auth tiene "Confirm email" desactivado/activado cambia cuándo corre `handle_new_user` (inserta igual en ambos modos; sin impacto).
- ℹ️ La policy de UPDATE usa dos subconsultas sobre `profiles` (role/status) en WITH CHECK; lectura extra por fila, irrelevante al volumen actual. `current_app_role()` queda para policies de ADMIN/MODERATOR en 1C (no la usa el trigger §6).
- 🔴 **Limitación estructural detectada en esta revisión**: las policies se crean con propietario `postgres`; cualquier rol autenticado puede leerlas vía `pg_policies`, exponiendo el UUID del OWNER (`id = (select auth.uid())` no aplica a SELECT, pero la existencia de políticas administrativas sí es visible). No es vector de ataque directo (RLS sigue aplicándose), pero se recomienda en 1C crear policies como `supabase_admin` + revocar `references`/visibilidad innecesaria.
- ⚠️ **Verificación externa requerida (no demostrable estáticamente)**: que el SQL Editor/Dashboard de Supabase ejecute efectivamente como rol `postgres` (o rol dueño de la tabla). El procedimiento del bootstrap depende de esto; debe confirmarse en staging con `select current_user;` antes de confiar en él. Si Supabase cambiara ese contexto, el UPDATE administrativo devolvería `NEXURA_ROLE_STATUS_IMMUTABLE` (falla cerrado, nunca abierto — no hay riesgo de escalada, solo de bloqueo legítimo).

## Correcciones aplicadas en la revisión final (Etapa 1B.4-fix2)
1. **Vulnerabilidad crítica cerrada — ventana de bootstrap por API**: el trigger `protect_profile_privileges()` era `SECURITY DEFINER` con detección heurística por `request.jwt.claims`: en FASE A (sin OWNER) permitía cambios de role/status a todo contexto *sin* claims ⇒ un actor que llegara al UPDATE sin claims (p.ej. service_role con claims filtrados) podía otorgarse OWNER durante el bootstrap. Ahora es **`SECURITY INVOKER`** y exige explícitamente `current_user = 'postgres'` para TODO cambio de role/status; anon/authenticated/service_role quedan rechazados siempre, con o sin OWNER previo. Eliminada toda dependencia de claims.
2. **Índice único parcial corregido**: `profiles_single_owner_idx` estaba definido `unique on (id) where role='OWNER'` — inútil porque `id` ya es PK (permitía infinitos OWNER). Ahora `unique on (role) where role='OWNER'`: garantiza ≤1 OWNER incluso ante SQL administrativo futuro.
3. **Rama OWNER activo endurecida**: `old.role='OWNER'` ahora bloquea CUALQUIER intento de degradar/quitar OWNER (antes la condición redundante `new.role is distinct from old.role` dependía de la guarda externa). Espejo exacto de database.ts:187.
4. **Trigger sin side effects en ramas denegadas**: `updated_at` se fija una sola vez al final, fuera del bloque de privilegios; eliminada la dependencia del trigger hacia `current_app_role()` (que era SECURITY DEFINER y podía fallar silenciosamente → coalesce 'USER').
5. **Policy UPDATE documentada con semántica MVCC correcta**: WITH CHECK compara contra el snapshot pre-sentencia (subconsulta = equivalente seguro de `old.role`/`old.status`); se verificó que no queda ninguna expresión de policy usando alias `old`/`new`.

## Correcciones aplicadas en la revisión de permisos (Etapa 1B.4-fix3)
6. **Permisos de `current_app_role()` corregidos — incoherencia GRANT/policies eliminada**: la versión anterior revocaba EXECUTE a `anon` pero dejaba un `GRANT ... TO authenticated`, y los comentarios afirmaban que policies la invocaban (`categories_select_public` con filtro por rol, `profiles_admin_all`). Verificación real del SQL: **ninguna policy creada por esta migración la usa** (las dos policies citadas ya no existen; `categories_select_public` es `using (true)`). Se corrigió:
   - `REVOKE EXECUTE ... FROM public, anon, authenticated` (sin ningún GRANT). Las funciones usadas dentro de expresiones RLS **no están exentas de chequeos de permisos**: PostgreSQL las evalúa como el rol de la query y sin EXECUTE provocarían `42501`; al no ser invocada por ninguna policy actual, la revocación total es coherente y además deja cero superficie RPC expuesta al navegador (PostgREST no la ofrece como endpoint ejecutable).
   - Regla explícita para Etapa 1C: el `GRANT EXECUTE TO authenticated` deberá concederse **en la misma migración** que cree las policies ADMIN/MODERATOR que la invoquen (o bien usar subconsultas directas), para no reintroducir el riesgo 42501.
   - Se re-verificó que la función no acepta parámetros y lee únicamente `where p.id = (select auth.uid())`: imposible consultar el rol de otra persona.
7. **Columna de categorías verificada contra el código real**: grep exhaustivo confirma que el nombre único usado en toda la migración es **`active`** (definición de tabla l.57, índice l.62). NO existe `is_active` en ninguna parte del SQL ni de las policies. Coincide con `src/services/category.ts` (interfaz `Category.active: boolean`, filtro `c => c.active`). También revisadas todas las demás columnas referenciadas en policies/restricciones/índices (`id`, `role`, `status`, `username_key`, `slug`) — todas existen en sus tablas.
8. **Documentación alineada con el código**: la fila del trigger en §Qué crea describía una lógica "FASE A/FASE B por claims" que ya no existe en el SQL (reemplazada en fix2 por verificación explícita `current_user='postgres'`). Corregida para reflejar el comportamiento real.
9. **Grants generales revisados** (fix2, confirmado en fix3): funciones trigger (`handle_new_user`, `protect_profile_privileges`) revocadas a public/anon/authenticated — se ejecutan internamente sin requerir EXECUTE público. Registro crea SIEMPRE `role='USER'` (default de columna + trigger + WITH CHECK, triple capa).

## Limitaciones pendientes (documentadas, no resueltas "inventando")
- **Objetos SECURITY DEFINER futuros propiedad de postgres**: un trigger `SECURITY INVOKER` evalúa `current_user`; dentro de una función DEFINER ejecutada como postgres, `current_user` pasa a ser postgres y heredaría el permiso del bootstrap. Hoy NO existe ningún objeto DEFINER propiedad de postgres que escriba en `profiles` (`handle_new_user` solo INSERTA con rol USER forzado; `current_app_role` es lectura estable). Regla para 1C: si `admin_set_role` se define como postgres DEFINER, primero endurecer el trigger con allowlist (`pg_trigger_depth()` + `internal.am_i_admin` GUC transaccional) o crearla propiedad de `supabase_admin`.
- **Idempotencia total no verificable sin ejecutar**: la migración está escrita idempotente (`if not exists`, `or replace`, `drop ... if exists`, `ON CONFLICT DO NOTHING`, bloques `duplicate_object`), pero no se pudo probar doble ejecución real (requiere base Postgres local o staging; el entorno carece de cliente Postgres y estaba prohibido instalar/conectar). Riesgo residual conocido: `drop trigger if exists on_auth_user_created` reemplazaría un trigger homónimo de otro sistema (§Riesgos).
- **Comportamiento runtime de RLS/policies/triggers**: no ejecutado; solo análisis estático. El checklist abajo cubre la validación funcional en staging.

## Checklist ANTES de aplicar (pendiente de verificación humana)
1. Leer el SQL completo y aprobarlo.
2. Ejecutar consulta read-only de estado actual del proyecto (tablas/enum/triggers existentes).
3. Aplicar en una **staging project** de Supabase primero (o backup/export del prod).
4. Tras aplicar: probar signUp real → verificar perfil creado con rol USER; intentar vía API (PostgREST/client, usuario authenticated normal) cambiar role/status → debe fallar por policy WITH CHECK o `NEXURA_ROLE_STATUS_IMMUTABLE` **incluso sin OWNER existente**; bootstrap manual del OWNER desde Editor SQL → debe tener éxito sin desactivar nada (verificar primero `select current_user;` = `postgres`); intentar segundo OWNER → `NEXURA_SECOND_OWNER_FORBIDDEN` / violación de índice único; anon select sobre profiles/categories → OK; anon insert → rechazado.
5. Extra: re-ejecutar la migración completa en staging para confirmar idempotencia (objetos existentes ⇒ no duplica categorías, no rompe trigger).
6. Recién entonces habilitar la consuming code en 1B.5 (AuthContext dual-mode).

## Nota de aplicación
Esta migración **no fue ejecutada** contra ninguna base. Ninguna conexión ni escritura remota ocurrió durante la Etapa 1B.4.
