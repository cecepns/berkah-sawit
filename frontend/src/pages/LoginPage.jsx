import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const { login, loading } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Username dan password wajib diisi');
      return;
    }
    const success = await login(username, password);
    if (success) {
      navigate('/timbang');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-zinc-900 to-black text-white flex flex-col justify-center items-center p-4">
      {/* Card Container */}
      <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleUp">
        {/* Branding Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-emerald-500/20">
            {settings.ram_code || 'BST'}
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-2">
            {settings.ram_name || 'RAM BERKAH SAWIT TUA'}
          </h1>
          <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">
            {settings.location_line1 || 'TANJUNG ENIM'} - {settings.location_line2 || 'MUARA ENIM'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-4 py-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            <span>{loading ? 'MEMVERIFIKASI...' : 'MASUK KE APLIKASI'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-zinc-600 mt-6 text-center font-medium">
        RAM Berkah Sawit Tua - PWA Offline Ready
      </p>
    </div>
  );
};
