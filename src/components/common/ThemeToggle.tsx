'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('exammaster_theme') as 'light' | 'dark' | null;
    if (storedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('exammaster_theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('exammaster_theme', 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative w-14 h-7 bg-slate-200/90 dark:bg-slate-800/90 rounded-full p-0.5 transition-all duration-300 flex items-center justify-between border border-slate-300/80 dark:border-slate-700/80 shadow-inner focus:outline-none select-none group shrink-0"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      aria-label="Toggle theme"
    >
      {/* Sun Icon (Left Side) */}
      <span className="w-6 h-6 flex items-center justify-center text-amber-500 z-10 pl-0.5">
        <Sun className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-45" />
      </span>

      {/* Moon Icon (Right Side) */}
      <span className="w-6 h-6 flex items-center justify-center text-slate-400 dark:text-blue-400 z-10 pr-0.5">
        <Moon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-rotate-12" />
      </span>

      {/* Sliding Knob Bar */}
      <div
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md transform transition-transform duration-300 ease-out border border-slate-200/80 dark:border-slate-700/80 ${
          theme === 'dark' ? 'translate-x-[28px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
};
