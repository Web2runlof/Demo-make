# Alcaldía de Springfield · Demo de PQRSD con Make

Portal de demostración académica de una alcaldía municipal colombiana **ficticia** (Springfield), con un formulario accesible para radicar **PQRSD** (peticiones, quejas, reclamos, sugerencias y denuncias) que envía cada solicitud a la ventanilla de radicación en **Make.com**: el escenario asigna un radicado `RAD-E-…`, lo registra en Google Sheets, guarda los adjuntos en Drive y envía el acuse por Gmail.

> Sitio con fines académicos. Springfield no existe; nombres, cifras, noticias y datos de contacto son inventados.

## Qué incluye

| Página | Contenido |
|---|---|
| `index.html` | Inicio: trámites (con buscador), nuestro municipio, noticias, participa |
| `pqrsd.html` | **Formulario PQRSD** conectado a Make |
| `transparencia.html` | Menú de transparencia (Ley 1712 de 2014) y política de datos personales |
| `accesibilidad.html` | Declaración de accesibilidad |

La estructura sigue la Resolución 1519 de 2020 del MinTIC: barra superior, menús de *Transparencia*, *Atención y servicios a la ciudadanía* y *Participa*, y pie de página con datos de la entidad.

### Accesibilidad del formulario (WCAG 2.1 AA / Res. 1519, Anexo 1)

- Etiqueta visible, ejemplo y mensaje de error propio en cada campo; nada depende solo del color.
- Al enviar con errores aparece un **resumen con enlaces** a cada campo y el foco salta a él.
- Opciones grandes (radios tipo tarjeta), navegación completa por teclado y foco muy visible.
- Avisos para lector de pantalla: plazo de respuesta, caracteres restantes, estado del envío.
- Radicación **anónima** opcional (solo pide un correo para el acuse) y solicitud de **respuesta en formato accesible** (letra grande, audio, LSC, braille, lectura fácil, lengua nativa).
- Barra lateral para **alto contraste** y **tamaño de texto** hasta 200 %. Sin límite de tiempo.
- Revisado con axe-core: 0 incumplimientos WCAG 2.1 A/AA en las cuatro páginas.

---

## 1 · Publicar en GitHub Pages

1. En el repositorio: **Settings › Pages**.
2. En *Source* elija **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarde.
3. En uno o dos minutos el sitio queda en `https://web2runlof.github.io/demo-make/`.

No necesita compilación: es HTML, CSS y JavaScript estático.

## 2 · El escenario de Make (ya conectado)

El formulario apunta al webhook `https://hook.us2.make.com/0hcarb51cnl1z5o7o7evlmc9whtlap7d` (en `assets/js/config.js`). El escenario hace esto:

```
Webhook ─► Variables ─► Google Sheets ─► Router ─┬─► Google Drive (un archivo por adjunto)
            RAD-E-…     «Radicados Municipio      │
            resumen      de Springfield»          └─► Gmail (acuse) ─► Webhook response 200
```

1. **Webhook:** recibe el formulario.
2. **Variables:** genera el radicado `RAD-E-` + fecha y hora, asigna el responsable y arma un resumen con el asunto y los primeros 250 caracteres de la descripción.
3. **Google Sheets:** agrega la fila con fecha, canal «Web», estado «Recibido», remitente, asunto, tema, mensaje, responsable y enlace de consulta.
4. **Router:** si hay adjuntos los sube a Drive («Adjuntos Radicados Springfield», nombre `radicado - asunto`); en paralelo envía el correo por Gmail y responde a la web con código 200.

### Campos que envía el formulario

Se envían como `multipart/form-data`, con los nombres exactos que mapea el escenario:

| Campo | Qué lleva |
|---|---|
| `nombres_apellidos` | Nombres y apellidos; razón social para personas jurídicas; `Anónimo` si radica sin datos |
| `correo` | Correo del remitente (obligatorio siempre: allí llega el acuse con el radicado) |
| `telefono` | Teléfono (puede ir vacío) |
| `asunto` | Tipo de PQRSD + asunto, p. ej. `Reclamo · Hueco en la vía principal` |
| `descripcion` | Descripción completa (de aquí salen los 250 caracteres del resumen) |
| `resumen_base` | Mensaje original completo |
| `archivos` | Adjuntos como archivos reales (hasta 3, PDF/JPG/PNG, 4 MB en total) |

Además envía **campos extra** que el escenario aún no usa pero puede mapear: `tipo_solicitud`, `anonimo`, `tipo_persona`, `tipo_documento`, `numero_documento`, `direccion`, `medio_respuesta`, `dependencia`, `ajuste_razonable`, `plazo_dias_habiles`, `fecha_vencimiento`, `autoriza_tratamiento_datos`, `origen`. Ejemplo completo en [`make/ejemplo-carga.json`](make/ejemplo-carga.json).

Para ver los nuevos campos en Make: abra el módulo **Webhook › Redetermine data structure** (o *Detect new values*) y radique una solicitud desde el sitio.

### Ajustes en `assets/js/config.js`

| Opción | Para qué |
|---|---|
| `prefijarTipoEnAsunto: false` | Envía el asunto tal cual, sin «Queja · …». |
| `enviarCamposExtra: false` | Envía solo los 7 campos del escenario (úselo si Make responde con código 400 por una estructura de datos estricta). |
| `campoArchivos: "archivos[]"` | Si al adjuntar varios archivos Make solo recibe uno. |
| `makeWebhookUrl: ""` | Modo demostración: no envía nada y muestra un radicado simulado. |

### Mostrar el radicado en pantalla

El sitio lee la respuesta del **Webhook response** y busca el número así: una clave `radicado` en JSON, o cualquier texto con la forma `RAD-E-…`. Configuración recomendada del módulo:

- **Status:** `200`
- **Body:** `{"ok": true, "radicado": "<variable del radicado>"}` (ver [`make/respuesta-webhook.json`](make/respuesta-webhook.json))
- **Custom headers:** `Content-Type` = `application/json` y `Access-Control-Allow-Origin` = `*`

Si el navegador no puede leer la respuesta (falta la cabecera `Access-Control-Allow-Origin`), la solicitud igual queda radicada y la constancia le dice al ciudadano que el número le llega por correo.

### Adjuntos

Los archivos viajan como archivos reales (`multipart/form-data`), que es lo que espera el módulo de Drive; no se convierten a base64. Si el webhook tiene estructura de datos definida, `archivos` debe ser un *array* de *collection* con `name` (text), `mime` (text) y `data` (buffer). Make acepta máximo 5 MB por petición.

## 3 · Probar

1. Publique el sitio (paso 1) y abra `pqrsd.html`.
2. Radique una solicitud con un adjunto. En Make, revise el *History* del escenario; en Sheets debe aparecer la fila y en Drive el archivo.
3. En la constancia, abra **«Ver los datos enviados a Make (para la clase)»**: muestra lo que se envió y lo que respondió el webhook.

## 4 · Problemas comunes

| Mensaje en el sitio | Causa y solución |
|---|---|
| Código **410** | Make desactivó el webhook (más de 5 días sin escenario). Reactive el escenario. |
| Código **400** | Los datos no cumplen la estructura del webhook o la cola está llena. Pruebe `enviarCamposExtra: false`. |
| Código **500** | El escenario falló (por ejemplo, en Gmail o Drive). Revise el *History*. |
| Tardó demasiado | El escenario está apagado o tarda más de 60 s. La solicitud puede haber quedado radicada: revise Sheets antes de reenviar. |
| No aparece el radicado, solo «le llegará por correo» | Falta `Access-Control-Allow-Origin: *` en el Webhook response o el body no incluye el radicado. |

## Nota de seguridad

La URL del webhook queda visible en el código del sitio (así funciona cualquier formulario estático). Para la demo es suficiente; el formulario incluye un campo trampa contra robots y envía `origen` para filtrar en Make. Si la URL se filtra y llegan solicitudes basura, cree un webhook nuevo en el módulo y actualice `config.js`. **No** ponga una API key en el código: quedaría pública. Pida a los estudiantes que no registren datos personales reales.

## Estructura

```
├── index.html, pqrsd.html, transparencia.html, accesibilidad.html
├── assets/
│   ├── css/styles.css
│   ├── js/config.js     ← URL del webhook y opciones
│   ├── js/pqrsd.js      ← validación accesible y envío a Make
│   ├── js/sitio.js      ← menú, buscador y barra de accesibilidad
│   └── img/             ← escudo e ilustraciones (SVG originales)
└── make/                ← ejemplo de carga y de respuesta del webhook
```
