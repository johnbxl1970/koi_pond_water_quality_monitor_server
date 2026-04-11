import { Injectable, Logger } from '@nestjs/common';
import { AlertRule, AlertSeverity, ComparisonOp } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from './fcm.service';

type TelemetryRow = Record<string, unknown> & { pondId: string };

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async evaluate(pondId: string, row: TelemetryRow) {
    const rules = await this.prisma.alertRule.findMany({
      where: { pondId, enabled: true },
    });
    for (const rule of rules) {
      const value = row[rule.metric];
      if (typeof value !== 'number') continue;
      if (!this.compare(value, rule.op, rule.threshold)) continue;
      await this.fire(rule, value);
    }
  }

  private compare(value: number, op: ComparisonOp, threshold: number): boolean {
    switch (op) {
      case 'LT': return value < threshold;
      case 'LTE': return value <= threshold;
      case 'GT': return value > threshold;
      case 'GTE': return value >= threshold;
      case 'EQ': return value === threshold;
      case 'NEQ': return value !== threshold;
    }
  }

  private async fire(rule: AlertRule, value: number) {
    const event = await this.prisma.alertEvent.create({
      data: {
        pondId: rule.pondId,
        ruleId: rule.id,
        metric: rule.metric,
        value,
        severity: rule.severity,
      },
    });
    this.logger.warn(
      `ALERT ${rule.severity} pond=${rule.pondId} ${rule.metric}=${value} (rule ${rule.id})`,
    );
    await this.fcm.sendToPond(rule.pondId, {
      title: this.titleFor(rule.severity),
      body: `${rule.metric} = ${value} ${this.opText(rule.op)} ${rule.threshold}`,
      data: { eventId: event.id, ruleId: rule.id, metric: rule.metric },
    });
  }

  private titleFor(severity: AlertSeverity) {
    switch (severity) {
      case 'CRITICAL': return 'CRITICAL pond alert';
      case 'WARNING': return 'Pond warning';
      default: return 'Pond notice';
    }
  }

  private opText(op: ComparisonOp): string {
    return { LT: '<', LTE: '<=', GT: '>', GTE: '>=', EQ: '==', NEQ: '!=' }[op];
  }
}
