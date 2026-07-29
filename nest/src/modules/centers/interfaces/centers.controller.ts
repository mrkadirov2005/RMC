import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CentersService } from '../application/centers.service';

@Controller('centers')
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Get()
  list(@Req() req: Request & { user?: any }) {
    return this.centersService.listCenters(req.user);
  }

  @Get('summaries')
  summaries(@Req() req: Request & { user?: any }) {
    return this.centersService.getCenterSummaries(req.user);
  }

  @Get(':id')
  get(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    return this.centersService.getCenter(Number(id), req.user);
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: any) {
    return this.centersService.createCenter(body, req.user);
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: any) {
    return this.centersService.updateCenter(Number(id), body, req.user);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    return this.centersService.deleteCenter(Number(id), req.user);
  }
}
