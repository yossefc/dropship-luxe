// ============================================================================
// À Propos - Notre Histoire
// ============================================================================
// Page présentant la marque Hayoss et sa mission
// ============================================================================

import { Metadata } from 'next';
import { Link } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'À Propos de Hayoss | Notre Histoire & Nos Valeurs',
  description: 'Découvrez Hayoss, votre destination beauté premium. Notre mission : vous offrir les meilleurs cosmétiques sélectionnés avec soin.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FFFBF7]">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-[#F5EDE8] to-[#FFFBF7]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[#B8927A] text-sm font-medium tracking-widest uppercase mb-4 block">
            Notre Histoire
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#2D2926] mb-6">
            La Beauté, Autrement
          </h1>
          <p className="text-lg text-[#6B5B54] max-w-2xl mx-auto leading-relaxed">
            Hayoss est né d'une conviction simple : la beauté de qualité doit être accessible à tous.
            Nous sélectionnons avec soin les meilleurs cosmétiques du monde entier pour vous les proposer
            à des prix justes.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#B8927A] text-sm font-medium tracking-widest uppercase mb-4 block">
                Notre Mission
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-[#2D2926] mb-6">
                Démocratiser la Beauté Premium
              </h2>
              <p className="text-[#6B5B54] mb-6 leading-relaxed">
                Chaque jour, nous parcourons le monde à la recherche de produits exceptionnels.
                Notre équipe d'experts évalue rigoureusement chaque cosmétique selon des critères
                stricts de qualité, d'efficacité et de sécurité.
              </p>
              <p className="text-[#6B5B54] leading-relaxed">
                Grâce à notre modèle unique, nous éliminons les intermédiaires traditionnels pour
                vous offrir des produits premium à des prix accessibles, sans compromis sur la qualité.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#F5EDE8]">
                <img
                  src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=750&fit=crop"
                  alt="Produits cosmétiques Hayoss"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#B8927A] text-sm font-medium tracking-widest uppercase mb-4 block">
              Nos Valeurs
            </span>
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2926]">
              Ce Qui Nous Guide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Value 1 */}
            <div className="text-center p-8 rounded-2xl bg-[#FFFBF7]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F5EDE8] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#B8927A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-[#2D2926] mb-4">Qualité Certifiée</h3>
              <p className="text-[#6B5B54] text-sm leading-relaxed">
                Chaque produit est rigoureusement testé et certifié conforme aux normes européennes.
                Nous garantissons l'authenticité et la qualité de tous nos cosmétiques.
              </p>
            </div>

            {/* Value 2 */}
            <div className="text-center p-8 rounded-2xl bg-[#FFFBF7]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F5EDE8] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#B8927A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-[#2D2926] mb-4">Éthique & Responsable</h3>
              <p className="text-[#6B5B54] text-sm leading-relaxed">
                Nous privilégions les marques cruelty-free et les formulations respectueuses
                de l'environnement. La beauté ne doit pas se faire au détriment de la planète.
              </p>
            </div>

            {/* Value 3 */}
            <div className="text-center p-8 rounded-2xl bg-[#FFFBF7]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F5EDE8] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#B8927A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-[#2D2926] mb-4">Service Client Dédié</h3>
              <p className="text-[#6B5B54] text-sm leading-relaxed">
                Notre équipe est à votre écoute pour vous conseiller et vous accompagner.
                Votre satisfaction est notre priorité absolue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#B8927A] text-sm font-medium tracking-widest uppercase mb-4 block">
              Notre Processus
            </span>
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2926]">
              De la Sélection à Vous
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Recherche', desc: 'Nous identifions les meilleurs produits à travers le monde' },
              { step: '02', title: 'Sélection', desc: 'Chaque produit est évalué selon nos critères stricts' },
              { step: '03', title: 'Vérification', desc: 'Tests de qualité et conformité réglementaire' },
              { step: '04', title: 'Livraison', desc: 'Expédition soignée directement chez vous' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-4xl font-serif text-[#D4C4B5] mb-4">{item.step}</div>
                <h3 className="font-medium text-[#2D2926] mb-2">{item.title}</h3>
                <p className="text-sm text-[#6B5B54]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-[#2D2926]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-6">
            Prêt(e) à Découvrir la Différence ?
          </h2>
          <p className="text-[#D4C4B5] mb-8 max-w-2xl mx-auto">
            Explorez notre collection de cosmétiques soigneusement sélectionnés et
            offrez à votre peau le meilleur de la beauté internationale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/collections"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#B8927A] text-white rounded-full font-medium hover:bg-[#A07A62] transition-colors"
            >
              Découvrir nos produits
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 border border-white/30 text-white rounded-full font-medium hover:bg-white/10 transition-colors"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
