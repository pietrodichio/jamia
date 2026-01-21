import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  // Required: Event type
  @IsString()
  @IsIn(['jam', 'class', 'workshop', 'convention'])
  type: string;

  // Required: Core fields
  @IsString()
  title: string;

  @IsString()
  location_text: string;

  @IsDateString()
  starts_at: string;

  @IsDateString()
  ends_at: string;

  // Optional: Shared fields
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  external_link?: string;

  @IsOptional()
  @IsString()
  organizer_contact?: string;

  // Optional: Location fields
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  location_lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  location_lng?: number;

  @IsOptional()
  @IsString()
  location_place_id?: string;

  @IsOptional()
  @IsString()
  gmaps_link?: string;
}
