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

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Post('jams/managers/batch')
  async getJamManagersBatch(
    @Body() body: { jamIds: string[] },
    @User() user: AuthUser,
  ) {
    return this.managersService.getJamManagersBatch(
      body.jamIds,
      user.id,
      user.isSuperAdmin,
    );
  }

  @Get('jams/:jamId/managers')
  async getJamManagers(@Param('jamId') jamId: string, @User() user: AuthUser) {
    return this.managersService.getJamManagers(
      jamId,
      user.id,
      user.isSuperAdmin,
    );
  }

  @Post('jams/:jamId/managers')
  async addJamManager(
    @Param('jamId') jamId: string,
    @Body() body: { userId: string },
    @User() user: AuthUser,
  ) {
    return this.managersService.addJamManager(
      jamId,
      user.id,
      body.userId,
      user.isSuperAdmin,
    );
  }

  @Delete('jams/:jamId/managers/:managerUserId')
  async removeJamManager(
    @Param('jamId') jamId: string,
    @Param('managerUserId') managerUserId: string,
    @User() user: AuthUser,
  ) {
    return this.managersService.removeJamManager(
      jamId,
      user.id,
      managerUserId,
      user.isSuperAdmin,
    );
  }
}
