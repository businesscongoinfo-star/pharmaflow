"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/app/lib/supabase/client";

export default function InvitationPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function loadInvitation() {
      try {
        /*
         * Supabase JS récupère automatiquement
         * la session provenant du lien d'invitation
         * lorsque le token est présent dans le hash.
         */
        const {
          data,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session?.user) {
          setError(
            "Le lien d'invitation est invalide, expiré ou déjà utilisé.",
          );

          setLoading(false);

          return;
        }

        setEmail(
          data.session.user.email ?? "",
        );

        setLoading(false);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de valider l'invitation.",
        );

        setLoading(false);
      }
    }

    loadInvitation();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères.",
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Les deux mots de passe ne correspondent pas.",
      );

      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error: updateError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      if (!data.user) {
        throw new Error(
          "Impossible de finaliser la création du compte.",
        );
      }

      setSuccess(
        "Votre compte a été configuré avec succès.",
      );

      /*
       * Petite pause pour permettre à l'utilisateur
       * de voir le message de succès.
       */
      setTimeout(() => {
        router.replace("/agent");
        router.refresh();
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer votre mot de passe.",
      );

      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="pf-invitation-page">
        <section className="pf-invitation-card">
          <div className="pf-invitation-logo">
            +
          </div>

          <h1>
            Vérification de l'invitation
          </h1>

          <p>
            Nous vérifions votre invitation
            PharmaFlow...
          </p>

          <div className="pf-invitation-spinner" />
        </section>

        <style>{`

          .pf-invitation-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
              linear-gradient(
                135deg,
                #f4faf9 0%,
                #eef7f6 50%,
                #f8fafc 100%
              );
          }

          .pf-invitation-card {
            width: 100%;
            max-width: 470px;
            padding: 42px 38px;
            text-align: center;
            background: #ffffff;
            border: 1px solid #e4ebe9;
            border-radius: 22px;
            box-shadow:
              0 20px 60px rgba(15, 23, 42, 0.09);
          }

          .pf-invitation-logo {
            width: 62px;
            height: 62px;
            margin: 0 auto 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 17px;
            background: #2b9b8e;
            color: white;
            font-size: 34px;
            font-weight: 800;
          }

          .pf-invitation-card h1 {
            margin: 0;
            color: #17252d;
            font-size: 26px;
            font-weight: 800;
          }

          .pf-invitation-card p {
            margin: 12px 0 0;
            color: #697780;
            font-size: 14px;
            line-height: 1.6;
          }

          .pf-invitation-spinner {
            width: 34px;
            height: 34px;
            margin: 25px auto 0;
            border: 3px solid #dbe9e7;
            border-top-color: #2b9b8e;
            border-radius: 50%;
            animation:
              pfInvitationSpin
              0.8s
              linear
              infinite;
          }

          @keyframes pfInvitationSpin {
            to {
              transform: rotate(360deg);
            }
          }

        `}</style>
      </main>
    );
  }

  return (
    <main className="pf-invitation-page">

      <section className="pf-invitation-card">

        <div className="pf-invitation-logo">
          +
        </div>

        <div className="pf-invitation-badge">
          🔐 Invitation PharmaFlow
        </div>

        <h1>
          Créez votre mot de passe
        </h1>

        <p>
          Votre invitation a été validée.
          Configurez maintenant votre compte
          professionnel PharmaFlow.
        </p>

        {email && (
          <div className="pf-invitation-email">
            <span>
              Compte invité
            </span>

            <strong>
              {email}
            </strong>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="pf-invitation-form"
        >

          <label>
            Nouveau mot de passe
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Minimum 8 caractères"
            autoComplete="new-password"
            disabled={saving}
            required
          />

          <label>
            Confirmer le mot de passe
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value,
              )
            }
            placeholder="Confirmez votre mot de passe"
            autoComplete="new-password"
            disabled={saving}
            required
          />

          {error && (
            <div className="pf-invitation-error">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="pf-invitation-success">
              ✅ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Création du compte..."
              : "Créer mon compte"}
          </button>

        </form>

        <p className="pf-invitation-security">
          🔒 Votre compte est sécurisé par
          l'authentification PharmaFlow.
        </p>

      </section>


      <style>{`

        .pf-invitation-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            linear-gradient(
              135deg,
              #f4faf9 0%,
              #eef7f6 50%,
              #f8fafc 100%
            );
        }

        .pf-invitation-card {
          width: 100%;
          max-width: 470px;
          padding: 42px 38px;
          background: #ffffff;
          border: 1px solid #e4ebe9;
          border-radius: 22px;
          box-shadow:
            0 20px 60px rgba(15, 23, 42, 0.09);
        }

        .pf-invitation-logo {
          width: 62px;
          height: 62px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: #2b9b8e;
          color: white;
          font-size: 34px;
          font-weight: 800;
        }

        .pf-invitation-badge {
          width: fit-content;
          margin: 0 auto 17px;
          padding: 7px 11px;
          border-radius: 999px;
          background: #edf8f6;
          color: #247b70;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-invitation-card h1 {
          margin: 0;
          text-align: center;
          color: #17252d;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .pf-invitation-card > p {
          margin: 12px 0 0;
          text-align: center;
          color: #697780;
          font-size: 14px;
          line-height: 1.6;
        }

        .pf-invitation-email {
          margin-top: 22px;
          padding: 13px 15px;
          border: 1px solid #e4ebe9;
          border-radius: 11px;
          background: #f8fbfa;
        }

        .pf-invitation-email span {
          display: block;
          color: #87939a;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .pf-invitation-email strong {
          display: block;
          margin-top: 4px;
          color: #27343b;
          font-size: 13px;
          word-break: break-word;
        }

        .pf-invitation-form {
          display: flex;
          flex-direction: column;
          margin-top: 24px;
        }

        .pf-invitation-form label {
          margin-bottom: 7px;
          color: #344054;
          font-size: 12px;
          font-weight: 750;
        }

        .pf-invitation-form input {
          width: 100%;
          height: 49px;
          box-sizing: border-box;
          margin-bottom: 16px;
          padding: 0 14px;
          border: 1px solid #d9e1df;
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: #17252d;
          font-size: 14px;
        }

        .pf-invitation-form input:focus {
          border-color: #2b9b8e;
          box-shadow:
            0 0 0 3px rgba(43, 155, 142, 0.11);
        }

        .pf-invitation-form button {
          width: 100%;
          height: 50px;
          margin-top: 4px;
          border: 0;
          border-radius: 11px;
          background: #2b9b8e;
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 8px 20px rgba(43, 155, 142, 0.19);
        }

        .pf-invitation-form button:hover {
          background: #238578;
        }

        .pf-invitation-form button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .pf-invitation-error {
          margin-bottom: 15px;
          padding: 11px 13px;
          border: 1px solid #f3c7c3;
          border-radius: 10px;
          background: #fff5f4;
          color: #b42318;
          font-size: 12px;
          line-height: 1.5;
        }

        .pf-invitation-success {
          margin-bottom: 15px;
          padding: 11px 13px;
          border: 1px solid #b7e3d7;
          border-radius: 10px;
          background: #effbf7;
          color: #16705f;
          font-size: 12px;
          line-height: 1.5;
        }

        .pf-invitation-security {
          margin: 20px 0 0 !important;
          color: #8a969d !important;
          font-size: 11px !important;
        }

        @media (max-width: 520px) {

          .pf-invitation-page {
            padding: 15px;
          }

          .pf-invitation-card {
            padding: 32px 22px;
            border-radius: 18px;
          }

          .pf-invitation-card h1 {
            font-size: 23px;
          }

        }

      `}</style>

    </main>
  );
}