/**
 * ============================================================================
 * File: src/components/DocumentViewer/UniversalViewer.tsx
 * DocuPick — Universal Document Viewer
 * Main orchestrator component: wraps ErrorBoundary, manages file
 * resolution/download, routes to the correct sub-viewer, and
 * provides a terminal-style header bar
 * ============================================================================
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import {ViewerProps, LoadingStage, ErrorInfo, DocumentType} from './types';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  LAYOUT,
  TYPE_BADGE_COLORS,
  ERROR_CODES,
} from './constants';
import {
  isRemoteUri,
  extractFileName,
  resolveDocumentType,
  getRendererType,
  downloadToCache,
  cleanupTempFile,
  fileExists,
  normalizeFilePath,
  toErrorInfo,
} from './utils';
import ErrorBoundary from './ErrorBoundary';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';
import PDFViewer from './PDFViewer';
import OfficeViewer from './OfficeViewer';
import TextViewer from './TextViewer';

// ─────────────────────────────────────────────────────────────────────────────
// Header Component
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  fileName: string;
  documentType: DocumentType;
}

const Header: React.FC<HeaderProps> = ({fileName, documentType}) => {
  const badgeColor = TYPE_BADGE_COLORS[documentType] || COLORS.textSecondary;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [glowAnim]);

  const borderBottomColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.surfaceBorder, badgeColor],
  });

  return (
    <Animated.View style={[styles.header, {borderBottomColor}]}>
      <View style={styles.headerLeft}>
        {/* Terminal prompt symbol */}
        <Text style={styles.headerPrompt}>❯</Text>
        <Text style={styles.headerFileName} numberOfLines={1}>
          {fileName}
        </Text>
      </View>

      <View style={styles.headerRight}>
        {/* Type Badge */}
        <View style={[styles.typeBadge, {borderColor: badgeColor}]}>
          <Text style={[styles.typeBadgeText, {color: badgeColor}]}>
            .{documentType.toUpperCase()}
          </Text>
        </View>

        {/* Status indicator dot */}
        <View style={[styles.statusDot, {backgroundColor: COLORS.neonGreen}]} />
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UniversalViewer Component
// ─────────────────────────────────────────────────────────────────────────────

const UniversalViewer: React.FC<ViewerProps> = ({
  uri,
  type,
  onLoadSuccess,
  onError,
  fileName: fileNameProp,
  showHeader = true,
}) => {
  // ─── State ──────────────────────────────────────────────────────
  const [state, setState] = useState<
    | {phase: 'loading'; stage: LoadingStage; progress: number}
    | {phase: 'ready'; localPath: string; documentType: DocumentType; isRemote: boolean}
    | {phase: 'error'; errorInfo: ErrorInfo}
  >({phase: 'loading', stage: LoadingStage.INITIALIZING, progress: 0});

  const [resetKey, setResetKey] = useState<number>(0);
  const mountedRef = useRef<boolean>(true);
  const tempFileRef = useRef<string | null>(null);

  const fileName = fileNameProp || extractFileName(uri);

  // Track mount status & cleanup temp files on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clean up cached temp file on unmount
      if (tempFileRef.current) {
        cleanupTempFile(tempFileRef.current);
      }
    };
  }, []);

  // ─── File Resolution Pipeline ─────────────────────────────────────
  const resolveFile = useCallback(async () => {
    try {
      // Stage 1: Initialize
      setState({phase: 'loading', stage: LoadingStage.INITIALIZING, progress: 0});
      await delay(300); // Brief pause for visual feedback

      // Stage 2: Resolve document type
      if (!mountedRef.current) {return;}
      setState({phase: 'loading', stage: LoadingStage.RESOLVING_PATH, progress: 0});

      let resolvedType: DocumentType;
      try {
        resolvedType = resolveDocumentType(uri, type);
      } catch (error) {
        if (!mountedRef.current) {return;}
        const errorInfo = toErrorInfo(error);
        setState({phase: 'error', errorInfo});
        onError?.(new Error(errorInfo.message));
        return;
      }

      // Stage 3: Download or validate local path
      if (!mountedRef.current) {return;}
      const remote = isRemoteUri(uri);

      let localPath: string;

      if (remote) {
        // Download the file
        setState({phase: 'loading', stage: LoadingStage.DOWNLOADING, progress: 0});

        try {
          localPath = await downloadToCache(uri, (percent) => {
            if (mountedRef.current) {
              setState({
                phase: 'loading',
                stage: LoadingStage.DOWNLOADING,
                progress: percent,
              });
            }
          });
          tempFileRef.current = localPath; // Track for cleanup
        } catch (error) {
          if (!mountedRef.current) {return;}
          const errorInfo = toErrorInfo(error);
          setState({phase: 'error', errorInfo});
          onError?.(new Error(errorInfo.message));
          return;
        }
      } else {
        // Local file: normalize path and verify existence
        localPath = normalizeFilePath(uri);

        const exists = await fileExists(localPath);
        if (!exists) {
          if (!mountedRef.current) {return;}
          const errorInfo: ErrorInfo = {
            code: ERROR_CODES.FILE_NOT_FOUND,
            message: `File not found at path: ${localPath}`,
            retryable: false,
          };
          setState({phase: 'error', errorInfo});
          onError?.(new Error(errorInfo.message));
          return;
        }
      }

      // Stage 4: Parse headers
      if (!mountedRef.current) {return;}
      setState({phase: 'loading', stage: LoadingStage.PARSING_HEADERS, progress: 0});
      await delay(200);

      // Stage 5: Ready to render
      if (!mountedRef.current) {return;}
      setState({phase: 'loading', stage: LoadingStage.RENDERING, progress: 0});
      await delay(200);

      if (!mountedRef.current) {return;}
      setState({
        phase: 'ready',
        localPath,
        documentType: resolvedType,
        isRemote: remote,
      });
    } catch (error) {
      if (!mountedRef.current) {return;}
      const errorInfo = toErrorInfo(error);
      setState({phase: 'error', errorInfo});
      onError?.(new Error(errorInfo.message));
    }
  }, [uri, type, onError]);

  // Trigger resolution on mount or when uri/type changes
  useEffect(() => {
    resolveFile();
  }, [resolveFile, resetKey]);

  // ─── Retry Handler ────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    // Clean up previous temp file
    if (tempFileRef.current) {
      cleanupTempFile(tempFileRef.current);
      tempFileRef.current = null;
    }
    setResetKey((prev) => prev + 1);
  }, []);

  // ─── Error Handler from sub-viewers ───────────────────────────────
  const handleSubViewerError = useCallback(
    (error: Error) => {
      if (!mountedRef.current) {return;}
      const errorInfo = toErrorInfo(error);
      setState({phase: 'error', errorInfo});
      onError?.(error);
    },
    [onError],
  );

  // ─── Render Sub-Viewer ────────────────────────────────────────────
  const renderViewer = () => {
    if (state.phase !== 'ready') {return null;}

    const rendererType = getRendererType(state.documentType);
    const subViewerProps = {
      uri,
      type: state.documentType,
      localPath: state.localPath,
      isRemote: state.isRemote,
      onLoadSuccess,
      onError: handleSubViewerError,
    };

    switch (rendererType) {
      case 'pdf':
        return <PDFViewer {...subViewerProps} />;
      case 'office':
        return <OfficeViewer {...subViewerProps} />;
      case 'text':
        return <TextViewer {...subViewerProps} />;
      default:
        return null;
    }
  };

  // ─── Main Render ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.container}>
        <ErrorBoundary onError={onError} resetKey={resetKey}>
          {/* Header */}
          {showHeader && state.phase === 'ready' && (
            <Header
              fileName={fileName}
              documentType={state.documentType}
            />
          )}

          {/* Content Area */}
          <View style={styles.content}>
            {state.phase === 'loading' && (
              <LoadingScreen
                stage={state.stage}
                progress={state.progress}
                fileName={fileName}
              />
            )}

            {state.phase === 'error' && (
              <ErrorScreen
                error={state.errorInfo}
                onRetry={state.errorInfo.retryable ? handleRetry : undefined}
              />
            )}

            {state.phase === 'ready' && renderViewer()}
          </View>
        </ErrorBoundary>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
  },

  // Header
  header: {
    height: LAYOUT.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.paddingMd,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: LAYOUT.paddingMd,
  },
  headerPrompt: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.lg,
    color: COLORS.neonGreen,
    marginRight: LAYOUT.paddingSm,
  },
  headerFileName: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: LAYOUT.paddingSm,
    paddingVertical: LAYOUT.paddingXs,
    borderWidth: 1,
    borderRadius: LAYOUT.borderRadiusSm,
    marginRight: LAYOUT.paddingSm,
  },
  typeBadgeText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default UniversalViewer;
