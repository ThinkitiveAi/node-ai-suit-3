import { DateTime } from 'luxon';

export class TimezoneUtil {
  /**
   * Convert a time from one timezone to another
   */
  static convertTime(
    time: string,
    fromTimezone: string,
    toTimezone: string,
    date: Date = new Date(),
  ): string {
    const dateTime = DateTime.fromISO(`${date.toISOString().split('T')[0]}T${time}`, {
      zone: fromTimezone,
    });
    
    const converted = dateTime.setZone(toTimezone);
    return converted.toFormat('HH:mm');
  }

  /**
   * Convert a date and time to UTC
   */
  static toUTC(date: Date, time: string, timezone: string): Date {
    const dateTime = DateTime.fromISO(`${date.toISOString().split('T')[0]}T${time}`, {
      zone: timezone,
    });
    
    return dateTime.toUTC().toJSDate();
  }

  /**
   * Convert UTC date to local timezone
   */
  static fromUTC(date: Date, timezone: string): DateTime {
    return DateTime.fromJSDate(date).setZone(timezone);
  }

  /**
   * Get current time in specified timezone
   */
  static getCurrentTime(timezone: string): string {
    return DateTime.now().setZone(timezone).toFormat('HH:mm');
  }

  /**
   * Check if a timezone is valid
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      DateTime.now().setZone(timezone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get timezone offset in minutes
   */
  static getTimezoneOffset(timezone: string): number {
    return DateTime.now().setZone(timezone).offset;
  }

  /**
   * Check if DST is in effect for a timezone
   */
  static isDST(timezone: string): boolean {
    const now = DateTime.now().setZone(timezone);
    return now.isInDST;
  }

  /**
   * Format time for display in specified timezone
   */
  static formatTimeForDisplay(date: Date, timezone: string): string {
    return DateTime.fromJSDate(date).setZone(timezone).toFormat('HH:mm');
  }

  /**
   * Get timezone abbreviation
   */
  static getTimezoneAbbreviation(timezone: string): string {
    return DateTime.now().setZone(timezone).toFormat('ZZ');
  }

  /**
   * Calculate duration between two times in minutes
   */
  static calculateDuration(startTime: string, endTime: string): number {
    const start = DateTime.fromFormat(startTime, 'HH:mm');
    const end = DateTime.fromFormat(endTime, 'HH:mm');
    
    if (!start.isValid || !end.isValid) {
      throw new Error('Invalid time format');
    }
    
    return end.diff(start, 'minutes').minutes;
  }

  /**
   * Add minutes to a time string
   */
  static addMinutes(time: string, minutes: number): string {
    const dateTime = DateTime.fromFormat(time, 'HH:mm');
    if (!dateTime.isValid) {
      throw new Error('Invalid time format');
    }
    
    return dateTime.plus({ minutes }).toFormat('HH:mm');
  }

  /**
   * Check if a time is between two other times
   */
  static isTimeBetween(time: string, startTime: string, endTime: string): boolean {
    const timeObj = DateTime.fromFormat(time, 'HH:mm');
    const startObj = DateTime.fromFormat(startTime, 'HH:mm');
    const endObj = DateTime.fromFormat(endTime, 'HH:mm');
    
    if (!timeObj.isValid || !startObj.isValid || !endObj.isValid) {
      return false;
    }
    
    return timeObj >= startObj && timeObj <= endObj;
  }
} 