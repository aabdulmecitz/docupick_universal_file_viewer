/**
 * ============================================================================
 * File: App.tsx
 * DocuPick — Universal Document Viewer Demo
 * Demo screen showcasing the UniversalViewer with file picker buttons
 * for each supported document type
 * ============================================================================
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import {UniversalViewer, DocumentType} from './src/components/DocumentViewer';

// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens (matching the viewer's constants)
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0a0a0f',
  bgDeep: '#050508',
  surface: '#12121a',
  surfaceElevated: '#1a1a26',
  surfaceBorder: '#2a2a3a',
  neonGreen: '#39ff14',
  neonGreenDim: 'rgba(57, 255, 20, 0.15)',
  neonGreenGlow: 'rgba(57, 255, 20, 0.4)',
  neonCyan: '#00f0ff',
  neonCyanDim: 'rgba(0, 240, 255, 0.15)',
  neonPink: '#ff2d6a',
  neonPinkDim: 'rgba(255, 45, 106, 0.15)',
  neonYellow: '#f5e642',
  neonYellowDim: 'rgba(245, 230, 66, 0.15)',
  textPrimary: '#e0e0e0',
  textSecondary: '#8a8a9a',
  textDim: '#55556a',
  textMuted: '#3a3a4a',
};

const FONTS = {
  mono: 'JetBrainsMono-Regular',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sample Files (Remote URLs for demonstration)
// ─────────────────────────────────────────────────────────────────────────────

interface SampleFile {
  label: string;
  uri: string;
  type: DocumentType;
  icon: string;
  color: string;
  description: string;
}

const SAMPLE_FILES: SampleFile[] = [
  {
    label: 'PDF Document',
    uri: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    type: 'pdf',
    icon: '📕',
    color: COLORS.neonPink,
    description: 'W3C test PDF file',
  },
  {
    label: 'DOCX Document',
    uri: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    type: 'docx',
    icon: '📘',
    color: COLORS.neonCyan,
    description: 'Calibre demo DOCX',
  },
  {
    label: 'XLSX Spreadsheet',
    uri: 'https://go.microsoft.com/fwlink/?LinkID=521962',
    type: 'xlsx',
    icon: '📗',
    color: COLORS.neonGreen,
    description: 'Microsoft sample XLSX',
  },
  {
    label: 'CSV Data',
    uri: 'https://people.sc.fsu.edu/~jburkardt/data/csv/addresses.csv',
    type: 'csv',
    icon: '📊',
    color: COLORS.neonYellow,
    description: 'Sample address data',
  },
  {
    label: 'Plain Text',
    uri: 'https://www.gutenberg.org/files/11/11-0.txt',
    type: 'txt',
    icon: '📄',
    color: COLORS.textSecondary,
    description: 'Alice in Wonderland (Gutenberg)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Animated Background Grid
// ─────────────────────────────────────────────────────────────────────────────

const BackgroundGrid: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.02, 0.06],
  });

  return (
    <Animated.View
      style={[styles.backgroundGrid, {opacity}]}
      pointerEvents="none"
    >
      {Array.from({length: 20}).map((_, i) => (
        <View key={`h-${i}`} style={[styles.gridLineH, {top: i * 40}]} />
      ))}
      {Array.from({length: 12}).map((_, i) => (
        <View key={`v-${i}`} style={[styles.gridLineV, {left: i * 35}]} />
      ))}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// File Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface FileCardProps {
  file: SampleFile;
  index: number;
  onPress: () => void;
}

const FileCard: React.FC<FileCardProps> = ({file, index, onPress}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}
    >
      <TouchableOpacity
        style={[styles.fileCard, {borderColor: file.color + '30'}]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Left: Icon & Info */}
        <View style={styles.fileCardLeft}>
          <Text style={styles.fileCardIcon}>{file.icon}</Text>
          <View style={styles.fileCardInfo}>
            <Text style={styles.fileCardLabel}>{file.label}</Text>
            <Text style={styles.fileCardDescription}>{file.description}</Text>
          </View>
        </View>

        {/* Right: Type Badge & Arrow */}
        <View style={styles.fileCardRight}>
          <View style={[styles.fileCardBadge, {borderColor: file.color, backgroundColor: file.color + '15'}]}>
            <Text style={[styles.fileCardBadgeText, {color: file.color}]}>
              .{file.type.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.fileCardArrow, {color: file.color}]}>▸</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────────────────────

function App(): React.JSX.Element {
  const [selectedFile, setSelectedFile] = useState<SampleFile | null>(null);
  const [viewerVisible, setViewerVisible] = useState<boolean>(false);

  const handleFileSelect = (file: SampleFile) => {
    setSelectedFile(file);
    setViewerVisible(true);
  };

  const handleClose = () => {
    setViewerVisible(false);
    setSelectedFile(null);
  };

  const handleLoadSuccess = () => {
    console.log('[Demo] Document loaded successfully');
  };

  const handleError = (error: Error) => {
    console.error('[Demo] Document error:', error.message);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.container}>
        <BackgroundGrid />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.logoText}>⟁ DOCUPICK</Text>
            <Text style={styles.titleText}>Document Viewer</Text>
            <Text style={styles.subtitleText}>
              Universal file renderer • PDF • Office • Text
            </Text>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>SELECT A FILE</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          {/* File Cards */}
          <View style={styles.fileList}>
            {SAMPLE_FILES.map((file, index) => (
              <FileCard
                key={file.type}
                file={file}
                index={index}
                onPress={() => handleFileSelect(file)}
              />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {'─'.repeat(40)}
            </Text>
            <Text style={styles.footerVersion}>
              docupick-viewer v1.0.0
            </Text>
            <Text style={styles.footerText}>
              Supports: PDF • DOCX • XLSX • CSV • TXT
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Viewer Modal */}
      <Modal
        visible={viewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          {/* Close Button Bar */}
          <View style={styles.closeBar}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>✕ CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Universal Viewer */}
          {selectedFile && (
            <UniversalViewer
              uri={selectedFile.uri}
              type={selectedFile.type}
              onLoadSuccess={handleLoadSuccess}
              onError={handleError}
              showHeader={true}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Background grid
  backgroundGrid: {
    ...(StyleSheet.absoluteFill as object),
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.neonGreen,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: COLORS.neonGreen,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
  },
  logoText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.neonGreen,
    letterSpacing: 6,
    marginBottom: 8,
    textShadowColor: COLORS.neonGreenGlow,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  titleText: {
    fontFamily: FONTS.mono,
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitleText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.textDim,
    letterSpacing: 1,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
  },
  dividerText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 3,
    paddingHorizontal: 16,
  },

  // File cards
  fileList: {
    gap: 12,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fileCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileCardIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  fileCardInfo: {
    flex: 1,
  },
  fileCardLabel: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileCardDescription: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textDim,
  },
  fileCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  fileCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 10,
  },
  fileCardBadgeText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fileCardArrow: {
    fontFamily: FONTS.mono,
    fontSize: 18,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  footerVersion: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: 0.5,
    marginVertical: 6,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  closeBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 44, // status bar offset
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.neonPinkDim,
    borderRadius: 4,
    backgroundColor: COLORS.neonPinkDim,
  },
  closeButtonText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.neonPink,
    letterSpacing: 1,
    fontWeight: '600',
  },
});

export default App;
