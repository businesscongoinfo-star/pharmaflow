import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

import PharmacyEditForm from "./PharmacyEditForm";

type Pharmacy = {
  id: string;
  name: string;
  country_code: string;
  city: string;
  address: string | null;
  currency_code: string;
  owner_id: string | null;
  status: string;
  language: string;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPharmacyPage({
  params,
}: PageProps) {
  await requireSuperAdmin();

  const { id } = await params;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pharmacies")
    .select(`
      id,
      name,
      country_code,
      city,
      address,
      currency_code,
      owner_id,
      status,
      language
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de récupérer la pharmacie : ${error.message}`
    );
  }

  if (!data) {
    notFound();
  }

  const pharmacy = data as Pharmacy;

  return (
    <main className="edit-page">
      <div className="edit-container">

        {/* HEADER */}
        <header className="page-header">

          <div>
            <div className="breadcrumb">

              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <Link href="/super-admin/pharmacies">
                Pharmacies
              </Link>

              <span>/</span>

              <Link
                href={`/super-admin/pharmacies/${pharmacy.id}`}
              >
                {pharmacy.name}
              </Link>

              <span>/</span>

              <span>Modifier</span>

            </div>

            <h1>
              Modifier la pharmacie
            </h1>

            <p>
              Modifiez les informations de{" "}
              <strong>{pharmacy.name}</strong>.
            </p>
          </div>

          <div className="header-actions">

            <Link
              href={`/super-admin/pharmacies/${pharmacy.id}`}
              className="btn btn-secondary"
            >
              ← Retour
            </Link>

          </div>

        </header>

        {/* FORMULAIRE */}
        <section className="edit-card">

          <div className="card-header">

            <div>
              <h2>
                Informations générales
              </h2>

              <p>
                Modifiez les informations puis
                enregistrez.
              </p>
            </div>

          </div>

          {/* IMPORTANT :
              Aucun <form action="/api/..."> ici.
              Le formulaire est géré par le composant client.
          */}
          <PharmacyEditForm
            pharmacy={pharmacy}
          />

        </section>

      </div>

      <style>{`

        .edit-page {
          min-height: 100vh;
          background: #f6f8fb;
          padding: 32px;
        }

        .edit-container {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .breadcrumb {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 13px;
          color: #7b8494;
        }

        .breadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }

        .breadcrumb a:hover {
          text-decoration: underline;
        }

        .page-header h1 {
          margin: 0;
          color: #111827;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .page-header p {
          margin: 8px 0 0;
          color: #687386;
          font-size: 15px;
        }

        .page-header p strong {
          color: #374151;
        }

        .header-actions {
          display: flex;
          align-items: center;
        }

        .edit-card {
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e5e9f0;
          border-radius: 16px;
          box-shadow:
            0 3px 12px rgba(15, 23, 42, 0.04);
        }

        .card-header {
          padding: 22px 24px;
          border-bottom: 1px solid #edf0f4;
        }

        .card-header h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 800;
        }

        .card-header p {
          margin: 5px 0 0;
          color: #7b8494;
          font-size: 13px;
        }

        .btn {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .btn-secondary {
          background: #ffffff;
          border: 1px solid #dbe1ea;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #f8fafc;
        }

        @media (max-width: 700px) {

          .edit-page {
            padding: 18px;
          }

          .page-header {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions .btn {
            width: 100%;
          }

        }

      `}</style>
    </main>
  );
}