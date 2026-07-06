# Seguridad y sesiones

> **Audiencia:** Desarrolladores y administradores que evalúan el modelo de seguridad del sistema

---

## Autenticación

### Almacenamiento de contraseñas

Las contraseñas se almacenan como **hash SHA-256** con un prefijo `'` en la celda de Google Sheets para evitar que Sheets interprete el hash como número.

```javascript
function hashPassword(password) {
    const digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        password,
        Utilities.Charset.UTF_8
    );
    return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}
```

### Proceso de login

```
1. Usuario envía email + contraseña en texto plano (HTTPS)
2. Backend hashea la contraseña recibida con SHA-256
3. Busca en users donde email coincida
4. Compara hash calculado con hash almacenado
5. Si coinciden → login exitoso → retorna perfil
6. Frontend guarda perfil en localStorage
```

### Migración legacy

El sistema también acepta contraseñas en texto plano almacenadas (de una versión anterior) y las migra automáticamente a hash al iniciar sesión:

```javascript
if (stored === data.password) {
    // Migrar a hash
    sheet.getRange(row, col).setValue("'" + hashedInput);
    return true;
}
```

---

## Gestión de sesiones

### Modelo actual

| Aspecto | Implementación |
|---|---|
| **Token** | Ninguno (no hay JWT, cookie ni token de sesión) |
| **Almacenamiento** | `localStorage` con clave `congreso_user` |
| **Contenido** | Objeto JSON con perfil completo del usuario |
| **Persistencia** | Hasta que el usuario cierre sesión o borre localStorage |
| **Protección de rutas** | Frontend-only: cada página verifica `getSession()` |

### Cómo se verifica la sesión

```javascript
// app.js
const user = getSession();
if (!user) window.location.href = 'login.html';
if (requiredRole && user.user_type !== requiredRole) {
    window.location.href = 'index.html';
}
```

### Limitaciones de seguridad conocidas

| Problema | Impacto | Mitigación |
|---|---|---|
| **Sin autenticación en backend** | Cualquier persona con la URL del script puede llamar a los endpoints | El proyecto asume que la URL del script no es pública |
| **localStorage accesible** | Un atacante con XSS puede leer la sesión | No se almacenan datos sensibles además del perfil |
| **Sin expiración de sesión** | La sesión nunca expira | El usuario debe cerrar sesión manualmente |
| **Sin CORS restrictivo** | Google Apps Script maneja CORS de forma limitada | Depende de la configuración de Google |

---

## Seguridad en Google Apps Script

### Permisos del despliegue

Al desplegar como aplicación web:

| Configuración | Recomendación |
|---|---|
| **Ejecutar como** | `Yo` (la cuenta del script) |
| **Acceso** | `Cualquier persona` o `Cualquier persona dentro de...` |

### Protecciones de Google

- **HTTPS obligatorio** — Todas las comunicaciones son cifradas
- **Cuotas** — Límites de ejecución, email, y solicitudes
- **OAuth2** — El script actúa bajo la identidad del propietario

---

## Recuperación de contraseña

### Flujo

```
1. Usuario solicita recuperación
2. Backend genera UUID como token
3. Almacena token + email + expiración (1 hora) en reset_tokens
4. Envía correo con enlace: FRONTEND_URL/set-new-password.html?token={uuid}
5. Usuario hace clic, ingresa nueva contraseña
6. Frontend envía token + nueva contraseña
7. Backend verifica token no expirado y no usado
8. Actualiza contraseña en users
9. Marca token como usado
```

### Medidas de seguridad

- **Token de un solo uso:** Se invalida después de usado
- **Expiración:** 1 hora
- **Validación:** Se verifica que `expires_at > now()` y `used === false`
- **Sin revelación de existencia:** Siempre retorna `success: true` incluso si el email no existe (previene enumeración)

---

## Recomendaciones para mejorar la seguridad

1. **Implementar tokens JWT** con expiración en el backend
2. **Almacenar sesiones en httpOnly cookies** (implica migrar a un backend con cookies)
3. **Agregar rate limiting** en login y recuperación de contraseña
4. **Usar Content Security Policy (CSP)** en los HTML para mitigar XSS
5. **Migrar a OAuth2** con Google Identity Services para autenticación
6. **Validar la sesión en cada llamada POST** del backend (actualmente no se valida)

> **Nota:** Dado que el sistema opera en el contexto de una institución educativa con tráfico limitado, el nivel de seguridad actual es suficiente para el caso de uso. Las mejoras listadas son para contextos que requieran mayor robustez.
