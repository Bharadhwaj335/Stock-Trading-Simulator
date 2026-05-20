import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 bg-slate-950">
      <div className="inline-flex p-5 rounded-full bg-red-500/10 text-red-400 mb-6 border border-red-500/20 animate-pulse">
        <ShieldAlert size={48} />
      </div>
      
      <h1 className="text-6xl font-extrabold text-white tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-300 mb-3">Page Not Found</h2>
      
      <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8">
        The link you followed may be broken, or the page may have been removed. Let's get you back to trading!
      </p>
      
      <Link 
        to="/" 
        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg transition inline-flex items-center gap-2 shadow-lg shadow-emerald-500/10"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
