import { locales, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';

const titles: Record<Locale, string> = {
  fr: 'Page en preparation',
  en: 'Page in progress',
  es: 'Pagina en preparacion',
  it: 'Pagina in preparazione',
  de: 'Seite in Vorbereitung',
};

const descriptions: Record<Locale, string> = {
  fr: 'Cette section du catalogue n est pas encore publiee. La navigation principale est en place, mais le contenu de cette page arrive ensuite.',
  en: 'This section of the catalog is not published yet. The main navigation is in place, but the page content is coming next.',
  es: 'Esta seccion del catalogo aun no esta publicada. La navegacion principal ya esta lista, pero el contenido llegara despues.',
  it: 'Questa sezione del catalogo non e ancora pubblicata. La navigazione principale e pronta, ma il contenuto arrivera dopo.',
  de: 'Dieser Bereich des Katalogs ist noch nicht veroffentlicht. Die Hauptnavigation steht, der Inhalt folgt als Nächstes.',
};

const ctas: Record<Locale, string> = {
  fr: 'Retour a l accueil',
  en: 'Back to home',
  es: 'Volver al inicio',
  it: 'Torna alla home',
  de: 'Zur Startseite',
};

const labels: Record<Locale, string> = {
  fr: 'URL demandee',
  en: 'Requested URL',
  es: 'URL solicitada',
  it: 'URL richiesta',
  de: 'Angeforderte URL',
};

export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<JSX.Element> {
  const { locale, slug } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const currentLocale = locale as Locale;

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-20 text-primary-800">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 rounded-[32px] border border-neutral-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.28em] text-neutral-500">
            Dropship Luxe
          </p>
          <h1 className="font-display text-4xl font-light sm:text-5xl">
            {titles[currentLocale]}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
            {descriptions[currentLocale]}
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-100 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-neutral-500">
            {labels[currentLocale]}
          </p>
          <code className="break-all text-sm text-primary-800">/{slug.join('/')}</code>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-primary-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            {ctas[currentLocale]}
          </Link>
        </div>
      </div>
    </main>
  );
}
