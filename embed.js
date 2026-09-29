/* embed.js — only active when framed with ?embed=tour (the kookyweb Design Lab preview cards).
   Tells the parent when the intro has finished and runs a slow auto-scroll tour on request.
   Messages in:  { kw: 1, cmd: "play" | "pause" | "top" }
   Messages out: { kw: 1, ev: "ready" } */
(function () {
  if (window.self === window.top || !/[?&]embed=tour\b/.test(location.search)) return;
  var root = document.documentElement;
  root.classList.add("is-embed");
  // framed previews are drawn scaled down — render WebGL at 1x to keep the GPU light
  try { Object.defineProperty(window, "devicePixelRatio", { get: function () { return 1; } }); } catch (e) {}

  var playing = false, ready = false, y = 0, last = 0, hold = 2600, state = "hero";
  var SPEED = 0.24; // px per ms at a 900px-tall viewport

  function post(m) { m.kw = 1; try { window.parent.postMessage(m, "*"); } catch (e) {} }
  function maxY() { return root.scrollHeight - innerHeight; }

  var iv = setInterval(function () {
    if (!root.classList.contains("is-loading") && !document.getElementById("loader")) {
      clearInterval(iv); ready = true; post({ ev: "ready" });
    }
  }, 120);

  addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.kw !== 1 || !d.cmd) return;
    if (d.cmd === "play") { playing = true; last = 0; }
    else if (d.cmd === "pause") { playing = false; }
    else if (d.cmd === "top") { y = 0; hold = 2600; state = "hero"; window.scrollTo(0, 0); }
  });

  function loop(t) {
    requestAnimationFrame(loop);
    if (!playing || !ready) { last = 0; return; }
    if (!last) { last = t; y = window.scrollY; return; }
    var dt = t - last; last = t;
    if (hold > 0) {
      hold -= dt;
      if (hold <= 0 && state === "end") { y = 0; window.scrollTo(0, 0); state = "hero"; hold = 2600; }
      return;
    }
    state = "run";
    y += Math.min(dt, 120) * SPEED * (innerHeight / 900);
    if (y >= maxY()) { y = maxY(); state = "end"; hold = 1800; }
    window.scrollTo(0, y);
  }
  requestAnimationFrame(loop);
})();
