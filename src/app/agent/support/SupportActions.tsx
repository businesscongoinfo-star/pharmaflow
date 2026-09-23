"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  canManage: boolean;
};

export default function SupportActions({
  canManage,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [loading, setLoading] = useState(false);

  if (!canManage) {
    return (
      <div className="pf-support-readonly-banner">
        <span>👁️</span>

        <div>
          <strong>Mode consultation</strong>

          <p>
            Votre compte peut consulter les demandes, mais ne possède
            pas la permission <b>support.manage</b>.
          </p>
        </div>
      </div>
    );
  }

  async function refreshSupport() {
    setLoading(true);

    try {
      router.refresh();
    } finally {
      window.setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }

  return (
    <div className="pf-support-controls">
      <div className="pf-support-search">
        <span>⌕</span>

        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Rechercher une demande, un ticket..."
        />
      </div>

      <div className="pf-support-filters">
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value)
          }
        >
          <option value="all">Tous les types</option>
          <option value="case">Dossiers</option>
          <option value="ticket">Tickets</option>
          <option value="reclamation">
            Réclamations
          </option>
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
        >
          <option value="all">Tous les statuts</option>
          <option value="new">Nouveau</option>
          <option value="open">Ouvert</option>
          <option value="pending">
            En attente
          </option>
          <option value="in_progress">
            En cours
          </option>
          <option value="resolved">
            Résolu
          </option>
          <option value="closed">
            Fermé
          </option>
        </select>

        <select
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value)
          }
        >
          <option value="all">
            Toutes les priorités
          </option>
          <option value="low">Faible</option>
          <option value="normal">Normale</option>
          <option value="medium">Moyenne</option>
          <option value="high">Élevée</option>
          <option value="urgent">Urgente</option>
          <option value="critical">
            Critique
          </option>
        </select>

        <button
          type="button"
          className="pf-support-refresh"
          onClick={refreshSupport}
          disabled={loading}
        >
          {loading ? "Actualisation..." : "↻ Actualiser"}
        </button>
      </div>
    </div>
  );
}