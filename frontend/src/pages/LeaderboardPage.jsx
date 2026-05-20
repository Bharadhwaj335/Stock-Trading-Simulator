import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Trophy, UserCheck, UserPlus, Search, 
  ChevronLeft, ChevronRight, Star, RefreshCw 
} from 'lucide-react';
import { leaderboardService, userService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LeaderboardPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: profile, refetch: refetchProfile } = useQuery(
    'myProfile', 
    () => userService.getMe().then(r => r.data),
    { refetchOnWindowFocus: false }
  );

  const { 
    data: leaderboardData, 
    isLoading: isLeaderboardLoading,
    refetch: refetchLeaderboard 
  } = useQuery(
    ['leaderboard', page], 
    () => leaderboardService.get(page).then(r => r.data),
    { 
      refetchOnWindowFocus: false,
      keepPreviousData: true 
    }
  );

  const followMutation = useMutation(
    (userId) => leaderboardService.follow(userId),
    {
      onSuccess: (res, userId) => {
        toast.success(res.data.following ? 'User followed!' : 'User unfollowed');
        qc.invalidateQueries('myProfile');
        qc.invalidateQueries(['leaderboard', page]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Action failed');
      }
    }
  );

  const handleRefresh = () => {
    refetchProfile();
    refetchLeaderboard();
  };

  const myFollowingIds = (profile?.following || []).map(f => f._id || f);
  const users = leaderboardData?.users || [];
  const totalPages = leaderboardData?.pages || 1;

  // Filter users by search term
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get Rank Medals
  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">🥇 Gold</span>;
    if (rank === 2) return <span className="bg-slate-300/20 text-slate-300 border border-slate-300/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">🥈 Silver</span>;
    if (rank === 3) return <span className="bg-amber-700/20 text-amber-500 border border-amber-700/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">🥉 Bronze</span>;
    return <span className="text-slate-400 font-medium">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy size={28} className="text-yellow-500" />
            Top Traders
          </h1>
          <p className="text-slate-400 mt-1">See how you measure up against the StockSim community.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg transition text-sm font-medium self-start sm:self-auto"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search traders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>
        <div className="text-xs text-slate-400 md:ml-auto flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <span>Leaderboard updates in real-time based on closed P&L performance.</span>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {isLeaderboardLoading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading rankings...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No traders found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Trader</th>
                  <th className="py-4 px-6 text-right">Cash Balance</th>
                  <th className="py-4 px-6 text-right">Portfolio Value</th>
                  <th className="py-4 px-6 text-right">Net Worth</th>
                  <th className="py-4 px-6 text-right">All-Time Return (P&L)</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredUsers.map((u) => {
                  const isMe = u._id === currentUser?.id;
                  const isFollowing = myFollowingIds.includes(u._id);
                  const netWorth = (u.walletBalance || 0) + (u.portfolioValue || 0);
                  const pnlPos = (u.totalPnL || 0) >= 0;

                  return (
                    <tr 
                      key={u._id} 
                      className={`transition ${
                        isMe ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-4 px-6 font-semibold">
                        {getRankBadge(u.rank)}
                      </td>
                      <td className="py-4 px-6 font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            isMe ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              u.username.substring(0, 2)
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5">
                              {u.username}
                              {isMe && (
                                <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  YOU
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-300 font-medium">
                        ${(u.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right text-slate-300 font-medium">
                        ${(u.portfolioValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right text-white font-semibold">
                        ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-4 px-6 text-right font-bold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
                        <div>{pnlPos ? '+' : ''}${(u.totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-xs font-semibold">{pnlPos ? '+' : ''}{(u.totalPnLPercent || 0).toFixed(2)}%</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isMe ? (
                          <span className="text-xs text-slate-500 font-medium">N/A</span>
                        ) : (
                          <button
                            onClick={() => followMutation.mutate(u._id)}
                            disabled={followMutation.isLoading}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              isFollowing
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck size={13} />
                                Following
                              </>
                            ) : (
                              <>
                                <UserPlus size={13} />
                                Follow
                              </>
                            )}
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
          <div className="bg-slate-900/50 border-t border-slate-800 p-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
