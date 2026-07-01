/* ============================================================
   PDF handling: lazy first-page thumbnails + a minimal modal viewer.
   Uses PDF.js (window.pdfjsLib, loaded via CDN before this file).
   ============================================================ */
(function () {
  "use strict";

  /* Fetching a local PDF requires http(s); file:// is blocked by the browser's
     same-origin rules and every preview/viewer call below will fail silently.
     Tell the visitor how to fix it instead of leaving "Loading preview" stuck. */
  function showFileProtocolNotice() {
    var nav = document.getElementById("nav");
    if (!nav || nav.querySelector(".file-protocol-notice")) return;
    var bar = document.createElement("div");
    bar.className = "file-protocol-notice";
    bar.setAttribute("role", "status");
    bar.innerHTML =
      "You're viewing this file directly, so PDF previews can't load. Run " +
      "<code>python3 -m http.server</code> in the project folder, then open " +
      "<code>http://localhost:8000</code>." +
      '<button type="button" aria-label="Dismiss">&times;</button>';
    nav.insertBefore(bar, nav.firstChild);

    function sync() { document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px"); }
    sync();
    window.addEventListener("resize", sync);
    bar.querySelector("button").addEventListener("click", function () {
      bar.remove();
      sync();
    });
  }

  function markUnavailable(selector, text) {
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = text; });
  }

  if (window.location.protocol === "file:") {
    document.addEventListener("DOMContentLoaded", showFileProtocolNotice);
  }

  if (!window.pdfjsLib) {
    console.warn("PDF.js not loaded; falling back to direct PDF links.");
    document.addEventListener("DOMContentLoaded", function () {
      markUnavailable(".pdf-card__loading", "Click to open PDF");
      markUnavailable(".resume__preview-fallback", "Click to open resume PDF");
    });
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  var docCache = {}; // url -> Promise<PDFDocumentProxy>

  function loadDoc(url) {
    if (!docCache[url]) {
      docCache[url] = pdfjsLib.getDocument(url).promise;
    }
    return docCache[url];
  }

  /* ---------- thumbnails (first page) ---------- */
  function renderThumb(canvas, url) {
    var wrap = canvas.closest(".pdf-card__thumb") || canvas.parentElement;
    loadDoc(url)
      .then(function (pdf) { return pdf.getPage(1); })
      .then(function (page) {
        // Render at the card's display width for crispness.
        var targetW = Math.max(canvas.clientWidth || 240, 240) * (window.devicePixelRatio || 1);
        var base = page.getViewport({ scale: 1 });
        var viewport = page.getViewport({ scale: targetW / base.width });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        return page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise;
      })
      .then(function () { if (wrap) wrap.classList.add("is-loaded"); })
      .catch(function (err) {
        console.warn("Thumbnail failed for", url, err);
        var label = wrap && wrap.querySelector(".pdf-card__loading");
        if (label) label.textContent = "Click to open PDF";
      });
  }

  function initThumbs() {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-pdf] canvas"));
    if (!cards.length) return;

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var canvas = e.target;
          var url = canvas.closest("[data-pdf]").getAttribute("href");
          renderThumb(canvas, url);
          obs.unobserve(canvas);
        });
      }, { rootMargin: "200px" });
      cards.forEach(function (c) { io.observe(c); });
    } else {
      cards.forEach(function (c) { renderThumb(c, c.closest("[data-pdf]").getAttribute("href")); });
    }
  }

  /* ---------- resume preview ---------- */
  function initResumePreview() {
    var canvas = document.getElementById("resume-canvas");
    if (!canvas) return;
    var url = "assets/resume/Katherine-Keenan-Resume.pdf";
    var wrap = document.querySelector(".resume__preview");
    loadDoc(url)
      .then(function (pdf) { return pdf.getPage(1); })
      .then(function (page) {
        var targetW = 680;
        var base = page.getViewport({ scale: 1 });
        var viewport = page.getViewport({ scale: targetW / base.width });
        canvas.width = viewport.width; canvas.height = viewport.height;
        return page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise;
      })
      .then(function () { if (wrap) wrap.classList.add("is-loaded"); })
      .catch(function (err) {
        console.warn("Resume preview failed", err);
        var fb = document.querySelector(".resume__preview-fallback");
        if (fb) fb.textContent = "Click to open resume PDF";
      });
  }

  /* ---------- modal viewer ---------- */
  var viewer = document.getElementById("viewer");
  var vStage = document.getElementById("viewer-stage");
  var vCanvas = document.getElementById("viewer-canvas");
  var vTitle = document.getElementById("viewer-title");
  var vPage = document.getElementById("viewer-page");
  var vTotal = document.getElementById("viewer-total");
  var vPrev = document.getElementById("viewer-prev");
  var vNext = document.getElementById("viewer-next");
  var vDownload = document.getElementById("viewer-download");

  var current = { pdf: null, page: 1, total: 1, rendering: false, pending: null };
  var lastFocused = null;

  function renderPage(num) {
    if (!current.pdf) return;
    if (current.rendering) { current.pending = num; return; }
    current.rendering = true;
    current.pdf.getPage(num).then(function (page) {
      var stageW = vStage.clientWidth - 36; // padding allowance
      var maxW = Math.min(stageW, 900);
      var base = page.getViewport({ scale: 1 });
      var scale = (maxW / base.width) * (window.devicePixelRatio || 1);
      var viewport = page.getViewport({ scale: scale });
      vCanvas.width = viewport.width;
      vCanvas.height = viewport.height;
      vCanvas.style.width = (viewport.width / (window.devicePixelRatio || 1)) + "px";
      return page.render({ canvasContext: vCanvas.getContext("2d"), viewport: viewport }).promise;
    }).then(function () {
      current.page = num;
      vPage.textContent = num;
      vPrev.disabled = num <= 1;
      vNext.disabled = num >= current.total;
      current.rendering = false;
      if (current.pending !== null) { var p = current.pending; current.pending = null; renderPage(p); }
    }).catch(function (err) {
      current.rendering = false;
      console.warn("Page render failed", err);
    });
  }

  function openViewer(url, title) {
    lastFocused = document.activeElement;
    vTitle.textContent = title || "Document";
    vDownload.setAttribute("href", url);
    vPage.textContent = "1"; vTotal.textContent = "1";
    viewer.hidden = false;
    viewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    document.getElementById("viewer-close").focus();

    loadDoc(url).then(function (pdf) {
      current.pdf = pdf;
      current.total = pdf.numPages;
      vTotal.textContent = pdf.numPages;
      renderPage(1);
    }).catch(function (err) {
      console.warn("Could not open PDF", err);
      window.open(url, "_blank"); // graceful fallback
      closeViewer();
    });
  }

  function closeViewer() {
    viewer.hidden = true;
    viewer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    current.pdf = null; current.page = 1; current.total = 1; current.pending = null;
    var ctx = vCanvas.getContext("2d"); ctx.clearRect(0, 0, vCanvas.width, vCanvas.height);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function go(delta) {
    var next = current.page + delta;
    if (next >= 1 && next <= current.total) renderPage(next);
  }

  /* ---------- wire up ---------- */
  function initModal() {
    document.querySelectorAll("[data-pdf]").forEach(function (card) {
      card.addEventListener("click", function (e) {
        e.preventDefault();
        openViewer(card.getAttribute("href"), card.getAttribute("data-title"));
      });
    });

    vPrev.addEventListener("click", function () { go(-1); });
    vNext.addEventListener("click", function () { go(1); });

    viewer.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeViewer);
    });

    document.addEventListener("keydown", function (e) {
      if (viewer.hidden) return;
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    });

    // Focus trap within the panel while open.
    viewer.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || viewer.hidden) return;
      var panel = viewer.querySelector(".viewer__panel");
      var focusables = panel.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])");
      var list = Array.prototype.filter.call(focusables, function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      if (viewer.hidden || !current.pdf) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { renderPage(current.page); }, 180);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initThumbs();
    initResumePreview();
    initModal();
  });
})();
