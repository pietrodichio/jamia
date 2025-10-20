import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export const createSupabaseClient = (
  configService: ConfigService,
): SupabaseClient => {
  const supabaseUrl = configService.get<string>('SUPABASE_URL');
  const supabaseKey = configService.get<string>('SUPABASE_SERVICE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  console.log('🔧 Supabase Config:');
  console.log('  URL:', supabaseUrl);
  console.log('  Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
  console.log('  Key starts with eyJ:', supabaseKey.startsWith('eyJ'));

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });

  console.log('✅ Supabase client created successfully');
  
  return client;
};

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

