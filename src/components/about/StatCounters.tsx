/**
 * Animated stat counters for the About page hero.
 * Uses IntersectionObserver to trigger count-up animations on scroll-into-view.
 * @module about/StatCounters
 */

import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: number;
  suffix: string;
  label: string;
  prefix?: string;
}

const STATS: Stat[] = [
  { value: 30000, suffix: '+', label: 'Cards Indexed', prefix: '' },
  { value: 11, suffix: '', label: 'Languages Supported', prefix: '' },
  { value: 5, suffix: '+', label: 'AI Tools Built', prefix: '' },
  { value: 300, suffix: '+', label: 'Security Tests', prefix: '' },
];

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);

  return count;
}

function StatItem({ stat, active }: { stat: Stat; active: boolean }) {
  const count = useCountUp(stat.value, 1200, active);

  const displayValue =
    stat.value >= 1000
      ? (count / 1000).toFixed(count >= stat.value ? 0 : 1) + 'k'
      : count.toString();

  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm min-w-[130px]">
      <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
        {stat.prefix}
        {displayValue}
        {stat.suffix}
      </span>
      <span className="text-xs text-muted-foreground text-center leading-snug">{stat.label}</span>
    </div>
  );
}

export function StatCounters() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {STATS.map((stat) => (
        <StatItem key={stat.label} stat={stat} active={active} />
      ))}
    </div>
  );
}
