// Códigos de administrador válidos para registrarse.
// Aquí se guarda solo la huella SHA-256 de cada código (no el código en sí).
// Para agregar un código nuevo: escríbelo en MAYÚSCULAS y obtén su huella con
//   printf '%s' 'ADM-XXXX-XXXX' | sha256sum
// y pega el resultado en la lista. Para anular un código, bórralo de la lista.
window.AUTH_CONFIG = {
  codigos: [
    "c045f34802c6136853b9372013b9e42a3b7d57a7161ca79bf45df56f7d327094"
  ]
};
