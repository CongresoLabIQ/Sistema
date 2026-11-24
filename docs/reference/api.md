# API Reference

> **Endpoint base:** `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
> **Configurado en:** `js/config.js` como `GOOGLE_SCRIPT_URL`

---

## Métodos GET

### `getWorks`

Obtiene todos los trabajos con nombre del estudiante.

```
GET ?action=getWorks
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "short_id": "A01",
      "student_id": "...",
      "title": "Título del trabajo",
      "abstract": "Resumen...",
      "status": "pending",
      "semester": "5to Semestre",
      "student_name": "Ana López",
      "final_score": "",
      "live_score": "",
      "team_members": "Ana López, Juan Pérez",
      "grupo": "Grupo A",
      "profesor_cargo": "Dr. García",
      "file_url": "https://drive.google.com/...",
      "auditorio": "",
      "horario": ""
    }
  ]
}
```

---

### `getStudentWorks`

Obtiene los trabajos de un estudiante específico.

```
GET ?action=getStudentWorks&studentId={id}
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `studentId` | string | UUID del estudiante |

Los trabajos `accepted_oral` con presentación subida incluyen además `presentation_url`, `presentation_file_id` y `presentation_updated_at`.

---

### `getEvaluators`

Obtiene la lista de usuarios evaluadores.

```
GET ?action=getEvaluators
```

---

### `getAssignments`

Obtiene todas las asignaciones con datos del trabajo, evaluador y evaluación (si existe).

```
GET ?action=getAssignments
```

**Respuesta:** Array de objetos con:
```json
{
  "id": "...",
  "work_id": "...",
  "evaluator_id": "...",
  "status": "assigned | completed",
  "assigned_at": "Date",
  "completed_at": "Date | null",
  "works": { ... },
  "user_profiles": { ... },
  "total_score": 85.0,
  "evaluation": { ... }
}
```

---

### `getLiveAssignments`

Obtiene asignaciones de Fase 2 (evaluación en vivo).

```
GET ?action=getLiveAssignments
```

---

### `getProfessorsBySemester`

Obtiene el catálogo de profesores filtrado por semestre.

```
GET ?action=getProfessorsBySemester&semester={semestre}
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `semester` | string | Ej: `"5to Semestre"` |

---

### `getWinners`

Obtiene los ganadores calculados por puntuación en vivo.

```
GET ?action=getWinners
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "oral": [/* top 3 oral */],
    "poster": [/* top 3 poster */],
    "porCiclo": [
      {
        "ciclo_nombre": "Básico",
        "oral": [/* top 2 oral del ciclo */],
        "poster": [/* top 2 poster del ciclo */]
      }
    ]
  }
}
```

---

### `getLiveAdminDashboard`

Panel de operación en vivo. Requiere un administrador válido.

```
GET ?action=getLiveAdminDashboard&admin_user_id={uuid}
```

**Respuesta:** `{ success, data: { works, evaluators, liveAssignments, helpRequests, serverTime } }`. Cada evaluador incluye `status`, `activeRecently`, `phase1Done/phase1Assigned`, `phase2Done/phase2Assigned`, `totalDone` y `assigned`.

---

### `getPendingHelpSummary`

Resumen ligero de solicitudes de ayuda pendientes (para polling).

```
GET ?action=getPendingHelpSummary
```

**Respuesta:** `{ success, data: { count, lastMessage, evaluators } }`.

---

## Métodos POST

Todas las peticiones POST usan `Content-Type: text/plain;charset=utf-8` con body JSON.

### Autenticación

#### `login`

```json
{
  "action": "login",
  "email": "usuario@ejemplo.com",
  "password": "mi_contraseña"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid" },
    "profile": {
      "id": "uuid",
      "email": "usuario@ejemplo.com",
      "name": "Nombre",
      "user_type": "student | evaluator | admin",
      "grupos_imparte": "..."
    }
  }
}
```

#### `register`

```json
{
  "action": "register",
  "email": "nuevo@ejemplo.com",
  "password": "mi_contraseña",
  "name": "Nombre Completo",
  "user_type": "student | evaluator",
  "grupos_imparte": "",
  "admin_code": "código_evaluador (solo si user_type=evaluator)"
}
```

---

### Trabajos

#### `submitWork`

```json
{
  "action": "submitWork",
  "student_id": "uuid",
  "title": "Título",
  "abstract": "Resumen",
  "semester": "5to Semestre",
  "group": "Grupo A",
  "professor_cargo": "Dr. García",
  "team_members": "Ana, Juan, María",
  "fileName": "trabajo.pdf",
  "fileBase64": "base64 del PDF (sin prefijo data:)..."
}
```

**Respuesta:**
```json
{
  "success": true,
  "shortId": "A01"
}
```

---

### Asignaciones

#### `assignWork`

```json
{
  "action": "assignWork",
  "work_id": "uuid",
  "evaluator_id": "uuid"
}
```

#### `assignAllPending`

```json
{
  "action": "assignAllPending"
}
```

Asigna automáticamente hasta 3 evaluadores a cada trabajo pendiente, evitando conflictos de grupo.

---

### Evaluaciones

#### `submitEvaluation`

```json
{
  "action": "submitEvaluation",
  "work_id": "uuid",
  "evaluator_id": "uuid",
  "assignment_id": "uuid",
  "total_score": 85,
  "score_pertinencia": 8,
  "cumple_extension": true,
  "comentarios": "Buen trabajo, pero mejorar metodología..."
}
```

#### `submitLiveEvaluation`

```json
{
  "action": "submitLiveEvaluation",
  "work_id": "uuid",
  "evaluator_id": "uuid",
  "assignment_id": "uuid",
  "total_score": 90,
  "s1": 15,
  "s2": 15,
  "s3": 15,
  "s4": 10,
  "s5": 10,
  "s6": 10,
  "comments": "Excelente presentación"
}
```

---

### Dictaminación

#### `batchFinalize`

```json
{
  "action": "batchFinalize"
}
```

Ejecuta el algoritmo completo de dictaminación (ver [Explicación del flujo](../explanation/evaluation-flow.md)).

---

### Fase 2

#### `assignLiveWorks`

```json
{
  "action": "assignLiveWorks"
}
```

#### `notifyJudgesAgenda`

```json
{
  "action": "notifyJudgesAgenda"
}
```

---

### Operación en vivo

Todas las acciones de este bloque validan permisos en el servidor. Los ID de administrador y evaluador son UUID de la hoja `users`.

#### `setEvaluatorStatus`

```json
{
  "action": "setEvaluatorStatus",
  "admin_user_id": "uuid",
  "evaluator_id": "uuid",
  "status": "available | busy | absent | finished"
}
```

#### `markEvaluatorAbsent` / `reactivateEvaluator`

```json
{
  "action": "markEvaluatorAbsent",
  "admin_user_id": "uuid",
  "evaluator_id": "uuid"
}
```

```json
{
  "action": "reactivateEvaluator",
  "admin_user_id": "uuid",
  "evaluator_id": "uuid"
}
```

#### `requestHelp`

```json
{
  "action": "requestHelp",
  "user_id": "uuid",
  "message": "Necesito apoyo con la rúbrica"
}
```

Guarda la solicitud en `help_requests`. Si la clave `help_email` está configurada, también envía un correo de aviso. **No usa Web Push.**

#### `resolveHelpRequest`

```json
{
  "action": "resolveHelpRequest",
  "admin_user_id": "uuid",
  "request_id": "uuid",
  "status": "acknowledged | resolved"
}
```

#### `reassignLiveEvaluator`

```json
{
  "action": "reassignLiveEvaluator",
  "admin_user_id": "uuid",
  "work_id": "uuid",
  "old_evaluator_id": "uuid",
  "new_evaluator_id": "uuid",
  "reason": "Ausencia confirmada"
}
```

Valida conflictos de asesoría, actualiza `live_assignments`, marca al evaluador original como `finished` y deja auditoría en `reassign_log`.

---

### Correos y horarios

#### `notifyFinalResults`

```json
{
  "action": "notifyFinalResults",
  "admin_user_id": "uuid"
}
```

Respuesta: `{ success, count }`.

#### `notifyEventReminder`

```json
{
  "action": "notifyEventReminder",
  "admin_user_id": "uuid"
}
```

Respuesta: `{ success, count, skipped, errores }`.

#### `notifyAgendaCorrection`

```json
{
  "action": "notifyAgendaCorrection",
  "admin_user_id": "uuid",
  "facultad": "FQ"
}
```

`facultad` es opcional; si se omite, se envía a todos los evaluadores con asignaciones de Fase 2.

#### `assignSchedules`

```json
{
  "action": "assignSchedules",
  "admin_user_id": "uuid"
}
```

En modo Congreso mantiene el reparto por ciclo en `asignarSalasFESZ`. En modo Encuentro (`encuentroiq_mode=1`) usa `Auditorio Principal` con turnos de 20 minutos y conserva horarios válidos sin empalmes. Respuesta: `{ success, orales, carteles, auditorio }`.

#### `importFesZaragoza`

```json
{
  "action": "importFesZaragoza",
  "admin_user_id": "uuid",
  "works_csv_url": "https://docs.google.com/spreadsheets/d/.../edit#gid=0",
  "users_csv_url": "https://docs.google.com/spreadsheets/d/.../edit#gid=1"
}
```

`users_csv_url` es opcional. Se aceptan URLs de hoja de cálculo (se convierten a CSV) o URLs CSV directas. Respuesta: `{ success, imported, alumnosCreados, omitidos, errores }`.

---

### Fase 2: presentaciones y premiación

#### `submitPresentation`

```json
{
  "action": "submitPresentation",
  "student_id": "uuid",
  "work_id": "uuid",
  "fileName": "presentacion.pdf",
  "fileBase64": "base64 sin prefijo data:..."
}
```

Solo para trabajos `accepted_oral` del autor y antes de `presentation_deadline`. Acepta PDF/PPTX. Respuesta: `{ success, fileUrl }` o `{ success: false, error }`.

#### `generatePremiacionMasiva`

```json
{
  "action": "generatePremiacionMasiva",
  "admin_user_id": "uuid"
}
```

Genera editables y PDF individuales; intenta además un PDF global (requiere el servicio avanzado Slides API) y envía el PDF global por correo si está definida la clave `awards_email`. Respuesta: `{ success, count }`.

---

### Certificados

#### `generateCertificates`

```json
{
  "action": "generateCertificates",
  "work_id": "uuid"
}
```

La constancia usa el lugar calculado por `obtenerGanadoresConLugar` (por ejemplo `1er Lugar Ponencia Oral`) o `Participación`. Respuesta: `{ success, fileUrl, lugar }`.

---

### Recuperación de contraseña

#### `forgotPassword`

```json
{
  "action": "forgotPassword",
  "email": "usuario@ejemplo.com"
}
```

#### `resetPassword`

```json
{
  "action": "resetPassword",
  "token": "uuid",
  "password": "nueva_contraseña"
}
```

---

## Códigos de error

Todas las respuestas de error siguen el formato:

```json
{
  "success": false,
  "error": "Mensaje descriptivo del error"
}
```

| Error común | Causa |
|---|---|
| `Credenciales inválidas` | Email o contraseña incorrectos |
| `Email ya registrado` | Intento de registro con email existente |
| `Código de acceso docente incorrecto` | Código de evaluador inválido |
| `Conflicto: El profesor tiene relación directa...` | Conflicto de grupo/profesor en asignación |
| `Token inválido o expirado` | Token de reset usado o vencido |
| `Permiso denegado: se requiere rol de administrador.` | Falta un `admin_user_id` válido en una acción protegida |
| `No autenticado: usuario no encontrado.` | El `user_id` de la sesión no existe en `users` |
| `La hoja works no tiene las columnas auditorio/horario.` | Falta alguna columna en `works` para `assignSchedules` |
| `Solo se permiten archivos PDF o PPTX.` | Extensión no válida en `submitPresentation` |
