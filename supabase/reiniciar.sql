-- Empezar de cero: BORRA cuentas, sesiones, claves, registros y los secretos de cifrado.
-- Conserva la tabla `admins` (tu autorización del panel).
-- OJO: también borra la contraseña maestra (hay que volver a fijarla).
-- Después ejecuta schema.sql para volver a crear todo.
drop table if exists public.codigos, public.sesiones, public.usuarios,
                     public.intentos, public.auditoria cascade;
drop schema if exists privado cascade;

drop function if exists public.verificar_codigo(text);
drop function if exists public.registrar(text, text, text, text);
drop function if exists public.registrar(text, text, text, text, text);
drop function if exists public.cambiar_avatar(text, text);
drop function if exists public.entrar(text, text);
drop function if exists public.yo(text);
drop function if exists public.cambiar_nombre(text, text);
drop function if exists public.salir(text);
drop function if exists public.mis_sesiones(text);
drop function if exists public.cerrar_sesion(text, uuid);
drop function if exists public.cerrar_otras_sesiones(text);
drop function if exists public.crear_codigo(text);
drop function if exists public.listar_codigos(text);
drop function if exists public.admin_yo();
drop function if exists public.admin_estado();
drop function if exists public.admin_crear_clave(text, text);
drop function if exists public.admin_crear_clave(text);
drop function if exists public.admin_listar_claves();
drop function if exists public.admin_revocar_clave(uuid);
drop function if exists public.admin_borrar_clave(uuid);
drop function if exists public.admin_borrar_clave(uuid, text);
drop function if exists public.admin_ver_clave(uuid);
drop function if exists public.admin_detalle_clave(uuid);
drop function if exists public.admin_restablecer_clave(uuid, text, text);
drop function if exists public.cambiar_clave(text, text, text);
drop function if exists public.admin_registros(int);
drop function if exists public.admin_red();
drop function if exists public.admin_desbloquear(text, text);
drop function if exists public.admin_consola(text);
