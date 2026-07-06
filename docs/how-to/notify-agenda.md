# Cómo enviar la agenda a los jurados

> **Problema:** Necesitas notificar a los evaluadores sus horarios y sedes para la Fase 2
> **Solución:** Envío masivo de agendas personalizadas por correo electrónico

---

## Prerrequisitos

- Haber ejecutado **"Asignar jurados en vivo"** (Fase 2)
- Los evaluadores deben tener correos electrónicos válidos en el sistema
- Los trabajos deben tener horario y sala asignados (de la dictaminación masiva)

---

## Enviar agendas

1. Inicia sesión como **administrador**
2. Ve a la sección **"Fase 2"** en la barra lateral
3. Haz clic en **"Enviar agendas a jurados"**
4. El sistema automáticamente:

   Para cada evaluador con asignaciones en vivo:
   - Busca todas las presentaciones que debe evaluar
   - Identifica horario y sala de cada una
   - Genera un correo HTML con una tabla detallada
   - Envía el correo

---

## Formato del correo

Cada evaluador recibe un correo con:

```html
Asunto: Agenda de Evaluación - Congreso LABIQ

Prof. [Nombre del evaluador],

Fecha del evento: [fecha del congreso]

| Hora  | Lugar               | Trabajo                  |
|-------|---------------------|--------------------------|
| 10:00 | UMIEZ               | A01 - Título del trabajo |
| 10:20 | UMIEZ               | B03 - Otro trabajo       |
| 11:00 | Auditorio Principal | C02 - Tercer trabajo     |
```

---

## Verificar envíos

No hay una confirmación visual en el panel. Para verificar:
- Revisa la bandeja de enviados desde la cuenta de Google asociada al script
- Pide confirmación a los evaluadores

---

## Notas importantes

- El envío usa `MailApp.sendEmail()` de Google Apps Script
- Límite diario de MailApp: **100 destinatarios** (suficiente para la mayoría de los casos)
- Si el evaluador no tiene correo registrado, el envío falla silenciosamente
- Las agendas incluyen solo las evaluaciones asignadas a ese evaluador
