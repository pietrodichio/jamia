import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { User, AuthUser } from '../../auth/user.decorator';
import { Public } from '../../auth/public.decorator';
import { TeachersService } from './teachers.service';
import { AddTeacherDto } from './dto/add-teacher.dto';

@Controller('events/:eventId/teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async addTeacher(
    @Param('eventId') eventId: string,
    @Body() addTeacherDto: AddTeacherDto,
    @User() user: AuthUser,
  ) {
    return this.teachersService.addTeacher(
      eventId,
      addTeacherDto,
      user.id,
      user.isSuperAdmin,
    );
  }

  @Delete(':teacherId')
  @UseGuards(SupabaseAuthGuard)
  async removeTeacher(
    @Param('eventId') eventId: string,
    @Param('teacherId') teacherId: string,
    @User() user: AuthUser,
  ) {
    await this.teachersService.removeTeacher(
      eventId,
      teacherId,
      user.id,
      user.isSuperAdmin,
    );
    return { message: 'Teacher removed successfully' };
  }

  @Get()
  @Public()
  async listTeachers(@Param('eventId') eventId: string) {
    return this.teachersService.listTeachers(eventId);
  }
}
