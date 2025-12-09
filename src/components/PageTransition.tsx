import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div 
      className={cn(
        "animate-in opacity-0",
        className
      )}
      style={{
        animation: "fadeIn 0.4s ease-out forwards"
      }}
    >
      {children}
    </div>
  );
}

interface StaggeredListProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export function StaggeredList({ children, className, staggerDelay = 50 }: StaggeredListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-in opacity-0"
          style={{
            animation: "fadeIn 0.3s ease-out forwards",
            animationDelay: `${index * staggerDelay}ms`
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 300, className }: FadeInProps) {
  return (
    <div
      className={cn("animate-in opacity-0", className)}
      style={{
        animation: `fadeIn ${duration}ms ease-out forwards`,
        animationDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}

interface SlideInProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function SlideIn({ children, direction = 'up', delay = 0, className }: SlideInProps) {
  const transforms = {
    up: 'translateY(16px)',
    down: 'translateY(-16px)',
    left: 'translateX(16px)',
    right: 'translateX(-16px)',
  };

  return (
    <div
      className={cn("opacity-0", className)}
      style={{
        animation: `slideIn 0.4s ease-out forwards`,
        animationDelay: `${delay}ms`,
        '--slide-from': transforms[direction],
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}