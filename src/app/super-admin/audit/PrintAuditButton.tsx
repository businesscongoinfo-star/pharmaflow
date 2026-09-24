"use client";

export default function PrintAuditButton() {
  function handlePrint() {
    const page = document.querySelector(
      ".pf-audit-page",
    );

    if (!page) {
      window.print();
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1400,height=1000",
    );

    if (!printWindow) {
      window.print();
      return;
    }

    const pageHtml = page.outerHTML;

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />

          <title>
            PharmaFlow — Journal d'audit
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              min-height: 100%;
              background: #ffffff;
              color: #10232d;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            body {
              padding: 20px;
            }

            .pf-audit-page {
              width: 100%;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
            }

            .pf-audit-container {
              width: 100%;
              max-width: 1400px;
              margin: 0 auto;
            }

            .pf-audit-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 24px;
              padding-bottom: 18px;
              border-bottom: 2px solid #0f766e;
            }

            .pf-audit-breadcrumb {
              display: none !important;
            }

            .pf-audit-eyebrow {
              display: inline-flex;
              align-items: center;
              min-height: 25px;
              padding: 0 9px;
              margin-bottom: 8px;
              border-radius: 999px;
              background: #e8f6f3;
              color: #0f766e;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: .08em;
            }

            .pf-audit-header h1 {
              margin: 0;
              color: #10232d;
              font-size: 30px;
              line-height: 1.1;
              font-weight: 800;
            }

            .pf-audit-header p {
              max-width: 700px;
              margin: 7px 0 0;
              color: #657681;
              font-size: 12px;
              line-height: 1.5;
            }

            .pf-audit-header-actions {
              display: none !important;
            }

            .pf-audit-stats {
              display: grid;
              grid-template-columns:
                repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 18px;
            }

            .pf-audit-stat {
              display: flex;
              align-items: center;
              gap: 11px;
              min-height: 80px;
              padding: 13px;
              border: 1px solid #dfe7eb;
              border-radius: 12px;
              background: #ffffff;
              box-shadow: none !important;
            }

            .pf-audit-stat-icon {
              width: 38px;
              height: 38px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 10px;
              background: #edf7f5;
              font-size: 16px;
            }

            .pf-audit-stat span,
            .pf-audit-stat strong,
            .pf-audit-stat small {
              display: block;
            }

            .pf-audit-stat span {
              color: #82909b;
              font-size: 9px;
              font-weight: 700;
            }

            .pf-audit-stat strong {
              margin-top: 2px;
              color: #1c303a;
              font-size: 21px;
              font-weight: 800;
            }

            .pf-audit-stat small {
              margin-top: 1px;
              color: #9aa6af;
              font-size: 8px;
            }

            .pf-audit-warning {
              margin-bottom: 14px;
              padding: 10px 12px;
              border: 1px solid #ead7a3;
              border-radius: 10px;
              background: #fffaf0;
            }

            .pf-audit-filter-card {
              display: none !important;
            }

            .pf-audit-log-card {
              overflow: visible !important;
              border: 1px solid #dce5e9;
              border-radius: 12px;
              background: #ffffff;
              box-shadow: none !important;
            }

            .pf-audit-log-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              padding: 15px;
              border-bottom: 1px solid #e5eaed;
            }

            .pf-audit-live {
              display: flex;
              align-items: center;
              gap: 6px;
              color: #0f766e;
              font-size: 8px;
              font-weight: 800;
              letter-spacing: .08em;
            }

            .pf-audit-live span {
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: #18a48f;
            }

            .pf-audit-log-header h2 {
              margin: 4px 0 0;
              color: #1c3039;
              font-size: 16px;
              font-weight: 800;
            }

            .pf-audit-log-header p {
              margin: 3px 0 0;
              color: #87949d;
              font-size: 9px;
            }

            .pf-audit-secure-badge {
              padding: 6px 9px;
              border-radius: 8px;
              background: #f1f7f6;
              color: #39716c;
              font-size: 8px;
              font-weight: 800;
            }

            .pf-audit-table-wrapper {
              width: 100%;
              overflow: visible !important;
            }

            .pf-audit-table {
              width: 100%;
              min-width: 0 !important;
              border-collapse: collapse;
              table-layout: fixed;
            }

            .pf-audit-table th {
              padding: 9px 10px;
              background: #f7f9fa;
              color: #71808a;
              text-align: left;
              font-size: 8px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: .05em;
              border-bottom: 1px solid #e5eaed;
            }

            .pf-audit-table td {
              padding: 10px;
              border-bottom: 1px solid #edf1f3;
              vertical-align: middle;
              color: #344650;
            }

            .pf-audit-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .pf-audit-event {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              min-width: 0;
            }

            .pf-audit-event-icon {
              width: 28px;
              height: 28px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 7px;
              background: #f0f7f6;
              font-size: 13px;
            }

            .pf-audit-event div:last-child {
              display: flex;
              flex-direction: column;
              gap: 2px;
              min-width: 0;
            }

            .pf-audit-event strong {
              color: #293a44;
              font-size: 9px;
              font-weight: 800;
            }

            .pf-audit-event span {
              color: #88959e;
              font-size: 8px;
              line-height: 1.35;
            }

            .pf-audit-source,
            .pf-audit-status {
              display: inline-flex;
              align-items: center;
              min-height: 21px;
              padding: 0 7px;
              border-radius: 999px;
              font-size: 7px;
              font-weight: 800;
              white-space: nowrap;
            }

            .audit-source-team {
              background: #eef4ff;
              color: #4969a0;
            }

            .audit-source-ticket {
              background: #edf8f5;
              color: #34766d;
            }

            .audit-source-case {
              background: #f5f0ff;
              color: #7355a0;
            }

            .audit-status-success {
              background: #eaf8f3;
              color: #167363;
            }

            .audit-status-warning {
              background: #fff7df;
              color: #92701e;
            }

            .audit-status-danger {
              background: #fff0f0;
              color: #ad4d4d;
            }

            .audit-status-neutral {
              background: #f1f4f6;
              color: #697983;
            }

            .pf-audit-actor {
              color: #52636d;
              font-size: 8px;
              font-weight: 700;
            }

            .pf-audit-date {
              color: #778791;
              font-size: 8px;
              white-space: nowrap;
            }

            .pf-audit-view {
              display: none !important;
            }

            .pf-audit-security-note {
              margin-top: 14px;
              padding: 10px 12px;
              border: 1px solid #dce9e7;
              border-radius: 10px;
              background: #f8fcfb;
            }

            .pf-audit-security-icon {
              display: none !important;
            }

            .pf-audit-security-note strong {
              color: #36504f;
              font-size: 9px;
            }

            .pf-audit-security-note p {
              margin: 3px 0 0;
              color: #7b8b91;
              font-size: 8px;
              line-height: 1.45;
            }

            .pf-audit-empty {
              padding: 40px 15px;
              text-align: center;
            }

            .pf-audit-empty-button {
              display: none !important;
            }

            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            @media print {
              html,
              body {
                width: 100%;
                min-height: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }

              .pf-audit-page {
                display: block !important;
                visibility: visible !important;
              }
            }
          </style>
        </head>

        <body>
          ${pageHtml}
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();

      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  }

  return (
    <button
      type="button"
      className="pf-audit-print"
      onClick={handlePrint}
      title="Imprimer le journal d'audit"
    >
      🖨️ Imprimer
    </button>
  );
}