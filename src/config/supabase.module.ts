import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createSupabaseClient,
  SUPABASE_CLIENT,
} from './supabase.config';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: (configService: ConfigService) =>
        createSupabaseClient(configService),
      inject: [ConfigService],
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}

