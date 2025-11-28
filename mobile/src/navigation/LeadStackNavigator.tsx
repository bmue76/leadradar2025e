// src/navigation/LeadStackNavigator.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LeadSelectionScreen from '../screens/leads/LeadSelectionScreen';
import LeadCaptureScreen from '../screens/leads/LeadCaptureScreen';
import LeadListScreen from '../screens/leads/LeadListScreen';
import LeadDetailScreen from '../screens/leads/LeadDetailScreen';

import { LeadWithFieldValuesDto } from '../types/leads';

export type LeadStackParamList = {
  LeadSelection: undefined;
  LeadCapture: {
    formId: number;
    formName: string;
  };
  LeadList: {
    formId: number;
    formName: string;
  };
  LeadDetail: {
    formName: string;
    lead: LeadWithFieldValuesDto;
  };
};

const Stack = createNativeStackNavigator<LeadStackParamList>();

export const LeadStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LeadSelection"
        component={LeadSelectionScreen}
        options={{ title: 'Formular wählen' }}
      />
      <Stack.Screen
        name="LeadCapture"
        component={LeadCaptureScreen}
        options={({ route }) => ({
          title: route.params?.formName ?? 'Lead erfassen',
        })}
      />
      <Stack.Screen
        name="LeadList"
        component={LeadListScreen}
        options={({ route }) => ({
          title: route.params?.formName
            ? `Leads – ${route.params.formName}`
            : 'Leads',
        })}
      />
      <Stack.Screen
        name="LeadDetail"
        component={LeadDetailScreen}
        options={{ title: 'Lead-Details' }}
      />
    </Stack.Navigator>
  );
};

export default LeadStackNavigator;
