"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createBrowserClient,
} from "@supabase/ssr";

type SettingsTab =
  | "general"
  | "security"
  | "appearance"
  | "notifications"
  | "platform";

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

function createClient(): SupabaseBrowserClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Configuration Supabase manquante.",
    );
  }

  return createBrowserClient(
    url,
    key,
  );
}

export default function SuperAdminSettingsClient() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [activeTab, setActiveTab] =
    useState<SettingsTab>("general");

  const [email, setEmail] =
    useState("");

  const [newEmail, setNewEmail] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loadingAccount, setLoadingAccount] =
    useState(true);

  const [savingEmail, setSavingEmail] =
    useState(false);

  const [savingPassword, setSavingPassword] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [darkMode, setDarkMode] =
    useState(false);

  const [compactMode, setCompactMode] =
    useState(false);

  const [animations, setAnimations] =
    useState(true);

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [securityNotifications, setSecurityNotifications] =
    useState(true);

  const [ticketNotifications, setTicketNotifications] =
    useState(true);

  const [paymentNotifications, setPaymentNotifications] =
    useState(true);

  /* =========================================================
     CHARGEMENT COMPTE
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      try {
        const {
          data,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!mounted) {
          return;
        }

        const currentEmail =
          data.user?.email ?? "";

        setEmail(currentEmail);
        setNewEmail(currentEmail);

      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les informations du compte.",
        );
      } finally {
        if (mounted) {
          setLoadingAccount(false);
        }
      }
    }

    loadAccount();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* =========================================================
     CHARGEMENT PRÉFÉRENCES
  ========================================================= */

  useEffect(() => {
    try {
      const storedDarkMode =
        localStorage.getItem(
          "pharmaflow.superadmin.darkMode",
        );

      const storedCompactMode =
        localStorage.getItem(
          "pharmaflow.superadmin.compactMode",
        );

      const storedAnimations =
        localStorage.getItem(
          "pharmaflow.superadmin.animations",
        );

      const storedEmailNotifications =
        localStorage.getItem(
          "pharmaflow.superadmin.emailNotifications",
        );

      const storedSecurityNotifications =
        localStorage.getItem(
          "pharmaflow.superadmin.securityNotifications",
        );

      const storedTicketNotifications =
        localStorage.getItem(
          "pharmaflow.superadmin.ticketNotifications",
        );

      const storedPaymentNotifications =
        localStorage.getItem(
          "pharmaflow.superadmin.paymentNotifications",
        );

      if (storedDarkMode !== null) {
        setDarkMode(
          storedDarkMode === "true",
        );
      }

      if (storedCompactMode !== null) {
        setCompactMode(
          storedCompactMode === "true",
        );
      }

      if (storedAnimations !== null) {
        setAnimations(
          storedAnimations === "true",
        );
      }

      if (storedEmailNotifications !== null) {
        setEmailNotifications(
          storedEmailNotifications === "true",
        );
      }

      if (storedSecurityNotifications !== null) {
        setSecurityNotifications(
          storedSecurityNotifications === "true",
        );
      }

      if (storedTicketNotifications !== null) {
        setTicketNotifications(
          storedTicketNotifications === "true",
        );
      }

      if (storedPaymentNotifications !== null) {
        setPaymentNotifications(
          storedPaymentNotifications === "true",
        );
      }

    } catch {
      // Le navigateur peut bloquer localStorage.
    }
  }, []);

  /* =========================================================
     HELPERS
  ========================================================= */

  function savePreference(
    key: string,
    value: boolean,
  ) {
    try {
      localStorage.setItem(
        key,
        String(value),
      );
    } catch {
      // Rien à faire si localStorage est indisponible.
    }
  }

  function clearMessages() {
    setMessage("");
    setError("");
  }

  function toggleDarkMode(
    value: boolean,
  ) {
    setDarkMode(value);

    savePreference(
      "pharmaflow.superadmin.darkMode",
      value,
    );
  }

  function toggleCompactMode(
    value: boolean,
  ) {
    setCompactMode(value);

    savePreference(
      "pharmaflow.superadmin.compactMode",
      value,
    );
  }

  function toggleAnimations(
    value: boolean,
  ) {
    setAnimations(value);

    savePreference(
      "pharmaflow.superadmin.animations",
      value,
    );
  }

  function toggleEmailNotifications(
    value: boolean,
  ) {
    setEmailNotifications(value);

    savePreference(
      "pharmaflow.superadmin.emailNotifications",
      value,
    );
  }

  function toggleSecurityNotifications(
    value: boolean,
  ) {
    setSecurityNotifications(value);

    savePreference(
      "pharmaflow.superadmin.securityNotifications",
      value,
    );
  }

  function toggleTicketNotifications(
    value: boolean,
  ) {
    setTicketNotifications(value);

    savePreference(
      "pharmaflow.superadmin.ticketNotifications",
      value,
    );
  }

  function togglePaymentNotifications(
    value: boolean,
  ) {
    setPaymentNotifications(value);

    savePreference(
      "pharmaflow.superadmin.paymentNotifications",
      value,
    );
  }

  /* =========================================================
     MODIFICATION EMAIL
  ========================================================= */

  async function handleEmailSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    clearMessages();

    const normalizedEmail =
      newEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Veuillez saisir une adresse e-mail.",
      );
      return;
    }

    if (
      !normalizedEmail.includes("@")
    ) {
      setError(
        "Veuillez saisir une adresse e-mail valide.",
      );
      return;
    }

    if (
      normalizedEmail ===
      email.toLowerCase()
    ) {
      setMessage(
        "Votre adresse e-mail est déjà à jour.",
      );
      return;
    }

    try {
      setSavingEmail(true);

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser({
          email: normalizedEmail,
        });

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "La demande de changement d’adresse e-mail a été enregistrée. Une confirmation peut être demandée par Supabase.",
      );

      setEmail(
        normalizedEmail,
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier l’adresse e-mail.",
      );
    } finally {
      setSavingEmail(false);
    }
  }

  /* =========================================================
     MODIFICATION MOT DE PASSE
  ========================================================= */

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    clearMessages();

    if (
      newPassword.length < 8
    ) {
      setError(
        "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    try {
      setSavingPassword(true);

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser({
          password:
            newPassword,
        });

      if (updateError) {
        throw updateError;
      }

      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "Votre mot de passe a été modifié avec succès.",
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le mot de passe.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  /* =========================================================
     TABS
  ========================================================= */

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: string;
    description: string;
  }[] = [
    {
      id: "general",
      label: "Compte",
      icon: "👤",
      description:
        "Informations du compte administrateur",
    },
    {
      id: "security",
      label: "Sécurité",
      icon: "🔐",
      description:
        "Mot de passe et sécurité du compte",
    },
    {
      id: "appearance",
      label: "Apparence",
      icon: "🎨",
      description:
        "Personnalisation de l’interface",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "🔔",
      description:
        "Préférences de notification",
    },
    {
      id: "platform",
      label: "Plateforme",
      icon: "⚙️",
      description:
        "Administration et configuration",
    },
  ];

  return (
    <div className="pf-sa-settings-layout">

      {/* =====================================================
          SIDEBAR SETTINGS
      ===================================================== */}

      <aside className="pf-sa-settings-sidebar">

        <div className="pf-sa-settings-sidebar-header">
          <span className="pf-sa-settings-sidebar-icon">
            ⚙️
          </span>

          <div>
            <strong>
              Paramètres
            </strong>

            <span>
              Super Admin
            </span>
          </div>
        </div>

        <nav className="pf-sa-settings-nav">

          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={
                activeTab === tab.id
                  ? "pf-sa-settings-nav-item active"
                  : "pf-sa-settings-nav-item"
              }
              onClick={() => {
                clearMessages();
                setActiveTab(tab.id);
              }}
            >
              <span className="pf-sa-settings-nav-icon">
                {tab.icon}
              </span>

              <span className="pf-sa-settings-nav-content">
                <strong>
                  {tab.label}
                </strong>

                <small>
                  {tab.description}
                </small>
              </span>

              <span className="pf-sa-settings-nav-arrow">
                ›
              </span>
            </button>
          ))}

        </nav>

        <div className="pf-sa-settings-sidebar-footer">

          <div className="pf-sa-settings-security-badge">
            <span>🛡️</span>

            <div>
              <strong>
                Espace protégé
              </strong>

              <small>
                Accès réservé au Super Admin
              </small>
            </div>
          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN SETTINGS
      ===================================================== */}

      <section className="pf-sa-settings-main">

        {/* GLOBAL MESSAGE */}

        {message && (
          <div className="pf-sa-settings-alert success">
            <span>✓</span>
            <div>
              <strong>
                Opération réussie
              </strong>
              <p>
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="pf-sa-settings-alert error">
            <span>!</span>
            <div>
              <strong>
                Une erreur est survenue
              </strong>
              <p>
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            COMPTE
        =================================================== */}

        {activeTab === "general" && (
          <div className="pf-sa-settings-content">

            <SettingsSectionHeader
              icon="👤"
              title="Compte administrateur"
              description="Gérez les informations d’authentification de votre compte Super Admin."
            />

            <div className="pf-sa-settings-card">

              <div className="pf-sa-profile-card">

                <div className="pf-sa-profile-avatar">
                  SA
                </div>

                <div className="pf-sa-profile-info">

                  <strong>
                    Super Administrateur
                  </strong>

                  <span>
                    Accès complet à la plateforme PharmaFlow
                  </span>

                  {!loadingAccount && (
                    <small>
                      {email || "Adresse e-mail non disponible"}
                    </small>
                  )}

                </div>

                <div className="pf-sa-profile-status">
                  <span className="pf-sa-status-dot" />
                  Compte actif
                </div>

              </div>

            </div>

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">
                <div>
                  <h3>
                    Adresse e-mail
                  </h3>

                  <p>
                    Cette adresse est utilisée pour l’authentification et les communications liées à votre compte.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  ✉️
                </span>
              </div>

              <form
                onSubmit={handleEmailSubmit}
                className="pf-sa-settings-form"
              >

                <div className="pf-sa-form-group">

                  <label>
                    Adresse e-mail actuelle
                  </label>

                  <input
                    type="email"
                    value={
                      loadingAccount
                        ? ""
                        : email
                    }
                    readOnly
                    placeholder="Chargement..."
                  />

                </div>

                <div className="pf-sa-form-group">

                  <label>
                    Nouvelle adresse e-mail
                  </label>

                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) =>
                      setNewEmail(
                        event.target.value,
                      )
                    }
                    placeholder="nouvelle-adresse@exemple.com"
                    autoComplete="email"
                  />

                  <small>
                    Une confirmation peut être nécessaire après modification.
                  </small>

                </div>

                <div className="pf-sa-form-actions">

                  <button
                    type="submit"
                    className="pf-sa-settings-submit"
                    disabled={
                      savingEmail ||
                      loadingAccount
                    }
                  >
                    {savingEmail
                      ? "Enregistrement..."
                      : "Enregistrer l’e-mail"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

        {/* ===================================================
            SECURITE
        =================================================== */}

        {activeTab === "security" && (
          <div className="pf-sa-settings-content">

            <SettingsSectionHeader
              icon="🔐"
              title="Sécurité du compte"
              description="Renforcez la sécurité de votre accès Super Administrateur."
            />

            <div className="pf-sa-security-banner">

              <div className="pf-sa-security-banner-icon">
                🛡️
              </div>

              <div>
                <strong>
                  Compte Super Admin hautement privilégié
                </strong>

                <p>
                  Conservez un mot de passe unique et robuste.
                  Ne partagez jamais vos identifiants.
                </p>
              </div>

            </div>

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">

                <div>
                  <h3>
                    Modifier le mot de passe
                  </h3>

                  <p>
                    Utilisez au minimum 8 caractères.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  🔑
                </span>

              </div>

              <form
                onSubmit={
                  handlePasswordSubmit
                }
                className="pf-sa-settings-form"
              >

                <div className="pf-sa-form-group">

                  <label>
                    Nouveau mot de passe
                  </label>

                  <div className="pf-sa-password-field">

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        newPassword
                      }
                      onChange={(event) =>
                        setNewPassword(
                          event.target.value,
                        )
                      }
                      placeholder="Minimum 8 caractères"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value,
                        )
                      }
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

                <div className="pf-sa-form-group">

                  <label>
                    Confirmer le mot de passe
                  </label>

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Répétez le nouveau mot de passe"
                    autoComplete="new-password"
                  />

                </div>

                <div className="pf-sa-password-rules">

                  <div>
                    <span
                      className={
                        newPassword.length >= 8
                          ? "valid"
                          : ""
                      }
                    >
                      ✓
                    </span>

                    Au moins 8 caractères
                  </div>

                  <div>
                    <span
                      className={
                        newPassword ===
                          confirmPassword &&
                        confirmPassword.length > 0
                          ? "valid"
                          : ""
                      }
                    >
                      ✓
                    </span>

                    Les deux mots de passe correspondent
                  </div>

                </div>

                <div className="pf-sa-form-actions">

                  <button
                    type="submit"
                    className="pf-sa-settings-submit"
                    disabled={
                      savingPassword
                    }
                  >
                    {savingPassword
                      ? "Modification..."
                      : "Modifier le mot de passe"}
                  </button>

                </div>

              </form>

            </div>

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">

                <div>
                  <h3>
                    Bonnes pratiques de sécurité
                  </h3>

                  <p>
                    Recommandations pour protéger votre espace d’administration.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  🔒
                </span>

              </div>

              <div className="pf-sa-security-list">

                <SecurityItem
                  icon="🔑"
                  title="Mot de passe unique"
                  description="N’utilisez pas le même mot de passe sur plusieurs services."
                />

                <SecurityItem
                  icon="🚫"
                  title="Ne partagez jamais votre accès"
                  description="Un compte Super Admin doit rester strictement personnel."
                />

                <SecurityItem
                  icon="🛡️"
                  title="Surveillez le journal d’audit"
                  description="Consultez régulièrement les activités importantes de la plateforme."
                />

                <SecurityItem
                  icon="💻"
                  title="Déconnectez les appareils publics"
                  description="Évitez de rester connecté sur un ordinateur partagé."
                />

              </div>

            </div>

          </div>
        )}

        {/* ===================================================
            APPARENCE
        =================================================== */}

        {activeTab === "appearance" && (
          <div className="pf-sa-settings-content">

            <SettingsSectionHeader
              icon="🎨"
              title="Apparence"
              description="Personnalisez l’affichage de votre espace Super Admin."
            />

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">

                <div>
                  <h3>
                    Préférences d’affichage
                  </h3>

                  <p>
                    Ces préférences sont enregistrées sur cet appareil.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  🖥️
                </span>

              </div>

              <SettingsToggle
                icon="🌙"
                title="Mode sombre"
                description="Utiliser une interface sombre lorsque cette option est activée."
                checked={darkMode}
                onChange={toggleDarkMode}
              />

              <SettingsToggle
                icon="📐"
                title="Interface compacte"
                description="Réduire les espacements pour afficher davantage d’informations."
                checked={compactMode}
                onChange={toggleCompactMode}
              />

              <SettingsToggle
                icon="✨"
                title="Animations"
                description="Activer les transitions et animations de l’interface."
                checked={animations}
                onChange={toggleAnimations}
              />

            </div>

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">

                <div>
                  <h3>
                    Identité PharmaFlow
                  </h3>

                  <p>
                    Informations visuelles de référence de la plateforme.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  🏥
                </span>

              </div>

              <div className="pf-sa-brand-preview">

                <div className="pf-sa-brand-logo">
                  PF
                </div>

                <div>
                  <strong>
                    PharmaFlow
                  </strong>

                  <span>
                    Plateforme de gestion pharmaceutique
                  </span>
                </div>

              </div>

              <div className="pf-sa-info-note">
                <span>ℹ️</span>

                <p>
                  La modification du logo, des couleurs globales
                  et de l’identité publique doit rester centralisée
                  dans la section <strong>Site</strong> afin de ne
                  pas modifier accidentellement l’interface
                  d’administration.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* ===================================================
            NOTIFICATIONS
        =================================================== */}

        {activeTab === "notifications" && (
          <div className="pf-sa-settings-content">

            <SettingsSectionHeader
              icon="🔔"
              title="Notifications"
              description="Choisissez les événements que vous souhaitez recevoir sur cet appareil."
            />

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">

                <div>
                  <h3>
                    Alertes Super Admin
                  </h3>

                  <p>
                    Ces préférences sont enregistrées sur cet appareil.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  🔔
                </span>

              </div>

              <SettingsToggle
                icon="✉️"
                title="Notifications générales"
                description="Recevoir les informations générales liées à l’administration."
                checked={
                  emailNotifications
                }
                onChange={
                  toggleEmailNotifications
                }
              />

              <SettingsToggle
                icon="🛡️"
                title="Alertes de sécurité"
                description="Être informé des événements importants liés à la sécurité."
                checked={
                  securityNotifications
                }
                onChange={
                  toggleSecurityNotifications
                }
              />

              <SettingsToggle
                icon="🎫"
                title="Tickets support"
                description="Recevoir les alertes concernant les tickets et demandes clients."
                checked={
                  ticketNotifications
                }
                onChange={
                  toggleTicketNotifications
                }
              />

              <SettingsToggle
                icon="💳"
                title="Paiements"
                description="Recevoir les alertes relatives aux paiements et transactions."
                checked={
                  paymentNotifications
                }
                onChange={
                  togglePaymentNotifications
                }
              />

            </div>

          </div>
        )}

        {/* ===================================================
            PLATEFORME
        =================================================== */}

        {activeTab === "platform" && (
          <div className="pf-sa-settings-content">

            <SettingsSectionHeader
              icon="⚙️"
              title="Administration de la plateforme"
              description="Accédez rapidement aux principaux modules de contrôle de PharmaFlow."
            />

            <div className="pf-sa-platform-grid">

              <PlatformLink
                href="/super-admin"
                icon="📊"
                title="Tableau de bord"
                description="Vue globale de la plateforme."
              />

              <PlatformLink
                href="/super-admin/equipe"
                icon="👥"
                title="Équipe PharmaFlow"
                description="Agents, rôles et permissions."
              />

              <PlatformLink
                href="/super-admin/audit"
                icon="🛡️"
                title="Journal d’audit"
                description="Activités administratives et supervision."
              />

              <PlatformLink
                href="/super-admin/site"
                icon="🌐"
                title="Gestion du site"
                description="Administration du site public PharmaFlow."
              />

              <PlatformLink
                href="/agent/abonnements"
                icon="📋"
                title="Abonnements"
                description="Plans, essais et abonnements."
              />

              <PlatformLink
                href="/agent/paiements"
                icon="💰"
                title="Paiements"
                description="Transactions et opérations financières."
              />

              <PlatformLink
                href="/agent/support"
                icon="🎧"
                title="Support"
                description="Tickets, réclamations et dossiers."
              />

              <PlatformLink
                href="https://pharmaflow.africa"
                icon="🏥"
                title="Site public"
                description="Ouvrir le site public PharmaFlow."
                external
              />

            </div>

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">

                <div>
                  <h3>
                    Architecture de sécurité
                  </h3>

                  <p>
                    Informations sur la protection de l’espace Super Admin.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  🔐
                </span>

              </div>

              <div className="pf-sa-security-status-grid">

                <StatusBox
                  label="Authentification"
                  value="Supabase Auth"
                  status="Protégé"
                />

                <StatusBox
                  label="Autorisation"
                  value="platform_admins"
                  status="Activée"
                />

                <StatusBox
                  label="Espace"
                  value="Super Admin"
                  status="Privé"
                />

                <StatusBox
                  label="Audit"
                  value="Journal plateforme"
                  status="Disponible"
                />

              </div>

            </div>

            <div className="pf-sa-settings-card">

              <div className="pf-sa-card-header">

                <div>
                  <h3>
                    Informations système
                  </h3>

                  <p>
                    Informations générales sur cette interface.
                  </p>
                </div>

                <span className="pf-sa-card-icon">
                  ℹ️
                </span>

              </div>

              <div className="pf-sa-system-grid">

                <div>
                  <span>
                    Application
                  </span>

                  <strong>
                    PharmaFlow
                  </strong>
                </div>

                <div>
                  <span>
                    Espace
                  </span>

                  <strong>
                    Super Admin
                  </strong>
                </div>

                <div>
                  <span>
                    Authentification
                  </span>

                  <strong>
                    Supabase
                  </strong>
                </div>

                <div>
                  <span>
                    Site
                  </span>

                  <strong>
                    pharmaflow.africa
                  </strong>
                </div>

              </div>

            </div>

          </div>
        )}

      </section>

      <style>{`

        /* =========================================================
           LAYOUT
        ========================================================= */

        .pf-sa-settings-layout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        /* =========================================================
           SIDEBAR
        ========================================================= */

        .pf-sa-settings-sidebar {
          position: sticky;
          top: 20px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e5e9f0;
          border-radius: 18px;
          box-shadow:
            0 10px 35px rgba(16, 24, 40, .055);
        }

        .pf-sa-settings-sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 19px;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-sa-settings-sidebar-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #ecfdf9;
          font-size: 20px;
        }

        .pf-sa-settings-sidebar-header strong {
          display: block;
          color: #101828;
          font-size: 14px;
          font-weight: 800;
        }

        .pf-sa-settings-sidebar-header span:not(.pf-sa-settings-sidebar-icon) {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 12px;
        }

        .pf-sa-settings-nav {
          padding: 10px;
        }

        .pf-sa-settings-nav-item {
          width: 100%;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) 20px;
          align-items: center;
          gap: 9px;
          padding: 12px 10px;
          margin: 2px 0;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #475467;
          text-align: left;
          cursor: pointer;
          transition:
            background .18s ease,
            color .18s ease,
            transform .18s ease;
        }

        .pf-sa-settings-nav-item:hover {
          background: #f7fafb;
          transform: translateX(2px);
        }

        .pf-sa-settings-nav-item.active {
          background: #ecfdf9;
          color: #0f766e;
        }

        .pf-sa-settings-nav-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #f8fafc;
          font-size: 17px;
        }

        .pf-sa-settings-nav-item.active
        .pf-sa-settings-nav-icon {
          background: #ffffff;
        }

        .pf-sa-settings-nav-content {
          min-width: 0;
        }

        .pf-sa-settings-nav-content strong {
          display: block;
          font-size: 13px;
          font-weight: 800;
        }

        .pf-sa-settings-nav-content small {
          display: block;
          margin-top: 3px;
          color: #98a2b3;
          font-size: 10.5px;
          line-height: 1.35;
        }

        .pf-sa-settings-nav-item.active
        .pf-sa-settings-nav-content small {
          color: #5f918c;
        }

        .pf-sa-settings-nav-arrow {
          font-size: 18px;
          color: #98a2b3;
        }

        .pf-sa-settings-sidebar-footer {
          padding: 14px;
          border-top: 1px solid #edf0f4;
        }

        .pf-sa-settings-security-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .pf-sa-settings-security-badge > span {
          font-size: 19px;
        }

        .pf-sa-settings-security-badge strong {
          display: block;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-sa-settings-security-badge small {
          display: block;
          margin-top: 2px;
          color: #98a2b3;
          font-size: 10px;
        }

        /* =========================================================
           MAIN
        ========================================================= */

        .pf-sa-settings-main {
          min-width: 0;
        }

        .pf-sa-settings-content {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* =========================================================
           SECTION HEADER
        ========================================================= */

        .pf-sa-section-header {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-bottom: 2px;
        }

        .pf-sa-section-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #ecfdf9;
          font-size: 20px;
        }

        .pf-sa-section-header h2 {
          margin: 0;
          color: #101828;
          font-size: 20px;
          font-weight: 850;
        }

        .pf-sa-section-header p {
          margin: 5px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.55;
        }

        /* =========================================================
           ALERTS
        ========================================================= */

        .pf-sa-settings-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 13px;
          border: 1px solid;
        }

        .pf-sa-settings-alert > span {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 900;
        }

        .pf-sa-settings-alert.success {
          background: #ecfdf3;
          border-color: #b7ebce;
          color: #067647;
        }

        .pf-sa-settings-alert.success > span {
          background: #d1fadf;
        }

        .pf-sa-settings-alert.error {
          background: #fff5f5;
          border-color: #fecdca;
          color: #b42318;
        }

        .pf-sa-settings-alert.error > span {
          background: #fee4e2;
        }

        .pf-sa-settings-alert div {
          flex: 1;
        }

        .pf-sa-settings-alert strong {
          display: block;
          font-size: 12px;
          font-weight: 850;
        }

        .pf-sa-settings-alert p {
          margin: 3px 0 0;
          font-size: 12px;
          line-height: 1.5;
        }

        .pf-sa-settings-alert > button {
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 19px;
          opacity: .7;
        }

        /* =========================================================
           CARDS
        ========================================================= */

        .pf-sa-settings-card {
          background: #fff;
          border: 1px solid #e5e9f0;
          border-radius: 17px;
          padding: 21px;
          box-shadow:
            0 7px 25px rgba(16, 24, 40, .035);
        }

        .pf-sa-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding-bottom: 16px;
          margin-bottom: 16px;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-sa-card-header h3 {
          margin: 0;
          color: #101828;
          font-size: 15px;
          font-weight: 850;
        }

        .pf-sa-card-header p {
          max-width: 700px;
          margin: 5px 0 0;
          color: #667085;
          font-size: 12px;
          line-height: 1.55;
        }

        .pf-sa-card-icon {
          width: 37px;
          height: 37px;
          flex: 0 0 37px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #f8fafc;
          font-size: 18px;
        }

        /* =========================================================
           PROFILE
        ========================================================= */

        .pf-sa-profile-card {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .pf-sa-profile-avatar {
          width: 60px;
          height: 60px;
          flex: 0 0 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: linear-gradient(
            135deg,
            #0f766e,
            #14b8a6
          );
          color: #fff;
          font-size: 19px;
          font-weight: 900;
          box-shadow:
            0 10px 24px rgba(15, 118, 110, .18);
        }

        .pf-sa-profile-info {
          min-width: 0;
          flex: 1;
        }

        .pf-sa-profile-info strong {
          display: block;
          color: #101828;
          font-size: 15px;
          font-weight: 850;
        }

        .pf-sa-profile-info span {
          display: block;
          margin-top: 4px;
          color: #667085;
          font-size: 12px;
        }

        .pf-sa-profile-info small {
          display: block;
          margin-top: 6px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 700;
        }

        .pf-sa-profile-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #ecfdf3;
          color: #067647;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-sa-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #12b76a;
        }

        /* =========================================================
           FORMS
        ========================================================= */

        .pf-sa-settings-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .pf-sa-form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .pf-sa-form-group label {
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-sa-form-group input {
          width: 100%;
          height: 44px;
          padding: 0 13px;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          background: #fff;
          color: #101828;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          transition:
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .pf-sa-form-group input:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px rgba(15, 118, 110, .10);
        }

        .pf-sa-form-group input[readonly] {
          background: #f8fafc;
          color: #667085;
        }

        .pf-sa-form-group small {
          color: #98a2b3;
          font-size: 10.5px;
          line-height: 1.45;
        }

        .pf-sa-form-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 3px;
        }

        .pf-sa-settings-submit {
          min-height: 42px;
          padding: 0 17px;
          border: 0;
          border-radius: 10px;
          background: #0f766e;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          transition: background .18s ease;
        }

        .pf-sa-settings-submit:hover {
          background: #0b625b;
        }

        .pf-sa-settings-submit:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .pf-sa-password-field {
          position: relative;
        }

        .pf-sa-password-field input {
          padding-right: 48px;
        }

        .pf-sa-password-field button {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
        }

        .pf-sa-password-rules {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .pf-sa-password-rules div {
          padding: 10px;
          border-radius: 10px;
          background: #f8fafc;
          color: #667085;
          font-size: 11px;
        }

        .pf-sa-password-rules span {
          display: inline-flex;
          width: 19px;
          height: 19px;
          align-items: center;
          justify-content: center;
          margin-right: 6px;
          border-radius: 50%;
          background: #eaecf0;
          color: #98a2b3;
          font-size: 10px;
          font-weight: 900;
        }

        .pf-sa-password-rules span.valid {
          background: #d1fadf;
          color: #067647;
        }

        /* =========================================================
           SECURITY
        ========================================================= */

        .pf-sa-security-banner {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 15px;
          border: 1px solid #fedf89;
          border-radius: 14px;
          background: #fffaeb;
        }

        .pf-sa-security-banner-icon {
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #fef0c7;
          font-size: 20px;
        }

        .pf-sa-security-banner strong {
          display: block;
          color: #93370d;
          font-size: 12px;
          font-weight: 850;
        }

        .pf-sa-security-banner p {
          margin: 4px 0 0;
          color: #b54708;
          font-size: 11px;
          line-height: 1.5;
        }

        .pf-sa-security-list {
          display: flex;
          flex-direction: column;
        }

        .pf-sa-security-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-sa-security-item:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .pf-sa-security-item:first-child {
          padding-top: 0;
        }

        .pf-sa-security-item-icon {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f8fafc;
          font-size: 16px;
        }

        .pf-sa-security-item strong {
          display: block;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-sa-security-item p {
          margin: 3px 0 0;
          color: #667085;
          font-size: 11px;
          line-height: 1.5;
        }

        /* =========================================================
           TOGGLES
        ========================================================= */

        .pf-sa-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 15px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-sa-toggle:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .pf-sa-toggle:first-of-type {
          padding-top: 0;
        }

        .pf-sa-toggle-info {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .pf-sa-toggle-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #f8fafc;
          font-size: 17px;
        }

        .pf-sa-toggle-info strong {
          display: block;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-sa-toggle-info p {
          margin: 3px 0 0;
          color: #667085;
          font-size: 10.5px;
          line-height: 1.45;
        }

        .pf-sa-toggle-control {
          position: relative;
          width: 45px;
          height: 25px;
          flex: 0 0 45px;
        }

        .pf-sa-toggle-control input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .pf-sa-toggle-slider {
          position: absolute;
          inset: 0;
          cursor: pointer;
          border-radius: 999px;
          background: #d0d5dd;
          transition: .2s ease;
        }

        .pf-sa-toggle-slider::before {
          content: "";
          position: absolute;
          width: 19px;
          height: 19px;
          left: 3px;
          top: 3px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 5px rgba(16, 24, 40, .15);
          transition: .2s ease;
        }

        .pf-sa-toggle-control input:checked
        + .pf-sa-toggle-slider {
          background: #0f766e;
        }

        .pf-sa-toggle-control input:checked
        + .pf-sa-toggle-slider::before {
          transform: translateX(20px);
        }

        /* =========================================================
           BRAND
        ========================================================= */

        .pf-sa-brand-preview {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 16px;
          border-radius: 13px;
          background: #f8fafc;
          border: 1px solid #edf0f4;
        }

        .pf-sa-brand-logo {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            #0f766e,
            #14b8a6
          );
          color: #fff;
          font-size: 17px;
          font-weight: 900;
        }

        .pf-sa-brand-preview strong {
          display: block;
          color: #101828;
          font-size: 14px;
          font-weight: 850;
        }

        .pf-sa-brand-preview span {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 11px;
        }

        .pf-sa-info-note {
          display: flex;
          gap: 10px;
          margin-top: 13px;
          padding: 12px;
          border-radius: 11px;
          background: #eff8ff;
          color: #175cd3;
        }

        .pf-sa-info-note p {
          margin: 0;
          font-size: 10.5px;
          line-height: 1.55;
        }

        /* =========================================================
           PLATFORM GRID
        ========================================================= */

        .pf-sa-platform-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .pf-sa-platform-link {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          padding: 15px;
          border: 1px solid #e5e9f0;
          border-radius: 14px;
          background: #fff;
          color: inherit;
          text-decoration: none;
          transition:
            transform .18s ease,
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .pf-sa-platform-link:hover {
          transform: translateY(-2px);
          border-color: #a7deda;
          box-shadow:
            0 10px 24px rgba(16, 24, 40, .06);
        }

        .pf-sa-platform-link-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #f8fafc;
          font-size: 19px;
        }

        .pf-sa-platform-link-content {
          min-width: 0;
          flex: 1;
        }

        .pf-sa-platform-link-content strong {
          display: block;
          color: #344054;
          font-size: 12px;
          font-weight: 850;
        }

        .pf-sa-platform-link-content p {
          margin: 3px 0 0;
          color: #667085;
          font-size: 10.5px;
          line-height: 1.4;
        }

        .pf-sa-platform-link-arrow {
          color: #98a2b3;
          font-size: 19px;
        }

        /* =========================================================
           SYSTEM STATUS
        ========================================================= */

        .pf-sa-security-status-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .pf-sa-status-box {
          padding: 13px;
          border-radius: 11px;
          background: #f8fafc;
          border: 1px solid #edf0f4;
        }

        .pf-sa-status-box span {
          display: block;
          color: #98a2b3;
          font-size: 10px;
          font-weight: 700;
        }

        .pf-sa-status-box strong {
          display: block;
          margin-top: 5px;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-sa-status-box em {
          display: inline-flex;
          margin-top: 8px;
          padding: 4px 7px;
          border-radius: 999px;
          background: #ecfdf3;
          color: #067647;
          font-size: 9px;
          font-style: normal;
          font-weight: 800;
        }

        /* =========================================================
           SYSTEM INFO
        ========================================================= */

        .pf-sa-system-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pf-sa-system-grid > div {
          padding: 13px;
          border-radius: 11px;
          background: #f8fafc;
          border: 1px solid #edf0f4;
        }

        .pf-sa-system-grid span {
          display: block;
          color: #98a2b3;
          font-size: 10px;
        }

        .pf-sa-system-grid strong {
          display: block;
          margin-top: 4px;
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }

        /* =========================================================
           RESPONSIVE
        ========================================================= */

        @media (max-width: 1150px) {
          .pf-sa-settings-layout {
            grid-template-columns: 250px minmax(0, 1fr);
          }

          .pf-sa-security-status-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .pf-sa-settings-layout {
            grid-template-columns: 1fr;
          }

          .pf-sa-settings-sidebar {
            position: static;
          }

          .pf-sa-settings-nav {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px;
          }

          .pf-sa-settings-nav-item {
            grid-template-columns: 35px minmax(0, 1fr);
          }

          .pf-sa-settings-nav-arrow {
            display: none;
          }
        }

        @media (max-width: 650px) {
          .pf-sa-settings-card {
            padding: 16px;
          }

          .pf-sa-settings-nav {
            grid-template-columns: 1fr;
          }

          .pf-sa-profile-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .pf-sa-profile-status {
            margin-left: 75px;
          }

          .pf-sa-password-rules {
            grid-template-columns: 1fr;
          }

          .pf-sa-platform-grid {
            grid-template-columns: 1fr;
          }

          .pf-sa-security-status-grid {
            grid-template-columns: 1fr;
          }

          .pf-sa-system-grid {
            grid-template-columns: 1fr;
          }

          .pf-sa-form-actions {
            justify-content: stretch;
          }

          .pf-sa-settings-submit {
            width: 100%;
          }
        }

      `}</style>
    </div>
  );
}

/* =============================================================
   SECTION HEADER
============================================================= */

function SettingsSectionHeader({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="pf-sa-section-header">

      <div className="pf-sa-section-icon">
        {icon}
      </div>

      <div>
        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>
      </div>

    </div>
  );
}

/* =============================================================
   TOGGLE
============================================================= */

function SettingsToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <div className="pf-sa-toggle">

      <div className="pf-sa-toggle-info">

        <span className="pf-sa-toggle-icon">
          {icon}
        </span>

        <div>
          <strong>
            {title}
          </strong>

          <p>
            {description}
          </p>
        </div>

      </div>

      <label className="pf-sa-toggle-control">

        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(
              event.target.checked,
            )
          }
        />

        <span className="pf-sa-toggle-slider" />

      </label>

    </div>
  );
}

/* =============================================================
   SECURITY ITEM
============================================================= */

function SecurityItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="pf-sa-security-item">

      <span className="pf-sa-security-item-icon">
        {icon}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>
      </div>

    </div>
  );
}

/* =============================================================
   PLATFORM LINK
============================================================= */

function PlatformLink({
  href,
  icon,
  title,
  description,
  external = false,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className="pf-sa-platform-link"
      {...(
        external
          ? {
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {}
      )}
    >

      <span className="pf-sa-platform-link-icon">
        {icon}
      </span>

      <span className="pf-sa-platform-link-content">

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>

      </span>

      <span className="pf-sa-platform-link-arrow">
        →
      </span>

    </a>
  );
}

/* =============================================================
   STATUS BOX
============================================================= */

function StatusBox({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: string;
}) {
  return (
    <div className="pf-sa-status-box">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <em>
        {status}
      </em>

    </div>
  );
}