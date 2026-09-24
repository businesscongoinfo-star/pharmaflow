"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { createBrowserClient } from "@supabase/ssr";

type Tab =
  | "account"
  | "security"
  | "appearance"
  | "notifications"
  | "platform";

type SupabaseClientType =
  ReturnType<typeof createBrowserClient>;

function SettingToggle({
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
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="pf-setting-row">
      <div className="pf-setting-row-info">
        <div className="pf-setting-row-icon">
          {icon}
        </div>

        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>

      <label className="pf-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked)
          }
        />

        <span />
      </label>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="pf-section-title">
      <div className="pf-section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Message({
  type,
  text,
  onClose,
}: {
  type: "success" | "error";
  text: string;
  onClose: () => void;
}) {
  return (
    <div className={`pf-message ${type}`}>
      <div className="pf-message-icon">
        {type === "success" ? "✓" : "!"}
      </div>

      <div>
        <strong>
          {type === "success"
            ? "Opération réussie"
            : "Erreur"}
        </strong>

        <p>{text}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}

export default function SettingsClient() {
  const [supabase, setSupabase] =
    useState<SupabaseClientType | null>(null);

  const [configurationError, setConfigurationError] =
    useState("");

  const [tab, setTab] =
    useState<Tab>("account");

  const [email, setEmail] =
    useState("");

  const [newEmail, setNewEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [savingEmail, setSavingEmail] =
    useState(false);

  const [savingPassword, setSavingPassword] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const [darkMode, setDarkMode] =
    useState(false);

  const [compactMode, setCompactMode] =
    useState(false);

  const [animations, setAnimations] =
    useState(true);

  const [generalNotifications, setGeneralNotifications] =
    useState(true);

  const [securityNotifications, setSecurityNotifications] =
    useState(true);

  const [supportNotifications, setSupportNotifications] =
    useState(true);

  const [paymentNotifications, setPaymentNotifications] =
    useState(true);

  /* =========================================================
     INITIALISATION SUPABASE
  ========================================================= */

  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      setConfigurationError(
        "La configuration Supabase du navigateur est absente. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
      setLoading(false);
      return;
    }

    try {
      const client =
        createBrowserClient(url, key);

      setSupabase(client);
    } catch {
      setConfigurationError(
        "Impossible d'initialiser le client Supabase."
      );

      setLoading(false);
    }
  }, []);

  /* =========================================================
     CHARGEMENT UTILISATEUR
  ========================================================= */

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    async function loadUser() {
      try {
        const {
          data,
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!active) {
          return;
        }

        const currentEmail =
          data.user?.email ?? "";

        setEmail(currentEmail);
        setNewEmail(currentEmail);

      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de récupérer votre compte."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [supabase]);

  /* =========================================================
     PRÉFÉRENCES LOCALES
  ========================================================= */

  useEffect(() => {
    try {
      setDarkMode(
        localStorage.getItem(
          "pf_superadmin_dark_mode"
        ) === "true"
      );

      setCompactMode(
        localStorage.getItem(
          "pf_superadmin_compact_mode"
        ) === "true"
      );

      const animationValue =
        localStorage.getItem(
          "pf_superadmin_animations"
        );

      if (animationValue !== null) {
        setAnimations(
          animationValue === "true"
        );
      }

      const general =
        localStorage.getItem(
          "pf_superadmin_notifications_general"
        );

      const security =
        localStorage.getItem(
          "pf_superadmin_notifications_security"
        );

      const support =
        localStorage.getItem(
          "pf_superadmin_notifications_support"
        );

      const payment =
        localStorage.getItem(
          "pf_superadmin_notifications_payment"
        );

      if (general !== null) {
        setGeneralNotifications(
          general === "true"
        );
      }

      if (security !== null) {
        setSecurityNotifications(
          security === "true"
        );
      }

      if (support !== null) {
        setSupportNotifications(
          support === "true"
        );
      }

      if (payment !== null) {
        setPaymentNotifications(
          payment === "true"
        );
      }

    } catch {
      // localStorage peut être indisponible.
    }
  }, []);

  function saveLocal(
    key: string,
    value: boolean
  ) {
    try {
      localStorage.setItem(
        key,
        String(value)
      );
    } catch {
      // Rien à faire.
    }
  }

  function clearMessages() {
    setSuccess("");
    setError("");
  }

  /* =========================================================
     EMAIL
  ========================================================= */

  async function changeEmail(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessages();

    if (!supabase) {
      setError(
        "Supabase n'est pas encore initialisé."
      );
      return;
    }

    const value =
      newEmail.trim().toLowerCase();

    if (!value) {
      setError(
        "Veuillez saisir une adresse e-mail."
      );
      return;
    }

    if (!value.includes("@")) {
      setError(
        "Veuillez saisir une adresse e-mail valide."
      );
      return;
    }

    if (
      value === email.trim().toLowerCase()
    ) {
      setSuccess(
        "Votre adresse e-mail est déjà à jour."
      );
      return;
    }

    try {
      setSavingEmail(true);

      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        email: value,
      });

      if (updateError) {
        throw updateError;
      }

      setEmail(value);

      setSuccess(
        "La demande de changement d’adresse e-mail a été enregistrée. Selon la configuration Supabase, une confirmation peut être demandée."
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier l’adresse e-mail."
      );
    } finally {
      setSavingEmail(false);
    }
  }

  /* =========================================================
     PASSWORD
  ========================================================= */

  async function changePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessages();

    if (!supabase) {
      setError(
        "Supabase n'est pas encore initialisé."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Les deux mots de passe ne correspondent pas."
      );
      return;
    }

    try {
      setSavingPassword(true);

      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setPassword("");
      setConfirmPassword("");

      setSuccess(
        "Votre mot de passe a été modifié avec succès."
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le mot de passe."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  /* =========================================================
     TABS
  ========================================================= */

  const tabs: {
    id: Tab;
    label: string;
    icon: string;
  }[] = [
    {
      id: "account",
      label: "Compte",
      icon: "👤",
    },
    {
      id: "security",
      label: "Sécurité",
      icon: "🔐",
    },
    {
      id: "appearance",
      label: "Apparence",
      icon: "🎨",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "🔔",
    },
    {
      id: "platform",
      label: "Plateforme",
      icon: "⚙️",
    },
  ];

  if (configurationError) {
    return (
      <div className="pf-settings-error">
        <div>⚠️</div>

        <h2>
          Configuration indisponible
        </h2>

        <p>
          {configurationError}
        </p>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
        >
          Recharger
        </button>

        <style>{`
          .pf-settings-error {
            max-width: 700px;
            margin: 40px auto;
            padding: 35px;
            text-align: center;
            background: #fff;
            border: 1px solid #e5e9f0;
            border-radius: 18px;
          }

          .pf-settings-error > div {
            font-size: 38px;
          }

          .pf-settings-error h2 {
            margin: 12px 0 6px;
            color: #101828;
          }

          .pf-settings-error p {
            margin: 0;
            color: #667085;
            line-height: 1.6;
          }

          .pf-settings-error button {
            margin-top: 20px;
            min-height: 42px;
            padding: 0 18px;
            border: 0;
            border-radius: 10px;
            background: #0f766e;
            color: #fff;
            cursor: pointer;
            font-weight: 800;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pf-settings-layout">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="pf-settings-sidebar">

        <div className="pf-settings-sidebar-head">
          <div>⚙️</div>

          <span>
            Paramètres
            <small>
              Super Administrateur
            </small>
          </span>
        </div>

        <nav>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                tab === item.id
                  ? "active"
                  : ""
              }
              onClick={() => {
                clearMessages();
                setTab(item.id);
              }}
            >
              <span>
                {item.icon}
              </span>

              <strong>
                {item.label}
              </strong>

              <em>›</em>
            </button>
          ))}
        </nav>

        <div className="pf-settings-protected">
          🛡️
          <div>
            <strong>
              Espace protégé
            </strong>

            <small>
              Accès Super Admin uniquement
            </small>
          </div>
        </div>

      </aside>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="pf-settings-content">

        {success && (
          <Message
            type="success"
            text={success}
            onClose={() =>
              setSuccess("")
            }
          />
        )}

        {error && (
          <Message
            type="error"
            text={error}
            onClose={() =>
              setError("")
            }
          />
        )}

        {/* ===================================================
            ACCOUNT
        =================================================== */}

        {tab === "account" && (
          <>
            <SectionTitle
              icon="👤"
              title="Compte administrateur"
              description="Gérez les informations de connexion de votre compte Super Admin."
            />

            <div className="pf-settings-card">

              <div className="pf-profile">
                <div className="pf-avatar">
                  SA
                </div>

                <div>
                  <strong>
                    Super Administrateur
                  </strong>

                  <span>
                    Accès de supervision PharmaFlow
                  </span>

                  <small>
                    {loading
                      ? "Chargement..."
                      : email ||
                        "E-mail indisponible"}
                  </small>
                </div>

                <label>
                  <i />
                  Actif
                </label>
              </div>

            </div>

            <div className="pf-settings-card">

              <div className="pf-card-title">
                <div>
                  <h3>
                    Adresse e-mail
                  </h3>

                  <p>
                    Adresse utilisée pour votre authentification.
                  </p>
                </div>

                <span>
                  ✉️
                </span>
              </div>

              <form
                onSubmit={changeEmail}
                className="pf-form"
              >

                <label>
                  Adresse actuelle
                  <input
                    type="email"
                    value={email}
                    readOnly
                    placeholder="Chargement..."
                  />
                </label>

                <label>
                  Nouvelle adresse
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) =>
                      setNewEmail(
                        event.target.value
                      )
                    }
                    autoComplete="email"
                    placeholder="nouvelle-adresse@exemple.com"
                  />
                </label>

                <div className="pf-form-actions">
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      savingEmail
                    }
                  >
                    {savingEmail
                      ? "Enregistrement..."
                      : "Enregistrer"}
                  </button>
                </div>

              </form>

            </div>
          </>
        )}

        {/* ===================================================
            SECURITY
        =================================================== */}

        {tab === "security" && (
          <>
            <SectionTitle
              icon="🔐"
              title="Sécurité"
              description="Protégez votre compte Super Administrateur."
            />

            <div className="pf-security-banner">
              🛡️

              <div>
                <strong>
                  Compte à privilèges élevés
                </strong>

                <p>
                  Utilisez un mot de passe unique et
                  ne partagez jamais vos identifiants.
                </p>
              </div>
            </div>

            <div className="pf-settings-card">

              <div className="pf-card-title">
                <div>
                  <h3>
                    Modifier le mot de passe
                  </h3>

                  <p>
                    Minimum recommandé : 8 caractères.
                  </p>
                </div>

                <span>
                  🔑
                </span>
              </div>

              <form
                onSubmit={changePassword}
                className="pf-form"
              >

                <label>
                  Nouveau mot de passe

                  <div className="pf-password">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      autoComplete="new-password"
                      placeholder="Minimum 8 caractères"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      aria-label="Afficher ou masquer"
                    >
                      {showPassword
                        ? "🙈"
                        : "👁️"}
                    </button>
                  </div>
                </label>

                <label>
                  Confirmer le mot de passe

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
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Répétez le mot de passe"
                  />
                </label>

                <div className="pf-password-checks">

                  <span
                    className={
                      password.length >= 8
                        ? "valid"
                        : ""
                    }
                  >
                    ✓ Minimum 8 caractères
                  </span>

                  <span
                    className={
                      password.length > 0 &&
                      password ===
                        confirmPassword
                        ? "valid"
                        : ""
                    }
                  >
                    ✓ Mots de passe identiques
                  </span>

                </div>

                <div className="pf-form-actions">
                  <button
                    type="submit"
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

            <div className="pf-settings-card">

              <div className="pf-card-title">
                <div>
                  <h3>
                    Recommandations
                  </h3>

                  <p>
                    Mesures simples pour protéger votre espace.
                  </p>
                </div>

                <span>
                  🔒
                </span>
              </div>

              <div className="pf-recommendations">

                <div>
                  <b>🔑</b>
                  <span>
                    Utilisez un mot de passe unique.
                  </span>
                </div>

                <div>
                  <b>🚫</b>
                  <span>
                    Ne partagez jamais votre compte Super Admin.
                  </span>
                </div>

                <div>
                  <b>🛡️</b>
                  <span>
                    Consultez régulièrement le journal d’audit.
                  </span>
                </div>

                <div>
                  <b>💻</b>
                  <span>
                    Déconnectez-vous des appareils publics.
                  </span>
                </div>

              </div>

            </div>
          </>
        )}

        {/* ===================================================
            APPEARANCE
        =================================================== */}

        {tab === "appearance" && (
          <>
            <SectionTitle
              icon="🎨"
              title="Apparence"
              description="Personnalisez l'affichage de votre espace Super Admin."
            />

            <div className="pf-settings-card">

              <div className="pf-card-title">
                <div>
                  <h3>
                    Préférences d'affichage
                  </h3>

                  <p>
                    Ces préférences sont enregistrées
                    localement sur cet appareil.
                  </p>
                </div>

                <span>
                  🖥️
                </span>
              </div>

              <SettingToggle
                icon="🌙"
                title="Mode sombre"
                description="Préférence d'affichage sombre."
                checked={darkMode}
                onChange={(value) => {
                  setDarkMode(value);
                  saveLocal(
                    "pf_superadmin_dark_mode",
                    value
                  );
                }}
              />

              <SettingToggle
                icon="📐"
                title="Interface compacte"
                description="Réduire les espaces entre les éléments."
                checked={compactMode}
                onChange={(value) => {
                  setCompactMode(value);
                  saveLocal(
                    "pf_superadmin_compact_mode",
                    value
                  );
                }}
              />

              <SettingToggle
                icon="✨"
                title="Animations"
                description="Activer les transitions visuelles."
                checked={animations}
                onChange={(value) => {
                  setAnimations(value);
                  saveLocal(
                    "pf_superadmin_animations",
                    value
                  );
                }}
              />

            </div>

            <div className="pf-settings-card">

              <div className="pf-card-title">
                <div>
                  <h3>
                    Identité PharmaFlow
                  </h3>

                  <p>
                    Identité générale de la plateforme.
                  </p>
                </div>

                <span>
                  🏥
                </span>
              </div>

              <div className="pf-brand">
                <div>
                  PF
                </div>

                <section>
                  <strong>
                    PharmaFlow
                  </strong>

                  <span>
                    Plateforme de gestion pharmaceutique
                  </span>
                </section>
              </div>

              <div className="pf-info">
                ℹ️
                <p>
                  La gestion du site public et du
                  branding global reste dans la section
                  <strong> Site</strong>.
                </p>
              </div>

            </div>
          </>
        )}

        {/* ===================================================
            NOTIFICATIONS
        =================================================== */}

        {tab === "notifications" && (
          <>
            <SectionTitle
              icon="🔔"
              title="Notifications"
              description="Gérez vos préférences d'alertes."
            />

            <div className="pf-settings-card">

              <div className="pf-card-title">
                <div>
                  <h3>
                    Préférences de notification
                  </h3>

                  <p>
                    Ces préférences sont conservées sur cet appareil.
                  </p>
                </div>

                <span>
                  🔔
                </span>
              </div>

              <SettingToggle
                icon="✉️"
                title="Notifications générales"
                description="Informations générales de la plateforme."
                checked={
                  generalNotifications
                }
                onChange={(value) => {
                  setGeneralNotifications(
                    value
                  );

                  saveLocal(
                    "pf_superadmin_notifications_general",
                    value
                  );
                }}
              />

              <SettingToggle
                icon="🛡️"
                title="Alertes de sécurité"
                description="Événements importants concernant la sécurité."
                checked={
                  securityNotifications
                }
                onChange={(value) => {
                  setSecurityNotifications(
                    value
                  );

                  saveLocal(
                    "pf_superadmin_notifications_security",
                    value
                  );
                }}
              />

              <SettingToggle
                icon="🎫"
                title="Support"
                description="Alertes liées aux tickets et réclamations."
                checked={
                  supportNotifications
                }
                onChange={(value) => {
                  setSupportNotifications(
                    value
                  );

                  saveLocal(
                    "pf_superadmin_notifications_support",
                    value
                  );
                }}
              />

              <SettingToggle
                icon="💳"
                title="Paiements"
                description="Alertes concernant les transactions."
                checked={
                  paymentNotifications
                }
                onChange={(value) => {
                  setPaymentNotifications(
                    value
                  );

                  saveLocal(
                    "pf_superadmin_notifications_payment",
                    value
                  );
                }}
              />

            </div>
          </>
        )}

        {/* ===================================================
            PLATFORM
        =================================================== */}

        {tab === "platform" && (
          <>
            <SectionTitle
              icon="⚙️"
              title="Plateforme"
              description="Accès rapide aux principaux modules d'administration."
            />

            <div className="pf-platform-grid">

              <Link
                href="/super-admin"
                className="pf-platform-card"
              >
                <span>📊</span>
                <div>
                  <strong>
                    Tableau de bord
                  </strong>
                  <p>
                    Vue globale de PharmaFlow.
                  </p>
                </div>
                <b>→</b>
              </Link>

              <Link
                href="/super-admin/equipe"
                className="pf-platform-card"
              >
                <span>👥</span>
                <div>
                  <strong>
                    Équipe PharmaFlow
                  </strong>
                  <p>
                    Agents, rôles et permissions.
                  </p>
                </div>
                <b>→</b>
              </Link>

              <Link
                href="/super-admin/audit"
                className="pf-platform-card"
              >
                <span>🛡️</span>
                <div>
                  <strong>
                    Journal d'audit
                  </strong>
                  <p>
                    Activités administratives.
                  </p>
                </div>
                <b>→</b>
              </Link>

              <Link
                href="/super-admin/site"
                className="pf-platform-card"
              >
                <span>🌐</span>
                <div>
                  <strong>
                    Site PharmaFlow
                  </strong>
                  <p>
                    Gestion du site public.
                  </p>
                </div>
                <b>→</b>
              </Link>

              <Link
                href="/agent/abonnements"
                className="pf-platform-card"
              >
                <span>📋</span>
                <div>
                  <strong>
                    Abonnements
                  </strong>
                  <p>
                    Plans et abonnements.
                  </p>
                </div>
                <b>→</b>
              </Link>

              <Link
                href="/agent/paiements"
                className="pf-platform-card"
              >
                <span>💰</span>
                <div>
                  <strong>
                    Paiements
                  </strong>
                  <p>
                    Transactions financières.
                  </p>
                </div>
                <b>→</b>
              </Link>

              <Link
                href="/agent/support"
                className="pf-platform-card"
              >
                <span>🎧</span>
                <div>
                  <strong>
                    Support
                  </strong>
                  <p>
                    Tickets et réclamations.
                  </p>
                </div>
                <b>→</b>
              </Link>

              <a
                href="https://pharmaflow.africa"
                target="_blank"
                rel="noopener noreferrer"
                className="pf-platform-card"
              >
                <span>🏥</span>
                <div>
                  <strong>
                    Site public
                  </strong>
                  <p>
                    Ouvrir pharmaflow.africa.
                  </p>
                </div>
                <b>↗</b>
              </a>

            </div>

            <div className="pf-settings-card">

              <div className="pf-card-title">
                <div>
                  <h3>
                    Sécurité de la plateforme
                  </h3>

                  <p>
                    État général de l'architecture de contrôle.
                  </p>
                </div>

                <span>
                  🔐
                </span>
              </div>

              <div className="pf-status-grid">

                <div>
                  <small>
                    Authentification
                  </small>

                  <strong>
                    Supabase Auth
                  </strong>

                  <em>
                    Protégé
                  </em>
                </div>

                <div>
                  <small>
                    Autorisation
                  </small>

                  <strong>
                    platform_admins
                  </strong>

                  <em>
                    Activée
                  </em>
                </div>

                <div>
                  <small>
                    Espace
                  </small>

                  <strong>
                    Super Admin
                  </strong>

                  <em>
                    Privé
                  </em>
                </div>

                <div>
                  <small>
                    Audit
                  </small>

                  <strong>
                    Journal
                  </strong>

                  <em>
                    Disponible
                  </em>
                </div>

              </div>

            </div>
          </>
        )}

      </section>

      <style>{`

        .pf-settings-layout {
          display: grid;
          grid-template-columns: 285px minmax(0, 1fr);
          gap: 22px;
          align-items: start;
        }

        .pf-settings-sidebar {
          position: sticky;
          top: 20px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #e5e9f0;
          border-radius: 17px;
          box-shadow:
            0 8px 30px rgba(16,24,40,.045);
        }

        .pf-settings-sidebar-head {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 17px;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-settings-sidebar-head > div {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #ecfdf9;
          font-size: 19px;
        }

        .pf-settings-sidebar-head > span {
          color: #101828;
          font-size: 13px;
          font-weight: 850;
        }

        .pf-settings-sidebar-head small {
          display: block;
          margin-top: 3px;
          color: #98a2b3;
          font-size: 10px;
          font-weight: 600;
        }

        .pf-settings-sidebar nav {
          padding: 9px;
        }

        .pf-settings-sidebar nav button {
          width: 100%;
          display: grid;
          grid-template-columns: 36px minmax(0,1fr) 18px;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #475467;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          transition: .18s ease;
        }

        .pf-settings-sidebar nav button:hover {
          background: #f7fafb;
        }

        .pf-settings-sidebar nav button.active {
          background: #ecfdf9;
          color: #0f766e;
        }

        .pf-settings-sidebar nav button > span {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f8fafc;
        }

        .pf-settings-sidebar nav strong {
          font-size: 12px;
          font-weight: 800;
        }

        .pf-settings-sidebar nav em {
          color: #98a2b3;
          font-size: 18px;
          font-style: normal;
        }

        .pf-settings-protected {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 9px;
          padding: 11px;
          border-radius: 11px;
          background: #f8fafc;
          color: #344054;
        }

        .pf-settings-protected > div {
          min-width: 0;
        }

        .pf-settings-protected strong {
          display: block;
          font-size: 10px;
          font-weight: 800;
        }

        .pf-settings-protected small {
          display: block;
          margin-top: 2px;
          color: #98a2b3;
          font-size: 9px;
        }

        .pf-settings-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pf-section-title {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .pf-section-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #ecfdf9;
          font-size: 19px;
        }

        .pf-section-title h2 {
          margin: 0;
          color: #101828;
          font-size: 19px;
          font-weight: 850;
        }

        .pf-section-title p {
          margin: 4px 0 0;
          color: #667085;
          font-size: 11px;
          line-height: 1.5;
        }

        .pf-message {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid;
        }

        .pf-message.success {
          background: #ecfdf3;
          border-color: #b7ebce;
          color: #067647;
        }

        .pf-message.error {
          background: #fff5f5;
          border-color: #fecdca;
          color: #b42318;
        }

        .pf-message-icon {
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,.55);
          font-weight: 900;
        }

        .pf-message > div:nth-child(2) {
          flex: 1;
        }

        .pf-message strong {
          display: block;
          font-size: 11px;
          font-weight: 850;
        }

        .pf-message p {
          margin: 3px 0 0;
          font-size: 10px;
          line-height: 1.5;
        }

        .pf-message > button {
          border: 0;
          background: transparent;
          cursor: pointer;
          color: inherit;
          font-size: 18px;
        }

        .pf-settings-card {
          padding: 20px;
          background: #fff;
          border: 1px solid #e5e9f0;
          border-radius: 16px;
          box-shadow:
            0 6px 22px rgba(16,24,40,.03);
        }

        .pf-card-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 17px;
          padding-bottom: 14px;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-card-title h3 {
          margin: 0;
          color: #101828;
          font-size: 14px;
          font-weight: 850;
        }

        .pf-card-title p {
          margin: 4px 0 0;
          color: #667085;
          font-size: 10.5px;
          line-height: 1.5;
        }

        .pf-card-title > span {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f8fafc;
        }

        .pf-profile {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .pf-avatar {
          width: 57px;
          height: 57px;
          flex: 0 0 57px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: linear-gradient(135deg,#0f766e,#14b8a6);
          color: #fff;
          font-size: 18px;
          font-weight: 900;
        }

        .pf-profile > div:nth-child(2) {
          flex: 1;
          min-width: 0;
        }

        .pf-profile strong {
          display: block;
          color: #101828;
          font-size: 14px;
          font-weight: 850;
        }

        .pf-profile span {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 10.5px;
        }

        .pf-profile small {
          display: block;
          margin-top: 5px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 700;
        }

        .pf-profile label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #ecfdf3;
          color: #067647;
          font-size: 10px;
          font-weight: 800;
        }

        .pf-profile label i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #12b76a;
        }

        .pf-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .pf-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-form input {
          width: 100%;
          height: 43px;
          padding: 0 12px;
          box-sizing: border-box;
          border: 1px solid #d0d5dd;
          border-radius: 9px;
          outline: none;
          color: #101828;
          background: #fff;
          font-family: inherit;
          font-size: 12px;
        }

        .pf-form input:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px rgba(15,118,110,.09);
        }

        .pf-form input[readonly] {
          background: #f8fafc;
          color: #667085;
        }

        .pf-form-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 3px;
        }

        .pf-form-actions button {
          min-height: 40px;
          padding: 0 16px;
          border: 0;
          border-radius: 9px;
          background: #0f766e;
          color: #fff;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-form-actions button:hover {
          background: #0b625b;
        }

        .pf-form-actions button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .pf-password {
          position: relative;
        }

        .pf-password input {
          padding-right: 48px;
        }

        .pf-password button {
          position: absolute;
          top: 50%;
          right: 6px;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          cursor: pointer;
        }

        .pf-password-checks {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pf-password-checks span {
          padding: 7px 9px;
          border-radius: 8px;
          background: #f8fafc;
          color: #98a2b3;
          font-size: 9.5px;
        }

        .pf-password-checks span.valid {
          background: #ecfdf3;
          color: #067647;
        }

        .pf-security-banner {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px;
          border: 1px solid #fedf89;
          border-radius: 12px;
          background: #fffaeb;
          color: #93370d;
        }

        .pf-security-banner > div {
          flex: 1;
        }

        .pf-security-banner strong {
          display: block;
          font-size: 11px;
          font-weight: 850;
        }

        .pf-security-banner p {
          margin: 3px 0 0;
          color: #b54708;
          font-size: 10px;
        }

        .pf-recommendations {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 10px;
        }

        .pf-recommendations > div {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px;
          border-radius: 10px;
          background: #f8fafc;
        }

        .pf-recommendations b {
          font-size: 17px;
        }

        .pf-recommendations span {
          color: #475467;
          font-size: 10px;
          line-height: 1.4;
        }

        .pf-setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 14px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-setting-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .pf-setting-row-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pf-setting-row-icon {
          width: 37px;
          height: 37px;
          flex: 0 0 37px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f8fafc;
        }

        .pf-setting-row strong {
          display: block;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-setting-row p {
          margin: 3px 0 0;
          color: #667085;
          font-size: 9.5px;
          line-height: 1.4;
        }

        .pf-toggle {
          position: relative;
          width: 43px;
          height: 24px;
          flex: 0 0 43px;
        }

        .pf-toggle input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .pf-toggle span {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #d0d5dd;
          cursor: pointer;
          transition: .18s ease;
        }

        .pf-toggle span::before {
          content: "";
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          top: 3px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,.15);
          transition: .18s ease;
        }

        .pf-toggle input:checked + span {
          background: #0f766e;
        }

        .pf-toggle input:checked + span::before {
          transform: translateX(19px);
        }

        .pf-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid #edf0f4;
          border-radius: 12px;
          background: #f8fafc;
        }

        .pf-brand > div {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: linear-gradient(135deg,#0f766e,#14b8a6);
          color: #fff;
          font-weight: 900;
        }

        .pf-brand strong {
          display: block;
          color: #101828;
          font-size: 13px;
        }

        .pf-brand span {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 10px;
        }

        .pf-info {
          display: flex;
          gap: 8px;
          margin-top: 11px;
          padding: 10px;
          border-radius: 9px;
          background: #eff8ff;
          color: #175cd3;
        }

        .pf-info p {
          margin: 0;
          font-size: 9.5px;
          line-height: 1.5;
        }

        .pf-platform-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 11px;
        }

        .pf-platform-card {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 13px;
          border: 1px solid #e5e9f0;
          border-radius: 12px;
          background: #fff;
          color: inherit;
          text-decoration: none;
          transition: .18s ease;
        }

        .pf-platform-card:hover {
          transform: translateY(-2px);
          border-color: #a7deda;
          box-shadow:
            0 8px 20px rgba(16,24,40,.05);
        }

        .pf-platform-card > span {
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f8fafc;
        }

        .pf-platform-card div {
          min-width: 0;
          flex: 1;
        }

        .pf-platform-card strong {
          display: block;
          color: #344054;
          font-size: 11px;
          font-weight: 850;
        }

        .pf-platform-card p {
          margin: 3px 0 0;
          color: #667085;
          font-size: 9px;
        }

        .pf-platform-card b {
          color: #98a2b3;
        }

        .pf-status-grid {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 9px;
        }

        .pf-status-grid > div {
          padding: 11px;
          border-radius: 9px;
          background: #f8fafc;
        }

        .pf-status-grid small {
          display: block;
          color: #98a2b3;
          font-size: 9px;
        }

        .pf-status-grid strong {
          display: block;
          margin-top: 4px;
          color: #344054;
          font-size: 10px;
        }

        .pf-status-grid em {
          display: inline-block;
          margin-top: 6px;
          padding: 3px 6px;
          border-radius: 999px;
          background: #ecfdf3;
          color: #067647;
          font-size: 8px;
          font-style: normal;
          font-weight: 800;
        }

        @media (max-width: 1000px) {
          .pf-settings-layout {
            grid-template-columns: 235px minmax(0,1fr);
          }

          .pf-status-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 800px) {
          .pf-settings-layout {
            grid-template-columns: 1fr;
          }

          .pf-settings-sidebar {
            position: static;
          }

          .pf-settings-sidebar nav {
            display: grid;
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .pf-settings-sidebar nav button {
            grid-template-columns: 34px minmax(0,1fr);
          }

          .pf-settings-sidebar nav em {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .pf-settings-card {
            padding: 15px;
          }

          .pf-settings-sidebar nav {
            grid-template-columns: 1fr;
          }

          .pf-profile {
            flex-wrap: wrap;
          }

          .pf-profile label {
            margin-left: 70px;
          }

          .pf-recommendations,
          .pf-platform-grid {
            grid-template-columns: 1fr;
          }

          .pf-status-grid {
            grid-template-columns: 1fr;
          }

          .pf-form-actions {
            justify-content: stretch;
          }

          .pf-form-actions button {
            width: 100%;
          }
        }

      `}</style>
    </div>
  );
}