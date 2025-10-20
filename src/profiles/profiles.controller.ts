import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('profiles')
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.profilesService.getProfile(id);
  }

  @Patch(':id')
  async updateProfile(
    @Param('id') id: string,
    @User() user: AuthUser,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(id, user.id, updateProfileDto);
  }
}

