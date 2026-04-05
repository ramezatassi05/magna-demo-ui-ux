'use client';

import type { TestCasesData } from '@/lib/types';
import { TestCaseCard } from './test-case-card';

interface InlineTestCasesProps {
  data: TestCasesData;
}

/** Stack of AI-generated test case cards with approve/reject controls. */
export function InlineTestCases({ data }: InlineTestCasesProps) {
  return (
    <div className="space-y-2 animate-fade-in">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        {data.cases.length} test case{data.cases.length === 1 ? '' : 's'} ·{' '}
        {data.feature}
      </div>
      {data.cases.map((testCase) => (
        <TestCaseCard key={testCase.test_id} testCase={testCase} />
      ))}
    </div>
  );
}
