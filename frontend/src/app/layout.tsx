// Root layout - Redirects are handled by middleware
// All pages now live under /[locale]/ routes

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return children;
}
