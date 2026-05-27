import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Trophy, Calendar, Award, UserCheck, UserPlus, ArrowLeft, Heart } from 'lucide-react';
import { leaderboardService, userService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import Skeleton from '../components/ui/Skeleton';
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

export default function PublicProfilePage() {
  const { username = '' } = useParams();
  const currentUser = useAuthStore(s => s.user);
  const qc = useQueryClient();

  // 1. Fetch public profile
  const { data: trader, isLoading, error } = useQuery(['trader-profile', username], () =>
    userService.getMe().then(r => {
      // If looking at self, check if we want to hit me or username endpoint
      if (r.data.username.toLowerCase() === username.toLowerCase()) {
        return r.data;
      }
      return apiGetTrader();
    }),
    { refetchOnWindowFocus: false }
  );

  const apiGetTrader = async () => {
    // Call the public lookup endpoint in userService
    const res = await userService.getMe().then(async (meRes) => {
      // Direct axios fallback to get username lookup cleanly
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${username}`, {
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().accessToken}` }
      });
      if (!response.ok) throw new Error('Trader not found');
      return response.json();
    });
    return res;
  };

  // 2. Fetch my profile to see if I follow this trader
  const { data: myProfile } = useQuery('myProfile', () => userService.getMe().then(r => r.data));
  const myFollowingIds = (myProfile?.following || []).map(f => f._id || f);

  // 3. Follow mutation
  const followMutation = useMutation(
    (userId) => leaderboardService.follow(userId),
    {
      onSuccess: (res) => {
        toast.success(res.following ? `Followed @${username}` : `Unfollowed @${username}`);
        qc.invalidateQueries('myProfile');
        qc.invalidateQueries(['trader-profile', username]);
      },
      onError: () => toast.error('Action failed')
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-3xl mx-auto">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !trader) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto">
        <div className="text-4xl">🕵️‍♂️</div>
        <h3 className="text-lg font-bold text-slate-100">Trader Not Found</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The trader @{username} either has set their profile to private, or does not exist in the StockSim system.
        </p>
        <Link to="/leaderboard" className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1.5 pt-2">
          <ArrowLeft size={12} /> Back to Leaderboard
        </Link>
      </div>
    );
  }

  const isMe = trader._id === currentUser?.id;
  const isFollowing = myFollowingIds.includes(trader._id);
  const netWorth = (trader.walletBalance || 0) + (trader.portfolioValue || 0);
  const pnlPos = (trader.totalPnL || 0) >= 0;
  const dateObj = new Date(trader.createdAt);
  const formattedJoinDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto font-sans">
      {/* Navigation header */}
      <Link to="/leaderboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={13} />
        <span>Terminal Leaderboards</span>
      </Link>

      {/* Main card */}
      <div className="glass-card rounded-3xl border-slate-900/80 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/5 rounded-full filter blur-[40px] pointer-events-none" />

        {/* Big Avatar */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black border-2 border-slate-800 bg-slate-900 text-slate-400 overflow-hidden flex-shrink-0 shadow">
          {trader.avatar ? (
            <img src={trader.avatar} alt={trader.username} className="w-full h-full object-cover" />
          ) : (
            trader.username.substring(0, 2).toUpperCase()
          )}
        </div>

        {/* Trader info and bio */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 justify-center md:justify-start">
              <h2 className="text-xl font-extrabold text-slate-100">@{trader.username}</h2>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] bg-slate-950 border border-slate-900 text-slate-400 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                  Rank #{trader.rank || 'N/A'}
                </span>
                {isMe && (
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                    MY PROFILE
                  </span>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5 flex items-center justify-center md:justify-start gap-1">
              <Calendar size={11} className="text-slate-500" />
              <span>Trader since {formattedJoinDate}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
            {trader.bio || "No trading bio provided yet by this simulator participant."}
          </p>

          {/* Social Stats count */}
          <div className="flex items-center justify-center md:justify-start gap-6 pt-2 select-none border-t border-slate-900/50 mt-4">
            <div>
              <span className="text-lg font-black text-slate-200 font-mono-numbers">{(trader.followers || []).length}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Followers</span>
            </div>
            <div>
              <span className="text-lg font-black text-slate-200 font-mono-numbers">{(trader.following || []).length}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Following</span>
            </div>
          </div>
        </div>

        {/* Action triggers */}
        {!isMe && (
          <button
            onClick={() => followMutation.mutate(trader._id)}
            disabled={followMutation.isLoading}
            className={`w-full md:w-auto mt-4 md:mt-0 px-6 py-3 rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-2 ${
              isFollowing
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold hover:from-emerald-400 hover:to-teal-400'
            }`}
          >
            {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
            <span>{isFollowing ? 'Following Trader' : 'Follow Trader'}</span>
          </button>
        )}
      </div>

      {/* Grid of stats and badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Performance side statistics */}
        <div className="glass-card rounded-2xl border-slate-900/80 p-5 shadow-xl flex flex-col gap-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-900/60 pb-2">Trading Performance</h3>
          
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">All-Time Net Profit</span>
              <span className={`text-xl font-mono-numbers font-black block mt-0.5 ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnlPos ? '+' : ''}${trader.totalPnL?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Return Percentage</span>
              <span className={`text-sm font-mono-numbers font-extrabold block mt-0.5 ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnlPos ? '+' : ''}{trader.totalPnLPercent?.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Calculated Capital Net Worth</span>
              <span className="text-sm font-mono-numbers font-extrabold text-slate-200 block mt-0.5">
                ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Unlocked Achievements list */}
        <div className="md:col-span-2 glass-card rounded-2xl border-slate-900/80 p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-900/60 pb-2">Unlocked Achievements</h3>

          {(!trader.badges || trader.badges.length === 0) ? (
            <div className="py-10 text-center text-slate-500 text-xs font-semibold">
              🎯 This trader hasn't unlocked any achievements yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trader.badges.map((bId) => {
                const info = FRONTEND_BADGES[bId] || { label: bId, emoji: '🎖️', description: 'Unlocked achievement!' };
                return (
                  <div key={bId} className="flex gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-900/80 items-start hover:border-slate-800 transition-colors">
                    <span className="text-2xl mt-0.5">{info.emoji}</span>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-200">{info.label}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold">{info.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
