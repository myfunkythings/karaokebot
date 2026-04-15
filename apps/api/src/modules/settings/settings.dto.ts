import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

class QueuePolicyFlagsDto {
  @IsBoolean()
  prioritizeFirstTimeSinger!: boolean;

  @IsBoolean()
  prioritizeLowerSungCount!: boolean;

  @IsBoolean()
  prioritizeRequestTime!: boolean;
}

class BotReplyTemplatesDto {
  @IsString()
  startMessage!: string;

  @IsString()
  unknownCommand!: string;

  @IsString()
  emptyMessage!: string;

  @IsString()
  requestAccepted!: string;

  @IsString()
  requestRejectedRateLimit!: string;

  @IsString()
  requestRejectedNoSession!: string;

  @IsString()
  statusCurrentPerformer!: string;

  @IsString()
  statusNoGuestProfile!: string;

  @IsString()
  statusNoActiveRequests!: string;

  @IsString()
  statusQueuedSummary!: string;

  @IsString()
  fallbackPositionUnavailable!: string;

  @IsString()
  fallbackRequestSaveFailed!: string;

  @IsString()
  fallbackStatusNoRequests!: string;

  @IsString()
  fallbackStatusNoActiveRequests!: string;

  @IsString()
  fallbackStatusQueuedSummary!: string;

  @IsString()
  fallbackStatusQueuedNoAhead!: string;

  @IsString()
  fallbackStatusQueuedAheadTemplate!: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(30)
  antiSpamSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  skipDownPositions?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => QueuePolicyFlagsDto)
  queuePolicyFlags?: QueuePolicyFlagsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BotReplyTemplatesDto)
  botReplyTemplates?: BotReplyTemplatesDto;

  @IsOptional()
  @IsObject()
  uiLabels?: Record<string, string>;
}
