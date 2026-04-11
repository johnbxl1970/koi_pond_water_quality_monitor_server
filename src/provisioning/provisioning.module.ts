import { Module } from '@nestjs/common';
import { CaService } from './ca.service';
import { ProvisioningService } from './provisioning.service';
import { ProvisioningController } from './provisioning.controller';

@Module({
  controllers: [ProvisioningController],
  providers: [CaService, ProvisioningService],
  exports: [ProvisioningService, CaService],
})
export class ProvisioningModule {}
