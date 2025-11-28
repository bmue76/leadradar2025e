// mobile/src/navigation/AppTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import EventsOverviewScreen from '../screens/events/EventsOverviewScreen';
import FormsOverviewScreen from '../screens/forms/FormsOverviewScreen';
import LeadCapturePlaceholderScreen from '../screens/leads/LeadCapturePlaceholderScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

export type AppTabParamList = {
  Events: undefined;
  Forms: undefined;
  Lead: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export type AppTabsProps = {
  onLogout: () => void;
};

export default function AppTabs({ onLogout }: AppTabsProps) {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Events"
        component={EventsOverviewScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen
        name="Forms"
        component={FormsOverviewScreen}
        options={{ title: 'Formulare' }}
      />
      <Tab.Screen
        name="Lead"
        component={LeadCapturePlaceholderScreen}
        options={{ title: 'Lead' }}
      />
      <Tab.Screen name="Settings">
        {() => <SettingsScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
