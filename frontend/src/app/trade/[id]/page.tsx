'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useSendTransaction, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { LAUNCH_FACTORY_ABI, LAUNCH_TOKEN_ABI, getLaunchFactoryAddress } from '@/contracts';

import { ArrowLeft, Award, Wallet, PieChart, Landmark, Bell, X, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function TradingTerminalPage() {
  const { id } = useParams();
  const tokenAddress = id as `0x${string}`;
  const { address } = useAccount();
  const chainId = useChainId();

  const { nativeSymbol, dexName } = useMemo(() => {
    if (chainId === 10 || chainId === 42161 || chainId === 11155111) return { nativeSymbol: 'ETH', dexName: 'Uniswap v4' };
    return { nativeSymbol: 'CELO', dexName: 'Uniswap v4' };
  }, [chainId]);

  const factoryAddress = useMemo(() => getLaunchFactoryAddress(chainId), [chainId]);

  // Fetch token metadata from LaunchToken contract
  const { data: nameData } = useReadContract({
    address: tokenAddress,
    abi: LAUNCH_TOKEN_ABI,
    functionName: 'name',
  });

  const { data: symbolData } = useReadContract({
    address: tokenAddress,
    abi: LAUNCH_TOKEN_ABI,
    functionName: 'symbol',
  });

  const { data: metadataData } = useReadContract({
    address: tokenAddress,
    abi: LAUNCH_TOKEN_ABI,
    functionName: 'metadataUri',
  });

  const { data: creatorData } = useReadContract({
    address: tokenAddress,
    abi: LAUNCH_TOKEN_ABI,
    functionName: 'creator',
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: LAUNCH_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  const { data: celoBalance, refetch: refetchCeloBalance } = useBalance({
    address: address,
  });

  const { data: routerAddress } = useReadContract({
    address: factoryAddress,
    abi: LAUNCH_FACTORY_ABI,
    functionName: 'router',
  });

  const targetSpender = useMemo(() => {
    if (routerAddress && routerAddress !== '0x0000000000000000000000000000000000000000') {
      return routerAddress as `0x${string}`;
    }
    return factoryAddress;
  }, [routerAddress, factoryAddress]);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: LAUNCH_TOKEN_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, targetSpender],
  });

  const { data: realReservesData } = useReadContract({
    address: factoryAddress,
    abi: LAUNCH_FACTORY_ABI,
    functionName: 'realReserves',
    args: [tokenAddress],
  });

  const { data: isGraduatedData } = useReadContract({
    address: factoryAddress,
    abi: LAUNCH_FACTORY_ABI,
    functionName: 'isGraduated',
    args: [tokenAddress],
  });

  const { data: thresholdData } = useReadContract({
    address: factoryAddress,
    abi: LAUNCH_FACTORY_ABI,
    functionName: 'graduationThreshold',
  });

  const graduationThresholdEth = thresholdData
    ? parseFloat(formatEther(thresholdData as bigint))
    : (chainId === 1 ? 2.0 : 0.2);

  const realReservesEth = realReservesData
    ? parseFloat(formatEther(realReservesData as bigint))
    : 0;

  const isGraduated = Boolean(isGraduatedData);
  const graduationProgress = isGraduated
    ? 100
    : Math.min(100, (realReservesEth / graduationThresholdEth) * 100);

  const { writeContract, data: writeHash, isPending: isWritePending, reset } = useWriteContract();
  const { sendTransaction, data: sendHash, isPending: isSendPending } = useSendTransaction();

  const hash = writeHash || sendHash;
  const isPending = isWritePending || isSendPending;
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [notification, setNotification] = useState<{ show: boolean; msg: string; type: 'buy' | 'sell' }>({ show: false, msg: '', type: 'buy' });

  const tokenInfo = useMemo(() => {
    const name = (nameData as string) || 'Token';
    const symbol = (symbolData as string) || 'TKN';
    const rawMeta = (metadataData as string) || '';
    const creatorAddr = (creatorData as string) || tokenAddress;

    let description = 'Launchpad Token on Uniswap v4 Hook Pool';
    let logoUrl = '';
    if (rawMeta) {
      try {
        const parsed = JSON.parse(rawMeta);
        description = parsed.description || rawMeta;
        logoUrl = parsed.imageUrl || '';
      } catch {
        description = rawMeta;
      }
    }

    return {
      name,
      symbol,
      description,
      logoUrl,
      virtualMarketCap: 4000,
      liquidity: 4000,
      progress: 100,
      holderCount: 1,
      creator: `${creatorAddr.substring(0, 6)}...${creatorAddr.substring(38)}`,
    };
  }, [nameData, symbolData, metadataData, creatorData, tokenAddress]);

  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
      refetchAllowance();
      refetchCeloBalance();

      if (tokenInfo) {
        const modeLabel = tradeMode === 'buy' ? 'Bought' : 'Sold';
        setNotification({
          show: true,
          msg: `Successfully ${modeLabel} ${amount || 'your'} allocation of ${tokenInfo.symbol}!`,
          type: tradeMode
        });

        const timer = setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 5000);
        return () => clearTimeout(timer);
      }

      setAmount('');
    }
  }, [isSuccess, refetchBalance, refetchAllowance, refetchCeloBalance, tokenInfo, tradeMode, amount]);

  // Chart Live Simulation
  useEffect(() => {
    if (tokenInfo && priceHistory.length === 0) {
      const base = tokenInfo.virtualMarketCap || 1;
      const initialPoints = Array.from({ length: 40 }, (_, i) => {
        const variance = (Math.sin(i / 4) * 0.03) + ((Math.random() - 0.5) * 0.01);
        return base * (1 + variance);
      });
      setPriceHistory(initialPoints);
    }
  }, [tokenInfo, priceHistory.length]);

  useEffect(() => {
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

  const userPerformance = useMemo(() => {
    if (!balance || !tokenInfo) return { fees: 0, roi: 0, value: 0 };
    const bal = parseFloat(formatEther(balance));
    if (bal === 0) return { fees: 0, roi: 0, value: 0 };

    const value = bal * svgPathData.latestPrice;
    const fees = value * 0.0056;
    const roi = (svgPathData.priceChange * 0.8) + 2.5;
    return { fees, roi, value };
  }, [balance, tokenInfo, svgPathData.latestPrice, svgPathData.priceChange]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const amt = parseEther(amount);

    if (tradeMode === 'buy') {
      writeContract({
        address: factoryAddress,
        abi: LAUNCH_FACTORY_ABI,
        functionName: 'buy',
        args: [tokenAddress],
        value: amt,
      });
    } else {
      if ((allowance || 0n) < amt) {
        writeContract({
          address: tokenAddress,
          abi: LAUNCH_TOKEN_ABI,
          functionName: 'approve',
          args: [factoryAddress, amt],
        });
        return;
      }

      writeContract({
        address: factoryAddress,
        abi: LAUNCH_FACTORY_ABI,
        functionName: 'sell',
        args: [tokenAddress, amt],
      });
    }
  };

  if (!tokenInfo) return <div className="p-12 text-center">Loading token data...</div>;

  return (
    <div className="space-y-6 relative">
      {/* Floating Alert */}
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <span className="text-xs text-zinc-500 font-mono">Token: {id}</span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
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
                <p className="text-xs text-zinc-400 uppercase font-semibold">Opening FDV</p>
                <p className="text-xl font-bold text-secondary">${tokenInfo.virtualMarketCap.toLocaleString()} USD</p>
              </div>
            </div>

            {/* Live Chart */}
            <div className="w-full h-80 bg-background rounded-xl border border-zinc-900 relative overflow-hidden flex flex-col justify-between p-4">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

              <div className="flex justify-between text-[10px] text-zinc-600 z-10">
                <span className="flex items-center gap-2">
                  Price: <span className="font-mono text-white font-bold">${svgPathData.latestPrice.toFixed(4)}</span>
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
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Pool Type</p>
                <p className="text-sm font-bold text-white">
                  {chainId === 1 ? 'Uniswap V3 Mainnet' : 'Uniswap v4 Hook'}
                </p>
              </div>
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Total Supply</p>
                <p className="text-sm font-bold text-white">1B {tokenInfo.symbol}</p>
              </div>
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Chain ID</p>
                <p className="text-sm font-bold text-primary">{chainId}</p>
              </div>
              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase">Status</p>
                <p className={`text-sm font-bold ${isGraduated ? 'text-secondary' : 'text-primary'}`}>
                  {isGraduated ? 'Graduated' : 'Active Curve'}
                </p>
              </div>
            </div>

            {/* Graduation Progress Banner */}
            <div className="bg-background p-4 rounded-xl border border-zinc-900 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-400">Graduation Progress ({realReservesEth.toFixed(3)} / {graduationThresholdEth.toFixed(2)} {nativeSymbol})</span>
                <span className={isGraduated ? 'text-secondary font-bold' : 'text-primary'}>
                  {isGraduated ? 'Graduated to Uniswap' : `${graduationProgress.toFixed(1)}%`}
                </span>
              </div>
              <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isGraduated ? 'bg-secondary' : 'bg-gradient-to-r from-primary to-secondary'}`}
                  style={{ width: `${graduationProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column / Trading Terminal */}
        <div className="space-y-6">
          <div className="bg-surface border border-zinc-800 rounded-2xl p-6">
            {/* Tabs */}
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

            {/* Trade Form */}
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

              <div className="bg-background p-3 rounded-xl border border-zinc-900 text-xs space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Routing:</span>
                  <span className="text-primary font-medium">Uniswap v4 Hook Router</span>
                </div>
              </div>

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

            {isSuccess && (
              <div className="mt-4 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-center space-y-1">
                <p className="text-xs text-primary font-bold">Transaction Confirmed!</p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">{hash}</p>
              </div>
            )}
          </div>

          {/* User Position */}
          <div className="bg-surface border border-zinc-800 rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Your Position
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background p-4 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2 mb-1">
                  <Landmark className="h-3.5 w-3.5 text-zinc-500" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Holdings</p>
                </div>
                <p className="text-lg font-black text-white">
                  {balance ? parseFloat(formatEther(balance)).toFixed(2) : '0.00'} <span className="text-[10px] text-zinc-500">{tokenInfo.symbol}</span>
                </p>
              </div>

              <div className="bg-background p-4 rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2 mb-1">
                  <PieChart className="h-3.5 w-3.5 text-zinc-500" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Active ROI</p>
                </div>
                <p className={`text-lg font-black ${userPerformance.roi >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {userPerformance.roi >= 0 ? '+' : ''}{userPerformance.roi.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Hook Pool Info */}
          <div className="bg-surface border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-medium">Hook Pool Liquidity:</span>
              <span className="font-bold text-primary">Active</span>
            </div>
            <div className="w-full bg-background h-2.5 rounded-full overflow-hidden border border-zinc-900">
              <div className="bg-gradient-to-r from-primary to-secondary h-full w-full rounded-full" />
            </div>
            <div className="flex gap-2 text-[11px] text-zinc-400 bg-background/50 border border-zinc-900 p-3 rounded-xl">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Liquidity is managed via Stockpad Uniswap v4 Launch Hook with built-in fee distribution.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
