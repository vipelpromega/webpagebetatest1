# webpagebetatest1

Página web en HTML, CSS y JavaScript puro (sin servidor).

## Páginas

- **Casa** (`index.html`): página principal.
- **Temporizador** (`temporizador.html`): cuenta regresiva. Solo para usuarios registrados.
- **Configuración** (`configuracion.html`): tema claro/oscuro y cuenta (cambiar nombre de visualización, cerrar sesión).

## Acceso y registro

Al entrar aparece una pantalla que pide un **código de administrador**:

1. Con un código válido → pantalla de registro (nombre de visualización, nombre de usuario y contraseña).
2. "Ya tengo cuenta" → inicio de sesión.
3. "Entrar como invitado" → acceso limitado (por ahora el Temporizador está bloqueado).

### Administrar los códigos

Los códigos válidos están en `js/auth-config.js`, guardados como huella SHA-256 (no en texto plano).

Para crear un código nuevo:

```bash
printf '%s' 'ADM-XXXX-XXXX' | sha256sum
```

Escribe el código en MAYÚSCULAS, copia la huella resultante y pégala en la lista `codigos`. Para anular un código, quita su huella de la lista.

### Cambiar qué ven los invitados

Las secciones restringidas se marcan con `data-acceso="miembro"` (en el `<body>` de la página y en su botón de la barra lateral).

### Limitaciones importantes

Como la página es estática, **no es seguridad real**:

- Las cuentas se guardan en el navegador de cada persona (`localStorage`): una cuenta creada en un dispositivo no existe en otro.
- Los códigos se comprueban en el propio navegador y no se pueden marcar como "usados" de forma global. Quien conozca un código puede registrarse cuantas veces quiera.
- Cualquiera con conocimientos técnicos puede saltarse la pantalla de acceso.

Para cuentas compartidas entre dispositivos, códigos de un solo uso y seguridad real hace falta un servidor (por ejemplo Firebase o Supabase). Toda la lógica de acceso está en `js/auth.js`, para poder cambiarla más adelante.
