import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Session verification error:', err);
          if (err.response?.status === 401 || err.response?.status === 403) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password }, { encrypt: true });
      if (res.data.success) {
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed.' };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : null) ||
        'Server connection error. Please verify credentials or network.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role_name === 'super_admin') return true;
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes('*') || user.permissions.includes(permission);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
