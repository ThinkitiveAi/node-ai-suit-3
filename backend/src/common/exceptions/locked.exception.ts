import { HttpException, HttpStatus } from '@nestjs/common';

export class LockedException extends HttpException {
  constructor(message: string) {
    super(
      {
        success: false,
        message,
        error: 'ACCOUNT_LOCKED',
      },
      HttpStatus.LOCKED,
    );
  }
} 