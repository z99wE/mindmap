// ─────────────────────────────────────────────────────────────────────────────
// Mentally — branded presentation layer
//
// Everything in this file is presentation only: light, depth, motion. It adds
// no behaviour to the app and never changes data, routing or API calls.
//
//  1. entropy skin      — living, near-black field that drifts with the pointer
//  2. liquid-glass hover — one branded gesture for every interactive surface
//  3. reveal            — staggered rise + un-blur as content enters view
//  4. hero scroll       — single scroll-progress value driving the hero camera
//  5. memory current    — fluid band of thought traces at the base of the app
//  6. logo decay        — the wordmark loses integrity while unattended
// ─────────────────────────────────────────────────────────────────────────────

const reduced = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HOVER_SELECTOR = [
  ".surface-card",
  ".glass-3d",
  ".liquid-glass",
  ".neopop-card",
  ".btn-m3",
  ".btn-neon",
  ".icon-btn",
  ".user-chip",
  ".nav-item",
  ".bottom-nav-item",
  ".tg-state",
  "[data-lg-hover]",
].join(",");

// ── 1. Entropy skin ──────────────────────────────────────────────────────────
function initEntropyField() {
  if (document.getElementById("tg-entropy")) return;
  const canvas = document.createElement("canvas");
  canvas.id = "tg-entropy";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const blobs = Array.from({ length: 7 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.22 + Math.random() * 0.3,
    sx: (Math.random() - 0.5) * 0.000045,
    sy: (Math.random() - 0.5) * 0.000035,
    p: Math.random() * Math.PI * 2,
    a: 0.03 + (i % 3) * 0.012,
  }));

  let w = 0;
  let h = 0;
  const resize = () => {
    w = canvas.width = Math.round(window.innerWidth / 3);
    h = canvas.height = Math.round(window.innerHeight / 3);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    },
    { passive: true },
  );

  const draw = (t) => {
    // heavy lag: the field drifts toward the pointer, it never tracks it
    pointer.x += (pointer.tx - pointer.x) * 0.012;
    pointer.y += (pointer.ty - pointer.y) * 0.012;
    ctx.clearRect(0, 0, w, h);
    for (const b of blobs) {
      const px = (pointer.x - 0.5) * 0.06;
      const py = (pointer.y - 0.5) * 0.06;
      const x = (b.x + Math.sin(t * 0.00006 + b.p) * 0.05 + px) * w;
      const y = (b.y + Math.cos(t * 0.00005 + b.p) * 0.04 + py) * h;
      const r = b.r * Math.min(w, h) * (1 + Math.sin(t * 0.00004 + b.p) * 0.08);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(150,160,175,${b.a})`);
      g.addColorStop(1, "rgba(150,160,175,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  if (reduced()) {
    draw(0);
    return;
  }
  let raf = 0;
  const loop = (t) => {
    if (!document.hidden) draw(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(loop);
  });
}

// ── 2. Liquid-glass hover ────────────────────────────────────────────────────
function initGlassHover() {
  if (window.__tgHover) return;
  window.__tgHover = true;
  let pending = null;
  const apply = () => {
    if (!pending) return;
    const { el, x, y } = pending;
    pending = null;
    el.style.setProperty("--lg-x", `${x}%`);
    el.style.setProperty("--lg-y", `${y}%`);
  };
  document.addEventListener(
    "pointermove",
    (e) => {
      const el = e.target instanceof Element ? e.target.closest(HOVER_SELECTOR) : null;
      if (!el) return;
      if (!el.classList.contains("lg-hover")) el.classList.add("lg-hover");
      const rect = el.getBoundingClientRect();
      pending = {
        el,
        x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
        y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
      };
      requestAnimationFrame(apply);
    },
    { passive: true },
  );
  // Static surfaces still get the glass treatment before the pointer arrives.
  const tag = (root) =>
    (root || document).querySelectorAll(HOVER_SELECTOR).forEach((el) => el.classList.add("lg-hover"));
  tag();
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) if (n.nodeType === 1) tag(n), n.matches?.(HOVER_SELECTOR) && n.classList.add("lg-hover");
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

// ── 3. Reveal ────────────────────────────────────────────────────────────────
const REVEAL_SELECTOR = ".surface-card, .card-reveal, [data-reveal], .page-shell > h1, .page-shell > h2";

function initReveal() {
  if (window.__tgReveal) return;
  window.__tgReveal = true;
  if (reduced()) {
    document.documentElement.classList.add("tg-no-motion");
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        window.setTimeout(() => el.classList.add("tg-in"), i * 70);
        io.unobserve(el);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
  );
  const scan = () =>
    document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
      if (el.dataset.tgWatched) return;
      el.dataset.tgWatched = "1";
      el.classList.add("tg-rise");
      io.observe(el);
    });
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

// ── 4. Hero scroll camera ────────────────────────────────────────────────────
function initHeroScroll() {
  if (window.__tgHeroScroll) return;
  window.__tgHeroScroll = true;
  if (reduced()) return;
  let queued = false;
  const update = () => {
    queued = false;
    const span = Math.max(window.innerHeight * 0.9, 1);
    const p = Math.min(1, Math.max(0, window.scrollY / span));
    document.documentElement.style.setProperty("--scroll-progress", p.toFixed(4));
  };
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

// ── 5. Memory current ────────────────────────────────────────────────────────
function initMemoryCurrent() {
  const host = document.getElementById("app-footer");
  if (!host || host.querySelector(".tg-current")) return;
  const canvas = document.createElement("canvas");
  canvas.className = "tg-current";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  const resize = () => {
    w = canvas.width = host.clientWidth || window.innerWidth;
    h = canvas.height = host.clientHeight || 180;
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const mk = () => ({
    x: Math.random() * 1.4 - 0.2,
    y: 0.1 + Math.random() * 0.85,
    len: 0.08 + Math.random() * 0.3,
    depth: Math.random(),
    speed: 0.00006 + Math.random() * 0.00022,
    sink: Math.random() * 0.000018,
    life: 0,
  });
  const traces = Array.from({ length: 34 }, () => ({ ...mk(), life: Math.random() }));
  const pointer = { x: -1, y: -1 };
  host.addEventListener(
    "pointermove",
    (e) => {
      const r = host.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = (e.clientY - r.top) / r.height;
    },
    { passive: true },
  );
  host.addEventListener("pointerleave", () => {
    pointer.x = -1;
    pointer.y = -1;
  });

  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    for (const s of traces) {
      s.x += s.speed * 16;
      s.y += s.sink * 16;
      s.life += 0.0016;
      if (s.x > 1.25 || s.life > 1) Object.assign(s, mk());
      let y = s.y;
      if (pointer.x >= 0) {
        const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
        if (d < 0.22) y += (s.y - pointer.y) * (0.22 - d) * 1.6;
      }
      const drift = Math.sin(t * 0.00022 + s.depth * 9) * 0.012;
      const x0 = s.x * w;
      const x1 = (s.x + s.len) * w;
      const yy = (y + drift) * h;
      const alpha = (0.05 + s.depth * 0.13) * Math.sin(Math.min(1, s.life) * Math.PI);
      const grad = ctx.createLinearGradient(x0, yy, x1, yy);
      const tint = s.depth > 0.82 ? "204,255,0" : "168,178,192";
      grad.addColorStop(0, `rgba(${tint},0)`);
      grad.addColorStop(0.5, `rgba(${tint},${alpha.toFixed(3)})`);
      grad.addColorStop(1, `rgba(${tint},0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.6 + s.depth * 1.1;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.bezierCurveTo(x0 + (x1 - x0) * 0.35, yy - 6 * s.depth, x0 + (x1 - x0) * 0.7, yy + 6 * s.depth, x1, yy);
      ctx.stroke();
    }
  };

  if (reduced()) {
    draw(0);
    return;
  }
  let raf = 0;
  const loop = (t) => {
    if (!document.hidden) draw(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(loop);
  });
}

// ── 6. Logo decay signature ──────────────────────────────────────────────────
function initLogoDecay() {
  const marks = document.querySelectorAll("[data-logo], .tg-logo");
  if (!marks.length || window.__tgLogo) return;
  window.__tgLogo = true;
  if (reduced()) return;
  marks.forEach((mark) => {
    mark.classList.add("tg-logo-resolve");
    let decay = 0;
    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      decay = Math.min(1, decay + dt / 42000); // a long, quiet half-life
      mark.style.setProperty("--decay", decay.toFixed(3));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const refresh = () => {
      decay = 0;
      mark.style.setProperty("--decay", "0");
    };
    mark.addEventListener("pointerenter", refresh);
    mark.addEventListener("click", refresh);
    window.addEventListener("tg-navigated", refresh);
  });
}

export function initEnhancements() {
  initEntropyField();
  initGlassHover();
  initReveal();
  initHeroScroll();
  initHeroConstellation();
  window.setTimeout(() => {
    // memory current retired — footer is now a pure gradient sign-off
    initLogoDecay();
  }, 120);
}

// ── Hero constellation (thematic depth, Home) ────────────────────────────────
function initHeroConstellation() {
  const mount = () => {
    const host = document.querySelector("[data-constellation]");
    if (!host || host.dataset.tgMounted) return;
    host.dataset.tgMounted = "1";
    const canvas = document.createElement("canvas");
    canvas.className = "tg-constellation";
    canvas.setAttribute("aria-hidden", "true");
    host.prepend(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.width = host.clientWidth || 800;
      h = canvas.height = host.clientHeight || 420;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    const nodes = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      p: Math.random() * Math.PI * 2,
    }));
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.tx = e.clientX / window.innerWidth;
        pointer.ty = e.clientY / window.innerHeight;
      },
      { passive: true },
    );
    const draw = (t) => {
      pointer.x += (pointer.tx - pointer.x) * 0.03;
      pointer.y += (pointer.ty - pointer.y) * 0.03;
      const prog = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--scroll-progress") || "0",
      );
      ctx.clearRect(0, 0, w, h);
      const pts = nodes.map((n) => {
        const depth = 0.35 + n.z * 0.65;
        // scroll pushes the camera inward, layers separating by depth
        const scale = 1 + prog * 0.5 * depth;
        const px = (n.x - 0.5) * scale + 0.5 + (pointer.x - 0.5) * 0.05 * depth;
        const py =
          (n.y - 0.5) * scale + 0.5 + (pointer.y - 0.5) * 0.04 * depth +
          Math.sin(t * 0.00012 + n.p) * 0.012;
        return { x: px * w, y: py * h, d: depth };
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist > 120) continue;
          ctx.strokeStyle = `rgba(168,178,192,${(0.1 * (1 - dist / 120)).toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
      pts.forEach((p, i) => {
        const lime = i % 9 === 0;
        ctx.fillStyle = lime
          ? `rgba(204,255,0,${(0.18 * p.d).toFixed(3)})`
          : `rgba(214,222,232,${(0.2 * p.d).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.7 + p.d * 1.7, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    if (reduced()) {
      draw(0);
      return;
    }
    let raf = 0;
    const loop = (t) => {
      if (!document.hidden) draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  };
  mount();
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
}
