import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { EventOrganizersService } from './event-organizers.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

export class AddCoOrganizerDto {
  @IsString()
  userId: string;
}

@Controller('events/:eventId/organizers')
@UseGuards(SupabaseAuthGuard)
export class EventOrganizersController {
  constructor(
    private readonly eventOrganizersService: EventOrganizersService,
  ) {}

  @Get()
  async getCoOrganizers(
    @Param('eventId') eventId: string,
    @User() user: AuthUser,
  ) {
    return this.eventOrganizersService.getCoOrganizers(
      eventId,
      user.id,
      user.isSuperAdmin,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addCoOrganizer(
    @Param('eventId') eventId: string,
    @Body() body: AddCoOrganizerDto,
    @User() user: AuthUser,
  ) {
    return this.eventOrganizersService.addCoOrganizer(
      eventId,
      user.id,
      body.userId,
      user.isSuperAdmin,
    );
  }

  @Delete(':organizerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCoOrganizer(
    @Param('eventId') eventId: string,
    @Param('organizerId') organizerId: string,
    @User() user: AuthUser,
  ) {
    await this.eventOrganizersService.removeCoOrganizer(
      eventId,
      organizerId,
      user.id,
      user.isSuperAdmin,
    );
  }
}
