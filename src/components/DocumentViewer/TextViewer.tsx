/**
 * ============================================================================
 * File: src/components/DocumentViewer/TextViewer.tsx
 * DocuPick — Universal Document Viewer
 * TXT/CSV renderer with line numbers, monospace font,
 * CSV column highlighting, and large file lazy loading
 * ============================================================================
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SubViewerProps} from './types';
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  LAYOUT,
  TEXT_VIEWER_LIMITS,
  ERROR_CODES,
} from './constants';
import {readTextFile, getFileSize, createErrorInfo, formatFileSize} from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// CSV Column Color Cycling
// ─────────────────────────────────────────────────────────────────────────────

const CSV_COLUMN_COLORS = [
  COLORS.neonGreen,
  COLORS.neonCyan,
  COLORS.neonPink,
  COLORS.neonYellow,
  COLORS.textPrimary,
  '#b48eff', // purple
  '#ff8c42', // orange
  '#45ffa0', // mint
];

/**
 * Parses a CSV line and returns styled segments.
 */
function parseCSVLine(
  line: string,
): Array<{text: string; color: string}> {
  const segments: Array<{text: string; color: string}> = [];
  let currentField = '';
  let inQuotes = false;
  let fieldIndex = 0;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentField += char;
    } else if (char === ',' && !inQuotes) {
      segments.push({
        text: currentField,
        color: CSV_COLUMN_COLORS[fieldIndex % CSV_COLUMN_COLORS.length],
      });
      segments.push({
        text: ',',
        color: COLORS.textDim,
      });
      currentField = '';
      fieldIndex++;
    } else {
      currentField += char;
    }
  }

  // Push the last field
  if (currentField.length > 0) {
    segments.push({
      text: currentField,
      color: CSV_COLUMN_COLORS[fieldIndex % CSV_COLUMN_COLORS.length],
    });
  }

  return segments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Line Component (memoized for performance)
// ─────────────────────────────────────────────────────────────────────────────

interface LineProps {
  lineNumber: number;
  content: string;
  isCSV: boolean;
  maxLineNumberWidth: number;
}

const Line = React.memo<LineProps>(
  ({lineNumber, content, isCSV, maxLineNumberWidth}) => {
    const lineNumStr = String(lineNumber).padStart(maxLineNumberWidth, ' ');

    return (
      <View style={styles.lineContainer}>
        {/* Line Number Gutter */}
        <View style={styles.lineNumberGutter}>
          <Text style={styles.lineNumber}>{lineNumStr}</Text>
        </View>

        {/* Separator */}
        <View style={styles.lineSeparator} />

        {/* Content */}
        <View style={styles.lineContent}>
          {isCSV ? (
            <Text style={styles.lineText}>
              {parseCSVLine(content).map((seg, i) => (
                <Text key={i} style={{color: seg.color}}>
                  {seg.text}
                </Text>
              ))}
            </Text>
          ) : (
            <Text style={styles.lineText}>{content}</Text>
          )}
        </View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// TextViewer Component
// ─────────────────────────────────────────────────────────────────────────────

const TextViewer: React.FC<SubViewerProps> = ({
  localPath,
  type,
  onLoadSuccess,
  onError,
}) => {
  const [allLines, setAllLines] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(
    TEXT_VIEWER_LIMITS.initialLineCount,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [fileInfo, setFileInfo] = useState<{
    size: number;
    totalLines: number;
  }>({size: 0, totalLines: 0});
  const mountedRef = useRef<boolean>(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const isCSV = type === 'csv';

  // Track mount status
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─── Load File Content ────────────────────────────────────────────
  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true);

        // Check file size first
        const size = await getFileSize(localPath);
        if (size > TEXT_VIEWER_LIMITS.maxFileSize) {
          if (!mountedRef.current) {return;}
          const err = createErrorInfo(
            ERROR_CODES.RENDER_FAILED,
            `File is too large to display (${formatFileSize(size)}). ` +
              `Maximum supported size: ${formatFileSize(TEXT_VIEWER_LIMITS.maxFileSize)}`,
            false,
          );
          onError?.(new Error(err.message));
          return;
        }

        const content = await readTextFile(localPath);
        if (!mountedRef.current) {return;}

        const lines = content.split('\n');
        setAllLines(lines);
        setFileInfo({size, totalLines: lines.length});
        setLoading(false);
        onLoadSuccess?.();
      } catch (error: unknown) {
        if (!mountedRef.current) {return;}
        setLoading(false);
        const message =
          error instanceof Error ? error.message : 'Failed to read file';
        onError?.(new Error(message));
      }
    };

    loadFile();
  }, [localPath, onLoadSuccess, onError]);

  // ─── Load More Lines ──────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) =>
      Math.min(prev + TEXT_VIEWER_LIMITS.loadMoreBatchSize, allLines.length),
    );
  }, [allLines.length]);

  // ─── Visible lines slice ──────────────────────────────────────────
  const visibleLines = allLines.slice(0, visibleCount);
  const hasMore = visibleCount < allLines.length;
  const maxLineNumberWidth = String(allLines.length).length;

  // ─── Loading State ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.neonGreen} />
        <Text style={styles.loadingText}>Reading file contents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* File Info Bar */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          {fileInfo.totalLines} lines • {formatFileSize(fileInfo.size)}
          {isCSV ? ' • CSV' : ' • TXT'}
        </Text>
        <Text style={styles.infoText}>
          Showing {Math.min(visibleCount, allLines.length)}/{allLines.length}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        horizontal={false}
      >
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={true}
          indicatorStyle="white"
          contentContainerStyle={styles.horizontalScrollContent}
        >
          <View>
            {/* CSV Header Row (first line highlighted) */}
            {isCSV && visibleLines.length > 0 && (
              <View style={styles.csvHeaderRow}>
                <View style={styles.lineContainer}>
                  <View style={styles.lineNumberGutter}>
                    <Text style={styles.lineNumber}>
                      {'1'.padStart(maxLineNumberWidth, ' ')}
                    </Text>
                  </View>
                  <View style={styles.lineSeparator} />
                  <View style={styles.lineContent}>
                    <Text style={[styles.lineText, styles.csvHeaderText]}>
                      {parseCSVLine(visibleLines[0]).map((seg, i) => (
                        <Text key={i} style={{color: seg.color, fontWeight: '700'}}>
                          {seg.text}
                        </Text>
                      ))}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Body Lines */}
            {visibleLines.slice(isCSV ? 1 : 0).map((line, index) => {
              const lineNumber = isCSV ? index + 2 : index + 1;
              return (
                <Line
                  key={lineNumber}
                  lineNumber={lineNumber}
                  content={line}
                  isCSV={isCSV}
                  maxLineNumberWidth={maxLineNumberWidth}
                />
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                activeOpacity={0.7}
              >
                <Text style={styles.loadMoreText}>
                  ▼ LOAD {Math.min(TEXT_VIEWER_LIMITS.loadMoreBatchSize, allLines.length - visibleCount)} MORE LINES ▼
                </Text>
                <Text style={styles.loadMoreSubtext}>
                  ({allLines.length - visibleCount} remaining)
                </Text>
              </TouchableOpacity>
            )}

            {/* End of File */}
            {!hasMore && allLines.length > 0 && (
              <View style={styles.eofContainer}>
                <Text style={styles.eofText}>
                  ──── EOF ────
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.paddingMd,
  },

  // Info bar
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: LAYOUT.paddingMd,
    paddingVertical: LAYOUT.paddingSm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  infoText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: LAYOUT.paddingXl,
  },
  horizontalScrollContent: {
    minWidth: '100%',
  },

  // Line
  lineContainer: {
    flexDirection: 'row',
    minHeight: 24,
    alignItems: 'flex-start',
  },
  lineNumberGutter: {
    width: 56,
    paddingRight: LAYOUT.paddingSm,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingVertical: 2,
  },
  lineNumber: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  lineSeparator: {
    width: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginRight: LAYOUT.paddingSm,
    alignSelf: 'stretch',
  },
  lineContent: {
    flex: 1,
    paddingVertical: 2,
    paddingRight: LAYOUT.paddingMd,
  },
  lineText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  // CSV Header
  csvHeaderRow: {
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neonCyanDim,
  },
  csvHeaderText: {
    fontWeight: '700',
  },

  // Load More
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: LAYOUT.paddingMd,
    marginTop: LAYOUT.paddingSm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  loadMoreText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.neonCyan,
    letterSpacing: 1,
  },
  loadMoreSubtext: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
    marginTop: LAYOUT.paddingXs,
  },

  // End of file
  eofContainer: {
    alignItems: 'center',
    paddingVertical: LAYOUT.paddingMd,
    marginTop: LAYOUT.paddingSm,
  },
  eofText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
});

export default TextViewer;
