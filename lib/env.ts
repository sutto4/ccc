import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  NEXT_PUBLIC_API_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_DISCORD_CLIENT_ID: z.string().optional(),
  SERVER_API_BASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASS: z.string().optional(),
  DB_NAME: z.string().optional(),
  PREMIUM_GUILD_IDS: z.string().optional(), // comma-separated list of premium guild IDs
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  console.warn(`Invalid environment configuration: ${issues}`);
}

const envRaw = (parsed.success ? parsed.data : process.env) as z.infer<typeof EnvSchema>;

export const env = {
  ...envRaw,
  NEXT_PUBLIC_API_BASE_URL: envRaw.NEXT_PUBLIC_API_BASE_URL || "/api",
} as const;

export type Env = typeof env;
