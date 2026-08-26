import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React UI error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto font-bold">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Something went wrong while loading this page</h2>
            <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-100 break-words text-left max-h-24 overflow-y-auto">
              {this.state.error?.message || 'Unknown runtime UI error'}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                <RefreshCw size={14} /> Reload Page
              </Button>
              <Button size="sm" onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}>
                <Home size={14} /> Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
