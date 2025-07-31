-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'booked', 'cancelled', 'blocked', 'maintenance');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('available', 'booked', 'cancelled', 'blocked');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('consultation', 'follow_up', 'emergency', 'telemedicine');

-- CreateTable
CREATE TABLE "ProviderAvailability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" "RecurrencePattern",
    "recurrenceEndDate" TIMESTAMP(3),
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'available',
    "maxAppointmentsPerSlot" INTEGER NOT NULL DEFAULT 1,
    "currentAppointments" INTEGER NOT NULL DEFAULT 0,
    "appointmentType" "AppointmentType" NOT NULL DEFAULT 'consultation',
    "location" JSONB NOT NULL,
    "pricing" JSONB,
    "specialRequirements" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL,
    "availabilityId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "slotStartTime" TIMESTAMP(3) NOT NULL,
    "slotEndTime" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'available',
    "patientId" TEXT,
    "appointmentType" TEXT NOT NULL,
    "bookingReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderAvailability_providerId_date_idx" ON "ProviderAvailability"("providerId", "date");

-- CreateIndex
CREATE INDEX "ProviderAvailability_date_status_idx" ON "ProviderAvailability"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentSlot_bookingReference_key" ON "AppointmentSlot"("bookingReference");

-- CreateIndex
CREATE INDEX "AppointmentSlot_providerId_slotStartTime_idx" ON "AppointmentSlot"("providerId", "slotStartTime");

-- CreateIndex
CREATE INDEX "AppointmentSlot_status_slotStartTime_idx" ON "AppointmentSlot"("status", "slotStartTime");

-- AddForeignKey
ALTER TABLE "ProviderAvailability" ADD CONSTRAINT "ProviderAvailability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "ProviderAvailability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
