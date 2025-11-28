// src/components/lead/LeadFieldRenderer.tsx

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { FormField, LeadValue, FieldType } from '../../types/forms';

export interface LeadFieldRendererProps {
  field: FormField;
  value: LeadValue;
  error?: string;
  onChange: (value: LeadValue) => void;
}

export const LeadFieldRenderer: React.FC<LeadFieldRendererProps> = ({
  field,
  value,
  error,
  onChange,
}) => {
  const normalizedType = String(field.type || 'TEXT').toUpperCase() as FieldType | string;
  const label = field.label || field.key;

  const renderTextInput = (extraProps: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <TextInput
      style={[styles.input, extraProps.multiline && styles.textArea]}
      placeholder={field.placeholder || ''}
      value={typeof value === 'string' ? value : ''}
      onChangeText={(text) => onChange(text)}
      {...extraProps}
    />
  );

  const renderSingleSelect = () => {
    const options = field.options ?? [];
    return (
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionChip,
                selected && styles.optionChipSelected,
              ]}
              onPress={() => onChange(option)}
            >
              <Text style={styles.optionChipText}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMultiSelect = () => {
    const options = field.options ?? [];
    const current = Array.isArray(value) ? value : [];

    const toggleOption = (option: string) => {
      if (current.includes(option)) {
        onChange(current.filter((o) => o !== option));
      } else {
        onChange([...current, option]);
      }
    };

    return (
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const selected = current.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionChip,
                selected && styles.optionChipSelected,
              ]}
              onPress={() => toggleOption(option)}
            >
              <Text style={styles.optionChipText}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderBoolean = () => {
    const boolValue =
      typeof value === 'boolean' ? value : false;

    return (
      <View style={styles.switchRow}>
        <Switch
          value={boolValue}
          onValueChange={(next) => onChange(next)}
        />
      </View>
    );
  };

  const renderInputByType = () => {
    switch (normalizedType) {
      case 'TEXT':
        return renderTextInput();

      case 'EMAIL':
        return renderTextInput({
          keyboardType: 'email-address',
          autoCapitalize: 'none',
        });

      case 'PHONE':
        return renderTextInput({ keyboardType: 'phone-pad' });

      case 'NUMBER':
        return renderTextInput({ keyboardType: 'numeric' });

      case 'TEXTAREA':
        return renderTextInput({
          multiline: true,
          numberOfLines: 4,
          textAlignVertical: 'top',
        });

      case 'DATE':
      case 'DATETIME':
        return renderTextInput({
          placeholder:
            field.placeholder ||
            (normalizedType === 'DATE'
              ? 'z.B. 2025-11-28'
              : 'z.B. 2025-11-28 14:30'),
        });

      case 'SINGLE_SELECT':
        return renderSingleSelect();

      case 'MULTI_SELECT':
        return renderMultiSelect();

      case 'BOOLEAN':
        return renderBoolean();

      default:
        // Fallback: normaler TextInput
        return renderTextInput();
    }
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {field.required ? ' *' : ''}
      </Text>
      {renderInputByType()}
      {field.helpText ? (
        <Text style={styles.helpText}>{field.helpText}</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#c00',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as any,
  optionChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f7f7f7',
  },
  optionChipSelected: {
    backgroundColor: '#007AFF22',
    borderColor: '#007AFF',
  },
  optionChipText: {
    fontSize: 13,
  },
  switchRow: {
    paddingVertical: 4,
  },
});
