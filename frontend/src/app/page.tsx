'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { LAUNCH_FACTORY_ABI, LAUNCH_TOKEN_ABI, getLaunchFactoryAddress } from '@/contracts';
import { useChainId } from 'wagmi';
import { Search, Flame, TrendingUp, Sparkles, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface TokenItem {
  id: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  virtualMarketCap: number;
  bondingCurveProgress: number;
  isGraduated: boolean;
  replies: number;
  logoUrl?: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'progress' | 'marketCap' | 'newest'>('progress');
  const chainId = useChainId();
  const factoryAddress = useMemo(() => getLaunchFactoryAddress(chainId), [chainId]);

  const { nativeSymbol, dexName } = useMemo(() => {
    if (chainId === 1) return { nativeSymbol: 'ETH', dexName: 'Uniswap V3 Mainnet' };
    if (chainId === 10 || chainId === 42161 || chainId === 11155111) return { nativeSymbol: 'ETH', dexName: 'Uniswap' };
    return { nativeSymbol: 'CELO', dexName: 'Uniswap' };
  }, [chainId]);

  // Read graduation threshold from LaunchFactory
  const { data: thresholdData } = useReadContract({
    address: factoryAddress,
    abi: LAUNCH_FACTORY_ABI,
    functionName: 'graduationThreshold',
  });

  const graduationThresholdEth = thresholdData
    ? parseFloat(formatEther(thresholdData as bigint))
    : (chainId === 1 ? 2.0 : 0.2);

  // Fetch total launch count from LaunchFactory
  const { data: launchCountData } = useReadContract({
    address: factoryAddress,
    abi: LAUNCH_FACTORY_ABI,
    functionName: 'launchCount',
  });

  const count = launchCountData ? Number(launchCountData) : 0;

  // Prepare contract calls to get launch addresses
  const launchCalls = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      address: factoryAddress,
      abi: LAUNCH_FACTORY_ABI,
      functionName: 'allLaunches',
      args: [BigInt(i)],
    }));
  }, [count, factoryAddress]);

  const { data: launchAddressResults } = useReadContracts({
    contracts: launchCalls,
  });

  const launchAddresses = useMemo(() => {
    if (!launchAddressResults) return [];
    return launchAddressResults
      .filter((r) => r && r.status === 'success' && r.result)
      .map((r) => r.result as `0x${string}`);
  }, [launchAddressResults]);

  // Prepare token detail queries for each launched token
  const tokenCalls = useMemo(() => {
    const calls: any[] = [];
    launchAddresses.forEach((addr) => {
      calls.push({ address: addr, abi: LAUNCH_TOKEN_ABI, functionName: 'name' });
      calls.push({ address: addr, abi: LAUNCH_TOKEN_ABI, functionName: 'symbol' });
      calls.push({ address: addr, abi: LAUNCH_TOKEN_ABI, functionName: 'metadataUri' });
      calls.push({ address: addr, abi: LAUNCH_TOKEN_ABI, functionName: 'creator' });
      calls.push({ address: factoryAddress, abi: LAUNCH_FACTORY_ABI, functionName: 'realReserves', args: [addr] });
      calls.push({ address: factoryAddress, abi: LAUNCH_FACTORY_ABI, functionName: 'isGraduated', args: [addr] });
    });
    return calls;
  }, [launchAddresses, factoryAddress]);

  const { data: tokenDataResults, isLoading } = useReadContracts({
    contracts: tokenCalls,
  });

  const tokens = useMemo(() => {
    if (!tokenDataResults || launchAddresses.length === 0) return [] as TokenItem[];

    const result: TokenItem[] = [];

    launchAddresses.forEach((addr, i) => {
      const baseIdx = i * 6;
      const nameRes = tokenDataResults[baseIdx];
      const symbolRes = tokenDataResults[baseIdx + 1];
      const metadataRes = tokenDataResults[baseIdx + 2];
      const creatorRes = tokenDataResults[baseIdx + 3];
      const reservesRes = tokenDataResults[baseIdx + 4];
      const graduatedRes = tokenDataResults[baseIdx + 5];

      const name = (nameRes?.status === 'success' && nameRes.result) ? (nameRes.result as string) : 'Token';
      const symbol = (symbolRes?.status === 'success' && symbolRes.result) ? (symbolRes.result as string) : 'TKN';
      const rawMetadata = (metadataRes?.status === 'success' && metadataRes.result) ? (metadataRes.result as string) : '';
      const creatorAddr = (creatorRes?.status === 'success' && creatorRes.result) ? (creatorRes.result as string) : addr;
      const reservesEth = (reservesRes?.status === 'success' && reservesRes.result) ? parseFloat(formatEther(reservesRes.result as bigint)) : 0;
      const isGrad = (graduatedRes?.status === 'success' && graduatedRes.result) ? Boolean(graduatedRes.result) : false;

      const progress = isGrad ? 100 : Math.min(100, (reservesEth / graduationThresholdEth) * 100);

      let description = '';
      let logoUrl = '';
      if (rawMetadata) {
        try {
          const parsed = JSON.parse(rawMetadata);
          description = parsed.description || rawMetadata;
          logoUrl = parsed.imageUrl || '';
        } catch {
          description = rawMetadata;
        }
      }

      result.push({
        id: addr,
        name,
        symbol,
        description,
        creator: `${creatorAddr.substring(0, 6)}...${creatorAddr.substring(38)}`,
        virtualMarketCap: reservesEth,
        bondingCurveProgress: progress,
        isGraduated: isGrad,
        replies: 0,
        logoUrl,
        timestamp: 'Just now',
      });
    });

    return result;
  }, [tokenDataResults, launchAddresses, graduationThresholdEth]);

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
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Active Launches</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{tokens.length}</p>
          <p className="text-sm text-primary flex items-center gap-1">
            Live on {dexName} <TrendingUp className="h-3.5 w-3.5" />
          </p>
        </div>

        <div className="bg-gradient-to-br from-surface to-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-secondary/10 rounded-full blur-xl group-hover:bg-secondary/20 transition-all" />
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Total Reserves</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {tokens.reduce((acc, t) => acc + t.virtualMarketCap, 0).toFixed(3)} {nativeSymbol}
          </p>
          <p className="text-sm text-zinc-400">In Launch Reserve Pools</p>
        </div>

        <div className="bg-gradient-to-br from-surface to-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Graduation Target</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{graduationThresholdEth.toFixed(2)} {nativeSymbol}</p>
          <p className="text-sm text-zinc-400">Graduates automatically to Uniswap</p>
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
              {type === 'marketCap' ? 'Reserves' : type === 'progress' ? 'Graduation' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Token Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
           <div className="col-span-full text-center py-12">Loading launches...</div>
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
                  <span className="text-zinc-500">Real Reserves:</span>
                  <span className="font-bold text-white">{token.virtualMarketCap.toFixed(4)} {nativeSymbol}</span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-zinc-500">Graduation Progress:</span>
                    <span className={`font-semibold flex items-center gap-1 ${token.isGraduated ? 'text-secondary' : 'text-primary'}`}>
                      {token.isGraduated && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {token.isGraduated ? 'Graduated to Uniswap' : `${token.bondingCurveProgress.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${token.isGraduated ? 'bg-secondary' : 'bg-gradient-to-r from-primary to-secondary'}`}
                      style={{ width: `${token.bondingCurveProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Token: {token.id.substring(0, 6)}...{token.id.substring(38)}</span>
                  <Link href={`/trade/${token.id}`} className="text-primary hover:underline font-medium text-xs">
                    Open Terminal &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-surface border border-zinc-800 rounded-2xl text-zinc-500">
            No launches found. Be the first to launch one!
          </div>
        )}
      </div>
    </div>
  );
}
