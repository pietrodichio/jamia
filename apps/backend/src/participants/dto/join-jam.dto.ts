import { IsEnum } from 'class-validator';
import type { JoinJamDto as IJoinJamDto } from '@jamia/types/participant';

export class JoinJamDto implements IJoinJamDto {
  @IsEnum(['base', 'flyer', 'both'])
  role: 'base' | 'flyer' | 'both';
}
