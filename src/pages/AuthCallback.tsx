import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, fetchUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');

      if (!accessToken || !refreshToken) {
        setError('Missing authentication tokens');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Store the tokens
        setTokens(accessToken, refreshToken);

        // Fetch user data
        await fetchUser();

        // All users (including free) go to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, setTokens, fetchUser, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Failed</h2>
          <p className="text-surface-400 mb-4">{error}</p>
          <p className="text-surface-500 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-surface-800 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Completing sign in...</h2>
        <p className="text-surface-400">Please wait while we set up your session.</p>
      </div>
    </div>
  );
}
