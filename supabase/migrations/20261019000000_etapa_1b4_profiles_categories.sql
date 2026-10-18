-- ============================================================================
-- NEXURA 2.0 — Etapa 1B.4: Primera migración (perfiles, roles y categorías)
-- ----------------------------------------------------------------------------
-- DESTINO: PostgreSQL de Supabase (proyecto configurado en .env.local).
-- ESTADO:  PENDIENTE DE REVISIÓN Y AUTORIZACIÓN HUMANA. NO APLICAR SOLA.
--
-- Diseñada a partir del código REAL del proyecto:
--   * prisma/schema.prisma      -> enums UserRole/UserStatus, modelos User/Category
--   * src/types/index.ts        -> campos de la interfaz User
--   * src/services/database.ts  -> invariantes de rol (updateUser no toca `role`,
--                                  setUserRole protege al OWNER)
--   * src/services/category.ts  -> seed de 11 categorías + reglas de slug
--
-- Principios:
--   1. NO se recrea auth.users ni tablas internas de Supabase Auth.
--      `public.profiles.id` es 1:1 con `auth.users(id)` (ON DELETE CASCADE).
--   2. El rol NUNCA puede originarse en datos del cliente: default 'USER' y
--      trigger de guardia que impide auto-cambio de rol/status (mismo
--      invariante que database.ts:171 y :182-191).
--   3. RLS habilitada INMEDIATAMENTE en toda tabla creada; permisos mínimos;
--      sin operaciones OWNER/ADMIN todavía (eso llega en Etapa 1C/1B.8).
--   4. Toda función SECURITY DEFINER fija search_path y limita EXECUTE.
--   5. Idempotente: puede re-ejecutarse sin duplicar datos ni fallar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensiones (citext: username único case-insensitive, como usernameLower
--    en Prisma pero sin columna duplicada — ver docs/MIGRATION_1B4.md §Incompat.)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists citext;    -- unique case-insensitive

-- ---------------------------------------------------------------------------
-- 1. Tipos enum (espejo exacto de prisma/schema.prisma y src/types/index.ts)
--    Envueltos en DO $$ para que la migración sea re-ejecutable.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('OWNER','ADMIN','MODERATOR','USER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('ACTIVE','SUSPENDED','BANNED');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Tabla: categories
--    Espejo del modelo Category (Prisma) + campos usados por el frontend
--    (src/services/category.ts: icon, active, createdAt, updatedAt).
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null unique,
  slug        citext      not null unique,
  description text        not null default '',
  icon        text        not null default '📁',           -- igual que category.ts
  image_url   text        not null default '',             -- Prisma: imageUrl
  active      boolean     not null default true,           -- getAllCategories filtra por esto
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_active_idx on public.categories (active);

-- ---------------------------------------------------------------------------
-- 3. Tabla: profiles
--    Perfil público vinculado 1:1 a auth.users. NO incluye passwordHash,
--    email, sessions ni tokens: eso vive en auth.users / supabase_auth_admin.
--    Campos = interfaz User de src/types/index.ts menos los sensibles.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      citext      not null unique,   -- display original
  username_key  text        not null unique,   -- normalizado lower (== User.usernameLower)
  display_name  text        not null default '',
  bio           text        not null default '',
  avatar_url    text        not null default '',
  banner_url    text        not null default '',
  role          public.user_role   not null default 'USER',  -- JAMÁS default/no-control desde cliente
  status        public.user_status not null default 'ACTIVE',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  constraint profiles_username_min_len check (char_length(username) >= 3),
  constraint profiles_username_format  check (username_key = lower(username)),
  constraint profiles_bio_max_len      check (char_length(bio) <= 500)
);

create index if not exists profiles_role_idx   on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

-- ---------------------------------------------------------------------------
-- 4. Helper central de identidad/rol (SECURITY DEFINER, search_path fijo)
--    Las políticas SIEMPRE consultan el rol desde la TABLA (nunca desde
--    reclamos del JWT ni desde el cliente), imitando el comentario de
--    authorization.service.ts: "Nunca confiar en roles enviados desde el frontend".
--    STABLE permite su uso dentro de policies.
--    SECURITY (corregido en 1B.4-fix3):
--      * EXECUTE revocado a PUBLIC, anon y authenticated. Las funciones usadas
--        DENTRO de expresiones RLS NO quedan exentas de chequeos de permisos:
--        PostgreSQL las evalúa como el rol de la query, por lo que sin EXECUTE
--        toda policy que las invocara fallaría con SQLSTATE 42501. Como NINGUNA
--        policy de ESTA migración la usa (las de §8 son autocontenidas), la
--        revocación total es segura y deja cero superficie RPC expuesta al
--        navegador (aun siendo inofensiva — solo lee la propia fila — se evita
--        poder consultarla como endpoint RPC directo).
--      * Solo devuelve el rol asociado a auth.uid(): no acepta parámetros, no
--        puede consultar el rol de otra persona.
--    La usarán las policies ADMIN/MODERATOR de Etapa 1C; allí deberá concederse
--    GRANT EXECUTE TO authenticated EXACTAMENTE en la misma migración que creé
--    las policies que la invoquen (si no, esas policies darían 42501).
--    No la usa el trigger §6 (SECURITY INVOKER por diseño).
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

revoke execute on function public.current_app_role() from public, anon, authenticated;
comment on function public.current_app_role() is
  'Rol de aplicación del USUARIO PROPIO (auth.uid()), leído desde public.profiles. Sin EXECUTE público hasta 1C (ninguna policy actual la invoca).';

-- ---------------------------------------------------------------------------
-- 5. Trigger: creación automática del perfil al registrarse una cuenta.
--    security definer + search_path fijo + manejo explícito de errores.
--    El rol SIEMPRE es 'USER': la migración no ofrece ningún camino para
--    crear un OWNER desde datos provistos por el solicitante.
--    username: email-local normalizado; si colisiona, se añade sufijo numérico
--    (el UNIQUE de username_key da la garantía final).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_key   text;
  try_key    text;
  candidate  int := 0;
begin
  -- Sanitización básica del local del email (misma filosofía de toSlug en category.ts)
  base_key := regexp_replace(
                coalesce(split_part(new.raw_user_meta_data->>'username', '@', 1),
                         split_part(coalesce(new.email, ''), '@', 1),
                         'usuario'),
                '[^a-zA-Z0-9._-]', '', 'g');
  if base_key = '' then base_key := 'usuario'; end if;
  try_key := lower(base_key);

  loop
    if not exists (select 1 from public.profiles p where p.username_key = try_key) then
      exit;
    end if;
    candidate := candidate + 1;
    try_key := lower(base_key) || '-' || candidate::text;
    if candidate > 1000 then
      raise exception 'NEXURA_PROFILE_USERNAME_EXHAUSTED for %', base_key;
    end if;
  end loop;

  insert into public.profiles (id, username, username_key, display_name, role, status)
  values (
    new.id,
    try_key,                                   -- username inicial (rotatable luego por el usuario)
    try_key,
    coalesce(nullif(new.raw_user_meta_data->>'displayName', ''), try_key),
    'USER',                                    -- << invariante: nunca OWNER/ADMIN desde registro
    'ACTIVE'
  );
  return new;
exception
  when others then
    -- No dejar cuentas sin perfil: propagar el error hace fallar signUp de forma visible
    raise exception 'NEXURA handle_new_user failed: %', sqlerrm;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5b. Primer OWNER: bootstrap MANUAL y único (ver docs/MIGRATION_1B4.md).
--     DECISIÓN: NO se implementa una RPC bootstrap_owner(). Cualquier función
--     SECURITY DEFINER que asigne el rol OWNER sería invocable vía PostgREST
--     por cualquier rol autenticado — habilitando un race de takeover del
--     Control Center en la ventana pre-bootstrap.
--     EL ÚNICO mecanismo previsto es SQL administrativo DIRECTO en el Editor
--     SQL de Supabase (rol efectivo `postgres`, dueño de la tabla):
--       update public.profiles set role = 'OWNER' where id = '<uuid>'::uuid;
--     Compatibilidad garantizada por construcción (§6): el trigger permite
--     cambios de role/status CUANDO current_user = 'postgres' (contexto del
--     Editor SQL) y los DENIEGA para cualquier otro rol efectivo
--     (anon/authenticated/service_role/supabase_functions_admin). No hay
--     fase de bootstrap abierta a la API ni detección heurística por claims.
--     La API además nunca llega al trigger con valores alterados porque la
--     policy WITH CHECK (§8) hace imposible cambiar role/status por UPDATE
--     desde anon/authenticated, sin importar qué ejecute el trigger.
--     Endurecimiento futuro (Etapa 1C): RPC admin_set_role SECURITY DEFINER
--     con verificación interna caller=OWNER + auditoría (solo ADMIN/MODERATOR,
--     nunca para conceder OWNER).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 6. Guardia anti-escalada (espejo server-side de database.ts updateUser/setUserRole)
--    SECURITY INVOKER deliberadamente: evalúa current_user REAL (el rol de
--    PostgreSQL que ejecuta el UPDATE). Un usuario autenticado vía API corre
--    siempre como anon/authenticated — aunque posea un JWT válido, NUNCA es
--    postgres. Un trigger BEFORE ROW se ejecuta en la misma transacción y
--    usuario que la sentencia original, por lo que esta distinción resiste
--    manipulación de payloads o headers (los headers solo cambian GUCs de
--    claims, jamás current_user).
--    Reglas:
--      * Cambio de role/status permitido SOLO si current_user = 'postgres'
--        (procedimiento administrativo documentado del Editor SQL).
--      * Nadie —ni siquiera postgres— toca el rol del OWNER ACTIVO salvo para
--        crear el PRIMER OWNER (fase bootstrap sin OWNER existente).
--      * new.role='OWNER' rechazado si YA existe un OWNER (segundo OWNER
--        imposible por trigger + índice único parcial).
--      * updated_at se fija en una rama separada (sin side effects dentro del
--        chequeo de privilegios).
--    Limitación honesta (documentada en docs/MIGRATION_1B4.md): si en el
--    futuro un objeto SECURITY DEFINER propiedad de postgres (p.ej. la RPC
--    admin_set_role de 1C) actualizara profiles, heredaría el contexto
--    postgres y el trigger debería endurecerse con allowlist explícita de
--    funciones. Hoy NO existe ningún camino API→postgres sobre profiles.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security invoker   -- << crítico: current_user = rol real del solicitante
as $$
begin
  if new.role is distinct from old.role or new.status is distinct from old.status then
    -- Único contexto autorizado: sesión administrativa directa (SQL Editor,
    -- rol efectivo `postgres`). Verificación EXPLÍCITA del rol efectivo, no
    -- heurística de claims. anon/authenticated/service_role caen aquí mismo.
    if current_user <> 'postgres' then
      raise exception 'NEXURA_ROLE_STATUS_IMMUTABLE';
    end if;
    -- Invariante espejo de database.ts:187: nadie degrada/elimina al OWNER
    -- activo (la remoción de OWNER requiere desactivar temporalmente este
    -- trigger manualmente — operación consciente y auditada en Dashboard).
    if old.role = 'OWNER' then
      raise exception 'NEXURA_CANNOT_MODIFY_OWNER_ROLE';
    end if;
    -- Segundo OWNER imposible por esta vía (refuerzo del índice único parcial).
    if new.role = 'OWNER'
       and exists (select 1 from public.profiles p where p.role = 'OWNER') then
      raise exception 'NEXURA_SECOND_OWNER_FORBIDDEN';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Un solo OWNER posible, sin importar qué haga el SQL administrativo futuro.
-- ÍNDICE ÚNICO PARCIAL CORRECTO: la unicidad recae sobre la columna `role`
-- filtrada por WHERE — garantiza ≤1 fila con role='OWNER'. (Una unique index
-- sobre `id` con WHERE role='OWNER' sería trivialmente satisfecha: id ya es PK.)
create unique index if not exists profiles_single_owner_idx
  on public.profiles (role)
  where role = 'OWNER';

-- ---------------------------------------------------------------------------
-- 7. Seed idempotente de categorías (las 11 de initializeDefaultCategories,
--    src/services/category.ts). ON CONFLICT DO NOTHING sobre slug único.
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, icon) values
  ('Gaming',            'gaming',            'Videojuegos y esports',              '🎮'),
  ('Just Chatting',     'just-chatting',     'Charlas y comunidad',                 '💬'),
  ('Música',            'musica',            'Música en vivo y producciones',      '🎵'),
  ('Deportes',          'deportes',          'Deportes y fitness',                  '⚽'),
  ('Tecnología',        'tecnologia',        'Programación y tecnología',           '💻'),
  ('Arte',              'arte',              'Arte digital y tradicional',          '🎨'),
  ('Cocina',            'cocina',            'Cocina y gastronomía',                '🍳'),
  ('IRL',               'irl',               'Vida real y viajes',                  '🌍'),
  ('Educación',         'educacion',         'Aprendizaje y tutoriales',            '📚'),
  ('Noticias',          'noticias',          'Actualidad y noticias',               '📰'),
  ('Entretenimiento',   'entretenimiento',   'Entretenimiento general',             '🎭')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 8. RLS — habilitada inmediatamente, permisos mínimos, deny-by-default.
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.profiles   enable row level security;

-- Sin políticas owner-managed previas (idempotencia ante re-ejecuciones parciales)
drop policy if exists "categories_select_public"     on public.categories;
drop policy if exists "profiles_select_public"       on public.profiles;
drop policy if exists "profiles_insert_self_new"     on public.profiles;
drop policy if exists "profiles_update_own_limited"  on public.profiles;

-- categories: lectura pública (anon + authenticated). Escritura: SIN política
-- => nadie puede escribir por API; solo SQL administrativo/Dashboard hoy
-- (createCategory del frontend queda en localStorage hasta la Etapa 1C).
create policy "categories_select_public" on public.categories
  for select to anon, authenticated
  using (true);

-- profiles: lectura pública de datos de perfil (necesaria para home/canales/perfil).
create policy "profiles_select_public" on public.profiles
  for select to anon, authenticated
  using (true);

-- profiles INSERT: normalmente solo el trigger handle_new_user (SECURITY DEFINER)
-- crea filas. Política de refuerzo: un usuario recién registrado puede insertar
-- SU propia fila con rol USER y status ACTIVE — nada más. Cualquier payload
-- con otro rol/status viola la WITH CHECK y es rechazado por el servidor.
create policy "profiles_insert_self_new" on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and role = 'USER'
    and status = 'ACTIVE'
  );

-- profiles UPDATE: solo el propio perfil, y solo campos cosméticos.
-- Separación correcta de fases RLS (los alias old/new NO existen en expresiones
-- de policies; USING ve la fila existente, WITH CHECK ve la fila resultante):
--   * USING     → la fila objetivo debe ser la propia.
--   * WITH CHECK→ en la fila resultante, role/status deben coincidir con los
--                 valores ALMACENADOS antes de esta sentencia. La subconsulta
--                 sobre public.profiles ve el snapshot pre-sentencia (MVCC),
--                 por lo que actúa como equivalente exacto y seguro de
--                 "old.role"/"old.status": si el payload intenta cambiar
--                 role/status, new.role <> rol almacenado ⇒ WITH CHECK falla
--                 ⇒ rechazo garantizado en el servidor, ANTES de correr el
--                 trigger.
-- El trigger §6 (SECURITY INVOKER) es la segunda capa: aunque una ruta
-- administrativa llegara al UPDATE, exige current_user='postgres' para todo
-- cambio de role/status. updated_at lo fija el propio trigger.
create policy "profiles_update_own_limited" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role   = (select p.role   from public.profiles p where p.id = (select auth.uid()))
    and status = (select p.status from public.profiles p where p.id = (select auth.uid()))
  );

-- DELETE: sin política de delete => denegado para todos vía API.
-- (El borrado real ocurre por cascada desde auth.users al eliminar la cuenta en Dashboard/API admin.)

-- ---------------------------------------------------------------------------
-- 9. Endurecimiento adicional
-- ---------------------------------------------------------------------------
-- Revocar privilegios accidentales heredables (Supabase ya gestiona grants de
-- esquemas, pero lo explicitamos por defensa en profundidad):
revoke all on function public.handle_new_user()            from public, anon, authenticated;
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;
-- (Las funciones trigger se ejecutan internamente; no requieren EXECUTE público.)

comment on table public.profiles   is 'NEXURA Etapa 1B.4 — perfil público 1:1 con auth.users. role/status SOLO editables por SQL administrativo directo (current_user=postgres); nunca vía API.';
comment on table public.categories is 'NEXURA Etapa 1B.4 — categorías espejo de category.ts. Escritura solo administrativa por ahora.';

-- === FIN DE LA MIGRACIÓN — requiere revisión humana antes de aplicarse ===
