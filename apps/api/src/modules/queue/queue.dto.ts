import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class MoveRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;
}

export class DeferRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  positions?: number;
}

export class ChannelScopedQueueActionDto {
  @IsOptional()
  @IsString()
  channelSlug?: string;
}
