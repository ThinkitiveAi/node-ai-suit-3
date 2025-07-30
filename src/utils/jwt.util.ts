import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface TokenPayload {
  provider_id: string;
  email: string;
  role: string;
  specialization: string;
  verification_status: string;
}

export interface PatientTokenPayload {
  sub: string; // patient-id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface PatientTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class JwtUtil {
  constructor(private readonly jwtService: JwtService) {}

  generateAccessToken(payload: TokenPayload, rememberMe: boolean = false): string {
    const expiresIn = rememberMe ? '24h' : '1h';
    
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
      expiresIn,
    });
  }

  generatePatientAccessToken(payload: PatientTokenPayload): string {
    const expiresIn = '30m'; // 30 minutes for patients
    
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
      expiresIn,
    });
  }

  generateRefreshToken(providerId: string, rememberMe: boolean = false): string {
    const expiresIn = rememberMe ? '30d' : '7d';
    
    return this.jwtService.sign(
      { 
        provider_id: providerId,
        type: 'refresh',
        jti: randomBytes(32).toString('hex')
      },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-here',
        expiresIn,
      }
    );
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    });
  }

  verifyPatientAccessToken(token: string): PatientTokenPayload {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    });
  }

  verifyRefreshToken(token: string): any {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-here',
    });
  }

  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }
} 