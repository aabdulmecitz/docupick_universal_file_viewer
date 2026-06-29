/**
 * ============================================================================
 * File: src/components/DocumentViewer/ErrorScreen.tsx
 * DocuPick — Universal Document Viewer
 * Glitch-art error state with animated error code display,
 * stack trace viewer, and neon pulse retry button
 * ============================================================================
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import {ErrorScreenProps} from './types';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  ANIMATIONS,
  LAYOUT,
} from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Glitch Text Component
// ─────────────────────────────────────────────────────────────────────────────

interface GlitchTextProps {
  text: string;
}

const GlitchText: React.FC<GlitchTextProps> = ({text}) => {
  const [glitching, setGlitching] = useState(false);
  const [glitchOffset, setGlitchOffset] = useState({x: 0, y: 0});
  const glitchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glitchDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger glitch effect periodically
    glitchTimerRef.current = setInterval(() => {
      setGlitching(true);
      setGlitchOffset({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 4,
      });

      glitchDurationRef.current = setTimeout(() => {
        setGlitching(false);
        setGlitchOffset({x: 0, y: 0});
      }, ANIMATIONS.glitchDuration);
    }, ANIMATIONS.glitchInterval);

    return () => {
      if (glitchTimerRef.current) {
        clearInterval(glitchTimerRef.current);
      }
      if (glitchDurationRef.current) {
        clearTimeout(glitchDurationRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.glitchContainer}>
      {/* Red offset layer (behind) */}
      {glitching && (
        <Text
          style={[
            styles.glitchLayerRed,
            {
              transform: [
                {translateX: -glitchOffset.x},
                {translateY: -glitchOffset.y},
              ],
            },
          ]}
        >
          {text}
        </Text>
      )}

      {/* Cyan offset layer (behind) */}
      {glitching && (
        <Text
          style={[
            styles.glitchLayerCyan,
            {
              transform: [
                {translateX: glitchOffset.x},
                {translateY: glitchOffset.y},
              ],
            },
          ]}
        >
          {text}
        </Text>
      )}

      {/* Main text (on top) */}
      <Text style={styles.glitchMain}>{text}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pulsing Border Button
// ─────────────────────────────────────────────────────────────────────────────

interface PulseButtonProps {
  label: string;
  onPress: () => void;
}

const PulseButton: React.FC<PulseButtonProps> = ({label, onPress}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: ANIMATIONS.pulseInterval,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: ANIMATIONS.pulseInterval,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.neonCyan, COLORS.neonPink],
  });

  const shadowOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.retryButton,
          {
            borderColor,
            shadowOpacity,
            shadowColor: COLORS.neonCyan,
          },
        ]}
      >
        <Text style={styles.retryButtonText}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main ErrorScreen Component
// ─────────────────────────────────────────────────────────────────────────────

const ErrorScreen: React.FC<ErrorScreenProps> = ({error, onRetry}) => {
  return (
    <View style={styles.container}>
      {/* Error Icon (ASCII art) */}
      <Text style={styles.asciiError}>
        {'  ╔═══════════╗\n  ║  ✖  ERR  ║\n  ╚═══════════╝'}
      </Text>

      {/* Glitch Error Title */}
      <GlitchText text="SYSTEM FAULT" />

      {/* Error Code Badge */}
      <View style={styles.errorCodeBadge}>
        <Text style={styles.errorCodeText}>{error.code}</Text>
      </View>

      {/* Error Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageLabel}>{'> DIAGNOSTIC:'}</Text>
        <Text style={styles.messageText}>{error.message}</Text>
      </View>

      {/* Stack Trace (if available) */}
      {error.stack && (
        <View style={styles.stackContainer}>
          <Text style={styles.stackLabel}>{'> STACK TRACE:'}</Text>
          <ScrollView
            style={styles.stackScroll}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
          >
            <Text style={styles.stackText}>{error.stack}</Text>
          </ScrollView>
        </View>
      )}

      {/* Retry Button */}
      {error.retryable && onRetry && (
        <View style={styles.retryContainer}>
          <PulseButton label="[ RETRY ]" onPress={onRetry} />
          <Text style={styles.retryHint}>Press to reinitialize render pipeline</Text>
        </View>
      )}

      {/* Non-retryable message */}
      {!error.retryable && (
        <View style={styles.fatalContainer}>
          <Text style={styles.fatalText}>
            ⚠ FATAL: This error cannot be recovered automatically.
          </Text>
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
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.paddingLg,
  },
  asciiError: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.errorRed,
    textAlign: 'center',
    marginBottom: LAYOUT.paddingMd,
    lineHeight: 20,
  },

  // Glitch text layers
  glitchContainer: {
    position: 'relative',
    marginBottom: LAYOUT.paddingLg,
  },
  glitchMain: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textShadowColor: COLORS.neonPinkGlow,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },
  glitchLayerRed: {
    position: 'absolute',
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.neonPink,
    letterSpacing: 6,
    opacity: 0.7,
  },
  glitchLayerCyan: {
    position: 'absolute',
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.neonCyan,
    letterSpacing: 6,
    opacity: 0.7,
  },

  // Error code
  errorCodeBadge: {
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingXs + 2,
    backgroundColor: COLORS.errorRedDim,
    borderWidth: 1,
    borderColor: COLORS.errorRed,
    borderRadius: LAYOUT.borderRadiusSm,
    marginBottom: LAYOUT.paddingLg,
  },
  errorCodeText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.md,
    color: COLORS.errorRed,
    letterSpacing: 2,
  },

  // Error message
  messageContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius,
    padding: LAYOUT.paddingMd,
    marginBottom: LAYOUT.paddingMd,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  messageLabel: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.neonPink,
    marginBottom: LAYOUT.paddingXs,
    letterSpacing: 1,
  },
  messageText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  // Stack trace
  stackContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius,
    padding: LAYOUT.paddingMd,
    marginBottom: LAYOUT.paddingLg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  stackLabel: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.warningAmber,
    marginBottom: LAYOUT.paddingSm,
    letterSpacing: 1,
  },
  stackScroll: {
    maxHeight: 120,
  },
  stackText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
    lineHeight: 18,
  },

  // Retry button
  retryContainer: {
    alignItems: 'center',
  },
  retryButton: {
    paddingHorizontal: LAYOUT.paddingXl,
    paddingVertical: LAYOUT.paddingMd,
    borderWidth: 2,
    borderRadius: LAYOUT.borderRadius,
    backgroundColor: 'transparent',
    shadowOffset: {width: 0, height: 0},
    shadowRadius: 12,
    elevation: 8,
  },
  retryButtonText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.lg,
    color: COLORS.neonCyan,
    letterSpacing: 3,
    fontWeight: '700',
  },
  retryHint: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
    marginTop: LAYOUT.paddingSm,
    letterSpacing: 0.5,
  },

  // Fatal (non-retryable)
  fatalContainer: {
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingSm,
    backgroundColor: COLORS.errorRedDim,
    borderRadius: LAYOUT.borderRadiusSm,
    borderWidth: 1,
    borderColor: COLORS.errorRed,
  },
  fatalText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.errorRed,
    textAlign: 'center',
  },
});

export default ErrorScreen;
