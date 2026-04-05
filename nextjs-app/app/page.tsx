'use client';

import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Radar,
} from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { KpiCard } from '@/components/kpi-card';
import { SensorResultsBar } from '@/components/charts/sensor-results-bar';
import { ResultDonut } from '@/components/charts/result-donut';
import { DailyTrendLine } from '@/components/charts/daily-trend-line';
import { RecentFailuresMini } from '@/components/charts/recent-failures-mini';
import {
  aggregateBySensorResult,
  computePassRateDelta,
} from '@/lib/aggregations';
import { useAllTests } from '@/lib/hooks/use-all-tests';
import { useRecentFailures } from '@/lib/hooks/use-recent-failures';
import { useStats } from '@/lib/hooks/use-stats';
import { useTrends } from '@/lib/hooks/use-trends';

export default function DashboardPage() {
  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useStats();
  const {
    trends,
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useTrends();
  const {
    items: allTests,
    isLoading: allLoading,
    error: allError,
    refetch: refetchAll,
  } = useAllTests();
  const { rows: recent, isLoading: recentLoading } = useRecentFailures(8);

  const passRateDelta = useMemo(
    () => (trends ? computePassRateDelta(trends) : 0),
    [trends],
  );
  const sensorBreakdown = useMemo(
    () => (allTests ? aggregateBySensorResult(allTests) : []),
    [allTests],
  );

  return (
    <div className="space-y-6">
      <header className="animate-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          Overview
        </div>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
          Validation Campaign Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-secondary">
          Aggregate validation metrics across Magna&rsquo;s camera-radar fusion,
          thermal-Doppler, and LiDAR sensor suites — 90-day rolling window.
        </p>
      </header>

      {/* Row 1 — KPI cards */}
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 animate-fade-in"
        style={{ animationDelay: '80ms' }}
      >
        <KpiCard
          label="Total Validation Runs"
          value={stats?.total_tests ?? 0}
          accentColor="magna"
          loading={statsLoading}
          error={statsError ?? null}
          icon={Activity}
        />
        <KpiCard
          label="Pass Rate"
          value={(stats?.pass_rate ?? 0) * 100}
          unit="%"
          decimals={1}
          trend={passRateDelta}
          accentColor="pass"
          loading={statsLoading || trendsLoading}
          error={statsError ?? trendsError ?? null}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Mean Detection Distance"
          value={stats?.mean_detection_distance ?? 0}
          unit="m"
          decimals={1}
          accentColor="info"
          loading={statsLoading}
          error={statsError ?? null}
          icon={Radar}
        />
        <KpiCard
          label="False Positive Rate"
          value={(stats?.mean_false_positive_rate ?? 0) * 100}
          unit="%"
          decimals={2}
          accentColor="warning"
          loading={statsLoading}
          error={statsError ?? null}
          icon={AlertTriangle}
          invertTrend
        />
      </div>

      {/* Row 2 — stacked bar + donut */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in"
        style={{ animationDelay: '160ms' }}
      >
        <ChartCard
          title="Results by Sensor Type"
          description="Stacked validation outcomes across camera, radar, thermal, LiDAR"
          loading={allLoading}
          error={allError ?? null}
          onRetry={refetchAll}
        >
          <SensorResultsBar data={sensorBreakdown} />
        </ChartCard>

        <ChartCard
          title="Result Distribution"
          description="Pass / fail / warning across all validation runs"
          loading={statsLoading}
          error={statsError ?? null}
          onRetry={refetchStats}
        >
          <ResultDonut counts={stats?.counts_by_result ?? {}} />
        </ChartCard>
      </div>

      {/* Row 3 — trend line + recent failures */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-12 animate-fade-in"
        style={{ animationDelay: '240ms' }}
      >
        <div className="lg:col-span-8">
          <ChartCard
            title="Daily Failures — Last 30 Days"
            description="Fail + warning counts from validation campaigns"
            loading={trendsLoading}
            error={trendsError ?? null}
            onRetry={refetchTrends}
          >
            <DailyTrendLine trends={trends ?? []} days={30} />
          </ChartCard>
        </div>
        <div className="lg:col-span-4">
          <ChartCard
            title="Recent Failures"
            description="Latest 8 failed validation runs"
            loading={recentLoading}
            minHeight={260}
          >
            <RecentFailuresMini rows={recent} loading={recentLoading} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
