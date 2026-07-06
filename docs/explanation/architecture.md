# Arquitectura del sistema

> **Audiencia:** Desarrolladores y administradores que desean comprender la estructura general del sistema

---

## Visión general

El sistema sigue una **arquitectura de tres capas** utilizando exclusivamente el ecosistema de Google combinado con un frontend estático:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentación (Frontend)                   │
│  HTML5 + Bootstrap 5.1 + Vanilla JS + CSS3                  │
│  Hosting: GitHub Pages / cualquier servidor estático        │
│  PWA: Service Worker + Web App Manifest                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (JSON)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Lógica (Backend)                        │
│  Google Apps Script (Code.gs)                                │
│  • REST-like API con doGet() / doPost()                      │
│  • Hash de contraseñas (SHA-256)                             │
│  • Algoritmos de asignación y dictaminación                  │
│  • Integración con Drive, Slides, MailApp                    │
└────────┬──────────────────────────────────┬──────────────────┘
         │                                  │
         ▼                                  ▼
┌───────────────────┐            ┌────────────────────────┐
│    Datos           │            │    Archivos             │
│  Google Sheets     │            │  Google Drive           │
│  • 9 hojas/tablas  │            │  • PDFs de trabajos    │
│  • Fila = registro │            │  • Plantilla Slides    │
│  • CRUD genérico   │            │  • Certificados        │
└───────────────────┘            └────────────────────────┘
```

---

## Decisiones arquitectónicas

### 1. Sin servidor propio (serverless puro)

**Problema:** El proyecto no cuenta con un servidor backend tradicional ni infraestructura para alojar uno.

**Decisión:** Utilizar **Google Apps Script** como backend, que provee:
- Ejecución serverless sin costo operativo
- Integración nativa con Google Sheets, Drive, Slides y Mail
- Límites generosos para el volumen de un congreso estudiantil

**Compensaciones:**
- ✅ Sin mantenimiento de servidores
- ✅ Sin costos de infraestructura
- ❌ Límite de 30 segundos de ejecución por llamada
- ❌ Sin WebSockets ni tiempo real
- ❌ Sin base de datos relacional (ACID limitado)

### 2. Frontend estático con PWA

**Problema:** Necesidad de una experiencia app-like sin servidor backend dinámico.

**Decisión:** Implementar una **Progressive Web App** con Service Worker que:
- Precachea todos los assets estáticos al instalar
- Usa cache-first para archivos estáticos
- Usa stale-while-revalidate para navegación
- Cachea respuestas de API GET de Google Apps Script

### 3. Google Sheets como base de datos

**Decisión:** Cada hoja funciona como una tabla con:
- Primera fila = encabezados (columnas)
- Filas siguientes = registros
- Función genérica `getSheetData()` para leer cualquier tabla
- Función genérica `updateRow()` para modificar registros

**Limitaciones conocidas:**
- Sin transacciones atómicas entre tablas
- Sin joins nativos (se hacen en JavaScript del backend)
- Sin índices (búsqueda lineal O(n))
- Límite de 10 millones de celdas por hoja

---

## Flujo de datos

### Request-response típico

```
1. Usuario interactúa con HTML
2. JavaScript llama a apiClient.metodo()
3. fetch() a GOOGLE_SCRIPT_URL con ?action= o POST body
4. Apps Script ejecuta doGet() o doPost()
5. Lee/escribe en Google Sheets / Drive
6. Retorna JSON { success: true, data: [...] }
7. JavaScript actualiza el DOM
```

### Autenticación

```
1. Usuario envía email + password
2. Backend hashea con SHA-256
3. Compara con hash almacenado
4. Retorna perfil del usuario
5. Frontend guarda en localStorage
6. Cada página verifica getSession() al cargar
```

> ⚠️ **Nota de seguridad:** No se usan JWT, OAuth ni tokens de sesión. La sesión se almacena en texto plano en localStorage.

---

## Componentes del frontend

| Componente | Archivo | Responsabilidad |
|---|---|---|
| **Router de páginas** | `app.js` | Protección de rutas según rol, redirección post-login |
| **API Client** | `api-client.js` | Todas las llamadas al backend, manejo de sesión |
| **Evaluación** | `evaluation-assignment.js` | Clase para asignación y seguimiento de evaluaciones |
| **Estilos** | `style.css` | Tema institucional UNAM (azul #002147, oro #C6930C) |
| **Service Worker** | `service-worker.js` | Cacheo offline, actualización de assets |

---

## Consideraciones de escalabilidad

El sistema está diseñado para un **congreso estudiantil típico** (50-200 trabajos, 20-40 evaluadores). Para escalar a volúmenes mayores:

| Límite actual | Recomendación para escalar |
|---|---|
| Google Sheets: ~10M celdas | Migrar a Firestore o PostgreSQL |
| Apps Script: 30s por ejecución | Migrar a Cloud Functions + Node.js |
| localStorage: ~5-10 MB | Migrar a IndexedDB o backend de sesión |
| MailApp: 100 destinatarios/día | Migrar a Gmail API o SendGrid |
