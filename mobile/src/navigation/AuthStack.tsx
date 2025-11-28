// mobile/src/navigation/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';

export type AuthStackParamList = {
  Login: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export type AuthStackProps = {
  onLogin: () => void;
};

export default function AuthStack({ onLogin }: AuthStackProps) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        options={{ title: 'LeadRadar Login' }}
      >
        {() => <LoginScreen onLogin={onLogin} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
