import { IsEnum } from 'class-validator';
import type { UpdateRoleDto as IUpdateRoleDto } from '@jamia/types/participant';

export class UpdateParticipantRoleDto implements IUpdateRoleDto {
  @IsEnum(['base', 'flyer'])
  role: 'base' | 'flyer';
}


