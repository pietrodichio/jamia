import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';

export class UpdateJamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  location_text?: string;

  @IsString()
  @IsOptional()
  gmaps_link?: string;

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
}

