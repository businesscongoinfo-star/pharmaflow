import "server-only";

export type SubscriptionAccessInput = {
  status?: string | null;
  trial_ends_at?: string | null;
  expires_at?: string | null;
};

export type ManualAccessInput = {
  manual_access_enabled?: boolean | null;
  manual_access_until?: string | null;
};

export type PharmacyAccessInput = {
  status?: string | null;
};

export type SubscriptionAccessResult = {
  allowed: boolean;
  reason:
    | "subscription_active"
    | "subscription_trial"
    | "manual_access"
    | "no_subscription"
    | "subscription_expired"
    | "manual_access_expired"
    | "manual_access_disabled"
    | "pharmacy_inactive"
    | "pharmacy_suspended";
};

/**
 * Vérifie si l'abonnement donne actuellement accès.
 */
export function hasValidSubscription(
  subscription: SubscriptionAccessInput | null | undefined,
): boolean {
  if (!subscription) {
    return false;
  }

  const status = String(subscription.status ?? "")
    .trim()
    .toLowerCase();

  const now = Date.now();

  if (status === "trial" || status === "trialing") {
    const endDate =
      subscription.trial_ends_at ?? subscription.expires_at ?? null;

    if (!endDate) {
      return false;
    }

    const timestamp = new Date(endDate).getTime();

    return Number.isFinite(timestamp) && timestamp > now;
  }

  if (status === "active" || status === "paid") {
    if (!subscription.expires_at) {
      return false;
    }

    const timestamp = new Date(subscription.expires_at).getTime();

    return Number.isFinite(timestamp) && timestamp > now;
  }

  /**
   * Un abonnement annulé peut éventuellement rester utilisable
   * jusqu'à sa date d'expiration.
   *
   * Cela permet de distinguer :
   * - annulation du renouvellement
   * - expiration immédiate
   */
  if (status === "cancelled") {
    if (!subscription.expires_at) {
      return false;
    }

    const timestamp = new Date(subscription.expires_at).getTime();

    return Number.isFinite(timestamp) && timestamp > now;
  }

  return false;
}

/**
 * Vérifie si l'accès manuel accordé par le Super Admin
 * est encore valide.
 */
export function hasValidManualAccess(
  pharmacy: ManualAccessInput | null | undefined,
): boolean {
  if (!pharmacy?.manual_access_enabled) {
    return false;
  }

  /**
   * Si une date limite est définie, elle doit être dans le futur.
   */
  if (pharmacy.manual_access_until) {
    const timestamp = new Date(pharmacy.manual_access_until).getTime();

    return Number.isFinite(timestamp) && timestamp > Date.now();
  }

  /**
   * Sécurité :
   * l'accès manuel sans date limite n'est pas considéré
   * comme valide.
   *
   * Le Super Admin doit toujours définir une durée.
   */
  return false;
}

/**
 * Détermine l'accès final à la plateforme.
 *
 * Priorité :
 *
 * 1. Pharmacie active
 * 2. Abonnement valide
 * 3. Sinon accès manuel valide
 */
export function resolvePharmacyAccess({
  subscription,
  pharmacy,
}: {
  subscription: SubscriptionAccessInput | null | undefined;
  pharmacy: PharmacyAccessInput & ManualAccessInput;
}): SubscriptionAccessResult {
  const pharmacyStatus = String(pharmacy.status ?? "")
    .trim()
    .toLowerCase();

  /**
   * Une pharmacie inactive ou suspendue ne doit pas pouvoir
   * utiliser un accès manuel pour contourner le blocage administratif.
   */
  if (pharmacyStatus === "inactive") {
    return {
      allowed: false,
      reason: "pharmacy_inactive",
    };
  }

  if (pharmacyStatus === "suspended") {
    return {
      allowed: false,
      reason: "pharmacy_suspended",
    };
  }

  /**
   * 1. Abonnement valide
   */
  if (hasValidSubscription(subscription)) {
    const subscriptionStatus = String(subscription?.status ?? "")
      .trim()
      .toLowerCase();

    if (
      subscriptionStatus === "trial" ||
      subscriptionStatus === "trialing"
    ) {
      return {
        allowed: true,
        reason: "subscription_trial",
      };
    }

    return {
      allowed: true,
      reason: "subscription_active",
    };
  }

  /**
   * 2. Accès manuel du Super Admin
   */
  if (hasValidManualAccess(pharmacy)) {
    return {
      allowed: true,
      reason: "manual_access",
    };
  }

  /**
   * 3. Aucun accès
   */
  if (pharmacy.manual_access_enabled) {
    return {
      allowed: false,
      reason: "manual_access_expired",
    };
  }

  if (!subscription) {
    return {
      allowed: false,
      reason: "no_subscription",
    };
  }

  return {
    allowed: false,
    reason: "subscription_expired",
  };
}