export type PaymentProviderCode =
  | "yabetoo"
  | "gofreshpay"
  | "moko_afrika";

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
  | "mobile_money"
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
};

export type PaymentContext = {
  pharmacyId: string;
  subscriptionId?: string;
  merchantReference: string;
  amount: number;
  currency: string;
  paymentMethodType: PaymentMethodType;
  paymentMethod?: ProviderPaymentMethod;
  customer?: PaymentCustomer;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type CreatePaymentInput = {
  pharmacyId: string;
  subscriptionId?: string;
  merchantReference: string;
  amount: number;
  currency: string;
  paymentMethodType: PaymentMethodType;
  paymentMethod?: ProviderPaymentMethod;
  customer?: PaymentCustomer;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type CreatePaymentResult = {
  success: boolean;
  status: PaymentTransactionStatus;
  providerTransactionId?: string | null;
  merchantReference?: string | null;
  checkoutUrl?: string | null;
  clientSecret?: string | null;
  message?: string | null;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
};

export type VerifyPaymentInput = {
  pharmacyId: string;
  merchantReference?: string;
  providerTransactionId?: string;
  expectedAmount?: number;
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
  paymentMethod?: ProviderPaymentMethod | null;
  message?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
};

export type PaymentProviderConfig = {
  code: PaymentProviderCode;
  name: string;
  mode: PaymentProviderMode;
  baseUrl?: string;
  countries?: string[];
  paymentMethods?: ProviderPaymentMethod[];
  enabled?: boolean;
};

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
    ].includes(value)
  ) {
    return "failed";
  }

  if (
    [
      "cancelled",
      "canceled",
      "cancel",
    ].includes(value)
  ) {
    return "cancelled";
  }

  if (
    [
      "expired",
      "expire",
    ].includes(value)
  ) {
    return "expired";
  }

  if (
    [
      "created",
      "new",
    ].includes(value)
  ) {
    return "created";
  }

  return "pending";
}

export function isSuccessfulPaymentStatus(
  status: unknown,
): boolean {
  return (
    normalizePaymentStatus(status) ===
    "successful"
  );
}

export function isPendingPaymentStatus(
  status: unknown,
): boolean {
  return (
    normalizePaymentStatus(status) ===
      "pending" ||
    normalizePaymentStatus(status) ===
      "created"
  );
}

export function isFailedPaymentStatus(
  status: unknown,
): boolean {
  return (
    normalizePaymentStatus(status) ===
      "failed" ||
    normalizePaymentStatus(status) ===
      "cancelled" ||
    normalizePaymentStatus(status) ===
      "expired"
  );
}