# PWA y estrategia de caché

> **Audiencia:** Desarrolladores que desean entender cómo funciona el Service Worker y la experiencia offline

---

## ¿Qué es una PWA?

El sistema es una **Progressive Web App** que puede:
- Instalarse en la pantalla de inicio del dispositivo
- Funcionar parcialmente sin conexión a internet
- Recibir actualizaciones automáticas
- Tener una experiencia similar a una app nativa

---

## Service Worker (`service-worker.js`)

El Service Worker intercepta todas las peticiones de red y decide cómo responder según el tipo de recurso.

### Estrategias de caché

```
┌──────────────────────────────────────────────────┐
│                  PETICIÓN                        │
└────────────────────┬─────────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼                     ▼
   ¿API GET Google?        ¿Navegación?
          │                     │
          ▼                     ▼
  ┌──────────────┐     ┌──────────────────┐
  │ Cache then   │     │ Stale while      │
  │ Network      │     │ revalidate       │
  └──────────────┘     └──────────────────┘
          │                     │
          ▼                     ▼
        Otros recursos (estáticos)
          │
          ▼
  ┌──────────────┐
  │ Cache first  │
  └──────────────┘
```

### 1. API GET de Google Apps Script — "Cache then Network"

```javascript
if (url.origin === 'https://script.google.com' && e.request.method === 'GET') {
    // 1. Devuelve lo que haya en caché (si existe)
    // 2. En paralelo, hace fetch a la red
    // 3. Si la red responde OK, actualiza el caché
    // 4. Si la red falla, usa la respuesta en caché
}
```

**Propósito:** Las solicitudes GET de datos (trabajos, evaluaciones, etc.) se sirven desde caché para velocidad, pero siempre se actualizan en segundo plano.

### 2. Navegación — "Stale-while-revalidate"

```javascript
if (e.request.mode === 'navigate') {
    // 1. Devuelve la página en caché instantáneamente
    // 2. Busca la versión más reciente en la red
    // 3. Actualiza el caché con la nueva versión
    // 4. Si no hay red, usa la página en caché
}
```

**Propósito:** Las páginas HTML se cargan casi instantáneamente incluso en conexiones lentas, y siempre se actualizan silenciosamente.

### 3. Assets estáticos — "Cache First"

```javascript
// 1. Busca en caché
// 2. Si existe, devuelve inmediatamente (sin consultar red)
// 3. Si no existe, hace fetch y almacena en caché
```

**Propósito:** CSS, JS, imágenes y Bootstrap CDN se cargan desde el caché local, sin esperar la red.

---

## Assets precacheados

Al instalar el Service Worker, se precargan automáticamente:

```
index.html
login.html
register.html
student-dashboard.html
evaluator-dashboard.html
admin-dashboard.html
submit-work.html
encuesta-satisfaccion.html
download.html
css/style.css
js/config.js
js/api-client.js
js/app.js
js/evaluation-assignment.js
manifest.json
favicon.ico
favicon.jpg
Bootstrap 5.1 CSS (CDN)
Bootstrap 5.1 JS (CDN)
```

---

## Web App Manifest (`manifest.json`)

### Propiedades clave

| Propiedad | Valor | Efecto |
|---|---|---|
| `display: standalone` | Sin barra de navegador | Experiencia app-like |
| `start_url: index.html` | Página de inicio | Al abrir desde icono |
| `orientation: portrait` | Bloquea orientación | Consistencia visual |
| `icons` | 192px + 512px | Icono para home screen |

### Instalación

El navegador muestra automáticamente un prompt de instalación cuando:
1. El sitio se visita al menos 2 veces
2. Con al menos 5 minutos entre visitas
3. El Service Worker está registrado y activo

También hay un botón manual en `index.html`:

```javascript
// En app.js — manejo del evento beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});
```

---

## Actualizaciones

Cuando se despliega una nueva versión:

1. El Service Worker se actualiza en segundo plano
2. Espera a que todas las pestañas del sitio se cierren
3. En la siguiente visita, el nuevo SW toma el control

Para forzar una actualización inmediata:
```javascript
// service-worker.js
self.skipWaiting();   // Activar nuevo SW inmediatamente
self.clients.claim(); // Tomar control de todas las pestañas
```

### Para el desarrollador

Al hacer cambios, incrementa `CACHE_NAME` en `service-worker.js`:

```javascript
const CACHE_NAME = 'labiq-v3'; // ← Incrementar con cada despliegue
```

Esto crea un nuevo caché y elimina los anteriores.

---

## Consideraciones offline

### ¿Qué funciona sin conexión?
- Navegación por páginas ya visitadas
- Visualización de contenido estático (CSS, JS, imágenes)
- Lectura de datos cacheados del GET API

### ¿Qué requiere conexión?
- Envío de formularios (login, registro, evaluaciones)
- Subida de archivos PDF
- POST a la API de Google Apps Script
- Visualización de datos no cacheados

---

## Límites de almacenamiento

| Almacenamiento | Límite en Chrome |
|---|---|
| Cache Storage | ~6 GB por origen |
| localStorage | ~10 MB |

El sistema almacena en caché aproximadamente **2-3 MB** de assets, dejando espacio suficiente para datos de API.
