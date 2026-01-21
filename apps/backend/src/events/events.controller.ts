import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('events')
@UseGuards(SupabaseAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @User() user: AuthUser,
  ) {
    return this.eventsService.createEvent(user.id, createEventDto);
  }

  @Get('my-events')
  async getMyEvents(@User() user: AuthUser) {
    return this.eventsService.getEventsByOwner(user.id);
  }

  @Get('co-organized')
  async getCoOrganizedEvents(@User() user: AuthUser) {
    return this.eventsService.getEventsCoOrganized(user.id);
  }

  @Get(':id')
  async getEvent(@Param('id') id: string, @User() user: AuthUser) {
    return this.eventsService.getEventById(id, user.id, user.isSuperAdmin);
  }

  @Patch(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @User() user: AuthUser,
  ) {
    return this.eventsService.updateEvent(
      id,
      user.id,
      updateEventDto,
      user.isSuperAdmin,
    );
  }

  @Patch(':id/publish')
  async publishEvent(@Param('id') id: string, @User() user: AuthUser) {
    return this.eventsService.publishEvent(id, user.id, user.isSuperAdmin);
  }

  @Delete(':id')
  async deleteEvent(@Param('id') id: string, @User() user: AuthUser) {
    return this.eventsService.deleteEvent(id, user.id, user.isSuperAdmin);
  }
}
