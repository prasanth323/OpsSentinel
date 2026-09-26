import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Create dedicated API axios instance
export const api = axios.create({
  baseURL: '/api'
});

export function AuthProvider({ children }) {
  // Initialize synchronously from localStorage to prevent render flash/blank screens
  const getInitialToken = () => {
    try {
      return localStorage.getItem('ops_sentinel_token') || null;
    } catch (e) {
      return null;
    }
  };

  const getInitialUser = () => {
    try {
      const stored = localStorage.getItem('ops_sentinel_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  };

  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false);

  // Synchronize Axios default headers with active token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        localStorage.setItem('ops_sentinel_token', token);
      } catch (e) {}
      
      // Background token verification (Non-destructive: will not wipe user session on network glitch)
      api.get('/auth/me')
        .then(res => {
          if (res.data?.success && res.data.user) {
            setUser(res.data.user);
            try {
              localStorage.setItem('ops_sentinel_user', JSON.stringify(res.data.user));
            } catch (e) {}
          }
        })
        .catch(err => {
          // Only log out if the server explicitly rejects the token as unauthorized (401/403)
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            console.warn('Session expired (401/403), clearing credentials.');
            logout();
          } else {
            console.warn('Backend background check skipped (offline/serverless cold-start). Preserving active session.');
          }
        });
    } else {
      delete api.defaults.headers.common['Authorization'];
      try {
        localStorage.removeItem('ops_sentinel_token');
        localStorage.removeItem('ops_sentinel_user');
      } catch (e) {}
      setUser(null);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        const receivedToken = response.data.token;
        const receivedUser = response.data.user;
        
        api.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
        try {
          localStorage.setItem('ops_sentinel_token', receivedToken);
          localStorage.setItem('ops_sentinel_user', JSON.stringify(receivedUser));
        } catch (e) {}
        
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, error: response.data?.error || 'Login failed' };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Login failed'
      };
    }
  };

  const register = async (username, email, password, role) => {
    try {
      const response = await api.post('/auth/register', { username, email, password, role });
      if (response.data && response.data.success) {
        const receivedToken = response.data.token;
        const receivedUser = response.data.user;

        api.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
        try {
          localStorage.setItem('ops_sentinel_token', receivedToken);
          localStorage.setItem('ops_sentinel_user', JSON.stringify(receivedUser));
        } catch (e) {}

        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, error: response.data?.error || 'Registration failed' };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('ops_sentinel_token');
      localStorage.removeItem('ops_sentinel_user');
    } catch (e) {}
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
