import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { AlertsModule } from '../alerts/alerts.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';

@Module({
  imports: [AlertsModule, ProvisioningModule],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
