// src/screens/leads/LeadCaptureScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LeadStackParamList } from './LeadScreen';

// --- Typen für Formular-Details ---

type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN';

type FormField = {
  id: number;
  key: string;
  label: string;
  type: FieldType | string;
  order: number;
  options?: string[] | null;
};

type LeadForm = {
  id: number;
  name: string;
  eventId: number | null;
  eventName?: string | null;
  fields: FormField[];
};

type FormDetailResponse = {
  form: LeadForm;
};

// --- Navigation-Props ---

type Props = NativeStackScreenProps<LeadStackParamList, 'LeadCapture'>;

// --- Component ---

export default function LeadCaptureScreen({ route }: Props) {
  const { formId, formName } = route.params;

  const [form, setForm] = useState<LeadForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

  useEffect(() => {
    const loadForm = async () => {
      try {
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/admin/forms/${formId}`);

        if (!res.ok) {
          throw new Error(
            `Formular konnte nicht geladen werden (Status ${res.status})`,
          );
        }

        const data: FormDetailResponse = await res.json();
        setForm(data.form);
      } catch (err) {
        console.error('Fehler beim Laden des Formulars', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Unbekannter Fehler beim Laden des Formulars',
        );
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [API_BASE_URL, formId]);

  const handleSaveLead = () => {
    // ⚠️ Platzhalter – hier wird später die echte Lead-Speicherlogik eingebaut.
    // Geplante API-Struktur (Vorschlag):
    //
    // POST /api/admin/forms/:id/leads
    // Body:
    // {
    //   "formId": number,
    //   "values": [
    //     { "fieldKey": "company", "value": "ACME AG" },
    //     { "fieldKey": "email", "value": "john@acme.ch" },
    //     ...
    //   ]
    // }
    //
    // Alternative: eigener Mobile-Endpoint /api/mobile/forms/:id/leads
    //
    Alert.alert(
      'Lead speichern',
      'Die API-Integration zum Speichern des Leads (z. B. POST /api/admin/forms/:id/leads) folgt in einem späteren Teilprojekt.',
    );
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);

    const reload = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/forms/${formId}`);

        if (!res.ok) {
          throw new Error(
            `Formular konnte nicht geladen werden (Status ${res.status})`,
          );
        }

        const data: FormDetailResponse = await res.json();
        setForm(data.form);
      } catch (err) {
        console.error('Fehler beim Laden des Formulars', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Unbekannter Fehler beim Laden des Formulars',
        );
      } finally {
        setLoading(false);
      }
    };

    void reload();
  };

  if (loading && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.infoText}>Formular wird geladen …</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Erneut versuchen" onPress={handleRetry} />
      </View>
    );
  }

  if (!form) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Formulardaten konnten nicht geladen werden.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.formTitle}>{form.name || formName}</Text>
        {form.eventName ? (
          <Text style={styles.formMeta}>Event: {form.eventName}</Text>
        ) : (
          <Text style={styles.formMeta}>Kein Event zugeordnet</Text>
        )}
        <Text style={styles.formMeta}>
          Felder: {form.fields?.length ?? 0}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Formularfelder (Preview)</Text>
        <Text style={styles.sectionHint}>
          In einem späteren Teilprojekt werden diese Felder als interaktive
          Eingabeelemente (Textfelder, Auswahl, Switches etc.) gerendert.
        </Text>

        {form.fields
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((field) => (
            <View key={field.id} style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldMeta}>
                Typ: {field.type}{' '}
                {field.options && field.options.length > 0
                  ? `(${field.options.length} Optionen)`
                  : ''}
              </Text>
            </View>
          ))}
      </View>

      <View style={styles.section}>
        <Button title="Lead speichern (Placeholder)" onPress={handleSaveLead} />
      </View>
    </ScrollView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  errorText: {
    marginBottom: 12,
    fontSize: 14,
    color: '#c00',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  formMeta: {
    fontSize: 13,
    color: '#666',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  fieldItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldMeta: {
    fontSize: 12,
    color: '#666',
  },
});
