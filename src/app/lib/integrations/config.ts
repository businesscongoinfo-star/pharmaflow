import "server-only";

import crypto from "crypto";

import { createAdminClient } from "@/app/lib/supabase/admin";

export type IntegrationProvider =
  | "moko_afrika"
  | "yabetoo"
  | "gofreshpay"
  | "paypal"
  | "supabase"
  | "nextjs";

export type IntegrationEnvironment =
  | "sandbox"
  | "production";

export type RuntimeIntegrationConfig = {
  provider: IntegrationProvider;
  environment: IntegrationEnvironment;
  isEnabled: boolean;
  config: Record<string, unknown>;
};

type StoredIntegrationRow = {
  provider: string;
  environment: string;
  config: unknown;
  is_enabled: boolean;
};

type EncryptedConfig = {
  encrypted: string;
};

function getEncryptionKey(): Buffer {
  const secret =
    process.env.PHARMAFLOW_CONFIG_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error(
      "PHARMAFLOW_CONFIG_ENCRYPTION_KEY est manquante.",
    );
  }

  return crypto
    .createHash("sha256")
    .update(secret, "utf8")
    .digest();
}

function decryptValue(
  value: unknown,
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    const objectValue =
      value as EncryptedConfig;

    if (
      typeof objectValue.encrypted ===
      "string"
    ) {
      return decryptString(
        objectValue.encrypted,
      );
    }

    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function decryptString(
  encrypted: string,
): Record<string, unknown> {
  const parts =
    encrypted.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Configuration chiffrée invalide.",
    );
  }

  const [
    ivHex,
    authTagHex,
    encryptedHex,
  ] = parts;

  const key =
    getEncryptionKey();

  const iv =
    Buffer.from(ivHex, "hex");

  const authTag =
    Buffer.from(
      authTagHex,
      "hex",
    );

  const encryptedData =
    Buffer.from(
      encryptedHex,
      "hex",
    );

  const decipher =
    crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      iv,
    );

  decipher.setAuthTag(
    authTag,
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        encryptedData,
      ),
      decipher.final(),
    ]).toString("utf8");

  const parsed =
    JSON.parse(
      decrypted,
    );

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return {};
  }

  return parsed as Record<
    string,
    unknown
  >;
}

/**
 * Convertit les anciens identifiants éventuels
 * de l'interface Super Admin vers les vrais codes
 * utilisés par Payment Engine.
 */
export function normalizeIntegrationProvider(
  provider: string,
): IntegrationProvider {
  const normalized =
    provider
      .trim()
      .toLowerCase();

  switch (normalized) {
    case "moko-afrika":
    case "moko_afrika":
    case "mokoafrika":
      return "moko_afrika";

    case "yabeto":
    case "yabetoo":
      return "yabetoo";

    case "gofreshpay":
    case "go-fresh-pay":
      return "gofreshpay";

    case "paypal":
      return "paypal";

    case "supabase":
      return "supabase";

    case "nextjs":
      return "nextjs";

    default:
      return normalized as IntegrationProvider;
  }
}

function normalizeEnvironment(
  value: unknown,
): IntegrationEnvironment {
  return value ===
    "production"
    ? "production"
    : "sandbox";
}

/**
 * Retourne la configuration enregistrée
 * dans platform_integration_configs.
 *
 * Important :
 * cette fonction est SERVER ONLY.
 */
export async function getIntegrationConfig(
  provider: IntegrationProvider,
): Promise<RuntimeIntegrationConfig | null> {
  const normalizedProvider =
    normalizeIntegrationProvider(
      provider,
    );

  const supabase =
    createAdminClient();

  const { data, error } =
    await supabase
      .from(
        "platform_integration_configs",
      )
      .select(
        "provider, environment, config, is_enabled",
      )
      .eq(
        "provider",
        normalizedProvider,
      )
      .maybeSingle();

  if (error) {
    console.error(
      "[IntegrationConfig] Lecture impossible:",
      error,
    );

    return null;
  }

  if (!data) {
    return null;
  }

  const row =
    data as StoredIntegrationRow;

  let config: Record<
    string,
    unknown
  > = {};

  try {
    config =
      decryptValue(
        row.config,
      );
  } catch (error) {
    console.error(
      `[IntegrationConfig] Déchiffrement impossible pour ${normalizedProvider}:`,
      error,
    );

    return null;
  }

  return {
    provider:
      normalizedProvider,

    environment:
      normalizeEnvironment(
        row.environment,
      ),

    isEnabled:
      Boolean(
        row.is_enabled,
      ),

    config,
  };
}

/**
 * Fusionne la configuration Super Admin
 * avec les variables d'environnement existantes.
 *
 * Priorité :
 *
 * 1. configuration Super Admin
 * 2. .env.local
 * 3. valeur par défaut
 */
export async function getRuntimeIntegrationValue(
  provider: IntegrationProvider,
  key: string,
  envValue?: string,
): Promise<string> {
  const configuration =
    await getIntegrationConfig(
      provider,
    );

  const value =
    configuration?.config?.[
      key
    ];

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return (
    envValue?.trim() ??
    ""
  );
}

/**
 * Récupère une configuration complète
 * avec possibilité de fallback.
 */
export async function getRuntimeIntegration(
  provider: IntegrationProvider,
): Promise<RuntimeIntegrationConfig> {
  const configuration =
    await getIntegrationConfig(
      provider,
    );

  if (configuration) {
    return configuration;
  }

  return {
    provider,
    environment:
      "sandbox",
    isEnabled: false,
    config: {},
  };
}