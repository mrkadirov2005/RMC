import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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

// @MOB-024 Asking for a password reset code.
class MobileResetRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username!: string;

  @IsOptional()
  @IsIn(['student', 'parent'])
  role?: 'student' | 'parent';
}

// @MOB-024 The code from the SMS and the new password.
class MobileResetConfirmDto extends MobileResetRequestDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "Kod 6 ta raqamdan iborat bo'lishi kerak" })
  code!: string;

  @IsString()
  @MinLength(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" })
  @MaxLength(100)
  new_password!: string;
}

module.exports = { MobileLoginDto, MobileRefreshDto, MobileResetRequestDto, MobileResetConfirmDto };

export {};
