import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Crown,
  Zap,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminApi, type AdminUser, type AdminStats, type AnalyticsData } from '@/lib/admin';

type PlanType = 'free' | 'starter' | 'pro' | 'business';
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('users');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    name: string;
    plan: PlanType;
    creditsRemaining: number;
    subscriptionStatus: SubscriptionStatus;
    isEmailVerified: boolean;
  }>({
    email: '',
    password: '',
    name: '',
    plan: 'free',
    creditsRemaining: 30,
    subscriptionStatus: 'active',
    isEmailVerified: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const success = await adminApi.authenticate(password);
    if (success) {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminPassword', password);
    } else {
      setAuthError('Invalid password');
    }
    setAuthLoading(false);
  };

  const fetchData = async () => {
    const storedPassword = sessionStorage.getItem('adminPassword');
    if (!storedPassword) return;

    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        adminApi.getStats(storedPassword),
        adminApi.getUsers(storedPassword, currentPage, 20, searchQuery || undefined),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setTotalUsers(usersData.total);
      setTotalPages(usersData.totalPages);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsAuthenticated(false);
      sessionStorage.removeItem('adminPassword');
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const storedPassword = sessionStorage.getItem('adminPassword');
    if (!storedPassword) return;

    setAnalyticsLoading(true);
    try {
      const data = await adminApi.getAnalytics(storedPassword);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
    setAnalyticsLoading(false);
  };

  useEffect(() => {
    const storedPassword = sessionStorage.getItem('adminPassword');
    if (storedPassword) {
      setPassword(storedPassword);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'users') {
      fetchData();
    }
  }, [isAuthenticated, currentPage, searchQuery, activeTab]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [isAuthenticated, activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedPassword = sessionStorage.getItem('adminPassword');
    if (!storedPassword) return;

    setFormLoading(true);
    setFormError('');

    try {
      await adminApi.createUser(storedPassword, {
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
        plan: formData.plan,
        creditsRemaining: formData.creditsRemaining,
      });
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormError(err.response?.data?.message || 'Failed to create user');
    }
    setFormLoading(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedPassword = sessionStorage.getItem('adminPassword');
    if (!storedPassword || !selectedUser) return;

    setFormLoading(true);
    setFormError('');

    try {
      await adminApi.updateUser(storedPassword, selectedUser.id, {
        name: formData.name || undefined,
        plan: formData.plan,
        creditsRemaining: formData.creditsRemaining,
        subscriptionStatus: formData.subscriptionStatus,
        isEmailVerified: formData.isEmailVerified,
      });
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormError(err.response?.data?.message || 'Failed to update user');
    }
    setFormLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const storedPassword = sessionStorage.getItem('adminPassword');
    if (!storedPassword) return;

    try {
      await adminApi.deleteUser(storedPassword, userId);
      fetchData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name || '',
      plan: (user.plan || 'free') as PlanType,
      creditsRemaining: parseFloat(user.creditsRemaining || '0'),
      subscriptionStatus: (user.subscriptionStatus || 'active') as SubscriptionStatus,
      isEmailVerified: user.isEmailVerified ?? true,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      plan: 'free',
      creditsRemaining: 30,
      subscriptionStatus: 'active',
      isEmailVerified: true,
    });
    setFormError('');
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" /> Pro</span>;
      case 'starter':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1"><Zap className="w-3 h-3" /> Starter</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-surface-700 text-surface-300 rounded-full">Free</span>;
    }
  };

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-surface-400 text-sm">Enter admin password to continue</p>
          </div>

          <form onSubmit={handleAuth} className="bg-surface-900 rounded-xl p-6 space-y-4">
            {authError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm font-medium">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {authLoading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-xl border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
              <p className="text-xs text-surface-400">{activeTab === 'users' ? 'User Management' : 'Analytics Dashboard'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('users')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                  activeTab === 'users'
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-400 hover:text-white'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                  activeTab === 'analytics'
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-400 hover:text-white'
                )}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </button>
            </div>

            <button
              onClick={() => {
                sessionStorage.removeItem('adminPassword');
                setIsAuthenticated(false);
                setPassword('');
              }}
              className="px-4 py-2 text-sm text-surface-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'users' && (
          <>
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
                  <p className="text-surface-400 text-sm mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
                  <p className="text-surface-400 text-sm mb-1">Active Subs</p>
                  <p className="text-2xl font-bold text-green-400">{stats.activeSubscriptions}</p>
                </div>
                <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
                  <p className="text-surface-400 text-sm mb-1">Free</p>
                  <p className="text-2xl font-bold text-surface-300">{stats.freeUsers}</p>
                </div>
                <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
                  <p className="text-surface-400 text-sm mb-1">Starter</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.starterUsers}</p>
                </div>
                <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
                  <p className="text-surface-400 text-sm mb-1">Pro</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.proUsers}</p>
                </div>
              </div>
            )}

            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search users by email or name..."
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-800 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="px-4 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create User
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-surface-900 rounded-xl border border-surface-800 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Plan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Credits</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Projects</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-800">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-surface-800/30 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center">
                                  <User className="w-4 h-4 text-surface-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{user.name || 'Unnamed'}</p>
                                  <p className="text-xs text-surface-400">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">{getPlanBadge(user.plan || 'free')}</td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-white">{parseFloat(user.creditsRemaining || '0').toFixed(0)}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-surface-300">{user.projectsCount}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn(
                                "px-2 py-0.5 text-xs font-medium rounded-full",
                                user.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                                user.subscriptionStatus === 'canceled' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              )}>
                                {user.subscriptionStatus || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(user)}
                                  className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
                      <p className="text-sm text-surface-400">
                        Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalUsers)} of {totalUsers}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 text-surface-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-white">Page {currentPage} of {totalPages}</span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 text-surface-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : analyticsData ? (
              <div className="space-y-8">
                {/* MRR Hero Card */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl p-6 border border-green-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-surface-400 text-sm">Monthly Recurring Revenue</p>
                      <p className="text-4xl font-bold text-green-400">${analyticsData.mrr.total.toLocaleString()}</p>
                    </div>
                  </div>
                  {analyticsData.mrr.breakdown.length > 0 && (
                    <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-green-500/10">
                      {analyticsData.mrr.breakdown.map((item) => (
                        <div key={item.plan} className="text-sm">
                          <span className="text-surface-400 capitalize">{item.plan}:</span>{' '}
                          <span className="text-white font-medium">{item.count} users</span>{' '}
                          <span className="text-green-400">(${item.revenue.toLocaleString()}/mo)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Users + Plan Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Users */}
                  <div className="bg-surface-900 rounded-xl p-6 border border-surface-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-primary-400" />
                      <h3 className="text-lg font-semibold text-white">Active Users</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-800/50 rounded-lg p-4">
                        <p className="text-surface-400 text-sm mb-1">Last 7 Days</p>
                        <p className="text-3xl font-bold text-primary-400">{analyticsData.activeUsers.last7Days}</p>
                      </div>
                      <div className="bg-surface-800/50 rounded-lg p-4">
                        <p className="text-surface-400 text-sm mb-1">Last 30 Days</p>
                        <p className="text-3xl font-bold text-blue-400">{analyticsData.activeUsers.last30Days}</p>
                      </div>
                    </div>
                  </div>

                  {/* Plan Distribution */}
                  <div className="bg-surface-900 rounded-xl p-6 border border-surface-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-lg font-semibold text-white">Plan Distribution</h3>
                    </div>
                    <div className="space-y-3">
                      {analyticsData.planDistribution.map((item) => {
                        const totalPlanUsers = analyticsData.planDistribution.reduce((s, i) => s + i.count, 0);
                        const pct = totalPlanUsers > 0 ? ((item.count / totalPlanUsers) * 100).toFixed(1) : '0';
                        const planColor =
                          item.plan === 'pro' ? 'bg-cyan-500' :
                          item.plan === 'business' ? 'bg-amber-500' :
                          item.plan === 'starter' ? 'bg-blue-500' :
                          'bg-surface-600';
                        return (
                          <div key={item.plan}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-surface-300 capitalize">{item.plan}</span>
                              <span className="text-sm font-medium text-white">{item.count} <span className="text-surface-500">({pct}%)</span></span>
                            </div>
                            <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', planColor)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Credits */}
                <div className="bg-surface-900 rounded-xl p-6 border border-surface-800">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Credit Usage (Last 30 Days)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-800/50 rounded-lg p-4">
                      <p className="text-surface-400 text-sm mb-1">Credits Granted</p>
                      <p className="text-3xl font-bold text-green-400">{analyticsData.credits.totalGranted.toLocaleString()}</p>
                    </div>
                    <div className="bg-surface-800/50 rounded-lg p-4">
                      <p className="text-surface-400 text-sm mb-1">Credits Used</p>
                      <p className="text-3xl font-bold text-amber-400">{analyticsData.credits.totalUsed.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Daily Generations Table */}
                <div className="bg-surface-900 rounded-xl border border-surface-800 overflow-hidden">
                  <div className="flex items-center gap-2 p-6 pb-4">
                    <TrendingUp className="w-5 h-5 text-primary-400" />
                    <h3 className="text-lg font-semibold text-white">Daily Generations (Last 30 Days)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Generations</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider w-1/2">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-800">
                        {analyticsData.dailyGenerations.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-surface-500 text-sm">
                              No generation data available
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const maxCount = Math.max(...analyticsData.dailyGenerations.map(d => d.count), 1);
                            return analyticsData.dailyGenerations.map((day) => (
                              <tr key={day.date} className="hover:bg-surface-800/30 transition-colors">
                                <td className="px-6 py-3 text-sm text-surface-300 font-mono">{day.date}</td>
                                <td className="px-6 py-3 text-sm text-white font-medium text-right">{day.count}</td>
                                <td className="px-6 py-3">
                                  <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary-500 rounded-full transition-all"
                                      style={{ width: `${(day.count / maxCount) * 100}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                  {analyticsData.dailyGenerations.length > 0 && (
                    <div className="px-6 py-3 border-t border-surface-800 flex justify-between text-sm">
                      <span className="text-surface-400">
                        Total: <span className="text-white font-medium">{analyticsData.dailyGenerations.reduce((s, d) => s + d.count, 0).toLocaleString()}</span> generations
                      </span>
                      <span className="text-surface-400">
                        Daily avg: <span className="text-white font-medium">{(analyticsData.dailyGenerations.reduce((s, d) => s + d.count, 0) / analyticsData.dailyGenerations.length).toFixed(1)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-surface-400">
                No analytics data available
              </div>
            )}
          </>
        )}
      </main>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-surface-900 rounded-xl border border-surface-800 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-surface-800">
                <h2 className="text-lg font-semibold text-white">Create User</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 text-surface-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-4 space-y-4">
                {formError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm font-medium">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(d => ({ ...d, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">Plan</label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData(d => ({ ...d, plan: e.target.value as PlanType }))}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">Credits</label>
                    <input
                      type="number"
                      value={formData.creditsRemaining}
                      onChange={(e) => setFormData(d => ({ ...d, creditsRemaining: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create User
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-surface-900 rounded-xl border border-surface-800 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-surface-800">
                <h2 className="text-lg font-semibold text-white">Edit User</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 text-surface-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-4 space-y-4">
                {formError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm font-medium">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">Plan</label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData(d => ({ ...d, plan: e.target.value as PlanType }))}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">Credits</label>
                    <input
                      type="number"
                      value={formData.creditsRemaining}
                      onChange={(e) => setFormData(d => ({ ...d, creditsRemaining: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Subscription Status</label>
                  <select
                    value={formData.subscriptionStatus}
                    onChange={(e) => setFormData(d => ({ ...d, subscriptionStatus: e.target.value as SubscriptionStatus }))}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white"
                  >
                    <option value="active">Active</option>
                    <option value="canceled">Canceled</option>
                    <option value="past_due">Past Due</option>
                    <option value="trialing">Trialing</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isEmailVerified"
                    checked={formData.isEmailVerified}
                    onChange={(e) => setFormData(d => ({ ...d, isEmailVerified: e.target.checked }))}
                    className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="isEmailVerified" className="text-sm text-surface-300">Email Verified</label>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update User
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
