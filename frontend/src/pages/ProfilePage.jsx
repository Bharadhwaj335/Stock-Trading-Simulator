import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  User, Mail, Calendar, Eye, EyeOff, 
  Users, TrendingUp, DollarSign, UserMinus, RefreshCw,
  Award, Trophy, ShieldCheck, TrendingDown, Clock, Activity
} from 'lucide-react';
import { userService, leaderboardService, analyticsService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const FRONTEND_BADGES = {
  first_trade: { label: 'First Trade', emoji: '🎯', description: 'Executed your very first trade!' },
  first_profit: { label: 'First Profit', emoji: '💰', description: 'Closed a trade with positive earnings!' },
  ten_trades: { label: 'Active Trader', emoji: '🔟', description: 'Executed 10 or more trades!' },
  win_streak: { label: 'Hot Streak', emoji: '🔥', description: 'Achieved 5 winning trades in a row!' },
  diversified: { label: 'Diversified', emoji: '🌐', description: 'Traded at least 5 different stock symbols!' },
  big_win: { label: 'Big Winner', emoji: '🚀', description: 'Earned over $1,000 in a single trade!' },
  loss_recovery: { label: 'Comeback Kid', emoji: '💪', description: 'Fully recovered to net positive after a loss of over $500!' }
};

export default function ProfilePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('following');
  const updateUser = useAuthStore(s => s.updateUser);

  // Queries
  const { data: profile, isLoading: isProfileLoading, refetch } = useQuery(
    'myProfile', 
    () => userService.getMe().then(r => r.data),
    { refetchOnWindowFocus: false }
  );

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery(
    'myAnalytics',
    () => analyticsService.get().then(r => r.data || r),
    { refetchOnWindowFocus: false }
  );

  // Mutations
  const unfollowMutation = useMutation(
    (userId) => leaderboardService.follow(userId),
    {
      onSuccess: () => {
        toast.success('Unfollowed successfully');
        qc.invalidateQueries('myProfile');
        qc.invalidateQueries('leaderboard');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Action failed');
      }
    }
  );

  const toggleVisibilityMutation = useMutation(
    (isPublic) => userService.updateMe({ isPublic }),
    {
      onSuccess: (res) => {
        toast.success(res.data.isPublic ? 'Portfolio is now Public' : 'Portfolio is now Private');
        updateUser({ isPublic: res.data.isPublic });
        qc.invalidateQueries('myProfile');
        qc.invalidateQueries('leaderboard');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to update visibility');
      }
    }
  );

  if (isProfileLoading || isAnalyticsLoading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 bg-slate-900 rounded-lg w-1/4"></div>
        <div className="h-44 bg-slate-900 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-900 rounded-xl"></div>
          <div className="h-24 bg-slate-900 rounded-xl"></div>
          <div className="h-24 bg-slate-900 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const followers = profile?.followers || [];
  const following = profile?.following || [];
  const isPublic = profile?.isPublic;
  const netWorth = (profile?.walletBalance || 0) + (profile?.portfolioValue || 0);
  const summary = analytics?.summary || {};

  const joinedDate = profile?.createdAt ? new Date(profile.createdAt) : new Date();
  const daysActive = Math.max(1, Math.ceil((new Date() - joinedDate) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <User size={24} className="text-emerald-400 animate-pulse" />
            Trader Terminal Profile
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage your public presence, unlock badges, and analyze simulator performance.</p>
        </div>
        <button 
          onClick={() => {
            refetch();
            qc.invalidateQueries('myAnalytics');
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-900 hover:border-slate-800 hover:bg-slate-800/80 text-slate-300 px-4 py-2 rounded-xl transition text-xs font-bold"
        >
          <RefreshCw size={13} className="text-emerald-400" />
          Sync Data
        </button>
      </div>

      {/* Main card */}
      <div className="glass-card rounded-2xl border-slate-900/85 p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-slate-950 flex items-center justify-center font-black text-2xl uppercase text-slate-300 border border-slate-900 shadow-2xl flex-shrink-0 relative">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              profile?.username.substring(0, 2)
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-xs font-extrabold border border-slate-950">
              #{profile?.rank || '—'}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-100">@{profile?.username}</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-1.5 text-xs text-slate-500 justify-center md:justify-start font-semibold">
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-slate-600" />
                  {profile?.email}
                </span>
                <span className="hidden sm:inline text-slate-800">•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-600" />
                  Joined {joinedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1.5 justify-center md:justify-start">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black border ${
                isPublic 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {isPublic ? <Eye size={11} /> : <EyeOff size={11} />}
                {isPublic ? 'PUBLIC PROFILE' : 'PRIVATE PROFILE'}
              </span>
              <button
                onClick={() => toggleVisibilityMutation.mutate(!isPublic)}
                disabled={toggleVisibilityMutation.isLoading}
                className="text-[10px] bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 font-extrabold px-3 py-1 rounded-lg transition-all"
              >
                Toggle to {isPublic ? 'Private' : 'Public'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card border-slate-900/80 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shadow-inner">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Total Net Worth</p>
            <p className="text-lg font-black text-slate-200 mt-0.5 font-mono-numbers">
              ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="glass-card border-slate-900/80 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className={`p-3 rounded-xl shadow-inner ${
            (profile?.totalPnL || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">All-Time Returns</p>
            <p className={`text-lg font-black mt-0.5 font-mono-numbers ${(profile?.totalPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(profile?.totalPnL || 0) >= 0 ? '+' : ''}${(profile?.totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="glass-card border-slate-900/80 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 shadow-inner">
            <Users size={18} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Follower Network</p>
            <p className="text-lg font-black text-slate-200 mt-0.5 font-mono-numbers">
              {followers.length} <span className="text-slate-500 text-[11px] font-bold">Followers</span> / {following.length} <span className="text-slate-500 text-[11px] font-bold">Following</span>
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Achievements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Achievements Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl border-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Unlocked Achievements</h3>
            </div>

            {(!profile?.badges || profile.badges.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-xs font-bold bg-slate-950/20 border border-slate-950 rounded-xl">
                🎯 No achievements unlocked yet. Execute trades to earn simulator badges!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Object.entries(FRONTEND_BADGES).map(([bId, info]) => {
                  const isUnlocked = profile?.badges?.includes(bId);
                  return (
                    <div 
                      key={bId} 
                      className={`flex gap-3.5 p-3.5 rounded-xl border transition-all ${
                        isUnlocked 
                          ? 'bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/25' 
                          : 'bg-slate-950/40 border-slate-950 opacity-40 grayscale'
                      }`}
                    >
                      <span className="text-2xl mt-0.5 select-none">{info.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs font-black truncate ${isUnlocked ? 'text-slate-200' : 'text-slate-500'}`}>{info.label}</h4>
                          {isUnlocked ? (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">Active</span>
                          ) : (
                            <span className="text-[8px] bg-slate-950 text-slate-600 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">Locked</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-bold">{info.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Core Trading Stats Column */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl border-slate-900 p-6 shadow-2xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
                <ShieldCheck size={16} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Terminal Statistics</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-950/40 border border-slate-950 rounded-xl p-3">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Total Trades</span>
                  <span className="text-base font-black text-slate-200 mt-1 font-mono-numbers flex items-center gap-1">
                    <Activity size={12} className="text-cyan-400" />
                    {summary?.totalTrades || 0}
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-950 rounded-xl p-3">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Win Rate</span>
                  <span className="text-base font-black text-emerald-400 mt-1 font-mono-numbers">
                    {summary?.winRate ? `${summary.winRate}%` : '0%'}
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-950 rounded-xl p-3 col-span-2">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Profit Factor</span>
                  <span className="text-sm font-extrabold text-slate-200 mt-1 font-mono-numbers">
                    {summary?.profitFactor ? summary.profitFactor.toFixed(2) : '—'}
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-950 rounded-xl p-3 col-span-2">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Best Trade PnL</span>
                  <span className="text-xs font-extrabold text-emerald-400 mt-1 truncate block font-mono-numbers">
                    {summary?.bestTrade ? `+${summary.bestTrade.symbol} ($${summary.bestTrade.pnl.toFixed(2)})` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-950 rounded-xl p-3">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Avg Hold Time</span>
                  <span className="text-xs font-extrabold text-slate-300 mt-1 font-mono-numbers flex items-center gap-1">
                    <Clock size={11} className="text-slate-500" />
                    {summary?.avgHoldingDays ? `${summary.avgHoldingDays}D` : '—'}
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-950 rounded-xl p-3">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Days Active</span>
                  <span className="text-xs font-extrabold text-slate-300 mt-1 font-mono-numbers">
                    {daysActive} Days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs for following / followers */}
      <div className="border-b border-slate-900 pt-4">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('following')}
            className={`pb-3 font-extrabold text-xs tracking-widest uppercase transition relative ${
              activeTab === 'following' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Following ({following.length})
            {activeTab === 'following' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('followers')}
            className={`pb-3 font-extrabold text-xs tracking-widest uppercase transition relative ${
              activeTab === 'followers' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Followers ({followers.length})
            {activeTab === 'followers' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Connection Lists */}
      <div className="glass-card rounded-2xl border-slate-900 overflow-hidden p-6 shadow-xl">
        {activeTab === 'following' ? (
          <div>
            {following.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-8 font-bold">You aren't following any simulator participants yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fadeIn">
                {following.map((f) => (
                  <div key={f._id} className="bg-slate-950/40 border border-slate-950 rounded-xl p-4 flex items-center justify-between hover:border-slate-800 hover:bg-slate-900/10 transition duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center font-black text-xs uppercase text-slate-400 border border-slate-800 overflow-hidden">
                        {f.avatar ? (
                          <img src={f.avatar} alt={f.username} className="w-full h-full object-cover" />
                        ) : (
                          f.username.substring(0, 2)
                        )}
                      </div>
                      <span className="font-extrabold text-slate-200 text-xs">@{f.username}</span>
                    </div>
                    <button
                      onClick={() => unfollowMutation.mutate(f._id)}
                      disabled={unfollowMutation.isLoading}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Unfollow User"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {followers.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-8 font-bold">No simulator participants are following your profile yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fadeIn">
                {followers.map((f) => (
                  <div key={f._id} className="bg-slate-950/40 border border-slate-950 rounded-xl p-4 flex items-center gap-3 hover:border-slate-800 hover:bg-slate-900/10 transition duration-300">
                    <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center font-black text-xs uppercase text-slate-400 border border-slate-800 overflow-hidden">
                      {f.avatar ? (
                        <img src={f.avatar} alt={f.username} className="w-full h-full object-cover" />
                      ) : (
                        f.username.substring(0, 2)
                      )}
                    </div>
                    <span className="font-extrabold text-slate-200 text-xs">@{f.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
