"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

import { createClient } from "../lib/supabase/client";

const TEXT = {
  fr: {
    brand: "PharmaFlow",
    badge: "Sécurité du compte",
    title: "Mot de passe oublié ?",
    description:
      "Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
    emailLabel: "Adresse e-mail",
    emailPlaceholder: "exemple@pharmacie.com",
    send: "Envoyer le lien",
    sending: "Envoi en cours...",
    backLogin: "Retour à la connexion",
    successTitle: "E-mail envoyé !",
    successDescription:
      "Si un compte existe avec cette adresse e-mail, vous recevrez un lien pour réinitialiser votre mot de passe.",
    sendAgain: "Renvoyer l’e-mail",
    invalidEmail: "Veuillez saisir une adresse e-mail valide.",
    genericError:
      "Une erreur est survenue. Veuillez réessayer dans quelques instants.",
    footer: "© 2026 PharmaFlow. Tous droits réservés.",
    secure: "Vos données sont protégées et sécurisées.",
  },

  en: {
    brand: "PharmaFlow",
    badge: "Account security",
    title: "Forgot your password?",
    description:
      "Enter your email address and we will send you a link to reset your password.",
    emailLabel: "Email address",
    emailPlaceholder: "example@pharmacy.com",
    send: "Send reset link",
    sending: "Sending...",
    backLogin: "Back to login",
    successTitle: "Email sent!",
    successDescription:
      "If an account exists with this email address, you will receive a link to reset your password.",
    sendAgain: "Send email again",
    invalidEmail: "Please enter a valid email address.",
    genericError:
      "Something went wrong. Please try again in a few moments.",
    footer: "© 2026 PharmaFlow. All rights reserved.",
    secure: "Your data is protected and secure.",
  },
} as const;

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = TEXT[locale === "en" ? "en" : "fr"];

  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError(t.invalidEmail);
      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo,
        });

      if (resetError) {
        console.error("Password reset error:", resetError);
        setError(t.genericError);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Unexpected password reset error:", err);
      setError(t.genericError);
    } finally {
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
          {/* Logo */}
          <div className="pf-auth-logo">
            <div className="pf-auth-logo-icon">
              <span>✚</span>
            </div>

            <div>
              <div className="pf-auth-logo-name">{t.brand}</div>
              <div className="pf-auth-logo-subtitle">
                Pharmacy Management
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="pf-auth-header">
            <div className="pf-auth-badge">
              <span className="pf-auth-badge-icon">🔐</span>
              <span>{t.badge}</span>
            </div>

            <h1>{t.title}</h1>

            <p>{t.description}</p>
          </div>

          {/* Success */}
          {success ? (
            <div className="pf-auth-success">
              <div className="pf-auth-success-icon">✓</div>

              <h2>{t.successTitle}</h2>

              <p>{t.successDescription}</p>

              <button
                type="button"
                className="pf-btn pf-btn-secondary pf-btn-full"
                onClick={() => {
                  setSuccess(false);
                  setError("");
                }}
              >
                {t.sendAgain}
              </button>

              <Link
                href="/login"
                className="pf-auth-back-link"
              >
                ← {t.backLogin}
              </Link>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="pf-alert pf-alert-danger">
                  <span className="pf-alert-icon">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="pf-auth-form"
              >
                <div className="pf-form-group">
                  <label
                    htmlFor="email"
                    className="pf-form-label"
                  >
                    {t.emailLabel}
                  </label>

                  <div className="pf-input-wrapper">
                    <span className="pf-input-icon">✉</span>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) {
                          setError("");
                        }
                      }}
                      placeholder={t.emailPlaceholder}
                      className="pf-form-input pf-form-input-with-icon"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="pf-btn pf-btn-primary pf-btn-full pf-auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="pf-spinner pf-spinner-small" />
                      {t.sending}
                    </>
                  ) : (
                    <>
                      <span>✉</span>
                      {t.send}
                    </>
                  )}
                </button>
              </form>

              {/* Back */}
              <div className="pf-auth-footer-link">
                <Link
                  href="/login"
                  className="pf-auth-back-link"
                >
                  ← {t.backLogin}
                </Link>
              </div>
            </>
          )}

          {/* Security */}
          <div className="pf-auth-security">
            <span className="pf-auth-security-icon">🛡️</span>
            <span>{t.secure}</span>
          </div>
        </section>

        {/* Footer */}
        <footer className="pf-auth-page-footer">
          {t.footer}
        </footer>
      </div>
    </main>
  );
}