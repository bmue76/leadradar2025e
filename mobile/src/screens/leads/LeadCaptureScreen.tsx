// src/screens/leads/LeadCaptureScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Button,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LeadForm, LeadValue } from '../../types/forms';
import {
  fetchLeadForm,
  submitLead,
  CreateLeadPayload,
} from '../../api/leads';
import { LeadFieldRenderer } from '../../components/lead/LeadFieldRenderer';

type LeadCaptureRouteParams = {
  formId: number;
  formName?: string;
};

type ValueMap = Record<string, LeadValue>;
type ErrorMap = Record<string, string | undefined>;

const LeadCaptureScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { formId, formName } = route.params as LeadCaptureRouteParams;

  const [form, setForm] = useState<LeadForm | null>(null);
  const [values, setValues] = useState<ValueMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Titel im Header setzen
  useEffect(() => {
    navigation.setOptions({
      title: formName || 'Lead erfassen',
    });
  }, [navigation, formName]);

  // Formular laden
  useEffect(() => {
    let cancelled = false;

    const loadForm = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const loadedForm = await fetchLeadForm(formId);
        if (cancelled) return;

        setForm(loadedForm);
        setValues(initValuesFromForm(loadedForm));
        setErrors({});
      } catch (err: any) {
        console.error('[LeadCapture] Fehler beim Laden des Formulars', err);
        if (cancelled) return;
        setLoadError(
          err?.message || 'Formular konnte nicht geladen werden.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadForm();

    return () => {
      cancelled = true;
    };
  }, [formId]);

  const initValuesFromForm = (f: LeadForm): ValueMap => {
    const initial: ValueMap = {};

    f.fields.forEach((field) => {
      const type = String(field.type || 'TEXT').toUpperCase();
      const key = field.key;

      switch (type) {
        case 'BOOLEAN':
          initial[key] = false;
          break;
        case 'MULTI_SELECT':
          initial[key] = [];
          break;
        default:
          initial[key] = '';
          break;
      }
    });

    return initial;
  };

  const handleChangeFieldValue = useCallback(
    (fieldKey: string, value: LeadValue) => {
      setValues((prev) => ({
        ...prev,
        [fieldKey]: value,
      }));
      setErrors((prev) => ({
        ...prev,
        [fieldKey]: undefined,
      }));
    },
    [],
  );

  const validateForm = (): boolean => {
    if (!form) return false;

    const newErrors: ErrorMap = {};

    form.fields.forEach((field) => {
      const key = field.key;
      const rawValue = values[key];
      const type = String(field.type || 'TEXT').toUpperCase();
      const isRequired = !!field.required;

      // Required-Check
      if (isRequired) {
        const isEmpty =
          rawValue === undefined ||
          rawValue === null ||
          (typeof rawValue === 'string' &&
            rawValue.trim().length === 0) ||
          (Array.isArray(rawValue) && rawValue.length === 0);

        if (isEmpty) {
          newErrors[key] = 'Pflichtfeld, bitte ausfüllen.';
          return;
        }
      }

      // Email-Check
      if (
        type === 'EMAIL' &&
        typeof rawValue === 'string' &&
        rawValue.trim().length > 0
      ) {
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(rawValue.trim())) {
          newErrors[key] =
            'Bitte eine gültige E-Mail-Adresse eingeben.';
        }
      }

      // Number-Check
      if (
        type === 'NUMBER' &&
        typeof rawValue === 'string' &&
        rawValue.trim().length > 0
      ) {
        const asNumber = Number(rawValue.trim());
        if (Number.isNaN(asNumber)) {
          newErrors[key] = 'Bitte eine Zahl eingeben.';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (): CreateLeadPayload => {
    if (!form) {
      throw new Error('Kein Formular geladen.');
    }

    const valuesArray = form.fields.map((field) => {
      const key = field.key;
      let rawValue = values[key];

      // Falls nichts gesetzt → null
      if (rawValue === undefined) {
        rawValue = null;
      }

      return {
        fieldKey: key,
        value: rawValue,
      };
    });

    return { values: valuesArray };
  };

  const handleSubmit = async () => {
    if (!form) return;

    const isValid = validateForm();
    if (!isValid) {
      // Fehler werden pro Feld angezeigt; ein globaler Hinweis ist optional
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildPayload();
      const response = await submitLead(form.id, payload);

      if (!response.success) {
        throw new Error(
          response.message || 'Lead konnte nicht gespeichert werden.',
        );
      }

      Alert.alert(
        'Lead gespeichert',
        'Der Lead wurde erfolgreich gespeichert.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Formular zurücksetzen für nächsten Lead
              setValues(initValuesFromForm(form));
              setErrors({});
            },
          },
        ],
      );
    } catch (err: any) {
      console.error('[LeadCapture] Fehler beim Speichern des Leads', err);
      const msg =
        err?.message || 'Lead konnte nicht gespeichert werden.';
      setSubmitError(msg);
      Alert.alert('Fehler', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    // Einfach den Effekt neu triggern
    setForm(null);
    setValues({});
    setErrors({});
    setLoadError(null);
    setLoading(true);

    // useEffect mit formId lädt dann neu
    // (wir setzen loading=true, um sofort den Spinner zu zeigen)
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.centeredText}>
          Formular wird geladen...
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{loadError}</Text>
        <View style={{ marginTop: 12 }}>
          <Button title="Erneut versuchen" onPress={handleRetry} />
        </View>
      </View>
    );
  }

  if (!form) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Kein Formular verfügbar.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {form.description ? (
          <Text style={styles.description}>{form.description}</Text>
        ) : null}

        {form.fields && form.fields.length > 0 ? (
          form.fields.map((field) => (
            <LeadFieldRenderer
              key={field.id ?? field.key}
              field={field}
              value={values[field.key]}
              error={errors[field.key]}
              onChange={(val) =>
                handleChangeFieldValue(field.key, val)
              }
            />
          ))
        ) : (
          <Text>
            Dieses Formular enthält noch keine Felder.
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {submitError ? (
          <Text style={styles.submitErrorText}>
            {submitError}
          </Text>
        ) : null}
        <Button
          title={submitting ? 'Speichern...' : 'Lead speichern'}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </View>
    </View>
  );
};

export default LeadCaptureScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  description: {
    marginBottom: 16,
    fontSize: 14,
    color: '#444',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  submitErrorText: {
    color: '#c00',
    marginBottom: 8,
    fontSize: 13,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  centeredText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    color: '#c00',
    textAlign: 'center',
  },
});
