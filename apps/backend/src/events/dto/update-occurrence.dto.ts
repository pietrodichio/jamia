import { IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class UpdateOccurrenceDto {
  @IsOptional()
  @IsBoolean()
  is_cancelled?: boolean;

  @IsOptional()
  @IsString()
  override_title?: string;

  @IsOptional()
  @IsString()
  override_location_text?: string;

  @IsOptional()
  @IsDateString()
  override_starts_at?: string;

  @IsOptional()
  @IsDateString()
  override_ends_at?: string;

  @IsOptional()
  @IsString()
  override_description?: string;
}
