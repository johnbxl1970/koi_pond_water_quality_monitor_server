import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class PreRegisterClaimDto {
  @ApiProperty({ description: 'Stable hardware ID derived from the device pubkey' })
  @IsString()
  @Matches(/^koi-[a-f0-9]{12,}$/i, { message: 'hardwareId must match koi-<hex>' })
  hardwareId!: string;

  @ApiProperty({ description: 'SHA-256 fingerprint of the device pubkey, hex' })
  @IsString()
  @Length(64, 64)
  pubkeyFingerprint!: string;

  @ApiProperty({ description: 'Device attestation certificate (PEM)' })
  @IsString()
  attestationCertPem!: string;

  @ApiProperty({ description: 'Plaintext claim token (base32, 26 chars)' })
  @IsString()
  @Length(20, 64)
  claimToken!: string;
}

export class ClaimDeviceDto {
  @ApiProperty({ description: 'Claim token from the device QR code' })
  @IsString()
  @Length(20, 64)
  claimToken!: string;

  @ApiProperty({ description: 'Pond to bind the device to' })
  @IsString()
  pondId!: string;
}

export class QrPayload {
  @ApiProperty() v!: number;
  @ApiProperty() hw!: string;
  @ApiProperty() tok!: string;
  @ApiProperty() fp!: string;
  @ApiProperty({ description: 'Ed25519 signature over canonical JSON of {v,hw,tok,fp}, base64url' })
  sig!: string;
}
