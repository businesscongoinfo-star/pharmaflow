"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

/* ============================================================
   TYPES
============================================================ */

type Locale = "fr" | "en";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  pharmacy_id: string | null;
};

type Pharmacy = {
  id: string;
  name: string;
  country_code: string | null;
  city: string | null;
  currency_code: string | null;
  status: string | null;
  language: Locale | null;
};

type PlatformAccessResponse = {
  type?: "super_admin" | "agent" | "none";
  active?: boolean;
  full_name?: string | null;
  department?: string;
  redirect?: string;
  success?: boolean;
  error?: string;
};

type SubscriptionStatusResponse = {
  success?: boolean;

  access?: {
    allowed?: boolean;
    blocked?: boolean;
    reason?: string | null;
  };

  subscription?: {
    status?: string | null;
    expires_at?: string | null;
    trial_ends_at?: string | null;
  } | null;
};

/* ============================================================
   TEXTES
============================================================ */

const TEXT = {
  fr: {
    brand: "PharmaFlow",

    subtitle:
      "Gestion intelligente des pharmacies",

    badge: "ESPACE PROFESSIONNEL",

    title: "Bienvenue 👋",

    description:
      "Connectez-vous à votre espace PharmaFlow.",

    email: "Adresse e-mail",

    emailPlaceholder:
      "exemple@pharmacie.com",

    password: "Mot de passe",

    passwordPlaceholder:
      "Votre mot de passe",

    forgot:
      "Mot de passe oublié ?",

    login:
      "Se connecter",

    loggingIn:
      "Connexion...",

    noAccount:
      "Vous n'avez pas encore de compte ?",

    createAccount:
      "Créer une pharmacie",

    security:
      "Connexion sécurisée",

    securityDescription:
      "Vos données sont protégées par l'authentification sécurisée de PharmaFlow.",

    footer:
      "©️ 2026 PharmaFlow. Tous droits réservés.",

    invalidEmail:
      "Veuillez saisir une adresse e-mail valide.",

    passwordRequired:
      "Veuillez saisir votre mot de passe.",

    loginError:
      "Adresse e-mail ou mot de passe incorrect.",

    profileError:
      "Votre profil utilisateur est introuvable.",

    pharmacyError:
      "Aucune pharmacie n'est associée à votre compte.",

    pharmacyNotFound:
      "La pharmacie associée à votre compte est introuvable.",

    pharmacyInactive:
      "L'accès à cette pharmacie est actuellement désactivé.",

    languageError:
      "Impossible de déterminer la langue de votre pharmacie.",

    subscriptionError:
      "Impossible de vérifier votre abonnement.",

    subscriptionRequired:
      "Votre abonnement PharmaFlow doit être activé pour accéder à votre espace.",

    platformError:
      "Impossible de vérifier les autorisations de la plateforme.",

    syncing:
      "Préparation de votre espace...",

    loadingDescription:
      "Nous vérifions vos autorisations et préparons votre environnement PharmaFlow.",

    showPassword:
      "Afficher le mot de passe",

    hidePassword:
      "Masquer le mot de passe",

    languageFrench:
      "Français",

    languageEnglish:
      "English",
  },

  en: {
    brand: "PharmaFlow",

    subtitle:
      "Smart pharmacy management",

    badge:
      "PROFESSIONAL AREA",

    title:
      "Welcome 👋",

    description:
      "Sign in to your PharmaFlow workspace.",

    email:
      "Email address",

    emailPlaceholder:
      "example@pharmacy.com",

    password:
      "Password",

    passwordPlaceholder:
      "Your password",

    forgot:
      "Forgot your password?",

    login:
      "Sign in",

    loggingIn:
      "Signing in...",

    noAccount:
      "Don't have an account yet?",

    createAccount:
      "Create a pharmacy",

    security:
      "Secure sign-in",

    securityDescription:
      "Your data is protected by PharmaFlow's secure authentication system.",

    footer:
      "©️ 2026 PharmaFlow. All rights reserved.",

    invalidEmail:
      "Please enter a valid email address.",

    passwordRequired:
      "Please enter your password.",

    loginError:
      "Incorrect email address or password.",

    profileError:
      "Your user profile could not be found.",

    pharmacyError:
      "No pharmacy is associated with your account.",

    pharmacyNotFound:
      "The pharmacy associated with your account could not be found.",

    pharmacyInactive:
      "Access to this pharmacy is currently disabled.",

    languageError:
      "Unable to determine your pharmacy language.",

    subscriptionError:
      "Unable to verify your subscription.",

    subscriptionRequired:
      "Your PharmaFlow subscription must be active to access your workspace.",

    platformError:
      "Unable to verify platform permissions.",

    syncing:
      "Preparing your workspace...",

    loadingDescription:
      "We are checking your permissions and preparing your PharmaFlow environment.",

    showPassword:
      "Show password",

    hidePassword:
      "Hide password",

    languageFrench:
      "Français",

    languageEnglish:
      "English",
  },
} as const;

/* ============================================================
   COOKIE LANGUE
============================================================ */

function setLocaleCookie(
  locale: Locale,
) {
  document.cookie = [
    `pf_locale=${locale}`,
    "Path=/",
    "Max-Age=31536000",
    "SameSite=Lax",
  ].join("; ");
}

/* ============================================================
   REDIRECTION PAR RÔLE
============================================================ */

function getRoleHome(
  role: string | null | undefined,
) {
  switch (role) {
    case "owner":
      return "/dashboard";

    case "admin":
      return "/admin";

    case "pharmacist":
      return "/pharmacien";

    case "cashier":
      return "/caisse";

    case "employee":
      return "/employe";

    default:
      return "/login";
  }
}

/* ============================================================
   NORMALISATION DU RÔLE
============================================================ */

function normalizeRole(
  role: string | null | undefined,
) {
  return String(role ?? "")
    .trim()
    .toLowerCase();
}

/* ============================================================
   VÉRIFICATION ACCÈS PLATEFORME
============================================================ */

async function checkPlatformAccess(): Promise<PlatformAccessResponse> {
  const response = await fetch(
    "/api/auth/platform-access",
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      "PLATFORM_ACCESS_HTTP_ERROR",
    );
  }

  return (await response.json()) as PlatformAccessResponse;
}

/* ============================================================
   VÉRIFICATION ABONNEMENT
============================================================ */

async function checkSubscriptionAccess(): Promise<SubscriptionStatusResponse> {
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

  if (!response.ok) {
    throw new Error(
      "SUBSCRIPTION_STATUS_HTTP_ERROR",
    );
  }

  return (await response.json()) as SubscriptionStatusResponse;
}

/* ============================================================
   MESSAGE SELON LE MOTIF D'ABONNEMENT
============================================================ */

function getSubscriptionReasonMessage(
  reason: string | null | undefined,
  locale: Locale,
) {
  if (locale === "en") {
    switch (reason) {
      case "subscription_required":
        return "Your PharmaFlow subscription is not active.";

      case "subscription_expired":
        return "Your PharmaFlow subscription has expired.";

      case "subscription_blocked":
        return "Access to your PharmaFlow subscription is currently blocked.";

      case "pharmacy_inactive":
        return "Your pharmacy account is currently inactive.";

      default:
        return "Your PharmaFlow subscription must be active to continue.";
    }
  }

  switch (reason) {
    case "subscription_required":
      return "Votre abonnement PharmaFlow n'est pas actif.";

    case "subscription_expired":
      return "Votre abonnement PharmaFlow a expiré.";

    case "subscription_blocked":
      return "L'accès à votre abonnement PharmaFlow est actuellement bloqué.";

    case "pharmacy_inactive":
      return "Le compte de votre pharmacie est actuellement désactivé.";

    default:
      return "Votre abonnement PharmaFlow doit être actif pour continuer.";
  }
}

/* ============================================================
   PAGE DE CONNEXION
============================================================ */

export default function LoginPage() {
  const locale = useLocale();

  const router = useRouter();

  const supabase = createClient();

  const currentLocale: Locale =
    locale === "en"
      ? "en"
      : "fr";

  const t =
    TEXT[currentLocale];

  /* ==========================================================
     ÉTATS
  ========================================================== */

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [syncing, setSyncing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  /* ==========================================================
     CHANGEMENT DE LANGUE
  ========================================================== */

  function changeLanguage(
    newLocale: Locale,
  ) {
    if (
      newLocale ===
      currentLocale
    ) {
      return;
    }

    setLocaleCookie(
      newLocale,
    );

    /*
     * Recharge la page avec la nouvelle langue.
     * Cela permet à next-intl de reprendre immédiatement
     * le nouveau locale.
     */
    window.location.reload();
  }

  /* ==========================================================
     SESSION EXISTANTE
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (
          !mounted ||
          !user
        ) {
          return;
        }

        /* ====================================================
           1. ACCÈS PLATEFORME
        ==================================================== */

        try {
          const platformAccess =
            await checkPlatformAccess();

          /* SUPER ADMIN */

          if (
            mounted &&
            platformAccess.type ===
              "super_admin" &&
            platformAccess.active ===
              true &&
            platformAccess.redirect
          ) {
            setLocaleCookie(
              currentLocale,
            );

            window.location.assign(
              platformAccess.redirect,
            );

            return;
          }

          /* AGENT PLATEFORME */

          if (
            mounted &&
            platformAccess.type ===
              "agent" &&
            platformAccess.active ===
              true &&
            platformAccess.redirect
          ) {
            setLocaleCookie(
              currentLocale,
            );

            window.location.assign(
              platformAccess.redirect,
            );

            return;
          }
        } catch (platformError) {
          console.error(
            "LOGIN EXISTING SESSION PLATFORM:",
            platformError,
          );
        }

        /* ====================================================
           2. PROFIL PHARMACIE
        ==================================================== */

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "role, pharmacy_id",
            )
            .eq(
              "id",
              user.id,
            )
            .maybeSingle();

        if (
          !mounted ||
          profileError ||
          !profile?.pharmacy_id
        ) {
          return;
        }

        /* ====================================================
           3. PHARMACIE
        ==================================================== */

        const {
          data: pharmacy,
        } =
          await supabase
            .from("pharmacies")
            .select(
              "language, status",
            )
            .eq(
              "id",
              profile.pharmacy_id,
            )
            .maybeSingle();

        if (
          !mounted ||
          !pharmacy
        ) {
          return;
        }

        const pharmacyLanguage: Locale =
          pharmacy.language ===
          "en"
            ? "en"
            : "fr";

        setLocaleCookie(
          pharmacyLanguage,
        );

        /* ====================================================
           4. RÔLE
        ==================================================== */

        const role =
          normalizeRole(
            profile.role,
          );

        const destination =
          getRoleHome(role);

        if (
          destination !==
          "/login"
        ) {
          router.replace(
            destination,
          );
        }
      } catch (sessionError) {
        console.error(
          "LOGIN EXISTING SESSION:",
          sessionError,
        );
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [
    router,
    supabase,
    currentLocale,
  ]);

  /* ==========================================================
     VALIDATION FORMULAIRE
  ========================================================== */

  function validateForm() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      setError(
        t.invalidEmail,
      );

      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail,
      )
    ) {
      setError(
        t.invalidEmail,
      );

      return false;
    }

    if (!password) {
      setError(
        t.passwordRequired,
      );

      return false;
    }

    return true;
  }

  /* ==========================================================
     CONNEXION
  ========================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSyncing(false);

    try {
      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      /* ======================================================
         1. AUTHENTIFICATION SUPABASE
      ====================================================== */

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: cleanEmail,
            password,
          },
        );

      if (
        authError ||
        !authData.user
      ) {
        console.error(
          "LOGIN AUTH:",
          authError,
        );

        setLoading(false);
        setSyncing(false);

        setError(
          t.loginError,
        );

        return;
      }

      const user =
        authData.user;

      /* ======================================================
         2. VÉRIFICATION PLATEFORME
      ====================================================== */

      setSyncing(true);

      let platformAccess:
        PlatformAccessResponse;

      try {
        platformAccess =
          await checkPlatformAccess();
      } catch (platformError) {
        console.error(
          "LOGIN PLATFORM ACCESS:",
          platformError,
        );

        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.platformError,
        );

        return;
      }

      /* ======================================================
         SUPER ADMIN
      ====================================================== */

      if (
        platformAccess.type ===
          "super_admin" &&
        platformAccess.active ===
          true &&
        platformAccess.redirect
      ) {
        setLocaleCookie(
          currentLocale,
        );

        window.location.assign(
          platformAccess.redirect,
        );

        return;
      }

      /* ======================================================
         AGENT PLATEFORME
      ====================================================== */

      if (
        platformAccess.type ===
          "agent" &&
        platformAccess.active ===
          true &&
        platformAccess.redirect
      ) {
        setLocaleCookie(
          currentLocale,
        );

        window.location.assign(
          platformAccess.redirect,
        );

        return;
      }

      /* ======================================================
         3. PROFIL UTILISATEUR PHARMACIE
      ====================================================== */

      const {
        data: profileData,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            `
              id,
              full_name,
              phone,
              role,
              pharmacy_id
            `,
          )
          .eq(
            "id",
            user.id,
          )
          .maybeSingle();

      if (profileError) {
        console.error(
          "LOGIN PROFILE:",
          profileError,
        );

        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.profileError,
        );

        return;
      }

      if (!profileData) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.profileError,
        );

        return;
      }

      const profile =
        profileData as Profile;

      /* ======================================================
         4. PHARMACY_ID OBLIGATOIRE
      ====================================================== */

      if (!profile.pharmacy_id) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.pharmacyError,
        );

        return;
      }

      /* ======================================================
         5. PHARMACIE
      ====================================================== */

      const {
        data: pharmacyData,
        error: pharmacyError,
      } =
        await supabase
          .from("pharmacies")
          .select(
            `
              id,
              name,
              country_code,
              city,
              currency_code,
              status,
              language
            `,
          )
          .eq(
            "id",
            profile.pharmacy_id,
          )
          .maybeSingle();

      if (pharmacyError) {
        console.error(
          "LOGIN PHARMACY:",
          pharmacyError,
        );

        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.pharmacyNotFound,
        );

        return;
      }

      if (!pharmacyData) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.pharmacyNotFound,
        );

        return;
      }

      const pharmacy =
        pharmacyData as Pharmacy;

      /* ======================================================
         6. STATUT PHARMACIE
      ====================================================== */

      const pharmacyStatus =
        String(
          pharmacy.status ?? "",
        )
          .trim()
          .toLowerCase();

      if (
        pharmacyStatus &&
        ![
          "active",
          "trial",
        ].includes(
          pharmacyStatus,
        )
      ) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.pharmacyInactive,
        );

        return;
      }

      /* ======================================================
         7. LANGUE PHARMACIE
      ====================================================== */

      const pharmacyLanguage:
        | Locale
        | null =
        pharmacy.language ===
        "en"
          ? "en"
          : pharmacy.language ===
              "fr"
            ? "fr"
            : null;

      if (!pharmacyLanguage) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.languageError,
        );

        return;
      }

      /* ======================================================
         8. COOKIE LANGUE
      ====================================================== */

      setLocaleCookie(
        pharmacyLanguage,
      );

      /* ======================================================
         9. VÉRIFICATION ABONNEMENT
      ====================================================== */

      try {
        const subscription =
          await checkSubscriptionAccess();

        const allowed =
          subscription.access
            ?.allowed === true;

        const blocked =
          subscription.access
            ?.blocked === true;

        /*
         * Si l'abonnement est expiré, absent ou bloqué,
         * la session Supabase reste volontairement active.
         */

        if (
          blocked ||
          !allowed
        ) {
          const reason =
            subscription.access
              ?.reason ??
            "subscription_required";

          setSyncing(false);
          setLoading(false);

          /*
           * Redirection automatique vers l'espace
           * d'achat / renouvellement de l'abonnement.
           */
          window.location.assign(
            `/abonnement?reason=${encodeURIComponent(
              reason,
            )}`,
          );

          return;
        }
      } catch (subscriptionError) {
        console.error(
          "LOGIN SUBSCRIPTION:",
          subscriptionError,
        );

        setSyncing(false);
        setLoading(false);

        setError(
          t.subscriptionError,
        );

        return;
      }

      /* ======================================================
         10. RÔLE PHARMACIE
      ====================================================== */

      const role =
        normalizeRole(
          profile.role,
        );

      const destination =
        getRoleHome(role);

      if (
        destination ===
        "/login"
      ) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.profileError,
        );

        return;
      }

      /* ======================================================
         11. REDIRECTION FINALE
      ====================================================== */

      window.location.assign(
        destination,
      );
    } catch (err) {
      console.error(
        "LOGIN:",
        err,
      );

      setSyncing(false);
      setLoading(false);

      setError(
        t.loginError,
      );
    }
  }

  /* ==========================================================
     ÉCRAN DE CHARGEMENT
  ========================================================== */

  if (syncing) {
    return (
      <main className="pf-auth-page">

        <div className="pf-auth-background">

          <div className="pf-auth-orb pf-auth-orb-one" />

          <div className="pf-auth-orb pf-auth-orb-two" />

        </div>

        <div className="pf-auth-container">

          <section className="pf-auth-card">

            <div className="pf-auth-logo">

              <div className="pf-auth-logo-icon">

                <span>
                  ✚
                </span>

              </div>

              <div>

                <div className="pf-auth-logo-name">
                  {t.brand}
                </div>

                <div className="pf-auth-logo-subtitle">
                  {t.subtitle}
                </div>

              </div>

            </div>

            <div className="pf-auth-loading">

              <span className="pf-spinner" />

              <h2>
                {t.syncing}
              </h2>

              <p>
                {t.loadingDescription}
              </p>

            </div>

            <div className="pf-auth-security">

              <span className="pf-auth-security-icon">
                🛡️
              </span>

              <div>

                <strong>
                  {t.security}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "3px",
                  }}
                >
                  {t.securityDescription}
                </span>

              </div>

            </div>

          </section>

          <footer className="pf-auth-page-footer">
            {t.footer}
          </footer>

        </div>

      </main>
    );
  }

  /* ==========================================================
     PAGE DE CONNEXION
  ========================================================== */

  return (
    <main className="pf-auth-page">

      <div className="pf-auth-background">

        <div className="pf-auth-orb pf-auth-orb-one" />

        <div className="pf-auth-orb pf-auth-orb-two" />

      </div>

      <div className="pf-auth-container">

        <section className="pf-auth-card">

          {/* =================================================
              LOGO
          ================================================== */}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >

            <Link
              href="/"
              className="pf-auth-logo"
            >

              <div className="pf-auth-logo-icon">

                <span>
                  ✚
                </span>

              </div>

              <div>

                <div className="pf-auth-logo-name">
                  {t.brand}
                </div>

                <div className="pf-auth-logo-subtitle">
                  {t.subtitle}
                </div>

              </div>

            </Link>

            {/* =================================================
                SÉLECTEUR DE LANGUE
            ================================================== */}

            <div
              role="group"
              aria-label="Language selector"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px",
                borderRadius: "12px",
                background:
                  "rgba(241, 245, 249, 0.9)",
                border:
                  "1px solid rgba(226, 232, 240, 0.9)",
                flexShrink: 0,
              }}
            >

              <button
                type="button"
                onClick={() =>
                  changeLanguage("fr")
                }
                aria-pressed={
                  currentLocale === "fr"
                }
                title={
                  t.languageFrench
                }
                style={{
                  border: "none",
                  cursor:
                    currentLocale === "fr"
                      ? "default"
                      : "pointer",
                  borderRadius: "9px",
                  padding:
                    "7px 9px",
                  background:
                    currentLocale === "fr"
                      ? "#ffffff"
                      : "transparent",
                  color:
                    currentLocale === "fr"
                      ? "#0f172a"
                      : "#64748b",
                  fontSize: "13px",
                  fontWeight:
                    currentLocale === "fr"
                      ? 700
                      : 500,
                  boxShadow:
                    currentLocale === "fr"
                      ? "0 1px 4px rgba(15, 23, 42, 0.10)"
                      : "none",
                  transition:
                    "all 0.2s ease",
                }}
              >
                🇫🇷 FR
              </button>

              <button
                type="button"
                onClick={() =>
                  changeLanguage("en")
                }
                aria-pressed={
                  currentLocale === "en"
                }
                title={
                  t.languageEnglish
                }
                style={{
                  border: "none",
                  cursor:
                    currentLocale === "en"
                      ? "default"
                      : "pointer",
                  borderRadius: "9px",
                  padding:
                    "7px 9px",
                  background:
                    currentLocale === "en"
                      ? "#ffffff"
                      : "transparent",
                  color:
                    currentLocale === "en"
                      ? "#0f172a"
                      : "#64748b",
                  fontSize: "13px",
                  fontWeight:
                    currentLocale === "en"
                      ? 700
                      : 500,
                  boxShadow:
                    currentLocale === "en"
                      ? "0 1px 4px rgba(15, 23, 42, 0.10)"
                      : "none",
                  transition:
                    "all 0.2s ease",
                }}
              >
                🇬🇧 EN
              </button>

            </div>

          </div>

          {/* =================================================
              HEADER
          ================================================== */}

          <div className="pf-auth-header">

            <div className="pf-auth-badge">

              <span className="pf-auth-badge-icon">
                🔐
              </span>

              <span>
                {t.badge}
              </span>

            </div>

            <h1>
              {t.title}
            </h1>

            <p>
              {t.description}
            </p>

          </div>

          {/* =================================================
              ERREUR
          ================================================== */}

          {error && (
            <div
              className="pf-alert pf-alert-danger"
              role="alert"
            >

              <span className="pf-alert-icon">
                !
              </span>

              <span>
                {error}
              </span>

            </div>
          )}

          {/* =================================================
              FORMULAIRE
          ================================================== */}

          <form
            onSubmit={handleSubmit}
            className="pf-auth-form"
          >

            {/* =================================================
                EMAIL
            ================================================== */}

            <div className="pf-form-group">

              <label
                htmlFor="email"
                className="pf-form-label"
              >
                {t.email}
              </label>

              <div className="pf-input-wrapper">

                <span
                  className="pf-input-icon"
                  aria-hidden="true"
                >
                  ✉
                </span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {

                    setEmail(
                      event.target.value,
                    );

                    if (error) {
                      setError("");
                    }

                  }}
                  placeholder={
                    t.emailPlaceholder
                  }
                  className="pf-form-input pf-form-input-with-icon"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={loading}
                  required
                />

              </div>

            </div>

            {/* =================================================
                MOT DE PASSE
            ================================================== */}

            <div className="pf-form-group">

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >

                <label
                  htmlFor="password"
                  className="pf-form-label"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  {t.password}
                </label>

                <Link
                  href="/forgot-password"
                  className="pf-auth-forgot-link"
                >
                  {t.forgot}
                </Link>

              </div>

              <div className="pf-input-wrapper">

                <span
                  className="pf-input-icon"
                  aria-hidden="true"
                >
                  🔒
                </span>

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) => {

                    setPassword(
                      event.target.value,
                    );

                    if (error) {
                      setError("");
                    }

                  }}
                  placeholder={
                    t.passwordPlaceholder
                  }
                  className="pf-form-input pf-form-input-with-icon pf-form-input-with-action"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="pf-input-action"
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value,
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? t.hidePassword
                      : t.showPassword
                  }
                  title={
                    showPassword
                      ? t.hidePassword
                      : t.showPassword
                  }
                >

                  {showPassword
                    ? "🙈"
                    : "👁️"}

                </button>

              </div>

            </div>

            {/* =================================================
                BOUTON CONNEXION
            ================================================== */}

            <button
              type="submit"
              className="pf-btn pf-btn-primary pf-btn-full pf-auth-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="pf-spinner pf-spinner-small" />

                  {t.loggingIn}
                </>
              ) : (
                <>
                  <span>
                    →
                  </span>

                  {t.login}
                </>
              )}

            </button>

          </form>

          {/* =================================================
              CRÉATION COMPTE PHARMACIE
          ================================================== */}

          <div
            style={{
              marginTop: "24px",
              paddingTop: "22px",
              borderTop:
                "1px solid var(--pf-border, #e2e8f0)",
              textAlign: "center",
            }}
          >

            <span
              style={{
                color:
                  "var(--pf-text-soft, #64748b)",
                fontSize: "14px",
              }}
            >
              {t.noAccount}
            </span>{" "}

            <Link
              href="/register"
              className="pf-auth-back-link"
            >
              {t.createAccount}
            </Link>

          </div>

          {/* =================================================
              SÉCURITÉ
          ================================================== */}

          <div className="pf-auth-security">

            <span className="pf-auth-security-icon">
              🛡️
            </span>

            <div>

              <strong>
                {t.security}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                }}
              >
                {t.securityDescription}
              </span>

            </div>

          </div>

        </section>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <footer className="pf-auth-page-footer">
          {t.footer}
        </footer>

      </div>

    </main>
  );
}