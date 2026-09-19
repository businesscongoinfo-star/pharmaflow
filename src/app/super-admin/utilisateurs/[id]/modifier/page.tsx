"use client";

import {
  useEffect,
  useState,
} from "react";

import { useParams, useRouter } from "next/navigation";

type TeamRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

type Member = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: TeamRole;
  is_active: boolean;
  permissions: Record<string, boolean>;
};

const ROLES: {
  value: TeamRole;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "support",
    label: "Support",
    icon: "🛟",
    description:
      "Réclamations, assistance et relation avec les pharmacies.",
  },
  {
    value: "finance",
    label: "Finance",
    icon: "💳",
    description:
      "Paiements, abonnements et opérations financières.",
  },
  {
    value: "technical",
    label: "Technique",
    icon: "🛠️",
    description:
      "Incidents techniques et assistance technique.",
  },
  {
    value: "operations",
    label: "Opérations",
    icon: "🏥",
    description:
      "Gestion opérationnelle des pharmacies.",
  },
  {
    value: "analyst",
    label: "Analyste",
    icon: "📊",
    description:
      "Statistiques et analyse de la plateforme.",
  },
  {
    value: "security",
    label: "Sécurité",
    icon: "🛡️",
    description:
      "Sécurité, contrôle et surveillance.",
  },
];

const PERMISSION_GROUPS = [
  {
    title: "Support",
    icon: "🛟",
    permissions: [
      {
        key: "support.view",
        label: "Voir les demandes",
      },
      {
        key: "support.reply",
        label: "Répondre aux demandes",
      },
      {
        key: "support.manage",
        label: "Gérer les réclamations",
      },
    ],
  },
  {
    title: "Pharmacies",
    icon: "🏥",
    permissions: [
      {
        key: "pharmacies.view",
        label: "Voir les pharmacies",
      },
      {
        key: "pharmacies.manage",
        label: "Gérer les pharmacies",
      },
    ],
  },
  {
    title: "Abonnements",
    icon: "📅",
    permissions: [
      {
        key: "subscriptions.view",
        label: "Voir les abonnements",
      },
      {
        key: "subscriptions.manage",
        label: "Gérer les abonnements",
      },
    ],
  },
  {
    title: "Paiements",
    icon: "💳",
    permissions: [
      {
        key: "payments.view",
        label: "Voir les paiements",
      },
      {
        key: "payments.manage",
        label: "Gérer les paiements",
      },
    ],
  },
  {
    title: "Technique",
    icon: "🛠️",
    permissions: [
      {
        key: "technical.view",
        label: "Voir les incidents",
      },
      {
        key: "technical.manage",
        label: "Gérer les incidents",
      },
    ],
  },
  {
    title: "Analytique",
    icon: "📊",
    permissions: [
      {
        key: "analytics.view",
        label: "Voir les statistiques",
      },
    ],
  },
  {
    title: "Sécurité",
    icon: "🛡️",
    permissions: [
      {
        key: "security.view",
        label: "Voir la sécurité",
      },
      {
        key: "security.manage",
        label: "Gérer la sécurité",
      },
    ],
  },
] as const;

export default function ModifierMembrePage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const memberId = params.id;

  const [member, setMember] =
    useState<Member | null>(null);

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [role, setRole] =
    useState<TeamRole>("support");

  const [isActive, setIsActive] =
    useState(true);

  const [permissions, setPermissions] =
    useState<Record<string, boolean>>(
      {},
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    if (!memberId) {
      return;
    }

    let cancelled = false;

    async function loadMember() {
      try {
        setLoading(true);
        setError("");

        /*
         * La page utilise l'API existante de gestion
         * de l'équipe pour récupérer le membre.
         *
         * Si ton API GET générale n'existe pas encore,
         * nous ajouterons le GET dans l'étape suivante.
         */
        const response = await fetch(
          `/api/super-admin/team/${memberId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as {
            success?: boolean;
            member?: Member;
            error?: string;
          };

        if (!response.ok || !result.member) {
          throw new Error(
            result.error ||
              "Impossible de récupérer le membre.",
          );
        }

        if (cancelled) {
          return;
        }

        const current =
          result.member;

        setMember(current);
        setFullName(
          current.full_name,
        );
        setPhone(
          current.phone ?? "",
        );
        setRole(current.role);
        setIsActive(
          current.is_active,
        );
        setPermissions(
          current.permissions ?? {},
        );
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de charger le membre.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMember();

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  function togglePermission(
    key: string,
  ) {
    setPermissions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function enableAll() {
    const next: Record<string, boolean> =
      {};

    for (const group of PERMISSION_GROUPS) {
      for (const permission of group.permissions) {
        next[permission.key] = true;
      }
    }

    setPermissions(next);
  }

  function disableAll() {
    setPermissions({});
  }

  async function saveMember() {
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError(
        "Le nom complet est obligatoire.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/super-admin/team/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fullName:
              fullName.trim(),
            phone: phone.trim(),
            role,
            isActive,
            permissions,
          }),
        },
      );

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Impossible de modifier le membre.",
        );
      }

      setSuccess(
        "Les modifications ont été enregistrées.",
      );

      window.setTimeout(() => {
        router.push(
          "/super-admin/utilisateurs",
        );
        router.refresh();
      }, 700);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="pf-team-edit-page">
        <div className="pf-team-loading">
          Chargement du membre…
        </div>

        <EditStyles />
      </main>
    );
  }

  if (!member) {
    return (
      <main className="pf-team-edit-page">
        <div className="pf-team-edit-card">
          <div className="pf-team-error">
            {error ||
              "Membre introuvable."}
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/super-admin/utilisateurs",
              )
            }
            className="pf-team-secondary-button"
          >
            Retour à l'équipe
          </button>
        </div>

        <EditStyles />
      </main>
    );
  }

  return (
    <main className="pf-team-edit-page">
      <div className="pf-team-edit-container">
        <button
          type="button"
          className="pf-team-back"
          onClick={() =>
            router.push(
              "/super-admin/utilisateurs",
            )
          }
        >
          ← Retour aux utilisateurs
        </button>

        <div className="pf-team-title">
          <div>
            <span>
              ÉQUIPE PHARMAFLOW
            </span>

            <h1>
              Modifier le membre
            </h1>

            <p>
              Modifiez son rôle, ses
              permissions ou son statut.
            </p>
          </div>

          <div
            className={
              isActive
                ? "pf-team-status active"
                : "pf-team-status inactive"
            }
          >
            {isActive
              ? "● Actif"
              : "● Inactif"}
          </div>
        </div>

        {error ? (
          <div className="pf-team-alert error">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="pf-team-alert success">
            {success}
          </div>
        ) : null}

        <section className="pf-team-edit-card">
          <div className="pf-team-section-title">
            <h2>
              Informations du membre
            </h2>

            <p>
              L'adresse email est liée au compte
              d'authentification et n'est pas
              modifiable depuis cette interface.
            </p>
          </div>

          <div className="pf-team-fields">
            <label>
              <span>Nom complet</span>

              <input
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value,
                  )
                }
                placeholder="Nom complet"
              />
            </label>

            <label>
              <span>Email</span>

              <input
                value={member.email}
                disabled
                readOnly
              />
            </label>

            <label>
              <span>Téléphone</span>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value,
                  )
                }
                placeholder="+242..."
              />
            </label>
          </div>
        </section>

        <section className="pf-team-edit-card">
          <div className="pf-team-section-title">
            <h2>
              Statut du compte
            </h2>

            <p>
              Un membre désactivé reste enregistré
              mais ne peut plus accéder à son espace
              Agent.
            </p>
          </div>

          <label className="pf-team-switch-row">
            <div>
              <strong>
                Compte actif
              </strong>

              <span>
                Autoriser l'accès à l'espace Agent
              </span>
            </div>

            <button
              type="button"
              className={
                isActive
                  ? "pf-team-switch on"
                  : "pf-team-switch"
              }
              onClick={() =>
                setIsActive(
                  (current) => !current,
                )
              }
              aria-label={
                isActive
                  ? "Désactiver le compte"
                  : "Activer le compte"
              }
            >
              <span />
            </button>
          </label>
        </section>

        <section className="pf-team-edit-card">
          <div className="pf-team-section-title">
            <h2>
              Rôle
            </h2>

            <p>
              Le rôle définit la fonction principale
              du membre dans l'équipe PharmaFlow.
            </p>
          </div>

          <div className="pf-team-role-grid">
            {ROLES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={
                  role === item.value
                    ? "pf-team-role selected"
                    : "pf-team-role"
                }
                onClick={() =>
                  setRole(item.value)
                }
              >
                <span className="role-icon">
                  {item.icon}
                </span>

                <span className="role-content">
                  <strong>
                    {item.label}
                  </strong>

                  <small>
                    {item.description}
                  </small>
                </span>

                <span className="role-radio">
                  {role === item.value
                    ? "✓"
                    : ""}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="pf-team-edit-card">
          <div className="pf-team-section-title pf-team-permissions-header">
            <div>
              <h2>
                Permissions
              </h2>

              <p>
                Définissez précisément ce que ce membre
                peut consulter ou gérer.
              </p>
            </div>

            <div className="pf-team-permission-actions">
              <button
                type="button"
                onClick={enableAll}
              >
                Tout activer
              </button>

              <button
                type="button"
                onClick={disableAll}
              >
                Tout désactiver
              </button>
            </div>
          </div>

          <div className="pf-team-permission-grid">
            {PERMISSION_GROUPS.map(
              (group) => (
                <div
                  key={group.title}
                  className="pf-team-permission-group"
                >
                  <div className="pf-team-permission-title">
                    <span>
                      {group.icon}
                    </span>

                    <strong>
                      {group.title}
                    </strong>
                  </div>

                  {group.permissions.map(
                    (permission) => (
                      <label
                        key={
                          permission.key
                        }
                        className="pf-team-permission"
                      >
                        <input
                          type="checkbox"
                          checked={
                            permissions[
                              permission.key
                            ] === true
                          }
                          onChange={() =>
                            togglePermission(
                              permission.key,
                            )
                          }
                        />

                        <span>
                          {permission.label}
                        </span>
                      </label>
                    ),
                  )}
                </div>
              ),
            )}
          </div>
        </section>

        <div className="pf-team-actions">
          <button
            type="button"
            className="pf-team-secondary-button"
            onClick={() =>
              router.push(
                "/super-admin/utilisateurs",
              )
            }
          >
            Annuler
          </button>

          <button
            type="button"
            className="pf-team-primary-button"
            onClick={saveMember}
            disabled={saving}
          >
            {saving
              ? "Enregistrement…"
              : "Enregistrer les modifications"}
          </button>
        </div>
      </div>

      <EditStyles />
    </main>
  );
}

function EditStyles() {
  return (
    <style jsx global>{`
      .pf-team-edit-page {
        min-height: 100vh;
        background: #f6f8fb;
        color: #172033;
      }

      .pf-team-edit-container {
        width: min(
          1120px,
          calc(100% - 40px)
        );
        margin: 0 auto;
        padding: 30px 0 60px;
      }

      .pf-team-loading {
        min-height: 60vh;
        display: grid;
        place-items: center;
        color: #667085;
        font-size: 14px;
      }

      .pf-team-back {
        border: 0;
        padding: 0;
        background: transparent;
        color: #0f766e;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .pf-team-title {
        margin: 22px 0;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
      }

      .pf-team-title > div:first-child > span {
        color: #0f766e;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.8px;
      }

      .pf-team-title h1 {
        margin: 7px 0 5px;
        font-size: 30px;
        letter-spacing: -0.6px;
      }

      .pf-team-title p {
        margin: 0;
        color: #718096;
        font-size: 13px;
      }

      .pf-team-status {
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }

      .pf-team-status.active {
        background: #ecfdf3;
        color: #067647;
      }

      .pf-team-status.inactive {
        background: #f2f4f7;
        color: #667085;
      }

      .pf-team-alert {
        margin-bottom: 18px;
        padding: 13px 15px;
        border-radius: 12px;
        font-size: 13px;
      }

      .pf-team-alert.error {
        background: #fff1f2;
        border: 1px solid #fecdd3;
        color: #9f1239;
      }

      .pf-team-alert.success {
        background: #ecfdf3;
        border: 1px solid #bbf7d0;
        color: #166534;
      }

      .pf-team-edit-card {
        margin-bottom: 18px;
        padding: 24px;
        background: #ffffff;
        border: 1px solid #e4e9ef;
        border-radius: 18px;
        box-sizing: border-box;
      }

      .pf-team-section-title {
        margin-bottom: 20px;
      }

      .pf-team-section-title h2 {
        margin: 0;
        font-size: 16px;
      }

      .pf-team-section-title p {
        margin: 5px 0 0;
        color: #718096;
        font-size: 12px;
        line-height: 1.55;
      }

      .pf-team-fields {
        display: grid;
        grid-template-columns: repeat(
          2,
          minmax(0, 1fr)
        );
        gap: 16px;
      }

      .pf-team-fields label {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .pf-team-fields label:first-child {
        grid-column: 1 / -1;
      }

      .pf-team-fields span {
        color: #344054;
        font-size: 12px;
        font-weight: 700;
      }

      .pf-team-fields input {
        width: 100%;
        height: 46px;
        padding: 0 13px;
        border: 1px solid #d9e0e8;
        border-radius: 11px;
        outline: none;
        background: #ffffff;
        color: #172033;
        font: inherit;
        box-sizing: border-box;
      }

      .pf-team-fields input:focus {
        border-color: #0f766e;
        box-shadow:
          0 0 0 3px
            rgba(15, 118, 110, 0.08);
      }

      .pf-team-fields input:disabled {
        background: #f8fafc;
        color: #98a2b3;
        cursor: not-allowed;
      }

      .pf-team-switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .pf-team-switch-row strong {
        display: block;
        font-size: 13px;
      }

      .pf-team-switch-row span {
        display: block;
        margin-top: 4px;
        color: #718096;
        font-size: 12px;
      }

      .pf-team-switch {
        width: 48px;
        height: 27px;
        padding: 3px;
        border: 0;
        border-radius: 999px;
        background: #d0d5dd;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .pf-team-switch span {
        width: 21px;
        height: 21px;
        margin: 0;
        display: block;
        border-radius: 50%;
        background: #ffffff;
        box-shadow:
          0 1px 3px
            rgba(0, 0, 0, 0.15);
        transition:
          transform 0.2s ease;
      }

      .pf-team-switch.on {
        background: #0f766e;
      }

      .pf-team-switch.on span {
        transform: translateX(21px);
      }

      .pf-team-role-grid {
        display: grid;
        grid-template-columns: repeat(
          2,
          minmax(0, 1fr)
        );
        gap: 12px;
      }

      .pf-team-role {
        min-height: 88px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        text-align: left;
        border: 1px solid #e3e8ee;
        border-radius: 14px;
        background: #ffffff;
        cursor: pointer;
      }

      .pf-team-role.selected {
        border-color: #0f766e;
        background: #f0fdfa;
        box-shadow:
          0 0 0 1px
            rgba(15, 118, 110, 0.08);
      }

      .role-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #f8fafc;
        font-size: 19px;
      }

      .role-content {
        flex: 1;
        min-width: 0;
      }

      .role-content strong {
        display: block;
        color: #273142;
        font-size: 13px;
      }

      .role-content small {
        display: block;
        margin-top: 4px;
        color: #718096;
        font-size: 11px;
        line-height: 1.45;
      }

      .role-radio {
        width: 24px;
        height: 24px;
        flex: 0 0 24px;
        display: grid;
        place-items: center;
        border: 1px solid #d0d5dd;
        border-radius: 50%;
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
      }

      .selected .role-radio {
        border-color: #0f766e;
        background: #0f766e;
      }

      .pf-team-permissions-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
      }

      .pf-team-permission-actions {
        display: flex;
        gap: 8px;
      }

      .pf-team-permission-actions button {
        padding: 8px 10px;
        border: 1px solid #dce2e8;
        border-radius: 9px;
        background: #ffffff;
        color: #344054;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .pf-team-permission-grid {
        display: grid;
        grid-template-columns: repeat(
          3,
          minmax(0, 1fr)
        );
        gap: 14px;
      }

      .pf-team-permission-group {
        padding: 15px;
        border: 1px solid #e7ebef;
        border-radius: 14px;
      }

      .pf-team-permission-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .pf-team-permission-title strong {
        font-size: 13px;
      }

      .pf-team-permission {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 0;
        color: #475467;
        font-size: 12px;
        cursor: pointer;
      }

      .pf-team-permission input {
        width: 16px;
        height: 16px;
        accent-color: #0f766e;
      }

      .pf-team-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
      }

      .pf-team-primary-button,
      .pf-team-secondary-button {
        min-height: 44px;
        padding: 0 17px;
        border-radius: 11px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }

      .pf-team-primary-button {
        border: 0;
        background: #0f766e;
        color: #ffffff;
      }

      .pf-team-primary-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .pf-team-secondary-button {
        border: 1px solid #dce2e8;
        background: #ffffff;
        color: #344054;
      }

      @media (max-width: 800px) {
        .pf-team-role-grid,
        .pf-team-permission-grid {
          grid-template-columns: 1fr;
        }

        .pf-team-fields {
          grid-template-columns: 1fr;
        }

        .pf-team-fields label:first-child {
          grid-column: auto;
        }
      }

      @media (max-width: 600px) {
        .pf-team-edit-container {
          width: min(
            100% - 28px,
            1120px
          );
          padding-top: 22px;
        }

        .pf-team-title {
          flex-direction: column;
        }

        .pf-team-edit-card {
          padding: 18px;
        }

        .pf-team-permissions-header {
          flex-direction: column;
        }

        .pf-team-actions {
          flex-direction: column-reverse;
        }

        .pf-team-actions button {
          width: 100%;
        }
      }
    `}</style>
  );
}