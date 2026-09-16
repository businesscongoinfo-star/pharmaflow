"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ManualAccessActionsProps = {
  pharmacyId: string;
  pharmacyName: string;
  manualAccessEnabled: boolean;
  manualAccessUntil: string | null;
  manualAccessReason: string | null;
  manualAccessActive: boolean;
};

function formatDateForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000,
  );

  return localDate
    .toISOString()
    .slice(0, 16);
}

export default function ManualAccessActions({
  pharmacyId,
  pharmacyName,
  manualAccessEnabled,
  manualAccessUntil,
  manualAccessReason,
  manualAccessActive,
}: ManualAccessActionsProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] =
    useState(false);

  const [mode, setMode] = useState<
    "enable" | "edit" | "disable"
  >("enable");

  const [until, setUntil] = useState(
    formatDateForInput(
      manualAccessUntil,
    ),
  );

  const [reason, setReason] = useState(
    manualAccessReason ?? "",
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function openEnableModal() {
    setMode("enable");
    setUntil("");
    setReason("");
    setError("");
    setIsOpen(true);
  }

  function openEditModal() {
    setMode("edit");

    setUntil(
      formatDateForInput(
        manualAccessUntil,
      ),
    );

    setReason(
      manualAccessReason ?? "",
    );

    setError("");
    setIsOpen(true);
  }

  function openDisableModal() {
    setMode("disable");
    setReason("");
    setError("");
    setIsOpen(true);
  }

  function closeModal() {
    if (loading) {
      return;
    }

    setIsOpen(false);
    setError("");
  }

  async function handleSubmit() {
    setError("");

    /*
     * =========================================================
     * DÉSACTIVATION
     * =========================================================
     */

    if (mode === "disable") {
      if (!reason.trim()) {
        setError(
          "Veuillez indiquer la raison de la désactivation.",
        );

        return;
      }
    }

    /*
     * =========================================================
     * ACTIVATION / MODIFICATION
     * =========================================================
     */

    if (
      mode === "enable" ||
      mode === "edit"
    ) {
      if (!until) {
        setError(
          "Veuillez sélectionner une date et une heure d'expiration.",
        );

        return;
      }

      const expiration =
        new Date(until);

      if (
        Number.isNaN(
          expiration.getTime(),
        )
      ) {
        setError(
          "La date d'expiration est invalide.",
        );

        return;
      }

      if (
        expiration.getTime() <=
        Date.now()
      ) {
        setError(
          "La date d'expiration doit être dans le futur.",
        );

        return;
      }

      if (!reason.trim()) {
        setError(
          "Veuillez indiquer le motif de l'accès manuel.",
        );

        return;
      }
    }

    try {
      setLoading(true);

      const enabled =
        mode !== "disable";

      let expirationIso:
        | string
        | null = null;

      if (enabled) {
        expirationIso =
          new Date(
            until,
          ).toISOString();
      }

      const response =
        await fetch(
          "/api/super-admin/pharmacies/manual-access",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              pharmacyId,
              enabled,
              until: expirationIso,
              reason: reason.trim(),
            }),
          },
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Impossible de modifier l'accès manuel.",
        );
      }

      /*
       * Fermer la fenêtre.
       */
      setIsOpen(false);

      /*
       * Nettoyer l'erreur.
       */
      setError("");

      /*
       * Recharge le Server Component.
       *
       * Les nouvelles valeurs seront
       * relues directement depuis Supabase.
       */
      router.refresh();
    } catch (err) {
      console.error(
        "SUPER ADMIN - MANUAL ACCESS:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* =======================================================
          BOUTONS
      ======================================================= */}

      <div className="actions">

        <a
          href={`/super-admin/pharmacies/${pharmacyId}`}
          className="viewButton"
        >
          Voir
        </a>

        {!manualAccessActive ? (
          <button
            type="button"
            className="enableButton"
            onClick={openEnableModal}
            disabled={loading}
          >
            🔓 Activer
          </button>
        ) : (
          <>
            <button
              type="button"
              className="editButton"
              onClick={openEditModal}
              disabled={loading}
            >
              ✏️ Modifier
            </button>

            <button
              type="button"
              className="disableButton"
              onClick={openDisableModal}
              disabled={loading}
            >
              🔒 Désactiver
            </button>
          </>
        )}

      </div>

      {/* =======================================================
          MODALE
      ======================================================= */}

      {isOpen && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !loading
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-access-title"
          >

            {/* HEADER */}

            <div className="modalHeader">

              <div>
                <div className="modalLabel">
                  PHARMAFLOW · SUPER ADMIN
                </div>

                <h2 id="manual-access-title">
                  {mode === "enable"
                    ? "Activer l'accès manuel"
                    : mode === "edit"
                      ? "Modifier l'accès manuel"
                      : "Désactiver l'accès manuel"}
                </h2>

                <p>
                  {pharmacyName}
                </p>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={closeModal}
                disabled={loading}
                aria-label="Fermer"
              >
                ×
              </button>

            </div>

            {/* BODY */}

            <div className="modalBody">

              {mode === "disable" ? (

                <div className="warningBox">

                  <div className="warningIcon">
                    ⚠️
                  </div>

                  <div>

                    <strong>
                      Désactivation de l'accès manuel
                    </strong>

                    <p>
                      Cette pharmacie ne pourra
                      plus bénéficier de l'accès
                      manuel après cette action.
                    </p>

                  </div>

                </div>

              ) : (

                <div className="infoBox">

                  <div className="infoIcon">
                    🔓
                  </div>

                  <div>

                    <strong>
                      Accès exceptionnel
                    </strong>

                    <p>
                      La pharmacie pourra utiliser
                      PharmaFlow jusqu'à la date
                      d'expiration définie ci-dessous,
                      même si son abonnement normal
                      n'est plus valide.
                    </p>

                  </div>

                </div>

              )}

              {/* DATE */}

              {mode !== "disable" && (
                <label className="field">

                  <span>
                    Date et heure d'expiration
                  </span>

                  <input
                    type="datetime-local"
                    value={until}
                    onChange={(event) =>
                      setUntil(
                        event.target.value,
                      )
                    }
                    disabled={loading}
                  />

                  <small>
                    L'accès sera automatiquement
                    considéré comme expiré après
                    cette date.
                  </small>

                </label>
              )}

              {/* MOTIF */}

              <label className="field">

                <span>
                  {mode === "disable"
                    ? "Raison de la désactivation"
                    : "Motif de l'accès manuel"}
                </span>

                <textarea
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder={
                    mode === "disable"
                      ? "Exemple : fin de la période de grâce..."
                      : "Exemple : période de grâce accordée par l'administration..."
                  }
                  disabled={loading}
                />

              </label>

              {/* ERREUR */}

              {error && (
                <div
                  className="errorMessage"
                  role="alert"
                >
                  {error}
                </div>
              )}

            </div>

            {/* FOOTER */}

            <div className="modalFooter">

              <button
                type="button"
                className="cancelButton"
                onClick={closeModal}
                disabled={loading}
              >
                Annuler
              </button>

              <button
                type="button"
                className={
                  mode === "disable"
                    ? "confirmButton danger"
                    : "confirmButton"
                }
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? "Traitement..."
                  : mode === "enable"
                    ? "🔓 Activer l'accès"
                    : mode === "edit"
                      ? "💾 Enregistrer"
                      : "🔒 Désactiver l'accès"}
              </button>

            </div>

          </div>
        </div>
      )}

      <style jsx>{`
        .actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          min-width: 220px;
        }

        .viewButton,
        .enableButton,
        .editButton,
        .disableButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 10px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
          text-decoration: none;
          cursor: pointer;
          transition:
            background .15s ease,
            border-color .15s ease,
            opacity .15s ease;
        }

        .viewButton {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
        }

        .viewButton:hover {
          background: #dbeafe;
        }

        .enableButton {
          border: 1px solid #a7f3d0;
          background: #ecfdf5;
          color: #047857;
        }

        .enableButton:hover {
          background: #d1fae5;
        }

        .editButton {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .editButton:hover {
          background: #dbeafe;
        }

        .disableButton {
          border: 1px solid #fecdd3;
          background: #fff1f2;
          color: #be123c;
        }

        .disableButton:hover {
          background: #ffe4e6;
        }

        .viewButton:focus-visible,
        .enableButton:focus-visible,
        .editButton:focus-visible,
        .disableButton:focus-visible,
        .closeButton:focus-visible,
        .cancelButton:focus-visible,
        .confirmButton:focus-visible {
          outline: 3px solid rgba(37, 99, 235, .18);
          outline-offset: 2px;
        }

        .enableButton:disabled,
        .editButton:disabled,
        .disableButton:disabled,
        .closeButton:disabled,
        .cancelButton:disabled,
        .confirmButton:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, .58);
        }

        .modal {
          width: min(100%, 560px);
          max-height: calc(100vh - 40px);
          overflow: auto;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #ffffff;
          box-shadow:
            0 30px 80px rgba(15, 23, 42, .25);
        }

        .modalHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          border-bottom: 1px solid #edf1f6;
        }

        .modalLabel {
          margin-bottom: 7px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .modalHeader h2 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          line-height: 1.25;
          font-weight: 800;
        }

        .modalHeader p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .closeButton {
          width: 36px;
          height: 36px;
          display: grid;
          flex: 0 0 36px;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: #f1f5f9;
          color: #475569;
          font-size: 25px;
          line-height: 1;
          cursor: pointer;
        }

        .closeButton:hover {
          background: #e2e8f0;
        }

        .modalBody {
          padding: 24px;
        }

        .infoBox,
        .warningBox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 12px;
        }

        .infoBox {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1e40af;
        }

        .warningBox {
          border: 1px solid #fed7aa;
          background: #fff7ed;
          color: #9a3412;
        }

        .infoIcon,
        .warningIcon {
          flex: 0 0 auto;
          font-size: 19px;
        }

        .infoBox strong,
        .warningBox strong {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
          font-weight: 800;
        }

        .infoBox p,
        .warningBox p {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
        }

        .field {
          display: block;
          margin-bottom: 18px;
        }

        .field > span {
          display: block;
          margin-bottom: 7px;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .field input,
        .field textarea {
          display: block;
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d8dee8;
          border-radius: 10px;
          background: #ffffff;
          color: #0f172a;
          padding: 11px 12px;
          outline: none;
          font-family: inherit;
          font-size: 14px;
        }

        .field input {
          min-height: 44px;
        }

        .field textarea {
          min-height: 105px;
          resize: vertical;
          line-height: 1.5;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, .10);
        }

        .field input:disabled,
        .field textarea:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .field small {
          display: block;
          margin-top: 6px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.45;
        }

        .errorMessage {
          padding: 12px 14px;
          border: 1px solid #fecdd3;
          border-radius: 10px;
          background: #fff1f2;
          color: #be123c;
          font-size: 13px;
          line-height: 1.5;
        }

        .modalFooter {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 18px 24px;
          border-top: 1px solid #edf1f6;
          background: #fafbfc;
        }

        .cancelButton,
        .confirmButton {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .cancelButton {
          border: 1px solid #d8dee8;
          background: #ffffff;
          color: #475569;
        }

        .cancelButton:hover {
          background: #f8fafc;
        }

        .confirmButton {
          border: 1px solid #172033;
          background: #172033;
          color: #ffffff;
        }

        .confirmButton:hover {
          background: #0f172a;
        }

        .confirmButton.danger {
          border-color: #be123c;
          background: #be123c;
        }

        .confirmButton.danger:hover {
          background: #9f1239;
        }

        @media (max-width: 600px) {
          .actions {
            min-width: 190px;
          }

          .overlay {
            padding: 10px;
          }

          .modal {
            max-height: calc(100vh - 20px);
          }

          .modalHeader,
          .modalBody {
            padding: 18px;
          }

          .modalFooter {
            flex-direction: column-reverse;
            padding: 18px;
          }

          .cancelButton,
          .confirmButton {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}