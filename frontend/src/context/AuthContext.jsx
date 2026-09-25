import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate user from token on mount
  useEffect(() => {
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (data.success) setUser(data.data);
        else localStorage.removeItem('codexa_token');
      })
      .catch(() => localStorage.removeItem('codexa_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!data.success) throw new Error(data.error?.message || 'Login failed');
    localStorage.setItem('codexa_token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    if (!data.success) throw new Error(data.error?.message || 'Registration failed');
    localStorage.setItem('codexa_token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('codexa_token');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (name) => {
    const { data } = await api.patch('/auth/profile', { name });
    if (!data.success) throw new Error(data.error?.message || 'Profile update failed');
    setUser(data.data);
    return data.data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await api.put('/auth/password', { currentPassword, newPassword });
    if (!data.success) throw new Error(data.error?.message || 'Password change failed');
    return true;
  }, []);

  const deleteAccount = useCallback(async () => {
    const { data } = await api.delete('/auth/account');
    if (!data.success) throw new Error(data.error?.message || 'Account deletion failed');
    localStorage.removeItem('codexa_token');
    setUser(null);
    return true;
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthenticated: Boolean(user),
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
    }),
    [user, loading, login, register, logout, updateProfile, changePassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
