import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/context';
import { Navbar } from '@/components/system/Navbar';
import { LiveRegion } from '@/components/system/LiveRegion';

export const metadata: Metadata = {
  title: 'Kinetra — The Movement System',
  description: 'An original manga-inspired movement practice progression game rewarding participation, practice and recovery.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#101318',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="system">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <I18nProvider>
          <LiveRegion message="" />
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="border-t-2 border-[var(--border-color)] bg-[var(--surface-panel)] py-4 mt-8">
            <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-[var(--text-secondary)]">
              <div>
                Kinetra — SIH26196 Prototype | Local-First Movement Practice System
              </div>
              <div>
                General fitness practice feedback, not medical diagnosis or rehabilitation.
              </div>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
