import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

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
}
