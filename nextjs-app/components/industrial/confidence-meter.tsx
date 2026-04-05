'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { confidenceLevel } from '@/lib/aggregations';
import { MOTION } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/**
 * ConfidenceMeter — SVG arc gauge for model/detection confidence.
 *
 * Renders a 270° arc (–135° to +135°) with the filled portion colored
 * by threshold level (high/med/low → pass/warning/fail tokens). The
 * arc animates on mount via framer-motion pathLength.
 *
 * Coexists with ConfidenceBadge: the badge is used in space-constrained
 * cells (table rows, chips); the meter is for hero contexts (row-detail
 * header, test case card, agent recommendations).
 *
 * A11y: role="meter" + aria-valuenow/valuetext per ARIA 1.2 spec.
 */

export type ConfidenceMeterSize = 'sm' | 'md' | 'lg';

interface ConfidenceMeterProps {
  /** Score 0.0–1.0 */
  score: number;
  size?: ConfidenceMeterSize;
  /** Label shown below arc (e.g., "Detection confidence"). */
  label?: string;
  /** Percent number in arc center (default true). */
  showValue?: boolean;
  /** Override thresholds (default: high ≥ 0.85, med ≥ 0.65). */
  thresholds?: { high: number; medium: number };
  /** Animate arc from 0 on mount (default true; disabled under reduced-motion). */
  animate?: boolean;
  className?: string;
  ariaLabel?: string;
}

const SIZE_CONFIG: Record<
  ConfidenceMeterSize,
  { diameter: number; stroke: number; valueSize: number; labelSize: number }
> = {
  sm: { diameter: 48, stroke: 5, valueSize: 12, labelSize: 10 },
  md: { diameter: 72, stroke: 7, valueSize: 18, labelSize: 11 },
  lg: { diameter: 96, stroke: 9, valueSize: 24, labelSize: 12 },
};

const LEVEL_STROKE: Record<'high' | 'medium' | 'low', string> = {
  high: 'stroke-status-pass',
  medium: 'stroke-status-warning',
  low: 'stroke-status-fail',
};

const LEVEL_TEXT: Record<'high' | 'medium' | 'low', string> = {
  high: 'text-status-pass',
  medium: 'text-status-warning',
  low: 'text-status-fail',
};

const LEVEL_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function ConfidenceMeter({
  score,
  size = 'md',
  label,
  showValue = true,
  thresholds,
  animate = true,
  className,
  ariaLabel,
}: ConfidenceMeterProps) {
  const reduceMotion = useReducedMotion();
  const { diameter, stroke, valueSize, labelSize } = SIZE_CONFIG[size];
  const clamped = Math.max(0, Math.min(1, score));
  const pct = Math.round(clamped * 100);

  // Use custom thresholds if provided; otherwise use aggregations helper
  const level = thresholds
    ? clamped >= thresholds.high
      ? 'high'
      : clamped >= thresholds.medium
        ? 'medium'
        : 'low'
    : confidenceLevel(clamped);

  // 270° arc geometry: start at 225° (bottom-left), sweep clockwise to 315° (bottom-right)
  const radius = (diameter - stroke) / 2;
  const center = diameter / 2;
  const arcSweep = 270; // degrees
  const circumference = 2 * Math.PI * radius;
  const arcLength = (arcSweep / 360) * circumference;

  // Pre-computed arc path (225° → 315° clockwise, sweeping through top)
  const startAngle = 135; // in our SVG coords (0° = right, positive = clockwise)
  const endAngle = startAngle + arcSweep;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const startX = center + radius * Math.cos(rad(startAngle));
  const startY = center + radius * Math.sin(rad(startAngle));
  const endX = center + radius * Math.cos(rad(endAngle));
  const endY = center + radius * Math.sin(rad(endAngle));
  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;

  const animateArc = animate && !reduceMotion;
  const targetPathLength = clamped;

  const valueLabel = `${pct}% — ${LEVEL_LABEL[level]} confidence`;

  return (
    <div
      className={cn('inline-flex flex-col items-center gap-1', className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueLabel}
      aria-label={ariaLabel ?? label ?? 'Confidence score'}
    >
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          aria-hidden="true"
        >
          {/* Track */}
          <path
            d={arcPath}
            fill="none"
            stroke="var(--meter-track)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Fill */}
          {animateArc ? (
            <motion.path
              d={arcPath}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              className={LEVEL_STROKE[level]}
              strokeDasharray={arcLength}
              initial={{ strokeDashoffset: arcLength }}
              animate={{
                strokeDashoffset: arcLength * (1 - targetPathLength),
              }}
              transition={{
                duration: MOTION.duration.emphasis,
                ease: MOTION.ease.decelerate,
              }}
            />
          ) : (
            <path
              d={arcPath}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              className={LEVEL_STROKE[level]}
              strokeDasharray={arcLength}
              strokeDashoffset={arcLength * (1 - targetPathLength)}
            />
          )}
        </svg>
        {showValue && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={cn('font-mono font-semibold tabular-nums', LEVEL_TEXT[level])}
              style={{ fontSize: valueSize }}
            >
              {pct}
              <span className="ml-0.5 font-normal opacity-70" style={{ fontSize: valueSize * 0.55 }}>
                %
              </span>
            </span>
          </div>
        )}
      </div>
      {label && (
        <span
          className="font-mono uppercase tracking-widest text-ink-muted"
          style={{ fontSize: labelSize }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
