import { VerificationStatus } from '../../../generated/prisma';

export class Provider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  clinicStreet: string;
  clinicCity: string;
  clinicState: string;
  clinicZip: string;
  verificationStatus: VerificationStatus;
  licenseDocumentUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 