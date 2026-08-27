import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = ({
  value = '',
  onChange,
  placeholder = 'Cari...',
  debounceMs = 350,
  className = '',
}) => {
  const [innerValue, setInnerValue] = useState(value);

  // Sync when prop changes externally
  useEffect(() => {
    setInnerValue(value);
  }, [value]);

  // Debounced trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      if (innerValue !== value) {
        onChange(innerValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [innerValue, debounceMs, onChange, value]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={innerValue}
        onChange={(e) => setInnerValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
      />
      {innerValue && (
        <button
          type="button"
          onClick={() => {
            setInnerValue('');
            onChange('');
          }}
          className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
