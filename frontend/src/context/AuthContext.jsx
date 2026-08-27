import React, { createContext, useContext, useState } from 'react';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ram_sawit_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('ram_sawit_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await request.post(API_ENDPOINTS.AUTH.LOGIN, { username, password });
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('ram_sawit_token', res.token);
        localStorage.setItem('ram_sawit_user', JSON.stringify(res.user));
        toast.success(`Selamat datang, ${res.user.name}`);
        return true;
      }
      toast.error(res.message || 'Login gagal');
      return false;
    } catch (error) {
      // Fallback offline local login if backend is completely offline
      if (username === 'admin' && password === 'admin123') {
        const adminUser = { id: 1, name: 'Administrator RAM', username: 'admin', role: 'admin' };
        setUser(adminUser);
        setToken('offline_admin_token');
        localStorage.setItem('ram_sawit_token', 'offline_admin_token');
        localStorage.setItem('ram_sawit_user', JSON.stringify(adminUser));
        toast.success('Login Offline berhasil sebagai Admin');
        return true;
      } else if (username === 'operator' && password === 'operator123') {
        const opUser = { id: 2, name: 'Operator Timbang 1', username: 'operator', role: 'operator' };
        setUser(opUser);
        setToken('offline_op_token');
        localStorage.setItem('ram_sawit_token', 'offline_op_token');
        localStorage.setItem('ram_sawit_user', JSON.stringify(opUser));
        toast.success('Login Offline berhasil sebagai Operator');
        return true;
      }
      toast.error(error?.response?.data?.message || 'Username atau password salah');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ram_sawit_token');
    localStorage.removeItem('ram_sawit_user');
    toast.success('Berhasil keluar');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
