import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArtieChat } from './ArtieChat';
import { useArtieContext } from '@/hooks/useArtieContext';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ArtieChat Error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-background border border-border rounded-2xl shadow-strong p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Artie encountered an error</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {this.state.error?.message || 'Something went wrong'}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Restart Artie
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Safe wrapper for ArtieChat with error boundary
 * Handles crashes gracefully and provides recovery mechanism
 */
export const SafeArtieChat = () => {
  const handleReset = () => {
    // Clear Artie context on error
    try {
      useArtieContext.getState().reset();
    } catch (e) {
      console.error('Failed to reset Artie context:', e);
    }
  };

  return (
    <ErrorBoundary onReset={handleReset}>
      <ArtieChat />
    </ErrorBoundary>
  );
};
