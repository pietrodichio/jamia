import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { EmailPreferencesService } from './email-preferences.service';
import { UpdateEmailPreferencesDto } from './dto/update-email-preferences.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Public } from '../auth/public.decorator';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('email-preferences')
@UseGuards(SupabaseAuthGuard)
export class EmailPreferencesController {
  constructor(private readonly emailPreferencesService: EmailPreferencesService) {}

  @Get()
  async getPreferences(@User() user: AuthUser) {
    return this.emailPreferencesService.getPreferences(user.id);
  }

  @Patch()
  async updatePreferences(
    @User() user: AuthUser,
    @Body(new ValidationPipe({ transform: true }))
    updateEmailPreferencesDto: UpdateEmailPreferencesDto,
  ) {
    return this.emailPreferencesService.updatePreferences(user.id, updateEmailPreferencesDto);
  }

  @Public()
  @Post('unsubscribe/:token')
  async unsubscribePost(@Param('token') token: string) {
    await this.emailPreferencesService.unsubscribeByToken(token);
    return { message: 'Unsubscribed successfully' };
  }

  @Public()
  @Get('unsubscribe/:token')
  async unsubscribeGet(@Param('token') token: string) {
    await this.emailPreferencesService.unsubscribeByToken(token);
    return { message: 'Unsubscribed successfully' };
  }
}
