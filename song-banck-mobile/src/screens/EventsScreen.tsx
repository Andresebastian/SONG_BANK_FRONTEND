import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getEvents, SongEvent } from '../services/api';
import { clearToken } from '../services/storage';
import { colors } from '../theme/colors';

type EventsScreenProps = {
  token: string;
  onLogout: () => void;
  onOpenEvent: (eventId: string, eventName: string) => void;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Activo',    color: colors.success,  bg: `${colors.success}18`  },
  draft:    { label: 'Borrador',  color: '#F59E0B',        bg: '#F59E0B18'             },
  archived: { label: 'Archivado', color: colors.textMuted, bg: `${colors.textMuted}18` },
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function EventsScreen({ token, onLogout, onOpenEvent }: EventsScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<SongEvent[]>([]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents(token);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const doLogout = async () => {
    await clearToken();
    onLogout();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Eventos</Text>
          <Text style={styles.subtitle}>Servicios y reuniones</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={doLogout}>
          <Text style={styles.logoutButtonText}>Salir</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={events}
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
            events.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay eventos disponibles</Text>
          }
          renderItem={({ item }) => {
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['archived'];
            return (
              <Pressable
                style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
                onPress={() => onOpenEvent(item._id, item.name)}
              >
                {/* Fila superior: nombre + estado */}
                <View style={styles.eventTopRow}>
                  <Text style={styles.eventName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.color }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {/* Meta: fecha + director */}
                <View style={styles.eventMetaRow}>
                  <Text style={styles.eventMeta}>📅 {formatDate(item.date)}</Text>
                  {item.directorName ? (
                    <Text style={styles.eventMeta}>🎤 {item.directorName}</Text>
                  ) : null}
                </View>

                {item.description ? (
                  <Text style={styles.eventDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Footer */}
                <View style={styles.eventFooter}>
                  <Text style={styles.eventArrow}>Ver setlist →</Text>
                </View>
              </Pressable>
            );
          }}
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
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
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
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  eventCardPressed: {
    opacity: 0.8,
    backgroundColor: colors.surfaceSoft,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    lineHeight: 22,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  eventMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  eventDesc: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  eventFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  eventArrow: {
    color: colors.primarySoft,
    fontWeight: '600',
    fontSize: 13,
  },
});
