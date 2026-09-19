"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type Pharmacy = {
  id: string;
  name: string;
  status: string;
  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
};

type Props = {
  pharmacy: Pharmacy;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  pharmacy?: unknown;
};

/**
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

export default function PharmacyActions({
  pharmacy,
}: Props) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  /**
   * ==========================================================
   * FERMER LE MENU
   * ==========================================================
   */

  function closeMenu() {
    setOpen(false);
  }

  /**
   * ==========================================================
   * LIRE UNE RÉPONSE API
   * ==========================================================
   *
   * Cette fonction évite l'erreur :
   *
   * Unexpected token '<', "<!DOCTYPE..." is not valid JSON
   *
   * lorsqu'une route renvoie accidentellement une page HTML
   * au lieu d'un JSON.
   */

  async function readApiResponse(
    response: Response,
  ): Promise<ApiResponse> {
    const text =
      await response.text();

    if (!text.trim()) {
      return {};
    }

    try {
      return JSON.parse(text) as ApiResponse;
    } catch {
      throw new Error(
        `Le serveur a renvoyé une réponse invalide (${response.status}). Vérifiez que la route API existe.`,
      );
    }
  }

  /**
   * ==========================================================
   * CHANGER LE STATUT DE LA PHARMACIE
   * ==========================================================
   */

  async function changeStatus(
    status:
      | "active"
      | "inactive"
      | "suspended",
  ) {
    const labels = {
      active: "activer",
      inactive: "désactiver",
      suspended: "suspendre",
    };

    const confirmed =
      window.confirm(
        `Voulez-vous vraiment ${labels[status]} la pharmacie "${pharmacy.name}" ?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      closeMenu();

      const response =
        await fetch(
          "/api/super-admin/pharmacies/status",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              pharmacyId:
                pharmacy.id,

              status,

              reason:
                status === "active"
                  ? "Activation depuis le panneau Super Admin"
                  : status === "inactive"
                    ? "Désactivation depuis le panneau Super Admin"
                    : "Suspension depuis le panneau Super Admin",
            }),
          },
        );

      const data =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
            `Impossible de ${labels[status]} la pharmacie.`,
        );
      }

      /**
       * Actualiser les données de la page
       */

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur changement statut pharmacie:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * DONNER UN ACCÈS MANUEL
   * ==========================================================
   */

  async function enableManualAccess() {
    /**
     * Demander le nombre de jours
     */

    const daysInput =
      window.prompt(
        "Pendant combien de jours voulez-vous donner l'accès manuel ?",
        "30",
      );

    if (daysInput === null) {
      return;
    }

    const days =
      Number(daysInput);

    if (
      !Number.isFinite(days) ||
      days <= 0 ||
      days > 3650
    ) {
      alert(
        "Veuillez saisir un nombre de jours valide entre 1 et 3650.",
      );

      return;
    }

    /**
     * Demander le motif
     */

    const reason =
      window.prompt(
        "Pourquoi donnez-vous cet accès manuel ?",
        "Paiement manuel reçu",
      );

    if (
      reason === null ||
      !reason.trim()
    ) {
      alert(
        "Le motif est obligatoire.",
      );

      return;
    }

    /**
     * Calcul de la date d'expiration
     */

    const until =
      new Date();

    until.setDate(
      until.getDate() + days,
    );

    try {
      setLoading(true);

      closeMenu();

      const response =
        await fetch(
          "/api/super-admin/pharmacies/manual-access",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              pharmacyId:
                pharmacy.id,

              enabled: true,

              until:
                until.toISOString(),

              reason:
                reason.trim(),
            }),
          },
        );

      const data =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
            "Impossible d'accorder l'accès manuel.",
        );
      }

      alert(
        `Accès manuel accordé pendant ${days} jour(s).`,
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur accès manuel:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * DÉSACTIVER L'ACCÈS MANUEL
   * ==========================================================
   */

  async function disableManualAccess() {
    const confirmed =
      window.confirm(
        `Voulez-vous vraiment désactiver l'accès manuel de "${pharmacy.name}" ?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      closeMenu();

      const response =
        await fetch(
          "/api/super-admin/pharmacies/manual-access",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              pharmacyId:
                pharmacy.id,

              enabled: false,

              until: null,

              reason:
                "Accès manuel désactivé depuis le panneau Super Admin",
            }),
          },
        );

      const data =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
            "Impossible de désactiver l'accès manuel.",
        );
      }

      alert(
        "L'accès manuel a été désactivé.",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur désactivation accès manuel:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * SUPPRIMER LA PHARMACIE
   * ==========================================================
   */

  async function deletePharmacy() {
    /**
     * Confirmation renforcée
     */

    const confirmation =
      window.prompt(
        `ATTENTION : cette action est définitive.\n\nPour supprimer "${pharmacy.name}", tapez exactement : SUPPRIMER`,
      );

    if (
      confirmation !==
      "SUPPRIMER"
    ) {
      return;
    }

    try {
      setLoading(true);

      closeMenu();

      const response =
        await fetch(
          "/api/super-admin/pharmacies/delete",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              pharmacyId:
                pharmacy.id,
            }),
          },
        );

      const data =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ||
            "Impossible de supprimer la pharmacie.",
        );
      }

      alert(
        data.message ||
          "La pharmacie a été supprimée avec succès.",
      );

      /**
       * Retour à la liste
       */

      router.push(
        "/super-admin/pharmacies",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur suppression pharmacie:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * ÉTAT DE LA PHARMACIE
   * ==========================================================
   */

  const status =
    String(
      pharmacy.status || "",
    )
      .trim()
      .toLowerCase();

  /**
   * ==========================================================
   * VÉRIFIER L'ACCÈS MANUEL
   * ==========================================================
   */

  const manualAccessActive =
    pharmacy.manual_access_enabled ===
      true &&
    !!pharmacy.manual_access_until &&
    Number.isFinite(
      new Date(
        pharmacy.manual_access_until,
      ).getTime(),
    ) &&
    new Date(
      pharmacy.manual_access_until,
    ).getTime() > Date.now();

  /**
   * ==========================================================
   * AFFICHAGE
   * ==========================================================
   */

  return (
    <div className="actions-wrapper">

      {/* ======================================================
          BOUTON PRINCIPAL ACTIONS
          ====================================================== */}

      <button
        type="button"
        className="actions-button"
        onClick={() =>
          setOpen(
            (value) => !value,
          )
        }
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="actions-icon">
          ⚙️
        </span>

        <span className="actions-label">
          {loading
            ? "Traitement..."
            : "Actions"}
        </span>

        <span
          className={`actions-chevron ${
            open
              ? "open"
              : ""
          }`}
        >
          ▾
        </span>
      </button>

      {/* ======================================================
          MENU
          ====================================================== */}

      {open && (
        <>
          {/* Fond transparent permettant de fermer le menu */}

          <button
            type="button"
            className="menu-backdrop"
            aria-label="Fermer le menu"
            onClick={
              closeMenu
            }
          />

          <div
            className="actions-menu"
            role="menu"
          >

            {/* ==================================================
                NAVIGATION
                ================================================== */}

            <div className="menu-section-title">
              Navigation
            </div>

            <Link
              href={`/super-admin/pharmacies/${pharmacy.id}`}
              className="action-item"
              onClick={
                closeMenu
              }
              role="menuitem"
            >
              <span className="action-icon">
                👁️
              </span>

              <span className="action-content">
                <strong>
                  Voir les détails
                </strong>

                <small>
                  Ouvrir la fiche complète
                </small>
              </span>
            </Link>

            <Link
              href={`/super-admin/pharmacies/${pharmacy.id}/edit`}
              className="action-item"
              onClick={
                closeMenu
              }
              role="menuitem"
            >
              <span className="action-icon">
                ✏️
              </span>

              <span className="action-content">
                <strong>
                  Modifier
                </strong>

                <small>
                  Modifier les informations
                </small>
              </span>
            </Link>

            <div className="menu-divider" />

            {/* ==================================================
                ACCÈS PLATEFORME
                ================================================== */}

            <div className="menu-section-title">
              Accès plateforme
            </div>

            {!manualAccessActive ? (
              <button
                type="button"
                className="action-item action-success"
                onClick={
                  enableManualAccess
                }
                disabled={
                  loading
                }
                role="menuitem"
              >
                <span className="action-icon">
                  🔑
                </span>

                <span className="action-content">
                  <strong>
                    Donner accès
                  </strong>

                  <small>
                    Autoriser un accès manuel temporaire
                  </small>
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="action-item action-warning"
                onClick={
                  disableManualAccess
                }
                disabled={
                  loading
                }
                role="menuitem"
              >
                <span className="action-icon">
                  🔒
                </span>

                <span className="action-content">
                  <strong>
                    Désactiver l'accès
                  </strong>

                  <small>
                    Retirer l'autorisation manuelle
                  </small>
                </span>
              </button>
            )}

            {/* Informations sur l'accès manuel */}

            {manualAccessActive &&
              pharmacy.manual_access_until && (
                <div className="access-info">
                  <span>
                    🔑 Accès manuel actif
                  </span>

                  <strong>
                    Jusqu'au{" "}
                    {new Date(
                      pharmacy.manual_access_until,
                    ).toLocaleString(
                      "fr-FR",
                      {
                        dateStyle:
                          "medium",
                        timeStyle:
                          "short",
                      },
                    )}
                  </strong>
                </div>
              )}

            <div className="menu-divider" />

            {/* ==================================================
                STATUT PHARMACIE
                ================================================== */}

            <div className="menu-section-title">
              Statut de la pharmacie
            </div>

            {/* ACTIVER */}

            {status !==
              "active" && (
              <button
                type="button"
                className="action-item action-success"
                onClick={() =>
                  changeStatus(
                    "active",
                  )
                }
                disabled={
                  loading
                }
                role="menuitem"
              >
                <span className="action-icon">
                  🟢
                </span>

                <span className="action-content">
                  <strong>
                    Activer
                  </strong>

                  <small>
                    Autoriser la pharmacie à fonctionner
                  </small>
                </span>
              </button>
            )}

            {/* DÉSACTIVER */}

            {status !==
              "inactive" && (
              <button
                type="button"
                className="action-item action-danger"
                onClick={() =>
                  changeStatus(
                    "inactive",
                  )
                }
                disabled={
                  loading
                }
                role="menuitem"
              >
                <span className="action-icon">
                  🔴
                </span>

                <span className="action-content">
                  <strong>
                    Désactiver
                  </strong>

                  <small>
                    Bloquer l'accès à la pharmacie
                  </small>
                </span>
              </button>
            )}

            {/* SUSPENDRE */}

            {status !==
              "suspended" && (
              <button
                type="button"
                className="action-item action-warning"
                onClick={() =>
                  changeStatus(
                    "suspended",
                  )
                }
                disabled={
                  loading
                }
                role="menuitem"
              >
                <span className="action-icon">
                  ⏸️
                </span>

                <span className="action-content">
                  <strong>
                    Suspendre
                  </strong>

                  <small>
                    Suspendre temporairement la pharmacie
                  </small>
                </span>
              </button>
            )}

            <div className="menu-divider" />

            {/* ==================================================
                SUPPRESSION
                ================================================== */}

            <div className="menu-section-title danger-title">
              Zone dangereuse
            </div>

            <button
              type="button"
              className="action-item action-delete"
              onClick={
                deletePharmacy
              }
              disabled={
                loading
              }
              role="menuitem"
            >
              <span className="action-icon">
                🗑️
              </span>

              <span className="action-content">
                <strong>
                  Supprimer
                </strong>

                <small>
                  Supprimer définitivement la pharmacie
                </small>
              </span>
            </button>

          </div>
        </>
      )}

      {/* ======================================================
          STYLES
          ====================================================== */}

      <style jsx>{`
        .actions-wrapper {
          position: relative;
          display: inline-block;
          z-index: 50;
        }

        /* =====================================================
           BOUTON ACTIONS
           ===================================================== */

        .actions-button {
          min-width: 132px;
          height: 42px;
          padding: 0 14px;

          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          border: 1px solid #dfe5ec;
          border-radius: 11px;

          background: #ffffff;
          color: #273449;

          font-family: inherit;
          font-size: 13px;
          font-weight: 750;

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.2s ease;

          box-shadow:
            0 2px 8px
              rgba(
                15,
                23,
                42,
                0.04
              );
        }

        .actions-button:hover {
          border-color: #c8d2df;
          background: #f8fafc;

          transform: translateY(
            -1px
          );

          box-shadow:
            0 5px 14px
              rgba(
                15,
                23,
                42,
                0.08
              );
        }

        .actions-button:active {
          transform: translateY(
            0
          );
        }

        .actions-button:disabled {
          opacity: 0.65;
          cursor: wait;
          transform: none;
        }

        .actions-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
        }

        .actions-label {
          white-space: nowrap;
        }

        .actions-chevron {
          font-size: 12px;
          line-height: 1;

          transition:
            transform 0.2s ease;
        }

        .actions-chevron.open {
          transform: rotate(
            180deg
          );
        }

        /* =====================================================
           BACKDROP
           ===================================================== */

        .menu-backdrop {
          position: fixed;
          inset: 0;

          z-index: 90;

          width: 100%;
          height: 100%;

          padding: 0;
          margin: 0;

          border: 0;

          background: transparent;

          cursor: default;
        }

        /* =====================================================
           MENU
           ===================================================== */

        .actions-menu {
          position: absolute;

          top: calc(
            100% + 8px
          );

          right: 0;

          z-index: 100;

          width: 310px;
          max-width: calc(
            100vw - 28px
          );

          padding: 10px;

          border: 1px solid
            #e4e9f0;

          border-radius: 16px;

          background: #ffffff;

          box-shadow:
            0 18px 50px
              rgba(
                15,
                23,
                42,
                0.16
              ),
            0 4px 12px
              rgba(
                15,
                23,
                42,
                0.06
              );

          animation:
            menuIn 0.16s
            ease-out;
        }

        @keyframes menuIn {
          from {
            opacity: 0;
            transform:
              translateY(-5px)
              scale(0.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        /* =====================================================
           TITRES DE SECTION
           ===================================================== */

        .menu-section-title {
          padding:
            7px 10px
            6px;

          color: #8a95a6;

          font-size: 10px;
          font-weight: 800;

          letter-spacing: 0.08em;

          text-transform:
            uppercase;
        }

        .danger-title {
          color: #b42318;
        }

        /* =====================================================
           ÉLÉMENTS DU MENU
           ===================================================== */

        .action-item {
          width: 100%;
          min-height: 52px;

          padding:
            8px 10px;

          display: flex;
          align-items: center;

          gap: 11px;

          border: 0;
          border-radius: 10px;

          background:
            transparent;

          color: #334155;

          text-align: left;
          text-decoration: none;

          cursor: pointer;

          transition:
            background 0.18s ease;

          font-family: inherit;
        }

        .action-item:hover {
          background: #f5f7fa;
        }

        .action-item:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .action-icon {
          width: 31px;
          height: 31px;

          flex: 0 0 31px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          background: #f1f4f8;

          font-size: 14px;
        }

        .action-content {
          min-width: 0;
          flex: 1;
        }

        .action-item strong {
          display: block;

          color: #273449;

          font-size: 13px;
          font-weight: 750;

          line-height: 1.25;
        }

        .action-item small {
          display: block;

          margin-top: 3px;

          color: #8994a4;

          font-size: 10px;

          line-height: 1.35;
        }

        /* =====================================================
           COULEURS ACTIONS
           ===================================================== */

        .action-success:hover {
          background: #f0fdf4;
        }

        .action-success
          .action-icon {
          background: #ecfdf3;
        }

        .action-warning:hover {
          background: #fffbeb;
        }

        .action-warning
          .action-icon {
          background: #fffbeb;
        }

        .action-danger:hover {
          background: #fef2f2;
        }

        .action-danger
          .action-icon {
          background: #fef2f2;
        }

        .action-delete {
          color: #b42318;
        }

        .action-delete strong {
          color: #b42318;
        }

        .action-delete
          .action-icon {
          background: #fef2f2;
        }

        .action-delete:hover {
          background: #fff1f2;
        }

        /* =====================================================
           SÉPARATEUR
           ===================================================== */

        .menu-divider {
          height: 1px;

          margin:
            7px 5px;

          background: #edf0f4;
        }

        /* =====================================================
           INFORMATIONS ACCÈS MANUEL
           ===================================================== */

        .access-info {
          margin:
            5px 5px
            8px;

          padding:
            10px;

          border:
            1px solid #d8f0df;

          border-radius: 10px;

          background: #f0fdf4;

          color: #4b6355;

          font-size: 10px;
        }

        .access-info span {
          display: block;

          color: #16804e;

          font-size: 10px;
          font-weight: 750;
        }

        .access-info strong {
          display: block;

          margin-top: 4px;

          color: #16734a;

          font-size: 11px;
          font-weight: 800;
        }

        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 600px) {
          .actions-menu {
            position: fixed;

            top: auto;
            right: 12px;
            bottom: 12px;
            left: 12px;

            width: auto;
            max-width: none;

            max-height:
              calc(100vh - 24px);

            overflow-y: auto;
          }

          .actions-button {
            min-width: 112px;
          }
        }
      `}</style>
    </div>
  );
}