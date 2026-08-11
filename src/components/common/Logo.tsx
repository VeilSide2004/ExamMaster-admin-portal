import React from 'react';
import { BookOpen } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-blue-600 flex items-center justify-center shadow-xs shrink-0 border border-blue-500/30 text-white"
      >
        <BookOpen className="w-5 h-5 text-white stroke-[2.5]" />
      </div>

      {showText && (
        <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white font-sans">
          Examizo
        </span>
      )}
    </div>
  );
};
