import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty() @IsString() pondId!: string;
  @ApiProperty() @IsString() hardwareId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVer?: string;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVer?: string;
}
