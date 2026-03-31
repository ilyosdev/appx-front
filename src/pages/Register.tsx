import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { SmokeyBackground } from '../components/ui/smokey-background';

function sanitizeError(error: string): string {
  if (error === 'Network Error') return 'Connection failed. Please check your network and try again.';
  if (/select\s|insert\s|update\s|delete\s|from\s|where\s/i.test(error)) return 'Something went wrong. Please try again.';
  if (error.length > 200) return 'Something went wrong. Please try again.';
  return error;
}

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, isAuthenticated, initialize, isInitialized } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate('/project/new', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  useEffect(() => {
    if (error && !isLoading) {
      const timer = setTimeout(() => setShowError(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [error, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setShowError(false);

    try {
      await register({ name, email, password });
      navigate('/project/new', { replace: true });
    } catch {
      // Error is handled by useAuthStore's error state
    }
  };

  if (!isInitialized || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <SmokeyBackground color="#1E40AF" backdropBlurAmount="sm" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl backdrop-blur-md bg-white/[0.06] border border-white/[0.1] flex items-center justify-center p-2">
              <img src="/logo.png" alt="AppX" className="w-full h-full invert" />
            </div>
            <span className="font-semibold text-lg text-white tracking-tight">AppX</span>
          </Link>
        </div>

        {/* Card */}
        <div className="p-8 space-y-6 bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/[0.12] shadow-[0_8px_60px_-12px_rgba(0,0,0,0.6)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-1.5 text-sm text-white/50">Start building mobile apps with AI</p>
          </div>

          {/* Google OAuth */}
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/auth/google`}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-white/90 text-gray-800 font-medium rounded-xl transition-all duration-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-white/[0.1]" />
            <span className="flex-shrink mx-4 text-white/30 text-xs uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-white/[0.1]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {showError && error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                {sanitizeError(error)}
              </div>
            )}

            {/* Name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                autoComplete="name"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
                className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
                required
                autoComplete="new-password"
                className="w-full pl-11 pr-11 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !name || !email || !password || password.length < 8}
              className="group w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 rounded-xl text-white text-sm font-semibold transition-all duration-300"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/40">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
