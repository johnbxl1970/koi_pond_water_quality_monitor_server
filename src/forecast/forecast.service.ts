import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  async upcoming(pondId: string, hours: number) {
    const now = new Date();
    return this.prisma.weatherForecast.findMany({
      where: { pondId, forecastForTime: { gte: now } },
      orderBy: { forecastForTime: 'asc' },
      take: hours,
    });
  }
}
