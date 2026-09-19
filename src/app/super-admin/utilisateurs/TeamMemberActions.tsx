"use client";

import Link from "next/link";
import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type TeamMemberActionsProps = {
  id: string;
  fullName: string;
  isActive: boolean;
};

export default function TeamMemberActions({
  id,
  fullName,
  isActive,
}: TeamMemberActionsProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggleStatus() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/super-admin/team/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !isActive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Impossible de modifier le statut du membre.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteMember() {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer définitivement le membre "${fullName}" ?\n\n` +
        `Cette action supprimera également son compte de connexion PharmaFlow.\n\n` +
        `Cette action est irréversible.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/super-admin/team/${id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Impossible de supprimer le membre.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
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
    <div className="pf-team-actions-wrapper">

      <button
        type="button"
        className="pf-team-actions-menu-button"
        onClick={() => {
          setOpen((current) => !current);
          setError("");
        }}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>Actions</span>
        <span className="pf-team-actions-chevron">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="pf-team-actions-overlay"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />

          <div className="pf-team-actions-menu">

            <div className="pf-team-actions-menu-header">
              <span>
                Gestion du membre
              </span>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <Link
              href={`/super-admin/utilisateurs/${id}/modifier`}
              className="pf-team-menu-item"
              onClick={() => setOpen(false)}
            >
              <span className="pf-team-menu-icon">
                ✏️
              </span>

              <span>
                <strong>
                  Modifier
                </strong>

                <small>
                  Modifier le profil et les permissions
                </small>
              </span>
            </Link>

            <Link
              href={`/super-admin/utilisateurs/${id}`}
              className="pf-team-menu-item"
              onClick={() => setOpen(false)}
            >
              <span className="pf-team-menu-icon">
                👁️
              </span>

              <span>
                <strong>
                  Voir le profil
                </strong>

                <small>
                  Consulter les informations du membre
                </small>
              </span>
            </Link>

            <button
              type="button"
              className="pf-team-menu-item"
              onClick={toggleStatus}
              disabled={loading}
            >
              <span className="pf-team-menu-icon">
                {isActive ? "⏸️" : "▶️"}
              </span>

              <span>
                <strong>
                  {isActive
                    ? "Désactiver"
                    : "Activer"}
                </strong>

                <small>
                  {isActive
                    ? "Bloquer temporairement l'accès"
                    : "Autoriser l'accès à la plateforme"}
                </small>
              </span>
            </button>

            <div className="pf-team-menu-divider" />

            <button
              type="button"
              className="pf-team-menu-item pf-team-menu-danger"
              onClick={deleteMember}
              disabled={loading}
            >
              <span className="pf-team-menu-icon">
                🗑️
              </span>

              <span>
                <strong>
                  Supprimer définitivement
                </strong>

                <small>
                  Supprimer le compte et ses accès
                </small>
              </span>
            </button>

            {error && (
              <div className="pf-team-action-error">
                {error}
              </div>
            )}

            {loading && (
              <div className="pf-team-action-loading">
                Traitement en cours...
              </div>
            )}

          </div>
        </>
      )}

      <style>{`

        .pf-team-actions-wrapper {
          position: relative;
          display: inline-flex;
          justify-content: flex-end;
        }

        .pf-team-actions-menu-button {
          min-width: 94px;
          height: 36px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #dfe4eb;
          border-radius: 9px;
          background: #ffffff;
          color: #344054;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition:
            background 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .pf-team-actions-menu-button:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          box-shadow:
            0 3px 10px rgba(15, 23, 42, 0.06);
        }

        .pf-team-actions-menu-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pf-team-actions-chevron {
          color: #667085;
          font-size: 9px;
        }

        .pf-team-actions-overlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          border: 0;
          padding: 0;
          background: transparent;
          cursor: default;
        }

        .pf-team-actions-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 100;
          width: 310px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e1e6ed;
          border-radius: 14px;
          box-shadow:
            0 18px 50px rgba(15, 23, 42, 0.16);
        }

        .pf-team-actions-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 14px;
          background: #fafbfc;
          border-bottom: 1px solid #edf0f4;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-team-actions-menu-header button {
          width: 27px;
          height: 27px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #667085;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }

        .pf-team-actions-menu-header button:hover {
          background: #eef2f6;
        }

        .pf-team-menu-item {
          width: 100%;
          min-height: 64px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 0;
          background: #ffffff;
          color: #344054;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
        }

        .pf-team-menu-item:hover {
          background: #f8fafc;
        }

        .pf-team-menu-item:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .pf-team-menu-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f2f5f9;
          font-size: 15px;
        }

        .pf-team-menu-item > span:last-child {
          min-width: 0;
        }

        .pf-team-menu-item strong {
          display: block;
          color: #1f2937;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-team-menu-item small {
          display: block;
          margin-top: 3px;
          color: #7b8494;
          font-size: 10px;
          line-height: 1.4;
        }

        .pf-team-menu-danger {
          color: #b42318;
        }

        .pf-team-menu-danger .pf-team-menu-icon {
          background: #fff1f0;
        }

        .pf-team-menu-danger strong {
          color: #b42318;
        }

        .pf-team-menu-divider {
          height: 1px;
          margin: 3px 0;
          background: #edf0f4;
        }

        .pf-team-action-error {
          margin: 8px 12px 12px;
          padding: 9px 10px;
          border-radius: 8px;
          background: #fff1f0;
          color: #b42318;
          font-size: 11px;
          line-height: 1.5;
        }

        .pf-team-action-loading {
          padding: 9px 12px 12px;
          color: #667085;
          font-size: 11px;
          text-align: center;
        }

        @media (max-width: 600px) {

          .pf-team-actions-menu {
            position: fixed;
            top: auto;
            right: 12px;
            bottom: 12px;
            left: 12px;
            width: auto;
            border-radius: 16px;
          }

        }

      `}</style>

    </div>
  );
}