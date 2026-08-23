import { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/Button';

interface Props { children: ReactNode; name?: string; }
interface State { hasError: boolean; errorId: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: '' };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: '' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate a unique 6-character alphanumeric error ID
    const errorId = 'ERR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    this.setState({ errorId });
    
    logger.error('REACT_RENDER_ERROR', {
      errorId,
      component: this.props.name || 'Unknown',
      error: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, errorId: '' });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 max-w-lg w-full text-center animate-[slideUp_0.3s_ease-out]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            
            <h1 className="text-gray-900 font-bold text-2xl mb-2">Something went wrong.</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred in this section of the application.
            </p>
            
            {this.state.errorId && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">Error ID</span>
                <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-md">
                  {this.state.errorId}
                </span>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mb-8">
              Please try again. If the problem continues, provide this Error ID to the administrator.
            </p>
            
            <div className="flex gap-3">
              <Button variant="secondary" onClick={this.handleTryAgain} className="flex-1">
                Try Again
              </Button>
              <Button onClick={this.handleReload} className="flex-1 !bg-red-600 hover:!bg-red-700 !text-white !border-transparent">
                Reload App
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
