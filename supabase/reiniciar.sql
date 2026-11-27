-- Empezar de cero: BORRA cuentas, sesiones, claves, registros y los secretos de cifrado.
-- Conserva la tabla `admins` (tu autorización del panel).
-- OJO: también borra la contraseña maestra (hay que volver a fijarla).
-- Después ejecuta schema.sql para volver a crear todo.
drop table if exists public.solicitudes_intentos, public.solicitudes_amistad, public.amistades, public.seguimientos, public.codigos, public.sesiones, public.usuarios, public.historial,
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
drop function if exists public.mi_historial(text);
drop function if exists public.guardar_descripcion(text, text);
drop function if exists public.mis_preferencias(text);
drop function if exists public.guardar_preferencias(text, jsonb);
drop function if exists public.admin_paises();
drop function if exists public.admin_registros_perfiles(int, bigint);
drop function if exists public.admin_borrar_registros_perfiles(bigint[], boolean, text);
drop function if exists public.admin_suspender_cuenta(uuid, boolean, text);
drop function if exists public.admin_asignar_admin_web(uuid, boolean, text);
drop function if exists public.admin_graficas();
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
drop function if exists public.admin_borrar_registros(bigint[], boolean, text);
drop function if exists public.latido(text);
drop function if exists public.mi_visibilidad(text);
drop function if exists public.guardar_visibilidad(text, text[], boolean);
drop function if exists public.guardar_estado(text, text);
drop function if exists public.desconectando(text);
drop function if exists public.seguir(text, uuid, boolean);
drop function if exists public.amistad(text, uuid, text);
drop function if exists public.notificaciones_cantidad(text);
drop function if exists public.notificaciones(text);
drop function if exists public.descartar_notificacion(text, uuid);
drop function if exists public.guardar_visibilidad_seguim(text, text[]);
drop function if exists public.lista_seguimiento(text, uuid, text);
drop function if exists public.perfil_usuario(text, uuid);
drop function if exists public.guardar_visibilidad(text, text, boolean);
drop function if exists public.lista_usuarios(text);
drop function if exists public.estados_usuarios(text);
drop function if exists public.admin_red();
drop function if exists public.admin_desbloquear(text, text);
drop function if exists public.admin_consola(text);
