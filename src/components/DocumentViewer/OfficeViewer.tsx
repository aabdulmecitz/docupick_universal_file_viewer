/**
 * ============================================================================
 * File: src/components/DocumentViewer/OfficeViewer.tsx
 * DocuPick — Universal Document Viewer
 * DOCX/XLSX renderer using WebView (Google Docs / MS Office Online)
 * with offline fallback via react-native-file-viewer-turbo
 * ============================================================================
 */

import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import WebView from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import {open as openFileViewer} from 'react-native-file-viewer-turbo';
import {SubViewerProps} from './types';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  LAYOUT,
  ERROR_CODES,
} from './constants';
import {
  getGoogleDocsViewerUrl,
  getMicrosoftViewerUrl,
  createErrorInfo,
  isRemoteUri,
} from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ViewerProvider = 'google' | 'microsoft';

type ConnectionState = 'checking' | 'online' | 'offline';

// ─────────────────────────────────────────────────────────────────────────────
// OfficeViewer Component
// ─────────────────────────────────────────────────────────────────────────────

const OfficeViewer: React.FC<SubViewerProps> = ({
  localPath,
  uri,
  isRemote,
  onLoadSuccess,
  onError,
}) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('checking');
  const [activeProvider, setActiveProvider] =
    useState<ViewerProvider>('google');
  const [webViewLoading, setWebViewLoading] = useState<boolean>(true);
  const [nativeViewerLaunched, setNativeViewerLaunched] =
    useState<boolean>(false);
  const [nativeViewerError, setNativeViewerError] = useState<string | null>(
    null,
  );
  const mountedRef = useRef<boolean>(true);
  const webViewRef = useRef<any>(null);

  // Track mount status
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─── Network Check ─────────────────────────────────────────────────
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const checkConnection = async () => {
      try {
        const state = await NetInfo.fetch();
        if (!mountedRef.current) {return;}

        if (state.isConnected && isRemote) {
          setConnectionState('online');
        } else if (state.isConnected && !isRemote) {
          // Local file but online — try online viewer only if we have a public URL
          // For local files, go straight to native viewer
          setConnectionState('offline');
        } else {
          setConnectionState('offline');
        }
      } catch {
        if (!mountedRef.current) {return;}
        setConnectionState('offline');
      }
    };

    checkConnection();

    // Subscribe to network changes
    try {
      unsubscribe = NetInfo.addEventListener((state) => {
        if (!mountedRef.current) {return;}
        if (state.isConnected && isRemote) {
          setConnectionState('online');
        }
      });
    } catch {
      // NetInfo listener setup failed, ignore
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isRemote]);

  // ─── Auto-launch native viewer when offline ───────────────────────
  useEffect(() => {
    if (connectionState === 'offline' && !nativeViewerLaunched) {
      openWithNativeViewer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

  // ─── Open with native OS viewer ───────────────────────────────────
  const openWithNativeViewer = useCallback(async () => {
    try {
      setNativeViewerLaunched(true);
      await openFileViewer(localPath, {
        showOpenWithDialog: true,
        showAppsSuggestions: true,
      });
      if (mountedRef.current) {
        onLoadSuccess?.();
      }
    } catch (error: unknown) {
      if (!mountedRef.current) {return;}
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to open file with native viewer';

      setNativeViewerError(message);
      onError?.(
        new Error(
          createErrorInfo(
            ERROR_CODES.RENDER_FAILED,
            `Native viewer failed: ${message}`,
            true,
          ).message,
        ),
      );
    }
  }, [localPath, onLoadSuccess, onError]);

  // ─── Switch between Google and Microsoft viewers ──────────────────
  const switchProvider = useCallback(() => {
    setActiveProvider((prev) =>
      prev === 'google' ? 'microsoft' : 'google',
    );
    setWebViewLoading(true);
  }, []);

  // ─── Get the viewer URL ───────────────────────────────────────────
  const getViewerUrl = useCallback((): string => {
    const remoteUrl = isRemoteUri(uri) ? uri : uri;
    if (activeProvider === 'google') {
      return getGoogleDocsViewerUrl(remoteUrl);
    }
    return getMicrosoftViewerUrl(remoteUrl);
  }, [uri, activeProvider]);

  // ─── WebView Handlers ─────────────────────────────────────────────
  const handleWebViewLoad = useCallback(() => {
    if (!mountedRef.current) {return;}
    try {
      setWebViewLoading(false);
      onLoadSuccess?.();
    } catch (error) {
      console.error('[OfficeViewer] onLoad error:', error);
    }
  }, [onLoadSuccess]);

  const handleWebViewError = useCallback(() => {
    if (!mountedRef.current) {return;}
    try {
      // Try the other provider
      if (activeProvider === 'google') {
        setActiveProvider('microsoft');
        setWebViewLoading(true);
      } else {
        // Both providers failed, fall back to native viewer
        openWithNativeViewer();
      }
    } catch (error) {
      console.error('[OfficeViewer] onError handler crash:', error);
    }
  }, [activeProvider, openWithNativeViewer]);

  // ─── Render: Checking connection ──────────────────────────────────
  if (connectionState === 'checking') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.neonCyan} />
        <Text style={styles.statusText}>Checking network status...</Text>
      </View>
    );
  }

  // ─── Render: Offline — native viewer result ───────────────────────
  if (connectionState === 'offline') {
    return (
      <View style={styles.centerContainer}>
        {nativeViewerError ? (
          <>
            <Text style={styles.offlineIcon}>⚡</Text>
            <Text style={styles.offlineTitle}>OFFLINE MODE</Text>
            <Text style={styles.offlineMessage}>
              Native viewer error: {nativeViewerError}
            </Text>
            <TouchableOpacity
              style={styles.nativeButton}
              onPress={openWithNativeViewer}
              activeOpacity={0.7}
            >
              <Text style={styles.nativeButtonText}>[ RETRY NATIVE VIEWER ]</Text>
            </TouchableOpacity>
          </>
        ) : nativeViewerLaunched ? (
          <>
            <Text style={styles.offlineIcon}>📄</Text>
            <Text style={styles.offlineTitle}>OPENED IN NATIVE VIEWER</Text>
            <Text style={styles.offlineMessage}>
              The document was handed off to your device&apos;s native app.
            </Text>
            <TouchableOpacity
              style={styles.nativeButton}
              onPress={openWithNativeViewer}
              activeOpacity={0.7}
            >
              <Text style={styles.nativeButtonText}>[ OPEN AGAIN ]</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={COLORS.neonCyan} />
            <Text style={styles.statusText}>
              Opening with native viewer...
            </Text>
          </>
        )}
      </View>
    );
  }

  // ─── Render: Online — WebView ─────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Provider Switcher Bar */}
      <View style={styles.providerBar}>
        <TouchableOpacity
          style={[
            styles.providerTab,
            activeProvider === 'google' && styles.providerTabActive,
          ]}
          onPress={() => {
            setActiveProvider('google');
            setWebViewLoading(true);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.providerTabText,
              activeProvider === 'google' && styles.providerTabTextActive,
            ]}
          >
            Google Docs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.providerTab,
            activeProvider === 'microsoft' && styles.providerTabActive,
          ]}
          onPress={() => {
            setActiveProvider('microsoft');
            setWebViewLoading(true);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.providerTabText,
              activeProvider === 'microsoft' && styles.providerTabTextActive,
            ]}
          >
            MS Office
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nativeOpenButton}
          onPress={openWithNativeViewer}
          activeOpacity={0.7}
        >
          <Text style={styles.nativeOpenText}>⤴ Native</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{uri: getViewerUrl()}}
        style={styles.webView}
        onLoad={handleWebViewLoad}
        onError={handleWebViewError}
        onHttpError={handleWebViewError}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color={COLORS.neonCyan} />
            <Text style={styles.statusText}>
              Loading via {activeProvider === 'google' ? 'Google Docs' : 'MS Office'}...
            </Text>
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        allowsFullscreenVideo={false}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
      />

      {/* WebView loading overlay */}
      {webViewLoading && (
        <View style={styles.webViewLoadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.neonCyan} />
          <Text style={styles.statusText}>
            Connecting to {activeProvider === 'google' ? 'Google Docs' : 'MS Office'} viewer...
          </Text>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={switchProvider}
            activeOpacity={0.7}
          >
            <Text style={styles.switchButtonText}>
              Try {activeProvider === 'google' ? 'MS Office' : 'Google Docs'} instead
            </Text>
          </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.paddingLg,
  },
  statusText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.paddingMd,
    letterSpacing: 0.5,
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Provider switcher
  providerBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: LAYOUT.paddingSm,
  },
  providerTab: {
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingSm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  providerTabActive: {
    borderBottomColor: COLORS.neonCyan,
  },
  providerTabText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },
  providerTabTextActive: {
    color: COLORS.neonCyan,
  },
  nativeOpenButton: {
    marginLeft: 'auto',
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingSm + 2,
  },
  nativeOpenText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.neonGreen,
    letterSpacing: 0.5,
  },

  // Switch button
  switchButton: {
    marginTop: LAYOUT.paddingLg,
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingSm,
    borderWidth: 1,
    borderColor: COLORS.neonCyanDim,
    borderRadius: LAYOUT.borderRadiusSm,
  },
  switchButtonText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.neonCyan,
    letterSpacing: 0.5,
  },

  // Offline / Native viewer
  offlineIcon: {
    fontSize: 48,
    marginBottom: LAYOUT.paddingMd,
  },
  offlineTitle: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.lg,
    color: COLORS.neonYellow,
    letterSpacing: 2,
    marginBottom: LAYOUT.paddingSm,
  },
  offlineMessage: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.paddingLg,
    paddingHorizontal: LAYOUT.paddingLg,
  },
  nativeButton: {
    paddingHorizontal: LAYOUT.paddingLg,
    paddingVertical: LAYOUT.paddingMd,
    borderWidth: 1,
    borderColor: COLORS.neonCyan,
    borderRadius: LAYOUT.borderRadiusSm,
  },
  nativeButtonText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.neonCyan,
    letterSpacing: 2,
  },
});

export default OfficeViewer;
