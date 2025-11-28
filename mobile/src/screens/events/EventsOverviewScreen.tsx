// src/screens/events/EventsOverviewScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchEvents, BASE_URL } from '../../services/apiClient';
import type { ApiEvent } from '../../types/api';

export default function EventsOverviewScreen() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchEvents();
      setEvents(result);
    } catch (err: any) {
      console.error('Fehler beim Laden der Events:', err);
      setError(err?.message ?? 'Unbekannter Fehler beim Laden der Events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initialer Load
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  const renderItem = ({ item }: { item: ApiEvent }) => {
    const dateRange = formatDateRange(item.startDate, item.endDate);
    const location = item.location || 'Ort unbekannt';
    const status = item.status || '–';

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.subtitle}>{dateRange}</Text>
        <Text style={styles.meta}>{location}</Text>
        <Text style={styles.status}>Status: {status}</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.infoText}>Lade Events…</Text>
        <Text style={styles.baseUrlText}>API: {BASE_URL}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Fehler: {error}</Text>
          <Text style={styles.errorHint}>
            Prüfe die BASE_URL in den App-Einstellungen und ob das Web-Backend
            läuft.
          </Text>
        </View>
      )}

      {!error && events.length === 0 && !loading && (
        <View style={styles.centered}>
          <Text style={styles.infoText}>Keine Events gefunden.</Text>
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={events.length === 0 ? styles.flexGrow : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

// =======================
// Hilfsfunktionen & Styles
// =======================

function formatDateRange(
  startDate: string | null,
  endDate: string | null,
): string {
  if (!startDate && !endDate) {
    return 'Datum unbekannt';
  }

  const format = (value: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  };

  const start = format(startDate);
  const end = format(endDate);

  if (start && end && start !== end) {
    return `${start} – ${end}`;
  }
  return start ?? end ?? 'Datum unbekannt';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  flexGrow: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
  },
  baseUrlText: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },
  errorBox: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#ffe6e6',
  },
  errorText: {
    color: '#b00020',
    fontWeight: '600',
    marginBottom: 4,
  },
  errorHint: {
    fontSize: 12,
    color: '#b00020',
  },
});
