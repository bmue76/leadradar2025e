# Teilprojekt 5.1 – Mobile Basis: Expo Setup & Navigation

Datum: 2025-11-28

## Ziel

Aufbau der Basis für die LeadRadar Mobile-App mit Expo (iOS-first),
React Navigation und einfachen Placeholder-Screens. Fokus liegt auf
Projektstruktur und Navigations-Skelett, nicht auf fertiger Business-Logik.

## Struktur

- `mobile/` – neues Expo-Projekt (TypeScript)
  - `App.tsx` – Einstieg, lädt `NavigationContainer` + `RootNavigator`
  - `src/navigation/`
    - `RootNavigator.tsx` – Auth vs. App Tabs
    - `AuthStack.tsx` – Dummy-Login
    - `AppTabs.tsx` – Bottom-Tab-Navigation (Events, Forms, Lead, Settings)
  - `src/screens/`
    - `auth/LoginScreen.tsx`
    - `events/EventsOverviewScreen.tsx`
    - `forms/FormsOverviewScreen.tsx`
    - `leads/LeadCapturePlaceholderScreen.tsx`
    - `settings/SettingsScreen.tsx`
  - `src/components/common/ScreenContainer.tsx`
  - `src/services/apiClient.ts` – einfacher API-Client (iOS-first)

## Setup-Schritte

Ausgeführt im Repo-Root (`C:\dev\leadradar2025e`):

```bash
npx create-expo-app mobile --template expo-template-blank-typescript

cd mobile
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
