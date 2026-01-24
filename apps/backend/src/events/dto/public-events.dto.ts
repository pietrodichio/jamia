import {
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
  IsArray,
  IsString,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { EventType } from '@jamia/types/event';

export class PublicEventsDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number;

  // Optional: Filter by event types
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['jam', 'class', 'workshop', 'convention'], { each: true })
  types?: EventType[];

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
}
