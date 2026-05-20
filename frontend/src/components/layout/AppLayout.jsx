import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, TrendingUp, Briefcase, BarChart3,
  Trophy, Bell, User, Settings, LogOut, DollarSign
} from 'lucide-react';
import { useWalletSocket, useAlertSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/market',      label: 'Market',      icon: TrendingUp },
  { to: '/portfolio',   label: 'Portfolio',   icon: Briefcase },
  { to: '/analytics',   label: 'Analytics',   icon: BarChart3 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/alerts',      label: 'Alerts',      icon: Bell },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useWalletSocket(() => {});
  useAlertSocket(data => {
    toast.success(`🔔 Alert: ${data.symbol} hit $${data.targetPrice}`, { duration: 5000 });
  });

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">StockSim</span>
          </div>
        </div>

        {/* Wallet */}
        <div className="mx-4 mt-4 p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <DollarSign size={12} /> Cash Balance
          </div>
          <div className="text-emerald-400 font-bold text-lg">
            ${user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 mt-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <NavLink to="/profile"  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg">
            <User size={18} /> {user?.username}
          </NavLink>
          <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg">
            <Settings size={18} /> Settings
          </NavLink>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
