/**
 * specularButton.js — Vanilla JS port of the React Bits SpecularButton.
 * Dark glass base, lime hairline (#84CC16), white text, and a specular
 * glare that tracks the pointer (followMouse, proximity ~360). Works on
 * every button in the app — user pages and the admin console alike.
 * CSS lives in specularButton.css (imported by this module).
 */
import './specularButton.css';

const BUTTON_SELECTOR = [
  '.btn-m3:not(.btn-text)',   // filled / tonal / outlined / icon
  '.btn-neon',
  '.icon-btn',                // round top-bar + dialog close buttons
  '.tg-btn',
  '.tg-topchip',
  '.user-chip',
].join(',');

// ── Tag one button ───────────────────────────────────────────────────────────

function tagButton(btn) {
  if (btn.dataset.spApplied && btn.querySelector('.sp-glare')) return;
  btn.dataset.spApplied = '1';
  btn.classList.add('sp-btn');

  // Specular glare layer — a separate child so it never collides with the
  // app's own ::before/::after (loading sweep, liquid-glass sheen, etc.)
  if (!btn.querySelector('.sp-glare')) {
    const glare = document.createElement('span');
    glare.className = 'sp-glare';
    glare.setAttribute('aria-hidden', 'true');
    btn.appendChild(glare);
  }

  // followMouse: keep the highlight parked under the pointer
  btn.addEventListener('pointermove', (e) => {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--sp-x', `${Math.round(e.clientX - rect.left)}px`);
    btn.style.setProperty('--sp-y', `${Math.round(e.clientY - rect.top)}px`);
  });
}

// ── Batch initializer — call after page render ──────────────────────────────

export function initSpecularButtons(root = document, selector = BUTTON_SELECTOR) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const scan = () => (root || document).querySelectorAll(selector).forEach(tagButton);
  scan();

  // Buttons rendered after paint (list rows, dialogs, React landing) get it too.
  if (!window.__tgSpecularMO) {
    window.__tgSpecularMO = true;
    new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches?.(selector)) tagButton(n);
          n.querySelectorAll?.(selector).forEach(tagButton);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
}
