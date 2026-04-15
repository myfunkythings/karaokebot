import { IsOptional, IsString, MinLength } from "class-validator";

export class OpenSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;
}
