// mobile/src/screens/leads/LeadCapturePlaceholderScreen.tsx
import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import { apiGet } from '../../services/apiClient';

export default function LeadCapturePlaceholderScreen() {
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestApiCall = async () => {
    setLoading(true);
    setError(null);
    setApiResult(null);
    try {
      // TODO: Ersetze '/api/admin/health' durch einen echten Endpoint, wenn vorhanden
      const data = await apiGet('/api/admin/health');
      setApiResult(JSON.stringify(data));
    } catch (err: any) {
      setError(err?.message ?? 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Lead-Erfassung</Text>
      <Text style={styles.subtitle}>
        In Teilprojekt 5.x bauen wir hier die echte Leaderfassung (inkl. Formular, QR-Scan, Visitenkarte).
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test-API-Call</Text>
        <Text style={styles.sectionText}>
          Dieser Button ruft einen Backend-Endpoint auf, um die Verbindung zur
          LeadRadar-API zu testen.
        </Text>

        <Button
          title={loading ? 'Lade...' : 'Test-API-Call ausführen'}
          onPress={handleTestApiCall}
          disabled={loading}
        />

        {error && <Text style={styles.error}>Fehler: {error}</Text>}
        {apiResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{apiResult}</Text>
          </View>
        )}
      </View>
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
  section: {
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionText: {
    fontSize: 13,
    color: '#666666',
  },
  error: {
    marginTop: 8,
    color: '#cc0000',
  },
  resultBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fafafa',
  },
  resultText: {
    fontSize: 12,
    color: '#333333',
  },
});
