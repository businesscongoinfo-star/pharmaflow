"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TeamRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

type PermissionKey =
  | "support.view"
  | "support.reply"
  | "support.manage"
  | "pharmacies.view"
  | "pharmacies.manage"
  | "subscriptions.view"
  | "subscriptions.manage"
  | "payments.view"
  | "payments.manage"
  | "technical.view"
  | "technical.manage"
  | "analytics.view"
  | "security.view"
  | "security.manage";

type PermissionGroup = {
  title: string;
  description: string;
  items: {
    key: PermissionKey;
    label: string;
    description: string;
  }[];
};

const ROLE_OPTIONS: {
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
      "Répondre aux clients et gérer les demandes de support.",
  },
  {
    value: "finance",
    label: "Finance",
    icon: "💳",
    description:
      "Suivre les paiements, abonnements et opérations financières.",
  },
  {
    value: "technical",
    label: "Technique",
    icon: "🛠️",
    description:
      "Traiter les problèmes techniques et incidents de plateforme.",
  },
  {
    value: "operations",
    label: "Opérations",
    icon: "🏥",
    description:
      "Gérer les opérations liées aux pharmacies et à la plateforme.",
  },
  {
    value: "analyst",
    label: "Analyste",
    icon: "📊",
    description:
      "Consulter les données et rapports de la plateforme.",
  },
  {
    value: "security",
    label: "Sécurité",
    icon: "🛡️",
    description:
      "Surveiller les accès et les éléments de sécurité.",
  },
];

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Support & Réclamations",
    description:
      "Gestion des demandes des utilisateurs.",
    items: [
      {
        key: "support.view",
        label: "Consulter le support",
        description:
          "Voir les demandes et conversations.",
      },
      {
        key: "support.reply",
        label: "Répondre aux demandes",
        description:
          "Répondre aux clients.",
      },
      {
        key: "support.manage",
        label: "Gérer les demandes",
        description:
          "Modifier le statut, la priorité et la résolution.",
      },
    ],
  },
  {
    title: "Pharmacies",
    description:
      "Accès aux informations des pharmacies.",
    items: [
      {
        key: "pharmacies.view",
        label: "Consulter les pharmacies",
        description:
          "Voir les informations des pharmacies.",
      },
      {
        key: "pharmacies.manage",
        label: "Gérer les pharmacies",
        description:
          "Effectuer les opérations autorisées sur les pharmacies.",
      },
    ],
  },
  {
    title: "Abonnements",
    description:
      "Gestion des abonnements PharmaFlow.",
    items: [
      {
        key: "subscriptions.view",
        label: "Consulter les abonnements",
        description:
          "Voir les abonnements et leurs états.",
      },
      {
        key: "subscriptions.manage",
        label: "Gérer les abonnements",
        description:
          "Effectuer les opérations autorisées sur les abonnements.",
      },
    ],
  },
  {
    title: "Paiements",
    description:
      "Accès aux opérations de paiement.",
    items: [
      {
        key: "payments.view",
        label: "Consulter les paiements",
        description:
          "Voir les paiements et leurs statuts.",
      },
      {
        key: "payments.manage",
        label: "Gérer les paiements",
        description:
          "Effectuer les opérations financières autorisées.",
      },
    ],
  },
  {
    title: "Technique",
    description:
      "Accès aux informations techniques.",
    items: [
      {
        key: "technical.view",
        label: "Consulter les informations techniques",
        description:
          "Voir les incidents et informations techniques.",
      },
      {
        key: "technical.manage",
        label: "Gérer les incidents techniques",
        description:
          "Traiter les incidents techniques autorisés.",
      },
    ],
  },
  {
    title: "Analytique",
    description:
      "Accès aux données analytiques.",
    items: [
      {
        key: "analytics.view",
        label: "Consulter les statistiques",
        description:
          "Voir les données et indicateurs disponibles.",
      },
    ],
  },
  {
    title: "Sécurité",
    description:
      "Accès aux fonctions de sécurité.",
    items: [
      {
        key: "security.view",
        label: "Consulter la sécurité",
        description:
          "Voir les informations de sécurité.",
      },
      {
        key: "security.manage",
        label: "Gérer la sécurité",
        description:
          "Effectuer les opérations de sécurité autorisées.",
      },
    ],
  },
];

function getDefaultPermissions(
  role: TeamRole,
): Record<PermissionKey, boolean> {
  const permissions = {} as Record<
    PermissionKey,
    boolean
  >;

  for (const group of PERMISSION_GROUPS) {
    for (const item of group.items) {
      permissions[item.key] = false;
    }
  }

  switch (role) {
    case "support":
      permissions["support.view"] = true;
      permissions["support.reply"] = true;
      permissions["pharmacies.view"] = true;
      permissions["subscriptions.view"] = true;
      break;

    case "finance":
      permissions["payments.view"] = true;
      permissions["payments.manage"] = true;
      permissions["subscriptions.view"] = true;
      permissions["subscriptions.manage"] = true;
      permissions["analytics.view"] = true;
      break;

    case "technical":
      permissions["technical.view"] = true;
      permissions["technical.manage"] = true;
      permissions["support.view"] = true;
      permissions["pharmacies.view"] = true;
      break;

    case "operations":
      permissions["pharmacies.view"] = true;
      permissions["pharmacies.manage"] = true;
      permissions["support.view"] = true;
      permissions["support.reply"] = true;
      permissions["analytics.view"] = true;
      break;

    case "analyst":
      permissions["analytics.view"] = true;
      permissions["pharmacies.view"] = true;
      permissions["subscriptions.view"] = true;
      permissions["payments.view"] = true;
      break;

    case "security":
      permissions["security.view"] = true;
      permissions["security.manage"] = true;
      permissions["technical.view"] = true;
      permissions["pharmacies.view"] = true;
      break;
  }

  return permissions;
}

export default function NewTeamMemberPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [role, setRole] =
    useState<TeamRole>("support");

  const [permissions, setPermissions] =
    useState<Record<PermissionKey, boolean>>(
      () => getDefaultPermissions("support"),
    );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRole = useMemo(
    () =>
      ROLE_OPTIONS.find(
        (item) => item.value === role,
      ),
    [role],
  );

  const permissionCount = useMemo(
    () =>
      Object.values(permissions).filter(Boolean)
        .length,
    [permissions],
  );

  function handleRoleChange(
    nextRole: TeamRole,
  ) {
    setRole(nextRole);
    setPermissions(
      getDefaultPermissions(nextRole),
    );
  }

  function togglePermission(
    key: PermissionKey,
  ) {
    setPermissions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function enableAllPermissions() {
    const next = {
      ...permissions,
    };

    for (const group of PERMISSION_GROUPS) {
      for (const item of group.items) {
        next[item.key] = true;
      }
    }

    setPermissions(next);
  }

  function disableAllPermissions() {
    const next = {
      ...permissions,
    };

    for (const group of PERMISSION_GROUPS) {
      for (const item of group.items) {
        next[item.key] = false;
      }
    }

    setPermissions(next);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/super-admin/team",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            email,
            phone,
            role,
            permissions,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Impossible de créer le membre.",
        );
      }

      setSuccess(
        "Le membre a été créé. Une invitation lui a été envoyée par email.",
      );

      setTimeout(() => {
        router.push(
          "/super-admin/utilisateurs",
        );
        router.refresh();
      }, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="team-page">
      <div className="team-container">
        <header className="page-header">
          <div>
            <div className="breadcrumb">
              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <Link href="/super-admin/utilisateurs">
                Équipe
              </Link>

              <span>/</span>

              <span>Nouveau membre</span>
            </div>

            <h1>Ajouter un membre</h1>

            <p>
              Créez un membre de l'équipe
              PharmaFlow avec un rôle et des
              permissions contrôlées.
            </p>
          </div>

          <Link
            href="/super-admin/utilisateurs"
            className="back-button"
          >
            ← Retour à l'équipe
          </Link>
        </header>

        <form
          className="member-form"
          onSubmit={handleSubmit}
        >
          <section className="form-card">
            <div className="section-heading">
              <div className="section-icon">
                👤
              </div>

              <div>
                <h2>Informations du membre</h2>

                <p>
                  Ces informations seront associées
                  au compte plateforme.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>
                  Nom complet
                  <strong>*</strong>
                </span>

                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  placeholder="Ex. Jean Dupont"
                  required
                  disabled={loading}
                />
              </label>

              <label className="field">
                <span>
                  Adresse email
                  <strong>*</strong>
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="agent@pharmaflow.africa"
                  required
                  disabled={loading}
                />

                <small>
                  L'invitation de connexion sera
                  envoyée à cette adresse.
                </small>
              </label>

              <label className="field">
                <span>Téléphone</span>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  placeholder="+242..."
                  disabled={loading}
                />
              </label>
            </div>
          </section>

          <section className="form-card">
            <div className="section-heading">
              <div className="section-icon">
                🎯
              </div>

              <div>
                <h2>Rôle plateforme</h2>

                <p>
                  Le rôle définit les permissions
                  proposées par défaut.
                </p>
              </div>
            </div>

            <div className="roles-grid">
              {ROLE_OPTIONS.map((item) => {
                const active =
                  item.value === role;

                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`role-card ${
                      active
                        ? "role-card-active"
                        : ""
                    }`}
                    onClick={() =>
                      handleRoleChange(
                        item.value,
                      )
                    }
                    disabled={loading}
                  >
                    <div className="role-top">
                      <span className="role-icon">
                        {item.icon}
                      </span>

                      <span
                        className={`role-radio ${
                          active
                            ? "role-radio-active"
                            : ""
                        }`}
                      >
                        {active ? "✓" : ""}
                      </span>
                    </div>

                    <strong>{item.label}</strong>

                    <p>
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedRole && (
              <div className="selected-role">
                <span>
                  {selectedRole.icon}
                </span>

                <div>
                  <strong>
                    Rôle sélectionné :{" "}
                    {selectedRole.label}
                  </strong>

                  <p>
                    {selectedRole.description}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="form-card">
            <div className="permissions-header">
              <div className="section-heading">
                <div className="section-icon">
                  🔐
                </div>

                <div>
                  <h2>Permissions</h2>

                  <p>
                    Contrôlez précisément ce que ce
                    membre pourra consulter ou gérer.
                  </p>
                </div>
              </div>

              <div className="permission-tools">
                <span className="permission-count">
                  {permissionCount} permission
                  {permissionCount > 1
                    ? "s"
                    : ""}{" "}
                  active
                  {permissionCount > 1
                    ? "s"
                    : ""}
                </span>

                <button
                  type="button"
                  onClick={
                    enableAllPermissions
                  }
                  disabled={loading}
                >
                  Tout activer
                </button>

                <button
                  type="button"
                  onClick={
                    disableAllPermissions
                  }
                  disabled={loading}
                >
                  Tout désactiver
                </button>
              </div>
            </div>

            <div className="permission-groups">
              {PERMISSION_GROUPS.map(
                (group) => (
                  <div
                    className="permission-group"
                    key={group.title}
                  >
                    <div className="permission-group-heading">
                      <h3>{group.title}</h3>

                      <p>
                        {group.description}
                      </p>
                    </div>

                    <div className="permission-list">
                      {group.items.map(
                        (item) => (
                          <label
                            className="permission-item"
                            key={item.key}
                          >
                            <input
                              type="checkbox"
                              checked={
                                permissions[
                                  item.key
                                ]
                              }
                              onChange={() =>
                                togglePermission(
                                  item.key,
                                )
                              }
                              disabled={
                                loading
                              }
                            />

                            <span className="permission-check">
                              {permissions[
                                item.key
                              ]
                                ? "✓"
                                : ""}
                            </span>

                            <span className="permission-text">
                              <strong>
                                {item.label}
                              </strong>

                              <small>
                                {
                                  item.description
                                }
                              </small>
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>

              <div>
                <strong>
                  Impossible de créer le membre
                </strong>

                <p>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>✅</span>

              <div>
                <strong>
                  Membre créé avec succès
                </strong>

                <p>{success}</p>
              </div>
            </div>
          )}

          <div className="form-actions">
            <Link
              href="/super-admin/utilisateurs"
              className="cancel-button"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Création en cours...
                </>
              ) : (
                <>
                  ✉️ Créer et envoyer l'invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .team-page {
          min-height: 100vh;
          background: #f6f8fb;
          padding: 32px;
        }

        .team-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
          color: #8a94a6;
          font-size: 12px;
        }

        .breadcrumb a {
          color: #526071;
          text-decoration: none;
          font-weight: 600;
        }

        .breadcrumb a:hover {
          color: #2563eb;
        }

        .page-header h1 {
          margin: 0;
          color: #182230;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .page-header p {
          margin: 8px 0 0;
          color: #6b7686;
          font-size: 14px;
          line-height: 1.6;
        }

        .back-button {
          min-height: 42px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dce2ea;
          border-radius: 10px;
          background: #fff;
          color: #344054;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .back-button:hover {
          background: #f8fafc;
        }

        .member-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-card {
          padding: 24px;
          border: 1px solid #e5e9ef;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .section-heading {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-bottom: 22px;
        }

        .section-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #eff6ff;
          font-size: 20px;
        }

        .section-heading h2 {
          margin: 0;
          color: #1f2937;
          font-size: 17px;
          font-weight: 800;
        }

        .section-heading p {
          margin: 5px 0 0;
          color: #7a8595;
          font-size: 12px;
          line-height: 1.5;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field:nth-child(3) {
          grid-column: 1 / -1;
          max-width: calc(50% - 9px);
        }

        .field > span {
          color: #344054;
          font-size: 13px;
          font-weight: 700;
        }

        .field > span strong {
          margin-left: 3px;
          color: #ef4444;
        }

        .field input {
          width: 100%;
          min-height: 46px;
          box-sizing: border-box;
          padding: 0 13px;
          border: 1px solid #d9dee7;
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: #182230;
          font-family: inherit;
          font-size: 13px;
          transition: 0.2s ease;
        }

        .field input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.1);
        }

        .field input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .field small {
          color: #8a94a6;
          font-size: 11px;
          line-height: 1.5;
        }

        .roles-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .role-card {
          min-height: 155px;
          padding: 16px;
          text-align: left;
          border: 1px solid #e1e6ee;
          border-radius: 13px;
          background: #fff;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .role-card:hover {
          border-color: #b9c7da;
          transform: translateY(-1px);
        }

        .role-card-active {
          border-color: #2563eb;
          background: #f7faff;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.08);
        }

        .role-card:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .role-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .role-icon {
          font-size: 25px;
        }

        .role-radio {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd3df;
          border-radius: 50%;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
        }

        .role-radio-active {
          border-color: #2563eb;
          background: #2563eb;
        }

        .role-card strong {
          display: block;
          color: #202938;
          font-size: 14px;
          font-weight: 800;
        }

        .role-card p {
          margin: 7px 0 0;
          color: #7b8797;
          font-size: 11px;
          line-height: 1.55;
        }

        .selected-role {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding: 13px 15px;
          border: 1px solid #dce7f8;
          border-radius: 11px;
          background: #f8fbff;
        }

        .selected-role > span {
          font-size: 22px;
        }

        .selected-role strong {
          color: #243247;
          font-size: 12px;
        }

        .selected-role p {
          margin: 3px 0 0;
          color: #758196;
          font-size: 11px;
        }

        .permissions-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .permission-tools {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
        }

        .permission-count {
          padding: 7px 10px;
          border-radius: 8px;
          background: #f1f5f9;
          color: #526071;
          font-size: 11px;
          font-weight: 700;
        }

        .permission-tools button {
          min-height: 32px;
          padding: 0 10px;
          border: 1px solid #dce2ea;
          border-radius: 8px;
          background: #fff;
          color: #465365;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
        }

        .permission-tools button:hover {
          background: #f8fafc;
        }

        .permission-groups {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .permission-group {
          padding: 16px;
          border: 1px solid #e8ecf2;
          border-radius: 12px;
          background: #fbfcfe;
        }

        .permission-group-heading {
          margin-bottom: 12px;
        }

        .permission-group-heading h3 {
          margin: 0;
          color: #344054;
          font-size: 13px;
          font-weight: 800;
        }

        .permission-group-heading p {
          margin: 4px 0 0;
          color: #8993a2;
          font-size: 10px;
          line-height: 1.45;
        }

        .permission-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .permission-item {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          border: 1px solid #edf0f4;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .permission-item:hover {
          border-color: #d9e1ec;
        }

        .permission-item input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .permission-check {
          width: 19px;
          height: 19px;
          flex: 0 0 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd3df;
          border-radius: 5px;
          background: #fff;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
        }

        .permission-item
          input:checked
          + .permission-check {
          border-color: #2563eb;
          background: #2563eb;
        }

        .permission-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .permission-text strong {
          color: #344054;
          font-size: 11px;
          font-weight: 750;
        }

        .permission-text small {
          color: #8993a2;
          font-size: 9px;
          line-height: 1.4;
        }

        .alert {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 14px 16px;
          border-radius: 11px;
          font-size: 12px;
        }

        .alert > span {
          font-size: 18px;
        }

        .alert strong {
          display: block;
          font-size: 12px;
        }

        .alert p {
          margin: 4px 0 0;
          line-height: 1.5;
        }

        .alert-error {
          border: 1px solid #fecaca;
          background: #fff7f7;
          color: #991b1b;
        }

        .alert-success {
          border: 1px solid #bbf7d0;
          background: #f4fff7;
          color: #166534;
        }

        .form-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .cancel-button,
        .submit-button {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
          cursor: pointer;
        }

        .cancel-button {
          border: 1px solid #dce2ea;
          background: #fff;
          color: #465365;
        }

        .cancel-button:hover {
          background: #f8fafc;
        }

        .submit-button {
          border: none;
          background: #2563eb;
          color: #fff;
          box-shadow:
            0 5px 14px
            rgba(37, 99, 235, 0.18);
        }

        .submit-button:hover {
          background: #1d4ed8;
        }

        .submit-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spinner {
          width: 15px;
          height: 15px;
          margin-right: 8px;
          border: 2px solid
            rgba(255, 255, 255, 0.45);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .team-page {
            padding: 22px;
          }

          .page-header {
            flex-direction: column;
          }

          .roles-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .permission-groups {
            grid-template-columns: 1fr;
          }

          .permissions-header {
            flex-direction: column;
          }

          .permission-tools {
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .team-page {
            padding: 14px;
          }

          .form-card {
            padding: 17px;
            border-radius: 13px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .field:nth-child(3) {
            grid-column: auto;
            max-width: none;
          }

          .roles-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .cancel-button,
          .submit-button {
            width: 100%;
          }

          .permission-tools {
            width: 100%;
          }

          .permission-tools button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}