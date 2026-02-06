# GoWater Driver - Guía de Compilación y Publicación Mobile

## Resumen
GoWater Driver usa **Capacitor** para empaquetar la app web como aplicación nativa de Android e iOS. El mismo código que corre en el navegador se empaqueta dentro de un contenedor nativo, con acceso a funcionalidades del dispositivo.

---

## Requisitos Previos

### Para Android
- **Android Studio** (última versión estable)
- **Java JDK 17+**
- **Android SDK** (API level 33+)
- Cuenta de **Google Play Developer** ($25 pago único)

### Para iOS
- **macOS** con **Xcode 15+**
- Cuenta de **Apple Developer Program** ($99/año)
- Un dispositivo iOS para pruebas (opcional, se puede usar simulador)

---

## Estructura del Proyecto Capacitor

```
├── capacitor.config.ts     # Configuración principal de Capacitor
├── client/src/lib/capacitor.ts  # Utilidades nativas (GPS, push, haptics)
├── scripts/capacitor-build.sh   # Script de build automatizado
├── android/                # Proyecto Android (se genera automáticamente)
└── ios/                    # Proyecto iOS (se genera automáticamente)
```

---

## Paso 1: Preparar el Build

### Desde tu máquina local (no en Replit):

```bash
# 1. Clonar el repositorio
git clone <tu-repo-url>
cd gowater

# 2. Instalar dependencias
npm install

# 3. Compilar la app web
npm run build

# 4. Agregar las plataformas nativas
npx cap add android
npx cap add ios    # Solo en macOS

# 5. Sincronizar el build con los proyectos nativos
npx cap sync
```

---

## Paso 2: Configurar Android

### Abrir en Android Studio
```bash
npx cap open android
```

### Configuración del proyecto Android:

1. **Cambiar el ícono de la app:**
   - En Android Studio: `File > New > Image Asset`
   - Selecciona tu ícono personalizado
   - Genera para todas las densidades

2. **Splash Screen:**
   - Editar `android/app/src/main/res/values/styles.xml`
   - Los colores ya están configurados en `capacitor.config.ts`

3. **Permisos (AndroidManifest.xml)** - Ya incluidos por los plugins:
   - `ACCESS_FINE_LOCATION` (GPS)
   - `ACCESS_COARSE_LOCATION`
   - `CAMERA`
   - `INTERNET`
   - `ACCESS_NETWORK_STATE`

4. **Configurar conexión al servidor (si usas hosting remoto):**
   - Si la app carga assets locales (por defecto), no necesitas cambiar nada.
   - Si quieres que la app cargue desde tu servidor remoto, agrega `server.url` en `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'https://tu-dominio.replit.app/mobile-app',
     // ...
   }
   ```
   - Los dominios permitidos ya están configurados en `allowNavigation`.

### Probar en dispositivo/emulador
```bash
# Ejecutar en emulador
npx cap run android

# O desde Android Studio: Run > Run 'app'
```

---

## Paso 3: Compilar APK/AAB para Google Play

### Generar el Release Build:

1. En Android Studio: `Build > Generate Signed Bundle/APK`
2. Seleccionar **Android App Bundle (AAB)** (requerido por Google Play)
3. Crear o seleccionar tu **Keystore** (guárdalo en un lugar seguro)
4. Seleccionar `release` como build variant
5. Click en `Finish`

El archivo `.aab` se genera en: `android/app/build/outputs/bundle/release/`

### Publicar en Google Play:

1. Ir a [Google Play Console](https://play.google.com/console)
2. Crear nueva aplicación
3. Completar la información de la ficha:
   - Nombre: **GoWater Driver**
   - Descripción corta y larga
   - Capturas de pantalla (mínimo 2)
   - Ícono de la app (512x512 PNG)
   - Gráfico destacado (1024x500 PNG)
4. Subir el archivo `.aab`
5. Configurar la distribución (países, precios - gratuita)
6. Enviar para revisión

**Tiempo de revisión:** Generalmente 1-3 días para la primera publicación.

---

## Paso 4: Configurar iOS (cuando estés listo)

### Abrir en Xcode
```bash
npx cap open ios
```

### Configuración:
1. Seleccionar tu **Team** de desarrollo en Xcode
2. Cambiar el **Bundle Identifier**: `com.gowater.driver`
3. Configurar **Signing & Capabilities**
4. Agregar los íconos en el Asset Catalog

### Compilar y enviar a App Store:
1. En Xcode: `Product > Archive`
2. En el Organizer: `Distribute App`
3. Seleccionar `App Store Connect`
4. Subir a TestFlight primero para pruebas
5. Cuando esté listo, enviar para revisión de App Store

**Tiempo de revisión:** Generalmente 1-7 días.

---

## Paso 5: Actualizaciones

Para actualizar la app después de cambios en el código:

```bash
# 1. Compilar los cambios web
npm run build

# 2. Sincronizar con los proyectos nativos
npx cap sync

# 3. Abrir y compilar
npx cap open android  # o ios
```

### Live Updates (Opcional)
Puedes configurar actualizaciones OTA (Over-The-Air) para actualizar el contenido web sin pasar por las tiendas:

```bash
npm install @capgo/capacitor-updater
```

Esto permite actualizar la app instantáneamente sin esperar revisión de las tiendas.

---

## Plugins Nativos Incluidos

| Plugin | Uso en GoWater |
|--------|---------------|
| `@capacitor/geolocation` | GPS preciso para tracking de conductores |
| `@capacitor/push-notifications` | Notificaciones de nuevas rutas y pedidos |
| `@capacitor/camera` | Fotos de entrega como comprobante |
| `@capacitor/status-bar` | Control de la barra de estado del dispositivo |
| `@capacitor/splash-screen` | Pantalla de carga al abrir la app |
| `@capacitor/haptics` | Vibración para confirmaciones de entrega |
| `@capacitor/keyboard` | Manejo del teclado en formularios |
| `@capacitor/network` | Detección de conectividad offline |
| `@capacitor/app` | Control del botón atrás en Android |

---

## Funcionalidades Nativas Disponibles

### Geolocalización (GPS)
```typescript
import { getDeviceLocation, watchDeviceLocation, stopWatchingLocation } from '@/lib/capacitor';

// Obtener ubicación una vez
const location = await getDeviceLocation();

// Seguimiento continuo
const watchId = await watchDeviceLocation((loc) => {
  console.log(loc.latitude, loc.longitude);
});

// Detener seguimiento
if (watchId) await stopWatchingLocation(watchId);
```

### Cámara (Fotos de Entrega)
```typescript
import { takePhoto, pickPhoto } from '@/lib/capacitor';

// Tomar foto con la cámara
const photo = await takePhoto();
if (photo) {
  console.log(photo.dataUrl); // base64 data URL
  console.log(photo.format);  // 'jpeg', 'png', etc.
}

// Seleccionar foto de la galería
const selected = await pickPhoto();
```

### Push Notifications
```typescript
import { initPushNotifications, onPushNotificationReceived, onPushNotificationTapped } from '@/lib/capacitor';

// Registrar para notificaciones
const token = await initPushNotifications();

// Escuchar notificaciones recibidas
onPushNotificationReceived((notification) => {
  console.log(notification.title, notification.body);
});

// Escuchar cuando el usuario toca una notificación
onPushNotificationTapped((data) => {
  console.log('Notificación tocada:', data);
});
```

### Haptic Feedback
```typescript
import { triggerHapticFeedback } from '@/lib/capacitor';

// Al confirmar una entrega
await triggerHapticFeedback('medium');
```

### Estado de Red
```typescript
import { checkNetworkStatus, onNetworkChange } from '@/lib/capacitor';

const online = await checkNetworkStatus();
const cleanup = await onNetworkChange((connected) => {
  console.log('Conectado:', connected);
});
// Limpiar listener cuando no se necesite
cleanup();
```

---

## Solución de Problemas

### La app muestra pantalla en blanco
- Verificar que `webDir` en `capacitor.config.ts` apunta a `dist/public`
- Verificar que `npm run build` completó sin errores
- Ejecutar `npx cap sync` después del build

### GPS no funciona
- Verificar permisos en configuración del dispositivo
- En Android: Habilitar "Ubicación de alta precisión"

### Las notificaciones no llegan
- Verificar que el token de push se envió al servidor
- En iOS: Verificar certificados de push en Apple Developer

### Error de CORS en peticiones API
- Configurar la URL del servidor en `capacitor.config.ts`
- Asegurar que el backend permite el origen `capacitor://localhost`

---

## Costos Resumen

| Concepto | Costo |
|----------|-------|
| Capacitor (framework) | Gratis |
| Plugins nativos | Gratis |
| Google Play Developer | $25 (una vez) |
| Apple Developer Program | $99/año |
| **Total Android** | **$25** |
| **Total iOS + Android** | **$124 primer año** |
