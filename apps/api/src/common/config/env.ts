import { z } from "zod";
import {
  isTelegramWebhookPlaceholder,
  resolveTelegramWebhookUrl
} from "../../modules/telegram/telegram-webhook.js";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    DOMAIN: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(3000),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    SESSION_SECRET: z.string().min(16),
    TELEGRAM_BOT_TOKEN: z.string().min(1).default("replace-me"),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(16).default("replace-me-telegram-secret"),
    TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
    OWNER_LOGIN: z.string().min(1).default("owner"),
    OWNER_PASSWORD: z.string().min(4).default("change-this-owner-password"),
    OWNER_DISPLAY_NAME: z.string().min(1).default("Owner")
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    const productionSecrets = [
      ["SESSION_SECRET", env.SESSION_SECRET],
      ["TELEGRAM_BOT_TOKEN", env.TELEGRAM_BOT_TOKEN],
      ["TELEGRAM_WEBHOOK_SECRET", env.TELEGRAM_WEBHOOK_SECRET],
      ["OWNER_PASSWORD", env.OWNER_PASSWORD]
    ] as const;

    for (const [name, value] of productionSecrets) {
      if (isPlaceholderValue(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message: `${name} must be replaced with a real production value`
        });
      }
    }

    const webhookUrl = resolveTelegramWebhookUrl({
      explicitUrl: env.TELEGRAM_WEBHOOK_URL,
      domain: env.DOMAIN
    });
    if (!webhookUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TELEGRAM_WEBHOOK_URL"],
        message:
          "Set TELEGRAM_WEBHOOK_URL or DOMAIN in production so Telegram webhook can be restored automatically"
      });
      return;
    }

    const explicitWebhookUrlProvided = Boolean(env.TELEGRAM_WEBHOOK_URL?.trim());
    const domainProvided = Boolean(env.DOMAIN?.trim());

    if (
      (explicitWebhookUrlProvided && isTelegramWebhookPlaceholder(env.TELEGRAM_WEBHOOK_URL)) ||
      (domainProvided && isTelegramWebhookPlaceholder(env.DOMAIN))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TELEGRAM_WEBHOOK_URL"],
        message:
          "TELEGRAM_WEBHOOK_URL / DOMAIN must be replaced with a real production value"
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}

function isPlaceholderValue(value: string) {
  return isTelegramWebhookPlaceholder(value);
}
