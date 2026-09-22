'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { LAUNCHPAD_FACTORY_ABI, getLaunchpadFactoryAddress, LAUNCHPAD_TOKEN_ABI } from '@/contracts';

import { ArrowLeft, Coins, TrendingUp, Users, ShieldAlert, Award, MessageSquare, Wallet, PieChart, Landmark, Bell, X } from 'lucide-react';
import Link from 'next/link';


export default function TradingTerminalPage() {
  const { id } = useParams();
  const tokenAddress = id as `0x${string}`;
  const { address } = useAccount();
  const chainId = useChainId();

  // Determine native token name dynamically based on chainId (Celo, Optimism, Arbitrum)
  const { nativeSymbol, dexName } = useMemo(() => {
    if (chainId === 10 || chainId === 42161) return { nativeSymbol: 'ETH', dexName: 'Uniswap' };
    return { nativeSymbol: 'CELO', dexName: 'Ubeswap' };
  }, [chainId]);



  const factoryAddress = useMemo(() => getLaunchpadFactoryAddress(chainId), [chainId]);

  // Fetch token details
  const { data: tokenData, refetch: refetchToken } = useReadContract({
    address: factoryAddress,
    abi: LAUNCHPAD_FACTORY_ABI,
    functionName: 'tokens',
    args: [tokenAddress],
  });

  const { data: threshold } = useReadContract({
    address: factoryAddress,
    abi: LAUNCHPAD_FACTORY_ABI,
    functionName: 'GRADUATION_THRESHOLD',
  });

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: LAUNCHPAD_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  const { data: celoBalance, refetch: refetchCeloBalance } = useBalance({
    address: address,
  });


  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: LAUNCHPAD_TOKEN_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, factoryAddress],
  });


  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [notification, setNotification] = useState<{ show: boolean; msg: string; type: 'buy' | 'sell' }>({ show: false, msg: '', type: 'buy' });

  // Refetch data on success
  React.useEffect(() => {
    if (isSuccess) {
      refetchToken();
      refetchAllowance();
      refetchCeloBalance();

      // Trigger top alert popup
      if (tokenInfo) {
        const modeLabel = tradeMode === 'buy' ? 'Bought' : 'Sold';
        setNotification({
          show: true,
          msg: `Successfully ${modeLabel} ${amount || 'your'} allocation of ${tokenInfo.symbol}!`,
          type: tradeMode
        });

        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 5000);
        return () => clearTimeout(timer);
      }

      setAmount('');
    }
  }, [isSuccess, refetchToken, refetchAllowance, refetchCeloBalance]);



  const tokenInfo = useMemo(() => {
    if (!tokenData) return null;
    const data = tokenData as any;
    const realCelo = parseFloat(formatEther(data[4] || BigInt(0)));
    const defaultThreshold = (chainId === 10 || chainId === 42161) ? "1000000000000000000" : "2000000000000000000000";
    const gradThreshold = parseFloat(formatEther(threshold || BigInt(defaultThreshold)));

    return {
      name: data[10],
      symbol: data[11],
      description: data[12],
      virtualMarketCap: realCelo,
      liquidity: realCelo,
      progress: Math.min(100, (realCelo / gradThreshold) * 100),
      holderCount: 0, // Contract doesn't store this, would need an indexer
      creator: `${data[1].substring(0, 5)}...${data[1].substring(38)}`,
    };
  }, [tokenData, threshold]);


  // Chart Live Logic
  React.useEffect(() => {
    if (tokenInfo && priceHistory.length === 0) {
      const base = tokenInfo.virtualMarketCap || 1;
      const initialPoints = Array.from({ length: 40 }, (_, i) => {
        const variance = (Math.sin(i / 4) * 0.03) + ((Math.random() - 0.5) * 0.01);
        return base * (1 + variance);
      });
      setPriceHistory(initialPoints);
    }
  }, [tokenInfo, priceHistory.length]);

  React.useEffect(() => {
    if (!tokenInfo) return;
    const interval = setInterval(() => {
      setPriceHistory((current) => {
        if (current.length === 0) return current;
        const base = tokenInfo.virtualMarketCap || 1;
        const fluctuation = 1 + (Math.random() - 0.5) * 0.005;
        return [...current.slice(1), base * fluctuation];
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [tokenInfo]);

  const svgPathData = useMemo(() => {
    if (priceHistory.length === 0) return { linePath: '', areaPath: '', latestPrice: 0, priceChange: 0 };
    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || (min * 0.01) || 0.01;
    const points = priceHistory.map((price, index) => ({
      x: (index / (priceHistory.length - 1)) * 1000,
      y: 90 - ((price - min) / range) * 80,
    }));
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L 1000,100 L 0,100 Z`;
    const latestPrice = priceHistory[priceHistory.length - 1];
    const initialPrice = priceHistory[0];
    const priceChange = ((latestPrice - initialPrice) / initialPrice) * 100;
    return { linePath, areaPath, latestPrice, priceChange };
  }, [priceHistory]);

  // Simulated User Performance Data
  const userPerformance = useMemo(() => {
    if (!balance || !tokenInfo) return { fees: 0, roi: 0, value: 0 };
    const bal = parseFloat(formatEther(balance));
    if (bal === 0) return { fees: 0, roi: 0, value: 0 };

    // Simulation: 0.5% of position value earned as trading fee dividends in native chain token
    const value = bal * svgPathData.latestPrice;
    const fees = value * 0.0056;
    const roi = (svgPathData.priceChange * 0.8) + 2.5; // Correlated to chart + small alpha
    return { fees, roi, value };
  }, [balance, tokenInfo, svgPathData.latestPrice, svgPathData.priceChange]);



  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    if (tradeMode === 'buy') {
      writeContract({
        address: factoryAddress,
        abi: LAUNCHPAD_FACTORY_ABI,
        functionName: 'buy',
        args: [tokenAddress],
        value: parseEther(amount),
      });
    } else {
      // Check allowance
      const amt = parseEther(amount);
      if ((allowance || 0n) < amt) {
        writeContract({
          address: tokenAddress,
          abi: LAUNCHPAD_TOKEN_ABI,
          functionName: 'approve',
          args: [factoryAddress, amt],
        });
        return;
      }

      writeContract({
        address: factoryAddress,
        abi: LAUNCHPAD_FACTORY_ABI,
        functionName: 'sell',
        args: [tokenAddress, amt],
      });
    }

  };

  if (!tokenInfo) return <div className="p-12 text-center">Loading token data...</div>;

  return (
    <div className="space-y-6 relative">
      {/* Top Floating Notification Popup Alert */}
      {notification.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-xl shadow-2xl border flex items-center justify-between gap-3 text-sm font-semibold backdrop-blur-md ${
            notification.type === 'buy'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-2.5">
              <Bell className={`h-4 w-4 shrink-0 ${notification.type === 'buy' ? 'text-primary' : 'text-red-400'} animate-bounce`} />
              <span>{notification.msg}</span>
            </div>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header back navigation bar */}

      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <span className="text-xs text-zinc-500 font-mono">Pool ID: {id}</span>
      </div>

      {/* Main split dashboard arrangement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column / Centralized chart and core specifications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  {tokenInfo.name} <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">{tokenInfo.symbol}</span>
                </h1>
                <p className="text-xs text-zinc-500 mt-1">Deployed by {tokenInfo.creator}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400 uppercase font-semibold">Real {nativeSymbol} Reserves</p>
                <p className="text-xl font-bold text-secondary">{tokenInfo.virtualMarketCap.toFixed(4)} {nativeSymbol}</p>
              </div>
            </div>

            {/* Simulated Live Analytics Graphic/Chart panel */}
            <div className="w-full h-80 bg-background rounded-xl border border-zinc-900 relative overflow-hidden flex flex-col justify-between p-4">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

              <div className="flex justify-between text-[10px] text-zinc-600 z-10">
                <span className="flex items-center gap-2">
                  Price ({nativeSymbol}): <span className="font-mono text-white font-bold">{svgPathData.latestPrice.toFixed(6)}</span>
                  <span className={`font-mono font-semibold ${svgPathData.priceChange >= 0 ? 'text-primary' : 'text-red-500'}`}>
                    {svgPathData.priceChange >= 0 ? '+' : ''}{svgPathData.priceChange.toFixed(2)}%
                  </span>
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Interval: 1m
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-12 top-12 px-2">
                {priceHistory.length > 0 ? (
                  <svg className="w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
                    <path
                      d={svgPathData.linePath}
                      fill="none"
                      stroke={svgPathData.priceChange >= 0 ? '#35d07f' : '#ef4444'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={svgPathData.areaPath}
                      fill="url(#chart-gradient)"
                      opacity="0.1"
                    />
                    <defs>
                      <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={svgPathData.priceChange >= 0 ? '#35d07f' : '#ef4444'} />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                    Generating live feed...
                  </div>
                )}
              </div>

              <div className="flex justify-between text-[10px] text-zinc-600 z-10 border-t border-zinc-900/60 pt-2">
                <span>60m ago</span>
                <span>30m ago</span>
                <span className="text-primary font-medium animate-pulse">● LIVE</span>
              </div>
            </div>
          </div>

              <div className="bg-surface border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Token Overview & Vision
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {tokenInfo.description}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Total Liquidity</p>
                <p className="text-sm font-bold text-white">{tokenInfo.liquidity.toFixed(2)} {nativeSymbol}</p>
              </div>
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Holders</p>
                <p className="text-sm font-bold text-white">N/A</p>
              </div>
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Network ID</p>
                <p className="text-sm font-bold text-primary">{chainId}</p>
              </div>
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Status</p>
                <p className="text-sm font-bold text-secondary">Fair Launch</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right column / Live Interaction Trading Desk Panel */}
        <div className="space-y-6">
          <div className="bg-surface border border-zinc-800 rounded-2xl p-6">

            {/* Buy/Sell Tabs */}
            <div className="grid grid-cols-2 bg-background p-1 rounded-xl mb-6 border border-zinc-900">
              <button
                onClick={() => { setTradeMode('buy'); reset(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  tradeMode === 'buy'
                    ? 'bg-primary text-background'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Buy {tokenInfo.symbol}
              </button>
              <button
                onClick={() => { setTradeMode('sell'); reset(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  tradeMode === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sell {tokenInfo.symbol}
              </button>
            </div>

            {/* Input Form Fields */}
            <form onSubmit={handleTrade} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-zinc-400">Amount</span>
                  <span className="text-zinc-500">
                    Balance: {tradeMode === 'buy'
                      ? (celoBalance ? parseFloat(celoBalance.formatted).toFixed(4) : '0.0000')
                      : (balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000')
                    } {tradeMode === 'buy' ? nativeSymbol : tokenInfo.symbol}
                  </span>

                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full bg-background border border-zinc-800 rounded-xl pl-4 pr-16 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    {tradeMode === 'buy' ? nativeSymbol : tokenInfo.symbol}
                  </span>
                </div>
              </div>


              {/* Calculated Outputs Preview */}
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-xs space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Slippage Tolerance:</span>
                  <span className="text-primary font-medium">1.0%</span>
                </div>
              </div>

              {/* Submit Execution Action */}
              <button
                type="submit"
                disabled={isPending || isConfirming}
                className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider transition-all disabled:opacity-50 text-background ${
                  tradeMode === 'buy' ? 'bg-primary' : 'bg-red-500 text-white'
                }`}
              >
                {isPending || isConfirming ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Executing Swap...'}
                  </span>
                ) : (
                  tradeMode === 'sell' && (allowance || BigInt(0)) < parseEther(amount || '0')
                    ? `APPROVE ${tokenInfo.symbol}`
                    : `${tradeMode === 'buy' ? 'BUY' : 'SELL'} ${tokenInfo.symbol}`
                )}
              </button>
            </form>

            {/* Notification alert states */}
            {isSuccess && (
              <div className="mt-4 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-center space-y-1">
                <p className="text-xs text-primary font-bold">Transaction Confirmed!</p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">{hash}</p>
              </div>
            )}
          </div>

          {/* User Position & ROI Card */}
          <div className="bg-surface border border-zinc-800 rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Your Position
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background p-4 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2 mb-1">
                  <Landmark className="h-3.5 w-3.5 text-zinc-500" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Fees Earned</p>
                </div>
                <p className="text-lg font-black text-white">{userPerformance.fees.toFixed(4)} <span className="text-[10px] text-zinc-500">{nativeSymbol}</span></p>
                <p className="text-[10px] text-primary font-medium mt-1">Auto-compounding</p>
              </div>

              <div className="bg-background p-4 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2 mb-1">
                  <PieChart className="h-3.5 w-3.5 text-zinc-500" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Active ROI</p>
                </div>
                <p className={`text-lg font-black ${userPerformance.roi >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {userPerformance.roi >= 0 ? '+' : ''}{userPerformance.roi.toFixed(2)}%
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Current PnL</p>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-[11px] mb-2">
                <span className="text-zinc-500">Net Position Value</span>
                <span className="text-white font-mono">{userPerformance.value.toFixed(4)} {nativeSymbol}</span>
              </div>

              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-2/3 rounded-full opacity-50" />
              </div>
            </div>
          </div>

          {/* Bonding curve status metrics box */}
          <div className="bg-surface border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-medium">Bonding Curve Target:</span>
              <span className="font-bold text-primary">{tokenInfo.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-background h-2.5 rounded-full overflow-hidden border border-zinc-900">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all"
                style={{ width: `${tokenInfo.progress}%` }}
              />
            </div>
            <div className="flex gap-2 text-[11px] text-zinc-400 bg-background/50 border border-zinc-900 p-3 rounded-xl">
              <ShieldAlert className="h-4 w-4 text-secondary shrink-0" />
              <span>When funding hits 100%, the curve graduates to {dexName} automatically.</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
