import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ONBOARDING_KEY = 'offmeta_onboarding_seen';

export function OnboardingTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the tooltip
    const hasSeen = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeen) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="animate-fade-in">
      <div className="relative bg-primary text-primary-foreground rounded-xl p-4 shadow-lg max-w-md mx-auto">
        {/* Arrow pointing up */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45" />
        
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-medium text-sm">Just type what you need!</p>
            <p className="text-xs text-primary-foreground/80">
              No complex syntax required — describe cards naturally like "blue counterspells under $5" or "commanders that care about artifacts"
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismiss}
            className="shrink-0 h-6 w-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-0 min-w-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={dismiss}
          className="w-full mt-3 h-8 text-xs"
        >
          Got it!
        </Button>
      </div>
    </div>
  );
}
