import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TestResultsTable } from '../components/test-results-table';
import { TestResultsRowDetail } from '../components/test-results-row-detail';
import type { TestRecord } from '../lib/types';
import { MOCK_TEST_RECORDS } from '../.storybook/mocks/fixtures';

type SortKey =
  | 'test_id'
  | 'sensor_type'
  | 'feature'
  | 'result'
  | 'confidence_score'
  | 'detection_distance_m'
  | 'timestamp';

const meta: Meta<typeof TestResultsTable> = {
  title: 'Components/TestResultsTable',
  component: TestResultsTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'content' },
    docs: {
      description: {
        component:
          'Sortable, paginated table of ADAS validation runs. Handles its own empty, ' +
          'loading, and expanded-row states internally — the parent owns the data ' +
          'and the page/sort/expansion state. Pair with `<TestResultsRowDetail>` as ' +
          'the `renderExpanded` prop to show per-test metrics on row click.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 1100 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

function sortRows(
  rows: TestRecord[],
  key: SortKey | undefined,
  dir: 'asc' | 'desc',
): TestRecord[] {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const av = a[key] as unknown as string | number;
    const bv = b[key] as unknown as string | number;
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return dir === 'asc' ? cmp : -cmp;
  });
}

function InteractiveTable({
  rows,
  initialSortKey,
  initialSortDir = 'desc',
}: {
  rows: TestRecord[];
  initialSortKey?: SortKey;
  initialSortDir?: 'asc' | 'desc';
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | undefined>(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const sorted = sortRows(rows, sortKey, sortDir);

  return (
    <TestResultsTable
      rows={sorted}
      page={page}
      pageSize={rows.length || 20}
      total={rows.length}
      totalPages={1}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={(key) => {
        if (key === sortKey) {
          setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
          setSortKey(key);
          setSortDir('desc');
        }
      }}
      onPageChange={setPage}
      onRowClick={(id) => setExpandedRowId((curr) => (curr === id ? null : id))}
      expandedRowId={expandedRowId}
      renderExpanded={(row) => <TestResultsRowDetail row={row} />}
    />
  );
}

export const WithData: Story = {
  render: () => <InteractiveTable rows={MOCK_TEST_RECORDS} />,
  parameters: {
    docs: {
      description: {
        story:
          '12 mock runs rendered with full sort + expansion interactivity. Click any ' +
          'row to expand the detail drawer.',
      },
    },
  },
};

export const WithExpandedRow: Story = {
  render: () => {
    const [expandedRowId, setExpandedRowId] = useState<string | null>('TC-2026-00142');
    return (
      <TestResultsTable
        rows={MOCK_TEST_RECORDS}
        page={1}
        pageSize={20}
        total={MOCK_TEST_RECORDS.length}
        totalPages={1}
        onSort={() => {}}
        onPageChange={() => {}}
        onRowClick={(id) =>
          setExpandedRowId((curr) => (curr === id ? null : id))
        }
        expandedRowId={expandedRowId}
        renderExpanded={(row) => <TestResultsRowDetail row={row} />}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'First row pre-expanded so `TestResultsRowDetail` is visible without user interaction.',
      },
    },
  },
};

export const SortedByConfidence: Story = {
  render: () => (
    <InteractiveTable
      rows={MOCK_TEST_RECORDS}
      initialSortKey="confidence_score"
      initialSortDir="asc"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sorted ascending by confidence — lowest-confidence runs surface first.',
      },
    },
  },
};

export const EmptyState: Story = {
  render: () => (
    <TestResultsTable
      rows={[]}
      page={1}
      pageSize={20}
      total={0}
      totalPages={0}
      onSort={() => {}}
      onPageChange={() => {}}
      onRowClick={() => {}}
      onClearFilters={() => console.log('clear filters')}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'No matching records. The inline Clear filters button nudges the user to broaden ' +
          'their query rather than guess at typos.',
      },
    },
  },
};

export const Loading: Story = {
  render: () => (
    <TestResultsTable
      rows={[]}
      loading
      page={1}
      pageSize={20}
      total={0}
      totalPages={0}
      onSort={() => {}}
      onPageChange={() => {}}
      onRowClick={() => {}}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Skeleton placeholders fill 10 rows while the parent SWR hook is fetching.',
      },
    },
  },
};

export const WithActiveFilters: Story = {
  render: () => {
    // Show only failed camera records — simulates a narrowed result set.
    const filtered = MOCK_TEST_RECORDS.filter(
      (r) => r.sensor_type === 'camera' && r.result === 'fail',
    );
    return <InteractiveTable rows={filtered} initialSortKey="timestamp" />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Result set narrowed to `sensor_type=camera` + `result=fail` — two rows remain.',
      },
    },
  },
};
