import { DateUtil } from './date.util';

describe('DateUtil', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      const age = DateUtil.calculateAge(birthDate);
      expect(age).toBe(25);
    });

    it('should calculate age correctly for birthday not yet reached this year', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth() + 1, today.getDate());
      const age = DateUtil.calculateAge(birthDate);
      expect(age).toBe(24);
    });

    it('should calculate age correctly for birthday already passed this year', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth() - 1, today.getDate());
      const age = DateUtil.calculateAge(birthDate);
      expect(age).toBe(25);
    });
  });

  describe('isValidAge', () => {
    it('should return true for valid age', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      const isValid = DateUtil.isValidAge(birthDate);
      expect(isValid).toBe(true);
    });

    it('should return false for underage person', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
      const isValid = DateUtil.isValidAge(birthDate);
      expect(isValid).toBe(false);
    });

    it('should return false for very old person', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 150, today.getMonth(), today.getDate());
      const isValid = DateUtil.isValidAge(birthDate);
      expect(isValid).toBe(false);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const date = DateUtil.parseDate('1990-01-01');
      expect(date).toBeInstanceOf(Date);
      expect(date!.getFullYear()).toBe(1990);
      expect(date!.getMonth()).toBe(0); // January
      expect(date!.getDate()).toBe(1);
    });

    it('should return null for invalid date string', () => {
      const date = DateUtil.parseDate('invalid-date');
      expect(date).toBeNull();
    });

    it('should return null for empty string', () => {
      const date = DateUtil.parseDate('');
      expect(date).toBeNull();
    });
  });

  describe('isPastDate', () => {
    it('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const isPast = DateUtil.isPastDate(pastDate);
      expect(isPast).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const isPast = DateUtil.isPastDate(futureDate);
      expect(isPast).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future date', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const isFuture = DateUtil.isFutureDate(futureDate);
      expect(isFuture).toBe(true);
    });

    it('should return false for past date', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const isFuture = DateUtil.isFutureDate(pastDate);
      expect(isFuture).toBe(false);
    });
  });

  describe('validateDateOfBirth', () => {
    it('should validate correct date of birth', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      const validation = DateUtil.validateDateOfBirth(birthDate);
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject future date of birth', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const validation = DateUtil.validateDateOfBirth(futureDate);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('must be in the past');
    });

    it('should reject underage person', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
      const validation = DateUtil.validateDateOfBirth(birthDate);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('COPPA compliance');
    });

    it('should reject very old person', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 150, today.getMonth(), today.getDate());
      const validation = DateUtil.validateDateOfBirth(birthDate);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('between');
    });
  });

  describe('getAgeRange', () => {
    it('should return correct age range', () => {
      const range = DateUtil.getAgeRange();
      expect(range.min).toBe(13);
      expect(range.max).toBe(120);
    });
  });

  describe('getMinimumDateOfBirth', () => {
    it('should return date 13 years ago', () => {
      const minDate = DateUtil.getMinimumDateOfBirth();
      const today = new Date();
      const expectedDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      expect(minDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(minDate.getMonth()).toBe(expectedDate.getMonth());
      expect(minDate.getDate()).toBe(expectedDate.getDate());
    });
  });

  describe('getMaximumDateOfBirth', () => {
    it('should return date 120 years ago', () => {
      const maxDate = DateUtil.getMaximumDateOfBirth();
      const today = new Date();
      const expectedDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
      expect(maxDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(maxDate.getMonth()).toBe(expectedDate.getMonth());
      expect(maxDate.getDate()).toBe(expectedDate.getDate());
    });
  });
}); 