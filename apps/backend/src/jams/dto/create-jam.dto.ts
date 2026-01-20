import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  CreateJamDto as ICreateJamDto,
  JamLocation as IJamLocation,
} from '@jamia/types/jam';

export class JamLocationDto implements IJamLocation {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  place_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  google_maps_url?: string;
}

export class CreateJamDto implements ICreateJamDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => JamLocationDto)
  location: JamLocationDto;

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

  @IsBoolean()
  @IsOptional()
  public_participants?: boolean;

  @IsBoolean()
  @IsOptional()
  telegram_notifications_enabled?: boolean;
}
