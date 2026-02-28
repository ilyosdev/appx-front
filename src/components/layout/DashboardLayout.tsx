import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { UserDropdown } from './UserDropdown';
import { LogoIcon } from '../ui';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  showNewProject?: boolean;
}

export function DashboardLayout({ children, title, showNewProject = false }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-8 border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-bold text-lg text-white">AppX</span>
          </Link>

          {/* Desktop title */}
          <div className="hidden lg:block">
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {showNewProject && (
              <Link
                to="/project/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
              </Link>
            )}
            <UserDropdown />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
