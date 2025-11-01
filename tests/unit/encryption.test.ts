import crypto from 'crypto';

describe('Encryption Helper Functions', () => {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
  const ALGORITHM = 'aes-256-cbc';

  function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  function decrypt(encryptedText: string): string {
    const [ivHex, encryptedData] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  describe('AES-256-CBC Encryption', () => {
    it('should encrypt text successfully', () => {
      const plaintext = 'stellar-secret-key-SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // IV:ciphertext format
    });

    it('should decrypt to original text', () => {
      const plaintext = 'stellar-secret-key-SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'stellar-secret-key-test';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'Special!@#$%^&*()_+-={}[]|:";\'<>?,./';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
      expect(decrypted.length).toBe(1000);
    });
  });

  describe('Encryption Security', () => {
    it('should require correct IV for decryption', () => {
      const plaintext = 'secret-data';
      const encrypted = encrypt(plaintext);
      const [, ciphertext] = encrypted.split(':');
      
      // Try to decrypt with wrong IV
      const wrongIv = crypto.randomBytes(16).toString('hex');
      const tamperedEncrypted = `${wrongIv}:${ciphertext}`;
      
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });

    it('should fail on tampered ciphertext', () => {
      const plaintext = 'secret-data';
      const encrypted = encrypt(plaintext);
      const [iv, ciphertext] = encrypted.split(':');
      
      // Tamper with ciphertext
      const tamperedCiphertext = ciphertext.slice(0, -2) + 'ff';
      const tamperedEncrypted = `${iv}:${tamperedCiphertext}`;
      
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });
  });
});
