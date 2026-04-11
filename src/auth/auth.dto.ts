import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(10) password!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() password!: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken!: string;
}

export class AuthTokens {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty() expiresIn!: number;
}

export class AuthResponse {
  @ApiProperty() tokens!: AuthTokens;
  @ApiProperty() user!: { id: string; email: string; displayName: string | null };
}
