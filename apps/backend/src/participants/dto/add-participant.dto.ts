import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class AddParticipantDto {
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
