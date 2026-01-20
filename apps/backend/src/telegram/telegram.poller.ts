import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';

@Injectable()
export class TelegramPoller implements OnModuleInit {
    private readonly logger = new Logger(TelegramPoller.name);
    private readonly botToken: string | null;
    private offset = 0;
    private isPolling = false;

    constructor(
        private readonly telegramService: TelegramService,
        private readonly configService: ConfigService,
    ) {
        this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || null;
    }

    async onModuleInit() {
        const enablePolling = this.configService.get<string>('TELEGRAM_POLLING') === 'true';

        if (this.botToken && enablePolling) {
            this.logger.log('🤖 Starting Telegram polling...');
            this.startPolling();
        } else if (!this.botToken) {
            this.logger.warn('Telegram polling disabled: TELEGRAM_BOT_TOKEN not configured');
        } else {
            this.logger.log('Telegram polling disabled (TELEGRAM_POLLING not set to true)');
        }
    }

    private async startPolling() {
        this.isPolling = true;

        try {
            await this.telegramService.clearWebhook();
            this.logger.log('Telegram webhook cleared for polling');
        } catch (error) {
            this.logger.warn(
                `Failed to clear Telegram webhook before polling: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        while (this.isPolling) {
            try {
                await this.poll();
                await this.sleep(1000); // Poll every second
            } catch (error) {
                this.logger.error(`Polling error: ${error instanceof Error ? error.message : String(error)}`);
                await this.sleep(5000); // Wait 5 seconds on error
            }
        }
    }

    private async poll() {
        if (!this.botToken) return;

        const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
        const response = await fetch(`${url}?offset=${this.offset}&timeout=30`);

        if (response.status === 409) {
            this.logger.warn('Telegram polling conflict (webhook active). Clearing webhook and retrying...');
            await this.telegramService.clearWebhook();
            return;
        }

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
                this.logger.log(`📨 Received Telegram update: ${update.update_id}`);
                await this.telegramService.handleUpdate(update);
                this.offset = update.update_id + 1;
            }
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stopPolling() {
        this.isPolling = false;
        this.logger.log('Telegram polling stopped');
    }
}
