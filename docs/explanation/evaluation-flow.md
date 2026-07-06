# Flujo de evaluación

> **Audiencia:** Administradores y desarrolladores que desean entender el pipeline completo de evaluación

---

## Las dos fases

El congreso utiliza un sistema de **evaluación en dos fases**:

```
Fase 1 (Documental)              Fase 2 (Presentación)
─────────────────────            ─────────────────────
Evaluación de trabajos           Evaluación de presentaciones
escritos mediante rúbrica        orales/cartel en vivo
   ↓                                     ↓
3 evaluadores por trabajo         Jurados asignados por sala
Rúbrica de 8 criterios (100 pts) 6 criterios temáticos
```

---

## Fase 1: Evaluación documental

### 1. Asignación

Cada trabajo recibe **3 evaluadores**, seleccionados con estas reglas:

1. **Filtro de conflicto:** Se excluyen evaluadores que:
   - Imparten clases al mismo grupo del trabajo (`tieneConflictoDeGrupo`)
   - Son el profesor a cargo del trabajo (`esAutoEval`)
2. **Balance de carga:** Los evaluadores con menos asignaciones actuales tienen prioridad
3. **Distribución:** Se asignan hasta 3 evaluadores por trabajo

### 2. Rúbrica

| # | Criterio | Peso | ¿Qué mide? |
|---|---|---|---|
| 1 | Pertinencia | 10 pts | Relevancia para la ingeniería química |
| 2 | Objetivos | 10 pts | Claridad y pertinencia de los objetivos |
| 3 | Marco teórico | 10 pts | Fundamentación y antecedentes |
| 4 | Metodología | 15 pts | Descripción del método y procedimiento |
| 5 | Resultados | 20 pts | Presentación y análisis de resultados |
| 6 | Conclusiones | 10 pts | Coherencia y aportaciones |
| 7 | Bibliografía | 10 pts | Calidad y formato de referencias |
| 8 | Redacción | 15 pts | Ortografía, claridad y estructura |

**Total: 100 puntos**

### 3. Evaluación de extensión

El evaluador indica si el trabajo **cumple con la extensión** requerida. Si **cualquier** evaluador marca "No", el trabajo se rechaza automáticamente, sin importar su puntuación.

---

## Dictaminación masiva (`batchFinalize`)

### Algoritmo

```
Entrada: works + evaluations
Salida: Cada work con status actualizado

Para cada work con >= 2 evaluaciones:
  Si alguna evaluation.cumple_extension == 'no':
    status = rejected
    continue

  avgScore = promedio(total_score)
  avgPert = promedio(score_pertinencia)

  Si avgScore < 60 O avgPert < 6:
    status = rejected
    continue

  // Clasificación intra-semestre
  Si rank == 0:  // Mejor puntuado del semestre
    status = accepted_oral
    sala = UMIEZ
  Si rank == 1:  // Segundo mejor
    status = accepted_oral
    sala = Auditorio Principal
  Si rank >= 2:
    status = accepted_poster
```

### Generación de horarios

Para presentaciones orales:

1. Se agrupan por sala (UMIEZ, Auditorio Principal)
2. Dentro de cada sala, se intercalan ciclos: Básico → Intermedio → Terminal
3. El orden dentro de cada ciclo es aleatorio (shuffle)
4. Cada presentación recibe **20 minutos**
5. Inicio: **10:00 AM**

### Notificaciones

Se envía correo a cada estudiante con:
- Resultado (aceptado/rechazado)
- Lugar y hora (si aplica)
- Retroalimentación textual de todos los evaluadores

---

## Fase 2: Evaluación en vivo

### Asignación de jurados

Los evaluadores se dividen en dos grupos:
- **Grupo A** (primera mitad): Evalúa en UMIEZ
- **Grupo B** (segunda mitad): Evalúa en Auditorio Principal

Ambos grupos evalúan pósters.

### Rúbrica de presentación

| Criterio | Descripción |
|---|---|
| S1 — Material didáctico | Calidad de diapositivas/apoyos visuales |
| S2 — Dominio del tema | Conocimiento y profundidad |
| S3 — Claridad | Exposición clara y estructurada |
| S4 — Estructura | Organización de la presentación |
| S5 — Tono de voz | Volumen, ritmo y entusiasmo |
| S6 — Tiempo | Ajuste al tiempo asignado |

### Cálculo de ganadores

```
live_score = promedio(total_score de todos los jurados)
```

Los ganadores se determinan por ciclo académico:

| Ciclo | Semestres | Premios |
|---|---|---|
| **Básico** | 1ro - 3ro | Top 2 oral + Top 2 cartel |
| **Intermedio** | 4to - 6to | Top 2 oral + Top 2 cartel |
| **Terminal** | 7mo - 9no | Top 2 oral + Top 2 cartel |

**Total: 12 ganadores** (6 oral + 6 cartel)

---

## Diagrama de estados del trabajo

```
                ┌──────────┐
                │ Pending  │
                └────┬─────┘
                     │ Asignación de evaluadores
                     ▼
             ┌──────────────┐
             │ Under Review │
             └──────┬───────┘
                    │ Dictaminación
                    ▼
         ┌──────────┼──────────┐
         ▼                     ▼
   ┌────────────┐        ┌──────────┐
   │ Aceptado   │        │ Rejected │
   │ (oral o    │        └──────────┘
   │  póster)   │
   └──────┬─────┘
          │ Evaluación en vivo
          ▼
   ┌──────────────┐
   │ Live Score   │ → Ganadores
   └──────────────┘
```

---

## Reglas de negocio clave

1. **Mínimo 2 evaluaciones** por trabajo para dictaminar
2. **Cualquier "no cumple extensión"** → rechazo automático
3. **Pertinencia < 6** → rechazo (incluso con puntuación alta)
4. **Score total < 60** → rechazo
5. **Top 2 por semestre** → oral (el resto aceptado va a póster)
6. **20 minutos** por presentación oral
7. **12 certificados** de ganadores (2 por categoría × 3 ciclos × 2 modalidades)
