import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create day-wise availability for a provider
   */
  async createDayAvailability(providerId: string, createDayAvailabilityDto: any) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const results: any[] = [];

    // Create or update day-wise availability
    for (const dayAvailability of createDayAvailabilityDto.dayAvailabilities) {
      const result = await this.prisma.providerDayAvailability.upsert({
        where: {
          providerId_dayOfWeek: {
            providerId,
            dayOfWeek: dayAvailability.dayOfWeek,
          },
        },
        update: {
          startTime: dayAvailability.startTime,
          endTime: dayAvailability.endTime,
          timezone: createDayAvailabilityDto.timezone,
          isActive: true,
        },
        create: {
          providerId,
          dayOfWeek: dayAvailability.dayOfWeek,
          startTime: dayAvailability.startTime,
          endTime: dayAvailability.endTime,
          timezone: createDayAvailabilityDto.timezone,
          isActive: true,
        },
      });

      results.push(result);
    }

    // Create blocked slots if provided
    if (createDayAvailabilityDto.blockDays && createDayAvailabilityDto.blockDays.length > 0) {
      for (const blockDay of createDayAvailabilityDto.blockDays) {
        await this.prisma.providerBlockedSlot.create({
          data: {
            providerId,
            blockDate: new Date(blockDay.blockDate),
            startTime: blockDay.startTime,
            endTime: blockDay.endTime,
            reason: blockDay.reason,
          },
        });
      }
    }

    this.logger.log(`Day-wise availability created for provider: ${providerId}`);

    return {
      success: true,
      message: 'Day-wise availability created successfully',
      data: results,
    };
  }

  /**
   * Get day-wise availability for a provider
   */
  async getDayAvailability(providerId: string) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const dayAvailabilities = await this.prisma.providerDayAvailability.findMany({
      where: { providerId },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });

    this.logger.log(`Day-wise availability retrieved for provider: ${providerId}`);

    return {
      success: true,
      message: 'Day-wise availability retrieved successfully',
      data: dayAvailabilities,
    };
  }

  /**
   * Update day-wise availability for a specific day
   */
  async updateDayAvailability(providerId: string, dayOfWeek: string, updateDayAvailabilityDto: any) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Validate day availability exists
    const existingAvailability = await this.prisma.providerDayAvailability.findUnique({
      where: {
        providerId_dayOfWeek: {
          providerId,
          dayOfWeek: dayOfWeek as any,
        },
      },
    });

    if (!existingAvailability) {
      throw new NotFoundException('Day availability not found');
    }

    const updatedAvailability = await this.prisma.providerDayAvailability.update({
      where: {
        providerId_dayOfWeek: {
          providerId,
          dayOfWeek: dayOfWeek as any,
        },
      },
      data: {
        startTime: updateDayAvailabilityDto.startTime,
        endTime: updateDayAvailabilityDto.endTime,
        timezone: updateDayAvailabilityDto.timezone,
        isActive: updateDayAvailabilityDto.isActive,
      },
    });

    this.logger.log(`Day availability updated for provider: ${providerId}, day: ${dayOfWeek}`);

    return {
      success: true,
      message: 'Day availability updated successfully',
      data: updatedAvailability,
    };
  }

  /**
   * Delete day-wise availability for a specific day
   */
  async deleteDayAvailability(providerId: string, dayOfWeek: string) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Validate day availability exists
    const existingAvailability = await this.prisma.providerDayAvailability.findUnique({
      where: {
        providerId_dayOfWeek: {
          providerId,
          dayOfWeek: dayOfWeek as any,
        },
      },
    });

    if (!existingAvailability) {
      throw new NotFoundException('Day availability not found');
    }

    await this.prisma.providerDayAvailability.delete({
      where: {
        providerId_dayOfWeek: {
          providerId,
          dayOfWeek: dayOfWeek as any,
        },
      },
    });

    this.logger.log(`Day availability deleted for provider: ${providerId}, day: ${dayOfWeek}`);

    return {
      success: true,
      message: 'Day availability deleted successfully',
    };
  }

  /**
   * Create blocked slot for a provider
   */
  async createBlockedSlot(providerId: string, createBlockedSlotDto: any) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const blockedSlot = await this.prisma.providerBlockedSlot.create({
      data: {
        providerId,
        blockDate: new Date(createBlockedSlotDto.blockDate),
        startTime: createBlockedSlotDto.startTime,
        endTime: createBlockedSlotDto.endTime,
        reason: createBlockedSlotDto.reason,
      },
    });

    return {
      success: true,
      message: 'Blocked slot created successfully',
      data: blockedSlot,
    };
  }

  /**
   * Get blocked slots for a provider
   */
  async getBlockedSlots(providerId: string) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const blockedSlots = await this.prisma.providerBlockedSlot.findMany({
      where: { providerId },
      orderBy: { blockDate: 'asc' },
    });

    return {
      success: true,
      message: 'Blocked slots retrieved successfully',
      data: blockedSlots,
    };
  }

  /**
   * Update blocked slot
   */
  async updateBlockedSlot(
    providerId: string,
    blockedSlotId: string,
    updateBlockedSlotDto: any,
  ) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Check if blocked slot exists and belongs to provider
    const existing = await this.prisma.providerBlockedSlot.findFirst({
      where: {
        id: blockedSlotId,
        providerId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Blocked slot not found');
    }

    const updated = await this.prisma.providerBlockedSlot.update({
      where: { id: blockedSlotId },
      data: {
        blockDate: updateBlockedSlotDto.blockDate
          ? new Date(updateBlockedSlotDto.blockDate)
          : undefined,
        startTime: updateBlockedSlotDto.startTime,
        endTime: updateBlockedSlotDto.endTime,
        reason: updateBlockedSlotDto.reason,
      },
    });

    return {
      success: true,
      message: 'Blocked slot updated successfully',
      data: updated,
    };
  }

  /**
   * Delete blocked slot
   */
  async deleteBlockedSlot(providerId: string, blockedSlotId: string) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Check if blocked slot exists and belongs to provider
    const existing = await this.prisma.providerBlockedSlot.findFirst({
      where: {
        id: blockedSlotId,
        providerId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Blocked slot not found');
    }

    await this.prisma.providerBlockedSlot.delete({
      where: { id: blockedSlotId },
    });

    return {
      success: true,
      message: 'Blocked slot deleted successfully',
    };
  }
} 