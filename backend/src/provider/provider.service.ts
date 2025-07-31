import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { PasswordUtil } from '../utils/password.util';
import { randomBytes } from 'crypto';

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async registerProvider(createProviderDto: CreateProviderDto) {
    // Validate password confirmation
    if (createProviderDto.password !== createProviderDto.confirm_password) {
      throw new BadRequestException('Password confirmation does not match');
    }

    // Check for existing email
    const existingEmail = await this.prisma.provider.findUnique({
      where: { email: createProviderDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check for existing phone number
    const existingPhone = await this.prisma.provider.findUnique({
      where: { phoneNumber: createProviderDto.phone_number },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // Check for existing license number
    const existingLicense = await this.prisma.provider.findUnique({
      where: { licenseNumber: createProviderDto.license_number },
    });

    if (existingLicense) {
      throw new ConflictException('License number already registered');
    }

    // Hash password
    const passwordHash = await PasswordUtil.hashPassword(createProviderDto.password);

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');

    try {
      // Create provider record
      const provider = await this.prisma.provider.create({
        data: {
          firstName: createProviderDto.first_name,
          lastName: createProviderDto.last_name,
          email: createProviderDto.email,
          phoneNumber: createProviderDto.phone_number,
          passwordHash,
          specialization: createProviderDto.specialization,
          licenseNumber: createProviderDto.license_number,
          yearsOfExperience: createProviderDto.years_of_experience,
          clinicStreet: createProviderDto.clinic_address.street,
          clinicCity: createProviderDto.clinic_address.city,
          clinicState: createProviderDto.clinic_address.state,
          clinicZip: createProviderDto.clinic_address.zip,
          verificationStatus: 'pending',
        },
      });

      // Send verification email
      const emailSent = await this.mailService.sendVerificationEmail(
        provider.email,
        verificationToken,
      );

      if (!emailSent) {
        this.logger.warn(`Failed to send verification email to ${provider.email}`);
      }

      // Log successful registration
      this.logger.log(`Provider registered successfully: ${provider.email}`);

      return {
        success: true,
        message: 'Provider registered successfully. Verification email sent.',
        data: {
          provider_id: provider.id,
          email: provider.email,
          verification_status: provider.verificationStatus,
        },
      };
    } catch (error) {
      this.logger.error('Error during provider registration:', error);
      
      // Handle Prisma-specific errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        throw new ConflictException(`${field} already exists`);
      }
      
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  async findByEmail(email: string) {
    return this.prisma.provider.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.provider.findUnique({
      where: { id },
    });
  }
} 