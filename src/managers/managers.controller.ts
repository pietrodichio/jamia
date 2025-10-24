import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ManagersService } from './managers.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('jams/:jamId/managers')
@UseGuards(SupabaseAuthGuard)
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Get()
  async getJamManagers(@Param('jamId') jamId: string, @User() user: AuthUser) {
    return this.managersService.getJamManagers(jamId, user.id);
  }

  @Post()
  async addJamManager(
    @Param('jamId') jamId: string,
    @Body() body: { userId: string },
    @User() user: AuthUser,
  ) {
    return this.managersService.addJamManager(jamId, user.id, body.userId);
  }

  @Delete(':managerUserId')
  async removeJamManager(
    @Param('jamId') jamId: string,
    @Param('managerUserId') managerUserId: string,
    @User() user: AuthUser,
  ) {
    return this.managersService.removeJamManager(jamId, user.id, managerUserId);
  }
}
