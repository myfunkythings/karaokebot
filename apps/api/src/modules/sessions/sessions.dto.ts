import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

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

export class CloseSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedQueueVersion!: number;
}
