import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;
}
