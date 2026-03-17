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
        <main className="ml-[200px] min-h-screen pb-16">
          {children}
        </main>
        <footer className="h-8 fixed bottom-0 left-[200px] right-0 border-t border-[var(--border-strong)] bg-background-elevated text-[10px] font-mono uppercase tracking-widest text-foreground-subtle px-4 flex items-center justify-between z-40">
          <span>Admin Protocol</span>
          <span>The Administration</span>
        </footer>
      </body>
    </html>
  );
}
