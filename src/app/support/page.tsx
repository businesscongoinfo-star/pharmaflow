"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./support.css";

type Locale = "fr" | "en";

type SupportCategory =
  | "general"
  | "payment"
  | "technical"
  | "complaint"
  | "commercial";

type ChatSender =
  | "ai"
  | "user"
  | "agent";

type ChatMessage = {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: string;
};

type TicketInfo = {
  id: string;
  ticketNumber: string;
  status: string;
  category: SupportCategory;
};

const TEXT = {
  fr: {
    brand: "PharmaFlow",
    backHome: "Retour à l'accueil",

    title: "Centre d'assistance",

    subtitle:
      "Une équipe et un assistant intelligent sont à votre disposition pour vous aider rapidement.",

    online: "Assistance disponible",

    aiBadge:
      "Assistant IA PharmaFlow",

    aiTitle:
      "Comment pouvons-nous vous aider ?",

    aiDescription:
      "Décrivez votre question ou votre problème. L'assistant comprend le contexte de la conversation et peut vous guider étape par étape.",

    placeholder:
      "Écrivez votre message...",

    send: "Envoyer",

    thinking:
      "Analyse en cours...",

    startChat:
      "Démarrer une conversation",

    humanSupport:
      "Parler à un conseiller",

    humanDescription:
      "Vous préférez parler à une personne ? Ouvrez directement une demande auprès de notre équipe, sans quitter le Centre d'assistance.",

    payment:
      "Problème de paiement",

    paymentDescription:
      "Paiement débité, abonnement non activé, transaction en attente ou autre problème.",

    complaint:
      "Déposer une réclamation",

    complaintDescription:
      "Signalez officiellement un problème concernant PharmaFlow ou un service.",

    technical:
      "Assistance technique",

    technicalDescription:
      "Connexion, compte, produits, stock, ventes ou fonctionnement de la plateforme.",

    commercial:
      "Service commercial",

    commercialDescription:
      "Une question sur les offres, les tarifs ou les possibilités de PharmaFlow ?",

    contactsTitle:
      "Nous contacter directement",

    contactsDescription:
      "Vous pouvez également contacter notre équipe par les différents canaux disponibles.",

    generalSupport:
      "Support général",

    paymentSupport:
      "Paiements & transactions",

    complaints:
      "Réclamations",

    sales:
      "Commercial",

    phone: "Téléphone",

    whatsapp: "WhatsApp",

    email: "E-mail",

    unavailable:
      "Coordonnée à configurer",

    hoursTitle:
      "Horaires d'assistance",

    hours:
      "Les horaires et disponibilités de notre équipe seront affichés ici.",

    secureTitle:
      "Vos informations restent protégées",

    secureDescription:
      "Ne communiquez jamais votre mot de passe, votre code PIN Mobile Money, votre CVV ou tout autre code secret dans une conversation de support.",

    ticketTitle:
      "Vous avez déjà une demande ?",

    ticketDescription:
      "Si vous avez ouvert une demande depuis cet appareil, vous pouvez reprendre la conversation.",

    login: "Se connecter",

    createAccount:
      "Créer un compte",

    categoryTitle:
      "Choisissez votre besoin",

    categoryDescription:
      "Sélectionnez le type d'assistance correspondant à votre demande.",

    general:
      "Question générale",

    technicalShort:
      "Problème technique",

    paymentShort:
      "Paiement / transaction",

    complaintShort:
      "Réclamation",

    commercialShort:
      "Question commerciale",

    welcome:
      "Bonjour 👋 Je suis l'assistant PharmaFlow. Je peux vous aider à comprendre la plateforme, ses modules, les produits, le stock, les ventes, les utilisateurs, les rapports, les abonnements, les paiements et bien d'autres fonctionnalités.",

    paymentHint:
      "Pour un problème de paiement, préparez si possible votre référence de transaction, le montant, la devise et la date du paiement. Ne transmettez jamais de code secret.",

    complaintHint:
      "Pour une réclamation, expliquez clairement les faits, la date du problème et, si nécessaire, la référence concernée.",

    footer:
      "PharmaFlow — Gestion professionnelle des pharmacies.",

    language: "Langue",

    humanTitle:
      "Parler directement à un conseiller",

    humanSubtitle:
      "Aucune connexion n'est nécessaire. Laissez vos coordonnées et votre message afin que notre équipe puisse vous répondre.",

    name: "Votre nom",

    emailField:
      "Votre e-mail",

    phoneField:
      "Téléphone",

    namePlaceholder:
      "Ex. Jean Dupont",

    emailPlaceholder:
      "Ex. jean@exemple.com",

    phonePlaceholder:
      "Ex. +242...",

    humanMessagePlaceholder:
      "Expliquez-nous votre problème ou votre demande...",

    createTicket:
      "Envoyer au conseiller",

    creatingTicket:
      "Création de la demande...",

    ticketCreated:
      "Votre demande a été créée",

    ticketReference:
      "Référence de votre demande",

    keepReference:
      "Conservez cette référence pour suivre votre conversation.",

    continueConversation:
      "Continuer la conversation",

    customerConversation:
      "Conversation avec le support",

    agentWaiting:
      "Votre demande est bien enregistrée. Notre équipe pourra répondre dans cette conversation.",

    backToAI:
      "Retour à l'assistant IA",

    ticketError:
      "Impossible de créer la demande pour le moment. Veuillez réessayer.",

    requiredContact:
      "Indiquez au moins votre e-mail ou votre téléphone.",

    requiredName:
      "Veuillez indiquer votre nom.",

    requiredMessage:
      "Veuillez écrire votre message.",

    reopenTicket:
      "Reprendre ma conversation",

    aiUnavailable:
      "L'assistant IA est momentanément indisponible. Vous pouvez ouvrir une demande auprès d'un conseiller.",

    humanReply:
      "Réponse de notre équipe",
  },

  en: {
    brand: "PharmaFlow",
    backHome: "Back to home",

    title: "Support Center",

    subtitle:
      "Our team and intelligent assistant are available to help you quickly.",

    online: "Support available",

    aiBadge:
      "PharmaFlow AI Assistant",

    aiTitle:
      "How can we help you?",

    aiDescription:
      "Describe your question or issue. The assistant understands the conversation context and can guide you step by step.",

    placeholder:
      "Write your message...",

    send: "Send",

    thinking: "Analyzing...",

    startChat:
      "Start a conversation",

    humanSupport:
      "Talk to a support agent",

    humanDescription:
      "Prefer to talk to a person? Open a request directly with our team without leaving the Support Center.",

    payment:
      "Payment problem",

    paymentDescription:
      "Payment charged, subscription not activated, transaction pending or another payment issue.",

    complaint:
      "Submit a complaint",

    complaintDescription:
      "Officially report an issue concerning PharmaFlow or one of our services.",

    technical:
      "Technical support",

    technicalDescription:
      "Login, account, products, stock, sales or platform issues.",

    commercial:
      "Sales",

    commercialDescription:
      "Questions about plans, pricing or PharmaFlow capabilities?",

    contactsTitle:
      "Contact us directly",

    contactsDescription:
      "You can also contact our team through the available channels.",

    generalSupport:
      "General support",

    paymentSupport:
      "Payments & transactions",

    complaints:
      "Complaints",

    sales: "Sales",

    phone: "Phone",

    whatsapp: "WhatsApp",

    email: "Email",

    unavailable:
      "Contact to be configured",

    hoursTitle:
      "Support hours",

    hours:
      "Our team's hours and availability will be displayed here.",

    secureTitle:
      "Your information stays protected",

    secureDescription:
      "Never share your password, Mobile Money PIN, CVV or any other secret code in a support conversation.",

    ticketTitle:
      "Already have a request?",

    ticketDescription:
      "If you opened a request on this device, you can continue the conversation.",

    login: "Log in",

    createAccount:
      "Create an account",

    categoryTitle:
      "Choose your request",

    categoryDescription:
      "Select the type of support that matches your request.",

    general:
      "General question",

    technicalShort:
      "Technical issue",

    paymentShort:
      "Payment / transaction",

    complaintShort:
      "Complaint",

    commercialShort:
      "Sales question",

    welcome:
      "Hello 👋 I am the PharmaFlow assistant. I can help you understand the platform, its modules, products, stock, sales, users, reports, subscriptions, payments and many other features.",

    paymentHint:
      "For a payment issue, if possible prepare your transaction reference, amount, currency and payment date. Never send a secret code.",

    complaintHint:
      "For a complaint, clearly explain what happened, when it happened and, if necessary, the related reference.",

    footer:
      "PharmaFlow — Professional pharmacy management.",

    language: "Language",

    humanTitle:
      "Talk directly to a support agent",

    humanSubtitle:
      "No login is required. Leave your contact details and message so our team can reply.",

    name: "Your name",

    emailField:
      "Your email",

    phoneField:
      "Phone",

    namePlaceholder:
      "e.g. John Doe",

    emailPlaceholder:
      "e.g. john@example.com",

    phonePlaceholder:
      "e.g. +242...",

    humanMessagePlaceholder:
      "Explain your issue or request...",

    createTicket:
      "Send to support",

    creatingTicket:
      "Creating request...",

    ticketCreated:
      "Your request has been created",

    ticketReference:
      "Your request reference",

    keepReference:
      "Keep this reference to follow your conversation.",

    continueConversation:
      "Continue conversation",

    customerConversation:
      "Support conversation",

    agentWaiting:
      "Your request has been registered. Our team can reply in this conversation.",

    backToAI:
      "Back to AI assistant",

    ticketError:
      "We could not create the request right now. Please try again.",

    requiredContact:
      "Enter at least your email or phone number.",

    requiredName:
      "Please enter your name.",

    requiredMessage:
      "Please write your message.",

    reopenTicket:
      "Continue my conversation",

    aiUnavailable:
      "The AI assistant is temporarily unavailable. You can open a request with a support agent.",

    humanReply:
      "Our team reply",
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "fr";
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) =>
      item.startsWith("pf_locale="),
    );

  const cookieValue =
    cookie?.split("=")[1];

  if (
    cookieValue === "en" ||
    cookieValue === "fr"
  ) {
    return cookieValue;
  }

  return navigator.language
    ?.toLowerCase()
    .startsWith("en")
    ? "en"
    : "fr";
}

function saveLocale(
  locale: Locale,
) {
  document.cookie =
    `pf_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

function createMessage(
  sender: ChatSender,
  text: string,
): ChatMessage {
  return {
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

    sender,

    text,

    createdAt:
      new Date().toISOString(),
  };
}

export default function SupportPage() {
  const [locale, setLocale] =
    useState<Locale>("fr");

  const [chatStarted, setChatStarted] =
    useState(false);

  const [humanMode, setHumanMode] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [isThinking, setIsThinking] =
    useState(false);

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<SupportCategory>(
      "general",
    );

  const [showContacts, setShowContacts] =
    useState(false);

  const [showSecurity, setShowSecurity] =
    useState(false);

  const [customerName, setCustomerName] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [ticket, setTicket] =
    useState<TicketInfo | null>(null);

  const [accessToken, setAccessToken] =
    useState("");

  const [ticketLoading, setTicketLoading] =
    useState(false);

  const [ticketError, setTicketError] =
    useState("");

  const [ticketCreated, setTicketCreated] =
    useState(false);

  const t = TEXT[locale];

  useEffect(() => {
    const detected =
      getInitialLocale();

    setLocale(detected);
    saveLocale(detected);

    const savedTicket =
      window.localStorage.getItem(
        "pf_support_ticket",
      );

    if (!savedTicket) {
      return;
    }

    try {
      const parsed =
        JSON.parse(savedTicket);

      if (
        parsed?.ticket?.id &&
        parsed?.accessToken
      ) {
        setTicket(
          parsed.ticket,
        );

        setAccessToken(
          parsed.accessToken,
        );
      }
    } catch {
      window.localStorage.removeItem(
        "pf_support_ticket",
      );
    }
  }, []);

  const categoryCards = useMemo(
    () => [
      {
        key: "general" as const,
        icon: "💬",
        title: t.general,
        description:
          t.aiDescription,
      },

      {
        key: "technical" as const,
        icon: "🛠️",
        title:
          t.technicalShort,
        description:
          t.technicalDescription,
      },

      {
        key: "payment" as const,
        icon: "💳",
        title:
          t.paymentShort,
        description:
          t.paymentDescription,
      },

      {
        key: "complaint" as const,
        icon: "🚨",
        title:
          t.complaintShort,
        description:
          t.complaintDescription,
      },

      {
        key: "commercial" as const,
        icon: "🤝",
        title:
          t.commercialShort,
        description:
          t.commercialDescription,
      },
    ],
    [t],
  );

  function changeLocale(
    nextLocale: Locale,
  ) {
    setLocale(nextLocale);
    saveLocale(nextLocale);
  }

  function startAIChat(
    category: SupportCategory = "general",
  ) {
    setHumanMode(false);

    setSelectedCategory(
      category,
    );

    setChatStarted(true);

    if (messages.length === 0) {
      let welcome =
        t.welcome;

      if (
        category === "payment"
      ) {
        welcome +=
          `\n\n${t.paymentHint}`;
      }

      if (
        category === "complaint"
      ) {
        welcome +=
          `\n\n${t.complaintHint}`;
      }

      setMessages([
        createMessage(
          "ai",
          welcome,
        ),
      ]);
    }

    scrollToChat();
  }

  function openHumanSupport(
    category: SupportCategory = selectedCategory,
  ) {
    setHumanMode(true);

    setSelectedCategory(
      category,
    );

    setChatStarted(true);

    setTicketError("");
    setTicketCreated(false);

    if (
      ticket?.id &&
      accessToken
    ) {
      loadTicket();
    }

    scrollToChat();
  }

  function scrollToChat() {
    setTimeout(() => {
      document
        .getElementById(
          "support-chat",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  }

  async function sendAIMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanMessage =
      message.trim();

    if (
      !cleanMessage ||
      isThinking
    ) {
      return;
    }

    const userMessage =
      createMessage(
        "user",
        cleanMessage,
      );

    const previousMessages =
      messages;

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setMessage("");
    setIsThinking(true);

    try {
      const response =
        await fetch(
          "/api/support/ai",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              locale,

              category:
                selectedCategory,

              message:
                cleanMessage,

              history:
                previousMessages,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.answer
      ) {
        throw new Error(
          data?.error ||
            "AI error",
        );
      }

      setMessages((current) => [
        ...current,

        createMessage(
          "ai",
          data.answer,
        ),
      ]);
    } catch (error) {
      console.error(
        "SUPPORT AI:",
        error,
      );

      setMessages((current) => [
        ...current,

        createMessage(
          "ai",
          t.aiUnavailable,
        ),
      ]);
    } finally {
      setIsThinking(false);
    }
  }
  async function createHumanTicket(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setTicketError("");

    const name =
      customerName.trim();

    const email =
      customerEmail.trim();

    const phone =
      customerPhone.trim();

    const firstMessage =
      message.trim();

    if (!name) {
      setTicketError(
        t.requiredName,
      );
      return;
    }

    if (!email && !phone) {
      setTicketError(
        t.requiredContact,
      );
      return;
    }

    if (!firstMessage) {
      setTicketError(
        t.requiredMessage,
      );
      return;
    }

    setTicketLoading(true);

    try {
      const response =
        await fetch(
          "/api/support/tickets",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              action: "create",

              name,

              email,

              phone,

              category:
                selectedCategory,

              message:
                firstMessage,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.ticket ||
        !data?.accessToken
      ) {
        throw new Error(
          data?.error ||
            "Ticket error",
        );
      }

      const createdTicket =
        data.ticket as TicketInfo;

      const token =
        data.accessToken as string;

      setTicket(
        createdTicket,
      );

      setAccessToken(token);

      setTicketCreated(true);

      setMessage("");

      window.localStorage.setItem(
        "pf_support_ticket",
        JSON.stringify({
          ticket:
            createdTicket,

          accessToken:
            token,
        }),
      );
    } catch (error) {
      console.error(
        "SUPPORT TICKET:",
        error,
      );

      setTicketError(
        t.ticketError,
      );
    } finally {
      setTicketLoading(false);
    }
  }

  async function sendHumanMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanMessage =
      message.trim();

    if (
      !cleanMessage ||
      ticketLoading ||
      !ticket
    ) {
      return;
    }

    setTicketLoading(true);
    setTicketError("");

    try {
      const response =
        await fetch(
          "/api/support/tickets",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              action: "message",

              ticketId:
                ticket.id,

              accessToken,

              message:
                cleanMessage,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Message error",
        );
      }

      setMessage("");

      await loadTicket();
    } catch (error) {
      console.error(
        "SUPPORT HUMAN MESSAGE:",
        error,
      );

      setTicketError(
        error instanceof Error
          ? error.message
          : t.ticketError,
      );
    } finally {
      setTicketLoading(false);
    }
  }

  async function loadTicket() {
    if (
      !ticket?.id ||
      !accessToken
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/support/tickets?ticketId=${encodeURIComponent(
            ticket.id,
          )}&accessToken=${encodeURIComponent(
            accessToken,
          )}`,
          {
            method: "GET",

            cache: "no-store",

            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Ticket error",
        );
      }

      if (
        !data?.ticket
      ) {
        throw new Error(
          "Ticket not found",
        );
      }

      setTicket({
        id:
          data.ticket.id,

        ticketNumber:
          data.ticket.ticket_number,

        status:
          data.ticket.status,

        category:
          data.ticket.category,
      });

      const mappedMessages =
        Array.isArray(
          data.messages,
        )
          ? data.messages.map(
              (item: {
                id: string;
                sender:
                  | "user"
                  | "agent"
                  | "ai";
                text: string;
                createdAt: string;
              }) => ({
                id: item.id,

                sender:
                  item.sender,

                text:
                  item.text,

                createdAt:
                  item.createdAt,
              }),
            )
          : [];

      setMessages(
        mappedMessages,
      );
    } catch (error) {
      console.error(
        "LOAD SUPPORT TICKET:",
        error,
      );
    }
  }

  function resumeTicket() {
    setHumanMode(true);

    setChatStarted(true);

    setTicketCreated(false);

    loadTicket();

    scrollToChat();
  }

  function backToAI() {
    setHumanMode(false);

    setTicketCreated(false);

    startAIChat(
      selectedCategory,
    );
  }

  function handleEmail() {
    window.location.href =
      "mailto:support@your-domain.com";
  }

  function handleWhatsApp() {
    window.open(
      "https://wa.me/00000000000",
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handlePhone() {
    window.location.href =
      "tel:+00000000000";
  }

  function renderMessageText(
    item: ChatMessage,
  ) {
    return item.text
      .split("\n")
      .map(
        (line, index, lines) => (
          <span
            key={`${item.id}-${index}`}
          >
            {line}

            {index <
              lines.length - 1 && (
              <br />
            )}
          </span>
        ),
      );
  }

  return (
    <main className="pf-support-page">
      <header className="pf-support-header">
        <div className="pf-support-header-inner">
          <Link
            href="/"
            className="pf-support-brand"
          >
            <span className="pf-support-brand-mark">
              +
            </span>

            <span>
              {t.brand}
            </span>
          </Link>

          <div className="pf-support-header-actions">
            <div
              className="pf-support-language"
              aria-label={
                t.language
              }
            >
              <button
                type="button"
                className={
                  locale === "fr"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  changeLocale(
                    "fr",
                  )
                }
              >
                FR
              </button>

              <button
                type="button"
                className={
                  locale === "en"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  changeLocale(
                    "en",
                  )
                }
              >
                EN
              </button>
            </div>

            <Link
              href="/login"
              className="pf-support-login"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </header>

      <section className="pf-support-hero">
        <div className="pf-support-hero-content">
          <Link
            href="/"
            className="pf-support-back"
          >
            ← {t.backHome}
          </Link>

          <div className="pf-support-status">
            <span />

            {t.online}
          </div>

          <h1>
            {t.title}
          </h1>

          <p>
            {t.subtitle}
          </p>
        </div>
      </section>

      <section className="pf-support-main">
        <div className="pf-support-layout">
          <div className="pf-support-primary">
            <div
              id="support-chat"
              className="pf-support-chat-card"
            >
              <div className="pf-support-chat-header">
                <div className="pf-support-ai-avatar">
                  {humanMode
                    ? "👨‍💼"
                    : "✨"}
                </div>

                <div>
                  <strong>
                    {humanMode
                      ? t.customerConversation
                      : t.aiBadge}
                  </strong>

                  <span>
                    {humanMode
                      ? t.agentWaiting
                      : t.online}
                  </span>
                </div>

                <div className="pf-support-ai-dot" />
              </div>

              {!chatStarted ? (
                <div className="pf-support-chat-start">
                  <div className="pf-support-chat-icon">
                    🤖
                  </div>

                  <h2>
                    {t.aiTitle}
                  </h2>

                  <p>
                    {t.aiDescription}
                  </p>

                  <div className="pf-support-start-actions">
                    <button
                      type="button"
                      className="pf-support-primary-button"
                      onClick={() =>
                        startAIChat(
                          "general",
                        )
                      }
                    >
                      {t.startChat}

                      <span>
                        →
                      </span>
                    </button>

                    <button
                      type="button"
                      className="pf-support-outline-button"
                      onClick={() =>
                        openHumanSupport(
                          "general",
                        )
                      }
                    >
                      👨‍💼{" "}
                      {
                        t.humanSupport
                      }
                    </button>
                  </div>
                </div>
              ) : humanMode ? (
                <div className="pf-support-chat-active">
                  {ticketCreated ? (
                    <div className="pf-support-chat-start">
                      <div className="pf-support-chat-icon">
                        🎫
                      </div>

                      <h2>
                        {
                          t.ticketCreated
                        }
                      </h2>

                      <p>
                        {
                          t.ticketReference
                        }

                        <br />

                        <strong>
                          {
                            ticket?.ticketNumber
                          }
                        </strong>

                        <br />

                        {
                          t.keepReference
                        }
                      </p>

                      <button
                        type="button"
                        className="pf-support-primary-button"
                        onClick={() => {
                          setTicketCreated(
                            false,
                          );

                          loadTicket();
                        }}
                      >
                        {
                          t.continueConversation
                        }

                        <span>
                          →
                        </span>
                      </button>
                    </div>
                  ) : ticket ? (
                    <>
                      <div className="pf-support-messages">
                        {messages.map(
                          (item) => (
                            <div
                              key={
                                item.id
                              }
                              className={`pf-support-message ${
                                item.sender ===
                                "user"
                                  ? "user"
                                  : "ai"
                              }`}
                            >
                              {item.sender !==
                                "user" && (
                                <div className="pf-support-message-avatar">
                                  👨‍💼
                                </div>
                              )}

                              <div className="pf-support-message-bubble">
                                {renderMessageText(
                                  item,
                                )}
                              </div>
                            </div>
                          ),
                        )}

                        {ticket.status ===
                          "closed" && (
                          <div className="pf-support-form-error">
                            🔒{" "}
                            {
                              t.ticketClosed
                            }
                          </div>
                        )}
                      </div>

                      <form
                        className="pf-support-chat-form"
                        onSubmit={
                          sendHumanMessage
                        }
                      >
                        <textarea
                          value={
                            message
                          }
                          onChange={(
                            event,
                          ) =>
                            setMessage(
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder={
                            t.placeholder
                          }
                          rows={2}
                          disabled={
                            ticketLoading ||
                            ticket.status ===
                              "closed"
                          }
                        />

                        <button
                          type="submit"
                          disabled={
                            !message.trim() ||
                            ticketLoading ||
                            ticket.status ===
                              "closed"
                          }
                        >
                          {ticketLoading
                            ? "…"
                            : "↑"}
                        </button>
                      </form>

                      {ticketError && (
                        <div className="pf-support-form-error">
                          ⚠️{" "}
                          {
                            ticketError
                          }
                        </div>
                      )}

                      <div className="pf-support-chat-toolbar">
                        <button
                          type="button"
                          onClick={
                            backToAI
                          }
                        >
                          ←{" "}
                          {
                            t.backToAI
                          }
                        </button>
                      </div>
                    </>
                  ) : (
                    <form
                      className="pf-support-chat-active"
                      onSubmit={
                        createHumanTicket
                      }
                    >
                      <div className="pf-support-chat-start">
                        <div className="pf-support-chat-icon">
                          👨‍💼
                        </div>

                        <h2>
                          {
                            t.humanTitle
                          }
                        </h2>

                        <p>
                          {
                            t.humanSubtitle
                          }
                        </p>

                        <div className="pf-support-human-form-fields">
                          <input
                            value={
                              customerName
                            }
                            onChange={(
                              event,
                            ) =>
                              setCustomerName(
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder={
                              t.namePlaceholder
                            }
                            aria-label={
                              t.name
                            }
                            autoComplete="name"
                            required
                          />

                          <input
                            value={
                              customerEmail
                            }
                            onChange={(
                              event,
                            ) =>
                              setCustomerEmail(
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder={
                              t.emailPlaceholder
                            }
                            aria-label={
                              t.emailField
                            }
                            type="email"
                            autoComplete="email"
                          />

                          <input
                            value={
                              customerPhone
                            }
                            onChange={(
                              event,
                            ) =>
                              setCustomerPhone(
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder={
                              t.phonePlaceholder
                            }
                            aria-label={
                              t.phoneField
                            }
                            type="tel"
                            autoComplete="tel"
                          />

                          <textarea
                            value={
                              message
                            }
                            onChange={(
                              event,
                            ) =>
                              setMessage(
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder={
                              t.humanMessagePlaceholder
                            }
                            rows={5}
                            required
                          />

                          {ticketError && (
                            <div className="pf-support-form-error">
                              ⚠️{" "}
                              {
                                ticketError
                              }
                            </div>
                          )}

                          <button
                            type="submit"
                            className="pf-support-primary-button"
                            disabled={
                              ticketLoading
                            }
                          >
                            {ticketLoading
                              ? t.creatingTicket
                              : t.createTicket}

                            <span>
                              →
                            </span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="pf-support-chat-active">
                  <div className="pf-support-chat-toolbar">
                    <button
                      type="button"
                      onClick={() =>
                        openHumanSupport()
                      }
                    >
                      👨‍💼{" "}
                      {
                        t.humanSupport
                      }
                    </button>
                  </div>

                  <div className="pf-support-messages">
                    {messages.map(
                      (
                        chatMessage,
                      ) => (
                        <div
                          key={
                            chatMessage.id
                          }
                          className={`pf-support-message ${
                            chatMessage.sender ===
                            "user"
                              ? "user"
                              : "ai"
                          }`}
                        >
                          {chatMessage.sender ===
                            "ai" && (
                            <div className="pf-support-message-avatar">
                              ✨
                            </div>
                          )}

                          <div className="pf-support-message-bubble">
                            {renderMessageText(
                              chatMessage,
                            )}
                          </div>
                        </div>
                      ),
                    )}

                    {isThinking && (
                      <div className="pf-support-message ai">
                        <div className="pf-support-message-avatar">
                          ✨
                        </div>

                        <div className="pf-support-message-bubble pf-support-thinking">
                          <span />
                          <span />
                          <span />

                          <small>
                            {
                              t.thinking
                            }
                          </small>
                        </div>
                      </div>
                    )}
                  </div>

                  <form
                    className="pf-support-chat-form"
                    onSubmit={
                      sendAIMessage
                    }
                  >
                    <textarea
                      value={
                        message
                      }
                      onChange={(
                        event,
                      ) =>
                        setMessage(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder={
                        t.placeholder
                      }
                      rows={2}
                      disabled={
                        isThinking
                      }
                    />

                    <button
                      type="submit"
                      disabled={
                        !message.trim() ||
                        isThinking
                      }
                    >
                      {isThinking
                        ? "…"
                        : "↑"}
                    </button>
                  </form>
                </div>
              )}
            </div>
            <div className="pf-support-category-section">
              <div className="pf-support-section-heading">
                <span>
                  {t.categoryTitle}
                </span>

                <h2>
                  {t.categoryDescription}
                </h2>
              </div>

              <div className="pf-support-category-grid">
                {categoryCards.map(
                  (card) => (
                    <button
                      key={card.key}
                      type="button"
                      className={`pf-support-category-card ${
                        selectedCategory ===
                          card.key &&
                        chatStarted &&
                        !humanMode
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        startAIChat(
                          card.key,
                        )
                      }
                    >
                      <span className="pf-support-category-icon">
                        {card.icon}
                      </span>

                      <strong>
                        {card.title}
                      </strong>

                      <p>
                        {card.description}
                      </p>

                      <span className="pf-support-category-arrow">
                        →
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="pf-support-human-card">
              <div className="pf-support-human-icon">
                👨‍💼
              </div>

              <div>
                <span>
                  {t.humanSupport}
                </span>

                <p>
                  {t.humanDescription}
                </p>
              </div>

              <button
                type="button"
                className="pf-support-outline-button"
                onClick={() =>
                  openHumanSupport()
                }
              >
                {t.humanSupport}

                <span>
                  →
                </span>
              </button>
            </div>
          </div>

          <aside className="pf-support-sidebar">
            <div className="pf-support-contact-card">
              <div className="pf-support-sidebar-icon">
                📞
              </div>

              <h3>
                {t.contactsTitle}
              </h3>

              <p>
                {t.contactsDescription}
              </p>

              <div className="pf-support-contact-list">
                <button
                  type="button"
                  onClick={handleEmail}
                >
                  <span>
                    ✉️
                  </span>

                  <div>
                    <small>
                      {t.generalSupport}
                    </small>

                    <strong>
                      {t.email}
                    </strong>
                  </div>

                  <b>
                    →
                  </b>
                </button>

                <button
                  type="button"
                  onClick={
                    handleWhatsApp
                  }
                >
                  <span>
                    💬
                  </span>

                  <div>
                    <small>
                      {t.whatsapp}
                    </small>

                    <strong>
                      {t.whatsapp}
                    </strong>
                  </div>

                  <b>
                    →
                  </b>
                </button>

                <button
                  type="button"
                  onClick={handlePhone}
                >
                  <span>
                    ☎️
                  </span>

                  <div>
                    <small>
                      {t.phone}
                    </small>

                    <strong>
                      {t.phone}
                    </strong>
                  </div>

                  <b>
                    →
                  </b>
                </button>
              </div>

              <button
                type="button"
                className="pf-support-show-contacts"
                onClick={() =>
                  setShowContacts(
                    (value) =>
                      !value,
                  )
                }
              >
                {showContacts
                  ? "−"
                  : "+"}{" "}
                {t.paymentSupport}
                {" / "}
                {t.complaints}
                {" / "}
                {t.sales}
              </button>

              {showContacts && (
                <div className="pf-support-extra-contacts">
                  <button
                    type="button"
                    onClick={() =>
                      openHumanSupport(
                        "payment",
                      )
                    }
                  >
                    <span>
                      💳
                    </span>

                    <strong>
                      {
                        t.paymentSupport
                      }
                    </strong>

                    <small>
                      {
                        t.unavailable
                      }
                    </small>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openHumanSupport(
                        "complaint",
                      )
                    }
                  >
                    <span>
                      🚨
                    </span>

                    <strong>
                      {t.complaints}
                    </strong>

                    <small>
                      {
                        t.unavailable
                      }
                    </small>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openHumanSupport(
                        "commercial",
                      )
                    }
                  >
                    <span>
                      🤝
                    </span>

                    <strong>
                      {t.sales}
                    </strong>

                    <small>
                      {
                        t.unavailable
                      }
                    </small>
                  </button>
                </div>
              )}
            </div>

            <div className="pf-support-hours-card">
              <span>
                🕐
              </span>

              <div>
                <strong>
                  {t.hoursTitle}
                </strong>

                <p>
                  {t.hours}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="pf-support-security-card"
              onClick={() =>
                setShowSecurity(
                  (value) =>
                    !value,
                )
              }
            >
              <span>
                🔐
              </span>

              <div>
                <strong>
                  {t.secureTitle}
                </strong>

                <p>
                  {t.secureDescription}
                </p>
              </div>

              <b>
                {showSecurity
                  ? "−"
                  : "+"}
              </b>
            </button>

            <div className="pf-support-ticket-card">
              <span>
                🎫
              </span>

              <h3>
                {t.ticketTitle}
              </h3>

              <p>
                {t.ticketDescription}
              </p>

              {ticket ? (
                <button
                  type="button"
                  className="pf-support-ticket-button"
                  onClick={
                    resumeTicket
                  }
                >
                  {t.reopenTicket}
                </button>
              ) : (
                <button
                  type="button"
                  className="pf-support-ticket-button"
                  onClick={() =>
                    openHumanSupport()
                  }
                >
                  {t.humanSupport}
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>

      <footer className="pf-support-footer">
        <div>
          <strong>
            {t.brand}
          </strong>

          <span>
            {t.footer}
          </span>
        </div>

        <div>
          <Link href="/">
            {t.backHome}
          </Link>

          <Link href="/register">
            {t.createAccount}
          </Link>
        </div>
      </footer>
    </main>
  );
}