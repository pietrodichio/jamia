import {
    Controller,
    Post,
    Delete,
    Body,
    UseGuards,
    HttpCode,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User } from '../auth/user.decorator';

interface AuthUser {
    id: string;
    email?: string;
}

@Controller('telegram')
export class TelegramController {
    constructor(private readonly telegramService: TelegramService) { }

    /**
     * Generate a link token for connecting Telegram
     * POST /telegram/generate-link
     */
    @Post('generate-link')
    @UseGuards(SupabaseAuthGuard)
    async generateLink(@User() user: AuthUser) {
        const token = await this.telegramService.generateLinkToken(user.id);
        const botLink = this.telegramService.getTelegramBotLink(token);

        return {
            token,
            botLink,
            expiresIn: 3600, // 1 hour in seconds
        };
    }

    /**
     * Webhook endpoint to receive Telegram updates
     * POST /telegram/webhook
     */
    @Post('webhook')
    @HttpCode(200)
    async handleWebhook(@Body() update: any) {
        await this.telegramService.handleUpdate(update);
        return { ok: true };
    }

    /**
     * Unlink Telegram account
     * DELETE /telegram/unlink
     */
    @Delete('unlink')
    @UseGuards(SupabaseAuthGuard)
    async unlinkAccount(@User() user: AuthUser) {
        await this.telegramService.unlinkTelegramAccount(user.id);
        return { message: 'Telegram account unlinked successfully' };
    }
}
