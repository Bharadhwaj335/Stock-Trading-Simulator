import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Settings, User, Shield, Check, RefreshCw, Bell, HelpCircle, Lock, AlertTriangle } from 'lucide-react';
import { userService, portfolioService } from '../services/api';
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
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [theme, setTheme] = useState('Cyber Slate');
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyInApp, setNotifyInApp] = useState(true);

  // Theme application helper
  const applyTheme = (themeName) => {
    const root = document.documentElement;
    root.classList.remove('theme-sunset', 'theme-ocean');
    if (themeName === 'Neon Sunset') {
      root.classList.add('theme-sunset');
    } else if (themeName === 'Ocean Slate') {
      root.classList.add('theme-ocean');
    }
  };

  // Password states
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Trading Prefs
  const [defaultTradeQty, setDefaultTradeQty] = useState(() => {
    return parseInt(localStorage.getItem('default-trade-qty') || '10');
  });

  // Danger Zone Reset Modal
  const [resetModal, setResetModal] = useState(false);
  const [confirmResetText, setConfirmResetText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Queries
  const { data: profile, isLoading, refetch } = useQuery(
    'myProfile', 
    () => userService.getMe().then(r => r.data),
    { 
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        setUsername(data.username || '');
        setAvatar(data.avatar || '');
        setBio(data.bio || '');
        setIsPublic(data.isPublic ?? true);
        setTheme(data.theme || 'Cyber Slate');
        setNotifyEmail(data.notifyEmail ?? false);
        setNotifyInApp(data.notifyInApp ?? true);
        applyTheme(data.theme || 'Cyber Slate');
      }
    }
  );

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatar(profile.avatar || '');
      setBio(profile.bio || '');
      setIsPublic(profile.isPublic ?? true);
      setTheme(profile.theme || 'Cyber Slate');
      setNotifyEmail(profile.notifyEmail ?? false);
      setNotifyInApp(profile.notifyInApp ?? true);
      applyTheme(profile.theme || 'Cyber Slate');
    }
  }, [profile]);

  // General Settings Mutation
  const updateMutation = useMutation(
    (data) => userService.updateMe(data),
    {
      onSuccess: (res) => {
        toast.success('Settings saved successfully!');
        updateUser({
          username: res.data.username,
          avatar: res.data.avatar,
          bio: res.data.bio,
          isPublic: res.data.isPublic,
          theme: res.data.theme,
          notifyEmail: res.data.notifyEmail,
          notifyInApp: res.data.notifyInApp
        });
        applyTheme(res.data.theme || 'Cyber Slate');
        qc.invalidateQueries('myProfile');
        qc.invalidateQueries('leaderboard');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to update settings');
      }
    }
  );

  const handleSubmitGeneral = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }
    updateMutation.mutate({
      username: username.trim(),
      avatar,
      bio: bio.trim(),
      isPublic,
      theme,
      notifyEmail,
      notifyInApp
    });
  };

  // Password Change Submission
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmNewPw) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPw !== confirmNewPw) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setPwLoading(true);
    try {
      await userService.changePassword(currentPw, newPw);
      toast.success('Password changed successfully!');
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed');
    } finally {
      setPwLoading(false);
    }
  };

  // Default trade qty save
  const handleSaveTradingPrefs = (e) => {
    e.preventDefault();
    localStorage.setItem('default-trade-qty', String(defaultTradeQty));
    toast.success('Trading preferences saved!');
  };

  // Portfolio wipe reset execution
  const handleResetPortfolio = async () => {
    if (confirmResetText !== 'RESET') {
      toast.error('Type RESET to confirm wiping portfolio');
      return;
    }

    setResetLoading(true);
    try {
      const res = await portfolioService.reset();
      toast.success(res.message || 'Portfolio reset complete!');
      setResetModal(false);
      setConfirmResetText('');
      qc.invalidateQueries('portfolio');
      qc.invalidateQueries('tradeHistory');
      qc.invalidateQueries('analytics');
      
      // Update local storage/Zustand auth wallet state
      useAuthStore.getState().updateWallet(res.newBalance || 30000);
      window.location.href = '/'; // redirect home
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset portfolio');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl animate-fadeIn font-sans pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Settings size={24} className="text-emerald-400" />
            Terminal Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Configure your terminal layouts, security preferences, and sound alerts.</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition text-xs font-bold"
        >
          <RefreshCw size={13} />
          Reload Settings
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full animate-pulse" />
          <Skeleton className="h-32 w-full animate-pulse" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: Profile Customizations */}
          <form onSubmit={handleSubmitGeneral} className="space-y-8">
            <div className="glass-card rounded-2xl border-slate-900 p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900/60">
                <User size={16} className="text-emerald-400" />
                Profile Customization
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Account Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 mt-1.5 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Trading Bio Summary</label>
                    <input
                      type="text"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="e.g. Day trader seeking short-term volatile breakouts."
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 mt-1.5 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Avatar Portrait</label>
                  <p className="text-[10px] text-slate-500 font-semibold mb-3 leading-relaxed">Select a high-resolution preset or provide a custom HTTPS URL link.</p>
                  
                  {/* Preset list */}
                  <div className="flex flex-wrap gap-3 select-none">
                    {PRESET_AVATARS.map((url, idx) => {
                      const isSelected = avatar === url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(url)}
                          className={`w-11 h-11 rounded-full overflow-hidden border-2 relative transition hover:scale-105 ${
                            isSelected ? 'border-emerald-400 scale-105 shadow shadow-emerald-500/20' : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                              <Check size={14} className="text-emerald-400 font-bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom URL */}
                  <input
                    type="text"
                    placeholder="Enter custom image address (https://...)..."
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs mt-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Privacy & Social visibility */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900/60">
                <Shield size={16} className="text-emerald-400" />
                Privacy & Social Listings
              </h2>

              <div className="flex items-center justify-between">
                <div className="pr-4 space-y-0.5">
                  <span className="text-xs font-bold text-slate-200 block">Leaderboard Public Listings</span>
                  <span className="text-[10px] text-slate-500 font-semibold block leading-relaxed">
                    If active, your virtual net worth and return percentages display on competitive leaderboards. If disabled, you are hidden completely.
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
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow transition duration-200 ease-in-out ${
                      isPublic ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* SECTION 2.5: Theme Selection */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900/60">
                <span className="text-emerald-400">🎨</span>
                Terminal Interface Themes
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: 'Cyber Slate', desc: 'Sleek neon emerald tech look', class: 'border-emerald-500/20 text-emerald-400 bg-slate-950/40 hover:border-emerald-450/50' },
                  { name: 'Neon Sunset', desc: 'Vibrant hot pink sunset vibe', class: 'border-pink-500/20 text-pink-450 text-pink-400 bg-pink-950/10 hover:border-pink-500/50' },
                  { name: 'Ocean Slate', desc: 'Calming marine blue highlights', class: 'border-sky-500/20 text-sky-400 bg-sky-950/10 hover:border-sky-400/50' }
                ].map(t => {
                  const isSelected = theme === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        setTheme(t.name);
                        applyTheme(t.name);
                      }}
                      className={`p-4 border rounded-xl flex flex-col text-left justify-between h-24 transition-all duration-300 ${t.class} ${
                        isSelected ? 'border-current scale-[1.02] shadow shadow-emerald-500/5 font-bold' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-black">{t.name}</span>
                        {isSelected && <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono tracking-wider">Active</span>}
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold leading-normal">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: Notification Toggles */}
            <div className="glass-card rounded-2xl border-slate-900 p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900/60">
                <Bell size={16} className="text-emerald-400" />
                Price Target Alerts
              </h2>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="pr-4 space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">Sound alerts & Sound alerts</span>
                    <span className="text-[10px] text-slate-500 font-semibold block leading-relaxed">
                      Plays in-app audio chime sound effects when a price alert condition is triggered in active sessions.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyInApp(!notifyInApp)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyInApp ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow transition duration-200 ease-in-out ${
                        notifyInApp ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-slate-900/50 pt-4">
                  <div className="pr-4 space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">Email Alerts Digest</span>
                    <span className="text-[10px] text-slate-500 font-semibold block leading-relaxed">
                      Wired SMTP triggers distribute target messages directly to your registered email when targets trigger.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyEmail(!notifyEmail)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyEmail ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow transition duration-200 ease-in-out ${
                        notifyEmail ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions for general settings */}
            <div className="flex justify-end gap-3 pb-4">
              <button
                type="submit"
                disabled={updateMutation.isLoading}
                className="py-2.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow shadow-emerald-500/10"
              >
                {updateMutation.isLoading ? 'Saving...' : 'Save Settings Details'}
              </button>
            </div>
          </form>

          {/* SECTION 4: Default trading preferences */}
          <form onSubmit={handleSaveTradingPrefs}>
            <div className="glass-card rounded-2xl border-slate-900 p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900/60">
                <HelpCircle size={16} className="text-emerald-400" />
                Default Terminal Preferences
              </h2>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Default Share Order Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={defaultTradeQty}
                  onChange={(e) => setDefaultTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 mt-1.5 transition-all max-w-[200px]"
                />
              </div>

              <button
                type="submit"
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 transition"
              >
                Save Trading Prefs
              </button>
            </div>
          </form>

          {/* SECTION 5: Password change forms */}
          <form onSubmit={handlePasswordChange}>
            <div className="glass-card rounded-2xl border-slate-900 p-6 space-y-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900/60">
                <Lock size={16} className="text-emerald-400" />
                Password & Security
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 mt-1.5 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">New Password</label>
                  <input
                    type="password"
                    placeholder="At least 8 chars"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 mt-1.5 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPw}
                    onChange={(e) => setConfirmNewPw(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 mt-1.5 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 disabled:opacity-50 transition"
              >
                {pwLoading ? 'Updating...' : 'Change Account Password'}
              </button>
            </div>
          </form>

          {/* SECTION 6: Danger Zone Portfolio resets */}
          <div className="glass-card rounded-2xl border-red-500/10 p-6 space-y-6 shadow-xl bg-red-500/5">
            <h2 className="text-sm font-bold text-red-400 flex items-center gap-2 pb-3 border-b border-red-500/15">
              <AlertTriangle size={16} className="text-red-400" />
              ⚠️ Critical Danger Zone
            </h2>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="pr-4 space-y-0.5">
                <span className="text-xs font-bold text-slate-200 block">Wipe Portfolio & Trade History</span>
                <span className="text-[10px] text-slate-500 font-semibold block leading-relaxed">
                  Permanently deletes all active positions, wallet transactions, closed history, and resets balance to starting $30,000. This cannot be undone.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setResetModal(true)}
                className="py-2.5 px-5 bg-red-500 hover:bg-red-400 text-slate-950 font-black rounded-xl text-xs transition duration-300 self-start sm:self-auto shadow shadow-red-500/5"
              >
                WIPE & RESET PORTFOLIO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirm dialog Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="w-full max-w-sm glass-card border-red-500/20 bg-slate-900 rounded-2xl p-6 shadow-2xl animate-slideUp">
            <h3 className="font-extrabold text-sm text-red-400 flex items-center gap-2 mb-3 tracking-tight">
              <AlertTriangle size={18} /> WIPE PRACTICE PORTFOLIO?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-semibold">
              This completely erases your virtual portfolio standings, trade logs, and starts you back at <span className="font-bold text-slate-200">$30,000</span>. Please type <span className="font-black text-red-400 font-mono">RESET</span> below to confirm wiping.
            </p>
            
            <div className="space-y-4">
              <input
                type="text"
                value={confirmResetText}
                onChange={e => setConfirmResetText(e.target.value)}
                placeholder="Type RESET here..."
                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-red-500/50"
              />

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setResetModal(false); setConfirmResetText(''); }} className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs transition duration-300">
                  Cancel
                </button>
                <button
                  onClick={handleResetPortfolio}
                  disabled={confirmResetText !== 'RESET' || resetLoading}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 disabled:bg-red-500/30 text-slate-950 font-black rounded-xl text-xs transition duration-300"
                >
                  {resetLoading ? 'Wiping...' : 'Reset My Standings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
