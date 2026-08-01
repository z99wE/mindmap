import { EncryptionService } from '../src/utils/encryption';

describe('EncryptionService', () => {
  const encryption = new EncryptionService('test-master-key-32-characters-long-here');
  
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text', () => {
      const plaintext = 'my-secret-api-key';
      
      const encrypted = encryption.encrypt(plaintext);
      
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plaintext);
      
      const decrypted = encryption.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'my-secret';
      
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);
      
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
    
    it('should fail to decrypt with wrong auth tag', () => {
      const encrypted = encryption.encrypt('secret');
      
      encrypted.authTag = 'a'.repeat(32); // Wrong auth tag
      
      expect(() => {
        encryption.decrypt(encrypted);
      }).toThrow();
    });
  });
  
  describe('verifyIntegrity', () => {
    it('should verify integrity of valid data', () => {
      const encrypted = encryption.encrypt('secret');
      
      const isValid = encryption.verifyIntegrity(encrypted);
      
      expect(isValid).toBe(true);
    });
    
    it('should fail for corrupted data', () => {
      const encrypted = encryption.encrypt('secret');
      encrypted.ciphertext = 'corrupted';
      
      const isValid = encryption.verifyIntegrity(encrypted);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('hash', () => {
    it('should produce consistent hash', () => {
      const value = 'test-value';
      
      const hash1 = encryption.hash(value);
      const hash2 = encryption.hash(value);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
    });
  });
  
  describe('generateToken', () => {
    it('should generate random tokens', () => {
      const token1 = encryption.generateToken();
      const token2 = encryption.generateToken();
      
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });
});
