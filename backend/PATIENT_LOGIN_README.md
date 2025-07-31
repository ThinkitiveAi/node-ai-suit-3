# Patient Login Module

A secure and modular NestJS backend module for Patient Login using JWT-based authentication. This module supports login with email or phone number and password, issues access tokens, and attaches authenticated patient data to requests.

## 🚀 Features

- **JWT-based Authentication**: Secure token-based authentication with 30-minute expiry
- **Flexible Login**: Support for email or phone number as identifier
- **Email Verification Required**: Only verified email accounts can login
- **Account Status Validation**: Checks for active accounts and verified emails
- **Rate Limiting**: Built-in protection against brute force attacks
- **Input Validation**: Comprehensive validation with sanitization
- **Error Handling**: Clear error messages with appropriate HTTP status codes

## 📋 API Endpoints

### POST /api/v1/provider/patient/login

Authenticates a patient and returns an access token.

#### Request Body
```json
{
  "identifier": "jane.smith@email.com", // or phone number
  "password": "SecurePassword123!"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "jwt-access-token-here",
    "expires_in": 1800,
    "token_type": "Bearer",
    "patient": {
      "id": "uuid-here",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane.smith@email.com",
      "phone_number": "+1234567890",
      "email_verified": true,
      "phone_verified": false
    }
  }
}
```

#### Error Responses

**401 Unauthorized - Invalid Credentials**
```json
{
  "success": false,
  "message": "Invalid email/phone or password"
}
```

**403 Forbidden - Account Issues**
```json
{
  "success": false,
  "message": "Account is inactive"
}
```
or
```json
{
  "success": false,
  "message": "Email not verified"
}
```

**422 Unprocessable Entity - Validation Errors**
```json
{
  "statusCode": 422,
  "message": [
    "identifier should not be empty",
    "password should not be empty"
  ],
  "error": "Unprocessable Entity"
}
```

## 🔐 JWT Token Configuration

### Access Token
- **Algorithm**: HS256
- **Expiry**: 30 minutes
- **Payload**:
  ```json
  {
    "sub": "patient-id",
    "email": "jane@example.com",
    "role": "patient",
    "iat": 1234567890,
    "exp": 1234569990
  }
  ```

### Authentication Guard
The `PatientJwtAuthGuard` extracts JWT from `Authorization: Bearer <token>` header and validates:
- Token signature
- Token expiry
- Patient existence and status
- Email verification status

## 🛡️ Security Features

### Password Security
- **Hashing**: bcrypt with 12+ salt rounds
- **Verification**: Secure password comparison
- **No Logging**: Passwords are never logged or returned

### Input Validation
- **Email/Phone Validation**: Supports both email and phone number formats
- **Input Sanitization**: Automatic trimming and case normalization
- **Required Fields**: Comprehensive validation for all inputs

### Rate Limiting
- **IP-based Protection**: Rate limiting per IP address
- **Account Lockout**: Protection against brute force attacks
- **Failed Attempt Tracking**: Monitors and logs failed login attempts

### Account Security
- **Email Verification Required**: Only verified emails can login
- **Account Status Check**: Validates account is active
- **Session Management**: Secure token handling

## 🏗️ Project Structure

```
src/
├── auth/
│   ├── auth.controller.ts          # Patient login endpoints
│   ├── auth.service.ts             # Authentication logic
│   ├── patient-jwt.strategy.ts     # Patient JWT strategy
│   └── dto/
│       └── patient-login.dto.ts    # Login request validation
├── common/
│   └── guards/
│       └── patient-jwt-auth.guard.ts  # Patient authentication guard
└── utils/
    └── jwt.util.ts                 # JWT utilities
```

## 🔧 Implementation Details

### PatientLoginDto
```typescript
export class PatientLoginDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  identifier: string; // email or phone number

  @IsString()
  @IsNotEmpty()
  password: string;

  // Custom validation for identifier
  @ValidateIf((o) => o.identifier && o.identifier.includes('@'))
  @IsEmail({}, { message: 'Invalid email format' })
  get emailValidation() {
    return this.identifier?.includes('@') ? this.identifier : undefined;
  }

  @ValidateIf((o) => o.identifier && !o.identifier.includes('@'))
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Invalid phone number format',
  })
  get phoneValidation() {
    return this.identifier && !this.identifier.includes('@') ? this.identifier : undefined;
  }
}
```

### PatientJwtStrategy
```typescript
@Injectable()
export class PatientJwtStrategy extends PassportStrategy(Strategy, 'patient-jwt') {
  async validate(payload: PatientTokenPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: payload.sub },
    });

    if (!patient || !patient.isActive) {
      throw new UnauthorizedException('Patient not found or inactive');
    }

    if (!patient.emailVerified) {
      throw new UnauthorizedException('Email not verified. Please verify your email first.');
    }

    return {
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phoneNumber: patient.phoneNumber,
      emailVerified: patient.emailVerified,
      phoneVerified: patient.phoneVerified,
      role: 'patient',
    };
  }
}
```

## 🧪 Testing

### Unit Tests
- **PatientLoginDto**: Validation and transformation tests
- **PatientJwtStrategy**: Authentication and validation tests
- **AuthService**: Patient login functionality tests

### E2E Tests
- **Successful Login**: Email and phone number login
- **Error Scenarios**: Invalid credentials, unverified email, inactive account
- **Validation**: Request format validation
- **Rate Limiting**: Protection against brute force

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Specific test files
npm test src/auth/dto/patient-login.dto.spec.ts
npm test src/auth/patient-jwt.strategy.spec.ts
npm test src/auth/auth.service.spec.ts
```

## 🔄 Usage Examples

### Login with Email
```bash
curl -X POST http://localhost:3000/api/v1/provider/patient/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "jane.smith@email.com",
    "password": "SecurePassword123!"
  }'
```

### Login with Phone Number
```bash
curl -X POST http://localhost:3000/api/v1/provider/patient/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+1234567890",
    "password": "SecurePassword123!"
  }'
```

### Using Access Token
```bash
curl -X GET http://localhost:3000/api/v1/patient/profile \
  -H "Authorization: Bearer <access_token>"
```

## 🔒 Security Best Practices

1. **Token Security**
   - Tokens expire after 30 minutes
   - Use HTTPS in production
   - Store tokens securely on client side

2. **Password Security**
   - Strong password requirements
   - bcrypt hashing with 12+ salt rounds
   - Never log or return passwords

3. **Input Validation**
   - Comprehensive validation for all inputs
   - Sanitization and normalization
   - Clear error messages

4. **Rate Limiting**
   - IP-based rate limiting
   - Account lockout protection
   - Failed attempt monitoring

5. **Account Security**
   - Email verification required
   - Account status validation
   - Secure session management

## 🚨 Error Handling

The module provides clear error responses with appropriate HTTP status codes:

- **400 Bad Request**: Invalid request format
- **401 Unauthorized**: Invalid credentials
- **403 Forbidden**: Account issues (inactive, unverified)
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limiting
- **500 Internal Server Error**: Server errors

## 📝 Environment Variables

Required environment variables:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Email (for verification)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```

## 🔄 Future Enhancements

1. **Refresh Tokens**: Implement refresh token mechanism for longer sessions
2. **Two-Factor Authentication**: Add 2FA support via SMS or authenticator apps
3. **Magic Links**: Email-based passwordless login
4. **Social Login**: Integration with OAuth providers
5. **Session Management**: Advanced session tracking and management
6. **Audit Logging**: Comprehensive login attempt logging
7. **Device Tracking**: Track and manage multiple device logins

## 📚 Dependencies

- **@nestjs/jwt**: JWT token generation and validation
- **@nestjs/passport**: Passport.js integration
- **passport-jwt**: JWT strategy for Passport
- **bcryptjs**: Password hashing and verification
- **class-validator**: Input validation
- **class-transformer**: Data transformation

## 🎯 Key Benefits

1. **Security First**: Comprehensive security measures and best practices
2. **Flexible Authentication**: Support for both email and phone number login
3. **Clear Error Handling**: Detailed error messages for better debugging
4. **Comprehensive Testing**: Unit and E2E tests for all functionality
5. **Modular Design**: Clean separation of concerns and reusable components
6. **Production Ready**: Includes rate limiting, validation, and error handling
7. **HIPAA Compliant**: Secure handling of patient data and authentication

This module provides a robust, secure, and scalable solution for patient authentication in healthcare applications. 