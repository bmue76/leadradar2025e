// mobile/src/navigation/RootNavigator.tsx
import React, { useState } from 'react';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';

export default function RootNavigator() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  const handleLogin = () => {
    // TODO: Echte Auth-Logik in späterem Teilprojekt
    setIsSignedIn(true);
  };

  const handleLogout = () => {
    setIsSignedIn(false);
  };

  if (!isSignedIn) {
    return <AuthStack onLogin={handleLogin} />;
  }

  return <AppTabs onLogout={handleLogout} />;
}
