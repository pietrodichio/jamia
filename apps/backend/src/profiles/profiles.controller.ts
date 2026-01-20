import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('profiles')
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('jamId') jamId?: string,
  ) {
    return this.profilesService.searchUsers(query, limit, jamId);
  }

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.profilesService.getProfile(id);
  }

  @Patch(':id')
  async updateProfile(
    @Param('id') id: string,
    @User() user: AuthUser,
    @Body(new ValidationPipe({ transform: true }))
    updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(id, user.id, updateProfileDto);
  }
}
