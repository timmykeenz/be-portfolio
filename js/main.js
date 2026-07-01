/* ============================================================
   Site behavior: AOS, sticky/active nav, mobile menu,
   recommendation letter modal, reduced-motion handling.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll animations ---------- */
  function revealAll() {
    document.querySelectorAll("[data-aos]").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  }
  if (window.AOS) {
    AOS.init({
      duration: 650,
      easing: "ease-out-cubic",
      once: true,
      offset: 60,
      disable: reduceMotion
    });
  } else {
    // AOS (CDN) failed to load: make sure no content stays hidden.
    revealAll();
  }

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- nav: shrink/shadow on scroll ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 12) nav.classList.add("is-stuck");
    else nav.classList.remove("is-stuck");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");

  function closeMenu() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }
  function openMenu() {
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
  }
  toggle.addEventListener("click", function () {
    if (nav.classList.contains("is-open")) closeMenu(); else openMenu();
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) closeMenu();
  });

  /* ---------- active section highlight ---------- */
  var navLinks = Array.prototype.slice.call(links.querySelectorAll("a"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- recommendation letter modal ---------- */
  var letterModal = document.getElementById("letter-modal");
  if (letterModal) {
    var letterBody = document.getElementById("letter-modal-body");
    var letterTitle = document.getElementById("letter-modal-title");
    var letterPdf = document.getElementById("letter-modal-pdf");
    var letterClose = document.getElementById("letter-modal-close");
    var letterLastFocused = null;

    function openLetter(card) {
      var name = card.querySelector(".rec-card__name").textContent.trim();
      var tmpl = card.querySelector("template");
      var pdf = card.querySelector(".rec-card__pdf");
      letterTitle.textContent = name;
      letterBody.innerHTML = "";
      letterBody.appendChild(tmpl.content.cloneNode(true));
      letterPdf.setAttribute("href", pdf.getAttribute("href"));
      letterLastFocused = document.activeElement;
      letterModal.hidden = false;
      letterModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      letterClose.focus();
    }
    function closeLetter() {
      letterModal.hidden = true;
      letterModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
      if (letterLastFocused && letterLastFocused.focus) letterLastFocused.focus();
    }

    document.querySelectorAll("[data-letter-trigger]").forEach(function (btn) {
      btn.addEventListener("click", function () { openLetter(btn.closest(".rec-card")); });
    });
    letterModal.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeLetter);
    });
    document.addEventListener("keydown", function (e) {
      if (letterModal.hidden) return;
      if (e.key === "Escape") { closeLetter(); return; }
      if (e.key !== "Tab") return;
      var panel = letterModal.querySelector(".viewer__panel");
      var focusables = panel.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])");
      var list = Array.prototype.filter.call(focusables, function (el) { return el.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
})();
