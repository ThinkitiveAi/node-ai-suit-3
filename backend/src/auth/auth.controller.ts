import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PatientLoginDto } from './dto/patient-login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('v1/provider')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiOperation({ 
    summary: 'Provider login',
    description: 'Authenticate a healthcare provider with email/phone and password'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Login successful' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string', example: 'jwt-access-token-here' },
            refresh_token: { type: 'string', example: 'jwt-refresh-token-here' },
            expires_in: { type: 'number', example: 3600 },
            token_type: { type: 'string', example: 'Bearer' },
            provider: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid-here' },
                first_name: { type: 'string', example: 'John' },
                last_name: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john.doe@clinic.com' },
                specialization: { type: 'string', example: 'Cardiology' },
                verification_status: { type: 'string', example: 'verified' },
                is_active: { type: 'boolean', example: true }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials' 
  })
  @ApiResponse({ 
    status: 423, 
    description: 'Account locked due to failed attempts' 
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many login attempts' 
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const result = await this.authService.login(loginDto, clientIp);

    // Get provider info for response
    const provider = await this.authService.getProviderInfo(loginDto.identifier);

    return {
      success: true,
      message: 'Login successful',
      data: {
        ...result,
        provider: {
          id: provider.id,
          first_name: provider.first_name,
          last_name: provider.last_name,
          email: provider.email,
          specialization: provider.specialization,
          verification_status: provider.verification_status,
          is_active: provider.is_active,
        },
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Get a new access token using a valid refresh token'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Token refreshed successfully' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string', example: 'new-jwt-access-token' },
            refresh_token: { type: 'string', example: 'new-jwt-refresh-token' },
            expires_in: { type: 'number', example: 3600 },
            token_type: { type: 'string', example: 'Bearer' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid refresh token' 
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto);

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiOperation({ 
    summary: 'Provider logout',
    description: 'Logout and revoke the current refresh token'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logout successful' }
      }
    }
  })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.logout(refreshTokenDto);

    return result;
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Logout from all devices',
    description: 'Revoke all refresh tokens for the authenticated provider'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout from all devices successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logged out from all devices' }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  async logoutAll(@Req() req: Request) {
    const providerId = (req.user as any).id;
    const result = await this.authService.logoutAll(providerId);

    return result;
  }

  @Post('patient/login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiOperation({ 
    summary: 'Patient login',
    description: 'Authenticate a patient with email/phone and password'
  })
  @ApiBody({ type: PatientLoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Patient login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Login successful' },
        data: {
          type: 'object',
          properties: {
            access_token: { type: 'string', example: 'jwt-access-token-here' },
            expires_in: { type: 'number', example: 1800 },
            token_type: { type: 'string', example: 'Bearer' },
            patient: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid-here' },
                first_name: { type: 'string', example: 'Jane' },
                last_name: { type: 'string', example: 'Smith' },
                email: { type: 'string', example: 'jane.smith@email.com' },
                phone_number: { type: 'string', example: '+1234567890' },
                email_verified: { type: 'boolean', example: true },
                phone_verified: { type: 'boolean', example: false }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Email not verified or account inactive' 
  })
  async patientLogin(@Body() patientLoginDto: PatientLoginDto, @Req() req: Request) {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const result = await this.authService.patientLogin(patientLoginDto, clientIp);

    const patient = await this.authService.getPatientInfo(patientLoginDto.identifier);

    return {
      success: true,
      message: 'Login successful',
      data: {
        ...result,
        patient: {
          id: patient.id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          email: patient.email,
          phone_number: patient.phone_number,
          email_verified: patient.email_verified,
          phone_verified: patient.phone_verified,
        },
      },
    };
  }
} 