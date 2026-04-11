import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePondDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ description: 'Pond volume in cubic meters' }) @IsNumber() @Min(0.01) volumeM3!: number;
  @ApiProperty() @IsInt() @Min(0) koiCount!: number;
  @ApiProperty() @IsLatitude() latitude!: number;
  @ApiProperty() @IsLongitude() longitude!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}

export class UpdatePondDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) volumeM3?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) koiCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsLatitude() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsLongitude() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}
