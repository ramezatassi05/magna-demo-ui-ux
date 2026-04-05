'use client';

import { Children, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion';

import { MOTION } from '@/lib/motion-tokens';

/**
 * MotionPrimitives — framer-motion wrappers using design-system
 * motion tokens. Each primitive gates on `useReducedMotion()` and
 * short-circuits to a plain container when reduced-motion is active.
 *
 * These replace (and eventually absorb) the CSS `animate-fade-in`
 * stagger pattern previously used on the dashboard. Using JS-driven
 * motion gives us: (a) AnimatePresence for exit animations, (b) layout
 * animations for reorder-without-reflow, (c) spring physics, and
 * (d) one shared reduced-motion gate rather than per-surface media
 * queries.
 */

interface FadeInProps extends HTMLMotionProps<'div'> {
  delay?: number;
  children: ReactNode;
}

/** Fade + subtle upward drift. Default entrance for content blocks. */
export function FadeIn({ delay = 0, children, ...rest }: FadeInProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div {...(rest as object)}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION.duration.standard,
        ease: MOTION.ease.decelerate,
        delay,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface SlideUpProps extends HTMLMotionProps<'div'> {
  delay?: number;
  distance?: number;
  children: ReactNode;
}

/** Slide up from below. Used for task cards, bottom sheets. */
export function SlideUp({
  delay = 0,
  distance = 12,
  children,
  ...rest
}: SlideUpProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div {...(rest as object)}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION.duration.emphasis,
        ease: MOTION.ease.emphasis,
        delay,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface InsightPulseProps {
  /** When trigger changes, replay the pulse. Use a key that represents the value change. */
  triggerKey: string | number;
  children: ReactNode;
  className?: string;
}

/**
 * One-shot emphasis scale+opacity pulse. Used to draw the eye to
 * values that just changed (e.g., KPI numbers after a slider adjustment).
 * Remounts the child via key-based AnimatePresence on every trigger change.
 */
export function InsightPulse({
  triggerKey,
  children,
  className,
}: InsightPulseProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <span className={className}>{children}</span>;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={triggerKey}
        initial={{ opacity: 0.5, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: MOTION.duration.emphasis,
          ease: MOTION.ease.emphasis,
        }}
        className={className}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

interface StaggerGroupProps {
  staggerMs?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Staggered entrance for lists. Each immediate child renders with an
 * increasing delay. Replaces the existing CSS `animation-delay` scheme.
 */
export function StaggerGroup({
  staggerMs = 80,
  children,
  className,
}: StaggerGroupProps) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const staggerSec = staggerMs / 1000;

  return (
    <div className={className}>
      {items.map((child, i) => (
        <FadeIn key={i} delay={i * staggerSec}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}

interface ConfirmationFlashProps {
  /** When trigger changes, replay the flash. */
  triggerKey: string | number;
  children: ReactNode;
  className?: string;
}

/**
 * Green background wash flash — one-shot successful-action feedback.
 * Wraps children in a relative container with an absolute overlay that
 * flashes on trigger change.
 */
export function ConfirmationFlash({
  triggerKey,
  children,
  className,
}: ConfirmationFlashProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`relative ${className ?? ''}`}>
      {children}
      {!reduceMotion && (
        <AnimatePresence>
          <motion.span
            key={triggerKey}
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-state-nominal/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              times: [0, 0.3, 1],
              ease: MOTION.ease.standard,
            }}
          />
        </AnimatePresence>
      )}
    </div>
  );
}
