import { z } from 'zod';

export const telemetryPayloadSchema = z.object({
  time: z.string().datetime().optional(),
  phaseSeq: z.number().int().optional(),
  phVal: z.number().finite().optional(),
  tempC: z.number().finite().optional(),
  doMgL: z.number().finite().optional(),
  orpMv: z.number().finite().optional(),
  tdsPpm: z.number().finite().optional(),
  turbidityNtu: z.number().finite().optional(),
  nh3TotalPpm: z.number().finite().optional(),
  no2Ppm: z.number().finite().optional(),
  no3Ppm: z.number().finite().optional(),
  khDkh: z.number().finite().optional(),
  ghDgh: z.number().finite().optional(),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;
