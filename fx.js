/* fx.js — interaction layer (kookyweb)
   Each site passes its own options, so loaders, cursors, progress and reveals differ per brand.
   preloader · cursor (drop | blob | ember) · progress (line-v | ring | line-h) · magnetic
   charRise (rise | pop | blur) · clipReveals · scramble */
window.FX = (function () {
  var fine = window.matchMedia("(pointer: fine)").matches;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- preloader: resolves when the page underneath should start its intro ----------
     opts.format(p)    → text for [data-num]
     opts.onProgress(p)→ drive the site's own loader art
     opts.exit(tl, el, resolve) → add the site's exit to tl and call resolve at the reveal moment */
  function preloader(ready, opts) {
    opts = opts || {};
    var el = document.getElementById("loader");
    if (!el) return Promise.resolve();
    if (reduced) { el.remove(); return Promise.resolve(); }
    var num = el.querySelector("[data-num]");
    var fmt = opts.format || function (p) { return String(Math.round(p * 100)).padStart(3, "0"); };
    var s = { p: 0 };
    function upd() {
      if (num) num.textContent = fmt(s.p);
      if (opts.onProgress) opts.onProgress(s.p);
    }
    upd();
    var crawl = gsap.to(s, { p: 0.86, duration: 2, ease: "power2.out", onUpdate: upd });
    var guard = new Promise(function (r) { setTimeout(r, 4500); });
    var gates = [
      Promise.race([ready || Promise.resolve(), guard]),
      new Promise(function (r) { setTimeout(r, 1500); }),
      document.fonts ? document.fonts.ready : null
    ];
    return Promise.all(gates).then(function () {
      return new Promise(function (resolve) {
        crawl.kill();
        var tl = gsap.timeline({ onComplete: function () { el.remove(); } });
        tl.to(s, { p: 1, duration: 0.5, ease: "power2.inOut", onUpdate: upd });
        tl.to(el.querySelectorAll("[data-loader-fade]"), { opacity: 0, y: -16, duration: 0.4, stagger: 0.05, ease: "power2.in" });
        if (opts.exit) opts.exit(tl, el, resolve);
        else tl.add(resolve).to(el, { opacity: 0, duration: 0.8 });
      });
    });
  }

  /* ---------- cursors ---------- */
  function cursor(type) {
    if (!fine || reduced) return;
    document.documentElement.classList.add("has-cursor");
    var c = document.createElement("div");
    c.className = "cur cur--" + type;
    var lbl = document.createElement("span");
    c.appendChild(lbl);
    document.body.appendChild(c);
    var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, vx = 0, vy = 0;
    addEventListener("pointermove", function (e) { x = e.clientX; y = e.clientY; });

    var trail = [];
    if (type === "ember") {
      for (var i = 0; i < 10; i++) {
        var d = document.createElement("i");
        d.className = "cur-trail";
        d.style.opacity = String(0.5 * (1 - i / 10));
        document.body.appendChild(d);
        trail.push({ el: d, x: x, y: y });
      }
    }

    var ease = type === "blob" ? 0.2 : type === "drop" ? 0.22 : 0.3;
    gsap.ticker.add(function () {
      var nx = cx + (x - cx) * ease, ny = cy + (y - cy) * ease;
      vx = nx - cx; vy = ny - cy; cx = nx; cy = ny;
      var speed = Math.min(Math.hypot(vx, vy), 40);
      var ang = Math.atan2(vy, vx) * 180 / Math.PI;
      if (c.classList.contains("is-hover") && type !== "ember") {
        c.style.transform = "translate(" + cx + "px," + cy + "px)";
      } else if (type === "drop") {
        // oil droplet: stretches along its travel
        var st = 1 + speed / 28;
        c.style.transform = "translate(" + cx + "px," + cy + "px) rotate(" + ang + "deg) scale(" + st + "," + (1 / Math.sqrt(st)) + ")";
      } else if (type === "blob") {
        var sq = 1 + speed / 45;
        c.style.transform = "translate(" + cx + "px," + cy + "px) rotate(" + ang + "deg) scale(" + sq + "," + (2 - sq) + ")";
      } else {
        c.style.transform = "translate(" + cx + "px," + cy + "px)";
        var px = cx, py = cy;
        trail.forEach(function (t, k) {
          t.x += (px - t.x) * (0.45 - k * 0.025);
          t.y += (py - t.y) * (0.45 - k * 0.025);
          t.el.style.transform = "translate(" + t.x + "px," + t.y + "px) scale(" + (1 - k * 0.08) + ")";
          px = t.x; py = t.y;
        });
      }
    });
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("a, button, [data-cursor]");
      var label = t && t.getAttribute("data-cursor");
      c.classList.toggle("is-hover", !!t);
      c.classList.toggle("has-label", !!label);
      lbl.textContent = label || "";
    });
    document.addEventListener("pointerdown", function () { c.classList.add("is-down"); });
    document.addEventListener("pointerup", function () { c.classList.remove("is-down"); });
  }

  /* ---------- scroll progress ---------- */
  function progress(type) {
    var el = document.createElement("div");
    el.className = "prog prog--" + type;
    var fill = null, txt = null, circ = 0;
    if (type === "ring") {
      el.innerHTML = '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" /><circle class="prog__arc" cx="22" cy="22" r="19" /></svg><b>0</b>';
      fill = el.querySelector(".prog__arc");
      txt = el.querySelector("b");
      circ = 2 * Math.PI * 19;
      fill.style.strokeDasharray = circ;
      fill.style.strokeDashoffset = circ;
    } else {
      el.innerHTML = "<i></i>";
      fill = el.firstChild;
    }
    document.body.appendChild(el);
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: function (self) {
        var p = self.progress;
        if (type === "ring") { fill.style.strokeDashoffset = circ * (1 - p); txt.textContent = Math.round(p * 100); }
        else if (type === "line-v") fill.style.transform = "scaleY(" + p + ")";
        else fill.style.transform = "scaleX(" + p + ")";
      }
    });
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

  /* headline reveal — opts.style: "rise" (3D letters), "pop" (bouncy scale), "blur" (words de-blur) */
  function charRise(el, opts) {
    opts = opts || {};
    var style = opts.style || "rise";
    splitChars(el);
    var targets, from, to;
    if (style === "blur") {
      targets = el.querySelectorAll(".word");
      from = { opacity: 0, filter: "blur(14px)", y: 12 };
      to = { opacity: 1, filter: "blur(0px)", y: 0, duration: opts.duration || 1.4, stagger: opts.stagger || 0.08, ease: "power2.out" };
    } else if (style === "pop") {
      targets = el.querySelectorAll(".ch");
      from = { opacity: 0, scale: 0.2, yPercent: 60, rotation: function () { return gsap.utils.random(-25, 25); }, transformOrigin: "50% 100%" };
      to = { opacity: 1, scale: 1, yPercent: 0, rotation: 0, duration: opts.duration || 0.9, stagger: opts.stagger || 0.035, ease: "back.out(2.4)" };
    } else {
      targets = el.querySelectorAll(".ch");
      gsap.set(el, { perspective: 800 });
      from = { yPercent: 120, rotateX: -85, opacity: 0, transformOrigin: "50% 100% -20px" };
      to = { yPercent: 0, rotateX: 0, opacity: 1, duration: opts.duration || 1.1, stagger: opts.stagger || 0.022, ease: "expo.out" };
    }
    gsap.set(targets, from);
    if (opts.trigger !== false) to.scrollTrigger = { trigger: el, start: opts.start || "top 85%" };
    else to.paused = true;
    return gsap.to(targets, to);
  }

  /* ---------- clip-path image wipes ---------- */
  function clipReveals(sel, from) {
    if (reduced) return;
    var start = from || "inset(100% 0% 0% 0%)";
    gsap.utils.toArray(sel).forEach(function (f) {
      var img = f.querySelector("img, video");
      gsap.set(f, { clipPath: start });
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

  return {
    fine: fine, reduced: reduced,
    preloader: preloader, cursor: cursor, progress: progress, magnetic: magnetic,
    splitChars: splitChars, charRise: charRise, clipReveals: clipReveals,
    scramble: scramble, scrambleOnScroll: scrambleOnScroll
  };
})();
