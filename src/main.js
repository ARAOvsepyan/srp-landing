(() => {
  "use strict";
  window.SRP_BOOT = 1; // скрипт успел: страховка «reveal-now» из <head> не нужна
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, "е").trim();
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
  };

  /* ---------- Шапка, прогресс, активное меню, липкая кнопка ---------- */
  const header = $("#header");
  const sticky = $(".sticky-cta");
  const applySec = $("#apply");
  const navLinks = $$(".nav a");
  const sectionByLink = navLinks.map((a) => $(a.getAttribute("href")));
  let applyVisible = false;
  new IntersectionObserver(([e]) => { applyVisible = e.isIntersecting; }, { threshold: 0.15 }).observe(applySec);

  /* ---------- Заголовки по словам (не делим, если контент уже показан без анимации) ---------- */
  if (!reduce && !document.documentElement.classList.contains("reveal-now")) {
    let wi = 0;
    const wrap = (node, gold) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const outer = document.createElement("span"); outer.className = "wd";
            const inner = document.createElement("span"); inner.textContent = part; inner.style.setProperty("--i", wi++);
            if (gold) inner.className = "gold-text";
            outer.appendChild(inner); frag.appendChild(outer);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) {
          const isGold = ch.classList.contains("gold-text");
          wrap(ch, gold || isGold);
          if (isGold) ch.classList.remove("gold-text");
        }
      });
    };
    $$("h2.reveal").forEach((h) => { wi = 0; h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim()); wrap(h, false); });
  }

  /* ---------- Появление блоков ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: "0px 0px 6% 0px" });
  $$(".reveal").forEach((el) => revealIO.observe(el));

  /* ---------- Счётчики ---------- */
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, suffix = el.dataset.suffix || "";
      if (reduce) { el.textContent = fmt(to) + suffix; return; }
      const t0 = performance.now(), dur = 1700;
      const step = (now) => {
        const t = clamp((now - t0) / dur);
        el.textContent = fmt(to * ease(t)) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  $$("[data-count]").forEach((el) => { el.textContent = "0" + (el.dataset.suffix || ""); if (!el.closest(".gcard")) countIO.observe(el); });

  /* ---------- Параллакс: один rAF-цикл, пишет только CSS-переменные ---------- */
  const items = $$("[data-parallax],[data-parallax-x]").map((el) => ({
    el, y: parseFloat(el.dataset.parallax || 0), x: parseFloat(el.dataset.parallaxX || 0),
    m: parseFloat(el.dataset.mouse || 0), base: 0, vis: true,
  }));
  const visIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const it = items.find((i) => i.el === e.target); if (it) it.vis = e.isIntersecting; });
  }, { rootMargin: "25% 0px 25% 0px" });
  items.forEach((it) => visIO.observe(it.el));

  const devices = $("#devices");
  const scene = $(".orbit");
  const lgScene = $(".lg-scene");
  const lgContent = $(".lg-content");
  const lgVideo = $("#league-video");
  const lgPhotos = $$(".lg-photo");
  const lgWord = $(".lg-word span");
  const litEl = $("#lit"), litWord = $("#lit-word"), litCity = $("#lit-city");
  const steps = $("#steps");
  const panel = $(".orbit-panel");
  const gcards = $$(".gcard");
  const sm = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const plural = (n, f) => f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];

  /* ---------- 3D-карта России ---------- */
  let map = null;
  const canvas = $("#map3d");
  if (canvas && window.SRPMap3D) {
    const small = innerWidth < 760;
    map = window.SRPMap3D.create(canvas, {
      mapSrc: "/img/map-russia.svg", clubs: window.SRP_CLUBS || [], ghosts: window.SRP_GHOSTS || [],
      step: small ? 8 : 5, dust: small ? 60 : 120, reduceMotion: reduce,
    });
    new IntersectionObserver(([e]) => { e.isIntersecting ? map.start() : map.stop(); }, { threshold: 0 }).observe(scene);
  }
  // счётчики стеклянных карточек запускаются, когда карточка выезжает
  const cardCounters = gcards.map((c) => $("[data-count]", c)).filter(Boolean);
  const runCount = (el) => {
    if (el.dataset.done) return; el.dataset.done = "1";
    const to = +el.dataset.count, suffix = el.dataset.suffix || "";
    if (reduce) { el.textContent = fmt(to) + suffix; return; }
    const t0 = performance.now();
    const step = (now) => { const t = clamp((now - t0) / 1500); el.textContent = fmt(to * ease(t)) + suffix; if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  let vh = innerHeight, vw = innerWidth, docH = 1, sceneTop = 0, sceneH = 1, lgTop = 0, lgH = 1, mx = 0, my = 0, tx = 0, ty = 0, raf = 0, lastLit = -1;

  const measure = () => {
    vh = innerHeight; vw = innerWidth;
    docH = document.documentElement.scrollHeight;
    items.forEach((it) => {
      it.el.style.removeProperty("--py"); it.el.style.removeProperty("--px");
      const r = it.el.getBoundingClientRect();
      it.base = r.top + scrollY + r.height / 2;
    });
    const sr = scene.getBoundingClientRect(); sceneTop = sr.top + scrollY; sceneH = sr.height;
    const lr = lgScene.getBoundingClientRect(); lgTop = lr.top + scrollY; lgH = lr.height;
    if (map) map.resize();
    request();
  };

  /* Масштаб сети: камера над Россией, прогресс p (0…1)
     0–.14   карта выплывает снизу, сильный наклон, камера над Набережными Челнами
     .12–.58 сеть растёт: Челны → Казань → Екатеринбург → Москва → остальные; камера отъезжает на всю сеть
     .58–.86 камера поднимается над всей Россией, «новые города», панель проверки города
     .86–1   кадр держится, затем уезжает вверх вместе со страницей */
  const clubOrder = map ? map.clubs : [];
  const driveNetwork = (p, ap = 1) => {
    const small = vw < 760;
    const enter = sm(0.25, 0.95, ap), grow = sm(0.14, 0.58, p), east = sm(0.58, 0.86, p), hold = sm(0.86, 1, p);
    const k0 = small ? vw / 330 : vw / 640, k1 = small ? vw / 600 : vw / 1100, k2 = small ? vw / 1300 : vw / 2150;
    const k = lerp(lerp(k0, k1, grow), k2, east) * (1 - hold * 0.06);
    const tilt = lerp(lerp(1.2, 0.98, sm(0.05, 0.5, p)), 0.84, east) + hold * 0.06;
    if (map) {
      const F = map.focus, gu = ease(grow);
      const fu = lerp(lerp(F.hub[0], F.net[0], gu), F.full[0], east);
      const fv = lerp(lerp(F.hub[1], F.net[1], gu), F.full[1], east);
      const cy = lerp(vh * 1.1, small ? vh * 0.6 : vh * 0.7, enter) - (small ? east * vh * 0.12 : east * vh * 0.1);
      const cx = small ? vw * 0.5 : lerp(vw * 0.5, vw * 0.69, east);
      map.set({ cx, cy, k, tilt, fu, fv, reveal: sm(0.12, 0.56, p) * 1.04, ghostOn: sm(0.66, 0.8, p), alpha: enter, scroll: p, glow: 1 - east * 0.3 });
    }
    const reveal = sm(0.12, 0.56, p) * 1.04, ghostOn = sm(0.66, 0.8, p);

    const hh = sm(0.55, 1, ap);
    const c1 = sm(0.24, 0.34, p), c2 = sm(0.32, 0.42, p), c3 = sm(0.4, 0.5, p);
    const po = sm(0.58, 0.65, p), pp = sm(0.64, 0.74, p);
    const st = scene.style;
    st.setProperty("--po", po.toFixed(3));
    st.setProperty("--hh", hh.toFixed(3));
    st.setProperty("--c1", c1.toFixed(3)); st.setProperty("--c2", c2.toFixed(3)); st.setProperty("--c3", c3.toFixed(3));
    st.setProperty("--pp", pp.toFixed(3));
    panel.classList.toggle("on", pp > 0.5);
    scene.classList.toggle("show-ghosts", ghostOn > 0.5 && pp > 0.2);
    cardCounters.forEach((el, i) => { if ([c1, c2, c3][i] > 0.5) runCount(el); });

    const total = (window.SRP_CLUBS || []).length;
    const lit = Math.max(1, Math.min(total, Math.floor(1 + clamp(reveal) * total)));
    if (lit !== lastLit) {
      lastLit = lit;
      litEl.textContent = lit;
      litWord.textContent = plural(lit, ["клуб", "клуба", "клубов"]);
      if (lit > 0 && clubOrder[lit - 1]) litCity.textContent = "+ " + clubOrder[lit - 1].city;
    }

    if (!reduce) {
      gcards.forEach((c) => {
        const d = +c.dataset.depth;
        c.style.setProperty("--py", (-(p - 0.38) * vh * 0.35 * d + my * 6 * d).toFixed(1) + "px");
        c.style.setProperty("--px", (mx * 8 * d).toFixed(1) + "px");
        c.style.setProperty("--tx", (-my * 6).toFixed(2) + "deg");
        c.style.setProperty("--ty", (mx * 8).toFixed(2) + "deg");
        c.style.setProperty("--sx", ((mx * 0.5 + p) * 160 - 80).toFixed(1) + "%");
      });
    }
  };

  /* Лига городов: видео финала раскрывается из карточки на весь экран */
  const photoDir = [[-1, -0.6], [1, -0.4], [-0.7, 1]];
  const driveLeague = (p) => {
    const a = sm(0.06, 0.48, p);
    const vs = lerp(vw < 760 ? 0.62 : 0.42, 1, a);
    const st = lgScene.style;
    st.setProperty("--la", a.toFixed(3));
    st.setProperty("--vs", vs.toFixed(4));
    st.setProperty("--vr", (lerp(28, 0, a) / vs).toFixed(1) + "px");
    st.setProperty("--sh", (sm(0.44, 0.6, p) * 0.95).toFixed(3));
    st.setProperty("--wx", ((0.5 - p) * vw * 0.5).toFixed(1) + "px");
    const lc = [sm(0.52, 0.64, p), sm(0.56, 0.68, p), sm(0.6, 0.72, p), sm(0.64, 0.76, p), sm(0.68, 0.8, p)];
    lc.forEach((v, i) => st.setProperty("--lc" + i, v.toFixed(3)));
    lgContent.classList.toggle("on", lc[0] > 0.5);
    if (!reduce) {
      lgPhotos.forEach((ph, i) => {
        const d = +ph.dataset.d, dir = photoDir[i];
        ph.style.setProperty("--px", (dir[0] * a * vw * 0.28 + mx * 10 * d).toFixed(1) + "px");
        ph.style.setProperty("--py", (dir[1] * a * vh * 0.3 - p * 60 * d + my * 8 * d).toFixed(1) + "px");
        ph.style.setProperty("--po", (1 - sm(0.2, 0.46, p)).toFixed(3));
      });
    }
  };

  const frame = () => {
    raf = 0;
    const y = scrollY;
    header.classList.toggle("is-solid", y > 24);
    document.documentElement.style.setProperty("--sp", clamp(y / Math.max(1, docH - vh)).toFixed(4));
    const inScene = (y >= sceneTop + vh * 0.2 && y <= sceneTop + sceneH - vh * 0.8) || (y >= lgTop && y <= lgTop + lgH - vh);
    sticky.classList.toggle("show", y > vh * 0.8 && !applyVisible && !inScene);

    if (!reduce) {
      mx += (tx - mx) * 0.07; my += (ty - my) * 0.07;
      const mid = y + vh / 2;
      for (const it of items) {
        if (!it.vis) continue;
        const d = mid - it.base;
        const py = it.y * d + it.m * my * 1.0;
        const px = it.x * d + it.m * mx * 1.0;
        it.el.style.setProperty("--py", py.toFixed(1) + "px");
        it.el.style.setProperty("--px", px.toFixed(1) + "px");
      }
    }

    if (y > sceneTop - vh && y < sceneTop + sceneH) driveNetwork(clamp((y - sceneTop) / Math.max(1, sceneH - vh)), clamp((y - sceneTop + vh) / vh));
    if (y > lgTop - vh && y < lgTop + lgH) driveLeague(clamp((y - lgTop) / Math.max(1, lgH - vh)));

    // Mac и iPhone выезжают из глубины: наклон уходит по мере приближения к центру экрана
    if (devices) {
      const r = devices.getBoundingClientRect();
      devices.style.setProperty("--dk", clamp((vh - r.top) / (vh * 0.9)).toFixed(3));
    }

    // Линия «как запуститься» рисуется по мере прокрутки
    if (steps) {
      const r = steps.getBoundingClientRect();
      steps.style.setProperty("--sp2", clamp((vh * 0.65 - r.top) / r.height).toFixed(3));
    }

    // Активный пункт меню
    let active = -1;
    sectionByLink.forEach((s, i) => { if (s) { const r = s.getBoundingClientRect(); if (r.top < vh * 0.4 && r.bottom > vh * 0.4) active = i; } });
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === active));

    if (Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002) request();
  };
  const request = () => { if (!raf) raf = requestAnimationFrame(frame); };

  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", () => { measure(); }, { passive: true });
  addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (finePointer && !reduce) {
    addEventListener("pointermove", (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
      request();
    }, { passive: true });
  }
  measure();

  /* ---------- Наклон карточек и магнитные кнопки ---------- */
  if (finePointer && !reduce) {
    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
        el.classList.add("is-hover");
        el.style.setProperty("--ty", ((nx - 0.5) * 9).toFixed(2) + "deg");
        el.style.setProperty("--tx", ((0.5 - ny) * 9).toFixed(2) + "deg");
        el.style.setProperty("--mx", (nx * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (ny * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("is-hover");
        el.style.setProperty("--tx", "0deg"); el.style.setProperty("--ty", "0deg");
      });
    });
  }

  /* ---------- Видео: играют только на экране; поверх фото-подложки — только когда пошли кадры ---------- */
  const markReady = (v) => {
    const box = v && v.closest(".vbox");
    if (!box) return;
    const on = () => { if (v.currentTime > 0.04 || !v.paused) box.classList.add("is-ready"); };
    v.addEventListener("playing", on);
    v.addEventListener("timeupdate", on);
  };
  const watchVideo = (v, lazy) => {
    if (!v) return;
    markReady(v);
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (lazy) { const src = v.querySelector("source[data-src]"); if (src) { src.src = src.dataset.src; src.removeAttribute("data-src"); v.load(); } }
        if (!reduce) v.play().catch(() => {});
      } else v.pause();
    }, { rootMargin: "200px 0px" }).observe(v);
  };

  /* ---------- Тема: светлая по умолчанию, выбор запоминаем (ставится ещё в <head>, без вспышки) ---------- */
  const themeBtn = $("#theme-toggle"), themeMeta = $('meta[name="theme-color"]');
  const isDark = () => document.documentElement.dataset.theme === "dark";
  const applyTheme = (dark) => {
    if (dark) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
    themeBtn?.setAttribute("aria-pressed", String(dark));
    themeBtn?.setAttribute("aria-label", dark ? "Светлая тема" : "Тёмная тема");
    themeMeta?.setAttribute("content", dark ? "#0a0908" : "#f7f1e8");
    if (map) map.setTheme(dark ? "dark" : "light");
  };
  themeBtn?.addEventListener("click", () => { const dark = !isDark(); store.set("srp-theme", dark ? "dark" : "light"); applyTheme(dark); });
  applyTheme(isDark());
  watchVideo(lgVideo, true);
  watchVideo($("#app-video"), true);
  watchVideo($("#crm-video"), true);

  /* ---------- Часы в статус-баре iPhone ---------- */
  const appTime = $("#app-time");
  if (appTime) {
    const pad = (n) => String(n).padStart(2, "0");
    const tickClock = () => { const now = new Date(); appTime.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()); };
    tickClock(); setInterval(tickClock, 15000);
  }

  /* ---------- Видео CRM: вкладки + автопауза вне экрана ---------- */
  const video = $("#crm-video"), crmPoster = $("#crm-poster");
  const tabs = $$(".tabs button");
  tabs.forEach((b) => b.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
    const name = b.dataset.video, box = video.closest(".vbox"), src = video.querySelector("source");
    // пока новый ролик не пошёл — фото этой вкладки (сначала мини-копия)
    box.classList.remove("is-ready");
    box.style.setProperty("--lq", `url(${b.dataset.lq})`);
    crmPoster.src = `/video/${name}.webp`;
    src.removeAttribute("data-src");
    src.src = `/video/${name}.mp4`;
    video.load();
    if (!reduce) video.play().catch(() => {});
  }));

  /* ---------- Мобильное меню: бургер, закрытие по ссылке, Esc и при расширении окна ---------- */
  const burger = $("#burger"), siteNav = $("#site-nav");
  const setMenu = (open) => {
    document.documentElement.classList.toggle("menu-open", open);
    burger?.setAttribute("aria-expanded", String(open));
    burger?.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  };
  burger?.addEventListener("click", () => setMenu(!document.documentElement.classList.contains("menu-open")));
  siteNav?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  matchMedia("(min-width: 1021px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- Каталог клубов: поиск + фильтр по городу ---------- */
  const cards = $$("#club-grid .club");
  const chips = $$("#chips .chip");
  const search = $("#club-search");
  const empty = $("#club-empty");
  let cityFilter = "";
  const applyFilter = () => {
    const q = norm(search.value);
    let shown = 0;
    cards.forEach((c) => {
      const ok = (!cityFilter || c.dataset.city === cityFilter) && (!q || c.dataset.search.includes(q));
      c.hidden = !ok; if (ok) shown++;
    });
    empty.hidden = shown > 0;
    $("#club-grid").scrollLeft = 0;
  };
  chips.forEach((ch) => ch.addEventListener("click", () => {
    cityFilter = ch.dataset.city;
    chips.forEach((x) => { const on = x === ch; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on); });
    applyFilter();
  }));
  search.addEventListener("input", applyFilter);

  /* ---------- Отзывы: перетаскивание мышью ---------- */
  const rail = $("#rail");
  let drag = null;
  rail.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; drag = { x: e.clientX, s: rail.scrollLeft }; rail.classList.add("drag"); });
  addEventListener("pointermove", (e) => { if (drag) rail.scrollLeft = drag.s - (e.clientX - drag.x); });
  addEventListener("pointerup", () => { drag = null; rail.classList.remove("drag"); });

  /* ---------- Видео-отзывы: плееры VK грузим, когда карусель подъезжает к экрану ---------- */
  const vkFrames = $$("#rail iframe[data-src]");
  if (vkFrames.length) {
    const vkIO = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      vkFrames.forEach((f) => { f.src = f.dataset.src; f.removeAttribute("data-src"); });
      vkIO.disconnect();
    }, { rootMargin: "500px 0px" });
    vkIO.observe(rail);
  }
  // заставка клуба -> плеер VK по клику (до клика к VK не обращаемся)
  $$(".review-cover[data-vk]").forEach((btn) => btn.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = `https://vkvideo.ru/video_ext.php?oid=-226719145&id=${btn.dataset.vk}&hd=2&autoplay=1&js_api=1`;
    f.title = btn.getAttribute("aria-label") || "Видео-отзыв партнёра СРП";
    f.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock";
    f.allowFullscreen = true;
    btn.parentElement.classList.add("is-playing");
    btn.replaceWith(f);
  }));
  $$("[data-rail]").forEach((b) => b.addEventListener("click", () => {
    const card = rail.querySelector(".review");
    const step = card ? card.getBoundingClientRect().width + 16 : 320;
    rail.scrollBy({ left: step * 2 * +b.dataset.rail, behavior: reduce ? "auto" : "smooth" });
  }));

  /* ---------- Карусели на мобильном (клубы, отзывы): бесконечно по кругу; касание, попап или видео — пауза ----------
     Ушедшая влево карточка переезжает в конец ленты, а прокрутка сдвигается на её ширину — шов не виден. */
  const mobileMq = matchMedia("(max-width: 760px)");
  const autoRail = (el, itemSel) => {
    if (!el || reduce) return;
    let inView = false, holdUntil = 0, busy = false, idle = 0;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.3 }).observe(el);
    const hold = () => { holdUntil = Date.now() + 4000; };
    ["pointerdown", "touchstart", "wheel", "focusin"].forEach((t) => el.addEventListener(t, hold, { passive: true }));
    const gap = () => parseFloat(getComputedStyle(el).columnGap) || 12;
    const items = () => [...el.children].filter((n) => n.matches(itemSel));
    // переносим в конец все карточки, полностью ушедшие за левый край
    const rotate = () => {
      if (!mobileMq.matches || el.querySelector(".is-playing")) return;
      let first = items()[0];
      while (first) {
        if (first.hidden) { el.appendChild(first); first = items()[0]; if (items().every((n) => n.hidden)) return; continue; }
        const w = first.getBoundingClientRect().width + gap();
        if (el.scrollLeft < w - 2) return;
        el.style.scrollSnapType = "none";
        el.appendChild(first);
        el.scrollLeft -= w;
        first = items()[0];
      }
    };
    const restoreSnap = () => requestAnimationFrame(() => { el.style.scrollSnapType = ""; });
    // ручная прокрутка тоже бесконечная: после остановки ленты переставляем карточки
    el.addEventListener("scroll", () => {
      if (busy) return;
      clearTimeout(idle);
      idle = setTimeout(() => { rotate(); restoreSnap(); }, 160);
    }, { passive: true });
    setInterval(() => {
      if (!mobileMq.matches || !inView || document.hidden || Date.now() < holdUntil || busy) return;
      if (el.querySelector(".is-playing") || document.documentElement.classList.contains("modal-open")) return;
      const item = items().find((n) => !n.hidden);
      if (!item || items().filter((n) => !n.hidden).length < 2) return;
      // своя анимация вместо behavior: "smooth": та в Safari и при mandatory-снапе иногда не доезжает
      busy = true;
      el.style.scrollSnapType = "none";
      const from = el.scrollLeft, dist = item.getBoundingClientRect().width + gap(), t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 650);
        el.scrollLeft = from + dist * (1 - Math.pow(1 - k, 3));
        if (k < 1) return requestAnimationFrame(step);
        rotate(); restoreSnap(); busy = false;
      };
      requestAnimationFrame(step);
    }, 3000);
  };
  autoRail($("#club-grid"), ".club");
  autoRail(rail, ".review");

  /* ---------- Стол СРП фоном финального блока: столешница обрамляет текст и форму, «ножка» уходит вниз ---------- */
  const applySecEl = $("#apply"), tableSvg = $("#apply-table"), applyGrid = $(".apply-grid");
  const drawTable = () => {
    if (!applySecEl || !tableSvg || !applyGrid) return;
    const sr = applySecEl.getBoundingClientRect(), g = applyGrid.getBoundingClientRect();
    const W = sr.width, H = sr.height, narrow = W < 760;
    // на телефоне тот же стол, что на десктопе, только шире экрана — закругления и края просто обрезаются
    const padX = 190, padY = narrow ? 50 : 64, tw = Math.max(1400, (g.height + 2 * padY) * 2 + 300);
    const x0 = narrow ? W / 2 - tw / 2 : g.left - sr.left - padX, x1 = narrow ? W / 2 + tw / 2 : g.right - sr.left + padX;
    const y0 = g.top - sr.top - padY, y1 = g.bottom - sr.top + padY;
    const rim = 18, inset = 14;
    const r = (y1 - y0) / 2, cx = W / 2, sw = Math.min(520, (x1 - x0) * 0.36), f = 56, yb = H + 30;
    const path = (d) => {
      const R = r - d, X0 = x0 + d, X1 = x1 - d, Y0 = y0 + d, Y1 = y1 - d;
      if (!sw) return `M${X0 + R} ${Y0}H${X1 - R}A${R} ${R} 0 0 1 ${X1} ${Y0 + R}V${Y1 - R}A${R} ${R} 0 0 1 ${X1 - R} ${Y1}H${X0 + R}A${R} ${R} 0 0 1 ${X0} ${Y1 - R}V${Y0 + R}A${R} ${R} 0 0 1 ${X0 + R} ${Y0}Z`;
      const S0 = cx - sw / 2 + d, S1 = cx + sw / 2 - d, F = f + d;
      return `M${X0 + R} ${Y0}H${X1 - R}A${R} ${R} 0 0 1 ${X1 - R} ${Y1}H${S1 + F}A${F} ${F} 0 0 0 ${S1} ${Y1 + F}V${yb}H${S0}V${Y1 + F}A${F} ${F} 0 0 0 ${S0 - F} ${Y1}H${X0 + R}A${R} ${R} 0 0 1 ${X0 + R} ${Y0}Z`;
    };
    let seed = 7, stars = "";
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 60; i++) {
      const inStem = sw && i > 48;
      const sx0 = narrow ? 8 : x0 + r * 0.5, sx1 = narrow ? W - 8 : x1 - r * 0.5;
      const x = inStem ? cx - sw / 2 + 20 + rnd() * (sw - 40) : sx0 + rnd() * (sx1 - sx0);
      const y = inStem ? y1 + 30 + rnd() * Math.max(10, yb - y1 - 60) : y0 + 24 + rnd() * (y1 - y0 - 48);
      stars += `<use href="#c-spark" x="-1" y="-1" width="2" height="2" transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${(3 + rnd() * 5.5).toFixed(1)})" fill="#f2c879" opacity="${(0.25 + rnd() * 0.55).toFixed(2)}"/>`;
    }
    // крупные золотые вспышки снаружи стола, как на сукне из макета
    let flares = "";
    if (!narrow) {
      const fy = y0 - 46, h2 = y1 - y0;
      const big = [
        [x0 + (x1 - x0) * 0.22, fy, 120, 22, 0], [cx, fy - 6, 130, 24, 0], [x0 + (x1 - x0) * 0.78, fy, 120, 22, 0],
        [x0 + 30, y0 + h2 * 0.08, 34, 80, -38], [x1 - 30, y0 + h2 * 0.08, 34, 80, 38],
        [x0 - 30, y0 + h2 * 0.62, 70, 22, -28], [x1 + 30, y0 + h2 * 0.62, 70, 22, 28],
        [cx - sw / 2 - 150, y1 + 70, 110, 20, 0], [cx + sw / 2 + 150, y1 + 70, 110, 20, 0],
      ];
      flares = big.map(([x, y, a1, a2, rot]) => `<use href="#c-spark" x="-1" y="-1" width="2" height="2" transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot}) scale(${a1} ${a2})" fill="url(#sparkG)"/>`).join("");
      const small = [[x0 + (x1 - x0) * 0.36, fy + 18], [x0 + (x1 - x0) * 0.64, fy + 12], [x0 - 10, y0 + h2 * 0.35], [x1 + 10, y0 + h2 * 0.4], [cx - sw / 2 - 60, y1 + 120], [cx + sw / 2 + 70, y1 + 130], [x0 + 80, y1 + 30], [x1 - 80, y1 + 26]];
      flares += small.map(([x, y]) => `<use href="#c-spark" x="-1" y="-1" width="2" height="2" transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(9)" fill="#f2c879" opacity=".8"/>`).join("");
    }
    // на телефоне карта за заголовком (форма её бы закрыла), чуть ярче
    const mw = narrow ? W * 1.6 : (x1 - x0) * 0.86, mh = mw * 770 / 1480;
    const copyEl = $(".apply-copy"), cr = copyEl ? copyEl.getBoundingClientRect() : g;
    const my0 = narrow ? cr.top - sr.top + cr.height / 2 - mh / 2 : y0 + (y1 - y0 - mh) / 2;
    tableSvg.setAttribute("viewBox", `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
    tableSvg.innerHTML = `<defs>
        <linearGradient id="ptRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a4a1c"/><stop offset=".22" stop-color="#f3cf8a"/><stop offset=".5" stop-color="#9a6528"/><stop offset=".78" stop-color="#f6d896"/><stop offset="1" stop-color="#8a5a24"/></linearGradient>
        <radialGradient id="ptFelt" cx="50%" cy="30%" r="75%"><stop offset="0" style="stop-color:var(--felt-a)"/><stop offset=".55" style="stop-color:var(--felt-b)"/><stop offset="1" style="stop-color:var(--felt-c)"/></radialGradient>
        <clipPath id="ptClip"><path d="${path(0)}"/></clipPath>
      </defs>
      <g class="pt-flares">${flares}</g>
      <path d="${path(-rim / 2)}" fill="none" stroke="url(#ptRim)" stroke-width="${rim}"/>
      <path d="${path(0)}" fill="url(#ptFelt)"/>
      <g clip-path="url(#ptClip)">
        <image href="/img/map-russia.svg" x="${(cx - mw / 2).toFixed(0)}" y="${my0.toFixed(0)}" width="${mw.toFixed(0)}" height="${mh.toFixed(0)}" opacity="${narrow ? ".2" : ".13"}"/>
        ${stars}
      </g>
      <path d="${path(inset)}" fill="none" stroke="rgba(246,212,143,.38)" stroke-width="1.2"/>`;
  };
  if (applySecEl) { drawTable(); new ResizeObserver(drawTable).observe(applySecEl); }

  /* ---------- Попап клуба: галерея, полный рассказ, контакты ---------- */
  const modal = $("#club-modal");
  const clubInfo = window.SRP_CLUB_INFO || {};
  let galleryTimer = 0;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const buildGallery = (c) => {
    const g = $("#cm-gallery");
    g.replaceChildren();
    clearInterval(galleryTimer);
    if (!c.photos.length) {
      const box = el("div", "cm-noimg"); const img = el("img"); img.src = c.logo; img.alt = ""; box.appendChild(img); g.appendChild(box);
      return;
    }
    const track = el("div", "cm-track");
    c.photos.forEach((src, i) => { const img = el("img"); img.src = src; img.alt = `${c.name}, ${c.city}: фото ${i + 1}`; img.decoding = "async"; track.appendChild(img); });
    g.appendChild(track);
    if (c.photos.length > 1) {
      const dots = el("div", "cm-dots");
      const go = (i) => { track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? "auto" : "smooth" }); };
      c.photos.forEach((_, i) => { const d = el("button", "cm-dot"); d.type = "button"; d.setAttribute("aria-label", `Фото ${i + 1}`); d.addEventListener("click", () => go(i)); dots.appendChild(d); });
      const cur = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      const mark = () => [...dots.children].forEach((d, i) => d.classList.toggle("on", i === cur()));
      track.addEventListener("scroll", () => requestAnimationFrame(mark), { passive: true });
      ["-1", "1"].forEach((dir) => {
        const b = el("button", "cm-arrow cm-arrow--" + (dir === "1" ? "next" : "prev")); b.type = "button";
        b.setAttribute("aria-label", dir === "1" ? "Следующее фото" : "Предыдущее фото");
        b.innerHTML = '<svg class="ico"><use href="#i-arrow"/></svg>';
        b.addEventListener("click", () => go((cur() + +dir + c.photos.length) % c.photos.length));
        g.appendChild(b);
      });
      g.appendChild(dots); mark();
      if (!reduce) galleryTimer = setInterval(() => go((cur() + 1) % c.photos.length), 4500);
    }
  };
  const openClub = (id) => {
    const c = clubInfo[id];
    if (!c || !modal || !modal.showModal) return;
    $("#cm-title").textContent = c.name;
    $("#cm-city").textContent = c.city;
    $("#cm-logo").src = c.logo; $("#cm-logo").alt = `Логотип клуба ${c.name}`;
    $("#cm-about").replaceChildren(...String(c.about).split("\n").filter(Boolean).map((t) => el("p", "", t)));
    const meta = $("#cm-meta"); meta.replaceChildren();
    if (c.address) meta.appendChild(el("li", "meta-addr", c.address));
    if (c.phone) { const li = el("li"); const a = el("a", "", c.phoneText); a.href = `tel:${c.phone}`; li.appendChild(a); meta.appendChild(li); }
    if (c.telegram) { const li = el("li"); const a = el("a", "", "Telegram-канал"); a.href = c.telegram; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); meta.appendChild(li); }
    buildGallery(c);
    modal.showModal();
    document.documentElement.classList.add("modal-open");
  };
  if (modal) {
    const closeModal = () => { modal.close(); };
    modal.addEventListener("close", () => { clearInterval(galleryTimer); document.documentElement.classList.remove("modal-open"); });
    modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-cm-close]")) closeModal(); });
    $$(".club-more, .club-cover").forEach((b) => b.addEventListener("click", () => openClub((b.dataset.club || b.closest(".club").querySelector(".club-more").dataset.club))));
  }

  /* ---------- Проверка города на карте ---------- */
  const clubs = window.SRP_CLUBS || [];
  const form = $("#lead");
  const fCity = $("#f-city"), fIntent = $("#f-intent");
  const prefill = (city, intent) => { if (city) fCity.value = city; if (intent) fIntent.value = intent; };
  $$("[data-city-intent]").forEach((a) => a.addEventListener("click", () => prefill("", a.dataset.cityIntent)));

  $("#citycheck")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = $("#city-input").value, q = norm(raw), out = $("#city-out");
    if (map) map.setHit([]);
    if (q.length < 2) { out.textContent = "Введите название города."; return; }
    const found = clubs.filter((c) => norm(c.city).startsWith(q));
    if (found.length) {
      const ids = new Set(found.map((c) => c.id));
      if (map) map.setHit([...ids]);
      const names = found.map((c) => c.name).join(", ");
      out.innerHTML = `В городе ${found[0].city} уже есть ${found.length > 1 ? "клубы" : "клуб"} СРП: ${names}. Хотите играть — <a href="#clubs">смотрите адрес</a>. Хотите открыть ещё один — <a href="#apply" data-city-intent="open">оставьте заявку</a>.`;
      const go = out.querySelector('[data-city-intent]');
      go.addEventListener("click", () => prefill(found[0].city, "open"));
      const search2 = $("#club-search"); search2.value = found[0].city; applyFilter();
    } else {
      const city = raw.trim().replace(/^./, (c) => c.toUpperCase());
      out.innerHTML = `В нашем списке клубов в городе «${city}» пока нет. <a href="#apply" id="go-apply">Оставьте заявку</a> — обсудим запуск СРП у вас.`;
      $("#go-apply").addEventListener("click", () => prefill(city, "open"));
    }
    request();
  });

  /* ---------- Форма заявки ---------- */
  const status = $("#form-status");
  const say = (msg, cls) => { status.textContent = msg; status.className = "form-status " + (cls || ""); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const bad = ["name", "contact", "city"].filter((k) => !String(data[k] || "").trim());
    ["name", "contact", "city"].forEach((k) => form.elements[k].classList.toggle("bad", bad.includes(k)));
    if (bad.length) { say("Заполните имя, контакт и город.", "err"); return; }
    if (!form.elements.consent.checked) { say("Нужно согласие на обработку персональных данных.", "err"); return; }
    if (data.website) { say("Спасибо! Мы свяжемся с вами.", "ok"); return; } // honeypot
    const endpoint = form.dataset.endpoint;
    if (!endpoint) { console.warn("LEAD_ENDPOINT не задан при сборке"); say("Форма пока не подключена к приёмнику заявок. Напишите нам напрямую.", "err"); return; }
    const params = Object.fromEntries(new URLSearchParams(location.search));
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; say("Отправляем…");
    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name.trim(), contact: data.contact.trim(), city: data.city.trim(), intent: data.intent, consent: true, page: location.href, utm: params, at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset(); say("Спасибо! Заявка отправлена, мы скоро свяжемся с вами.", "ok");
      if (window.ym && window.__metrikaId) window.ym(window.__metrikaId, "reachGoal", "lead");
    } catch (err) {
      say("Не удалось отправить заявку. Попробуйте ещё раз чуть позже.", "err");
    } finally { btn.disabled = false; }
  });

  /* ---------- Cookie и Метрика (только после согласия) ---------- */
  const metrikaId = ($('meta[name="metrika-id"]') || {}).content;
  const bar = $("#cookie");
  const loadMetrika = () => {
    if (!metrikaId || window.__metrikaId) return;
    window.__metrikaId = metrikaId;
    (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date(); k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a); })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(metrikaId, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  };
  if (metrikaId) {
    const consent = store.get("srp-cookie");
    if (consent === "yes") loadMetrika(); else if (consent === null) bar.hidden = false;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cookie]"); if (!b) return;
      store.set("srp-cookie", b.dataset.cookie); bar.hidden = true;
      if (b.dataset.cookie === "yes") loadMetrika();
    });
  }
})();
