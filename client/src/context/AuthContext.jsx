import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Create dedicated API axios instance
export const api = axios.create({
  baseURL: '/api'
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ops_sentinel_token') || null);
  const [loading, setLoading] = useState(true);

  // Synchronize Axios default headers with active token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('ops_sentinel_token', token);
      
      // Fetch or restore profile
      const storedUser = localStorage.getItem('ops_sentinel_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }

      // Validate token with backend
      api.get('/auth/me')
        .then(res => {
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('ops_sentinel_user', JSON.stringify(res.data.user));
          }
        })
        .catch(err => {
          console.warn('Session expired or invalid, logging out.');
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('ops_sentinel_token');
      localStorage.removeItem('ops_sentinel_user');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('ops_sentinel_token', response.data.token);
        localStorage.setItem('ops_sentinel_user', JSON.stringify(response.data.user));
        return { success: true };
      }
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
      if (response.data.success) {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('ops_sentinel_token', response.data.token);
        localStorage.setItem('ops_sentinel_user', JSON.stringify(response.data.user));
        return { success: true };
      }
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
    localStorage.removeItem('ops_sentinel_token');
    localStorage.removeItem('ops_sentinel_user');
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
