import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProvisioningService } from './provisioning.service';
import { ClaimDeviceDto, PreRegisterClaimDto } from './provisioning.dto';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('provisioning')
@Controller()
export class ProvisioningController {
  constructor(private readonly service: ProvisioningService) {}

  /**
   * Called by the flashing tool or the factory manufacturing pipeline.
   * Guarded by ADMIN_API_TOKEN bearer auth.
   */
  @Post('admin/device-claims')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  preRegister(@Body() dto: PreRegisterClaimDto) {
    return this.service.preRegister(dto);
  }

  /**
   * Public — mobile apps fetch the Ed25519 pubkey to verify QR signatures
   * offline before trusting their payload.
   */
  @Get('provisioning/qr-signing-pubkey')
  qrSigningPubkey() {
    return { publicKeyPem: this.service.qrSigningPublicKeyPem() };
  }

  /**
   * Called by the mobile app after the user scans the device QR code.
   * Returns `{ status: 'issued' }` if the cert was dispatched immediately,
   * or `{ status: 'waiting' }` if the device hasn't published its CSR yet;
   * in the waiting case the mobile app should poll or subscribe to a status
   * stream until issuance completes.
   */
  @Post('devices/claim')
  claim(@Body() dto: ClaimDeviceDto) {
    return this.service.claim(dto.claimToken, dto.pondId);
  }
}
