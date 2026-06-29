/**
 * ============================================================================
 * File: src/components/DocumentViewer/LoadingScreen.tsx
 * DocuPick — Universal Document Viewer
 * Terminal-inspired loading animation with blinking cursor,
 * ASCII progress bar, and scrolling log lines
 * ============================================================================
 */

import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {LoadingScreenProps, LoadingStage} from './types';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  ANIMATIONS,
  LAYOUT,
  TERMINAL_MESSAGES,
} from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// ASCII Progress Bar Generator
// ─────────────────────────────────────────────────────────────────────────────

function buildProgressBar(percent: number, width: number = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percent}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blinking Cursor Component
// ─────────────────────────────────────────────────────────────────────────────

const BlinkingCursor: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 0,
          delay: ANIMATIONS.cursorBlinkInterval,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 0,
          delay: ANIMATIONS.cursorBlinkInterval,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.cursor, {opacity}]}>█</Animated.Text>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Line Component
// ─────────────────────────────────────────────────────────────────────────────

interface TerminalLineProps {
  text: string;
  index: number;
  isLatest: boolean;
}

const TerminalLine: React.FC<TerminalLineProps> = ({text, index, isLatest}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: ANIMATIONS.fadeInDuration,
      delay: index * ANIMATIONS.terminalLineDelay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View style={{opacity: fadeAnim}}>
      <Text style={[styles.terminalLine, isLatest && styles.terminalLineActive]}>
        {text}
        {isLatest && ' '}
        {isLatest && <BlinkingCursor />}
      </Text>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Scanline Overlay (CRT monitor effect)
// ─────────────────────────────────────────────────────────────────────────────

const ScanlineOverlay: React.FC = () => {
  const translateY = useRef(new Animated.Value(-LAYOUT.screenHeight)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateY, {
        toValue: LAYOUT.screenHeight,
        duration: ANIMATIONS.scanlineSpeed,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.scanline,
        {transform: [{translateY}]},
      ]}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main LoadingScreen Component
// ─────────────────────────────────────────────────────────────────────────────

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  stage,
  progress = 0,
  fileName,
}) => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const stageRef = useRef<LoadingStage>(stage);

  // Build terminal log lines based on current and previous stages
  const getLogLines = useCallback((): string[] => {
    const allStages: LoadingStage[] = [
      LoadingStage.INITIALIZING,
      LoadingStage.RESOLVING_PATH,
      LoadingStage.DOWNLOADING,
      LoadingStage.PARSING_HEADERS,
      LoadingStage.RENDERING,
    ];

    const currentIndex = allStages.indexOf(stage);
    const lines: string[] = [];

    for (let i = 0; i <= currentIndex; i++) {
      const stageKey = allStages[i];
      const stageMessages = TERMINAL_MESSAGES[stageKey] || [];
      if (i < currentIndex) {
        // Completed stages: show all lines
        lines.push(...stageMessages);
      } else {
        // Current stage: show lines progressively
        lines.push(...stageMessages);
      }
    }

    return lines;
  }, [stage]);

  // Update visible lines when stage changes
  useEffect(() => {
    if (stage !== stageRef.current) {
      stageRef.current = stage;
    }
    const lines = getLogLines();
    setVisibleLines(lines);
  }, [stage, getLogLines]);

  return (
    <View style={styles.container}>
      <ScanlineOverlay />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DOCUPICK VIEWER</Text>
        <Text style={styles.headerSubtitle}>
          {fileName ? `Loading: ${fileName}` : 'Loading document...'}
        </Text>
      </View>

      {/* Terminal Output */}
      <View style={styles.terminalContainer}>
        <View style={styles.terminalHeader}>
          <View style={styles.terminalDot} />
          <View style={[styles.terminalDot, styles.terminalDotYellow]} />
          <View style={[styles.terminalDot, styles.terminalDotGreen]} />
          <Text style={styles.terminalTitle}>  docupick-viewer</Text>
        </View>

        <View style={styles.terminalBody}>
          {visibleLines.map((line, index) => (
            <TerminalLine
              key={`${line}-${index}`}
              text={line}
              index={index}
              isLatest={index === visibleLines.length - 1}
            />
          ))}

          {/* Progress bar (only during download stage) */}
          {stage === LoadingStage.DOWNLOADING && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressBar}>
                {buildProgressBar(progress)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stage Indicator */}
      <View style={styles.stageIndicator}>
        <Text style={styles.stageText}>
          [{stage.replace(/_/g, ' ')}]
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.paddingLg,
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.scanline,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT.paddingXl,
  },
  headerTitle: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xl,
    color: COLORS.neonGreen,
    letterSpacing: 4,
    textShadowColor: COLORS.neonGreenGlow,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.paddingSm,
    letterSpacing: 1,
  },
  terminalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingSm,
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  terminalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.errorRed,
    marginRight: 6,
  },
  terminalDotYellow: {
    backgroundColor: COLORS.warningAmber,
  },
  terminalDotGreen: {
    backgroundColor: COLORS.successGreen,
  },
  terminalTitle: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
  },
  terminalBody: {
    padding: LAYOUT.paddingMd,
    minHeight: 180,
  },
  terminalLine: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  terminalLineActive: {
    color: COLORS.neonGreen,
  },
  cursor: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.neonGreen,
  },
  progressContainer: {
    marginTop: LAYOUT.paddingSm,
  },
  progressBar: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.neonCyan,
    letterSpacing: 0.5,
  },
  stageIndicator: {
    marginTop: LAYOUT.paddingLg,
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingXs,
    borderWidth: 1,
    borderColor: COLORS.neonGreenDim,
    borderRadius: LAYOUT.borderRadiusSm,
    backgroundColor: COLORS.neonGreenDim,
  },
  stageText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.neonGreen,
    letterSpacing: 2,
  },
});

export default LoadingScreen;
