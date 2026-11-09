/* =========================================================
   CONFIGURACIÓN DE LA INTEGRACIÓN CON MAKE.COM
   ---------------------------------------------------------
   Escenario «Ventanilla de radicación – Municipio de Springfield»:
   Webhook → Variables (genera RAD-E-…) → Google Sheets → Router
     ├─ Drive: sube cada adjunto de «archivos»
     └─ Gmail: acuse al ciudadano + Webhook response (200)

   Si makeWebhookUrl queda vacío, el formulario funciona en
   "modo demostración": valida y muestra una constancia
   simulada, sin enviar nada a Make.
   ========================================================= */
window.SPRINGFIELD_CONFIG = {
  // URL del módulo Webhooks › Custom webhook («Copy address» en Make)
  makeWebhookUrl: "https://hook.us2.make.com/0hcarb51cnl1z5o7o7evlmc9whtlap7d",

  // "cors"    → envía y lee la respuesta de Make para mostrar el radicado (recomendado).
  // "no-cors" → envía sin leer la respuesta (el radicado solo llega por correo).
  modoEnvio: "cors",

  // Tiempo máximo de espera de la respuesta de Make (milisegundos).
  // El escenario sube adjuntos a Drive y envía el correo antes de responder.
  tiempoEsperaMs: 60000,

  // Nombre del campo de adjuntos que espera el escenario (lista «archivos»).
  // Si Make solo recibe un archivo cuando se envían varios, pruebe con "archivos[]".
  campoArchivos: "archivos",
  maxArchivos: 3,
  // Make acepta hasta 5 MB por petición: dejamos 4 MB para todos los adjuntos juntos.
  adjuntosMaxMB: 4,

  // Antepone el tipo de PQRSD al asunto («Queja · Semáforo dañado…») para que
  // se vea en la hoja de Google Sheets, que no tiene una columna de tipo.
  prefijarTipoEnAsunto: true,

  // Envía campos adicionales (tipo, dependencia, plazo, ajuste razonable…) que el
  // escenario actual no usa pero puede mapear después. Póngalo en false si el
  // webhook tiene una estructura de datos estricta y Make responde con código 400.
  enviarCamposExtra: true,

  // Identifica el canal de origen en Make (útil para filtros)
  origen: "web-alcaldia-springfield"
};
