import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  User, Mail, Calendar, Eye, EyeOff, 
  Users, TrendingUp, DollarSign, UserMinus, RefreshCw 
} from 'lucide-react';
import { userService, leaderboardService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('following');
  const updateUser = useAuthStore(s => s.updateUser);

  // Queries
  const { data: profile, isLoading, refetch } = useQuery(
    'myProfile', 
    () => userService.getMe().then(r => r.data),
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

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 animate-pulse">Loading profile...</div>;
  }

  const followers = profile?.followers || [];
  const following = profile?.following || [];
  const isPublic = profile?.isPublic;
  const netWorth = (profile?.walletBalance || 0) + (profile?.portfolioValue || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <User size={28} className="text-emerald-400" />
            My Profile
          </h1>
          <p className="text-slate-400 mt-1">Manage your public profile presence and community connections.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg transition text-sm font-medium"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Main card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center font-bold text-3xl uppercase text-slate-300 border-2 border-slate-700 shadow-xl flex-shrink-0">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              profile?.username.substring(0, 2)
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">{profile?.username}</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 text-sm text-slate-400 justify-center md:justify-start">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} />
                  {profile?.email}
                </span>
                <span className="hidden sm:inline text-slate-700">|</span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  Joined {new Date(profile?.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 justify-center md:justify-start">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                isPublic 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                Portfolio: {isPublic ? 'Public' : 'Private'}
              </span>
              <button
                onClick={() => toggleVisibilityMutation.mutate(!isPublic)}
                disabled={toggleVisibilityMutation.isLoading}
                className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-3 py-1 rounded-lg transition"
              >
                Make {isPublic ? 'Private' : 'Public'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Net Worth</p>
            <p className="text-xl font-bold text-white mt-0.5">
              ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">All-Time Returns</p>
            <p className={`text-xl font-bold mt-0.5 ${(profile?.totalPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(profile?.totalPnL || 0) >= 0 ? '+' : ''}${(profile?.totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Community Influence</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {followers.length} Followers / {following.length} Following
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 pt-4">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('following')}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'following' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Following ({following.length})
            {activeTab === 'following' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('followers')}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'followers' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6">
        {activeTab === 'following' ? (
          <div>
            {following.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-6">You aren't following anyone yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {following.map((f) => (
                  <div key={f._id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 hover:bg-slate-900/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm uppercase text-slate-400 border border-slate-700">
                        {f.avatar ? (
                          <img src={f.avatar} alt={f.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          f.username.substring(0, 2)
                        )}
                      </div>
                      <span className="font-semibold text-white">{f.username}</span>
                    </div>
                    <button
                      onClick={() => unfollowMutation.mutate(f._id)}
                      disabled={unfollowMutation.isLoading}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Unfollow User"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {followers.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-6">No followers yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {followers.map((f) => (
                  <div key={f._id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm uppercase text-slate-400 border border-slate-700">
                      {f.avatar ? (
                        <img src={f.avatar} alt={f.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        f.username.substring(0, 2)
                      )}
                    </div>
                    <span className="font-semibold text-white">{f.username}</span>
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
