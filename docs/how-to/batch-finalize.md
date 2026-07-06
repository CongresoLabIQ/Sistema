# Cómo ejecutar la dictaminación masiva

> **Problema:** Necesitas finalizar todas las evaluaciones y generar resultados automáticamente
> **Solución:** Usar la función `batchFinalize` desde el panel de administración

---

## Requisitos previos

- Al menos **2 de 3 evaluadores** deben haber completado su evaluación por trabajo
- Los evaluadores deben haber marcado el campo `cumple_extension`

---

## Ejecutar la dictaminación

1. Inicia sesión como **administrador**
2. En la barra lateral, ve a la sección **"✅ Dictaminar"**
3. Haz clic en el botón **"Ejecutar dictaminación masiva"**
4. Espera el mensaje de confirmación

---

## ¿Qué hace exactamente?

### 1. Cálculo de puntuaciones
```
avgScore = (eval1.total_score + eval2.total_score + eval3.total_score) / n
avgPertinencia = (eval1.pertinencia + eval2.pertinencia + eval3.pertinencia) / n
```

### 2. Reglas de rechazo
| Condición | Resultado |
|---|---|
| Algún evaluador marcó `cumple_extension = no` | **Rechazado** automáticamente |
| Promedio general < 60 pts | **Rechazado** |
| Pertinencia promedio < 6 | **Rechazado** |

### 3. Clasificación
Por cada semestre:

| Ranking | Modalidad | Sala |
|---|---|---|
| 1er lugar | **Oral** | UMIEZ |
| 2do lugar | **Oral** | Auditorio Principal |
| 3er lugar en adelante | **Póster** | — |

### 4. Generación de horarios
- Slots de **20 minutos** por presentación oral
- Intercala ciclos (Básico → Intermedio → Terminal) en cada sala
- Horario de inicio: **10:00 AM**

### 5. Notificación
Se envía un correo automático a cada estudiante con:
- Dictamen (aceptado/rechazado)
- Lugar y hora de presentación (si aplica)
- Retroalimentación de los evaluadores

---

## Verificar resultados

Después de la dictaminación, puedes:

1. Revisar la tabla de trabajos con sus nuevos estados
2. Ir a la sección **"Ganadores"** para ver los resultados por ciclo
3. Proceder a la **Fase 2** (asignación de jurados en vivo)

---

## Notas importantes

- ⚠️ La dictaminación masiva **no se puede deshacer** desde la interfaz
- Los trabajos con menos de 2 evaluaciones completadas **se omiten**
- Los trabajos ya dictaminados (accepted/rejected) **no se modifican**
- Los horarios se generan aleatoriamente dentro de cada ciclo
