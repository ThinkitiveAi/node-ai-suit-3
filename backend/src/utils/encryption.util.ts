import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 64;

  private static getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    return key;
  }

  static async encrypt(text: string): Promise<string> {
    if (!text) return text;
    
    try {
      const key = this.getEncryptionKey();
      const salt = randomBytes(this.SALT_LENGTH);
      const iv = randomBytes(this.IV_LENGTH);
      
      const derivedKey = await scryptAsync(key, salt, this.KEY_LENGTH) as Buffer;
      const cipher = createCipheriv(this.ALGORITHM, derivedKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      
      const result = salt.toString('hex') + ':' + iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  static async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText) return encryptedText;
    
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedText.split(':');
      
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted text format');
      }
      
      const [saltHex, ivHex, tagHex, encrypted] = parts;
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const derivedKey = await scryptAsync(key, salt, this.KEY_LENGTH) as Buffer;
      const decipher = createDecipheriv(this.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  static async encryptObject(obj: any, fieldsToEncrypt: string[]): Promise<any> {
    if (!obj) return obj;
    
    const encryptedObj = { ...obj };
    for (const field of fieldsToEncrypt) {
      if (obj[field] && typeof obj[field] === 'string') {
        encryptedObj[field] = await this.encrypt(obj[field]);
      }
    }
    return encryptedObj;
  }

  static async decryptObject(obj: any, fieldsToDecrypt: string[]): Promise<any> {
    if (!obj) return obj;
    
    const decryptedObj = { ...obj };
    for (const field of fieldsToDecrypt) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          decryptedObj[field] = await this.decrypt(obj[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error.message);
        }
      }
    }
    return decryptedObj;
  }
} 