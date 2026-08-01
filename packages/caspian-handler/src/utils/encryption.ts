import crypto, { CipherGCM, DecipherGCM } from 'crypto';

/**
 * AES-256-GCM encryption service for sensitive data.
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(masterKey: string) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }
    
    // Derive encryption key using scrypt
    this.key = crypto.scryptSync(
      masterKey,
      'thought-gps-salt',
      32
    );
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   */
  encrypt(plaintext: string): {
    ciphertext: string;
    iv: string;
    authTag: string;
  } {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.key,
        iv
      ) as CipherGCM;
      
      // Encrypt
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        ciphertext,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
      
    } catch (error) {
      console.error('Encryption failed', { error });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   */
  decrypt(encrypted: {
    ciphertext: string;
    iv: string;
    authTag: string;
  }): string {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(encrypted.iv, 'hex')
      ) as DecipherGCM;
      
      // Set authentication tag
      decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
      
      // Decrypt
      let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
      
    } catch (error) {
      console.error('Decryption failed', { error });
      throw new Error('Failed to decrypt data - may be corrupted');
    }
  }

  /**
   * Hash value using SHA-256
   */
  hash(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex');
  }

  /**
   * Generate random token
   */
  generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Verify integrity of encrypted data
   */
  verifyIntegrity(encrypted: {
    ciphertext: string;
    iv: string;
    authTag: string;
  }): boolean {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(encrypted.iv, 'hex')
      ) as DecipherGCM;
      
      decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
      
      // Try to decrypt - will fail if auth tag is invalid
      decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      
      return true;
    } catch {
      return false;
    }
  }
}
