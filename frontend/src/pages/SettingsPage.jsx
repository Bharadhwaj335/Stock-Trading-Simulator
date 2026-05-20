import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Settings, User, Shield, Check, RefreshCw } from 'lucide-react';
import { userService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const updateUser = useAuthStore(s => s.updateUser);

  // Form states
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Queries
  const { data: profile, isLoading, refetch } = useQuery(
    'myProfile', 
    () => userService.getMe().then(r => r.data),
    { 
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        setUsername(data.username || '');
        setAvatar(data.avatar || '');
        setIsPublic(data.isPublic ?? true);
      }
    }
  );

  // Initialize form if profile was already cached
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatar(profile.avatar || '');
      setIsPublic(profile.isPublic ?? true);
    }
  }, [profile]);

  // Mutations
  const updateMutation = useMutation(
    (data) => userService.updateMe(data),
    {
      onSuccess: (res) => {
        toast.success('Settings saved successfully!');
        updateUser({
          username: res.data.username,
          avatar: res.data.avatar,
          isPublic: res.data.isPublic
        });
        qc.invalidateQueries('myProfile');
        qc.invalidateQueries('leaderboard');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to update settings');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }
    updateMutation.mutate({
      username: username.trim(),
      avatar,
      isPublic
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings size={28} className="text-emerald-400" />
            Account Settings
          </h1>
          <p className="text-slate-400 mt-1">Configure your personal preferences, security options, and avatar details.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg transition text-sm font-medium"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">Loading settings...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Profile Customization */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <User size={18} className="text-emerald-400" />
              Profile Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white mt-1.5 focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avatar Customization</label>
                <p className="text-xs text-slate-500 mt-1">Choose one of our premium presets or paste a custom image URL below.</p>
                
                {/* Preset Picker */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {PRESET_AVATARS.map((url, idx) => {
                    const isSelected = avatar === url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatar(url)}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 relative transition hover:scale-105 ${
                          isSelected ? 'border-emerald-400 scale-105' : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                            <Check size={16} className="text-emerald-400 font-bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom URL Input */}
                <input
                  type="text"
                  placeholder="Paste custom avatar URL..."
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white mt-4 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Privacy and Security */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Shield size={18} className="text-emerald-400" />
              Privacy & Security
            </h2>

            <div className="flex items-center justify-between">
              <div className="pr-4 space-y-1">
                <span className="text-sm font-semibold text-white block">Public Portfolio Ranking</span>
                <span className="text-xs text-slate-400 block">
                  When enabled, your portfolio net worth and returns will be visible on the public leaderboard. If disabled, you will be hidden completely.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPublic ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (profile) {
                  setUsername(profile.username || '');
                  setAvatar(profile.avatar || '');
                  setIsPublic(profile.isPublic ?? true);
                }
              }}
              className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-sm border border-slate-800 transition font-semibold"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={updateMutation.isLoading}
              className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-lg text-sm font-bold transition flex items-center gap-2"
            >
              {updateMutation.isLoading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
