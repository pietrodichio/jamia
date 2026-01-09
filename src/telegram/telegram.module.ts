import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramPoller } from './telegram.poller';
import { SupabaseModule } from '../config/supabase.module';

@Module({
    imports: [SupabaseModule],
    controllers: [TelegramController],
    providers: [TelegramService, TelegramPoller],
    exports: [TelegramService],
})
export class TelegramModule { }
