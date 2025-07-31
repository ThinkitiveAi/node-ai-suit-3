import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Server is running successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Health First Server is running!' }
      }
    }
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
