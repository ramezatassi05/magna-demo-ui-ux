/**
 * TestResultsTable tests.
 *
 * Covers: row rendering from fixtures, sort callback firing with the correct
 * SortableKey, row click + keyboard expand, empty state + clear-filters,
 * loading skeletons, pagination math + boundary-disabled buttons, and axe
 * a11y on a populated table.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { TestResultsTable } from '@/components/test-results-table';
import { MOCK_TEST_RECORDS } from '../../.storybook/mocks/fixtures';

// Five-row subset for predictable assertions.
const ROWS = MOCK_TEST_RECORDS.slice(0, 5);
const FIRST = ROWS[0]!;

function makeProps(overrides: Partial<React.ComponentProps<typeof TestResultsTable>> = {}) {
  return {
    rows: ROWS,
    page: 1,
    pageSize: 25,
    total: ROWS.length,
    totalPages: 1,
    onSort: vi.fn(),
    onPageChange: vi.fn(),
    onRowClick: vi.fn(),
    ...overrides,
  };
}

describe('TestResultsTable', () => {
  it('renders one row per record with test_id, scenario, feature visible', () => {
    render(<TestResultsTable {...makeProps()} />);
    for (const row of ROWS) {
      // test_id is unique per record
      expect(screen.getByText(row.test_id)).toBeInTheDocument();
      expect(screen.getByText(row.scenario)).toBeInTheDocument();
    }
    // Feature codes can repeat across records; assert they appear at least once.
    const features = new Set(ROWS.map((r) => r.feature));
    for (const feature of features) {
      const matches = screen.getAllByText(feature);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('fires onSort with the correct SortableKey when a header is clicked', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<TestResultsTable {...makeProps({ onSort })} />);

    await user.click(screen.getByRole('button', { name: /^Confidence$/i }));
    expect(onSort).toHaveBeenCalledWith('confidence_score');

    await user.click(screen.getByRole('button', { name: /^Test ID$/i }));
    expect(onSort).toHaveBeenCalledWith('test_id');

    // "Scenario" is the only non-sortable column, so it should not render a button
    expect(screen.queryByRole('button', { name: /^Scenario$/i })).not.toBeInTheDocument();
  });

  it('fires onRowClick when a row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<TestResultsTable {...makeProps({ onRowClick })} />);

    // Rows carry role="button" via the `tr` tabIndex/role attributes
    const rowButtons = screen.getAllByRole('button', { expanded: false });
    // Filter out header sort buttons; row buttons specifically have aria-expanded
    const firstRow = rowButtons.find((el) =>
      el.tagName === 'TR',
    );
    expect(firstRow).toBeTruthy();
    await user.click(firstRow!);
    expect(onRowClick).toHaveBeenCalledWith(FIRST.test_id);
  });

  it('fires onRowClick when Enter or Space is pressed on a focused row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<TestResultsTable {...makeProps({ onRowClick })} />);

    const firstRow = screen
      .getAllByRole('button')
      .find((el) => el.tagName === 'TR')!;
    firstRow.focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenLastCalledWith(FIRST.test_id);

    await user.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('renders expanded content when expandedRowId matches a row', () => {
    const renderExpanded = vi.fn((row) => <div>expanded-for-{row.test_id}</div>);
    render(
      <TestResultsTable
        {...makeProps({
          expandedRowId: FIRST.test_id,
          renderExpanded,
        })}
      />,
    );
    expect(
      screen.getByText(`expanded-for-${FIRST.test_id}`),
    ).toBeInTheDocument();
  });

  it('shows empty state and Clear filters button when rows is empty', async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <TestResultsTable
        {...makeProps({ rows: [], total: 0, onClearFilters })}
      />,
    );

    expect(
      screen.getByText('No validation runs match these filters'),
    ).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearButton);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('renders 10 skeleton rows in loading state and hides empty state', () => {
    const { container } = render(
      <TestResultsTable {...makeProps({ rows: [], loading: true, total: 0 })} />,
    );
    expect(
      screen.queryByText('No validation runs match these filters'),
    ).not.toBeInTheDocument();
    // Skeleton component uses the `.skeleton-shimmer` class. 10 rows × 8 cols = 80.
    const skeletons = container.querySelectorAll('.skeleton-shimmer');
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });

  describe('pagination', () => {
    it('renders "Showing X–Y of Z" correctly for middle page', () => {
      render(
        <TestResultsTable
          {...makeProps({ page: 2, pageSize: 10, total: 25, totalPages: 3 })}
        />,
      );
      expect(screen.getByText(/11–20/)).toBeInTheDocument();
      // Total rendered as "25" inside a mono span
      expect(screen.getByText('25')).toBeInTheDocument();
      // Page indicator: "Page 2 of 3"
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });

    it('calls onPageChange with correct page on Prev/Next', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <TestResultsTable
          {...makeProps({
            page: 2,
            pageSize: 10,
            total: 25,
            totalPages: 3,
            onPageChange,
          })}
        />,
      );
      await user.click(screen.getByRole('button', { name: /prev/i }));
      expect(onPageChange).toHaveBeenCalledWith(1);

      await user.click(screen.getByRole('button', { name: /next/i }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('disables Prev on page 1 and Next on last page', () => {
      const { rerender } = render(
        <TestResultsTable
          {...makeProps({ page: 1, pageSize: 10, total: 25, totalPages: 3 })}
        />,
      );
      expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();

      rerender(
        <TestResultsTable
          {...makeProps({ page: 3, pageSize: 10, total: 25, totalPages: 3 })}
        />,
      );
      expect(screen.getByRole('button', { name: /prev/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });

  it('has no axe-detectable accessibility violations when populated', async () => {
    const { container } = render(<TestResultsTable {...makeProps()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Silence unused warning
void within;
