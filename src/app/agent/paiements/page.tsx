import Link from "next/link";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

/* ==========================================================================
   TYPES
   ========================================================================== */

type SearchParams = {
  q?: string;
  status?: string;
  method?: string;
  provider?: string;
};

type PaymentPharmacy = {
  id: string;
  name: string | null;
  city: string | null;
  country_code: string | null;
};

type PaymentProvider = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  mode: string | null;
};

type PaymentTransaction = {
  id: string;

  pharmacy_id: string | null;
  subscription_id: string | null;
  provider_id: string | null;

  provider: string | null;
  provider_transaction_id: string | null;
  merchant_reference: string | null;

  amount: number | string | null;
  currency: string | null;

  payment_method: string | null;
  status: string | null;

  checkout_url: string | null;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  metadata: unknown;
  failure_reason: string | null;

  created_at: string;
  updated_at: string;
  paid_at: string | null;

  pharmacies: PaymentPharmacy | null;
  payment_providers: PaymentProvider | null;
};


/* ==========================================================================
   FORMATTERS
   ========================================================================== */

function formatAmount(
  amount: number | string | null,
  currency: string | null,
): string {
  const value = Number(amount ?? 0);

  if (!Number.isFinite(value)) {
    return `0 ${currency ?? ""}`.trim();
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} ${currency ?? ""}`.trim();
}


function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}


function normalizeStatus(
  status: string | null,
): string {
  return (status ?? "").trim().toLowerCase();
}


/* ==========================================================================
   STATUS
   ========================================================================== */

function statusLabel(
  status: string | null,
): string {
  const value = normalizeStatus(status);

  switch (value) {
    case "paid":
    case "completed":
    case "success":
    case "succeeded":
      return "Payé";

    case "pending":
      return "En attente";

    case "processing":
      return "Traitement";

    case "failed":
      return "Échec";

    case "cancelled":
    case "canceled":
      return "Annulé";

    case "refunded":
      return "Remboursé";

    default:
      return status?.trim() || "Inconnu";
  }
}


function statusClass(
  status: string | null,
): string {
  const value = normalizeStatus(status);

  if (
    value === "paid" ||
    value === "completed" ||
    value === "success" ||
    value === "succeeded"
  ) {
    return "agent-payment-status agent-payment-status-success";
  }

  if (
    value === "pending"
  ) {
    return "agent-payment-status agent-payment-status-pending";
  }

  if (
    value === "processing"
  ) {
    return "agent-payment-status agent-payment-status-processing";
  }

  if (
    value === "failed"
  ) {
    return "agent-payment-status agent-payment-status-failed";
  }

  if (
    value === "cancelled" ||
    value === "canceled"
  ) {
    return "agent-payment-status agent-payment-status-cancelled";
  }

  if (
    value === "refunded"
  ) {
    return "agent-payment-status agent-payment-status-default";
  }

  return "agent-payment-status agent-payment-status-default";
}


/* ==========================================================================
   TRANSACTION HELPERS
   ========================================================================== */

function isPaid(
  transaction: PaymentTransaction,
): boolean {
  const status = normalizeStatus(
    transaction.status,
  );

  return (
    Boolean(transaction.paid_at) ||
    status === "paid" ||
    status === "completed" ||
    status === "success" ||
    status === "succeeded"
  );
}


function isPending(
  transaction: PaymentTransaction,
): boolean {
  const value = normalizeStatus(
    transaction.status,
  );

  return (
    value === "pending" ||
    value === "processing"
  );
}


function isFailed(
  transaction: PaymentTransaction,
): boolean {
  const value = normalizeStatus(
    transaction.status,
  );

  return (
    value === "failed" ||
    value === "cancelled" ||
    value === "canceled"
  );
}


function getProviderName(
  transaction: PaymentTransaction,
): string {
  return (
    transaction.payment_providers?.name ||
    transaction.provider ||
    "Non renseigné"
  );
}


function getProviderCode(
  transaction: PaymentTransaction,
): string {
  return (
    transaction.payment_providers?.code ||
    transaction.provider ||
    "—"
  );
}


/* ==========================================================================
   PAGE
   ========================================================================== */

export default async function AgentPaiementsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  /* ------------------------------------------------------------------------
     AGENT
     ------------------------------------------------------------------------ */

  const member = await requireAgent();

  /* ------------------------------------------------------------------------
     SEARCH PARAMS
     ------------------------------------------------------------------------ */

  const params =
    (await searchParams) ?? {};

  const q =
    typeof params.q === "string"
      ? params.q.trim()
      : "";

  const statusFilter =
    typeof params.status === "string"
      ? params.status.trim().toLowerCase()
      : "";

  const methodFilter =
    typeof params.method === "string"
      ? params.method.trim()
      : "";

  const providerFilter =
    typeof params.provider === "string"
      ? params.provider.trim()
      : "";

  /* ------------------------------------------------------------------------
     SUPABASE
     ------------------------------------------------------------------------ */

  const supabase =
    createAdminClient();

  /*
   * Relations explicites conservées.
   *
   * Ces relations permettent de récupérer :
   * - la pharmacie associée ;
   * - le fournisseur de paiement associé.
   */

  let query = supabase
    .from("payment_transactions")
    .select(`
      id,
      pharmacy_id,
      subscription_id,
      provider_id,
      provider,
      provider_transaction_id,
      merchant_reference,
      amount,
      currency,
      payment_method,
      status,
      checkout_url,
      customer_name,
      customer_email,
      customer_phone,
      metadata,
      failure_reason,
      created_at,
      updated_at,
      paid_at,

      pharmacies!payment_transactions_pharmacy_id_fkey (
        id,
        name,
        city,
        country_code
      ),

      payment_providers!payment_transactions_provider_id_fkey (
        id,
        code,
        name,
        description,
        enabled,
        mode
      )
    `);

  /* ------------------------------------------------------------------------
     FILTRE STATUT
     ------------------------------------------------------------------------ */

  if (statusFilter) {
    query = query.eq(
      "status",
      statusFilter,
    );
  }

  /* ------------------------------------------------------------------------
     FILTRE MÉTHODE
     ------------------------------------------------------------------------ */

  if (methodFilter) {
    query = query.eq(
      "payment_method",
      methodFilter,
    );
  }

  /* ------------------------------------------------------------------------
     FILTRE FOURNISSEUR
     ------------------------------------------------------------------------ */

  if (providerFilter) {
    query = query.eq(
      "provider",
      providerFilter,
    );
  }

  /* ------------------------------------------------------------------------
     RECHERCHE GLOBALE
     ------------------------------------------------------------------------ */

  if (q) {
    /*
     * .or() utilise la syntaxe PostgREST.
     * On retire les caractères susceptibles de casser
     * la syntaxe du filtre.
     */

    const safeSearch = q
      .replace(/[%(),]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (safeSearch) {
      query = query.or(
        [
          `merchant_reference.ilike.%${safeSearch}%`,
          `provider_transaction_id.ilike.%${safeSearch}%`,
          `customer_name.ilike.%${safeSearch}%`,
          `customer_email.ilike.%${safeSearch}%`,
          `customer_phone.ilike.%${safeSearch}%`,
          `status.ilike.%${safeSearch}%`,
          `currency.ilike.%${safeSearch}%`,
          `payment_method.ilike.%${safeSearch}%`,
          `provider.ilike.%${safeSearch}%`,
        ].join(","),
      );
    }
  }

  /* ------------------------------------------------------------------------
     EXÉCUTION
     ------------------------------------------------------------------------ */

  const {
    data,
    error,
  } = await query
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  /* ------------------------------------------------------------------------
     ERREUR SUPABASE
     ------------------------------------------------------------------------ */

  if (error) {
    console.error(
      "[PharmaFlow][agent/paiements]",
      error,
    );

    return (
      <main className="agent-payments-page">
        <div className="agent-payments-container">

          <section className="agent-payments-table-card">
            <div className="border-b border-red-100 bg-red-50 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-xl">
                  ⚠️
                </div>

                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-red-900">
                    Impossible de charger les paiements
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    PharmaFlow n’a pas pu récupérer
                    les transactions de paiement.
                  </p>
                </div>

              </div>
            </div>

            <div className="p-5 sm:p-7">

              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold text-red-800">
                  Détail technique
                </p>

                <p className="mt-1 break-words text-xs leading-5 text-red-700">
                  {error.message ||
                    "Erreur Supabase inconnue."}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                <Link
                  href="/agent"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
                >
                  ← Retour à l’espace agent
                </Link>

                <Link
                  href="/agent/paiements"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Réessayer
                </Link>

              </div>
            </div>
          </section>

        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------
     NORMALISATION
     ------------------------------------------------------------------------ */

  const transactions =
    (data as unknown as PaymentTransaction[]) ??
    [];

  /* ------------------------------------------------------------------------
     STATISTIQUES
     ------------------------------------------------------------------------ */

  const totalTransactions =
    transactions.length;

  const paidTransactions =
    transactions.filter(isPaid);

  const pendingTransactions =
    transactions.filter(isPending);

  const failedTransactions =
    transactions.filter(isFailed);

  const totalPaid =
    paidTransactions.reduce(
      (total, transaction) => {
        const amount = Number(
          transaction.amount ?? 0,
        );

        return Number.isFinite(amount)
          ? total + amount
          : total;
      },
      0,
    );

  const totalPending =
    pendingTransactions.reduce(
      (total, transaction) => {
        const amount = Number(
          transaction.amount ?? 0,
        );

        return Number.isFinite(amount)
          ? total + amount
          : total;
      },
      0,
    );

  const totalFailed =
    failedTransactions.reduce(
      (total, transaction) => {
        const amount = Number(
          transaction.amount ?? 0,
        );

        return Number.isFinite(amount)
          ? total + amount
          : total;
      },
      0,
    );

  /* ------------------------------------------------------------------------
     OPTIONS FILTRES
     ------------------------------------------------------------------------ */

  const currencies =
    Array.from(
      new Set(
        transactions
          .map(
            (transaction) =>
              transaction.currency,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    );

  const methods =
    Array.from(
      new Set(
        transactions
          .map(
            (transaction) =>
              transaction.payment_method,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ).sort(
      (a, b) =>
        a.localeCompare(b),
    );

  const providers =
    Array.from(
      new Set(
        transactions
          .map(
            (transaction) =>
              transaction.provider,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ).sort(
      (a, b) =>
        a.localeCompare(b),
    );

  const displayCurrency =
    currencies.length === 1
      ? currencies[0]
      : null;

  const hasFilters =
    Boolean(
      q ||
        statusFilter ||
        methodFilter ||
        providerFilter,
    );

  const clearUrl =
    "/agent/paiements";

  /* ------------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------------ */

  return (
    <main className="agent-payments-page">
      <div className="agent-payments-container">

        {/* ================================================================
            HEADER
        ================================================================= */}

        <section className="agent-payments-header">

          <div className="agent-payments-header-content">

            <div className="agent-payments-eyebrow">
              <span>●</span>
              PharmaFlow Finance
            </div>

            <h1 className="agent-payments-title">
              Centre des paiements
            </h1>

            <p className="agent-payments-description">
              Supervision centralisée des transactions
              de paiement enregistrées sur la plateforme
              PharmaFlow.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">

              <Link
                href="/agent"
                className="text-xs font-semibold text-slate-500 transition hover:text-teal-700"
              >
                Espace agent
              </Link>

              <span className="text-slate-300">
                /
              </span>

              <span className="text-xs font-semibold text-slate-700">
                Paiements
              </span>

            </div>

            <div className="mt-3 break-all text-[11px] text-slate-400">
              Session agent :{" "}
              <span className="font-semibold text-slate-500">
                {member.email ??
                  member.id}
              </span>
            </div>

          </div>


          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">

            <Link
              href="/agent/abonnements"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 sm:flex-none"
            >
              <span className="mr-2">
                ←
              </span>

              Abonnements
            </Link>

            <Link
              href="/agent"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 sm:flex-none"
            >
              Tableau de bord
            </Link>

          </div>

        </section>


        {/* ================================================================
            KPI
        ================================================================= */}

        <section className="agent-payments-stats">

          {/* TOTAL */}

          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Transactions affichées
            </div>

            <div className="agent-payment-stat-value">
              {totalTransactions}
            </div>

            <div className="agent-payment-stat-meta">
              Maximum de 100 transactions chargées
            </div>

          </div>


          {/* PAID */}

          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Paiements reçus
            </div>

            <div className="agent-payment-stat-value">
              {paidTransactions.length}
            </div>

            <div className="agent-payment-stat-meta">
              {formatAmount(
                totalPaid,
                displayCurrency,
              )}
            </div>

          </div>


          {/* PENDING */}

          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Paiements en attente
            </div>

            <div className="agent-payment-stat-value">
              {pendingTransactions.length}
            </div>

            <div className="agent-payment-stat-meta">
              {formatAmount(
                totalPending,
                displayCurrency,
              )}
            </div>

          </div>


          {/* FAILED */}

          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Échecs / annulations
            </div>

            <div className="agent-payment-stat-value">
              {failedTransactions.length}
            </div>

            <div className="agent-payment-stat-meta">
              {formatAmount(
                totalFailed,
                displayCurrency,
              )}
            </div>

          </div>

        </section>


        {/* ================================================================
            FILTERS
        ================================================================= */}

        <section className="agent-payments-filters">

          {/* SEARCH */}

          <div className="agent-payments-filter-group">

            <label
              htmlFor="q"
              className="agent-payments-filter-label"
            >
              Recherche
            </label>

            <input
              id="q"
              name="q"
              form="payment-filters"
              defaultValue={q}
              placeholder="Référence, client, téléphone..."
              className="agent-payments-filter-input"
            />

          </div>


          {/* STATUS */}

          <div className="agent-payments-filter-group">

            <label
              htmlFor="status"
              className="agent-payments-filter-label"
            >
              Statut
            </label>

            <select
              id="status"
              name="status"
              form="payment-filters"
              defaultValue={statusFilter}
              className="agent-payments-filter-select"
            >
              <option value="">
                Tous les statuts
              </option>

              <option value="pending">
                En attente
              </option>

              <option value="processing">
                Traitement
              </option>

              <option value="paid">
                Payé
              </option>

              <option value="completed">
                Terminé
              </option>

              <option value="success">
                Succès
              </option>

              <option value="failed">
                Échec
              </option>

              <option value="cancelled">
                Annulé
              </option>

              <option value="refunded">
                Remboursé
              </option>
            </select>

          </div>


          {/* METHOD */}

          <div className="agent-payments-filter-group">

            <label
              htmlFor="method"
              className="agent-payments-filter-label"
            >
              Méthode
            </label>

            <select
              id="method"
              name="method"
              form="payment-filters"
              defaultValue={methodFilter}
              className="agent-payments-filter-select"
            >
              <option value="">
                Toutes les méthodes
              </option>

              {methods.map(
                (method) => (
                  <option
                    key={method}
                    value={method}
                  >
                    {method}
                  </option>
                ),
              )}
            </select>

          </div>


          {/* PROVIDER */}

          <div className="agent-payments-filter-group">

            <label
              htmlFor="provider"
              className="agent-payments-filter-label"
            >
              Fournisseur
            </label>

            <select
              id="provider"
              name="provider"
              form="payment-filters"
              defaultValue={providerFilter}
              className="agent-payments-filter-select"
            >
              <option value="">
                Tous les fournisseurs
              </option>

              {providers.map(
                (provider) => (
                  <option
                    key={provider}
                    value={provider}
                  >
                    {provider}
                  </option>
                ),
              )}
            </select>

          </div>


          {/* ACTIONS */}

          <div className="flex items-end gap-2">

            <form
              id="payment-filters"
              method="GET"
              className="contents"
            >
              <button
                type="submit"
                className="agent-payments-filter-button"
              >
                Filtrer
              </button>

              <Link
                href={clearUrl}
                className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Effacer
              </Link>
            </form>

          </div>

        </section>


        {/* ================================================================
            ACTIVE FILTERS
        ================================================================= */}

        {hasFilters && (
          <section className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">

            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Filtres actifs
            </span>

            {q && (
              <span className="max-w-full truncate rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                Recherche : {q}
              </span>
            )}

            {statusFilter && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Statut :{" "}
                {statusLabel(
                  statusFilter,
                )}
              </span>
            )}

            {methodFilter && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Méthode :{" "}
                {methodFilter}
              </span>
            )}

            {providerFilter && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Fournisseur :{" "}
                {providerFilter}
              </span>
            )}

          </section>
        )}


        {/* ================================================================
            TRANSACTIONS
        ================================================================= */}

        <section className="agent-payments-table-card">

          {/* HEADER */}

          <div className="agent-payments-table-header">

            <div className="min-w-0">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg">
                  💳
                </div>

                <div className="min-w-0">

                  <h2 className="agent-payments-table-title">
                    Transactions de paiement
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Suivi des paiements enregistrés
                    par PharmaFlow.
                  </p>

                </div>

              </div>

            </div>


            <div className="agent-payments-table-count">
              {transactions.length} résultat
              {transactions.length > 1
                ? "s"
                : ""}
            </div>

          </div>


          {/* EMPTY */}

          {transactions.length === 0 ? (
            <div className="agent-payments-empty">

              <div className="agent-payments-empty-icon">
                💳
              </div>

              <h3 className="agent-payments-empty-title">
                Aucun paiement trouvé
              </h3>

              <p className="agent-payments-empty-description">
                Aucune transaction ne correspond
                aux critères actuellement sélectionnés.
              </p>

              <Link
                href="/agent/paiements"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700"
              >
                Afficher toutes les transactions
              </Link>

            </div>
          ) : (
            <>
              {/* MOBILE HINT */}

              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-medium text-slate-400 lg:hidden">
                <span aria-hidden="true">
                  ↔
                </span>

                Faites glisser horizontalement
                pour voir toutes les colonnes.
              </div>


              {/* TABLE */}

              <div className="agent-payments-table-wrapper">

                <table className="agent-payments-table">

                  <thead>
                    <tr>

                      <th>
                        Transaction
                      </th>

                      <th>
                        Client
                      </th>

                      <th>
                        Pharmacie
                      </th>

                      <th>
                        Fournisseur
                      </th>

                      <th>
                        Méthode
                      </th>

                      <th className="text-right">
                        Montant
                      </th>

                      <th>
                        Statut
                      </th>

                      <th>
                        Date
                      </th>

                    </tr>
                  </thead>


                  <tbody>

                    {transactions.map(
                      (transaction) => {

                        const pharmacy =
                          transaction.pharmacies;

                        const paymentProvider =
                          transaction.payment_providers;

                        const reference =
                          transaction.merchant_reference ||
                          transaction.provider_transaction_id ||
                          transaction.id.slice(
                            0,
                            12,
                          );

                        return (
                          <tr
                            key={
                              transaction.id
                            }
                          >

                            {/* TRANSACTION */}

                            <td>

                              <div className="agent-payment-reference">

                                <strong>
                                  {reference}
                                </strong>

                                {transaction.provider_transaction_id &&
                                  transaction.merchant_reference && (
                                    <span>
                                      {
                                        transaction.provider_transaction_id
                                      }
                                    </span>
                                  )}

                                {transaction.subscription_id && (
                                  <span className="inline-flex w-fit rounded-md bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700">
                                    Abonnement lié
                                  </span>
                                )}

                              </div>

                            </td>


                            {/* CLIENT */}

                            <td>

                              <div className="agent-payment-client">

                                <div className="agent-payment-client-name">
                                  {transaction.customer_name ||
                                    "Client non renseigné"}
                                </div>

                                {transaction.customer_email && (
                                  <div
                                    className="agent-payment-client-email"
                                    title={
                                      transaction.customer_email
                                    }
                                  >
                                    {
                                      transaction.customer_email
                                    }
                                  </div>
                                )}

                                {transaction.customer_phone && (
                                  <div className="text-[10px] text-slate-400">
                                    {
                                      transaction.customer_phone
                                    }
                                  </div>
                                )}

                              </div>

                            </td>


                            {/* PHARMACIE */}

                            <td>

                              <div className="agent-payment-pharmacy">

                                <div className="agent-payment-pharmacy-name">
                                  {pharmacy?.name ||
                                    "Pharmacie non renseignée"}
                                </div>

                                {(pharmacy?.city ||
                                  pharmacy?.country_code) && (
                                  <div className="agent-payment-pharmacy-location">
                                    {pharmacy?.city ||
                                      "—"}

                                    {pharmacy?.country_code
                                      ? ` · ${pharmacy.country_code}`
                                      : ""}
                                  </div>
                                )}

                              </div>

                            </td>


                            {/* PROVIDER */}

                            <td>

                              <div className="agent-payment-provider">

                                <div className="agent-payment-provider-name">
                                  {getProviderName(
                                    transaction,
                                  )}
                                </div>

                                <div className="text-[10px] text-slate-400">
                                  {getProviderCode(
                                    transaction,
                                  )}

                                  {paymentProvider?.mode
                                    ? ` · ${paymentProvider.mode}`
                                    : ""}
                                </div>

                              </div>

                            </td>


                            {/* METHOD */}

                            <td>

                              <div className="agent-payment-provider">

                                <span className="agent-payment-method">
                                  {transaction.payment_method ||
                                    "Non renseigné"}
                                </span>

                              </div>

                            </td>


                            {/* AMOUNT */}

                            <td className="text-right">

                              <div className="agent-payment-amount">
                                {formatAmount(
                                  transaction.amount,
                                  transaction.currency,
                                )}
                              </div>

                              {transaction.paid_at && (
                                <div className="mt-1 text-[10px] font-medium text-emerald-600">
                                  Payé le{" "}
                                  {formatDate(
                                    transaction.paid_at,
                                  )}
                                </div>
                              )}

                            </td>


                            {/* STATUS */}

                            <td>

                              <span
                                className={statusClass(
                                  transaction.status,
                                )}
                              >
                                {statusLabel(
                                  transaction.status,
                                )}
                              </span>

                              {transaction.failure_reason && (
                                <div
                                  className="mt-1.5 max-w-[190px] truncate text-[10px] text-red-500"
                                  title={
                                    transaction.failure_reason
                                  }
                                >
                                  {
                                    transaction.failure_reason
                                  }
                                </div>
                              )}

                            </td>


                            {/* DATE */}

                            <td>

                              <div className="agent-payment-date">

                                <div className="agent-payment-date-main">
                                  {formatDate(
                                    transaction.created_at,
                                  )}
                                </div>

                                {transaction.updated_at !==
                                  transaction.created_at && (
                                  <div className="agent-payment-date-time">
                                    Modifié{" "}
                                    {formatDate(
                                      transaction.updated_at,
                                    )}
                                  </div>
                                )}

                              </div>

                            </td>

                          </tr>
                        );
                      },
                    )}

                  </tbody>

                </table>

              </div>
            </>
          )}

        </section>


        {/* ================================================================
            INFORMATION
        ================================================================= */}

        <section className="agent-payments-info">

          <div className="agent-payments-info-icon">
            ℹ️
          </div>

          <div className="min-w-0">

            <strong className="font-bold text-slate-700">
              Informations de supervision
            </strong>

            <div className="mt-1">

              Cette vue utilise la table{" "}

              <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-teal-700 ring-1 ring-slate-200">
                payment_transactions
              </code>

              {" "}comme registre des transactions de
              paiement et récupère les informations
              liées aux pharmacies et aux fournisseurs
              de paiement.

            </div>

          </div>

        </section>


        {/* ================================================================
            FOOTER
        ================================================================= */}

        <footer className="px-1 py-5 text-center sm:py-6">

          <p className="text-[10px] font-medium text-slate-400 sm:text-xs">
            PharmaFlow Africa · Centre de supervision
            financière
          </p>

        </footer>

      </div>
    </main>
  );
}