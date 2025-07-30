import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { SlotSearchDto } from './dto/slot-search.dto';
import { SlotGeneratorUtil, SlotGenerationConfig } from './utils/slot-generator.util';
import { TimezoneUtil } from './utils/timezone.util';
import { DateTime } from 'luxon';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create availability slots for a provider
   */
  async createAvailability(
    providerId: string,
    createAvailabilityDto: CreateAvailabilityDto,
  ) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Validate timezone
    if (!TimezoneUtil.isValidTimezone(createAvailabilityDto.timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    // Validate slot generation parameters
    const config: SlotGenerationConfig = {
      startTime: createAvailabilityDto.start_time,
      endTime: createAvailabilityDto.end_time,
      slotDuration: createAvailabilityDto.slot_duration,
      breakDuration: createAvailabilityDto.break_duration,
      timezone: createAvailabilityDto.timezone,
      date: new Date(createAvailabilityDto.date),
    };

    const validationErrors = SlotGeneratorUtil.validateSlotGeneration(config);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors.join(', '));
    }

    // Check for existing availability conflicts
    await this.checkAvailabilityConflicts(providerId, config);

    // Generate slots
    let slots: any[] = [];

    if (createAvailabilityDto.is_recurring && createAvailabilityDto.recurrence_pattern) {
      const endDate = createAvailabilityDto.recurrence_end_date
        ? new Date(createAvailabilityDto.recurrence_end_date)
        : DateTime.now().plus({ months: 3 }).toJSDate();

      slots = SlotGeneratorUtil.generateRecurringSlots(
        config,
        createAvailabilityDto.recurrence_pattern,
        endDate,
      );
    } else {
      slots = SlotGeneratorUtil.generateSlotsForDay(config);
    }

    // Create availability and slots in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create availability record
      const availability = await tx.providerAvailability.create({
        data: {
          providerId,
          date: new Date(createAvailabilityDto.date),
          startTime: createAvailabilityDto.start_time,
          endTime: createAvailabilityDto.end_time,
          timezone: createAvailabilityDto.timezone,
          isRecurring: createAvailabilityDto.is_recurring,
          recurrencePattern: createAvailabilityDto.recurrence_pattern,
          recurrenceEndDate: createAvailabilityDto.recurrence_end_date
            ? new Date(createAvailabilityDto.recurrence_end_date)
            : null,
          slotDuration: createAvailabilityDto.slot_duration,
          breakDuration: createAvailabilityDto.break_duration,
          appointmentType: createAvailabilityDto.appointment_type,
          location: createAvailabilityDto.location as any,
          pricing: createAvailabilityDto.pricing as any,
          specialRequirements: createAvailabilityDto.special_requirements || [],
          notes: createAvailabilityDto.notes,
          maxAppointmentsPerSlot: createAvailabilityDto.max_appointments_per_slot || 1,
        },
      });

      // Create appointment slots
      const appointmentSlots = await tx.appointmentSlot.createMany({
        data: slots.map((slot) => ({
          availabilityId: availability.id,
          providerId,
          slotStartTime: slot.slotStartTime,
          slotEndTime: slot.slotEndTime,
          appointmentType: createAvailabilityDto.appointment_type,
        })),
      });

      return { availability, slotsCreated: appointmentSlots.count };
    });

    this.logger.log(
      `Created ${result.slotsCreated} slots for provider ${providerId}`,
    );

    return {
      availability_id: result.availability.id,
      slots_created: result.slotsCreated,
      date_range: {
        start: createAvailabilityDto.date,
        end: createAvailabilityDto.is_recurring && createAvailabilityDto.recurrence_end_date
          ? createAvailabilityDto.recurrence_end_date
          : createAvailabilityDto.date,
      },
    };
  }

  /**
   * Get provider availability
   */
  async getProviderAvailability(
    providerId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Validate provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const where: any = { providerId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const availabilities = await this.prisma.providerAvailability.findMany({
      where,
      include: {
        appointmentSlots: {
          where: {
            status: 'available',
          },
          orderBy: {
            slotStartTime: 'asc',
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return availabilities.map((availability) => ({
      id: availability.id,
      date: availability.date,
      start_time: availability.startTime,
      end_time: availability.endTime,
      timezone: availability.timezone,
      status: availability.status,
      appointment_type: availability.appointmentType,
      location: availability.location,
      pricing: availability.pricing,
      available_slots: availability.appointmentSlots.length,
      total_slots: availability.appointmentSlots.length,
    }));
  }

  /**
   * Update availability slot
   */
  async updateAvailabilitySlot(
    slotId: string,
    providerId: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    // Validate slot exists and belongs to provider
    const slot = await this.prisma.appointmentSlot.findFirst({
      where: {
        id: slotId,
        providerId,
      },
      include: {
        availability: true,
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    // Check if slot is already booked
    if (slot.status === 'booked') {
      throw new ConflictException('Cannot update booked slot');
    }

    // Update slot - only allow status changes for appointment slots
    const updateData: any = {
      appointmentType: updateAvailabilityDto.appointment_type || slot.appointmentType,
    };

    // Only allow valid slot status updates
    if (updateAvailabilityDto.status && ['available', 'blocked', 'cancelled'].includes(updateAvailabilityDto.status)) {
      updateData.status = updateAvailabilityDto.status;
    }

    const updatedSlot = await this.prisma.appointmentSlot.update({
      where: { id: slotId },
      data: updateData,
    });

    this.logger.log(`Updated slot ${slotId} for provider ${providerId}`);

    return {
      id: updatedSlot.id,
      status: updatedSlot.status,
      appointment_type: updatedSlot.appointmentType,
      slot_start_time: updatedSlot.slotStartTime,
      slot_end_time: updatedSlot.slotEndTime,
    };
  }

  /**
   * Delete availability slot
   */
  async deleteAvailabilitySlot(
    slotId: string,
    providerId: string,
    deleteRecurring?: boolean,
    reason?: string,
  ) {
    // Validate slot exists and belongs to provider
    const slot = await this.prisma.appointmentSlot.findFirst({
      where: {
        id: slotId,
        providerId,
      },
      include: {
        availability: true,
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    // Check if slot is already booked
    if (slot.status === 'booked') {
      throw new ConflictException('Cannot delete booked slot');
    }

    if (deleteRecurring && slot.availability.isRecurring) {
      // Delete all slots in the recurring series
      await this.prisma.appointmentSlot.deleteMany({
        where: {
          availabilityId: slot.availabilityId,
          status: { not: 'booked' },
        },
      });

      // Update availability status
      await this.prisma.providerAvailability.update({
        where: { id: slot.availabilityId },
        data: { status: 'cancelled' },
      });

      this.logger.log(
        `Deleted recurring availability ${slot.availabilityId} for provider ${providerId}`,
      );
    } else {
      // Delete single slot
      await this.prisma.appointmentSlot.delete({
        where: { id: slotId },
      });

      this.logger.log(`Deleted slot ${slotId} for provider ${providerId}`);
    }

    return {
      message: 'Slot deleted successfully',
      reason: reason || 'Provider request',
    };
  }

  /**
   * Search available slots for patients
   */
  async searchAvailableSlots(searchDto: SlotSearchDto) {
    const where: any = {
      status: 'available',
    };

    // Add date filters
    if (searchDto.date) {
      const date = new Date(searchDto.date);
      where.slotStartTime = {
        gte: date,
        lt: DateTime.fromJSDate(date).plus({ days: 1 }).toJSDate(),
      };
    } else if (searchDto.start_date && searchDto.end_date) {
      where.slotStartTime = {
        gte: new Date(searchDto.start_date),
        lte: new Date(searchDto.end_date),
      };
    }

    // Add provider filter
    if (searchDto.provider_id) {
      where.providerId = searchDto.provider_id;
    }

    // Add appointment type filter
    if (searchDto.appointment_type) {
      where.appointmentType = searchDto.appointment_type;
    }

    // Add duration filter
    if (searchDto.min_duration) {
      where.slotEndTime = {
        gte: DateTime.fromJSDate(new Date()).plus({ minutes: searchDto.min_duration }).toJSDate(),
      };
    }

    const slots = await this.prisma.appointmentSlot.findMany({
      where,
      include: {
        availability: {
          include: {
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                clinicCity: true,
                clinicState: true,
              },
            },
          },
        },
      },
      orderBy: {
        slotStartTime: 'asc',
      },
      take: searchDto.limit || 50,
      skip: searchDto.offset || 0,
    });

    // Apply additional filters
    let filteredSlots = slots;

    // Filter by specialization
    if (searchDto.specialization) {
      filteredSlots = filteredSlots.filter(
        (slot) =>
          slot.availability.provider.specialization
            .toLowerCase()
            .includes(searchDto.specialization!.toLowerCase()),
      );
    }

    // Filter by location
    if (searchDto.location) {
      filteredSlots = filteredSlots.filter(
        (slot) =>
          slot.availability.provider.clinicCity
            .toLowerCase()
            .includes(searchDto.location!.toLowerCase()) ||
          slot.availability.provider.clinicState
            .toLowerCase()
            .includes(searchDto.location!.toLowerCase()),
      );
    }

    // Filter by virtual/in-person
    if (searchDto.virtual_only) {
      filteredSlots = filteredSlots.filter(
        (slot) => {
          const location = slot.availability.location as any;
          return location && location.type === 'virtual';
        },
      );
    }

    if (searchDto.in_person_only) {
      filteredSlots = filteredSlots.filter(
        (slot) => {
          const location = slot.availability.location as any;
          return location && location.type !== 'virtual';
        },
      );
    }

    // Filter by price
    if (searchDto.max_price) {
      filteredSlots = filteredSlots.filter(
        (slot) => {
          const pricing = slot.availability.pricing as any;
          return !pricing || pricing.base_fee <= searchDto.max_price!;
        },
      );
    }

    return filteredSlots.map((slot) => ({
      id: slot.id,
      provider: {
        id: slot.availability.provider.id,
        name: `${slot.availability.provider.firstName} ${slot.availability.provider.lastName}`,
        specialization: slot.availability.provider.specialization,
        location: `${slot.availability.provider.clinicCity}, ${slot.availability.provider.clinicState}`,
      },
      slot_start_time: slot.slotStartTime,
      slot_end_time: slot.slotEndTime,
      appointment_type: slot.appointmentType,
      location: slot.availability.location,
      pricing: slot.availability.pricing,
      timezone: slot.availability.timezone,
    }));
  }

  /**
   * Check for availability conflicts
   */
  private async checkAvailabilityConflicts(
    providerId: string,
    config: SlotGenerationConfig,
  ) {
    const existingSlots = await this.prisma.appointmentSlot.findMany({
      where: {
        providerId,
        slotStartTime: {
          gte: new Date(config.date),
          lt: DateTime.fromJSDate(new Date(config.date)).plus({ days: 1 }).toJSDate(),
        },
      },
    });

    if (existingSlots.length > 0) {
      const newSlots = SlotGeneratorUtil.generateSlotsForDay(config);
      
      // Convert existing slots to GeneratedSlot format for comparison
      const existingGeneratedSlots = existingSlots.map(slot => ({
        startTime: TimezoneUtil.formatTimeForDisplay(slot.slotStartTime, config.timezone),
        endTime: TimezoneUtil.formatTimeForDisplay(slot.slotEndTime, config.timezone),
        slotStartTime: slot.slotStartTime,
        slotEndTime: slot.slotEndTime,
      }));
      
      const overlapping = SlotGeneratorUtil.checkForOverlappingSlots(newSlots, existingGeneratedSlots);

      if (overlapping.length > 0) {
        throw new ConflictException(
          `Found ${overlapping.length} overlapping slots. Please choose a different time or date.`,
        );
      }
    }
  }

  /**
   * Get availability statistics for a provider
   */
  async getAvailabilityStats(providerId: string, startDate?: string, endDate?: string) {
    const where: any = { providerId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [totalSlots, bookedSlots, availableSlots] = await Promise.all([
      this.prisma.appointmentSlot.count({ where }),
      this.prisma.appointmentSlot.count({
        where: { ...where, status: 'booked' },
      }),
      this.prisma.appointmentSlot.count({
        where: { ...where, status: 'available' },
      }),
    ]);

    return {
      total_slots: totalSlots,
      booked_slots: bookedSlots,
      available_slots: availableSlots,
      booking_rate: totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0,
    };
  }
} 