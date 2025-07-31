import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationService } from '../verification/email-verification.service';
import { PhoneVerificationService } from '../verification/phone-verification.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { PasswordUtil } from '../utils/password.util';
import { DateUtil } from '../utils/date.util';
import { EncryptionUtil } from '../utils/encryption.util';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly phoneVerificationService: PhoneVerificationService,
  ) {}

  async registerPatient(createPatientDto: CreatePatientDto, clientIp: string): Promise<any> {
    // Validate password confirmation
    if (createPatientDto.password !== createPatientDto.confirm_password) {
      throw new BadRequestException('Password confirmation does not match');
    }

    // Validate date of birth
    const dateOfBirth = new Date(createPatientDto.date_of_birth);
    const dateValidation = DateUtil.validateDateOfBirth(dateOfBirth);
    if (!dateValidation.isValid) {
      throw new BadRequestException(dateValidation.error);
    }

    // Check for existing email
    const existingEmail = await this.findByEmail(createPatientDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check for existing phone
    const existingPhone = await this.findByPhone(createPatientDto.phone_number);
    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const passwordHash = await PasswordUtil.hashPassword(createPatientDto.password);

    // Prepare patient data
    const patientData: any = {
      firstName: createPatientDto.first_name,
      lastName: createPatientDto.last_name,
      email: createPatientDto.email,
      phoneNumber: createPatientDto.phone_number,
      passwordHash,
      dateOfBirth,
      gender: createPatientDto.gender,
      clinicStreet: createPatientDto.address.street,
      clinicCity: createPatientDto.address.city,
      clinicState: createPatientDto.address.state,
      clinicZip: createPatientDto.address.zip,
      medicalHistory: [],
      marketingOptIn: createPatientDto.marketing_opt_in || false,
    };

    // Add emergency contact if provided
    if (createPatientDto.emergency_contact) {
      patientData.emergencyName = createPatientDto.emergency_contact.name;
      patientData.emergencyPhone = createPatientDto.emergency_contact.phone;
      patientData.emergencyRelation = createPatientDto.emergency_contact.relationship;
    }

    // Add insurance info if provided (encrypted)
    if (createPatientDto.insurance_info) {
      patientData.insuranceProvider = createPatientDto.insurance_info.provider;
      patientData.insurancePolicy = await EncryptionUtil.encrypt(createPatientDto.insurance_info.policy_number);
    }

    // Create patient
    const patient = await this.prisma.patient.create({
      data: patientData,
    });

    // Send verification emails/SMS
    const emailSent = await this.emailVerificationService.sendVerificationEmail(patient.id, patient.email);
    const smsSent = await this.phoneVerificationService.sendVerificationSMS(patient.id, patient.phoneNumber);

    // Log registration attempt
    this.logRegistrationAttempt(patient.email, clientIp, 'success');

    return {
      success: true,
      message: 'Patient registered successfully. Verification emails and SMS sent.',
      data: {
        patient_id: patient.id,
        email: patient.email,
        phone_number: patient.phoneNumber,
        email_verification_sent: emailSent,
        phone_verification_sent: smsSent,
      },
    };
  }

  async verifyEmail(token: string, patientId: string): Promise<boolean> {
    return this.emailVerificationService.verifyEmailToken(token, patientId);
  }

  async verifyPhone(otp: string, patientId: string, phoneNumber: string): Promise<boolean> {
    return this.phoneVerificationService.verifyOTPWithRateLimit(otp, patientId, phoneNumber);
  }

  async resendEmailVerification(patientId: string): Promise<boolean> {
    const patient = await this.getPatientById(patientId);
    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    return this.emailVerificationService.sendVerificationEmail(patientId, patient.email);
  }

  async resendPhoneVerification(patientId: string): Promise<boolean> {
    const patient = await this.getPatientById(patientId);
    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    return this.phoneVerificationService.sendVerificationSMS(patientId, patient.phoneNumber);
  }

  async getPatientById(id: string): Promise<any> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return null;
    }

    // Decrypt sensitive fields
    const decryptedPatient = await EncryptionUtil.decryptObject(patient, ['insurancePolicy']);

    return {
      id: decryptedPatient.id,
      first_name: decryptedPatient.firstName,
      last_name: decryptedPatient.lastName,
      email: decryptedPatient.email,
      phone_number: decryptedPatient.phoneNumber,
      date_of_birth: decryptedPatient.dateOfBirth,
      gender: decryptedPatient.gender,
      address: {
        street: decryptedPatient.clinicStreet,
        city: decryptedPatient.clinicCity,
        state: decryptedPatient.clinicState,
        zip: decryptedPatient.clinicZip,
      },
      emergency_contact: decryptedPatient.emergencyName ? {
        name: decryptedPatient.emergencyName,
        phone: decryptedPatient.emergencyPhone,
        relationship: decryptedPatient.emergencyRelation,
      } : null,
      insurance_info: decryptedPatient.insuranceProvider ? {
        provider: decryptedPatient.insuranceProvider,
        policy_number: decryptedPatient.insurancePolicy,
      } : null,
      email_verified: decryptedPatient.emailVerified,
      phone_verified: decryptedPatient.phoneVerified,
      is_active: decryptedPatient.isActive,
      marketing_opt_in: decryptedPatient.marketingOptIn,
      created_at: decryptedPatient.createdAt,
      updated_at: decryptedPatient.updatedAt,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.patient.findUnique({
      where: { email },
    });
  }

  async findByPhone(phoneNumber: string) {
    return this.prisma.patient.findUnique({
      where: { phoneNumber },
    });
  }

  async updateMedicalHistory(patientId: string, medicalHistory: string[]): Promise<void> {
    await this.prisma.patient.update({
      where: { id: patientId },
      data: { medicalHistory },
    });
  }

  async updateMarketingOptIn(patientId: string, marketingOptIn: boolean): Promise<void> {
    await this.prisma.patient.update({
      where: { id: patientId },
      data: { marketingOptIn },
    });
  }

  async deactivatePatient(patientId: string): Promise<void> {
    await this.prisma.patient.update({
      where: { id: patientId },
      data: { isActive: false },
    });
  }

  private logRegistrationAttempt(email: string, clientIp: string, status: 'success' | 'failed'): void {
    this.logger.log(`Patient registration ${status} for ${email} from IP ${clientIp}`);
  }

  async cleanupExpiredTokens(): Promise<void> {
    await Promise.all([
      this.emailVerificationService.cleanupExpiredTokens(),
      this.phoneVerificationService.cleanupExpiredTokens(),
    ]);
  }
} 