// src/screens/leads/LeadSelectionScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { apiClient } from '../../api/apiClient';
import { LeadStackParamList } from '../../navigation/LeadStackNavigator';

type Props = NativeStackScreenProps<LeadStackParamList, 'LeadSelection'>;

type EventItem = {
  id: number;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
};

type FormItem = {
  id: number;
  name: string;
  eventId: number | null;
};

export const LeadSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [eventsRes, formsRes] = await Promise.all([
        apiClient.get('/api/admin/events'),
        apiClient.get('/api/admin/forms'),
      ]);

      const eventsData = (eventsRes as any)?.events ?? [];
      const formsData = (formsRes as any)?.forms ?? [];

      setEvents(eventsData);
      setForms(formsData);

      // Falls ein Event existiert, standardmässig das erste auswählen
      if (eventsData.length > 0) {
        setSelectedEventId(eventsData[0].id);
      }
    } catch (err) {
      console.error('[LeadSelectionScreen] loadData error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Daten konnten nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredForms = useMemo(() => {
    if (!selectedEventId) return forms;
    return forms.filter((f) => f.eventId === selectedEventId);
  }, [forms, selectedEventId]);

  const currentEventName = useMemo(() => {
    if (!selectedEventId) return 'Alle Formulare';
    const ev = events.find((e) => e.id === selectedEventId);
    return ev ? ev.name : 'Formulare';
  }, [events, selectedEventId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.infoText}>Daten werden geladen…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Event-Auswahl */}
      <View style={styles.eventFilterContainer}>
        <Text style={styles.sectionTitle}>Event wählen</Text>
        <View style={styles.eventChipsContainer}>
          {events.map((event) => {
            const isSelected = selectedEventId === event.id;
            return (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventChip,
                  isSelected && styles.eventChipSelected,
                ]}
                onPress={() => setSelectedEventId(event.id)}
              >
                <Text
                  style={[
                    styles.eventChipText,
                    isSelected && styles.eventChipTextSelected,
                  ]}
                >
                  {event.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {events.length > 0 && (
            <TouchableOpacity
              style={[
                styles.eventChip,
                selectedEventId === null && styles.eventChipSelected,
              ]}
              onPress={() => setSelectedEventId(null)}
            >
              <Text
                style={[
                  styles.eventChipText,
                  selectedEventId === null && styles.eventChipTextSelected,
                ]}
              >
                Alle
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Formular-Liste */}
      <View style={styles.formListHeader}>
        <Text style={styles.sectionTitle}>Formulare ({currentEventName})</Text>
      </View>

      <FlatList
        data={filteredForms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const event = events.find((e) => e.id === item.eventId);
          const eventLabel = event ? event.name : 'Ohne Event';

          return (
            <View style={styles.formItem}>
              <View style={styles.formInfo}>
                <Text style={styles.formName}>{item.name}</Text>
                <Text style={styles.formEvent}>{eventLabel}</Text>
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionPrimary]}
                  onPress={() =>
                    navigation.navigate('LeadCapture', {
                      formId: item.id,
                      formName: item.name,
                    })
                  }
                >
                  <Text style={styles.actionPrimaryText}>Lead erfassen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionSecondary]}
                  onPress={() =>
                    navigation.navigate('LeadList', {
                      formId: item.id,
                      formName: item.name,
                    })
                  }
                >
                  <Text style={styles.actionSecondaryText}>Leads anzeigen</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Für diesen Filter sind keine Formulare vorhanden.
            </Text>
          </View>
        }
        contentContainerStyle={
          filteredForms.length === 0 ? styles.emptyListContent : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  infoText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginBottom: 12,
    color: '#c00',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  eventFilterContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as any,
  eventChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  eventChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  eventChipText: {
    fontSize: 13,
    color: '#333',
  },
  eventChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  formListHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  formItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  formInfo: {
    marginBottom: 8,
  },
  formName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  formEvent: {
    fontSize: 13,
    color: '#666',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  } as any,
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: '#007AFF',
  },
  actionPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  actionSecondary: {
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  actionSecondaryText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default LeadSelectionScreen;
