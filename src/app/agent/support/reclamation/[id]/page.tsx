import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Reclamation = {
  id: string;
  reference: string;
  pharmacy_id: string | null;
  client_user_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  subject: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

type Pharmacy = {
  id: string;
  name: string | null;
  address: string | null;
  country_code: string | null;
  city: string | null;
  status: string | null;
};

type ClientProfile = {
  id: string;
  pharmacy_id: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
};

type ClientInfo = {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
};

type ReclamationStatus =
  | "new"
  | "open"
  | "pending"
  | "in_progress"
  | "resolved"
  | "closed";

type ReclamationPriority =
  | "low"
  | "normal"
  | "medium"
  | "high"
  | "urgent"
  | "critical";

/*
|--------------------------------------------------------------------------
| CONSTANTES
|--------------------------------------------------------------------------
*/

const STATUSES: ReclamationStatus[] = [
  "new",
  "open",
  "pending",
  "in_progress",
  "resolved",
  "closed",
];

const PRIORITIES: ReclamationPriority[] = [
  "low",
  "normal",
  "medium",
  "high",
  "urgent",
  "critical",
];

/*
|--------------------------------------------------------------------------
| LABELS
|--------------------------------------------------------------------------
*/

const STATUS_LABELS: Record<
  string,
  string
> = {
  new: "Nouvelle",
  open: "Ouverte",
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolue",
  closed: "Fermée",
};

const PRIORITY_LABELS: Record<
  string,
  string
> = {
  low: "Faible",
  normal: "Normale",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
  critical: "Critique",
};

/*
|--------------------------------------------------------------------------
| OUTILS
|--------------------------------------------------------------------------
*/

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function statusLabel(
  status: string,
) {
  return (
    STATUS_LABELS[status] ??
    status
  );
}

function priorityLabel(
  priority: string,
) {
  return (
    PRIORITY_LABELS[priority] ??
    priority
  );
}

function statusClass(
  status: string,
) {
  switch (status) {
    case "new":
      return "status new";

    case "open":
      return "status open";

    case "pending":
      return "status pending";

    case "in_progress":
      return "status progress";

    case "resolved":
      return "status resolved";

    case "closed":
      return "status closed";

    default:
      return "status open";
  }
}

function priorityClass(
  priority: string,
) {
  switch (priority) {
    case "critical":
    case "urgent":
      return "priority danger";

    case "high":
      return "priority high";

    case "medium":
      return "priority medium";

    case "low":
      return "priority low";

    default:
      return "priority normal";
  }
}

/*
|--------------------------------------------------------------------------
| NOM CLIENT
|--------------------------------------------------------------------------
|
| On essaie plusieurs champs possibles dans user_metadata
| sans supposer qu'un seul champ existe.
|--------------------------------------------------------------------------
*/

function extractUserName(
  user: AuthUser | null,
) {
  if (!user) {
    return null;
  }

  const metadata =
    user.user_metadata ?? {};

  const possibleNames = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
    metadata.fullName,
  ];

  for (const value of possibleNames) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  const firstName =
    typeof metadata.first_name ===
    "string"
      ? metadata.first_name.trim()
      : "";

  const lastName =
    typeof metadata.last_name ===
    "string"
      ? metadata.last_name.trim()
      : "";

  const combined = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return combined || null;
}

/*
|--------------------------------------------------------------------------
| SAUVEGARDER LA RÉPONSE ADMIN
|--------------------------------------------------------------------------
*/

async function saveAdminReply(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const reply = String(
    formData.get("admin_reply") ?? "",
  ).trim();

  if (!reply) {
    throw new Error(
      "La réponse ne peut pas être vide.",
    );
  }

  if (reply.length > 10000) {
    throw new Error(
      "La réponse est trop longue.",
    );
  }

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("reclamations")
      .update({
        admin_reply: reply,
        status: "in_progress",
        updated_at: now,
      })
      .eq("id", reclamationId);

  if (error) {
    console.error(
      "Save reclamation reply error:",
      error,
    );

    throw new Error(
      "Impossible d'enregistrer la réponse.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/*
|--------------------------------------------------------------------------
| RÉSOUDRE LA RÉCLAMATION
|--------------------------------------------------------------------------
*/

async function resolveReclamation(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const resolution = String(
    formData.get("resolution") ?? "",
  ).trim();

  if (!resolution) {
    throw new Error(
      "La résolution est obligatoire.",
    );
  }

  if (resolution.length > 10000) {
    throw new Error(
      "La résolution est trop longue.",
    );
  }

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("reclamations")
      .update({
        resolution,
        status: "resolved",
        resolved_at: now,
        updated_at: now,
      })
      .eq("id", reclamationId);

  if (error) {
    console.error(
      "Resolve reclamation error:",
      error,
    );

    throw new Error(
      "Impossible de résoudre la réclamation.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/*
|--------------------------------------------------------------------------
| FERMER LA RÉCLAMATION
|--------------------------------------------------------------------------
*/

async function closeReclamation(
  reclamationId: string,
) {
  "use server";

  await requireAgent();

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("reclamations")
      .update({
        status: "closed",
        closed_at: now,
        updated_at: now,
      })
      .eq("id", reclamationId);

  if (error) {
    console.error(
      "Close reclamation error:",
      error,
    );

    throw new Error(
      "Impossible de fermer la réclamation.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/*
|--------------------------------------------------------------------------
| MODIFIER LE STATUT
|--------------------------------------------------------------------------
*/

async function updateReclamationStatus(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const rawStatus =
    String(
      formData.get("status") ?? "",
    ).trim();

  if (
    !STATUSES.includes(
      rawStatus as ReclamationStatus,
    )
  ) {
    throw new Error(
      "Statut de réclamation invalide.",
    );
  }

  const status =
    rawStatus as ReclamationStatus;

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const updateData: Record<
    string,
    unknown
  > = {
    status,
    updated_at: now,
  };

  if (status === "resolved") {
    updateData.resolved_at = now;
  }

  if (status === "closed") {
    updateData.closed_at = now;
  }

  const { error } =
    await supabase
      .from("reclamations")
      .update(updateData)
      .eq("id", reclamationId);

  if (error) {
    console.error(
      "Update reclamation status error:",
      error,
    );

    throw new Error(
      "Impossible de modifier le statut.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/*
|--------------------------------------------------------------------------
| MODIFIER LA PRIORITÉ
|--------------------------------------------------------------------------
*/

async function updateReclamationPriority(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const rawPriority =
    String(
      formData.get("priority") ?? "",
    ).trim();

  if (
    !PRIORITIES.includes(
      rawPriority as ReclamationPriority,
    )
  ) {
    throw new Error(
      "Priorité de réclamation invalide.",
    );
  }

  const priority =
    rawPriority as ReclamationPriority;

  const supabase =
    createAdminClient();

  const { error } =
    await supabase
      .from("reclamations")
      .update({
        priority,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", reclamationId);

  if (error) {
    console.error(
      "Update reclamation priority error:",
      error,
    );

    throw new Error(
      "Impossible de modifier la priorité.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default async function ReclamationDetailPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  /*
   * IMPORTANT :
   * requireAgent() retourne directement le membre.
   */
  await requireAgent();

  const supabase =
    createAdminClient();

  /*
   * ==========================================================
   * 1. RÉCUPÉRER LA RÉCLAMATION
   * ==========================================================
   */

  const {
    data: reclamation,
    error: reclamationError,
  } = await supabase
    .from("reclamations")
    .select(
      `
        id,
        reference,
        pharmacy_id,
        client_user_id,
        client_name,
        client_phone,
        client_email,
        subject,
        status,
        priority,
        admin_reply,
        resolution,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (reclamationError) {
    console.error(
      "Reclamation detail error:",
      reclamationError,
    );
  }

  if (!reclamation) {
    notFound();
  }

  const reclamationData =
    reclamation as Reclamation;

  /*
   * ==========================================================
   * 2. RÉCUPÉRER LE COMPTE AUTH DU CLIENT
   * ==========================================================
   */

  let authUser:
    | AuthUser
    | null = null;

  if (
    reclamationData.client_user_id
  ) {
    const {
      data: authResult,
      error: authError,
    } =
      await supabase.auth.admin.getUserById(
        reclamationData.client_user_id,
      );

    if (authError) {
      console.error(
        "Get client auth user error:",
        authError,
      );
    } else if (authResult?.user) {
      authUser =
        authResult.user as AuthUser;
    }
  }

  /*
   * ==========================================================
   * 3. RÉCUPÉRER LE PROFIL
   * ==========================================================
   *
   * On ne demande ici que pharmacy_id,
   * qui fait partie de la structure utilisée
   * par l'espace PharmaFlow.
   */

  let profile:
    | ClientProfile
    | null = null;

  if (
    reclamationData.client_user_id
  ) {
    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, pharmacy_id",
      )
      .eq(
        "id",
        reclamationData.client_user_id,
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "Get client profile error:",
        profileError,
      );
    } else if (profileData) {
      profile =
        profileData as ClientProfile;
    }
  }

  /*
   * ==========================================================
   * 4. DÉTERMINER LE PHARMACY ID RÉEL
   * ==========================================================
   */

  const pharmacyId =
    reclamationData.pharmacy_id ??
    profile?.pharmacy_id ??
    null;

  /*
   * ==========================================================
   * 5. RÉCUPÉRER LA PHARMACIE
   * ==========================================================
   */

  let pharmacy:
    | Pharmacy
    | null = null;

  if (pharmacyId) {
    const {
      data: pharmacyData,
      error: pharmacyError,
    } = await supabase
      .from("pharmacies")
      .select(
        `
          id,
          name,
          address,
          country_code,
          city,
          status
        `,
      )
      .eq(
        "id",
        pharmacyId,
      )
      .maybeSingle();

    if (pharmacyError) {
      console.error(
        "Get pharmacy error:",
        pharmacyError,
      );
    } else if (pharmacyData) {
      pharmacy =
        pharmacyData as Pharmacy;
    }
  }

  /*
   * ==========================================================
   * 6. CONSTRUIRE LES INFORMATIONS CLIENT
   * ==========================================================
   */

  const authName =
    extractUserName(authUser);

  const clientName =
    reclamationData.client_name?.trim() ||
    authName ||
    (authUser?.email
      ? authUser.email.split("@")[0]
      : null) ||
    "Client non renseigné";

  const clientEmail =
    reclamationData.client_email?.trim() ||
    authUser?.email ||
    null;

  const clientPhone =
    reclamationData.client_phone?.trim() ||
    authUser?.phone ||
    null;

  const client: ClientInfo = {
    id:
      reclamationData.client_user_id,
    name: clientName,
    email: clientEmail,
    phone: clientPhone,
  };

  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <main className="reclamation-page">

      <div className="page-shell">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="page-header">

          <div className="header-left">

            <Link
              href="/agent/support"
              className="back-button"
              aria-label="Retour au support"
            >
              ←
            </Link>

            <div>

              <div className="eyebrow">
                CENTRE DE SUPPORT
              </div>

              <h1>
                {reclamationData.reference}
              </h1>

              <p>
                Gestion de la réclamation
                client et suivi de résolution.
              </p>

            </div>

          </div>

          <Link
            href="/agent"
            className="agent-button"
          >
            👤 Espace Agent
          </Link>

        </header>

        {/* ====================================================
            BARRE DE STATUT
        ==================================================== */}

        <section className="status-bar">

          <div className="status-group">

            <span
              className={statusClass(
                reclamationData.status,
              )}
            >
              {statusLabel(
                reclamationData.status,
              )}
            </span>

            <span
              className={priorityClass(
                reclamationData.priority,
              )}
            >
              {priorityLabel(
                reclamationData.priority,
              )}
            </span>

          </div>

          <div className="status-date">

            Dernière modification :

            <strong>
              {formatDate(
                reclamationData.updated_at,
              )}
            </strong>

          </div>

        </section>

        {/* ====================================================
            GRILLE
        ==================================================== */}

        <div className="content-grid">

          {/* ==================================================
              COLONNE PRINCIPALE
          ================================================== */}

          <section className="main-column">

            {/* =================================================
                DEMANDE
            ================================================= */}

            <article className="card">

              <div className="card-header">

                <div>

                  <span className="card-kicker">
                    RÉCLAMATION CLIENT
                  </span>

                  <h2>
                    {reclamationData.subject}
                  </h2>

                </div>

                <div className="reclamation-icon">
                  📋
                </div>

              </div>

              <div className="meta-grid">

                <div className="meta-item">

                  <span>
                    Référence
                  </span>

                  <strong>
                    {reclamationData.reference}
                  </strong>

                </div>

                <div className="meta-item">

                  <span>
                    Créée le
                  </span>

                  <strong>
                    {formatDate(
                      reclamationData.created_at,
                    )}
                  </strong>

                </div>

                <div className="meta-item">

                  <span>
                    Statut
                  </span>

                  <strong>
                    {statusLabel(
                      reclamationData.status,
                    )}
                  </strong>

                </div>

                <div className="meta-item">

                  <span>
                    Priorité
                  </span>

                  <strong>
                    {priorityLabel(
                      reclamationData.priority,
                    )}
                  </strong>

                </div>

              </div>

            </article>

            {/* =================================================
                RÉPONSE
            ================================================= */}

            <article className="card">

              <div className="section-header">

                <div>

                  <span className="card-kicker">
                    RÉPONSE SUPPORT
                  </span>

                  <h2>
                    Répondre au client
                  </h2>

                  <p>
                    Envoyez une réponse officielle
                    depuis PharmaFlow.
                  </p>

                </div>

                <div className="section-icon">
                  💬
                </div>

              </div>

              <form
                action={saveAdminReply.bind(
                  null,
                  reclamationData.id,
                )}
                className="form"
              >

                <label htmlFor="admin_reply">
                  Message
                </label>

                <textarea
                  id="admin_reply"
                  name="admin_reply"
                  rows={8}
                  maxLength={10000}
                  defaultValue={
                    reclamationData.admin_reply ??
                    ""
                  }
                  placeholder="Écrivez votre réponse au client..."
                  required
                />

                <button
                  type="submit"
                  className="primary-button"
                >
                  ✉️ Enregistrer la réponse
                </button>

              </form>

            </article>

            {/* =================================================
                RÉPONSE EXISTANTE
            ================================================= */}

            {reclamationData.admin_reply && (
              <article className="card reply-card">

                <div className="card-title">
                  💬 Dernière réponse envoyée
                </div>

                <div className="reply-content">
                  {
                    reclamationData.admin_reply
                  }
                </div>

              </article>
            )}

            {/* =================================================
                RÉSOLUTION
            ================================================= */}

            <article className="card">

              <div className="section-header">

                <div>

                  <span className="card-kicker">
                    RÉSOLUTION
                  </span>

                  <h2>
                    Résoudre la réclamation
                  </h2>

                  <p>
                    Enregistrez la solution apportée
                    au client.
                  </p>

                </div>

                <div className="section-icon green">
                  ✓
                </div>

              </div>

              {reclamationData.resolution ? (
                <div className="resolution-box">

                  <div className="resolution-label">
                    Solution enregistrée
                  </div>

                  <div className="resolution-text">
                    {
                      reclamationData.resolution
                    }
                  </div>

                  {reclamationData.resolved_at && (
                    <div className="resolution-date">
                      Résolue le{" "}
                      {formatDate(
                        reclamationData.resolved_at,
                      )}
                    </div>
                  )}

                </div>
              ) : (
                <form
                  action={resolveReclamation.bind(
                    null,
                    reclamationData.id,
                  )}
                  className="form"
                >

                  <label htmlFor="resolution">
                    Résolution
                  </label>

                  <textarea
                    id="resolution"
                    name="resolution"
                    rows={7}
                    maxLength={10000}
                    placeholder="Expliquez comment la réclamation a été traitée..."
                    required
                  />

                  <button
                    type="submit"
                    className="success-button"
                  >
                    ✓ Résoudre la réclamation
                  </button>

                </form>
              )}

            </article>

          </section>

          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <aside className="sidebar">

            {/* =================================================
                CLIENT
            ================================================= */}

            <section className="card">

              <div className="card-title">
                👤 Client
              </div>

              <div className="client-profile">

                <div className="avatar">
                  {client.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="client-name">

                  <strong>
                    {client.name}
                  </strong>

                  <span>
                    Client PharmaFlow
                  </span>

                </div>

              </div>

              <div className="info-list">

                <div>

                  <span>
                    Email
                  </span>

                  {client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                    >
                      {client.email}
                    </a>
                  ) : (
                    <strong>
                      Non renseigné
                    </strong>
                  )}

                </div>

                <div>

                  <span>
                    Téléphone
                  </span>

                  {client.phone ? (
                    <a
                      href={`tel:${client.phone}`}
                    >
                      {client.phone}
                    </a>
                  ) : (
                    <strong>
                      Non renseigné
                    </strong>
                  )}

                </div>

                <div>

                  <span>
                    Utilisateur
                  </span>

                  <strong className="uuid">
                    {client.id ??
                      "Non associé"}
                  </strong>

                </div>

              </div>

            </section>

            {/* =================================================
                PHARMACIE
            ================================================= */}

            <section className="card">

              <div className="card-title">
                🏥 Pharmacie
              </div>

              {pharmacy ? (
                <>

                  <div className="pharmacy-profile">

                    <div className="pharmacy-icon">
                      🏥
                    </div>

                    <div>

                      <strong>
                        {pharmacy.name ??
                          "Pharmacie"}
                      </strong>

                      <span>
                        Établissement PharmaFlow
                      </span>

                    </div>

                  </div>

                  <div className="info-list">

                    <div>

                      <span>
                        Adresse
                      </span>

                      <strong>
                        {pharmacy.address ??
                          "Non renseignée"}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Ville
                      </span>

                      <strong>
                        {pharmacy.city ??
                          "Non renseignée"}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Pays
                      </span>

                      <strong>
                        {pharmacy.country_code ??
                          "Non renseigné"}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Statut
                      </span>

                      <strong>
                        {pharmacy.status ??
                          "Non renseigné"}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Pharmacy ID
                      </span>

                      <strong className="uuid">
                        {pharmacy.id}
                      </strong>

                    </div>

                  </div>

                </>
              ) : (
                <div className="not-associated">

                  <div className="not-associated-icon">
                    ⚠️
                  </div>

                  <strong>
                    Pharmacie non associée
                  </strong>

                  <p>
                    Aucun identifiant de pharmacie
                    valide n'a été trouvé pour
                    cette réclamation.
                  </p>

                </div>
              )}

            </section>

            {/* =================================================
                RÉFÉRENCE
            ================================================= */}

            <section className="card">

              <div className="card-title">
                📁 Dossier
              </div>

              <div className="info-list">

                <div>

                  <span>
                    Référence
                  </span>

                  <strong>
                    {reclamationData.reference}
                  </strong>

                </div>

                <div>

                  <span>
                    Créée le
                  </span>

                  <strong>
                    {formatDate(
                      reclamationData.created_at,
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Mise à jour
                  </span>

                  <strong>
                    {formatDate(
                      reclamationData.updated_at,
                    )}
                  </strong>

                </div>

                {reclamationData.closed_at && (
                  <div>

                    <span>
                      Fermée le
                    </span>

                    <strong>
                      {formatDate(
                        reclamationData.closed_at,
                      )}
                    </strong>

                  </div>
                )}

              </div>

            </section>

            {/* =================================================
                STATUT
            ================================================= */}

            <section className="card">

              <div className="card-title">
                🔄 Statut
              </div>

              <form
                action={updateReclamationStatus.bind(
                  null,
                  reclamationData.id,
                )}
                className="side-form"
              >

                <select
                  name="status"
                  defaultValue={
                    reclamationData.status
                  }
                >

                  <option value="new">
                    Nouvelle
                  </option>

                  <option value="open">
                    Ouverte
                  </option>

                  <option value="in_progress">
                    En cours
                  </option>

                  <option value="pending">
                    En attente
                  </option>

                  <option value="resolved">
                    Résolue
                  </option>

                  <option value="closed">
                    Fermée
                  </option>

                </select>

                <button
                  type="submit"
                  className="secondary-button"
                >
                  Modifier le statut
                </button>

              </form>

            </section>

            {/* =================================================
                PRIORITÉ
            ================================================= */}

            <section className="card">

              <div className="card-title">
                🚨 Priorité
              </div>

              <form
                action={updateReclamationPriority.bind(
                  null,
                  reclamationData.id,
                )}
                className="side-form"
              >

                <select
                  name="priority"
                  defaultValue={
                    reclamationData.priority
                  }
                >

                  <option value="low">
                    Faible
                  </option>

                  <option value="normal">
                    Normale
                  </option>

                  <option value="medium">
                    Moyenne
                  </option>

                  <option value="high">
                    Haute
                  </option>

                  <option value="urgent">
                    Urgente
                  </option>

                  <option value="critical">
                    Critique
                  </option>

                </select>

                <button
                  type="submit"
                  className="secondary-button"
                >
                  Modifier la priorité
                </button>

              </form>

            </section>

            {/* =================================================
                CONTACT
            ================================================= */}

            <section className="card">

              <div className="card-title">
                ⚡ Contact
              </div>

              {client.email && (
                <a
                  href={`mailto:${client.email}?subject=Re: ${reclamationData.subject}`}
                  className="contact-button email"
                >
                  ✉️ Envoyer un email
                </a>
              )}

              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="contact-button phone"
                >
                  📞 Appeler le client
                </a>
              )}

              {client.phone && (
                <a
                  href={`https://wa.me/${client.phone.replace(
                    /[^0-9]/g,
                    "",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-button whatsapp"
                >
                  💬 WhatsApp
                </a>
              )}

              {!client.email &&
                !client.phone && (
                  <div className="no-contact">
                    Aucun moyen de contact
                    renseigné.
                  </div>
                )}

            </section>

            {/* =================================================
                ACTIONS RAPIDES
            ================================================= */}

            <section className="card">

              <div className="card-title">
                ⚡ Actions rapides
              </div>

              <div className="quick-actions">

                {!["resolved", "closed"].includes(
                  reclamationData.status,
                ) && (
                  <form
                    action={resolveReclamation.bind(
                      null,
                      reclamationData.id,
                    )}
                  >

                    <input
                      type="hidden"
                      name="resolution"
                      value="Réclamation traitée par le support PharmaFlow."
                    />

                    <button
                      type="submit"
                      className="quick-button success"
                    >
                      ✓ Marquer comme résolue
                    </button>

                  </form>
                )}

                {reclamationData.status !==
                  "closed" && (
                  <form
                    action={closeReclamation.bind(
                      null,
                      reclamationData.id,
                    )}
                  >

                    <button
                      type="submit"
                      className="quick-button close"
                    >
                      🔒 Fermer le dossier
                    </button>

                  </form>
                )}

              </div>

            </section>

          </aside>

        </div>
      </div>

      {/* ======================================================
          STYLE
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .reclamation-page {
          min-height: 100vh;
          padding: 28px;
          background:
            radial-gradient(
              circle at top right,
              rgba(20,184,166,.10),
              transparent 30%
            ),
            #f7fafb;
          color: #173737;
        }

        .page-shell {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        /* ======================================================
           HEADER
        ====================================================== */

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 22px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .back-button {
          width: 48px;
          height: 48px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #dcebea;
          color: #0f766e;
          text-decoration: none;
          font-size: 24px;
          transition: all .2s ease;
        }

        .back-button:hover {
          background: #eaf8f5;
          transform: translateX(-2px);
        }

        .eyebrow,
        .card-kicker {
          color: #0f8b80;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .page-header h1 {
          margin: 4px 0;
          color: #173b3b;
          font-size: 28px;
          line-height: 1.2;
        }

        .page-header p {
          margin: 0;
          color: #718181;
          font-size: 14px;
        }

        .agent-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 12px;
          background: #0f766e;
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          white-space: nowrap;
          transition: all .2s ease;
        }

        .agent-button:hover {
          background: #0b625c;
          transform: translateY(-1px);
        }

        /* ======================================================
           STATUS
        ====================================================== */

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          padding: 14px 18px;
          background: #fff;
          border: 1px solid #dcebea;
          border-radius: 16px;
        }

        .status-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status,
        .priority {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }

        .status.new {
          background: #f0ecff;
          color: #6d28d9;
        }

        .status.open {
          background: #e8f5ff;
          color: #0369a1;
        }

        .status.pending {
          background: #fff7df;
          color: #a16207;
        }

        .status.progress {
          background: #e9f8f5;
          color: #0f766e;
        }

        .status.resolved {
          background: #eaf8ed;
          color: #15803d;
        }

        .status.closed {
          background: #edf0f2;
          color: #475569;
        }

        .priority.low {
          background: #f1f5f9;
          color: #64748b;
        }

        .priority.normal {
          background: #eef2f3;
          color: #475569;
        }

        .priority.medium {
          background: #fff7df;
          color: #a16207;
        }

        .priority.high {
          background: #fff0e8;
          color: #c2410c;
        }

        .priority.danger {
          background: #feecec;
          color: #b91c1c;
        }

        .status-date {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #738383;
          font-size: 12px;
        }

        .status-date strong {
          color: #405858;
        }

        /* ======================================================
           LAYOUT
        ====================================================== */

        .content-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            350px;
          gap: 20px;
          align-items: start;
        }

        .main-column,
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        /* ======================================================
           CARD
        ====================================================== */

        .card {
          padding: 22px;
          background: #fff;
          border: 1px solid #dcebea;
          border-radius: 18px;
          box-shadow:
            0 10px 30px
            rgba(15,118,110,.045);
        }

        .card-header,
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 20px;
        }

        .card-header h2,
        .section-header h2 {
          margin: 5px 0 0;
          color: #173b3b;
          font-size: 20px;
          line-height: 1.3;
        }

        .section-header p {
          margin: 7px 0 0;
          color: #718181;
          font-size: 13px;
          line-height: 1.5;
        }

        .reclamation-icon,
        .section-icon {
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #e8f7f5;
          font-size: 21px;
        }

        .section-icon.green {
          background: #eaf8ed;
          color: #15803d;
        }

        /* ======================================================
           META
        ====================================================== */

        .meta-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .meta-item {
          min-width: 0;
          padding: 14px;
          border-radius: 12px;
          background: #f7faf9;
        }

        .meta-item span,
        .info-list span {
          display: block;
          margin-bottom: 5px;
          color: #738383;
          font-size: 11px;
        }

        .meta-item strong,
        .info-list strong {
          display: block;
          color: #284545;
          font-size: 13px;
          word-break: break-word;
        }

        /* ======================================================
           FORM
        ====================================================== */

        .form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form label {
          color: #344d4c;
          font-size: 13px;
          font-weight: 800;
        }

        .form textarea {
          width: 100%;
          min-height: 150px;
          padding: 14px;
          resize: vertical;
          border: 1px solid #d8e5e4;
          border-radius: 13px;
          outline: none;
          background: #fbfdfd;
          color: #203a39;
          font: inherit;
          line-height: 1.55;
          transition: all .2s ease;
        }

        .form textarea:focus {
          border-color: #0f766e;
          background: #fff;
          box-shadow:
            0 0 0 3px
            rgba(15,118,110,.10);
        }

        .primary-button,
        .success-button,
        .secondary-button {
          border: 0;
          border-radius: 11px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          transition: all .2s ease;
        }

        .primary-button {
          padding: 13px 16px;
          background: #0f766e;
          color: #fff;
        }

        .primary-button:hover {
          background: #0b625c;
          transform: translateY(-1px);
        }

        .success-button {
          padding: 13px 16px;
          background: #15803d;
          color: #fff;
        }

        .success-button:hover {
          background: #126b34;
        }

        /* ======================================================
           RÉPONSE
        ====================================================== */

        .reply-card {
          border-left: 4px solid #0f766e;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #294141;
          font-size: 14px;
          font-weight: 800;
        }

        .reply-content {
          padding: 16px;
          border-radius: 12px;
          background: #eef8f7;
          color: #294141;
          white-space: pre-wrap;
          line-height: 1.65;
          font-size: 14px;
        }

        .resolution-box {
          padding: 17px;
          border-radius: 13px;
          background: #eef8ef;
          border: 1px solid #d8eddb;
        }

        .resolution-label {
          margin-bottom: 8px;
          color: #15803d;
          font-size: 12px;
          font-weight: 900;
        }

        .resolution-text {
          color: #294141;
          white-space: pre-wrap;
          line-height: 1.65;
          font-size: 14px;
        }

        .resolution-date {
          margin-top: 14px;
          color: #718181;
          font-size: 11px;
        }

        /* ======================================================
           CLIENT
        ====================================================== */

        .client-profile,
        .pharmacy-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 17px;
          border-bottom: 1px solid #edf1f1;
        }

        .avatar {
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #0f766e;
          color: #fff;
          font-size: 17px;
          font-weight: 900;
        }

        .pharmacy-icon {
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #eaf5ff;
          font-size: 22px;
        }

        .client-name strong,
        .client-name span,
        .pharmacy-profile strong,
        .pharmacy-profile span {
          display: block;
        }

        .client-name strong,
        .pharmacy-profile strong {
          color: #263f3f;
          font-size: 14px;
        }

        .client-name span,
        .pharmacy-profile span {
          margin-top: 3px;
          color: #788888;
          font-size: 11px;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 17px;
        }

        .info-list > div {
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f3f3;
        }

        .info-list > div:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .info-list a {
          color: #0f766e;
          font-size: 13px;
          text-decoration: none;
          word-break: break-word;
        }

        .info-list a:hover {
          text-decoration: underline;
        }

        .uuid {
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;
          font-size: 11px !important;
          line-height: 1.5;
        }

        /* ======================================================
           PHARMACIE NON ASSOCIÉE
        ====================================================== */

        .not-associated {
          padding: 17px;
          border-radius: 13px;
          background: #fffaf0;
          border: 1px solid #f5e8bd;
        }

        .not-associated-icon {
          margin-bottom: 9px;
          font-size: 22px;
        }

        .not-associated strong {
          display: block;
          color: #8a6200;
          font-size: 13px;
        }

        .not-associated p {
          margin: 7px 0 0;
          color: #897b56;
          font-size: 12px;
          line-height: 1.5;
        }

        /* ======================================================
           FORMULAIRES SIDEBAR
        ====================================================== */

        .side-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .side-form select {
          width: 100%;
          height: 47px;
          padding: 0 13px;
          border: 1px solid #d8e5e4;
          border-radius: 11px;
          background: #fff;
          color: #294141;
          font: inherit;
          outline: none;
        }

        .side-form select:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px
            rgba(15,118,110,.10);
        }

        .secondary-button {
          padding: 12px;
          background: #eef5f4;
          color: #285050;
        }

        .secondary-button:hover {
          background: #e0eeec;
        }

        /* ======================================================
           CONTACT
        ====================================================== */

        .contact-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin-top: 9px;
          padding: 12px;
          border-radius: 11px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: all .2s ease;
        }

        .contact-button.email {
          background: #0f766e;
          color: #fff;
        }

        .contact-button.email:hover {
          background: #0b625c;
        }

        .contact-button.phone {
          background: #eaf5ff;
          color: #0369a1;
        }

        .contact-button.whatsapp {
          background: #eaf8ed;
          color: #15803d;
        }

        .no-contact {
          padding: 13px;
          border-radius: 11px;
          background: #f7f9f9;
          color: #819090;
          font-size: 12px;
          text-align: center;
        }

        /* ======================================================
           ACTIONS RAPIDES
        ====================================================== */

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .quick-actions form {
          width: 100%;
        }

        .quick-button {
          width: 100%;
          padding: 12px;
          border: 0;
          border-radius: 11px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
        }

        .quick-button.success {
          background: #eaf8ed;
          color: #15803d;
        }

        .quick-button.close {
          background: #eef1f2;
          color: #475569;
        }

        /* ======================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 1100px) {

          .content-grid {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            align-items: start;
          }

        }

        @media (max-width: 800px) {

          .reclamation-page {
            padding: 18px;
          }

          .page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .agent-button {
            width: 100%;
          }

          .status-bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .meta-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

        }

        @media (max-width: 650px) {

          .sidebar {
            grid-template-columns: 1fr;
          }

          .meta-grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 17px;
            border-radius: 15px;
          }

          .page-header h1 {
            font-size: 23px;
          }

          .page-header p {
            font-size: 12px;
          }

          .status-date {
            flex-wrap: wrap;
          }

        }

      `}</style>

    </main>
  );
}