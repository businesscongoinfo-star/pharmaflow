"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type TeamRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

type CreationMethod =
  | "temporary_password"
  | "invitation";

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

const ROLES: {
  value: TeamRole;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "support",
    label: "Support",
    description:
      "Gestion des demandes, réclamations et assistance des clients.",
    icon: "🛟",
  },
  {
    value: "finance",
    label: "Finance",
    description:
      "Paiements, abonnements et opérations financières.",
    icon: "💳",
  },
  {
    value: "technical",
    label: "Technique",
    description:
      "Assistance technique et gestion des incidents.",
    icon: "🛠️",
  },
  {
    value: "operations",
    label: "Opérations",
    description:
      "Gestion opérationnelle des pharmacies et activités.",
    icon: "🏥",
  },
  {
    value: "analyst",
    label: "Analyste",
    description:
      "Consultation des données et analyses de la plateforme.",
    icon: "📊",
  },
  {
    value: "security",
    label: "Sécurité",
    description:
      "Contrôles de sécurité et opérations sensibles.",
    icon: "🛡️",
  },
];

const PERMISSION_GROUPS: {
  title: string;
  description: string;
  icon: string;
  permissions: {
    key: PermissionKey;
    label: string;
    description: string;
  }[];
}[] = [
  {
    title: "Support",
    description:
      "Accès au centre d'assistance et aux réclamations.",
    icon: "🛟",
    permissions: [
      {
        key: "support.view",
        label: "Voir",
        description:
          "Consulter les demandes et réclamations.",
      },
      {
        key: "support.reply",
        label: "Répondre",
        description:
          "Répondre aux clients.",
      },
      {
        key: "support.manage",
        label: "Gérer",
        description:
          "Modifier les statuts et gérer les demandes.",
      },
    ],
  },
  {
    title: "Pharmacies",
    description:
      "Gestion des pharmacies enregistrées sur PharmaFlow.",
    icon: "🏥",
    permissions: [
      {
        key: "pharmacies.view",
        label: "Voir",
        description:
          "Consulter les pharmacies.",
      },
      {
        key: "pharmacies.manage",
        label: "Gérer",
        description:
          "Modifier les pharmacies et leurs paramètres.",
      },
    ],
  },
  {
    title: "Abonnements",
    description:
      "Gestion des abonnements des pharmacies.",
    icon: "📦",
    permissions: [
      {
        key: "subscriptions.view",
        label: "Voir",
        description:
          "Consulter les abonnements.",
      },
      {
        key: "subscriptions.manage",
        label: "Gérer",
        description:
          "Modifier les abonnements.",
      },
    ],
  },
  {
    title: "Paiements",
    description:
      "Accès aux informations de paiement.",
    icon: "💳",
    permissions: [
      {
        key: "payments.view",
        label: "Voir",
        description:
          "Consulter les paiements.",
      },
      {
        key: "payments.manage",
        label: "Gérer",
        description:
          "Gérer les opérations de paiement.",
      },
    ],
  },
  {
    title: "Technique",
    description:
      "Gestion des incidents et opérations techniques.",
    icon: "🛠️",
    permissions: [
      {
        key: "technical.view",
        label: "Voir",
        description:
          "Consulter les informations techniques.",
      },
      {
        key: "technical.manage",
        label: "Gérer",
        description:
          "Gérer les opérations techniques.",
      },
    ],
  },
  {
    title: "Analytique",
    description:
      "Accès aux données et analyses.",
    icon: "📊",
    permissions: [
      {
        key: "analytics.view",
        label: "Voir",
        description:
          "Consulter les analyses.",
      },
    ],
  },
  {
    title: "Sécurité",
    description:
      "Accès aux fonctions de sécurité.",
    icon: "🛡️",
    permissions: [
      {
        key: "security.view",
        label: "Voir",
        description:
          "Consulter les informations de sécurité.",
      },
      {
        key: "security.manage",
        label: "Gérer",
        description:
          "Effectuer les opérations de sécurité.",
      },
    ],
  },
];

const ALL_PERMISSIONS: PermissionKey[] =
  PERMISSION_GROUPS.flatMap(
    (group) =>
      group.permissions.map(
        (permission) => permission.key,
      ),
  );

function getDefaultPermissions(
  role: TeamRole,
): Record<PermissionKey, boolean> {
  const permissions = {} as Record<
    PermissionKey,
    boolean
  >;

  for (const permission of ALL_PERMISSIONS) {
    permissions[permission] = false;
  }

  if (role === "support") {
    permissions["support.view"] = true;
    permissions["support.reply"] = true;
    permissions["support.manage"] = true;
  }

  if (role === "finance") {
    permissions["subscriptions.view"] = true;
    permissions["subscriptions.manage"] = true;
    permissions["payments.view"] = true;
    permissions["payments.manage"] = true;
  }

  if (role === "technical") {
    permissions["technical.view"] = true;
    permissions["technical.manage"] = true;
  }

  if (role === "operations") {
    permissions["pharmacies.view"] = true;
    permissions["pharmacies.manage"] = true;
  }

  if (role === "analyst") {
    permissions["analytics.view"] = true;
  }

  if (role === "security") {
    permissions["security.view"] = true;
    permissions["security.manage"] = true;
  }

  return permissions;
}

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  let randomPart = "";

  const cryptoObject =
    typeof window !== "undefined"
      ? window.crypto
      : null;

  if (cryptoObject) {
    const values = new Uint32Array(18);

    cryptoObject.getRandomValues(values);

    for (let index = 0; index < values.length; index += 1) {
      randomPart +=
        chars[values[index] % chars.length];
    }
  } else {
    randomPart =
      Math.random()
        .toString(36)
        .slice(2, 20);
  }

  return `PF-${randomPart}-!`;
}

export default function NewPlatformUserPage() {
  const router = useRouter();

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [role, setRole] =
    useState<TeamRole>("support");

  const [creationMethod, setCreationMethod] =
    useState<CreationMethod>(
      "temporary_password",
    );

  const [temporaryPassword, setTemporaryPassword] =
    useState(() => generatePassword());

  const [showPassword, setShowPassword] =
    useState(false);

  const [permissions, setPermissions] =
    useState<Record<
      PermissionKey,
      boolean
    >>(() =>
      getDefaultPermissions("support"),
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [createdPassword, setCreatedPassword] =
    useState("");

  const selectedPermissionCount =
    useMemo(
      () =>
        Object.values(permissions).filter(
          Boolean,
        ).length,
      [permissions],
    );

  const selectedRole = ROLES.find(
    (item) => item.value === role,
  );

  function handleRoleChange(
    nextRole: TeamRole,
  ) {
    setRole(nextRole);

    setPermissions(
      getDefaultPermissions(nextRole),
    );
  }

  function handlePermissionChange(
    permission: PermissionKey,
  ) {
    setPermissions((current) => ({
      ...current,
      [permission]: !current[permission],
    }));
  }

  function enableAllPermissions() {
    const next =
      {} as Record<
        PermissionKey,
        boolean
      >;

    for (const permission of ALL_PERMISSIONS) {
      next[permission] = true;
    }

    setPermissions(next);
  }

  function disableAllPermissions() {
    const next =
      {} as Record<
        PermissionKey,
        boolean
      >;

    for (const permission of ALL_PERMISSIONS) {
      next[permission] = false;
    }

    setPermissions(next);
  }

  function resetPermissionsToRole() {
    setPermissions(
      getDefaultPermissions(role),
    );
  }

  function regeneratePassword() {
    setTemporaryPassword(
      generatePassword(),
    );
  }

  async function copyPassword() {
    if (!temporaryPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        temporaryPassword,
      );

      setSuccess(
        "Mot de passe temporaire copié dans le presse-papiers.",
      );

      window.setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch {
      setError(
        "Impossible de copier automatiquement le mot de passe.",
      );
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreatedPassword("");

    const normalizedName =
      fullName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedPhone =
      phone.trim();

    if (!normalizedName) {
      setError(
        "Le nom complet est obligatoire.",
      );
      return;
    }

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      setError(
        "Veuillez saisir une adresse email valide.",
      );
      return;
    }

    if (
      creationMethod ===
        "temporary_password" &&
      !temporaryPassword
    ) {
      setError(
        "Le mot de passe temporaire est obligatoire.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/super-admin/team",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fullName:
              normalizedName,
            email:
              normalizedEmail,
            phone:
              normalizedPhone,
            role,
            permissions,
            creationMethod,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Impossible de créer le membre.",
        );
      }

      if (
        data.creationMethod ===
          "temporary_password" &&
        data.temporaryPassword
      ) {
        setCreatedPassword(
          data.temporaryPassword,
        );

        setSuccess(
          "Le membre a été créé avec succès. Conservez le mot de passe temporaire et transmettez-le au membre de manière sécurisée.",
        );

        return;
      }

      setSuccess(
        "Invitation envoyée avec succès. Le membre pourra définir son mot de passe depuis le lien reçu par email.",
      );

      window.setTimeout(() => {
        router.push(
          "/super-admin/utilisateurs",
        );

        router.refresh();
      }, 2200);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (loading) {
      return;
    }

    router.push(
      "/super-admin/utilisateurs",
    );
  }

  return (
    <main className="pf-new-team-page">

      <div className="pf-new-team-container">

        {/* =====================================================
            HEADER
           ===================================================== */}

        <header className="pf-new-team-header">

          <div>

            <div className="pf-new-team-breadcrumb">

              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <Link href="/super-admin/utilisateurs">
                Équipe
              </Link>

              <span>/</span>

              <span>
                Nouveau membre
              </span>

            </div>

            <div className="pf-new-team-title-row">

              <div className="pf-new-team-title-icon">
                👤
              </div>

              <div>

                <h1>
                  Ajouter un membre
                </h1>

                <p>
                  Créez un compte pour un membre
                  de l'équipe interne PharmaFlow.
                </p>

              </div>

            </div>

          </div>

          <button
            type="button"
            className="pf-new-team-back-button"
            onClick={goBack}
            disabled={loading}
          >
            ← Retour à l'équipe
          </button>

        </header>


        {/* =====================================================
            ALERTES
           ===================================================== */}

        {error && (
          <div className="pf-new-team-alert pf-new-team-alert-error">

            <span className="pf-new-team-alert-icon">
              ⚠️
            </span>

            <div>
              <strong>
                Impossible de créer le membre
              </strong>

              <p>
                {error}
              </p>
            </div>

          </div>
        )}


        {success && (
          <div className="pf-new-team-alert pf-new-team-alert-success">

            <span className="pf-new-team-alert-icon">
              ✅
            </span>

            <div>
              <strong>
                Opération réussie
              </strong>

              <p>
                {success}
              </p>
            </div>

          </div>
        )}


        {/* =====================================================
            MOT DE PASSE CRÉÉ
           ===================================================== */}

        {createdPassword && (
          <section className="pf-new-team-credential-card">

            <div className="pf-new-team-credential-icon">
              🔑
            </div>

            <div className="pf-new-team-credential-content">

              <span className="pf-new-team-credential-label">
                Mot de passe temporaire
              </span>

              <strong>
                {createdPassword}
              </strong>

              <p>
                Ce mot de passe doit être transmis
                au membre de manière sécurisée.
                Il devra obligatoirement être remplacé
                lors de sa première connexion.
              </p>

              <div className="pf-new-team-credential-actions">

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        createdPassword,
                      );

                      setSuccess(
                        "Mot de passe copié.",
                      );
                    } catch {
                      setError(
                        "Impossible de copier le mot de passe.",
                      );
                    }
                  }}
                  className="pf-new-team-copy-button"
                >
                  📋 Copier
                </button>

                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      "/super-admin/utilisateurs",
                    );

                    router.refresh();
                  }}
                  className="pf-new-team-primary-button"
                >
                  ✓ Terminer
                </button>

              </div>

            </div>

          </section>
        )}


        <form
          onSubmit={handleSubmit}
          className="pf-new-team-form"
        >

          {/* ===================================================
              INFORMATIONS PERSONNELLES
             =================================================== */}

          <section className="pf-new-team-card">

            <div className="pf-new-team-card-header">

              <div className="pf-new-team-section-icon">
                👤
              </div>

              <div>

                <h2>
                  Informations du membre
                </h2>

                <p>
                  Informations utilisées pour
                  identifier le membre de l'équipe.
                </p>

              </div>

            </div>


            <div className="pf-new-team-fields">

              <div className="pf-new-team-field">

                <label htmlFor="fullName">
                  Nom complet
                  <span>*</span>
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  placeholder="Ex. Jean Dupont"
                  autoComplete="name"
                  disabled={loading}
                  required
                />

              </div>


              <div className="pf-new-team-field">

                <label htmlFor="email">
                  Adresse email
                  <span>*</span>
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="exemple@pharmaflow.africa"
                  autoComplete="email"
                  disabled={loading}
                  required
                />

              </div>


              <div className="pf-new-team-field">

                <label htmlFor="phone">
                  Téléphone
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  placeholder="+242 06 000 00 00"
                  autoComplete="tel"
                  disabled={loading}
                />

              </div>

            </div>

          </section>


          {/* ===================================================
              RÔLE
             =================================================== */}

          <section className="pf-new-team-card">

            <div className="pf-new-team-card-header">

              <div className="pf-new-team-section-icon">
                🎭
              </div>

              <div>

                <h2>
                  Rôle de l'équipe
                </h2>

                <p>
                  Le rôle définit les responsabilités
                  principales du membre.
                </p>

              </div>

            </div>


            <div className="pf-new-team-role-grid">

              {ROLES.map((item) => {

                const selected =
                  item.value === role;

                return (
                  <button
                    key={item.value}
                    type="button"
                    className={
                      selected
                        ? "pf-new-team-role-card pf-new-team-role-card-selected"
                        : "pf-new-team-role-card"
                    }
                    onClick={() =>
                      handleRoleChange(
                        item.value,
                      )
                    }
                    disabled={loading}
                  >

                    <span className="pf-new-team-role-icon">
                      {item.icon}
                    </span>

                    <span className="pf-new-team-role-content">

                      <strong>
                        {item.label}
                      </strong>

                      <small>
                        {item.description}
                      </small>

                    </span>

                    <span
                      className={
                        selected
                          ? "pf-new-team-radio pf-new-team-radio-selected"
                          : "pf-new-team-radio"
                      }
                    >
                      {selected
                        ? "✓"
                        : ""}
                    </span>

                  </button>
                );
              })}

            </div>


            {selectedRole && (
              <div className="pf-new-team-role-summary">

                <span>
                  {selectedRole.icon}
                </span>

                <div>

                  <strong>
                    Rôle sélectionné :
                    {" "}
                    {selectedRole.label}
                  </strong>

                  <p>
                    {selectedRole.description}
                  </p>

                </div>

              </div>
            )}

          </section>


          {/* ===================================================
              PERMISSIONS
             =================================================== */}

          <section className="pf-new-team-card">

            <div className="pf-new-team-card-header">

              <div className="pf-new-team-section-icon">
                🔐
              </div>

              <div className="pf-new-team-section-heading">

                <div>

                  <h2>
                    Permissions
                  </h2>

                  <p>
                    Définissez précisément les
                    fonctionnalités accessibles.
                  </p>

                </div>

                <span className="pf-new-team-permission-total">
                  {selectedPermissionCount}
                  {" / "}
                  {ALL_PERMISSIONS.length}
                </span>

              </div>

            </div>


            <div className="pf-new-team-permission-toolbar">

              <button
                type="button"
                onClick={enableAllPermissions}
                disabled={loading}
                className="pf-new-team-small-button"
              >
                ✓ Tout activer
              </button>

              <button
                type="button"
                onClick={disableAllPermissions}
                disabled={loading}
                className="pf-new-team-small-button"
              >
                ○ Tout désactiver
              </button>

              <button
                type="button"
                onClick={resetPermissionsToRole}
                disabled={loading}
                className="pf-new-team-small-button pf-new-team-small-button-blue"
              >
                ↻ Permissions du rôle
              </button>

            </div>


            <div className="pf-new-team-permission-grid">

              {PERMISSION_GROUPS.map(
                (group) => (
                  <div
                    key={group.title}
                    className="pf-new-team-permission-group"
                  >

                    <div className="pf-new-team-permission-group-header">

                      <span>
                        {group.icon}
                      </span>

                      <div>

                        <strong>
                          {group.title}
                        </strong>

                        <small>
                          {group.description}
                        </small>

                      </div>

                    </div>


                    <div className="pf-new-team-permission-list">

                      {group.permissions.map(
                        (permission) => {

                          const enabled =
                            permissions[
                              permission.key
                            ];

                          return (
                            <label
                              key={permission.key}
                              className={
                                enabled
                                  ? "pf-new-team-permission-item pf-new-team-permission-item-enabled"
                                  : "pf-new-team-permission-item"
                              }
                            >

                              <input
                                type="checkbox"
                                checked={Boolean(
                                  enabled,
                                )}
                                onChange={() =>
                                  handlePermissionChange(
                                    permission.key,
                                  )
                                }
                                disabled={loading}
                              />

                              <span className="pf-new-team-checkbox">

                                {enabled
                                  ? "✓"
                                  : ""}

                              </span>

                              <span className="pf-new-team-permission-text">

                                <strong>
                                  {permission.label}
                                </strong>

                                <small>
                                  {permission.description}
                                </small>

                              </span>

                            </label>
                          );
                        },
                      )}

                    </div>

                  </div>
                ),
              )}

            </div>

          </section>


          {/* ===================================================
              MÉTHODE D'ACCÈS
             =================================================== */}

          <section className="pf-new-team-card">

            <div className="pf-new-team-card-header">

              <div className="pf-new-team-section-icon">
                🔑
              </div>

              <div>

                <h2>
                  Méthode de création du compte
                </h2>

                <p>
                  Choisissez comment le membre recevra
                  son premier accès à PharmaFlow.
                </p>

              </div>

            </div>


            <div className="pf-new-team-access-grid">

              {/* MOT DE PASSE TEMPORAIRE */}

              <button
                type="button"
                className={
                  creationMethod ===
                    "temporary_password"
                    ? "pf-new-team-access-card pf-new-team-access-selected"
                    : "pf-new-team-access-card"
                }
                onClick={() =>
                  setCreationMethod(
                    "temporary_password",
                  )
                }
                disabled={loading}
              >

                <div className="pf-new-team-access-icon">
                  🔐
                </div>

                <div>

                  <strong>
                    Mot de passe temporaire
                  </strong>

                  <p>
                    PharmaFlow crée immédiatement
                    le compte et génère un mot de
                    passe initial.
                  </p>

                  <span>
                    Recommandé pour une création
                    directe par le Super Admin.
                  </span>

                </div>

                <div className="pf-new-team-access-check">

                  {creationMethod ===
                    "temporary_password"
                    ? "✓"
                    : ""}

                </div>

              </button>


              {/* INVITATION EMAIL */}

              <button
                type="button"
                className={
                  creationMethod ===
                    "invitation"
                    ? "pf-new-team-access-card pf-new-team-access-selected"
                    : "pf-new-team-access-card"
                }
                onClick={() =>
                  setCreationMethod(
                    "invitation",
                  )
                }
                disabled={loading}
              >

                <div className="pf-new-team-access-icon">
                  📩
                </div>

                <div>

                  <strong>
                    Invitation par e-mail
                  </strong>

                  <p>
                    Supabase envoie une invitation
                    au membre afin qu'il définisse
                    lui-même son mot de passe.
                  </p>

                  <span>
                    Le membre doit avoir accès à
                    sa boîte e-mail.
                  </span>

                </div>

                <div className="pf-new-team-access-check">

                  {creationMethod ===
                    "invitation"
                    ? "✓"
                    : ""}

                </div>

              </button>

            </div>


            {/* =================================================
                MOT DE PASSE TEMPORAIRE
               ================================================= */}

            {creationMethod ===
              "temporary_password" && (
              <div className="pf-new-team-password-panel">

                <div className="pf-new-team-password-header">

                  <div>

                    <strong>
                      🔑 Mot de passe initial
                    </strong>

                    <p>
                      Ce mot de passe sera utilisé
                      uniquement pour la première
                      connexion.
                    </p>

                  </div>

                  <span className="pf-new-team-secure-badge">
                    🔒 Sécurisé
                  </span>

                </div>


                <div className="pf-new-team-password-box">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      temporaryPassword
                    }
                    onChange={(event) =>
                      setTemporaryPassword(
                        event.target.value,
                      )
                    }
                    disabled={loading}
                    autoComplete="new-password"
                    aria-label="Mot de passe temporaire"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    disabled={loading}
                  >
                    {showPassword
                      ? "🙈 Masquer"
                      : "👁️ Afficher"}
                  </button>

                </div>


                <div className="pf-new-team-password-actions">

                  <button
                    type="button"
                    onClick={
                      regeneratePassword
                    }
                    disabled={loading}
                    className="pf-new-team-password-action"
                  >
                    🔄 Générer un nouveau
                  </button>

                  <button
                    type="button"
                    onClick={copyPassword}
                    disabled={loading}
                    className="pf-new-team-password-action"
                  >
                    📋 Copier
                  </button>

                </div>


                <div className="pf-new-team-password-warning">

                  <span>
                    ⚠️
                  </span>

                  <div>

                    <strong>
                      Changement obligatoire
                    </strong>

                    <p>
                      Après sa première connexion,
                      le membre sera obligé de définir
                      un nouveau mot de passe personnel.
                    </p>

                  </div>

                </div>

              </div>
            )}

          </section>


          {/* ===================================================
              RÉCAPITULATIF
             =================================================== */}

          <section className="pf-new-team-summary">

            <div className="pf-new-team-summary-header">

              <div>
                <strong>
                  Vérification avant création
                </strong>

                <p>
                  Vérifiez les informations avant
                  de créer le compte.
                </p>
              </div>

              <span>
                {creationMethod ===
                  "temporary_password"
                  ? "🔐 Mot de passe temporaire"
                  : "📩 Invitation email"}
              </span>

            </div>


            <div className="pf-new-team-summary-grid">

              <div>
                <small>
                  Nom
                </small>

                <strong>
                  {fullName.trim() ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <small>
                  Email
                </small>

                <strong>
                  {email.trim() ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <small>
                  Rôle
                </small>

                <strong>
                  {selectedRole?.icon}{" "}
                  {selectedRole?.label}
                </strong>
              </div>

              <div>
                <small>
                  Permissions
                </small>

                <strong>
                  {selectedPermissionCount}
                </strong>
              </div>

            </div>

          </section>


          {/* ===================================================
              ACTIONS
             =================================================== */}

          <div className="pf-new-team-actions">

            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="pf-new-team-cancel-button"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="pf-new-team-submit-button"
            >

              {loading ? (
                <>
                  <span className="pf-new-team-spinner" />
                  Création en cours...
                </>
              ) : creationMethod ===
                "temporary_password" ? (
                <>
                  🔐 Créer avec mot de passe
                </>
              ) : (
                <>
                  📩 Envoyer l'invitation
                </>
              )}

            </button>

          </div>

        </form>

      </div>


      <style jsx>{`

        /* =====================================================
           PAGE
           ===================================================== */

        .pf-new-team-page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 32px;
          color: #111827;
        }

        .pf-new-team-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }


        /* =====================================================
           HEADER
           ===================================================== */

        .pf-new-team-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .pf-new-team-breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
          color: #8a94a6;
          font-size: 13px;
        }

        .pf-new-team-breadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
        }

        .pf-new-team-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pf-new-team-title-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #eaf2ff;
          font-size: 28px;
          flex-shrink: 0;
        }

        .pf-new-team-header h1 {
          margin: 0;
          color: #111827;
          font-size: 31px;
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -0.6px;
        }

        .pf-new-team-header p {
          margin: 8px 0 0;
          color: #687386;
          font-size: 14px;
          line-height: 1.55;
        }

        .pf-new-team-back-button {
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid #dce2ea;
          border-radius: 11px;
          background: #fff;
          color: #374151;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
        }

        .pf-new-team-back-button:hover {
          background: #f8fafc;
        }


        /* =====================================================
           ALERTS
           ===================================================== */

        .pf-new-team-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
          padding: 15px 17px;
          border-radius: 13px;
        }

        .pf-new-team-alert-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .pf-new-team-alert strong {
          display: block;
          font-size: 13px;
          font-weight: 800;
        }

        .pf-new-team-alert p {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.55;
        }

        .pf-new-team-alert-error {
          border: 1px solid #fecaca;
          background: #fff7f7;
          color: #991b1b;
        }

        .pf-new-team-alert-success {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }


        /* =====================================================
           CREDENTIAL CARD
           ===================================================== */

        .pf-new-team-credential-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
          padding: 20px;
          border: 1px solid #bbf7d0;
          border-radius: 16px;
          background: #f0fdf4;
        }

        .pf-new-team-credential-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #dcfce7;
          font-size: 23px;
          flex-shrink: 0;
        }

        .pf-new-team-credential-content {
          flex: 1;
        }

        .pf-new-team-credential-label {
          display: block;
          margin-bottom: 7px;
          color: #166534;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pf-new-team-credential-content > strong {
          display: block;
          padding: 13px 15px;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          background: #fff;
          color: #14532d;
          font-family: monospace;
          font-size: 18px;
          letter-spacing: 0.04em;
          word-break: break-all;
        }

        .pf-new-team-credential-content p {
          margin: 9px 0 0;
          color: #4d7c5a;
          font-size: 12px;
          line-height: 1.55;
        }

        .pf-new-team-credential-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 13px;
        }

        .pf-new-team-copy-button,
        .pf-new-team-primary-button {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 9px;
          border: 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-new-team-copy-button {
          background: #fff;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .pf-new-team-primary-button {
          background: #2563eb;
          color: #fff;
        }


        /* =====================================================
           FORM CARDS
           ===================================================== */

        .pf-new-team-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .pf-new-team-card {
          padding: 24px;
          border: 1px solid #e4e8ee;
          border-radius: 17px;
          background: #fff;
          box-shadow:
            0 7px 24px rgba(15, 23, 42, 0.035);
        }

        .pf-new-team-card-header {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-bottom: 21px;
        }

        .pf-new-team-section-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #eef4ff;
          font-size: 19px;
          flex-shrink: 0;
        }

        .pf-new-team-card-header h2 {
          margin: 0;
          color: #202733;
          font-size: 17px;
          font-weight: 820;
        }

        .pf-new-team-card-header p {
          margin: 5px 0 0;
          color: #7b8494;
          font-size: 12px;
          line-height: 1.5;
        }

        .pf-new-team-section-heading {
          width: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .pf-new-team-permission-total {
          padding: 7px 10px;
          border-radius: 999px;
          background: #eef4ff;
          color: #2454a6;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }


        /* =====================================================
           FIELDS
           ===================================================== */

        .pf-new-team-fields {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .pf-new-team-field:last-child {
          grid-column: 1 / -1;
        }

        .pf-new-team-field label {
          display: block;
          margin-bottom: 7px;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-new-team-field label span {
          margin-left: 3px;
          color: #dc2626;
        }

        .pf-new-team-field input {
          width: 100%;
          min-height: 46px;
          padding: 0 13px;
          border: 1px solid #d9dee7;
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: #202733;
          font: inherit;
          font-size: 13px;
          box-sizing: border-box;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .pf-new-team-field input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(
              37,
              99,
              235,
              0.10
            );
        }

        .pf-new-team-field input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }


        /* =====================================================
           ROLES
           ===================================================== */

        .pf-new-team-role-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .pf-new-team-role-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 1px solid #e1e6ee;
          border-radius: 13px;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            transform 0.18s ease;
        }

        .pf-new-team-role-card:hover {
          transform: translateY(-1px);
          border-color: #b8c8e8;
          background: #fbfdff;
        }

        .pf-new-team-role-card-selected {
          border-color: #2563eb;
          background: #f5f9ff;
          box-shadow:
            0 0 0 2px rgba(
              37,
              99,
              235,
              0.07
            );
        }

        .pf-new-team-role-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #f1f5f9;
          font-size: 19px;
          flex-shrink: 0;
        }

        .pf-new-team-role-content {
          flex: 1;
        }

        .pf-new-team-role-content strong {
          display: block;
          color: #26303f;
          font-size: 13px;
          font-weight: 800;
        }

        .pf-new-team-role-content small {
          display: block;
          margin-top: 4px;
          color: #7b8494;
          font-size: 10px;
          line-height: 1.5;
        }

        .pf-new-team-radio {
          width: 21px;
          height: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ccd4df;
          border-radius: 50%;
          color: #fff;
          font-size: 11px;
          flex-shrink: 0;
        }

        .pf-new-team-radio-selected {
          border-color: #2563eb;
          background: #2563eb;
        }

        .pf-new-team-role-summary {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f8fafc;
        }

        .pf-new-team-role-summary > span {
          font-size: 18px;
        }

        .pf-new-team-role-summary strong {
          display: block;
          color: #344054;
          font-size: 11px;
        }

        .pf-new-team-role-summary p {
          margin: 3px 0 0;
          color: #7b8494;
          font-size: 10px;
        }


        /* =====================================================
           PERMISSIONS
           ===================================================== */

        .pf-new-team-permission-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 17px;
        }

        .pf-new-team-small-button {
          min-height: 37px;
          padding: 0 12px;
          border: 1px solid #dce2ea;
          border-radius: 9px;
          background: #fff;
          color: #475467;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .pf-new-team-small-button:hover {
          background: #f8fafc;
        }

        .pf-new-team-small-button-blue {
          border-color: #c8d9f8;
          background: #f4f8ff;
          color: #2454a6;
        }

        .pf-new-team-permission-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .pf-new-team-permission-group {
          overflow: hidden;
          border: 1px solid #e5e9ef;
          border-radius: 13px;
          background: #fff;
        }

        .pf-new-team-permission-group-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px;
          border-bottom: 1px solid #edf0f4;
          background: #fafbfc;
        }

        .pf-new-team-permission-group-header > span {
          font-size: 18px;
        }

        .pf-new-team-permission-group-header strong {
          display: block;
          color: #26303f;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-new-team-permission-group-header small {
          display: block;
          margin-top: 3px;
          color: #8a94a6;
          font-size: 9px;
          line-height: 1.4;
        }

        .pf-new-team-permission-list {
          padding: 5px;
        }

        .pf-new-team-permission-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px;
          border-radius: 8px;
          cursor: pointer;
        }

        .pf-new-team-permission-item:hover {
          background: #f8fafc;
        }

        .pf-new-team-permission-item-enabled {
          background: #f5f9ff;
        }

        .pf-new-team-permission-item input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .pf-new-team-checkbox {
          width: 19px;
          height: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          color: #fff;
          background: #fff;
          font-size: 11px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .pf-new-team-permission-item-enabled
          .pf-new-team-checkbox {
          border-color: #2563eb;
          background: #2563eb;
        }

        .pf-new-team-permission-text {
          min-width: 0;
        }

        .pf-new-team-permission-text strong {
          display: block;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-new-team-permission-text small {
          display: block;
          margin-top: 2px;
          color: #8a94a6;
          font-size: 9px;
          line-height: 1.4;
        }


        /* =====================================================
           ACCESS METHOD
           ===================================================== */

        .pf-new-team-access-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .pf-new-team-access-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 17px;
          border: 1px solid #dfe4eb;
          border-radius: 14px;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .pf-new-team-access-card:hover {
          border-color: #bdc9da;
          background: #fbfdff;
        }

        .pf-new-team-access-selected {
          border-color: #2563eb;
          background: #f5f9ff;
          box-shadow:
            0 0 0 2px rgba(
              37,
              99,
              235,
              0.07
            );
        }

        .pf-new-team-access-icon {
          width: 43px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #eef4ff;
          font-size: 20px;
          flex-shrink: 0;
        }

        .pf-new-team-access-card strong {
          display: block;
          color: #26303f;
          font-size: 13px;
          font-weight: 800;
        }

        .pf-new-team-access-card p {
          margin: 5px 0 0;
          color: #697586;
          font-size: 10px;
          line-height: 1.55;
        }

        .pf-new-team-access-card span {
          display: block;
          margin-top: 7px;
          color: #2563eb;
          font-size: 9px;
          line-height: 1.4;
          font-weight: 700;
        }

        .pf-new-team-access-check {
          width: 21px;
          height: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 50%;
          color: #fff;
          background: #fff;
          font-size: 11px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .pf-new-team-access-selected
          .pf-new-team-access-check {
          border-color: #2563eb;
          background: #2563eb;
        }


        /* =====================================================
           PASSWORD
           ===================================================== */

        .pf-new-team-password-panel {
          margin-top: 17px;
          padding: 17px;
          border: 1px solid #dbe8ff;
          border-radius: 13px;
          background: #f7faff;
        }

        .pf-new-team-password-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 13px;
        }

        .pf-new-team-password-header strong {
          display: block;
          color: #1f3b68;
          font-size: 13px;
          font-weight: 850;
        }

        .pf-new-team-password-header p {
          margin: 4px 0 0;
          color: #667085;
          font-size: 10px;
        }

        .pf-new-team-secure-badge {
          padding: 6px 9px;
          border-radius: 999px;
          background: #ecfdf3;
          color: #15803d;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .pf-new-team-password-box {
          display: flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid #cfd8e6;
          border-radius: 10px;
          background: #fff;
        }

        .pf-new-team-password-box input {
          flex: 1;
          min-width: 0;
          height: 48px;
          padding: 0 13px;
          border: 0;
          outline: none;
          background: transparent;
          color: #172033;
          font-family: monospace;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .pf-new-team-password-box button {
          min-height: 48px;
          padding: 0 13px;
          border: 0;
          border-left: 1px solid #e5e9ef;
          background: #f8fafc;
          color: #475467;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .pf-new-team-password-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .pf-new-team-password-action {
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid #d7e0ed;
          border-radius: 8px;
          background: #fff;
          color: #475467;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
        }

        .pf-new-team-password-action:hover {
          background: #f8fafc;
        }

        .pf-new-team-password-warning {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 13px;
          padding: 11px 12px;
          border: 1px solid #fed7aa;
          border-radius: 9px;
          background: #fff7ed;
        }

        .pf-new-team-password-warning > span {
          font-size: 16px;
        }

        .pf-new-team-password-warning strong {
          display: block;
          color: #9a3412;
          font-size: 10px;
          font-weight: 850;
        }

        .pf-new-team-password-warning p {
          margin: 3px 0 0;
          color: #9a3412;
          font-size: 9px;
          line-height: 1.5;
        }


        /* =====================================================
           SUMMARY
           ===================================================== */

        .pf-new-team-summary {
          padding: 18px;
          border: 1px solid #dbe8ff;
          border-radius: 14px;
          background: #f5f9ff;
        }

        .pf-new-team-summary-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .pf-new-team-summary-header strong {
          display: block;
          color: #1f3b68;
          font-size: 13px;
          font-weight: 850;
        }

        .pf-new-team-summary-header p {
          margin: 4px 0 0;
          color: #687386;
          font-size: 10px;
        }

        .pf-new-team-summary-header > span {
          padding: 7px 10px;
          border-radius: 999px;
          background: #fff;
          color: #2454a6;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .pf-new-team-summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .pf-new-team-summary-grid > div {
          min-width: 0;
          padding: 11px;
          border: 1px solid #dce7f7;
          border-radius: 9px;
          background: #fff;
        }

        .pf-new-team-summary-grid small {
          display: block;
          color: #8a94a6;
          font-size: 9px;
        }

        .pf-new-team-summary-grid strong {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }


        /* =====================================================
           ACTIONS
           ===================================================== */

        .pf-new-team-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 3px 0 25px;
        }

        .pf-new-team-cancel-button,
        .pf-new-team-submit-button {
          min-height: 47px;
          padding: 0 19px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .pf-new-team-cancel-button {
          border: 1px solid #dce2ea;
          background: #fff;
          color: #475467;
        }

        .pf-new-team-submit-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 210px;
          border: 0;
          background: #2563eb;
          color: #fff;
          box-shadow:
            0 8px 20px rgba(
              37,
              99,
              235,
              0.18
            );
        }

        .pf-new-team-submit-button:hover {
          background: #1d4ed8;
        }

        .pf-new-team-submit-button:disabled,
        .pf-new-team-cancel-button:disabled,
        .pf-new-team-back-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pf-new-team-spinner {
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
            pf-new-team-spin
            0.7s linear infinite;
        }

        @keyframes pf-new-team-spin {
          to {
            transform: rotate(360deg);
          }
        }


        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 900px) {

          .pf-new-team-fields {
            grid-template-columns: 1fr;
          }

          .pf-new-team-field:last-child {
            grid-column: auto;
          }

          .pf-new-team-role-grid,
          .pf-new-team-permission-grid,
          .pf-new-team-access-grid {
            grid-template-columns: 1fr;
          }

          .pf-new-team-summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .pf-new-team-header {
            flex-direction: column;
          }

          .pf-new-team-back-button {
            width: 100%;
          }

        }


        @media (max-width: 650px) {

          .pf-new-team-page {
            padding: 18px 13px;
          }

          .pf-new-team-header h1 {
            font-size: 25px;
          }

          .pf-new-team-title-row {
            align-items: flex-start;
          }

          .pf-new-team-title-icon {
            width: 50px;
            height: 50px;
            font-size: 23px;
          }

          .pf-new-team-card {
            padding: 17px;
            border-radius: 14px;
          }

          .pf-new-team-card-header {
            margin-bottom: 17px;
          }

          .pf-new-team-summary-grid {
            grid-template-columns: 1fr;
          }

          .pf-new-team-summary-header {
            flex-direction: column;
          }

          .pf-new-team-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }

          .pf-new-team-cancel-button,
          .pf-new-team-submit-button {
            width: 100%;
          }

          .pf-new-team-credential-card {
            flex-direction: column;
          }

          .pf-new-team-credential-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .pf-new-team-copy-button,
          .pf-new-team-primary-button {
            width: 100%;
          }

          .pf-new-team-password-header {
            flex-direction: column;
          }

          .pf-new-team-password-box {
            align-items: stretch;
          }

          .pf-new-team-password-box input {
            font-size: 12px;
          }

        }

      `}</style>

    </main>
  );
}