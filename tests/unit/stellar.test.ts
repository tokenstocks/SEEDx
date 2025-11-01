import * as StellarSdk from 'stellar-sdk';

describe('Stellar Helper Functions', () => {
  describe('Keypair Generation', () => {
    it('should generate valid Stellar keypairs', () => {
      const keypair = StellarSdk.Keypair.random();
      
      expect(keypair).toBeDefined();
      expect(keypair.publicKey()).toBeDefined();
      expect(keypair.secret()).toBeDefined();
    });

    it('should generate keypairs with correct format', () => {
      const keypair = StellarSdk.Keypair.random();
      const publicKey = keypair.publicKey();
      const secretKey = keypair.secret();
      
      // Public keys start with 'G'
      expect(publicKey.charAt(0)).toBe('G');
      expect(publicKey.length).toBe(56);
      
      // Secret keys start with 'S'
      expect(secretKey.charAt(0)).toBe('S');
      expect(secretKey.length).toBe(56);
    });

    it('should generate unique keypairs', () => {
      const keypair1 = StellarSdk.Keypair.random();
      const keypair2 = StellarSdk.Keypair.random();
      
      expect(keypair1.publicKey()).not.toBe(keypair2.publicKey());
      expect(keypair1.secret()).not.toBe(keypair2.secret());
    });

    it('should be able to derive public key from secret', () => {
      const keypair = StellarSdk.Keypair.random();
      const secret = keypair.secret();
      const publicKey = keypair.publicKey();
      
      const derivedKeypair = StellarSdk.Keypair.fromSecret(secret);
      expect(derivedKeypair.publicKey()).toBe(publicKey);
    });
  });

  describe('Address Validation', () => {
    it('should validate valid public keys', () => {
      const keypair = StellarSdk.Keypair.random();
      const publicKey = keypair.publicKey();
      
      const isValid = StellarSdk.StrKey.isValidEd25519PublicKey(publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject invalid public keys', () => {
      const invalidKeys = [
        'INVALID',
        'G12345',
        'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        '',
        'G' + 'X'.repeat(55),
      ];
      
      invalidKeys.forEach(key => {
        const isValid = StellarSdk.StrKey.isValidEd25519PublicKey(key);
        expect(isValid).toBe(false);
      });
    });

    it('should validate valid secret keys', () => {
      const keypair = StellarSdk.Keypair.random();
      const secret = keypair.secret();
      
      const isValid = StellarSdk.StrKey.isValidEd25519SecretSeed(secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid secret keys', () => {
      const invalidSecrets = [
        'INVALID',
        'S12345',
        'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        '',
        'S' + 'X'.repeat(55),
      ];
      
      invalidSecrets.forEach(secret => {
        const isValid = StellarSdk.StrKey.isValidEd25519SecretSeed(secret);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Account Operations (Mocked)', () => {
    it('should create account operation structure', () => {
      const destination = StellarSdk.Keypair.random().publicKey();
      const operation = StellarSdk.Operation.createAccount({
        destination,
        startingBalance: '100',
      });
      
      expect(operation.type).toBe('createAccount');
      expect(operation.destination).toBe(destination);
      expect(operation.startingBalance).toBe('100');
    });

    it('should create payment operation structure', () => {
      const destination = StellarSdk.Keypair.random().publicKey();
      const asset = new StellarSdk.Asset('USD', StellarSdk.Keypair.random().publicKey());
      
      const operation = StellarSdk.Operation.payment({
        destination,
        asset,
        amount: '50.50',
      });
      
      expect(operation.type).toBe('payment');
      expect(operation.destination).toBe(destination);
      expect(operation.amount).toBe('50.50');
    });

    it('should format amounts correctly (7 decimal places)', () => {
      const testAmounts = [
        { input: '100', expected: '100.0000000' },
        { input: '0.0000001', expected: '0.0000001' },
        { input: '12345.123', expected: '12345.1230000' },
      ];
      
      testAmounts.forEach(({ input, expected }) => {
        const formatted = parseFloat(input).toFixed(7);
        expect(formatted).toBe(expected);
      });
    });
  });

  describe('Asset Creation', () => {
    it('should create native XLM asset', () => {
      const xlm = StellarSdk.Asset.native();
      
      expect(xlm.isNative()).toBe(true);
      expect(xlm.getCode()).toBe('XLM');
    });

    it('should create custom asset', () => {
      const issuer = StellarSdk.Keypair.random().publicKey();
      const asset = new StellarSdk.Asset('USDC', issuer);
      
      expect(asset.isNative()).toBe(false);
      expect(asset.getCode()).toBe('USDC');
      expect(asset.getIssuer()).toBe(issuer);
    });

    it('should enforce asset code length limits', () => {
      const issuer = StellarSdk.Keypair.random().publicKey();
      
      // Valid: 1-12 characters
      expect(() => new StellarSdk.Asset('A', issuer)).not.toThrow();
      expect(() => new StellarSdk.Asset('ABCDEFGHIJKL', issuer)).not.toThrow();
      
      // Invalid: >12 characters
      expect(() => new StellarSdk.Asset('ABCDEFGHIJKLM', issuer)).toThrow();
    });
  });
});
