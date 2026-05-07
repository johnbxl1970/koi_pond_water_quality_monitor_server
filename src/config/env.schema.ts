import { readFileSync } from 'node:fs';
import { z } from 'zod';

/**
 * Cert/key material is loaded from files, not from inline env strings —
 * inline PEMs have perennial newline-escaping and line-ending problems in
 * every runtime, and every production secret manager mounts secrets as
 * files anyway.
 *
 * An env var ending in `_FILE` holds a path; the transform reads the file
 * synchronously at boot and hands the content to the rest of the app. An
 * empty env var resolves to an empty string (disabling the feature rather
 * than crashing).
 */
const fileField = z
  .string()
  .optional()
  .default('')
  .transform((p) => (p ? readFileSync(p, 'utf8') : ''));

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

  CA_OPERATIONAL_CERT_FILE: fileField,
  CA_OPERATIONAL_KEY_FILE: fileField,
  CA_ATTESTATION_CERT_FILE: fileField,
  CA_OPERATIONAL_CERT_DAYS: z.coerce.number().int().positive().default(365),
  QR_SIGNING_PRIVATE_KEY_FILE: fileField,
  QR_SIGNING_PUBLIC_KEY_FILE: fileField,
  CLAIM_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PENDING_CSR_TTL_SECONDS: z.coerce.number().int().positive().default(600),

  ML_SIDECAR_URL: z.string().url().default('http://localhost:8000'),
  ML_SIDECAR_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
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
