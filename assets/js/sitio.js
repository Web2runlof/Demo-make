/* Comportamientos comunes: menú móvil, barra de accesibilidad y buscador de trámites */
(function () {
  "use strict";

  /* ---------- Preferencias guardadas (sin romper si el navegador bloquea el almacenamiento) ---------- */
  function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ } }

  var raiz = document.documentElement;
  var ESCALAS = [0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
  var indice = Number(leer("spf-escala"));
  if (!(indice >= 0 && indice < ESCALAS.length)) indice = 1;

  function aplicarEscala() {
    raiz.style.setProperty("--escala", ESCALAS[indice]);
    guardar("spf-escala", String(indice));
  }
  function aplicarContraste(activo) {
    if (activo) raiz.setAttribute("data-contraste", "alto"); else raiz.removeAttribute("data-contraste");
    guardar("spf-contraste", activo ? "1" : "0");
    var b = document.getElementById("acc-contraste");
    if (b) b.setAttribute("aria-pressed", activo ? "true" : "false");
  }

  aplicarEscala();
  aplicarContraste(leer("spf-contraste") === "1");

  var anunciador = document.getElementById("anuncio-accesibilidad");
  function anunciar(texto) {
    if (!anunciador) return;
    anunciador.textContent = "";
    window.setTimeout(function () { anunciador.textContent = texto; }, 60);
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-acc]");
    if (!b) return;
    var accion = b.getAttribute("data-acc");
    if (accion === "mas" && indice < ESCALAS.length - 1) { indice++; aplicarEscala(); anunciar("Texto ampliado al " + Math.round(ESCALAS[indice] * 100) + " por ciento"); }
    else if (accion === "menos" && indice > 0) { indice--; aplicarEscala(); anunciar("Texto reducido al " + Math.round(ESCALAS[indice] * 100) + " por ciento"); }
    else if (accion === "contraste") { var on = !raiz.hasAttribute("data-contraste"); aplicarContraste(on); anunciar(on ? "Alto contraste activado" : "Alto contraste desactivado"); }
    else if (accion === "restablecer") { indice = 1; aplicarEscala(); aplicarContraste(false); anunciar("Preferencias de visualización restablecidas"); }
  });

  /* ---------- Menú móvil ---------- */
  var botonMenu = document.querySelector(".menu-boton");
  var listaMenu = document.getElementById("menu-principal");
  if (botonMenu && listaMenu) {
    botonMenu.addEventListener("click", function () {
      var abierto = botonMenu.getAttribute("aria-expanded") === "true";
      botonMenu.setAttribute("aria-expanded", String(!abierto));
      listaMenu.classList.toggle("abierto", !abierto);
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && botonMenu.getAttribute("aria-expanded") === "true") {
        botonMenu.setAttribute("aria-expanded", "false");
        listaMenu.classList.remove("abierto");
        botonMenu.focus();
      }
    });
  }

  /* ---------- Buscador: filtra los trámites de la página de inicio ---------- */
  var formBuscar = document.getElementById("form-buscar");
  if (formBuscar) {
    formBuscar.addEventListener("submit", function (ev) {
      var tarjetas = document.querySelectorAll("[data-tramite]");
      if (!tarjetas.length) return; // en páginas internas el formulario lleva al inicio con ?q=
      ev.preventDefault();
      filtrar(formBuscar.q.value);
      var destino = document.getElementById("tramites");
      if (destino) { destino.scrollIntoView(); destino.focus({ preventScroll: true }); }
    });
    var q = new URLSearchParams(window.location.search).get("q");
    if (q && document.querySelector("[data-tramite]")) { formBuscar.q.value = q; filtrar(q); }
  }

  function normalizar(t) { return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function filtrar(texto) {
    var termino = normalizar(texto).trim();
    var visibles = 0;
    document.querySelectorAll("[data-tramite]").forEach(function (t) {
      var coincide = !termino || normalizar(t.textContent + " " + t.getAttribute("data-tramite")).indexOf(termino) !== -1;
      t.hidden = !coincide;
      if (coincide) visibles++;
    });
    var aviso = document.getElementById("resultado-busqueda");
    if (aviso) {
      aviso.hidden = false;
      aviso.className = visibles ? "visualmente-oculto" : "sin-resultados";
      aviso.textContent = termino
        ? (visibles ? visibles + " trámite(s) coinciden con «" + texto + "»." : "No encontramos trámites con «" + texto + "». Puede radicar su inquietud como una PQRSD.")
        : "Se muestran todos los trámites.";
    }
  }
})();
