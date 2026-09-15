import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const sourcePath = process.argv[2] ?? "apps/shop-backend/.env";
const serverIp = process.argv[3];

if (!serverIp) {
  throw new Error("Server IP is required");
}

const parsed = Object.fromEntries(
  readFileSync(sourcePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      return [key, value];
    }),
);

for (const key of [
  "SMSIR_API_KEY",
  "SMSIR_TEMPLATE_ID",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
]) {
  if (!parsed[key]) throw new Error(`${key} is missing from ${sourcePath}`);
}

const quote = (value) => JSON.stringify(String(value));
const generated = {
  PUBLIC_API_URL: `http://${serverIp}:5000/api`,
  PUBLIC_MEDIA_URL: `http://${serverIp}:5000`,
  POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
  NODE_ENV: "development",
  JWT_SECRET: randomBytes(32).toString("hex"),
  JWT_EXPIRES_IN: parsed.JWT_EXPIRES_IN || "7d",
  OTP_PEPPER: randomBytes(32).toString("hex"),
  SMS_PROVIDER: "smsir",
  SMSIR_API_KEY: parsed.SMSIR_API_KEY,
  SMSIR_TEMPLATE_ID: parsed.SMSIR_TEMPLATE_ID,
  SMSIR_CODE_PARAMETER: parsed.SMSIR_CODE_PARAMETER || "Code",
  SEED_ADMIN: "true",
  SEED_DEMO: "true",
  ADMIN_EMAIL: parsed.ADMIN_EMAIL,
  ADMIN_PASSWORD: parsed.ADMIN_PASSWORD,
  ADMIN_PHONE: parsed.ADMIN_PHONE || "09120000000",
  ADMIN_PANEL_URL: `http://${serverIp}:8080`,
  CORS_ORIGINS: `http://${serverIp},http://${serverIp}:8080`,
  PAYMENT_PROVIDER: "mock",
  PAYMENT_CALLBACK_BASE_URL: `http://${serverIp}:5000`,
  STOREFRONT_URL: `http://${serverIp}`,
  ZARINPAL_MERCHANT_ID: "",
  ZARINPAL_SANDBOX: "false",
  TELEGRAM_BOT_TOKEN: parsed.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: parsed.TELEGRAM_CHAT_ID || "",
  TELEGRAM_API_BASE: parsed.TELEGRAM_API_BASE || "https://api.telegram.org",
};

process.stdout.write(
  `${Object.entries(generated)
    .map(([key, value]) => `${key}=${quote(value)}`)
    .join("\n")}\n`,
);
