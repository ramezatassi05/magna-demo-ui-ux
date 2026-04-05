import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Case Generator',
  description:
    'Generate structured ADAS test cases from natural-language requirements with approve, edit, and export controls.',
};

export default function TestGeneratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
