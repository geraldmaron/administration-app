import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'The Administration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="min-h-screen px-4 pb-6 pt-4 lg:ml-[var(--rail-width)] lg:px-8 lg:pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
