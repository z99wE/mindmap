// Shared encryption utility for API keys and channel credentials
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'thought-gps-encryption-key-change-me';

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function maskKey(key) {
  if (!key || key.length < 8) return '****';
  const masked = key.substring(0, 4) + '****' + key.substring(key.length - 4);
  // Masked fragments keep raw key characters — strip anything HTML-significant
  // so masked values are always safe to render in the frontend.
  return masked.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
}

module.exports = { encrypt, decrypt, maskKey, ENCRYPTION_KEY };
