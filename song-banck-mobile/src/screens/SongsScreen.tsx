import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSongs, searchSongsAdvanced, Song } from '../services/api';
import { clearToken } from '../services/storage';
import { colors } from '../theme/colors';

type SongsScreenProps = {
  token: string;
  onLogout: () => void;
  onOpenSong: (songId: string) => void;
};

export function SongsScreen({ token, onLogout, onOpenSong }: SongsScreenProps) {
  const insets = useSafeAreaInsets();
  const [songsLoading, setSongsLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [filterTitle, setFilterTitle] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [filterTags, setFilterTags] = useState('');

  // Carga inicial — sin filtros (no depende de los valores de filtro)
  const fetchAllSongs = useCallback(async () => {
    setSongsLoading(true);
    try {
      const data = await getSongs(token);
      setSongs(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron cargar las alabanzas';
      Alert.alert('Error', message);
    } finally {
      setSongsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllSongs();
  }, [fetchAllSongs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllSongs();
    setRefreshing(false);
  };

  const onSearch = async () => {
    setSongsLoading(true);
    try {
      const data = await searchSongsAdvanced(token, {
        title: filterTitle || undefined,
        artist: filterArtist || undefined,
        key: filterKey || undefined,
        tags: filterTags || undefined,
      });
      setSongs(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo realizar la busqueda';
      Alert.alert('Error', message);
    } finally {
      setSongsLoading(false);
    }
  };

  const onClearFilters = () => {
    setFilterTitle('');
    setFilterArtist('');
    setFilterKey('');
    setFilterTags('');
    fetchAllSongs();
  };

  const doLogout = async () => {
    await clearToken();
    onLogout();
  };

  const hasFilters = filterTitle || filterArtist || filterKey || filterTags;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Banco de Alabanzas</Text>
          <Text style={styles.subtitle}>
            {songs.length > 0 ? `${songs.length} canciones` : 'Canciones del ministerio'}
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={doLogout}>
          <Text style={styles.logoutButtonText}>Salir</Text>
        </Pressable>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <TextInput
            style={styles.filterInput}
            placeholder="Titulo"
            placeholderTextColor={colors.textMuted}
            value={filterTitle}
            onChangeText={setFilterTitle}
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Artista"
            placeholderTextColor={colors.textMuted}
            value={filterArtist}
            onChangeText={setFilterArtist}
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Tono"
            placeholderTextColor={colors.textMuted}
            value={filterKey}
            onChangeText={setFilterKey}
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Etiqueta"
            placeholderTextColor={colors.textMuted}
            value={filterTags}
            onChangeText={setFilterTags}
          />
          <Pressable style={styles.searchButton} onPress={onSearch}>
            <Text style={styles.searchButtonText}>Buscar</Text>
          </Pressable>
          {hasFilters ? (
            <Pressable style={styles.clearButton} onPress={onClearFilters}>
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      {songsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={
            songs.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay alabanzas para mostrar</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.songCard, pressed && styles.songCardPressed]}
              onPress={() => onOpenSong(item._id)}
            >
              <View style={styles.songCardAccent} />
              <View style={styles.songCardBody}>
                <View style={styles.songTitleRow}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.keyBadge}>
                    <Text style={styles.keyBadgeText}>{item.key}</Text>
                  </View>
                </View>
                <Text style={styles.songArtist}>{item.artist}</Text>
                {Array.isArray(item.tags) && item.tags.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {item.tags.slice(0, 3).map((tag, i) => (
                      <View key={i} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 4,
  },
  filtersRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  filterInput: {
    width: 130,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  searchButton: {
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  clearButton: {
    height: 40,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  songCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  songCardPressed: {
    opacity: 0.8,
    backgroundColor: colors.surfaceSoft,
  },
  songCardAccent: {
    width: 4,
    backgroundColor: colors.primary,
  },
  songCardBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  songTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  keyBadge: {
    backgroundColor: `${colors.primary}25`,
    borderWidth: 1,
    borderColor: `${colors.primary}60`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  keyBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  songArtist: {
    color: colors.textMuted,
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tagChip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipText: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
