import React from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, ArrowRight, Shield, Award, Sparkles, MessageSquare, 
  Target, Activity, Search, Bell, Users, Wallet, Info, ArrowUpRight, 
  ArrowDownRight, BarChart3, LineChart, Star
} from 'lucide-react';
import MarketTicker from '../components/ui/MarketTicker';

const LEADERBOARD_PREVIEW = [
  { rank: 1, name: "Suresh Kumar", email: "suresh.k@iit.edu.in", yield: "+124.60%", score: 980, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80", badge: "Market Master" },
  { rank: 2, name: "Octocat Developer", email: "sandbox.octocat@gmail.com", yield: "+98.15%", score: 915, avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80", badge: "Code Trader" },
  { rank: 3, name: "Priya Sharma", email: "priya.s@bits.edu.in", yield: "+76.40%", score: 860, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80", badge: "Bull Run" }
];

export default function LandingPage() {
  // Smooth scroll handler
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden relative bg-mesh-cyber">
      {/* Decorative Vibrant Neon Mesh Gradients */}
      <div className="absolute top-0 right-0 w-[45rem] h-[45rem] bg-indigo-500/10 rounded-full filter blur-[150px] pointer-events-none z-0" />
      <div className="absolute left-[-15rem] top-[25%] w-[40rem] h-[40rem] bg-cyan-500/10 rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute right-[-15rem] bottom-[15%] w-[40rem] h-[40rem] bg-emerald-500/10 rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute left-[30%] bottom-[5%] w-[35rem] h-[35rem] bg-violet-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      {/* Sticky Navigation Header */}
      <header className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/60 h-20 w-full z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
              StockSim
            </span>
          </div>

          {/* Navigation Links - Smooth Anchors */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToId('features')} className="text-xs font-extrabold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-wider">Features</button>
            <button onClick={() => scrollToId('platform-preview')} className="text-xs font-extrabold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-wider">Terminal Preview</button>
            <button onClick={() => scrollToId('platform-tour')} className="text-xs font-extrabold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-wider">How It Works</button>
            <button onClick={() => scrollToId('leaderboard-preview')} className="text-xs font-extrabold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-wider">Leaderboard</button>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs font-extrabold text-slate-400 hover:text-slate-200 transition-colors px-4 py-2.5 rounded-xl">
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl transition shadow-lg shadow-cyan-500/10"
            >
              Get Free Capital
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 max-w-5xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[10px] font-black uppercase text-cyan-400 tracking-wider mb-8 animate-pulse shadow-inner glow-cyan">
          <Sparkles size={12} />
          <span>Real-Time Simulated Fintech Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-100 tracking-tight leading-[1.08] mb-8 max-w-4xl">
          Master the Markets.<br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Risk-Free. In Real-Time.
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed mb-12 font-semibold">
          Trade physical assets with $100,000 in virtual capital. Real-time prices synced continuously from global equity markets, with price targets, badges, achievements, and ranking engines.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
          <Link
            to="/register"
            className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs px-8 py-4.5 rounded-2xl transition duration-300 shadow-xl shadow-cyan-500/15 flex items-center justify-center gap-2"
          >
            <span>Start Practice Trading Free</span>
            <ArrowRight size={15} />
          </Link>
          <button
            onClick={() => scrollToId('platform-preview')}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-extrabold text-xs px-8 py-4.5 rounded-2xl transition flex items-center justify-center gap-2 shadow"
          >
            <span>View Terminal Interface</span>
          </button>
        </div>
      </section>

      {/* --- PLATFORM INTERFACE PREVIEW (NON-INTERACTIVE SHOWCASE) --- */}
      <section id="platform-preview" className="py-24 max-w-6xl mx-auto w-full px-6 z-10 relative scroll-mt-20">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-extrabold uppercase text-indigo-400 tracking-wider glow-indigo">
            <LineChart size={10} />
            <span>Interactive Terminal Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">Fintech Terminal Interface</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">
            Take a look at the layout of our real-time simulation workspace, engineered to reflect commercial trading terminals.
          </p>
        </div>

        <div className="glass-card rounded-3xl border-slate-900/60 shadow-2xl p-4 md:p-6 text-left relative overflow-hidden bg-slate-950/80 backdrop-blur-md glow-indigo">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-900/80 pb-4 mb-6 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/90" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/90" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/90" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-3">
                Trading Terminal Dashboard Visual
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase font-mono-numbers">Live Feed: Synchronized</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Content Area: Core Mock Terminal Dashboard components */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Asset Highlight Box */}
              <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl glow-cyan">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded uppercase tracking-wider block w-max">Active Market Spot</span>
                    <h4 className="text-xl font-bold text-slate-100 font-mono-numbers mt-2 flex items-center gap-2">
                      NVDA <span className="text-xs text-slate-500 font-sans font-semibold">NVIDIA Corporation</span>
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Live Quote</span>
                    <div className="text-xl font-black text-emerald-400 font-mono-numbers mt-1">
                      $875.12
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono-numbers mt-1 inline-block">+4.80% Today</span>
                  </div>
                </div>

                {/* Simulated Chart candle vectors */}
                <div className="h-32 w-full bg-slate-950/80 border border-slate-900/60 rounded-xl relative overflow-hidden p-2 flex items-end">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-20">
                    <hr className="border-slate-800" />
                    <hr className="border-slate-800" />
                    <hr className="border-slate-800" />
                  </div>

                  {/* SVG Chart curve representation */}
                  <svg viewBox="0 0 100 25" className="w-full h-full stroke-cyan-400 fill-none stroke-[2] overflow-visible">
                    <path d="M 0 20 L 15 22 L 30 14 L 45 16 L 60 8 L 75 5 L 90 2 L 100 4" />
                  </svg>

                  <div className="absolute left-3 top-3 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">
                    90-Day Aggregate Candlesticks
                  </div>
                </div>
              </div>

              {/* Grid: Search Spotlight & Alerts panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Panel 1: Spotlight Search Concept */}
                <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between glow-indigo">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Search size={14} className="text-indigo-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">⌘K Command Spotlight</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Press ⌘K anywhere in the dashboard to invoke our spotlight command controller. Query symbols, navigate views, or check company profiles instantly.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-500 text-[10px] font-semibold">
                    <span>Search ticker symbol...</span>
                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850 font-mono">⌘K</span>
                  </div>
                </div>

                {/* Panel 2: Alert System Concept */}
                <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between glow-violet">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-violet-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price Alert Targets</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Configure target limits for high/low volatility stocks. Our background engine evaluates physical values and fires email + in-app notification toasts immediately.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 text-[10px] font-semibold">
                    <span className="font-extrabold text-cyan-400">NVDA Alert Active</span>
                    <span className="font-mono text-emerald-400 font-bold">Target @ $900.00</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Right content panel: Net Worth, Positions, and Stats */}
            <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between glow-indigo">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Wallet size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulated Net Worth</span>
                </div>

                <div className="bg-slate-950 p-4 border border-slate-900/60 rounded-xl mb-6">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Portfolio Capital</span>
                  <div className="text-2xl font-black text-slate-100 font-mono-numbers mt-1">
                    $124,845.20
                  </div>
                  <span className="text-[8px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-2 inline-block font-mono-numbers">
                    Yield Return: +24.85%
                  </span>
                </div>

                {/* Positions list mockup */}
                <div className="space-y-3">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Active Portfolio Assets
                  </span>

                  <div className="flex justify-between items-center bg-slate-950/80 border border-slate-900 px-3 py-2.5 rounded-xl hover:border-slate-800 transition">
                    <div>
                      <span className="font-extrabold text-xs text-slate-200">NVDA</span>
                      <span className="text-[8px] text-slate-500 block font-semibold">100 Shares Held</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-300 font-mono-numbers">$87,512.00</div>
                      <div className="text-[8px] font-bold text-emerald-400 font-mono-numbers">+16.2%</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-950/80 border border-slate-900 px-3 py-2.5 rounded-xl hover:border-slate-800 transition">
                    <div>
                      <span className="font-extrabold text-xs text-slate-200">AAPL</span>
                      <span className="text-[8px] text-slate-500 block font-semibold">150 Shares Held</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-300 font-mono-numbers">$26,325.00</div>
                      <div className="text-[8px] font-bold text-emerald-400 font-mono-numbers">+8.4%</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-950/80 border border-slate-900 px-3 py-2.5 rounded-xl hover:border-slate-800 transition">
                    <div>
                      <span className="font-extrabold text-xs text-slate-200">TSLA</span>
                      <span className="text-[8px] text-slate-500 block font-semibold">50 Shares Held</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-300 font-mono-numbers">$8,620.00</div>
                      <div className="text-[8px] font-bold text-red-400 font-mono-numbers">-4.1%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-900 pt-4 mt-6">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-950 p-2 border border-slate-900 rounded-xl">
                    <span className="text-[8px] font-bold text-slate-600 uppercase">Win Rate</span>
                    <div className="text-xs font-black text-emerald-400 mt-0.5">82.5%</div>
                  </div>
                  <div className="bg-slate-950 p-2 border border-slate-900 rounded-xl">
                    <span className="text-[8px] font-bold text-slate-600 uppercase">Score</span>
                    <div className="text-xs font-black text-slate-200 mt-0.5 font-mono-numbers">845</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- FEATURES GRID SEGMENT (`#features`) --- */}
      <section id="features" className="py-24 max-w-7xl mx-auto w-full px-6 z-10 relative border-t border-slate-900/40 scroll-mt-20">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-extrabold uppercase text-emerald-400 tracking-wider glow-emerald">
            <Shield size={10} />
            <span>Commercial-Ready Toolkit</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">Pro Trading Terminals Included</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">
            Full client presentation sandbox featuring real-world integration interfaces out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: Activity, title: 'Live Real-Time Quotes', desc: 'Real-time stock prices are fetched continuously from live world feeds. Execute trades, shorts, and margins with exact physical accuracy.' },
            { icon: Shield, title: '$100,000 Virtual Capital', desc: 'Build investment confidence entirely risk-free. Trade, manage simulated margins, short sell, and test aggressive models safely.' },
            { icon: Target, title: 'Dynamic Price Targets', desc: 'Establish exact boundary thresholds. Get live in-app notifications and email alerts the second an asset crosses your trigger price.' },
            { icon: Award, title: 'Achievement Badges', desc: 'Perform specialized achievements (consecutive trade wins, sector diversification, raw return milestones) to unlock medals.' },
            { icon: MessageSquare, title: 'Follow Trader Feed', desc: 'Inspect public trader profiles, audit active holdings, and monitor transactions in a live follow feed.' },
            { icon: BarChart3, title: 'Advanced Performance Analytics', desc: 'Analyze equity growth bars, P&L yield averages, sector weights, and evaluate your customized Trader Score.' }
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="glass-card rounded-2xl border-slate-900/60 p-6 flex flex-col gap-3 shadow-md hover:border-slate-800 hover:shadow-cyan-500/5 transition-all duration-300 relative group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-tr from-cyan-500/0 to-cyan-500/5 rounded-bl-full pointer-events-none" />
                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow shadow-cyan-500/5 group-hover:border-slate-700 transition">
                  <Icon size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-200 mt-2">{feat.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- HOW IT WORKS / TIMELINE SEGMENT (`#platform-tour`) --- */}
      <section id="platform-tour" className="py-24 max-w-5xl mx-auto w-full px-6 z-10 relative border-t border-slate-900/40 scroll-mt-20">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-extrabold uppercase text-cyan-400 tracking-wider glow-cyan">
            <Star size={10} />
            <span>A Three-Step Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">Interactive Platform Walkthrough</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">
            Learn how the sandbox guides student scholars from starting capital to advanced trader statistics.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-800 transition duration-300 glow-indigo">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md uppercase tracking-wider">Step 01</span>
              <h4 className="text-md font-bold text-slate-200 mt-5">Fund & Research</h4>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-medium">
                Log in to instantly receive **$100,000** in virtual currency. Use the **Spotlight Command Bar (⌘K)** to research leading stocks, read live updates, and analyze historical OHLC curves.
              </p>
            </div>
            <div className="border-t border-slate-900 pt-4 mt-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Live quotes matched 24/7
            </div>
          </div>

          <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-800 transition duration-300 glow-cyan">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-md uppercase tracking-wider">Step 02</span>
              <h4 className="text-md font-bold text-slate-200 mt-5">Configure Target Alerts</h4>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-medium">
                Execute trade buys and sells with dynamic margin bars. Configure customized **Target Price Alerts** that trigger in background threads, alerting you with email coordinates.
              </p>
            </div>
            <div className="border-t border-slate-900 pt-4 mt-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Background alert monitoring
            </div>
          </div>

          <div className="glass-card rounded-2xl border-slate-900 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-800 transition duration-300 glow-violet">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <span className="text-[10px] font-mono font-black text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-md uppercase tracking-wider">Step 03</span>
              <h4 className="text-md font-bold text-slate-200 mt-5">Compete & Analyze</h4>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed font-medium">
                Unlock achievements to display badges. Follow fellow participants, inspect transactions, and audit your equity progress using detailed sector analytics dashboards.
              </p>
            </div>
            <div className="border-t border-slate-900 pt-4 mt-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Performance statistics profiles
            </div>
          </div>
        </div>
      </section>

      {/* --- GLOBAL LEADERBOARD PODIUM PREVIEW (`#leaderboard-preview`) --- */}
      <section id="leaderboard-preview" className="py-24 max-w-5xl mx-auto w-full px-6 z-10 relative border-t border-slate-900/40 scroll-mt-20">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-extrabold uppercase text-emerald-400 tracking-wider glow-emerald">
            <Users size={10} />
            <span>Simulated Competition</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">Active Scholar Standing Board</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">
            Climb standings and inspect top-performing scholar portfolios from educational networks.
          </p>
        </div>

        {/* Podium Layout */}
        <div className="glass-card rounded-3xl border-slate-900 shadow-2xl p-6 bg-slate-950/80 backdrop-blur-md glow-cyan">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-900 pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pl-3">Rank</th>
                  <th className="pb-3">Trader</th>
                  <th className="pb-3">Institutional Domain</th>
                  <th className="pb-3 text-right">Yield Return</th>
                  <th className="pb-3 text-right">Trader Score</th>
                  <th className="pb-3 text-right pr-3">Achievement Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {LEADERBOARD_PREVIEW.map((trader) => (
                  <tr key={trader.rank} className="hover:bg-slate-900/20 transition-colors text-xs font-semibold text-slate-300">
                    <td className="py-4 pl-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black font-mono-numbers ${
                        trader.rank === 1 
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                          : trader.rank === 2
                          ? 'bg-slate-300/10 text-slate-300 border border-slate-300/20'
                          : 'bg-amber-600/10 text-amber-500 border border-amber-600/20'
                      }`}>
                        {trader.rank === 1 ? '🥇' : trader.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={trader.avatar} 
                          alt={trader.name} 
                          className="w-8 h-8 rounded-full border border-slate-800 object-cover" 
                        />
                        <div>
                          <div className="font-bold text-slate-200">{trader.name}</div>
                          <div className="text-[9px] text-slate-500 font-semibold">{trader.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-slate-400">
                      {trader.email.split('@')[1]}
                    </td>
                    <td className="py-4 text-right text-emerald-400 font-bold font-mono-numbers">
                      {trader.yield}
                    </td>
                    <td className="py-4 text-right font-black font-mono-numbers text-slate-200">
                      {trader.score}
                    </td>
                    <td className="py-4 text-right pr-3">
                      <span className="text-[10px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full">
                        {trader.badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --- CTA END BLOCK --- */}
      <section className="py-16 max-w-5xl mx-auto w-full px-6 text-center z-10 relative scroll-mt-20">
        <div className="glass-card rounded-3xl border-emerald-500/15 bg-gradient-to-tr from-emerald-950/20 to-slate-900/40 p-8 md:p-14 shadow-2xl relative overflow-hidden glow-emerald">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full filter blur-[35px] pointer-events-none" />
          
          <h2 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight leading-tight mb-5">
            Ready to master stock simulation?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed mb-10 font-semibold">
            Create your premium practice terminal in under 30 seconds. Professional Single Sign-On handles Google & GitHub login parameters cleanly, offering dedicated sandbox environments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xs px-8 py-4 rounded-xl transition duration-300 shadow-lg shadow-cyan-500/10"
            >
              <span>Create Free Account</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-extrabold text-xs px-8 py-4 rounded-xl transition"
            >
              <span>Sign In to Terminal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-900 px-6 max-w-7xl mx-auto w-full py-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-bold z-10 relative gap-4">
        <span>© {new Date().getFullYear()} StockSim. Complete commercial client presentation sandbox.</span>
        <div className="flex gap-6">
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Use</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Security Audit</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Developer Portal</span>
        </div>
      </footer>
    </div>
  );
}
