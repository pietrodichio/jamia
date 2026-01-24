import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

export class SaveDraftEventDto extends PartialType(CreateEventDto) {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
