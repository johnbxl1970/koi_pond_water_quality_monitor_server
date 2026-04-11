import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/config.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Stub FCM dispatcher. In dev it logs the payload. Swap the body with
 * firebase-admin once FCM credentials are provisioned.
 */
@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly config: AppConfig) {}

  async sendToPond(pondId: string, payload: PushPayload) {
    if (!this.config.fcm.projectId) {
      this.logger.log(`[FCM stub] pond=${pondId} ${payload.title}: ${payload.body}`);
      return;
    }
    // TODO: integrate firebase-admin.messaging().sendEachForMulticast(...)
    this.logger.warn('FCM credentials set but firebase-admin not wired yet.');
  }
}
