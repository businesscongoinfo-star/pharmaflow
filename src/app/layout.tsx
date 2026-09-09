import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PharmaFlow — Gestion intelligente des pharmacies",
    template: "%s | PharmaFlow",
  },

  description:
    "PharmaFlow est une plateforme SaaS moderne pour gérer les pharmacies, les produits, les stocks, les ventes, les utilisateurs, les rapports et les paiements.",

  keywords: [
    "PharmaFlow",
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
      name: "PharmaFlow",
    },
  ],

  creator: "PharmaFlow",

  publisher: "PharmaFlow",

  robots: {
    index: true,
    follow: true,
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