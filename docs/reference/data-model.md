# Modelo de datos

> El sistema utiliza **Google Sheets** como base de datos. Cada hoja representa una tabla.

---

## users

Registro de todos los usuarios del sistema (estudiantes, evaluadores, administradores).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `email` | string | Correo electrónico (único) |
| `password` | string | Hash SHA-256 (prefijado con `'`) |
| `name` | string | Nombre completo |
| `user_type` | enum | `student`, `evaluator`, `admin` |
| `grupos_imparte` | string | Grupos separados por coma (solo evaluadores) |
| `timestamp` | datetime | Fecha de registro |

---

## works

Trabajos registrados por los estudiantes.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `short_id` | string | ID corto (ej: `A01`). Letra = semestre, número = secuencial |
| `student_id` | string | UUID del estudiante responsable |
| `title` | string | Título del trabajo |
| `abstract` | string | Resumen del trabajo |
| `modality` | string | Modalidad (se asigna en dictaminación) |
| `file_url` | string | URL de Google Drive del PDF |
| `file_id` | string | ID del archivo en Drive |
| `status` | enum | `pending`, `under_review`, `accepted_oral`, `accepted_poster`, `rejected` |
| `submitted_at` | datetime | Fecha de envío |
| `semester` | enum | `1er Semestre` a `9no Semestre` |
| `team_members` | string | Nombres de integrantes separados por coma |
| `grupo` | string | Grupo del estudiante |
| `profesor_cargo` | string | Profesor a cargo del trabajo |
| `final_score` | number | Puntuación promedio final |
| `feedback` | string | Retroalimentación combinada de evaluadores |
| `auditorio` | string | Sala asignada (`UMIEZ`, `Auditorio Principal`) |
| `horario` | string | Hora asignada (ej: `10:00`) |
| `live_score` | number | Puntuación promedio de Fase 2 |

### Prefijos de `short_id` por semestre

| Semestre | Prefijo |
|---|---|
| 1er Semestre | A |
| 2do Semestre | B |
| 3er Semestre | C |
| 4to Semestre | D |
| 5to Semestre | E |
| 6to Semestre | F |
| 7mo Semestre | G |
| 8vo Semestre | H |
| 9no Semestre | I |

---

## assignments

Asignaciones de evaluadores a trabajos (Fase 1).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `work_id` | string | UUID del trabajo |
| `evaluator_id` | string | UUID del evaluador |
| `status` | enum | `assigned`, `completed` |
| `assigned_at` | datetime | Fecha de asignación |
| `completed_at` | datetime | Fecha de finalización |

---

## evaluations

Evaluaciones documentales (Fase 1).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `work_id` | string | UUID del trabajo |
| `evaluator_id` | string | UUID del evaluador |
| `total_score` | number | Puntuación total (0-100) |
| `score_pertinencia` | number | Puntuación de pertinencia (0-10) |
| `cumple_extension` | string | `si` o `no` |
| `comentarios` | string | Retroalimentación del evaluador |
| `timestamp` | datetime | Fecha de evaluación |

---

## live_assignments

Asignaciones de evaluadores a trabajos (Fase 2 — presentaciones en vivo).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `work_id` | string | UUID del trabajo |
| `evaluator_id` | string | UUID del evaluador |
| `status` | enum | `assigned`, `completed` |
| `assigned_at` | datetime | Fecha de asignación |
| `completed_at` | datetime | Fecha de finalización |

---

## live_evaluations

Evaluaciones de presentaciones en vivo (Fase 2).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `work_id` | string | UUID del trabajo |
| `evaluator_id` | string | UUID del evaluador |
| `total_score` | number | Puntuación total |
| `s1` a `s6` | number | Puntuaciones por criterio individual |
| `comments` | string | Comentarios del evaluador |
| `timestamp` | datetime | Fecha de evaluación |

---

## catalog_professors

Catálogo de profesores por semestre.

| Columna | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre del profesor |
| `semester` | string | Semestre al que imparte |

---

## config

Pares clave-valor para configuración del sistema.

| Columna | Tipo | Descripción |
|---|---|---|
| Clave | string | `event_date`, `evaluator_code` |
| Valor | string | Valor correspondiente |

---

## reset_tokens

Tokens para recuperación de contraseña.

| Columna | Tipo | Descripción |
|---|---|---|
| `token` | string (UUID) | Token único |
| `email` | string | Correo del usuario |
| `created_at` | datetime | Fecha de creación |
| `expires_at` | datetime | Fecha de expiración (1 hora) |
| `used` | string | `true` si ya fue utilizado |
