import { Gender } from '../../../generated/prisma';

export class Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  dateOfBirth: Date;
  gender: Gender;
  clinicStreet: string;
  clinicCity: string;
  clinicState: string;
  clinicZip: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  medicalHistory: string[];
  insuranceProvider?: string;
  insurancePolicy?: string; // encrypted
  emailVerified: boolean;
  phoneVerified: boolean;
  isActive: boolean;
  marketingOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
} 