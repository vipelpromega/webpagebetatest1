-- =====================================================================
--  webpagebetatest1 · Cuentas, códigos de registro y panel de administración
--
--  Cómo usarlo: Supabase -> SQL Editor -> New query -> pega TODO este
--  archivo -> Run. Se puede ejecutar más de una vez sin problema.
--  Para empezar de cero (borra cuentas y claves): ejecuta antes reiniciar.sql.
--
--  Diseño:
--   * Las tablas NO son accesibles desde ninguna página (sin permisos para
--     anon/authenticated y con RLS activado). Solo se entra por las
--     funciones de abajo, que validan todo en el servidor.
--   * Web pública (clave "anon"): verificar código, registrarse, entrar...
--   * Panel de administración (rol "authenticated" = inicio de sesión con
--     GitHub): solo funciona si el usuario está en la tabla `admins` Y ha
--     verificado el segundo paso (TOTP, nivel aal2). Se comprueba aquí,
--     en el servidor; esconder la página no es la seguridad.
--   * Contraseñas con bcrypt. Las claves de registro se guardan CIFRADAS (AES-256) y
--     con una huella HMAC-SHA256 para buscarlas; los secretos del servidor viven en
--     privado.secretos, que ninguna página puede leer. Sesiones: huella SHA-256.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Esquema privado: funciones auxiliares que nadie puede llamar desde fuera
create schema if not exists privado;

-- Secretos del servidor (se generan solos la primera vez; nadie puede leerlos desde fuera)
create table if not exists privado.secretos (
  nombre text primary key,
  valor  text not null
);
insert into privado.secretos (nombre, valor) values
  ('cifrado', encode(extensions.gen_random_bytes(32), 'hex')),   -- AES-256: cifra las claves
  ('hmac',    encode(extensions.gen_random_bytes(32), 'hex'))    -- HMAC-SHA256: huella de búsqueda
on conflict (nombre) do nothing;
revoke all on schema privado from public, anon, authenticated;
revoke all on table privado.secretos from public, anon, authenticated;

-- ---------------------------------------------------------------------
--  Tablas
-- ---------------------------------------------------------------------
create table if not exists public.usuarios (
  id      uuid primary key default gen_random_uuid(),
  usuario text not null unique check (usuario ~ '^[a-z0-9._-]{3,20}$'),
  nombre  text not null check (char_length(nombre) between 1 and 30),
  rol     text not null default 'miembro' check (rol in ('miembro', 'admin')),
  clave   text not null,
  creado  timestamptz not null default now()
);

-- Foto de perfil (opcional): imagen pequeña ya reducida por la página, guardada como texto
alter table public.usuarios add column if not exists avatar text;

-- Cuenta suspendida por un administrador (no puede entrar; se conservan sus datos)
alter table public.usuarios add column if not exists suspendida    boolean not null default false;
alter table public.usuarios add column if not exists suspendida_en timestamptz;

create table if not exists public.codigos (
  hash              text primary key,           -- HMAC-SHA256 de la clave (para buscarla)
  cifrada           bytea not null,             -- la clave cifrada con AES-256 (la ve el panel con el ojo)
  id                uuid not null unique default gen_random_uuid(),
  etiqueta          text not null,              -- nombre de identificación
  vista             text not null,              -- clave enmascarada (nunca la parte aleatoria)
  rol               text not null default 'miembro' check (rol in ('miembro', 'admin')),
  creado            timestamptz not null default now(),
  creado_por_admin  uuid,
  creado_por_email  text,
  usado_en          timestamptz,
  usado_por         uuid references public.usuarios (id) on delete set null
);

create table if not exists public.sesiones (
  token      text primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  creada     timestamptz not null default now(),
  expira     timestamptz not null
);

-- Datos del dispositivo de cada sesión (para la lista de "Sesiones activas")
alter table public.sesiones add column if not exists id          uuid not null default gen_random_uuid();
alter table public.sesiones add column if not exists dispositivo text;
alter table public.sesiones add column if not exists ip          text;
alter table public.sesiones add column if not exists ultima      timestamptz not null default now();
create unique index if not exists sesiones_id_idx on public.sesiones (id);

-- Historial de inicios de sesión de cada cuenta
create table if not exists public.historial (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.usuarios (id) on delete cascade,
  fecha       timestamptz not null default now(),
  evento      text not null check (evento in ('ingreso', 'registro', 'fallo', 'suspendida')),
  dispositivo text,
  ip          text
);
create index if not exists historial_usuario_idx on public.historial (usuario_id, fecha desc);

create table if not exists public.intentos (
  clave       text primary key,
  n           int not null default 0,
  hasta       timestamptz,
  actualizado timestamptz not null default now()
);

-- Administradores autorizados: se identifican por el ID de su cuenta de Supabase
-- (no por el correo, que se podría suplantar si hubiera otro método de acceso).
create table if not exists public.admins (
  user_id uuid primary key,
  email   text,
  creado  timestamptz not null default now()
);

-- Historial de acciones de administración
create table if not exists public.auditoria (
  id          bigint generated always as identity primary key,
  cuando      timestamptz not null default now(),
  actor       uuid,
  actor_email text,
  accion      text not null,
  detalle     jsonb
);

alter table public.usuarios  enable row level security;
alter table public.codigos   enable row level security;
alter table public.sesiones  enable row level security;
alter table public.intentos  enable row level security;
alter table public.historial enable row level security;
alter table public.admins    enable row level security;
alter table public.auditoria enable row level security;

revoke all on table public.usuarios  from public, anon, authenticated;
revoke all on table public.codigos   from public, anon, authenticated;
revoke all on table public.sesiones  from public, anon, authenticated;
revoke all on table public.intentos  from public, anon, authenticated;
revoke all on table public.historial from public, anon, authenticated;
revoke all on table public.admins    from public, anon, authenticated;
revoke all on table public.auditoria from public, anon, authenticated;

-- ---------------------------------------------------------------------
--  Funciones auxiliares (esquema privado)
-- ---------------------------------------------------------------------
create or replace function privado.hash_texto(t text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(t, 'UTF8')), 'hex')
$$;

create or replace function privado.secreto(p_nombre text)
returns text language sql stable security definer set search_path = '' as $$
  select valor from privado.secretos where nombre = p_nombre
$$;

-- Huella de una clave de registro: HMAC-SHA256 con un secreto del servidor.
-- Aunque alguien copiara la tabla, sin ese secreto no podría probar claves contra ella.
create or replace function privado.hash_clave(p_clave text)
returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.hmac(convert_to(upper(btrim(coalesce(p_clave, ''))), 'UTF8'),
                                convert_to(privado.secreto('hmac'), 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function privado.cifrar(p_texto text)
returns bytea language sql volatile security definer set search_path = '' as $$
  select extensions.pgp_sym_encrypt(p_texto, privado.secreto('cifrado'), 'cipher-algo=aes256, compress-algo=0')
$$;

create or replace function privado.descifrar(p_datos bytea)
returns text language sql stable security definer set search_path = '' as $$
  select extensions.pgp_sym_decrypt(p_datos, privado.secreto('cifrado'))
$$;

-- Evento de la web pública o del sistema (sin administrador)
create or replace function privado.evento(p_accion text, p_detalle jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.auditoria (accion, detalle) values (p_accion, p_detalle)
$$;

-- ¿Es una imagen permitida? Solo PNG/JPEG/WebP en base64 y de tamaño pequeño (nunca SVG).
create or replace function privado.avatar_valido(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p is null
      or (char_length(p) <= 40000
          and p ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$')
$$;

-- Comprueba la contraseña maestra (con límite de intentos).
-- Devuelve NULL si es correcta, o el error (jsonb) listo para responder.
create or replace function privado.verificar_maestra(p_admin uuid, p_maestra text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ka   text := 'maestra:' || p_admin::text;
  v_seg  int  := privado.segundos_bloqueado('maestra:' || p_admin::text);
  v_hash text;
begin
  if v_seg > 0 then
    return jsonb_build_object('ok', false, 'error', 'espera', 'segundos', v_seg);
  end if;
  select valor into v_hash from privado.secretos where nombre = 'maestra';
  if v_hash is null then
    return jsonb_build_object('ok', false, 'error', 'maestra_no_definida');
  end if;
  if v_hash is distinct from extensions.crypt(coalesce(p_maestra, ''), v_hash) then
    perform privado.registrar_fallo(v_ka, 5, 300);
    perform privado.auditar(p_admin, 'maestra_fallida', null);
    return jsonb_build_object('ok', false, 'error', 'maestra_incorrecta');
  end if;
  delete from public.intentos where clave = v_ka;
  return null;
end $$;

-- IP del visitante (la pone el servidor de Supabase en las cabeceras)
create or replace function privado.ip()
returns text language sql stable set search_path = '' as $$
  select coalesce(
    nullif(btrim(split_part(coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'desconocida')
$$;

create or replace function privado.segundos_bloqueado(p_clave text)
returns int language plpgsql security definer set search_path = '' as $$
declare r int;
begin
  select greatest(ceil(extract(epoch from (hasta - now())))::int, 0)
    into r
    from public.intentos
   where clave = p_clave and hasta is not null;
  return coalesce(r, 0);
end $$;

create or replace function privado.registrar_fallo(p_clave text, p_max int, p_bloqueo_seg int)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.intentos%rowtype;
begin
  insert into public.intentos (clave, n, actualizado)
  values (p_clave, 0, now())
  on conflict (clave) do nothing;

  select * into v from public.intentos where clave = p_clave for update;
  if v.actualizado < now() - interval '15 minutes' then v.n := 0; end if;
  v.n := v.n + 1;

  if v.n >= p_max then
    update public.intentos
       set n = 0, hasta = now() + make_interval(secs => p_bloqueo_seg), actualizado = now()
     where clave = p_clave;
  else
    update public.intentos set n = v.n, actualizado = now() where clave = p_clave;
  end if;
end $$;

-- Anota un evento en el historial de la cuenta (y borra lo de más de 180 días)
create or replace function privado.anotar(p_uid uuid, p_evento text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.historial where usuario_id = p_uid and fecha < now() - interval '180 days';
  insert into public.historial (usuario_id, evento, dispositivo, ip)
  values (p_uid, p_evento,
          left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200),
          privado.ip());
end $$;

create or replace function privado.nueva_sesion(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_token text;
  v_exp   timestamptz;
begin
  delete from public.sesiones where expira < now();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_exp   := now() + interval '30 days';
  insert into public.sesiones (token, usuario_id, expira, dispositivo, ip)
  values (privado.hash_texto(v_token), p_uid, v_exp,
          left(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', ''), 200),
          privado.ip());
  return jsonb_build_object('token', v_token, 'expira', v_exp);
end $$;

create or replace function privado.usuario_de_token(p_token text)
returns public.usuarios language plpgsql security definer set search_path = '' as $$
declare v public.usuarios;
begin
  if p_token is null or p_token = '' then
    return null;
  end if;
  select u.* into v
    from public.sesiones s
    join public.usuarios u on u.id = s.usuario_id
   where s.token = privado.hash_texto(p_token) and s.expira > now() and not u.suspendida;
  if v.id is not null then
    update public.sesiones set ultima = now()
     where token = privado.hash_texto(p_token) and ultima < now() - interval '1 minute';
  end if;
  return v;
end $$;

-- ID del administrador que hace la llamada, o NULL si no está autorizado.
-- Exige: sesión de usuario real (no la clave anon), estar en `admins` y haber
-- verificado el segundo paso (aal2).
create or replace function privado.admin_id()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  c    jsonb := auth.jwt();
  v_id uuid;
begin
  if c is null or coalesce(c ->> 'role', '') <> 'authenticated' then
    return null;
  end if;
  begin
    v_id := (c ->> 'sub')::uuid;
  exception when others then
    return null;
  end;
  if v_id is null or not exists (select 1 from public.admins where user_id = v_id) then
    return null;
  end if;
  if coalesce(c ->> 'aal', '') <> 'aal2' then
    return null;
  end if;
  return v_id;
end $$;

create or replace function privado.correo_admin()
returns text language sql stable set search_path = '' as $$
  select nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '')
$$;

create or replace function privado.auditar(p_actor uuid, p_accion text, p_detalle jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.auditoria (actor, actor_email, accion, detalle)
  values (p_actor, privado.correo_admin(), p_accion, p_detalle)
$$;

-- Construye una clave a partir del nombre de identificación:
--   1) Iniciales de las primeras 6 palabras -> UTF-8 (= ASCII en letras normales)
--      -> binario -> hexadecimal (se escriben en grupos de 4).
--   2) Nombre completo en MAYÚSCULAS -> bytes -> hexadecimal -> SHA-256 -> 4 primeros
--      caracteres ("huella" del nombre).
--   3) 32 caracteres hexadecimales ALEATORIOS (128 bits): esta parte es la que da la
--      seguridad. Las dos primeras partes solo identifican; no son secretas.
create or replace function privado.generar_clave(p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_norm       text := upper(regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g'));
  v_ini        text;
  v_ini_hex    text;
  v_nombre_hex text;
  v_huella     text;
  v_rand       text;
  v_prefijo    text;
begin
  select coalesce(string_agg(left(w, 1), '' order by n), '')
    into v_ini
    from unnest((string_to_array(v_norm, ' '))[1:6]) with ordinality as t(w, n);

  v_ini_hex    := upper(encode(convert_to(v_ini, 'UTF8'), 'hex'));
  v_nombre_hex := upper(encode(convert_to(v_norm, 'UTF8'), 'hex'));
  v_huella     := upper(substr(encode(sha256(convert_to(v_nombre_hex, 'UTF8')), 'hex'), 1, 4));
  v_rand       := upper(encode(extensions.gen_random_bytes(16), 'hex'));
  v_prefijo    := regexp_replace(v_ini_hex, '(.{4})(?=.)', '\1-', 'g') || '-' || v_huella;

  return jsonb_build_object(
    'codigo', v_prefijo || '-' || regexp_replace(v_rand, '(.{4})(?=.)', '\1-', 'g'),
    'vista', v_prefijo || '-••••-••••-••••-••••-••••-••••-••••-••••',
    'iniciales', v_ini,
    'iniciales_hex', v_ini_hex,
    'huella', v_huella);
end $$;

-- ---------------------------------------------------------------------
--  Web pública (se llaman con la clave pública "anon")
-- ---------------------------------------------------------------------

-- 1) Comprueba un código SIN gastarlo
create or replace function public.verificar_codigo(p_codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_clave text := 'cod:' || privado.ip();
  v_seg   int;
  v_etq   text;
begin
  v_seg := privado.segundos_bloqueado(v_clave);
  if v_seg > 0 then
    return jsonb_build_object('ok', false, 'error', 'espera', 'segundos', v_seg);
  end if;

  select etiqueta into v_etq from public.codigos
   where hash = privado.hash_clave(p_codigo)
     and usado_en is null;
  if found then
    return jsonb_build_object('ok', true, 'etiqueta', v_etq);
  end if;

  perform privado.registrar_fallo(v_clave, 8, 60);
  return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
end $$;

-- 2) Crea la cuenta gastando el código (un solo uso) e inicia sesión
drop function if exists public.registrar(text, text, text, text);
create or replace function public.registrar(p_codigo text, p_nombre text, p_usuario text, p_clave text, p_avatar text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_clave   text := 'cod:' || privado.ip();
  v_hash    text := privado.hash_clave(p_codigo);
  v_nombre  text := btrim(coalesce(p_nombre, ''));
  v_usuario text := lower(btrim(coalesce(p_usuario, '')));
  v_rol     text;
  v_id      uuid;
  v_seg     int;
  v_sesion  jsonb;
begin
  v_seg := privado.segundos_bloqueado(v_clave);
  if v_seg > 0 then
    return jsonb_build_object('ok', false, 'error', 'espera', 'segundos', v_seg);
  end if;

  if not privado.avatar_valido(nullif(p_avatar, '')) then
    return jsonb_build_object('ok', false, 'error', 'avatar_formato');
  end if;

  -- Primero el código: así quien no tiene uno no puede averiguar qué usuarios existen
  if not exists (select 1 from public.codigos
                  where hash = v_hash and usado_en is null) then
    perform privado.registrar_fallo(v_clave, 8, 60);
    return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  end if;

  if char_length(v_nombre) not between 1 and 30 then
    return jsonb_build_object('ok', false, 'error', 'nombre_formato');
  end if;
  if v_usuario !~ '^[a-z0-9._-]{3,20}$' then
    return jsonb_build_object('ok', false, 'error', 'usuario_formato');
  end if;
  if octet_length(coalesce(p_clave, '')) < 8 or octet_length(p_clave) > 72 then
    return jsonb_build_object('ok', false, 'error', 'clave_formato');
  end if;
  if exists (select 1 from public.usuarios where usuario = v_usuario) then
    return jsonb_build_object('ok', false, 'error', 'usuario_en_uso');
  end if;

  -- Gasta el código de forma atómica
  update public.codigos set usado_en = now()
   where hash = v_hash and usado_en is null
  returning rol into v_rol;
  if not found then
    perform privado.registrar_fallo(v_clave, 8, 60);
    return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  end if;

  begin
    insert into public.usuarios (usuario, nombre, rol, clave, avatar)
    values (v_usuario, v_nombre, v_rol,
            extensions.crypt(p_clave, extensions.gen_salt('bf', 10)),
            nullif(p_avatar, ''))
    returning id into v_id;
  exception when unique_violation then
    update public.codigos set usado_en = null where hash = v_hash;
    return jsonb_build_object('ok', false, 'error', 'usuario_en_uso');
  end;

  update public.codigos set usado_por = v_id where hash = v_hash;
  perform privado.evento('cuenta_creada', jsonb_build_object('usuario', v_usuario));
  v_sesion := privado.nueva_sesion(v_id);
  perform privado.anotar(v_id, 'registro');

  return jsonb_build_object(
    'ok', true,
    'token', v_sesion ->> 'token',
    'expira', v_sesion ->> 'expira',
    'perfil', jsonb_build_object('usuario', v_usuario, 'nombre', v_nombre, 'rol', v_rol, 'avatar', nullif(p_avatar, '')));
end $$;

-- 3) Iniciar sesión
create or replace function public.entrar(p_usuario text, p_clave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_u      text := lower(btrim(coalesce(p_usuario, '')));
  v_ku     text := 'login:' || lower(btrim(coalesce(p_usuario, '')));
  v_ki     text := 'ip:' || privado.ip();
  v_seg    int;
  v_user   public.usuarios;
  v_ok     boolean;
  v_sesion jsonb;
begin
  v_seg := greatest(privado.segundos_bloqueado(v_ku), privado.segundos_bloqueado(v_ki));
  if v_seg > 0 then
    return jsonb_build_object('ok', false, 'error', 'espera', 'segundos', v_seg);
  end if;

  select * into v_user from public.usuarios where usuario = v_u;

  if v_user.id is null then
    -- cálculo ficticio para que tarde parecido y no delate si el usuario existe
    perform extensions.crypt(coalesce(p_clave, ''), extensions.gen_salt('bf', 10));
    v_ok := false;
  elsif octet_length(coalesce(p_clave, '')) > 72 then
    v_ok := false;
  else
    v_ok := v_user.clave = extensions.crypt(coalesce(p_clave, ''), v_user.clave);
  end if;

  if not v_ok then
    perform privado.registrar_fallo(v_ku, 5, 30);
    perform privado.registrar_fallo(v_ki, 20, 60);
    if v_user.id is not null then perform privado.anotar(v_user.id, 'fallo'); end if;
    return jsonb_build_object('ok', false, 'error', 'credenciales');
  end if;

  if v_user.suspendida then
    perform privado.anotar(v_user.id, 'suspendida');
    return jsonb_build_object('ok', false, 'error', 'suspendida');
  end if;

  delete from public.intentos where clave = v_ku;
  perform privado.anotar(v_user.id, 'ingreso');
  v_sesion := privado.nueva_sesion(v_user.id);

  return jsonb_build_object(
    'ok', true,
    'token', v_sesion ->> 'token',
    'expira', v_sesion ->> 'expira',
    'perfil', jsonb_build_object('usuario', v_user.usuario, 'nombre', v_user.nombre, 'rol', v_user.rol, 'avatar', v_user.avatar));
end $$;

-- 4) Datos de la sesión actual
create or replace function public.yo(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.usuarios;
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  return jsonb_build_object('ok', true,
    'perfil', jsonb_build_object('usuario', v.usuario, 'nombre', v.nombre, 'rol', v.rol, 'avatar', v.avatar));
end $$;

-- 5) Cambiar el nombre de visualización
create or replace function public.cambiar_nombre(p_token text, p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v        public.usuarios;
  v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  if char_length(v_nombre) not between 1 and 30 then
    return jsonb_build_object('ok', false, 'error', 'nombre_formato');
  end if;
  update public.usuarios set nombre = v_nombre where id = v.id;
  return jsonb_build_object('ok', true, 'nombre', v_nombre);
end $$;

-- 5b) Cambiar o quitar la foto de perfil (null o vacío = volver a la letra)
create or replace function public.cambiar_avatar(p_token text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.usuarios;
  a text := nullif(p_avatar, '');
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  if not privado.avatar_valido(a) then
    return jsonb_build_object('ok', false, 'error', 'avatar_formato');
  end if;
  update public.usuarios set avatar = a where id = v.id;
  return jsonb_build_object('ok', true, 'avatar', a);
end $$;

-- 5c) Cambiar la contraseña (pide la actual; cierra las demás sesiones de la cuenta)
create or replace function public.cambiar_clave(p_token text, p_actual text, p_nueva text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v     public.usuarios;
  v_ku  text;
  v_seg int;
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  v_ku := 'pw:' || v.id::text;
  v_seg := privado.segundos_bloqueado(v_ku);
  if v_seg > 0 then
    return jsonb_build_object('ok', false, 'error', 'espera', 'segundos', v_seg);
  end if;
  if octet_length(coalesce(p_nueva, '')) < 8 or octet_length(p_nueva) > 72 then
    return jsonb_build_object('ok', false, 'error', 'clave_formato');
  end if;
  if v.clave is distinct from extensions.crypt(coalesce(p_actual, ''), v.clave) then
    perform privado.registrar_fallo(v_ku, 5, 60);
    return jsonb_build_object('ok', false, 'error', 'clave_actual');
  end if;
  delete from public.intentos where clave = v_ku;
  update public.usuarios set clave = extensions.crypt(p_nueva, extensions.gen_salt('bf', 10)) where id = v.id;
  delete from public.sesiones where usuario_id = v.id and token <> privado.hash_texto(p_token);
  perform privado.evento('clave_cambiada', jsonb_build_object('usuario', v.usuario));
  return jsonb_build_object('ok', true);
end $$;

-- 6) Cerrar sesión
create or replace function public.salir(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  delete from public.sesiones where token = privado.hash_texto(coalesce(p_token, ''));
  return jsonb_build_object('ok', true);
end $$;

-- 6a) Historial de inicios de sesión
create or replace function public.mi_historial(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.usuarios;
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  return jsonb_build_object('ok', true, 'eventos', coalesce((
    select jsonb_agg(jsonb_build_object('fecha', h.fecha, 'evento', h.evento, 'dispositivo', h.dispositivo, 'ip', h.ip)
                     order by h.fecha desc)
      from (select * from public.historial where usuario_id = v.id order by fecha desc limit 30) h), '[]'::jsonb));
end $$;

-- 6b) Sesiones activas de la cuenta
create or replace function public.mis_sesiones(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.usuarios; v_h text := privado.hash_texto(coalesce(p_token, ''));
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  return jsonb_build_object('ok', true, 'sesiones', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', s.id, 'dispositivo', s.dispositivo, 'ip', s.ip,
             'creada', s.creada, 'ultima', s.ultima, 'actual', s.token = v_h)
           order by (s.token = v_h) desc, s.ultima desc)
      from public.sesiones s
     where s.usuario_id = v.id and s.expira > now()), '[]'::jsonb));
end $$;

create or replace function public.cerrar_sesion(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.usuarios; n int;
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  delete from public.sesiones
   where id = p_id and usuario_id = v.id and token <> privado.hash_texto(p_token);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'cerradas', n);
end $$;

create or replace function public.cerrar_otras_sesiones(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.usuarios; n int;
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  delete from public.sesiones where usuario_id = v.id and token <> privado.hash_texto(p_token);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'cerradas', n);
end $$;

-- ---------------------------------------------------------------------
--  Panel de administración (rol "authenticated" + estar en `admins` + 2 pasos)
-- ---------------------------------------------------------------------

-- A) Comprobación de acceso
create or replace function public.admin_yo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := privado.admin_id();
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  if not exists (select 1 from public.auditoria
                  where actor = v_admin and accion = 'acceso_admin'
                    and cuando > now() - interval '10 minutes') then
    perform privado.auditar(v_admin, 'acceso_admin', null);
  end if;
  return jsonb_build_object('ok', true, 'user_id', v_admin, 'email', privado.correo_admin());
end $$;

-- B) Estado en vivo
create or replace function public.admin_estado()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := privado.admin_id();
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  return jsonb_build_object(
    'ok', true,
    'hora', now(),
    'version', current_setting('server_version'),
    'db_bytes', pg_database_size(current_database()),
    'usuarios', (select count(*) from public.usuarios),
    'sesiones_activas', (select count(*) from public.sesiones where expira > now()),
    'claves_sin_usar', (select count(*) from public.codigos where usado_en is null),
    'claves_usadas', (select count(*) from public.codigos where usado_en is not null),
    'bloqueos_activos', (select count(*) from public.intentos where hasta is not null and hasta > now()));
end $$;

-- C) Crear una clave (se devuelve completa UNA sola vez; en la base solo queda su huella)
create or replace function public.admin_crear_clave(p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin  uuid := privado.admin_id();
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_gen    jsonb;
  v_id     uuid;
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  if char_length(v_nombre) not between 2 and 80 or v_nombre !~ '[[:alpha:]]' then
    return jsonb_build_object('ok', false, 'error', 'nombre_formato');
  end if;

  v_gen := privado.generar_clave(v_nombre);

  insert into public.codigos (hash, cifrada, rol, etiqueta, vista, creado_por_admin, creado_por_email)
  values (privado.hash_clave(v_gen ->> 'codigo'), privado.cifrar(v_gen ->> 'codigo'), 'miembro', v_nombre,
          v_gen ->> 'vista', v_admin, privado.correo_admin())
  returning id into v_id;

  perform privado.auditar(v_admin, 'crear_clave',
    jsonb_build_object('id', v_id, 'etiqueta', v_nombre));

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'etiqueta', v_nombre,
    'codigo', v_gen ->> 'codigo', 'vista', v_gen ->> 'vista');
end $$;

-- D) Listar todas las claves (sin la clave completa: esa no existe en la base)
create or replace function public.admin_listar_claves()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := privado.admin_id();
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  return jsonb_build_object('ok', true, 'claves', coalesce((
    select jsonb_agg(x order by x.creado desc) from (
      select c.id, c.etiqueta, c.vista,
             case when c.usado_en is not null then 'usada' else 'sin_usar' end as estado,
             c.creado, c.usado_en, c.creado_por_email, coalesce(u.suspendida, false) as suspendida
        from public.codigos c
        left join public.usuarios u on u.id = c.usado_por
       order by c.creado desc
       limit 500) x), '[]'::jsonb));
end $$;

-- E) Ver una clave (el ojo de Perfiles): se descifra solo bajo petición y queda registrado
create or replace function public.admin_ver_clave(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := privado.admin_id();
  v       public.codigos;
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  select * into v from public.codigos where id = p_id;
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;
  perform privado.auditar(v_admin, 'ver_clave', jsonb_build_object('id', v.id, 'etiqueta', v.etiqueta));
  return jsonb_build_object('ok', true, 'codigo', privado.descifrar(v.cifrada));
end $$;

-- F) Borrar una clave: si ya se usó, se borra TAMBIÉN la cuenta que la usó
--    (y sus sesiones se cierran, porque dependen de la cuenta).
drop function if exists public.admin_borrar_clave(uuid);
create or replace function public.admin_borrar_clave(p_id uuid, p_maestra text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin   uuid := privado.admin_id();
  v         public.codigos;
  v_usuario text;
  v_err     jsonb;
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  v_err := privado.verificar_maestra(v_admin, p_maestra);   -- borrar exige la contraseña maestra
  if v_err is not null then
    return v_err;
  end if;
  delete from public.codigos where id = p_id returning * into v;
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;
  if v.usado_por is not null then
    delete from public.usuarios where id = v.usado_por returning usuario into v_usuario;
  end if;
  perform privado.auditar(v_admin, 'borrar_clave',
    jsonb_build_object('id', p_id, 'etiqueta', v.etiqueta, 'cuenta_borrada', v_usuario));
  return jsonb_build_object('ok', true, 'cuenta_borrada', v_usuario);
end $$;

-- F2) Detalle de una clave (botón "Más información" de Perfiles)
create or replace function public.admin_detalle_clave(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := privado.admin_id();
  v       public.codigos;
  u       public.usuarios;
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  select * into v from public.codigos where id = p_id;
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;
  if v.usado_por is not null then
    select * into u from public.usuarios where id = v.usado_por;
  end if;
  return jsonb_build_object(
    'ok', true, 'id', v.id, 'etiqueta', v.etiqueta, 'vista', v.vista,
    'estado', case when v.usado_en is not null then 'usada' else 'sin_usar' end,
    'creado', v.creado, 'usado_en', v.usado_en, 'creado_por_email', v.creado_por_email,
    'cuenta', case when u.id is null then null
                   else jsonb_build_object('usuario', u.usuario, 'nombre', u.nombre, 'avatar', u.avatar, 'suspendida', u.suspendida, 'suspendida_en', u.suspendida_en) end);
end $$;

-- F3) Restablecer la contraseña de la cuenta de una clave.
--     Exige la CONTRASEÑA MAESTRA, que solo se guarda (con bcrypt) en privado.secretos
--     y solo se puede fijar desde el SQL Editor de Supabase (ver el final de este archivo).
create or replace function public.admin_restablecer_clave(p_id uuid, p_maestra text, p_nueva text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := privado.admin_id();
  v_err   jsonb;
  v       public.codigos;
  u       public.usuarios;
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  v_err := privado.verificar_maestra(v_admin, p_maestra);
  if v_err is not null then
    return v_err;
  end if;
  if octet_length(coalesce(p_nueva, '')) < 8 or octet_length(p_nueva) > 72 then
    return jsonb_build_object('ok', false, 'error', 'clave_formato');
  end if;
  select * into v from public.codigos where id = p_id;
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;
  select * into u from public.usuarios where id = v.usado_por;
  if u.id is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cuenta');
  end if;
  update public.usuarios set clave = extensions.crypt(p_nueva, extensions.gen_salt('bf', 10)) where id = u.id;
  delete from public.sesiones where usuario_id = u.id;
  delete from public.intentos where clave = 'login:' || u.usuario;
  perform privado.auditar(v_admin, 'restablecer_clave', jsonb_build_object('etiqueta', v.etiqueta, 'usuario', u.usuario));
  return jsonb_build_object('ok', true);
end $$;

-- G) Registros (historial de acciones)
-- Suspender / reactivar la cuenta de una clave (exige la contraseña maestra; queda en el registro)
drop function if exists public.admin_suspender_cuenta(uuid, boolean);
create or replace function public.admin_suspender_cuenta(p_id uuid, p_suspender boolean, p_maestra text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := privado.admin_id();
  v_uid   uuid;
  v_user  text;
  v_n     int := 0;
  v_err   jsonb;
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  v_err := privado.verificar_maestra(v_admin, p_maestra);   -- exige la contraseña maestra
  if v_err is not null then
    return v_err;
  end if;
  select usado_por into v_uid from public.codigos where id = p_id;
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cuenta');
  end if;
  update public.usuarios
     set suspendida = coalesce(p_suspender, false),
         suspendida_en = case when coalesce(p_suspender, false) then now() else null end
   where id = v_uid returning usuario into v_user;
  if coalesce(p_suspender, false) then
    delete from public.sesiones where usuario_id = v_uid;
    get diagnostics v_n = row_count;
  end if;
  perform privado.auditar(v_admin, case when p_suspender then 'suspender_cuenta' else 'reactivar_cuenta' end,
    jsonb_build_object('usuario', v_user, 'sesiones_cerradas', v_n));
  return jsonb_build_object('ok', true, 'suspendida', coalesce(p_suspender, false));
end $$;

-- Datos para las gráficas del Panel (últimos 14 días, en UTC)
create or replace function public.admin_graficas()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := privado.admin_id();
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  return jsonb_build_object('ok', true,
    'dias', (
      select jsonb_agg(jsonb_build_object(
        'dia', d::date,
        'registros', (select count(*) from public.usuarios u where u.creado::date = d::date),
        'claves', (select count(*) from public.codigos c where c.creado::date = d::date),
        'ingresos', (select count(*) from public.historial h where h.fecha::date = d::date and h.evento in ('ingreso', 'registro')),
        'fallos', (select count(*) from public.historial h where h.fecha::date = d::date and h.evento in ('fallo', 'suspendida'))
      ) order by d)
      from generate_series(current_date - 13, current_date, interval '1 day') d),
    'claves_usadas', (select count(*) from public.codigos where usado_en is not null),
    'claves_sin_usar', (select count(*) from public.codigos where usado_en is null),
    'cuentas_activas', (select count(*) from public.usuarios where not suspendida),
    'cuentas_suspendidas', (select count(*) from public.usuarios where suspendida));
end $$;

create or replace function public.admin_registros(p_limite int default 200)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := privado.admin_id();
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  return jsonb_build_object('ok', true, 'registros', coalesce((
    select jsonb_agg(x order by x.id desc) from (
      select id, cuando, actor_email, accion, detalle
        from public.auditoria
       order by id desc
       limit greatest(1, least(coalesce(p_limite, 200), 500))) x), '[]'::jsonb));
end $$;

-- H) Red: intentos fallidos y bloqueos
create or replace function public.admin_red()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := privado.admin_id();
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  return jsonb_build_object(
    'ok', true,
    'tu_ip', privado.ip(),
    'bloqueos_activos', (select count(*) from public.intentos where hasta is not null and hasta > now()),
    'intentos', coalesce((
      select jsonb_agg(x order by x.actualizado desc) from (
        select split_part(clave, ':', 1) as tipo,
               substr(clave, position(':' in clave) + 1) as objetivo,
               n as fallos,
               (hasta is not null and hasta > now()) as bloqueado,
               hasta, actualizado
          from public.intentos
         where actualizado > now() - interval '7 days'
         order by actualizado desc
         limit 200) x), '[]'::jsonb));
end $$;

create or replace function public.admin_desbloquear(p_tipo text, p_objetivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := privado.admin_id();
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  if p_tipo not in ('cod', 'ip', 'login') then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;
  delete from public.intentos where clave = p_tipo || ':' || coalesce(p_objetivo, '');
  perform privado.auditar(v_admin, 'desbloquear', jsonb_build_object('tipo', p_tipo, 'objetivo', p_objetivo));
  return jsonb_build_object('ok', true);
end $$;

-- I) Consola: solo comandos predefinidos (no hay SQL libre)
create or replace function public.admin_consola(p_linea text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := privado.admin_id();
  v_linea text := btrim(coalesce(p_linea, ''));
  v_cmd   text;
  v_arg   text;
  v_out   text[] := '{}';
  v_n     int;
  r       record;
begin
  if v_admin is null then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;
  if char_length(v_linea) > 100 then
    return jsonb_build_object('ok', true, 'lineas', jsonb_build_array('Comando demasiado largo.'));
  end if;
  v_cmd := lower(split_part(v_linea, ' ', 1));
  v_arg := btrim(substr(v_linea, char_length(v_cmd) + 1));

  if v_cmd = '' then
    v_out := array['Escribe un comando. "ayuda" muestra la lista.'];
  elsif v_cmd = 'ayuda' then
    v_out := array[
      'ayuda                 muestra esta lista',
      'estado                resumen del sistema',
      'claves                cuántas claves hay por estado',
      'usuarios              lista las cuentas registradas',
      'sesiones              sesiones activas por cuenta',
      'cerrar <usuario>      cierra las sesiones de una cuenta',
      'cerrar-todas          cierra TODAS las sesiones de la web',
      'liberar               quita todos los bloqueos por intentos fallidos',
      'limpiar               borra sesiones caducadas e intentos antiguos'];
  elsif v_cmd = 'estado' then
    v_out := array[
      'Base de datos: PostgreSQL ' || current_setting('server_version'),
      'Cuentas: ' || (select count(*) from public.usuarios),
      'Sesiones activas: ' || (select count(*) from public.sesiones where expira > now()),
      'Bloqueos activos: ' || (select count(*) from public.intentos where hasta is not null and hasta > now())];
  elsif v_cmd = 'claves' then
    v_out := array[
      'Sin usar: ' || (select count(*) from public.codigos where usado_en is null),
      'Usadas: ' || (select count(*) from public.codigos where usado_en is not null)];
  elsif v_cmd = 'usuarios' then
    for r in select usuario, nombre, creado from public.usuarios order by creado desc limit 100 loop
      v_out := v_out || (r.usuario || '  (' || r.nombre || ')  creado ' || to_char(r.creado, 'YYYY-MM-DD HH24:MI'));
    end loop;
    if cardinality(v_out) = 0 then v_out := array['No hay cuentas.']; end if;
  elsif v_cmd = 'sesiones' then
    for r in select u.usuario, count(*) as n from public.sesiones s
               join public.usuarios u on u.id = s.usuario_id
              where s.expira > now() group by u.usuario order by u.usuario limit 100 loop
      v_out := v_out || (r.usuario || ': ' || r.n);
    end loop;
    if cardinality(v_out) = 0 then v_out := array['No hay sesiones activas.']; end if;
  elsif v_cmd = 'cerrar' then
    if v_arg !~ '^[a-z0-9._-]{3,20}$' then
      v_out := array['Uso: cerrar <usuario>'];
    else
      delete from public.sesiones where usuario_id = (select id from public.usuarios where usuario = lower(v_arg));
      get diagnostics v_n = row_count;
      v_out := array[v_n || ' sesión(es) cerrada(s) de ' || lower(v_arg) || '.'];
      perform privado.auditar(v_admin, 'consola', jsonb_build_object('comando', 'cerrar', 'usuario', lower(v_arg), 'sesiones', v_n));
    end if;
  elsif v_cmd = 'cerrar-todas' then
    delete from public.sesiones;
    get diagnostics v_n = row_count;
    v_out := array[v_n || ' sesión(es) cerrada(s).'];
    perform privado.auditar(v_admin, 'consola', jsonb_build_object('comando', 'cerrar-todas', 'sesiones', v_n));
  elsif v_cmd = 'liberar' then
    delete from public.intentos where hasta is not null and hasta > now();
    get diagnostics v_n = row_count;
    v_out := array[v_n || ' bloqueo(s) liberado(s).'];
    perform privado.auditar(v_admin, 'consola', jsonb_build_object('comando', 'liberar', 'bloqueos', v_n));
  elsif v_cmd = 'limpiar' then
    delete from public.sesiones where expira < now();
    get diagnostics v_n = row_count;
    v_out := array[v_n || ' sesión(es) caducada(s) borrada(s).'];
    delete from public.intentos where actualizado < now() - interval '7 days' and (hasta is null or hasta < now());
    get diagnostics v_n = row_count;
    v_out := v_out || (v_n || ' intento(s) antiguo(s) borrado(s).');
    perform privado.auditar(v_admin, 'consola', jsonb_build_object('comando', 'limpiar'));
  else
    v_out := array['Comando desconocido. Escribe "ayuda".'];
  end if;
  return jsonb_build_object('ok', true, 'lineas', to_jsonb(v_out));
end $$;

-- ---------------------------------------------------------------------
--  Permisos
-- ---------------------------------------------------------------------
-- Web pública: solo estas funciones (clave anon)
revoke all on function public.verificar_codigo(text)               from public, anon, authenticated;
revoke all on function public.registrar(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.cambiar_avatar(text, text)           from public, anon, authenticated;
revoke all on function public.entrar(text, text)                   from public, anon, authenticated;
revoke all on function public.yo(text)                             from public, anon, authenticated;
revoke all on function public.cambiar_nombre(text, text)           from public, anon, authenticated;
revoke all on function public.salir(text)                          from public, anon, authenticated;
revoke all on function public.mis_sesiones(text)                   from public, anon, authenticated;
revoke all on function public.mi_historial(text)                   from public, anon, authenticated;
revoke all on function public.admin_suspender_cuenta(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_graficas()                      from public, anon, authenticated;
revoke all on function public.cerrar_sesion(text, uuid)            from public, anon, authenticated;
revoke all on function public.cerrar_otras_sesiones(text)          from public, anon, authenticated;

grant execute on function public.verificar_codigo(text)            to anon, authenticated;
grant execute on function public.registrar(text, text, text, text, text) to anon, authenticated;
grant execute on function public.cambiar_avatar(text, text)        to anon, authenticated;
grant execute on function public.entrar(text, text)                to anon, authenticated;
grant execute on function public.yo(text)                          to anon, authenticated;
grant execute on function public.cambiar_nombre(text, text)        to anon, authenticated;
grant execute on function public.salir(text)                       to anon, authenticated;
grant execute on function public.mis_sesiones(text)                to anon, authenticated;
grant execute on function public.mi_historial(text)                to anon, authenticated;
grant execute on function public.cerrar_sesion(text, uuid)         to anon, authenticated;
grant execute on function public.cerrar_otras_sesiones(text)       to anon, authenticated;

-- Panel de administración: SOLO "authenticated" (y aun así exigen ser admin + 2 pasos)
revoke all on function public.admin_yo()                           from public, anon, authenticated;
revoke all on function public.admin_estado()                       from public, anon, authenticated;
revoke all on function public.admin_crear_clave(text)              from public, anon, authenticated;
revoke all on function public.admin_listar_claves()                from public, anon, authenticated;
revoke all on function public.admin_borrar_clave(uuid, text)       from public, anon, authenticated;
revoke all on function public.admin_ver_clave(uuid)                from public, anon, authenticated;
revoke all on function public.admin_detalle_clave(uuid)            from public, anon, authenticated;
revoke all on function public.admin_restablecer_clave(uuid, text, text) from public, anon, authenticated;
revoke all on function public.cambiar_clave(text, text, text)      from public, anon, authenticated;
revoke all on function public.admin_registros(int)                 from public, anon, authenticated;
revoke all on function public.admin_red()                          from public, anon, authenticated;
revoke all on function public.admin_desbloquear(text, text)        from public, anon, authenticated;
revoke all on function public.admin_consola(text)                  from public, anon, authenticated;

grant execute on function public.admin_yo()                        to authenticated;
grant execute on function public.admin_estado()                    to authenticated;
grant execute on function public.admin_crear_clave(text)           to authenticated;
grant execute on function public.admin_listar_claves()             to authenticated;
grant execute on function public.admin_borrar_clave(uuid, text)    to authenticated;
grant execute on function public.admin_ver_clave(uuid)             to authenticated;
grant execute on function public.admin_detalle_clave(uuid)         to authenticated;
grant execute on function public.admin_restablecer_clave(uuid, text, text) to authenticated;
grant execute on function public.cambiar_clave(text, text, text)   to anon, authenticated;
grant execute on function public.admin_registros(int)              to authenticated;
grant execute on function public.admin_suspender_cuenta(uuid, boolean, text) to authenticated;
grant execute on function public.admin_graficas()                   to authenticated;
grant execute on function public.admin_red()                       to authenticated;
grant execute on function public.admin_desbloquear(text, text)     to authenticated;
grant execute on function public.admin_consola(text)               to authenticated;

-- ---------------------------------------------------------------------
--  AUTORIZAR AL ADMINISTRADOR DEL PANEL (se hace a mano, una sola vez)
--  1) Entra al panel con GitHub: te mostrará tu "ID de usuario" (un UUID).
--  2) Ejecuta esto en el SQL Editor con TU ID y TU correo (no los subas al repositorio):
--
--     insert into public.admins (user_id, email)
--     values ('00000000-0000-0000-0000-000000000000', 'tu-correo@gmail.com');
--
--  Para quitar el acceso a alguien:
--     delete from public.admins where user_id = '...';
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
--  CONTRASEÑA MAESTRA (solo tú). Fíjala UNA vez, desde el SQL Editor, cambiando el texto:
--
--    insert into privado.secretos (nombre, valor)
--    values ('maestra', extensions.crypt('ESCRIBE-AQUI-TU-CONTRASEÑA', extensions.gen_salt('bf', 12)))
--    on conflict (nombre) do update set valor = excluded.valor;
--
--  Se guarda cifrada con bcrypt (nadie, ni tú, puede leerla después). Para cambiarla,
--  ejecuta lo mismo con otro texto. Después borra esa consulta del historial del editor.
-- ---------------------------------------------------------------------
