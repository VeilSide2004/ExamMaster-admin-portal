import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExamMaster - Admin Management Portal',
  description: 'Restricted administrative back-office portal for managing question banks, courses, and accounts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
