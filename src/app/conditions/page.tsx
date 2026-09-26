import Link from "next/link";

export const metadata = {
  title: "Conditions générales d'utilisation | PharmaFlow",
  description:
    "Consultez les conditions générales d'utilisation de la plateforme PharmaFlow Africa.",
};

export default function ConditionsPage() {
  return (
    <main className="pf-conditions-page">
      <style>{`
        .pf-conditions-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(20, 184, 166, 0.10),
              transparent 30%
            ),
            #f8fafc;
          color: #0f172a;
          font-family: inherit;
        }

        .pf-conditions-container {
          width: min(1080px, calc(100% - 32px));
          margin: 0 auto;
          padding: 32px 0 64px;
        }

        .pf-conditions-hero {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          padding: 42px 36px;
          background:
            linear-gradient(
              135deg,
              #064e49 0%,
              #0f766e 55%,
              #115e59 100%
            );
          color: #fff;
          box-shadow:
            0 20px 50px rgba(15, 118, 110, 0.18);
        }

        .pf-conditions-hero::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          right: -90px;
          top: -110px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
        }

        .pf-conditions-brand {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          color: #ccfbf1;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .pf-conditions-brand-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-size: 19px;
        }

        .pf-conditions-hero h1 {
          position: relative;
          z-index: 1;
          max-width: 800px;
          margin: 0;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1.08;
          letter-spacing: -0.03em;
          font-weight: 850;
        }

        .pf-conditions-hero p {
          position: relative;
          z-index: 1;
          max-width: 740px;
          margin: 16px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 15px;
          line-height: 1.7;
        }

        .pf-conditions-date {
          position: relative;
          z-index: 1;
          margin-top: 20px;
          color: #ccfbf1;
          font-size: 12px;
          font-weight: 650;
        }

        .pf-conditions-layout {
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
          margin-top: 24px;
        }

        .pf-conditions-nav {
          position: sticky;
          top: 20px;
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow:
            0 8px 25px rgba(15, 23, 42, 0.05);
        }

        .pf-conditions-nav-title {
          margin-bottom: 12px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .pf-conditions-nav-links a {
          display: block;
          padding: 9px 10px;
          border-radius: 9px;
          color: #475569;
          text-decoration: none;
          font-size: 12px;
          font-weight: 650;
          line-height: 1.4;
          transition:
            background 0.15s ease,
            color 0.15s ease;
        }

        .pf-conditions-nav-links a:hover {
          background: #f0fdfa;
          color: #0f766e;
        }

        .pf-conditions-content {
          min-width: 0;
          padding: 30px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #ffffff;
          box-shadow:
            0 8px 30px rgba(15, 23, 42, 0.05);
        }

        .pf-conditions-section {
          scroll-margin-top: 24px;
          padding-bottom: 30px;
          margin-bottom: 30px;
          border-bottom: 1px solid #e2e8f0;
        }

        .pf-conditions-section:last-child {
          padding-bottom: 0;
          margin-bottom: 0;
          border-bottom: 0;
        }

        .pf-conditions-section h2 {
          margin: 0 0 12px;
          color: #134e4a;
          font-size: 21px;
          line-height: 1.3;
          font-weight: 820;
        }

        .pf-conditions-section h3 {
          margin: 20px 0 8px;
          color: #0f766e;
          font-size: 15px;
          font-weight: 800;
        }

        .pf-conditions-section p {
          margin: 0 0 11px;
          color: #475569;
          font-size: 14px;
          line-height: 1.8;
        }

        .pf-conditions-section ul {
          margin: 10px 0 14px;
          padding-left: 21px;
          color: #475569;
        }

        .pf-conditions-section li {
          margin: 7px 0;
          font-size: 14px;
          line-height: 1.7;
        }

        .pf-conditions-highlight {
          margin: 18px 0;
          padding: 15px 17px;
          border-left: 4px solid #0f766e;
          border-radius: 10px;
          background: #f0fdfa;
          color: #134e4a;
          font-size: 13px;
          line-height: 1.7;
        }

        .pf-conditions-contact {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .pf-conditions-contact-card {
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #f8fafc;
        }

        .pf-conditions-contact-card strong {
          display: block;
          margin-bottom: 5px;
          color: #134e4a;
          font-size: 12px;
        }

        .pf-conditions-contact-card a,
        .pf-conditions-contact-card span {
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          text-decoration: none;
        }

        .pf-conditions-contact-card a:hover {
          color: #0f766e;
        }

        .pf-conditions-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 24px;
          padding: 20px 4px 0;
          color: #64748b;
          font-size: 12px;
        }

        .pf-conditions-footer a {
          color: #0f766e;
          font-weight: 750;
          text-decoration: none;
        }

        .pf-conditions-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 800px) {
          .pf-conditions-container {
            width: min(100% - 20px, 1080px);
            padding-top: 10px;
          }

          .pf-conditions-hero {
            padding: 30px 22px;
            border-radius: 20px;
          }

          .pf-conditions-layout {
            grid-template-columns: 1fr;
          }

          .pf-conditions-nav {
            position: static;
          }

          .pf-conditions-nav-links {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px;
          }

          .pf-conditions-content {
            padding: 22px 18px;
          }
        }

        @media (max-width: 520px) {
          .pf-conditions-hero h1 {
            font-size: 30px;
          }

          .pf-conditions-hero p {
            font-size: 13px;
          }

          .pf-conditions-nav-links {
            grid-template-columns: 1fr;
          }

          .pf-conditions-contact {
            grid-template-columns: 1fr;
          }

          .pf-conditions-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media print {
          .pf-conditions-nav,
          .pf-conditions-footer {
            display: none;
          }

          .pf-conditions-container {
            width: 100%;
            padding: 0;
          }

          .pf-conditions-hero {
            box-shadow: none;
          }

          .pf-conditions-content {
            box-shadow: none;
            border: 0;
          }
        }
      `}</style>

      <div className="pf-conditions-container">
        <header className="pf-conditions-hero">
          <div className="pf-conditions-brand">
            <span className="pf-conditions-brand-mark">
              ✚
            </span>

            PharmaFlow Africa
          </div>

          <h1>
            Conditions générales d'utilisation
          </h1>

          <p>
            Les présentes conditions définissent les règles applicables à
            l'utilisation de la plateforme PharmaFlow et de ses services de
            gestion des pharmacies.
          </p>

          <div className="pf-conditions-date">
            Dernière mise à jour : 25 septembre 2026
          </div>
        </header>

        <div className="pf-conditions-layout">
          <aside className="pf-conditions-nav">
            <div className="pf-conditions-nav-title">
              Sommaire
            </div>

            <div className="pf-conditions-nav-links">
              <a href="#objet">1. Objet</a>
              <a href="#definitions">2. Définitions</a>
              <a href="#compte">3. Compte utilisateur</a>
              <a href="#utilisation">4. Utilisation</a>
              <a href="#donnees">5. Données</a>
              <a href="#abonnement">6. Abonnements</a>
              <a href="#paiements">7. Paiements</a>
              <a href="#responsabilites">8. Responsabilités</a>
              <a href="#disponibilite">9. Disponibilité</a>
              <a href="#propriete">10. Propriété intellectuelle</a>
              <a href="#suspension">11. Suspension</a>
              <a href="#modifications">12. Modifications</a>
              <a href="#contact">13. Contact</a>
            </div>
          </aside>

          <article className="pf-conditions-content">
            <section
              id="objet"
              className="pf-conditions-section"
            >
              <h2>1. Objet</h2>

              <p>
                Les présentes conditions générales d'utilisation encadrent
                l'accès et l'utilisation de PharmaFlow, une plateforme SaaS
                destinée à la gestion des activités des pharmacies.
              </p>

              <p>
                En créant un compte ou en utilisant les services de PharmaFlow,
                l'utilisateur reconnaît avoir pris connaissance des présentes
                conditions.
              </p>

              <div className="pf-conditions-highlight">
                L'utilisateur doit utiliser PharmaFlow conformément aux lois
                applicables, aux présentes conditions et aux règles de sécurité
                de la plateforme.
              </div>
            </section>

            <section
              id="definitions"
              className="pf-conditions-section"
            >
              <h2>2. Définitions</h2>

              <h3>PharmaFlow</h3>

              <p>
                Désigne la plateforme logicielle et les services proposés par
                PharmaFlow Africa.
              </p>

              <h3>Utilisateur</h3>

              <p>
                Désigne toute personne disposant d'un compte ou utilisant une
                fonctionnalité accessible de PharmaFlow.
              </p>

              <h3>Pharmacie</h3>

              <p>
                Désigne l'organisation ou l'établissement enregistré sur la
                plateforme afin d'utiliser les fonctionnalités de gestion.
              </p>
            </section>

            <section
              id="compte"
              className="pf-conditions-section"
            >
              <h2>3. Création et sécurité du compte</h2>

              <p>
                Certaines fonctionnalités nécessitent la création d'un compte
                utilisateur.
              </p>

              <p>
                L'utilisateur doit fournir des informations exactes et
                maintenir ses informations à jour lorsque cela est nécessaire.
              </p>

              <ul>
                <li>
                  Les identifiants de connexion doivent rester confidentiels.
                </li>

                <li>
                  L'utilisateur ne doit pas partager son mot de passe avec
                  des personnes non autorisées.
                </li>

                <li>
                  Toute activité suspecte doit être signalée à PharmaFlow.
                </li>

                <li>
                  Les utilisateurs doivent respecter les permissions liées à
                  leur rôle dans la pharmacie.
                </li>
              </ul>
            </section>

            <section
              id="utilisation"
              className="pf-conditions-section"
            >
              <h2>4. Utilisation de la plateforme</h2>

              <p>
                PharmaFlow fournit notamment des fonctionnalités pouvant
                permettre de gérer :
              </p>

              <ul>
                <li>les produits pharmaceutiques ;</li>
                <li>les stocks et mouvements de stock ;</li>
                <li>les ventes et paiements enregistrés ;</li>
                <li>les utilisateurs et leurs rôles ;</li>
                <li>les rapports et indicateurs de gestion ;</li>
                <li>certaines opérations administratives.</li>
              </ul>

              <p>
                L'utilisateur s'engage à utiliser ces fonctionnalités dans un
                cadre professionnel et conformément à la réglementation
                applicable à son activité.
              </p>

              <div className="pf-conditions-highlight">
                PharmaFlow est un outil de gestion. Il appartient à chaque
                pharmacie de vérifier l'exactitude des informations saisies
                dans la plateforme et de respecter les obligations
                professionnelles qui lui sont applicables.
              </div>
            </section>

            <section
              id="donnees"
              className="pf-conditions-section"
            >
              <h2>5. Données et informations saisies</h2>

              <p>
                L'utilisateur reste responsable des informations qu'il saisit
                dans PharmaFlow et doit disposer des droits nécessaires pour
                les utiliser dans le cadre du service.
              </p>

              <p>
                Les informations relatives aux produits, aux stocks, aux
                ventes, aux clients ou aux utilisateurs doivent être saisies
                de manière aussi exacte que possible.
              </p>

              <p>
                Le traitement des données personnelles est également soumis à
                la politique de confidentialité de PharmaFlow.
              </p>
            </section>

            <section
              id="abonnement"
              className="pf-conditions-section"
            >
              <h2>6. Abonnements et période d'essai</h2>

              <p>
                Certaines fonctionnalités de PharmaFlow peuvent être
                accessibles selon le plan ou l'offre souscrite par la
                pharmacie.
              </p>

              <p>
                Lorsqu'une période d'essai est proposée, sa durée et ses
                conditions sont celles affichées au moment de l'inscription ou
                de l'activation du compte.
              </p>

              <p>
                À l'issue d'une période d'essai ou d'un abonnement, certaines
                fonctionnalités peuvent être limitées conformément au plan
                concerné.
              </p>
            </section>

            <section
              id="paiements"
              className="pf-conditions-section"
            >
              <h2>7. Paiements</h2>

              <p>
                Lorsque des services payants sont proposés, les montants,
                devises, durées et modalités applicables sont présentés au
                moment de la souscription.
              </p>

              <p>
                Les transactions peuvent être traitées par des prestataires de
                paiement intégrés à PharmaFlow lorsque cette fonctionnalité
                est disponible.
              </p>

              <p>
                Les utilisateurs doivent vérifier les informations relatives
                au paiement avant de confirmer une transaction.
              </p>
            </section>

            <section
              id="responsabilites"
              className="pf-conditions-section"
            >
              <h2>8. Responsabilités de l'utilisateur</h2>

              <p>
                L'utilisateur est responsable de l'utilisation qu'il fait de
                son compte et des informations qu'il introduit dans PharmaFlow.
              </p>

              <h3>Il est notamment interdit de :</h3>

              <ul>
                <li>
                  tenter d'accéder à un compte ou à des données sans
                  autorisation ;
                </li>

                <li>
                  contourner les mécanismes de sécurité de la plateforme ;
                </li>

                <li>
                  utiliser PharmaFlow pour une activité illégale ;
                </li>

                <li>
                  transmettre volontairement des logiciels malveillants ;
                </li>

                <li>
                  perturber volontairement le fonctionnement du service ;
                </li>

                <li>
                  utiliser les informations d'autres utilisateurs sans
                  autorisation.
                </li>
              </ul>
            </section>

            <section
              id="disponibilite"
              className="pf-conditions-section"
            >
              <h2>9. Disponibilité du service</h2>

              <p>
                PharmaFlow met en œuvre des efforts raisonnables pour maintenir
                la disponibilité et le bon fonctionnement de la plateforme.
              </p>

              <p>
                Toutefois, certaines interruptions peuvent survenir notamment
                en raison de maintenances, de problèmes techniques,
                d'interruptions de réseau ou de services tiers.
              </p>

              <p>
                PharmaFlow peut effectuer des opérations de maintenance afin
                d'améliorer la sécurité, les performances ou les
                fonctionnalités du service.
              </p>
            </section>

            <section
              id="propriete"
              className="pf-conditions-section"
            >
              <h2>10. Propriété intellectuelle</h2>

              <p>
                Les éléments constituant PharmaFlow, notamment le logiciel,
                l'interface, les éléments graphiques, la marque et les
                contenus développés par PharmaFlow, restent protégés par les
                droits applicables.
              </p>

              <p>
                L'utilisation de PharmaFlow n'accorde pas à l'utilisateur un
                droit de propriété sur le logiciel ou les éléments de la
                plateforme.
              </p>
            </section>

            <section
              id="suspension"
              className="pf-conditions-section"
            >
              <h2>11. Suspension ou limitation d'accès</h2>

              <p>
                PharmaFlow peut limiter ou suspendre l'accès à un compte
                lorsqu'une utilisation présente un risque de sécurité, viole
                les présentes conditions ou lorsque cela est nécessaire au bon
                fonctionnement de la plateforme.
              </p>

              <p>
                Lorsqu'une situation le permet, l'utilisateur peut être
                informé de la raison de la restriction et des éventuelles
                mesures nécessaires pour rétablir l'accès.
              </p>
            </section>

            <section
              id="modifications"
              className="pf-conditions-section"
            >
              <h2>12. Modification des conditions</h2>

              <p>
                PharmaFlow peut mettre à jour les présentes conditions lorsque
                les fonctionnalités de la plateforme, les services proposés ou
                les exigences applicables évoluent.
              </p>

              <p>
                La date de dernière mise à jour affichée en haut de cette page
                permet d'identifier la version actuellement publiée.
              </p>
            </section>

            <section
              id="contact"
              className="pf-conditions-section"
            >
              <h2>13. Contact</h2>

              <p>
                Pour toute question concernant les présentes conditions ou
                l'utilisation de PharmaFlow, vous pouvez contacter l'équipe
                PharmaFlow Africa.
              </p>

              <div className="pf-conditions-contact">
                <div className="pf-conditions-contact-card">
                  <strong>E-mail</strong>

                  <a href="mailto:pharmaflowafrica@gmail.com">
                    pharmaflowafrica@gmail.com
                  </a>
                </div>

                <div className="pf-conditions-contact-card">
                  <strong>Téléphone</strong>

                  <a href="tel:+242044177909">
                    +242 04 417 79 09
                  </a>
                </div>

                <div className="pf-conditions-contact-card">
                  <strong>Site web</strong>

                  <a
                    href="https://pharmaflow.africa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    pharmaflow.africa
                  </a>
                </div>

                <div className="pf-conditions-contact-card">
                  <strong>Service</strong>

                  <span>
                    PharmaFlow Africa
                  </span>
                </div>
              </div>
            </section>
          </article>
        </div>

        <footer className="pf-conditions-footer">
          <span>
            © {new Date().getFullYear()} PharmaFlow Africa. Tous droits
            réservés.
          </span>

          <Link href="/">
            ← Retour à PharmaFlow
          </Link>
        </footer>
      </div>
    </main>
  );
}