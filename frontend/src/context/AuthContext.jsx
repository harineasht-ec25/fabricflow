import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Role helpers
  const isAdmin = user?.role === 'admin';
  const isManager = ['admin','production_manager'].includes(user?.role);
  const stageForRole = {
    cutting_operator: 'cutting',
    stitching_operator: 'stitching',
    button_operator: 'button_attachment',
    checking_operator: 'checking_trimming',
    ironing_operator: 'ironing',
    store_manager: 'finished_stock',
  };
  const userStage = stageForRole[user?.role] || null;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isManager, userStage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
