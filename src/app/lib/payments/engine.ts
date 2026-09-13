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

/**
 * ============================================================
 * REGISTRE DES FOURNISSEURS
 * ============================================================
 *
 * Les adapters doivent être ajoutés ici lorsqu'ils sont prêts.
 *
 * Pour le moment :
 * - Moko Afrika
 * - Yabetoo
 * - GoFreshPay
 *
 * Les autres fournisseurs pourront être ajoutés sans changer
 * l'architecture générale :
 * - PawaPay
 * - CinetPay
 * - PayPal
 * - etc.
 */
const PROVIDERS: Record<
  PaymentProviderCode,
  PaymentProviderAdapter
> = {
  moko_afrika: mokoAfrikaAdapter,
  yabetoo: yabetooAdapter,
  gofreshpay: gofreshpayAdapter,
};

/**
 * ============================================================
 * PRIORITÉ DES FOURNISSEURS
 * ============================================================
 *
 * Cette priorité n'est PAS une garantie de compatibilité.
 *
 * Le moteur vérifie d'abord :
 * - pays
 * - devise
 * - moyen de paiement
 * - activation du provider
 *
 * avant de sélectionner le fournisseur.
 *
 * Moko Afrika est prioritaire.
 * Yabetoo vient ensuite.
 * GoFreshPay sert de fallback lorsqu'il est compatible.
 */
const DEFAULT_PROVIDER_PRIORITY: PaymentProviderCode[] = [
  "moko_afrika",
  "yabetoo",
  "gofreshpay",
];

/**
 * ============================================================
 * NORMALISATION
 * ============================================================
 */

function normalizeCountry(
  value?: string | null,
): string | undefined {
  const normalized = String(
    value ?? "",
  )
    .trim()
    .toUpperCase();

  return normalized || undefined;
}

function normalizeCurrency(
  value?: string | null,
): string | undefined {
  const normalized = String(
    value ?? "",
  )
    .trim()
    .toUpperCase();

  return normalized || undefined;
}

function normalizePaymentMethod(
  value?: string | null,
): string | undefined {
  const normalized = String(
    value ?? "",
  )
    .trim()
    .toLowerCase();

  return normalized || undefined;
}

/**
 * ============================================================
 * RÉCUPÉRATION DU PAYS
 * ============================================================
 *
 * Le pays peut venir :
 *
 * 1. metadata.countryCode
 * 2. metadata.country
 * 3. customer.countryCode
 */
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

/**
 * ============================================================
 * COMPATIBILITÉ PAYS
 * ============================================================
 */
function providerSupportsCountry(
  provider: PaymentProviderAdapter,
  country?: string,
): boolean {
  const countries =
    provider.config.countries;

  /**
   * Si le provider n'a pas encore déclaré
   * ses pays, on laisse son adapter effectuer
   * sa propre validation.
   */
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

/**
 * ============================================================
 * COMPATIBILITÉ DEVISE
 * ============================================================
 */
function providerSupportsCurrency(
  provider: PaymentProviderAdapter,
  currency: string,
): boolean {
  const currencies =
    provider.config.currencies;

  /**
   * Si aucune devise n'est encore déclarée,
   * ne pas bloquer l'adapter.
   *
   * L'API du provider pourra effectuer
   * sa propre validation.
   */
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

/**
 * ============================================================
 * COMPATIBILITÉ MOYEN DE PAIEMENT
 * ============================================================
 */
function providerSupportsPaymentMethod(
  provider: PaymentProviderAdapter,
  input: CreatePaymentInput,
): boolean {
  const configuredMethods =
    provider.config.paymentMethods;

  /**
   * Aucun moyen configuré :
   * laisser l'adapter décider.
   */
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
        normalizePaymentMethod(method),
    );

  /**
   * Correspondance avec le type général.
   *
   * Exemple :
   * card -> card
   * mobile_money -> mobile_money
   */
  if (
    requestedType &&
    methods.includes(requestedType)
  ) {
    return true;
  }

  /**
   * Correspondance avec une méthode précise.
   *
   * Exemple :
   * mpesa
   * airtel
   * orange
   * visa
   * mastercard
   */
  if (
    requestedMethod &&
    methods.includes(requestedMethod)
  ) {
    return true;
  }

  /**
   * Un provider déclarant mobile_money
   * accepte un paiement Mobile Money général.
   */
  if (
    requestedType ===
      "mobile_money" &&
    methods.includes(
      "mobile_money",
    )
  ) {
    return true;
  }

  /**
   * Un provider déclarant card
   * accepte un paiement par carte général.
   */
  if (
    requestedType === "card" &&
    methods.includes("card")
  ) {
    return true;
  }

  return false;
}

/**
 * ============================================================
 * SCORE PROVIDER
 * ============================================================
 *
 * Le score permet de choisir le meilleur provider
 * parmi ceux qui sont compatibles.
 */
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

  /**
   * Pays explicitement déclaré.
   */
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

  /**
   * Devise explicitement déclarée.
   */
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

  /**
   * Type de paiement.
   */
  if (
    requestedType &&
    provider.config.paymentMethods?.some(
      (item) =>
        normalizePaymentMethod(item) ===
        requestedType,
    )
  ) {
    score += 75;
  }

  /**
   * Méthode précise.
   */
  if (
    requestedMethod &&
    provider.config.paymentMethods?.some(
      (item) =>
        normalizePaymentMethod(item) ===
        requestedMethod,
    )
  ) {
    score += 100;
  }

  return score;
}

/**
 * ============================================================
 * GET PROVIDER
 * ============================================================
 */
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

/**
 * ============================================================
 * PROVIDERS DISPONIBLES
 * ============================================================
 */
export function getAvailablePaymentProviders(): PaymentProviderAdapter[] {
  return Object.values(
    PROVIDERS,
  ).filter(
    (provider) =>
      provider.config.enabled !== false,
  );
}

/**
 * Registre public des providers.
 */
export const paymentProviders =
  PROVIDERS;

/**
 * ============================================================
 * VALIDATION CREATE PAYMENT
 * ============================================================
 */
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

/**
 * ============================================================
 * VALIDATION RÉSULTAT CREATE
 * ============================================================
 */
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

/**
 * ============================================================
 * PROVIDERS COMPATIBLES
 * ============================================================
 *
 * Retourne les providers capables de traiter
 * la combinaison demandée :
 *
 * pays + devise + moyen de paiement.
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

/**
 * ============================================================
 * SÉLECTION DU MEILLEUR PROVIDER
 * ============================================================
 */
export function selectPaymentProvider(
  input: CreatePaymentInput,
): PaymentProviderAdapter {
  const compatible =
    getCompatiblePaymentProviders(
      input,
    );

  if (compatible.length === 0) {
    const country =
      getPaymentCountry(input) ??
      "non spécifié";

    const currency =
      normalizeCurrency(
        input.currency,
      ) ??
      "non spécifiée";

    const method =
      normalizePaymentMethod(
        input.paymentMethodType,
      ) ??
      "non spécifié";

    throw new Error(
      `Aucun fournisseur de paiement compatible pour le pays ${country}, la devise ${currency} et le moyen de paiement ${method}.`,
    );
  }

  return compatible[0];
}

/**
 * ============================================================
 * GÉNÉRATION RÉFÉRENCE MARCHAND
 * ============================================================
 */
export function generateMerchantReference(): string {
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

/**
 * ============================================================
 * CRÉATION DIRECTE AVEC UN PROVIDER
 * ============================================================
 *
 * Cette fonction conserve votre ancienne architecture.
 *
 * Elle est utile lorsqu'une route connaît déjà
 * le provider à utiliser.
 */
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

/**
 * ============================================================
 * CRÉATION AUTOMATIQUE
 * ============================================================
 *
 * Cette fonction utilise le nouveau routeur.
 *
 * Ordre :
 *
 * 1. trouver les providers compatibles
 * 2. choisir le meilleur
 * 3. essayer le provider
 * 4. fallback si la création échoue immédiatement
 *
 * IMPORTANT :
 *
 * Si un paiement est créé ou retourne pending/created,
 * nous ne lançons PAS un second paiement chez un autre
 * provider.
 */
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
    getCompatiblePaymentProviders(
      input,
    );

  if (providers.length === 0) {
    const country =
      getPaymentCountry(input) ??
      "non spécifié";

    const currency =
      normalizeCurrency(
        input.currency,
      ) ??
      "non spécifiée";

    throw new Error(
      `Aucun fournisseur de paiement compatible pour ${country}, ${currency} et ${input.paymentMethodType}.`,
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

      /**
       * Le paiement a été créé.
       *
       * Même si son statut est pending ou created,
       * on arrête le fallback.
       */
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

      /**
       * Échec immédiat :
       * essayer le prochain provider compatible.
       */
      lastError = new Error(
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

/**
 * ============================================================
 * VALIDATION RESULT VERIFY
 * ============================================================
 */
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

/**
 * ============================================================
 * VÉRIFICATION DU PAIEMENT
 * ============================================================
 */
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

  /**
   * Vérification du montant.
   */
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

  /**
   * Vérification de la devise.
   */
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

/**
 * ============================================================
 * STATUTS DE PAIEMENT
 * ============================================================
 */

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

/**
 * Export de la normalisation des statuts.
 */
export {
  normalizePaymentStatus,
};