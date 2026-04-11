import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfig } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';

interface OpenMeteoResponse {
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
    surface_pressure?: number[];
    cloud_cover?: number[];
  };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async pollAllPonds() {
    const ponds = await this.prisma.pond.findMany();
    for (const pond of ponds) {
      try {
        await this.pollOne(pond.id, pond.latitude, pond.longitude);
      } catch (err) {
        this.logger.error(`Weather fetch failed for pond ${pond.id}: ${(err as Error).message}`);
      }
    }
  }

  async pollOne(pondId: string, lat: number, lon: number) {
    const url = new URL(this.config.openMeteoBaseUrl);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'hourly',
      'temperature_2m,precipitation,wind_speed_10m,surface_pressure,cloud_cover',
    );
    url.searchParams.set('forecast_days', '2');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = (await res.json()) as OpenMeteoResponse;
    const hourly = data.hourly;
    if (!hourly?.time?.length) return;

    const rows = hourly.time.map((t, i) => ({
      pondId,
      forecastForTime: new Date(t),
      tempC: hourly.temperature_2m?.[i] ?? null,
      precipMm: hourly.precipitation?.[i] ?? null,
      windKph: hourly.wind_speed_10m?.[i] != null ? hourly.wind_speed_10m[i] * 3.6 : null,
      pressureHpa: hourly.surface_pressure?.[i] ?? null,
      cloudCoverPct: hourly.cloud_cover?.[i] ?? null,
      raw: { time: t, i } as object,
    }));

    await this.prisma.weatherForecast.createMany({ data: rows });
    this.logger.log(`Stored ${rows.length} forecast rows for pond ${pondId}`);
  }
}
