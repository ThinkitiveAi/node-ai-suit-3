import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { AvailabilityService } from './availability.service';
import { CreateDayAvailabilityDto } from './dto/create-day-availability.dto';
import { UpdateDayAvailabilityDto } from './dto/update-day-availability.dto';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Provider Day-wise Availability')
@Controller('v1/provider')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * Create day-wise availability for the current provider
   */
  @Post('day-availability')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create day-wise availability',
    description: 'Create or update day-wise availability settings for the current provider'
  })
  @ApiBody({ type: CreateDayAvailabilityDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Day-wise availability created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Day-wise availability created successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-here' },
              providerId: { type: 'string', example: 'provider-uuid' },
              dayOfWeek: { type: 'string', example: 'monday' },
              startTime: { type: 'string', example: '09:00 AM' },
              endTime: { type: 'string', example: '06:00 PM' },
              timezone: { type: 'string', example: 'America/New_York' },
              isActive: { type: 'boolean', example: true },
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
    status: 404, 
    description: 'Provider not found' 
  })
  async createDayAvailability(
    @Body() createDayAvailabilityDto: CreateDayAvailabilityDto,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.createDayAvailability(
      providerId,
      createDayAvailabilityDto,
    );

    return result;
  }

  /**
   * Get day-wise availability for the current provider
   */
  @Get('day-availability')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get day-wise availability',
    description: 'Get day-wise availability settings for the current provider'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Day-wise availability retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Day-wise availability retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-here' },
              providerId: { type: 'string', example: 'provider-uuid' },
              dayOfWeek: { type: 'string', example: 'monday' },
              startTime: { type: 'string', example: '09:00 AM' },
              endTime: { type: 'string', example: '06:00 PM' },
              isActive: { type: 'boolean', example: true },
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
  async getDayAvailability(@Req() req: Request) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.getDayAvailability(providerId);

    return result;
  }

  /**
   * Update day-wise availability for a specific day
   */
  @Put('day-availability/:day_of_week')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update day-wise availability',
    description: 'Update day-wise availability for a specific day'
  })
  @ApiParam({
    name: 'day_of_week',
    description: 'Day of the week (monday, tuesday, etc.)',
    example: 'monday',
  })
  @ApiBody({ type: UpdateDayAvailabilityDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Day availability updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Day availability updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            providerId: { type: 'string', example: 'provider-uuid' },
            dayOfWeek: { type: 'string', example: 'monday' },
            startTime: { type: 'string', example: '09:00 AM' },
            endTime: { type: 'string', example: '06:00 PM' },
            isActive: { type: 'boolean', example: true },
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
    status: 404, 
    description: 'Provider or day availability not found' 
  })
  async updateDayAvailability(
    @Param('day_of_week') dayOfWeek: string,
    @Body() updateDayAvailabilityDto: UpdateDayAvailabilityDto,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.updateDayAvailability(
      providerId,
      dayOfWeek,
      updateDayAvailabilityDto,
    );

    return result;
  }

  /**
   * Delete day-wise availability for a specific day
   */
  @Delete('day-availability/:day_of_week')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete day-wise availability',
    description: 'Delete day-wise availability for a specific day'
  })
  @ApiParam({
    name: 'day_of_week',
    description: 'Day of the week (monday, tuesday, etc.)',
    example: 'monday',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Day availability deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Day availability deleted successfully' },
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Provider or day availability not found' 
  })
  async deleteDayAvailability(
    @Param('day_of_week') dayOfWeek: string,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.deleteDayAvailability(
      providerId,
      dayOfWeek,
    );

    return result;
  }

  /**
   * Create blocked slot for the current provider
   */
  @Post('blocked-slots')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create blocked slot',
    description: 'Create a blocked slot for the current provider'
  })
  @ApiBody({ type: CreateBlockedSlotDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Blocked slot created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Blocked slot created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            providerId: { type: 'string', example: 'provider-uuid' },
            blockDate: { type: 'string', example: '2024-08-15T00:00:00.000Z' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '17:00' },
            reason: { type: 'string', example: 'Holiday' },
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
    status: 404, 
    description: 'Provider not found' 
  })
  async createBlockedSlot(
    @Body() createBlockedSlotDto: CreateBlockedSlotDto,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.createBlockedSlot(
      providerId,
      createBlockedSlotDto,
    );

    return result;
  }

  /**
   * Get blocked slots for the current provider
   */
  @Get('blocked-slots')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get blocked slots',
    description: 'Get blocked slots for the current provider'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Blocked slots retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Blocked slots retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-here' },
              providerId: { type: 'string', example: 'provider-uuid' },
              blockDate: { type: 'string', example: '2024-08-15T00:00:00.000Z' },
              startTime: { type: 'string', example: '09:00' },
              endTime: { type: 'string', example: '17:00' },
              reason: { type: 'string', example: 'Holiday' },
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
  async getBlockedSlots(@Req() req: Request) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.getBlockedSlots(providerId);

    return result;
  }

  /**
   * Update blocked slot
   */
  @Put('blocked-slots/:blocked_slot_id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update blocked slot',
    description: 'Update a blocked slot for the current provider'
  })
  @ApiParam({
    name: 'blocked_slot_id',
    description: 'ID of the blocked slot to update',
    example: 'uuid-here',
  })
  @ApiBody({ type: UpdateBlockedSlotDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Blocked slot updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Blocked slot updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            providerId: { type: 'string', example: 'provider-uuid' },
            blockDate: { type: 'string', example: '2024-08-15T00:00:00.000Z' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '17:00' },
            reason: { type: 'string', example: 'Holiday' },
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
    status: 404, 
    description: 'Provider or blocked slot not found' 
  })
  async updateBlockedSlot(
    @Param('blocked_slot_id') blockedSlotId: string,
    @Body() updateBlockedSlotDto: UpdateBlockedSlotDto,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.updateBlockedSlot(
      providerId,
      blockedSlotId,
      updateBlockedSlotDto,
    );

    return result;
  }

  /**
   * Delete blocked slot
   */
  @Delete('blocked-slots/:blocked_slot_id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete blocked slot',
    description: 'Delete a blocked slot for the current provider'
  })
  @ApiParam({
    name: 'blocked_slot_id',
    description: 'ID of the blocked slot to delete',
    example: 'uuid-here',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Blocked slot deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Blocked slot deleted successfully' },
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Provider or blocked slot not found' 
  })
  async deleteBlockedSlot(
    @Param('blocked_slot_id') blockedSlotId: string,
    @Req() req: Request,
  ) {
    const providerId = (req.user as any).id;
    
    const result = await this.availabilityService.deleteBlockedSlot(
      providerId,
      blockedSlotId,
    );

    return result;
  }
} 