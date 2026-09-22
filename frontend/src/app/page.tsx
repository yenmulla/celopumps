'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { LAUNCHPAD_FACTORY_ABI, getLaunchpadFactoryAddress } from '@/contracts';
import { useChainId } from 'wagmi';
import { Search, Flame, TrendingUp, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';


interface TokenItem {
  id: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  virtualMarketCap: number;
  bondingCurveProgress: number;
  replies: number;
  logoUrl?: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'progress' | 'marketCap' | 'newest'>('progress');
  const chainId = useChainId();
  const factoryAddress = useMemo(() => getLaunchpadFactoryAddress(chainId), [chainId]);

  const { nativeSymbol, dexName } = useMemo(() => {
    if (chainId === 10 || chainId === 42161) return { nativeSymbol: 'ETH', dexName: 'Uniswap' };
    return { nativeSymbol: 'CELO', dexName: 'Ubeswap' };
  }, [chainId]);


  // Fetch all token addresses
  const { data: allTokenAddresses } = useReadContract({
    address: factoryAddress,
    abi: LAUNCHPAD_FACTORY_ABI,
    functionName: 'getTokens',
  });

  // Fetch threshold
  const { data: threshold } = useReadContract({
    address: factoryAddress,
    abi: LAUNCHPAD_FACTORY_ABI,
    functionName: 'GRADUATION_THRESHOLD',
  });

  // Prepare calls for details
  const detailCalls = useMemo(() => {
    if (!allTokenAddresses) return [];
    return allTokenAddresses.map((addr) => ({
      address: factoryAddress,
      abi: LAUNCHPAD_FACTORY_ABI,
      functionName: 'tokens',
      args: [addr],
    }));
  }, [allTokenAddresses, factoryAddress]);


  const { data: tokenDetails, isLoading } = useReadContracts({
    contracts: detailCalls,
  });

  const tokens = useMemo(() => {
    if (!tokenDetails || !allTokenAddresses) return [] as TokenItem[];

    const result: TokenItem[] = [];

    tokenDetails.forEach((res, index) => {
      if (res && res.status === 'success' && res.result) {
        const data = res.result as any;
        const addr = allTokenAddresses[index];

        const realCelo = parseFloat(formatEther(data[4] || BigInt(0)));
        const defaultThreshold = (chainId === 10 || chainId === 42161) ? "1000000000000000000" : "2000000000000000000000";
        const gradThreshold = parseFloat(formatEther(threshold || BigInt(defaultThreshold)));

        const progress = Math.min(100, (realCelo / gradThreshold) * 100);

        result.push({
          id: addr,
          name: data[10] || 'Unknown',
          symbol: data[11] || 'TKN',
          description: data[12] || '',
          creator: `${data[1].substring(0, 5)}...${data[1].substring(38)}`,
          virtualMarketCap: realCelo,
          bondingCurveProgress: progress,
          replies: 0,
          logoUrl: data[15] || '',
          timestamp: 'Just now',
        });
      }
    });

    return result;
  }, [tokenDetails, allTokenAddresses, threshold]);

  const filteredTokens = useMemo(() => {
    return tokens
      .filter(token =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'progress') return b.bondingCurveProgress - a.bondingCurveProgress;
        if (sortBy === 'marketCap') return b.virtualMarketCap - a.virtualMarketCap;
        return 0;
      });
  }, [tokens, searchQuery, sortBy]);

  return (
    <div className="space-y-8">
      {/* Hero Showcase / Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-surface to-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all" />
          <div className="flex items-center gap-3 mb-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Active Tokens</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{tokens.length}</p>
          <p className="text-sm text-primary flex items-center gap-1">
            Live on Bonding Curve <TrendingUp className="h-3.5 w-3.5" />
          </p>
        </div>

        <div className="bg-gradient-to-br from-surface to-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-secondary/10 rounded-full blur-xl group-hover:bg-secondary/20 transition-all" />
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Total Liquidity</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {tokens.reduce((acc, t) => acc + t.virtualMarketCap, 0).toFixed(2)} {nativeSymbol}
          </p>
          <p className="text-sm text-zinc-400">Locked in pools</p>
        </div>

        <div className="bg-gradient-to-br from-surface to-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Graduation Target</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{threshold ? formatEther(threshold) : (chainId === 10 || chainId === 42161 ? '1' : '2000')} {nativeSymbol}</p>
          <p className="text-sm text-zinc-400">Migrates automatically to {dexName}</p>
        </div>
      </div>

      {/* Control Panel / Search Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface border border-zinc-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tokens by name, symbol, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold whitespace-nowrap">Sort By:</span>
          {(['progress', 'marketCap', 'newest'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSortBy(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                sortBy === type
                  ? 'bg-primary text-background font-bold'
                  : 'bg-background border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {type === 'marketCap' ? 'Virtual Market Cap' : type === 'progress' ? 'Curve Progress' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Token Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
           <div className="col-span-full text-center py-12">Loading tokens...</div>
        ) : filteredTokens.length > 0 ? (
          filteredTokens.map((token) => (
            <div
              key={token.id}
              className="bg-surface border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {token.logoUrl ? (
                      <img src={token.logoUrl} className="h-12 w-12 rounded-xl object-cover border border-zinc-800" alt={token.name} />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center font-bold text-lg text-primary border border-zinc-800">
                        {token.symbol.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        {token.name} <span className="text-xs font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">{token.symbol}</span>
                      </h4>
                      <p className="text-xs text-zinc-500">Created by {token.creator} • {token.timestamp}</p>
                    </div>
                  </div>
                  <Link
                    href={`/trade/${token.id}`}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-primary group-hover:bg-primary/10 transition-all"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                  {token.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-zinc-900">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Real {nativeSymbol} in Curve:</span>
                  <span className="font-bold text-white">{token.virtualMarketCap.toFixed(4)} {nativeSymbol}</span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-500">Bonding Curve Progress:</span>
                    <span className="font-semibold text-primary">{token.bondingCurveProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
                      style={{ width: `${token.bondingCurveProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Comments: {token.replies}</span>
                  <Link href={`/trade/${token.id}`} className="text-primary hover:underline font-medium text-xs">
                    Open Chart &rarr;
                  </Link>

                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-surface border border-zinc-800 rounded-2xl text-zinc-500">
            No tokens found. Be the first to launch one!
          </div>
        )}
      </div>
    </div>
  );
}
