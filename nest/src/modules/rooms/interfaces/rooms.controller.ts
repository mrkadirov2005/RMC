import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RoomsService } from '../application/rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@Req() req: Request & { user?: any }, @Query('center_id') queryCenterId?: string) {
    const centerId = Number(queryCenterId || req.user?.center_id);
    return this.roomsService.getAllRooms(centerId);
  }

  @Get(':id')
  get(@Req() req: Request & { user?: any }, @Param('id') id: string, @Query('center_id') queryCenterId?: string) {
    const centerId = Number(queryCenterId || req.user?.center_id);
    return this.roomsService.getRoomById(Number(id), centerId);
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: any) {
    const centerId = body.center_id || req.user?.center_id;
    return this.roomsService.createRoom({ ...body, center_id: centerId });
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: any) {
    const centerId = Number(body.center_id || req.user?.center_id);
    return this.roomsService.updateRoom(Number(id), body, centerId);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string, @Query('center_id') queryCenterId?: string) {
    const centerId = Number(queryCenterId || req.user?.center_id);
    return this.roomsService.deleteRoom(Number(id), centerId);
  }
}
