// src/screens/leads/LeadListScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Button,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LeadStackParamList } from '../../navigation/LeadStackNavigator';
import { fetchLeadsForForm } from '../../api/leads';
import { LeadWithFieldValuesDto } from '../../types/leads';
import { mapLeadToSummary } from '../../utils/leadMappers';
import { LeadListItem } from '../../components/lead/LeadListItem';

type Props = NativeStackScreenProps<LeadStackParamList, 'LeadList'>;

export const LeadListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { formId, formName } = route.params;

  const [leads, setLeads] = useState<LeadWithFieldValuesDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const items = await fetchLeadsForForm(formId);
      setLeads(items);
    } catch (err) {
      console.error('[LeadListScreen] loadLeads error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Leads konnten nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const items = await fetchLeadsForForm(formId);
      setLeads(items);
      setError(null);
    } catch (err) {
      console.error('[LeadListScreen] refresh error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Leads konnten nicht aktualisiert werden.'
      );
    } finally {
      setRefreshing(false);
    }
  }, [formId]);

  const summaries = useMemo(
    () => leads.map((lead) => mapLeadToSummary(lead)),
    [leads]
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.infoText}>Leads werden geladen…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Erneut versuchen" onPress={loadLeads} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const lead = leads.find((l) => l.id === item.id);
          return (
            <LeadListItem
              summary={item}
              onPress={() => {
                if (!lead) return;
                navigation.navigate('LeadDetail', {
                  formName,
                  lead,
                });
              }}
            />
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Für dieses Formular wurden noch keine Leads erfasst.
            </Text>
          </View>
        }
        contentContainerStyle={
          summaries.length === 0 ? styles.emptyListContent : undefined
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

export default LeadListScreen;
