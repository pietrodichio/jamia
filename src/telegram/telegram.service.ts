import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

interface TelegramNotificationContext {
    chatId: number;
    jamName: string;
    participantName: string;
    participantRole: 'base' | 'flyer' | 'both';
    action: 'joined' | 'left' | 'cancelled';
    jamId: string;
    currentCount: number;
    capacity: number | null;
}

interface TelegramUpdate {
    message?: {
        chat?: {
            id: number;
            username?: string;
        };
        text?: string;
    };
}

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);
    private readonly botToken: string | null;
    private readonly enabled: boolean;
    private readonly frontendBaseUrl: string | null;

    constructor(
        @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
        private readonly configService: ConfigService,
    ) {
        this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || null;
        this.frontendBaseUrl = this.configService.get<string>('FRONTEND_BASE_URL') || null;

        this.enabled = Boolean(this.botToken);

        if (!this.enabled) {
            this.logger.warn(
                'Telegram notifications are disabled. Please configure TELEGRAM_BOT_TOKEN.',
            );
        } else {
            this.logger.log('✅ Telegram service initialized');
        }
    }

    /**
     * Generate a unique token for linking a user's Telegram account
     */
    async generateLinkToken(userId: string): Promise<string> {
        const token = this.generateRandomToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

        const { error } = await this.supabase
            .from('telegram_link_tokens')
            .insert({
                user_id: userId,
                token,
                expires_at: expiresAt.toISOString(),
                used: false,
            });

        if (error) {
            throw new Error(`Failed to generate link token: ${error.message}`);
        }

        return token;
    }

    /**
     * Get the Telegram bot link URL for a user
     */
    getTelegramBotLink(token: string): string {
        const botUsername = this.configService.get<string>('TELEGRAM_BOT_USERNAME');
        if (!botUsername) {
            throw new Error('TELEGRAM_BOT_USERNAME not configured');
        }
        return `https://t.me/${botUsername}?start=${token}`;
    }

    /**
     * Handle incoming Telegram updates (webhook or polling)
     */
    async handleUpdate(update: TelegramUpdate): Promise<void> {
        const message = update.message;
        if (!message?.text || !message.chat?.id) {
            return;
        }

        // Check if this is a /start command with a token
        const match = message.text.match(/^\/start\s+(.+)$/);
        if (!match) {
            // Send a generic welcome message
            await this.sendDirectMessage(
                message.chat.id,
                '👋 Benvenuto! Per collegare il tuo account Jamia, clicca sul link dalle impostazioni del profilo.',
            );
            return;
        }

        const token = match[1];
        await this.linkTelegramAccount(token, message.chat.id, message.chat.username);
    }

    /**
     * Link a Telegram chat_id to a user account using the token
     */
    private async linkTelegramAccount(
        token: string,
        chatId: number,
        username?: string,
    ): Promise<void> {
        // Find the token
        const { data: tokenData, error: tokenError } = await this.supabase
            .from('telegram_link_tokens')
            .select('user_id, used, expires_at')
            .eq('token', token)
            .single();

        if (tokenError || !tokenData) {
            await this.sendDirectMessage(
                chatId,
                '❌ Link non valido o scaduto. Genera un nuovo link dalle impostazioni.',
            );
            return;
        }

        if (tokenData.used) {
            await this.sendDirectMessage(chatId, '❌ Questo link è già stato utilizzato.');
            return;
        }

        if (new Date(tokenData.expires_at) < new Date()) {
            await this.sendDirectMessage(
                chatId,
                '❌ Questo link è scaduto. Genera un nuovo link dalle impostazioni.',
            );
            return;
        }

        // Update profile with chat_id
        const { error: updateError } = await this.supabase
            .from('profiles')
            .update({
                telegram_chat_id: chatId,
                telegram_username: username || null,
                telegram_linked_at: new Date().toISOString(),
            })
            .eq('id', tokenData.user_id);

        if (updateError) {
            this.logger.error(`Failed to link Telegram: ${updateError.message}`);
            await this.sendDirectMessage(
                chatId,
                '❌ Errore nel collegamento. Riprova più tardi.',
            );
            return;
        }

        // Mark token as used
        await this.supabase
            .from('telegram_link_tokens')
            .update({ used: true })
            .eq('token', token);

        await this.sendDirectMessage(
            chatId,
            '✅ Account Telegram collegato con successo! Riceverai notifiche per le tue jam.',
        );

        this.logger.log(`User ${tokenData.user_id} linked Telegram account (chat_id: ${chatId})`);
    }

    /**
     * Notify a jam manager about a participant action
     */
    async notifyJamManager(context: TelegramNotificationContext): Promise<void> {
        if (!this.enabled) {
            this.logger.debug('Telegram notifications disabled, skipping notification');
            return;
        }

        const message = this.buildNotificationMessage(context);

        try {
            await this.sendDirectMessage(context.chatId, message);
            this.logger.log(
                `✅ Telegram notification sent to chat ${context.chatId} for jam "${context.jamName}"`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to send Telegram notification: ${error instanceof Error ? error.message : String(error)}`,
            );
            // Don't throw - we don't want to fail the entire operation if notification fails
        }
    }

    /**
     * Build a formatted notification message
     */
    private buildNotificationMessage(context: TelegramNotificationContext): string {
        const { jamName, participantName, participantRole, action, jamId, currentCount, capacity } = context;

        const actionEmoji = {
            joined: '✅',
            left: '❌',
            cancelled: '🚫',
        };

        const actionText = {
            joined: 'si è iscritto/a alla tua jam',
            left: 'è stato/a rimosso/a dalla tua jam',
            cancelled: 'ha cancellato la partecipazione alla tua jam',
        };

        const roleEmoji = {
            base: '🧍',
            flyer: '🦅',
            both: '🔄',
        };

        const roleText = {
            base: 'Base',
            flyer: 'Flyer',
            both: 'Entrambi',
        };

        const emoji = actionEmoji[action];
        const text = actionText[action];
        const roleIcon = roleEmoji[participantRole];
        const role = roleText[participantRole];

        // Build capacity stats
        const capacityText = capacity
            ? `📊 Partecipanti: ${currentCount}/${capacity}`
            : `📊 Partecipanti: ${currentCount}`;

        const jamUrl = this.frontendBaseUrl
            ? `${this.frontendBaseUrl.replace(/\/+$/, '')}/jams/${jamId}`
            : null;

        const urlPart = jamUrl ? `\n🔗 Vai alla jam: ${jamUrl}` : '';

        return `${emoji} <b>Notifica Jamia</b>

📋 Jam: <b>${jamName}</b>
👤 ${participantName} ${text}
${roleIcon} Ruolo: ${role}
${capacityText}${urlPart}`;
    }

    /**
     * Send a direct message to a Telegram user
     */
    private async sendDirectMessage(chatId: number, text: string): Promise<void> {
        if (!this.botToken) {
            throw new Error('Telegram bot token not configured');
        }

        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: false,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Telegram API error: ${response.status} - ${error}`);
        }

        const result = await response.json();
        if (!result.ok) {
            throw new Error(`Telegram API returned error: ${result.description}`);
        }
    }

    /**
     * Clear any active webhook to allow polling.
     */
    async clearWebhook(): Promise<void> {
        if (!this.botToken) {
            throw new Error('Telegram bot token not configured');
        }

        const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;
        const response = await fetch(url, { method: 'POST' });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Telegram API error: ${response.status} - ${error}`);
        }

        const result = await response.json();
        if (!result.ok) {
            throw new Error(`Telegram API returned error: ${result.description}`);
        }
    }

    /**
     * Unlink a user's Telegram account
     */
    async unlinkTelegramAccount(userId: string): Promise<void> {
        const { error } = await this.supabase
            .from('profiles')
            .update({
                telegram_chat_id: null,
                telegram_username: null,
                telegram_linked_at: null,
            })
            .eq('id', userId);

        if (error) {
            throw new Error(`Failed to unlink Telegram: ${error.message}`);
        }

        this.logger.log(`User ${userId} unlinked Telegram account`);
    }

    /**
     * Generate a random token for linking
     */
    private generateRandomToken(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }
}
