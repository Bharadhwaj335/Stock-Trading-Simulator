import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, Eye, EyeOff, Terminal, Sparkles, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { authService, userService, api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.edu|[a-zA-Z0-9.-]+\.edu\.[a-zA-Z]{2,}|[a-zA-Z0-9.-]+\.ac\.[a-zA-Z]{2,}|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com)$/i;

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(20),
  email:    z.string().email('Please enter a valid email address').refine(
    val => emailRegex.test(val),
    { message: 'Only @gmail, @yahoo, @outlook, @icloud or student (.edu, .edu.in) emails are allowed.' }
  ),
  password: z.string().min(8, 'At least 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ['confirm'] });

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');
    const details = params.get('details');

    if (error) {
      if (error === 'google_unconfigured') {
        toast.error((t) => (
          <div className="text-xs text-left">
            <span className="font-extrabold text-red-400 block mb-1">Google OAuth Unconfigured</span>
            SSO credentials are not set up in your backend <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> file.<br />
            To enable real logins, add <code className="text-cyan-400">GOOGLE_CLIENT_ID</code> and <code className="text-cyan-400">GOOGLE_CLIENT_SECRET</code> to your backend <code className="font-mono text-[10px]">.env</code> and register redirect URI: <code className="text-emerald-400 font-mono text-[10px]">http://localhost:5000/api/auth/google/callback</code>.
          </div>
        ), { duration: 10000 });
      } else if (error === 'github_unconfigured') {
        toast.error((t) => (
          <div className="text-xs text-left">
            <span className="font-extrabold text-red-400 block mb-1">GitHub OAuth Unconfigured</span>
            SSO credentials are not set up in your backend <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> file.<br />
            To enable real logins, add <code className="text-cyan-400">GITHUB_CLIENT_ID</code> and <code className="text-cyan-400">GITHUB_CLIENT_SECRET</code> to your backend <code className="font-mono text-[10px]">.env</code> and register redirect URI: <code className="text-emerald-400 font-mono text-[10px]">http://localhost:5000/api/auth/github/callback</code>.
          </div>
        ), { duration: 10000 });
      } else if (error === 'google_auth_failed' || error === 'github_auth_failed') {
        toast.error((t) => (
          <div className="text-xs text-left">
            <span className="font-extrabold text-red-400 block mb-1">SSO Exchange Handshake Failed</span>
            The token swap failed because of invalid secrets or redirect URI mismatch. Details: <span className="font-semibold text-slate-300 font-mono text-[10px]">{details || 'Unknown credentials error'}</span>.
          </div>
        ), { duration: 8000 });
      } else {
        const errorMap = {
          email_domain_not_whitelisted: 'Only @gmail, @yahoo, @outlook, @icloud or student (.edu, .edu.in) emails are allowed.',
          github_email_not_found: 'Could not fetch a primary verified email from your GitHub account.',
          google_failed: 'Google sign-in authorization was cancelled or failed.',
          github_failed: 'GitHub sign-in authorization was cancelled or failed.',
        };
        toast.error(errorMap[error] || 'Single Sign-On authentication failed.');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token && refreshToken) {
      const loginSSO = async () => {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await userService.getMe();
          setAuth(res.data, token, refreshToken);
          
          const isMock = params.get('sso_mock') === 'true';
          if (isMock) {
            toast.success('Connected via local Sandbox Mock Mode successfully! (Keyless Demo)', {
              duration: 5000,
              icon: '🛡️'
            });
          } else {
            toast.success('Successfully authenticated via Single Sign-On!');
          }
          navigate('/');
        } catch (err) {
          toast.error('Failed to retrieve user profile after OAuth.');
        }
      };
      loginSSO();
    }
  }, [navigate, setAuth]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authService.register({ username: data.username, email: data.email, password: data.password });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success('Account created! Start trading with your virtual cash balance.');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans bg-mesh-cyber relative">
      {/* Background neon glows */}
      <div className="absolute right-[-10%] bottom-[-10%] w-[35rem] h-[35rem] bg-cyan-500/5 rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute left-[-10%] top-[-10%] w-[35rem] h-[35rem] bg-indigo-500/5 rounded-full filter blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn z-10">
        
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 font-bold mb-6 transition-colors self-start"
        >
          <ArrowLeft size={13} />
          <span>Back to Homepage</span>
        </Link>

        {/* Center Card */}
        <div className="glass-card rounded-3xl border-slate-900/60 p-6 md:p-8 shadow-2xl relative overflow-hidden glow-indigo">
          <div className="flex flex-col items-center mb-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="text-lg font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">StockSim</span>
            </Link>
            <h1 className="text-xl font-black text-slate-100 mt-4 tracking-tight">Create Account</h1>
            <p className="text-[11px] text-slate-400 mt-1 font-semibold">Join the risk-free real-time trading simulator</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
              <input
                {...register('username')}
                type="text"
                placeholder="trader101"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
              />
              {errors.username && <p className="text-red-400 text-[10px] font-semibold mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="name@company.com"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
              />
              {errors.email && <p className="text-red-400 text-[10px] font-semibold mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-[10px] font-semibold mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirm')}
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirm && <p className="text-red-400 text-[10px] font-semibold mt-1">{errors.confirm.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs py-3 rounded-xl transition duration-300 shadow-lg shadow-cyan-500/10 flex items-center justify-center mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Free Account'
              )}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-900"></div>
              </div>
              <div className="relative flex justify-center text-[9px] font-black uppercase tracking-widest">
                <span className="bg-slate-950 px-3 text-slate-500">Or Continue With</span>
              </div>
            </div>

            {/* Redesigned SSO Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`;
                }}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow hover:border-slate-700 font-sans"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign Up with Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/github`;
                }}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow hover:border-slate-700 font-sans"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Sign Up with GitHub</span>
              </button>
            </div>

            {/* Collapsible Sandbox Console Panel */}
            <div className="mt-5 border-t border-slate-900/60 pt-4">
              <button
                type="button"
                onClick={() => setShowSandbox(!showSandbox)}
                className="w-full flex items-center justify-between text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors focus:outline-none"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} className="animate-pulse" />
                  Expand Developer Sandbox Terminal
                </span>
                {showSandbox ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showSandbox && (
                <div className="mt-3 space-y-3 animate-fadeIn text-left bg-slate-950 p-4 border border-cyan-950/40 rounded-2xl glow-cyan">
                  <p className="text-[9px] text-slate-400 leading-normal font-semibold">
                    SSO client keys are unconfigured in your local environment. Bypass real OAuth protocols by logging in directly as whitelisted developer profiles:
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google?mock=true`;
                      }}
                      className="flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 px-3.5 py-2.5 rounded-xl text-left transition-all group"
                    >
                      <div>
                        <span className="text-[9px] font-black text-slate-200 block">Sign In: Scholar Sandbox</span>
                        <span className="text-[8px] text-slate-500 font-mono-numbers">sandbox.student@mit.edu</span>
                      </div>
                      <Sparkles size={12} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/github?mock=true`;
                      }}
                      className="flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 px-3.5 py-2.5 rounded-xl text-left transition-all group"
                    >
                      <div>
                        <span className="text-[9px] font-black text-slate-200 block">Sign In: Octocat Sandbox</span>
                        <span className="text-[8px] text-slate-500 font-mono-numbers">sandbox.octocat@gmail.com</span>
                      </div>
                      <Sparkles size={12} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>

          <p className="text-center text-slate-400 text-xs font-semibold mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-2 transition-colors">
              Sign In Instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
