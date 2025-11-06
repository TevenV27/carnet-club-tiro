# Configuración de Firebase

## Pasos para configurar Firebase

1. **Crear un proyecto en Firebase Console**
   - Ve a https://console.firebase.google.com/
   - Haz clic en "Agregar proyecto"
   - Sigue los pasos para crear tu proyecto

2. **Habilitar Authentication con Email/Password**
   - En el panel de Firebase, ve a "Authentication"
   - Haz clic en "Get Started" si es la primera vez
   - Ve a la pestaña "Sign-in method"
   - Haz clic en "Email/Password"
   - Habilita "Email/Password" (toggle ON)
   - Haz clic en "Save"

3. **Crear el Usuario Principal**
   - En "Authentication", ve a la pestaña "Users"
   - Haz clic en "Add user"
   - Ingresa:
     - **Email:** `clubtirovalle2025@campo-tiro-valle.com` (o cualquier email válido)
     - **Password:** `cobateairsoft2025`
   - Haz clic en "Add user"
   - **NOTA:** El email puede ser cualquier formato válido. Si prefieres usar un formato diferente, actualiza el componente Login.jsx

4. **Crear Firestore Database**
   - En el panel de Firebase, ve a "Firestore Database"
   - Haz clic en "Create database"
   - Selecciona "Start in test mode" (para desarrollo)
   - Selecciona una ubicación para tu base de datos

5. **Configurar Reglas de Firestore (IMPORTANTE)**
   - En el panel de Firestore, ve a la pestaña "Rules"
   - Reemplaza las reglas con las siguientes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Colección de carnets
    match /carnets/{cardId} {
      // Permitir lectura a todos (para búsqueda pública por cédula)
      allow read: if true;
      // Permitir escritura solo a usuarios autenticados
      allow create, update, delete: if request.auth != null;
    }
    
    // Todas las demás colecciones solo para usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

   - Haz clic en "Publish" para guardar las reglas

6. **Obtener configuración de Firebase**
   - En el panel de Firebase, ve a "Project Settings" (ícono de engranaje)
   - Ve a la sección "Your apps"
   - Haz clic en el ícono de web (</>)
   - Copia los valores de configuración

7. **Actualizar configuración en el código**
   - Abre el archivo `src/firebase/config.js`
   - Reemplaza los valores con los de tu proyecto Firebase (si es necesario)

## Credenciales de Acceso

**Usuario:** `clubtirovalle2025@campo-tiro-valle.com` (o el email que hayas usado al crear el usuario)  
**Contraseña:** `cobateairsoft2025`

**NOTA:** Si usaste un email diferente al crear el usuario, actualiza el valor en `src/components/Login.jsx` o simplemente usa el email que creaste al iniciar sesión.

## Nota Importante sobre Storage

**Este proyecto NO utiliza Firebase Storage** para evitar costos. Las imágenes de los carnets se guardan directamente en Firestore como base64. Por lo tanto, NO es necesario configurar Storage en Firebase.

Las imágenes se convierten a formato base64 y se comprimen antes de guardarlas en Firestore, lo que permite almacenarlas sin necesidad de Storage.

## Nota sobre Límites de Firestore

**Importante:** Las imágenes en base64 pueden aumentar el tamaño de los documentos. Firestore tiene un límite de 1 MB por documento. El código comprime automáticamente las imágenes para asegurar que no excedan este límite, pero si tus imágenes son muy grandes, considera optimizarlas antes de guardarlas.

## Solución de Problemas

### Error: "Missing or insufficient permissions"
- Verifica que hayas configurado las reglas de Firestore correctamente (paso 5)
- Asegúrate de que el usuario esté autenticado correctamente
- Verifica que hayas publicado las reglas haciendo clic en "Publish"

### Error: "The value of property is longer than 1048487 bytes"
- Este error ocurre cuando las imágenes son muy grandes
- El código debería comprimirlas automáticamente, pero si persiste, puedes:
  - Reducir la calidad de compresión en `cardService.js`
  - Reducir el tamaño máximo de las imágenes

### Error: "Firebase: Error (auth/user-not-found)"
- Verifica que hayas creado el usuario en Authentication
- Verifica que el email sea correcto
- Asegúrate de que Email/Password esté habilitado en Sign-in method
