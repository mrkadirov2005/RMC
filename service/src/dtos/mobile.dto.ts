import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// @MOB-022 Mobile sign-in. `role` is optional: without it the server tries student, then parent.
class MobileLoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsIn(['student', 'parent'])
  role?: 'student' | 'parent';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  device_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  device_name?: string;

  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: 'ios' | 'android' | 'web';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  app_version?: string;
}

// @MOB-023 Refresh and sign-out both send the current refresh token.
class MobileRefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refresh_token!: string;
}

module.exports = { MobileLoginDto, MobileRefreshDto };

export {};
