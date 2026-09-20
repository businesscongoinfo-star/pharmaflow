"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/app/lib/supabase/client";

export default function AgentChangePasswordPage() {
  const router = useRouter();

  const [supabase] = useState(() =>
    createClient(),
  );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data,
          error: sessionError,
        } = await supabase.auth.getUser();

        if (
          sessionError ||
          !data.user
        ) {
          router.replace(
            "/login?redirect=%2Fagent%2Fchange-password",
          );

          return;
        }

        if (!mounted) {
          return;
        }

        setEmail(
          data.user.email ?? "",
        );
      } catch {
        if (!mounted) {
          return;
        }

        setError(
          "Impossible de vérifier votre session.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  function validatePassword(
    value: string,
  ) {
    if (value.length < 8) {
      return "Le mot de passe doit contenir au moins 8 caractères.";
    }

    if (!/[A-Z]/.test(value)) {
      return "Le mot de passe doit contenir au moins une lettre majuscule.";
    }

    if (!/[a-z]/.test(value)) {
      return "Le mot de passe doit contenir au moins une lettre minuscule.";
    }

    if (!/[0-9]/.test(value)) {
      return "Le mot de passe doit contenir au moins un chiffre.";
    }

    return "";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Les deux mots de passe ne correspondent pas.",
      );

      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error: userError,
      } = await supabase.auth.getUser();

      if (
        userError ||
        !data.user
      ) {
        throw new Error(
          "Votre session a expiré. Veuillez vous reconnecter.",
        );
      }

      /*
       * Le nouveau mot de passe est envoyé
       * directement à Supabase Auth.
       *
       * Il n'est jamais enregistré dans
       * platform_team_members.
       */
      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw new Error(
          updateError.message ||
            "Impossible de modifier le mot de passe.",
        );
      }

      /*
       * Une fois le mot de passe modifié,
       * on demande au serveur de supprimer
       * l'indicateur must_change_password.
       */
      const response = await fetch(
        "/api/agent/password-status",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "password_changed",
          }),
        },
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        /*
         * Le mot de passe Supabase a bien été
         * modifié, mais le statut interne n'a
         * pas pu être mis à jour.
         *
         * On ne prétend donc pas que tout est
         * terminé.
         */
        throw new Error(
          result.error ||
            "Le mot de passe a été modifié, mais le statut du compte n'a pas pu être mis à jour.",
        );
      }

      setSuccess(
        "Votre mot de passe a été modifié avec succès.",
      );

      window.setTimeout(() => {
        router.replace("/agent");
        router.refresh();
      }, 900);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="pf-agent-password-page">
        <div className="pf-agent-password-loading">
          <div className="pf-agent-password-spinner" />

          <p>
            Vérification de votre compte...
          </p>
        </div>

        <style jsx>{`
          .pf-agent-password-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f5f7fb;
          }

          .pf-agent-password-loading {
            text-align: center;
            color: #667085;
            font-size: 13px;
          }

          .pf-agent-password-spinner {
            width: 34px;
            height: 34px;
            margin: 0 auto 12px;
            border: 3px solid #dbe4f2;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 0.75s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="pf-agent-password-page">

      <div className="pf-agent-password-container">

        {/* ===================================================
            LOGO / IDENTITÉ
           =================================================== */}

        <div className="pf-agent-password-brand">

          <div className="pf-agent-password-brand-icon">
            P
          </div>

          <div>
            <strong>
              PharmaFlow
            </strong>

            <span>
              Équipe interne
            </span>
          </div>

        </div>


        {/* ===================================================
            CARD
           =================================================== */}

        <section className="pf-agent-password-card">

          <div className="pf-agent-password-icon">
            🔐
          </div>

          <div className="pf-agent-password-heading">

            <span className="pf-agent-password-badge">
              Sécurité du compte
            </span>

            <h1>
              Créez votre mot de passe
            </h1>

            <p>
              Pour protéger votre compte,
              vous devez remplacer le mot de passe
              temporaire avant d'accéder à votre
              espace agent PharmaFlow.
            </p>

          </div>


          {/* =================================================
              EMAIL
             ================================================= */}

          <div className="pf-agent-password-account">

            <span>
              Compte connecté
            </span>

            <strong>
              {email || "Compte PharmaFlow"}
            </strong>

          </div>


          {/* =================================================
              ALERT ERROR
             ================================================= */}

          {error && (
            <div className="pf-agent-password-alert pf-agent-password-alert-error">

              <span>
                ⚠️
              </span>

              <div>

                <strong>
                  Modification impossible
                </strong>

                <p>
                  {error}
                </p>

              </div>

            </div>
          )}


          {/* =================================================
              ALERT SUCCESS
             ================================================= */}

          {success && (
            <div className="pf-agent-password-alert pf-agent-password-alert-success">

              <span>
                ✅
              </span>

              <div>

                <strong>
                  Mot de passe modifié
                </strong>

                <p>
                  Redirection vers votre espace agent...
                </p>

              </div>

            </div>
          )}


          <form
            onSubmit={handleSubmit}
            className="pf-agent-password-form"
          >

            {/* =================================================
                PASSWORD
               ================================================= */}

            <div className="pf-agent-password-field">

              <label htmlFor="new-password">
                Nouveau mot de passe
              </label>

              <div className="pf-agent-password-input-wrapper">

                <input
                  id="new-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Entrez votre nouveau mot de passe"
                  autoComplete="new-password"
                  disabled={saving}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={saving}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

            </div>


            {/* =================================================
                CONFIRM PASSWORD
               ================================================= */}

            <div className="pf-agent-password-field">

              <label htmlFor="confirm-password">
                Confirmer le mot de passe
              </label>

              <div className="pf-agent-password-input-wrapper">

                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Confirmez votre nouveau mot de passe"
                  autoComplete="new-password"
                  disabled={saving}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={saving}
                  aria-label={
                    showConfirmPassword
                      ? "Masquer la confirmation"
                      : "Afficher la confirmation"
                  }
                >
                  {showConfirmPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

            </div>


            {/* =================================================
                PASSWORD RULES
               ================================================= */}

            <div className="pf-agent-password-rules">

              <div className="pf-agent-password-rules-title">
                Votre mot de passe doit contenir :
              </div>

              <div
                className={
                  password.length >= 8
                    ? "pf-agent-password-rule pf-agent-password-rule-ok"
                    : "pf-agent-password-rule"
                }
              >
                <span>
                  {password.length >= 8
                    ? "✓"
                    : "○"}
                </span>

                Au moins 8 caractères
              </div>

              <div
                className={
                  /[A-Z]/.test(password)
                    ? "pf-agent-password-rule pf-agent-password-rule-ok"
                    : "pf-agent-password-rule"
                }
              >
                <span>
                  {/[A-Z]/.test(password)
                    ? "✓"
                    : "○"}
                </span>

                Une lettre majuscule
              </div>

              <div
                className={
                  /[a-z]/.test(password)
                    ? "pf-agent-password-rule pf-agent-password-rule-ok"
                    : "pf-agent-password-rule"
                }
              >
                <span>
                  {/[a-z]/.test(password)
                    ? "✓"
                    : "○"}
                </span>

                Une lettre minuscule
              </div>

              <div
                className={
                  /[0-9]/.test(password)
                    ? "pf-agent-password-rule pf-agent-password-rule-ok"
                    : "pf-agent-password-rule"
                }
              >
                <span>
                  {/[0-9]/.test(password)
                    ? "✓"
                    : "○"}
                </span>

                Un chiffre
              </div>

            </div>


            {/* =================================================
                SUBMIT
               ================================================= */}

            <button
              type="submit"
              disabled={
                saving ||
                Boolean(success)
              }
              className="pf-agent-password-submit"
            >

              {saving ? (
                <>
                  <span className="pf-agent-password-button-spinner" />

                  Enregistrement...
                </>
              ) : (
                <>
                  🔒 Enregistrer mon nouveau mot de passe
                </>
              )}

            </button>

          </form>


          {/* =================================================
              SECURITY NOTE
             ================================================= */}

          <div className="pf-agent-password-security">

            <span>
              🛡️
            </span>

            <div>

              <strong>
                Votre sécurité est importante
              </strong>

              <p>
                Votre nouveau mot de passe est
                géré par le système d'authentification
                sécurisé de PharmaFlow. Il n'est pas
                enregistré dans votre profil d'équipe.
              </p>

            </div>

          </div>

        </section>


        <p className="pf-agent-password-footer">
          © {new Date().getFullYear()} PharmaFlow Africa
        </p>

      </div>


      <style jsx>{`

        .pf-agent-password-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 18px;
          background:
            radial-gradient(
              circle at top,
              #edf4ff 0%,
              #f5f7fb 42%,
              #f5f7fb 100%
            );
          color: #111827;
        }

        .pf-agent-password-container {
          width: 100%;
          max-width: 500px;
        }

        .pf-agent-password-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .pf-agent-password-brand-icon {
          width: 43px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #2563eb;
          color: #fff;
          font-size: 20px;
          font-weight: 900;
          box-shadow:
            0 8px 20px rgba(
              37,
              99,
              235,
              0.22
            );
        }

        .pf-agent-password-brand strong {
          display: block;
          color: #172033;
          font-size: 16px;
          font-weight: 850;
        }

        .pf-agent-password-brand span {
          display: block;
          margin-top: 2px;
          color: #8a94a6;
          font-size: 10px;
        }

        .pf-agent-password-card {
          padding: 28px;
          border: 1px solid #e2e7ef;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 18px 55px rgba(
              15,
              23,
              42,
              0.08
            );
        }

        .pf-agent-password-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 17px;
          border-radius: 16px;
          background: #eef4ff;
          font-size: 27px;
        }

        .pf-agent-password-badge {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 0 9px;
          border-radius: 999px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 9px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pf-agent-password-heading h1 {
          margin: 10px 0 0;
          color: #172033;
          font-size: 26px;
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -0.5px;
        }

        .pf-agent-password-heading p {
          margin: 9px 0 0;
          color: #697586;
          font-size: 12px;
          line-height: 1.65;
        }

        .pf-agent-password-account {
          margin-top: 19px;
          padding: 12px 14px;
          border: 1px solid #e5e9ef;
          border-radius: 10px;
          background: #f8fafc;
        }

        .pf-agent-password-account span {
          display: block;
          color: #8a94a6;
          font-size: 9px;
          font-weight: 700;
        }

        .pf-agent-password-account strong {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          color: #344054;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pf-agent-password-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 15px;
          padding: 12px;
          border-radius: 10px;
        }

        .pf-agent-password-alert > span {
          font-size: 17px;
        }

        .pf-agent-password-alert strong {
          display: block;
          font-size: 11px;
          font-weight: 850;
        }

        .pf-agent-password-alert p {
          margin: 3px 0 0;
          font-size: 10px;
          line-height: 1.5;
        }

        .pf-agent-password-alert-error {
          border: 1px solid #fecaca;
          background: #fff7f7;
          color: #991b1b;
        }

        .pf-agent-password-alert-success {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .pf-agent-password-form {
          margin-top: 20px;
        }

        .pf-agent-password-field {
          margin-bottom: 15px;
        }

        .pf-agent-password-field label {
          display: block;
          margin-bottom: 7px;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-agent-password-input-wrapper {
          display: flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid #d9dee7;
          border-radius: 10px;
          background: #fff;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .pf-agent-password-input-wrapper:focus-within {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(
              37,
              99,
              235,
              0.10
            );
        }

        .pf-agent-password-input-wrapper input {
          flex: 1;
          min-width: 0;
          height: 48px;
          padding: 0 13px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #172033;
          font: inherit;
          font-size: 13px;
        }

        .pf-agent-password-input-wrapper button {
          width: 45px;
          height: 48px;
          border: 0;
          border-left: 1px solid #edf0f4;
          background: #f8fafc;
          cursor: pointer;
          font-size: 15px;
        }

        .pf-agent-password-rules {
          margin: 18px 0;
          padding: 14px;
          border: 1px solid #e5e9ef;
          border-radius: 11px;
          background: #fafbfc;
        }

        .pf-agent-password-rules-title {
          margin-bottom: 9px;
          color: #475467;
          font-size: 10px;
          font-weight: 800;
        }

        .pf-agent-password-rule {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 6px;
          color: #8a94a6;
          font-size: 10px;
        }

        .pf-agent-password-rule span {
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eef1f5;
          font-size: 9px;
          font-weight: 900;
        }

        .pf-agent-password-rule-ok {
          color: #15803d;
        }

        .pf-agent-password-rule-ok span {
          background: #dcfce7;
          color: #15803d;
        }

        .pf-agent-password-submit {
          width: 100%;
          min-height: 49px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 11px;
          background: #2563eb;
          color: #fff;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          box-shadow:
            0 8px 20px rgba(
              37,
              99,
              235,
              0.18
            );
        }

        .pf-agent-password-submit:hover {
          background: #1d4ed8;
        }

        .pf-agent-password-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .pf-agent-password-button-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(
            255,
            255,
            255,
            0.4
          );
          border-top-color: #fff;
          border-radius: 50%;
          animation:
            pf-agent-password-spin
            0.7s linear infinite;
        }

        .pf-agent-password-security {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 18px;
          padding: 12px;
          border: 1px solid #dbe8ff;
          border-radius: 10px;
          background: #f5f9ff;
        }

        .pf-agent-password-security > span {
          font-size: 17px;
        }

        .pf-agent-password-security strong {
          display: block;
          color: #1f3b68;
          font-size: 10px;
          font-weight: 850;
        }

        .pf-agent-password-security p {
          margin: 3px 0 0;
          color: #60708a;
          font-size: 9px;
          line-height: 1.55;
        }

        .pf-agent-password-footer {
          margin: 17px 0 0;
          color: #98a2b3;
          text-align: center;
          font-size: 9px;
        }

        @keyframes pf-agent-password-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          .pf-agent-password-page {
            padding: 20px 13px;
          }

          .pf-agent-password-card {
            padding: 21px 17px;
            border-radius: 16px;
          }

          .pf-agent-password-heading h1 {
            font-size: 23px;
          }
        }

      `}</style>

    </main>
  );
}