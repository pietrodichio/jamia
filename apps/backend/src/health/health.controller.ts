import { Controller, Get, Inject } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  async checkDatabase() {
    try {
      // Test database connection by querying profiles table
      const { data, error, count } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        return {
          status: 'error',
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        };
      }

      return {
        status: 'ok',
        message: 'Database connection successful',
        profilesCount: count,
        sampleDataExists: data && data.length > 0,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
