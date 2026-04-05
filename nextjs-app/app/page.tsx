'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Radar,
} from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { KpiCard } from '@/components/kpi-card';
import { EngineeringMetadata } from '@/components/industrial/engineering-metadata';
import { DynamicTaskCard } from '@/components/industrial/dynamic-task-card';
import { SimulatedRibbon } from '@/components/industrial/simulated-ribbon';
import { ParameterSliderPanel } from '@/components/industrial/parameter-slider-panel';
import { IndustrialIcon } from '@/components/industrial/industrial-icon';
import {
  FadeIn,
  SlideUp,
  StaggerGroup,
} from '@/components/industrial/motion-primitives';
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
import { detectAnomalies, deriveTasks } from '@/lib/operations';
import { simulateFiltered, simulateStats } from '@/lib/simulations';
import { useSimulationStore } from '@/lib/stores/simulation-store';

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

  const simParams = useSimulationStore((s) => s.params);
  const simActive = useSimulationStore((s) => s.isActive);

  const [simOpen, setSimOpen] = useState(false);

  const passRateDelta = useMemo(
    () => (trends ? computePassRateDelta(trends) : 0),
    [trends],
  );

  // Client-only "last updated" timestamp — avoid hydration mismatch.
  const [updatedAt, setUpdatedAt] = useState<string>('—');
  useEffect(() => {
    setUpdatedAt(new Date().toISOString().slice(0, 16) + 'Z');
  }, []);

  // When simulation is active, derive stats + filtered subset locally so
  // KPIs + charts reflect the "what-if" threshold sweep without a backend
  // round-trip. Trend line + recent-failures mini intentionally stay on
  // raw data (time-series simulations would overreach).
  const simulatedTests = useMemo(() => {
    if (!simActive || !allTests) return null;
    return simulateFiltered(allTests, simParams);
  }, [simActive, allTests, simParams]);

  const simulatedStats = useMemo(() => {
    if (!simulatedTests) return null;
    return simulateStats(simulatedTests);
  }, [simulatedTests]);

  const effectiveStats = simulatedStats ?? stats;
  const effectiveTests = simulatedTests ?? allTests;

  const anomalies = useMemo(() => {
    if (!effectiveStats || !trends || !allTests) return null;
    return detectAnomalies(effectiveStats, trends, allTests);
  }, [effectiveStats, trends, allTests]);

  const tasks = useMemo(
    () => deriveTasks(allTests ?? [], trends ?? [], 5),
    [allTests, trends],
  );

  const sensorBreakdown = useMemo(
    () => (effectiveTests ? aggregateBySensorResult(effectiveTests) : []),
    [effectiveTests],
  );

  const tasksLoading = allLoading || trendsLoading;

  return (
    <div className="space-y-6">
      <header className="animate-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
              Overview
            </div>
            <h1 className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
              Validation Campaign Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-ink-secondary">
              Aggregate validation metrics across Magna&rsquo;s camera-radar
              fusion, thermal-Doppler, and LiDAR sensor suites — 90-day
              rolling window.
            </p>
            <EngineeringMetadata
              items={[
                { label: 'window', value: '90d' },
                { label: 'campaign', value: 'Q2-2026' },
                { label: 'updated', value: updatedAt },
              ]}
              align="start"
              className="mt-2"
            />
          </div>
          <button
            type="button"
            onClick={() => setSimOpen((v) => !v)}
            aria-expanded={simOpen}
            aria-controls="parameter-slider-panel"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-hairline bg-surface-card px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-secondary transition-colors hover:border-magna-red/30 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-magna-red"
          >
            <IndustrialIcon name="Threshold" size="sm" tone="inherit" />
            Simulate thresholds
          </button>
        </div>
      </header>

      {/* Row 0 — DynamicTaskCard rack (hidden while data loads) */}
      {!tasksLoading && (
        <div>
          {tasks.length > 0 ? (
            <StaggerGroup
              staggerMs={80}
              className="flex gap-3 overflow-x-auto pb-2"
            >
              {tasks.map((t) => (
                <div key={t.id} className="w-[320px] shrink-0">
                  <DynamicTaskCard task={t} />
                </div>
              ))}
            </StaggerGroup>
          ) : (
            <SlideUp>
              <div className="flex items-center gap-3 rounded-card border border-status-pass/20 bg-status-pass/5 px-4 py-3">
                <IndustrialIcon name="Confirm" size="sm" tone="nominal" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-status-pass">
                  Nominal
                </span>
                <span className="text-[12px] text-ink-secondary">
                  No anomalies — all sensors nominal.
                </span>
              </div>
            </SlideUp>
          )}
        </div>
      )}

      {/* Row 0.5 — Simulation banner (self-gated; null when inactive) */}
      <SimulatedRibbon />

      {/* Row 1 — KPI cards */}
      <StaggerGroup
        staggerMs={60}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Total Validation Runs"
          value={effectiveStats?.total_tests ?? 0}
          accentColor="magna"
          loading={statsLoading}
          error={statsError ?? null}
          icon={Activity}
        />
        <KpiCard
          label="Pass Rate"
          value={(effectiveStats?.pass_rate ?? 0) * 100}
          unit="%"
          decimals={1}
          trend={passRateDelta}
          accentColor="pass"
          loading={statsLoading || trendsLoading}
          error={statsError ?? trendsError ?? null}
          icon={CheckCircle2}
          anomaly={anomalies?.passRateBreached ? 'anomaly' : null}
        />
        <KpiCard
          label="Mean Detection Range"
          value={effectiveStats?.mean_detection_distance ?? 0}
          unit="m"
          decimals={1}
          accentColor="info"
          loading={statsLoading}
          error={statsError ?? null}
          icon={Radar}
        />
        <KpiCard
          label="False Positive Rate"
          value={(effectiveStats?.mean_false_positive_rate ?? 0) * 100}
          unit="%"
          decimals={2}
          accentColor="warning"
          loading={statsLoading}
          error={statsError ?? null}
          icon={AlertTriangle}
          invertTrend
          anomaly={anomalies?.fprBreached ? 'anomaly' : null}
        />
      </StaggerGroup>

      {/* Row 1.5 — Parameter slider panel (collapsible) */}
      <div id="parameter-slider-panel">
        <ParameterSliderPanel open={simOpen} onOpenChange={setSimOpen} />
      </div>

      {/* Row 2 — stacked bar + donut */}
      <FadeIn delay={0.16}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            overline="DIAGNOSTICS"
            title="Results by Sensor Type"
            description="Stacked validation outcomes across camera, radar, thermal, LiDAR"
            loading={allLoading}
            error={allError ?? null}
            onRetry={refetchAll}
          >
            <SensorResultsBar data={sensorBreakdown} />
          </ChartCard>

          <ChartCard
            overline="ANALYTICS"
            title="Result Distribution"
            description="Pass / fail / warning across all validation runs"
            loading={statsLoading}
            error={statsError ?? null}
            onRetry={refetchStats}
          >
            <ResultDonut counts={effectiveStats?.counts_by_result ?? {}} />
          </ChartCard>
        </div>
      </FadeIn>

      {/* Row 3 — trend line + recent failures */}
      <FadeIn delay={0.24}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ChartCard
              overline="TELEMETRY"
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
              overline="DIAGNOSTICS"
              title="Recent Failures"
              description="Latest 8 failed validation runs"
              loading={recentLoading}
              minHeight={260}
            >
              <RecentFailuresMini rows={recent} loading={recentLoading} />
            </ChartCard>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
