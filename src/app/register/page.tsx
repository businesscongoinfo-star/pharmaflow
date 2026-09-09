"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Locale = "fr" | "en";

type Country = {
  code: string;
  name: string;
  currency: string;
};

const COUNTRIES: Country[] = [
  {
    code: "CG",
    name: "Congo-Brazzaville",
    currency: "XAF",
  },
  {
    code: "CD",
    name: "République démocratique du Congo",
    currency: "CDF",
  },
  {
    code: "CM",
    name: "Cameroun",
    currency: "XAF",
  },
  {
    code: "GA",
    name: "Gabon",
    currency: "XAF",
  },
  {
    code: "TD",
    name: "Tchad",
    currency: "XAF",
  },
  {
    code: "CF",
    name: "République centrafricaine",
    currency: "XAF",
  },
  {
    code: "GQ",
    name: "Guinée équatoriale",
    currency: "XAF",
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    currency: "XOF",
  },
  {
    code: "SN",
    name: "Sénégal",
    currency: "XOF",
  },
  {
    code: "BJ",
    name: "Bénin",
    currency: "XOF",
  },
  {
    code: "TG",
    name: "Togo",
    currency: "XOF",
  },
  {
    code: "BF",
    name: "Burkina Faso",
    currency: "XOF",
  },
  {
    code: "ML",
    name: "Mali",
    currency: "XOF",
  },
  {
    code: "GN",
    name: "Guinée",
    currency: "GNF",
  },
  {
    code: "NE",
    name: "Niger",
    currency: "XOF",
  },
  {
    code: "RW",
    name: "Rwanda",
    currency: "RWF",
  },
  {
    code: "KE",
    name: "Kenya",
    currency: "KES",
  },
  {
    code: "TZ",
    name: "Tanzanie",
    currency: "TZS",
  },
  {
    code: "UG",
    name: "Ouganda",
    currency: "UGX",
  },
  {
    code: "ZA",
    name: "Afrique du Sud",
    currency: "ZAR",
  },
  {
    code: "OTHER",
    name: "Autre pays",
    currency: "USD",
  },
];

const TEXT = {
  fr: {
    brand: "PharmaFlow",
    subtitle: "Gestion intelligente des pharmacies",

    badge: "CRÉATION DE PHARMACIE",

    title: "Créez votre espace pharmacie 🏥",
    description:
      "Commencez gratuitement et gérez votre pharmacie depuis une seule plateforme.",

    trialTitle: "7 jours gratuits",
    trialDescription:
      "Votre essai gratuit est activé automatiquement dès la création de votre compte.",
    trialPoint1:
      "Aucun paiement nécessaire pour commencer",
    trialPoint2:
      "Accès à votre espace professionnel pendant 7 jours",
    trialPoint3:
      "Choisissez ensuite un abonnement mensuel ou annuel",

    pharmacySection: "Informations de la pharmacie",

    pharmacyName: "Nom de la pharmacie",
    pharmacyNamePlaceholder:
      "Ex. Pharmacie Centrale",

    country: "Pays",
    countryPlaceholder:
      "Sélectionnez votre pays",

    city: "Ville",
    cityPlaceholder:
      "Ex. Brazzaville",

    address: "Adresse",
    addressPlaceholder:
      "Adresse complète de la pharmacie",

    accountSection: "Informations du responsable",

    fullName: "Nom complet",
    fullNamePlaceholder:
      "Nom et prénom du responsable",

    phone: "Téléphone",
    phonePlaceholder:
      "Ex. +242 06 000 00 00",

    email: "Adresse e-mail",
    emailPlaceholder:
      "exemple@pharmacie.com",

    password: "Mot de passe",
    passwordPlaceholder:
      "Créez un mot de passe sécurisé",

    confirmation: "Confirmer le mot de passe",
    confirmationPlaceholder:
      "Répétez votre mot de passe",

    language: "Langue de votre compte",
    languageDescription:
      "Cette langue sera enregistrée pour votre compte personnel.",

    french: "Français",
    english: "English",

    currency: "Devise de facturation",

    terms:
      "J'accepte les conditions d'utilisation et la politique de confidentialité de PharmaFlow.",

    createAccount: "Créer ma pharmacie",
    creating: "Création de votre pharmacie...",

    alreadyAccount:
      "Vous avez déjà un compte ?",
    login: "Se connecter",

    passwordWeak: "Faible",
    passwordMedium: "Moyen",
    passwordStrong: "Fort",

    passwordRequirements:
      "Utilisez au moins 8 caractères avec des lettres et des chiffres.",

    required:
      "Veuillez remplir tous les champs obligatoires.",

    invalidEmail:
      "Veuillez saisir une adresse e-mail valide.",

    passwordTooShort:
      "Le mot de passe doit contenir au moins 8 caractères.",

    passwordMismatch:
      "Les mots de passe ne correspondent pas.",

    termsRequired:
      "Vous devez accepter les conditions d'utilisation.",

    registerError:
      "Impossible de créer votre compte. Veuillez réessayer.",

    successTitle:
      "Votre pharmacie est créée ! 🎉",

    successDescription:
      "Votre essai gratuit de 7 jours est maintenant activé. Vous allez être redirigé vers la connexion.",

    security:
      "Création sécurisée",

    securityDescription:
      "Vos informations sont protégées par l'infrastructure sécurisée de PharmaFlow.",

    footer:
      "©️ 2026 PharmaFlow. Tous droits réservés.",
  },

  en: {
    brand: "PharmaFlow",
    subtitle: "Smart pharmacy management",

    badge: "PHARMACY REGISTRATION",

    title: "Create your pharmacy workspace 🏥",
    description:
      "Start for free and manage your pharmacy from one professional platform.",

    trialTitle: "7 days free",
    trialDescription:
      "Your free trial is automatically activated as soon as your account is created.",
    trialPoint1:
      "No payment required to get started",
    trialPoint2:
      "Access your professional workspace for 7 days",
    trialPoint3:
      "Then choose a monthly or yearly subscription",

    pharmacySection: "Pharmacy information",

    pharmacyName: "Pharmacy name",
    pharmacyNamePlaceholder:
      "e.g. Central Pharmacy",

    country: "Country",
    countryPlaceholder:
      "Select your country",

    city: "City",
    cityPlaceholder:
      "e.g. Brazzaville",

    address: "Address",
    addressPlaceholder:
      "Full pharmacy address",

    accountSection: "Manager information",

    fullName: "Full name",
    fullNamePlaceholder:
      "Manager's full name",

    phone: "Phone number",
    phonePlaceholder:
      "e.g. +242 06 000 00 00",

    email: "Email address",
    emailPlaceholder:
      "example@pharmacy.com",

    password: "Password",
    passwordPlaceholder:
      "Create a secure password",

    confirmation: "Confirm password",
    confirmationPlaceholder:
      "Repeat your password",

    language: "Your account language",
    languageDescription:
      "This language will be saved for your personal account.",

    french: "Français",
    english: "English",

    currency: "Billing currency",

    terms:
      "I accept PharmaFlow's terms of use and privacy policy.",

    createAccount: "Create my pharmacy",
    creating: "Creating your pharmacy...",

    alreadyAccount:
      "Already have an account?",
    login: "Sign in",

    passwordWeak: "Weak",
    passwordMedium: "Medium",
    passwordStrong: "Strong",

    passwordRequirements:
      "Use at least 8 characters with letters and numbers.",

    required:
      "Please complete all required fields.",

    invalidEmail:
      "Please enter a valid email address.",

    passwordTooShort:
      "Your password must contain at least 8 characters.",

    passwordMismatch:
      "Passwords do not match.",

    termsRequired:
      "You must accept the terms of use.",

    registerError:
      "Unable to create your account. Please try again.",

    successTitle:
      "Your pharmacy has been created! 🎉",

    successDescription:
      "Your 7-day free trial is now active. You will be redirected to the login page.",

    security:
      "Secure registration",

    securityDescription:
      "Your information is protected by PharmaFlow's secure infrastructure.",

    footer:
      "©️ 2026 PharmaFlow. All rights reserved.",
  },
} as const;

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setLocaleCookie(locale: Locale) {
  document.cookie = [
    `pf_locale=${locale}`,
    "Path=/",
    "Max-Age=31536000",
    "SameSite=Lax",
  ].join("; ");
}

export default function RegisterPage() {
  const router = useRouter();

  const [locale, setLocale] = useState<Locale>("fr");

  const [pharmacyName, setPharmacyName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [language, setLanguage] =
    useState<Locale>("fr");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [acceptTerms, setAcceptTerms] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const t = TEXT[locale];

  const selectedCountry = useMemo(
    () =>
      COUNTRIES.find(
        (country) => country.code === countryCode,
      ),
    [countryCode],
  );

  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        level: 0,
        label: "",
      };
    }

    let score = 0;

    if (password.length >= 8) {
      score++;
    }

    if (/[A-Z]/.test(password)) {
      score++;
    }

    if (/[a-z]/.test(password)) {
      score++;
    }

    if (/[0-9]/.test(password)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }

    if (score <= 2) {
      return {
        level: 1,
        label: t.passwordWeak,
      };
    }

    if (score <= 4) {
      return {
        level: 2,
        label: t.passwordMedium,
      };
    }

    return {
      level: 3,
      label: t.passwordStrong,
    };
  }, [password, t]);

  function handleLocaleChange(
    nextLocale: Locale,
  ) {
    if (loading) return;

    setLocale(nextLocale);
    setLanguage(nextLocale);
    setError("");
  }

  function validateForm() {
    const cleanEmailValue =
      cleanEmail(email);

    if (
      !pharmacyName.trim() ||
      !countryCode ||
      !city.trim() ||
      !address.trim() ||
      !fullName.trim() ||
      !phone.trim() ||
      !cleanEmailValue ||
      !password ||
      !confirmation
    ) {
      setError(t.required);
      return false;
    }

    if (!isValidEmail(cleanEmailValue)) {
      setError(t.invalidEmail);
      return false;
    }

    if (password.length < 8) {
      setError(t.passwordTooShort);
      return false;
    }

    if (password !== confirmation) {
      setError(t.passwordMismatch);
      return false;
    }

    if (!acceptTerms) {
      setError(t.termsRequired);
      return false;
    }

    return true;
  }

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
      const cleanEmailValue =
        cleanEmail(email);

      /*
       * ==========================================================
       * INSCRIPTION
       * ==========================================================
       *
       * L'API /api/inscription crée :
       *
       * 1. le compte Supabase Auth
       * 2. la pharmacie
       * 3. le profil du responsable
       * 4. l'abonnement TRIAL
       * 5. une période gratuite de 7 jours
       *
       * Le calcul de la durée du trial est effectué côté serveur.
       */

      const response = await fetch(
        "/api/inscription",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            pharmacyName:
              pharmacyName.trim(),

            address:
              address.trim(),

            countryCode,

            city:
              city.trim(),

            fullName:
              fullName.trim(),

            phone:
              phone.trim(),

            email:
              cleanEmailValue,

            password,

            language,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        console.error(
          "REGISTER ERROR:",
          data,
        );

        setError(
          data?.error ||
            data?.message ||
            t.registerError,
        );

        setLoading(false);

        return;
      }

      /*
       * ==========================================================
       * SUCCÈS
       * ==========================================================
       *
       * Le serveur vient de créer l'essai gratuit.
       *
       * Nous ne créons PAS l'abonnement côté navigateur.
       * Nous ne faisons PAS de paiement ici.
       */

      setLocaleCookie(language);

      setSuccess(true);
      setLoading(false);

      /*
       * Redirection vers la connexion.
       *
       * Le pharmacien pourra ensuite se connecter.
       * Le système vérifiera alors son trial de 7 jours.
       */

      window.setTimeout(() => {
        router.replace(
          `/login?locale=${language}`,
        );

        router.refresh();
      }, 2200);
    } catch (err) {
      console.error(
        "REGISTER:",
        err,
      );

      setError(t.registerError);
      setLoading(false);
    }
  }
  return (
    <main className="pf-auth-page">
      <div className="pf-auth-background">
        <div className="pf-auth-orb pf-auth-orb-one" />
        <div className="pf-auth-orb pf-auth-orb-two" />
      </div>

      <div className="pf-auth-container">
        <section className="pf-auth-card">

          {/* =====================================================
              LOGO
          ====================================================== */}

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

          {/* =====================================================
              SÉLECTEUR DE LANGUE
          ====================================================== */}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px",
                borderRadius: "12px",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  handleLocaleChange("fr")
                }
                disabled={loading}
                aria-pressed={
                  locale === "fr"
                }
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "7px 11px",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  background:
                    locale === "fr"
                      ? "#ffffff"
                      : "transparent",
                  color:
                    locale === "fr"
                      ? "#0f766e"
                      : "#64748b",
                  fontWeight:
                    locale === "fr"
                      ? 700
                      : 500,
                  boxShadow:
                    locale === "fr"
                      ? "0 1px 4px rgba(15, 23, 42, 0.10)"
                      : "none",
                }}
              >
                🇫🇷 FR
              </button>

              <button
                type="button"
                onClick={() =>
                  handleLocaleChange("en")
                }
                disabled={loading}
                aria-pressed={
                  locale === "en"
                }
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "7px 11px",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  background:
                    locale === "en"
                      ? "#ffffff"
                      : "transparent",
                  color:
                    locale === "en"
                      ? "#0f766e"
                      : "#64748b",
                  fontWeight:
                    locale === "en"
                      ? 700
                      : 500,
                  boxShadow:
                    locale === "en"
                      ? "0 1px 4px rgba(15, 23, 42, 0.10)"
                      : "none",
                }}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          {/* =====================================================
              HEADER
          ====================================================== */}

          <div className="pf-auth-header">
            <div className="pf-auth-badge">
              <span className="pf-auth-badge-icon">
                🏥
              </span>

              <span>{t.badge}</span>
            </div>

            <h1>{t.title}</h1>

            <p>{t.description}</p>
          </div>

          {/* =====================================================
              ESSAI GRATUIT
          ====================================================== */}

          <div
            style={{
              marginTop: "20px",
              marginBottom: "24px",
              padding: "18px",
              borderRadius: "16px",
              border: "1px solid #99f6e4",
              background:
                "linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  minWidth: "42px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ccfbf1",
                  fontSize: "21px",
                }}
              >
                🎁
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "17px",
                    color: "#115e59",
                    marginBottom: "4px",
                  }}
                >
                  {t.trialTitle}
                </strong>

                <span
                  style={{
                    display: "block",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    color: "#475569",
                  }}
                >
                  {t.trialDescription}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "7px",
                marginTop: "14px",
                fontSize: "13px",
                color: "#334155",
              }}
            >
              <div>✓ {t.trialPoint1}</div>
              <div>✓ {t.trialPoint2}</div>
              <div>✓ {t.trialPoint3}</div>
            </div>
          </div>

          {/* =====================================================
              SUCCÈS
          ====================================================== */}

          {success && (
            <div
              className="pf-alert"
              role="status"
              style={{
                marginBottom: "20px",
                border:
                  "1px solid #86efac",
                background:
                  "#f0fdf4",
                color:
                  "#166534",
              }}
            >
              <span
                className="pf-alert-icon"
              >
                ✓
              </span>

              <div>
                <strong>
                  {t.successTitle}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    lineHeight: 1.5,
                  }}
                >
                  {t.successDescription}
                </span>
              </div>
            </div>
          )}

          {/* =====================================================
              ERREUR
          ====================================================== */}

          {error && (
            <div
              className="pf-alert pf-alert-danger"
              role="alert"
            >
              <span className="pf-alert-icon">
                !
              </span>

              <span>{error}</span>
            </div>
          )}

          {!success && (
            <form
              onSubmit={handleSubmit}
              className="pf-auth-form"
            >

              {/* =================================================
                  INFORMATIONS PHARMACIE
              ================================================== */}

              <div
                style={{
                  marginBottom: "4px",
                  paddingBottom: "4px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    color:
                      "var(--pf-text, #0f172a)",
                  }}
                >
                  {t.pharmacySection}
                </h2>
              </div>

              {/* NOM PHARMACIE */}

              <div className="pf-form-group">
                <label
                  htmlFor="pharmacyName"
                  className="pf-form-label"
                >
                  {t.pharmacyName}
                </label>

                <div className="pf-input-wrapper">
                  <span
                    className="pf-input-icon"
                    aria-hidden="true"
                  >
                    🏥
                  </span>

                  <input
                    id="pharmacyName"
                    name="pharmacyName"
                    type="text"
                    value={pharmacyName}
                    onChange={(event) => {
                      setPharmacyName(
                        event.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder={
                      t.pharmacyNamePlaceholder
                    }
                    className="pf-form-input pf-form-input-with-icon"
                    autoComplete="organization"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* PAYS */}

              <div className="pf-form-group">
                <label
                  htmlFor="countryCode"
                  className="pf-form-label"
                >
                  {t.country}
                </label>

                <div className="pf-input-wrapper">
                  <span
                    className="pf-input-icon"
                    aria-hidden="true"
                  >
                    🌍
                  </span>

                  <select
                    id="countryCode"
                    name="countryCode"
                    value={countryCode}
                    onChange={(event) => {
                      setCountryCode(
                        event.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    className="pf-form-input pf-form-input-with-icon"
                    disabled={loading}
                    required
                  >
                    <option value="">
                      {t.countryPlaceholder}
                    </option>

                    {COUNTRIES.map(
                      (country) => (
                        <option
                          key={country.code}
                          value={country.code}
                        >
                          {country.name} —{" "}
                          {country.currency}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {/* VILLE */}

              <div className="pf-form-group">
                <label
                  htmlFor="city"
                  className="pf-form-label"
                >
                  {t.city}
                </label>

                <div className="pf-input-wrapper">
                  <span
                    className="pf-input-icon"
                    aria-hidden="true"
                  >
                    📍
                  </span>

                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={city}
                    onChange={(event) => {
                      setCity(
                        event.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder={
                      t.cityPlaceholder
                    }
                    className="pf-form-input pf-form-input-with-icon"
                    autoComplete="address-level2"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* ADRESSE */}

              <div className="pf-form-group">
                <label
                  htmlFor="address"
                  className="pf-form-label"
                >
                  {t.address}
                </label>

                <div className="pf-input-wrapper">
                  <span
                    className="pf-input-icon"
                    aria-hidden="true"
                  >
                    🏢
                  </span>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={address}
                    onChange={(event) => {
                      setAddress(
                        event.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder={
                      t.addressPlaceholder
                    }
                    className="pf-form-input pf-form-input-with-icon"
                    autoComplete="street-address"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* =================================================
                  INFORMATIONS RESPONSABLE
              ================================================== */}

              <div
                style={{
                  marginTop: "10px",
                  marginBottom: "4px",
                  paddingTop: "12px",
                  borderTop:
                    "1px solid var(--pf-border, #e2e8f0)",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    color:
                      "var(--pf-text, #0f172a)",
                  }}
                >
                  {t.accountSection}
                </h2>
              </div>

              {/* NOM COMPLET */}

              <div className="pf-form-group">
                <label
                  htmlFor="fullName"
                  className="pf-form-label"
                >
                  {t.fullName}
                </label>

                <div className="pf-input-wrapper">
                  <span
                    className="pf-input-icon"
                    aria-hidden="true"
                  >
                    👤
                  </span>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(
                        event.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder={
                      t.fullNamePlaceholder
                    }
                    className="pf-form-input pf-form-input-with-icon"
                    autoComplete="name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* TÉLÉPHONE */}

              <div className="pf-form-group">
                <label
                  htmlFor="phone"
                  className="pf-form-label"
                >
                  {t.phone}
                </label>

                <div className="pf-input-wrapper">
                  <span
                    className="pf-input-icon"
                    aria-hidden="true"
                  >
                    📱
                  </span>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(
                        event.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder={
                      t.phonePlaceholder
                    }
                    className="pf-form-input pf-form-input-with-icon"
                    autoComplete="tel"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}

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

              {/* MOT DE PASSE */}

              <div className="pf-form-group">
                <label
                  htmlFor="password"
                  className="pf-form-label"
                >
                  {t.password}
                </label>

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
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="pf-input-action"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value,
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Masquer"
                        : "Afficher"
                    }
                  >
                    {showPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>

                {password && (
                  <div
                    style={{
                      marginTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        marginBottom: "5px",
                      }}
                    >
                      {[1, 2, 3].map(
                        (level) => (
                          <div
                            key={level}
                            style={{
                              height: "4px",
                              flex: 1,
                              borderRadius:
                                "999px",
                              background:
                                passwordStrength.level >=
                                level
                                  ? level === 1
                                    ? "#ef4444"
                                    : level === 2
                                      ? "#f59e0b"
                                      : "#22c55e"
                                  : "#e2e8f0",
                            }}
                          />
                        ),
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      {passwordStrength.label}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {t.passwordRequirements}
                </div>
              </div>

              {/* CONFIRMATION */}

              <div className="pf-form-group">
                <label
                  htmlFor="confirmation"
                  className="pf-form-label"
                >
                  {t.confirmation}
                </label>

                <div className="pf-input-wrapper">
                  <span
                    className="pf-input-icon"
                    aria-hidden="true"
                  >
                    🔐
                  </span>

                  <input
                    id="confirmation"
                    name="confirmation"
                    type={
                      showConfirmation
                        ? "text"
                        : "password"
                    }
                    value={confirmation}
                    onChange={(event) => {
                      setConfirmation(
                        event.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder={
                      t.confirmationPlaceholder
                    }
                    className="pf-form-input pf-form-input-with-icon pf-form-input-with-action"
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="pf-input-action"
                    onClick={() =>
                      setShowConfirmation(
                        (value) => !value,
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showConfirmation
                        ? "Masquer"
                        : "Afficher"
                    }
                  >
                    {showConfirmation
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </div>

              {/* =================================================
                  LANGUE
              ================================================== */}

              <div className="pf-form-group">
                <label
                  className="pf-form-label"
                >
                  {t.language}
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setLanguage("fr")
                    }
                    disabled={loading}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border:
                        language === "fr"
                          ? "2px solid #0f766e"
                          : "1px solid #e2e8f0",
                      background:
                        language === "fr"
                          ? "#f0fdfa"
                          : "#ffffff",
                      color:
                        language === "fr"
                          ? "#0f766e"
                          : "#475569",
                      fontWeight:
                        language === "fr"
                          ? 700
                          : 500,
                      cursor: loading
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    🇫🇷 {t.french}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLanguage("en")
                    }
                    disabled={loading}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border:
                        language === "en"
                          ? "2px solid #0f766e"
                          : "1px solid #e2e8f0",
                      background:
                        language === "en"
                          ? "#f0fdfa"
                          : "#ffffff",
                      color:
                        language === "en"
                          ? "#0f766e"
                          : "#475569",
                      fontWeight:
                        language === "en"
                          ? 700
                          : 500,
                      cursor: loading
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    🇬🇧 {t.english}
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "7px",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {t.languageDescription}
                </div>
              </div>

              {/* =================================================
                  DEVISE
              ================================================== */}

              {selectedCountry && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  <strong>
                    {t.currency} :
                  </strong>{" "}
                  {selectedCountry.currency}
                </div>
              )}

              {/* =================================================
                  CONDITIONS
              ================================================== */}

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: "#475569",
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => {
                    setAcceptTerms(
                      event.target.checked,
                    );

                    if (error) {
                      setError("");
                    }
                  }}
                  disabled={loading}
                  style={{
                    marginTop: "3px",
                  }}
                  required
                />

                <span>{t.terms}</span>
              </label>

              {/* =================================================
                  BOUTON
              ================================================== */}

              <button
                type="submit"
                className="pf-btn pf-btn-primary pf-btn-full pf-auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="pf-spinner pf-spinner-small" />
                    {t.creating}
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    {t.createAccount}
                  </>
                )}
              </button>
            </form>
          )}

          {/* =====================================================
              CONNEXION
          ====================================================== */}

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
              {t.alreadyAccount}
            </span>{" "}

            <Link
              href={`/login?locale=${language}`}
              className="pf-auth-back-link"
            >
              {t.login}
            </Link>
          </div>

          {/* =====================================================
              SÉCURITÉ
          ====================================================== */}

          <div className="pf-auth-security">
            <span className="pf-auth-security-icon">
              🛡️
            </span>

            <div>
              <strong>{t.security}</strong>

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

        {/* =======================================================
            FOOTER
        ======================================================== */}

        <footer className="pf-auth-page-footer">
          {t.footer}
        </footer>
      </div>
    </main>
  );
}