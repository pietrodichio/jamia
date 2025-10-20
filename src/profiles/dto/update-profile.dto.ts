import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsEnum(['base', 'flyer', 'both'])
  @IsOptional()
  main_role?: 'base' | 'flyer' | 'both';

  @IsString()
  @IsOptional()
  photo_url?: string;
}

