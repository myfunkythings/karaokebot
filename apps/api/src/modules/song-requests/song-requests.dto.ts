import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateManualSongRequestDto {
  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsString()
  @MinLength(1)
  rawText!: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  channelSlug?: string;
}

export class UpdateSongRequestRawTextDto {
  @IsString()
  @MinLength(1)
  rawText!: string;
}
