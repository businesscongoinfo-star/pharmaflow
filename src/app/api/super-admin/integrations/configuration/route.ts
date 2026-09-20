import "server-only";

import crypto from "crypto";
import { NextResponse } from "next/server";

import {
  getIntegrationConfig,
  normalizeIntegrationProvider,
} from "@/app/lib/integrations/config";

import { createAdminClient } from "@/app/lib/supabase/admin";

import {
  requireSuperAdminApi,
} from "@/app/lib/super-admin/auth";

/*
|--------------------------------------------------------------------------
| CHIFFREMENT
|--------------------------------------------------------------------------
*/

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

function encryptConfig(
  config: Record<string, unknown>,
): {
  encrypted: string;
} {
  const key =
    getEncryptionKey();

  const iv =
    crypto.randomBytes(12);

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      key,
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        JSON.stringify(config),
        "utf8",
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return {
    encrypted: [
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted.toString("hex"),
    ].join("."),
  };
}

/*
|--------------------------------------------------------------------------
| NORMALISATION DES VALEURS
|--------------------------------------------------------------------------
|
| Le formulaire peut envoyer des noms historiques comme :
|
| MOKO_AFRIKA_MERCHANT_ID
|
| tandis que le Payment Engine utilise :
|
| merchantId
|
| On conserve les deux possibilités mais on enregistre
| les clés canoniques utilisées par les adapters.
|--------------------------------------------------------------------------
*/

function normalizeConfigKey(
  provider: string,
  key: string,
): string {
  const normalized =
    key.trim();

  if (provider === "moko_afrika") {
    const mokoAliases: Record<
      string,
      string
    > = {
      MOKO_AFRIKA_MODE:
        "mode",

      MOKO_AFRIKA_BASE_URL:
        "baseUrl",

      MOKO_AFRIKA_MERCHANT_ID:
        "merchantId",

      MOKO_AFRIKA_MERCHANT_SECRET:
        "merchantSecret",

      MOKO_AFRIKA_CALLBACK_URL:
        "callbackUrl",

      MOKO_AFRIKA_WEBHOOK_AES_KEY:
        "webhookAesKey",

      MOKO_AFRIKA_WEBHOOK_HMAC_KEY:
        "webhookHmacKey",

      MOKO_AFRIKA_CARD_BASE_URL:
        "cardBaseUrl",

      MOKO_AFRIKA_CARD_API_URL:
        "cardBaseUrl",

      MOKO_AFRIKA_CARD_API_KEY:
        "cardApiKey",

      MOKO_AFRIKA_CARD_API_SECRET:
        "cardApiSecret",

      MOKO_AFRIKA_CARD_CALLBACK_SECRET:
        "cardCallbackSecret",

      MOKO_AFRIKA_CARD_CALLBACK_URL:
        "cardCallbackUrl",

      MOKO_AFRIKA_CARD_RETURN_URL:
        "cardReturnUrl",

      MOKO_AFRIKA_CARD_CANCEL_URL:
        "cardCancelUrl",
    };

    return (
      mokoAliases[normalized] ??
      normalized
    );
  }

  if (provider === "yabetoo") {
    const aliases: Record<
      string,
      string
    > = {
      YABETOO_MODE:
        "mode",

      YABETOO_BASE_URL:
        "baseUrl",

      YABETOO_API_KEY:
        "apiKey",

      YABETOO_SECRET_KEY:
        "secretKey",

      YABETOO_CALLBACK_URL:
        "callbackUrl",
    };

    return (
      aliases[normalized] ??
      normalized
    );
  }

  if (provider === "gofreshpay") {
    const aliases: Record<
      string,
      string
    > = {
      GOFRESHPAY_MODE:
        "mode",

      GOFRESHPAY_BASE_URL:
        "baseUrl",

      GOFRESHPAY_MERCHANT_ID:
        "merchantId",

      GOFRESHPAY_MERCHANT_SECRET:
        "merchantSecret",

      GOFRESHPAY_CALLBACK_URL:
        "callbackUrl",

      FRESHPAY_SECRET_KEY:
        "secretKey",

      FRESHPAY_HMAC_KEY:
        "hmacKey",
    };

    return (
      aliases[normalized] ??
      normalized
    );
  }

  if (provider === "supabase") {
    const aliases: Record<
      string,
      string
    > = {
      NEXT_PUBLIC_SUPABASE_URL:
        "supabaseUrl",

      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        "supabaseAnonKey",

      SUPABASE_SERVICE_ROLE_KEY:
        "supabaseServiceRoleKey",
    };

    return (
      aliases[normalized] ??
      normalized
    );
  }

  if (provider === "nextjs") {
    const aliases: Record<
      string,
      string
    > = {
      NEXT_PUBLIC_APP_URL:
        "appUrl",
    };

    return (
      aliases[normalized] ??
      normalized
    );
  }

  return normalized;
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request,
) {
  const admin =
    await requireSuperAdminApi();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Accès administrateur requis.",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const formData =
      await request.formData();

    const rawProvider =
      String(
        formData.get(
          "provider",
        ) ?? "",
      ).trim();

    if (!rawProvider) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le fournisseur est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    const provider =
      normalizeIntegrationProvider(
        rawProvider,
      );

    const environmentValue =
      String(
        formData.get(
          "environment",
        ) ?? "sandbox",
      ).trim();

    const environment =
      environmentValue ===
      "production"
        ? "production"
        : "sandbox";

    const isEnabled =
      String(
        formData.get(
          "isEnabled",
        ) ?? "true",
      ) === "true";

    const allowedProviders = [
      "moko_afrika",
      "yabetoo",
      "gofreshpay",
      "paypal",
      "supabase",
      "nextjs",
    ];

    if (
      !allowedProviders.includes(
        provider,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Fournisseur non autorisé : ${provider}`,
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | RÉCUPÉRATION DE LA CONFIGURATION EXISTANTE
    |--------------------------------------------------------------------------
    |
    | Important :
    | si le Super Admin modifie uniquement la Card API Key,
    | on ne doit pas supprimer le Merchant Secret déjà enregistré.
    |
    */

    let existingConfig: Record<
      string,
      unknown
    > = {};

    try {
      const existing =
        await getIntegrationConfig(
          provider,
        );

      if (existing) {
        existingConfig = {
          ...existing.config,
        };
      }
    } catch (error) {
      console.warn(
        "[IntegrationConfig] Impossible de récupérer la configuration existante.",
        error,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CONSTRUCTION DE LA CONFIGURATION
    |--------------------------------------------------------------------------
    */

    const config: Record<
      string,
      unknown
    > = {
      ...existingConfig,
    };

    for (
      const [
        key,
        value,
      ] of formData.entries()
    ) {
      if (
        key === "provider" ||
        key === "environment" ||
        key === "isEnabled"
      ) {
        continue;
      }

      if (
        typeof value !==
        "string"
      ) {
        continue;
      }

      /*
       * Un champ secret laissé vide signifie :
       * "conserver l'ancienne valeur".
       */
      if (
        !value.trim()
      ) {
        continue;
      }

      const normalizedKey =
        normalizeConfigKey(
          provider,
          key,
        );

      config[
        normalizedKey
      ] =
        value.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | COMPATIBILITÉ DES ANCIENNES CLÉS
    |--------------------------------------------------------------------------
    */

    if (
      config.merchant_id &&
      !config.merchantId
    ) {
      config.merchantId =
        config.merchant_id;
    }

    if (
      config.merchant_secret &&
      !config.merchantSecret
    ) {
      config.merchantSecret =
        config.merchant_secret;
    }

    if (
      config.base_url &&
      !config.baseUrl
    ) {
      config.baseUrl =
        config.base_url;
    }

    if (
      config.callback_url &&
      !config.callbackUrl
    ) {
      config.callbackUrl =
        config.callback_url;
    }

    if (
      config.webhook_aes_key &&
      !config.webhookAesKey
    ) {
      config.webhookAesKey =
        config.webhook_aes_key;
    }

    if (
      config.webhook_hmac_key &&
      !config.webhookHmacKey
    ) {
      config.webhookHmacKey =
        config.webhook_hmac_key;
    }

    if (
      config.card_api_key &&
      !config.cardApiKey
    ) {
      config.cardApiKey =
        config.card_api_key;
    }

    if (
      config.card_api_secret &&
      !config.cardApiSecret
    ) {
      config.cardApiSecret =
        config.card_api_secret;
    }

    if (
      config.card_callback_secret &&
      !config.cardCallbackSecret
    ) {
      config.cardCallbackSecret =
        config.card_callback_secret;
    }

    if (
      config.card_callback_url &&
      !config.cardCallbackUrl
    ) {
      config.cardCallbackUrl =
        config.card_callback_url;
    }

    if (
      config.card_return_url &&
      !config.cardReturnUrl
    ) {
      config.cardReturnUrl =
        config.card_return_url;
    }

    if (
      config.card_cancel_url &&
      !config.cardCancelUrl
    ) {
      config.cardCancelUrl =
        config.card_cancel_url;
    }

    /*
    |--------------------------------------------------------------------------
    | CHIFFREMENT
    |--------------------------------------------------------------------------
    */

    const encryptedConfig =
      encryptConfig(
        config,
      );

    /*
    |--------------------------------------------------------------------------
    | ENREGISTREMENT SUPABASE
    |--------------------------------------------------------------------------
    */

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from(
        "platform_integration_configs",
      )
      .upsert(
        {
          provider,

          environment,

          config:
            encryptedConfig,

          is_enabled:
            isEnabled,

          configured_by:
            admin.user_id,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "provider",
        },
      )
      .select(
        "provider, environment, is_enabled, updated_at",
      )
      .single();

    if (error) {
      console.error(
        "SAVE INTEGRATION CONFIG:",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible d'enregistrer la configuration.",
          error:
            error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Configuration enregistrée avec succès.",

        configuration: {
          provider:
            data.provider,

          environment:
            data.environment,

          isEnabled:
            data.is_enabled,

          updatedAt:
            data.updated_at,

          configured:
            true,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "INTEGRATION CONFIGURATION ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Erreur interne.",
      },
      {
        status: 500,
      },
    );
  }
}