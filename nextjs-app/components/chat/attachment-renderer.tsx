'use client';

import type { AgentAttachment } from '@/lib/types';
import { InlineChart } from './inline-chart';
import { InlineTable } from './inline-table';
import { InlineTestCases } from './inline-test-cases';

interface AttachmentRendererProps {
  attachment: AgentAttachment;
}

/** Dispatches an AgentAttachment to its typed renderer. */
export function AttachmentRenderer({ attachment }: AttachmentRendererProps) {
  switch (attachment.kind) {
    case 'chart':
      return <InlineChart data={attachment.data} />;
    case 'table':
      return <InlineTable data={attachment.data} />;
    case 'test_cases':
      return <InlineTestCases data={attachment.data} />;
  }
}
