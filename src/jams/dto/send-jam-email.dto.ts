import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum JamEmailAudience {
  ALL = 'all',
  PARTICIPANTS = 'participants',
  WAITING = 'waiting',
}

class BaseJamEmailDto {
  @IsString()
  @MinLength(3)
  subject: string;

  @IsString()
  @MinLength(1)
  htmlContent: string;

  @IsOptional()
  @IsString()
  previewText?: string;

  @IsOptional()
  @IsString()
  textContent?: string;
}

export class SendJamEmailDto extends BaseJamEmailDto {
  @IsEnum(JamEmailAudience)
  audience: JamEmailAudience;
}

export class TestJamEmailDto extends BaseJamEmailDto {
  @IsEmail()
  recipientEmail: string;
}
