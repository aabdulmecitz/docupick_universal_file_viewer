/**
 * ============================================================================
 * File: src/components/DocumentViewer/types.ts
 * DocuPick — Universal Document Viewer
 * Core TypeScript interfaces and types
 * ============================================================================
 */

/**
 * Supported document types. Each maps to a specific sub-viewer.
 */
export type DocumentType =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'csv'
  | 'txt';

/**
 * Groups of document types mapped to their respective renderer.
 */
export type RendererType = 'pdf' | 'office' | 'text';

/**
 * Main props for the UniversalViewer component.
 * This is the public API surface.
 */
export interface ViewerProps {
  /** File URI — local path (file://) or remote URL (https://) */
  uri: string;

  /** Document type — file extension or MIME shorthand */
  type: DocumentType;

  /** Callback fired when the document loads successfully */
  onLoadSuccess?: () => void;

  /** Callback fired when an error occurs during loading or rendering */
  onError?: (error: Error) => void;

  /** Optional: override the displayed file name in the header */
  fileName?: string;

  /** Optional: show/hide the built-in header bar (default: true) */
  showHeader?: boolean;
}

/**
 * Internal props passed to sub-viewer components (PDFViewer, OfficeViewer, TextViewer).
 * Extends ViewerProps with a resolved local file path.
 */
export interface SubViewerProps extends ViewerProps {
  /** Resolved local file system path (after download if remote) */
  localPath: string;

  /** Whether the original URI was a remote URL */
  isRemote: boolean;
}

/**
 * Loading stage enum for the terminal-style loading animation.
 */
export enum LoadingStage {
  INITIALIZING = 'INITIALIZING',
  RESOLVING_PATH = 'RESOLVING_PATH',
  DOWNLOADING = 'DOWNLOADING',
  PARSING_HEADERS = 'PARSING_HEADERS',
  RENDERING = 'RENDERING',
}

/**
 * Structured error info for the ErrorScreen component.
 */
export interface ErrorInfo {
  /** Machine-readable error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Optional stack trace string */
  stack?: string;

  /** Whether the error is retryable */
  retryable: boolean;
}

/**
 * Props for the LoadingScreen component.
 */
export interface LoadingScreenProps {
  /** Current loading stage to display */
  stage: LoadingStage;

  /** Download progress percentage (0-100), only used during DOWNLOADING stage */
  progress?: number;

  /** The file name being loaded */
  fileName?: string;
}

/**
 * Props for the ErrorScreen component.
 */
export interface ErrorScreenProps {
  /** Structured error information */
  error: ErrorInfo;

  /** Callback to retry the operation */
  onRetry?: () => void;
}
