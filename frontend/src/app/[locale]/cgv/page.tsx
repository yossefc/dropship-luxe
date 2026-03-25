// ============================================================================
// CGV - Conditions Générales de Vente
// ============================================================================
// Page de conformité légale pour le dropshipping cosmétique
// Adapté aux exigences du droit français et européen
// ============================================================================

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente | Dropship Luxe',
  description: 'Consultez nos conditions générales de vente pour les cosmétiques de luxe.',
};

export default function CGVPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b">
            Conditions Générales de Vente
          </h1>

          <p className="text-sm text-gray-500 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          {/* Article 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 1 - Objet et champ d'application
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles
              entre Dropship Luxe et tout client effectuant un achat sur notre site. En passant commande,
              le client reconnaît avoir pris connaissance des présentes CGV et les accepte sans réserve.
            </p>
          </section>

          {/* Article 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 2 - Produits
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Nos produits cosmétiques sont conformes à la réglementation européenne en vigueur,
              notamment le Règlement (CE) n°1223/2009 relatif aux produits cosmétiques.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4">
              <p className="text-amber-800 font-medium">Important - Cosmétiques</p>
              <p className="text-amber-700 text-sm mt-1">
                Nos produits sont des cosmétiques et non des médicaments. Ils ne sont pas destinés
                à diagnostiquer, traiter, guérir ou prévenir une maladie. Consultez un professionnel
                de santé pour toute question médicale.
              </p>
            </div>
          </section>

          {/* Article 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 3 - Prix et paiement
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Les prix sont indiqués en euros (EUR), toutes taxes comprises. Le paiement s'effectue
              de manière sécurisée via notre prestataire de paiement agréé.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Les moyens de paiement acceptés sont : carte bancaire (Visa, Mastercard, American Express).
            </p>
          </section>

          {/* Article 4 - IMPORTANT pour le dropshipping */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 4 - Livraison
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <p className="text-blue-800 font-medium">Information importante</p>
              <p className="text-blue-700 text-sm mt-1">
                Nos produits sont expédiés depuis des entrepôts internationaux (Europe, États-Unis, Asie)
                afin de vous proposer les meilleurs prix. Les délais de livraison peuvent varier.
              </p>
            </div>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li><strong>France métropolitaine :</strong> 7 à 15 jours ouvrés</li>
              <li><strong>Union Européenne :</strong> 10 à 20 jours ouvrés</li>
              <li><strong>Reste du monde :</strong> 15 à 30 jours ouvrés</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Un numéro de suivi vous sera communiqué par email dès l'expédition de votre commande.
              Votre commande peut être expédiée en plusieurs colis.
            </p>
          </section>

          {/* Article 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 5 - Droit de rétractation
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai
              de 14 jours à compter de la réception de votre commande pour exercer votre droit de rétractation,
              sans avoir à justifier de motifs ni à payer de pénalités.
            </p>
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-800 font-medium">Exception - Produits cosmétiques</p>
              <p className="text-red-700 text-sm mt-1">
                Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation
                ne peut être exercé pour les produits cosmétiques descellés après livraison,
                pour des raisons d'hygiène et de protection de la santé.
              </p>
            </div>
          </section>

          {/* Article 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 6 - Garanties
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Tous nos produits bénéficient de la garantie légale de conformité (articles L217-4 et suivants
              du Code de la consommation) et de la garantie des vices cachés (articles 1641 et suivants du Code civil).
            </p>
          </section>

          {/* Article 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 7 - Données personnelles
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Vos données personnelles sont traitées conformément au Règlement Général sur la Protection
              des Données (RGPD) et à la loi Informatique et Libertés. Pour plus d'informations,
              consultez notre Politique de Confidentialité.
            </p>
          </section>

          {/* Article 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 8 - Service client
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Pour toute question ou réclamation, notre service client est disponible :
            </p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li>Par email : contact@dropship-luxe.com</li>
              <li>Via le formulaire de contact sur notre site</li>
            </ul>
            <p className="text-gray-600 mt-2">
              Nous nous engageons à répondre dans un délai de 48 heures ouvrées.
            </p>
          </section>

          {/* Article 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Article 9 - Litiges
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable
              sera recherchée avant toute action judiciaire.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Conformément aux articles L611-1 et R612-1 du Code de la consommation, vous pouvez recourir
              gratuitement au service de médiation de la consommation.
            </p>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
            <p>Dropship Luxe - Cosmétiques de Luxe</p>
            <p className="mt-1">© {new Date().getFullYear()} Tous droits réservés</p>
          </div>
        </article>
      </div>
    </main>
  );
}
