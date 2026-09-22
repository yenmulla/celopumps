import React from 'react';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'CeloPump - Fair Launch Bonding Curve Terminal',
  description: 'The premier fair launch token launcher and bonding curve trading terminal on Celo Network.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-white antialiased flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-zinc-900 bg-surface/40 py-6 text-center text-sm text-zinc-500">
            <div className="container mx-auto px-4">
              &copy; {new Date().getFullYear()} CeloPump. Powered by Celo Network & Bonding Curves.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
