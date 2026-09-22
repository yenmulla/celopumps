'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { LAUNCHPAD_FACTORY_ABI, getLaunchpadFactoryAddress } from '@/contracts';

import { useMemo } from 'react';

import {
  Rocket,
  Info,
  HelpCircle,
  Coins,
  ShieldCheck,
  ArrowLeft,
  Image as ImageIcon,
  Twitter,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function LaunchPage() {
  const { isConnected, address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const chainId = useChainId();

  const nativeSymbol = useMemo(() => {
    if (chainId === 10 || chainId === 42161) return 'ETH';
    return 'CELO';
  }, [chainId]);

  const [formData, setFormData] = useState({

    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    imageUrl: '',
    initialBuy: '',
    holderFeeSharing: false,
    creatorWallet: '',
    creatorTax: '0',
  });

  const CREATION_FEE = '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.symbol || !formData.description) {
      alert('Please fill out all required fields.');
      return;
    }

    const value = parseEther(CREATION_FEE) + parseEther(formData.initialBuy || '0');
    const factoryAddress = getLaunchpadFactoryAddress(chainId);

    writeContract({
      address: factoryAddress,
      abi: LAUNCHPAD_FACTORY_ABI,
      functionName: 'createToken',

      args: [
        formData.name,
        formData.symbol,
        formData.description,
        formData.twitter,
        formData.telegram,
        formData.imageUrl,
        BigInt(Math.floor(parseFloat(formData.creatorTax) * 100)), // Convert to BPS
        (formData.creatorWallet as `0x${string}`) || (address as `0x${string}`),
        formData.holderFeeSharing
      ],
      value: value
    });
  };

  useEffect(() => {
    if (isSuccess) {
      setFormData({
        name: '', symbol: '', description: '', twitter: '', telegram: '', imageUrl: '',
        initialBuy: '', holderFeeSharing: false, creatorWallet: '', creatorTax: '0'
      });
    }
  }, [isSuccess]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Performance Warning Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-200 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Error: {error.message}</span>
        </div>
      )}

      {/* Navigation & Version Toggle */}
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
          <button className="px-3 py-1 text-xs font-bold rounded-md bg-zinc-800 text-white">v2</button>
          <button className="px-3 py-1 text-xs font-bold rounded-md text-zinc-500 hover:text-zinc-300">v1</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-white tracking-tight">
          Launch a token
        </h1>
      </div>

      {isSuccess ? (
        <div className="bg-surface border border-primary/30 p-12 rounded-3xl text-center space-y-6 max-w-2xl mx-auto">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto text-4xl font-bold">
            ✓
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Token Successfully Created!</h2>
            <p className="text-zinc-400 text-sm">
              Your token is now deployed live on the bonding curve.
            </p>
            {hash && (
              <p className="text-[10px] text-zinc-500 font-mono">Tx: {hash}</p>
            )}
          </div>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-primary text-background font-black rounded-xl text-sm transition-transform active:scale-95 hover:opacity-90"
          >
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Form Section */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
            <div className="bg-surface border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Name</label>
                  <input
                    type="text"
                    placeholder="Token Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-background border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Ticker</label>
                  <input
                    type="text"
                    placeholder="SYMBOL"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    required
                    className="w-full bg-background border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Description</label>
                <textarea
                  placeholder="What's this token about?"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="w-full bg-background border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-all resize-none placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Token Image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-background border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-zinc-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Twitter className="h-3 w-3" /> X (Twitter) Profile
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">x.com/</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={formData.twitter}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      className="w-full bg-background border border-zinc-800 rounded-xl pl-16 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Send className="h-3 w-3" /> Telegram
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">t.me/</span>
                    <input
                      type="text"
                      placeholder="group_name"
                      value={formData.telegram}
                      onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                      className="w-full bg-background border border-zinc-800 rounded-xl pl-14 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Initial Buy</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={formData.initialBuy}
                    onChange={(e) => setFormData({ ...formData, initialBuy: e.target.value })}
                    className="w-full bg-background border border-zinc-800 rounded-xl pl-4 pr-16 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    {nativeSymbol}
                  </span>

                </div>
                <p className="text-[10px] text-zinc-500 font-medium">Be the first entry on the bonding curve.</p>
              </div>

              {/* Advanced Settings */}
              <div className="pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
                >
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Show Advanced
                </button>

                {showAdvanced && (
                  <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-zinc-800">
                      <div>
                        <p className="text-xs font-bold text-white">Holder fee sharing</p>
                        <p className="text-[10px] text-zinc-500">Route creator fees to holders instead of a wallet.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, holderFeeSharing: !formData.holderFeeSharing })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${formData.holderFeeSharing ? 'bg-primary' : 'bg-zinc-800'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.holderFeeSharing ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    {!formData.holderFeeSharing && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Creator Wallet</label>
                        <input
                          type="text"
                          placeholder={address || "Connect wallet to see address"}
                          value={formData.creatorWallet}
                          onChange={(e) => setFormData({ ...formData, creatorWallet: e.target.value })}
                          className="w-full bg-background border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-zinc-600"
                        />
                        <p className="text-[10px] text-zinc-500">Address to receive the creator tax on trades.</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Creator Tax %</label>
                        <span className="text-xs font-bold text-primary">{formData.creatorTax}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.creatorTax}
                        onChange={(e) => setFormData({ ...formData, creatorTax: e.target.value })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-600 font-bold px-1">
                        <span>0%</span>
                        <span>10%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="bg-surface border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-8">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Summary</h3>
                <p className="text-xl font-black text-white">{formData.symbol || "Ticker"}</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Launch Fee</span>
                  <span className="text-sm font-bold text-primary">FREE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Pairing</span>
                  <span className="text-sm font-bold text-white">Paired with {nativeSymbol}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Liquidity</span>
                  <span className="text-sm font-bold text-primary">Locked</span>
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Once market cap reaches <span className="text-white font-bold">2,000 {nativeSymbol}</span>, all liquidity migrates to automated DEX and LP is burned.
                  </p>

                </div>
              </div>

              {isConnected ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || isConfirming}
                  className="w-full py-4 bg-primary text-background font-black rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-sm tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isPending || isConfirming ? (
                    <div className="h-5 w-5 border-3 border-background border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Launch Token"
                  )}
                </button>
              ) : (
                <div className="text-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Connect Wallet to Launch
                </div>
              )}
            </div>

            <div className="px-4 text-[10px] text-zinc-600 font-medium leading-relaxed space-y-2">
              <p>By creating a token, you agree to the Terms of Service. Launching is irreversible.</p>
              <p>Fair Launch Protocol v2.0</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

