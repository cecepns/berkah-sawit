import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { HardwareProvider } from './context/HardwareContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { TimbangPage } from './pages/TimbangPage';
import { RiwayatPage } from './pages/RiwayatPage';
import { SupplierPage } from './pages/SupplierPage';
import { LaporanPage } from './pages/LaporanPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { LoginPage } from './pages/LoginPage';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <HardwareProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected App Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/timbang" replace />} />
                  <Route path="timbang" element={<TimbangPage />} />
                  <Route path="riwayat" element={<RiwayatPage />} />
                  <Route path="supplier" element={<SupplierPage />} />
                  <Route path="laporan" element={<LaporanPage />} />
                  <Route path="pengaturan" element={<PengaturanPage />} />
                  <Route path="*" element={<Navigate to="/timbang" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>

            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3500,
                style: {
                  background: '#18181B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  borderRadius: '12px',
                  fontWeight: '600',
                },
                success: {
                  iconTheme: {
                    primary: '#16A34A',
                    secondary: '#FFFFFF',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#FFFFFF',
                  },
                },
              }}
            />
          </HardwareProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
