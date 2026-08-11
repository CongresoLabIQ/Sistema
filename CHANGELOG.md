# Changelog

## [1.4.0] — 2026-08-10

### Added
- **Página 404 personalizada:** `404.html` con icono SVG, título, descripción y botón "Volver al Inicio".
- **Tutoriales interactivos:** `tutorial-estudiante.html` y `tutorial-evaluador.html` con overlay guiado, simuladores de registro/envío, práctica de rúbricas con sliders y mini-quiz final.
- **Modo oscuro completo:** Toggle fijo (sol/luna) en todas las páginas. Persiste en localStorage (`congresoLabIQ_theme`). Sobreescribe variables CSS `--primary` a `#4d9de0` y `--accent` a `#f0b830` en fondo oscuro. Overrides para Bootstrap y estados vacíos.
- **Skip link (accesibilidad):** Enlace "Saltar al contenido principal" en todas las páginas. Visible al hacer Tab. Apunta a `<main id="mainContent">`.
- **Toast accesible:** Contenedor `#toastContainer` con `role="status"` + `aria-live="polite"`; los toasts son anunciados por lectores de pantalla.
- **Meta descriptions SEO:** `<meta name="description">` en todas las páginas HTML del proyecto.
- **Empty state mejorado (student-dashboard):** Icono SVG en círculo, título descriptivo, texto explicativo y botón CTA "Enviar mi primer trabajo" (solo si las subidas están activas).
- **Split-view del evaluador:** Panel dividido PDF (50%) + rúbrica (50%) en desktop; modal en móvil. `getEmbeddablePdfUrl()` convierte URLs de Drive al formato `/preview`.
- **Bottom nav del administrador:** Navegación inferior fija con iconos SVG (Dashboard, Horarios, Fase 2). Reemplaza el sidebar.
- **Dashboard unificado (admin):** Pendientes, Dictaminar y Asignaciones fusionados en una sola vista con tabla de seguimiento filtrable.
- **Reconocimientos (Fase 2):** Pestaña dedicada para ganadores con medallas SVG y generación de constancias.
- **Backend `assignManualLive`:** Endpoint de asignación manual de emergencia Fase 2 con validación de duplicados y conflictos (bloquea evaluadores de la misma facultad).
- **Persistencia completa en Fase 2:** `submitLiveEvaluation` guarda los 8 sliders, los 10 checklist y el comentario en `live_evaluations`.
- **Botón flotante de cierre de sesión:** En student, evaluator y admin, con confirmación antes de salir.
- **Skeleton loading:** En los 3 dashboards (student, evaluator, admin).
- **Archivos del repositorio:** `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `.gitignore`, `.editorconfig`, `CHANGELOG.md` y GitHub Actions CI con plantillas de issues.

### Changed
- **Dark mode del evaluador:** `evaluator-dashboard.html` no carga `js/app.js`, por lo que inicializa el tema con script inline usando la misma clave `congresoLabIQ_theme`.
- **Refactor TECH-001/003/004:** Helper `esAutoEvaluacion(work, evaluator)` (compara contra cada asesor) usado en `assignWork`, `assignAllPending` y `assignLiveWorks`; `submitLiveEvaluation` reescrito con escritura por headers dinámicos.
- **Tema del Congreso en dashboards:** Clases `bg-unam`, `text-primary-theme`, `btn-unam`, `badge-oral`, `btn-outline-accent` y `eval-pdf-panel` en Fase 2 del evaluador y paneles.
- **Footer institucional:** Entidades participantes (FES Cuautitlán, FES Zaragoza, Facultad de Química) y contacto `sistema.congresolabiq@gmail.com`.
- **Tipografía y color institucional:** Preload de Playfair Display + Inter; `theme-color` `#002147`.

### Fixed
- **BUG-001:** Badge de estatus con colores semánticos en dark mode.
- **Auto-evaluación con lista de asesores:** El chequeo "mismo profesor" ahora compara contra cada asesor separado por coma en asignaciones Fase 1 y Fase 2.
- **Body del admin sin `has-bottom-nav`:** Se agregó la clase faltante, corrigiendo el padding inferior y la posición del botón flotante sobre el bottom nav.

## [1.3.0] — 2026-07-13

Historial previo del proyecto Congreso LABIQ (registro, envío de resúmenes, evaluación por rúbrica, dictaminación, horarios y certificados).
