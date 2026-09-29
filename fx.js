/* fx.js — premium interaction layer (kookyweb)
   preloader · custom cursor · magnetic buttons · char split · clip reveals · text scramble · progress bar
   Themed through CSS vars in fx.css: --fx-bg, --fx-ink, --fx-accent */
window.FX = (function () {
  var fine = window.matchMedia("(pointer: fine)").matches;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- preloader: counter + bar, resolves when the curtain starts lifting ---------- */
  function preloader(ready) {
    var el = document.getElementById("loader");
    if (!el) return Promise.resolve();
    if (reduced) { el.remove(); return Promise.resolve(); }
    var num = el.querySelector("[data-num]");
    var bar = el.querySelector("[data-bar]");
    var s = { p: 0 };
    function upd() {
      if (num) num.textContent = String(Math.round(s.p * 100)).padStart(3, "0");
      if (bar) bar.style.transform = "scaleX(" + s.p + ")";
    }
    var crawl = gsap.to(s, { p: 0.86, duration: 2, ease: "power2.out", onUpdate: upd });
    var guard = new Promise(function (r) { setTimeout(r, 4500); });
    var gates = [
      Promise.race([ready || Promise.resolve(), guard]),
      new Promise(function (r) { setTimeout(r, 1300); }),
      document.fonts ? document.fonts.ready : null
    ];
    return Promise.all(gates).then(function () {
      return new Promise(function (resolve) {
        crawl.kill();
        gsap.timeline({ onComplete: function () { el.remove(); } })
          .to(s, { p: 1, duration: 0.45, ease: "power2.inOut", onUpdate: upd })
          .to(el.querySelectorAll("[data-loader-fade]"), { opacity: 0, y: -24, duration: 0.45, stagger: 0.05, ease: "power2.in" })
          .add(resolve)
          .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.15, ease: "expo.inOut" }, "<");
      });
    });
  }

  /* ---------- custom cursor ---------- */
  function cursor() {
    if (!fine || reduced) return;
    var dot = document.createElement("div"); dot.className = "cur-dot";
    var ring = document.createElement("div"); ring.className = "cur-ring";
    var lbl = document.createElement("span"); ring.appendChild(lbl);
    document.body.appendChild(dot); document.body.appendChild(ring);
    document.documentElement.classList.add("has-cursor");
    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.transform = "translate(" + x + "px," + y + "px)";
    });
    gsap.ticker.add(function () {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
    });
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("a, button, [data-cursor]");
      var label = t && t.getAttribute("data-cursor");
      ring.classList.toggle("is-hover", !!t);
      ring.classList.toggle("has-label", !!label);
      lbl.textContent = label || "";
    });
    document.addEventListener("pointerdown", function () { ring.classList.add("is-down"); });
    document.addEventListener("pointerup", function () { ring.classList.remove("is-down"); });
  }

  /* ---------- magnetic elements ---------- */
  function magnetic(sel, strength) {
    if (!fine || reduced) return;
    var k = strength || 0.35;
    document.querySelectorAll(sel).forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * k);
        yTo((e.clientY - r.top - r.height / 2) * k);
      });
      el.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }

  /* ---------- split text into .word > .ch (keeps inline tags like <em>) ---------- */
  function splitChars(root) {
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(" ")); return; }
            var ws = document.createElement("span"); ws.className = "word";
            Array.from(w).forEach(function (ch) {
              var s = document.createElement("span"); s.className = "ch"; s.textContent = ch; ws.appendChild(s);
            });
            frag.appendChild(ws);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
    })(root);
    return root.querySelectorAll(".ch");
  }

  /* 3D char rise — returns tween (paused if no trigger) */
  function charRise(el, opts) {
    opts = opts || {};
    var chars = splitChars(el);
    gsap.set(el, { perspective: 800 });
    gsap.set(chars, { yPercent: 120, rotateX: -85, opacity: 0, transformOrigin: "50% 100% -20px" });
    var cfg = {
      yPercent: 0, rotateX: 0, opacity: 1, duration: opts.duration || 1.1,
      stagger: opts.stagger || 0.022, ease: "expo.out"
    };
    if (opts.trigger !== false) cfg.scrollTrigger = { trigger: el, start: opts.start || "top 85%" };
    else cfg.paused = true;
    return gsap.to(chars, cfg);
  }

  /* ---------- clip-path image wipes ---------- */
  function clipReveals(sel) {
    if (reduced) return;
    gsap.utils.toArray(sel).forEach(function (f) {
      var img = f.querySelector("img, video");
      gsap.set(f, { clipPath: "inset(100% 0% 0% 0%)" });
      var tl = gsap.timeline({ scrollTrigger: { trigger: f, start: "top 88%" } });
      tl.to(f, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" });
      if (img) tl.from(img, { scale: 1.4, duration: 2, ease: "expo.out" }, 0.1);
    });
  }

  /* ---------- scramble text ---------- */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+";
  function scramble(el, dur) {
    var final = el.dataset.final || el.textContent;
    el.dataset.final = final;
    var o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: dur || 0.9, ease: "none",
      onUpdate: function () {
        var n = Math.floor(o.p * final.length);
        el.textContent = final.slice(0, n) + final.slice(n).replace(/[^\s·—\/&]/g, function () {
          return GLYPHS[(Math.random() * GLYPHS.length) | 0];
        });
      },
      onComplete: function () { el.textContent = final; }
    });
  }
  function scrambleOnScroll(sel) {
    if (reduced) return;
    gsap.utils.toArray(sel).forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: function () { scramble(el); } });
      if (fine) el.addEventListener("pointerenter", function () { scramble(el, 0.5); });
    });
  }

  /* ---------- scroll progress bar ---------- */
  function progress() {
    var bar = document.createElement("div"); bar.className = "fx-progress";
    document.body.appendChild(bar);
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: function (self) { bar.style.transform = "scaleX(" + self.progress + ")"; }
    });
  }

  return {
    fine: fine, reduced: reduced,
    preloader: preloader, cursor: cursor, magnetic: magnetic,
    splitChars: splitChars, charRise: charRise, clipReveals: clipReveals,
    scramble: scramble, scrambleOnScroll: scrambleOnScroll, progress: progress
  };
})();
