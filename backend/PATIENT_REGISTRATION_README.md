# Patient Registration Module

A secure and modular backend module in NestJS for Patient Registration with HIPAA-compliant data privacy, email/SMS verification, and comprehensive security features.

## 🏗️ Architecture

### Tech Stack
- **Framework**: NestJS (modular architecture)
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: class-validator & class-transformer
- **Security**: bcrypt (≥12 salt rounds), AES-256-GCM encryption
- **Email**: Nodemailer for verification emails
- **SMS**: Simulated Twilio integration (pluggable)
- **Testing**: Jest for unit & integration testing
- **Rate Limiting**: Custom IP-based rate limiter

### Folder Structure
```
src/
├── patient/
│   ├── patient.controller.ts
│   ├── patient.service.ts
│   ├── patient.module.ts
│   ├── dto/
│   │   ├── create-patient.dto.ts
│   │   ├── address.dto.ts
│   │   ├── emergency-contact.dto.ts
│   │   └── insurance-info.dto.ts
│   └── entities/
│       └── patient.entity.ts
├── verification/
│   ├── email-verification.service.ts
│   └── phone-verification.service.ts
├── utils/
│   ├── encryption.util.ts
│   ├── date.util.ts
│   └── password.util.ts
└── common/
    └── middleware/
        └── patient-rate-limiter.middleware.ts
```

## 🔐 Security Features

### Data Protection
- **Password Hashing**: bcrypt with ≥12 salt rounds
- **Field Encryption**: AES-256-GCM for sensitive data (insurance policy numbers)
- **Input Sanitization**: Automatic trimming and normalization
- **No Password Logging**: Passwords never logged or returned

### Rate Limiting
- **Registration**: 3 attempts per IP per hour
- **SMS OTP**: 3 attempts per phone number with 15-minute lockout
- **Email Verification**: 24-hour token expiry

### Age Validation
- **COPPA Compliance**: Minimum age of 13 years
- **Maximum Age**: 120 years (reasonable limit)
- **Timezone Aware**: Proper date handling

### Verification System
- **Email Verification**: UUID + timestamp tokens, 24h expiry
- **Phone Verification**: 6-digit OTP, 5-minute validity
- **Token Security**: Hashed tokens stored in database
- **Audit Logging**: Registration attempts logged with IP

## 📋 API Endpoints

### Patient Registration
```http
POST /api/v1/patient/register
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone_number": "+1234567890",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "phone": "+1234567891",
    "relationship": "Spouse"
  },
  "insurance_info": {
    "provider": "Blue Cross",
    "policy_number": "POL123456"
  },
  "marketing_opt_in": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Patient registered successfully. Verification emails and SMS sent.",
  "data": {
    "patient_id": "uuid-here",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "email_verification_sent": true,
    "phone_verification_sent": true
  }
}
```

### Email Verification
```http
POST /api/v1/patient/verify-email
Content-Type: application/json

{
  "token": "verification-token",
  "patient_id": "patient-uuid"
}
```

### Phone Verification
```http
POST /api/v1/patient/verify-phone
Content-Type: application/json

{
  "otp": "123456",
  "patient_id": "patient-uuid",
  "phone_number": "+1234567890"
}
```

### Resend Verification
```http
POST /api/v1/patient/resend-email-verification
POST /api/v1/patient/resend-phone-verification
Content-Type: application/json

{
  "patient_id": "patient-uuid"
}
```

### Get Patient Details
```http
GET /api/v1/patient/:id
```

## 🗄️ Database Schema

### Patient Model
```prisma
model Patient {
  id                 String   @id @default(uuid())
  firstName          String   @db.VarChar(50)
  lastName           String   @db.VarChar(50)
  email              String   @unique
  phoneNumber        String   @unique
  passwordHash       String
  dateOfBirth        DateTime
  gender             Gender
  clinicStreet       String
  clinicCity         String
  clinicState        String
  clinicZip          String
  emergencyName      String?
  emergencyPhone     String?
  emergencyRelation  String?
  medicalHistory     String[]
  insuranceProvider  String?
  insurancePolicy    String?  // encrypted
  emailVerified      Boolean  @default(false)
  phoneVerified      Boolean  @default(false)
  isActive           Boolean  @default(true)
  marketingOptIn     Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  verificationTokens VerificationToken[]
}
```

### Verification Token Model
```prisma
model VerificationToken {
  id          String   @id @default(uuid())
  token       String   // hashed
  type        TokenType
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  patientId   String
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```

### Enums
```prisma
enum Gender {
  male
  female
  other
  prefer_not_to_say
}

enum TokenType {
  email
  phone
}
```

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/health_first_db"

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@healthfirst.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# HIPAA Encryption Key (32+ characters)
ENCRYPTION_KEY=your-super-secret-32-character-encryption-key-here
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run patient-specific tests
npm test -- --testPathPattern=patient
npm test -- --testPathPattern=utils/date
npm test -- --testPathPattern=utils/encryption
```

### Test Coverage
- **DTO Validation**: All validation rules and transformations
- **Service Logic**: Registration, verification, data retrieval
- **Utility Functions**: Date calculations, encryption/decryption
- **Error Handling**: Invalid inputs, duplicate checks, age validation

## 🚀 Usage Examples

### Registration Flow
1. **Submit Registration**: Send patient data to `/api/v1/patient/register`
2. **Email Verification**: Patient receives verification email with token
3. **Phone Verification**: Patient receives SMS with 6-digit OTP
4. **Complete Verification**: Both email and phone must be verified

### Data Retrieval
```typescript
// Get patient with decrypted sensitive data
const patient = await patientService.getPatientById(patientId);
// insurancePolicy will be automatically decrypted
```

### Error Handling
```typescript
try {
  await patientService.registerPatient(dto, clientIp);
} catch (error) {
  if (error instanceof ConflictException) {
    // Handle duplicate email/phone
  } else if (error instanceof BadRequestException) {
    // Handle validation errors
  }
}
```

## 🔒 Security Best Practices

### Data Privacy
- **Encryption**: Sensitive fields encrypted at rest
- **Audit Logging**: All registration attempts logged
- **Input Validation**: Comprehensive DTO validation
- **Rate Limiting**: Prevents abuse and brute force attacks

### HIPAA Compliance
- **Minimum Data**: Only collect required information
- **Secure Storage**: Encrypted sensitive data
- **Access Control**: Proper authentication required
- **Audit Trail**: Registration attempts logged

### Password Security
- **Strong Requirements**: 8+ chars, uppercase, lowercase, number, special char
- **Secure Hashing**: bcrypt with ≥12 salt rounds
- **No Plain Text**: Passwords never stored or logged in plain text

## 📊 Performance

### Database Indexes
```sql
-- Recommended indexes for performance
CREATE INDEX idx_patient_email ON Patient(email);
CREATE INDEX idx_patient_phone ON Patient(phoneNumber);
CREATE INDEX idx_patient_active ON Patient(isActive);
CREATE INDEX idx_patient_created ON Patient(createdAt);
CREATE INDEX idx_verification_token_expires ON VerificationToken(expiresAt);
```

### Rate Limiting
- **Registration**: 3 attempts per IP per hour
- **SMS OTP**: 3 attempts per phone with 15-minute lockout
- **Email Verification**: 24-hour token expiry

## 🔄 Integration

### With Provider Module
- Shared database schema
- Consistent validation patterns
- Common utility functions

### With Auth Module
- JWT-based authentication
- Session management
- Refresh token support

### Email Service
- Reusable email templates
- SMTP configuration
- Verification email sending

## 🐛 Troubleshooting

### Common Issues
1. **Encryption Key Missing**: Ensure `ENCRYPTION_KEY` is set in environment
2. **Email Not Sending**: Check SMTP configuration
3. **SMS Not Working**: Replace simulation with actual Twilio integration
4. **Rate Limiting**: Check IP-based limits and wait periods

### Debug Mode
```typescript
// Enable detailed logging
const logger = new Logger('PatientService');
logger.debug('Registration attempt', { email, clientIp });
```

## 📈 Monitoring

### Key Metrics
- Registration success/failure rates
- Email/SMS delivery rates
- Verification completion rates
- Rate limiting triggers

### Health Checks
```http
GET /health
GET /api/v1/patient/health
```

## 🔄 Future Enhancements

### Planned Features
- **Two-Factor Authentication**: Additional security layer
- **Document Upload**: Medical records and insurance cards
- **Appointment Scheduling**: Integration with calendar system
- **Insurance Verification**: Real-time insurance validation
- **Multi-language Support**: Internationalization
- **Mobile App**: React Native integration

### Scalability
- **Database Sharding**: For large patient volumes
- **Caching**: Redis for frequently accessed data
- **Microservices**: Split into separate services
- **CDN**: For static assets and documents

---

**Note**: This module is designed for healthcare applications and includes HIPAA-compliant security measures. Always consult with legal and security experts when implementing in production healthcare environments. 