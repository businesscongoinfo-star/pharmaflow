"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

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

const TEXT = {
  fr: {
    brand: "PharmaFlow",
    subtitle: "Gestion intelligente des pharmacies",
    badge: "ESPACE PROFESSIONNEL",
    title: "Bienvenue 👋",
    description: "Connectez-vous à votre espace PharmaFlow.",
    email: "Adresse e-mail",
    emailPlaceholder: "exemple@pharmacie.com",
    password: "Mot de passe",
    passwordPlaceholder: "Votre mot de passe",
    forgot: "Mot de passe oublié ?",
    login: "Se connecter",
    loggingIn: "Connexion...",
    noAccount: "Vous n'avez pas encore de compte ?",
    createAccount: "Créer une pharmacie",
    security: "Connexion sécurisée",
    securityDescription:
      "Vos données sont protégées par l'authentification sécurisée de PharmaFlow.",
    footer: "© 2026 PharmaFlow. Tous droits réservés.",

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
  },

  en: {
    brand: "PharmaFlow",
    subtitle: "Smart pharmacy management",
    badge: "PROFESSIONAL AREA",
    title: "Welcome 👋",
    description: "Sign in to your PharmaFlow workspace.",
    email: "Email address",
    emailPlaceholder: "example@pharmacy.com",
    password: "Password",
    passwordPlaceholder: "Your password",
    forgot: "Forgot your password?",
    login: "Sign in",
    loggingIn: "Signing in...",
    noAccount: "Don't have an account yet?",
    createAccount: "Create a pharmacy",
    security: "Secure sign-in",
    securityDescription:
      "Your data is protected by PharmaFlow's secure authentication system.",
    footer: "© 2026 PharmaFlow. All rights reserved.",

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
  },
} as const;

function setLocaleCookie(locale: Locale) {
  document.cookie = [
    `pf_locale=${locale}`,
    "Path=/",
    "Max-Age=31536000",
    "SameSite=Lax",
  ].join("; ");
}

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

function normalizeRole(
  role: string | null | undefined,
) {
  return String(role ?? "")
    .trim()
    .toLowerCase();
}

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

export default function LoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const currentLocale: Locale =
    locale === "en" ? "en" : "fr";

  const t = TEXT[currentLocale];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [syncing, setSyncing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  /*
   * ==========================================================
   * SESSION EXISTANTE
   * ==========================================================
   *
   * Cette vérification est effectuée dès l'ouverture de /login.
   *
   * Priorité :
   *
   * 1. Super Admin
   * 2. Agent plateforme
   * 3. Utilisateur pharmacie
   *
   * Ainsi, un Super Admin ou un Agent déjà connecté ne
   * repasse pas par les contrôles d'une pharmacie.
   */
  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) {
          return;
        }

        /*
         * ------------------------------------------------------
         * 1. VÉRIFICATION ACCÈS PLATEFORME
         * ------------------------------------------------------
         */
        try {
          const platformAccess =
            await checkPlatformAccess();

          if (
            mounted &&
            platformAccess.type ===
              "super_admin" &&
            platformAccess.active === true &&
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

          if (
            mounted &&
            platformAccess.type ===
              "agent" &&
            platformAccess.active === true &&
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

        /*
         * ------------------------------------------------------
         * 2. PROFIL PHARMACIE
         * ------------------------------------------------------
         */
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "role, pharmacy_id",
          )
          .eq("id", user.id)
          .maybeSingle();

        if (
          !mounted ||
          profileError ||
          !profile?.pharmacy_id
        ) {
          return;
        }

        /*
         * ------------------------------------------------------
         * 3. PHARMACIE
         * ------------------------------------------------------
         */
        const {
          data: pharmacy,
        } = await supabase
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
          pharmacy.language === "en"
            ? "en"
            : "fr";

        setLocaleCookie(
          pharmacyLanguage,
        );

        /*
         * ------------------------------------------------------
         * 4. RÔLE
         * ------------------------------------------------------
         */
        const role =
          normalizeRole(profile.role);

        const destination =
          getRoleHome(role);

        if (
          destination !== "/login"
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

  /*
   * ==========================================================
   * VALIDATION FORMULAIRE
   * ==========================================================
   */
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

  /*
   * ==========================================================
   * CONNEXION
   * ==========================================================
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      /*
       * ========================================================
       * 1. AUTHENTIFICATION SUPABASE
       * ========================================================
       */
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

        setError(
          t.loginError,
        );

        return;
      }

      const user =
        authData.user;

      /*
       * ========================================================
       * 2. VÉRIFICATION PLATEFORME
       * ========================================================
       *
       * IMPORTANT :
       *
       * Cette vérification arrive AVANT profiles/pharmacies.
       *
       * Un Super Admin n'a pas besoin d'avoir :
       *
       * - pharmacy_id
       * - profil pharmacie
       * - abonnement pharmacie
       *
       * Un Agent plateforme non plus.
       *
       * Le compte plateforme est contrôlé par :
       *
       * platform_admins
       * platform_agents
       */
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

      /*
       * --------------------------------------------------------
       * SUPER ADMIN
       * --------------------------------------------------------
       */
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

      /*
       * --------------------------------------------------------
       * AGENT PLATEFORME
       * --------------------------------------------------------
       */
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

      /*
       * ========================================================
       * 3. PROFIL UTILISATEUR PHARMACIE
       * ========================================================
       */
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

      /*
       * ========================================================
       * 4. PHARMACY_ID OBLIGATOIRE POUR LES UTILISATEURS
       *    PHARMACIE
       * ========================================================
       */
      if (!profile.pharmacy_id) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.pharmacyError,
        );

        return;
      }

      /*
       * ========================================================
       * 5. PHARMACIE
       * ========================================================
       */
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

      /*
       * ========================================================
       * 6. STATUT PHARMACIE
       * ========================================================
       */
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

      /*
       * ========================================================
       * 7. LANGUE DE LA PHARMACIE
       * ========================================================
       *
       * pharmacies.language est la source de vérité.
       */
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

      /*
       * ========================================================
       * 8. COOKIE LANGUE
       * ========================================================
       */
      setLocaleCookie(
        pharmacyLanguage,
      );

      /*
       * ========================================================
       * 9. VÉRIFICATION ABONNEMENT
       * ========================================================
       *
       * Les utilisateurs d'une pharmacie doivent avoir un
       * abonnement autorisé.
       *
       * Les Super Admin et Agents ont déjà été redirigés
       * précédemment et ne passent donc jamais ici.
       */
      try {
        const subscription =
          await checkSubscriptionAccess();

        const allowed =
          subscription.access
            ?.allowed === true;

        const blocked =
          subscription.access
            ?.blocked === true;

        if (
          blocked ||
          !allowed
        ) {
          const reason =
            subscription.access
              ?.reason ??
            null;

          await supabase.auth.signOut();

          setSyncing(false);
          setLoading(false);

          const reasonMessage =
            getSubscriptionReasonMessage(
              reason,
              pharmacyLanguage,
            );

          setError(
            reasonMessage ||
              t.subscriptionRequired,
          );

          /*
           * Redirection vers la page abonnement.
           *
           * Le motif est transmis afin que la page puisse
           * afficher le contexte exact.
           */
          window.location.assign(
            `/abonnement?reason=${encodeURIComponent(
              reason ?? "subscription_required",
            )}`,
          );

          return;
        }
      } catch (subscriptionError) {
        console.error(
          "LOGIN SUBSCRIPTION:",
          subscriptionError,
        );

        /*
         * Pour éviter de bloquer complètement une pharmacie
         * si le service de statut rencontre une erreur réseau,
         * nous affichons l'erreur et conservons la session
         * contrôlée côté serveur.
         */
        setSyncing(false);
        setLoading(false);

        setError(
          t.subscriptionError,
        );

        return;
      }

      /*
       * ========================================================
       * 10. RÔLE PHARMACIE
       * ========================================================
       */
      const role =
        normalizeRole(
          profile.role,
        );

      const destination =
        getRoleHome(role);

      if (
        destination === "/login"
      ) {
        await supabase.auth.signOut();

        setSyncing(false);
        setLoading(false);

        setError(
          t.profileError,
        );

        return;
      }

      /*
       * ========================================================
       * 11. REDIRECTION FINALE
       * ========================================================
       *
       * owner       → /dashboard
       * admin       → /admin
       * pharmacist  → /pharmacien
       * cashier     → /caisse
       * employee    → /employe
       */
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

  /*
   * ==========================================================
   * ÉCRAN DE CHARGEMENT
   * ==========================================================
   */
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
                <span>✚</span>
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

  /*
   * ==========================================================
   * PAGE DE CONNEXION
   * ==========================================================
   */
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
          <Link
            href="/"
            className="pf-auth-logo"
          >
            <div className="pf-auth-logo-icon">
              <span>✚</span>
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
              ERROR
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
                  <span>→</span>
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