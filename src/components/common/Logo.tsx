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
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-[#064E3B] dark:bg-[#064E3B] flex items-center justify-center shadow-xs shrink-0 border border-emerald-600/30"
      >
        <div className="w-5 h-5 rounded-md bg-[#10B981] text-slate-950 flex items-center justify-center font-black text-xs">
          <BookOpen className="w-3.5 h-3.5 text-slate-950" />
        </div>
      </div>

      {showText && (
        <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white font-sans">
          ExamMaster
        </span>
      )}
    </div>
  );
};
