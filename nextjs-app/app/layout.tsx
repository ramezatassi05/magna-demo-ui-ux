import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { AppShell } from '@/components/app-shell';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['100', '400', '500', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'ADAS Test Agent · Magna R&D',
    template: '%s · ADAS Test Agent',
  },
  description:
    'Internal tool for querying ADAS sensor test results, generating test cases, and visualizing quality metrics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
