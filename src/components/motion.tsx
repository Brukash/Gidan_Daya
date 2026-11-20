import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

/**
 * One motion language for the page. Entry motion uses a soft decelerating
 * curve; the headline mask uses a longer expo curve so the lines settle rather
 * than stop. Durations stay under a second so content is never held back.
 */
export const EASE_OUT: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
export const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Props for an element that arrives once, on load, after a short delay. */
export function loadIn(delay = 0, distance = 12) {
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: EASE_OUT, delay },
  };
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export function staggerContainer(step = 0.08, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } },
  };
}

/**
 * Scroll reveal. Runs once — sections stay visible when the visitor scrolls
 * back up instead of replaying. MotionConfig's reducedMotion="user" drops the
 * movement for visitors who ask for it; only the fade remains.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 14,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A figure that counts to its new value instead of snapping. It renders one
 * text node, so the accessible name and layout never duplicate mid-transition.
 * The first render is the real value — nothing counts up on page load.
 */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    if (reduce || from === value) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    const duration = 480;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  return <span className={className}>{display}</span>;
}

/**
 * Sticky-header state from a 1px sentinel at the top of the document rather
 * than a scroll listener: one IntersectionObserver, nothing running per frame,
 * and it also fires after an anchor jump.
 */
export function useScrolled(): { scrolled: boolean; sentinelRef: RefObject<HTMLDivElement | null> } {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setScrolled(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { scrolled, sentinelRef };
}

export { motion };
