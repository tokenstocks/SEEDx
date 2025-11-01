import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Authentication Functions', () => {
  describe('Password Hashing (bcrypt)', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should verify correct passwords', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should create different hashes for same password (salt)', async () => {
      const password = 'TestPassword123!';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);
      
      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('JWT Token Generation', () => {
    const JWT_SECRET = process.env.JWT_SECRET!;

    it('should generate valid JWT tokens', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'investor',
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify and decode valid tokens', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'investor',
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should reject invalid tokens', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwt.verify(invalidToken, JWT_SECRET);
      }).toThrow();
    });

    it('should reject tokens with wrong secret', () => {
      const payload = { userId: 'test-user-id' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '24h' });
      
      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow();
    });

    it('should include expiration in token', () => {
      const payload = { userId: 'test-user-id' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + 3600; // 1 hour
      
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5); // Allow 5s margin
    });
  });
});
