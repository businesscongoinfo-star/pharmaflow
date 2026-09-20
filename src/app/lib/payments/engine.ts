import "server-only";

import {
  getIntegrationConfig,
} from "@/app/lib/integrations/config";

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
  moko_afrika:
    mokoAfrikaAdapter,

  yabetoo:
    yabetooAdapter,

  gofreshpay:
    gofreshpayAdapter,
};

const DEFAULT_PROVIDER_PRIORITY: PaymentProviderCode[] =
  [
    "moko_afrika",
    "yabetoo",
    "gofreshpay",
  ];

function normalizeCountry(
  value?: string | null,
): string | undefined {
  const normalized =
    String(value ?? "")
      .trim()
      .toUpperCase();

  return normalized || undefined;
}

function normalizeCurrency(
  value?: string | null,
): string | undefined {
  const normalized =
    String(value ?? "")
      .trim()
      .toUpperCase();

  return normalized || undefined;
}

function normalizePaymentMethod(
  value?: string | null,
): string | undefined {
  const normalized =
    String(value ?? "")
      .trim()
      .toLowerCase();

  return normalized || undefined;
}

function getPaymentCountry(
  input: CreatePaymentInput,
): string | undefined {
  const metadata =
    input.metadata ?? {};

  const metadataCountryCode =
    typeof metadata.countryCode ===
    "string"
      ? metadata.countryCode
      : undefined;

  const metadataCountry =
    typeof metadata.country ===
    "string"
      ? metadata.country
      : undefined;

  return normalizeCountry(
    metadataCountryCode ??
      metadataCountry ??
      input.customer?.countryCode,
  );
}

function providerSupportsCountry(
  provider: PaymentProviderAdapter,
  country?: string,
): boolean {
  const countries =
    provider.config.countries;

  if (
    !countries ||
    countries.length === 0
  ) {
    return true;
  }

  if (!country) {
    return false;
  }

  return countries.some(
    (item) =>
      normalizeCountry(item) ===
      country,
  );
}

function providerSupportsCurrency(
  provider: PaymentProviderAdapter,
  currency: string,
): boolean {
  const currencies =
    provider.config.currencies;

  if (
    !currencies ||
    currencies.length === 0
  ) {
    return true;
  }

  const normalizedCurrency =
    normalizeCurrency(currency);

  if (!normalizedCurrency) {
    return false;
  }

  return currencies.some(
    (item) =>
      normalizeCurrency(item) ===
      normalizedCurrency,
  );
}

function providerSupportsPaymentMethod(
  provider: PaymentProviderAdapter,
  input: CreatePaymentInput,
): boolean {
  const configuredMethods =
    provider.config.paymentMethods;

  if (
    !configuredMethods ||
    configuredMethods.length === 0
  ) {
    return true;
  }

  const requestedType =
    normalizePaymentMethod(
      input.paymentMethodType,
    );

  const requestedMethod =
    normalizePaymentMethod(
      input.paymentMethod,
    );

  const methods =
    configuredMethods.map(
      (method) =>
        normalizePaymentMethod(
          method,
        ),
    );

  if (
    requestedType &&
    methods.includes(
      requestedType,
    )
  ) {
    return true;
  }

  if (
    requestedMethod &&
    methods.includes(
      requestedMethod,
    )
  ) {
    return true;
  }

  return false;
}

function getProviderScore(
  provider: PaymentProviderAdapter,
  input: CreatePaymentInput,
): number {
  let score = 0;

  const priorityIndex =
    DEFAULT_PROVIDER_PRIORITY.indexOf(
      provider.code,
    );

  if (priorityIndex >= 0) {
    score +=
      (DEFAULT_PROVIDER_PRIORITY.length -
        priorityIndex) *
      100;
  }

  const country =
    getPaymentCountry(input);

  const currency =
    normalizeCurrency(
      input.currency,
    );

  const requestedType =
    normalizePaymentMethod(
      input.paymentMethodType,
    );

  const requestedMethod =
    normalizePaymentMethod(
      input.paymentMethod,
    );

  if (
    country &&
    provider.config.countries?.some(
      (item) =>
        normalizeCountry(item) ===
        country,
    )
  ) {
    score += 50;
  }

  if (
    currency &&
    provider.config.currencies?.some(
      (item) =>
        normalizeCurrency(item) ===
        currency,
    )
  ) {
    score += 50;
  }

  if (
    requestedType &&
    provider.config.paymentMethods?.some(
      (item) =>
        normalizePaymentMethod(
          item,
        ) === requestedType,
    )
  ) {
    score += 75;
  }

  if (
    requestedMethod &&
    provider.config.paymentMethods?.some(
      (item) =>
        normalizePaymentMethod(
          item,
        ) === requestedMethod,
    )
  ) {
    score += 100;
  }

  return score;
}

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

function validateCreatePaymentInput(
  input: CreatePaymentInput,
): void {
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

/*
|--------------------------------------------------------------------------
| CONFIGURATION RUNTIME
|--------------------------------------------------------------------------
*/

async function isProviderRuntimeEnabled(
  provider: PaymentProviderCode,
): Promise<boolean> {
  const configuration =
    await getIntegrationConfig(
      provider as
        | "moko_afrika"
        | "yabetoo"
        | "gofreshpay",
    );

  if (configuration) {
    return configuration.isEnabled;
  }

  return (
    PROVIDERS[provider]
      ?.config.enabled !== false
  );
}

async function getRuntimeProviders(): Promise<
  PaymentProviderAdapter[]
> {
  const providers =
    Object.values(
      PROVIDERS,
    );

  const result: PaymentProviderAdapter[] =
    [];

  for (const provider of providers) {
    if (
      await isProviderRuntimeEnabled(
        provider.code,
      )
    ) {
      result.push(provider);
    }
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| COMPATIBLE PROVIDERS
|--------------------------------------------------------------------------
*/

export function getCompatiblePaymentProviders(
  input: CreatePaymentInput,
): PaymentProviderAdapter[] {
  validateCreatePaymentInput(
    input,
  );

  const country =
    getPaymentCountry(input);

  return getAvailablePaymentProviders()
    .filter((provider) =>
      providerSupportsCountry(
        provider,
        country,
      ),
    )
    .filter((provider) =>
      providerSupportsCurrency(
        provider,
        input.currency,
      ),
    )
    .filter((provider) =>
      providerSupportsPaymentMethod(
        provider,
        input,
      ),
    )
    .sort(
      (a, b) =>
        getProviderScore(
          b,
          input,
        ) -
        getProviderScore(
          a,
          input,
        ),
    );
}

async function getRuntimeCompatiblePaymentProviders(
  input: CreatePaymentInput,
): Promise<
  PaymentProviderAdapter[]
> {
  validateCreatePaymentInput(
    input,
  );

  const country =
    getPaymentCountry(input);

  const providers =
    await getRuntimeProviders();

  return providers
    .filter((provider) =>
      providerSupportsCountry(
        provider,
        country,
      ),
    )
    .filter((provider) =>
      providerSupportsCurrency(
        provider,
        input.currency,
      ),
    )
    .filter((provider) =>
      providerSupportsPaymentMethod(
        provider,
        input,
      ),
    )
    .sort(
      (a, b) =>
        getProviderScore(
          b,
          input,
        ) -
        getProviderScore(
          a,
          input,
        ),
    );
}

export function selectPaymentProvider(
  input: CreatePaymentInput,
): PaymentProviderAdapter {
  const compatible =
    getCompatiblePaymentProviders(
      input,
    );

  if (!compatible.length) {
    throw new Error(
      `Aucun fournisseur de paiement compatible pour ${getPaymentCountry(input) ?? "pays non spécifié"}, ${normalizeCurrency(input.currency) ?? "devise non spécifiée"} et ${input.paymentMethodType}.`,
    );
  }

  return compatible[0];
}

export function generateMerchantReference(): string {
  const date =
    new Date()
      .toISOString()
      .replace(
        /[-:TZ.]/g,
        "",
      )
      .slice(0, 17);

  const random =
    Math.random()
      .toString(36)
      .slice(2, 10)
      .toUpperCase();

  return `PF-${date}-${random}`;
}

export async function createPayment(
  provider: PaymentProviderCode,
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  validateCreatePaymentInput(
    input,
  );

  const runtimeEnabled =
    await isProviderRuntimeEnabled(
      provider,
    );

  if (!runtimeEnabled) {
    throw new Error(
      `Le fournisseur ${provider} est désactivé dans la configuration PharmaFlow.`,
    );
  }

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

export async function createPaymentWithBestProvider(
  input: CreatePaymentInput,
): Promise<
  CreatePaymentResult & {
    provider?: PaymentProviderCode;
  }
> {
  validateCreatePaymentInput(
    input,
  );

  const providers =
    await getRuntimeCompatiblePaymentProviders(
      input,
    );

  if (!providers.length) {
    throw new Error(
      `Aucun fournisseur de paiement compatible pour ${getPaymentCountry(input) ?? "pays non spécifié"}, ${normalizeCurrency(input.currency) ?? "devise non spécifiée"} et ${input.paymentMethodType}.`,
    );
  }

  let lastError:
    | Error
    | null = null;

  for (const provider of providers) {
    try {
      const result =
        await provider.createPayment(
          input,
        );

      const normalized =
        validateCreatePaymentResult(
          result,
        );

      if (
        normalized.success ||
        normalized.status ===
          "created" ||
        normalized.status ===
          "pending"
      ) {
        return {
          ...normalized,
          provider:
            provider.code,
        };
      }

      lastError =
        new Error(
          normalized.message ??
            `Le fournisseur ${provider.name} n'a pas pu créer le paiement.`,
        );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              String(error),
            );
    }
  }

  throw (
    lastError ??
    new Error(
      "Impossible de créer le paiement avec les fournisseurs disponibles.",
    )
  );
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

  const runtimeEnabled =
    await isProviderRuntimeEnabled(
      provider,
    );

  if (!runtimeEnabled) {
    throw new Error(
      `Le fournisseur ${provider} est désactivé.`,
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
      undefined &&
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

  if (
    normalized.currency &&
    input.expectedCurrency &&
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

  return normalized;
}

export function canActivateSubscription(
  status: PaymentTransactionStatus,
): boolean {
  return isSuccessfulPaymentStatus(
    status,
  );
}

export function isPaymentSuccessful(
  status: PaymentTransactionStatus,
): boolean {
  return isSuccessfulPaymentStatus(
    status,
  );
}

export function isPaymentPending(
  status: PaymentTransactionStatus,
): boolean {
  return isPendingPaymentStatus(
    status,
  );
}

export function isPaymentFailed(
  status: PaymentTransactionStatus,
): boolean {
  return isFailedPaymentStatus(
    status,
  );
}

export {
  normalizePaymentStatus,
};