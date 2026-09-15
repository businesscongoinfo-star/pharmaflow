import type {
  PaymentProviderAdapter,
  PaymentProviderCode,
} from "./types";

import { mokoAfrikaAdapter } from "./moko-afrika";
import { yabetooAdapter } from "./yabetoo";
import { gofreshpayAdapter } from "./gofreshpay";
import { paypalAdapter } from "./paypal";

/**
 * Tous les fournisseurs de paiement disponibles
 * dans PharmaFlow.
 *
 * IMPORTANT :
 * Un provider ne sera réellement utilisable que si
 * ses credentials sont correctement configurés
 * dans les variables d'environnement.
 */

const providers: PaymentProviderAdapter[] = [
  mokoAfrikaAdapter,
  yabetooAdapter,
  gofreshpayAdapter
];

/**
 * Retourne tous les providers enregistrés.
 */
export function getPaymentProviders(): PaymentProviderAdapter[] {
  return providers;
}

/**
 * Recherche un provider par son code.
 */
export function getPaymentProvider(
  code: PaymentProviderCode,
): PaymentProviderAdapter | null {
  const provider = providers.find(
    (item) => item.code === code,
  );

  return provider ?? null;
}

/**
 * Vérifie si un provider existe.
 */
export function hasPaymentProvider(
  code: PaymentProviderCode,
): boolean {
  return providers.some(
    (item) => item.code === code,
  );
}

/**
 * Retourne uniquement les providers activés.
 */
export function getEnabledPaymentProviders(): PaymentProviderAdapter[] {
  return providers.filter(
    (provider) => provider.config.enabled !== false,
  );
}