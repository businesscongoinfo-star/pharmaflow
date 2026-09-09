import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  PaymentProviderCode,
  PaymentTransactionStatus,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./types";

import {
  isFailedPaymentStatus,
  isPendingPaymentStatus,
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
} from "./types";

import { yabetooAdapter } from "./yabetoo";
import { gofreshpayAdapter } from "./gofreshpay";
import { mokoAfrikaAdapter } from "./moko-afrika";

const PROVIDERS: Record<
  PaymentProviderCode,
  PaymentProviderAdapter
> = {
  yabetoo: yabetooAdapter,
  gofreshpay: gofreshpayAdapter,
  moko_afrika: mokoAfrikaAdapter,
};

export function getPaymentProvider(
  provider: PaymentProviderCode,
): PaymentProviderAdapter {
  const adapter =
    PROVIDERS[provider];

  if (!adapter) {
    throw new Error(
      `Fournisseur de paiement non supporté : ${provider}`,
    );
  }

  if (
    adapter.config.enabled === false
  ) {
    throw new Error(
      `Le fournisseur ${provider} est désactivé.`,
    );
  }

  return adapter;
}

export function getAvailablePaymentProviders(): PaymentProviderAdapter[] {
  return Object.values(
    PROVIDERS,
  ).filter(
    (provider) =>
      provider.config.enabled !== false,
  );
}

export const paymentProviders =
  PROVIDERS;

export function generateMerchantReference() {
  const now = new Date();

  const date =
    now
      .toISOString()
      .replace(
        /[-:TZ.]/g,
        "",
      )
      .slice(0, 17);

  const random = Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase();

  return `PF-${date}-${random}`;
}

function validateCreatePaymentInput(
  input: CreatePaymentInput,
) {
  if (!input.pharmacyId) {
    throw new Error(
      "pharmacyId est obligatoire.",
    );
  }

  if (!input.merchantReference) {
    throw new Error(
      "merchantReference est obligatoire.",
    );
  }

  if (
    !Number.isFinite(
      input.amount,
    ) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Le montant du paiement est invalide.",
    );
  }

  if (
    !input.currency ||
    input.currency.trim()
      .length !== 3
  ) {
    throw new Error(
      "La devise du paiement est invalide.",
    );
  }

  if (!input.paymentMethodType) {
    throw new Error(
      "Le type de paiement est obligatoire.",
    );
  }
}

function validateCreatePaymentResult(
  result: CreatePaymentResult,
): CreatePaymentResult {
  return {
    ...result,
    status:
      normalizePaymentStatus(
        result.status,
      ),
  };
}

function validateVerifyPaymentResult(
  result: VerifyPaymentResult,
): VerifyPaymentResult {
  return {
    ...result,
    status:
      normalizePaymentStatus(
        result.status,
      ),
  };
}

export async function createPayment(
  provider: PaymentProviderCode,
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  validateCreatePaymentInput(
    input,
  );

  const adapter =
    getPaymentProvider(
      provider,
    );

  const result =
    await adapter.createPayment(
      input,
    );

  return validateCreatePaymentResult(
    result,
  );
}

export async function verifyPayment(
  provider: PaymentProviderCode,
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  if (!input.pharmacyId) {
    throw new Error(
      "pharmacyId est obligatoire.",
    );
  }

  if (
    !input.merchantReference &&
    !input.providerTransactionId
  ) {
    throw new Error(
      "merchantReference ou providerTransactionId est obligatoire.",
    );
  }

  const adapter =
    getPaymentProvider(
      provider,
    );

  const result =
    await adapter.verifyPayment(
      input,
    );

  const normalized =
    validateVerifyPaymentResult(
      result,
    );

  if (
    normalized.amount !==
      undefined &&
    normalized.amount !==
      null &&
    input.expectedAmount !==
      undefined
  ) {
    if (
      Number(
        normalized.amount,
      ) !==
      Number(
        input.expectedAmount,
      )
    ) {
      return {
        ...normalized,
        success: false,
        status: "failed",
        failureReason:
          "Le montant retourné par le fournisseur ne correspond pas au montant attendu.",
      };
    }
  }

  if (
    normalized.currency &&
    input.expectedCurrency
  ) {
    if (
      normalized.currency
        .trim()
        .toUpperCase() !==
      input.expectedCurrency
        .trim()
        .toUpperCase()
    ) {
      return {
        ...normalized,
        success: false,
        status: "failed",
        failureReason:
          "La devise retournée par le fournisseur ne correspond pas à la devise attendue.",
      };
    }
  }

  return normalized;
}

export function canActivateSubscription(
  status: PaymentTransactionStatus,
) {
  return isSuccessfulPaymentStatus(
    status,
  );
}

export function isPaymentSuccessful(
  status: PaymentTransactionStatus,
) {
  return isSuccessfulPaymentStatus(
    status,
  );
}

export function isPaymentPending(
  status: PaymentTransactionStatus,
) {
  return isPendingPaymentStatus(
    status,
  );
}

export function isPaymentFailed(
  status: PaymentTransactionStatus,
) {
  return isFailedPaymentStatus(
    status,
  );
}

export {
  normalizePaymentStatus,
};