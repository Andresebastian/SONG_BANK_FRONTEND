import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getSongById, SongDetail, SongLine, transposeSong } from '../services/api';
import { colors } from '../theme/colors';

type SongDetailScreenProps = {
  token: string;
  songId: string;
};

type FontSizeMode = 'small' | 'normal' | 'large' | 'xlarge';

const FONT_SCALES: Record<FontSizeMode, { lyric: number; chord: number; lineHeight: number }> = {
  small:  { lyric: 14, chord: 12, lineHeight: 21 },
  normal: { lyric: 16, chord: 14, lineHeight: 23 },
  large:  { lyric: 18, chord: 16, lineHeight: 26 },
  xlarge: { lyric: 21, chord: 18, lineHeight: 30 },
};

const FONT_LABELS: { mode: FontSizeMode; label: string }[] = [
  { mode: 'small',  label: 'A-'  },
  { mode: 'normal', label: 'A'   },
  { mode: 'large',  label: 'A+'  },
  { mode: 'xlarge', label: 'A++' },
];

const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CONTENT_PADDING = 14;

function sectionLabel(section?: string): string {
  if (!section || section === 'letra') return 'Letra';
  return section.charAt(0).toUpperCase() + section.slice(1);
}

/** Extrae el embed URL de YouTube a partir de URL estándar o corta */
function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return null;
  return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&playsinline=1`;
}

function lineSegments(text: string, chords: SongLine['chords']) {
  const sorted = [...chords].sort((a, b) => a.index - b.index);
  if (sorted.length === 0) return null;
  const textBefore = text.slice(0, sorted[0].index);
  const segments = sorted.map((chord, idx) => {
    const end = idx < sorted.length - 1 ? sorted[idx + 1].index : text.length;
    return { chord: chord.note, segText: text.slice(chord.index, end) };
  });
  return { textBefore, segments };
}

function renderLineWithChords(line: SongLine, fontMode: FontSizeMode) {
  const fonts = FONT_SCALES[fontMode];
  const parsed = lineSegments(line.text || '', line.chords || []);

  if (!parsed) {
    return (
      <View style={lineStyles.lineBlock}>
        <Text style={[lineStyles.lyricText, { fontSize: fonts.lyric, lineHeight: fonts.lineHeight }]}>
          {line.text || ' '}
        </Text>
      </View>
    );
  }

  return (
    <View style={lineStyles.lineBlock}>
      <View style={lineStyles.segmentRow}>
        {parsed.textBefore ? (
          <View style={lineStyles.segmentColumn}>
            <Text style={[lineStyles.chordText, { fontSize: fonts.chord, opacity: 0 }]}>.</Text>
            <Text style={[lineStyles.lyricText, lineStyles.lyricMono, { fontSize: fonts.lyric, lineHeight: fonts.lineHeight }]}>
              {parsed.textBefore}
            </Text>
          </View>
        ) : null}
        {parsed.segments.map((seg, idx) => (
          <View key={idx} style={lineStyles.segmentColumn}>
            <Text style={[lineStyles.chordText, { fontSize: fonts.chord }]}>{seg.chord}</Text>
            <Text style={[lineStyles.lyricText, lineStyles.lyricMono, { fontSize: fonts.lyric, lineHeight: fonts.lineHeight }]}>
              {seg.segText || ' '}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  lineBlock: { marginBottom: 8 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  segmentColumn: { flexDirection: 'column' },
  chordText: { color: colors.primary, fontWeight: '700', marginBottom: 2 },
  lyricText: { color: colors.text },
  lyricMono: { fontFamily: 'monospace' },
});

export function SongDetailScreen({ token, songId }: SongDetailScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transposing, setTransposing] = useState(false);
  const [song, setSong] = useState<SongDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontMode, setFontMode] = useState<FontSizeMode>('normal');
  const [showTranspose, setShowTranspose] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionYOffsets = useRef<Record<string, number>>({});

  const loadSong = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSongById(token, songId);
      setSong(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle');
    } finally {
      setLoading(false);
    }
  }, [token, songId]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSong();
    setRefreshing(false);
  };

  const handleTranspose = async (newKey: string) => {
    if (!song || newKey === song.key || transposing) return;
    setTransposing(true);
    setShowTranspose(false);
    try {
      const updated = await transposeSong(token, songId, newKey);
      setSong(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo transponer');
    } finally {
      setTransposing(false);
    }
  };

  const scrollToSection = (sectionKey: string) => {
    const y = sectionYOffsets.current[sectionKey];
    if (y !== undefined) {
      scrollViewRef.current?.scrollTo({ y: CONTENT_PADDING + y - 8, animated: true });
    }
  };

  const groupedLines = useMemo(() => {
    const sections = new Map<string, SongLine[]>();
    for (const line of song?.lyricsLines ?? []) {
      const key = line.section || 'letra';
      const list = sections.get(key) ?? [];
      list.push(line);
      sections.set(key, list);
    }
    return Array.from(sections.entries());
  }, [song]);

  const videoEmbedUrl = song?.youtubeUrl ? getYouTubeEmbedUrl(song.youtubeUrl) : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !song) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Cancion no encontrada'}</Text>
      </View>
    );
  }

  return (
    <>
      {/* Barra de navegacion de secciones (solo si hay mas de una) */}
      {groupedLines.length > 1 && (
        <View style={styles.sectionNavContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionNavContent}
          >
            {groupedLines.map(([section]) => (
              <Pressable
                key={section}
                style={styles.sectionNavPill}
                onPress={() => scrollToSection(section)}
              >
                <Text style={styles.sectionNavPillText}>{sectionLabel(section)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header de la cancion */}
        <View style={styles.songHeader}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.artistText}>{song.artist}</Text>
            <Pressable
              style={styles.keyBadge}
              onPress={() => setShowTranspose(true)}
              disabled={transposing}
            >
              {transposing ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.keyBadgeText}>{song.key} ↕</Text>
              )}
            </Pressable>
          </View>
          {Array.isArray(song.tags) && song.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {song.tags.map((tag, i) => (
                <View key={i} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {song.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notas</Text>
              <Text style={styles.notesText}>{song.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Video de YouTube */}
        {videoEmbedUrl ? (
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: videoEmbedUrl }}
              style={styles.video}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              scrollEnabled={false}
            />
          </View>
        ) : null}

        {/* Controles de fuente */}
        <View style={styles.controls}>
          <Text style={styles.controlsLabel}>Fuente:</Text>
          <View style={styles.fontButtons}>
            {FONT_LABELS.map(({ mode, label }) => (
              <Pressable
                key={mode}
                style={[styles.fontButton, fontMode === mode && styles.fontButtonActive]}
                onPress={() => setFontMode(mode)}
              >
                <Text style={[styles.fontButtonText, fontMode === mode && styles.fontButtonTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Secciones con letra y acordes */}
        {groupedLines.map(([section, lines], sectionIndex) => (
          <View
            key={`${section}-${sectionIndex}`}
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYOffsets.current[section] = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{sectionLabel(section)}</Text>
            </View>
            {lines.map((line, lineIndex) => (
              <View key={`${sectionIndex}-${lineIndex}`}>
                {renderLineWithChords(line, fontMode)}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Modal de tonalidad */}
      <Modal
        visible={showTranspose}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTranspose(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Cambiar Tonalidad</Text>
            <Text style={styles.modalSubtitle}>
              Tono actual:{' '}
              <Text style={styles.modalCurrentKey}>{song.key}</Text>
            </Text>
            <View style={styles.keysGrid}>
              {ALL_KEYS.map((k) => (
                <Pressable
                  key={k}
                  style={[styles.keyButton, k === song.key && styles.keyButtonActive]}
                  onPress={() => handleTranspose(k)}
                >
                  <Text style={[styles.keyButtonText, k === song.key && styles.keyButtonTextActive]}>
                    {k}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.modalCloseButton} onPress={() => setShowTranspose(false)}>
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: CONTENT_PADDING,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: { color: colors.error, fontSize: 15 },

  // Navegacion de secciones
  sectionNavContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionNavContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  sectionNavPill: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionNavPillText: {
    color: colors.primarySoft,
    fontWeight: '700',
    fontSize: 12,
  },

  // Header de la cancion
  songHeader: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 10,
  },
  songTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  artistText: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  keyBadge: {
    backgroundColor: `${colors.primary}25`,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 62,
    alignItems: 'center',
  },
  keyBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  notesBox: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: 4,
  },
  notesLabel: {
    color: colors.primarySoft,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },

  // Video de YouTube
  videoContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 220,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Controles de fuente
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  controlsLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  fontButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  fontButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fontButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fontButtonText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  fontButtonTextActive: {
    color: '#fff',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },

  // Bloques de seccion
  sectionBlock: {
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.primarySoft,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Modal de tonalidad
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  modalCurrentKey: {
    color: colors.primary,
    fontWeight: '700',
  },
  keysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  keyButton: {
    width: 58,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  keyButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  keyButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  modalCloseButton: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
});
