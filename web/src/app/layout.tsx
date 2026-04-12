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
        <main className="min-h-screen px-3 pb-12 pt-2 lg:ml-[var(--rail-width)] lg:px-5 lg:pt-4">
          {children}
        </main>
        <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-8 items-center justify-between border-t border-[var(--border)] bg-[rgba(0,0,0,0.96)] px-4 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--foreground-subtle)] lg:left-[var(--rail-width)] lg:px-5">
          <span>Internal Ops Surface</span>
          <span>Firebase Admin</span>
        </footer>
      </body>
    </html>
  );
}
