import { IsEnum } from 'class-validator';

export class JoinJamDto {
  @IsEnum(['base', 'flyer', 'both'])
  role: 'base' | 'flyer' | 'both';
}

