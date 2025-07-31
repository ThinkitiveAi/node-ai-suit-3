import { PasswordUtil } from './password.util';

describe('PasswordUtil', () => {
  const testPassword = 'SecurePassword123!';

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await PasswordUtil.hashPassword(testPassword);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(testPassword);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await PasswordUtil.hashPassword(testPassword);
      const hash2 = await PasswordUtil.hashPassword(testPassword);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const hash = await PasswordUtil.hashPassword(testPassword);
      const isValid = await PasswordUtil.verifyPassword(testPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await PasswordUtil.hashPassword(testPassword);
      const isValid = await PasswordUtil.verifyPassword('WrongPassword123!', hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await PasswordUtil.hashPassword(testPassword);
      const isValid = await PasswordUtil.verifyPassword('', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('integration', () => {
    it('should work with various password strengths', async () => {
      const passwords = [
        'Simple123!',
        'VeryLongPasswordWithSpecialChars@#$%^&*()',
        'MixedCase123!@#',
        'NumbersOnly123456789',
      ];

      for (const password of passwords) {
        const hash = await PasswordUtil.hashPassword(password);
        const isValid = await PasswordUtil.verifyPassword(password, hash);
        
        expect(isValid).toBe(true);
      }
    });
  });
}); 