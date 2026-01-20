import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import type {
  SendJamEmailDto as ISendJamEmailDto,
  TestJamEmailDto as ITestJamEmailDto,
} from '@jamia/types/jam';
import { JamEmailAudience } from '@jamia/types/jam';

// Re-export the shared enum for backward compatibility
export { JamEmailAudience } from '@jamia/types/jam';

class BaseJamEmailDto {
  @IsString()
  @MinLength(3)
  subject: string;

  @IsString()
  @MinLength(1)
  htmlContent: string;

  @IsString()
  textContent: string;

  @IsOptional()
  @IsString()
  previewText?: string;
}

export class SendJamEmailDto extends BaseJamEmailDto implements ISendJamEmailDto {
  @IsEnum(JamEmailAudience)
  audience: JamEmailAudience;
}

export class TestJamEmailDto extends BaseJamEmailDto implements ITestJamEmailDto {
  @IsEmail()
  recipientEmail: string;
}
