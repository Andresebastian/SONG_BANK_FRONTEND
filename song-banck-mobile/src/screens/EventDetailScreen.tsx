import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getEventById, getSongById, SongDetail, SongLine, transposeSong } from '../services/api';
import { colors } from '../theme/colors';

type EventDetailScreenProps = {
  token: string;
  eventId: string;
};

type SetlistSong = {
  songId: string;
  order: number;
  transposeKey?: string;
  _id: string;
};

type SetId = {
  _id: string;
  songs: SetlistSong[];
};

type EventWithSet = {
  _id: string;
  name: string;
  date: string;
  description?: string;
  directorName?: string;
  status: string;
  setId?: SetId;
};

type SongInfo = { title: string; artist: string };

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

function sectionLabel(s?: string) {
  if (!s || s === 'letra') return 'Letra';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderLineWithChords(line: SongLine, fontMode: FontSizeMode) {
  const fonts = FONT_SCALES[fontMode];
  const sorted = [...(line.chords ?? [])].sort((a, b) => a.index - b.index);

  if (sorted.length === 0) {
    return (
      <View style={lineStyles.lineBlock}>
        <Text style={[lineStyles.lyricText, { fontSize: fonts.lyric, lineHeight: fonts.lineHeight }]}>
          {line.text || ' '}
        </Text>
      </View>
    );
  }

  const textBefore = (line.text ?? '').slice(0, sorted[0].index);
  const segments = sorted.map((chord, idx) => {
    const end = idx < sorted.length - 1 ? sorted[idx + 1].index : (line.text ?? '').length;
    return { chord: chord.note, segText: (line.text ?? '').slice(chord.index, end) };
  });

  return (
    <View style={lineStyles.lineBlock}>
      <View style={lineStyles.segmentRow}>
        {textBefore ? (
          <View style={lineStyles.segmentColumn}>
            <Text style={[lineStyles.chordText, { fontSize: fonts.chord, opacity: 0 }]}>.</Text>
            <Text style={[lineStyles.lyricText, lineStyles.lyricMono, { fontSize: fonts.lyric, lineHeight: fonts.lineHeight }]}>
              {textBefore}
            </Text>
          </View>
        ) : null}
        {segments.map((seg, idx) => (
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
  lineBlock: { marginBottom: 6 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  segmentColumn: { flexDirection: 'column' },
  chordText: { color: colors.primary, fontWeight: '700', marginBottom: 1 },
  lyricText: { color: colors.text },
  lyricMono: { fontFamily: 'monospace' },
});

export function EventDetailScreen({ token, eventId }: EventDetailScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState<EventWithSet | null>(null);
  const [songInfoMap, setSongInfoMap] = useState<Record<string, SongInfo>>({});
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongDetail | null>(null);
  const [loadingSong, setLoadingSong] = useState(false);
  const [transposing, setTransposing] = useState(false);
  const [showTranspose, setShowTranspose] = useState(false);
  const [fontMode, setFontMode] = useState<FontSizeMode>('normal');
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEventById(token, eventId) as unknown as EventWithSet;
      setEvent(data);

      if (data.setId?.songs?.length) {
        const entries = await Promise.all(
          data.setId.songs.map(async (s) => {
            try {
              const song = await getSongById(token, s.songId);
              return [s.songId, { title: song.title, artist: song.artist }] as const;
            } catch {
              return [s.songId, { title: 'Sin titulo', artist: 'Desconocido' }] as const;
            }
          })
        );
        setSongInfoMap(Object.fromEntries(entries));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el evento');
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvent();
    setRefreshing(false);
  };

  const handleSelectSong = async (setlistSong: SetlistSong) => {
    if (selectedSongId === setlistSong.songId) {
      setSelectedSongId(null);
      setSelectedSong(null);
      return;
    }
    setSelectedSongId(setlistSong.songId);
    setLoadingSong(true);
    try {
      const songData = await getSongById(token, setlistSong.songId);
      if (setlistSong.transposeKey && setlistSong.transposeKey !== songData.key) {
        const transposed = await transposeSong(token, setlistSong.songId, setlistSong.transposeKey);
        setSelectedSong(transposed);
      } else {
        setSelectedSong(songData);
      }
    } catch {
      setSelectedSong(null);
    } finally {
      setLoadingSong(false);
    }
  };

  const handleTranspose = async (newKey: string) => {
    if (!selectedSong || !selectedSongId || transposing) return;
    setTransposing(true);
    setShowTranspose(false);
    try {
      const updated = await transposeSong(token, selectedSongId, newKey);
      setSelectedSong(updated);
    } catch {
      // silencioso
    } finally {
      setTransposing(false);
    }
  };

  const groupedLines = useMemo(() => {
    const sections = new Map<string, SongLine[]>();
    for (const line of selectedSong?.lyricsLines ?? []) {
      const key = line.section || 'letra';
      const list = sections.get(key) ?? [];
      list.push(line);
      sections.set(key, list);
    }
    return Array.from(sections.entries());
  }, [selectedSong]);

  const setlistSongs = event?.setId?.songs
    ? [...event.setId.songs].sort((a, b) => a.order - b.order)
    : [];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Evento no encontrado'}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
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
        {/* Info del evento */}
        <View style={styles.eventInfoCard}>
          {event.directorName ? (
            <Text style={styles.eventMeta}>🎤 Director: {event.directorName}</Text>
          ) : null}
          {event.description ? (
            <Text style={styles.eventDesc}>{event.description}</Text>
          ) : null}
          <Text style={styles.eventSongCount}>
            {setlistSongs.length} cancion{setlistSongs.length !== 1 ? 'es' : ''} en el setlist
          </Text>
        </View>

        {/* Setlist */}
        {setlistSongs.length === 0 ? (
          <Text style={styles.emptyText}>Este evento no tiene canciones asignadas</Text>
        ) : (
          setlistSongs.map((item, idx) => {
            const info = songInfoMap[item.songId];
            const isSelected = selectedSongId === item.songId;
            return (
              <View key={item._id} style={styles.setlistItemWrapper}>
                <Pressable
                  style={[styles.setlistItem, isSelected && styles.setlistItemActive]}
                  onPress={() => handleSelectSong(item)}
                >
                  <View style={[styles.setlistOrder, isSelected && styles.setlistOrderActive]}>
                    <Text style={[styles.setlistOrderText, isSelected && styles.setlistOrderTextActive]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={styles.setlistInfo}>
                    <Text style={styles.setlistTitle} numberOfLines={1}>
                      {info?.title ?? 'Cargando...'}
                    </Text>
                    <Text style={styles.setlistArtist}>{info?.artist ?? ''}</Text>
                  </View>
                  {item.transposeKey ? (
                    <View style={styles.keyChip}>
                      <Text style={styles.keyChipText}>{item.transposeKey}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.chevron}>{isSelected ? '▲' : '▼'}</Text>
                </Pressable>

                {/* Letra expandida */}
                {isSelected && (
                  <View style={styles.lyricsPanel}>
                    {loadingSong ? (
                      <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
                    ) : selectedSong ? (
                      <>
                        {/* Controles */}
                        <View style={styles.lyricsControls}>
                          <View style={styles.fontActions}>
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
                          <Pressable
                            style={styles.transposeButton}
                            onPress={() => setShowTranspose(true)}
                            disabled={transposing}
                          >
                            {transposing ? (
                              <ActivityIndicator color={colors.primary} size="small" />
                            ) : (
                              <Text style={styles.transposeButtonText}>{selectedSong.key} ↕</Text>
                            )}
                          </Pressable>
                        </View>

                        {/* Secciones */}
                        {groupedLines.map(([section, lines], si) => (
                          <View key={`${section}-${si}`} style={styles.sectionBlock}>
                            <View style={styles.sectionHeaderRow}>
                              <View style={styles.sectionAccent} />
                              <Text style={styles.sectionTitle}>{sectionLabel(section)}</Text>
                            </View>
                            {lines.map((line, li) => (
                              <View key={`${si}-${li}`}>
                                {renderLineWithChords(line, fontMode)}
                              </View>
                            ))}
                          </View>
                        ))}
                      </>
                    ) : (
                      <Text style={styles.lyricsError}>No se pudo cargar la cancion</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
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
              <Text style={styles.modalCurrentKey}>{selectedSong?.key}</Text>
            </Text>
            <View style={styles.keysGrid}>
              {ALL_KEYS.map((k) => (
                <Pressable
                  key={k}
                  style={[styles.keyButton, k === selectedSong?.key && styles.keyButtonActive]}
                  onPress={() => handleTranspose(k)}
                >
                  <Text style={[styles.keyButtonText, k === selectedSong?.key && styles.keyButtonTextActive]}>
                    {k}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowTranspose(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: { color: colors.error, fontSize: 15 },

  eventInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    gap: 6,
  },
  eventMeta: { color: colors.textMuted, fontSize: 13 },
  eventDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  eventSongCount: { color: colors.primarySoft, fontWeight: '600', fontSize: 13 },

  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 30, fontSize: 15 },

  setlistItemWrapper: { marginBottom: 6 },
  setlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  setlistItemActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  setlistOrder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  setlistOrderActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  setlistOrderText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  setlistOrderTextActive: { color: '#fff' },
  setlistInfo: { flex: 1 },
  setlistTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  setlistArtist: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  keyChip: {
    backgroundColor: `${colors.primary}25`,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  keyChipText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  chevron: { color: colors.textMuted, fontSize: 12 },

  lyricsPanel: {
    backgroundColor: colors.surfaceSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 14,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  lyricsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  fontActions: { flexDirection: 'row', gap: 6 },
  fontButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  fontButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  fontButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: 11 },
  fontButtonTextActive: { color: '#fff' },
  transposeButton: {
    backgroundColor: `${colors.primary}25`,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  transposeButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  lyricsError: { color: colors.error, textAlign: 'center', padding: 10 },

  sectionBlock: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.primarySoft,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
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
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  modalSubtitle: { color: colors.textMuted, fontSize: 14 },
  modalCurrentKey: { color: colors.primary, fontWeight: '700' },
  keysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
    elevation: 4,
  },
  keyButtonText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  keyButtonTextActive: { color: '#fff', fontWeight: '700' },
  modalCloseButton: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
});
