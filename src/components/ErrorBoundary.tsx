import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="text-red-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">Something went wrong</h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            We encountered an unexpected error. Our team has been notified.
            {this.state.error && (
              <span className="block mt-2 text-xs font-mono bg-zinc-100 p-2 rounded border border-zinc-200 overflow-auto max-h-24">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-[#1a6b3c] text-white rounded-xl font-bold hover:bg-[#1a6b3c]/90 transition-all shadow-lg shadow-[#1a6b3c]/20"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
