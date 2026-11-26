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

## Historial, tema del sistema y suspensión

- **Historial de inicios de sesión** (Configuración → Cuenta): últimos 30 eventos (inicio de sesión, cuenta creada, intento fallido, intento con cuenta suspendida) con dispositivo e IP. Se conserva 180 días. Tabla `historial` (sin acceso directo; solo la función `mi_historial`).
- **Tema "Sistema"** (Configuración → Apariencia): sigue el modo claro/oscuro del dispositivo y cambia al instante cuando el dispositivo cambia. Es el valor por defecto.
- **Cuentas suspendidas**: un administrador puede suspender una cuenta (cierra sus sesiones y no la deja entrar). Al intentarlo ve «Tu cuenta está suspendida».
- Para activarlo, vuelve a ejecutar `supabase/schema.sql` (no hace falta `reiniciar.sql`).

## Medidor, fondos, tema OLED y preferencias que viajan

- **Medidor de seguridad** (al crear la cuenta): barra de 5 niveles con entropía y tiempo estimado de adivinación, calculado en el navegador; nada se envía. La página «Contraseñas» (generador) se eliminó.
- **Tema OLED** (Configuración → Apariencia): como Oscuro pero con negro puro (#000) y superficies casi negras; también existe en la página de administrador.
- **Listas desplegables**: el modo (Sistema / Oscuro / OLED / Claro) y la dirección del degradado del acento se eligen en listas desplegables.
- **Difuminado de las tarjetas** (Configuración → Apariencia): interruptor para el efecto de cristal esmerilado (blur) en las tarjetas; activado por defecto, viaja con la cuenta.
- **Fondo de la página** (Configuración → Apariencia): 6 fondos (degradados) o una imagen propia (se reduce a ≤1600 px y se guarda solo en ese dispositivo). «Restablecer a normal» quita el fondo y la imagen.
- **Preferencias de la cuenta**: con la sesión iniciada, el tema, el color de acento, el idioma y el fondo (los predefinidos) se guardan en `usuarios.preferencias` y se aplican al iniciar sesión en cualquier dispositivo. El servidor solo acepta valores conocidos (`guardar_preferencias`).
- **Usuarios** (Principal): tarjeta vertical a la derecha con la foto y el nombre de los usuarios registrados; un punto verde indica quién está en línea (sin punto = desconectado). Cada fila es un enlace al **perfil** de ese usuario. «En línea» = la página abierta y visible envió un latido (cada 20 s). Al cerrar o salir de la página se avisa al servidor (`desconectando`, con `keepalive`) y la lista, que se refresca cada 2 s, lo muestra desconectado en ~2 s (si hay otra pestaña abierta no se marca). Los usuarios en línea suben al principio con una animación (se omite con «reducir movimiento»).
- **Visibilidad** (Configuración → Visibilidad, se guarda sola; se pueden marcar **varias** opciones): *Todos* (los usuarios registrados ven tu estado; opción extra «Visible también para los invitados»), *Nadie* (excluyente; también es lo que queda si desmarcas todo) y *Amigos / Mejores amigos / Personas que sigo / Seguidores*, que por ahora no hacen nada (no muestran tu estado). Por defecto: Todos, sin invitados. Quien no puede ver tu estado te ve siempre **offline** (nunca desapareces de la lista). Los invitados ven a todos con foto y nombre (sin el usuario); el estado real solo de quien activó «visible para invitados».
- **Menú de cuenta** (foto de la barra): al pulsar tu foto y nombre vas a tu página de cuenta (`perfil.html`). Ahí mismo eliges tu **estado**: *En línea*, *Desconectado* (los demás te ven desconectado aunque uses la página) y *No molestar* (por ahora no hace nada).
- **Perfil** (`perfil.html`, el tuyo; `perfil.html?id=<id>` el de otro usuario): foto, nombre, estado y, para usuarios registrados, @usuario y «Miembro desde». Los invitados ven una versión limitada. Función `perfil_usuario`; si el perfil no existe o está suspendido se muestra un aviso.
- **Países de acceso** (administrador): el servidor guarda el país de cada acceso si la petición trae la cabecera `cf-ipcountry` (Supabase pasa por Cloudflare). Si no llega, aparece como «Desconocido».
- Vuelve a ejecutar `supabase/schema.sql` (no hace falta `reiniciar.sql`).


## Configuración: tarjetas flotantes y lista de idioma

En **Cuenta**, «Cambiar nombre» y «Cambiar contraseña» abren una tarjeta flotante (Escape, clic fuera o «Cancelar» la cierran). El **idioma** se elige en una lista desplegable. Desde el panel de administración, crear una clave ahora exige también la contraseña maestra (`admin_crear_clave(p_nombre, p_maestra)`; vuelve a ejecutar `supabase/schema.sql`).

## Seguir a otros usuarios

En cada perfil ajeno hay un botón **Seguir / Dejar de seguir** y un texto con los **seguidores** y a cuántas personas **sigue** (tabla `seguimientos`, función `seguir`). Con eso funcionan dos opciones de Visibilidad:

- **Personas que sigo:** los usuarios a los que tú sigues pueden ver tu estado.
- **Seguidores:** los usuarios que te siguen pueden ver tu estado.

Se pueden combinar entre sí y con las demás; los invitados solo ven el estado de quien eligió «Todos» y «visible para invitados». Las listas desplegables usan una lista propia (`js/desplegable.js`) que mantiene el `<select>` original como fuente del valor. El resaltado de texto seleccionado usa el color predeterminado del navegador. Vuelve a ejecutar `supabase/schema.sql` para crear la tabla y las funciones.

### Lista de seguidores y seguidos
En el perfil, «seguidores» y «siguiendo» son botones con icono; al pulsarlos se abre una tarjeta flotante con las personas (cada fila lleva a su perfil). Quién puede abrir esas listas se elige en Configuración → Visibilidad → «¿Quién puede ver tus seguidores y a quién sigues?» (mismas opciones que el estado, sin invitados; funciones `guardar_visibilidad_seguim` y `lista_seguimiento`). Los números siempre se ven. Las tarjetas de Visibilidad vienen plegadas y se despliegan al pulsar; la fila plegada resume lo elegido. Vuelve a ejecutar `supabase/schema.sql`.

### Amigos, mejores amigos y notificaciones
En cada perfil ajeno hay «Agregar amigo»: envía una **solicitud** y la otra persona ve «Aceptar amigo» (y «Rechazar») en su perfil y en sus notificaciones. Si las dos se la envían, queda aceptada sola. La amistad es de dos sentidos y «Quitar amigo» la quita en ambos lados. El botón «Mejor amigo» **solo aparece cuando ya son amigos** y también necesita aceptación («Aceptar mejor amigo»); sin lista. Los mejores amigos llevan un icono dorado de dos personas junto al nombre (tarjeta Usuarios, perfiles y listas). Los amigos tienen su lista en el perfil (botón «amigos»), controlada por la misma configuración que seguidores y siguiendo; las opciones «Amigos» y «Mejores amigos» de Visibilidad usan solo amistades aceptadas.

En la barra, encima de la foto de perfil, está **Notificaciones** con un contador (se consulta cada ~10 s). Avisa de las solicitudes de amistad y de mejor amigo (se aceptan o rechazan desde el panel) y de quién empezó a seguirte (se descarta). Se consulta cada 5 s con una «firma» ligera: si cambia, el panel abierto se actualiza solo y lo nuevo sale como **sub-notificación** arriba a la derecha (entra desde fuera de la página por la derecha y se va sola). Los botones del perfil son solo iconos; el texto sale como tooltip. Si alguien reenvía una solicitud 3 veces en 30 min a la misma persona (p. ej. tras rechazos), el siguiente intento muestra una sub-notificación («Has enviado demasiadas solicitudes…») y el botón queda desactivado 30 min (se mantiene al recargar). Tablas `amistades`, `solicitudes_amistad`, `solicitudes_intentos`; funciones `amistad`, `notificaciones_cantidad`, `notificaciones`, `descartar_notificacion`. Vuelve a ejecutar `supabase/schema.sql`: las amistades de la versión anterior (de un solo sentido) pasan a ser solicitudes pendientes para la otra persona.

Apariencia: «Fondo de la página», «Color de acento» y «Sesiones activas» son tarjetas plegables con flecha, como Visibilidad. Las miniaturas de fondo imitan las de «Temas» de Windows 11 (fondo + ventanita con la barra del color de acento) y la barra lateral es de cristal esmerilado (se apaga con «Difuminado de tarjetas y barra»).

Las tarjetas de Visibilidad solo tienen una flecha a un lado, se despliegan con una animación suave y se cierran solas poco después de cambiar una opción.
