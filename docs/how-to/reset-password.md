# Cómo recuperar tu contraseña

> **Problema:** Olvidaste tu contraseña y no puedes iniciar sesión
> **Solución:** Autogestionada vía correo electrónico

---

## Paso a paso

1. Ve a la página de inicio de sesión (`login.html`)
2. Haz clic en **"¿Olvidaste tu contraseña?"**
3. Ingresa el correo electrónico con el que te registraste
4. Haz clic en **"Enviar enlace de recuperación"**

Recibirás un correo con un enlace único.

5. Revisa tu bandeja de entrada (y la carpeta de spam)
6. Haz clic en el enlace del correo
7. Se abrirá la página `set-new-password.html`
8. Ingresa tu nueva contraseña y confírmala
9. Haz clic en **"Restablecer contraseña"**

> ✅ **Listo.** Ya puedes iniciar sesión con tu nueva contraseña.

---

## Detalles técnicos

| Propiedad | Valor |
|---|---|
| **Expiración del token** | 1 hora |
| **Algoritmo de hash** | SHA-256 |
| **Uso único** | El token se invalida después de usado |

---

## Solución de problemas

| Problema | Causa | Solución |
|---|---|---|
| No recibí el correo | El correo no está registrado o está en spam | Verifica que sea el correo correcto y revisa spam |
| "Enlace expirado" | Pasó más de 1 hora | Solicita un nuevo enlace de recuperación |
| "Enlace ya utilizado" | Ya usaste este enlace antes | Solicita un nuevo enlace |
