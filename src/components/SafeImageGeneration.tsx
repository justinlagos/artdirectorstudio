import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageGenerationDialog } from './ImageGenerationDialog';
import { useModalStore } from '@/store/modalStore';

interface ErrorBoundaryProps {
  children: ReactNode;
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
    console.error('[ImageGeneration Error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-strong p-6 max-w-md">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Image generation error</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {this.state.error?.message || 'Something went wrong while generating your image'}
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={this.handleReset}
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Safe wrapper for ImageGenerationDialog with error boundary
 */
export const SafeImageGeneration = () => {
  const handleReset = () => {
    // Close modal on error
    try {
      useModalStore.getState().closeGenerateModal();
    } catch (e) {
      console.error('Failed to close modal:', e);
    }
  };

  return (
    <ErrorBoundary onReset={handleReset}>
      <ImageGenerationDialog />
    </ErrorBoundary>
  );
};
