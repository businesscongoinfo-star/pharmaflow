export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            height: "38px",
            width: "280px",
            borderRadius: "10px",
            background: "#e8edf2",
            marginBottom: "24px",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "285px minmax(0,1fr)",
            gap: "22px",
          }}
        >
          <div
            style={{
              height: "430px",
              borderRadius: "17px",
              background: "#fff",
              border: "1px solid #e5e9f0",
            }}
          />

          <div
            style={{
              height: "430px",
              borderRadius: "17px",
              background: "#fff",
              border: "1px solid #e5e9f0",
            }}
          />
        </div>
      </div>
    </main>
  );
}