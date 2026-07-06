<div align="center">
  <img src="favicon.jpg" alt="LABIQ Logo" width="120" height="120"/>

  # Congreso LABIQ — Sistema de Evaluación

  **Plataforma integral para la gestión, evaluación y premiación del Congreso Estudiantil de Laboratorios de Ingeniería Química**

  [![UNAM](https://img.shields.io/badge/UNAM-FES%20Zaragoza-002147?style=for-the-badge&labelColor=002147&color=C6930C)](https://www.zaragoza.unam.mx/)
  [![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://script.google.com/)
  [![Bootstrap 5](https://img.shields.io/badge/Bootstrap%205.1-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
  [![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
  [![JavaScript](https://img.shields.io/badge/Vanilla%20JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

  <br/>

  [Inicio rápido](#-inicio-rápido) •
  [Funcionalidades](#-funcionalidades) •
  [Arquitectura](#-arquitectura) •
  [Documentación](docs/) •
  [Contribuir](#-contribuir)

</div>

---

## 📋 Descripción

**Congreso LABIQ** es un sistema web progresivo (PWA) diseñado para gestionar el ciclo completo de participación en el Congreso Estudiantil de Laboratorios de Ingeniería Química de la **FES Zaragoza, UNAM**. Desde el registro de trabajos por parte de los estudiantes hasta la evaluación con rúbrica, asignación de jurados, programación de horarios y generación automatizada de certificados.

> 🏛️ Desarrollado para la **Facultad de Estudios Superiores Zaragoza** — Universidad Nacional Autónoma de México.

---

## ✨ Funcionalidades

### 👨‍🎓 Para Estudiantes
| Funcionalidad | Descripción |
|---|---|
| 📝 **Registro y autenticación** | Creación de cuenta con correo institucional |
| 📄 **Envío de trabajos** | Subida de PDF con metadatos (título, resumen, semestre, grupo, hasta 10 integrantes) |
| 🔍 **Seguimiento** | Dashboard con estado del trabajo (pendiente, revisión, aceptado/rechazado) |
| 📊 **Retroalimentación** | Visualización de evaluaciones y puntuaciones |

### 👨‍🏫 Para Evaluadores
| Funcionalidad | Descripción |
|---|---|
| ⚖️ **Evaluación Fase 1** | Rúbrica detallada (8 criterios, 100 pts) con sliders interactivos |
| 🎤 **Evaluación Fase 2** | Evaluación de presentaciones orales/póster en vivo |
| 💾 **Borrador automático** | Guardado de progreso sin pérdida de datos |

### 👑 Para Administradores
| Funcionalidad | Descripción |
|---|---|
| 📋 **Panel centralizado** | Dashboard con estadísticas y tabla de progreso filtrable |
| 🔄 **Asignación inteligente** | Distribución aleatoria de trabajos entre evaluadores (3 por trabajo) |
| ✅ **Dictaminación masiva** | Finalización de evaluaciones con cálculo de puntajes y detección de "no cumple extensión" |
| 📅 **Gestión de horarios** | Programación de presentaciones orales (20 min por slot) y póster |
| 🏆 **Generación de certificados** | Creación automatizada desde plantilla de Google Slides |
| 📧 **Notificaciones** | Envío de agendas y veredictos por correo electrónico |

### 🛠️ Sistema
| Funcionalidad | Descripción |
|---|---|
| 📱 **PWA** | Instalable en dispositivos, soporte offline parcial |
| 🔐 **Recuperación de contraseña** | Autogestionada vía correo electrónico |
| 📊 **Encuesta de satisfacción** | Formulario integrado con escala emoji |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Static PWA)                 │
│  HTML5 + Bootstrap 5.1 + Vanilla JS (ES6+) + CSS3       │
│  Service Worker · Web App Manifest · localStorage        │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS / JSON
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Google Apps Script)                │
│  Code.gs — doGet() / doPost() REST-like API             │
│  • Autenticación (SHA-256) · Sesión vía localStorage    │
│  • CRUD obras, evaluaciones, asignaciones               │
│  • Lógica de dictaminación y horarios                   │
│  • Generación de certificados (Google Slides API)       │
└────────┬──────────────────────────────┬─────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│  Google Sheets   │          │    Google Drive       │
│  • users         │          │  • PDFs de trabajos   │
│  • works         │          │  • Plantillas Slides  │
│  • assignments   │          │  • Certificados       │
│  • evaluations   │          └──────────────────────┘
│  • live_*        │
│  • catalog_*     │
│  • config        │
│  • reset_tokens  │
└─────────────────┘
```

---

## 🚀 Inicio rápido

### Prerrequisitos

- Una cuenta de Google Workspace (para Google Apps Script)
- Navegador moderno (Chrome, Edge, Firefox, Safari)

### Configuración del backend

1. Abre [Google Apps Script](https://script.google.com/) y crea un nuevo proyecto
2. Copia el contenido de `Code.gs` en el editor
3. Configura las **hojas de cálculo** de Google Sheets con las columnas definidas en la [Referencia de datos](docs/reference/data-model.md)
4. Despliega el script como **Aplicación web**:
   - Ejecutar como: `Yo`
   - Acceso: `Cualquier persona` (o `Cualquier persona dentro de...`)
5. Copia la URL desplegada

### Configuración del frontend

1. Clona este repositorio:
   ```bash
   git clone https://github.com/tu-usuario/congreso-labiq.git
   ```
2. Abre `js/config.js` y pega la URL del despliegue:
   ```js
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/TU_ID/exec';
   ```
3. Sirve los archivos con cualquier servidor estático:
   ```bash
   # Python
   python -m http.server 8000

   # Node.js
   npx serve .
   ```

### Configuración de la hoja de configuración

| Clave | Valor | Descripción |
|---|---|---|
| `event_date` | `2026-05-15` | Fecha del congreso |
| `evaluator_code` | `LABIQ2026` | Código para registro de evaluadores |

---

## 📁 Estructura del proyecto

```
├── 📄 index.html              # Página principal
├── 📄 login.html              # Inicio de sesión
├── 📄 register.html           # Registro de usuarios
├── 📄 student-dashboard.html  # Panel de estudiante
├── 📄 evaluator-dashboard.html# Panel de evaluador
├── 📄 admin-dashboard.html    # Panel de administración
├── 📄 submit-work.html        # Envío de trabajos
├── 📄 encuesta-satisfaccion.html
├── 📄 Code.gs                 # Backend (Google Apps Script)
├── 📄 service-worker.js       # Service Worker PWA
├── 📄 manifest.json           # Manifiesto PWA
├── 📁 css/
│   └── 🎨 style.css           # Estilos UNAM
├── 📁 js/
│   ├── ⚙️ config.js           # URL del backend
│   ├── 🔌 api-client.js       # Cliente API
│   ├── 🧠 app.js              # Lógica de aplicación
│   └── 📋 evaluation-assignment.js
├── 📁 assets/                 # Iconos PWA
├── 📁 propuesta-rediseno/     # Propuestas de rediseño
└── 📁 docs/                   # Documentación
    ├── 📖 tutorials/
    ├── 🔧 how-to/
    ├── 📚 reference/
    └── 💡 explanation/
```

---

## 🧪 Flujo de evaluación

```
Registro de obra
      │
      ▼
Asignación a 3 evaluadores (automática o manual)
      │
      ▼
Evaluación Fase 1 — Rúbrica documental (100 pts)
  • Pertinencia (10) · Objetivos (10) · Marco teórico (10)
  • Metodología (15) · Resultados (20) · Conclusiones (10)
  • Bibliografía (10) · Redacción (15)
  • Si "No cumple extensión" → Rechazo automático
      │
      ▼
Dictaminación masiva
  • Oral: Top 2 por semestre (20 min c/u)
  • Póster: Resto de trabajos aceptados
  • Rechazo: < 60 pts o pertinencia < 6
      │
      ▼
Evaluación Fase 2 — Presentación en vivo
  • Material didáctico · Dominio del tema · Claridad
  • Estructura · Tono de voz · Tiempo
      │
      ▼
Generación de certificados y premiación
```

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | HTML5, CSS3 (Custom Properties), Bootstrap 5.1, JavaScript ES6+ |
| **Backend** | Google Apps Script (JavaScript ES5+) |
| **Base de datos** | Google Sheets (12 hojas de cálculo) |
| **Almacenamiento** | Google Drive (PDFs, plantillas Slides) |
| **Autenticación** | SHA-256 + localStorage |
| **PWA** | Service Worker (cache-first + stale-while-revalidate) |
| **Tipografía** | Playfair Display + Inter (Google Fonts) |
| **Colores institucionales** | Azul `#002147` · Oro `#C6930C` |

---

## 📚 Documentación

La documentación completa sigue el framework **Diátaxis**:

| Cuadrante | Propósito | Enlace |
|---|---|---|
| 📖 **Tutoriales** | Aprender paso a paso | [docs/tutorials/](docs/tutorials/) |
| 🔧 **Guías prácticas** | Resolver problemas específicos | [docs/how-to/](docs/how-to/) |
| 📚 **Referencia** | Consulta técnica detallada | [docs/reference/](docs/reference/) |
| 💡 **Explicación** | Comprender la arquitectura | [docs/explanation/](docs/explanation/) |

---

## 🤝 Contribuir

1. Haz fork del repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios
4. Haz commit (`git commit -m 'Descripción del cambio'`)
5. Push a la rama (`git push origin feature/nueva-funcionalidad`)
6. Abre un Pull Request

> **Nota:** Este proyecto no cuenta con tooling local (Node.js, bundlers, etc.). Todo el backend se despliega directamente desde el editor de Google Apps Script.

---

## 📄 Licencia

Distribuido bajo licencia MIT. Consulta el archivo `LICENSE` para más información.

---

<div align="center">
  <strong>Congreso Estudiantil de Laboratorios de Ingeniería Química</strong><br/>
  Facultad de Estudios Superiores Zaragoza, UNAM<br/>
  <sub>Hecho con ❤️ para la comunidad académica</sub>
</div>
