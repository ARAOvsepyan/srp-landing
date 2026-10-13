/* 3D-карта сети СРП: canvas 2D без зависимостей.
   Россия — поле золотых точек из /img/map-russia.svg, наклонённое как ландшафт под камерой.
   Сеть растёт из Набережных Челнов: Казань → Екатеринбург → Москва → остальные города.
   Из городов поднимаются световые столбы, дуги связывают их с Челнами,
   «новые города» — пунктирные столбы. Камерой управляет main.js через set(). */
(function () {
  "use strict";
  var MW = 1480, MH = 770;                       // координаты SVG-карты
  var LABELLED = { "Набережные Челны": 1, "Москва": 1, "Санкт-Петербург": 1, "Казань": 1, "Екатеринбург": 1, "Омск": 1, "Воронеж": 1, "Тюмень": 1, "Новочеркасск": 1 };
  var FIRST = ["Набережные Челны", "Казань", "Екатеринбург", "Москва"];

  /* Карта нарисована в равновеликой конической проекции Альберса (центральный меридиан 98.6°,
     стандартные параллели 46.9° и 63.5°). Параметры подобраны по контурам регионов SVG. */
  var R = Math.PI / 180, L0 = 98.614, F1 = 46.8674 * R, F2 = 63.5097 * R;
  var N = (Math.sin(F1) + Math.sin(F2)) / 2, C = Math.cos(F1) * Math.cos(F1) + 2 * N * Math.sin(F1);
  var S = 1143.821, TX = 800.631, TY = -157.872;
  var toUV = function (lat, lon) {
    var rho = Math.sqrt(C - 2 * N * Math.sin(lat * R)) / N, th = N * (lon - L0) * R;
    return [S * rho * Math.sin(th) + TX, S * rho * Math.cos(th) + TY];
  };
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  /* палитры: на светлой теме свечение через "lighter" не видно, поэтому тёмное золото, винные столбы
     и светлые плашки подписей; тёмная — прежнее золото со свечением */
  var PAL_LIGHT = {
    dust: ["#a07a2c", "#c8ae7a"], glow: ["rgba(255,236,205,0.6)", "rgba(255,236,205,0)"],
    dots: ["#5e4314", "#86621f", "#a98a52"], dotA: 0.62, arc: "rgba(125,90,27,0.42)",
    pillar: "rgba(122,36,67,0.95)", pillarHit: "rgba(91,26,53,1)", pillarEnd: "rgba(122,36,67,0)",
    base: "rgba(201,150,70,0.5)", ring: "150,112,42", top: "#5b1a35", topHit: "#3d0f24",
    labelBg: "rgba(255,252,246,0.95)", labelLine: "rgba(150,112,42,0.35)", label: "#231b15", labelFirst: "#7d5a1b",
    ghost: "rgba(125,90,27,0.7)", blend: "source-over"
  };
  var PAL_DARK = {
    dust: ["#f6e7ac", "#bfae7a"], glow: ["rgba(255,196,110,0.12)", "rgba(220,160,80,0)"],
    dots: ["#f1dc94", "#d6bd74", "#a88f50"], dotA: 0.4, arc: "rgba(246,231,172,0.42)",
    pillar: "rgba(255,236,180,0.9)", pillarHit: "rgba(255,255,255,0.95)", pillarEnd: "rgba(220,199,127,0)",
    base: "rgba(255,230,160,0.7)", ring: "246,231,172", top: "#fff3c8", topHit: "#ffffff",
    labelBg: "rgba(10,9,8,0.72)", labelLine: "rgba(220,199,127,0)", label: "#f3eee2", labelFirst: "#f6e7ac",
    ghost: "rgba(246,231,172,0.75)", blend: "lighter"
  };
  var PAL = document.documentElement.dataset.theme === "dark" ? PAL_DARK : PAL_LIGHT;

  function Map3D(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext("2d"); this.opts = opts;
    this.reduce = !!opts.reduceMotion;
    this.P = { cx: 0, cy: 0, k: 1, tilt: 1.1, fu: MW / 2, fv: MH / 2, reveal: 0, ghostOn: 0, alpha: 1, scroll: 0, glow: 1 };
    this.hit = {}; this.running = false; this.t0 = performance.now(); this.dots = [];
    this.ct = Math.cos(this.P.tilt); this.st = Math.sin(this.P.tilt);
    var all = (opts.clubs || []).map(function (c) { var uv = toUV(c.lat, c.lon); return { id: c.id, city: c.city, u: uv[0], v: uv[1] }; });
    var hubC = all.filter(function (c) { return c.city === FIRST[0]; })[0] || all[0] || { u: MW / 2, v: MH / 2 };
    var hub = [hubC.u, hubC.v]; this.hub = hub;
    all.forEach(function (c) {
      var f = FIRST.indexOf(c.city);
      c.d = Math.hypot(c.u - hub[0], c.v - hub[1]);
      c.rank = f >= 0 ? f * 1000 + c.d : 10000 + c.d;
    });
    var clubs = all.sort(function (a, b) { return a.rank - b.rank; });
    var seen = {};
    clubs.forEach(function (c, i) {
      c.i = i; c.h = 38 + ((i * 37) % 28) + (i === 0 ? 34 : FIRST.indexOf(c.city) >= 0 ? 16 : 0);
      c.label = !!LABELLED[c.city] && !seen[c.city]; seen[c.city] = 1;
    });
    this.clubs = clubs;
    var su = 0, sv = 0; clubs.forEach(function (c) { su += c.u; sv += c.v; });
    this.focus = {
      hub: hub,
      net: clubs.length ? [su / clubs.length, sv / clubs.length] : hub,
      full: [MW * 0.5, MH * 0.48]
    };
    this.ghosts = (opts.ghosts || []).map(function (g) { var uv = toUV(g[0], g[1]); return { u: uv[0], v: uv[1] }; });
    this.dust = [];
    for (var i = 0; i < (opts.dust || 120); i++) this.dust.push({ x: Math.random(), y: Math.random(), z: Math.random(), s: Math.random() * 1.6 + 0.4, ph: Math.random() * 6.28 });
    this.resize();
    this.loadMask(opts.mapSrc);
  }

  Map3D.prototype.loadMask = function (src) {
    var self = this, img = new Image();
    img.onload = function () {
      try {
        var w = 740, h = 385, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        var x = cv.getContext("2d", { willReadFrequently: true });
        x.drawImage(img, 0, 0, w, h);
        var data = x.getImageData(0, 0, w, h).data, step = self.opts.step || 6, dots = [];
        for (var v = step / 2; v < MH; v += step) {
          var odd = Math.round(v / step) % 2;
          for (var u = step / 2 + (odd ? step / 2 : 0); u < MW; u += step) {
            var px = Math.floor(u / 2), py = Math.floor(v / 2);
            if (data[(py * w + px) * 4 + 3] < 120) continue;
            var best = 1e9, bi = 0;
            for (var k = 0; k < self.clubs.length; k++) { var dd = Math.hypot(u - self.clubs[k].u, v - self.clubs[k].v); if (dd < best) { best = dd; bi = k; } }
            dots.push({ u: u, v: v, nc: bi, nd: best, r: Math.random() });
          }
        }
        self.dots = dots;
      } catch (e) { self.dots = []; }
      self.draw();
    };
    img.src = src;
  };

  Map3D.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), r = this.c.getBoundingClientRect();
    this.W = Math.max(1, Math.round(r.width)); this.H = Math.max(1, Math.round(r.height)); this.dpr = dpr;
    this.c.width = Math.round(this.W * dpr); this.c.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.f = Math.max(this.W, this.H) * 1.15;
    if (!this.running) this.draw();
  };
  Map3D.prototype.set = function (p) {
    for (var k in p) this.P[k] = p[k];
    this.ct = Math.cos(this.P.tilt); this.st = Math.sin(this.P.tilt); // proj зовётся ~10 тыс. раз за кадр
    if (!this.running) this.draw();
  };
  Map3D.prototype.setHit = function (ids) { this.hit = {}; for (var i = 0; i < ids.length; i++) this.hit[ids[i]] = 1; if (!this.running) this.draw(); };
  Map3D.prototype.start = function () {
    if (this.reduce || this.running) return; this.running = true; var self = this;
    (function loop() { if (!self.running) return; self.draw(); requestAnimationFrame(loop); })();
  };
  Map3D.prototype.stop = function () { this.running = false; };
  Map3D.prototype.setTheme = function () { this.draw(); };

  /* точка карты (u, v) на высоте z → [sx, sy, масштаб перспективы]; (fu, fv) — точка, на которую смотрит камера */
  Map3D.prototype.proj = function (u, v, z) {
    var P = this.P, ct = this.ct, st = this.st;
    var x = (u - P.fu) * P.k, y = (v - P.fv) * P.k, zz = (z || 0) * P.k;
    var depth = -y * st - zz * ct, s = this.f / Math.max(60, this.f + depth);
    return [P.cx + x * s, P.cy + (y * ct - zz * st) * s, s];
  };

  Map3D.prototype.draw = function () {
    var ctx = this.ctx, W = this.W, H = this.H, P = this.P, t = (performance.now() - this.t0) / 1000;
    PAL = document.documentElement.dataset.theme === "dark" ? PAL_DARK : PAL_LIGHT;
    ctx.clearRect(0, 0, W, H);
    if (P.alpha <= 0.005) return;
    ctx.save(); ctx.globalAlpha = P.alpha;

    /* золотая пыль на трёх глубинах */
    for (var i = 0; i < this.dust.length; i++) {
      var q = this.dust[i], dz = 0.2 + q.z * 0.8;
      var y = ((q.y * H - P.scroll * H * 1.4 * dz) % H + H) % H;
      ctx.globalAlpha = P.alpha * (0.06 + 0.3 * dz) * (0.5 + 0.5 * Math.sin(t * (0.5 + q.z) + q.ph));
      ctx.fillStyle = q.z > 0.75 ? PAL.dust[0] : PAL.dust[1];
      ctx.fillRect(q.x * W, y, q.s * dz * 1.3, q.s * dz * 1.3);
    }

    /* мягкое тёплое свечение над картой */
    var far = this.proj(this.focus.net[0], this.focus.net[1] - 260, 0), gr = Math.max(W, H) * 0.6 * P.glow;
    ctx.globalCompositeOperation = PAL.blend; ctx.globalAlpha = P.alpha;
    var g = ctx.createRadialGradient(far[0], far[1], 0, far[0], far[1], gr);
    g.addColorStop(0, PAL.glow[0]); g.addColorStop(1, PAL.glow[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    /* поле точек: территория и тёплый свет вокруг зажжённых клубов */
    var NC = this.clubs.length, litF = 1 + P.reveal * NC, base = clamp(1.2 * P.k, 1.4, 2.6);
    for (i = 0; i < this.dots.length; i++) {
      var d = this.dots[i], pr = this.proj(d.u, d.v, 0);
      if (pr[0] < -10 || pr[0] > W + 10 || pr[1] < -10 || pr[1] > H + 10) continue;
      var lit = clamp(litF - d.nc, 0, 1), near = lit * Math.pow(clamp(1 - d.nd / 70, 0, 1), 1.6);
      var a = PAL.dotA + near * 0.5;
      ctx.globalAlpha = P.alpha * clamp(a * (0.86 + 0.14 * Math.sin(t * 1.1 + d.r * 40)), 0, 1) * clamp(pr[2] * 1.05, 0.3, 1);
      ctx.fillStyle = near > 0.5 ? PAL.dots[0] : near > 0.15 ? PAL.dots[1] : PAL.dots[2];
      var sz = base * pr[2];
      ctx.fillRect(pr[0] - sz / 2, pr[1] - sz / 2, sz, sz);
    }
    ctx.globalAlpha = P.alpha;

    /* дуги от Набережных Челнов */
    var s0 = clamp(P.k, 0.5, 1.6);
    for (i = 1; i < NC; i++) {
      var c = this.clubs[i], ap = clamp(litF - i, 0, 1);
      if (ap <= 0 || c.d < 12) continue;
      var h = c.d * 0.3, steps = 30, upto = Math.max(1, Math.floor(steps * ap));
      ctx.beginPath();
      for (var k2 = 0; k2 <= upto; k2++) {
        var tt = k2 / steps, uu = this.hub[0] + (c.u - this.hub[0]) * tt, vv = this.hub[1] + (c.v - this.hub[1]) * tt;
        var pp = this.proj(uu, vv, 4 * h * tt * (1 - tt));
        if (k2) ctx.lineTo(pp[0], pp[1]); else ctx.moveTo(pp[0], pp[1]);
      }
      ctx.strokeStyle = PAL.arc; ctx.lineWidth = 1 * s0; ctx.stroke();
    }

    /* световые столбы над городами */
    var boxes = [];
    ctx.font = "600 " + Math.round(clamp(11 * s0, 10, 13)) + "px 'Golos Text', system-ui, sans-serif";
    for (i = NC - 1; i >= 0; i--) {
      c = this.clubs[i]; ap = clamp(litF - i, 0, 1);
      var hit = !!this.hit[c.id]; if (ap <= 0 && !hit) continue; if (hit) ap = 1;
      var b = this.proj(c.u, c.v, 0), top = this.proj(c.u, c.v, c.h * ap * (hit ? 1.4 : 1));
      var lw = 1.8 * b[2] * s0;
      ctx.globalCompositeOperation = PAL.blend;
      var lg = ctx.createLinearGradient(b[0], b[1], top[0], top[1]);
      lg.addColorStop(0, hit ? PAL.pillarHit : PAL.pillar); lg.addColorStop(1, PAL.pillarEnd);
      ctx.strokeStyle = lg; ctx.lineWidth = lw * 4; ctx.globalAlpha = P.alpha * 0.14 * ap;
      ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      ctx.lineWidth = lw; ctx.globalAlpha = P.alpha * ap;
      ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      var rr = 12 * b[2] * s0 * ap, pulse = (t * 0.5 + c.i * 0.17) % 1;
      var bg = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], rr * 1.6);
      bg.addColorStop(0, PAL.base); bg.addColorStop(1, "rgba(201,150,70,0)");
      ctx.fillStyle = bg; ctx.save(); ctx.translate(b[0], b[1]); ctx.scale(1, Math.max(0.25, Math.cos(P.tilt)));
      ctx.beginPath(); ctx.arc(0, 0, rr * 1.6, 0, 6.2832); ctx.fill();
      if (i < 4 || hit) {
        ctx.strokeStyle = "rgba(" + PAL.ring + "," + (0.55 * (1 - pulse) * ap) + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, rr * (0.6 + pulse * 1.6), 0, 6.2832); ctx.stroke();
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = hit ? PAL.topHit : PAL.top; ctx.beginPath(); ctx.arc(top[0], top[1], 2.4 * b[2] * s0, 0, 6.2832); ctx.fill();
      if ((c.label || hit) && ap > 0.7) {
        var txt = c.city.toUpperCase(), tw = ctx.measureText(txt).width, bx = top[0] - tw / 2, by = top[1] - 22 * s0, bh = 16;
        var clash = false;
        for (var bi = 0; bi < boxes.length; bi++) { var o = boxes[bi]; if (bx - 7 < o[0] + o[2] + 7 && bx + tw + 7 > o[0] - 7 && by < o[1] + o[3] + 2 && by + bh + 2 > o[1]) { clash = true; break; } }
        if (!clash || hit) {
          boxes.push([bx, by, tw, bh]);
          ctx.globalAlpha = P.alpha * (ap - 0.7) / 0.3; ctx.fillStyle = PAL.labelBg;
          ctx.fillRect(bx - 7, by - 1, tw + 14, bh + 4);
          ctx.strokeStyle = PAL.labelLine; ctx.lineWidth = 1; ctx.strokeRect(bx - 6.5, by - 0.5, tw + 13, bh + 3);
          ctx.fillStyle = i === 0 ? PAL.labelFirst : PAL.label; ctx.fillText(txt, bx, by + 12);
          ctx.globalAlpha = P.alpha;
        }
      }
    }

    /* «новые города»: пунктирные столбы */
    if (P.ghostOn > 0.01) {
      ctx.setLineDash([4, 5]);
      for (i = 0; i < this.ghosts.length; i++) {
        var gh = this.ghosts[i], gb = this.proj(gh.u, gh.v, 0), gt = this.proj(gh.u, gh.v, 60 * P.ghostOn);
        var ph = (t * 0.4 + i * 0.23) % 1;
        ctx.globalAlpha = P.alpha * P.ghostOn;
        ctx.strokeStyle = PAL.ghost; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(gb[0], gb[1]); ctx.lineTo(gt[0], gt[1]); ctx.stroke();
        ctx.save(); ctx.translate(gb[0], gb[1]); ctx.scale(1, Math.max(0.25, Math.cos(P.tilt)));
        ctx.beginPath(); ctx.arc(0, 0, 8 * gb[2] * s0, 0, 6.2832); ctx.stroke();
        ctx.strokeStyle = "rgba(" + PAL.ring + "," + (0.45 * (1 - ph)) + ")";
        ctx.beginPath(); ctx.arc(0, 0, (8 + ph * 20) * gb[2] * s0, 0, 6.2832); ctx.stroke(); ctx.restore();
      }
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  window.SRPMap3D = { create: function (canvas, opts) { return new Map3D(canvas, opts); }, toUV: toUV };
})();
