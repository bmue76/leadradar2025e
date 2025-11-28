// src/screens/forms/FormsOverviewScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchForms, BASE_URL } from '../../services/apiClient';
import type { ApiForm } from '../../types/api';

export default function FormsOverviewScreen() {
  const [forms, setForms] = useState<ApiForm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchForms();
      setForms(result);
    } catch (err: any) {
      console.error('Fehler beim Laden der Formulare:', err);
      setError(err?.message ?? 'Unbekannter Fehler beim Laden der Formulare.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initialer Load
    loadForms();
  }, [loadForms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadForms();
  }, [loadForms]);

  const renderItem = ({ item }: { item: ApiForm }) => {
    const eventLabel =
      item.eventName ??
      (item.eventId != null ? `Event #${item.eventId}` : 'Keinem Event zugeordnet');

    const status = item.status ?? '–';

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.meta}>{eventLabel}</Text>
        <Text style={styles.status}>Status: {status}</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.infoText}>Lade Formulare…</Text>
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

      {!error && forms.length === 0 && !loading && (
        <View style={styles.centered}>
          <Text style={styles.infoText}>Keine Formulare gefunden.</Text>
        </View>
      )}

      <FlatList
        data={forms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={forms.length === 0 ? styles.flexGrow : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
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
