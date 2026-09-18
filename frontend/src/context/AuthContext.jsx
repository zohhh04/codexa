import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Phase 1 placeholder auth store. Real JWT login lands in Phase 9.
// Holds shape stable so later phases only swap the implementation.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('codexa_user') || 'null');
    } catch {
      return null;
    }
  });

  const loginLocal = useCallback((name, email) => {
    // Local-only demo session until Phase 9 backend auth exists.
    const demoUser = { name, email, demo: true };
    localStorage.setItem('codexa_user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('codexa_token');
    localStorage.removeItem('codexa_user');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), loginLocal, logout }),
    [user, loginLocal, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
