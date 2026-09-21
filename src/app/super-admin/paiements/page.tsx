"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * ============================================================
 * PHARMAFLOW — SUPER ADMIN — PAIEMENTS
 * ============================================================
 *
 * Gestion des paiements SaaS des pharmacies :
 *
 * - Abonnements
 * - Paiements
 * - Montants
 * - Devises
 * - Méthodes de paiement
 * - Statuts
 * - Références
 * - Transactions
 * - Recherche
 * - Filtres
 * - Actualisation
 *
 * IMPORTANT :
 *
 * Cette page concerne les paiements d'abonnement PharmaFlow.
 *
 * Elle ne concerne PAS les paiements des ventes effectuées
 * dans les pharmacies.
 * ============================================================
 */

type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded"
  | "expired";

type PaymentMethod =
  | "mobile_money"
  | "card"
  | "bank_transfer"
  | "cash"
  | "manual"
  | "unknown";

type Payment = {
  id: string;
  pharmacy_id: string | null;
  subscription_id: string | null;

  amount: number;
  currency: string;

  status: PaymentStatus | string | null;
  method: PaymentMethod | string | null;

  provider: string | null;
  transaction_id: string | null;
  reference: string | null;

  customer_name: string | null;
  customer_email: string | null;

  pharmacy_name: string | null;

  plan_name: string | null;

  created_at: string | null;
  paid_at: string | null;

  metadata?: Record<
    string,
    unknown
  > | null;
};

type ApiResponse = {
  success?: boolean;
  payments?: Payment[];
  data?: Payment[];
  total?: number;
  message?: string;
  error?: string;
};

/**
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const PAYMENT_API =
  "/api/admin/payments";

const REFRESH_INTERVAL = 30000;

/**
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function formatAmount(
  amount: number,
  currency: string,
): string {
  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(safeAmount)} ${currency || "XAF"}`;
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
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
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function normalizeStatus(
  status: string | null,
): string {
  return String(
    status || "",
  )
    .trim()
    .toLowerCase();
}

function normalizeMethod(
  method: string | null,
): string {
  return String(
    method || "",
  )
    .trim()
    .toLowerCase();
}

function getStatusLabel(
  status: string | null,
): string {
  switch (
    normalizeStatus(status)
  ) {
    case "paid":
    case "successful":
      return "Payé";

    case "pending":
      return "En attente";

    case "processing":
      return "Traitement";

    case "failed":
      return "Échec";

    case "cancelled":
      return "Annulé";

    case "refunded":
      return "Remboursé";

    case "expired":
      return "Expiré";

    default:
      return status || "Inconnu";
  }
}

function getMethodLabel(
  method: string | null,
): string {
  switch (
    normalizeMethod(method)
  ) {
    case "mobile_money":
      return "Mobile Money";

    case "card":
      return "Carte bancaire";

    case "bank_transfer":
      return "Virement";

    case "cash":
      return "Espèces";

    case "manual":
      return "Manuel";

    default:
      return method || "—";
  }
}

function getStatusClass(
  status: string | null,
): string {
  switch (
    normalizeStatus(status)
  ) {
    case "paid":
    case "successful":
      return "payment-status payment-status-success";

    case "pending":
    case "processing":
      return "payment-status payment-status-warning";

    case "failed":
    case "cancelled":
      return "payment-status payment-status-danger";

    case "refunded":
      return "payment-status payment-status-info";

    default:
      return "payment-status payment-status-neutral";
  }
}

/**
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

export default function SuperAdminPaymentsPage() {
  const [
    payments,
    setPayments,
  ] = useState<Payment[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    methodFilter,
    setMethodFilter,
  ] = useState("all");

  const [
    selectedPayment,
    setSelectedPayment,
  ] =
    useState<Payment | null>(
      null,
    );

  /**
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  const loadPayments =
    useCallback(
      async (
        silent = false,
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await fetch(
              PAYMENT_API,
              {
                method: "GET",
                cache: "no-store",
                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const contentType =
            response.headers.get(
              "content-type",
            ) || "";

          let result:
            | ApiResponse
            | null =
            null;

          if (
            contentType.includes(
              "application/json",
            )
          ) {
            result =
              (await response.json()) as ApiResponse;
          }

          if (
            !response.ok
          ) {
            throw new Error(
              result?.error ||
                result?.message ||
                `Erreur serveur (${response.status})`,
            );
          }

          const receivedPayments =
            result?.payments ||
            result?.data ||
            [];

          setPayments(
            Array.isArray(
              receivedPayments,
            )
              ? receivedPayments
              : [],
          );
        } catch (loadError) {
          console.error(
            "PharmaFlow Super Admin payments error:",
            loadError,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les paiements.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  /**
   * ==========================================================
   * INITIALISATION
   * ==========================================================
   */

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  /**
   * ==========================================================
   * ACTUALISATION AUTOMATIQUE
   * ==========================================================
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          void loadPayments(true);
        },
        REFRESH_INTERVAL,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [loadPayments]);

  /**
   * ==========================================================
   * FILTRAGE
   * ==========================================================
   */

  const filteredPayments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return payments.filter(
        (payment) => {
          const matchesSearch =
            !query ||
            [
              payment.id,
              payment.reference,
              payment.transaction_id,
              payment.pharmacy_name,
              payment.customer_name,
              payment.customer_email,
              payment.plan_name,
              payment.provider,
            ]
              .filter(Boolean)
              .some(
                (value) =>
                  String(value)
                    .toLowerCase()
                    .includes(
                      query,
                    ),
              );

          const matchesStatus =
            statusFilter ===
              "all" ||
            normalizeStatus(
              payment.status,
            ) ===
              statusFilter;

          const matchesMethod =
            methodFilter ===
              "all" ||
            normalizeMethod(
              payment.method,
            ) ===
              methodFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesMethod
          );
        },
      );
    }, [
      payments,
      search,
      statusFilter,
      methodFilter,
    ]);

  /**
   * ==========================================================
   * STATISTIQUES
   * ==========================================================
   */

  const statistics =
    useMemo(() => {
      const successful =
        payments.filter(
          (payment) =>
            [
              "paid",
              "successful",
            ].includes(
              normalizeStatus(
                payment.status,
              ),
            ),
        );

      const pending =
        payments.filter(
          (payment) =>
            [
              "pending",
              "processing",
            ].includes(
              normalizeStatus(
                payment.status,
              ),
            ),
        );

      const failed =
        payments.filter(
          (payment) =>
            [
              "failed",
              "cancelled",
            ].includes(
              normalizeStatus(
                payment.status,
              ),
            ),
        );

      const totalRevenue =
        successful.reduce(
          (
            total,
            payment,
          ) =>
            total +
            (Number.isFinite(
              payment.amount,
            )
              ? payment.amount
              : 0),
          0,
        );

      const pendingAmount =
        pending.reduce(
          (
            total,
            payment,
          ) =>
            total +
            (Number.isFinite(
              payment.amount,
            )
              ? payment.amount
              : 0),
          0,
        );

      return {
        total: payments.length,
        successful:
          successful.length,
        pending:
          pending.length,
        failed:
          failed.length,
        totalRevenue,
        pendingAmount,
      };
    }, [payments]);

  /**
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <main className="super-admin-payments-page">
      <style jsx>{`
        .super-admin-payments-page {
          min-height: 100vh;
          padding: 32px;
          background:
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #f1f5f9 100%
            );
          color: #0f172a;
        }

        .payments-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .header-left {
          min-width: 0;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #0f766e;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .page-title {
          margin: 0;
          font-size: clamp(
            28px,
            4vw,
            38px
          );
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -0.03em;
        }

        .page-description {
          max-width: 720px;
          margin: 10px 0 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.7;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-button {
          min-height: 44px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0 16px;
          background: #ffffff;
          color: #0f172a;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            border-color 0.15s ease;
        }

        .action-button:hover {
          transform: translateY(-1px);
          border-color: #94a3b8;
          box-shadow:
            0 8px 22px
            rgba(15, 23, 42, 0.08);
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          position: relative;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          background: #ffffff;
          box-shadow:
            0 8px 30px
            rgba(15, 23, 42, 0.05);
        }

        .stat-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .stat-value {
          margin-top: 8px;
          color: #0f172a;
          font-size: 26px;
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        .stat-description {
          margin-top: 7px;
          color: #94a3b8;
          font-size: 12px;
        }

        .stat-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #0f766e;
        }

        .filters-card {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow:
            0 8px 30px
            rgba(15, 23, 42, 0.04);
        }

        .search-wrapper {
          position: relative;
          flex: 1 1 320px;
        }

        .search-icon {
          position: absolute;
          top: 50%;
          left: 14px;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .search-input,
        .filter-select {
          width: 100%;
          min-height: 44px;
          border: 1px solid #cbd5e1;
          border-radius: 11px;
          background: #ffffff;
          color: #0f172a;
          outline: none;
          font-size: 14px;
        }

        .search-input {
          padding:
            0 14px 0 42px;
        }

        .filter-select {
          width: auto;
          min-width: 160px;
          padding: 0 36px 0 12px;
        }

        .search-input:focus,
        .filter-select:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px
            rgba(15, 118, 110, 0.1);
        }

        .table-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #ffffff;
          box-shadow:
            0 10px 35px
            rgba(15, 23, 42, 0.05);
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }

        .table-count {
          color: #64748b;
          font-size: 13px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1100px;
        }

        th {
          padding: 14px 18px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-align: left;
          text-transform: uppercase;
          white-space: nowrap;
        }

        td {
          padding: 16px 18px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 13px;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr {
          transition:
            background 0.15s ease;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        .pharmacy-cell {
          min-width: 180px;
        }

        .pharmacy-name {
          color: #0f172a;
          font-weight: 800;
        }

        .pharmacy-email {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        .amount {
          color: #0f172a;
          font-weight: 850;
          white-space: nowrap;
        }

        .reference {
          color: #475569;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;
          font-size: 11px;
        }

        .payment-status {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .payment-status-success {
          background: #dcfce7;
          color: #166534;
        }

        .payment-status-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .payment-status-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .payment-status-info {
          background: #dbeafe;
          color: #1e40af;
        }

        .payment-status-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .view-button {
          min-height: 34px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          padding: 0 11px;
          background: #ffffff;
          color: #0f766e;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .view-button:hover {
          background: #f0fdfa;
          border-color: #99f6e4;
        }

        .empty-state,
        .loading-state,
        .error-state {
          padding: 70px 24px;
          text-align: center;
        }

        .state-icon {
          margin-bottom: 12px;
          font-size: 36px;
        }

        .state-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
        }

        .state-description {
          max-width: 520px;
          margin: 8px auto 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .retry-button {
          margin-top: 18px;
          min-height: 40px;
          border: none;
          border-radius: 10px;
          padding: 0 15px;
          background: #0f766e;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            rgba(15, 23, 42, 0.5);
          backdrop-filter:
            blur(4px);
        }

        .modal {
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 22px;
          background: #ffffff;
          box-shadow:
            0 25px 80px
            rgba(15, 23, 42, 0.25);
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 22px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-title {
          margin: 0;
          font-size: 19px;
          font-weight: 850;
        }

        .modal-subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .close-button {
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #475569;
          font-size: 18px;
          cursor: pointer;
        }

        .modal-body {
          padding: 22px;
        }

        .details-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .detail-item {
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }

        .detail-label {
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
        }

        .detail-value {
          margin-top: 6px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .page-header {
            flex-direction: column;
          }
        }

        @media (max-width: 640px) {
          .super-admin-payments-page {
            padding: 18px 12px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .filters-card {
            align-items: stretch;
          }

          .filter-select {
            width: 100%;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="payments-container">
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <header className="page-header">
          <div className="header-left">
            <div className="eyebrow">
              <span>💳</span>
              <span>
                Administration financière
              </span>
            </div>

            <h1 className="page-title">
              Paiements
            </h1>

            <p className="page-description">
              Supervisez les paiements des
              abonnements PharmaFlow, les
              transactions, les références et
              les statuts de règlement des
              pharmacies.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="action-button"
              onClick={() =>
                void loadPayments(true)
              }
              disabled={refreshing}
            >
              {refreshing
                ? "Actualisation..."
                : "↻ Actualiser"}
            </button>
          </div>
        </header>

        {/* ================================================== */}
        {/* STATISTIQUES */}
        {/* ================================================== */}

        <section
          className="stats-grid"
          aria-label="Statistiques des paiements"
        >
          <article className="stat-card">
            <div className="stat-accent" />

            <div className="stat-label">
              Total des paiements
            </div>

            <div className="stat-value">
              {statistics.total}
            </div>

            <div className="stat-description">
              Transactions enregistrées
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-accent" />

            <div className="stat-label">
              Paiements réussis
            </div>

            <div className="stat-value">
              {statistics.successful}
            </div>

            <div className="stat-description">
              Transactions confirmées
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-accent" />

            <div className="stat-label">
              En attente
            </div>

            <div className="stat-value">
              {statistics.pending}
            </div>

            <div className="stat-description">
              Transactions à vérifier
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-accent" />

            <div className="stat-label">
              Chiffre encaissé
            </div>

            <div className="stat-value">
              {formatAmount(
                statistics.totalRevenue,
                "XAF",
              )}
            </div>

            <div className="stat-description">
              Paiements confirmés
            </div>
          </article>
        </section>

        {/* ================================================== */}
        {/* FILTRES */}
        {/* ================================================== */}

        <section className="filters-card">
          <div className="search-wrapper">
            <span className="search-icon">
              🔎
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Rechercher une pharmacie, référence, transaction..."
              className="search-input"
              aria-label="Rechercher un paiement"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className="filter-select"
            aria-label="Filtrer par statut"
          >
            <option value="all">
              Tous les statuts
            </option>
            <option value="paid">
              Payés
            </option>
            <option value="successful">
              Réussis
            </option>
            <option value="pending">
              En attente
            </option>
            <option value="processing">
              Traitement
            </option>
            <option value="failed">
              Échec
            </option>
            <option value="cancelled">
              Annulés
            </option>
            <option value="refunded">
              Remboursés
            </option>
          </select>

          <select
            value={methodFilter}
            onChange={(event) =>
              setMethodFilter(
                event.target.value,
              )
            }
            className="filter-select"
            aria-label="Filtrer par méthode"
          >
            <option value="all">
              Toutes les méthodes
            </option>
            <option value="mobile_money">
              Mobile Money
            </option>
            <option value="card">
              Carte bancaire
            </option>
            <option value="bank_transfer">
              Virement
            </option>
            <option value="cash">
              Espèces
            </option>
            <option value="manual">
              Manuel
            </option>
          </select>
        </section>

        {/* ================================================== */}
        {/* TABLEAU */}
        {/* ================================================== */}

        <section className="table-card">
          <div className="table-header">
            <div>
              <h2 className="table-title">
                Transactions d'abonnement
              </h2>

              <div className="table-count">
                {filteredPayments.length}{" "}
                transaction
                {filteredPayments.length >
                1
                  ? "s"
                  : ""}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="state-icon">
                ⏳
              </div>

              <h3 className="state-title">
                Chargement des paiements
              </h3>

              <p className="state-description">
                Récupération des transactions
                PharmaFlow...
              </p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="state-icon">
                ⚠️
              </div>

              <h3 className="state-title">
                Impossible de charger les
                paiements
              </h3>

              <p className="state-description">
                {error}
              </p>

              <button
                type="button"
                className="retry-button"
                onClick={() =>
                  void loadPayments()
                }
              >
                Réessayer
              </button>
            </div>
          ) : filteredPayments.length ===
            0 ? (
            <div className="empty-state">
              <div className="state-icon">
                💳
              </div>

              <h3 className="state-title">
                Aucun paiement trouvé
              </h3>

              <p className="state-description">
                Aucune transaction ne
                correspond aux filtres
                sélectionnés.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      Pharmacie
                    </th>

                    <th>
                      Abonnement
                    </th>

                    <th>
                      Montant
                    </th>

                    <th>
                      Méthode
                    </th>

                    <th>
                      Fournisseur
                    </th>

                    <th>
                      Référence
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map(
                    (payment) => (
                      <tr
                        key={
                          payment.id
                        }
                      >
                        <td>
                          <div className="pharmacy-cell">
                            <div className="pharmacy-name">
                              {payment.pharmacy_name ||
                                payment.customer_name ||
                                "Pharmacie inconnue"}
                            </div>

                            {payment.customer_email && (
                              <div className="pharmacy-email">
                                {
                                  payment.customer_email
                                }
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          {payment.plan_name ||
                            "—"}
                        </td>

                        <td>
                          <span className="amount">
                            {formatAmount(
                              payment.amount,
                              payment.currency,
                            )}
                          </span>
                        </td>

                        <td>
                          {getMethodLabel(
                            payment.method,
                          )}
                        </td>

                        <td>
                          {payment.provider ||
                            "—"}
                        </td>

                        <td>
                          <span className="reference">
                            {payment.reference ||
                              payment.transaction_id ||
                              payment.id}
                          </span>
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              payment.status,
                            )}
                          >
                            {getStatusLabel(
                              payment.status,
                            )}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            payment.paid_at ||
                              payment.created_at,
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="view-button"
                            onClick={() =>
                              setSelectedPayment(
                                payment,
                              )
                            }
                          >
                            Détails
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ==================================================== */}
      {/* MODALE DÉTAILS */}
      {/* ==================================================== */}

      {selectedPayment && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={() =>
            setSelectedPayment(
              null,
            )
          }
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-details-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2
                  id="payment-details-title"
                  className="modal-title"
                >
                  Détails du paiement
                </h2>

                <p className="modal-subtitle">
                  Transaction{" "}
                  {selectedPayment.id}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setSelectedPayment(
                    null,
                  )
                }
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-label">
                    Pharmacie
                  </div>

                  <div className="detail-value">
                    {selectedPayment.pharmacy_name ||
                      "—"}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Client
                  </div>

                  <div className="detail-value">
                    {selectedPayment.customer_name ||
                      "—"}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    E-mail
                  </div>

                  <div className="detail-value">
                    {selectedPayment.customer_email ||
                      "—"}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Abonnement
                  </div>

                  <div className="detail-value">
                    {selectedPayment.plan_name ||
                      "—"}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Montant
                  </div>

                  <div className="detail-value">
                    {formatAmount(
                      selectedPayment.amount,
                      selectedPayment.currency,
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Méthode
                  </div>

                  <div className="detail-value">
                    {getMethodLabel(
                      selectedPayment.method,
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Fournisseur
                  </div>

                  <div className="detail-value">
                    {selectedPayment.provider ||
                      "—"}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Statut
                  </div>

                  <div className="detail-value">
                    {getStatusLabel(
                      selectedPayment.status,
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Référence
                  </div>

                  <div className="detail-value">
                    {selectedPayment.reference ||
                      "—"}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Transaction
                  </div>

                  <div className="detail-value">
                    {selectedPayment.transaction_id ||
                      "—"}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Créé le
                  </div>

                  <div className="detail-value">
                    {formatDate(
                      selectedPayment.created_at,
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Payé le
                  </div>

                  <div className="detail-value">
                    {formatDate(
                      selectedPayment.paid_at,
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}