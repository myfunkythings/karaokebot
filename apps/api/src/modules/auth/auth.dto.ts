import { IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MinLength(1)
  login!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  operatorName?: string;
}
