import React from 'react';
import { NavLink } from 'react-router-dom';
import { Scale, History, Users, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BottomNavigation = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Timbang', path: '/timbang', icon: Scale },
    { name: 'Riwayat', path: '/riwayat', icon: History },
    { name: 'Supplier', path: '/supplier', icon: Users },
    { name: 'Laporan', path: '/laporan', icon: BarChart3 },
    ...(isAdmin ? [{ name: 'Pengaturan', path: '/pengaturan', icon: Settings }] : []),
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 px-2 py-1.5 shadow-lg safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 relative ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-extrabold scale-105'
                  : 'text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                <span className="text-[10px] mt-1">{item.name}</span>
                {isActive && (
                  <span className="absolute -top-1 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
