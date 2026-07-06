# Cómo generar certificados para ganadores

> **Problema:** Necesitas crear certificados personalizados para los trabajos ganadores
> **Solución:** Generación automatizada desde plantilla de Google Slides

---

## Requisitos previos

- Haber completado la **Fase 2** (evaluación en vivo)
- Tener una **plantilla de Google Slides** configurada con `{{placeholders}}`
- Configurar las variables en `Code.gs`:
  - `TEMPLATE_ID` — ID de la plantilla de Slides
  - `CERTIFICATES_FOLDER_ID` — Carpeta de Drive donde guardar los certificados

---

## Generar certificado individual

1. Ve a la sección **"Ganadores"** en el panel de administración
2. Localiza el trabajo deseado
3. Haz clic en **"Generar certificado"**
4. El sistema:
   - Copia la plantilla de Slides
   - Reemplaza los marcadores con los datos del trabajo
   - Guarda la copia en la carpeta de certificados
   - Devuelve el enlace al archivo editable

---

## Generar certificados masivos (12 ganadores)

Ejecuta la función `generarPremiacionMasiva()` desde el editor de Google Apps Script:

```javascript
// En el editor de Apps Script, ejecuta:
generar Premiacion Masiva();
```

Esto genera automáticamente certificados para:

| Ciclo | Oral (top 2) | Cartel (top 2) |
|---|---|---|
| **Básico** | 1er y 2do lugar | 1er y 2do lugar |
| **Intermedio** | 1er y 2do lugar | 1er y 2do lugar |
| **Terminal** | 1er y 2do lugar | 1er y 2do lugar |

**Total:** 12 certificados editables.

---

## Marcadores disponibles en la plantilla

| Marcador | Reemplazado por |
|---|---|
| `{{INTEGRANTES}}` | Nombres del equipo |
| `{{TITULO}}` | Título del trabajo |
| `{{PROFESOR}}` | Profesor a cargo |
| `{{MODALIDAD}}` | "Ponencia Oral" o "Cartel" |
| `{{LUGAR}}` | Lugar obtenido (ej: "1er Lugar Ponencia - Ciclo Básico") |
| `{{FECHA}}` | Fecha actual de generación |

---

## Notas importantes

- Los certificados se generan como **archivos editables** de Google Slides
- Puedes modificar el diseño después de generados
- Los archivos se guardan en la carpeta configurada en `CERTIFICATES_FOLDER_ID`
- Si alguna presentación no cumple con el formato de marcadores, la generación fallará silenciosamente
