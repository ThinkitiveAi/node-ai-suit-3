import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProviderModule } from './provider/provider.module';
import { AuthModule } from './auth/auth.module';
import { PatientModule } from './patient/patient.module';
import { AvailabilityModule } from './provider-availability/availability.module';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware';
import { LoginRateLimiterMiddleware } from './common/middleware/login-rate-limiter.middleware';
import { PatientRateLimiterMiddleware } from './common/middleware/patient-rate-limiter.middleware';

@Module({
  imports: [PrismaModule, ProviderModule, AuthModule, PatientModule, AvailabilityModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 422,
      }),
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimiterMiddleware)
      .forRoutes({ path: 'api/v1/provider/register', method: RequestMethod.POST });
    
    consumer
      .apply(LoginRateLimiterMiddleware)
      .forRoutes({ path: 'api/v1/provider/login', method: RequestMethod.POST });
    
    consumer
      .apply(PatientRateLimiterMiddleware)
      .forRoutes({ path: 'api/v1/patient/register', method: RequestMethod.POST });
  }
}
