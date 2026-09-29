/* CINDER & STONE — ritual sequence, reveals, menu preview (+ FX layer)
   The 3D cairn (webgl.js) reads window.__cinder.intro and the hero rect itself. */
(function () {
  gsap.registerPlugin(ScrollTrigger);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  var reduced = FX.reduced;
  var glReady = new Promise(function (r) { window.__cinder = { intro: 0, ready: r }; });

  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  FX.cursor("ember");
  FX.progress("line-h");
  FX.magnetic("[data-magnetic]");

  /* word-split the intro line */
  var introEl = document.querySelector("[data-words]");
  introEl.innerHTML = introEl.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" ");

  var toast = document.getElementById("toast"), hideTimer;
  document.querySelectorAll("[data-book]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      toast.classList.add("is-on");
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 2600);
    });
  });
  document.querySelectorAll('a[href^="#"]:not([data-book])').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (target && lenis) { e.preventDefault(); lenis.scrollTo(target); }
    });
  });

  if (reduced) {
    document.documentElement.classList.remove("is-loading");
    document.getElementById("nav").classList.add("is-in");
    window.__cinder.intro = 1;
    return;
  }

  /* ---------- the ritual: pinned sequence (created first) ---------- */
  var steps = document.querySelectorAll(".step");
  var bars = document.querySelectorAll(".step__bar");
  var imgs = document.querySelectorAll(".rimg");
  var caps = document.querySelectorAll(".rcap");
  var TEMPS = [85, 8, 45, 22];
  var tempEl = document.getElementById("tempNum");
  var temp = { v: 85 };
  var current = 0;
  function showStep(idx) {
    if (idx === current) return;
    imgs.forEach(function (el) { el.classList.remove("was-on"); });
    imgs[current].classList.add("was-on");
    current = idx;
    steps.forEach(function (el, i) { el.classList.toggle("is-on", i === idx); });
    imgs.forEach(function (el, i) { el.classList.toggle("is-on", i === idx); });
    caps.forEach(function (el, i) { el.classList.toggle("is-on", i === idx); });
    gsap.to(temp, { v: TEMPS[idx], duration: 1.1, ease: "power3.out", overwrite: true, onUpdate: function () { tempEl.textContent = Math.round(temp.v); } });
  }
  var ritualST = ScrollTrigger.create({
    trigger: ".ritual", start: "top top", end: "+=300%", pin: "#ritualPin", anticipatePin: 1,
    onUpdate: function (self) {
      var f = self.progress * 4;
      var idx = Math.min(3, Math.floor(f));
      showStep(idx);
      bars.forEach(function (b, i) { b.style.transform = "scaleX(" + gsap.utils.clamp(0, 1, f - i) + ")"; });
    }
  });
  steps.forEach(function (el, i) {
    el.addEventListener("click", function () {
      var y = ritualST.start + ((i + 0.5) / 4) * (ritualST.end - ritualST.start);
      if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  /* ---------- intro ---------- */
  var heroChars = FX.charRise(document.getElementById("heroTitle"), { trigger: false, style: "blur", stagger: 0.14, duration: 1.8 });
  var arc = document.getElementById("lcArc");
  FX.preloader(glReady, {
    format: function (p) { return Math.round(22 + p * 63); },
    onProgress: function (p) { arc.style.strokeDashoffset = String(1 - p); },
    exit: function (tl, el, resolve) {
      // the loader dissolves like steam into the room
      tl.add(resolve).to(el, { opacity: 0, filter: "blur(26px)", scale: 1.12, duration: 1.4, ease: "power2.inOut" });
    }
  }).then(function () {
    document.documentElement.classList.remove("is-loading");
    lenis && lenis.start();
    document.getElementById("nav").classList.add("is-in");
    gsap.to(window.__cinder, { intro: 1, duration: 3, ease: "expo.out", delay: 0.1 });
    heroChars.play(0).delay(0.35);
    gsap.to(".hero [data-hero]", { opacity: 1, y: 0, duration: 1.2, stagger: 0.12, ease: "power3.out", delay: 0.8 });
    ScrollTrigger.refresh();
  });

  /* nav flips dark over the bone menu */
  ScrollTrigger.create({
    trigger: "#menu", start: "top 40px", end: "bottom 40px",
    toggleClass: { targets: "#nav", className: "is-light" },
    onToggle: function (self) { document.documentElement.classList.toggle("on-light", self.isActive); }
  });

  /* intro line lights word by word */
  var wEls = document.querySelectorAll(".intro__line .w");
  ScrollTrigger.create({
    trigger: ".intro", start: "top 75%", end: "center 40%", scrub: true,
    onUpdate: function (self) {
      var n = Math.floor(self.progress * wEls.length);
      wEls.forEach(function (w, i) { w.classList.toggle("is-on", i <= n); });
    }
  });

  gsap.utils.toArray("[data-split]").forEach(function (h) { FX.charRise(h, { start: "top 86%", style: "blur" }); });
  FX.charRise(document.getElementById("footBreath"), { start: "top 88%", style: "blur", stagger: 0.12 });
  gsap.utils.toArray("[data-scramble]").forEach(function (el) {
    gsap.from(el, { opacity: 0, letterSpacing: "0.6em", duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  /* footer: the cold-to-hot line warms up, an ember travels along it */
  gsap.fromTo("#thermoLine", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".footer__thermo", start: "top bottom", end: "bottom 97%", scrub: 0.6 } });
  gsap.fromTo("#thermoLine b", { left: "0%" }, { left: "100%", ease: "none", scrollTrigger: { trigger: ".footer__thermo", start: "top bottom", end: "bottom 97%", scrub: 0.8 } });
  gsap.from(".footer__hours div", { opacity: 0, y: 20, filter: "blur(8px)", stagger: 0.12, duration: 1.2, ease: "power2.out", scrollTrigger: { trigger: ".footer__hours", start: "top 88%" } });
  FX.clipReveals("[data-clip]");

  gsap.utils.toArray("[data-reveal]").forEach(function (el) {
    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  /* ---------- menu: floating preview follows the cursor ---------- */
  var pv = document.getElementById("preview");
  if (FX.fine && pv) {
    var pimg = pv.querySelector("img");
    var px = innerWidth / 2, py = innerHeight / 2, cx = px, cy = py, lastX = px;
    addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; });
    gsap.ticker.add(function () {
      cx += (px - cx) * 0.12; cy += (py - cy) * 0.12;
      var rot = gsap.utils.clamp(-14, 14, (px - lastX) * 0.4);
      lastX += (px - lastX) * 0.2;
      pv.style.transform = "translate(" + (cx + 150) + "px," + cy + "px) rotate(" + rot + "deg)";
    });
    document.querySelectorAll("[data-preview]").forEach(function (item) {
      item.addEventListener("pointerenter", function () {
        if (pimg.getAttribute("src") !== item.dataset.preview) pimg.src = item.dataset.preview;
        pv.classList.add("is-on");
      });
      item.addEventListener("pointerleave", function () { pv.classList.remove("is-on"); });
    });
  }
})();
