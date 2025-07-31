import { DateTime } from 'luxon';
import { TimezoneUtil } from './timezone.util';

export interface SlotGenerationConfig {
  startTime: string;
  endTime: string;
  slotDuration: number;
  breakDuration: number;
  timezone: string;
  date: Date;
}

export interface GeneratedSlot {
  startTime: string;
  endTime: string;
  slotStartTime: Date;
  slotEndTime: Date;
}

export class SlotGeneratorUtil {
  /**
   * Generate slots for a single day
   */
  static generateSlotsForDay(config: SlotGenerationConfig): GeneratedSlot[] {
    const slots: GeneratedSlot[] = [];
    let currentTime = config.startTime;
    
    while (this.isTimeBefore(currentTime, config.endTime)) {
      const slotEndTime = this.addMinutes(currentTime, config.slotDuration);
      
      if (this.isTimeBefore(slotEndTime, config.endTime) || this.isTimeEqual(slotEndTime, config.endTime)) {
        const slotStartUTC = TimezoneUtil.toUTC(config.date, currentTime, config.timezone);
        const slotEndUTC = TimezoneUtil.toUTC(config.date, slotEndTime, config.timezone);
        
        slots.push({
          startTime: currentTime,
          endTime: slotEndTime,
          slotStartTime: slotStartUTC,
          slotEndTime: slotEndUTC,
        });
      }
      
      // Add break duration to current time
      currentTime = this.addMinutes(slotEndTime, config.breakDuration);
    }
    
    return slots;
  }

  /**
   * Generate slots for recurring availability
   */
  static generateRecurringSlots(
    config: SlotGenerationConfig,
    recurrencePattern: 'daily' | 'weekly' | 'monthly',
    endDate: Date,
  ): GeneratedSlot[] {
    const slots: GeneratedSlot[] = [];
    let currentDate = new Date(config.date);
    
    while (currentDate <= endDate) {
      const daySlots = this.generateSlotsForDay({
        ...config,
        date: currentDate,
      });
      
      slots.push(...daySlots);
      
      // Calculate next date based on recurrence pattern
      currentDate = this.getNextDate(currentDate, recurrencePattern);
    }
    
    return slots;
  }

  /**
   * Check if time1 is before time2
   */
  private static isTimeBefore(time1: string, time2: string): boolean {
    const t1 = DateTime.fromFormat(time1, 'HH:mm');
    const t2 = DateTime.fromFormat(time2, 'HH:mm');
    
    if (!t1.isValid || !t2.isValid) {
      throw new Error('Invalid time format');
    }
    
    return t1 < t2;
  }

  /**
   * Check if time1 equals time2
   */
  private static isTimeEqual(time1: string, time2: string): boolean {
    const t1 = DateTime.fromFormat(time1, 'HH:mm');
    const t2 = DateTime.fromFormat(time2, 'HH:mm');
    
    if (!t1.isValid || !t2.isValid) {
      throw new Error('Invalid time format');
    }
    
    return t1.equals(t2);
  }

  /**
   * Add minutes to a time string
   */
  private static addMinutes(time: string, minutes: number): string {
    return TimezoneUtil.addMinutes(time, minutes);
  }

  /**
   * Get next date based on recurrence pattern
   */
  private static getNextDate(currentDate: Date, pattern: 'daily' | 'weekly' | 'monthly'): Date {
    const dateTime = DateTime.fromJSDate(currentDate);
    
    switch (pattern) {
      case 'daily':
        return dateTime.plus({ days: 1 }).toJSDate();
      case 'weekly':
        return dateTime.plus({ weeks: 1 }).toJSDate();
      case 'monthly':
        return dateTime.plus({ months: 1 }).toJSDate();
      default:
        throw new Error('Invalid recurrence pattern');
    }
  }

  /**
   * Validate slot generation parameters
   */
  static validateSlotGeneration(config: SlotGenerationConfig): string[] {
    const errors: string[] = [];
    
    // Validate time format
    if (!this.isValidTimeFormat(config.startTime)) {
      errors.push('Invalid start time format. Use HH:mm format.');
    }
    
    if (!this.isValidTimeFormat(config.endTime)) {
      errors.push('Invalid end time format. Use HH:mm format.');
    }
    
    // Validate time range
    if (this.isTimeBefore(config.endTime, config.startTime)) {
      errors.push('End time must be after start time.');
    }
    
    // Validate slot duration
    if (config.slotDuration <= 0) {
      errors.push('Slot duration must be greater than 0.');
    }
    
    // Validate break duration
    if (config.breakDuration < 0) {
      errors.push('Break duration cannot be negative.');
    }
    
    // Validate timezone
    if (!TimezoneUtil.isValidTimezone(config.timezone)) {
      errors.push('Invalid timezone.');
    }
    
    // Validate that slot duration is reasonable
    const totalDuration = TimezoneUtil.calculateDuration(config.startTime, config.endTime);
    if (config.slotDuration > totalDuration) {
      errors.push('Slot duration cannot be greater than total availability duration.');
    }
    
    return errors;
  }

  /**
   * Check if time format is valid (HH:mm)
   */
  private static isValidTimeFormat(time: string): boolean {
    const timeObj = DateTime.fromFormat(time, 'HH:mm');
    return timeObj.isValid;
  }

  /**
   * Calculate total slots that can be generated
   */
  static calculateTotalSlots(config: SlotGenerationConfig): number {
    const totalMinutes = TimezoneUtil.calculateDuration(config.startTime, config.endTime);
    const slotWithBreak = config.slotDuration + config.breakDuration;
    
    return Math.floor(totalMinutes / slotWithBreak);
  }

  /**
   * Check for overlapping slots
   */
  static checkForOverlappingSlots(
    newSlots: GeneratedSlot[],
    existingSlots: GeneratedSlot[],
  ): GeneratedSlot[] {
    const overlapping: GeneratedSlot[] = [];
    
    for (const newSlot of newSlots) {
      for (const existingSlot of existingSlots) {
        if (this.slotsOverlap(newSlot, existingSlot)) {
          overlapping.push(newSlot);
          break;
        }
      }
    }
    
    return overlapping;
  }

  /**
   * Check if two slots overlap
   */
  private static slotsOverlap(slot1: GeneratedSlot, slot2: GeneratedSlot): boolean {
    return slot1.slotStartTime < slot2.slotEndTime && slot2.slotStartTime < slot1.slotEndTime;
  }

  /**
   * Filter slots by date range
   */
  static filterSlotsByDateRange(
    slots: GeneratedSlot[],
    startDate: Date,
    endDate: Date,
  ): GeneratedSlot[] {
    return slots.filter(slot => {
      const slotDate = new Date(slot.slotStartTime);
      return slotDate >= startDate && slotDate <= endDate;
    });
  }

  /**
   * Group slots by date
   */
  static groupSlotsByDate(slots: GeneratedSlot[]): Map<string, GeneratedSlot[]> {
    const grouped = new Map<string, GeneratedSlot[]>();
    
    for (const slot of slots) {
      const dateKey = DateTime.fromJSDate(slot.slotStartTime).toFormat('yyyy-MM-dd');
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      
      grouped.get(dateKey)!.push(slot);
    }
    
    return grouped;
  }
} 