import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin({ onSuccess }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await login(username, password);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait 1 minute before trying again (Brute-Force Rate Limiting Active).');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-2xl overflow-hidden">
        {/* Header with College Logo */}
        <div className="p-8 text-center bg-gradient-to-b from-[#1e2d7d] to-[#121c52] text-white relative">
          <div className="w-20 h-20 bg-white rounded-2xl p-2 mx-auto mb-3 shadow-lg flex items-center justify-center">
            <img src="./logo.png" alt="Popular Medical College" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Popular Medical College</h2>
          <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            Administrative Terminal
          </span>
          <p className="text-xs text-slate-300 mt-2">
            Restricted Access &middot; AES-256 Encrypted Session
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff / Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter administrative username..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Authenticate & Access Control</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Token Transmission &middot; Rate Limited</span>
          </div>
        </div>
      </div>
    </div>
  );
}
