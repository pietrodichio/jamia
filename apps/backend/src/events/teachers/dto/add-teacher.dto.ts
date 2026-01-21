import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AddTeacherDto {
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsString()
  role?: string; // Optional: "lead instructor", "assistant", etc.
}
