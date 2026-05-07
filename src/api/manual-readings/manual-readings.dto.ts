import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateManualReadingDto {
  @ApiPropertyOptional({ description: 'ISO timestamp; defaults to now' })
  @IsOptional()
  @IsDateString()
  time?: string;

  @ApiPropertyOptional({ description: 'Free-form note (≤ 500 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() phVal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tempC?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) doMgL?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() orpMv?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tdsPpm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) turbidityNtu?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) nh3TotalPpm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) no2Ppm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) no3Ppm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) khDkh?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) ghDgh?: number;
}

export const MANUAL_READING_PARAM_FIELDS = [
  'phVal',
  'tempC',
  'doMgL',
  'orpMv',
  'tdsPpm',
  'turbidityNtu',
  'nh3TotalPpm',
  'no2Ppm',
  'no3Ppm',
  'khDkh',
  'ghDgh',
] as const;

export type ManualReadingParamField = (typeof MANUAL_READING_PARAM_FIELDS)[number];

export class ManualReadingResponse {
  @ApiProperty() id!: string;
  @ApiProperty() pondId!: string;
  @ApiProperty() recordedById!: string;
  @ApiProperty() time!: Date;
  @ApiPropertyOptional() notes?: string | null;
  @ApiPropertyOptional() phVal?: number | null;
  @ApiPropertyOptional() tempC?: number | null;
  @ApiPropertyOptional() doMgL?: number | null;
  @ApiPropertyOptional() orpMv?: number | null;
  @ApiPropertyOptional() tdsPpm?: number | null;
  @ApiPropertyOptional() turbidityNtu?: number | null;
  @ApiPropertyOptional() nh3TotalPpm?: number | null;
  @ApiPropertyOptional() nh3FreePpm?: number | null;
  @ApiPropertyOptional() no2Ppm?: number | null;
  @ApiPropertyOptional() no3Ppm?: number | null;
  @ApiPropertyOptional() khDkh?: number | null;
  @ApiPropertyOptional() ghDgh?: number | null;
}
