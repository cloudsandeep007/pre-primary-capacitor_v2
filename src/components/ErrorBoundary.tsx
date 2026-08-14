import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; name?: string; }
interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message + '\n' + error.stack };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full">
            <h1 className="text-red-600 font-bold text-xl mb-2">⚠️ App Error — {this.props.name || 'Unknown'}</h1>
            <p className="text-gray-600 text-sm mb-4">A crash occurred in this section. Details below:</p>
            <pre className="bg-gray-100 rounded-xl p-4 text-xs text-red-700 overflow-auto max-h-64 whitespace-pre-wrap break-all">
              {this.state.error}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
