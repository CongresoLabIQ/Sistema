# Cómo asignar evaluadores manualmente

> **Probleplica:** Necesitas asignar un evaluador específico a un trabajo particular
> **Solución:** Asignación manual desde el panel de administración

---

## Asignación manual individual

1. Inicia sesión como **administrador**
2. Ve a la sección **"Trabajos pendientes"** en la barra lateral
3. Localiza el trabajo en la tabla
4. Haz clic en el botón **"Asignar"** en la fila correspondiente
5. En el modal, selecciona un evaluador de la lista desplegable
6. Confirma la asignación

El trabajo cambia automáticamente a estado `under_review`.

---

## Verificación de conflictos

El sistema valida automáticamente que el evaluador:

- ❌ **No pertenezca al mismo grupo** que los estudiantes del trabajo
- ❌ **No sea el profesor a cargo** del trabajo (autoevaluación)
- ✅ Si hay conflicto, verás un mensaje de error y deberás elegir otro evaluador

---

## Asignación automática masiva

Si prefieres asignar **todos los trabajos pendientes** de una sola vez:

```
Dashboard → Trabajos pendientes → "Asignar todos automáticamente"
```

El sistema distribuirá equitativamente la carga entre todos los evaluadores disponibles, respetando las reglas de conflicto.

---

## Verificar asignaciones

Para ver todas las asignaciones activas:

1. Ve a la sección **"Asignaciones"**
2. La tabla muestra:
   - Trabajo, estudiante y evaluador
   - Estado (assigned/completed)
   - Fecha de asignación
   - Puntuación (si ya fue evaluado)

---

## Notas importantes

- Cada trabajo necesita **3 evaluadores** como mínimo
- Los evaluadores solo ven trabajos que les fueron asignados
- Las asignaciones no se pueden deshacer desde la interfaz (contacta al administrador de sheets si es necesario)
