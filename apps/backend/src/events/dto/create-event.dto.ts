import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsIn,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// Location can be sent as an object with description and coordinates
export class LocationDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  googleMapsUrl?: string;
}

export class CreateEventDto {
  // Required: Event type
  @IsString()
  @IsIn(['jam', 'class', 'workshop', 'convention'])
  type: string;

  // Required: Core fields
  @IsString()
  title: string;

  // Location: accepts either a string or a LocationDto object
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location_text?: string | LocationDto;

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
  image_url?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  external_link?: string;

  @IsOptional()
  @IsString()
  cta_text?: string;

  @IsOptional()
  @IsString()
  organizer_contact?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Optional: Location fields (can be set directly or extracted from location_text object)
  @IsOptional()
  @IsString()
  location_city?: string;

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

  // Optional: Recurrence fields
  @IsOptional()
  @IsString()
  recurrence_rule?: string; // RRULE string format

  @IsOptional()
  @IsDateString()
  recurrence_dtstart?: string; // Base start time for series (ISO 8601)

  @IsOptional()
  @IsDateString()
  recurrence_until?: string; // Series end date (ISO 8601)
}
