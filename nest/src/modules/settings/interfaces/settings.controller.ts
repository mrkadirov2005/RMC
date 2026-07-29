import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { SettingsService } from '../application/settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('lesson-scoring')
  getLessonScoring(@Req() req: Request & { user?: any }) {
    const scope = getTenantScope(req);
    return this.settingsService.getLessonScoring(scope.centerId);
  }

  @Put('lesson-scoring')
  saveLessonScoring(@Req() req: Request & { user?: any }, @Body() body: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.settingsService.saveLessonScoring(body, scope.centerId);
  }
}
