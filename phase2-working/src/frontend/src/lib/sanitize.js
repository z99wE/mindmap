/**
 * XSS Sanitization Utilities
 *
 * All user-controlled data MUST pass through these functions before
 * being inserted into innerHTML or any HTML context.
 *
 * Usage:
 *   import { esc, escAttr } from '../lib/sanitize.js';
 *   el.innerHTML = `<div>${esc(userInput)}</div>`;
 *   el.innerHTML = `<input value="${escAttr(userInput)}">`;
 */

/**
 * Escape HTML special characters to prevent XSS.
 * Use for text content inside HTML elements.
 */
export function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape for use inside HTML attribute values.
 * Also escapes quotes to prevent attribute injection.
 */
export function escAttr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape for use inside JavaScript string literals in inline handlers.
 * Use only when absolutely necessary (inline onclick with user data).
 */
export function escJS(s) {
  if (s == null) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Sanitize a URL to prevent javascript: and data: URI attacks.
 * Returns the URL if safe, '#' if dangerous.
 */
export function safeUrl(url) {
  if (!url) return '#';
  const s = String(url).trim().toLowerCase();
  if (s.startsWith('javascript:') || s.startsWith('data:') || s.startsWith('vbscript:')) {
    return '#';
  }
  return url;
}
