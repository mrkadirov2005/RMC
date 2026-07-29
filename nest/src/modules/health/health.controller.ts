import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { ok: true, service: 'rmc-nest', timestamp: new Date().toISOString() };
  }
}
