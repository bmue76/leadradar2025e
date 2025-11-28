// mobile/src/screens/events/EventsOverviewScreen.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';

type DummyEvent = {
  id: string;
  name: string;
  dateRange: string;
};

const DUMMY_EVENTS: DummyEvent[] = [
  { id: '1', name: 'LeadRadar Demo Event', dateRange: '01.01.2026' },
  { id: '2', name: 'Messe Zürich', dateRange: '15.–17.03.2026' },
  { id: '3', name: 'Expo Basel', dateRange: '10.–12.05.2026' },
];

export default function EventsOverviewScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Events</Text>
      <Text style={styles.subtitle}>
        Placeholder-Übersicht – Anbindung an Backend folgt in späterem
        Teilprojekt.
      </Text>

      <FlatList
        data={DUMMY_EVENTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.eventName}>{item.name}</Text>
            <Text style={styles.eventDate}>{item.dateRange}</Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 16,
  },
  list: {
    paddingTop: 8,
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
  },
});
