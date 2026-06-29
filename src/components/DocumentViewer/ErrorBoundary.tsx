/**
 * ============================================================================
 * File: src/components/DocumentViewer/ErrorBoundary.tsx
 * DocuPick — Universal Document Viewer
 * React Error Boundary (class component) to catch render crashes
 * from any sub-viewer and display ErrorScreen
 * ============================================================================
 */

import React, {Component, ErrorInfo as ReactErrorInfo} from 'react';
import ErrorScreen from './ErrorScreen';
import {ErrorInfo} from './types';
import {ERROR_CODES} from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Props & State
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;

  /** Callback when an error is caught */
  onError?: (error: Error) => void;

  /** Key to reset the boundary (change key = clear error state) */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: ErrorInfo | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary Class Component
// ─────────────────────────────────────────────────────────────────────────────

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorInfo: null,
    };
  }

  /**
   * Called when a descendant component throws an error during rendering.
   * Returns updated state to trigger the fallback UI.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorInfo: {
        code: ERROR_CODES.RENDER_FAILED,
        message: error.message || 'An unexpected rendering error occurred.',
        stack: error.stack,
        retryable: true,
      },
    };
  }

  /**
   * Called after an error is caught. Used for logging and side effects.
   */
  componentDidCatch(error: Error, info: ReactErrorInfo): void {
    // Log the error for debugging
    console.error(
      '[DocuPick] ErrorBoundary caught error:',
      error,
      info.componentStack,
    );

    // Forward to parent error handler
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  /**
   * Reset error state when resetKey changes (allows parent to force retry).
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({hasError: false, errorInfo: null});
    }
  }

  /**
   * Retry handler: clears the error state so children re-render.
   */
  handleRetry = (): void => {
    this.setState({hasError: false, errorInfo: null});
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.errorInfo) {
      return (
        <ErrorScreen
          error={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
