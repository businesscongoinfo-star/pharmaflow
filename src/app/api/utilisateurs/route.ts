import { NextResponse } from "next/server";
import { createClient as createServerClient } from "../../lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type UserRole =
  | "owner"
  | "admin"
  | "pharmacist"
  | "cashier"
  | "employee";

type PharmacyLanguage = "fr" | "en";

const ALLOWED_ROLES: UserRole[] = [
  "admin",
  "pharmacist",
  "cashier",
  "employee",
];

/* =========================================================
   CLIENT ADMIN SUPABASE
   ========================================================= */

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Configuration Supabase serveur manquante."
    );
  }

  return createSupabaseClient(
    url,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* =========================================================
   UTILITAIRES
   ========================================================= */

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeEmail(
  value: unknown
): string {
  return cleanText(value).toLowerCase();
}

function isValidEmail(
  email: string
): boolean {
  return (
    email.length > 0 &&
    email.includes("@") &&
    email.includes(".")
  );
}

function isAllowedRole(
  role: string
): boolean {
  return ALLOWED_ROLES.includes(
    role as UserRole
  );
}

function normalizeLanguage(
  language: unknown
): PharmacyLanguage {
  return language === "en"
    ? "en"
    : "fr";
}

function isUserActive(
  bannedUntil:
    | string
    | null
    | undefined
): boolean {
  if (!bannedUntil) {
    return true;
  }

  const timestamp =
    new Date(bannedUntil).getTime();

  if (Number.isNaN(timestamp)) {
    return true;
  }

  return timestamp <= Date.now();
}

/* =========================================================
   AUTHENTIFICATION DU RESPONSABLE CONNECTÉ
   ========================================================= */

async function getAuthenticatedRequester() {
  const supabase =
    await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: "Session utilisateur invalide.",
      user: null,
      profile: null,
    };
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, full_name, phone, role, pharmacy_id"
      )
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Erreur récupération profil:",
      profileError
    );

    return {
      error:
        "Impossible de récupérer votre profil.",
      user: null,
      profile: null,
    };
  }

  if (!profile) {
    return {
      error:
        "Profil utilisateur introuvable.",
      user: null,
      profile: null,
    };
  }

  if (!profile.pharmacy_id) {
    return {
      error:
        "Votre compte n'est associé à aucune pharmacie.",
      user,
      profile,
    };
  }

  return {
    error: null,
    user,
    profile,
  };
}

/* =========================================================
   VÉRIFICATION DES DROITS
   ========================================================= */

function canManageUsers(
  role: string | null
): boolean {
  return (
    role === "owner" ||
    role === "admin"
  );
}

/* =========================================================
   VÉRIFICATION DU RÔLE
   ========================================================= */

function canManageTargetRole(
  requesterRole: string | null,
  targetRole: string | null
): boolean {
  /*
   * Le propriétaire peut gérer tous les rôles
   * sauf transférer le rôle owner.
   */

  if (
    requesterRole === "owner"
  ) {
    return targetRole !== "owner";
  }

  /*
   * L'administrateur peut gérer les rôles
   * pharmacien, caissier et employé.
   *
   * Il ne peut pas gérer un autre admin.
   */

  if (
    requesterRole === "admin"
  ) {
    return (
      targetRole !== "owner" &&
      targetRole !== "admin"
    );
  }

  return false;
}

/* =========================================================
   GET — LISTE DES UTILISATEURS
   ========================================================= */

export async function GET() {
  try {
    const {
      error: authError,
      user,
      profile,
    } =
      await getAuthenticatedRequester();

    if (
      authError ||
      !user ||
      !profile
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            authError ||
            "Session utilisateur invalide.",
        },
        { status: 401 }
      );
    }

    if (
      !canManageUsers(
        profile.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous n'avez pas l'autorisation de gérer les utilisateurs.",
        },
        { status: 403 }
      );
    }

    if (!profile.pharmacy_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Votre compte n'est associé à aucune pharmacie.",
        },
        { status: 400 }
      );
    }

    const admin =
      getAdminClient();

    /* -----------------------------------------------------
       Récupérer la pharmacie et sa langue
       ----------------------------------------------------- */

    const {
      data: pharmacy,
      error: pharmacyError,
    } =
      await admin
        .from("pharmacies")
        .select(
          "id, language"
        )
        .eq(
          "id",
          profile.pharmacy_id
        )
        .maybeSingle();

    if (pharmacyError) {
      console.error(
        "Erreur récupération pharmacie:",
        pharmacyError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les informations de la pharmacie.",
        },
        { status: 500 }
      );
    }

    if (!pharmacy) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pharmacie introuvable.",
        },
        { status: 404 }
      );
    }

    /*
     * La langue appartient à la pharmacie.
     */
    const pharmacyLanguage =
      normalizeLanguage(
        pharmacy.language
      );

    /* -----------------------------------------------------
       Profils de la même pharmacie
       ----------------------------------------------------- */

    const {
      data: profiles,
      error: profilesError,
    } =
      await admin
        .from("profiles")
        .select(
          "id, full_name, phone, role, pharmacy_id, created_at, updated_at"
        )
        .eq(
          "pharmacy_id",
          profile.pharmacy_id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (profilesError) {
      console.error(
        "Erreur chargement profils:",
        profilesError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de charger les utilisateurs.",
        },
        { status: 500 }
      );
    }

    /* -----------------------------------------------------
       Utilisateurs Auth
       ----------------------------------------------------- */

    const authUsers: any[] = [];

    let page = 1;

    const perPage = 1000;

    while (true) {
      const {
        data,
        error,
      } =
        await admin.auth.admin.listUsers(
          {
            page,
            perPage,
          }
        );

      if (error) {
        console.error(
          "Erreur liste utilisateurs Auth:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Impossible de récupérer les comptes Auth.",
          },
          { status: 500 }
        );
      }

      const users =
        data?.users || [];

      authUsers.push(
        ...users
      );

      if (
        users.length <
        perPage
      ) {
        break;
      }

      page++;
    }

    /* -----------------------------------------------------
       Fusion Profiles + Auth
       ----------------------------------------------------- */

    const users =
      (profiles || []).map(
        (profileItem: any) => {
          const authUser =
            authUsers.find(
              (item) =>
                item.id ===
                profileItem.id
            );

          const bannedUntil =
            authUser?.banned_until ||
            null;

          return {
            id:
              profileItem.id,

            full_name:
              profileItem.full_name ||
              "",

            phone:
              profileItem.phone ||
              "",

            role:
              profileItem.role ||
              "employee",

            pharmacy_id:
              profileItem.pharmacy_id,

            created_at:
              profileItem.created_at,

            updated_at:
              profileItem.updated_at,

            email:
              authUser?.email ||
              "",

            email_confirmed:
              Boolean(
                authUser?.email_confirmed_at
              ),

            last_sign_in_at:
              authUser?.last_sign_in_at ||
              null,

            banned_until:
              bannedUntil,

            is_active:
              isUserActive(
                bannedUntil
              ),

            is_current_user:
              profileItem.id ===
              user.id,

            /*
             * Tous les utilisateurs héritent
             * de la langue de leur pharmacie.
             */
            language:
              pharmacyLanguage,
          };
        }
      );

    return NextResponse.json({
      success: true,

      users,

      pharmacyId:
        profile.pharmacy_id,

      pharmacyLanguage,
    });
  } catch (error: any) {
    console.error(
      "GET /api/utilisateurs:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur serveur est survenue.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST — CRÉER UN UTILISATEUR
   ========================================================= */

export async function POST(
  request: Request
) {
  let createdUserId:
    | string
    | null = null;

  try {
    const {
      error: authError,
      user: requester,
      profile: requesterProfile,
    } =
      await getAuthenticatedRequester();

    if (
      authError ||
      !requester ||
      !requesterProfile
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            authError ||
            "Session utilisateur invalide.",
        },
        { status: 401 }
      );
    }

    /* -----------------------------------------------------
       Autorisation
       ----------------------------------------------------- */

    if (
      !canManageUsers(
        requesterProfile.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous n'avez pas l'autorisation de créer des utilisateurs.",
        },
        { status: 403 }
      );
    }

    if (
      !requesterProfile.pharmacy_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Votre compte n'est associé à aucune pharmacie.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json();

    const full_name =
      cleanText(
        body.full_name
      );

    const phone =
      cleanText(
        body.phone
      );

    const email =
      normalizeEmail(
        body.email
      );

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    const role =
      cleanText(
        body.role
      ).toLowerCase() as UserRole;

    /* -----------------------------------------------------
       Validation
       ----------------------------------------------------- */

    if (!full_name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom complet est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L'adresse email est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L'adresse email n'est pas valide.",
        },
        { status: 400 }
      );
    }

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le mot de passe doit contenir au moins 8 caractères.",
        },
        { status: 400 }
      );
    }

    if (
      !isAllowedRole(role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le rôle sélectionné est invalide.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       Seul le propriétaire peut créer un administrateur
       ----------------------------------------------------- */

    if (
      role === "admin" &&
      requesterProfile.role !==
        "owner"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Seul le propriétaire de la pharmacie peut créer un administrateur.",
        },
        { status: 403 }
      );
    }

    const admin =
      getAdminClient();

    const pharmacyId =
      requesterProfile.pharmacy_id;

    /* -----------------------------------------------------
       Récupérer la langue de la pharmacie
       ----------------------------------------------------- */

    const {
      data: pharmacy,
      error: pharmacyError,
    } =
      await admin
        .from("pharmacies")
        .select(
          "id, language"
        )
        .eq(
          "id",
          pharmacyId
        )
        .maybeSingle();

    if (pharmacyError) {
      console.error(
        "Erreur récupération langue pharmacie:",
        pharmacyError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer la langue de la pharmacie.",
        },
        { status: 500 }
      );
    }

    if (!pharmacy) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pharmacie introuvable.",
        },
        { status: 404 }
      );
    }

    /*
     * IMPORTANT :
     *
     * La langue n'est PAS choisie par l'employé.
     * Elle provient exclusivement de la pharmacie.
     */

    const pharmacyLanguage =
      normalizeLanguage(
        pharmacy.language
      );

    /* -----------------------------------------------------
       Création Auth
       ----------------------------------------------------- */

    const {
      data: createdData,
      error: createError,
    } =
      await admin.auth.admin.createUser(
        {
          email,

          password,

          email_confirm: true,

          user_metadata: {
            full_name,

            phone,

            pharmacy_language:
              pharmacyLanguage,
          },

          app_metadata: {
            pharmacy_id:
              pharmacyId,

            role,

            pharmacy_language:
              pharmacyLanguage,
          },
        }
      );

    if (createError) {
      console.error(
        "Erreur création Auth:",
        createError
      );

      let message =
        createError.message ||
        "Impossible de créer le compte.";

      if (
        message
          .toLowerCase()
          .includes(
            "already registered"
          ) ||
        message
          .toLowerCase()
          .includes(
            "already been registered"
          )
      ) {
        message =
          "Cette adresse email est déjà utilisée.";
      }

      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 400 }
      );
    }

    const createdUser =
      createdData.user;

    if (!createdUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le compte Auth n'a pas pu être créé.",
        },
        { status: 500 }
      );
    }

    createdUserId =
      createdUser.id;

    /* -----------------------------------------------------
       Création / mise à jour du profil
       ----------------------------------------------------- */

    const {
      error: profileError,
    } =
      await admin
        .from("profiles")
        .upsert(
          {
            id:
              createdUser.id,

            full_name,

            phone:
              phone || null,

            role,

            /*
             * IMPORTANT :
             * toujours la pharmacie du responsable connecté.
             *
             * Jamais une valeur provenant du navigateur.
             */
            pharmacy_id:
              pharmacyId,
          },
          {
            onConflict:
              "id",
          }
        );

    if (profileError) {
      console.error(
        "Erreur création profil:",
        profileError
      );

      /* ---------------------------------------------------
         ROLLBACK AUTH
         --------------------------------------------------- */

      await admin.auth.admin.deleteUser(
        createdUser.id
      );

      createdUserId =
        null;

      return NextResponse.json(
        {
          success: false,
          error:
            "Le compte a été créé dans Auth mais son profil n'a pas pu être enregistré. La création a été annulée.",
        },
        { status: 500 }
      );
    }

    /* -----------------------------------------------------
       Synchronisation finale des metadata
       ----------------------------------------------------- */

    const {
      error: metadataError,
    } =
      await admin.auth.admin.updateUserById(
        createdUser.id,
        {
          user_metadata: {
            full_name,

            phone,

            pharmacy_language:
              pharmacyLanguage,
          },

          app_metadata: {
            pharmacy_id:
              pharmacyId,

            role,

            pharmacy_language:
              pharmacyLanguage,
          },
        }
      );

    if (metadataError) {
      console.error(
        "Erreur synchronisation metadata:",
        metadataError
      );

      /*
       * Ce n'est pas bloquant pour le profil.
       *
       * La source de vérité pour la langue reste :
       *
       * profiles.pharmacy_id
       *        ↓
       * pharmacies.language
       */
    }

    return NextResponse.json(
      {
        success: true,

        message:
          pharmacyLanguage === "en"
            ? "User created successfully."
            : "Utilisateur créé avec succès.",

        user: {
          id:
            createdUser.id,

          full_name,

          phone,

          email,

          role,

          pharmacy_id:
            pharmacyId,

          language:
            pharmacyLanguage,
        },

        pharmacyLanguage,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "POST /api/utilisateurs:",
      error
    );

    /*
     * Sécurité supplémentaire :
     * si une erreur inattendue survient après la création
     * Auth, on essaie de supprimer le compte créé.
     */

    if (createdUserId) {
      try {
        const admin =
          getAdminClient();

        await admin.auth.admin.deleteUser(
          createdUserId
        );
      } catch (cleanupError) {
        console.error(
          "Erreur nettoyage compte Auth:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur serveur est survenue.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH — MODIFIER UN UTILISATEUR
   ========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    const {
      error: authError,
      user: requester,
      profile: requesterProfile,
    } =
      await getAuthenticatedRequester();

    if (
      authError ||
      !requester ||
      !requesterProfile
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            authError ||
            "Session utilisateur invalide.",
        },
        { status: 401 }
      );
    }

    if (
      !canManageUsers(
        requesterProfile.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous n'avez pas l'autorisation de modifier les utilisateurs.",
        },
        { status: 403 }
      );
    }

    if (
      !requesterProfile.pharmacy_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Votre compte n'est associé à aucune pharmacie.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json();

    /*
     * Le frontend peut envoyer user_id ou id.
     * On accepte les deux pour garder la compatibilité
     * avec ton interface actuelle.
     */

    const targetId =
      cleanText(
        body.user_id ||
          body.id
      );

    if (!targetId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant utilisateur manquant.",
        },
        { status: 400 }
      );
    }

    /*
     * Un responsable ne modifie pas son propre compte
     * depuis cette interface.
     */

    if (
      targetId ===
      requester.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous ne pouvez pas modifier votre propre compte depuis cette interface.",
        },
        { status: 400 }
      );
    }

    const admin =
      getAdminClient();

    /* -----------------------------------------------------
       Vérifier la cible
       ----------------------------------------------------- */

    const {
      data: targetProfile,
      error: targetError,
    } =
      await admin
        .from("profiles")
        .select(
          "id, full_name, phone, role, pharmacy_id"
        )
        .eq(
          "id",
          targetId
        )
        .maybeSingle();

    if (targetError) {
      console.error(
        "Erreur récupération utilisateur cible:",
        targetError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de vérifier l'utilisateur.",
        },
        { status: 500 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Utilisateur introuvable.",
        },
        { status: 404 }
      );
    }

    /* -----------------------------------------------------
       ISOLATION MULTI-TENANT
       ----------------------------------------------------- */

    if (
      targetProfile.pharmacy_id !==
      requesterProfile.pharmacy_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Accès refusé à cet utilisateur.",
        },
        { status: 403 }
      );
    }

    /* -----------------------------------------------------
       Protection du propriétaire
       ----------------------------------------------------- */

    if (
      targetProfile.role ===
      "owner"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le compte propriétaire ne peut pas être modifié depuis cette interface.",
        },
        { status: 403 }
      );
    }

    /* -----------------------------------------------------
       Vérification des droits sur la cible
       ----------------------------------------------------- */

    if (
      !canManageTargetRole(
        requesterProfile.role,
        targetProfile.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous n'avez pas les droits nécessaires pour modifier cet utilisateur.",
        },
        { status: 403 }
      );
    }

    /* -----------------------------------------------------
       Nouveau rôle
       ----------------------------------------------------- */

    const newRole =
      body.role !== undefined
        ? cleanText(
            body.role
          ).toLowerCase()
        : String(
            targetProfile.role ||
              "employee"
          ).toLowerCase();

    if (
      newRole === "owner"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le rôle propriétaire ne peut pas être attribué à un employé.",
        },
        { status: 400 }
      );
    }

    if (
      !isAllowedRole(
        newRole
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le rôle sélectionné est invalide.",
        },
        { status: 400 }
      );
    }

    /*
     * Un admin ne peut pas créer/attribuer/modifier
     * le rôle admin.
     */

    if (
      newRole === "admin" &&
      requesterProfile.role !==
        "owner"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Seul le propriétaire peut attribuer le rôle administrateur.",
        },
        { status: 403 }
      );
    }

    /* -----------------------------------------------------
       Données
       ----------------------------------------------------- */

    const full_name =
      body.full_name !==
      undefined
        ? cleanText(
            body.full_name
          )
        : targetProfile.full_name ||
          "";

    const phone =
      body.phone !== undefined
        ? cleanText(
            body.phone
          )
        : targetProfile.phone ||
          "";

    const email =
      body.email !== undefined
        ? normalizeEmail(
            body.email
          )
        : "";

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    const isActive =
      typeof body.is_active ===
      "boolean"
        ? body.is_active
        : undefined;

    /* -----------------------------------------------------
       Validation
       ----------------------------------------------------- */

    if (!full_name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom complet est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (
      body.email !==
      undefined
    ) {
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error:
              "L'adresse email est obligatoire.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidEmail(email)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "L'adresse email n'est pas valide.",
          },
          { status: 400 }
        );
      }
    }

    if (
      password &&
      password.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nouveau mot de passe doit contenir au moins 8 caractères.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       Langue de la pharmacie
       ----------------------------------------------------- */

    const {
      data: pharmacy,
      error: pharmacyError,
    } =
      await admin
        .from("pharmacies")
        .select(
          "id, language"
        )
        .eq(
          "id",
          requesterProfile.pharmacy_id
        )
        .maybeSingle();

    if (pharmacyError) {
      console.error(
        "Erreur récupération pharmacie:",
        pharmacyError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer la langue de la pharmacie.",
        },
        { status: 500 }
      );
    }

    if (!pharmacy) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pharmacie introuvable.",
        },
        { status: 404 }
      );
    }

    /*
     * La langue est toujours héritée de la pharmacie.
     */

    const pharmacyLanguage =
      normalizeLanguage(
        pharmacy.language
      );

    /* -----------------------------------------------------
       Mise à jour Auth
       ----------------------------------------------------- */

    const authUpdates: any = {
      user_metadata: {
        full_name,

        phone,

        pharmacy_language:
          pharmacyLanguage,
      },

      app_metadata: {
        pharmacy_id:
          requesterProfile.pharmacy_id,

        role: newRole,

        pharmacy_language:
          pharmacyLanguage,
      },
    };

    /*
     * On ne modifie l'email que s'il a été envoyé.
     */

    if (
      body.email !==
      undefined
    ) {
      authUpdates.email =
        email;

      authUpdates.email_confirm =
        true;
    }

    /*
     * Mot de passe uniquement s'il a été renseigné.
     */

    if (password) {
      authUpdates.password =
        password;
    }

    /*
     * Activation / désactivation.
     *
     * profiles ne possède pas is_active.
     * On utilise donc Supabase Auth.
     */

    if (
      isActive !==
      undefined
    ) {
      authUpdates.ban_duration =
        isActive
          ? "none"
          : "876000h";
    }

    const {
      error: authUpdateError,
    } =
      await admin.auth.admin.updateUserById(
        targetId,
        authUpdates
      );

    if (authUpdateError) {
      console.error(
        "Erreur modification Auth:",
        authUpdateError
      );

      let message =
        authUpdateError.message ||
        "Impossible de modifier le compte.";

      if (
        message
          .toLowerCase()
          .includes(
            "already registered"
          )
      ) {
        message =
          "Cette adresse email est déjà utilisée.";
      }

      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       Mise à jour Profile
       ----------------------------------------------------- */

    const {
      error: profileUpdateError,
    } =
      await admin
        .from("profiles")
        .update(
          {
            full_name,

            phone:
              phone || null,

            role:
              newRole,

            updated_at:
              new Date().toISOString(),
          }
        )
        .eq(
          "id",
          targetId
        )
        .eq(
          "pharmacy_id",
          requesterProfile.pharmacy_id
        );

    if (
      profileUpdateError
    ) {
      console.error(
        "Erreur modification profil:",
        profileUpdateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Le compte Auth a été modifié mais le profil n'a pas pu être mis à jour.",
        },
        { status: 500 }
      );
    }

    /* -----------------------------------------------------
       Réponse
       ----------------------------------------------------- */

    return NextResponse.json({
      success: true,

      message:
        pharmacyLanguage === "en"
          ? "User updated successfully."
          : "Utilisateur modifié avec succès.",

      user: {
        id: targetId,

        full_name,

        phone,

        email:
          body.email !==
          undefined
            ? email
            : null,

        role:
          newRole,

        pharmacy_id:
          requesterProfile.pharmacy_id,

        language:
          pharmacyLanguage,

        is_active:
          isActive,
      },

      pharmacyLanguage,
    });
  } catch (error: any) {
    console.error(
      "PATCH /api/utilisateurs:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Une erreur serveur est survenue.",
      },
      { status: 500 }
    );
  }
}