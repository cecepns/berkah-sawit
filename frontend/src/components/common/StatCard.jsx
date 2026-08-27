import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'emerald', // emerald, blue, amber, purple, rose
  badge,
}) => {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-950/30',
      glow: 'group-hover:shadow-emerald-500/10',
    },
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-950/30',
      glow: 'group-hover:shadow-blue-500/10',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-950/30',
      glow: 'group-hover:shadow-amber-500/10',
    },
    purple: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-950/30',
      glow: 'group-hover:shadow-purple-500/10',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
      border: 'border-rose-100 dark:border-rose-950/30',
      glow: 'group-hover:shadow-rose-500/10',
    },
  };

  const style = colorStyles[color] || colorStyles.emerald;

  return (
    <div className={`group relative bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 ${style.glow}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg} transition-transform group-hover:scale-110`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {badge && (
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{badge}</span>
        </div>
      )}
    </div>
  );
};
