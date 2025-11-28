// src/screens/leads/LeadCaptureScreen.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LeadStackParamList } from '../../navigation/LeadStackNavigator';
import {
  CreateLeadPayload,
  fetchLeadForm,
  RuntimeForm,
  RuntimeFormField,
  submitLead,
} from '../../api/leads';

type Props = NativeStackScreenProps<LeadStackParamList, 'LeadCapture'>;

type FieldValueMap = Record<number, string>;
type FieldErrorMap = Record<number, string | undefined>;

export const LeadCaptureScreen: React.FC<Props> = ({ route, navigation }) => {
  const { formId, formName } = route.params;

  const [form, setForm] = useState<RuntimeForm | null>(null);
  const [loadingForm, setLoadingForm] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Basisfelder
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamische Formularfelder
  const [fieldValues, setFieldValues] = useState<FieldValueMap>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});

  const [submitting, setSubmitting] = useState<boolean>(false);

  const sortedFields: RuntimeFormField[] = useMemo(() => {
    if (!form?.fields) return [];
    return [...form.fields].sort((a, b) => {
      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      if (ao !== bo) return ao - bo;
      return a.id - b.id;
    });
  }, [form]);

  const loadForm = useCallback(async () => {
    try {
      setLoadingForm(true);
      setLoadingError(null);
      const data = await fetchLeadForm(formId);
      setForm(data);
    } catch (err) {
      console.error('[LeadCaptureScreen] loadForm error', err);
      setLoadingError(
        err instanceof Error
          ? err.message
          : 'Formular konnte nicht geladen werden.'
      );
    } finally {
      setLoadingForm(false);
    }
  }, [formId]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const handleChangeFieldValue = (fieldId: number, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [fieldId]: undefined,
    }));
  };

  const toggleMultiSelectValue = (fieldId: number, option: string) => {
    const current = fieldValues[fieldId] ?? '';
    const parts = current
      .split(';')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const exists = parts.includes(option);
    const nextParts = exists
      ? parts.filter((p) => p !== option)
      : [...parts, option];

    handleChangeFieldValue(fieldId, nextParts.join('; '));
  };

  const validate = (): boolean => {
    const newErrors: FieldErrorMap = {};

    if (!form) return false;

    // Dynamische Felder
    for (const field of sortedFields) {
      const value = (fieldValues[field.id] ?? '').trim();
      const required = field.required ?? false;

      if (required && !value) {
        newErrors[field.id] = 'Pflichtfeld';
      }
    }

    setFieldErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!form) return;

    if (!validate()) {
      Alert.alert(
        'Eingabe unvollständig',
        'Bitte fülle alle Pflichtfelder aus.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload: CreateLeadPayload = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
        values: sortedFields.map((field) => ({
          fieldId: field.id,
          value: fieldValues[field.id] ?? '',
        })),
      };

      // 🔑 WICHTIG: formId aus Route-Param verwenden
      await submitLead(formId, payload);

      Alert.alert('Erfolg', 'Lead wurde gespeichert.', [
        {
          text: 'OK',
          onPress: () => {
            // Formular leeren, aber auf der Seite bleiben
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setCompany('');
            setNotes('');
            setFieldValues({});
            setFieldErrors({});
          },
        },
      ]);
    } catch (err) {
      console.error('[LeadCapture] Fehler beim Speichern des Leads', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Fehler beim Speichern des Leads.';
      Alert.alert('Fehler', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldInput = (field: RuntimeFormField) => {
    const value = fieldValues[field.id] ?? '';
    const error = fieldErrors[field.id];
    const options = field.options ?? [];

    const commonLabel = (
      <Text style={styles.fieldLabel}>
        {field.label}{' '}
        {field.required ? <Text style={styles.requiredMark}>*</Text> : null}
      </Text>
    );

    switch (field.type) {
      case 'TEXTAREA':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={(text) => handleChangeFieldValue(field.id, text)}
              multiline
              numberOfLines={4}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'EMAIL':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => handleChangeFieldValue(field.id, text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'NUMBER':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => handleChangeFieldValue(field.id, text)}
              keyboardType="numeric"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'PHONE':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => handleChangeFieldValue(field.id, text)}
              keyboardType="phone-pad"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'BOOLEAN': {
        const boolValue = value === 'true';
        return (
          <View key={field.id} style={styles.fieldContainerRow}>
            <Text style={styles.fieldLabelRow}>
              {field.label}{' '}
              {field.required ? (
                <Text style={styles.requiredMark}>*</Text>
              ) : null}
            </Text>
            <Switch
              value={boolValue}
              onValueChange={(v) =>
                handleChangeFieldValue(field.id, v ? 'true' : 'false')
              }
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );
      }

      case 'SINGLE_SELECT':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {options.map((opt) => {
                const isSelected = value === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => handleChangeFieldValue(field.id, opt)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'MULTI_SELECT':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {options.map((opt) => {
                const current = value
                  .split(';')
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0);
                const isSelected = current.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => toggleMultiSelectValue(field.id, opt)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Anzeige der gewählten Werte als Text */}
            {value ? (
              <Text style={styles.selectedValuesText}>{value}</Text>
            ) : null}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'DATE':
      case 'DATETIME':
      default:
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => handleChangeFieldValue(field.id, text)}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );
    }
  };

  if (loadingForm) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.infoText}>Formular wird geladen…</Text>
      </View>
    );
  }

  if (loadingError || !form) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {loadingError ?? 'Formular konnte nicht geladen werden.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadForm}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Optional: Titel/Formularname */}
        <View style={styles.header}>
          <Text style={styles.formTitle}>
            {formName || form.name || 'Lead erfassen'}
          </Text>
        </View>

        {/* Stammdaten */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stammdaten</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Vorname</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Nachname</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>E-Mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Firma</Text>
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Notizen</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Dynamische Formularfelder */}
        {sortedFields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Formularfelder</Text>
            {sortedFields.map((field) => renderFieldInput(field))}
          </View>
        )}

        {/* Submit-Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Wird gespeichert…' : 'Lead speichern'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
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
  header: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldContainerRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  fieldLabelRow: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  requiredMark: {
    color: '#c00',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedValuesText: {
    marginTop: 4,
    fontSize: 12,
    color: '#555',
  },
  submitContainer: {
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default LeadCaptureScreen;
