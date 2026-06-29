/**
 * ============================================================================
 * File: src/components/DocumentViewer/PDFViewer.tsx
 * DocuPick — Universal Document Viewer
 * PDF renderer using react-native-pdf with memory leak prevention,
 * page counter overlay, and error handling
 * ============================================================================
 */

import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Pdf from 'react-native-pdf';
import {SubViewerProps} from './types';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  LAYOUT,
  ERROR_CODES,
} from './constants';
import {createErrorInfo} from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// PDFViewer Component
// ─────────────────────────────────────────────────────────────────────────────

const PDFViewer: React.FC<SubViewerProps> = ({
  localPath,
  uri,
  isRemote,
  onLoadSuccess,
  onError,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  // Track mount status for async callback safety
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Determine the source object for react-native-pdf.
   * For remote URIs, we pass the original URL so the library
   * can handle its own caching. For local files, use the local path.
   */
  const pdfSource = isRemote
    ? {uri: uri, cache: true}
    : {uri: localPath};

  /**
   * Handle successful PDF load.
   */
  const handleLoadComplete = useCallback(
    (numberOfPages: number) => {
      if (!mountedRef.current) {return;}
      try {
        setTotalPages(numberOfPages);
        setIsLoaded(true);
        onLoadSuccess?.();
      } catch (error) {
        console.error('[PDFViewer] onLoadComplete error:', error);
      }
    },
    [onLoadSuccess],
  );

  /**
   * Handle page change.
   */
  const handlePageChanged = useCallback(
    (page: number) => {
      if (!mountedRef.current) {return;}
      try {
        setCurrentPage(page);
      } catch (error) {
        console.error('[PDFViewer] onPageChanged error:', error);
      }
    },
    [],
  );

  /**
   * Handle PDF loading error.
   */
  const handleError = useCallback(
    (error: object) => {
      if (!mountedRef.current) {return;}
      try {
        const errorMessage =
          error && typeof error === 'object' && 'message' in error
            ? String((error as {message: string}).message)
            : 'Failed to render PDF document';

        const errorInfo = createErrorInfo(
          ERROR_CODES.RENDER_FAILED,
          errorMessage,
          true,
        );
        onError?.(new Error(errorInfo.message));
      } catch (e) {
        console.error('[PDFViewer] onError handler crash:', e);
      }
    },
    [onError],
  );

  const {width: screenWidth} = Dimensions.get('window');

  return (
    <View style={styles.container}>
      {/* PDF Renderer */}
      <Pdf
        source={pdfSource}
        style={[styles.pdfView, {width: screenWidth}]}
        onLoadComplete={handleLoadComplete}
        onPageChanged={handlePageChanged}
        onError={handleError}
        enablePaging={true}
        horizontal={false}
        fitPolicy={2} // fit both width and height
        spacing={8}
        enableAntialiasing={true}
        enableAnnotationRendering={true}
        trustAllCerts={false}
      />

      {/* Page Counter Overlay */}
      {isLoaded && totalPages > 0 && (
        <View style={styles.pageCounterContainer}>
          <View style={styles.pageCounterBadge}>
            <Text style={styles.pageCounterText}>
              [{currentPage}/{totalPages}]
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  pdfView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  pageCounterContainer: {
    position: 'absolute',
    bottom: LAYOUT.paddingLg,
    right: LAYOUT.paddingMd,
  },
  pageCounterBadge: {
    backgroundColor: COLORS.overlayDark,
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingXs + 2,
    borderRadius: LAYOUT.borderRadiusSm,
    borderWidth: 1,
    borderColor: COLORS.neonPinkDim,
  },
  pageCounterText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.neonPink,
    letterSpacing: 1,
  },
});

export default PDFViewer;
