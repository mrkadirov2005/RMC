import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { SubjectsService } from '../application/subjects.service';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  list(@Req() req: Request & { user?: any }) {
    if (req.user?.userType === 'student') throw new ForbiddenException('Access denied.');
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.subjectsService.listSubjects(scope.centerId, scope.teacherId);
  }

  @Get('class/:classId')
  byClass(@Req() req: Request & { user?: any }, @Param('classId') classId: string) {
    const scope = getTenantScope(req);
    if (req.user?.userType === 'student' && Number(req.user?.class_id) !== Number(classId)) {
      throw new ForbiddenException('Access denied.');
    }
    return this.subjectsService.listByClass(Number(classId), scope.centerId, scope.teacherId);
  }

  @Get(':id')
  get(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.subjectsService.getSubject(Number(id), scope.centerId, scope.teacherId);
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.subjectsService.createSubject(body, scope.centerId);
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: any) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.subjectsService.updateSubject(Number(id), body, scope.centerId, scope.teacherId);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    return this.subjectsService.deleteSubject(Number(id), scope.centerId, scope.teacherId);
  }
}
