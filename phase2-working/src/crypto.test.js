const { describe, it } = require('node:test');
const assert = require('node:assert');
const { encrypt, decrypt } = require('./crypto');

describe('Crypto Utility', () => {
  it('should encrypt and decrypt correctly', () => {
    const secret = 'super-secret-key-123';
    
    // Temporarily set the env var if not set
    const origSecret = process.env.API_KEY_ENCRYPTION_SECRET;
    if (!origSecret) {
      process.env.API_KEY_ENCRYPTION_SECRET = '0123456789abcdef0123456789abcdef'; // 32 bytes
    }

    try {
      const encrypted = encrypt(secret);
      assert.ok(encrypted, 'Encrypted value should be defined');
      assert.notStrictEqual(encrypted, secret, 'Encrypted value should not match secret');
      assert.strictEqual(typeof encrypted, 'string', 'Encrypted value should be a string');

      const decrypted = decrypt(encrypted);
      assert.strictEqual(decrypted, secret, 'Decrypted value should match original secret');
    } finally {
      if (!origSecret) {
        delete process.env.API_KEY_ENCRYPTION_SECRET;
      }
    }
  });
});
