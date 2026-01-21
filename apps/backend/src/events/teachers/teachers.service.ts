import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.config';
import { AuditService } from '../../audit/audit.service';
import { AddTeacherDto } from './dto/add-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  // Check if user owns or co-organizes event
  private async isOwnerOrCoOrganizer(
    userId: string,
    eventId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase.rpc('is_event_owner_or_organizer', {
      user_id: userId,
      event_id: eventId,
    });
    return data === true;
  }

  async addTeacher(
    eventId: string,
    addTeacherDto: AddTeacherDto,
    userId: string,
    isSuperAdmin = false,
  ): Promise<any> {
    // 1. Verify event exists
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new NotFoundException('Event not found');
    }

    // 2. Verify authorization (owner or co-organizer only)
    if (
      !isSuperAdmin &&
      !(await this.isOwnerOrCoOrganizer(userId, eventId))
    ) {
      throw new ForbiddenException(
        'You can only add teachers to events you own or co-organize',
      );
    }

    // 3. Verify teacher user exists
    const { data: teacherProfile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', addTeacherDto.user_id)
      .single();

    if (profileError || !teacherProfile) {
      throw new BadRequestException('Teacher user not found');
    }

    // 4. Add teacher (upsert handles duplicate gracefully)
    const { data, error } = await this.supabase
      .from('event_teachers')
      .insert({
        event_id: eventId,
        user_id: addTeacherDto.user_id,
        role: addTeacherDto.role,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique violation
        throw new BadRequestException(
          'User is already a teacher for this event',
        );
      }
      throw new Error(`Failed to add teacher: ${error.message}`);
    }

    // 5. Log action
    await this.auditService.log(
      eventId,
      userId,
      'add_teacher' as any,
      { teacher_id: addTeacherDto.user_id, role: addTeacherDto.role },
    );

    return data;
  }

  async removeTeacher(
    eventId: string,
    teacherId: string,
    userId: string,
    isSuperAdmin = false,
  ): Promise<void> {
    // 1. Verify authorization
    if (
      !isSuperAdmin &&
      !(await this.isOwnerOrCoOrganizer(userId, eventId))
    ) {
      throw new ForbiddenException(
        'You can only remove teachers from events you own or co-organize',
      );
    }

    // 2. Delete teacher
    const { error } = await this.supabase
      .from('event_teachers')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', teacherId);

    if (error) {
      throw new Error(`Failed to remove teacher: ${error.message}`);
    }

    // 3. Log action
    await this.auditService.log(
      eventId,
      userId,
      'remove_teacher' as any,
      { teacher_id: teacherId },
    );
  }

  async listTeachers(eventId: string): Promise<any[]> {
    // Public method - no auth required (RLS handles visibility)
    const { data, error } = await this.supabase
      .from('event_teachers')
      .select(
        `
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq('event_id', eventId);

    if (error) {
      throw new Error(`Failed to list teachers: ${error.message}`);
    }

    return data || [];
  }
}
