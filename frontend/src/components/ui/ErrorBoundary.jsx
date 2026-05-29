import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans bg-mesh-cyber relative">
          <div className="absolute right-[-10%] bottom-[-10%] w-[35rem] h-[35rem] bg-red-500/5 rounded-full filter blur-[150px] pointer-events-none" />
          
          <div className="w-full max-w-md glass-card rounded-3xl border-red-500/10 p-8 shadow-2xl relative overflow-hidden glow-red animate-fadeIn text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6 select-none animate-pulse">
              <AlertCircle size={32} />
            </div>

            <h1 className="text-xl font-black text-slate-100 tracking-tight">Terminal Connection Disrupted</h1>
            <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
              A runtime component parse exception has occurred. The simulated equity workspace has been suspended to prevent data corruption.
            </p>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 text-left my-6 max-h-40 overflow-y-auto font-mono-numbers text-[10px] text-red-300 leading-normal scrollbar-none">
              <span className="font-bold text-red-400 block mb-1">Diagnostic Stack Trace:</span>
              {this.state.error?.toString() || 'Unknown runtime render exception'}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-slate-100 font-extrabold text-xs rounded-xl transition duration-300 shadow-lg shadow-red-500/10 flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Reboot Terminal</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition duration-300 flex items-center justify-center gap-1.5"
              >
                <Home size={13} />
                <span>Reset Workspace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
