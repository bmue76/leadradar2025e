// src/screens/leads/LeadScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import LeadCaptureScreen from './LeadCaptureScreen';

// --- Navigation-Paramliste für den Lead-Stack ---

export type LeadStackParamList = {
  LeadSelection: undefined;
  LeadCapture: {
    formId: number;
    formName: string;
  };
};

const Stack = createNativeStackNavigator<LeadStackParamList>();

// --- Typen für Formular-Liste ---

type FormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type FormListItem = {
  id: number;
  name: string;
  eventId: number | null;
  eventName?: string | null;
  status: FormStatus;
};

type FormsResponse = {
  forms: FormListItem[];
};

type LeadSelectionScreenProps = NativeStackScreenProps<
  LeadStackParamList,
  'LeadSelection'
>;

// --- Screen: Formular-Auswahl für die Lead-Erfassung ---

function LeadSelectionScreen({ navigation }: LeadSelectionScreenProps) {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSelectedFormId, setLastSelectedFormId] = useState<number | null>(
    null,
  );

  const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.1.111:3000';

  const loadForms = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/admin/forms`);

      if (!res.ok) {
        throw new Error(
          `Fehler beim Laden der Formulare (Status ${res.status})`,
        );
      }

      const data: FormsResponse = await res.json();

      // Nur aktive Formulare anzeigen
      const activeForms = data.forms.filter((form) => form.status === 'ACTIVE');
      setForms(activeForms);
    } catch (err) {
      console.error('Fehler beim Laden der Formulare', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unbekannter Fehler beim Laden der Formulare',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadForms();
  };

  const handleSelectForm = (form: FormListItem) => {
    setLastSelectedFormId(form.id);

    navigation.navigate('LeadCapture', {
      formId: form.id,
      formName: form.name,
    });
  };

  if (loading && !refreshing && forms.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.infoText}>Formulare werden geladen …</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadForms}>
          <Text style={styles.primaryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && forms.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>
          Es sind aktuell keine aktiven Formulare verfügbar.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Formular für Lead-Erfassung wählen</Text>
      <Text style={styles.subheading}>
        Tippe ein Formular an, um die Lead-Erfassung zu starten.
      </Text>

      <FlatList
        data={forms}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => {
          const isLastSelected = item.id === lastSelectedFormId;

          return (
            <TouchableOpacity
              style={[
                styles.formItem,
                isLastSelected && styles.formItemSelected,
              ]}
              onPress={() => handleSelectForm(item)}
            >
              <View style={styles.formItemHeader}>
                <Text style={styles.formName}>{item.name}</Text>
                {isLastSelected && (
                  <Text style={styles.badge}>Zuletzt verwendet</Text>
                )}
              </View>

              {item.eventName ? (
                <Text style={styles.formMeta}>Event: {item.eventName}</Text>
              ) : (
                <Text style={styles.formMeta}>Kein Event zugeordnet</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// --- Export: LeadScreen als Container für den Lead-Stack ---
// Dieser Screen ist im Tab-Navigator als "Lead"-Tab eingehängt.

export default function LeadScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LeadSelection"
        component={LeadSelectionScreen}
        options={{ title: 'Lead-Erfassung' }}
      />
      <Stack.Screen
        name="LeadCapture"
        component={LeadCaptureScreen}
        options={({ route }) => ({
          title: route.params.formName || 'Lead erfassen',
        })}
      />
    </Stack.Navigator>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#c00',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  formItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  formItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  formItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formName: {
    fontSize: 16,
    fontWeight: '500',
  },
  formMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  badge: {
    fontSize: 11,
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
