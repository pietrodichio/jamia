import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import type { AddParticipantDto as IAddParticipantDto } from '@jamia/types/participant';

export class AddParticipantDto implements IAddParticipantDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['base', 'flyer', 'both'])
  role: 'base' | 'flyer' | 'both';
}
