# Guía de Despliegue en Vercel

## Pasos para desplegar en Vercel

### 1. Preparación del repositorio
- Asegúrate de que todos los cambios estén commiteados
- El archivo `.env` ya está en `.gitignore` y no se subirá

### 2. Conectar con Vercel

**Opción A: Desde la interfaz web de Vercel**
1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en "Add New Project"
3. Conecta tu repositorio de GitHub/GitLab/Bitbucket
4. Selecciona el repositorio `carnet-club-tiro`

**Opción B: Desde la terminal (CLI)**
```bash
npm i -g vercel
vercel login
vercel
```

### 3. Configurar Variables de Entorno en Vercel

**IMPORTANTE:** Debes agregar todas las variables de entorno de Firebase en Vercel:

1. En el dashboard de Vercel, ve a tu proyecto
2. Ve a **Settings** → **Environment Variables**
3. Agrega las siguientes variables (una por una):

```
VITE_FIREBASE_API_KEY=AIzaSyCpf_sBlrHSoyNRo64uONsmacbj-L9SSaY
VITE_FIREBASE_AUTH_DOMAIN=campo-tiro-valle.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campo-tiro-valle
VITE_FIREBASE_STORAGE_BUCKET=campo-tiro-valle.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=350378916779
VITE_FIREBASE_APP_ID=1:350378916779:web:a7b0263a6100f6a3f570ee
```

4. Asegúrate de seleccionar los ambientes donde aplicarán (Production, Preview, Development)
5. Haz clic en "Save"

### 4. Configuración del Build

Vercel detectará automáticamente que es un proyecto Vite gracias al archivo `vercel.json`. La configuración incluye:

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Framework:** Vite

### 5. Desplegar

1. Si conectaste desde la web, Vercel desplegará automáticamente
2. Si usas CLI, ejecuta:
   ```bash
   vercel --prod
   ```

### 6. Verificar el despliegue

- Vercel te dará una URL (ej: `tu-proyecto.vercel.app`)
- Visita la URL y verifica que la aplicación funcione
- Verifica que Firebase se conecte correctamente

## Solución de Problemas

### Error: "Environment variable not found"
- Verifica que hayas agregado todas las variables de entorno en Vercel
- Asegúrate de que las variables tengan el prefijo `VITE_`
- Reinicia el deployment después de agregar las variables

### Error: "Build failed"
- Verifica que `package.json` tenga el script `build`
- Revisa los logs de build en Vercel para más detalles

### La app no se conecta a Firebase
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de que el dominio de Vercel esté autorizado en Firebase (si es necesario)
- Revisa la consola del navegador para errores específicos

## Notas Importantes

- Las variables de entorno en Vercel son **públicas** en el cliente (por el prefijo `VITE_`)
- Esto es normal para aplicaciones frontend, pero asegúrate de que las reglas de Firestore estén bien configuradas
- Considera usar Firebase App Check para mayor seguridad en producción

