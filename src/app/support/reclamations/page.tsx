"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

type Priority = "low" | "normal" | "high" | "urgent";

type FormStatus = "idle" | "loading" | "success" | "error";

export default function ReclamationsPage() {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successReference, setSuccessReference] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessReference("");

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!cleanSubject) {
      setErrorMessage("Veuillez renseigner le sujet de votre réclamation.");
      return;
    }

    if (cleanSubject.length < 3) {
      setErrorMessage("Le sujet doit contenir au moins 3 caractères.");
      return;
    }

    if (!cleanMessage) {
      setErrorMessage(
        "Veuillez décrire votre problème ou votre demande."
      );
      return;
    }

    if (cleanMessage.length < 10) {
      setErrorMessage(
        "La description doit contenir au moins 10 caractères."
      );
      return;
    }

    try {
      setStatus("loading");

      const response = await fetch("/api/support/reclamations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: cleanSubject,
          priority,
          message: cleanMessage,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        reference?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible d'envoyer votre réclamation pour le moment."
        );
      }

      setStatus("success");
      setSuccessReference(data.reference || "");

      setSubject("");
      setPriority("normal");
      setMessage("");
    } catch (error) {
      setStatus("error");

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'envoi."
      );
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="support-page">
      <div className="support-container">
        <div className="support-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Retour au tableau de bord
            </Link>

            <div className="eyebrow">
              SUPPORT PHARMAFLOW
            </div>

            <h1>Déposer une réclamation</h1>

            <p>
              Signalez un problème, une difficulté ou une demande à
              notre équipe support. Votre demande sera suivie avec une
              référence unique.
            </p>
          </div>

          <div className="support-icon" aria-hidden="true">
            🎧
          </div>
        </div>

        <div className="support-grid">
          <section className="form-card">
            <div className="card-heading">
              <div>
                <span className="section-label">
                  NOUVELLE DEMANDE
                </span>

                <h2>Expliquez-nous votre problème</h2>
              </div>
            </div>

            {status === "success" && (
              <div className="alert success-alert">
                <div className="alert-icon">✓</div>

                <div>
                  <strong>
                    Réclamation envoyée avec succès
                  </strong>

                  <p>
                    Votre demande a bien été enregistrée.
                    {successReference && (
                      <>
                        {" "}
                        Votre référence est{" "}
                        <strong>{successReference}</strong>.
                      </>
                    )}
                  </p>

                  <span>
                    Conservez cette référence pour suivre votre
                    réclamation auprès du support.
                  </span>
                </div>
              </div>
            )}

            {status === "error" && errorMessage && (
              <div className="alert error-alert">
                <div className="alert-icon">!</div>

                <div>
                  <strong>Impossible d'envoyer la réclamation</strong>

                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {status !== "error" && errorMessage && (
              <div className="alert error-alert">
                <div className="alert-icon">!</div>

                <div>
                  <strong>Vérifiez les informations</strong>

                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="reclamation-form"
            >
              <div className="field">
                <label htmlFor="subject">
                  Sujet <span>*</span>
                </label>

                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="Ex. Problème avec mon abonnement"
                  maxLength={150}
                  disabled={isLoading}
                  required
                />

                <small>
                  Résumez votre problème en quelques mots.
                </small>
              </div>

              <div className="field">
                <label htmlFor="priority">
                  Priorité
                </label>

                <select
                  id="priority"
                  name="priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target.value as Priority
                    )
                  }
                  disabled={isLoading}
                >
                  <option value="low">
                    Faible — demande non urgente
                  </option>

                  <option value="normal">
                    Normale — demande standard
                  </option>

                  <option value="high">
                    Haute — problème important
                  </option>

                  <option value="urgent">
                    Urgente — blocage du service
                  </option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="message">
                  Description <span>*</span>
                </label>

                <textarea
                  id="message"
                  name="message"
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Décrivez précisément ce qui s'est passé, ce que vous avez essayé et le résultat obtenu..."
                  rows={9}
                  maxLength={5000}
                  disabled={isLoading}
                  required
                />

                <div className="textarea-footer">
                  <small>
                    Plus votre description est précise, plus notre
                    équipe pourra vous aider rapidement.
                  </small>

                  <span>
                    {message.length}/5000
                  </span>
                </div>
              </div>

              <div className="form-info">
                <div className="info-icon">ℹ️</div>

                <div>
                  <strong>
                    Après l'envoi
                  </strong>

                  <p>
                    Votre réclamation recevra automatiquement une
                    référence. L'équipe Super Admin pourra ensuite
                    suivre son traitement et vous répondre.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Envoyer la réclamation
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          </section>

          <aside className="side-column">
            <div className="info-card">
              <div className="info-card-icon">
                📋
              </div>

              <h3>Comment ça fonctionne ?</h3>

              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>

                  <div>
                    <strong>
                      Envoyez votre demande
                    </strong>

                    <p>
                      Expliquez clairement votre problème.
                    </p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">2</div>

                  <div>
                    <strong>
                      Votre dossier est créé
                    </strong>

                    <p>
                      Une référence unique est attribuée à votre
                      réclamation.
                    </p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">3</div>

                  <div>
                    <strong>
                      Notre équipe analyse
                    </strong>

                    <p>
                      Le support traite votre demande et peut vous
                      répondre.
                    </p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">4</div>

                  <div>
                    <strong>
                      Résolution
                    </strong>

                    <p>
                      Vous êtes informé lorsque votre problème est
                      résolu.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="security-card">
              <div className="security-icon">
                🔒
              </div>

              <div>
                <strong>
                  Vos informations sont protégées
                </strong>

                <p>
                  Les informations de votre réclamation sont
                  uniquement utilisées pour le traitement de votre
                  demande de support.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .support-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(59, 130, 246, 0.08),
              transparent 32%
            ),
            #f6f8fb;
          color: #172033;
          padding: 40px 24px 70px;
        }

        .support-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .support-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          margin-bottom: 22px;
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: 0.2s ease;
        }

        .back-link:hover {
          color: #2563eb;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          margin-bottom: 10px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.1;
          letter-spacing: -0.035em;
          color: #111827;
        }

        .support-header p {
          max-width: 720px;
          margin: 14px 0 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.7;
        }

        .support-icon {
          width: 68px;
          height: 68px;
          flex: 0 0 68px;
          display: grid;
          place-items: center;
          border: 1px solid #dbe5f1;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
          font-size: 30px;
        }

        .support-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.85fr);
          gap: 24px;
          align-items: start;
        }

        .form-card,
        .info-card,
        .security-card {
          background: #ffffff;
          border: 1px solid #e3e9f2;
          border-radius: 22px;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.06);
        }

        .form-card {
          padding: 30px;
        }

        .card-heading {
          margin-bottom: 28px;
          padding-bottom: 22px;
          border-bottom: 1px solid #edf1f6;
        }

        .section-label {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .card-heading h2 {
          margin: 7px 0 0;
          color: #111827;
          font-size: 22px;
          line-height: 1.3;
        }

        .reclamation-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          color: #1e293b;
          font-size: 14px;
          font-weight: 750;
        }

        .field label span {
          color: #dc2626;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d8e0eb;
          border-radius: 13px;
          background: #ffffff;
          color: #172033;
          font-family: inherit;
          font-size: 15px;
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .field input,
        .field select {
          min-height: 50px;
          padding: 0 15px;
        }

        .field textarea {
          min-height: 210px;
          padding: 14px 15px;
          resize: vertical;
          line-height: 1.6;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .field input:disabled,
        .field select:disabled,
        .field textarea:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #f8fafc;
        }

        .field small {
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.5;
        }

        .textarea-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .textarea-footer span {
          flex: 0 0 auto;
          color: #94a3b8;
          font-size: 12px;
        }

        .alert {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          margin-bottom: 22px;
          padding: 15px 16px;
          border-radius: 14px;
          border: 1px solid;
        }

        .alert-icon {
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          font-weight: 900;
        }

        .alert strong {
          display: block;
          font-size: 14px;
        }

        .alert p {
          margin: 5px 0 0;
          font-size: 13px;
          line-height: 1.55;
        }

        .success-alert {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .success-alert .alert-icon {
          background: #dcfce7;
        }

        .error-alert {
          border-color: #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }

        .error-alert .alert-icon {
          background: #fee2e2;
        }

        .form-info {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 15px;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          background: #eff6ff;
        }

        .info-icon {
          flex: 0 0 auto;
        }

        .form-info strong {
          display: block;
          color: #1e3a8a;
          font-size: 13px;
        }

        .form-info p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 12px;
          line-height: 1.6;
        }

        .submit-button {
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 0;
          border-radius: 14px;
          background: #2563eb;
          color: #ffffff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .submit-button:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 12px 25px rgba(37, 99, 235, 0.22);
        }

        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .side-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .info-card {
          padding: 25px;
        }

        .info-card-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          margin-bottom: 16px;
          border-radius: 14px;
          background: #eff6ff;
          font-size: 22px;
        }

        .info-card h3 {
          margin: 0 0 22px;
          color: #111827;
          font-size: 18px;
        }

        .steps {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .step {
          display: flex;
          gap: 13px;
          align-items: flex-start;
        }

        .step-number {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
        }

        .step strong {
          display: block;
          margin-bottom: 4px;
          color: #1e293b;
          font-size: 13px;
        }

        .step p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .security-card {
          display: flex;
          gap: 13px;
          padding: 19px;
        }

        .security-icon {
          flex: 0 0 auto;
          font-size: 21px;
        }

        .security-card strong {
          display: block;
          margin-bottom: 5px;
          color: #1e293b;
          font-size: 13px;
        }

        .security-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .support-grid {
            grid-template-columns: 1fr;
          }

          .side-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .support-page {
            padding: 25px 14px 50px;
          }

          .support-header {
            gap: 15px;
          }

          .support-icon {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
            border-radius: 16px;
            font-size: 23px;
          }

          h1 {
            font-size: 30px;
          }

          .support-header p {
            font-size: 14px;
          }

          .form-card {
            padding: 20px;
            border-radius: 18px;
          }

          .side-column {
            display: flex;
          }

          .textarea-footer {
            flex-direction: column;
            gap: 5px;
          }
        }
      `}</style>
    </main>
  );
}