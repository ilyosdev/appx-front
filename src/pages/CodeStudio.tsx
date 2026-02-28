import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Code2, FolderTree, MessageSquare, Crown } from 'lucide-react';
import { ChatSidebar } from '../components/canvas/ChatSidebar';
import type { StreamScreen, ChangedFile } from '@/lib/chat';
import { EditorLayout } from '../components/editor/EditorLayout';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { DeployButton } from '@/components/deployment/DeployButton';
import { SubmitToDevButton } from '@/components/submission/SubmitToDevButton';
import { MobilePreviewButton } from '@/components/preview/MobilePreviewButton';
import { ExpoPreviewModal } from '@/components/preview/ExpoPreviewModal';
import { useEditorStore } from '@/stores/editorStore';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { PLAN_FEATURES } from '@/lib/payments';
import type { PlanType } from '@/lib/payments';

interface SourceFile {
  id: string;
  projectId: string;
  path: string;
  filename: string;
  directory: string;
  fileType: 'file' | 'folder';
  contentType: string | null;
  content: string | null;
  isScreen: boolean;
  screenName: string | null;
  screenOrder: number;
  screenshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  publishedUrl?: string | null;
  designSystem?: {
    navigation?: {
      type: string;
      tabs: Array<{ name: string; icon: string; screenId: string }>;
    };
    theme?: Record<string, string>;
  };
}

export default function CodeStudio() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { openUpgradeModal } = useBillingStore();
  const userPlan = (user?.plan as PlanType) || 'free';
  const canEditCode = PLAN_FEATURES[userPlan].codeExport;

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(true);

  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const openFiles = useEditorStore((s) => s.openFiles);
  const addTerminalLine = useEditorStore((s) => s.addTerminalLine);
  const markFileSaved = useEditorStore((s) => s.markFileSaved);

  // Fetch project and files
  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: projectData } = await api.get(`/projects/${projectId}`);
        setProject(projectData.data || projectData);

        const { data: filesResponse } = await api.get(`/projects/${projectId}/files`);
        const filesData: SourceFile[] = filesResponse.data || filesResponse;
        setFiles(filesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const refetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data: projectData } = await api.get(`/projects/${projectId}`);
      setProject(projectData.data || projectData);
    } catch (err) {
      console.error('Failed to refetch project:', err);
    }
  }, [projectId]);

  const handleSaveFile = useCallback(
    async (fileId: string, path: string, content: string) => {
      if (!projectId) return;

      addTerminalLine({ text: `Saving ${path}...`, type: 'info' });

      try {
        const response = await api.patch(`/projects/${projectId}/files/${fileId}`, {
          content,
          changedBy: 'user',
        });

        // Update local files state
        if (fileId.startsWith('tmpl:')) {
          const newFile = response.data.data || response.data;
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, ...newFile } : f))
          );
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, content } : f))
          );
        }

        markFileSaved(path);
        addTerminalLine({ text: `Saved ${path}`, type: 'success' });
      } catch (err) {
        addTerminalLine({
          text: `Failed to save ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          type: 'stderr',
        });
        throw err;
      }
    },
    [projectId, addTerminalLine, markFileSaved]
  );

  const handleFilesChanged = useCallback(
    (changedFiles: ChangedFile[]) => {
      setFiles((prev) => {
        const updated = [...prev];
        for (const changed of changedFiles) {
          const idx = updated.findIndex((f) => f.path === changed.path);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], content: changed.content };
          }
        }
        return updated;
      });
    },
    []
  );

  const handleScreenCreatedFromChat = useCallback(
    async (_screen: StreamScreen) => {
      if (!projectId) return;
      const { data: filesResponse } = await api.get(`/projects/${projectId}/files`);
      const filesData: SourceFile[] = filesResponse.data || filesResponse;
      setFiles(filesData);
    },
    [projectId]
  );

  // Get the active source file for chat context
  const activeSourceFile = activeFilePath
    ? files.find((f) => f.path === activeFilePath)
    : null;

  if (isLoading) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-surface-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-red-400">{error}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!canEditCode) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Crown className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Code Editor</h2>
          <p className="text-surface-400">
            Access to the code editor is available on paid plans. Upgrade to view and edit your source code.
          </p>
          <div className="flex gap-3">
            <Link to={`/project/${projectId}/canvas`}>
              <Button variant="ghost">Back to Preview</Button>
            </Link>
            <Button onClick={() => openUpgradeModal('exports', 'Upgrade to access the code editor and export your code.')}>
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <FolderTree className="w-12 h-12 text-surface-600" />
          <h2 className="text-xl font-semibold text-white">No Source Files</h2>
          <p className="text-surface-400">
            This project doesn't have any source files yet. Generate screens first,
            then run the migration to convert them to source files.
          </p>
          <Link to={`/project/${projectId}/canvas`}>
            <Button>Back to Preview</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-surface-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-surface-800 bg-surface-900/50 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to={`/project/${projectId}/canvas`}
            className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Canvas</span>
          </Link>
          <div className="h-4 w-px bg-surface-700" />
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary-500" />
            <span className="text-white font-medium">
              {project?.name || 'Code Studio'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MobilePreviewButton />

          {projectId && (
            <SubmitToDevButton
              projectId={projectId}
              projectName={project?.name || 'Code Studio'}
            />
          )}

          {projectId && (
            <DeployButton
              projectId={projectId}
              projectName={project?.name || 'Code Studio'}
              publishedUrl={project?.publishedUrl}
              onDeploymentComplete={() => refetchProject()}
            />
          )}

          <Button
            variant={!chatCollapsed ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setChatCollapsed(!chatCollapsed)}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat sidebar */}
        {!chatCollapsed && (
          <ChatSidebar
            projectId={projectId!}
            projectName={project?.name || 'Code Studio'}
            screenName={
              activeSourceFile?.isScreen
                ? activeSourceFile.screenName ?? undefined
                : undefined
            }
            screenPath={
              activeSourceFile?.isScreen ? activeSourceFile.path : undefined
            }
            isCollapsed={chatCollapsed}
            onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
            onFilesChanged={handleFilesChanged}
            onScreenCreated={handleScreenCreatedFromChat}
          />
        )}

        {/* Full IDE Editor */}
        <div className="flex-1 min-w-0">
          <EditorLayout
            projectId={projectId!}
            files={files}
            onSaveFile={handleSaveFile}
          />
        </div>
      </div>

      {projectId && (
        <ExpoPreviewModal
          projectId={projectId}
          getCurrentCode={() => {
            if (activeFilePath) {
              const openFile = openFiles.get(activeFilePath);
              return openFile?.content || null;
            }
            return null;
          }}
          getCurrentScreenName={() =>
            activeSourceFile?.screenName ||
            activeSourceFile?.filename ||
            'Screen'
          }
          getCurrentScreenId={() => activeSourceFile?.id}
        />
      )}
    </div>
  );
}
