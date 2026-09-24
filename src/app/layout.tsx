import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";

/*
|--------------------------------------------------------------------------
| SITE CONFIGURATION
|--------------------------------------------------------------------------
*/

const SITE_URL = "https://pharmaflow.africa";
const SITE_NAME = "PharmaFlow Africa";
const SITE_TITLE = "PharmaFlow — Gestion intelligente des pharmacies";

const SITE_DESCRIPTION =
  "PharmaFlow est une plateforme SaaS moderne pour gérer les pharmacies, les produits, les stocks, les ventes, les utilisateurs, les rapports et les paiements.";

const SITE_EMAIL = "pharmaflowafrica@gmail.com";
const SITE_PHONE = "+242044177909";

/*
|--------------------------------------------------------------------------
| SEO / METADATA
|--------------------------------------------------------------------------
*/

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_TITLE,
    template: "%s | PharmaFlow",
  },

  description: SITE_DESCRIPTION,

  keywords: [
    "PharmaFlow",
    "PharmaFlow Africa",
    "PharmaFlow Congo",
    "PharmaFlow Afrique",
    "pharmaflow.africa",
    "gestion pharmacie",
    "logiciel pharmacie",
    "gestion pharmacie Afrique",
    "gestion stock pharmacie",
    "gestion ventes pharmacie",
    "gestion produits pharmacie",
    "gestion utilisateurs pharmacie",
    "gestion financière pharmacie",
    "SaaS pharmacie",
    "plateforme pharmacie",
    "application pharmacie",
  ],

  applicationName: SITE_NAME,

  authors: [
    {
      name: SITE_NAME,
      url: SITE_URL,
    },
  ],

  creator: SITE_NAME,

  publisher: SITE_NAME,

  category: "software",

  alternates: {
    canonical: `${SITE_URL}/`,
    languages: {
      "fr-FR": `${SITE_URL}/`,
      en: `${SITE_URL}/en`,
    },
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  /*
  |--------------------------------------------------------------------------
  | FAVICON / BRAND ICON
  |--------------------------------------------------------------------------
  |
  | Le fichier public/favicon.png doit contenir le logo officiel
  | PharmaFlow sur un fond carré.
  |
  | Recommandation :
  | 512 x 512 px ou 1024 x 1024 px
  |
  */

  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],

    shortcut: "/favicon.png",

    apple: [
      {
        url: "/favicon.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | OPEN GRAPH
  |--------------------------------------------------------------------------
  */

  openGraph: {
    type: "website",

    locale: "fr_FR",

    alternateLocale: ["en_US"],

    url: `${SITE_URL}/`,

    siteName: SITE_NAME,

    title: SITE_TITLE,

    description: SITE_DESCRIPTION,

    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "PharmaFlow Africa — Gestion intelligente des pharmacies",
        type: "image/png",
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | TWITTER / X
  |--------------------------------------------------------------------------
  */

  twitter: {
    card: "summary_large_image",

    title: SITE_TITLE,

    description: SITE_DESCRIPTION,

    images: [`${SITE_URL}/og-image.png`],

    creator: "@PharmaFlowAfrica",
  },

  /*
  |--------------------------------------------------------------------------
  | OTHER
  |--------------------------------------------------------------------------
  */

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

/*
|--------------------------------------------------------------------------
| ROOT LAYOUT
|--------------------------------------------------------------------------
*/

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  const messages = await getMessages();

  /*
  |--------------------------------------------------------------------------
  | STRUCTURED DATA — JSON-LD
  |--------------------------------------------------------------------------
  |
  | Ces données permettent aux moteurs de recherche de mieux comprendre
  | l'identité de PharmaFlow Africa et son site officiel.
  |
  */

  const structuredData = {
    "@context": "https://schema.org",

    "@graph": [
      {
        "@type": "Organization",

        "@id": `${SITE_URL}/#organization`,

        name: SITE_NAME,

        url: `${SITE_URL}/`,

        email: SITE_EMAIL,

        telephone: SITE_PHONE,

        description:
          "PharmaFlow Africa propose une plateforme SaaS moderne pour la gestion des pharmacies, des produits, des stocks, des ventes, des utilisateurs, des rapports et des paiements.",

        logo: {
          "@type": "ImageObject",

          "@id": `${SITE_URL}/#logo`,

          url: `${SITE_URL}/favicon.png`,

          contentUrl: `${SITE_URL}/favicon.png`,

          width: 512,

          height: 512,

          caption: SITE_NAME,
        },

        image: {
          "@id": `${SITE_URL}/#logo`,
        },
      },

      {
        "@type": "WebSite",

        "@id": `${SITE_URL}/#website`,

        name: SITE_NAME,

        url: `${SITE_URL}/`,

        description: SITE_DESCRIPTION,

        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },

        inLanguage: ["fr-FR", "en"],
      },

      {
        "@type": "SoftwareApplication",

        "@id": `${SITE_URL}/#software`,

        name: "PharmaFlow",

        applicationCategory: "BusinessApplication",

        operatingSystem: "Web",

        url: `${SITE_URL}/`,

        description: SITE_DESCRIPTION,

        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },

        image: `${SITE_URL}/favicon.png`,
      },
    ],
  };

  return (
    <html lang={locale}>
      <head>
        {/* =========================================================
            JSON-LD — STRUCTURED DATA
           ========================================================= */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>

      <body>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}