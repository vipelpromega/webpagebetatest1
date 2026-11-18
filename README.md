# webpagebetatest1

Página web en HTML, CSS y JavaScript puro, con estilo Windows 11. Las cuentas y los
códigos de registro viven en un servidor (Supabase), así que se puede entrar desde
cualquier dispositivo.

## Páginas

- **Casa** (`index.html`): página principal.
- **Temporizador** (`temporizador.html`): cuenta regresiva. Solo para usuarios registrados.
- **Configuración** (`configuracion.html`): tema claro/oscuro y cuenta (nombre de visualización,
  cerrar sesión).

## Acceso y registro

Al entrar aparece una pantalla que pide un **código de administrador**:

1. Con un código válido → registro (nombre de visualización, nombre de usuario y contraseña).
   Cada código **se puede usar una sola vez**.
2. "Ya tengo cuenta" → inicio de sesión (funciona desde cualquier dispositivo).
3. "Entrar como invitado" → acceso limitado (por ahora el Temporizador está bloqueado).

Los códigos **no se generan en esta web**, sino en el **panel de administración** (página aparte y
privada, repositorio `adminwebpagetest1`). Allí un administrador autorizado (inicio de sesión con
GitHub + verificación en dos pasos) crea, consulta y borra claves. Cada clave se muestra completa
una sola vez; en el servidor solo se guarda su huella. Al introducir una clave válida, el registro
muestra el "Nombre de identificación" con el que se creó.

## Puesta en marcha del servidor

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. **SQL Editor → New query**, pega [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   (Para empezar de cero, ejecuta antes [`supabase/reiniciar.sql`](supabase/reiniciar.sql): borra cuentas y claves.)
3. Pon la URL del proyecto y la clave pública (publishable) en `js/supabase-config.js`.
4. Autoriza al administrador del panel (ver el final de `schema.sql`) y crea claves desde el panel.

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

## Personalización, idioma y sesiones

- **Color de acento** (Configuración → Apariencia): 8 colores sólidos y 6 degradados recomendados, o uno propio (sólido o degradado con dirección). Se guarda en este navegador (`acento`) y el texto se ajusta solo para mantener buen contraste.
- **Idioma** (Español / English): se guarda en `idioma`. La traducción está en `js/i18n.js` (diccionario); para añadir textos nuevos, agrega su traducción ahí.
- **Sesiones activas** (Configuración → Cuenta): lista de dispositivos con la sesión abierta, con opción de cerrar una o todas las demás. Requiere volver a ejecutar `supabase/schema.sql` (añade columnas a `sesiones` y las funciones `mis_sesiones`, `cerrar_sesion`, `cerrar_otras_sesiones`).
- **Principal**: hora y fecha del dispositivo y clima con [Open-Meteo](https://open-meteo.com) (sin clave). La ciudad se guarda en el navegador; el CSP permite `api.open-meteo.com` y `geocoding-api.open-meteo.com`.
