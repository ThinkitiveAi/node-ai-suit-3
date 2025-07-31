import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global API prefix
  app.setGlobalPrefix('api');
  
  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Health First Server API')
    .setDescription('A comprehensive healthcare management system API for providers and patients')
    .setVersion('1.0')
    .addTag('Authentication', 'Provider and patient authentication endpoints')
    .addTag('Provider Registration', 'Provider registration and management')
    .addTag('Patient Registration', 'Patient registration and management')
    .addTag('Provider Availability', 'Provider availability and appointment slot management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Health First API Documentation',
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server started on http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger documentation available at http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
