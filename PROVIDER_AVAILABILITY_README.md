# Provider Availability Management Module

A secure, modular, and scalable backend module in NestJS for managing healthcare provider availability and appointment slot generation. This module supports slot creation, updating, deletion, conflict resolution, and patient booking integration with timezone-aware logic.

## 🎯 Features

- **Timezone Support**: Store all times in UTC, convert to local time on UI
- **Slot Generation**: Automatic slot creation with configurable duration and breaks
- **Recurring Availability**: Support for daily, weekly, and monthly recurring patterns
- **Conflict Resolution**: Prevent overlapping slots and booking conflicts
- **Patient Search**: Search available slots with advanced filtering
- **Security**: Input validation, data sanitization, and role-based access
- **Audit Logging**: Track all availability changes and modifications

## 🏗️ Architecture

### Tech Stack
- **Framework**: NestJS (modular structure)
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: class-validator, class-transformer
- **Time Handling**: luxon (timezone-aware logic)
- **Security**: Input validation, data sanitization
- **Testing**: Jest

### Folder Structure
```
src/provider-availability/
├── availability.controller.ts
├── availability.service.ts
├── availability.module.ts
├── dto/
│   ├── create-availability.dto.ts
│   ├── update-availability.dto.ts
│   └── slot-search.dto.ts
├── entities/
│   ├── provider-availability.entity.ts
│   └── appointment-slot.entity.ts
└── utils/
    ├── slot-generator.util.ts
    └── timezone.util.ts
```

## 📊 Database Schema

### ProviderAvailability Model
```prisma
model ProviderAvailability {
  id                     String     @id @default(uuid())
  providerId             String
  provider               Provider   @relation(fields: [providerId], references: [id])
  date                   DateTime
  startTime              String
  endTime                String
  timezone               String
  isRecurring            Boolean    @default(false)
  recurrencePattern      RecurrencePattern?
  recurrenceEndDate      DateTime?
  slotDuration           Int        @default(30)
  breakDuration          Int        @default(0)
  status                 AvailabilityStatus @default(available)
  maxAppointmentsPerSlot Int        @default(1)
  currentAppointments    Int        @default(0)
  appointmentType        AppointmentType @default(consultation)
  location               Json
  pricing                Json?
  specialRequirements    String[]
  notes                  String?
  appointmentSlots       AppointmentSlot[]
  createdAt              DateTime   @default(now())
  updatedAt              DateTime   @updatedAt

  @@index([providerId, date])
  @@index([date, status])
}
```

### AppointmentSlot Model
```prisma
model AppointmentSlot {
  id                  String   @id @default(uuid())
  availabilityId      String
  availability        ProviderAvailability @relation(fields: [availabilityId], references: [id])
  providerId          String
  slotStartTime       DateTime
  slotEndTime         DateTime
  status              SlotStatus @default(available)
  patientId           String?
  appointmentType     String
  bookingReference    String? @unique
  createdAt           DateTime @default(now())

  @@index([providerId, slotStartTime])
  @@index([status, slotStartTime])
}
```

### Enums
```prisma
enum RecurrencePattern {
  daily
  weekly
  monthly
}

enum AvailabilityStatus {
  available
  booked
  cancelled
  blocked
  maintenance
}

enum SlotStatus {
  available
  booked
  cancelled
  blocked
}

enum AppointmentType {
  consultation
  follow_up
  emergency
  telemedicine
}
```

## 🚀 API Endpoints

### 1. Create Availability
**POST** `/api/v1/provider/availability`

**Request Body:**
```json
{
  "date": "2024-08-01",
  "start_time": "09:00",
  "end_time": "17:00",
  "timezone": "Asia/Kolkata",
  "slot_duration": 30,
  "break_duration": 15,
  "is_recurring": true,
  "recurrence_pattern": "weekly",
  "recurrence_end_date": "2024-09-01",
  "appointment_type": "consultation",
  "location": {
    "type": "clinic",
    "address": "Main Street, Pune, IN",
    "room_number": "203"
  },
  "pricing": {
    "base_fee": 500,
    "insurance_accepted": true,
    "currency": "INR"
  },
  "special_requirements": ["bring_report"],
  "notes": "Regular consultation hours"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Availability slots created successfully",
  "data": {
    "availability_id": "uuid-here",
    "slots_created": 16,
    "date_range": {
      "start": "2024-08-01",
      "end": "2024-09-01"
    }
  }
}
```

### 2. Get Provider Availability
**GET** `/api/v1/provider/:provider_id/availability?start_date=2024-08-01&end_date=2024-09-01`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Provider availability retrieved successfully",
  "data": {
    "provider_id": "uuid-here",
    "availabilities": [
      {
        "id": "uuid-here",
        "date": "2024-08-01T00:00:00.000Z",
        "start_time": "09:00",
        "end_time": "17:00",
        "timezone": "Asia/Kolkata",
        "status": "available",
        "appointment_type": "consultation",
        "location": { "type": "clinic", "address": "Main Street" },
        "pricing": { "base_fee": 500, "currency": "INR" },
        "available_slots": 16,
        "total_slots": 16
      }
    ]
  }
}
```

### 3. Update Availability Slot
**PUT** `/api/v1/provider/availability/:slot_id`

**Request Body:**
```json
{
  "status": "blocked",
  "appointment_type": "follow_up",
  "notes": "Emergency leave"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Availability slot updated successfully",
  "data": {
    "id": "uuid-here",
    "status": "blocked",
    "appointment_type": "follow_up",
    "slot_start_time": "2024-08-01T09:00:00.000Z",
    "slot_end_time": "2024-08-01T09:30:00.000Z"
  }
}
```

### 4. Delete Availability Slot
**DELETE** `/api/v1/provider/availability/:slot_id?delete_recurring=true&reason=emergency_leave`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Availability slot deleted successfully",
  "data": {
    "message": "Slot deleted successfully",
    "reason": "emergency_leave"
  }
}
```

### 5. Search Available Slots
**GET** `/api/v1/provider/availability/search?date=2024-08-01&specialization=cardiology&location=Pune`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Available slots retrieved successfully",
  "data": {
    "slots": [
      {
        "id": "uuid-here",
        "provider": {
          "id": "uuid-here",
          "name": "Dr. John Doe",
          "specialization": "Cardiology",
          "location": "Pune, Maharashtra"
        },
        "slot_start_time": "2024-08-01T09:00:00.000Z",
        "slot_end_time": "2024-08-01T09:30:00.000Z",
        "appointment_type": "consultation",
        "location": { "type": "clinic", "address": "Main Street" },
        "pricing": { "base_fee": 500, "currency": "INR" },
        "timezone": "Asia/Kolkata"
      }
    ],
    "total_count": 1,
    "filters_applied": {
      "date": "2024-08-01",
      "specialization": "cardiology",
      "location": "Pune"
    }
  }
}
```

### 6. Get Availability Statistics
**GET** `/api/v1/provider/:provider_id/availability/stats?start_date=2024-08-01&end_date=2024-09-01`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Availability statistics retrieved successfully",
  "data": {
    "provider_id": "uuid-here",
    "statistics": {
      "total_slots": 160,
      "booked_slots": 45,
      "available_slots": 115,
      "booking_rate": 28.125
    }
  }
}
```

## 🔧 Implementation Details

### Timezone Support
- All times stored in UTC
- Automatic conversion to local timezone for display
- DST transition handling
- Timezone validation

### Slot Generation Logic
- Divide availability window into configurable slot durations
- Support for break durations between slots
- Prevent overlapping slots
- Handle recurring patterns (daily, weekly, monthly)

### Validation Rules
- End time must be after start time
- No overlapping slots for same provider
- Conflict checks with already booked appointments
- Valid timezone and time format validation

### Security Features
- Input validation and sanitization
- UUID-based IDs to prevent guessing
- Role-based access control
- Prevent deletion of booked slots
- Audit logging for all changes

## 🧪 Testing

### Unit Tests
- Slot generator utility tests
- Timezone conversion tests
- Validation logic tests
- Conflict detection tests

### Integration Tests
- Slot creation API tests
- Recurring slot creation tests
- Conflict validation tests
- Timezone conversion accuracy tests

## ⚡ Performance Tips

### Database Indexes
```sql
CREATE INDEX idx_provider_availability_provider_date ON ProviderAvailability(providerId, date);
CREATE INDEX idx_provider_availability_date_status ON ProviderAvailability(date, status);
CREATE INDEX idx_appointment_slot_provider_time ON AppointmentSlot(providerId, slotStartTime);
CREATE INDEX idx_appointment_slot_status_time ON AppointmentSlot(status, slotStartTime);
```

### Caching Strategy
- Cache available slots per provider/day
- Use Redis for high-frequency slot queries
- Implement cache invalidation on slot updates

### Transaction Management
- Use database transactions for slot creation
- Batch insert slots for better performance
- Handle rollback on conflicts

## 🔐 Security Considerations

### Input Validation
- Validate all time formats (HH:mm)
- Check timezone validity
- Sanitize location and pricing data
- Prevent SQL injection through Prisma ORM

### Access Control
- JWT-based authentication required
- Provider can only manage their own availability
- Role-based permissions for different operations

### Data Protection
- Encrypt sensitive pricing data
- Audit log all availability changes
- Prevent information leakage in error messages

## 📝 Usage Examples

### Creating Single Day Availability
```typescript
const availability = {
  date: "2024-08-01",
  start_time: "09:00",
  end_time: "17:00",
  timezone: "Asia/Kolkata",
  slot_duration: 30,
  break_duration: 15,
  is_recurring: false,
  appointment_type: "consultation",
  location: {
    type: "clinic",
    address: "123 Medical Center",
    room_number: "101"
  }
};
```

### Creating Recurring Availability
```typescript
const recurringAvailability = {
  date: "2024-08-01",
  start_time: "09:00",
  end_time: "17:00",
  timezone: "Asia/Kolkata",
  slot_duration: 30,
  break_duration: 15,
  is_recurring: true,
  recurrence_pattern: "weekly",
  recurrence_end_date: "2024-09-01",
  appointment_type: "consultation",
  location: {
    type: "clinic",
    address: "123 Medical Center"
  }
};
```

### Searching Available Slots
```typescript
const searchCriteria = {
  date: "2024-08-01",
  specialization: "cardiology",
  location: "Pune",
  appointment_type: "consultation",
  min_duration: 30,
  max_price: 1000
};
```

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install luxon @types/luxon
   ```

2. **Run Database Migration**
   ```bash
   npx prisma migrate dev --name add-availability-models
   ```

3. **Start the Application**
   ```bash
   npm run start:dev
   ```

4. **Test the API**
   ```bash
   # Create availability
   curl -X POST http://localhost:3000/api/v1/provider/availability \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "date": "2024-08-01",
       "start_time": "09:00",
       "end_time": "17:00",
       "timezone": "Asia/Kolkata",
       "slot_duration": 30,
       "appointment_type": "consultation",
       "location": {
         "type": "clinic",
         "address": "123 Medical Center"
       }
     }'
   ```

## 📚 Additional Resources

- [Luxon Documentation](https://moment.github.io/luxon/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Class Validator Documentation](https://github.com/typestack/class-validator)

## 🤝 Contributing

1. Follow the existing code structure
2. Add comprehensive validation
3. Include proper error handling
4. Write unit and integration tests
5. Update documentation

## 📄 License

This module is part of the Health First Server project and follows the same licensing terms. 