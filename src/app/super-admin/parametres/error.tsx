"use client";

export default function Error({
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f5f7fb",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          padding: "32px",
          textAlign: "center",
          background: "#fff",
          border: "1px solid #e5e9f0",
          borderRadius: "18px",
          boxShadow:
            "0 10px 35px rgba(16,24,40,.06)",
        }}
      >
        <div
          style={{
            fontSize: "42px",
            marginBottom: "12px",
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            margin: 0,
            color: "#101828",
            fontSize: "22px",
            fontWeight: 850,
          }}
        >
          Impossible de charger les paramètres
        </h1>

        <p
          style={{
            margin: "10px 0 20px",
            color: "#667085",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          Une erreur temporaire est survenue.
          Vous pouvez réessayer sans modifier
          votre configuration.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          style={{
            minHeight: "42px",
            padding: "0 18px",
            border: 0,
            borderRadius: "10px",
            background: "#0f766e",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Réessayer
        </button>
      </section>
    </main>
  );
}