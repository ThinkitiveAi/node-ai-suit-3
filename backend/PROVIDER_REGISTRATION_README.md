# Provider Registration Module

A secure and modular backend module for Provider Registration built with NestJS, PostgreSQL, and Prisma ORM.

## 🚀 Features

- **Secure Registration**: Password hashing with bcrypt (12 salt rounds)
- **Email Verification**: Nodemailer integration with HTML templates
- **Input Validation**: Comprehensive validation using class-validator
- **Rate Limiting**: IP-based rate limiting (5 attempts/hour)
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Unit and integration tests with Jest
- **Security**: JWT-ready authentication structure

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## 🛠️ Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/health_first_db"
   
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@healthfirst.com
   
   # Frontend URL for email verification
   FRONTEND_URL=http://localhost:3000
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the development server:**
   ```bash
   npm run start:dev
   ```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## 📚 API Documentation

### Provider Registration

**Endpoint:** `POST /api/v1/provider/register`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@clinic.com",
  "phone_number": "+1234567890",
  "password": "SecurePassword123!",
  "password_confirm": "SecurePassword123!",
  "specialization": "Cardiology",
  "license_number": "MD123456789",
  "years_of_experience": 10,
  "clinic_address": {
    "street": "123 Medical Center Dr",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Provider registered successfully. Verification email sent.",
  "data": {
    "provider_id": "uuid-here",
    "email": "john.doe@clinic.com",
    "verification_status": "pending"
  }
}
```

**Error Responses:**
- `400` - Bad Request (password mismatch)
- `409` - Conflict (duplicate email/phone/license)
- `422` - Unprocessable Entity (validation errors)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## 🔒 Validation Rules

### Email
- Must be valid RFC format
- Automatically converted to lowercase
- Must be unique

### Phone Number
- Must be in international format (e.g., +1234567890)
- Must be unique

### Password
- Minimum 8 characters
- Must contain at least:
  - 1 uppercase letter
  - 1 lowercase letter
  - 1 digit
  - 1 special character (@$!%*?&)

### License Number
- Alphanumeric only (uppercase letters and numbers)
- Automatically converted to uppercase
- Must be unique

### Zip Code
- Must be valid US format (12345 or 12345-6789)

### Years of Experience
- Integer between 0 and 50

## 🏗️ Project Structure

```
src/
├── auth/                    # Authentication module (JWT-ready)
├── provider/               # Provider registration module
│   ├── provider.controller.ts
│   ├── provider.service.ts
│   ├── provider.module.ts
│   ├── dto/
│   │   ├── create-provider.dto.ts
│   │   └── address.dto.ts
│   └── entities/
│       └── provider.entity.ts
├── common/                 # Shared utilities
│   └── middleware/
│       └── rate-limiter.middleware.ts
├── mail/                   # Email service
│   ├── mail.service.ts
│   └── mail.module.ts
├── prisma/                 # Database layer
│   ├── prisma.service.ts
│   └── prisma.module.ts
└── utils/                  # Utility functions
    └── password.util.ts
```

## 🔧 Configuration

### Rate Limiting
- **Limit**: 5 registration attempts per IP per hour
- **Window**: 1 hour
- **Storage**: In-memory (for production, consider Redis)

### Email Service
- **Provider**: Nodemailer
- **Template**: HTML with responsive design
- **Verification**: Token-based with 24-hour expiration

### Database
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Connection**: Connection pooling enabled

## 🚀 Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set production environment variables**

3. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the production server:**
   ```bash
   npm run start:prod
   ```

## 🔍 Monitoring & Logging

The application includes comprehensive logging:
- Registration attempts (success/failure)
- Email sending status
- Database errors
- Rate limiting events

## 🛡️ Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **Input Sanitization**: Automatic trimming and normalization
- **Rate Limiting**: Prevents brute force attacks
- **Validation**: Comprehensive input validation
- **Error Handling**: No sensitive information in error responses
- **Email Verification**: Required before account activation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository. 