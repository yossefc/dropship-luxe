import { Inter, Playfair_Display, Cormorant, Montserrat } from 'next/font/google';
import '@/styles/globals.css';
import { SessionProvider } from '@/components/providers/session-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const cormorant = Cormorant({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${cormorant.variable} ${montserrat.variable}`}
    >
      <body className="font-body bg-neutral-50 text-primary-800 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
