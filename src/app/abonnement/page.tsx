"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Locale = "fr" | "en";

type SubscriptionStatusResponse = {
  success: boolean;
  authenticated?: boolean;
  message?: string;

  access?: {
    allowed: boolean;
    blocked: boolean;
    reason: string;
  };

  status?: string;
  locale?: Locale;

  user?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    role: string | null;
    language: Locale;
    pharmacy_id: string;
  };

  pharmacy?: {
    id: string;
    name: string;
    address: string | null;
    country_code: string | null;
    city: string | null;
    currency_code: string | null;
    owner_id: string | null;
    status: string | null;
  };

  subscription?: {
    id: string;
    plan_id: string;
    plan_code: string | null;
    plan_name: string | null;
    status: string;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    expires_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  } | null;

  trial?: {
    active: boolean;
    started_at: string | null;
    ends_at: string | null;
    remaining_ms: number;
    remaining_seconds: number;
    remaining_minutes: number;
    remaining_hours: number;
    remaining_days: number;
    percent_used: number;
  };

  expiration?: {
    expired: boolean;
    expires_at: string | null;
    remaining_ms: number;
    remaining_seconds: number;
    remaining_minutes: number;
    remaining_hours: number;
    remaining_days: number;
  };

  server_time?: string;
};

type BillingCycle = "monthly" | "yearly";

type PaymentMethod =
  | "mobile_money"
  | "card";

const TEXT = {
  fr: {
    brand: "PharmaFlow",
    subtitle: "Gestion intelligente des pharmacies",

    title: "Votre abonnement PharmaFlow",
    subtitlePage:
      "Continuez à gérer votre pharmacie sans interruption.",

    loading: "Vérification de votre abonnement...",
    loadingDescription:
      "Nous vérifions l'état de votre compte.",

    trialActive: "Essai gratuit actif",
    trialExpired: "Votre essai gratuit est terminé",
    subscriptionActive: "Abonnement actif",

    trialDescription:
      "Profitez gratuitement de PharmaFlow pendant votre période d'essai.",
    trialExpiredDescription:
      "Votre période d'essai de 7 jours est arrivée à son terme. Choisissez un abonnement pour continuer.",
    activeDescription:
      "Votre abonnement est actif. Merci de faire confiance à PharmaFlow.",

    remaining: "Temps restant",
    days: "jours",
    day: "jour",
    hours: "heures",
    hour: "heure",
    minutes: "minutes",
    minute: "minute",
    seconds: "secondes",
    second: "seconde",

    expired: "Expiré",
    expiresOn: "Expire le",
    activeUntil: "Actif jusqu'au",

    pricing: "Choisissez votre abonnement",
    pricingDescription:
      "Des tarifs simples pour continuer à utiliser toute la puissance de PharmaFlow.",

    monthly: "Mensuel",
    yearly: "Annuel",

    month: "mois",
    year: "an",

    monthlyDescription:
      "Facturation tous les mois.",
    yearlyDescription:
      "Facturation annuelle. Économisez sur votre abonnement.",

    popular: "RECOMMANDÉ",

    priceMonthlyXaf: "8 500 XAF",
    priceMonthlyUsd: "15 USD",

    priceYearlyXaf: "85 000 XAF",
    priceYearlyUsd: "150 USD",

    perMonth: "/ mois",
    perYear: "/ an",

    payNow: "Choisir ce forfait",
    processing: "Préparation du paiement...",

    paymentTitle: "Choisissez votre moyen de paiement",
    paymentDescription:
      "Sélectionnez le moyen avec lequel vous souhaitez régler votre abonnement.",

    mobileMoney: "Mobile Money",
    mobileMoneyDescription:
      "Payez avec un service Mobile Money disponible dans votre pays.",

    card: "Carte bancaire",
    cardDescription:
      "Payez avec une carte Visa ou Mastercard lorsque ce moyen est disponible.",

    continue: "Continuer",
    back: "Retour",
    cancel: "Annuler",

    securePayment: "Paiement sécurisé",
    securePaymentDescription:
      "PharmaFlow ne stocke pas les données sensibles de votre carte bancaire.",

    paymentComing:
      "La préparation de votre paiement est en cours.",

    selectPlan:
      "Veuillez d'abord choisir un forfait.",

    selectPaymentMethod:
      "Veuillez sélectionner un moyen de paiement.",

    paymentError:
      "Impossible de préparer le paiement. Veuillez réessayer.",

    sessionError:
      "Votre session n'est plus valide. Veuillez vous reconnecter.",

    logout: "Se déconnecter",

    footer:
      "© 2026 PharmaFlow. Tous droits réservés.",

    contact:
      "Besoin d'aide ? Contactez l'assistance PharmaFlow.",

    trialWarning:
      "Votre période d'essai arrive bientôt à expiration.",

    trialWarningStrong:
      "Pensez à choisir votre abonnement avant l'expiration.",

    blockedNotice:
      "L'accès à votre espace est actuellement suspendu jusqu'à l'activation d'un abonnement.",

    currency:
      "Devise",

    pharmacy:
      "Pharmacie",

    currentPlan:
      "Forfait actuel",

    noSubscription:
      "Aucun abonnement actif",
  },

  en: {
    brand: "PharmaFlow",
    subtitle: "Smart pharmacy management",

    title: "Your PharmaFlow subscription",
    subtitlePage:
      "Keep managing your pharmacy without interruption.",

    loading: "Checking your subscription...",
    loadingDescription:
      "We are checking the status of your account.",

    trialActive: "Free trial active",
    trialExpired: "Your free trial has ended",
    subscriptionActive: "Active subscription",

    trialDescription:
      "Enjoy PharmaFlow for free during your trial period.",
    trialExpiredDescription:
      "Your 7-day trial has ended. Choose a subscription to continue.",
    activeDescription:
      "Your subscription is active. Thank you for choosing PharmaFlow.",

    remaining: "Time remaining",
    days: "days",
    day: "day",
    hours: "hours",
    hour: "hour",
    minutes: "minutes",
    minute: "minute",
    seconds: "seconds",
    second: "second",

    expired: "Expired",
    expiresOn: "Expires on",
    activeUntil: "Active until",

    pricing: "Choose your subscription",
    pricingDescription:
      "Simple pricing to keep using the full power of PharmaFlow.",

    monthly: "Monthly",
    yearly: "Yearly",

    month: "month",
    year: "year",

    monthlyDescription:
      "Billed every month.",
    yearlyDescription:
      "Billed yearly. Save on your subscription.",

    popular: "RECOMMENDED",

    priceMonthlyXaf: "8,500 XAF",
    priceMonthlyUsd: "15 USD",

    priceYearlyXaf: "85,000 XAF",
    priceYearlyUsd: "150 USD",

    perMonth: "/ month",
    perYear: "/ year",

    payNow: "Choose this plan",
    processing: "Preparing payment...",

    paymentTitle: "Choose your payment method",
    paymentDescription:
      "Select how you want to pay for your subscription.",

    mobileMoney: "Mobile Money",
    mobileMoneyDescription:
      "Pay with a Mobile Money service available in your country.",

    card: "Bank card",
    cardDescription:
      "Pay with a Visa or Mastercard when this method is available.",

    continue: "Continue",
    back: "Back",
    cancel: "Cancel",

    securePayment: "Secure payment",
    securePaymentDescription:
      "PharmaFlow does not store sensitive bank card details.",

    paymentComing:
      "Your payment is being prepared.",

    selectPlan:
      "Please choose a plan first.",

    selectPaymentMethod:
      "Please select a payment method.",

    paymentError:
      "We could not prepare the payment. Please try again.",

    sessionError:
      "Your session is no longer valid. Please sign in again.",

    logout: "Sign out",

    footer:
      "© 2026 PharmaFlow. All rights reserved.",

    contact:
      "Need help? Contact PharmaFlow support.",

    trialWarning:
      "Your trial period is about to expire.",

    trialWarningStrong:
      "Choose your subscription before the trial expires.",

    blockedNotice:
      "Access to your workspace is currently suspended until a subscription is activated.",

    currency:
      "Currency",

    pharmacy:
      "Pharmacy",

    currentPlan:
      "Current plan",

    noSubscription:
      "No active subscription",
  },
} as const;

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] =
    useState<SubscriptionStatusResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [locale, setLocale] =
    useState<Locale>("fr");

  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>("monthly");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod | null>(null);

  const [showPaymentMethods, setShowPaymentMethods] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [paymentMessage, setPaymentMessage] =
    useState("");

  // ------------------------------------------------------------
  // CHARGEMENT DU STATUT
  // ------------------------------------------------------------

  const loadSubscription =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/subscription/status",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const result =
          (await response.json()) as SubscriptionStatusResponse;

        if (
          response.status === 401 ||
          !result.authenticated
        ) {
          router.replace(
            "/login?redirect=/abonnement",
          );
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Impossible de vérifier votre abonnement.",
          );
        }

        setData(result);

        if (
          result.locale === "en" ||
          result.locale === "fr"
        ) {
          setLocale(result.locale);
        }
      } catch (err) {
        console.error(
          "PharmaFlow subscription page:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger votre abonnement.",
        );
      } finally {
        setLoading(false);
      }
    }, [router]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const t =
    TEXT[locale];

  // ------------------------------------------------------------
  // COMPTE À REBOURS LOCAL
  // ------------------------------------------------------------

  const [remainingMs, setRemainingMs] =
    useState(0);

  useEffect(() => {
    const initial =
      data?.trial?.remaining_ms ??
      0;

    setRemainingMs(initial);
  }, [data]);

  useEffect(() => {
    if (
      !data?.trial?.active ||
      remainingMs <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setRemainingMs((current) =>
          Math.max(current - 1000, 0),
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    data?.trial?.active,
    remainingMs,
  ]);

  const countdown = useMemo(() => {
    const totalSeconds =
      Math.floor(
        Math.max(remainingMs, 0) /
          1000,
      );

    const days = Math.floor(
      totalSeconds / 86400,
    );

    const hours = Math.floor(
      (totalSeconds % 86400) /
        3600,
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) /
        60,
    );

    const seconds =
      totalSeconds % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
    };
  }, [remainingMs]);

  // ------------------------------------------------------------
  // DEVISE
  // ------------------------------------------------------------

  const currency =
    (
      data?.pharmacy?.currency_code ||
      "XAF"
    ).toUpperCase();

  const isXaf =
    currency === "XAF";

  // ------------------------------------------------------------
  // TARIFS
  // ------------------------------------------------------------

  const prices = useMemo(() => {
    if (isXaf) {
      return {
        monthly: {
          amount: 8500,
          label: t.priceMonthlyXaf,
        },
        yearly: {
          amount: 85000,
          label: t.priceYearlyXaf,
        },
      };
    }

    return {
      monthly: {
        amount: 15,
        label: t.priceMonthlyUsd,
      },
      yearly: {
        amount: 150,
        label: t.priceYearlyUsd,
      },
    };
  }, [
    isXaf,
    t.priceMonthlyXaf,
    t.priceMonthlyUsd,
    t.priceYearlyXaf,
    t.priceYearlyUsd,
  ]);

  // ------------------------------------------------------------
  // CHOIX DU FORFAIT
  // ------------------------------------------------------------

  function choosePlan(
    cycle: BillingCycle,
  ) {
    setBillingCycle(cycle);
    setPaymentMessage("");
    setShowPaymentMethods(true);
  }

  // ------------------------------------------------------------
  // PAIEMENT
  // ------------------------------------------------------------

  async function startPayment() {
    if (!billingCycle) {
      setPaymentMessage(
        t.selectPlan,
      );
      return;
    }

    if (!paymentMethod) {
      setPaymentMessage(
        t.selectPaymentMethod,
      );
      return;
    }

    try {
      setProcessing(true);
      setPaymentMessage("");

      /*
       * Cette requête appelle notre moteur de paiement.
       *
       * Le serveur déterminera lui-même :
       * - la pharmacie
       * - le propriétaire
       * - le plan
       * - le prix
       * - la devise
       *
       * Le navigateur ne doit jamais être considéré comme
       * une source fiable pour le prix ou le pharmacy_id.
       */

      const response =
        await fetch(
          "/api/payments/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              billingCycle,
              paymentMethod:
                paymentMethod ===
                "mobile_money"
                  ? "mobile_money"
                  : "card",
            }),
          },
        );

      const result =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/login?redirect=/abonnement",
        );
        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            t.paymentError,
        );
      }

      /*
       * Selon le fournisseur, la réponse peut contenir :
       *
       * - checkoutUrl
       * - clientSecret
       * - providerTransactionId
       *
       * Une page de paiement hébergée peut alors être ouverte.
       */

      if (
        result.checkoutUrl
      ) {
        window.location.href =
          result.checkoutUrl;
        return;
      }

      /*
       * Pour un Mobile Money nécessitant une confirmation,
       * nous conserverons la transaction et passerons ensuite
       * à la vérification.
       */

      setPaymentMessage(
        result.message ||
          t.paymentComing,
      );

      setShowPaymentMethods(
        false,
      );
    } catch (err) {
      console.error(
        "PharmaFlow payment creation:",
        err,
      );

      setPaymentMessage(
        err instanceof Error
          ? err.message
          : t.paymentError,
      );
    } finally {
      setProcessing(false);
    }
  }

  // ------------------------------------------------------------
  // DÉCONNEXION
  // ------------------------------------------------------------

  async function handleLogout() {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        },
      );
    } catch {
      // Le login pourra également nettoyer
      // la session côté navigateur.
    }

    router.replace("/login");
  }

  // ------------------------------------------------------------
  // ÉTAT DE L'ABONNEMENT
  // ------------------------------------------------------------

  const status =
    data?.status || "";

  const trialActive =
    data?.trial?.active === true &&
    remainingMs > 0;

  const accessAllowed =
    data?.access?.allowed === true;

  const isExpired =
    !trialActive &&
    !accessAllowed;

  const trialWarning =
    trialActive &&
    countdown.days <= 3;

  // ------------------------------------------------------------
  // AFFICHAGE CHARGEMENT
  // ------------------------------------------------------------

  if (loading) {
    return (
      <main className="pf-subscription-page">
        <div className="pf-subscription-loading">
          <div className="pf-subscription-spinner" />

          <h1>
            {t.loading}
          </h1>

          <p>
            {t.loadingDescription}
          </p>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------
  // ERREUR
  // ------------------------------------------------------------

  if (error || !data) {
    return (
      <main className="pf-subscription-page">
        <div className="pf-subscription-error">
          <div className="pf-subscription-error-icon">
            !
          </div>

          <h1>
            {locale === "en"
              ? "Unable to load your subscription"
              : "Impossible de charger votre abonnement"}
          </h1>

          <p>
            {error ||
              (locale === "en"
                ? "Please try again."
                : "Veuillez réessayer.")}
          </p>

          <button
            type="button"
            className="pf-btn pf-btn-primary"
            onClick={loadSubscription}
          >
            {locale === "en"
              ? "Try again"
              : "Réessayer"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pf-subscription-page">
      {/* ========================================================
          EN-TÊTE
      ========================================================= */}

      <header className="pf-subscription-header">
        <div className="pf-subscription-brand">
          <div className="pf-subscription-logo">
            ✚
          </div>

          <div>
            <strong>
              {t.brand}
            </strong>

            <span>
              {t.subtitle}
            </span>
          </div>
        </div>

        <div className="pf-subscription-header-actions">
          <button
            type="button"
            className="pf-subscription-language"
            onClick={() =>
              setLocale(
                locale === "fr"
                  ? "en"
                  : "fr",
              )
            }
          >
            {locale === "fr"
              ? "EN"
              : "FR"}
          </button>

          <button
            type="button"
            className="pf-subscription-logout"
            onClick={handleLogout}
          >
            {t.logout}
          </button>
        </div>
      </header>

      {/* ========================================================
          CONTENU
      ========================================================= */}

      <div className="pf-subscription-container">
        <section className="pf-subscription-intro">
          <span className="pf-subscription-eyebrow">
            {t.pharmacy}
          </span>

          <h1>
            {t.title}
          </h1>

          <p>
            {t.subtitlePage}
          </p>

          <div className="pf-subscription-pharmacy">
            <span>
              {data.pharmacy?.name ||
                "PharmaFlow"}
            </span>

            <span>
              {data.pharmacy?.city ||
                "—"}
            </span>

            <span>
              {t.currency}:{" "}
              {currency}
            </span>
          </div>
        </section>

        {/* ======================================================
            ÉTAT ACTUEL
        ======================================================= */}

        <section
          className={`pf-subscription-status-card ${
            trialActive
              ? "is-trial"
              : accessAllowed
                ? "is-active"
                : "is-expired"
          }`}
        >
          <div className="pf-subscription-status-main">
            <div className="pf-subscription-status-icon">
              {trialActive
                ? "⏱"
                : accessAllowed
                  ? "✓"
                  : "!"}
            </div>

            <div>
              <span className="pf-subscription-status-label">
                {trialActive
                  ? t.trialActive
                  : accessAllowed
                    ? t.subscriptionActive
                    : t.trialExpired}
              </span>

              <h2>
                {trialActive
                  ? t.trialDescription
                  : accessAllowed
                    ? t.activeDescription
                    : t.trialExpiredDescription}
              </h2>
            </div>
          </div>

          {trialActive && (
            <div className="pf-subscription-countdown">
              <span>
                {t.remaining}
              </span>

              <div className="pf-countdown-grid">
                <div>
                  <strong>
                    {countdown.days}
                  </strong>

                  <small>
                    {countdown.days ===
                    1
                      ? t.day
                      : t.days}
                  </small>
                </div>

                <div>
                  <strong>
                    {String(
                      countdown.hours,
                    ).padStart(2, "0")}
                  </strong>

                  <small>
                    {countdown.hours ===
                    1
                      ? t.hour
                      : t.hours}
                  </small>
                </div>

                <div>
                  <strong>
                    {String(
                      countdown.minutes,
                    ).padStart(2, "0")}
                  </strong>

                  <small>
                    {countdown.minutes ===
                    1
                      ? t.minute
                      : t.minutes}
                  </small>
                </div>

                <div>
                  <strong>
                    {String(
                      countdown.seconds,
                    ).padStart(2, "0")}
                  </strong>

                  <small>
                    {countdown.seconds ===
                    1
                      ? t.second
                      : t.seconds}
                  </small>
                </div>
              </div>

              {data.trial
                ?.ends_at && (
                <p>
                  {t.expiresOn}{" "}
                  {new Date(
                    data.trial.ends_at,
                  ).toLocaleString(
                    locale === "en"
                      ? "en-US"
                      : "fr-FR",
                  )}
                </p>
              )}
            </div>
          )}

          {accessAllowed &&
            data.expiration
              ?.expires_at && (
              <div className="pf-subscription-active-date">
                <span>
                  {t.activeUntil}
                </span>

                <strong>
                  {new Date(
                    data.expiration.expires_at,
                  ).toLocaleDateString(
                    locale === "en"
                      ? "en-US"
                      : "fr-FR",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </strong>
              </div>
            )}

          {trialWarning && (
            <div className="pf-subscription-warning">
              <strong>
                ⚠️ {t.trialWarning}
              </strong>

              <span>
                {t.trialWarningStrong}
              </span>
            </div>
          )}

          {isExpired && (
            <div className="pf-subscription-blocked">
              <strong>
                🔒 {t.blockedNotice}
              </strong>
            </div>
          )}
        </section>

        {/* ======================================================
            TARIFS
        ======================================================= */}

        <section className="pf-subscription-pricing">
          <div className="pf-subscription-section-title">
            <span>
              {t.pricing}
            </span>

            <p>
              {t.pricingDescription}
            </p>
          </div>

          <div className="pf-subscription-plans">
            {/* MENSUEL */}
            <article
              className={`pf-subscription-plan ${
                billingCycle === "monthly" &&
                showPaymentMethods
                  ? "is-selected"
                  : ""
              }`}
            >
              <div className="pf-plan-top">
                <span className="pf-plan-name">
                  {t.monthly}
                </span>
              </div>

              <div className="pf-plan-price">
                <strong>
                  {prices.monthly.label}
                </strong>

                <span>
                  {t.perMonth}
                </span>
              </div>

              <p>
                {t.monthlyDescription}
              </p>

              <button
                type="button"
                className="pf-btn pf-btn-primary pf-plan-button"
                onClick={() =>
                  choosePlan("monthly")
                }
                disabled={processing}
              >
                {t.payNow}
              </button>
            </article>

            {/* ANNUEL */}
            <article
              className={`pf-subscription-plan is-recommended ${
                billingCycle === "yearly" &&
                showPaymentMethods
                  ? "is-selected"
                  : ""
              }`}
            >
              <div className="pf-plan-badge">
                {t.popular}
              </div>

              <div className="pf-plan-top">
                <span className="pf-plan-name">
                  {t.yearly}
                </span>
              </div>

              <div className="pf-plan-price">
                <strong>
                  {prices.yearly.label}
                </strong>

                <span>
                  {t.perYear}
                </span>
              </div>

              <p>
                {t.yearlyDescription}
              </p>

              <button
                type="button"
                className="pf-btn pf-btn-primary pf-plan-button"
                onClick={() =>
                  choosePlan("yearly")
                }
                disabled={processing}
              >
                {t.payNow}
              </button>
            </article>
          </div>
        </section>

        {/* ======================================================
            MOYENS DE PAIEMENT
        ======================================================= */}

        {showPaymentMethods && (
          <section className="pf-payment-method-section">
            <div className="pf-subscription-section-title">
              <span>
                {t.paymentTitle}
              </span>

              <p>
                {t.paymentDescription}
              </p>
            </div>

            <div className="pf-selected-plan-summary">
              <span>
                {billingCycle ===
                "monthly"
                  ? t.monthly
                  : t.yearly}
              </span>

              <strong>
                {billingCycle ===
                "monthly"
                  ? prices.monthly.label
                  : prices.yearly.label}
              </strong>
            </div>

            <div className="pf-payment-methods">
              <button
                type="button"
                className={`pf-payment-method ${
                  paymentMethod ===
                  "mobile_money"
                    ? "is-selected"
                    : ""
                }`}
                onClick={() =>
                  setPaymentMethod(
                    "mobile_money",
                  )
                }
                disabled={processing}
              >
                <span className="pf-payment-method-icon">
                  📱
                </span>

                <span className="pf-payment-method-content">
                  <strong>
                    {t.mobileMoney}
                  </strong>

                  <small>
                    {
                      t.mobileMoneyDescription
                    }
                  </small>
                </span>

                <span className="pf-payment-method-radio">
                  {paymentMethod ===
                  "mobile_money"
                    ? "✓"
                    : ""}
                </span>
              </button>

              <button
                type="button"
                className={`pf-payment-method ${
                  paymentMethod ===
                  "card"
                    ? "is-selected"
                    : ""
                }`}
                onClick={() =>
                  setPaymentMethod(
                    "card",
                  )
                }
                disabled={processing}
              >
                <span className="pf-payment-method-icon">
                  💳
                </span>

                <span className="pf-payment-method-content">
                  <strong>
                    {t.card}
                  </strong>

                  <small>
                    {
                      t.cardDescription
                    }
                  </small>
                </span>

                <span className="pf-payment-method-radio">
                  {paymentMethod ===
                  "card"
                    ? "✓"
                    : ""}
                </span>
              </button>
            </div>

            {paymentMessage && (
              <div className="pf-payment-message">
                {paymentMessage}
              </div>
            )}

            <div className="pf-payment-actions">
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() => {
                  setShowPaymentMethods(
                    false,
                  );
                  setPaymentMethod(
                    null,
                  );
                  setPaymentMessage(
                    "",
                  );
                }}
                disabled={processing}
              >
                {t.back}
              </button>

              <button
                type="button"
                className="pf-btn pf-btn-primary"
                onClick={startPayment}
                disabled={
                  processing ||
                  !paymentMethod
                }
              >
                {processing
                  ? t.processing
                  : t.continue}
              </button>
            </div>

            <div className="pf-payment-security">
              <span>
                🔐
              </span>

              <div>
                <strong>
                  {t.securePayment}
                </strong>

                <small>
                  {
                    t.securePaymentDescription
                  }
                </small>
              </div>
            </div>
          </section>
        )}

        {/* ======================================================
            INFORMATIONS
        ======================================================= */}

        <section className="pf-subscription-information">
          <div>
            <span>
              {t.currentPlan}
            </span>

            <strong>
              {data.subscription
                ?.plan_name ||
                t.noSubscription}
            </strong>
          </div>

          <div>
            <span>
              {t.currency}
            </span>

            <strong>
              {currency}
            </strong>
          </div>

          <div>
            <span>
              {t.pharmacy}
            </span>

            <strong>
              {data.pharmacy?.name ||
                "PharmaFlow"}
            </strong>
          </div>
        </section>
      </div>

      {/* ========================================================
          FOOTER
      ========================================================= */}

      <footer className="pf-subscription-footer">
        <p>
          {t.contact}
        </p>

        <span>
          {t.footer}
        </span>
      </footer>
    </main>
  );
}