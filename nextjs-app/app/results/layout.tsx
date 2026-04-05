import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Results',
  description:
    'Filterable, sortable table of ADAS sensor test runs with deep-linkable filters and expandable row detail.',
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
