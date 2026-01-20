import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JamLocationDto } from './create-jam.dto';

export class UpdateJamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => JamLocationDto)
  @IsOptional()
  location?: JamLocationDto;

  @IsDateString()
  @IsOptional()
  starts_at?: string;

  @IsDateString()
  @IsOptional()
  ends_at?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  desired_bases_min?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  desired_bases_max?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  desired_flyers_min?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  desired_flyers_max?: number;

  @IsBoolean()
  @IsOptional()
  auto_promote?: boolean;

  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived';

  @IsBoolean()
  @IsOptional()
  public_participants?: boolean;

  @IsBoolean()
  @IsOptional()
  telegram_notifications_enabled?: boolean;
}
