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
| `facultad` | string (opcional) | Facultad (`FQ`, `FC`, `FZ` o nombre completo). La usan la importación y los horarios en modo Encuentro |
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
| `profesor_email` | string | Correo del profesor/asesor a notificar al registrar el trabajo |
| `final_score` | number | Puntuación promedio final |
| `feedback` | string | Retroalimentación combinada de evaluadores |
| `auditorio` | string | Sala asignada (`UMIEZ`, `Auditorio Principal`) o `Área de Carteles` en modo Encuentro |
| `horario` | string | Hora asignada (ej: `10:00`) o `Sesión Carteles` para carteles |
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

## live_evaluator_status (se crea sola)

Estado operativo de los evaluadores durante el evento. La actividad automática actualiza `last_activity`; los estados manuales (`absent`, `finished`) no son sobrescritos por esa actividad.

| Columna | Tipo | Descripción |
|---|---|---|
| `evaluator_id` | string | UUID del evaluador |
| `status` | enum | `available`, `busy`, `absent`, `finished` |
| `last_activity` | datetime | Última acción registrada del evaluador |
| `updated_at` | datetime | Última modificación del estado |

---

## oral_presentations (se crea sola)

Archivos de presentación oral subidos en Fase 2 (uno por trabajo; una nueva subida reemplaza el registro).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `work_id` | string | UUID del trabajo (`accepted_oral`) |
| `student_id` | string | UUID del estudiante que subió el archivo |
| `file_name` | string | Nombre original del archivo |
| `mime_type` | string | Tipo MIME (PDF o PPTX) |
| `file_size` | number | Tamaño en bytes |
| `file_id` | string | ID del archivo en Drive |
| `file_url` | string | URL de visualización del archivo |
| `uploaded_at` | datetime | Fecha de la primera subida |
| `updated_at` | datetime | Fecha de la última actualización |

---

## help_requests (se crea sola)

Solicitudes de ayuda enviadas por los evaluadores. No usa Web Push; el aviso opcional por correo se controla con la clave `help_email`.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `evaluator_id` | string | UUID del evaluador |
| `evaluator_name` | string | Nombre del evaluador |
| `message` | string | Mensaje (máx. 500 caracteres) |
| `status` | enum | `pending`, `acknowledged`, `resolved` |
| `created_at` | datetime | Fecha de la solicitud |
| `resolved_at` | datetime | Fecha de resolución |
| `resolved_by` | string | UUID del administrador que atendió la solicitud |

---

## reassign_log (se crea sola)

Auditoría de sustituciones de evaluadores en asignaciones de Fase 2.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único |
| `work_id` | string | UUID del trabajo reasignado |
| `old_evaluator_id` | string | Evaluador original |
| `new_evaluator_id` | string | Evaluador sustituto |
| `by_admin_id` | string | Administrador que hizo el cambio |
| `reason` | string | Motivo capturado en el panel |
| `timestamp` | datetime | Fecha del cambio |

---

## config

Pares clave-valor para configuración del sistema.

| Columna | Tipo | Descripción |
|---|---|---|
| Clave | string | `event_date`, `evaluator_code`, `submission_deadline`, `presentation_deadline`, `encuentroiq_mode`, `help_email`, `contacto_evento`, `awards_email` |
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
