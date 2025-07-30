# Provider Authentication Module

A secure JWT-based authentication system for healthcare providers with refresh tokens, session management, and brute-force protection.

## 🚀 Features

- **JWT Authentication**: Access and refresh tokens with configurable expiry
- **Multi-Device Support**: Concurrent sessions with individual logout capability
- **Brute Force Protection**: Rate limiting and account lockout mechanisms
- **Flexible Login**: Support for email or phone number as identifier
- **Session Management**: Token rotation and revocation
- **Security**: Password hashing, input validation, and secure token storage

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Provider Registration module (for user accounts)

## 🛠️ Installation

1. **Install dependencies** (if not already installed):
   ```bash
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt
   ```

2. **Set up environment variables**:
   Add to your `.env` file:
   ```env
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
   JWT_EXPIRES_IN=24h
   ```

3. **Run database migrations**:
   ```bash
   npx prisma migrate dev --name add-auth-fields
   ```

4. **Start the server**:
   ```bash
   npm run start:dev
   ```

## 📚 API Documentation

### Provider Login

**Endpoint:** `POST /api/v1/provider/login`

**Request Body:**
```json
{
  "identifier": "john.doe@clinic.com", // or phone number
  "password": "SecurePassword123!",
  "remember_me": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "jwt-access-token-here",
    "refresh_token": "jwt-refresh-token-here",
    "expires_in": 3600,
    "token_type": "Bearer",
    "provider": {
      "id": "uuid-here",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@clinic.com",
      "specialization": "Cardiology",
      "verification_status": "verified",
      "is_active": true
    }
  }
}
```

### Refresh Token

**Endpoint:** `POST /api/v1/provider/refresh`

**Request Body:**
```json
{
  "refresh_token": "jwt-refresh-token-here"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new-jwt-access-token-here",
    "refresh_token": "new-jwt-refresh-token-here",
    "expires_in": 3600,
    "token_type": "Bearer"
  }
}
```

### Logout

**Endpoint:** `POST /api/v1/provider/logout`

**Request Body:**
```json
{
  "refresh_token": "jwt-refresh-token-here"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Logout All Sessions

**Endpoint:** `POST /api/v1/provider/logout-all`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "All sessions logged out successfully"
}
```

## 🔒 Security Features

### Rate Limiting
- **Login Attempts**: 5 attempts per IP per 15 minutes
- **Account Lockout**: 30 minutes after 5 consecutive failed attempts
- **Automatic Reset**: Failed attempts reset on successful login

### Token Management
- **Access Token**: 1 hour (standard) or 24 hours (remember_me)
- **Refresh Token**: 7 days (standard) or 30 days (remember_me)
- **Token Rotation**: Refresh tokens are rotated on each use
- **Secure Storage**: Refresh tokens stored as SHA-256 hashes

### Validation Rules
- **Identifier**: Valid email or international phone number
- **Password**: Must match registered password
- **Account Status**: Must be active and verified
- **Account Lock**: Must not be locked due to failed attempts

## 🏗️ Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   ├── refresh-token.service.ts
│   └── dto/
│       ├── login.dto.ts
│       └── refresh-token.dto.ts
├── common/                  # Shared utilities
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── middleware/
│   │   └── login-rate-limiter.middleware.ts
│   └── exceptions/
│       └── locked.exception.ts
└── utils/                   # Utility functions
    ├── jwt.util.ts
    └── password.util.ts
```

## 🔧 Configuration

### JWT Settings
- **Algorithm**: HS256
- **Access Token Secret**: `JWT_SECRET`
- **Refresh Token Secret**: `JWT_REFRESH_SECRET`
- **Access Token Expiry**: 1h (standard) / 24h (remember_me)
- **Refresh Token Expiry**: 7d (standard) / 30d (remember_me)

### Rate Limiting
- **Window**: 15 minutes
- **Max Attempts**: 5 per IP
- **Lockout Duration**: 30 minutes
- **Storage**: In-memory (consider Redis for production)

### Database Schema
```sql
-- Provider table extensions
ALTER TABLE "Provider" ADD COLUMN "failedLoginAttempts" INTEGER DEFAULT 0;
ALTER TABLE "Provider" ADD COLUMN "lockedUntil" TIMESTAMP;
ALTER TABLE "Provider" ADD COLUMN "lastLogin" TIMESTAMP;
ALTER TABLE "Provider" ADD COLUMN "loginCount" INTEGER DEFAULT 0;

-- RefreshToken table
CREATE TABLE "RefreshToken" (
  "id" TEXT PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "isRevoked" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP,
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE
);
```

## 🚫 Error Handling

| Status Code | Description | Example |
|-------------|-------------|---------|
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Invalid credentials or token |
| 403 | Forbidden | Unverified or inactive account |
| 423 | Locked | Account locked due to failed attempts |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## 🧪 Testing

### Unit Tests
```bash
npm run test src/auth/
```

### Integration Tests
```bash
npm run test:e2e test/auth.e2e-spec.ts
```

### Test Coverage
```bash
npm run test:cov
```

## 🔍 Usage Examples

### Login with Email
```bash
curl -X POST http://localhost:3000/api/v1/provider/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john.doe@clinic.com",
    "password": "SecurePassword123!",
    "remember_me": false
  }'
```

### Login with Phone Number
```bash
curl -X POST http://localhost:3000/api/v1/provider/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+1234567890",
    "password": "SecurePassword123!",
    "remember_me": true
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/v1/provider/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your-refresh-token-here"
  }'
```

### Protected Route Access
```bash
curl -X GET http://localhost:3000/api/v1/provider/profile \
  -H "Authorization: Bearer your-access-token-here"
```

### Logout
```bash
curl -X POST http://localhost:3000/api/v1/provider/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your-refresh-token-here"
  }'
```

### Logout All Sessions
```bash
curl -X POST http://localhost:3000/api/v1/provider/logout-all \
  -H "Authorization: Bearer your-access-token-here"
```

## 🔐 Security Best Practices

1. **Environment Variables**: Use strong, unique secrets for JWT tokens
2. **HTTPS**: Always use HTTPS in production
3. **Token Storage**: Store refresh tokens securely (hashed in database)
4. **Token Rotation**: Implement automatic refresh token rotation
5. **Rate Limiting**: Prevent brute force attacks
6. **Account Lockout**: Temporarily lock accounts after failed attempts
7. **Input Validation**: Validate all inputs thoroughly
8. **Error Messages**: Don't reveal sensitive information in error responses

## 🚀 Deployment

1. **Set production environment variables**
2. **Run database migrations**
3. **Build the application**
4. **Start the production server**

```bash
# Set environment variables
export JWT_SECRET="your-production-secret"
export JWT_REFRESH_SECRET="your-production-refresh-secret"

# Run migrations
npx prisma migrate deploy

# Build and start
npm run build
npm run start:prod
```

## 🔄 Integration with Provider Registration

The authentication module integrates seamlessly with the Provider Registration module:

1. **Account Verification**: Only verified providers can log in
2. **Password Verification**: Uses the same bcrypt hashing
3. **Account Status**: Checks `isActive` and `verificationStatus`
4. **Database Integration**: Uses the same Prisma service

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