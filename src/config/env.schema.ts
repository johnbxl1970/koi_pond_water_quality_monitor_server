import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HTTP_PORT: z.coerce.number().int().positive().default(3000),
  ADMIN_API_TOKEN: z.string().optional().default(''),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  MQTT_URL: z.string().url(),
  MQTT_USERNAME: z.string().optional().default(''),
  MQTT_PASSWORD: z.string().optional().default(''),
  MQTT_TELEMETRY_TOPIC: z.string().default('koi/+/telemetry'),

  OPEN_METEO_BASE_URL: z.string().url().default('https://api.open-meteo.com/v1/forecast'),

  FCM_PROJECT_ID: z.string().optional().default(''),
  FCM_CLIENT_EMAIL: z.string().optional().default(''),
  FCM_PRIVATE_KEY: z.string().optional().default(''),

  CA_OPERATIONAL_CERT_PEM: z.string().optional().default(''),
  CA_OPERATIONAL_KEY_PEM: z.string().optional().default(''),
  CA_ATTESTATION_CERT_PEM: z.string().optional().default(''),
  CA_OPERATIONAL_CERT_DAYS: z.coerce.number().int().positive().default(365),
  QR_SIGNING_PRIVATE_KEY_PEM: z.string().optional().default(''),
  QR_SIGNING_PUBLIC_KEY_PEM: z.string().optional().default(''),
  CLAIM_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PENDING_CSR_TTL_SECONDS: z.coerce.number().int().positive().default(600),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
