// mobile/src/screens/settings/SettingsScreen.tsx
import React from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import { BASE_URL } from '../../services/apiClient';

type SettingsScreenProps = {
  onLogout: () => void;
};

export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const handleLogout = () => {
    // Später ersetzen durch echte Logout-Logik (Token löschen etc.)
    onLogout();
  };

  const handleInfo = () => {
    Alert.alert(
      'LeadRadar Mobile',
      'LeadRadar2025e – Mobile App Basis (Teilprojekt 5.1)'
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Einstellungen</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App-Info</Text>
        <Text style={styles.sectionText}>LeadRadar Mobile (Expo / React Native)</Text>
        <Text style={styles.sectionText}>Teilprojekt 5.1 – Mobile Basis</Text>
        <Text style={styles.sectionText}>API Base URL: {BASE_URL}</Text>

        <View style={styles.buttonRow}>
          <Button title="Info" onPress={handleInfo} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.buttonRow}>
          <Button title="Logout (Dummy)" onPress={handleLogout} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  buttonRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
});
