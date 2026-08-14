# Documentación — Congreso LABIQ

> Plataforma integral para la gestión, evaluación y premiación del Encuentro Estudiantil de Ingeniería Química - FESZ — FES Zaragoza, UNAM

---

## 📖 Diátaxis — Las cuatro dimensiones de la documentación

| Cuadrante | Propósito | Lo encontrarás aquí |
|---|---|---|
| **📖 Tutoriales** | Aprender paso a paso — guías que te llevan de cero a un resultado exitoso | [docs/tutorials/](tutorials/) |
| **🔧 Guías prácticas** | Resolver problemas específicos — recetas concretas para tareas reales | [docs/how-to/](how-to/) |
| **📚 Referencia** | Consultar información técnica — descripciones precisas del sistema | [docs/reference/](reference/) |
| **💡 Explicación** | Comprender cómo y por qué — discusiones sobre arquitectura y decisiones | [docs/explanation/](explanation/) |

---

### 📖 Tutoriales

| Tutorial | Descripción |
|---|---|
| [Registrarse como estudiante](tutorials/student-registration.md) | Crear cuenta y enviar tu primer trabajo al congreso |
| [Evaluar trabajos (Fase 1)](tutorials/evaluator-phase1.md) | Usar la rúbrica documental, guardar borradores y enviar evaluación |
| [Administrar el congreso](tutorials/admin-quickstart.md) | Panel de control: asignar evaluadores, dictaminar y gestionar horarios |

### 🔧 Guías prácticas

| Guía | Descripción |
|---|---|
| [Recuperar contraseña](how-to/reset-password.md) | Restablecer contraseña olvidada vía correo electrónico |
| [Asignar evaluadores manualmente](how-to/assign-evaluators.md) | Asignar un evaluador específico a un trabajo |
| [Ejecutar dictaminación masiva](how-to/batch-finalize.md) | Finalizar todas las evaluaciones y generar resultados automáticamente |
| [Generar certificados de ganadores](how-to/generate-certificates.md) | Crear certificados editables desde plantilla Google Slides |
| [Enviar agenda a jurados](how-to/notify-agenda.md) | Notificar horarios y sedes a los evaluadores |

### 📚 Referencia

| Documento | Descripción |
|---|---|
| [API Reference](reference/api.md) | Todos los endpoints `doGet`/`doPost`, parámetros y respuestas |
| [Modelo de datos](reference/data-model.md) | Estructura de cada hoja de Google Sheets |
| [Configuración](reference/configuration.md) | Variables clave: IDs de Drive, URL del frontend, expiración de tokens |
| [API Client](reference/api-client.md) | Métodos del cliente JavaScript en el frontend |

### 💡 Explicación

| Documento | Descripción |
|---|---|
| [Arquitectura del sistema](explanation/architecture.md) | Visión general de componentes, flujos y decisiones técnicas |
| [Flujo de evaluación](explanation/evaluation-flow.md) | Cómo funciona el pipeline de dictaminación en dos fases |
| [Seguridad y sesiones](explanation/security.md) | Modelo de autenticación, hashing de contraseñas y limitaciones |
| [PWA y estrategia de caché](explanation/pwa-cache.md) | Cómo funciona el Service Worker y la experiencia offline |

---

<div align="center">
  <sub>Documentación generada siguiendo el framework <a href="https://diataxis.fr/">Diátaxis</a></sub><br/>
  <sub>Congreso LABIQ — FES Zaragoza, UNAM</sub>
</div>
