import React, { createContext, useContext } from 'react';

// Lets any screen trigger a real sign-in/sign-out (flipping App.js's top-level
// isLoggedIn state) without needing a 'Login' or 'MainTabs' route in its own navigator.
export const AuthContext = createContext({ signIn: () => {}, signOut: async () => {} });

export function useAuth() {
  return useContext(AuthContext);
}
