import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getTenantScope } from '../../../common/tenant-scope';
import { StudentService } from '../application/student.service';
import { CreateStudentDto, TransferStudentDto, UpdateStudentDto } from './dto/student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  list(@Req() req: Request & { user?: any }) {
    this.studentService.assertListAccess(req.user?.userType);
    const scope = getTenantScope(req);
    return this.studentService.listStudents(scope.centerId, scope.teacherId);
  }

  @Get('deleted')
  deleted(@Req() req: Request & { user?: any }) {
    const scope = getTenantScope(req);
    return this.studentService.listDeletedStudents(scope.centerId);
  }

  @Get('class/:classId')
  byClass(@Req() req: Request & { user?: any }, @Param('classId') classId: string) {
    const scope = getTenantScope(req);
    return this.studentService.listClassStudentsWithTransfers(Number(classId), scope.centerId, scope.teacherId);
  }

  @Get(':id')
  getById(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    return this.studentService.getStudent(Number(id), scope.centerId, scope.teacherId);
  }

  @Post()
  create(@Req() req: Request & { user?: any }, @Body() body: CreateStudentDto) {
    const scope = getTenantScope(req, { requireConcreteCenter: true });
    const payload: any = { ...body, center_id: scope.centerId };
    if (req.user?.userType === 'teacher') delete payload.is_frozen;
    return this.studentService.createStudent(payload);
  }

  @Put(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: UpdateStudentDto) {
    const scope = getTenantScope(req);
    const payload: any = { ...body };
    if (req.user?.userType === 'teacher') {
      delete payload.is_frozen;
      delete payload.teacher_id;
    }
    return this.studentService.updateStudent(Number(id), payload, scope.centerId, scope.teacherId);
  }

  @Post(':id/transfer')
  transfer(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() body: TransferStudentDto) {
    const scope = getTenantScope(req);
    return this.studentService.transferStudent(Number(id), body.target_class_id, scope.centerId, scope.teacherId);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    return this.studentService.deleteStudent(Number(id), scope.centerId, scope.teacherId);
  }

  @Delete(':id/purge')
  purge(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    const scope = getTenantScope(req);
    return this.studentService.purgeStudent(Number(id), scope.centerId, scope.teacherId);
  }
}
