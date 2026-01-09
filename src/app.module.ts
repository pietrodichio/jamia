import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './config/supabase.module';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { JamsModule } from './jams/jams.module';
import { ParticipantsModule } from './participants/participants.module';
import { AuditModule } from './audit/audit.module';
import { ManagersModule } from './managers/managers.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'local' ? '.env.local' : '.env',
    }),
    SupabaseModule,
    HealthModule,
    ProfilesModule,
    JamsModule,
    ParticipantsModule,
    AuditModule,
    ManagersModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
