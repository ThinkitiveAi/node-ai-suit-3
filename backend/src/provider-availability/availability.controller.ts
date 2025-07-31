import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { SlotSearchDto } from './dto/slot-search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Provider Availability')
@Controller('v1/provider')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * Create availability slots for a provider
   */
  @Post('availability')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create availability slots',
    description: 'Create availability slots for a healthcare provider with optional recurring patterns'
  })
  @ApiBody({ type: CreateAvailabilityDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Availability slots created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Availability slots created successfully' },
        data: {
          type: 'object',
          properties: {
            availability_id: { type: 'string', example: 'uuid-here' },
            slots_created: { type: 'number', example: 16 },
            date_range: {
              type: 'object',
              properties: {
                start: { type: 'string', example: '2024-08-01' },
                end: { type: 'string', example: '2024-09-01' }
              }
            }
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
    description: 'Conflict - overlapping slots detected' 
  })
  @ApiResponse({ 
    status: 422, 
    description: 'Unprocessable entity - validation errors' 
  })
  async createAvailability(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.createAvailability(
      providerId,
      createAvailabilityDto,
    );

    return {
      success: true,
      message: 'Availability slots created successfully',
      data: result,
    };
  }

  /**
   * Get provider availability
   */
  @Get(':provider_id/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get provider availability',
    description: 'Retrieve availability information for a specific provider'
  })
  @ApiParam({ name: 'provider_id', description: 'Provider ID', example: 'uuid-here' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD)', example: '2024-08-01' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)', example: '2024-09-01' })
  @ApiResponse({ 
    status: 200, 
    description: 'Provider availability retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Provider availability retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            provider_id: { type: 'string', example: 'uuid-here' },
            availabilities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-here' },
                  date: { type: 'string', example: '2024-08-01T00:00:00.000Z' },
                  start_time: { type: 'string', example: '09:00' },
                  end_time: { type: 'string', example: '17:00' },
                  timezone: { type: 'string', example: 'Asia/Kolkata' },
                  status: { type: 'string', example: 'available' },
                  appointment_type: { type: 'string', example: 'consultation' },
                  available_slots: { type: 'number', example: 16 },
                  total_slots: { type: 'number', example: 16 }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Provider not found' 
  })
  async getProviderAvailability(
    @Param('provider_id') providerId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const availabilities = await this.availabilityService.getProviderAvailability(
      providerId,
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Provider availability retrieved successfully',
      data: {
        provider_id: providerId,
        availabilities,
      },
    };
  }

  /**
   * Update availability slot
   */
  @Put('availability/:slot_id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update availability slot',
    description: 'Update a specific availability slot for the authenticated provider'
  })
  @ApiParam({ name: 'slot_id', description: 'Slot ID', example: 'uuid-here' })
  @ApiBody({ type: UpdateAvailabilityDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Availability slot updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Availability slot updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            status: { type: 'string', example: 'blocked' },
            appointment_type: { type: 'string', example: 'consultation' },
            slot_start_time: { type: 'string', example: '2024-08-01T09:00:00.000Z' },
            slot_end_time: { type: 'string', example: '2024-08-01T09:30:00.000Z' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Slot not found' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Cannot update booked slot' 
  })
  async updateAvailabilitySlot(
    @Param('slot_id') slotId: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.updateAvailabilitySlot(
      slotId,
      providerId,
      updateAvailabilityDto,
    );

    return {
      success: true,
      message: 'Availability slot updated successfully',
      data: result,
    };
  }

  /**
   * Delete availability slot
   */
  @Delete('availability/:slot_id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete availability slot',
    description: 'Delete a specific availability slot or recurring series'
  })
  @ApiParam({ name: 'slot_id', description: 'Slot ID', example: 'uuid-here' })
  @ApiQuery({ name: 'delete_recurring', required: false, description: 'Delete recurring series', example: 'true' })
  @ApiQuery({ name: 'reason', required: false, description: 'Reason for deletion', example: 'emergency_leave' })
  @ApiResponse({ 
    status: 200, 
    description: 'Availability slot deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Availability slot deleted successfully' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Slot deleted successfully' },
            reason: { type: 'string', example: 'emergency_leave' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Slot not found' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Cannot delete booked slot' 
  })
  async deleteAvailabilitySlot(
    @Param('slot_id') slotId: string,
    @Req() req: Request,
    @Query('delete_recurring') deleteRecurring?: string,
    @Query('reason') reason?: string,
  ) {
    const providerId = (req.user as any).id;
    const shouldDeleteRecurring = deleteRecurring === 'true';
    
    const result = await this.availabilityService.deleteAvailabilitySlot(
      slotId,
      providerId,
      shouldDeleteRecurring,
      reason,
    );

    return {
      success: true,
      message: 'Availability slot deleted successfully',
      data: result,
    };
  }

  /**
   * Search available slots for patients
   */
  @Get('availability/search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiOperation({ 
    summary: 'Search available slots',
    description: 'Search for available appointment slots with various filters'
  })
  @ApiQuery({ name: 'date', required: false, description: 'Specific date (YYYY-MM-DD)', example: '2024-08-01' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date range', example: '2024-08-01' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date range', example: '2024-09-01' })
  @ApiQuery({ name: 'specialization', required: false, description: 'Provider specialization', example: 'cardiology' })
  @ApiQuery({ name: 'location', required: false, description: 'Location filter', example: 'Pune' })
  @ApiQuery({ name: 'appointment_type', required: false, description: 'Type of appointment', example: 'consultation' })
  @ApiResponse({ 
    status: 200, 
    description: 'Available slots retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Available slots retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            slots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-here' },
                  provider: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'uuid-here' },
                      name: { type: 'string', example: 'Dr. John Doe' },
                      specialization: { type: 'string', example: 'Cardiology' },
                      location: { type: 'string', example: 'Pune, Maharashtra' }
                    }
                  },
                  slot_start_time: { type: 'string', example: '2024-08-01T09:00:00.000Z' },
                  slot_end_time: { type: 'string', example: '2024-08-01T09:30:00.000Z' },
                  appointment_type: { type: 'string', example: 'consultation' },
                  location: { type: 'object', example: { type: 'clinic', address: 'Main Street' } },
                  pricing: { type: 'object', example: { base_fee: 500, currency: 'INR' } },
                  timezone: { type: 'string', example: 'Asia/Kolkata' }
                }
              }
            },
            total_count: { type: 'number', example: 1 },
            filters_applied: {
              type: 'object',
              properties: {
                date: { type: 'string', example: '2024-08-01' },
                specialization: { type: 'string', example: 'cardiology' },
                location: { type: 'string', example: 'Pune' }
              }
            }
          }
        }
      }
    }
  })
  async searchAvailableSlots(@Query() searchDto: SlotSearchDto) {
    const slots = await this.availabilityService.searchAvailableSlots(searchDto);

    return {
      success: true,
      message: 'Available slots retrieved successfully',
      data: {
        slots,
        total_count: slots.length,
        filters_applied: {
          date: searchDto.date,
          start_date: searchDto.start_date,
          end_date: searchDto.end_date,
          specialization: searchDto.specialization,
          location: searchDto.location,
          appointment_type: searchDto.appointment_type,
        },
      },
    };
  }

  /**
   * Get availability statistics for a provider
   */
  @Get(':provider_id/availability/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get availability statistics',
    description: 'Get availability statistics for a specific provider'
  })
  @ApiParam({ name: 'provider_id', description: 'Provider ID', example: 'uuid-here' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date for statistics', example: '2024-08-01' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date for statistics', example: '2024-09-01' })
  @ApiResponse({ 
    status: 200, 
    description: 'Availability statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Availability statistics retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            provider_id: { type: 'string', example: 'uuid-here' },
            statistics: {
              type: 'object',
              properties: {
                total_slots: { type: 'number', example: 160 },
                booked_slots: { type: 'number', example: 45 },
                available_slots: { type: 'number', example: 115 },
                booking_rate: { type: 'number', example: 28.125 }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Provider not found' 
  })
  async getAvailabilityStats(
    @Param('provider_id') providerId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const stats = await this.availabilityService.getAvailabilityStats(
      providerId,
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Availability statistics retrieved successfully',
      data: {
        provider_id: providerId,
        statistics: stats,
      },
    };
  }

  /**
   * Get current provider's availability
   */
  @Get('availability')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current provider availability',
    description: 'Get availability information for the authenticated provider'
  })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD)', example: '2024-08-01' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)', example: '2024-09-01' })
  @ApiResponse({ 
    status: 200, 
    description: 'Your availability retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Your availability retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            availabilities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-here' },
                  date: { type: 'string', example: '2024-08-01T00:00:00.000Z' },
                  start_time: { type: 'string', example: '09:00' },
                  end_time: { type: 'string', example: '17:00' },
                  timezone: { type: 'string', example: 'Asia/Kolkata' },
                  status: { type: 'string', example: 'available' },
                  appointment_type: { type: 'string', example: 'consultation' },
                  available_slots: { type: 'number', example: 16 },
                  total_slots: { type: 'number', example: 16 }
                }
              }
            }
          }
        }
      }
    }
  })
  async getCurrentProviderAvailability(
    @Req() req: Request,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const providerId = (req.user as any).id;
    
    const availabilities = await this.availabilityService.getProviderAvailability(
      providerId,
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Your availability retrieved successfully',
      data: {
        availabilities,
      },
    };
  }

  /**
   * Get current provider's availability statistics
   */
  @Get('availability/stats')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current provider statistics',
    description: 'Get availability statistics for the authenticated provider'
  })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date for statistics', example: '2024-08-01' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date for statistics', example: '2024-09-01' })
  @ApiResponse({ 
    status: 200, 
    description: 'Your availability statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Your availability statistics retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            statistics: {
              type: 'object',
              properties: {
                total_slots: { type: 'number', example: 160 },
                booked_slots: { type: 'number', example: 45 },
                available_slots: { type: 'number', example: 115 },
                booking_rate: { type: 'number', example: 28.125 }
              }
            }
          }
        }
      }
    }
  })
  async getCurrentProviderStats(
    @Req() req: Request,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const providerId = (req.user as any).id;
    
    const stats = await this.availabilityService.getAvailabilityStats(
      providerId,
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Your availability statistics retrieved successfully',
      data: {
        statistics: stats,
      },
    };
  }
} 