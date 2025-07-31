import { SlotStatus } from '../../../generated/prisma';

export class AppointmentSlot {
  id: string;
  availabilityId: string;
  providerId: string;
  slotStartTime: Date;
  slotEndTime: Date;
  status: SlotStatus;
  patientId?: string;
  appointmentType: string;
  bookingReference?: string;
  createdAt: Date;
} 