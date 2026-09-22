'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Rocket, LayoutDashboard } from 'lucide-react';
import { Logo } from './Logo';
import { useAccount, useChainId } from 'wagmi';


export function Navbar() {
  const pathname = usePathname();
  const chainId = useChainId();

  const brandName = React.useMemo(() => {
    if (chainId === 10) return 'OP';
    if (chainId === 42161) return 'ARB';
    return 'CELO';
  }, [chainId]);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Launch Terminal', href: '/launch', icon: Rocket },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-wider group">
            <Logo className="h-10 w-10 transition-transform group-hover:scale-110" brandText={brandName} />
            <span className="hidden sm:inline uppercase">{brandName}<span className="text-white">PUMP</span></span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.name}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-primary'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>


        </div>

        <div className="flex items-center gap-4">
          <ConnectButton
            accountStatus="avatar"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
