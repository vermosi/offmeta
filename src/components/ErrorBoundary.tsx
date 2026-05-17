import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/core/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Note: Class components cannot use hooks, so we use a wrapper for i18n.
// The strings here are kept as fallback English since ErrorBoundary
// must render even when context providers fail.
// Icons are inlined and buttons are native to keep the homepage entry
// bundle free of lucide-react and the shadcn Button + Radix dependencies.

const FALLBACK_STRINGS = {
  title: 'Something went wrong',
  description: 'We encountered an unexpected error. Please try again or refresh the page.',
  tryAgain: 'Try again',
  refresh: 'Refresh page',
};

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4 sm:mb-6">
            <AlertTriangleIcon className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
          </div>

          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            {FALLBACK_STRINGS.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            {FALLBACK_STRINGS.description}
          </p>

          {this.state.error && import.meta.env.DEV && (
            <div className="bg-muted/30 rounded-lg p-3 mb-6 max-w-md w-full">
              <code className="text-xs text-muted-foreground break-all">
                {this.state.error.message}
              </code>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshIcon className="h-4 w-4" />
              {FALLBACK_STRINGS.tryAgain}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {FALLBACK_STRINGS.refresh}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
