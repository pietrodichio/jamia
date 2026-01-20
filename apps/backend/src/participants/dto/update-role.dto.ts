import { IsEnum } from 'class-validator';

export class UpdateParticipantRoleDto {
  @IsEnum(['base', 'flyer'])
  role: 'base' | 'flyer';
}


