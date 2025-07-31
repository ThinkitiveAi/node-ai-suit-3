import { RecurrencePattern, AvailabilityStatus, AppointmentType } from '../../../generated/prisma';

export class ProviderAvailability {
  id: string;
  providerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: Date;
  slotDuration: number;
  breakDuration: number;
  status: AvailabilityStatus;
  maxAppointmentsPerSlot: number;
  currentAppointments: number;
  appointmentType: AppointmentType;
  location: any; // JSON object
  pricing?: any; // JSON object
  specialRequirements: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
} 