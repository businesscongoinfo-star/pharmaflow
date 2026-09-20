import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pharmaflow.africa"),

  title: {
    default: "PharmaFlow — Gestion intelligente des pharmacies",
    template: "%s | PharmaFlow",
  },

  description:
    "PharmaFlow est une plateforme SaaS moderne pour gérer les pharmacies, les produits, les stocks, les ventes, les utilisateurs, les rapports et les paiements.",

  keywords: [
    "PharmaFlow",
    "PharmaFlow Africa",
    "PharmaFlow Congo",
    "pharmaflow.africa",
    "pharmacie",
    "gestion pharmacie",
    "logiciel pharmacie",
    "gestion stock pharmacie",
    "gestion ventes pharmacie",
    "SaaS pharmacie",
  ],

  applicationName: "PharmaFlow",

  authors: [
    {
      name: "PharmaFlow Africa",
    },
  ],

  creator: "PharmaFlow Africa",

  publisher: "PharmaFlow Africa",

  alternates: {
    canonical: "https://pharmaflow.africa/",
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

  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://pharmaflow.africa/",
    siteName: "PharmaFlow Africa",

    title:
      "PharmaFlow — Gestion intelligente des pharmacies",

    description:
      "PharmaFlow est une plateforme SaaS moderne pour gérer les pharmacies, les produits, les stocks, les ventes, les utilisateurs, les rapports et les paiements.",
  },

  twitter: {
    card: "summary_large_image",

    title:
      "PharmaFlow — Gestion intelligente des pharmacies",

    description:
      "PharmaFlow est une plateforme SaaS moderne pour gérer les pharmacies, les produits, les stocks, les ventes, les utilisateurs, les rapports et les paiements.",
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  const messages = await getMessages();

  /*
   * ==========================================================
   * DONNÉES STRUCTURÉES SEO
   * ==========================================================
   *
   * Organization :
   * Identifie PharmaFlow Africa comme l'organisation
   * associée au site.
   *
   * WebSite :
   * Identifie pharmaflow.africa comme le site officiel.
   */

  const structuredData = {
    "@context": "https://schema.org",

    "@graph": [
      {
        "@type": "Organization",

        "@id": "https://pharmaflow.africa/#organization",

        name: "PharmaFlow Africa",

        url: "https://pharmaflow.africa/",

        email: "pharmaflowafrica@gmail.com",

        telephone: "+242044177909",

        description:
          "PharmaFlow Africa propose une plateforme SaaS moderne pour la gestion des pharmacies, des produits, des stocks, des ventes, des utilisateurs, des rapports et des paiements.",

        logo: {
          "@type": "ImageObject",
          url: "https://pharmaflow.africa/favicon.ico",
        },
      },

      {
        "@type": "WebSite",

        "@id": "https://pharmaflow.africa/#website",

        name: "PharmaFlow Africa",

        url: "https://pharmaflow.africa/",

        description:
          "PharmaFlow est une plateforme SaaS moderne pour gérer les pharmacies, les produits, les stocks, les ventes, les utilisateurs, les rapports et les paiements.",

        publisher: {
          "@id": "https://pharmaflow.africa/#organization",
        },

        inLanguage: ["fr-FR", "en"],
      },
    ],
  };

  return (
    <html lang={locale}>
      <head>
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