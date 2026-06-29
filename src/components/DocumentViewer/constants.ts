/**
 * ============================================================================
 * File: src/components/DocumentViewer/constants.ts
 * DocuPick — Universal Document Viewer
 * Design tokens, color palette, font config, and animation timings
 * ============================================================================
 */

import {Dimensions} from 'react-native';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Color Palette — Terminal-inspired dark mode with neon accents
// ─────────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  bg: '#0a0a0f',
  bgDeep: '#050508',
  surface: '#12121a',
  surfaceElevated: '#1a1a26',
  surfaceBorder: '#2a2a3a',

  // Neon accents
  neonGreen: '#39ff14',
  neonGreenDim: 'rgba(57, 255, 20, 0.15)',
  neonGreenGlow: 'rgba(57, 255, 20, 0.4)',
  neonCyan: '#00f0ff',
  neonCyanDim: 'rgba(0, 240, 255, 0.15)',
  neonCyanGlow: 'rgba(0, 240, 255, 0.4)',
  neonPink: '#ff2d6a',
  neonPinkDim: 'rgba(255, 45, 106, 0.15)',
  neonPinkGlow: 'rgba(255, 45, 106, 0.4)',
  neonYellow: '#f5e642',
  neonYellowDim: 'rgba(245, 230, 66, 0.15)',

  // Status
  errorRed: '#ff3333',
  errorRedDim: 'rgba(255, 51, 51, 0.15)',
  warningAmber: '#ffaa00',
  successGreen: '#39ff14',

  // Text
  textPrimary: '#e0e0e0',
  textSecondary: '#8a8a9a',
  textDim: '#55556a',
  textMuted: '#3a3a4a',

  // Overlays
  overlayDark: 'rgba(5, 5, 8, 0.85)',
  scanline: 'rgba(255, 255, 255, 0.02)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

export const FONTS = {
  mono: 'JetBrainsMono-Regular',
  monoFallback: 'monospace',
} as const;

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  title: 24,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Animation Timings (in milliseconds)
// ─────────────────────────────────────────────────────────────────────────────

export const ANIMATIONS = {
  cursorBlinkInterval: 530,
  glitchInterval: 3000,
  glitchDuration: 150,
  progressUpdateInterval: 80,
  terminalLineDelay: 400,
  fadeInDuration: 300,
  pulseInterval: 1500,
  scanlineSpeed: 4000,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export const LAYOUT = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  headerHeight: 56,
  borderRadius: 6,
  borderRadiusSm: 4,
  paddingXs: 4,
  paddingSm: 8,
  paddingMd: 16,
  paddingLg: 24,
  paddingXl: 32,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Document type → Renderer mapping
// ─────────────────────────────────────────────────────────────────────────────

export const TYPE_TO_RENDERER: Record<string, 'pdf' | 'office' | 'text'> = {
  pdf: 'pdf',
  doc: 'office',
  docx: 'office',
  xls: 'office',
  xlsx: 'office',
  csv: 'text',
  txt: 'text',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// File type badge colors (used in header)
// ─────────────────────────────────────────────────────────────────────────────

export const TYPE_BADGE_COLORS: Record<string, string> = {
  pdf: COLORS.neonPink,
  doc: COLORS.neonCyan,
  docx: COLORS.neonCyan,
  xls: COLORS.neonGreen,
  xlsx: COLORS.neonGreen,
  csv: COLORS.neonYellow,
  txt: COLORS.textSecondary,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Terminal log messages for LoadingScreen stages
// ─────────────────────────────────────────────────────────────────────────────

export const TERMINAL_MESSAGES = {
  INITIALIZING: [
    '> docupick-viewer v1.0.0',
    '> Initializing render pipeline...',
    '> Allocating memory buffers...',
  ],
  RESOLVING_PATH: [
    '> Resolving file path...',
    '> Validating URI scheme...',
    '> Checking file permissions...',
  ],
  DOWNLOADING: [
    '> Establishing secure connection...',
    '> Downloading file to cache...',
  ],
  PARSING_HEADERS: [
    '> Parsing file headers...',
    '> Detecting content encoding...',
    '> Validating file integrity...',
  ],
  RENDERING: [
    '> Mounting render engine...',
    '> Preparing viewport...',
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Error codes
// ─────────────────────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  FILE_NOT_FOUND: 'ERR::FILE_NOT_FOUND',
  DOWNLOAD_FAILED: 'ERR::DOWNLOAD_FAILED',
  UNSUPPORTED_TYPE: 'ERR::UNSUPPORTED_TYPE',
  RENDER_FAILED: 'ERR::RENDER_FAILED',
  NETWORK_OFFLINE: 'ERR::NETWORK_OFFLINE',
  PERMISSION_DENIED: 'ERR::PERMISSION_DENIED',
  UNKNOWN: 'ERR::UNKNOWN',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// External viewer URLs
// ─────────────────────────────────────────────────────────────────────────────

export const VIEWER_URLS = {
  googleDocs: 'https://docs.google.com/gview?embedded=true&url=',
  microsoftOffice: 'https://view.officeapps.live.com/op/embed.aspx?src=',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Text viewer limits
// ─────────────────────────────────────────────────────────────────────────────

export const TEXT_VIEWER_LIMITS = {
  /** Maximum number of lines to render initially */
  initialLineCount: 500,

  /** Number of lines to load when "load more" is triggered */
  loadMoreBatchSize: 500,

  /** Maximum file size (in bytes) to read into memory (10 MB) */
  maxFileSize: 10 * 1024 * 1024,
} as const;
