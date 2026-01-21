import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchEventsDto {
  // Required: Location parameters
  @Type(() => Number)
  @IsNumber()
  lng: number;

  @Type(() => Number)
  @IsNumber()
  lat: number;

  // Optional: Radius in meters (default 50km)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(500000)
  radius?: number;

  // Optional: Filter by event types
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['jam', 'class', 'workshop', 'convention'], { each: true })
  types?: string[];

  // Optional: Date range filters
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // Optional: Keyword search in title/description
  @IsOptional()
  @IsString()
  keyword?: string;

  // Optional: Tag-based filters
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Handle both array and comma-separated string from query params
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    return value;
  })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    return value;
  })
  accommodation_options?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    return value;
  })
  food_options?: string[];

  // Optional: Filter by specific teacher
  @IsOptional()
  @IsUUID()
  teacher_id?: string;
}
