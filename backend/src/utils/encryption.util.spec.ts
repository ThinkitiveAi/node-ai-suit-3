import { EncryptionUtil } from './encryption.util';

const originalEnv = process.env;

describe('EncryptionUtil', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('encrypt', () => {
    it('should encrypt text successfully', async () => {
      const text = 'sensitive data';
      const encrypted = await EncryptionUtil.encrypt(text);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(text);
      expect(encrypted).toContain(':');
    });

    it('should return empty string for empty input', async () => {
      const encrypted = await EncryptionUtil.encrypt('');
      expect(encrypted).toBe('');
    });

    it('should return null for null input', async () => {
      const encrypted = await EncryptionUtil.encrypt(null as any);
      expect(encrypted).toBe(null);
    });

    it('should throw error when ENCRYPTION_KEY is not set', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      await expect(EncryptionUtil.encrypt('test')).rejects.toThrow('ENCRYPTION_KEY environment variable is required');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when ENCRYPTION_KEY is too short', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short';

      await expect(EncryptionUtil.encrypt('test')).rejects.toThrow('ENCRYPTION_KEY must be at least 32 characters long');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text successfully', async () => {
      const originalText = 'sensitive data';
      const encrypted = await EncryptionUtil.encrypt(originalText);
      const decrypted = await EncryptionUtil.decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should return empty string for empty input', async () => {
      const decrypted = await EncryptionUtil.decrypt('');
      expect(decrypted).toBe('');
    });

    it('should return null for null input', async () => {
      const decrypted = await EncryptionUtil.decrypt(null as any);
      expect(decrypted).toBe(null);
    });

    it('should throw error for invalid encrypted text format', async () => {
      await expect(EncryptionUtil.decrypt('invalid-format')).rejects.toThrow('Invalid encrypted text format');
    });

    it('should throw error for malformed encrypted text', async () => {
      await expect(EncryptionUtil.decrypt('part1:part2:part3')).rejects.toThrow('Invalid encrypted text format');
    });

    it('should throw error when ENCRYPTION_KEY is not set', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      await expect(EncryptionUtil.decrypt('test')).rejects.toThrow('ENCRYPTION_KEY environment variable is required');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('encryptObject', () => {
    it('should encrypt specified fields in object', async () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        insurancePolicy: 'POL123456',
        phone: '+1234567890',
      };

      const encryptedObj = await EncryptionUtil.encryptObject(obj, ['insurancePolicy']);
      
      expect(encryptedObj.name).toBe(obj.name);
      expect(encryptedObj.email).toBe(obj.email);
      expect(encryptedObj.phone).toBe(obj.phone);
      expect(encryptedObj.insurancePolicy).not.toBe(obj.insurancePolicy);
      expect(encryptedObj.insurancePolicy).toContain(':');
    });

    it('should handle null object', async () => {
      const result = await EncryptionUtil.encryptObject(null, ['field']);
      expect(result).toBe(null);
    });

    it('should handle empty fields array', async () => {
      const obj = { field: 'value' };
      const result = await EncryptionUtil.encryptObject(obj, []);
      expect(result).toEqual(obj);
    });

    it('should skip non-string fields', async () => {
      const obj = {
        name: 'John',
        age: 30,
        insurancePolicy: 'POL123456',
      };

      const encryptedObj = await EncryptionUtil.encryptObject(obj, ['age', 'insurancePolicy']);
      
      expect(encryptedObj.name).toBe(obj.name);
      expect(encryptedObj.age).toBe(obj.age);
      expect(encryptedObj.insurancePolicy).not.toBe(obj.insurancePolicy);
    });
  });

  describe('decryptObject', () => {
    it('should decrypt specified fields in object', async () => {
      const originalObj = {
        name: 'John Doe',
        insurancePolicy: 'POL123456',
      };

      const encryptedObj = await EncryptionUtil.encryptObject(originalObj, ['insurancePolicy']);
      const decryptedObj = await EncryptionUtil.decryptObject(encryptedObj, ['insurancePolicy']);
      
      expect(decryptedObj.name).toBe(originalObj.name);
      expect(decryptedObj.insurancePolicy).toBe(originalObj.insurancePolicy);
    });

    it('should handle null object', async () => {
      const result = await EncryptionUtil.decryptObject(null, ['field']);
      expect(result).toBe(null);
    });

    it('should handle empty fields array', async () => {
      const obj = { field: 'value' };
      const result = await EncryptionUtil.decryptObject(obj, []);
      expect(result).toEqual(obj);
    });

    it('should handle decryption errors gracefully', async () => {
      const obj = {
        name: 'John',
        insurancePolicy: 'invalid-encrypted-data',
      };

      const decryptedObj = await EncryptionUtil.decryptObject(obj, ['insurancePolicy']);
      
      expect(decryptedObj.name).toBe(obj.name);
      expect(decryptedObj.insurancePolicy).toBe(obj.insurancePolicy); // Should remain unchanged on error
    });
  });

  describe('integration', () => {
    it('should encrypt and decrypt complex data', async () => {
      const originalData = {
        patientId: '12345',
        insurancePolicy: 'POL123456789',
        ssn: '123-45-6789',
        notes: 'Regular checkup',
      };

      const encryptedData = await EncryptionUtil.encryptObject(originalData, ['insurancePolicy', 'ssn']);
      const decryptedData = await EncryptionUtil.decryptObject(encryptedData, ['insurancePolicy', 'ssn']);

      expect(decryptedData.patientId).toBe(originalData.patientId);
      expect(decryptedData.insurancePolicy).toBe(originalData.insurancePolicy);
      expect(decryptedData.ssn).toBe(originalData.ssn);
      expect(decryptedData.notes).toBe(originalData.notes);
    });

    it('should handle multiple encryption/decryption cycles', async () => {
      const text = 'sensitive information';
      
      // First cycle
      const encrypted1 = await EncryptionUtil.encrypt(text);
      const decrypted1 = await EncryptionUtil.decrypt(encrypted1);
      
      // Second cycle
      const encrypted2 = await EncryptionUtil.encrypt(decrypted1);
      const decrypted2 = await EncryptionUtil.decrypt(encrypted2);
      
      expect(decrypted1).toBe(text);
      expect(decrypted2).toBe(text);
      expect(encrypted1).not.toBe(encrypted2); // Should be different due to random IV
    });
  });
}); 