import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/core/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Note: Class components cannot use hooks, so we use a wrapper for i18n
// The strings here are kept as fallback English since ErrorBoundary
// must render even when context providers fail.

const FALLBACK_STRINGS = {
  title: 'Something went wrong',
  description: 'We encountered an unexpected error. Please try again or refresh the page.',
  tryAgain: 'Try again',
  refresh: 'Refresh page',
};

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
            <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
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
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {FALLBACK_STRINGS.tryAgain}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.reload()}
            >
              {FALLBACK_STRINGS.refresh}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
