/**
 * ============================================================================
 * File: src/components/DocumentViewer/utils.ts
 * DocuPick — Universal Document Viewer
 * Utility functions: MIME detection, file download, URI helpers
 * ============================================================================
 */

import RNFS from 'react-native-fs';
import {Platform} from 'react-native';
import {
  DocumentType,
  RendererType,
  ErrorInfo,
} from './types';
import {
  TYPE_TO_RENDERER,
  VIEWER_URLS,
  ERROR_CODES,
} from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// URI & File Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if the given URI is a remote URL (http / https).
 */
export function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri.trim());
}

/**
 * Extracts the file name from a URI (strips path and query params).
 */
export function extractFileName(uri: string): string {
  try {
    const cleaned = uri.split('?')[0].split('#')[0];
    const segments = cleaned.split('/');
    return segments[segments.length - 1] || 'unknown_file';
  } catch {
    return 'unknown_file';
  }
}

/**
 * Extracts the file extension (lowercase, without dot) from a URI or filename.
 */
export function extractExtension(uri: string): string {
  try {
    const fileName = extractFileName(uri);
    const parts = fileName.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
    return '';
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Type Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the document type from explicit type prop or URI extension.
 * Throws a structured error if the type cannot be determined or is unsupported.
 */
export function resolveDocumentType(
  uri: string,
  explicitType?: DocumentType,
): DocumentType {
  if (explicitType && TYPE_TO_RENDERER[explicitType]) {
    return explicitType;
  }

  const ext = extractExtension(uri);
  if (ext && TYPE_TO_RENDERER[ext]) {
    return ext as DocumentType;
  }

  throw createErrorInfo(
    ERROR_CODES.UNSUPPORTED_TYPE,
    `Cannot determine document type for "${extractFileName(uri)}". ` +
      `Extension "${ext || 'none'}" is not supported. ` +
      `Supported types: pdf, doc, docx, xls, xlsx, csv, txt`,
    false,
  );
}

/**
 * Maps a DocumentType to its renderer category.
 */
export function getRendererType(type: DocumentType): RendererType {
  return TYPE_TO_RENDERER[type] as RendererType;
}

// ─────────────────────────────────────────────────────────────────────────────
// File Download & Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a unique temp file path for caching downloaded files.
 */
function getTempFilePath(fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const dir =
    Platform.OS === 'ios' ? RNFS.TemporaryDirectoryPath : RNFS.CachesDirectoryPath;
  return `${dir}/docupick_viewer_${timestamp}_${random}_${fileName}`;
}

/**
 * Downloads a remote file to the local cache directory.
 * Returns the local file path on success.
 *
 * @param uri - Remote URL to download
 * @param onProgress - Optional progress callback (0-100)
 * @returns Promise<string> - Local file path
 * @throws ErrorInfo on failure
 */
export async function downloadToCache(
  uri: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const fileName = extractFileName(uri);
  const localPath = getTempFilePath(fileName);

  try {
    const downloadResult = RNFS.downloadFile({
      fromUrl: uri,
      toFile: localPath,
      background: false,
      discretionary: false,
      cacheable: false,
      progress: (res) => {
        if (onProgress && res.contentLength > 0) {
          const percent = Math.round(
            (res.bytesWritten / res.contentLength) * 100,
          );
          onProgress(percent);
        }
      },
    });

    const result = await downloadResult.promise;

    if (result.statusCode !== 200) {
      // Clean up partial file
      await cleanupTempFile(localPath);
      throw createErrorInfo(
        ERROR_CODES.DOWNLOAD_FAILED,
        `Download failed with HTTP status ${result.statusCode} for "${fileName}"`,
        true,
      );
    }

    return localPath;
  } catch (error: unknown) {
    // Clean up partial file on any error
    await cleanupTempFile(localPath);

    // Re-throw if it's already our ErrorInfo structure
    if (isErrorInfo(error)) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Unknown download error';
    throw createErrorInfo(
      ERROR_CODES.DOWNLOAD_FAILED,
      `Failed to download "${fileName}": ${message}`,
      true,
    );
  }
}

/**
 * Checks if a local file exists at the given path.
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    return await RNFS.exists(path);
  } catch {
    return false;
  }
}

/**
 * Deletes a temporary cached file. Silently ignores errors.
 */
export async function cleanupTempFile(path: string): Promise<void> {
  try {
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  } catch {
    // Silently ignore cleanup errors to prevent cascading failures
  }
}

/**
 * Reads a text file from the local filesystem.
 * Returns the content as a string.
 */
export async function readTextFile(path: string): Promise<string> {
  try {
    const content = await RNFS.readFile(path, 'utf8');
    return content;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error';
    throw createErrorInfo(
      ERROR_CODES.FILE_NOT_FOUND,
      `Failed to read file: ${message}`,
      false,
    );
  }
}

/**
 * Gets the file size in bytes.
 */
export async function getFileSize(path: string): Promise<number> {
  try {
    const stat = await RNFS.stat(path);
    return Number(stat.size);
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// External Viewer URL Builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Google Docs Viewer URL for a remote file.
 */
export function getGoogleDocsViewerUrl(remoteUri: string): string {
  return `${VIEWER_URLS.googleDocs}${encodeURIComponent(remoteUri)}`;
}

/**
 * Builds the Microsoft Office Online Viewer URL for a remote file.
 */
export function getMicrosoftViewerUrl(remoteUri: string): string {
  return `${VIEWER_URLS.microsoftOffice}${encodeURIComponent(remoteUri)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a structured ErrorInfo object.
 */
export function createErrorInfo(
  code: string,
  message: string,
  retryable: boolean,
  stack?: string,
): ErrorInfo {
  return {code, message, stack, retryable};
}

/**
 * Converts any caught error into an ErrorInfo structure.
 */
export function toErrorInfo(error: unknown): ErrorInfo {
  if (isErrorInfo(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODES.UNKNOWN,
      message: error.message,
      stack: error.stack,
      retryable: true,
    };
  }

  return {
    code: ERROR_CODES.UNKNOWN,
    message: String(error),
    retryable: true,
  };
}

/**
 * Type guard: checks if a value is an ErrorInfo object.
 */
function isErrorInfo(value: unknown): value is ErrorInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'retryable' in value
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Misc Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a file path for the current platform.
 * Strips file:// prefix if present.
 */
export function normalizeFilePath(uri: string): string {
  let normalized = uri.trim();

  // Strip file:// or file:/// prefix
  if (normalized.startsWith('file:///')) {
    normalized = normalized.substring(7);
  } else if (normalized.startsWith('file://')) {
    normalized = normalized.substring(7);
  }

  // On Android, ensure leading slash
  if (Platform.OS === 'android' && !normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  return normalized;
}

/**
 * Formats a byte count into a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = (bytes / Math.pow(1024, exponent)).toFixed(1);
  return `${size} ${units[exponent]}`;
}
