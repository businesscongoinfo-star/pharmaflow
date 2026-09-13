export type PaymentProviderCode =
  | "yabetoo"
  | "gofreshpay"
  | "moko_afrika"
  | string;

export type PaymentProviderMode =
  | "sandbox"
  | "production";

export type PaymentTransactionStatus =
  | "created"
  | "pending"
  | "successful"
  | "failed"
  | "cancelled"
  | "expired";

export type PaymentMethodType =
  | "mobile_money"
  | "card"
  | "bank_transfer"
  | "wallet"
  | "other";

export type ProviderPaymentMethod =
  | "mpesa"
  | "airtel"
  | "orange"
  | "africell"
  | "mtn"
  | "vodacom"
  | "moov"
  | "wave"
  | "free_money"
  | "mobile_money"
  | "visa"
  | "mastercard"
  | "card"
  | "bank_transfer"
  | "wallet"
  | string;

export type PaymentCustomer = {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type PaymentContext = {
  pharmacyId: string;
  subscriptionId?: string;
  merchantReference: string;
  amount: number;
  currency: string;

  /**
   * Type général du moyen de paiement.
   *
   * mobile_money = Mobile Money
   * card         = Visa / Mastercard / autres cartes supportées
   */
  paymentMethodType: PaymentMethodType;

  /**
   * Méthode précise du provider.
   *
   * Exemples :
   * mpesa, airtel, orange, mtn, visa,
   * mastercard, card, mobile_money...
   */
  paymentMethod?: ProviderPaymentMethod;

  customer?: PaymentCustomer;

  description?: string;

  /**
   * Informations complémentaires propres
   * au provider ou au paiement.
   */
  metadata?: Record<string, unknown>;
};

export type CreatePaymentInput = {
  pharmacyId: string;
  subscriptionId?: string;
  merchantReference: string;
  amount: number;
  currency: string;

  /**
   * Moyen de paiement choisi par le client.
   */
  paymentMethodType: PaymentMethodType;

  /**
   * Méthode précise lorsque nécessaire.
   */
  paymentMethod?: ProviderPaymentMethod;

  customer?: PaymentCustomer;

  description?: string;

  /**
   * Données complémentaires :
   *
   * - pays
   * - adresse
   * - ville
   * - téléphone
   * - informations carte
   * - informations Mobile Money
   * - données provider
   */
  metadata?: Record<string, unknown>;
};

export type CreatePaymentResult = {
  success: boolean;

  status: PaymentTransactionStatus;

  providerTransactionId?: string | null;

  merchantReference?: string | null;

  /**
   * URL de paiement hébergée.
   *
   * Principalement utilisée pour :
   * - carte bancaire
   * - checkout externe
   * - wallet
   */
  checkoutUrl?: string | null;

  /**
   * Secret client éventuellement fourni
   * par certains providers.
   */
  clientSecret?: string | null;

  message?: string | null;

  errorCode?: string | null;

  metadata?: Record<string, unknown>;
};

export type VerifyPaymentInput = {
  pharmacyId: string;

  merchantReference?: string;

  providerTransactionId?: string;

  /**
   * Montant attendu côté PharmaFlow.
   */
  expectedAmount?: number;

  /**
   * Devise attendue côté PharmaFlow.
   */
  expectedCurrency?: string;

  metadata?: Record<string, unknown>;
};

export type VerifyPaymentResult = {
  success: boolean;

  status: PaymentTransactionStatus;

  providerTransactionId?: string | null;

  merchantReference?: string | null;

  amount?: number | null;

  currency?: string | null;

  message?: string | null;

  failureReason?: string | null;

  metadata?: Record<string, unknown>;
};

export type PaymentWebhookResult = {
  success: boolean;

  status: PaymentTransactionStatus;

  merchantReference?: string | null;

  providerTransactionId?: string | null;

  amount?: number | null;

  currency?: string | null;

  paymentMethod?:
    | ProviderPaymentMethod
    | null;

  message?: string | null;

  failureReason?: string | null;

  metadata?: Record<string, unknown>;
};

/**
 * Configuration générale d'un provider.
 *
 * IMPORTANT :
 * countries et currencies représentent les capacités
 * réellement configurées pour ce provider.
 *
 * Le moteur de paiement pourra ensuite choisir
 * automatiquement le provider compatible avec :
 *
 * pays + devise + moyen de paiement.
 */
export type PaymentProviderConfig = {
  code: PaymentProviderCode;

  name: string;

  mode: PaymentProviderMode;

  /**
   * URL principale du provider.
   */
  baseUrl?: string;

  /**
   * Pays explicitement configurés.
   *
   * Exemple :
   * ["CD", "CG", "CM"]
   *
   * Un provider international peut utiliser
   * une liste plus large.
   */
  countries?: string[];

  /**
   * Devises réellement disponibles.
   *
   * Exemple :
   * ["USD", "CDF"]
   */
  currencies?: string[];

  /**
   * Moyens de paiement supportés.
   *
   * Exemple :
   * [
   *   "mobile_money",
   *   "mpesa",
   *   "airtel",
   *   "orange",
   *   "card",
   *   "visa",
   *   "mastercard"
   * ]
   */
  paymentMethods?: ProviderPaymentMethod[];

  /**
   * Active ou désactive le provider.
   */
  enabled?: boolean;
};

/**
 * Adaptateur standardisé pour chaque fournisseur.
 *
 * Tous les providers doivent respecter cette interface.
 *
 * Cela permet à PharmaFlow d'ajouter progressivement :
 *
 * - Moko Afrika
 * - Yabetoo
 * - GoFreshPay
 * - PawaPay
 * - CinetPay
 * - PayPal
 * - autres providers internationaux
 *
 * sans changer toute l'architecture.
 */
export type PaymentProviderAdapter = {
  code: PaymentProviderCode;

  name: string;

  config: PaymentProviderConfig;

  createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult>;

  verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult>;

  parseWebhook?(
    payload: unknown,
    headers?: Headers,
  ): PaymentWebhookResult;

  verifyWebhookSignature?(
    payload: string,
    headers: Headers,
  ): boolean;
};

/**
 * Normalise les statuts provenant des différents
 * fournisseurs de paiement.
 */
export function normalizePaymentStatus(
  status: unknown,
): PaymentTransactionStatus {
  const value = String(
    status ?? "",
  )
    .trim()
    .toLowerCase();

  if (
    [
      "successful",
      "success",
      "succeeded",
      "paid",
      "completed",
      "complete",
      "approved",
      "successful_payment",
      "payment_success",
      "payment_completed",
    ].includes(value)
  ) {
    return "successful";
  }

  if (
    [
      "failed",
      "failure",
      "error",
      "declined",
      "rejected",
      "payment_failed",
    ].includes(value)
  ) {
    return "failed";
  }

  if (
    [
      "cancelled",
      "canceled",
      "cancel",
      "payment_cancelled",
    ].includes(value)
  ) {
    return "cancelled";
  }

  if (
    [
      "expired",
      "expire",
      "payment_expired",
    ].includes(value)
  ) {
    return "expired";
  }

  if (
    [
      "created",
      "new",
      "initialized",
      "initiated",
    ].includes(value)
  ) {
    return "created";
  }

  return "pending";
}

/**
 * Vérifie si un paiement est définitivement réussi.
 */
export function isSuccessfulPaymentStatus(
  status: unknown,
): boolean {
  return (
    normalizePaymentStatus(status) ===
    "successful"
  );
}

/**
 * Vérifie si le paiement est encore en cours.
 */
export function isPendingPaymentStatus(
  status: unknown,
): boolean {
  const normalized =
    normalizePaymentStatus(status);

  return (
    normalized === "pending" ||
    normalized === "created"
  );
}

/**
 * Vérifie si le paiement est définitivement échoué,
 * annulé ou expiré.
 */
export function isFailedPaymentStatus(
  status: unknown,
): boolean {
  const normalized =
    normalizePaymentStatus(status);

  return (
    normalized === "failed" ||
    normalized === "cancelled" ||
    normalized === "expired"
  );
}