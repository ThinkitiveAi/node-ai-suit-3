import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Req,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { Request } from 'express';

@ApiTags('Patient Registration')
@Controller('v1/patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  )
  @ApiOperation({ 
    summary: 'Register a new patient',
    description: 'Creates a new patient account with email and phone verification'
  })
  @ApiBody({ type: CreatePatientDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Patient registered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Patient registered successfully. Verification email sent.' },
        data: {
          type: 'object',
          properties: {
            patient_id: { type: 'string', example: 'uuid-here' },
            email: { type: 'string', example: 'jane.smith@email.com' },
            phone_number: { type: 'string', example: '+1234567890' },
            email_verified: { type: 'boolean', example: false },
            phone_verified: { type: 'boolean', example: false }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation errors' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - email or phone number already exists' 
  })
  @ApiResponse({ 
    status: 422, 
    description: 'Unprocessable entity - validation errors' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async register(@Body() createPatientDto: CreatePatientDto, @Req() req: Request) {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    return this.patientService.registerPatient(createPatientDto, clientIp);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify patient email',
    description: 'Verify patient email using verification token'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'verification-token-here' },
        patient_id: { type: 'string', example: 'uuid-here' }
      },
      required: ['token', 'patient_id']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Email verification result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email verified successfully' }
      }
    }
  })
  async verifyEmail(@Body() body: { token: string; patient_id: string }) {
    const verified = await this.patientService.verifyEmail(body.token, body.patient_id);
    return {
      success: verified,
      message: verified ? 'Email verified successfully' : 'Invalid or expired verification token',
    };
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify patient phone',
    description: 'Verify patient phone number using OTP'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        otp: { type: 'string', example: '123456' },
        patient_id: { type: 'string', example: 'uuid-here' },
        phone_number: { type: 'string', example: '+1234567890' }
      },
      required: ['otp', 'patient_id', 'phone_number']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Phone verification result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Phone verified successfully' }
      }
    }
  })
  async verifyPhone(@Body() body: { otp: string; patient_id: string; phone_number: string }) {
    const verified = await this.patientService.verifyPhone(body.otp, body.patient_id, body.phone_number);
    return {
      success: verified,
      message: verified ? 'Phone verified successfully' : 'Invalid or expired OTP',
    };
  }

  @Post('resend-email-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Resend email verification',
    description: 'Resend verification email to patient'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', example: 'uuid-here' }
      },
      required: ['patient_id']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Email resend result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Verification email sent' }
      }
    }
  })
  async resendEmailVerification(@Body() body: { patient_id: string }) {
    const sent = await this.patientService.resendEmailVerification(body.patient_id);
    return {
      success: sent,
      message: sent ? 'Verification email sent' : 'Failed to send verification email',
    };
  }

  @Post('resend-phone-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Resend phone verification',
    description: 'Resend verification SMS to patient'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', example: 'uuid-here' }
      },
      required: ['patient_id']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'SMS resend result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Verification SMS sent' }
      }
    }
  })
  async resendPhoneVerification(@Body() body: { patient_id: string }) {
    const sent = await this.patientService.resendPhoneVerification(body.patient_id);
    return {
      success: sent,
      message: sent ? 'Verification SMS sent' : 'Failed to send verification SMS',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get patient by ID',
    description: 'Retrieve patient information by patient ID'
  })
  @ApiParam({ name: 'id', description: 'Patient ID', example: 'uuid-here' })
  @ApiResponse({ 
    status: 200, 
    description: 'Patient information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            first_name: { type: 'string', example: 'Jane' },
            last_name: { type: 'string', example: 'Smith' },
            email: { type: 'string', example: 'jane.smith@email.com' },
            phone_number: { type: 'string', example: '+1234567890' },
            email_verified: { type: 'boolean', example: true },
            phone_verified: { type: 'boolean', example: false },
            is_active: { type: 'boolean', example: true }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Patient not found' 
  })
  async getPatient(@Param('id') id: string) {
    const patient = await this.patientService.getPatientById(id);
    if (!patient) {
      return {
        success: false,
        message: 'Patient not found',
      };
    }
    return {
      success: true,
      data: patient,
    };
  }
} 