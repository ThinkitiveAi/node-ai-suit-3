import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProviderService } from './provider.service';
import { CreateProviderDto } from './dto/create-provider.dto';

@ApiTags('Provider Registration')
@Controller('v1/provider')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiOperation({ 
    summary: 'Register a new healthcare provider',
    description: 'Creates a new provider account with email verification'
  })
  @ApiBody({ type: CreateProviderDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Provider registered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Provider registered successfully. Verification email sent.' },
        data: {
          type: 'object',
          properties: {
            provider_id: { type: 'string', example: 'uuid-here' },
            email: { type: 'string', example: 'john.doe@clinic.com' },
            verification_status: { type: 'string', example: 'pending' }
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
    description: 'Conflict - email, phone, or license number already exists' 
  })
  @ApiResponse({ 
    status: 422, 
    description: 'Unprocessable entity - validation errors' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async register(@Body() createProviderDto: CreateProviderDto) {
    return this.providerService.registerProvider(createProviderDto);
  }
} 