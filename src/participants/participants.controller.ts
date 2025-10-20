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
import { ParticipantsService } from './participants.service';
import { JoinJamDto } from './dto/join-jam.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('participants')
@UseGuards(SupabaseAuthGuard)
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get('jams/:jamId')
  async getJamParticipants(
    @Param('jamId') jamId: string,
    @User() user: AuthUser,
  ) {
    return this.participantsService.getJamParticipants(jamId, user.id);
  }

  @Get('jams/:jamId/my-participation')
  async getUserParticipation(
    @Param('jamId') jamId: string,
    @User() user: AuthUser,
  ) {
    return this.participantsService.getUserParticipation(jamId, user.id);
  }

  @Post('jams/:jamId')
  async joinJam(
    @Param('jamId') jamId: string,
    @User() user: AuthUser,
    @Body() joinJamDto: JoinJamDto,
  ) {
    return this.participantsService.joinJam(jamId, user.id, joinJamDto);
  }

  @Patch(':id/cancel')
  async cancelParticipation(
    @Param('id') id: string,
    @User() user: AuthUser,
  ) {
    return this.participantsService.cancelParticipation(id, user.id);
  }

  @Delete(':id')
  async removeParticipant(@Param('id') id: string, @User() user: AuthUser) {
    return this.participantsService.removeParticipant(id, user.id);
  }
}

