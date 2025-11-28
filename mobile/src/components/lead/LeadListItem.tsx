// src/components/lead/LeadListItem.tsx

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  GestureResponderEvent,
} from 'react-native';
import { LeadSummary } from '../../types/leads';

export type LeadListItemProps = {
  summary: LeadSummary;
  onPress?: (event: GestureResponderEvent) => void;
};

export const LeadListItem: React.FC<LeadListItemProps> = ({
  summary,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {summary.title}
        </Text>
        {summary.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {summary.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  textContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
});

export default LeadListItem;
