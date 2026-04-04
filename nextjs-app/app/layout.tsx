import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';

import { AppShell } from '@/components/app-shell';

import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'ADAS Test Agent · Magna R&D',
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
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
