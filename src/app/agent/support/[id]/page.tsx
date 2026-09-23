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

type SupportCase = {
  id: string;
  case_number: string | null;
  pharmacy_id: string | null;
  user_id: string | null;
  category: string | null;
  subject: string | null;
  description: string | null;
  priority: string | null;
  status: string | null;
  subscription_id: string | null;
  transaction_id: string | null;
  ai_analysis: string | null;
  ai_recommendation: string | null;
  ai_confidence: number | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupportIntervention = {
  id: string;
  case_id: string | null;
  token: string | null;
  intervention_type: string | null;
  status: string | null;
  requested_by: string | null;
  approved_by: string | null;
  expires_at: string | null;
  approved_at: string | null;
  executed_at: string | null;
  execution_result: string | null;
  reason: string | null;
  created_at: string | null;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function hasPermission(
  permissions: Record<string, boolean>,
  permission: string,
) {
  return permissions?.[permission] === true;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status: string | null) {
  switch (status) {
    case "new":
      return "Nouvelle";

    case "open":
      return "Ouverte";

    case "in_progress":
      return "En cours";

    case "pending":
      return "En attente";

    case "resolved":
      return "Résolue";

    case "closed":
      return "Fermée";

    default:
      return status || "Inconnue";
  }
}

function categoryLabel(category: string | null) {
  switch (category) {
    case "technical":
      return "Technique";

    case "payment":
      return "Paiement";

    case "subscription":
      return "Abonnement";

    case "account":
      return "Compte";

    case "pharmacy":
      return "Pharmacie";

    case "security":
      return "Sécurité";

    case "general":
      return "Général";

    default:
      return category || "Général";
  }
}

function priorityLabel(priority: string | null) {
  switch (priority) {
    case "urgent":
      return "Urgente";

    case "high":
      return "Haute";

    case "medium":
      return "Moyenne";

    case "low":
      return "Faible";

    default:
      return priority || "Normale";
  }
}

/*
|--------------------------------------------------------------------------
| ACTION : CHANGER LE STATUT
|--------------------------------------------------------------------------
*/

async function updateSupportStatus(
  caseId: string,
  formData: FormData,
) {
  "use server";

  const member = await requireAgent();

  const permissions =
    member.permissions ?? {};

  if (
    !hasPermission(
      permissions,
      "support.manage",
    )
  ) {
    throw new Error(
      "Permission support.manage requise.",
    );
  }

  const status =
    String(
      formData.get("status") || "",
    ).trim();

  const allowedStatuses = [
    "new",
    "open",
    "in_progress",
    "pending",
    "resolved",
    "closed",
  ];

  if (
    !allowedStatuses.includes(status)
  ) {
    throw new Error(
      "Statut de support invalide.",
    );
  }

  const supabase =
    createAdminClient();

  const updateData: Record<
    string,
    string | null
  > = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (
    status === "resolved" ||
    status === "closed"
  ) {
    updateData.resolved_by =
      member.id;

    updateData.resolved_at =
      new Date().toISOString();
  }

  if (
    status !== "resolved" &&
    status !== "closed"
  ) {
    updateData.resolved_by = null;
    updateData.resolved_at = null;
  }

  const { error } =
    await supabase
      .from("support_cases")
      .update(updateData)
      .eq("id", caseId);

  if (error) {
    throw new Error(
      `Impossible de modifier le statut : ${error.message}`,
    );
  }

  revalidatePath(
    `/agent/support/${caseId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/${caseId}`,
  );
}

/*
|--------------------------------------------------------------------------
| ACTION : AJOUTER UNE NOTE DE RÉSOLUTION
|--------------------------------------------------------------------------
*/

async function saveResolution(
  caseId: string,
  formData: FormData,
) {
  "use server";

  const member = await requireAgent();

  const permissions =
    member.permissions ?? {};

  if (
    !hasPermission(
      permissions,
      "support.manage",
    )
  ) {
    throw new Error(
      "Permission support.manage requise.",
    );
  }

  const note =
    String(
      formData.get("resolution_note") ||
        "",
    ).trim();

  if (!note) {
    throw new Error(
      "La note de résolution est obligatoire.",
    );
  }

  const supabase =
    createAdminClient();

  const { error } =
    await supabase
      .from("support_cases")
      .update({
        resolution_note: note,
        resolved_by: member.id,
        resolved_at:
          new Date().toISOString(),
        status: "resolved",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", caseId);

  if (error) {
    throw new Error(
      `Impossible d'enregistrer la résolution : ${error.message}`,
    );
  }

  revalidatePath(
    `/agent/support/${caseId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/${caseId}`,
  );
}

/*
|--------------------------------------------------------------------------
| ACTION : CRÉER UNE INTERVENTION
|--------------------------------------------------------------------------
*/

async function createIntervention(
  caseId: string,
  formData: FormData,
) {
  "use server";

  const member = await requireAgent();

  const permissions =
    member.permissions ?? {};

  if (
    !hasPermission(
      permissions,
      "support.manage",
    )
  ) {
    throw new Error(
      "Permission support.manage requise.",
    );
  }

  const interventionType =
    String(
      formData.get(
        "intervention_type",
      ) || "",
    ).trim();

  const reason =
    String(
      formData.get("reason") || "",
    ).trim();

  if (!interventionType) {
    throw new Error(
      "Le type d'intervention est obligatoire.",
    );
  }

  if (!reason) {
    throw new Error(
      "La raison de l'intervention est obligatoire.",
    );
  }

  const supabase =
    createAdminClient();

  /*
   * On crée d'abord l'intervention
   * comme demande en attente.
   *
   * Le workflow d'approbation/exécution
   * sera branché dans les prochaines étapes.
   */

  const { error } =
    await supabase
      .from("support_interventions")
      .insert({
        case_id: caseId,
        intervention_type:
          interventionType,
        status: "pending",
        requested_by:
          member.id,
        reason,
      });

  if (error) {
    throw new Error(
      `Impossible de créer l'intervention : ${error.message}`,
    );
  }

  /*
   * Passage automatique du dossier
   * en "en cours".
   */

  await supabase
    .from("support_cases")
    .update({
      status: "in_progress",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", caseId);

  revalidatePath(
    `/agent/support/${caseId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/${caseId}`,
  );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default async function AgentSupportCasePage({
  params,
}: PageProps) {
  const { id } = await params;

  const member =
    await requireAgent();

  const permissions =
    member.permissions ?? {};

  const canView =
    hasPermission(
      permissions,
      "support.view",
    );

  const canManage =
    hasPermission(
      permissions,
      "support.manage",
    );

  /*
   * Sécurité
   */

  if (!canView && !canManage) {
    redirect("/agent");
  }

  const supabase =
    createAdminClient();

  /*
   * Récupération du dossier
   */

  const {
    data: supportCase,
    error: caseError,
  } = await supabase
    .from("support_cases")
    .select(`
      id,
      case_number,
      pharmacy_id,
      user_id,
      category,
      subject,
      description,
      priority,
      status,
      subscription_id,
      transaction_id,
      ai_analysis,
      ai_recommendation,
      ai_confidence,
      resolution_note,
      resolved_by,
      resolved_at,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (caseError) {
    return (
      <main className="case-page">
        <div className="case-error">
          <div>
            ⚠️
          </div>

          <h1>
            Erreur lors du chargement
          </h1>

          <p>
            {caseError.message}
          </p>

          <Link
            href="/agent/support"
            className="case-button"
          >
            ← Retour au support
          </Link>
        </div>

        <style>{caseStyles}</style>
      </main>
    );
  }

  if (!supportCase) {
    notFound();
  }

  /*
   * TypeScript :
   * supportCase est maintenant garanti.
   */

  const currentCase =
    supportCase as SupportCase;

  /*
   * Récupération des interventions
   */

  const {
    data: interventions,
  } = await supabase
    .from("support_interventions")
    .select(`
      id,
      case_id,
      token,
      intervention_type,
      status,
      requested_by,
      approved_by,
      expires_at,
      approved_at,
      executed_at,
      execution_result,
      reason,
      created_at
    `)
    .eq("case_id", id)
    .order("created_at", {
      ascending: false,
    });

  const interventionList =
    (interventions ??
      []) as SupportIntervention[];

  /*
   * Statut actuel
   */

  const currentStatus =
    currentCase.status || "new";

  return (
    <main className="case-page">
      {/* ================================================================
          HEADER
      ================================================================ */}

      <header className="case-header">
        <div>
          <Link
            href="/agent/support"
            className="case-back"
          >
            ← Retour aux demandes
          </Link>

          <span className="case-eyebrow">
            CENTRE DE SUPPORT
          </span>

          <h1>
            {currentCase.subject ||
              "Demande de support"}
          </h1>

          <div className="case-number">
            {currentCase.case_number ||
              `Dossier ${currentCase.id.slice(
                0,
                8,
              )}`}
          </div>
        </div>

        <div className="case-agent">
          <div className="case-agent-avatar">
            {member.full_name
              ?.trim()
              .charAt(0)
              .toUpperCase() || "A"}
          </div>

          <div>
            <strong>
              {member.full_name}
            </strong>

            <span>
              Agent Support
            </span>
          </div>
        </div>
      </header>

      <div className="case-container">
        {/* ================================================================
            BARRE DE STATUT
        ================================================================ */}

        <section className="case-status-bar">
          <div>
            <span>
              Statut actuel
            </span>

            <strong>
              {statusLabel(
                currentStatus,
              )}
            </strong>
          </div>

          <div>
            <span>
              Priorité
            </span>

            <strong>
              {priorityLabel(
                currentCase.priority,
              )}
            </strong>
          </div>

          <div>
            <span>
              Catégorie
            </span>

            <strong>
              {categoryLabel(
                currentCase.category,
              )}
            </strong>
          </div>

          <div>
            <span>
              Créée le
            </span>

            <strong>
              {formatDate(
                currentCase.created_at,
              )}
            </strong>
          </div>
        </section>

        <div className="case-grid">
          {/* ==============================================================
              COLONNE PRINCIPALE
          ============================================================== */}

          <div className="case-main">
            {/* ----------------------------------------------------------
                DEMANDE
            ---------------------------------------------------------- */}

            <section className="case-card">
              <div className="case-card-header">
                <div>
                  <span>
                    DEMANDE DE LA PHARMACIE
                  </span>

                  <h2>
                    Détails de la demande
                  </h2>
                </div>
              </div>

              <div className="case-description">
                {currentCase.description ? (
                  <p>
                    {currentCase.description}
                  </p>
                ) : (
                  <p className="muted">
                    Aucune description fournie.
                  </p>
                )}
              </div>

              <div className="case-info-grid">
                <div>
                  <span>
                    ID Pharmacie
                  </span>

                  <strong>
                    {currentCase.pharmacy_id ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    ID Utilisateur
                  </span>

                  <strong>
                    {currentCase.user_id ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Abonnement
                  </span>

                  <strong>
                    {currentCase.subscription_id ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Transaction
                  </span>

                  <strong>
                    {currentCase.transaction_id ||
                      "—"}
                  </strong>
                </div>
              </div>
            </section>

            {/* ----------------------------------------------------------
                ANALYSE IA
            ---------------------------------------------------------- */}

            {(currentCase.ai_analysis ||
              currentCase.ai_recommendation) && (
              <section className="case-card ai-card">
                <div className="case-card-header">
                  <div>
                    <span>
                      INTELLIGENCE ARTIFICIELLE
                    </span>

                    <h2>
                      Analyse du dossier
                    </h2>
                  </div>

                  {currentCase.ai_confidence !==
                    null && (
                    <div className="ai-confidence">
                      Confiance{" "}
                      {Math.round(
                        currentCase.ai_confidence *
                          100,
                      )}
                      %
                    </div>
                  )}
                </div>

                {currentCase.ai_analysis && (
                  <div className="ai-block">
                    <strong>
                      Analyse
                    </strong>

                    <p>
                      {currentCase.ai_analysis}
                    </p>
                  </div>
                )}

                {currentCase.ai_recommendation && (
                  <div className="ai-block recommendation">
                    <strong>
                      Recommandation
                    </strong>

                    <p>
                      {
                        currentCase.ai_recommendation
                      }
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* ----------------------------------------------------------
                INTERVENTIONS
            ---------------------------------------------------------- */}

            <section className="case-card">
              <div className="case-card-header">
                <div>
                  <span>
                    INTERVENTIONS
                  </span>

                  <h2>
                    Historique des interventions
                  </h2>
                </div>

                <span className="case-counter">
                  {interventionList.length}
                </span>
              </div>

              {interventionList.length ===
              0 ? (
                <div className="case-empty-small">
                  <div>
                    🛠️
                  </div>

                  <p>
                    Aucune intervention n'a encore
                    été enregistrée.
                  </p>
                </div>
              ) : (
                <div className="intervention-list">
                  {interventionList.map(
                    (intervention) => (
                      <article
                        key={
                          intervention.id
                        }
                        className="intervention"
                      >
                        <div className="intervention-icon">
                          🛠️
                        </div>

                        <div className="intervention-content">
                          <div className="intervention-top">
                            <strong>
                              {intervention.intervention_type ||
                                "Intervention"}
                            </strong>

                            <span
                              className={`intervention-status intervention-${intervention.status}`}
                            >
                              {intervention.status ||
                                "pending"}
                            </span>
                          </div>

                          <p>
                            {intervention.reason ||
                              "Aucune raison indiquée."}
                          </p>

                          <div className="intervention-meta">
                            <span>
                              Créée le{" "}
                              {formatDate(
                                intervention.created_at,
                              )}
                            </span>

                            {intervention.executed_at ? (
                              <span>
                                Exécutée le{" "}
                                {formatDate(
                                  intervention.executed_at,
                                )}
                              </span>
                            ) : null}
                          </div>

                          {intervention.execution_result ? (
                            <div className="execution-result">
                              <strong>
                                Résultat
                              </strong>

                              <p>
                                {
                                  intervention.execution_result
                                }
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>

            {/* ----------------------------------------------------------
                RÉSOLUTION
            ---------------------------------------------------------- */}

            <section className="case-card">
              <div className="case-card-header">
                <div>
                  <span>
                    RÉSOLUTION
                  </span>

                  <h2>
                    Résolution du dossier
                  </h2>
                </div>
              </div>

              {currentCase.resolution_note ? (
                <div className="resolution-existing">
                  <div className="resolution-check">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Dossier résolu
                    </strong>

                    <p>
                      {
                        currentCase.resolution_note
                      }
                    </p>

                    <span>
                      Résolu le{" "}
                      {formatDate(
                        currentCase.resolved_at,
                      )}
                    </span>
                  </div>
                </div>
              ) : canManage ? (
                <form
                  action={saveResolution.bind(
                    null,
                    currentCase.id,
                  )}
                  className="case-form"
                >
                  <label htmlFor="resolution_note">
                    Note de résolution
                  </label>

                  <textarea
                    id="resolution_note"
                    name="resolution_note"
                    rows={5}
                    placeholder="Expliquez la solution apportée à la pharmacie..."
                    required
                  />

                  <button
                    type="submit"
                    className="case-primary-button"
                  >
                    ✓ Résoudre la demande
                  </button>
                </form>
              ) : (
                <div className="readonly-message">
                  🔐 Votre compte peut consulter ce
                  dossier, mais ne peut pas le
                  modifier.
                </div>
              )}
            </section>
          </div>

          {/* ==============================================================
              COLONNE DROITE
          ============================================================== */}

          <aside className="case-sidebar">
            {/* ----------------------------------------------------------
                STATUT
            ---------------------------------------------------------- */}

            <section className="case-side-card">
              <span className="side-eyebrow">
                GESTION
              </span>

              <h2>
                Statut du dossier
              </h2>

              {canManage ? (
                <form
                  action={updateSupportStatus.bind(
                    null,
                    currentCase.id,
                  )}
                  className="status-form"
                >
                  <select
                    name="status"
                    defaultValue={
                      currentStatus
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
                    className="case-primary-button"
                  >
                    Mettre à jour
                  </button>
                </form>
              ) : (
                <div className="readonly-status">
                  {statusLabel(
                    currentStatus,
                  )}
                </div>
              )}
            </section>

            {/* ----------------------------------------------------------
                NOUVELLE INTERVENTION
            ---------------------------------------------------------- */}

            {canManage ? (
              <section className="case-side-card">
                <span className="side-eyebrow">
                  ACTION
                </span>

                <h2>
                  Nouvelle intervention
                </h2>

                <p className="side-description">
                  Enregistrez une action nécessaire
                  pour traiter cette demande.
                </p>

                <form
                  action={createIntervention.bind(
                    null,
                    currentCase.id,
                  )}
                  className="case-form"
                >
                  <label htmlFor="intervention_type">
                    Type d'intervention
                  </label>

                  <select
                    id="intervention_type"
                    name="intervention_type"
                    defaultValue=""
                    required
                  >
                    <option
                      value=""
                      disabled
                    >
                      Sélectionner
                    </option>

                    <option value="account">
                      Gestion du compte
                    </option>

                    <option value="subscription">
                      Abonnement
                    </option>

                    <option value="payment">
                      Paiement
                    </option>

                    <option value="technical">
                      Assistance technique
                    </option>

                    <option value="pharmacy">
                      Intervention pharmacie
                    </option>

                    <option value="security">
                      Sécurité
                    </option>

                    <option value="other">
                      Autre
                    </option>
                  </select>

                  <label htmlFor="reason">
                    Raison
                  </label>

                  <textarea
                    id="reason"
                    name="reason"
                    rows={4}
                    placeholder="Décrivez l'action à effectuer..."
                    required
                  />

                  <button
                    type="submit"
                    className="case-primary-button"
                  >
                    + Créer l'intervention
                  </button>
                </form>
              </section>
            ) : null}

            {/* ----------------------------------------------------------
                INFORMATIONS
            ---------------------------------------------------------- */}

            <section className="case-side-card">
              <span className="side-eyebrow">
                INFORMATIONS
              </span>

              <h2>
                Dossier
              </h2>

              <div className="side-info">
                <div>
                  <span>
                    Numéro
                  </span>

                  <strong>
                    {currentCase.case_number ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Priorité
                  </span>

                  <strong>
                    {priorityLabel(
                      currentCase.priority,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Catégorie
                  </span>

                  <strong>
                    {categoryLabel(
                      currentCase.category,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Dernière modification
                  </span>

                  <strong>
                    {formatDate(
                      currentCase.updated_at,
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* ----------------------------------------------------------
                PERMISSIONS
            ---------------------------------------------------------- */}

            <section className="case-permission-card">
              <div>
                🔐
              </div>

              <strong>
                Permissions
              </strong>

              <p>
                {canManage
                  ? "Vous pouvez consulter et gérer ce dossier."
                  : "Vous disposez uniquement d'un accès en consultation."}
              </p>

              <div className="permission-list">
                {canView ? (
                  <span>
                    ✓ support.view
                  </span>
                ) : null}

                {canManage ? (
                  <span>
                    ✓ support.manage
                  </span>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <style>{caseStyles}</style>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const caseStyles = `
  .case-page {
    min-height: 100vh;
    background: #f6f8fb;
    color: #172033;
    padding-bottom: 50px;
  }

  .case-header {
    padding: 25px 36px;
    background: #ffffff;
    border-bottom: 1px solid #e5eaf0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 25px;
  }

  .case-back {
    display: inline-flex;
    margin-bottom: 14px;
    color: #0f766e;
    text-decoration: none;
    font-size: 11px;
    font-weight: 800;
  }

  .case-eyebrow,
  .side-eyebrow {
    display: block;
    color: #0f766e;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .case-header h1 {
    max-width: 800px;
    margin: 6px 0 4px;
    color: #172033;
    font-size: 27px;
    line-height: 1.25;
  }

  .case-number {
    color: #8a94a6;
    font-size: 10px;
  }

  .case-agent {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid #e5eaf0;
    background: #f8fafc;
    border-radius: 14px;
  }

  .case-agent-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #e7f5f2;
    color: #0f766e;
    font-size: 13px;
    font-weight: 800;
  }

  .case-agent strong {
    display: block;
    color: #344054;
    font-size: 11px;
  }

  .case-agent span {
    display: block;
    margin-top: 3px;
    color: #8a94a6;
    font-size: 9px;
  }

  .case-container {
    width: min(1180px, calc(100% - 48px));
    margin: 0 auto;
    padding-top: 20px;
  }

  .case-status-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    padding: 14px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 15px;
  }

  .case-status-bar > div {
    min-width: 0;
    padding: 3px 10px;
    border-right: 1px solid #edf0f3;
  }

  .case-status-bar > div:last-child {
    border-right: none;
  }

  .case-status-bar span {
    display: block;
    color: #8a94a6;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: .4px;
  }

  .case-status-bar strong {
    display: block;
    margin-top: 5px;
    color: #344054;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .case-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 17px;
    margin-top: 17px;
    align-items: start;
  }

  .case-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .case-sidebar {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .case-card,
  .case-side-card,
  .case-permission-card {
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 16px;
  }

  .case-card {
    padding: 20px;
  }

  .case-side-card {
    padding: 17px;
  }

  .case-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    padding-bottom: 13px;
    border-bottom: 1px solid #edf0f3;
  }

  .case-card-header span {
    color: #0f766e;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .7px;
  }

  .case-card-header h2 {
    margin: 5px 0 0;
    color: #273142;
    font-size: 16px;
  }

  .case-counter {
    min-width: 25px;
    height: 25px;
    padding: 0 7px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #eef6f5;
    color: #0f766e;
    font-size: 10px !important;
  }

  .case-description {
    padding-top: 15px;
  }

  .case-description p {
    margin: 0;
    color: #526070;
    font-size: 12px;
    line-height: 1.75;
    white-space: pre-wrap;
  }

  .case-description .muted {
    color: #98a2b3;
  }

  .case-info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 17px;
  }

  .case-info-grid > div {
    min-width: 0;
    padding: 11px;
    background: #f8fafc;
    border-radius: 10px;
  }

  .case-info-grid span,
  .side-info span {
    display: block;
    color: #8a94a6;
    font-size: 9px;
    text-transform: uppercase;
  }

  .case-info-grid strong {
    display: block;
    margin-top: 4px;
    color: #475467;
    font-size: 10px;
    word-break: break-all;
  }

  .ai-card {
    background: linear-gradient(
      135deg,
      #ffffff,
      #f5fbfa
    );
  }

  .ai-confidence {
    padding: 6px 8px;
    border-radius: 8px;
    background: #e8f6f3;
    color: #0f766e;
    font-size: 9px;
    font-weight: 800;
  }

  .ai-block {
    margin-top: 14px;
    padding: 13px;
    background: #f8fafc;
    border-radius: 11px;
  }

  .ai-block.recommendation {
    background: #eef8f6;
  }

  .ai-block strong {
    display: block;
    color: #344054;
    font-size: 10px;
  }

  .ai-block p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 11px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  .intervention-list {
    padding-top: 13px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .intervention {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 11px;
  }

  .intervention-icon {
    width: 31px;
    height: 31px;
    flex: 0 0 31px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    background: #eaf6f4;
    font-size: 14px;
  }

  .intervention-content {
    min-width: 0;
    flex: 1;
  }

  .intervention-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .intervention-top strong {
    color: #344054;
    font-size: 11px;
  }

  .intervention-status {
    padding: 4px 7px;
    border-radius: 999px;
    background: #fff7e8;
    color: #a16207;
    font-size: 8px;
    font-weight: 800;
  }

  .intervention-approved,
  .intervention-executed,
  .intervention-completed {
    background: #edf9f0;
    color: #15803d;
  }

  .intervention-rejected,
  .intervention-failed {
    background: #fff0f0;
    color: #dc2626;
  }

  .intervention-content > p {
    margin: 5px 0 0;
    color: #667085;
    font-size: 10px;
    line-height: 1.55;
  }

  .intervention-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 7px;
    color: #98a2b3;
    font-size: 8px;
  }

  .execution-result {
    margin-top: 9px;
    padding: 9px;
    background: #ffffff;
    border: 1px solid #e7ebef;
    border-radius: 8px;
  }

  .execution-result strong {
    color: #475467;
    font-size: 9px;
  }

  .execution-result p {
    margin: 4px 0 0;
    color: #667085;
    font-size: 9px;
    line-height: 1.5;
  }

  .case-empty-small {
    padding: 25px;
    text-align: center;
    color: #98a2b3;
  }

  .case-empty-small div {
    font-size: 25px;
  }

  .case-empty-small p {
    margin: 7px 0 0;
    font-size: 10px;
  }

  .resolution-existing {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 14px;
    padding: 14px;
    background: #edf9f0;
    border-radius: 11px;
  }

  .resolution-check {
    width: 29px;
    height: 29px;
    flex: 0 0 29px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #15803d;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
  }

  .resolution-existing strong {
    display: block;
    color: #166534;
    font-size: 11px;
  }

  .resolution-existing p {
    margin: 5px 0;
    color: #526070;
    font-size: 10px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .resolution-existing span {
    color: #7a8597;
    font-size: 8px;
  }

  .case-side-card h2 {
    margin: 5px 0 14px;
    color: #273142;
    font-size: 15px;
  }

  .side-description {
    margin: -6px 0 13px;
    color: #7a8597;
    font-size: 10px;
    line-height: 1.55;
  }

  .status-form,
  .case-form {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .status-form select,
  .case-form select,
  .case-form textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #dfe5eb;
    border-radius: 9px;
    background: #ffffff;
    color: #344054;
    font-family: inherit;
    font-size: 11px;
    outline: none;
  }

  .status-form select,
  .case-form select {
    height: 39px;
    padding: 0 10px;
  }

  .case-form textarea {
    min-height: 90px;
    padding: 10px;
    resize: vertical;
    line-height: 1.5;
  }

  .case-form select:focus,
  .case-form textarea:focus {
    border-color: #0f766e;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, .08);
  }

  .case-form label {
    margin-top: 3px;
    color: #475467;
    font-size: 9px;
    font-weight: 800;
  }

  .case-primary-button {
    min-height: 39px;
    padding: 0 13px;
    border: 0;
    border-radius: 9px;
    background: #0f766e;
    color: #ffffff;
    font-family: inherit;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .case-primary-button:hover {
    background: #0b625c;
  }

  .readonly-status {
    padding: 11px;
    border-radius: 9px;
    background: #f1f5f9;
    color: #475467;
    font-size: 11px;
    font-weight: 700;
  }

  .readonly-message {
    margin-top: 14px;
    padding: 11px;
    background: #f8fafc;
    border-radius: 9px;
    color: #7a8597;
    font-size: 10px;
    line-height: 1.5;
  }

  .side-info {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .side-info > div {
    padding-bottom: 10px;
    border-bottom: 1px solid #edf0f3;
  }

  .side-info > div:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .side-info strong {
    display: block;
    margin-top: 4px;
    color: #475467;
    font-size: 10px;
    word-break: break-word;
  }

  .case-permission-card {
    padding: 15px;
    background: #f8fafc;
  }

  .case-permission-card > div:first-child {
    font-size: 17px;
  }

  .case-permission-card > strong {
    display: block;
    margin-top: 6px;
    color: #344054;
    font-size: 11px;
  }

  .case-permission-card p {
    margin: 4px 0 8px;
    color: #7a8597;
    font-size: 9px;
    line-height: 1.5;
  }

  .permission-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .permission-list span {
    padding: 4px 6px;
    border-radius: 6px;
    background: #eaf6f4;
    color: #0f766e;
    font-size: 8px;
    font-weight: 700;
  }

  .case-error {
    width: min(600px, calc(100% - 40px));
    margin: 80px auto;
    padding: 35px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 18px;
    text-align: center;
  }

  .case-error > div {
    font-size: 35px;
  }

  .case-error h1 {
    margin: 10px 0 6px;
    font-size: 20px;
  }

  .case-error p {
    color: #7a8597;
    font-size: 12px;
    line-height: 1.5;
  }

  .case-button {
    display: inline-flex;
    margin-top: 12px;
    min-height: 40px;
    padding: 0 15px;
    align-items: center;
    border-radius: 9px;
    background: #0f766e;
    color: #ffffff;
    text-decoration: none;
    font-size: 11px;
    font-weight: 800;
  }

  @media (max-width: 900px) {
    .case-grid {
      grid-template-columns: 1fr;
    }

    .case-sidebar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    .case-permission-card {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 680px) {
    .case-header {
      padding: 22px 17px;
      flex-direction: column;
      align-items: flex-start;
    }

    .case-agent {
      width: 100%;
      box-sizing: border-box;
    }

    .case-container {
      width: min(calc(100% - 28px), 1180px);
    }

    .case-status-bar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .case-status-bar > div {
      border-right: 0;
    }

    .case-sidebar {
      grid-template-columns: 1fr;
    }

    .case-permission-card {
      grid-column: auto;
    }

    .case-info-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 450px) {
    .case-status-bar {
      grid-template-columns: 1fr;
    }

    .case-header h1 {
      font-size: 23px;
    }

    .case-card {
      padding: 15px;
    }
  }
`;