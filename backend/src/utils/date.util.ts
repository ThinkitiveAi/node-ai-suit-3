export class DateUtil {
  private static readonly MINIMUM_AGE = 13; // COPPA compliance
  private static readonly MAXIMUM_AGE = 120; // Reasonable maximum age

  static calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  static isValidAge(dateOfBirth: Date): boolean {
    const age = this.calculateAge(dateOfBirth);
    return age >= this.MINIMUM_AGE && age <= this.MAXIMUM_AGE;
  }

  static getMinimumDateOfBirth(): Date {
    const today = new Date();
    return new Date(today.getFullYear() - this.MINIMUM_AGE, today.getMonth(), today.getDate());
  }

  static getMaximumDateOfBirth(): Date {
    const today = new Date();
    return new Date(today.getFullYear() - this.MAXIMUM_AGE, today.getMonth(), today.getDate());
  }

  static parseDate(dateString: string): Date | null {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  static toUTCString(date: Date): string {
    return date.toISOString();
  }

  static isPastDate(date: Date): boolean {
    return date < new Date();
  }

  static isFutureDate(date: Date): boolean {
    return date > new Date();
  }

  static getAgeRange(): { min: number; max: number } {
    return {
      min: this.MINIMUM_AGE,
      max: this.MAXIMUM_AGE
    };
  }

  static validateDateOfBirth(dateOfBirth: Date): { isValid: boolean; error?: string } {
    if (!this.isPastDate(dateOfBirth)) {
      return { isValid: false, error: 'Date of birth must be in the past' };
    }

    if (!this.isValidAge(dateOfBirth)) {
      const age = this.calculateAge(dateOfBirth);
      if (age < this.MINIMUM_AGE) {
        return { 
          isValid: false, 
          error: `Patient must be at least ${this.MINIMUM_AGE} years old (COPPA compliance)` 
        };
      }
      return { 
        isValid: false, 
        error: `Age must be between ${this.MINIMUM_AGE} and ${this.MAXIMUM_AGE} years` 
      };
    }

    return { isValid: true };
  }
} 