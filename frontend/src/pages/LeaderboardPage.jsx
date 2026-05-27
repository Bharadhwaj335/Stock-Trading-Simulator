import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Trophy, UserCheck, UserPlus, Search, 
  ChevronLeft, ChevronRight, Star, RefreshCw, 
  MessageSquare, Sparkles, User, AlertCircle
} from 'lucide-react';
import { leaderboardService, userService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import Skeleton from '../components/ui/Skeleton';

export default function LeaderboardPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  
  const [activeTab, setActiveTab] = useState('rankings'); // 'rankings', 'social', 'weekly'
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Get current user's profile to see who they follow
  const { data: profile, refetch: refetchProfile } = useQuery(
    'myProfile', 
    () => userService.getMe().then(r => r.data),
    { refetchOnWindowFocus: false }
  );

  // 2. Fetch Rankings
  const { 
    data: leaderboardData, 
    isLoading: isLeaderboardLoading,
    refetch: refetchLeaderboard 
  } = useQuery(
    ['leaderboard', page], 
    () => leaderboardService.get(page),
    { 
      refetchOnWindowFocus: false,
      keepPreviousData: true 
    }
  );

  // 3. Fetch Social Feed
  const { 
    data: socialFeed, 
    isLoading: isFeedLoading,
    refetch: refetchFeed 
  } = useQuery(
    'leaderboard-feed', 
    () => leaderboardService.getFeed(),
    { 
      enabled: activeTab === 'social',
      refetchOnWindowFocus: false 
    }
  );

  // 4. Fetch Weekly Rankings
  const { 
    data: weeklyData, 
    isLoading: isWeeklyLoading,
    refetch: refetchWeekly 
  } = useQuery(
    'leaderboard-weekly', 
    () => leaderboardService.getWeekly(),
    { 
      enabled: activeTab === 'weekly',
      refetchOnWindowFocus: false 
    }
  );

  // Follow/Unfollow Mutation
  const followMutation = useMutation(
    (userId) => leaderboardService.follow(userId),
    {
      onSuccess: (res) => {
        toast.success(res.following ? 'Trader followed!' : 'Trader unfollowed');
        qc.invalidateQueries('myProfile');
        qc.invalidateQueries(['leaderboard', page]);
        qc.invalidateQueries('leaderboard-feed');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Action failed');
      }
    }
  );

  const handleRefresh = () => {
    refetchProfile();
    refetchLeaderboard();
    if (activeTab === 'social') refetchFeed();
    if (activeTab === 'weekly') refetchWeekly();
  };

  const myFollowingIds = (profile?.following || []).map(f => f._id || f);
  const users = leaderboardData?.users || [];
  const totalPages = leaderboardData?.pages || 1;

  // Filter users by search term
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find current user's rank
  const myRankInfo = users.find(u => u._id === currentUser?.id);

  // Split top 3 podium from the rest of the table
  const podiumTraders = page === 1 ? users.slice(0, 3) : [];
  const tableTraders = page === 1 ? users.slice(3) : users;

  const getPodiumOrder = (items) => {
    if (items.length < 2) return items;
    if (items.length === 2) return [items[1], items[0]]; // 2nd, 1st
    return [items[1], items[0], items[2]]; // 2nd, 1st, 3rd
  };

  const formattedPodium = getPodiumOrder(podiumTraders);

  const getPodiumColors = (rank) => {
    if (rank === 1) return { border: 'border-yellow-500/40', text: 'text-yellow-400', label: '1st Place', bg: 'bg-yellow-500/5', shadow: 'shadow-yellow-500/5', emoji: '👑' };
    if (rank === 2) return { border: 'border-slate-300/40', text: 'text-slate-300', label: '2nd Place', bg: 'bg-slate-300/5', shadow: 'shadow-slate-300/5', emoji: '🥈' };
    return { border: 'border-amber-600/40', text: 'text-amber-500', label: '3rd Place', bg: 'bg-amber-600/5', shadow: 'shadow-amber-500/5', emoji: '🥉' };
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Trophy className="text-yellow-500 w-6 h-6 flex-shrink-0 animate-bounce" />
            StockSim Leaderboards
          </h1>
          <p className="text-xs text-slate-400 mt-1">See how you measure up against top performers in our simulated ecosystem.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition text-xs font-bold self-start sm:self-auto"
        >
          <RefreshCw size={13} />
          Refresh Standings
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-900/60 pb-px">
        {[
          { id: 'rankings', label: 'Global Rankings', icon: Trophy },
          { id: 'social', label: 'Social Feed', icon: MessageSquare },
          { id: 'weekly', label: 'Weekly Performers', icon: Sparkles }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-xs transition-colors -mb-px ${
                isActive
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Global Rankings */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          {/* User Rank Callout */}
          {myRankInfo && (
            <div className="glass-card rounded-2xl border-emerald-500/20 p-4 bg-emerald-500/5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  🏆
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Your Current Standing</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    You are ranked <span className="text-emerald-400 font-extrabold">#{myRankInfo.rank}</span> globally with a net worth of <span className="text-slate-100 font-semibold">${((myRankInfo.walletBalance ?? 0) + (myRankInfo.portfolioValue ?? 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 visual podium */}
          {page === 1 && !isLeaderboardLoading && formattedPodium.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 max-w-4xl mx-auto">
              {formattedPodium.map((u) => {
                const colors = getPodiumColors(u.rank);
                const is1st = u.rank === 1;
                const isMe = u._id === currentUser?.id;
                const isFollowing = myFollowingIds.includes(u._id);
                const netWorth = (u.walletBalance || 0) + (u.portfolioValue || 0);

                return (
                  <div
                    key={u._id}
                    className={`glass-card rounded-2xl border ${colors.border} ${colors.bg} p-6 flex flex-col items-center text-center shadow-xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                      is1st ? 'md:py-10 md:translate-y-[-10px] glow-emerald' : 'py-7'
                    }`}
                  >
                    {/* Floating medal badge */}
                    <div className="absolute top-4 left-4 text-sm font-black select-none">
                      {colors.emoji}
                    </div>

                    {/* Trader Avatar */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-black border-2 relative ${
                      is1st ? 'border-yellow-500' : 'border-slate-700'
                    }`}>
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="text-slate-300">{u.username.substring(0, 2).toUpperCase()}</div>
                      )}
                      {is1st && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg animate-bounce">👑</span>
                      )}
                    </div>

                    {/* Trader username */}
                    <h3 className="text-sm font-extrabold text-slate-100 mt-4 flex items-center gap-1.5 justify-center">
                      <Link to={`/traders/${u.username}`} className="hover:text-emerald-400 transition-colors">
                        @{u.username}
                      </Link>
                      {isMe && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 rounded border border-emerald-500/15">YOU</span>
                      )}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{colors.label}</span>

                    {/* Net worth */}
                    <div className="font-mono-numbers text-md font-extrabold text-slate-200 mt-4">
                      ${netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Net Worth Value</span>

                    {/* Profit return */}
                    <div className={`text-xs font-bold font-mono-numbers mt-3 flex items-center gap-1 ${
                      u.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      <span>{u.totalPnL >= 0 ? '+' : ''}${u.totalPnL?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                      <span>({u.totalPnLPercent?.toFixed(2)}%)</span>
                    </div>

                    {/* Follow CTA */}
                    {!isMe && (
                      <button
                        onClick={() => followMutation.mutate(u._id)}
                        disabled={followMutation.isLoading}
                        className={`mt-5 text-[10px] font-extrabold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow ${
                          isFollowing
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                            : 'bg-slate-950 text-slate-300 hover:bg-slate-900 border border-slate-800'
                        }`}
                      >
                        {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                        {isFollowing ? 'Following' : 'Follow Pro'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Search bar & tool strip */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search standings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-9 pr-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
            <div className="text-[10px] text-slate-400 md:ml-auto flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-900/60 font-semibold uppercase tracking-wider">
              <Star size={11} className="text-yellow-400 fill-yellow-400" />
              <span>Rankings calculate globally based on closed realized trade records.</span>
            </div>
          </div>

          {/* Table list */}
          <div className="glass-card rounded-2xl border-slate-900 overflow-hidden shadow-xl">
            {isLeaderboardLoading ? (
              <div className="p-12 text-center">
                <Skeleton className="h-40 w-full animate-pulse" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-semibold">
                No traders found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <th className="py-4 px-6">Rank</th>
                      <th className="py-4 px-6">Trader Name</th>
                      <th className="py-4 px-6 text-right">Cash Balance</th>
                      <th className="py-4 px-6 text-right">Positions Val</th>
                      <th className="py-4 px-6 text-right">Net Worth</th>
                      <th className="py-4 px-6 text-right">Lifetime Return</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-xs">
                    {tableTraders.map((u) => {
                      const isMe = u._id === currentUser?.id;
                      const isFollowing = myFollowingIds.includes(u._id);
                      const netWorth = (u.walletBalance || 0) + (u.portfolioValue || 0);
                      const pnlPos = (u.totalPnL || 0) >= 0;

                      return (
                        <tr 
                          key={u._id} 
                          className={`transition duration-300 ${
                            isMe ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-900/30'
                          }`}
                        >
                          <td className="py-4 px-6 font-mono-numbers font-black text-slate-400 text-sm">
                            #{u.rank}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase bg-slate-900 border border-slate-800 text-slate-400 overflow-hidden flex-shrink-0">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                                ) : (
                                  u.username.substring(0, 2)
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                                  <Link to={`/traders/${u.username}`}>{u.username}</Link>
                                  {isMe && (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1.5 rounded border border-emerald-500/20">
                                      YOU
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right text-slate-400 font-mono-numbers font-medium">
                            ${(u.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-400 font-mono-numbers font-medium">
                            ${(u.portfolioValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-200 font-mono-numbers font-extrabold">
                            ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 px-6 text-right font-mono-numbers font-extrabold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                            <div>{pnlPos ? '+' : ''}${(u.totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="text-[10px] font-semibold">{pnlPos ? '+' : ''}{(u.totalPnLPercent || 0).toFixed(2)}%</div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {isMe ? (
                              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">N/A</span>
                            ) : (
                              <button
                                onClick={() => followMutation.mutate(u._id)}
                                disabled={followMutation.isLoading}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all ${
                                  isFollowing
                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow'
                                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                {isFollowing ? <UserCheck size={11} /> : <UserPlus size={11} />}
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {!isLeaderboardLoading && totalPages > 1 && (
              <div className="bg-slate-950/40 border-t border-slate-900 p-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Social Feed */}
      {activeTab === 'social' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="glass-card rounded-2xl border-slate-900 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200 mb-1">Followed Traders Feed</h2>
            <p className="text-[10px] text-slate-500 font-semibold mb-6">Recent transaction logs from the traders you follow</p>

            {isFeedLoading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full animate-pulse" />)}
              </div>
            ) : !socialFeed || socialFeed.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs font-semibold flex flex-col items-center gap-3">
                <AlertCircle className="w-8 h-8 text-slate-700" />
                <span>You aren't following anyone yet, or your followed users haven't made any trades.</span>
                <button 
                  onClick={() => setActiveTab('rankings')}
                  className="mt-2 text-emerald-400 font-bold hover:underline"
                >
                  Follow Traders from rankings →
                </button>
              </div>
            ) : (
              <div className="relative border-l border-slate-900/60 pl-6 ml-2 space-y-6">
                {socialFeed.map((t) => {
                  const isBuy = t.type === 'buy';
                  const dateObj = new Date(t.createdAt);
                  const formattedTime = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={t._id} className="relative group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border border-slate-950 flex-shrink-0 ${
                        isBuy ? 'bg-cyan-500' : 'bg-emerald-500 animate-pulse'
                      }`} />

                      <div className="glass-card rounded-xl border-slate-900/80 p-4 hover:border-slate-800 transition-all shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] uppercase bg-slate-900 border border-slate-800 text-slate-400 overflow-hidden">
                            {t.avatar ? (
                              <img src={t.avatar} alt={t.username} className="w-full h-full object-cover" />
                            ) : (
                              t.username.substring(0, 2)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-300">
                              <Link to={`/traders/${t.username}`} className="font-extrabold text-slate-100 hover:text-emerald-400 transition-colors mr-1.5">
                                @{t.username}
                              </Link>
                              {isBuy ? 'purchased' : 'sold'}{' '}
                              <span className="font-bold text-slate-200">{t.qty} shares</span> of{' '}
                              <Link to={`/market/${t.symbol}`} className="font-extrabold text-cyan-400 hover:underline">{t.symbol}</Link>
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">{formattedTime}</div>
                          </div>

                          {/* Transaction price read-out */}
                          <div className="text-right">
                            <div className="text-xs font-mono-numbers font-black text-slate-200">
                              ${t.priceAtTrade?.toFixed(2)}
                            </div>
                            {!isBuy && t.pnl !== null && (
                              <div className={`text-[9px] font-bold font-mono-numbers mt-0.5 ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                P&L: {t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Weekly Performers */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl">
            <div className="text-[10px] text-slate-400 flex items-center gap-2 font-semibold uppercase tracking-wider justify-center">
              <Sparkles size={13} className="text-cyan-400 animate-spin" />
              <span>Weekly leaders calculate percent profit gains generated over the last 7 calendar days.</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl border-slate-900 overflow-hidden shadow-xl">
            {isWeeklyLoading ? (
              <div className="p-12">
                <Skeleton className="h-40 w-full animate-pulse" />
              </div>
            ) : !weeklyData || weeklyData.length === 0 ? (
              <p className="p-12 text-center text-slate-500 text-xs font-semibold">No weekly transaction data found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <th className="py-4 px-6">Rank</th>
                      <th className="py-4 px-6">Trader Name</th>
                      <th className="py-4 px-6 text-right">Weekly Profit (7D)</th>
                      <th className="py-4 px-6 text-right">All-Time P&L</th>
                      <th className="py-4 px-6 text-right">Combined Portfolio</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-xs">
                    {weeklyData.map((u, idx) => {
                      const isMe = u._id === currentUser?.id;
                      const isFollowing = myFollowingIds.includes(u._id);
                      const netWorth = (u.walletBalance || 0) + (u.portfolioValue || 0);
                      const pnlPos = u.weeklyPnL >= 0;

                      return (
                        <tr 
                          key={u._id} 
                          className={`transition duration-300 ${
                            isMe ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-900/30'
                          }`}
                        >
                          <td className="py-4 px-6 font-mono-numbers font-black text-slate-400 text-sm">
                            #{idx + 1}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase bg-slate-900 border border-slate-800 text-slate-400 overflow-hidden flex-shrink-0">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                                ) : (
                                  u.username.substring(0, 2)
                                )}
                              </div>
                              <span className="hover:text-emerald-400 transition-colors">
                                <Link to={`/traders/${u.username}`}>{u.username}</Link>
                                {isMe && (
                                  <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1.5 rounded border border-emerald-500/20 ml-1.5">
                                    YOU
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className={`py-4 px-6 text-right font-mono-numbers font-extrabold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnlPos ? '+' : ''}${u.weeklyPnL?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 px-6 text-right font-mono-numbers font-extrabold ${u.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {u.totalPnL >= 0 ? '+' : ''}${u.totalPnL?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-200 font-mono-numbers font-extrabold">
                            ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {isMe ? (
                              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">N/A</span>
                            ) : (
                              <button
                                onClick={() => followMutation.mutate(u._id)}
                                disabled={followMutation.isLoading}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all ${
                                  isFollowing
                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow'
                                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                {isFollowing ? <UserCheck size={11} /> : <UserPlus size={11} />}
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
