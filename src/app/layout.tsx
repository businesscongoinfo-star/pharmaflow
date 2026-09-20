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
    title: "PharmaFlow — Gestion intelligente des pharmacies",
    description:
      "PharmaFlow est une plateforme SaaS moderne pour gérer les pharmacies, les produits, les stocks, les ventes, les utilisateurs, les rapports et les paiements.",
  },

  twitter: {
    card: "summary_large_image",
    title: "PharmaFlow — Gestion intelligente des pharmacies",
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
  /*
   * ==========================================================
   * LANGUE SERVEUR
   * ==========================================================
   *
   * La locale est déterminée une seule fois côté serveur.
   * Cela évite que le HTML initial soit généré en français
   * puis remplacé immédiatement par l'anglais côté client.
   */

  const locale = await getLocale();

  const messages = await getMessages();

  return (
    <html lang={locale}>
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