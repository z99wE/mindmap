/**
 * borderGlow.js — Vanilla JS edge-glow utility
 * Ports the React BorderGlow component to work with raw DOM elements.
 * CSS lives in BorderGlow.css (already imported by this module).
 */
import './BorderGlow.css';

// ── HSL parsing & CSS variable generation ────────────────────────────────────

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys   = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

// ── Pointer math ─────────────────────────────────────────────────────────────

function getCenterOfElement(el) {
  const { width, height } = el.getBoundingClientRect();
  return [width / 2, height / 2];
}

function getEdgeProximity(el, x, y) {
  const [cx, cy] = getCenterOfElement(el);
  const dx = x - cx;
  const dy = y - cy;
  let kx = Infinity;
  let ky = Infinity;
  if (dx !== 0) kx = cx / Math.abs(dx);
  if (dy !== 0) ky = cy / Math.abs(dy);
  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
}

function getCursorAngle(el, x, y) {
  const [cx, cy] = getCenterOfElement(el);
  const dx = x - cx;
  const dy = y - cy;
  if (dx === 0 && dy === 0) return 0;
  const radians = Math.atan2(dy, dx);
  let degrees = radians * (180 / Math.PI) + 90;
  if (degrees < 0) degrees += 360;
  return degrees;
}

// ── Default theme (tuned for Thought GPS dark UI with lime accent) ───────────

const DEFAULTS = {
  glowColor:     '80 80 60',       // lime / chartreuse hue
  backgroundColor: 'transparent',   // inherit from surface-card
  borderRadius:  12,
  glowRadius:    20,
  glowIntensity: 0.8,
  coneSpread:    25,
  edgeSensitivity: 30,
  fillOpacity:   0.35,
  colors:        ['#ccff00', '#38bdf8', '#a78bfa'],  // lime, sky, violet
};

// ── Apply glow to a single element ──────────────────────────────────────────

function applyBorderGlow(el, opts = {}) {
  if (el.dataset.glowApplied) return;           // idempotent guard
  el.dataset.glowApplied = '1';

  const cfg = { ...DEFAULTS, ...opts };

  // 1. Restructure DOM: wrap children in .border-glow-inner, prepend edge-light
  const inner = document.createElement('div');
  inner.className = 'border-glow-inner';
  while (el.firstChild) inner.appendChild(el.firstChild);
  el.appendChild(inner);

  const edgeLight = document.createElement('span');
  edgeLight.className = 'edge-light';
  el.insertBefore(edgeLight, inner);

  // 2. Add the base class
  el.classList.add('border-glow-card');

  // 3. Set CSS custom properties
  const allVars = {
    '--card-bg':          cfg.backgroundColor,
    '--edge-sensitivity': cfg.edgeSensitivity,
    '--border-radius':    `${cfg.borderRadius}px`,
    '--glow-padding':     `${cfg.glowRadius}px`,
    '--cone-spread':      cfg.coneSpread,
    '--fill-opacity':     cfg.fillOpacity,
    ...buildGlowVars(cfg.glowColor, cfg.glowIntensity),
    ...buildGradientVars(cfg.colors),
  };
  for (const [k, v] of Object.entries(allVars)) {
    el.style.setProperty(k, String(v));
  }

  // 4. Pointer tracking
  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const edge  = getEdgeProximity(el, x, y);
    const angle = getCursorAngle(el, x, y);
    el.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    el.style.setProperty('--cursor-angle',   `${angle.toFixed(3)}deg`);
  });
}

// ── Batch initializer — call after page render ──────────────────────────────

export function initBorderGlow(root = document, selector = '.surface-card', opts = {}) {
  // Respect prefers-reduced-motion
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const cards = root.querySelectorAll(selector);
  cards.forEach(card => applyBorderGlow(card, opts));
}

export { applyBorderGlow };
