"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { createClient } from "../lib/supabase/client";

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  pharmacy_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  email: string | null;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
  banned_until: string | null;
  is_active: boolean;
};

type RoleDefinition = {
  value: string;
  label: string;
  description: string;
  icon: string;
};

const ROLES: RoleDefinition[] = [
  {
    value: "admin",
    label: "Administrateur",
    description:
      "Gestion avancée de la pharmacie et des utilisateurs.",
    icon: "🛡️",
  },
  {
    value: "pharmacist",
    label: "Pharmacien",
    description:
      "Produits, stock, ventes et opérations pharmaceutiques.",
    icon: "💊",
  },
  {
    value: "cashier",
    label: "Caissier",
    description:
      "Ventes, encaissements et opérations de caisse.",
    icon: "💰",
  },
  {
    value: "employee",
    label: "Employé",
    description:
      "Accès limité aux fonctions autorisées.",
    icon: "👤",
  },
];

export default function UtilisateursPage() {
  const router = useRouter();
  const locale = useLocale();
  const isEnglish = locale === "en";

  const t = (fr: string, en: string) =>
    isEnglish ? en : fr;

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [users, setUsers] =
    useState<UserProfile[]>([]);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [currentRole, setCurrentRole] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [showEditForm, setShowEditForm] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<UserProfile | null>(null);

  // ============================================================
  // FORMULAIRE CRÉATION
  // ============================================================

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("employee");

  const [showPassword, setShowPassword] =
    useState(false);

  // ============================================================
  // FORMULAIRE MODIFICATION
  // ============================================================

  const [editFullName, setEditFullName] =
    useState("");

  const [editPhone, setEditPhone] =
    useState("");

  const [editEmail, setEditEmail] =
    useState("");

  const [editRole, setEditRole] =
    useState("employee");

  const [editPassword, setEditPassword] =
    useState("");

  const [showEditPassword, setShowEditPassword] =
    useState(false);

  // ============================================================
  // MESSAGES
  // ============================================================

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================

  useEffect(() => {
    loadCurrentUserAndUsers();
  }, []);

  async function loadCurrentUserAndUsers() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role, pharmacy_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (!profile?.pharmacy_id) {
        throw new Error(
          t(
            "Votre compte n'est associé à aucune pharmacie.",
            "Your account is not associated with a pharmacy.",
          ),
        );
      }

      setCurrentRole(profile.role);

      if (
        profile.role !== "owner" &&
        profile.role !== "admin"
      ) {
        throw new Error(
          t(
            "Vous n'avez pas l'autorisation de gérer les utilisateurs.",
            "You are not authorized to manage users.",
          ),
        );
      }

      await loadUsers();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t(
              "Impossible de charger les utilisateurs.",
              "Unable to load users.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const response = await fetch(
      "/api/utilisateurs",
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          t(
            "Impossible de charger les utilisateurs.",
            "Unable to load users.",
          ),
      );
    }

    setUsers(
      (result.users || []) as UserProfile[],
    );
  }

  // ============================================================
  // RESET FORMULAIRE CRÉATION
  // ============================================================

  function resetCreateForm() {
    setFullName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setRole("employee");
    setShowPassword(false);
  }

  function closeCreateForm() {
    if (saving) return;

    resetCreateForm();
    setShowCreateForm(false);
  }

  // ============================================================
  // CRÉATION UTILISATEUR
  // ============================================================

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const cleanName =
        fullName.trim();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanName) {
        throw new Error(
          t(
            "Veuillez saisir le nom complet.",
            "Please enter the full name.",
          ),
        );
      }

      if (!cleanEmail) {
        throw new Error(
          t(
            "Veuillez saisir l'adresse email.",
            "Please enter the email address.",
          ),
        );
      }

      if (password.length < 8) {
        throw new Error(
          t(
            "Le mot de passe doit contenir au moins 8 caractères.",
            "The password must contain at least 8 characters.",
          ),
        );
      }

      const response = await fetch(
        "/api/utilisateurs",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            full_name: cleanName,
            phone: phone.trim(),
            email: cleanEmail,
            password,
            role,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            t(
              "Impossible de créer l'utilisateur.",
              "Unable to create the user.",
            ),
        );
      }

      setMessage(
        t(
          `Le compte de ${cleanName} a été créé avec succès.`,
          `The account for ${cleanName} was created successfully.`,
        ),
      );

      resetCreateForm();
      setShowCreateForm(false);

      await loadUsers();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t(
              "Impossible de créer l'utilisateur.",
              "Unable to create the user.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // OUVRIR MODIFICATION
  // ============================================================

  function openEditUser(
    user: UserProfile,
  ) {
    setSelectedUser(user);

    setEditFullName(
      user.full_name || "",
    );

    setEditPhone(
      user.phone || "",
    );

    setEditEmail(
      user.email || "",
    );

    setEditRole(
      user.role || "employee",
    );

    setEditPassword("");
    setShowEditPassword(false);

    setMessage("");
    setError("");

    setShowEditForm(true);
  }

  function closeEditForm() {
    if (saving) return;

    setSelectedUser(null);
    setShowEditForm(false);
    setEditPassword("");
    setShowEditPassword(false);
  }

  // ============================================================
  // MODIFICATION UTILISATEUR
  // ============================================================

  async function handleEditUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const cleanName =
        editFullName.trim();

      const cleanEmail =
        editEmail
          .trim()
          .toLowerCase();

      if (!cleanName) {
        throw new Error(
          t(
            "Le nom complet est obligatoire.",
            "Full name is required.",
          ),
        );
      }

      if (!cleanEmail) {
        throw new Error(
          t(
            "L'email est obligatoire.",
            "Email is required.",
          ),
        );
      }

      if (
        editPassword &&
        editPassword.length < 8
      ) {
        throw new Error(
          t(
            "Le nouveau mot de passe doit contenir au moins 8 caractères.",
            "The new password must contain at least 8 characters.",
          ),
        );
      }

      const payload: Record<
        string,
        unknown
      > = {
        user_id: selectedUser.id,
        full_name: cleanName,
        phone: editPhone.trim(),
        email: cleanEmail,
        role: editRole,
      };

      if (editPassword) {
        payload.password =
          editPassword;
      }

      const response = await fetch(
        "/api/utilisateurs",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload,
          ),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            t(
              "Impossible de modifier l'utilisateur.",
              "Unable to update the user.",
            ),
        );
      }

      setMessage(
        t(
          "Les informations de l'utilisateur ont été mises à jour.",
          "User information has been updated.",
        ),
      );

      closeEditForm();

      await loadUsers();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t(
              "Impossible de modifier l'utilisateur.",
              "Unable to update the user.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // ACTIVER / DÉSACTIVER
  // ============================================================

  async function toggleUserStatus(
    user: UserProfile,
  ) {
    if (
      user.id === currentUserId
    ) {
      return;
    }

    const action =
      user.is_active
        ? t(
            "désactiver",
            "deactivate",
          )
        : t(
            "réactiver",
            "reactivate",
          );

    const confirmed =
      window.confirm(
        t(
          `Voulez-vous vraiment ${action} le compte de ${user.full_name || "cet utilisateur"} ?`,
          `Do you really want to ${action} the account of ${user.full_name || "this user"}?`,
        ),
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/utilisateurs",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            is_active:
              !user.is_active,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            t(
              "Impossible de modifier le statut.",
              "Unable to update the status.",
            ),
        );
      }

      setMessage(
        user.is_active
          ? t(
              "Le compte a été désactivé.",
              "The account has been deactivated.",
            )
          : t(
              "Le compte a été réactivé.",
              "The account has been reactivated.",
            ),
      );

      await loadUsers();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t(
              "Impossible de modifier le statut.",
              "Unable to update the status.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // RECHERCHE + FILTRES
  // ============================================================

  const filteredUsers =
    users.filter((user) => {
      const text =
        search
          .toLowerCase()
          .trim();

      const matchesSearch =
        !text ||
        (user.full_name || "")
          .toLowerCase()
          .includes(text) ||
        (user.email || "")
          .toLowerCase()
          .includes(text) ||
        (user.phone || "")
          .toLowerCase()
          .includes(text) ||
        (user.role || "")
          .toLowerCase()
          .includes(text);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          user.is_active) ||
        (statusFilter === "inactive" &&
          !user.is_active);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });

  // ============================================================
  // STATISTIQUES
  // ============================================================

  const totalUsers =
    users.length;

  const activeUsers =
    users.filter(
      (user) => user.is_active,
    ).length;

  const inactiveUsers =
    users.filter(
      (user) => !user.is_active,
    ).length;

  const adminUsers =
    users.filter(
      (user) => user.role === "admin",
    ).length;

  const pharmacistUsers =
    users.filter(
      (user) =>
        user.role === "pharmacist",
    ).length;

  const cashierUsers =
    users.filter(
      (user) => user.role === "cashier",
    ).length;

  // ============================================================
  // TRADUCTION DES RÔLES
  // ============================================================

  function getRoleLabel(
    value: string | null,
  ) {
    const labels: Record<
      string,
      [string, string]
    > = {
      admin: [
        "Administrateur",
        "Administrator",
      ],
      pharmacist: [
        "Pharmacien",
        "Pharmacist",
      ],
      cashier: [
        "Caissier",
        "Cashier",
      ],
      employee: [
        "Employé",
        "Employee",
      ],
      owner: [
        "Propriétaire",
        "Owner",
      ],
    };

    return t(
      labels[value || ""]?.[0] ||
        "Employé",
      labels[value || ""]?.[1] ||
        "Employee",
    );
  }

  function getRoleDescription(
    value: string | null,
  ) {
    const descriptions: Record<
      string,
      [string, string]
    > = {
      admin: [
        "Gestion avancée de la pharmacie et des utilisateurs.",
        "Advanced pharmacy and user management.",
      ],
      pharmacist: [
        "Produits, stock, ventes et opérations pharmaceutiques.",
        "Products, inventory, sales and pharmacy operations.",
      ],
      cashier: [
        "Ventes, encaissements et opérations de caisse.",
        "Sales, payments and cash register operations.",
      ],
      employee: [
        "Accès limité aux fonctions autorisées.",
        "Limited access to authorized functions.",
      ],
      owner: [
        "Accès complet à la pharmacie et à son administration.",
        "Full access to the pharmacy and its administration.",
      ],
    };

    return t(
      descriptions[value || ""]?.[0] ||
        "Accès limité.",
      descriptions[value || ""]?.[1] ||
        "Limited access.",
    );
  }

  function getRole(
    value: string | null,
  ) {
    return (
      ROLES.find(
        (item) =>
          item.value === value,
      ) || {
        value: "employee",
        label: getRoleLabel(
          "employee",
        ),
        description:
          getRoleDescription(
            "employee",
          ),
        icon: "👤",
      }
    );
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  function formatDate(
    value: string | null,
  ) {
    if (!value) {
      return isEnglish
        ? "Never"
        : "Jamais";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      isEnglish
        ? "en-US"
        : "fr-FR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(date);
  }

  // ============================================================
  // INITIALES
  // ============================================================

  function getInitials(
    name: string | null,
  ) {
    if (!name) {
      return "U";
    }

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part[0],
      )
      .join("")
      .toUpperCase();
  }

  // ============================================================
  // CHARGEMENT
  // ============================================================

  if (loading) {
    return (
      <main className="pf-users-page pf-users-loading">
        <div className="pf-users-loading-card">
          <div className="pf-users-spinner" />

          <h2>
            {t(
              "Chargement des utilisateurs",
              "Loading users",
            )}
          </h2>

          <p>
            {t(
              "Préparation de votre espace d'administration...",
              "Preparing your administration workspace...",
            )}
          </p>
        </div>
      </main>
    );
  }

  // ============================================================
  // INTERFACE
  // ============================================================

  return (
    <main className="pf-users-page">
      <div className="pf-users-shell">

        <header className="pf-users-header">

          <div className="pf-users-header-left">

            <button
              type="button"
              className="pf-users-back"
              onClick={() =>
                router.push(
                  "/dashboard",
                )
              }
            >
              <span>←</span>
              {t(
                "Tableau de bord",
                "Dashboard",
              )}
            </button>

            <div className="pf-users-heading">

              <div className="pf-users-heading-icon">
                👥
              </div>

              <div>
                <h1>
                  {t(
                    "Utilisateurs",
                    "Users",
                  )}
                </h1>

                <p>
                  {t(
                    "Gérez les comptes, les rôles et les accès de votre équipe.",
                    "Manage your team accounts, roles and access.",
                  )}
                </p>
              </div>

            </div>

          </div>

          <div className="pf-users-header-actions">

            <button
              type="button"
              className="pf-users-refresh"
              onClick={loadUsers}
              disabled={saving}
            >
              <span>↻</span>
              {t(
                "Actualiser",
                "Refresh",
              )}
            </button>

            <button
              type="button"
              className="pf-users-primary-button"
              onClick={() =>
                setShowCreateForm(
                  true,
                )
              }
            >
              <span>＋</span>
              {t(
                "Nouvel utilisateur",
                "New user",
              )}
            </button>

          </div>

        </header>

        {message && (
          <div className="pf-users-alert pf-users-alert-success">

            <div className="pf-users-alert-icon">
              ✓
            </div>

            <div>
              <strong>
                {t(
                  "Opération réussie",
                  "Operation successful",
                )}
              </strong>

              <p>{message}</p>
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
          <div className="pf-users-alert pf-users-alert-error">

            <div className="pf-users-alert-icon">
              !
            </div>

            <div>
              <strong>
                {t(
                  "Une erreur est survenue",
                  "An error occurred",
                )}
              </strong>

              <p>{error}</p>
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

        <section className="pf-users-stats">

          <div className="pf-users-stat-card">

            <div className="pf-users-stat-icon pf-users-stat-blue">
              👥
            </div>

            <div>
              <span>
                {t(
                  "Équipe",
                  "Team",
                )}
              </span>

              <strong>
                {totalUsers}
              </strong>

              <small>
                {t(
                  "utilisateurs",
                  "users",
                )}
              </small>
            </div>

          </div>

          <div className="pf-users-stat-card">

            <div className="pf-users-stat-icon pf-users-stat-green">
              ✓
            </div>

            <div>
              <span>
                {t(
                  "Actifs",
                  "Active",
                )}
              </span>

              <strong>
                {activeUsers}
              </strong>

              <small>
                {t(
                  "comptes actifs",
                  "active accounts",
                )}
              </small>
            </div>

          </div>

          <div className="pf-users-stat-card">

            <div className="pf-users-stat-icon pf-users-stat-purple">
              🛡️
            </div>

            <div>
              <span>
                {t(
                  "Administrateurs",
                  "Administrators",
                )}
              </span>

              <strong>
                {adminUsers}
              </strong>

              <small>
                {t(
                  "accès administration",
                  "administration access",
                )}
              </small>
            </div>

          </div>

          <div className="pf-users-stat-card">

            <div className="pf-users-stat-icon pf-users-stat-orange">
              💊
            </div>

            <div>
              <span>
                {t(
                  "Pharmaciens",
                  "Pharmacists",
                )}
              </span>

              <strong>
                {pharmacistUsers}
              </strong>

              <small>
                {t(
                  "équipe pharmacie",
                  "pharmacy team",
                )}
              </small>
            </div>

          </div>

        </section>

        <section className="pf-users-toolbar">

          <div className="pf-users-search-box">

            <span>⌕</span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={t(
                "Rechercher par nom, email, téléphone ou rôle...",
                "Search by name, email, phone or role...",
              )}
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}

          </div>

          <div className="pf-users-filter-group">

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                {t(
                  "Tous les rôles",
                  "All roles",
                )}
              </option>

              {ROLES.map(
                (item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {getRoleLabel(
                      item.value,
                    )}
                  </option>
                ),
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                {t(
                  "Tous les statuts",
                  "All statuses",
                )}
              </option>

              <option value="active">
                {t(
                  "Actifs",
                  "Active",
                )}
              </option>

              <option value="inactive">
                {t(
                  "Désactivés",
                  "Inactive",
                )}
              </option>
            </select>

          </div>

        </section>

        <section className="pf-users-table-card">

          <div className="pf-users-table-header">

            <div>
              <h2>
                {t(
                  "Équipe de la pharmacie",
                  "Pharmacy team",
                )}
              </h2>

              <p>
                {filteredUsers.length}{" "}
                {filteredUsers.length !== 1
                  ? t(
                      "utilisateurs",
                      "users",
                    )
                  : t(
                      "utilisateur",
                      "user",
                    )}{" "}
                {t(
                  "affiché",
                  "displayed",
                )}
              </p>
            </div>

            <div className="pf-users-secure-badge">
              <span>🔒</span>
              {t(
                "Accès sécurisé",
                "Secure access",
              )}
            </div>

          </div>

          <div className="pf-users-table-wrapper">

            <table className="pf-users-table">

              <thead>
                <tr>
                  <th>
                    {t(
                      "Utilisateur",
                      "User",
                    )}
                  </th>

                  <th>
                    {t(
                      "Contact",
                      "Contact",
                    )}
                  </th>

                  <th>
                    {t(
                      "Rôle",
                      "Role",
                    )}
                  </th>

                  <th>
                    {t(
                      "Dernière connexion",
                      "Last sign-in",
                    )}
                  </th>

                  <th>
                    {t(
                      "Statut",
                      "Status",
                    )}
                  </th>

                  <th className="pf-users-th-actions">
                    {t(
                      "Actions",
                      "Actions",
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>

                      <div className="pf-users-empty">

                        <div className="pf-users-empty-icon">
                          👥
                        </div>

                        <h3>
                          {t(
                            "Aucun utilisateur trouvé",
                            "No users found",
                          )}
                        </h3>

                        <p>
                          {t(
                            "Modifiez vos critères de recherche ou créez un nouvel utilisateur.",
                            "Adjust your search criteria or create a new user.",
                          )}
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setRoleFilter(
                              "all",
                            );
                            setStatusFilter(
                              "all",
                            );
                          }}
                        >
                          {t(
                            "Réinitialiser les filtres",
                            "Reset filters",
                          )}
                        </button>

                      </div>

                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(
                    (user) => {
                      const roleInfo =
                        getRole(
                          user.role,
                        );

                      const isCurrent =
                        user.id ===
                        currentUserId;

                      return (
                        <tr
                          key={user.id}
                          className={
                            !user.is_active
                              ? "pf-users-row-inactive"
                              : ""
                          }
                        >

                          <td>

                            <div className="pf-users-person">

                              <div className="pf-users-avatar">
                                {getInitials(
                                  user.full_name,
                                )}
                              </div>

                              <div className="pf-users-person-info">

                                <strong>
                                  {user.full_name ||
                                    t(
                                      "Utilisateur",
                                      "User",
                                    )}
                                </strong>

                                <span>
                                  {user.email ||
                                    t(
                                      "Email non renseigné",
                                      "Email not provided",
                                    )}
                                </span>

                                {isCurrent && (
                                  <small>
                                    {t(
                                      "Votre compte",
                                      "Your account",
                                    )}
                                  </small>
                                )}

                              </div>

                            </div>

                          </td>

                          <td>

                            <div className="pf-users-contact">

                              <span>
                                {user.phone ||
                                  t(
                                    "Téléphone non renseigné",
                                    "Phone not provided",
                                  )}
                              </span>

                              {!user.email_confirmed &&
                                user.email && (
                                  <small className="pf-users-warning-text">
                                    {t(
                                      "Email non confirmé",
                                      "Email not confirmed",
                                    )}
                                  </small>
                                )}

                            </div>

                          </td>

                          <td>

                            {isCurrent ? (
                              <span className="pf-users-role pf-users-role-owner">
                                {t(
                                  "👑 Propriétaire",
                                  "👑 Owner",
                                )}
                              </span>
                            ) : (
                              <span
                                className={`pf-users-role pf-users-role-${user.role || "employee"}`}
                              >
                                {roleInfo.icon}{" "}
                                {getRoleLabel(
                                  user.role,
                                )}
                              </span>
                            )}

                          </td>

                          <td>

                            <div className="pf-users-last-login">
                              <span>
                                {formatDate(
                                  user.last_sign_in_at,
                                )}
                              </span>
                            </div>

                          </td>

                          <td>

                            {user.is_active ? (
                              <span className="pf-users-status pf-users-status-active">
                                <i />
                                {t(
                                  "Actif",
                                  "Active",
                                )}
                              </span>
                            ) : (
                              <span className="pf-users-status pf-users-status-inactive">
                                <i />
                                {t(
                                  "Désactivé",
                                  "Inactive",
                                )}
                              </span>
                            )}

                          </td>

                          <td>

                            {!isCurrent && (
                              <div className="pf-users-actions">

                                <button
                                  type="button"
                                  className="pf-users-action pf-users-action-edit"
                                  onClick={() =>
                                    openEditUser(
                                      user,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  title={t(
                                    "Modifier",
                                    "Edit",
                                  )}
                                >
                                  ✎
                                </button>

                                <button
                                  type="button"
                                  className={`pf-users-action ${
                                    user.is_active
                                      ? "pf-users-action-disable"
                                      : "pf-users-action-enable"
                                  }`}
                                  onClick={() =>
                                    toggleUserStatus(
                                      user,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  title={
                                    user.is_active
                                      ? t(
                                          "Désactiver",
                                          "Deactivate",
                                        )
                                      : t(
                                          "Réactiver",
                                          "Reactivate",
                                        )
                                  }
                                >
                                  {user.is_active
                                    ? "⏸"
                                    : "▶"}
                                </button>

                              </div>
                            )}

                          </td>

                        </tr>
                      );
                    },
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        <p>

        </p>
        {/* =====================================================
            INFORMATIONS SUR LES RÔLES
        ====================================================== */}

        <section className="pf-users-roles-section">

          <div className="pf-users-section-heading">

            <div>
              <span className="pf-users-section-kicker">
                {t(
                  "ORGANISATION DE L'ÉQUIPE",
                  "TEAM ORGANIZATION",
                )}
              </span>

              <h2>
                {t(
                  "Rôles et responsabilités",
                  "Roles and responsibilities",
                )}
              </h2>

              <p>
                {t(
                  "Chaque utilisateur dispose d'un accès adapté à ses responsabilités.",
                  "Each user has access adapted to their responsibilities.",
                )}
              </p>
            </div>

          </div>

          <div className="pf-users-roles-grid">

            {ROLES.map((item) => (
              <div
                key={item.value}
                className="pf-users-role-info-card"
              >

                <div className="pf-users-role-info-icon">
                  {item.icon}
                </div>

                <div className="pf-users-role-info-content">

                  <h3>
                    {getRoleLabel(
                      item.value,
                    )}
                  </h3>

                  <p>
                    {getRoleDescription(
                      item.value,
                    )}
                  </p>

                </div>

              </div>
            ))}

          </div>

        </section>

        {/* =====================================================
            INFORMATIONS DE SÉCURITÉ
        ====================================================== */}

        <section className="pf-users-security-card">

          <div className="pf-users-security-icon">
            🔐
          </div>

          <div className="pf-users-security-content">

            <h3>
              {t(
                "Sécurité et isolation des données",
                "Security and data isolation",
              )}
            </h3>

            <p>
              {t(
                "Les utilisateurs affichés ici appartiennent uniquement à votre pharmacie. Les comptes sont associés automatiquement à la pharmacie du responsable connecté.",
                "The users displayed here belong only to your pharmacy. Accounts are automatically associated with the pharmacy of the signed-in manager.",
              )}
            </p>

            <div className="pf-users-security-points">

              <span>
                ✓{" "}
                {t(
                  "Isolation par pharmacie",
                  "Pharmacy-level isolation",
                )}
              </span>

              <span>
                ✓{" "}
                {t(
                  "Rôles contrôlés côté serveur",
                  "Roles enforced server-side",
                )}
              </span>

              <span>
                ✓{" "}
                {t(
                  "Comptes gérés par Supabase Auth",
                  "Accounts managed by Supabase Auth",
                )}
              </span>

              <span>
                ✓{" "}
                {t(
                  "Langue héritée de la pharmacie",
                  "Language inherited from the pharmacy",
                )}
              </span>

            </div>

          </div>

        </section>

      </div>

      {/* =======================================================
          MODALE — CRÉATION
      ======================================================== */}

      {showCreateForm && (
        <div
          className="pf-users-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateForm();
            }
          }}
        >

          <div className="pf-users-modal">

            <div className="pf-users-modal-header">

              <div>

                <span className="pf-users-modal-kicker">
                  {t(
                    "NOUVEAU COMPTE",
                    "NEW ACCOUNT",
                  )}
                </span>

                <h2>
                  {t(
                    "Créer un utilisateur",
                    "Create user",
                  )}
                </h2>

                <p>
                  {t(
                    "Ajoutez un membre à l'équipe de votre pharmacie.",
                    "Add a member to your pharmacy team.",
                  )}
                </p>

              </div>

              <button
                type="button"
                className="pf-users-modal-close"
                onClick={
                  closeCreateForm
                }
                disabled={saving}
                aria-label={t(
                  "Fermer",
                  "Close",
                )}
              >
                ×
              </button>

            </div>

            <div className="pf-users-language-notice">

              <div className="pf-users-language-notice-icon">
                🌍
              </div>

              <div>

                <strong>
                  {t(
                    "Langue du compte",
                    "Account language",
                  )}
                </strong>

                <p>
                  {t(
                    "Le nouvel utilisateur utilisera automatiquement la langue configurée pour votre pharmacie.",
                    "The new user will automatically use the language configured for your pharmacy.",
                  )}
                </p>

              </div>

            </div>

            <form
              className="pf-users-form"
              onSubmit={
                handleCreateUser
              }
            >

              <div className="pf-users-form-grid">

                <div className="pf-users-form-group pf-users-form-full">

                  <label htmlFor="create-full-name">
                    {t(
                      "Nom complet *",
                      "Full name *",
                    )}
                  </label>

                  <input
                    id="create-full-name"
                    type="text"
                    value={fullName}
                    onChange={(
                      event,
                    ) =>
                      setFullName(
                        event.target.value,
                      )
                    }
                    placeholder={t(
                      "Ex. Jean Dupont",
                      "e.g. John Smith",
                    )}
                    autoComplete="name"
                    required
                  />

                </div>

                <div className="pf-users-form-group">

                  <label htmlFor="create-phone">
                    {t(
                      "Téléphone",
                      "Phone",
                    )}
                  </label>

                  <input
                    id="create-phone"
                    type="tel"
                    value={phone}
                    onChange={(
                      event,
                    ) =>
                      setPhone(
                        event.target.value,
                      )
                    }
                    placeholder={t(
                      "+242 06 000 00 00",
                      "+1 555 000 0000",
                    )}
                    autoComplete="tel"
                  />

                </div>

                <div className="pf-users-form-group">

                  <label htmlFor="create-role">
                    {t(
                      "Rôle *",
                      "Role *",
                    )}
                  </label>

                  <select
                    id="create-role"
                    value={role}
                    onChange={(
                      event,
                    ) =>
                      setRole(
                        event.target.value,
                      )
                    }
                    required
                  >

                    {ROLES.filter(
                      (item) =>
                        currentRole ===
                          "owner" ||
                        item.value !==
                          "admin",
                    ).map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.icon
                          }{" "}
                          {getRoleLabel(
                            item.value,
                          )}
                        </option>
                      ),
                    )}

                  </select>

                </div>

                <div className="pf-users-form-group pf-users-form-full">

                  <label htmlFor="create-email">
                    {t(
                      "Email de connexion *",
                      "Login email *",
                    )}
                  </label>

                  <input
                    id="create-email"
                    type="email"
                    value={email}
                    onChange={(
                      event,
                    ) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    placeholder={t(
                      "utilisateur@pharmacie.com",
                      "user@pharmacy.com",
                    )}
                    autoComplete="email"
                    required
                  />

                </div>

                <div className="pf-users-form-group pf-users-form-full">

                  <label htmlFor="create-password">
                    {t(
                      "Mot de passe *",
                      "Password *",
                    )}
                  </label>

                  <div className="pf-users-password-field">

                    <input
                      id="create-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        event,
                      ) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder={t(
                        "Minimum 8 caractères",
                        "Minimum 8 characters",
                      )}
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword,
                        )
                      }
                      aria-label={
                        showPassword
                          ? t(
                              "Masquer le mot de passe",
                              "Hide password",
                            )
                          : t(
                              "Afficher le mot de passe",
                              "Show password",
                            )
                      }
                    >
                      {showPassword
                        ? t(
                            "Masquer",
                            "Hide",
                          )
                        : t(
                            "Afficher",
                            "Show",
                          )}
                    </button>

                  </div>

                  <small>
                    {t(
                      "Le mot de passe doit contenir au moins 8 caractères.",
                      "The password must contain at least 8 characters.",
                    )}
                  </small>

                </div>

              </div>

              <div className="pf-users-modal-footer">

                <button
                  type="button"
                  className="pf-users-secondary-button"
                  onClick={
                    closeCreateForm
                  }
                  disabled={saving}
                >
                  {t(
                    "Annuler",
                    "Cancel",
                  )}
                </button>

                <button
                  type="submit"
                  className="pf-users-submit-button"
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <span className="pf-users-button-spinner" />

                      {t(
                        "Création...",
                        "Creating...",
                      )}
                    </>
                  ) : (
                    <>
                      ✓{" "}
                      {t(
                        "Créer l'utilisateur",
                        "Create user",
                      )}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =======================================================
          MODALE — MODIFICATION
      ======================================================== */}

      {showEditForm &&
        selectedUser && (
          <div
            className="pf-users-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeEditForm();
              }
            }}
          >

            <div className="pf-users-modal">

              <div className="pf-users-modal-header">

                <div>

                  <span className="pf-users-modal-kicker">
                    {t(
                      "GESTION DU COMPTE",
                      "ACCOUNT MANAGEMENT",
                    )}
                  </span>

                  <h2>
                    {t(
                      "Modifier l'utilisateur",
                      "Edit user",
                    )}
                  </h2>

                  <p>
                    {selectedUser.full_name ||
                      t(
                        "Utilisateur",
                        "User",
                      )}
                  </p>

                </div>

                <button
                  type="button"
                  className="pf-users-modal-close"
                  onClick={
                    closeEditForm
                  }
                  disabled={saving}
                  aria-label={t(
                    "Fermer",
                    "Close",
                  )}
                >
                  ×
                </button>

              </div>

              <div className="pf-users-language-notice">

                <div className="pf-users-language-notice-icon">
                  🌍
                </div>

                <div>

                  <strong>
                    {t(
                      "Langue du compte",
                      "Account language",
                    )}
                  </strong>

                  <p>
                    {t(
                      "La langue de cet utilisateur est héritée de la pharmacie et ne peut pas être définie individuellement.",
                      "This user's language is inherited from the pharmacy and cannot be set individually.",
                    )}
                  </p>

                </div>

              </div>

              <form
                className="pf-users-form"
                onSubmit={
                  handleEditUser
                }
              >

                <div className="pf-users-form-grid">

                  <div className="pf-users-form-group pf-users-form-full">

                    <label htmlFor="edit-full-name">
                      {t(
                        "Nom complet *",
                        "Full name *",
                      )}
                    </label>

                    <input
                      id="edit-full-name"
                      type="text"
                      value={
                        editFullName
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditFullName(
                          event.target.value,
                        )
                      }
                      autoComplete="name"
                      required
                    />

                  </div>

                  <div className="pf-users-form-group">

                    <label htmlFor="edit-phone">
                      {t(
                        "Téléphone",
                        "Phone",
                      )}
                    </label>

                    <input
                      id="edit-phone"
                      type="tel"
                      value={
                        editPhone
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditPhone(
                          event.target.value,
                        )
                      }
                      autoComplete="tel"
                    />

                  </div>

                  <div className="pf-users-form-group">

                    <label htmlFor="edit-role">
                      {t(
                        "Rôle *",
                        "Role *",
                      )}
                    </label>

                    <select
                      id="edit-role"
                      value={
                        editRole
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditRole(
                          event.target.value,
                        )
                      }
                      required
                    >

                      {ROLES.filter(
                        (item) =>
                          currentRole ===
                            "owner" ||
                          item.value !==
                            "admin",
                      ).map(
                        (item) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.icon
                            }{" "}
                            {getRoleLabel(
                              item.value,
                            )}
                          </option>
                        ),
                      )}

                    </select>

                  </div>

                  <div className="pf-users-form-group pf-users-form-full">

                    <label htmlFor="edit-email">
                      {t(
                        "Email de connexion *",
                        "Login email *",
                      )}
                    </label>

                    <input
                      id="edit-email"
                      type="email"
                      value={
                        editEmail
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditEmail(
                          event.target.value,
                        )
                      }
                      autoComplete="email"
                      required
                    />

                  </div>

                  <div className="pf-users-form-group pf-users-form-full">

                    <label htmlFor="edit-password">
                      {t(
                        "Nouveau mot de passe",
                        "New password",
                      )}
                    </label>

                    <div className="pf-users-password-field">

                      <input
                        id="edit-password"
                        type={
                          showEditPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          editPassword
                        }
                        onChange={(
                          event,
                        ) =>
                          setEditPassword(
                            event.target.value,
                          )
                        }
                        placeholder={t(
                          "Laisser vide pour conserver l'actuel",
                          "Leave blank to keep the current password",
                        )}
                        minLength={8}
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowEditPassword(
                            !showEditPassword,
                          )
                        }
                      >
                        {showEditPassword
                          ? t(
                              "Masquer",
                              "Hide",
                            )
                          : t(
                              "Afficher",
                              "Show",
                            )}
                      </button>

                    </div>

                    <small>
                      {t(
                        "Si vous saisissez un mot de passe, il remplacera immédiatement l'ancien.",
                        "If you enter a password, it will immediately replace the current password.",
                      )}
                    </small>

                  </div>

                </div>

                <div className="pf-users-modal-footer">

                  <button
                    type="button"
                    className="pf-users-secondary-button"
                    onClick={
                      closeEditForm
                    }
                    disabled={saving}
                  >
                    {t(
                      "Annuler",
                      "Cancel",
                    )}
                  </button>

                  <button
                    type="submit"
                    className="pf-users-submit-button"
                    disabled={saving}
                  >

                    {saving ? (
                      <>
                        <span className="pf-users-button-spinner" />

                        {t(
                          "Enregistrement...",
                          "Saving...",
                        )}
                      </>
                    ) : (
                      <>
                        ✓{" "}
                        {t(
                          "Enregistrer les modifications",
                          "Save changes",
                        )}
                      </>
                    )}

                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </main>
  );
}