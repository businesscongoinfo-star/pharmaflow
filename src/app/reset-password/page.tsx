"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { createClient } from "../lib/supabase/client";

const TEXT = {
  fr: {
    brand: "PharmaFlow",
    badge: "Sécurité du compte",
    title: "Créer un nouveau mot de passe",
    description:
      "Choisissez un nouveau mot de passe sécurisé pour protéger votre compte PharmaFlow.",
    passwordLabel: "Nouveau mot de passe",
    passwordPlaceholder: "Entrez votre nouveau mot de passe",
    confirmLabel: "Confirmer le mot de passe",
    confirmPlaceholder: "Confirmez votre nouveau mot de passe",
    update: "Modifier le mot de passe",
    updating: "Modification en cours...",
    successTitle: "Mot de passe modifié !",
    successDescription:
      "Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter à votre compte.",
    login: "Se connecter",
    invalidPassword:
      "Le mot de passe doit contenir au moins 8 caractères.",
    passwordsMismatch:
      "Les deux mots de passe ne correspondent pas.",
    invalidLink:
      "Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.",
    genericError:
      "Une erreur est survenue. Veuillez réessayer.",
    backLogin: "Retour à la connexion",
    security: "Votre mot de passe est protégé et sécurisé.",
    footer: "© 2026 PharmaFlow. Tous droits réservés.",
    passwordHint:
      "Utilisez au moins 8 caractères avec un mélange de lettres et de chiffres.",
  },

  en: {
    brand: "PharmaFlow",
    badge: "Account security",
    title: "Create a new password",
    description:
      "Choose a new secure password to protect your PharmaFlow account.",
    passwordLabel: "New password",
    passwordPlaceholder: "Enter your new password",
    confirmLabel: "Confirm password",
    confirmPlaceholder: "Confirm your new password",
    update: "Update password",
    updating: "Updating...",
    successTitle: "Password updated!",
    successDescription:
      "Your password has been successfully updated. You can now sign in to your account.",
    login: "Sign in",
    invalidPassword:
      "Your password must contain at least 8 characters.",
    passwordsMismatch:
      "The two passwords do not match.",
    invalidLink:
      "This password reset link is invalid or has expired. Please request a new link.",
    genericError:
      "Something went wrong. Please try again.",
    backLogin: "Back to login",
    security: "Your password is protected and secure.",
    footer: "© 2026 PharmaFlow. All rights reserved.",
    passwordHint:
      "Use at least 8 characters with a mix of letters and numbers.",
  },
} as const;

export default function ResetPasswordPage() {
  const locale = useLocale();
  const router = useRouter();

  const t = TEXT[locale === "en" ? "en" : "fr"];

  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError || !session) {
          setError(t.invalidLink);
        }
      } catch (err) {
        console.error(
          "Reset password session error:",
          err
        );

        if (mounted) {
          setError(t.invalidLink);
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [supabase.auth, t.invalidLink]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(t.invalidPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordsMismatch);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        console.error(
          "Password update error:",
          updateError
        );

        setError(t.genericError);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error(
        "Unexpected password update error:",
        err
      );

      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    router.push("/login");
  }

  if (checkingSession) {
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
                  Pharmacy Management
                </div>
              </div>
            </div>

            <div className="pf-auth-loading">
              <span className="pf-spinner" />

              <p>{t.updating}</p>
            </div>

            <div className="pf-auth-security">
              <span className="pf-auth-security-icon">
                🛡️
              </span>

              <span>{t.security}</span>
            </div>
          </section>

          <footer className="pf-auth-page-footer">
            {t.footer}
          </footer>
        </div>
      </main>
    );
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
              <div className="pf-auth-logo-name">
                {t.brand}
              </div>

              <div className="pf-auth-logo-subtitle">
                Pharmacy Management
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="pf-auth-header">
            <div className="pf-auth-badge">
              <span className="pf-auth-badge-icon">
                🔐
              </span>

              <span>{t.badge}</span>
            </div>

            <h1>
              {success
                ? t.successTitle
                : t.title}
            </h1>

            <p>
              {success
                ? t.successDescription
                : t.description}
            </p>
          </div>

          {/* Success */}
          {success ? (
            <div className="pf-auth-success">
              <div className="pf-auth-success-icon">
                ✓
              </div>

              <h2>{t.successTitle}</h2>

              <p>{t.successDescription}</p>

              <button
                type="button"
                className="pf-btn pf-btn-primary pf-btn-full"
                onClick={goToLogin}
              >
                {t.login}
              </button>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="pf-alert pf-alert-danger">
                  <span className="pf-alert-icon">
                    !
                  </span>

                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              {!error ||
              error !== t.invalidLink ? (
                <form
                  onSubmit={handleSubmit}
                  className="pf-auth-form"
                >
                  {/* Password */}
                  <div className="pf-form-group">
                    <label
                      htmlFor="password"
                      className="pf-form-label"
                    >
                      {t.passwordLabel}
                    </label>

                    <div className="pf-input-wrapper">
                      <span className="pf-input-icon">
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
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(
                            event.target.value
                          );

                          if (error) {
                            setError("");
                          }
                        }}
                        placeholder={
                          t.passwordPlaceholder
                        }
                        className="pf-form-input pf-form-input-with-icon pf-form-input-with-action"
                        disabled={loading}
                        minLength={8}
                        required
                      />

                      <button
                        type="button"
                        className="pf-input-action"
                        onClick={() =>
                          setShowPassword(
                            (value) => !value
                          )
                        }
                        disabled={loading}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>

                    <p className="pf-form-hint">
                      {t.passwordHint}
                    </p>
                  </div>

                  {/* Confirm password */}
                  <div className="pf-form-group">
                    <label
                      htmlFor="confirmPassword"
                      className="pf-form-label"
                    >
                      {t.confirmLabel}
                    </label>

                    <div className="pf-input-wrapper">
                      <span className="pf-input-icon">
                        🔒
                      </span>

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(
                            event.target.value
                          );

                          if (error) {
                            setError("");
                          }
                        }}
                        placeholder={
                          t.confirmPlaceholder
                        }
                        className="pf-form-input pf-form-input-with-icon pf-form-input-with-action"
                        disabled={loading}
                        minLength={8}
                        required
                      />

                      <button
                        type="button"
                        className="pf-input-action"
                        onClick={() =>
                          setShowConfirmPassword(
                            (value) => !value
                          )
                        }
                        disabled={loading}
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword
                          ? "🙈"
                          : "👁️"}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="pf-btn pf-btn-primary pf-btn-full pf-auth-submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="pf-spinner pf-spinner-small" />
                        {t.updating}
                      </>
                    ) : (
                      <>
                        <span>🔐</span>
                        {t.update}
                      </>
                    )}
                  </button>
                </form>
              ) : null}

              {/* Back login */}
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
            <span className="pf-auth-security-icon">
              🛡️
            </span>

            <span>{t.security}</span>
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