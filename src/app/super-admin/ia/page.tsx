"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type AiCategory =
  | "general"
  | "platform"
  | "pharmacies"
  | "subscriptions"
  | "payments"
  | "security"
  | "support";

type OverviewData = {
  pharmacies: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  };

  subscriptions: {
    total: number;
    active: number;
    trials: number;
    expired: number;
  };

  payments: {
    today: {
      count: number;
      amount: number;
    };
    month: {
      count: number;
      amount: number;
    };
  };

  sales: {
    today: {
      count: number;
      amount: number;
    };
    month: {
      count: number;
      amount: number;
    };
  };
};

type MonitoringPharmacy = {
  id: string;
  name: string;
  status: string;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
};

type AdminAction = {
  id: string;
  pharmacy_id: string;
  action: string;
  reason: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
};

type OverviewResponse = {
  success: boolean;
  generatedAt?: string;
  overview?: OverviewData;
  monitoring?: {
    pharmacies?: MonitoringPharmacy[];
    recentAdminActions?: AdminAction[];
  };
  error?: string;
};

/**
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function SuperAdminIA() {
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [loadingOverview, setLoadingOverview] =
    useState(true);

  const [overviewError, setOverviewError] =
    useState<string | null>(null);

  const [activeCategory, setActiveCategory] =
    useState<AiCategory>("general");

  const [overview, setOverview] =
    useState<OverviewData | null>(null);

  const [monitoringPharmacies, setMonitoringPharmacies] =
    useState<MonitoringPharmacy[]>([]);

  const [recentAdminActions, setRecentAdminActions] =
    useState<AdminAction[]>([]);

  const [generatedAt, setGeneratedAt] =
    useState<string | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: 1,
        role: "assistant",
        content:
          "Bonjour 👋 Je suis l’assistant IA de PharmaFlow. Je peux aider le Super Admin à analyser la plateforme, comprendre les situations des pharmacies, examiner les abonnements et paiements, identifier des anomalies et préparer des recommandations. Les actions sensibles restent toujours sous le contrôle du Super Admin.",
      },
    ]);

  const [lastAnalysis, setLastAnalysis] =
    useState<string | null>(null);

  /**
   * ==========================================================
   * CATÉGORIES
   * ==========================================================
   */

  const categories = useMemo(
    () => [
      {
        id: "general" as AiCategory,
        icon: "✨",
        title: "Assistant général",
        description:
          "Questions générales sur PharmaFlow",
      },
      {
        id: "platform" as AiCategory,
        icon: "📊",
        title: "Analyse plateforme",
        description:
          "Comprendre l'activité globale",
      },
      {
        id: "pharmacies" as AiCategory,
        icon: "🏥",
        title: "Pharmacies",
        description:
          "Analyser les pharmacies",
      },
      {
        id: "subscriptions" as AiCategory,
        icon: "💳",
        title: "Abonnements",
        description:
          "Analyser les abonnements",
      },
      {
        id: "payments" as AiCategory,
        icon: "💰",
        title: "Paiements",
        description:
          "Analyser les paiements",
      },
      {
        id: "security" as AiCategory,
        icon: "🛡️",
        title: "Sécurité",
        description:
          "Identifier les risques",
      },
      {
        id: "support" as AiCategory,
        icon: "🎧",
        title: "Support",
        description:
          "Analyser les problèmes clients",
      },
    ],
    [],
  );

  /**
   * ==========================================================
   * SUGGESTIONS
   * ==========================================================
   */

  const suggestions = useMemo(
    () => [
      {
        icon: "🏥",
        title: "Analyser les pharmacies",
        prompt:
          "Analyse les pharmacies actuellement présentes dans PharmaFlow à partir des données réelles disponibles et indique les situations qui méritent l'attention du Super Admin.",
      },
      {
        icon: "💳",
        title: "Analyser les abonnements",
        prompt:
          "Analyse les abonnements PharmaFlow à partir des données réelles disponibles : actifs, essais et expirés. Explique ce qu'il faut surveiller.",
      },
      {
        icon: "🚨",
        title: "Chercher les anomalies",
        prompt:
          "Analyse les données disponibles de PharmaFlow et identifie les situations inhabituelles ou à surveiller.",
      },
      {
        icon: "📈",
        title: "Analyse plateforme",
        prompt:
          "Fais une analyse globale de PharmaFlow à partir des données réelles disponibles et présente les principaux indicateurs au Super Admin.",
      },
    ],
    [],
  );

  /**
   * ==========================================================
   * FORMATAGE
   * ==========================================================
   */

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("fr-FR").format(
      Number.isFinite(value) ? value : 0,
    );
  }

  function formatMoney(value: number): string {
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(
      Number.isFinite(value) ? value : 0,
    );
  }

  function formatDateTime(
    value: string | null,
  ): string {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  /**
   * ==========================================================
   * CHARGER LES DONNÉES RÉELLES
   * ==========================================================
   */

  const loadOverview = useCallback(
    async () => {
      setLoadingOverview(true);
      setOverviewError(null);

      try {
        const response = await fetch(
          "/api/super-admin/ia/overview",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        );

        let data: OverviewResponse;

        try {
          data =
            (await response.json()) as OverviewResponse;
        } catch {
          throw new Error(
            "La réponse du serveur n'est pas un JSON valide.",
          );
        }

        if (
          !response.ok ||
          !data.success ||
          !data.overview
        ) {
          throw new Error(
            data.error ||
              "Impossible de récupérer les données de PharmaFlow.",
          );
        }

        setOverview(data.overview);

        setMonitoringPharmacies(
          data.monitoring?.pharmacies || [],
        );

        setRecentAdminActions(
          data.monitoring
            ?.recentAdminActions || [],
        );

        setGeneratedAt(
          data.generatedAt || null,
        );
      } catch (error) {
        console.error(
          "Super Admin IA overview error:",
          error,
        );

        setOverviewError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les données.",
        );
      } finally {
        setLoadingOverview(false);
      }
    },
    [],
  );

  /**
   * ==========================================================
   * CHARGEMENT INITIAL
   * ==========================================================
   */

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  /**
   * ==========================================================
   * CONTEXTE RÉEL POUR L'IA
   * ==========================================================
   *
   * Les données actuellement récupérées par
   * /api/super-admin/ia/overview sont ajoutées à la
   * question envoyée à l'API IA existante.
   *
   * Aucune deuxième architecture IA n'est créée.
   */

  const aiPlatformContext = useMemo(() => {
    if (!overview) {
      return "";
    }

    const pharmaciesToMonitor =
      monitoringPharmacies
        .slice(0, 20)
        .map(
          (pharmacy) =>
            `- ${pharmacy.name} : ${pharmacy.status}${
              pharmacy.city
                ? `, ${pharmacy.city}`
                : ""
            }`,
        )
        .join("\n");

    const context = `
DONNÉES RÉELLES PHARMAFLOW DISPONIBLES POUR CETTE ANALYSE :

PHARMACIES
- Total : ${overview.pharmacies.total}
- Actives : ${overview.pharmacies.active}
- Inactives : ${overview.pharmacies.inactive}
- Suspendues : ${overview.pharmacies.suspended}

ABONNEMENTS
- Total : ${overview.subscriptions.total}
- Actifs : ${overview.subscriptions.active}
- Essais : ${overview.subscriptions.trials}
- Expirés : ${overview.subscriptions.expired}

PAIEMENTS
- Aujourd'hui : ${overview.payments.today.count} paiement(s)
- Montant aujourd'hui : ${formatMoney(
      overview.payments.today.amount,
    )}
- Ce mois : ${overview.payments.month.count} paiement(s)
- Montant ce mois : ${formatMoney(
      overview.payments.month.amount,
    )}

VENTES
- Aujourd'hui : ${overview.sales.today.count} vente(s)
- Montant aujourd'hui : ${formatMoney(
      overview.sales.today.amount,
    )}
- Ce mois : ${overview.sales.month.count} vente(s)
- Montant ce mois : ${formatMoney(
      overview.sales.month.amount,
    )}

PHARMACIES À SURVEILLER
${
  pharmaciesToMonitor ||
  "- Aucune pharmacie inactive ou suspendue actuellement chargée."
}

IMPORTANT :
- Utilise uniquement les données fournies ci-dessus comme données réelles.
- Ne fabrique pas de chiffres.
- Si une donnée n'est pas disponible, indique-le clairement.
- Ne transforme pas une hypothèse en fait.
- Ne prends aucune décision administrative automatiquement.
- Les actions sensibles restent sous le contrôle du Super Admin.
`;

    return context;
  }, [
    overview,
    monitoringPharmacies,
  ]);

  /**
   * ==========================================================
   * ENVOYER UNE QUESTION À L'IA
   * ==========================================================
   */

  async function sendMessage(
    event?: FormEvent,
    forcedMessage?: string,
  ) {
    event?.preventDefault();

    const text =
      forcedMessage ??
      message.trim();

    if (!text || loading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: text,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setMessage("");
    setLoading(true);

    try {
      /**
       * Le contexte réel est ajouté à la question.
       *
       * L'API existante /api/support/ai continue
       * d'être utilisée.
       */

      const enrichedMessage = aiPlatformContext
        ? `${text}

${aiPlatformContext}`
        : text;

      const response = await fetch(
        "/api/support/ai",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            locale: "fr",
            category: activeCategory,
            message: enrichedMessage,
            history: nextMessages
              .slice(-12)
              .map((item) => ({
                role: item.role,
                content: item.content,
              })),
          }),
        },
      );

      let data: {
        success?: boolean;
        answer?: string;
        error?: string;
      };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "La réponse du service IA n'est pas valide.",
        );
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Impossible d'obtenir une réponse de l'IA.",
        );
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          data.answer ||
          "Je n'ai pas reçu de réponse exploitable.",
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      setLastAnalysis(
        new Date().toLocaleTimeString(
          "fr-FR",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
      );
    } catch (error) {
      console.error(
        "Super Admin IA error:",
        error,
      );

      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          error instanceof Error
            ? `Le service IA n'a pas pu répondre : ${error.message}`
            : "Je n'ai pas pu contacter le service IA pour le moment. Vérifie que l'API IA existante est disponible et que sa configuration serveur est correcte.",
      };

      setMessages((current) => [
        ...current,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * VIDER LA CONVERSATION
   * ==========================================================
   */

  function clearConversation() {
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content:
          "Conversation réinitialisée. 👋 Pose-moi une question sur PharmaFlow.",
      },
    ]);

    setLastAnalysis(null);
  }

  /**
   * ==========================================================
   * CALCULS UI
   * ==========================================================
   */

  const pharmacyHealth = overview
    ? overview.pharmacies.total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (overview.pharmacies.active /
                overview.pharmacies.total) *
                100,
            ),
          ),
        )
      : 0
    : 0;

  const subscriptionHealth = overview
    ? overview.subscriptions.total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (overview.subscriptions.active /
                overview.subscriptions.total) *
                100,
            ),
          ),
        )
      : 0
    : 0;

  const pharmaciesToWatch =
    overview
      ? overview.pharmacies.inactive +
        overview.pharmacies.suspended
      : 0;

  /**
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <main className="sa-ia-page">
      <style jsx>{`
        .sa-ia-page {
          min-height: 100vh;
          padding: 32px;
          background:
            radial-gradient(
              circle at top right,
              rgba(79, 70, 229, 0.08),
              transparent 35%
            ),
            #f7f8fc;
          color: #111827;
        }

        .sa-ia-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .sa-ia-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 24px;
        }

        .sa-ia-title-wrap {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .sa-ia-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          background: #111827;
          color: white;
          box-shadow:
            0 12px 30px
              rgba(17, 24, 39, 0.16);
          flex-shrink: 0;
        }

        .sa-ia-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .sa-ia-subtitle {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 15px;
          line-height: 1.6;
          max-width: 760px;
        }

        .sa-ia-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .sa-ia-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #166534;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .sa-ia-status.error {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .sa-ia-status.loading {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }

        .sa-ia-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow:
            0 0 0 4px
              rgba(34, 197, 94, 0.12);
        }

        .sa-ia-status.error
          .sa-ia-status-dot {
          background: #ef4444;
          box-shadow:
            0 0 0 4px
              rgba(239, 68, 68, 0.12);
        }

        .sa-ia-status.loading
          .sa-ia-status-dot {
          background: #3b82f6;
          box-shadow:
            0 0 0 4px
              rgba(59, 130, 246, 0.12);
        }

        .sa-ia-refresh {
          min-height: 42px;
          border: 1px solid #dbe1ea;
          background: white;
          color: #374151;
          padding: 0 14px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .sa-ia-refresh:hover {
          background: #f8fafc;
        }

        .sa-ia-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sa-ia-generated {
          margin-bottom: 22px;
          color: #9ca3af;
          font-size: 11px;
          text-align: right;
        }

        .sa-ia-error {
          margin-bottom: 22px;
          padding: 15px 17px;
          border-radius: 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 13px;
          line-height: 1.5;
        }

        .sa-ia-error strong {
          display: block;
          margin-bottom: 4px;
        }

        .sa-ia-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .sa-ia-stat {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 19px;
          box-shadow:
            0 8px 24px
              rgba(15, 23, 42, 0.04);
        }

        .sa-ia-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .sa-ia-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          font-size: 18px;
        }

        .sa-ia-stat-label {
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
        }

        .sa-ia-stat-value {
          margin-top: 13px;
          font-size: 26px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -0.03em;
        }

        .sa-ia-stat-detail {
          margin-top: 9px;
          color: #9ca3af;
          font-size: 11px;
        }

        .sa-ia-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            360px;
          gap: 22px;
          align-items: start;
        }

        .sa-ia-main {
          min-width: 0;
        }

        .sa-ia-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow:
            0 10px 30px
              rgba(15, 23, 42, 0.05);
        }

        .sa-ia-chat {
          min-height: 700px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sa-ia-chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 22px;
          border-bottom: 1px solid #eef0f4;
        }

        .sa-ia-chat-title {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .sa-ia-chat-title-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2ff;
          font-size: 19px;
        }

        .sa-ia-chat-title strong {
          display: block;
          font-size: 15px;
        }

        .sa-ia-chat-title span {
          display: block;
          margin-top: 3px;
          color: #9ca3af;
          font-size: 12px;
        }

        .sa-ia-clear {
          border: 0;
          background: #f3f4f6;
          color: #4b5563;
          border-radius: 10px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .sa-ia-clear:hover {
          background: #e5e7eb;
        }

        .sa-ia-messages {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          min-height: 480px;
          max-height: 610px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #fbfcff 100%
            );
        }

        .sa-ia-message {
          display: flex;
          margin-bottom: 18px;
        }

        .sa-ia-message.user {
          justify-content: flex-end;
        }

        .sa-ia-message.assistant {
          justify-content: flex-start;
        }

        .sa-ia-bubble {
          max-width: 78%;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .sa-ia-message.user
          .sa-ia-bubble {
          background: #111827;
          color: white;
          border-bottom-right-radius: 5px;
        }

        .sa-ia-message.assistant
          .sa-ia-bubble {
          background: #f3f4f6;
          color: #1f2937;
          border-bottom-left-radius: 5px;
        }

        .sa-ia-loading {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .sa-ia-loading span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #6b7280;
          animation: saIaPulse 1.2s infinite;
        }

        .sa-ia-loading span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .sa-ia-loading span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes saIaPulse {
          0%,
          60%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }

          30% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        .sa-ia-input-area {
          padding: 18px;
          border-top: 1px solid #eef0f4;
          background: white;
        }

        .sa-ia-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .sa-ia-textarea {
          flex: 1;
          resize: none;
          min-height: 52px;
          max-height: 140px;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
          outline: none;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          color: #111827;
          background: #fff;
        }

        .sa-ia-textarea:focus {
          border-color: #6366f1;
          box-shadow:
            0 0 0 3px
              rgba(99, 102, 241, 0.1);
        }

        .sa-ia-textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .sa-ia-send {
          width: 52px;
          height: 52px;
          border: 0;
          border-radius: 14px;
          background: #111827;
          color: white;
          cursor: pointer;
          font-size: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sa-ia-send:hover {
          background: #1f2937;
        }

        .sa-ia-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sa-ia-input-help {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 8px;
          color: #9ca3af;
          font-size: 11px;
        }

        .sa-ia-side {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .sa-ia-panel {
          padding: 20px;
        }

        .sa-ia-panel-title {
          margin: 0 0 15px;
          font-size: 15px;
          font-weight: 800;
        }

        .sa-ia-category {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid transparent;
          background: #f9fafb;
          border-radius: 13px;
          text-align: left;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .sa-ia-category:last-child {
          margin-bottom: 0;
        }

        .sa-ia-category:hover {
          background: #f3f4f6;
        }

        .sa-ia-category.active {
          background: #eef2ff;
          border-color: #c7d2fe;
        }

        .sa-ia-category-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }

        .sa-ia-category strong {
          display: block;
          font-size: 13px;
          color: #111827;
        }

        .sa-ia-category small {
          display: block;
          margin-top: 3px;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.4;
        }

        .sa-ia-suggestion {
          width: 100%;
          border: 1px solid #e5e7eb;
          background: white;
          padding: 13px;
          border-radius: 13px;
          display: flex;
          gap: 11px;
          text-align: left;
          cursor: pointer;
          margin-bottom: 9px;
        }

        .sa-ia-suggestion:last-child {
          margin-bottom: 0;
        }

        .sa-ia-suggestion:hover {
          border-color: #c7d2fe;
          background: #fafaff;
        }

        .sa-ia-suggestion:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sa-ia-suggestion-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .sa-ia-suggestion strong {
          display: block;
          font-size: 12px;
          color: #111827;
        }

        .sa-ia-suggestion span {
          display: block;
          margin-top: 4px;
          color: #9ca3af;
          font-size: 10px;
          line-height: 1.4;
        }

        .sa-ia-monitor {
          padding: 18px;
        }

        .sa-ia-monitor-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 0;
          border-bottom: 1px solid #f0f1f4;
        }

        .sa-ia-monitor-item:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .sa-ia-monitor-label {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12px;
          color: #4b5563;
        }

        .sa-ia-monitor-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          flex-shrink: 0;
        }

        .sa-ia-monitor-dot.warning {
          background: #f59e0b;
        }

        .sa-ia-monitor-value {
          font-size: 12px;
          font-weight: 800;
          color: #111827;
          text-align: right;
        }

        .sa-ia-health {
          margin-top: 17px;
        }

        .sa-ia-health-header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
          font-size: 11px;
          color: #6b7280;
        }

        .sa-ia-health-bar {
          height: 8px;
          border-radius: 999px;
          background: #eef0f4;
          overflow: hidden;
        }

        .sa-ia-health-fill {
          height: 100%;
          border-radius: inherit;
          background: #22c55e;
          transition: width 0.3s ease;
        }

        .sa-ia-analysis {
          margin-top: 22px;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #1e3a8a;
        }

        .sa-ia-analysis strong {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
        }

        .sa-ia-analysis span {
          font-size: 12px;
          line-height: 1.5;
        }

        .sa-ia-monitor-list {
          max-height: 230px;
          overflow-y: auto;
        }

        .sa-ia-pharmacy-row {
          padding: 11px 0;
          border-bottom: 1px solid #f0f1f4;
        }

        .sa-ia-pharmacy-row:last-child {
          border-bottom: 0;
        }

        .sa-ia-pharmacy-name {
          font-size: 12px;
          font-weight: 800;
          color: #111827;
          overflow-wrap: anywhere;
        }

        .sa-ia-pharmacy-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 4px;
          font-size: 10px;
          color: #9ca3af;
        }

        .sa-ia-pharmacy-status {
          font-weight: 800;
          text-transform: capitalize;
        }

        .sa-ia-action-row {
          padding: 10px 0;
          border-bottom: 1px solid #f0f1f4;
        }

        .sa-ia-action-row:last-child {
          border-bottom: 0;
        }

        .sa-ia-action-name {
          font-size: 11px;
          font-weight: 800;
          color: #374151;
        }

        .sa-ia-action-meta {
          margin-top: 4px;
          font-size: 10px;
          color: #9ca3af;
          line-height: 1.4;
        }

        .sa-ia-disclaimer {
          margin-top: 18px;
          padding: 14px;
          border-radius: 13px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          font-size: 11px;
          line-height: 1.55;
        }

        .sa-ia-empty {
          padding: 14px 0;
          color: #9ca3af;
          font-size: 11px;
          line-height: 1.5;
        }

        .sa-ia-loading-card {
          min-height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 12px;
        }

        @media (max-width: 1200px) {
          .sa-ia-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1100px) {
          .sa-ia-grid {
            grid-template-columns: 1fr;
          }

          .sa-ia-side {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .sa-ia-page {
            padding: 18px;
          }

          .sa-ia-header {
            flex-direction: column;
          }

          .sa-ia-header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .sa-ia-generated {
            text-align: left;
          }

          .sa-ia-stats {
            grid-template-columns: 1fr;
          }

          .sa-ia-title {
            font-size: 24px;
          }

          .sa-ia-side {
            display: flex;
          }

          .sa-ia-chat {
            min-height: 620px;
          }

          .sa-ia-chat-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .sa-ia-messages {
            padding: 16px;
          }

          .sa-ia-bubble {
            max-width: 90%;
          }

          .sa-ia-input-row {
            align-items: stretch;
          }

          .sa-ia-send {
            width: 48px;
            height: 48px;
          }

          .sa-ia-input-help {
            flex-direction: column;
            gap: 4px;
          }

          .sa-ia-pharmacy-meta {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="sa-ia-container">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="sa-ia-header">
          <div className="sa-ia-title-wrap">
            <div className="sa-ia-icon">
              🤖
            </div>

            <div>
              <h1 className="sa-ia-title">
                Centre IA
              </h1>

              <p className="sa-ia-subtitle">
                Intelligence opérationnelle
                de PharmaFlow pour le Super
                Admin : analyse, surveillance,
                support et recommandations.
              </p>
            </div>
          </div>

          <div className="sa-ia-header-actions">
            <div
              className={`sa-ia-status ${
                overviewError
                  ? "error"
                  : loadingOverview
                    ? "loading"
                    : ""
              }`}
            >
              <span className="sa-ia-status-dot" />

              {overviewError
                ? "Données indisponibles"
                : loadingOverview
                  ? "Synchronisation..."
                  : "Données synchronisées"}
            </div>

            <button
              type="button"
              className="sa-ia-refresh"
              onClick={() =>
                void loadOverview()
              }
              disabled={loadingOverview}
            >
              {loadingOverview
                ? "Actualisation..."
                : "↻ Actualiser"}
            </button>
          </div>
        </header>

        {generatedAt && (
          <div className="sa-ia-generated">
            Données actualisées le{" "}
            {formatDateTime(generatedAt)}
          </div>
        )}

        {/* ====================================================
            ERREUR DONNÉES
        ==================================================== */}

        {overviewError && (
          <div className="sa-ia-error">
            <strong>
              ⚠️ Impossible de charger les données
            </strong>

            {overviewError}

            <br />

            <span>
              Le chat IA reste disponible,
              mais il ne doit pas être considéré
              comme une source de chiffres réels
              tant que la synchronisation n'est
              pas rétablie.
            </span>
          </div>
        )}

        {/* ====================================================
            STATISTIQUES RÉELLES
        ==================================================== */}

        {loadingOverview && !overview ? (
          <div className="sa-ia-stats">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="sa-ia-card sa-ia-loading-card"
              >
                Chargement des données...
              </div>
            ))}
          </div>
        ) : (
          <div className="sa-ia-stats">
            {/* PHARMACIES */}

            <div className="sa-ia-stat">
              <div className="sa-ia-stat-top">
                <span className="sa-ia-stat-label">
                  Pharmacies
                </span>

                <div className="sa-ia-stat-icon">
                  🏥
                </div>
              </div>

              <div className="sa-ia-stat-value">
                {formatNumber(
                  overview?.pharmacies.total ||
                    0,
                )}
              </div>

              <div className="sa-ia-stat-detail">
                {formatNumber(
                  overview?.pharmacies.active ||
                    0,
                )}{" "}
                actives ·{" "}
                {formatNumber(
                  pharmaciesToWatch,
                )}{" "}
                à surveiller
              </div>
            </div>

            {/* ABONNEMENTS */}

            <div className="sa-ia-stat">
              <div className="sa-ia-stat-top">
                <span className="sa-ia-stat-label">
                  Abonnements actifs
                </span>

                <div className="sa-ia-stat-icon">
                  💳
                </div>
              </div>

              <div className="sa-ia-stat-value">
                {formatNumber(
                  overview?.subscriptions
                    .active || 0,
                )}
              </div>

              <div className="sa-ia-stat-detail">
                {formatNumber(
                  overview?.subscriptions
                    .trials || 0,
                )}{" "}
                essais ·{" "}
                {formatNumber(
                  overview?.subscriptions
                    .expired || 0,
                )}{" "}
                expirés
              </div>
            </div>

            {/* PAIEMENTS */}

            <div className="sa-ia-stat">
              <div className="sa-ia-stat-top">
                <span className="sa-ia-stat-label">
                  Paiements du mois
                </span>

                <div className="sa-ia-stat-icon">
                  💰
                </div>
              </div>

              <div className="sa-ia-stat-value">
                {formatNumber(
                  overview?.payments.month
                    .count || 0,
                )}
              </div>

              <div className="sa-ia-stat-detail">
                Montant :{" "}
                {formatMoney(
                  overview?.payments.month
                    .amount || 0,
                )}
              </div>
            </div>

            {/* VENTES */}

            <div className="sa-ia-stat">
              <div className="sa-ia-stat-top">
                <span className="sa-ia-stat-label">
                  Ventes du mois
                </span>

                <div className="sa-ia-stat-icon">
                  📈
                </div>
              </div>

              <div className="sa-ia-stat-value">
                {formatNumber(
                  overview?.sales.month
                    .count || 0,
                )}
              </div>

              <div className="sa-ia-stat-detail">
                Montant :{" "}
                {formatMoney(
                  overview?.sales.month
                    .amount || 0,
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            CONTENU PRINCIPAL
        ==================================================== */}

        <div className="sa-ia-grid">
          {/* ==================================================
              CHAT
          ================================================== */}

          <section className="sa-ia-main">
            <div className="sa-ia-card sa-ia-chat">
              <div className="sa-ia-chat-header">
                <div className="sa-ia-chat-title">
                  <div className="sa-ia-chat-title-icon">
                    🧠
                  </div>

                  <div>
                    <strong>
                      Assistant Super Admin
                    </strong>

                    <span>
                      Analyse basée sur les données
                      disponibles
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="sa-ia-clear"
                  onClick={
                    clearConversation
                  }
                >
                  Nouvelle conversation
                </button>
              </div>

              <div className="sa-ia-messages">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`sa-ia-message ${item.role}`}
                  >
                    <div className="sa-ia-bubble">
                      {item.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="sa-ia-message assistant">
                    <div className="sa-ia-bubble">
                      <div className="sa-ia-loading">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sa-ia-input-area">
                <form
                  onSubmit={(event) =>
                    void sendMessage(event)
                  }
                >
                  <div className="sa-ia-input-row">
                    <textarea
                      className="sa-ia-textarea"
                      placeholder="Posez une question à l’IA du Super Admin..."
                      value={message}
                      onChange={(event) =>
                        setMessage(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();

                          void sendMessage();
                        }
                      }}
                      disabled={loading}
                      rows={2}
                    />

                    <button
                      type="submit"
                      className="sa-ia-send"
                      disabled={
                        loading ||
                        !message.trim()
                      }
                      aria-label="Envoyer"
                    >
                      ➤
                    </button>
                  </div>
                </form>

                <div className="sa-ia-input-help">
                  <span>
                    Entrée pour envoyer ·
                    Maj + Entrée pour une
                    nouvelle ligne
                  </span>

                  <span>
                    {lastAnalysis
                      ? `Dernière analyse : ${lastAnalysis}`
                      : "Analyse IA"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              COLONNE DROITE
          ================================================== */}

          <aside className="sa-ia-side">
            {/* =================================================
                DOMAINES
            ================================================= */}

            <div className="sa-ia-card sa-ia-panel">
              <h2 className="sa-ia-panel-title">
                Domaines d’analyse
              </h2>

              {categories.map(
                (category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`sa-ia-category ${
                      activeCategory ===
                      category.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setActiveCategory(
                        category.id,
                      )
                    }
                  >
                    <div className="sa-ia-category-icon">
                      {category.icon}
                    </div>

                    <div>
                      <strong>
                        {category.title}
                      </strong>

                      <small>
                        {
                          category.description
                        }
                      </small>
                    </div>
                  </button>
                ),
              )}
            </div>

            {/* =================================================
                QUESTIONS RAPIDES
            ================================================= */}

            <div className="sa-ia-card sa-ia-panel">
              <h2 className="sa-ia-panel-title">
                Analyses rapides
              </h2>

              {suggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion.title}
                    type="button"
                    className="sa-ia-suggestion"
                    onClick={() =>
                      void sendMessage(
                        undefined,
                        suggestion.prompt,
                      )
                    }
                    disabled={loading}
                  >
                    <span className="sa-ia-suggestion-icon">
                      {suggestion.icon}
                    </span>

                    <span>
                      <strong>
                        {
                          suggestion.title
                        }
                      </strong>

                      <span>
                        Lancer une analyse
                      </span>
                    </span>
                  </button>
                ),
              )}
            </div>

            {/* =================================================
                SURVEILLANCE
            ================================================= */}

            <div className="sa-ia-card sa-ia-monitor">
              <h2 className="sa-ia-panel-title">
                Surveillance
              </h2>

              <div className="sa-ia-monitor-item">
                <div className="sa-ia-monitor-label">
                  <span className="sa-ia-monitor-dot" />
                  Moteur IA
                </div>

                <span className="sa-ia-monitor-value">
                  Disponible
                </span>
              </div>

              <div className="sa-ia-monitor-item">
                <div className="sa-ia-monitor-label">
                  <span
                    className={`sa-ia-monitor-dot ${
                      overviewError
                        ? "warning"
                        : ""
                    }`}
                  />

                  Données plateforme
                </div>

                <span className="sa-ia-monitor-value">
                  {overview
                    ? "Synchronisées"
                    : "Indisponibles"}
                </span>
              </div>

              <div className="sa-ia-monitor-item">
                <div className="sa-ia-monitor-label">
                  <span className="sa-ia-monitor-dot" />
                  Pharmacies actives
                </div>

                <span className="sa-ia-monitor-value">
                  {formatNumber(
                    overview?.pharmacies
                      .active || 0,
                  )}
                </span>
              </div>

              <div className="sa-ia-monitor-item">
                <div className="sa-ia-monitor-label">
                  <span
                    className={`sa-ia-monitor-dot ${
                      pharmaciesToWatch > 0
                        ? "warning"
                        : ""
                    }`}
                  />

                  Pharmacies à surveiller
                </div>

                <span className="sa-ia-monitor-value">
                  {formatNumber(
                    pharmaciesToWatch,
                  )}
                </span>
              </div>

              <div className="sa-ia-health">
                <div className="sa-ia-health-header">
                  <span>
                    Pharmacies actives
                  </span>

                  <strong>
                    {pharmacyHealth}%
                  </strong>
                </div>

                <div className="sa-ia-health-bar">
                  <div
                    className="sa-ia-health-fill"
                    style={{
                      width: `${pharmacyHealth}%`,
                    }}
                  />
                </div>
              </div>

              <div className="sa-ia-health">
                <div className="sa-ia-health-header">
                  <span>
                    Abonnements actifs
                  </span>

                  <strong>
                    {subscriptionHealth}%
                  </strong>
                </div>

                <div className="sa-ia-health-bar">
                  <div
                    className="sa-ia-health-fill"
                    style={{
                      width: `${subscriptionHealth}%`,
                    }}
                  />
                </div>
              </div>

              <div className="sa-ia-disclaimer">
                🔐 L’IA fournit des analyses et
                recommandations. Elle ne modifie
                pas directement les pharmacies,
                abonnements, paiements ou
                comptes administrateurs.
              </div>
            </div>

            {/* =================================================
                PHARMACIES À SURVEILLER
            ================================================= */}

            <div className="sa-ia-card sa-ia-panel">
              <h2 className="sa-ia-panel-title">
                🚨 Pharmacies à surveiller
              </h2>

              <div className="sa-ia-monitor-list">
                {monitoringPharmacies.length ===
                0 ? (
                  <div className="sa-ia-empty">
                    Aucune pharmacie inactive ou
                    suspendue dans les données
                    actuellement chargées.
                  </div>
                ) : (
                  monitoringPharmacies.map(
                    (pharmacy) => (
                      <div
                        key={pharmacy.id}
                        className="sa-ia-pharmacy-row"
                      >
                        <div className="sa-ia-pharmacy-name">
                          {pharmacy.name}
                        </div>

                        <div className="sa-ia-pharmacy-meta">
                          <span>
                            {pharmacy.city ||
                              "Ville non renseignée"}
                          </span>

                          <span className="sa-ia-pharmacy-status">
                            {pharmacy.status}
                          </span>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            {/* =================================================
                ACTIONS ADMIN
            ================================================= */}

            <div className="sa-ia-card sa-ia-panel">
              <h2 className="sa-ia-panel-title">
                🛡️ Activité administrative
              </h2>

              <div className="sa-ia-monitor-list">
                {recentAdminActions.length ===
                0 ? (
                  <div className="sa-ia-empty">
                    Aucune action administrative
                    récente disponible.
                  </div>
                ) : (
                  recentAdminActions
                    .slice(0, 10)
                    .map((action) => (
                      <div
                        key={action.id}
                        className="sa-ia-action-row"
                      >
                        <div className="sa-ia-action-name">
                          {action.action}
                        </div>

                        <div className="sa-ia-action-meta">
                          {action.reason ||
                            "Aucun motif renseigné"}

                          <br />

                          {formatDateTime(
                            action.created_at,
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* ====================================================
            ANALYSE
        ==================================================== */}

        <div className="sa-ia-analysis">
          <strong>
            🧠 Centre IA connecté aux données PharmaFlow
          </strong>

          <span>
            Le Centre IA utilise les indicateurs
            récupérés par l'API Super Admin :
            pharmacies, abonnements, paiements,
            ventes et surveillance administrative.
            Les chiffres affichés ici proviennent
            de la dernière synchronisation réussie.
          </span>
        </div>
      </div>
    </main>
  );
}