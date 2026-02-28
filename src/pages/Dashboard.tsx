import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Plus,
  FolderKanban,
  Layers,
  Sparkles,
  TrendingUp,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DashboardLayout } from '../components/layout';
import { useToast } from '../components/ui';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { projectsApi, type Project as ApiProject, type ProjectStatus as ApiProjectStatus } from '../lib/projects';
import { useAuthStore } from '../stores/authStore';
import { rewriteStorageUrl } from '../lib/api';

type DisplayStatus = 'draft' | 'generating' | 'completed' | 'failed';

interface DisplayProject {
  id: string;
  name: string;
  description?: string;
  status: DisplayStatus;
  screensCount: number;
  thumbnailUrl?: string;
  updatedAt: string;
  createdAt: string;
}

interface DashboardStats {
  totalProjects: number;
  screensGenerated: number;
  creditsRemaining: number;
  monthlyUsage: number;
}

function mapProjectStatus(status: ApiProjectStatus): DisplayStatus {
  switch (status) {
    case 'complete':
    case 'completed':
      return 'completed';
    case 'style_selection':
    case 'generating':
      return 'generating';
    case 'failed':
      return 'failed';
    case 'draft':
    default:
      return 'draft';
  }
}

function mapApiProjectToDisplay(project: ApiProject): DisplayProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: mapProjectStatus(project.status),
    screensCount: project.screensCount ?? 0,
    thumbnailUrl: project.thumbnailUrl ?? undefined,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
  };
}

const fetchProjects = async () => {
  const response = await projectsApi.list({
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    pageSize: 50,
  });
  return response.data.data;
};

const deriveStats = (
  projects: DisplayProject[],
  total: number,
  userCredits?: string | number
): DashboardStats => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthProjects = projects.filter(p => {
    const createdAt = new Date(p.createdAt);
    return createdAt >= startOfMonth;
  });

  const totalScreens = projects.reduce((acc, p) => acc + p.screensCount, 0);
  const thisMonthScreens = thisMonthProjects.reduce((acc, p) => acc + p.screensCount, 0);

  let credits = -1;
  if (userCredits !== undefined) {
    credits = typeof userCredits === 'string' ? parseInt(userCredits, 10) : userCredits;
    if (isNaN(credits)) credits = -1;
  }

  return {
    totalProjects: total,
    screensGenerated: totalScreens,
    creditsRemaining: credits,
    monthlyUsage: thisMonthScreens,
  };
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const cardHoverVariants: Variants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 17,
    },
  },
};

function StatusBadge({ status }: { status: DisplayStatus }) {
  const config = {
    draft: {
      label: 'Draft',
      className: 'bg-surface-700/50 text-surface-300 border-surface-600',
    },
    generating: {
      label: 'Generating',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    completed: {
      label: 'Completed',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-500/10 text-red-400 border-red-500/30',
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border',
        className
      )}
    >
      {status === 'generating' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
      )}
      {label}
    </span>
  );
}

function GradientPlaceholder({ seed }: { seed: string }) {
  const gradients = [
    'from-blue-600 via-cyan-500 to-blue-400',
    'from-cyan-500 via-blue-500 to-indigo-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-orange-500 via-amber-500 to-yellow-500',
    'from-rose-500 via-pink-500 to-purple-500',
    'from-blue-600 via-indigo-500 to-cyan-500',
  ];
  const index = seed.charCodeAt(0) % gradients.length;

  return (
    <div
      className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-80',
        gradients[index]
      )}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm" />
      <div className="absolute bottom-6 right-4 w-12 h-20 rounded-xl bg-white/15 backdrop-blur-sm" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-28 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20" />
    </div>
  );
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-800/50 border border-surface-700/50 p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-20 bg-surface-700 rounded" />
        <div className="h-8 w-16 bg-surface-700 rounded" />
        <div className="h-3 w-24 bg-surface-700/50 rounded" />
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-surface-700/10 to-transparent" />
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-800/50 border border-surface-700/50">
      <div className="aspect-[4/3] bg-surface-700/50" />
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-5 w-3/4 bg-surface-700 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-surface-700 rounded-full" />
          <div className="h-4 w-20 bg-surface-700/50 rounded" />
        </div>
        <div className="h-3 w-24 bg-surface-700/50 rounded" />
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-surface-700/10 to-transparent" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  accentColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  accentColor: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative overflow-hidden rounded-2xl bg-surface-800/50 border border-surface-700/50 p-6 backdrop-blur-sm transition-colors hover:border-surface-600/50"
    >
      <div
        className={cn(
          'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-20',
          accentColor
        )}
      />

      <div className="relative">
        <div
          className={cn(
            'inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3',
            accentColor.replace('bg-', 'bg-opacity-15 text-').replace('-500', '-400')
          )}
          style={{
            backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)`,
          }}
        >
          <Icon className={cn('w-5 h-5', accentColor.replace('bg-', 'text-'))} />
        </div>

        <p className="text-sm font-medium text-surface-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        {subtext && (
          <p className="text-xs text-surface-500 mt-1">{subtext}</p>
        )}
      </div>
    </motion.div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDuplicate,
  isDuplicating,
}: {
  project: DisplayProject;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isDuplicating?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCardClick = () => {
    navigate(`/project/${project.id}/canvas`);
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="rest"
      whileHover="hover"
      className="group relative"
    >
      <motion.div
        variants={cardHoverVariants}
        onClick={handleCardClick}
        className={cn(
          "relative overflow-hidden rounded-2xl bg-surface-800/50 border border-surface-700/50 backdrop-blur-sm cursor-pointer transition-colors hover:border-surface-600/50",
          isDuplicating && "opacity-50 pointer-events-none"
        )}
      >
        {isDuplicating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-900/30">
            <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-900">
          {project.thumbnailUrl ? (
            <img
              src={rewriteStorageUrl(project.thumbnailUrl)}
              alt={project.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <GradientPlaceholder seed={project.id} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-surface-900/80 via-transparent to-transparent" />

          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-900/70 backdrop-blur-sm text-xs font-medium text-white">
            <Layers className="w-3.5 h-3.5" />
            {project.screensCount} screen{project.screensCount !== 1 ? 's' : ''}
          </div>

          <div
            ref={menuRef}
            className="absolute top-3 right-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg bg-surface-900/70 backdrop-blur-sm text-surface-300 hover:text-white hover:bg-surface-800/90 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-1 w-36 py-1 rounded-xl bg-surface-800 border border-surface-700 shadow-xl shadow-black/20 z-10"
                >
                  <button
                    onClick={() => {
                      onEdit(project.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(project.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <div className="my-1 border-t border-surface-700" />
                  <button
                    onClick={() => {
                      onDelete(project.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-white truncate mb-2">
            {project.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeDate(project.updatedAt)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="col-span-full flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary-500/20 to-cyan-500/20 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/30 to-cyan-500/30 flex items-center justify-center">
            <FolderKanban className="w-10 h-10 text-primary-400" />
          </div>
        </div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20"
        >
          <Sparkles className="w-4 h-4 text-white" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
          className="absolute -bottom-1 -left-3 w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20"
        />
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
      <p className="text-surface-400 text-center max-w-sm mb-6">
        Create your first AI-powered design and watch your ideas come to life in seconds.
      </p>

      <Link
        to="/project/new"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        Create First Project
      </Link>
    </motion.div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-surface-400 text-center max-w-sm mb-6">
        We couldn't load your projects. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-xl bg-surface-700 text-white font-medium hover:bg-surface-600 transition-colors"
      >
        Try Again
      </button>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, initialize } = useAuthStore();

  // Initialize auth state on mount (restores user data on page refresh)
  useEffect(() => {
    initialize();
  }, [initialize]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const {
    data: projectsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Failed to delete project', description: 'Please try again', variant: 'error' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => projectsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project duplicated', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Failed to duplicate project', description: 'Please try again', variant: 'error' });
    },
  });

  const handleEdit = (id: string) => {
    navigate(`/project/${id}/canvas`);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDuplicate = (id: string) => {
    setDuplicatingId(id);
    duplicateMutation.mutate(id, {
      onSettled: () => setDuplicatingId(null),
    });
  };

  const projects: DisplayProject[] = projectsData?.data.map(mapApiProjectToDisplay) || [];
  const stats = projectsData ? deriveStats(projects, projectsData.total, user?.creditsRemaining) : null;

  return (
    <DashboardLayout title="Dashboard" showNewProject>
      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-medium text-surface-400 uppercase tracking-wider mb-4">
            Overview
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <StatCard
                icon={FolderKanban}
                label="Total Projects"
                value={stats?.totalProjects ?? 0}
                subtext="All time"
                accentColor="bg-primary-500"
              />
              <StatCard
                icon={Layers}
                label="Screens Generated"
                value={stats?.screensGenerated ?? 0}
                subtext="Across all projects"
                accentColor="bg-cyan-500"
              />
              <StatCard
                icon={Sparkles}
                label="Credits Remaining"
                value={stats?.creditsRemaining === -1 ? 'Unlimited' : (stats?.creditsRemaining ?? 0)}
                subtext={user?.plan ? `${user.plan} plan` : 'free plan'}
                accentColor="bg-emerald-500"
              />
              <StatCard
                icon={TrendingUp}
                label="This Month"
                value={stats?.monthlyUsage ?? 0}
                subtext="Screens this month"
                accentColor="bg-amber-500"
              />
            </motion.div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-surface-400 uppercase tracking-wider">
              Your Projects
            </h2>
            {projects.length > 0 && (
              <span className="text-sm text-surface-500">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : projects.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  isDuplicating={duplicatingId === project.id}
                />
              ))}
            </motion.div>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteMutation.mutate(deleteConfirmId);
          }
          setDeleteConfirmId(null);
        }}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
