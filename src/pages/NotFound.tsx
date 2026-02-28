import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-surface-700">404</h1>
        <p className="mt-4 text-xl text-surface-400">Page not found</p>
        <p className="mt-2 text-surface-500">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
