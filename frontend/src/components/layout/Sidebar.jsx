import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Scale,
  History,
  Users,
  BarChart3,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Timbang', path: '/timbang', icon: Scale },
    { name: 'Riwayat', path: '/riwayat', icon: History },
    { name: 'Supplier', path: '/supplier', icon: Users },
    { name: 'Laporan', path: '/laporan', icon: BarChart3 },
    ...(isAdmin ? [{ name: 'Pengaturan', path: '/pengaturan', icon: Settings }] : []),
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Toggle button */}
      <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex justify-end">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav list */}
      <nav className="p-3 space-y-1.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/80 hover:text-gray-900 dark:hover:text-white'
              } ${isCollapsed ? 'justify-center px-2' : ''}`
            }
            title={item.name}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Footer Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-400 dark:text-zinc-500 text-center">
          <p className="font-semibold text-gray-600 dark:text-zinc-400">RAM Berkah Sawit Tua</p>
          <p className="text-[10px] mt-0.5">Sistem Timbang PWA v1.0</p>
        </div>
      )}
    </aside>
  );
};
