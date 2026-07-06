# Tutorial: Administrar el congreso — Guía de inicio rápido

> **Audiencia:** Administradores del sistema del congreso
> **Duración:** 30 minutos (configuración inicial)
> **Resultado:** Congreso configurado, trabajos asignados y evaluación en marcha

---

## Visión general del panel de administración

El panel de administración (`admin-dashboard.html`) tiene las siguientes secciones:

| Sección | Propósito |
|---|---|
| **📊 Dashboard** | Estadísticas generales y tabla de progreso de evaluaciones |
| **📋 Trabajos pendientes** | Asignar evaluadores a trabajos sin revisión |
| **📑 Asignaciones** | Ver detalle de todas las asignaciones |
| **✅ Dictaminar** | Finalizar evaluaciones y generar resultados |
| **📅 Horarios** | Gestionar programación de presentaciones |
| **🎤 Fase 2** | Asignar jurados para presentaciones en vivo |
| **🏆 Ganadores** | Ver ganadores por ciclo y generar certificados |

---

## Paso 1: Configuración inicial (hoja de configuración)

Antes de comenzar, asegúrate de que la hoja `config` en Google Sheets tenga:

| Clave | Valor ejemplo | Descripción |
|---|---|---|
| `event_date` | `15-17 de julio de 2026` | Fecha del congreso |
| `evaluator_code` | `LABIQ2026` | Código para registro de evaluadores |

---

## Paso 2: Revisar trabajos recibidos

1. Inicia sesión como administrador
2. Ve a la sección **Dashboard**
3. Revisa las tarjetas de estadísticas:
   - Total de trabajos recibidos
   - Trabajos pendientes de asignar
   - Evaluaciones completadas
   - Trabajos dictaminados

---

## Paso 3: Asignar evaluadores

### Opción A: Asignación automática (recomendada)

1. Ve a **Trabajos pendientes**
2. Haz clic en **"Asignar todos automáticamente"**
3. El sistema:
   - Toma todos los trabajos con estado `pending`
   - Selecciona hasta **3 evaluadores** por trabajo
   - Evita conflictos de grupo (profesor no evalúa a sus propios alumnos)
   - Distribuye equitativamente la carga de trabajo

### Opción B: Asignación manual

1. Ve a **Trabajos pendientes**
2. Junto a cada trabajo, haz clic en **"Asignar"**
3. Selecciona un evaluador de la lista desplegable
4. Confirma la asignación

> ✓ El trabajo cambia automáticamente a estado `under_review`

---

## Paso 4: Dar tiempo a los evaluadores

Los evaluadores necesitan tiempo para completar sus revisiones. Puedes monitorear el progreso desde el **Dashboard**:

- **⏳ Vacío** — Evaluador no ha comenzado
- **📝 Progreso** — Evaluador guardó un borrador
- **✅ Completado** — Evaluación enviada

---

## Paso 5: Ejecutar dictaminación masiva

Cuando al menos **2 de 3 evaluadores** hayan completado su evaluación:

1. Ve a la sección **Dictaminar**
2. Haz clic en **"Ejecutar dictaminación masiva"**

El sistema automáticamente:

| Acción | Detalle |
|---|---|
| **Calcula promedios** | Promedia puntuaciones y pertinencia de todos los evaluadores |
| **Verifica extensión** | Si algún evaluador marcó "No cumple extensión" → **Rechaza** |
| **Clasifica por semestre** | Agrupa trabajos por semestre académico |
| **Selecciona orales** | **Top 2** de cada semestre → presentación oral (20 min) |
| **Asigna salas** | 1er lugar → **UMIEZ**, 2do lugar → **Auditorio Principal** |
| **Programa horarios** | Slots de 20 minutos intercalando ciclos |
| **Asigna póster** | Resto de trabajos aceptados → sesión de carteles |
| **Rechaza** | Promedio < 60 pts o pertinencia < 6 |
| **Notifica** | Envía correo a cada estudiante con su resultado |

---

## Paso 6: Gestionar Fase 2 (presentaciones)

1. Ve a la sección **Fase 2**
2. Haz clic en **"Asignar jurados en vivo"**
3. El sistema reparte los trabajos aceptados entre los evaluadores disponibles
4. Haz clic en **"Enviar agendas"** para notificar a los jurados sus horarios y sedes

---

## Paso 7: Ver ganadores y generar certificados

1. Ve a la sección **Ganadores**
2. Revisa los ganadores por ciclo académico:
   - **Básico** (1er-3er semestre)
   - **Intermedio** (4to-6to semestre)
   - **Terminal** (7mo-9no semestre)
3. Haz clic en **"Generar certificados"** para crear los reconocimientos editables

Los certificados se generan en Google Slides usando una plantilla con `{{placeholders}}` que se reemplazan automáticamente.

---

## Flujo completo del congreso

```
Registro → Envío → Asignación → Evaluación F1 → Dictaminación
                                                    │
                              ┌─────────────────────┤
                              ▼                     ▼
                         Aceptado               Rechazado
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                  Oral               Póster
                    │                   │
                    ▼                   ▼
           Fase 2 (presentación)    Fase 2 (cartel)
                    │                   │
                    └──────┬────────────┘
                           ▼
                    Generación de
                    certificados
```

---

## Consejos para administradores

- **Ejecuta la asignación automática temprano** — Da máximo tiempo a los evaluadores
- **Monitorea el progreso diario** — Detecta evaluaciones retrasadas
- **Usa la vista de filtros** — Filtra por semestre, estado o evaluador
- **Prueba la generación de certificados** — Asegúrate de que la plantilla funciona antes del evento
- **La agenda se envía por correo** — Verifica que los evaluadores tengan correos válidos
