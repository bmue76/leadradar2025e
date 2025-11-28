// mobile/src/screens/auth/LoginScreen.tsx
import React from 'react';
import { StyleSheet, Text, TextInput, View, Button } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';

type LoginScreenProps = {
  onLogin: () => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const handleDummyLogin = () => {
    // TODO: Später echte Login-Logik (API-Call, Token, etc.)
    onLogin();
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.logoText}>LeadRadar</Text>
        <Text style={styles.subtitle}>
          Mobile Leaderfassung (Dummy-Login in 5.1)
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>E-Mail</Text>
        <TextInput
          style={styles.input}
          placeholder="demo@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Passwort</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Login (Dummy)" onPress={handleDummyLogin} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 24,
    marginBottom: 32,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 32,
  },
});
