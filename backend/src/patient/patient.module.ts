import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { EmailVerificationService } from '../verification/email-verification.service';
import { PhoneVerificationService } from '../verification/phone-verification.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [PatientController],
  providers: [PatientService, EmailVerificationService, PhoneVerificationService],
  exports: [PatientService, EmailVerificationService, PhoneVerificationService],
})
export class PatientModule {} 