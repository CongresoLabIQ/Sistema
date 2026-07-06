# API Client — Referencia del frontend

> Módulo JavaScript que encapsula todas las llamadas al backend de Google Apps Script.
> **Archivo:** `js/api-client.js`

---

## Gestión de sesión

### `saveSession(user)`
Guarda el perfil del usuario en `localStorage`.

### `getSession()`
Recupera el perfil del usuario desde `localStorage`.

### `logoutUser()`
Elimina la sesión de `localStorage`.

---

## Métodos del cliente

### Autenticación

| Método | Parámetros | Descripción |
|---|---|---|
| `loginUser(email, password)` | email, password | Inicia sesión y guarda sesión |
| `registerUser(email, password, name, userType, groups, adminCode)` | Datos de registro | Crea nueva cuenta |
| `checkAuth()` | — | Verifica sesión activa |

### Trabajos

| Método | Parámetros | Descripción |
|---|---|---|
| `getAllWorks()` | — | Obtiene todos los trabajos (admin) |
| `getStudentWorks(studentId)` | studentId | Obtiene trabajos de un estudiante |
| `submitWork(workData, file, onProgress)` | workData, File, callback | Sube trabajo con PDF (barra de progreso) |

### Asignaciones

| Método | Parámetros | Descripción |
|---|---|---|
| `getEvaluators()` | — | Lista de evaluadores |
| `getAssignments()` | — | Todas las asignaciones con datos enriquecidos |
| `assignWork(workId, evaluatorId)` | workId, evaluatorId | Asignación manual |
| `assignAllPending()` | — | Asignación automática masiva |

### Evaluaciones

| Método | Parámetros | Descripción |
|---|---|---|
| `submitEvaluation(evaluationData)` | Objeto con evaluación | Envía evaluación Fase 1 |
| `submitLiveEvaluation(data)` | Objeto con evaluación en vivo | Envía evaluación Fase 2 |
| `batchFinalize()` | — | Ejecuta dictaminación masiva |

### Fase 2

| Método | Parámetros | Descripción |
|---|---|---|
| `assignLiveWorks()` | — | Asigna jurados para presentaciones |
| `getLiveAssignments()` | — | Obtiene asignaciones en vivo |
| `notifyJudgesAgenda()` | — | Envía agendas por correo |

### Certificados y ganadores

| Método | Parámetros | Descripción |
|---|---|---|
| `getWinners()` | — | Obtiene ganadores calculados |
| `generateCertificates(workId)` | workId | Genera certificado individual |

### Catálogo

| Método | Parámetros | Descripción |
|---|---|---|
| `getProfessorsBySemester(semester)` | semester | Profesores filtrados por semestre |

### Recuperación de contraseña

| Método | Parámetros | Descripción |
|---|---|---|
| `forgotPassword(email)` | email | Solicita enlace de recuperación |
| `resetPassword(token, password)` | token, password | Restablece contraseña |

### Método genérico

| Método | Parámetros | Descripción |
|---|---|---|
| `post(data)` | Objeto con action | Llamada POST genérica |

---

## Funciones helper

### `postData(data)`
Función interna que realiza la petición POST al endpoint.

```javascript
async function postData(data) {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
        redirect: "follow",
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
    });
    return await res.json();
}
```

### `toBase64(file)`
Convierte un archivo a base64 usando FileReader.

### `postDataProgress(body, onProgress)`
Versión con XHR que soporta seguimiento de progreso de subida.

---

## Exposición global

```javascript
window.apiClient = apiClient;
window.supabaseClient = apiClient; // compatibilidad
```

Ambos nombres están expuestos globalmente para compatibilidad con código existente.
