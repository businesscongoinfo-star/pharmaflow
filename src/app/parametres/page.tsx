"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "../lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  pharmacy_id: string | null;
};

type Pharmacy = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
  status: string | null;
};

const supabase = createClient();

const TEXT = {
  fr: {
    role: {
      owner: "Propriétaire",
      admin: "Administrateur",
      pharmacist: "Pharmacien",
      cashier: "Caissier",
      employee: "Employé",
      user: "Utilisateur",
    },
    brandSubtitle: "Mon profil",
    workspace: "MON ESPACE",
    account: "COMPTE",
    backDashboard: "Retour au tableau de bord",
    myProfile: "Mon profil",
    loading: "Chargement de votre profil...",
    loadErrorTitle: "Impossible de charger votre profil",
    retry: "Réessayer",
    logout: "Se déconnecter",
    closeMenu: "Fermer le menu",
    openMenu: "Ouvrir le menu",
    pageTitle: "Mon profil",
    pageSubtitle: "Gérez vos informations personnelles et la sécurité de votre compte.",
    myWorkspace: "Mon espace",
    success: "Opération réussie",
    attention: "Attention",
    personalInfo: "Informations personnelles",
    personalInfoDesc: "Ces informations concernent uniquement votre compte.",
    fullName: "Nom complet",
    fullNamePlaceholder: "Votre nom complet",
    phone: "Téléphone",
    phonePlaceholder: "+242...",
    save: "✓ Enregistrer",
    saving: "Enregistrement...",
    accountInfo: "Informations du compte",
    accountInfoDesc: "Informations liées à votre connexion PharmaFlow.",
    userId: "Identifiant utilisateur",
    function: "Fonction",
    pharmacy: "Pharmacie",
    notProvided: "Non renseignée",
    myPharmacy: "Ma pharmacie",
    pharmacyInfo: "Informations de la pharmacie associée à votre compte.",
    active: "● Active",
    verification: "● Vérification",
    name: "Nom",
    city: "Ville",
    currency: "Devise",
    address: "Adresse",
    addressNotProvided: "Adresse non renseignée",
    pharmacyReadonly: "🔒 Les informations de la pharmacie sont affichées en lecture seule depuis votre espace personnel.",
    security: "Sécurité du compte",
    securityDesc: "Modifiez votre mot de passe de connexion.",
    newPassword: "Nouveau mot de passe",
    passwordMin: "Minimum 8 caractères",
    confirmPassword: "Confirmer le mot de passe",
    repeatPassword: "Répétez le mot de passe",
    changePassword: "🔐 Modifier le mot de passe",
    changing: "Modification...",
    accessPermissions: "Accès et permissions",
    accessPermissionsDesc: "Votre accès dépend de votre fonction dans PharmaFlow.",
    personalAccess: "✓ Accès personnel",
    personalAccessDesc: "Vous pouvez gérer les informations personnelles autorisées de votre propre compte.",
    protectedData: "🔒 Données protégées",
    protectedDataDesc: "Votre rôle et votre pharmacie ne peuvent pas être modifiés depuis cet espace.",
    secureTitle: "Votre espace personnel est sécurisé",
    secureDesc: "PharmaFlow utilise votre compte connecté pour récupérer vos informations. Vous ne pouvez consulter ou modifier que les informations autorisées pour votre propre profil.",
    backWorkspace: "← Retour à mon espace",
    profileRequired: "Le nom complet est obligatoire.",
    passwordRequired: "Veuillez saisir un nouveau mot de passe.",
    passwordLength: "Le mot de passe doit contenir au moins 8 caractères.",
    passwordMismatch: "Les deux mots de passe ne correspondent pas.",
    profileUpdated: "Votre profil a été mis à jour avec succès.",
    passwordUpdated: "Votre mot de passe a été modifié avec succès.",
    loadProfileError: "Impossible de charger votre profil.",
    updateProfileError: "Impossible de mettre à jour votre profil.",
    changePasswordError: "Impossible de modifier le mot de passe.",
    unknownUser: "Utilisateur",
    pharmacyFallback: "Pharmacie",
    dataProtected: "Données protégées",
  },
  en: {
    role: {
      owner: "Owner",
      admin: "Administrator",
      pharmacist: "Pharmacist",
      cashier: "Cashier",
      employee: "Employee",
      user: "User",
    },
    brandSubtitle: "My profile",
    workspace: "MY WORKSPACE",
    account: "ACCOUNT",
    backDashboard: "Back to dashboard",
    myProfile: "My profile",
    loading: "Loading your profile...",
    loadErrorTitle: "Unable to load your profile",
    retry: "Try again",
    logout: "Log out",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    pageTitle: "My profile",
    pageSubtitle: "Manage your personal information and account security.",
    myWorkspace: "My workspace",
    success: "Operation successful",
    attention: "Attention",
    personalInfo: "Personal information",
    personalInfoDesc: "This information applies only to your account.",
    fullName: "Full name",
    fullNamePlaceholder: "Your full name",
    phone: "Phone",
    phonePlaceholder: "+242...",
    save: "✓ Save",
    saving: "Saving...",
    accountInfo: "Account information",
    accountInfoDesc: "Information related to your PharmaFlow login.",
    userId: "User ID",
    function: "Role",
    pharmacy: "Pharmacy",
    notProvided: "Not provided",
    myPharmacy: "My pharmacy",
    pharmacyInfo: "Information about the pharmacy associated with your account.",
    active: "● Active",
    verification: "● Verification",
    name: "Name",
    city: "City",
    currency: "Currency",
    address: "Address",
    addressNotProvided: "Address not provided",
    pharmacyReadonly: "🔒 Pharmacy information is read-only from your personal workspace.",
    security: "Account security",
    securityDesc: "Change your login password.",
    newPassword: "New password",
    passwordMin: "Minimum 8 characters",
    confirmPassword: "Confirm password",
    repeatPassword: "Repeat the password",
    changePassword: "🔐 Change password",
    changing: "Changing...",
    accessPermissions: "Access and permissions",
    accessPermissionsDesc: "Your access depends on your role in PharmaFlow.",
    personalAccess: "✓ Personal access",
    personalAccessDesc: "You can manage the authorized personal information of your own account.",
    protectedData: "🔒 Protected data",
    protectedDataDesc: "Your role and pharmacy cannot be changed from this workspace.",
    secureTitle: "Your personal workspace is secure",
    secureDesc: "PharmaFlow uses your signed-in account to retrieve your information. You can only view or modify information authorized for your own profile.",
    backWorkspace: "← Back to my workspace",
    profileRequired: "Full name is required.",
    passwordRequired: "Please enter a new password.",
    passwordLength: "The password must contain at least 8 characters.",
    passwordMismatch: "The two passwords do not match.",
    profileUpdated: "Your profile was updated successfully.",
    passwordUpdated: "Your password was changed successfully.",
    loadProfileError: "Unable to load your profile.",
    updateProfileError: "Unable to update your profile.",
    changePasswordError: "Unable to change the password.",
    unknownUser: "User",
    pharmacyFallback: "Pharmacy",
    dataProtected: "Protected data",
  },
} as const;

function getRoleLabel(role: string, t: (typeof TEXT)[keyof typeof TEXT]) {
  switch (role) {
    case "owner": return t.role.owner;
    case "admin": return t.role.admin;
    case "pharmacist": return t.role.pharmacist;
    case "cashier": return t.role.cashier;
    case "employee": return t.role.employee;
    default: return t.role.user;
  }
}

function getRoleHome(role: string) {
  switch (role) {
    case "owner": return "/dashboard";
    case "admin": return "/admin";
    case "pharmacist": return "/pharmacien";
    case "cashier": return "/caisse";
    case "employee": return "/employe";
    default: return "/login";
  }
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase()).join("") || "U";
}

export default function ParametresPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = TEXT[locale === "en" ? "en" : "fr"];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, pharmacy_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);
      if (!profileData) throw new Error(t.loadProfileError);

      const allowedRoles = ["owner", "admin", "pharmacist", "cashier", "employee"];
      if (!allowedRoles.includes(profileData.role)) {
        router.replace("/login");
        return;
      }

      setProfile(profileData as Profile);
      setFullName(profileData.full_name || "");
      setPhone(profileData.phone || "");

      if (profileData.pharmacy_id) {
        const { data: pharmacyData, error: pharmacyError } = await supabase
          .from("pharmacies")
          .select("id, name, address, city, country_code, currency_code, status")
          .eq("id", profileData.pharmacy_id)
          .maybeSingle();

        if (pharmacyError) throw new Error(pharmacyError.message);
        setPharmacy(pharmacyData as Pharmacy | null);
      }
    } catch (err) {
      console.error("PARAMETRES:", err);
      setError(err instanceof Error ? err.message : t.loadProfileError);
    } finally {
      setLoading(false);
    }
  }, [router, t.loadProfileError]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function goToWorkspace() {
    if (!profile) {
      router.replace("/login");
      return;
    }
    router.push(getRoleHome(profile.role));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleSaveProfile() {
    setError("");
    setSuccess("");

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError(t.profileRequired);
      return;
    }

    setSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: cleanName, phone: cleanPhone || null })
        .eq("id", user.id)
        .select("id, full_name, phone, role, pharmacy_id")
        .single();

      if (updateError) throw new Error(updateError.message);

      setProfile(data as Profile);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setSuccess(t.profileUpdated);
    } catch (err) {
      console.error("SAVE PROFILE:", err);
      setError(err instanceof Error ? err.message : t.updateProfileError);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setError("");
    setSuccess("");

    if (!newPassword) {
      setError(t.passwordRequired);
      return;
    }
    if (newPassword.length < 8) {
      setError(t.passwordLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setSaving(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) throw new Error(passwordError.message);

      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t.passwordUpdated);
    } catch (err) {
      console.error("PASSWORD:", err);
      setError(err instanceof Error ? err.message : t.changePasswordError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pf-app">
        <main className="pf-main" style={{ marginLeft: 0 }}>
          <div className="pf-content">
            <div className="pf-container">
              <div className="pf-card">
                <div className="pf-loading">
                  <div className="pf-spinner" />
                  <p>{t.loading}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="pf-app">
        <main className="pf-main" style={{ marginLeft: 0 }}>
          <div className="pf-content">
            <div className="pf-container">
              <div className="pf-card">
                <div className="pf-alert pf-alert-danger">
                  <div className="pf-alert-icon">!</div>
                  <div>
                    <strong>{t.loadErrorTitle}</strong>
                    <p>{error}</p>
                  </div>
                </div>
                <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" className="pf-btn pf-btn-primary" onClick={loadProfile}>
                    ↻ {t.retry}
                  </button>
                  <button type="button" className="pf-btn pf-btn-secondary" onClick={handleLogout}>
                    {t.logout}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="pf-app">
      {sidebarOpen && (
        <div className="pf-mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`pf-sidebar ${sidebarOpen ? "pf-sidebar-open" : ""}`}>
        <div className="pf-sidebar-brand">
          <div className="pf-logo-mark">P</div>
          <div>
            <div className="pf-brand-name">PharmaFlow</div>
            <div className="pf-brand-subtitle">{t.brandSubtitle}</div>
          </div>
          <button type="button" className="pf-mobile-close" onClick={() => setSidebarOpen(false)} aria-label={t.closeMenu}>
            ×
          </button>
        </div>

        <div className="pf-pharmacy-card">
          <div className="pf-pharmacy-icon">🏥</div>
          <div className="pf-pharmacy-info">
            <strong>{pharmacy?.name || t.myPharmacy}</strong>
            <span>{pharmacy?.city || t.pharmacyFallback}</span>
          </div>
        </div>

        <nav className="pf-sidebar-nav">
          <div className="pf-nav-section-title">{t.workspace}</div>
          <button type="button" className="pf-nav-item" onClick={goToWorkspace}>
            <span className="pf-nav-icon">←</span>
            <span>{t.backDashboard}</span>
          </button>

          <div className="pf-nav-section-title">{t.account}</div>
          <Link
            href="/parametres"
            className={`pf-nav-item ${pathname === "/parametres" ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="pf-nav-icon">👤</span>
            <span>{t.myProfile}</span>
          </Link>
        </nav>

        <div className="pf-sidebar-user">
          <div className="pf-user-avatar">
            {getInitials(profile?.full_name || t.unknownUser)}
          </div>
          <div className="pf-user-info">
            <strong>{profile?.full_name || t.unknownUser}</strong>
            <span>{getRoleLabel(profile?.role || "", t)}</span>
          </div>
          <button type="button" className="pf-logout-button" onClick={handleLogout} title={t.logout}>
            ↪
          </button>
        </div>
      </aside>

      <main className="pf-main">
        <header className="pf-topbar">
          <div className="pf-topbar-left">
            <button type="button" className="pf-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label={t.openMenu}>
              ☰
            </button>
            <div>
              <h1 className="pf-page-title">{t.pageTitle}</h1>
              <p className="pf-page-subtitle">{t.pageSubtitle}</p>
            </div>
          </div>

          <div className="pf-topbar-actions">
            <div className="pf-role-pill">
              <span className="pf-role-dot" />
              {getRoleLabel(profile?.role || "", t).toUpperCase()}
            </div>
            <button type="button" className="pf-btn pf-btn-primary" onClick={goToWorkspace}>
              ← {t.myWorkspace}
            </button>
          </div>
        </header>

        <div className="pf-content">
          <div className="pf-container">
            {success && (
              <div className="pf-alert pf-alert-success" style={{ marginBottom: "18px" }}>
                <div className="pf-alert-icon">✓</div>
                <div><strong>{t.success}</strong><p>{success}</p></div>
              </div>
            )}

            {error && (
              <div className="pf-alert pf-alert-danger" style={{ marginBottom: "18px" }}>
                <div className="pf-alert-icon">!</div>
                <div><strong>{t.attention}</strong><p>{error}</p></div>
              </div>
            )}

            <section className="pf-card">
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">{t.personalInfo}</h2>
                  <p className="pf-card-subtitle">{t.personalInfoDesc}</p>
                </div>
                <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "#e6f5f2", color: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 800 }}>
                  👤
                </div>
              </div>

              <div className="pf-form-grid" style={{ marginTop: "20px" }}>
                <div className="pf-form-group">
                  <label className="pf-form-label">{t.fullName}</label>
                  <input type="text" className="form-input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t.fullNamePlaceholder} autoComplete="name" />
                </div>
                <div className="pf-form-group">
                  <label className="pf-form-label">{t.phone}</label>
                  <input type="tel" className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t.phonePlaceholder} autoComplete="tel" />
                </div>
              </div>

              <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="pf-btn pf-btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </section>

            <section className="pf-card" style={{ marginTop: "18px" }}>
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">{t.accountInfo}</h2>
                  <p className="pf-card-subtitle">{t.accountInfoDesc}</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px", marginTop: "18px" }}>
                <div className="pf-info-card">
                  <span>{t.userId}</span>
                  <strong style={{ fontSize: "12px", wordBreak: "break-all" }}>{userId}</strong>
                </div>
                <div className="pf-info-card">
                  <span>{t.function}</span>
                 <strong>{getRoleLabel(profile?.role || "", t)}</strong>
                </div>
                <div className="pf-info-card">
                  <span>{t.pharmacy}</span>
                  <strong>{pharmacy?.name || t.notProvided}</strong>
                </div>
              </div>
            </section>

            <section className="pf-card" style={{ marginTop: "18px" }}>
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">{t.myPharmacy}</h2>
                  <p className="pf-card-subtitle">{t.pharmacyInfo}</p>
                </div>
                <div style={{ padding: "8px 12px", borderRadius: "999px", background: pharmacy?.status === "active" ? "#dcfce7" : "#fef3c7", color: pharmacy?.status === "active" ? "#166534" : "#92400e", fontSize: "12px", fontWeight: 700 }}>
                  {pharmacy?.status === "active" ? t.active : t.verification}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px", marginTop: "18px" }}>
                <div className="pf-info-card"><span>{t.name}</span><strong>{pharmacy?.name || "—"}</strong></div>
                <div className="pf-info-card"><span>{t.city}</span><strong>{pharmacy?.city || "—"}</strong></div>
                <div className="pf-info-card"><span>{t.currency}</span><strong>{pharmacy?.currency_code || "—"}</strong></div>
              </div>

              <div style={{ marginTop: "14px" }}>
                <div className="pf-info-card"><span>{t.address}</span><strong>{pharmacy?.address || t.addressNotProvided}</strong></div>
              </div>

              <div style={{ marginTop: "14px", padding: "14px 16px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "13px", color: "#64748b" }}>
                {t.pharmacyReadonly}
              </div>
            </section>

            <section className="pf-card" style={{ marginTop: "18px" }}>
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">{t.security}</h2>
                  <p className="pf-card-subtitle">{t.securityDesc}</p>
                </div>
                <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                  🔐
                </div>
              </div>

              <div className="pf-form-grid" style={{ marginTop: "20px" }}>
                <div className="pf-form-group">
                  <label className="pf-form-label">{t.newPassword}</label>
                  <input type="password" className="form-input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t.passwordMin} autoComplete="new-password" />
                </div>
                <div className="pf-form-group">
                  <label className="pf-form-label">{t.confirmPassword}</label>
                  <input type="password" className="form-input" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t.repeatPassword} autoComplete="new-password" />
                </div>
              </div>

              <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="pf-btn pf-btn-primary" onClick={handleChangePassword} disabled={saving}>
                  {saving ? t.changing : t.changePassword}
                </button>
              </div>
            </section>

            <section className="pf-card" style={{ marginTop: "18px" }}>
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">{t.accessPermissions}</h2>
                  <p className="pf-card-subtitle">{t.accessPermissionsDesc}</p>
                </div>
              </div>

              <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                <div style={{ padding: "16px", borderRadius: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <strong style={{ display: "block", color: "#166534", marginBottom: "6px" }}>{t.personalAccess}</strong>
                  <span style={{ fontSize: "13px", color: "#475569" }}>{t.personalAccessDesc}</span>
                </div>
                <div style={{ padding: "16px", borderRadius: "14px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
                  <strong style={{ display: "block", color: "#9a3412", marginBottom: "6px" }}>{t.protectedData}</strong>
                  <span style={{ fontSize: "13px", color: "#475569" }}>{t.protectedDataDesc}</span>
                </div>
              </div>
            </section>

            <section className="pf-security-card" style={{ marginTop: "18px" }}>
              <div className="pf-security-icon">🔐</div>
              <div>
                <strong>{t.secureTitle}</strong>
                <p>{t.secureDesc}</p>
              </div>
            </section>

            <section style={{ marginTop: "18px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" className="pf-btn pf-btn-secondary" onClick={goToWorkspace}>
                {t.backWorkspace}
              </button>
              <button type="button" className="pf-btn pf-btn-danger" onClick={handleLogout}>
                ↪ {t.logout}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
