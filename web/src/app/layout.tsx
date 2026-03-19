import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'The Administration — Admin Protocol',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="min-h-screen px-4 pb-20 pt-4 lg:ml-[var(--rail-width)] lg:px-8 lg:pt-8">
          {children}
        </main>
        <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-11 items-center justify-between border-t border-[var(--border)] bg-[rgba(0,0,0,0.92)] px-4 text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--foreground-subtle)] backdrop-blur lg:left-[var(--rail-width)] lg:px-8">
          <span>Admin Protocol</span>
          <span>Statesman Theme</span>
        </footer>
      </body>
    </html>
  );
}
