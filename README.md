# webpagebetatest1

Página web en HTML, CSS y JavaScript puro, con estilo Windows 11. Las cuentas y los
códigos de registro viven en un servidor (Supabase), así que se puede entrar desde
cualquier dispositivo.

## Páginas

- **Casa** (`index.html`): página principal.
- **Temporizador** (`temporizador.html`): cuenta regresiva. Solo para usuarios registrados.
- **Configuración** (`configuracion.html`): tema claro/oscuro, cuenta (nombre de visualización,
  cerrar sesión) y, para administradores, generar códigos de registro.

## Acceso y registro

Al entrar aparece una pantalla que pide un **código de administrador**:

1. Con un código válido → registro (nombre de visualización, nombre de usuario y contraseña).
   Cada código **se puede usar una sola vez**.
2. "Ya tengo cuenta" → inicio de sesión (funciona desde cualquier dispositivo).
3. "Entrar como invitado" → acceso limitado (por ahora el Temporizador está bloqueado).

Los administradores generan códigos nuevos desde **Configuración → Administración → Generar
código**. El código se muestra una sola vez; en el servidor solo se guarda su huella.

## Puesta en marcha del servidor (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. En el proyecto: **SQL Editor → New query**, pega todo el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Se puede repetir sin problema.
3. Pon la URL del proyecto y la clave pública (publishable) en `js/supabase-config.js`.
4. Regístrate con el código del primer administrador que está en `supabase/schema.sql`
   (en el script solo aparece su huella; el código en sí se entrega aparte).

Para crear otro código de administrador a mano, ejecuta en el SQL Editor (con un código largo,
aleatorio y en MAYÚSCULAS):

```sql
insert into public.codigos (hash, rol)
values (encode(sha256(convert_to('ADM-XXXX-XXXX-XXXX-XXXX', 'UTF8')), 'hex'), 'admin');
```

## Cómo está protegido

- Las tablas no son accesibles desde la página: no tienen permisos para la clave pública y
  tienen RLS activado. Solo se entra por las funciones SQL de `supabase/schema.sql`, que
  validan todo en el servidor.
- Las contraseñas se guardan con bcrypt; los códigos y los tokens de sesión, solo como
  huella SHA-256.
- Límite de intentos: 5 contraseñas erróneas por usuario (30 s de bloqueo) y 8 códigos erróneos
  por IP (60 s).
- La clave que va en `js/supabase-config.js` es **pública** a propósito. **Nunca** subas al
  repositorio la clave `secret` / `service_role` ni la contraseña de la base de datos.

## Limitaciones

- Qué secciones ve un invitado se controla en la propia página: esconde botones y avisos, pero
  quien sepa de programación puede saltárselo. Sirve para ordenar la experiencia; si algún día
  hay datos privados, deben protegerse en el servidor.
- Los proyectos gratuitos de Supabase se pausan tras 1 semana sin actividad: si pasa, el
  registro y el inicio de sesión no funcionan hasta reactivar el proyecto en su panel.
- La sesión dura 30 días y se guarda en el navegador (`localStorage`).

### Cambiar qué ven los invitados

Las secciones restringidas se marcan con `data-acceso="miembro"` (en el `<body>` de la página y
en su botón de la barra lateral).
