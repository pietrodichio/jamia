import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JamsService } from './jams.service';
import type { CreateJamDto } from './dto/create-jam.dto';
import type { UpdateJamDto } from './dto/update-jam.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('jams')
@UseGuards(SupabaseAuthGuard)
export class JamsController {
  constructor(private readonly jamsService: JamsService) {}

  @Get()
  async getPublishedJams() {
    return this.jamsService.getPublishedJams();
  }

  @Get('my')
  async getMyJams(@User() user: AuthUser) {
    return this.jamsService.getMyJams(user.id);
  }

  @Get('participating')
  async getParticipatingJams(@User() user: AuthUser) {
    return this.jamsService.getJamsUserParticipatesIn(user.id);
  }

  @Get(':id')
  async getJamById(@Param('id') id: string, @User() user: AuthUser) {
    return this.jamsService.getJamById(id, user.id);
  }

  @Post()
  async createJam(
    @User() user: AuthUser,
    @Body(ValidationPipe) createJamDto: CreateJamDto,
  ) {
    return this.jamsService.createJam(user.id, createJamDto);
  }

  @Patch(':id')
  async updateJam(
    @Param('id') id: string,
    @User() user: AuthUser,
    @Body(ValidationPipe) updateJamDto: UpdateJamDto,
  ) {
    return this.jamsService.updateJam(id, user.id, updateJamDto);
  }

  @Post(':id/publish')
  async publishJam(@Param('id') id: string, @User() user: AuthUser) {
    return this.jamsService.publishJam(id, user.id);
  }

  @Delete(':id')
  async deleteJam(@Param('id') id: string, @User() user: AuthUser) {
    return this.jamsService.deleteJam(id, user.id);
  }
}

