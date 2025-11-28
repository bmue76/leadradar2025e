// src/screens/leads/LeadDetailScreen.tsx

import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LeadStackParamList } from '../../navigation/LeadStackNavigator';
import { mapLeadToDetail } from '../../utils/leadMappers';

type Props = NativeStackScreenProps<LeadStackParamList, 'LeadDetail'>;

export const LeadDetailScreen: React.FC<Props> = ({ route }) => {
  const { lead, formName } = route.params;

  const detail = useMemo(() => mapLeadToDetail(lead), [lead]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{detail.title}</Text>
        <Text style={styles.subtitle}>{detail.createdAtLabel}</Text>
        {formName ? (
          <Text style={styles.formName}>Formular: {formName}</Text>
        ) : null}
      </View>

      {detail.baseFields.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stammdaten</Text>
          {detail.baseFields.map((field, index) => (
            <View style={styles.fieldRow} key={`${field.label}-${index}`}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldValue}>{field.value}</Text>
            </View>
          ))}
        </View>
      )}

      {detail.dynamicFields.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formularfelder</Text>
          {detail.dynamicFields.map((field) => (
            <View
              style={styles.fieldRow}
              key={field.id ?? `${field.label}-${field.value}`}
            >
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldValue}>{field.value}</Text>
            </View>
          ))}
        </View>
      )}

      {detail.baseFields.length === 0 &&
        detail.dynamicFields.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.emptyText}>
              Für diesen Lead sind keine detaillierten Felder vorhanden.
            </Text>
          </View>
        )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  formName: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});

export default LeadDetailScreen;
