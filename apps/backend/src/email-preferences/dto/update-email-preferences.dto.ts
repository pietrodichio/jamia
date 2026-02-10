import { IsBoolean, IsOptional, IsIn } from 'class-validator';
import type { UpdateEmailPreferencesDto as IUpdateEmailPreferencesDto } from '@jamia/types';

export class UpdateEmailPreferencesDto implements IUpdateEmailPreferencesDto {
  @IsBoolean()
  @IsOptional()
  digest_enabled?: boolean;

  @IsIn(['weekly', 'monthly'])
  @IsOptional()
  digest_frequency?: 'weekly' | 'monthly';
}
