-- =====================================================================
--  webpagebetatest1 · Cuentas y códigos de administrador en Supabase
--
--  Cómo usarlo: Supabase -> SQL Editor -> New query -> pega TODO este
--  archivo -> Run. Se puede ejecutar más de una vez sin problema.
--
--  Diseño:
--   * Las tablas NO son accesibles desde la página (sin permisos para
--     anon/authenticated y con RLS activado). Solo se puede entrar por las
--     funciones de abajo, que validan todo en el servidor.
--   * Las contraseñas se guardan con bcrypt; los códigos y las sesiones,
--     solo como huella SHA-256 (nunca en claro).
--   * Los códigos son de un solo uso y hay límite de intentos fallidos.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Esquema privado: funciones auxiliares que la página NO puede llamar
create schema if not exists privado;

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

create table if not exists public.codigos (
  hash       text primary key,
  rol        text not null default 'miembro' check (rol in ('miembro', 'admin')),
  creado     timestamptz not null default now(),
  creado_por uuid references public.usuarios (id) on delete set null,
  usado_en   timestamptz,
  usado_por  uuid references public.usuarios (id) on delete set null
);

create table if not exists public.sesiones (
  token      text primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  creada     timestamptz not null default now(),
  expira     timestamptz not null
);

create table if not exists public.intentos (
  clave       text primary key,
  n           int not null default 0,
  hasta       timestamptz,
  actualizado timestamptz not null default now()
);

alter table public.usuarios enable row level security;
alter table public.codigos  enable row level security;
alter table public.sesiones enable row level security;
alter table public.intentos enable row level security;

revoke all on table public.usuarios from public, anon, authenticated;
revoke all on table public.codigos  from public, anon, authenticated;
revoke all on table public.sesiones from public, anon, authenticated;
revoke all on table public.intentos from public, anon, authenticated;

-- ---------------------------------------------------------------------
--  Funciones auxiliares (esquema privado)
-- ---------------------------------------------------------------------
create or replace function privado.hash_texto(t text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(t, 'UTF8')), 'hex')
$$;

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

create or replace function privado.nueva_sesion(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_token text;
  v_exp   timestamptz;
begin
  delete from public.sesiones where expira < now();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_exp   := now() + interval '30 days';
  insert into public.sesiones (token, usuario_id, expira)
  values (privado.hash_texto(v_token), p_uid, v_exp);
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
   where s.token = privado.hash_texto(p_token) and s.expira > now();
  return v;
end $$;

-- ---------------------------------------------------------------------
--  Funciones que usa la página (se llaman con la clave pública)
-- ---------------------------------------------------------------------

-- 1) Comprueba un código SIN gastarlo
create or replace function public.verificar_codigo(p_codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_clave text := 'cod:' || privado.ip();
  v_seg   int;
begin
  v_seg := privado.segundos_bloqueado(v_clave);
  if v_seg > 0 then
    return jsonb_build_object('ok', false, 'error', 'espera', 'segundos', v_seg);
  end if;

  if exists (select 1 from public.codigos
              where hash = privado.hash_texto(upper(btrim(coalesce(p_codigo, ''))))
                and usado_en is null) then
    return jsonb_build_object('ok', true);
  end if;

  perform privado.registrar_fallo(v_clave, 8, 60);
  return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
end $$;

-- 2) Crea la cuenta gastando el código (un solo uso) e inicia sesión
create or replace function public.registrar(p_codigo text, p_nombre text, p_usuario text, p_clave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_clave   text := 'cod:' || privado.ip();
  v_hash    text := privado.hash_texto(upper(btrim(coalesce(p_codigo, ''))));
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

  -- Primero el código: así quien no tiene uno no puede averiguar qué usuarios existen
  if not exists (select 1 from public.codigos where hash = v_hash and usado_en is null) then
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
    insert into public.usuarios (usuario, nombre, rol, clave)
    values (v_usuario, v_nombre, v_rol,
            extensions.crypt(p_clave, extensions.gen_salt('bf', 10)))
    returning id into v_id;
  exception when unique_violation then
    update public.codigos set usado_en = null where hash = v_hash;
    return jsonb_build_object('ok', false, 'error', 'usuario_en_uso');
  end;

  update public.codigos set usado_por = v_id where hash = v_hash;
  v_sesion := privado.nueva_sesion(v_id);

  return jsonb_build_object(
    'ok', true,
    'token', v_sesion ->> 'token',
    'expira', v_sesion ->> 'expira',
    'perfil', jsonb_build_object('usuario', v_usuario, 'nombre', v_nombre, 'rol', v_rol));
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
    return jsonb_build_object('ok', false, 'error', 'credenciales');
  end if;

  delete from public.intentos where clave = v_ku;
  v_sesion := privado.nueva_sesion(v_user.id);

  return jsonb_build_object(
    'ok', true,
    'token', v_sesion ->> 'token',
    'expira', v_sesion ->> 'expira',
    'perfil', jsonb_build_object('usuario', v_user.usuario, 'nombre', v_user.nombre, 'rol', v_user.rol));
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
    'perfil', jsonb_build_object('usuario', v.usuario, 'nombre', v.nombre, 'rol', v.rol));
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

-- 6) Cerrar sesión
create or replace function public.salir(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  delete from public.sesiones where token = privado.hash_texto(coalesce(p_token, ''));
  return jsonb_build_object('ok', true);
end $$;

-- 7) Solo administradores: generar un código nuevo (se muestra una única vez)
create or replace function public.crear_codigo(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v        public.usuarios;
  v_raw    text;
  v_codigo text;
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  if v.rol <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'permiso');
  end if;

  v_raw := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  v_codigo := 'ADM-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4)
                     || '-' || substr(v_raw, 9, 4) || '-' || substr(v_raw, 13, 4);

  insert into public.codigos (hash, rol, creado_por)
  values (privado.hash_texto(v_codigo), 'miembro', v.id);

  return jsonb_build_object('ok', true, 'codigo', v_codigo);
end $$;

-- 8) Solo administradores: resumen de códigos
create or replace function public.listar_codigos(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.usuarios;
begin
  v := privado.usuario_de_token(p_token);
  if v.id is null then
    return jsonb_build_object('ok', false, 'error', 'sesion');
  end if;
  if v.rol <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'permiso');
  end if;

  return jsonb_build_object(
    'ok', true,
    'sin_usar', (select count(*) from public.codigos where usado_en is null),
    'usados',   (select count(*) from public.codigos where usado_en is not null),
    'recientes', coalesce((
      select jsonb_agg(x) from (
        select c.creado, c.usado_en, u.usuario as usado_por
          from public.codigos c
          left join public.usuarios u on u.id = c.usado_por
         order by c.creado desc
         limit 20) x), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------
--  Permisos: solo estas funciones son públicas
-- ---------------------------------------------------------------------
revoke all on function public.verificar_codigo(text)               from public, anon, authenticated;
revoke all on function public.registrar(text, text, text, text)    from public, anon, authenticated;
revoke all on function public.entrar(text, text)                   from public, anon, authenticated;
revoke all on function public.yo(text)                             from public, anon, authenticated;
revoke all on function public.cambiar_nombre(text, text)           from public, anon, authenticated;
revoke all on function public.salir(text)                          from public, anon, authenticated;
revoke all on function public.crear_codigo(text)                   from public, anon, authenticated;
revoke all on function public.listar_codigos(text)                 from public, anon, authenticated;

grant execute on function public.verificar_codigo(text)            to anon, authenticated;
grant execute on function public.registrar(text, text, text, text) to anon, authenticated;
grant execute on function public.entrar(text, text)                to anon, authenticated;
grant execute on function public.yo(text)                          to anon, authenticated;
grant execute on function public.cambiar_nombre(text, text)        to anon, authenticated;
grant execute on function public.salir(text)                       to anon, authenticated;
grant execute on function public.crear_codigo(text)                to anon, authenticated;
grant execute on function public.listar_codigos(text)              to anon, authenticated;

-- ---------------------------------------------------------------------
--  Primer código de administrador (un solo uso). Se guarda solo su huella.
--  Con él se registra el primer administrador; después ese administrador
--  genera los demás códigos desde Configuración.
-- ---------------------------------------------------------------------
insert into public.codigos (hash, rol)
values ('ae743f10124d2d25cba71e08ef1aaf3c4426e10c93371731b2c6153d91a2954d', 'admin')
on conflict (hash) do nothing;

-- Para crear otro código de administrador a mano (ejemplo), ejecuta:
--   insert into public.codigos (hash, rol)
--   values (encode(sha256(convert_to('ADM-XXXX-XXXX-XXXX-XXXX', 'UTF8')), 'hex'), 'admin');
-- (usa un código largo y aleatorio, en MAYÚSCULAS)
