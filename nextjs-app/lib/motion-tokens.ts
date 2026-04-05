/**
 * Motion tokens — JS mirror of CSS custom properties in globals.css.
 *
 * Framer-motion consumes seconds and cubic-bezier tuples, so we keep the
 * authoritative values here and re-export for both MotionPrimitives and
 * ad-hoc motion callers. Duration units are seconds (framer-motion
 * convention). Easing tuples match CSS cubic-bezier coefficients exactly.
 *
 * When you change a value here, also update the corresponding
 * --motion-* and --ease-* CSS variables in globals.css to keep CSS
 * and JS animation timings visually identical.
 */
export const MOTION = {
  duration: {
    instant: 0.08,   // micro-feedback (button press ack)
    quick: 0.16,     // hover/focus transitions
    standard: 0.24,  // default entrance/exit
    emphasis: 0.36,  // insight reveal, important entrance
    attention: 1.4,  // pulse cycle for anomaly alerts
  },
  ease: {
    standard: [0.4, 0, 0.2, 1] as const,
    emphasis: [0.2, 0, 0, 1] as const,
    decelerate: [0, 0, 0.2, 1] as const,
    accelerate: [0.4, 0, 1, 1] as const,
  },
  // Stagger delays for grouped entrances (seconds)
  stagger: {
    tight: 0.04,
    standard: 0.08,
    loose: 0.12,
  },
} as const;

export type MotionDuration = keyof typeof MOTION.duration;
export type MotionEase = keyof typeof MOTION.ease;
