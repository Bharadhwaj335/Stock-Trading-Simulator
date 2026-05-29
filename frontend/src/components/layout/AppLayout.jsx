import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, TrendingUp, Briefcase, BarChart3,
  Trophy, Bell, User, Settings, LogOut, DollarSign,
  Star, Newspaper, Search, ChevronLeft, ChevronRight,
  Sparkles
} from 'lucide-react';
import { useWalletSocket, useAlertSocket, getSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';
import SpotlightSearch from '../ui/SpotlightSearch';
import MarketTicker from '../ui/MarketTicker';

const NAV = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/market',      label: 'Market',      icon: TrendingUp },
  { to: '/portfolio',   label: 'Portfolio',   icon: Briefcase },
  { to: '/watchlist',   label: 'Watchlist',   icon: Star },
  { to: '/news',        label: 'News Feed',   icon: Newspaper },
  { to: '/analytics',   label: 'Analytics',   icon: BarChart3 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/alerts',      label: 'Alerts',      icon: Bell },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);

  // Apply user color theme selection globally on mount/update
  useEffect(() => {
    if (user?.theme) {
      const root = document.documentElement;
      root.classList.remove('theme-sunset', 'theme-ocean');
      if (user.theme === 'Neon Sunset') {
        root.classList.add('theme-sunset');
      } else if (user.theme === 'Ocean Slate') {
        root.classList.add('theme-ocean');
      }
    }
  }, [user?.theme]);

  // Check market open hours (NYSE EST Mon-Fri 9:30am - 4:00pm)
  useEffect(() => {
    const checkMarket = () => {
      const now = new Date();
      const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = estDate.getDay();
      if (day === 0 || day === 6) {
        setMarketOpen(false);
        return;
      }
      const hours = estDate.getHours();
      const minutes = estDate.getMinutes();
      const time = hours * 60 + minutes;
      setMarketOpen(time >= 9 * 60 + 30 && time < 16 * 60);
    };

    checkMarket();
    const interval = setInterval(checkMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  // Listen for Cmd+K / Ctrl+K search shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for wallet socket updates
  useWalletSocket(() => {});

  // Listen for triggered alert toasts
  useAlertSocket((data) => {
    toast.success(
      <div className="flex flex-col gap-0.5">
        <div className="font-bold text-slate-100 flex items-center gap-1.5">
          <span>🔔 Price Target Reached!</span>
        </div>
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-emerald-400">{data.symbol}</span> has hit your target of <span className="font-semibold text-slate-100">${data.targetPrice?.toFixed(2)}</span>
        </div>
      </div>,
      { duration: 6000 }
    );
  });

  // Listen for real-time badge rewards
  useEffect(() => {
    const sock = getSocket();
    const handler = ({ badge }) => {
      toast.success(
        <div className="flex flex-col gap-1 text-slate-100">
          <div className="flex items-center gap-2 font-extrabold text-sm">
            <span className="text-xl animate-bounce">{badge.emoji}</span>
            <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">ACHIEVEMENT UNLOCKED!</span>
          </div>
          <div className="text-xs font-bold text-emerald-400">{badge.label}</div>
          <div className="text-[10px] text-slate-400 leading-normal">{badge.description}</div>
        </div>,
        { duration: 7000 }
      );
    };

    sock.on('badge_earned', handler);
    return () => {
      sock.off('badge_earned', handler);
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Compute page titles dynamically
  const activeNavItem = NAV.find((n) => n.to === location.pathname);
  const pageTitle = activeNavItem ? activeNavItem.label : 'Fintech Trading Terminal';

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans bg-mesh-cyber">
      {/* Sidebar Container */}
      <aside
        className={`flex-shrink-0 bg-slate-900/60 border-r border-slate-900/80 flex flex-col transition-all duration-300 ease-in-out relative z-40 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Arrow Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 w-6 h-6 bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors z-50 shadow-md"
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Sidebar Header / Logo */}
        <div className={`p-6 border-b border-slate-900/60 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <img src="/favicon.jpg" alt="StockSim Logo" className="w-8 h-8 rounded-xl object-cover shadow-lg shadow-emerald-500/20" />
            {!isCollapsed && (
              <span className="text-md font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
                StockSim
              </span>
            )}
          </div>
        </div>

        {/* Market Status Pill */}
        {!isCollapsed && (
          <div className="px-6 py-2 border-b border-slate-900/30 space-y-1.5">
            {/* Simulation Pulse */}
            <div className="flex items-center justify-center gap-2 px-2.5 py-1 rounded-lg text-[9px] font-black border bg-emerald-500/5 border-emerald-500/20 text-emerald-400 tracking-wider relative">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
              <span>SIMULATOR ACTIVE 24/7</span>
            </div>
            {/* Physical Market Status */}
            <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
              <span className={`w-1 h-1 rounded-full ${marketOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>NYSE state: {marketOpen ? 'open' : 'closed'}</span>
            </div>
          </div>
        )}

        {/* Wallet Balance box */}
        <div className={`mx-4 mt-4 p-3 bg-slate-950/40 border border-slate-900/80 rounded-xl flex flex-col relative overflow-hidden backdrop-blur-md ${
          isCollapsed ? 'items-center px-1' : ''
        }`}>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
            <DollarSign size={11} className="text-emerald-500" />
            {!isCollapsed && <span>Cash Balance</span>}
          </div>
          <div className={`font-mono-numbers font-bold text-slate-100 ${isCollapsed ? 'text-[11px]' : 'text-md bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent'}`}>
            {isCollapsed ? '$30K' : `$${user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </div>

          {/* Mini Sparkline SVG visual just to wow clients */}
          {!isCollapsed && (
            <div className="absolute right-2 bottom-1.5 w-14 h-6 opacity-30">
              <svg viewBox="0 0 50 20" className="w-full h-full stroke-emerald-400 fill-none stroke-[1.5]">
                <path d="M 0 15 Q 10 5, 20 12 T 40 3 T 50 10" />
              </svg>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 mt-4 overflow-y-auto scrollbar-none">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isCollapsed ? 'justify-center relative' : ''
                } ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-2.5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                }`
              }
            >
              <Icon size={18} className="transition-transform group-hover:scale-105 flex-shrink-0" />
              {!isCollapsed && <span>{label}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-800 whitespace-nowrap shadow-xl z-50">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Bottom Profile */}
        <div className="p-3 border-t border-slate-900/60 space-y-1">
          <NavLink
            to="/profile"
            className={`flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-900/40 rounded-xl group relative ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="User Avatar" className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-slate-800" />
            ) : (
              <User size={18} className="flex-shrink-0" />
            )}
            {!isCollapsed && <span className="font-semibold truncate">{user?.username}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-800 whitespace-nowrap z-50">
                My Profile (@{user?.username})
              </div>
            )}
          </NavLink>

          <NavLink
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-900/40 rounded-xl group relative ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <Settings size={18} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold">Settings</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-800 whitespace-nowrap z-50">
                Settings
              </div>
            )}
          </NavLink>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl group relative transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold">Logout</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-800 whitespace-nowrap z-50">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Outer Workspace Panel */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Spotlight Command Modal */}
        <SpotlightSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        {/* Global Live Market scrolling strip */}
        <MarketTicker />

        {/* Top Header Command Bar */}
        <header className="h-14 border-b border-slate-900/60 flex items-center justify-between px-8 bg-slate-950/45 backdrop-blur-md sticky top-0 z-30">
          {/* Page title */}
          <div>
            <h1 className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              {pageTitle}
            </h1>
          </div>

          {/* Search Trigger */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-3 px-3 py-1.5 w-64 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-800 text-slate-500 hover:text-slate-400 cursor-pointer select-none transition-all"
          >
            <Search size={14} className="flex-shrink-0 text-slate-500" />
            <span className="text-xs font-semibold">Search terminal...</span>
            <kbd className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-mono border border-slate-800/40 text-slate-400">
              ⌘K
            </kbd>
          </div>

          {/* User notifications bell and profile indicators */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/alerts')}
              className="p-2 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all relative"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>

            {/* Micro User Panel details */}
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 pl-2 py-1 pr-3.5 rounded-full bg-slate-900/40 border border-slate-900 hover:border-slate-800/80 hover:bg-slate-900 cursor-pointer select-none transition-all"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="User avatar" className="w-6 h-6 rounded-full object-cover border border-slate-800 shadow" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 text-white flex items-center justify-center text-[10px] font-bold border border-emerald-400/20">
                  {user?.username?.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-200 leading-tight">@{user?.username}</span>
                <span className="text-[8px] font-extrabold text-emerald-400 tracking-wider">LEVEL 1 TRADER</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
