// mobile/src/screens/forms/FormsOverviewScreen.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';

type DummyForm = {
  id: string;
  name: string;
  description: string;
};

const DUMMY_FORMS: DummyForm[] = [
  {
    id: '1',
    name: 'Standard-Leadformular',
    description: 'Name, Firma, E-Mail, Telefon',
  },
  {
    id: '2',
    name: 'VIP-Leads',
    description: 'Name, Funktion, Projektinteresse, Budget',
  },
];

export default function FormsOverviewScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Formulare</Text>
      <Text style={styles.subtitle}>
        Placeholder-Anzeige – echtes Form-Rendering kommt in einem eigenen
        Teilprojekt.
      </Text>

      <FlatList
        data={DUMMY_FORMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.formName}>{item.name}</Text>
            <Text style={styles.formDesc}>{item.description}</Text>
          </View>
        )}
      />
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
  list: {
    paddingTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  formName: {
    fontSize: 16,
    fontWeight: '600',
  },
  formDesc: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
  },
});
