'use client';

import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out flex-1 flex flex-col min-h-full">
      {children}
    </div>
  );
}
