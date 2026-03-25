// ============================================================================
// FAQ - Foire Aux Questions
// ============================================================================
// Page FAQ pour le dropshipping cosmétique
// Répond aux questions sur l'origine, la livraison, et la sécurité
// ============================================================================

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Questions Fréquentes | Dropship Luxe',
  description: 'Trouvez les réponses à vos questions sur nos cosmétiques, la livraison et les retours.',
};

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: 'Produits & Qualité',
    icon: '✨',
    items: [
      {
        question: "D'où proviennent vos produits ?",
        answer:
          "Nos produits sont sélectionnés auprès de fabricants certifiés internationaux, principalement en Europe, aux États-Unis et en Asie. Chaque produit est conforme à la réglementation européenne (CE) n°1223/2009 relative aux produits cosmétiques.",
      },
      {
        question: 'Comment sélectionnez-vous vos produits ?',
        answer:
          "Nous utilisons un système de notation basé sur plusieurs critères : qualité des ingrédients, avis clients (minimum 4.5/5), conformité réglementaire, et tests de fiabilité fournisseur. Seuls les produits obtenant un score supérieur à 80/100 sont proposés sur notre site.",
      },
      {
        question: 'Vos produits sont-ils testés sur les animaux ?',
        answer:
          "Non. Conformément à la réglementation européenne, aucun de nos produits n'est testé sur les animaux. Nous privilégions les marques engagées dans une démarche cruelty-free.",
      },
      {
        question: 'Les produits sont-ils authentiques ?',
        answer:
          "Oui, tous nos produits sont 100% authentiques. Nous travaillons uniquement avec des fournisseurs vérifiés et certifiés. En cas de doute sur l'authenticité d'un produit, contactez notre service client.",
      },
    ],
  },
  {
    title: 'Livraison & Expédition',
    icon: '📦',
    items: [
      {
        question: 'Quels sont les délais de livraison ?',
        answer:
          "Les délais varient selon votre localisation : France métropolitaine (7-15 jours ouvrés), Union Européenne (10-20 jours ouvrés), Reste du monde (15-30 jours ouvrés). Ces délais peuvent varier selon la disponibilité et les conditions logistiques.",
      },
      {
        question: 'Pourquoi les délais sont-ils plus longs que certains sites ?',
        answer:
          "Nos produits sont expédiés depuis des entrepôts internationaux, ce qui nous permet de vous proposer les meilleurs prix. Cette logistique optimisée implique des délais légèrement plus longs, mais garantit des produits de qualité à prix compétitifs.",
      },
      {
        question: 'Puis-je recevoir ma commande en plusieurs colis ?',
        answer:
          "Oui, il est possible que votre commande arrive en plusieurs colis si les produits proviennent de différents entrepôts. Chaque colis dispose de son propre numéro de suivi que vous recevrez par email.",
      },
      {
        question: 'Comment suivre ma commande ?',
        answer:
          "Dès l'expédition de votre commande, vous recevez un email avec le(s) numéro(s) de suivi. Vous pouvez suivre votre colis directement depuis votre espace client ou via le site du transporteur.",
      },
      {
        question: 'Les frais de douane sont-ils inclus ?',
        answer:
          "Pour les livraisons en France et dans l'UE, aucun frais de douane n'est à prévoir dans la grande majorité des cas. Pour les autres destinations, des frais peuvent s'appliquer selon la réglementation locale.",
      },
    ],
  },
  {
    title: 'Sécurité & Utilisation',
    icon: '🛡️',
    items: [
      {
        question: "Comment savoir si un produit convient à ma peau ?",
        answer:
          "Nous recommandons toujours d'effectuer un test cutané avant la première utilisation : appliquez une petite quantité sur l'intérieur du poignet et attendez 24h. En cas de réaction, n'utilisez pas le produit. Consultez un dermatologue en cas de doute.",
      },
      {
        question: "Que faire en cas de réaction allergique ?",
        answer:
          "Cessez immédiatement l'utilisation du produit et rincez abondamment la zone concernée. En cas de réaction importante, consultez un médecin. Contactez notre service client pour signaler l'incident et obtenir un remboursement si applicable.",
      },
      {
        question: "Les produits sont-ils adaptés aux peaux sensibles ?",
        answer:
          "Certains de nos produits sont spécifiquement formulés pour les peaux sensibles (indiqué dans la description). Pour tous les autres, nous recommandons un test cutané préalable. Les compositions complètes sont disponibles sur chaque fiche produit.",
      },
      {
        question: "Où trouver la liste des ingrédients ?",
        answer:
          "La liste INCI complète est disponible sur chaque fiche produit, dans l'onglet 'Composition'. Cette liste est conforme à la nomenclature internationale des ingrédients cosmétiques.",
      },
    ],
  },
  {
    title: 'Retours & Remboursements',
    icon: '↩️',
    items: [
      {
        question: "Puis-je retourner un produit ?",
        answer:
          "Vous disposez de 14 jours après réception pour exercer votre droit de rétractation sur les produits non ouverts. Attention : pour des raisons d'hygiène, les produits cosmétiques descellés ne peuvent pas être retournés (article L221-28 du Code de la consommation).",
      },
      {
        question: "Comment obtenir un remboursement ?",
        answer:
          "Pour demander un remboursement, contactez notre service client dans les 14 jours suivant la réception avec votre numéro de commande. Après validation, le remboursement est effectué sous 14 jours sur le moyen de paiement utilisé lors de l'achat.",
      },
      {
        question: "Que faire si mon produit arrive endommagé ?",
        answer:
          "En cas de produit endommagé à la réception, prenez des photos et contactez notre service client sous 48h. Nous procéderons à un remplacement ou un remboursement selon votre préférence.",
      },
      {
        question: "Ma commande n'est jamais arrivée, que faire ?",
        answer:
          "Si votre commande n'est pas arrivée dans les délais indiqués, contactez notre service client avec votre numéro de commande. Nous effectuerons une recherche auprès du transporteur et procéderons à un renvoi ou remboursement si nécessaire.",
      },
    ],
  },
  {
    title: 'Paiement & Sécurité',
    icon: '🔒',
    items: [
      {
        question: "Quels moyens de paiement acceptez-vous ?",
        answer:
          "Nous acceptons les cartes bancaires (Visa, Mastercard, American Express) via notre partenaire de paiement sécurisé. Toutes les transactions sont cryptées et sécurisées.",
      },
      {
        question: "Mes données bancaires sont-elles sécurisées ?",
        answer:
          "Absolument. Nous ne stockons jamais vos données bancaires. Tous les paiements sont traités par notre prestataire certifié PCI-DSS, garantissant le plus haut niveau de sécurité.",
      },
      {
        question: "Puis-je payer en plusieurs fois ?",
        answer:
          "Le paiement en plusieurs fois n'est pas disponible actuellement. Nous travaillons à proposer cette option prochainement.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Questions Fréquentes
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Retrouvez les réponses aux questions les plus fréquentes sur nos produits,
            la livraison et notre service. Vous ne trouvez pas votre réponse ?{' '}
            <a href="/contact" className="text-pink-600 hover:text-pink-700 font-medium">
              Contactez-nous
            </a>
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqSections.map((section, sectionIndex) => (
            <section
              key={sectionIndex}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              {/* Section Header */}
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </h2>
              </div>

              {/* FAQ Items */}
              <div className="divide-y divide-gray-100">
                {section.items.map((item, itemIndex) => (
                  <details
                    key={itemIndex}
                    className="group"
                  >
                    <summary className="flex justify-between items-center cursor-pointer px-6 py-4 hover:bg-gray-50 transition-colors">
                      <span className="font-medium text-gray-900 pr-4">
                        {item.question}
                      </span>
                      <span className="text-pink-500 group-open:rotate-180 transition-transform">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-6 pb-4">
                      <p className="text-gray-600 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Vous avez d'autres questions ?
          </h3>
          <p className="text-gray-600 mb-6">
            Notre équipe est disponible pour vous aider du lundi au vendredi, de 9h à 18h.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@dropship-luxe.com"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Nous écrire
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Formulaire de contact
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
    </main>
  );
}
