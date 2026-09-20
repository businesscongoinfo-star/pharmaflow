import "server-only";

import crypto from "crypto";
import { NextResponse } from "next/server";

import {
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
  config: Record<
    string,
    unknown
  >,
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
        JSON.stringify(
          config,
        ),
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

    const environment =
      String(
        formData.get(
          "environment",
        ) ?? "sandbox",
      ) === "production"
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
     * Toutes les autres valeurs du formulaire
     * deviennent la configuration du provider.
     *
     * Les valeurs sont stockées chiffrées.
     */
    const config: Record<
      string,
      unknown
    > = {};

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

      config[key] =
        value.trim();
    }

    /*
     * Conversion des noms utilisés par
     * les formulaires existants vers les noms
     * utilisés par les adapters.
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
      config.secret_key &&
      !config.secretKey
    ) {
      config.secretKey =
        config.secret_key;
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
      config.client_id &&
      !config.clientId
    ) {
      config.clientId =
        config.client_id;
    }

    if (
      config.client_secret &&
      !config.clientSecret
    ) {
      config.clientSecret =
        config.client_secret;
    }

    if (
      config.webhook_id &&
      !config.webhookId
    ) {
      config.webhookId =
        config.webhook_id;
    }

    const encryptedConfig =
      encryptConfig(
        config,
      );

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