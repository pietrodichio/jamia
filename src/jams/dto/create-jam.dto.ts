import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateJamDto {
  @IsString()
  name: string;

  @IsString()
  location_text: string;

  @IsString()
  @IsOptional()
  gmaps_link?: string;

  @IsDateString()
  starts_at: string;

  @IsDateString()
  ends_at: string;

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
}

