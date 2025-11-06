/**
 * Script para crear el usuario principal en Firebase
 * Ejecuta este script una sola vez para crear el usuario inicial
 * 
 * Para ejecutar:
 * 1. Asegúrate de tener Node.js instalado
 * 2. Instala firebase-admin: npm install firebase-admin
 * 3. Obtén las credenciales de servicio de Firebase
 * 4. Ejecuta: node scripts/createUser.js
 */

// NOTA: Este script requiere firebase-admin y credenciales de servicio
// Para una solución más simple, puedes crear el usuario desde la consola de Firebase

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  CREAR USUARIO PRINCIPAL EN FIREBASE                          ║
╚═══════════════════════════════════════════════════════════════╝

OPCIÓN 1: Desde la Consola de Firebase (RECOMENDADO)
----------------------------------------------------
1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: campo-tiro-valle
3. Ve a "Authentication" en el menú lateral
4. Haz clic en "Get Started" si es la primera vez
5. Ve a la pestaña "Users"
6. Haz clic en "Add user"
7. Ingresa:
   - Email: clubtirovalle2025@campo-tiro-valle.com
   - Password: cobateairsoft2025
8. Haz clic en "Add user"

OPCIÓN 2: Habilitar Email/Password Authentication
--------------------------------------------------
1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: campo-tiro-valle
3. Ve a "Authentication" > "Sign-in method"
4. Haz clic en "Email/Password"
5. Habilita "Email/Password" (toggle ON)
6. Haz clic en "Save"

OPCIÓN 3: Usar este script (Requiere configuración adicional)
-------------------------------------------------------------
Si prefieres usar este script, necesitas:
1. Instalar firebase-admin: npm install firebase-admin
2. Obtener las credenciales de servicio de Firebase
3. Configurar las credenciales en el script

¿Necesitas ayuda? Revisa la documentación en FIREBASE_SETUP.md
`)

// Código del script (descomenta y configura si quieres usarlo)
/*
const admin = require('firebase-admin')
const serviceAccount = require('./path/to/serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const email = 'clubtirovalle2025@campo-tiro-valle.com'
const password = 'cobateairsoft2025'

admin.auth().createUser({
  email: email,
  password: password,
  emailVerified: true
})
.then((userRecord) => {
  console.log('Usuario creado exitosamente:', userRecord.uid)
})
.catch((error) => {
  console.error('Error creando usuario:', error)
})
*/

