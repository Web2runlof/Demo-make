/* =========================================================
   Formulario PQRSD — validación accesible y envío a Make.com
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.SPRINGFIELD_CONFIG || {};
  var form = document.getElementById("form-pqrsd");
  if (!form) return;

  /* ---------- Tipos de solicitud y plazos (Ley 1755 de 2015, art. 14) ---------- */
  var TIPOS = {
    peticion:    { nombre: "Petición", plazo: 15 },
    queja:       { nombre: "Queja", plazo: 15 },
    reclamo:     { nombre: "Reclamo", plazo: 15 },
    sugerencia:  { nombre: "Sugerencia", plazo: 15 },
    denuncia:    { nombre: "Denuncia", plazo: 15 },
    informacion: { nombre: "Solicitud de información pública", plazo: 10 },
    consulta:    { nombre: "Consulta", plazo: 30 }
  };

  var DEPENDENCIAS = {
    despacho: "Despacho del Alcalde",
    gobierno: "Secretaría de Gobierno y Convivencia",
    hacienda: "Secretaría de Hacienda",
    planeacion: "Secretaría de Planeación e Infraestructura",
    salud: "Secretaría de Salud",
    educacion: "Secretaría de Educación",
    movilidad: "Secretaría de Movilidad",
    ambiente: "Secretaría de Ambiente y Desarrollo Rural",
    social: "Secretaría de Desarrollo Social",
    no_se: "No sé a qué dependencia dirigirla"
  };

  /* ---------- Días hábiles en Colombia (festivos calculados por año, Ley 51 de 1983) ---------- */
  function pascua(anio) {
    var a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(anio, mes - 1, dia);
  }
  function clave(f) { return f.getFullYear() + "-" + (f.getMonth() + 1) + "-" + f.getDate(); }
  function sumarDias(f, n) { var r = new Date(f); r.setDate(r.getDate() + n); return r; }
  function aLunes(f) { var r = new Date(f); var dow = r.getDay(); if (dow !== 1) r.setDate(r.getDate() + ((8 - dow) % 7)); return r; }
  var cacheFestivos = {};
  function festivos(anio) {
    if (cacheFestivos[anio]) return cacheFestivos[anio];
    var set = {};
    [[0, 1], [4, 1], [6, 20], [7, 7], [11, 8], [11, 25]].forEach(function (p) { set[clave(new Date(anio, p[0], p[1]))] = 1; });
    [[0, 6], [2, 19], [5, 29], [7, 15], [9, 12], [10, 1], [10, 11]].forEach(function (p) { set[clave(aLunes(new Date(anio, p[0], p[1])))] = 1; });
    var p = pascua(anio);
    [-3, -2, 43, 64, 71].forEach(function (n) { set[clave(sumarDias(p, n))] = 1; });
    cacheFestivos[anio] = set;
    return set;
  }
  function esHabil(f) { var d = f.getDay(); return d !== 0 && d !== 6 && !festivos(f.getFullYear())[clave(f)]; }
  function sumarHabiles(desde, n) {
    var f = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    var c = 0;
    while (c < n) { f.setDate(f.getDate() + 1); if (esHabil(f)) c++; }
    return f;
  }
  var fmtFecha = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var fmtFechaHora = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" });
  function isoLocal(f) { var p = function (n) { return String(n).padStart(2, "0"); }; return f.getFullYear() + "-" + p(f.getMonth() + 1) + "-" + p(f.getDate()); }

  /* ---------- Referencias ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var resumen = $("resumen-errores");
  var listaResumen = $("lista-errores");
  var estado = $("estado-envio");
  var avisoErrorEnvio = $("error-envio");
  var botonEnviar = $("boton-enviar");
  var bloquePersonal = $("bloque-personal");
  var bloqueMedio = $("bloque-medio");
  var notaAnonimo = $("nota-anonimo");
  var campoRazon = $("campo-razon-social");
  var campoApellidos = $("campo-apellidos");
  var plazoInfo = $("plazo-info");
  var intentoEnvio = false;

  function valor(nombre) {
    var el = form.elements[nombre];
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return (el.value || "").trim();
  }
  function esAnonimo() { return valor("modalidad") === "anonima"; }
  function esJuridica() { return valor("tipo_persona") === "juridica"; }

  /* ---------- Mostrar/ocultar bloques según respuestas ---------- */
  function alternar(el, mostrar) {
    if (!el) return;
    el.hidden = !mostrar;
    el.querySelectorAll("input, select, textarea").forEach(function (c) { c.disabled = !mostrar; });
  }
  function actualizarVisibilidad() {
    var anon = esAnonimo();
    alternar(bloquePersonal, !anon);
    alternar(bloqueMedio, !anon);
    if (notaAnonimo) notaAnonimo.hidden = !anon;
    if (!anon) {
      alternar(campoRazon, esJuridica());
      alternar(campoApellidos, !esJuridica());
      $("etiqueta-nombres").firstChild.nodeValue = esJuridica() ? "Nombre del representante o persona de contacto " : "Nombres ";
    }
    var dir = $("direccion");
    if (dir) {
      var fisica = !anon && valor("medio_respuesta") === "fisica";
      dir.required = fisica;
      $("marca-direccion").hidden = !fisica;
      $("opcional-direccion").hidden = fisica;
    }
  }
  function actualizarPlazo() {
    var t = TIPOS[valor("tipo_solicitud")];
    if (!t) { plazoInfo.hidden = true; return; }
    var vence = sumarHabiles(new Date(), t.plazo);
    plazoInfo.hidden = false;
    plazoInfo.textContent = "Plazo de respuesta para una " + t.nombre.toLowerCase() + ": " + t.plazo +
      " días hábiles. Si radica hoy, la fecha estimada es el " + fmtFecha.format(vence) + ".";
  }

  /* ---------- Contador de caracteres con anuncios moderados ---------- */
  var desc = $("descripcion");
  var contador = $("contador-descripcion");
  var anuncioContador = $("anuncio-contador");
  var maxDesc = Number(desc.getAttribute("maxlength")) || 3000;
  var ultimoUmbral = null;
  function actualizarContador() {
    var restantes = maxDesc - desc.value.length;
    contador.textContent = desc.value.length + " de " + maxDesc + " caracteres";
    var umbral = restantes <= 0 ? 0 : restantes <= 100 ? 100 : restantes <= 500 ? 500 : null;
    if (umbral !== ultimoUmbral) {
      ultimoUmbral = umbral;
      if (umbral !== null) anuncioContador.textContent = restantes <= 0 ? "Llegó al límite de caracteres." : "Quedan " + restantes + " caracteres.";
    }
  }
  desc.addEventListener("input", actualizarContador);

  /* ---------- Reglas de validación ---------- */
  var reCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var REGLAS = [
    { campo: "tipo_solicitud", foco: "tipo-peticion", grupo: "grupo-tipo", msg: function () { return valor("tipo_solicitud") ? "" : "Seleccione el tipo de solicitud."; } },
    { campo: "modalidad", foco: "modalidad-identificada", grupo: "grupo-modalidad", msg: function () { return valor("modalidad") ? "" : "Indique si desea radicar con sus datos o de forma anónima."; } },
    { campo: "tipo_persona", foco: "persona-natural", grupo: "grupo-persona", si: function () { return !esAnonimo(); }, msg: function () { return valor("tipo_persona") ? "" : "Seleccione si es persona natural o jurídica."; } },
    { campo: "tipo_documento", si: function () { return !esAnonimo(); }, msg: function () { return valor("tipo_documento") ? "" : "Seleccione el tipo de documento."; } },
    { campo: "numero_documento", si: function () { return !esAnonimo(); }, msg: function () {
        var v = valor("numero_documento").replace(/[\s.]/g, "");
        if (!v) return "Escriba el número de documento.";
        if (!/^[0-9A-Za-z-]{4,15}$/.test(v)) return "El número de documento debe tener entre 4 y 15 caracteres, solo números, letras o guion.";
        return ""; } },
    { campo: "razon_social", si: function () { return !esAnonimo() && esJuridica(); }, msg: function () { return valor("razon_social").length >= 2 ? "" : "Escriba la razón social de la organización."; } },
    { campo: "nombres", si: function () { return !esAnonimo(); }, msg: function () { return valor("nombres").length >= 2 ? "" : "Escriba su nombre."; } },
    { campo: "apellidos", si: function () { return !esAnonimo() && !esJuridica(); }, msg: function () { return valor("apellidos").length >= 2 ? "" : "Escriba sus apellidos."; } },
    { campo: "correo", msg: function () {
        var v = valor("correo");
        if (!v) return esAnonimo()
          ? "Escriba un correo: allí le llegará el número de radicado. Su nombre no se registrará."
          : "Escriba su correo electrónico. Allí le enviaremos el número de radicado.";
        return reCorreo.test(v) ? "" : "Escriba un correo válido, por ejemplo: nombre@correo.com."; } },
    { campo: "telefono", si: function () { return !esAnonimo(); }, msg: function () {
        var v = valor("telefono").replace(/[\s()+-]/g, "");
        return !v || /^[0-9]{7,12}$/.test(v) ? "" : "El teléfono debe tener entre 7 y 12 números."; } },
    { campo: "medio_respuesta", foco: "medio-correo", grupo: "grupo-medio", si: function () { return !esAnonimo(); }, msg: function () { return valor("medio_respuesta") ? "" : "Indique cómo quiere recibir la respuesta."; } },
    { campo: "direccion", si: function () { return !esAnonimo() && valor("medio_respuesta") === "fisica"; }, msg: function () { return valor("direccion").length >= 5 ? "" : "Escriba la dirección donde recibirá la respuesta."; } },
    { campo: "dependencia", msg: function () { return valor("dependencia") ? "" : "Seleccione la dependencia o elija «No sé a qué dependencia dirigirla»."; } },
    { campo: "asunto", msg: function () {
        var n = valor("asunto").length;
        if (!n) return "Escriba el asunto de su solicitud.";
        return n < 5 ? "El asunto es muy corto: use al menos 5 caracteres." : ""; } },
    { campo: "descripcion", msg: function () {
        var n = valor("descripcion").length;
        if (!n) return "Describa su solicitud.";
        return n < 20 ? "La descripción es muy corta: use al menos 20 caracteres (lleva " + n + ")." : ""; } },
    { campo: "archivos", msg: function () {
        var lista = archivosElegidos();
        if (!lista.length) return "";
        var maxN = CFG.maxArchivos || 3, maxMB = CFG.adjuntosMaxMB || 4;
        if (lista.length > maxN) return "Puede adjuntar máximo " + maxN + " archivos; eligió " + lista.length + ".";
        var malo = lista.filter(function (f) { return !/\.(pdf|jpe?g|png)$/i.test(f.name); })[0];
        if (malo) return "«" + malo.name + "» no es PDF, JPG ni PNG.";
        var total = lista.reduce(function (s, f) { return s + f.size; }, 0);
        return total > maxMB * 1048576 ? "Los archivos suman " + (total / 1048576).toFixed(1) + " MB; el máximo total es " + maxMB + " MB." : ""; } },
    { campo: "autorizacion", msg: function () { return valor("autorizacion") ? "" : "Debe autorizar el tratamiento de sus datos para radicar la solicitud."; } }
  ];

  function aplica(r) { return !r.si || r.si(); }

  function marcar(regla, mensaje) {
    var err = $("error-" + regla.campo);
    var controles = form.querySelectorAll('[name="' + regla.campo + '"]');
    if (err) { err.textContent = mensaje; err.hidden = !mensaje; }
    controles.forEach(function (c) {
      if (mensaje) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
    });
    if (regla.grupo) { var g = $(regla.grupo); if (g) g.classList.toggle("con-error", !!mensaje); }
  }

  function validarCampo(nombre) {
    REGLAS.forEach(function (r) {
      if (r.campo !== nombre) return;
      marcar(r, aplica(r) ? r.msg() : "");
    });
  }

  function validarTodo() {
    var errores = [];
    REGLAS.forEach(function (r) {
      var m = aplica(r) ? r.msg() : "";
      marcar(r, m);
      if (m) errores.push({ id: r.foco || r.campo.replace(/_/g, "-"), msg: m });
    });
    return errores;
  }

  function mostrarResumen(errores) {
    listaResumen.innerHTML = "";
    errores.forEach(function (e) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + e.id;
      a.textContent = e.msg;
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var destino = $(e.id);
        if (destino) { destino.focus(); destino.scrollIntoView({ block: "center" }); }
      });
      li.appendChild(a);
      listaResumen.appendChild(li);
    });
    $("titulo-errores").textContent = errores.length === 1
      ? "Hay 1 dato por corregir antes de radicar"
      : "Hay " + errores.length + " datos por corregir antes de radicar";
    resumen.hidden = false;
    resumen.focus();
  }

  /* ---------- Eventos de interacción ---------- */
  form.addEventListener("change", function (ev) {
    var n = ev.target.name;
    if (n === "modalidad" || n === "tipo_persona" || n === "medio_respuesta") actualizarVisibilidad();
    if (n === "tipo_solicitud") actualizarPlazo();
    if (intentoEnvio || ev.target.getAttribute("aria-invalid") === "true") validarCampo(n);
  });
  // Mientras la persona corrige un campo con error, el mensaje se actualiza al escribir.
  // Así el error desaparece antes de salir del campo y no hay saltos de diseño al hacer clic en otro lugar.
  form.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.name && t.getAttribute("aria-invalid") === "true") validarCampo(t.name);
  });
  form.addEventListener("focusout", function (ev) {
    var t = ev.target;
    if (!t.name || t.type === "radio" || t.type === "checkbox") return;
    if ((t.value && t.value.trim()) || t.getAttribute("aria-invalid") === "true") validarCampo(t.name);
  });

  /* ---------- Adjuntos ---------- */
  function archivosElegidos() {
    var el = form.elements.archivos;
    return el && el.files ? Array.prototype.slice.call(el.files) : [];
  }

  /* ---------- Carga útil con los nombres de campo que espera el escenario de Make ----------
     nombres_apellidos · correo · telefono · asunto · descripcion · resumen_base · archivos   */
  function construirDatos() {
    var ahora = new Date();
    var tipo = TIPOS[valor("tipo_solicitud")];
    var vence = sumarHabiles(ahora, tipo.plazo);
    var anon = esAnonimo();
    var juridica = !anon && esJuridica();
    var nombre = anon ? "Anónimo"
      : juridica ? valor("razon_social") + (valor("nombres") ? " (contacto: " + valor("nombres") + ")" : "")
      : (valor("nombres") + " " + valor("apellidos")).trim();
    var asunto = (CFG.prefijarTipoEnAsunto === false ? "" : tipo.nombre + " · ") + valor("asunto");

    var d = {
      nombres_apellidos: nombre,
      correo: valor("correo"),
      telefono: anon ? "" : valor("telefono"),
      asunto: asunto,
      descripcion: valor("descripcion"),
      resumen_base: valor("descripcion")
    };
    if (CFG.enviarCamposExtra !== false) {
      d.tipo_solicitud = tipo.nombre;
      d.anonimo = anon ? "si" : "no";
      d.tipo_persona = anon ? "" : valor("tipo_persona");
      d.tipo_documento = anon ? "" : valor("tipo_documento");
      d.numero_documento = anon ? "" : valor("numero_documento").replace(/[\s.]/g, "");
      d.direccion = anon ? "" : valor("direccion");
      d.medio_respuesta = anon ? "correo" : valor("medio_respuesta");
      d.dependencia = DEPENDENCIAS[valor("dependencia")] || "";
      d.ajuste_razonable = valor("ajuste_razonable") || "ninguno";
      d.plazo_dias_habiles = String(tipo.plazo);
      d.fecha_vencimiento = isoLocal(vence);
      d.autoriza_tratamiento_datos = "si";
      d.origen = CFG.origen || "web";
    }
    return { datos: d, vence: vence, tipo: tipo, ahora: ahora, asuntoOriginal: valor("asunto") };
  }

  function aFormData(datos, archivos) {
    var fd = new FormData();
    Object.keys(datos).forEach(function (k) { fd.append(k, datos[k]); });
    var campo = CFG.campoArchivos || "archivos";
    archivos.forEach(function (f) { fd.append(campo, f, f.name); });
    return fd;
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* El escenario genera el radicado (RAD-E-AAAAMMDDHHMMSS) y lo devuelve en el Webhook response.
     Lo buscamos en JSON (radicado, numero_radicado…) o en texto plano. */
  function extraerRadicado(texto, json) {
    if (json && typeof json === "object") {
      var claves = ["radicado", "numero_radicado", "num_radicado", "Radicado", "radicado_id", "id"];
      for (var i = 0; i < claves.length; i++) if (json[claves[i]]) return String(json[claves[i]]);
    }
    var m = (texto || "").match(/RAD-E-[A-Za-z0-9_:\-]+/);
    return m ? m[0] : null;
  }

  function radicadoSimulado(f) {
    var p = function (n) { return String(n).padStart(2, "0"); };
    return "RAD-E-" + f.getFullYear() + p(f.getMonth() + 1) + p(f.getDate()) + p(f.getHours()) + p(f.getMinutes()) + p(f.getSeconds());
  }

  /* Envía a Make con multipart/form-data y sin cabeceras personalizadas:
     para el navegador es una "petición simple", así que no hay preflight CORS. */
  function enviarAMake(fd) {
    var url = (CFG.makeWebhookUrl || "").trim();
    if (!url) return esperar(900).then(function () { return { modo: "demo" }; });

    var ctrl = "AbortController" in window ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, CFG.tiempoEsperaMs || 60000) : null;
    var opciones = { method: "POST", body: fd, signal: ctrl ? ctrl.signal : undefined };

    if (CFG.modoEnvio === "no-cors") {
      opciones.mode = "no-cors";
      return fetch(url, opciones).then(function () { clearTimeout(t); return { modo: "sin-respuesta" }; });
    }
    return fetch(url, opciones).then(function (res) {
      clearTimeout(t);
      return res.text().then(function (texto) {
        if (!res.ok) {
          var e = new Error("Make respondió con el código " + res.status + ": " + (texto || res.statusText));
          e.codigo = res.status;
          throw e;
        }
        var json = null;
        try { json = JSON.parse(texto); } catch (x) { /* texto plano, p. ej. "Accepted" */ }
        return { modo: "make", codigo: res.status, texto: texto, json: json, radicado: extraerRadicado(texto, json) };
      });
    }, function (err) {
      clearTimeout(t);
      // Un TypeError en una petición simple casi siempre significa que Make SÍ recibió los datos,
      // pero su respuesta no trae la cabecera CORS y el navegador no deja leerla.
      if (err instanceof TypeError && navigator.onLine !== false) return { modo: "sin-respuesta", cors: true };
      throw err;
    });
  }

  function explicarError(err) {
    if (err.name === "AbortError") return "Make tardó demasiado en responder. Es posible que la solicitud sí haya quedado radicada: revise su correo antes de enviarla de nuevo.";
    if (err.codigo === 410) return "La ventanilla en línea está desactivada en este momento (código 410). Intente más tarde o use los otros canales de atención.";
    if (err.codigo === 400) return "La ventanilla rechazó los datos (código 400). Si el webhook tiene una estructura de datos estricta, ponga enviarCamposExtra en false en assets/js/config.js.";
    if (err.codigo >= 500) return "La ventanilla tuvo un problema al procesar la solicitud (código " + err.codigo + "). Intente de nuevo en unos minutos.";
    if (err instanceof TypeError) return "No hay conexión a internet o no fue posible comunicarse con la ventanilla. Revise su conexión e intente de nuevo.";
    return err.message || "Ocurrió un error inesperado.";
  }

  /* ---------- Envío ---------- */
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    intentoEnvio = true;
    avisoErrorEnvio.hidden = true;

    // Trampa anti-robots: si este campo invisible trae texto, no se envía nada.
    if (valor("sitio_web")) { return; }

    var errores = validarTodo();
    if (errores.length) { mostrarResumen(errores); return; }
    resumen.hidden = true;

    var paquete = construirDatos();
    var archivos = archivosElegidos();
    var fd = aFormData(paquete.datos, archivos);

    botonEnviar.disabled = true;
    botonEnviar.setAttribute("aria-busy", "true");
    estado.textContent = archivos.length
      ? "Enviando su solicitud y sus adjuntos. Puede tardar unos segundos…"
      : "Enviando su solicitud. Por favor espere…";

    enviarAMake(fd).then(function (r) {
      mostrarConfirmacion(paquete, archivos, r);
    }).catch(function (err) {
      avisoErrorEnvio.innerHTML = "";
      var h = document.createElement("strong");
      h.textContent = "No pudimos confirmar la radicación. Sus datos siguen en el formulario.";
      var p = document.createElement("p");
      p.style.margin = "6px 0 0";
      p.textContent = explicarError(err);
      avisoErrorEnvio.appendChild(h);
      avisoErrorEnvio.appendChild(p);
      avisoErrorEnvio.hidden = false;
      estado.textContent = "";
      console.error("[PQRSD → Make]", err);
    }).finally(function () {
      botonEnviar.disabled = false;
      botonEnviar.removeAttribute("aria-busy");
    });
  });

  /* ---------- Constancia de radicación ---------- */
  function fila(dl, t, v) {
    var dt = document.createElement("dt"); dt.textContent = t;
    var dd = document.createElement("dd"); dd.textContent = v;
    dl.appendChild(dt); dl.appendChild(dd);
  }

  function mostrarConfirmacion(paquete, archivos, r) {
    var d = paquete.datos;
    var radicado = r.modo === "demo" ? radicadoSimulado(paquete.ahora) : r.radicado;
    var caja = $("confirmacion");
    var cajaRad = $("conf-radicado");
    var intro = $("conf-intro");

    if (radicado) {
      intro.textContent = "Guarde este número. Con él puede hacer seguimiento a su solicitud:";
      cajaRad.textContent = radicado;
      cajaRad.hidden = false;
    } else {
      intro.textContent = "La Alcaldía recibió su solicitud. En unos minutos le llegará a " + d.correo + " un correo con el número de radicado y el enlace de consulta.";
      cajaRad.hidden = true;
    }

    var dl = $("conf-detalle");
    dl.innerHTML = "";
    fila(dl, "Tipo de solicitud", paquete.tipo.nombre);
    fila(dl, "Fecha de envío", fmtFechaHora.format(paquete.ahora));
    fila(dl, "Remitente", d.nombres_apellidos);
    fila(dl, "Asunto", paquete.asuntoOriginal);
    if (d.dependencia) fila(dl, "Dirigida a", d.dependencia);
    fila(dl, "Plazo de respuesta", paquete.tipo.plazo + " días hábiles (hasta el " + fmtFecha.format(paquete.vence) + ")");
    fila(dl, "Notificaciones a", d.correo);
    fila(dl, "Estado", "Recibido");
    if (archivos.length) fila(dl, "Adjuntos", archivos.map(function (f) { return f.name; }).join(", "));

    var aviso = $("conf-aviso");
    if (r.modo === "demo") {
      aviso.hidden = false;
      aviso.textContent = "Modo demostración: no hay URL de webhook configurada, así que la solicitud no se envió a Make y el radicado es simulado.";
    } else {
      aviso.hidden = true;
    }

    var vista = {};
    Object.keys(d).forEach(function (k) { vista[k] = d[k]; });
    if (archivos.length) vista[CFG.campoArchivos || "archivos"] = archivos.map(function (f) { return { name: f.name, mime: f.type, data: "(binario, " + f.size + " bytes)" }; });
    $("conf-json").textContent = JSON.stringify(vista, null, 2);
    $("conf-respuesta").textContent =
      r.modo === "make" ? "HTTP " + r.codigo + " · " + (r.texto || "(sin cuerpo)")
      : r.modo === "demo" ? "(modo demostración: no se llamó a Make)"
      : r.cors ? "Make recibió la petición, pero el navegador no pudo leer la respuesta (falta la cabecera Access-Control-Allow-Origin en el Webhook response)."
      : "(modo no-cors: el navegador no lee la respuesta)";

    form.hidden = true;
    caja.hidden = false;
    estado.textContent = "";
    document.title = (radicado ? "Solicitud radicada " + radicado : "Solicitud recibida") + " | Alcaldía de Springfield";
    $("conf-titulo").focus();
    window.scrollTo(0, caja.getBoundingClientRect().top + window.pageYOffset - 20);
  }

  $("boton-imprimir").addEventListener("click", function () { window.print(); });
  $("boton-nueva").addEventListener("click", function () {
    form.reset();
    intentoEnvio = false;
    REGLAS.forEach(function (r) { marcar(r, ""); });
    actualizarVisibilidad(); actualizarPlazo(); actualizarContador();
    $("confirmacion").hidden = true;
    form.hidden = false;
    document.title = "Radicar PQRSD | Alcaldía de Springfield";
    $("titulo-formulario").focus();
  });

  /* Estado inicial */
  actualizarVisibilidad();
  actualizarPlazo();
  actualizarContador();

  // Si llega con ?tipo=queja (desde los accesos rápidos), lo preselecciona
  var tipoUrl = new URLSearchParams(window.location.search).get("tipo");
  if (tipoUrl && TIPOS[tipoUrl] && $("tipo-" + tipoUrl)) { $("tipo-" + tipoUrl).checked = true; actualizarPlazo(); }
})();
