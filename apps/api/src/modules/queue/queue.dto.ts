import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class QueueVersionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedQueueVersion!: number;
}

export class MoveRequestDto extends QueueVersionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;
}

export class DeferRequestDto extends QueueVersionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  positions?: number;
}
