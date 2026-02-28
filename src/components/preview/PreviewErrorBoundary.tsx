import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";

interface Props {
  children: ReactNode;
  onFix?: () => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[PreviewErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900 p-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-sm font-medium text-surface-200 mb-1">
            Preview Error
          </p>
          <p className="text-xs text-surface-500 text-center max-w-[240px] mb-4">
            {this.state.error?.message || "Something went wrong rendering the preview."}
          </p>
          <div className="flex items-center gap-2">
            {this.props.onFix && (
              <button
                onClick={this.props.onFix}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Fix with AI
              </button>
            )}
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
