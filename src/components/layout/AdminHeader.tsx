'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { ArrowLeft, Menu } from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  adminName?: string;
  onBack?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title = 'Analytics Engine',
  subtitle = "Real-time engagement and operational performance metrics.",
  adminName,
  onBack,
}) => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(adminName || 'Admin');

  useEffect(() => {
    try {
      const match = document.cookie.match(/admin_token=([^;]+)/);
      if (match) {
        const payloadBase64 = match[1].split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(atob(payloadBase64));
          if (decoded.name) {
            setDisplayName(decoded.name);
          }
        }
      }
    } catch (e) {}
  }, [adminName]);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/dashboard');
    }
  };

  const handleToggleSidebar = () => {
    window.dispatchEvent(new Event('toggleAdminSidebar'));
  };

  return (
    <header className="border-b border-slate-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md backdrop-saturate-150 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xl shadow-slate-300/60 dark:shadow-black/90 transition-all">
      <div className="flex items-center gap-3.5">
        {/* Mobile Hamburger Drawer Button */}
        <button
          onClick={handleToggleSidebar}
          type="button"
          className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Back Button */}
        <button
          onClick={handleBackClick}
          type="button"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors group shadow-xs shrink-0"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Company Logo in Header - ONLY VISIBLE ON MOBILE / SMALL SCREENS (< lg) */}
        <div className="lg:hidden">
          <Logo size={32} className="pl-1" />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Healthy Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
            SYSTEM HEALTHY
          </span>
        </div>

        <ThemeToggle />

        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Logged in Admin Profile Name */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="w-7 h-7 rounded-full bg-[#0B192C] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
};
