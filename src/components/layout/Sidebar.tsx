import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, User, Bell, CreditCard, Send, Crown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LogoIcon } from '../ui';
import { useAuthStore } from '../../stores/authStore';
import { useCollaborationStore } from '../../stores/collaborationStore';
import { TeamSwitcher } from '../collaboration/TeamSwitcher';
import { api } from '../../lib/api';
import type { PlanType } from '../../lib';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  tab?: string;
}

const mainNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
];

const settingsNav: NavItem[] = [
  { icon: User, label: 'Profile', href: '/settings?tab=profile', tab: 'profile' },
  { icon: Bell, label: 'Notifications', href: '/settings?tab=notifications', tab: 'notifications' },
  { icon: CreditCard, label: 'Billing', href: '/settings?tab=billing', tab: 'billing' },
  { icon: Send, label: 'Submissions', href: '/settings?tab=submissions', tab: 'submissions' },
  { icon: Crown, label: 'Subscription', href: '/settings?tab=subscription', tab: 'subscription' },
];

export function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const currentPlan = (user?.plan as PlanType) || 'free';

  const isSettings = location.pathname === '/settings' || location.pathname.startsWith('/settings');
  const currentTab = searchParams.get('tab') || 'profile';

  // Team switcher state
  const teams = useCollaborationStore((s) => s.teams);
  const activeTeamId = useCollaborationStore((s) => s.activeTeamId);
  const setActiveTeamId = useCollaborationStore((s) => s.setActiveTeamId);
  const setTeams = useCollaborationStore((s) => s.setTeams);
  const isLoadingTeams = useCollaborationStore((s) => s.isLoadingTeams);
  const setLoadingTeams = useCollaborationStore((s) => s.setLoadingTeams);

  // Fetch teams on mount
  useEffect(() => {
    let cancelled = false;
    const fetchTeams = async () => {
      setLoadingTeams(true);
      try {
        const res = await api.get('/teams');
        if (!cancelled) {
          setTeams(res.data.data ?? res.data);
        }
      } catch {
        // Silent fail -- teams are optional
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };
    fetchTeams();
    return () => { cancelled = true; };
  }, [setTeams, setLoadingTeams]);

  const handleCreateTeam = async (name: string) => {
    const res = await api.post('/teams', { name });
    const newTeam = res.data.data ?? res.data;
    setTeams([...teams, { ...newTeam, myRole: 'owner', ownerId: '' }]);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-surface-800 bg-surface-900/50 sticky top-0 h-screen">
      <div className="h-16 flex items-center px-6 border-b border-surface-800">
        <Link to="/" className="flex items-center gap-2">
          <LogoIcon className="w-8 h-8" />
          <span className="font-bold text-lg text-white">AppX</span>
        </Link>
      </div>

      {/* Team / workspace switcher */}
      <div className="px-4 pt-4 pb-2">
        <TeamSwitcher
          teams={teams}
          activeTeamId={activeTeamId}
          onSelectTeam={setActiveTeamId}
          onCreateTeam={handleCreateTeam}
          isLoading={isLoadingTeams}
          className="w-full"
        />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        {mainNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}

        {/* Settings section label */}
        <div className="pt-4 pb-1 px-4">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Settings</span>
        </div>

        {/* Settings sub-items */}
        {settingsNav.map((item) => {
          const isActive = isSettings && currentTab === item.tab;
          return (
            <Link
              key={item.tab}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        {currentPlan === 'pro' ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-amber-500/20 p-4 border border-amber-500/20">
            <div className="relative flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Pro Plan</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-blue-400/20 p-4 border border-primary-500/20">
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-surface-400 mb-3">
                Get unlimited generations and premium features.
              </p>
              <Link
                to="/pricing"
                className="block w-full py-2 rounded-lg bg-white/10 backdrop-blur-sm text-sm font-medium text-white text-center hover:bg-white/20 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
