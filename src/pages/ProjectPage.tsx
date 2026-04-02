import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import type { DesignSystem } from "@/lib/design-system";
import { useProjectSocket, type ScreenCompleteData, type ScreenErrorData, type DesignSystemGenerateParams } from "@/hooks/useProjectSocket";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useResizablePanel, ResizeHandle } from "@/hooks/useResizablePanel";
import {
  Sparkles,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
  Smartphone,
  QrCode,
  FileCode,
  FolderTree,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { projectsApi, type DesignSystemCustomization } from "@/lib/projects";
import { useDeployment } from "@/hooks/useDeployment";
import { useDeployStore } from "@/stores/deployStore";
import { DesignSystemCustomizer } from "@/components/projects/DesignSystemCustomizer";
// PublishModal — coming soon
import { chatApi } from "@/lib/chat";
import { useAuthStore } from "@/stores/authStore";
import { generateScreenThumbnail } from "@/lib/screenshot";
import { api, projectsApi as projectsApiClient } from "@/lib/api";
import { isReactCode } from "@/lib/codeUtils";
import { slugify } from "@/lib/slugify";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { PLAN_FEATURES, type PlanType } from "@/lib/payments";

import {
  layoutScreens,
  transformStreamScreenToCanvas,
  SCREEN_SPACING_X,
  DEVICE_WIDTH,
  DEVICE_HEIGHT,
} from "@/lib/canvasLayout";
import type { ScreenData, RecommendationItem } from "@/types/canvas";

import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { ChatSidebar } from "@/components/canvas/ChatSidebar";
import { PhonePreviewPanel } from "@/components/canvas/PhonePreviewPanel";
// ExportModal — coming soon
import { ProjectSettingsModal } from "@/components/canvas/ProjectSettingsModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PreviewConsole } from "@/components/preview/PreviewConsole";
import { DeviceTestingSidebar } from "@/components/canvas/DeviceTestingSidebar";
import { PlanApprovalModal } from "@/components/canvas/PlanApprovalModal";
import { VersionHistoryModal } from "@/components/canvas/VersionHistoryModal";
import { VersionHistory } from "@/components/canvas/VersionHistory";
// TestPanel — replaced by inline deployment in CanvasHeader
import { DesignSystemPanel } from "@/components/canvas/DesignSystemPanel";
import { ScreenListPanel } from "@/components/canvas/ScreenListPanel";
import { FileTree } from "@/components/canvas/FileTree";

const MonacoEditor = lazy(() => import("@monaco-editor/react").then(m => ({ default: m.default })));

/** Draggable PiP phone preview for Code tab.
 *  Renders content at real device resolution (393x852) and CSS-scales it down.
 *  Scroll wheel changes scale; drag to move. */
function PiPPreview({ children, onClose, onRefresh }: {
  children: React.ReactNode;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const DEVICE_W = 393;
  const DEVICE_H = 852;
  const BEZEL = 12;
  const FRAME_W = DEVICE_W + BEZEL * 2;
  const FRAME_H = DEVICE_H + BEZEL * 2;

  const pipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [pipScale, setPipScale] = useState(0.35);
  const [isInteracting, setIsInteracting] = useState(false);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const displayW = Math.round(FRAME_W * pipScale);
  const displayH = Math.round(FRAME_H * pipScale);

  useEffect(() => {
    if (pos.x === -1 && pipRef.current?.parentElement) {
      const parent = pipRef.current.parentElement.getBoundingClientRect();
      setPos({ x: parent.width - displayW - 16, y: parent.height - displayH - 16 });
    }
  }, [pos.x, displayW, displayH]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    setIsInteracting(true);
    const rect = pipRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !pipRef.current?.parentElement) return;
      const parent = pipRef.current.parentElement.getBoundingClientRect();
      setPos({
        x: Math.max(0, Math.min(ev.clientX - parent.left - dragOffset.current.x, parent.width - displayW)),
        y: Math.max(0, Math.min(ev.clientY - parent.top - dragOffset.current.y, parent.height - displayH)),
      });
    };
    const onUp = () => { dragging.current = false; setIsInteracting(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [displayW, displayH]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    resizing.current = true;
    setIsInteracting(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = pipScale;
    e.preventDefault();
    e.stopPropagation();
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const delta = Math.max(dx, dy);
      setPipScale(Math.max(0.2, Math.min(0.7, startScale + delta / (FRAME_W * 0.3))));
    };
    const onUp = () => { resizing.current = false; setIsInteracting(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pipScale, FRAME_W]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setPipScale(prev => Math.max(0.2, Math.min(0.7, prev - e.deltaY * 0.003)));
  }, []);

  return (
    <motion.div
      ref={pipRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="absolute z-30"
      style={{
        width: displayW,
        height: displayH,
        left: pos.x >= 0 ? pos.x : undefined,
        top: pos.y >= 0 ? pos.y : undefined,
        right: pos.x < 0 ? 16 : undefined,
        bottom: pos.y < 0 ? 16 : undefined,
      }}
      onWheel={onWheel}
    >
      {/* Resize handle — bottom-right corner */}
      <div
        onMouseDown={onResizeStart}
        className="absolute -bottom-2 -right-2 w-8 h-8 cursor-se-resize z-30 flex items-end justify-end p-1"
        title="Drag to resize"
      >
        <svg className="w-4 h-4 text-surface-400" viewBox="0 0 10 10" fill="currentColor">
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="4" r="1.4" />
          <circle cx="4" cy="8" r="1.4" />
        </svg>
      </div>
      {/* Resize handle — bottom edge */}
      <div
        onMouseDown={onResizeStart}
        className="absolute -bottom-1 left-1/4 right-1/4 h-3 cursor-s-resize z-30"
      />
      {/* Resize handle — right edge */}
      <div
        onMouseDown={onResizeStart}
        className="absolute -right-1 top-1/4 bottom-1/4 w-3 cursor-e-resize z-30"
      />

      {/* Action buttons — outside scaled frame so they stay normal size */}
      <div className="absolute -top-2 -right-2 z-30 flex items-center gap-1">
        <button onClick={onRefresh} className="p-1.5 rounded-full bg-surface-800 border border-surface-700 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors shadow-lg" title="Reload">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
        <button onClick={onClose} className="p-1.5 rounded-full bg-surface-800 border border-surface-700 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors shadow-lg" title="Close">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Phone rendered at real resolution, scaled down via CSS transform */}
      <div
        onMouseDown={onDragStart}
        className="origin-top-left cursor-grab active:cursor-grabbing"
        style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${pipScale})` }}
      >
        <div className="relative bg-surface-900 rounded-[44px] ring-1 ring-surface-700/50 shadow-2xl shadow-black/60"
          style={{ width: FRAME_W, height: FRAME_H, padding: BEZEL }}>
          {/* Dynamic Island */}
          <div className="absolute top-[14px] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-black rounded-full flex items-center justify-center" style={{ width: 126, height: 37 }}>
              <div className="w-3 h-3 bg-surface-800 rounded-full ring-1 ring-surface-700/50 ml-auto mr-4" />
            </div>
          </div>
          {/* Screen — real device resolution */}
          <div className="bg-white overflow-hidden" style={{ width: DEVICE_W, height: DEVICE_H, borderRadius: 38, pointerEvents: isInteracting ? 'none' : 'auto' }}>
            {children}
          </div>
          {/* Home indicator */}
          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-white/30 rounded-full" style={{ width: 134, height: 5, borderRadius: 2.5 }} />
          </div>
          {/* Side buttons */}
          <div className="absolute -right-[2px] bg-surface-700 rounded-r-sm" style={{ top: 120, width: 3, height: 64 }} />
          <div className="absolute -left-[2px] bg-surface-700 rounded-l-sm" style={{ top: 100, width: 3, height: 32 }} />
          <div className="absolute -left-[2px] bg-surface-700 rounded-l-sm" style={{ top: 145, width: 3, height: 32 }} />
          <div className="absolute -left-[2px] bg-surface-700 rounded-l-sm" style={{ top: 70, width: 3, height: 16 }} />
        </div>
      </div>
    </motion.div>
  );
}

interface LocationState {
  designSystem?: DesignSystem;
  isNewProject?: boolean;
  showPlanApproval?: boolean;
  pendingDesignSystem?: DesignSystemGenerateParams;
}

function normalizeScreenNameForMatching(name: string): string {
  return name.toLowerCase().replace(/[_\s-]+/g, "");
}

function getScreenNameFromExpoFilePath(filePath: string): string | null {
  const normalizedPath = filePath.replace(/^\//, "");
  if (
    !normalizedPath.startsWith("app/") ||
    !normalizedPath.endsWith(".tsx") ||
    normalizedPath.includes("_layout")
  ) {
    return null;
  }

  let route = normalizedPath
    .replace(/^app\//, "")
    .replace(/\.tsx$/, "")
    .replace(/\([^)]+\)\//g, "");

  if (!route || route === "+not-found") return null;
  if (/\[[^\]]+\]/.test(route) && !route.endsWith("/index")) return null;

  if (route === "index" || route.endsWith("/index")) {
    route = route.replace(/\/index$/, "");
    if (!route) return "Home";
  }

  const segments = route.split("/").filter(Boolean);
  const rawName = segments[segments.length - 1];
  if (!rawName) return null;

  return rawName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface InitialGenerationScreenPlan {
  name: string;
  purpose: string;
  layoutDescription: string;
  dataModel?: string;
  interactions?: string;
  stateManagement?: string;
  skeletonId: string;
}

interface InitialGenerationPlan {
  designSystem: DesignSystem;
  screens: InitialGenerationScreenPlan[];
}

function buildInitialGenerationPlan(designSystem: DesignSystem): InitialGenerationPlan {
  return {
    designSystem,
    screens: designSystem.screens.map((config, index) => ({
      name: config.name,
      purpose: config.purpose,
      layoutDescription: config.layoutDescription,
      dataModel: config.dataModel,
      interactions: config.interactions,
      stateManagement: config.stateManagement,
      skeletonId: `skeleton-${index}-${config.id}`,
    })),
  };
}

function createInitialSkeletonScreens(plan: InitialGenerationPlan): ScreenData[] {
  return plan.screens.map((config, index) => ({
    id: config.skeletonId,
    name: config.name,
    type: "custom",
    parentScreenId: null,
    imageUrl: null,
    thumbnailUrl: null,
    htmlContent: null,
    aiPrompt: config.purpose,
    createdAt: null,
    updatedAt: null,
    x: 100 + index * SCREEN_SPACING_X,
    y: 100,
    width: DEVICE_WIDTH,
    height: DEVICE_HEIGHT,
    visible: true,
    isLoading: true,
    loadingText: `Generating ${config.name}...`,
    screenNameForMatching: config.name,
    generationIndex: index,
    skeletonId: config.skeletonId,
  }));
}

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as LocationState | null;
  const isRNProjectRef = useRef(false);

  // ---------- Screen data state ----------
  const [screens, setScreens] = useState<ScreenData[]>([]);
  const hasLoadingScreens = useMemo(
    () => screens.some(s => s.isLoading && !s.hasError && s.buildStatus !== 'error'),
    [screens],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ---------- UI state ----------
  const [centerTab, setCenterTab] = useState<'preview' | 'code'>('preview');
  const [showCodePreview, setShowCodePreview] = useState(true);
  const [pipRefreshKey, setPipRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [dirtyFiles, setDirtyFiles] = useState<Record<string, string>>({});
  const [savingFile, setSavingFile] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview' | 'test'>('chat');
  const [codeTreeTab, setCodeTreeTab] = useState<'screens' | 'files'>('files');
  // Deployment — live preview via Railover container
  const { deployment, provision, wake } = useDeployment(projectId);
  const deploymentWebUrl = useMemo(() => deployment?.webUrl || null, [deployment?.webUrl]);
  const [triggerMessage, setTriggerMessage] = useState<string | undefined>();
  const [triggerScreenId, setTriggerScreenId] = useState<string | undefined>();
  const [variationParentId, setVariationParentId] = useState<string | undefined>();
  const [_isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showProjectHistory, setShowProjectHistory] = useState(false);
  const [designSystemOpen, setDesignSystemOpen] = useState(false);
  const chatResize = useResizablePanel({ defaultWidth: 380, minWidth: 280, maxWidth: 550, storageKey: 'appx-chat-width' });
  const chatWidth = chatResize.width;
  const [showDesignSystemPanel, setShowDesignSystemPanel] = useState(false);
  const [progressMessages] = useState<Map<string, unknown>>(new Map());
  const [initialRecommendations, setInitialRecommendations] = useState<{
    essential: RecommendationItem[];
    optional: RecommendationItem[];
  } | null>(null);
  const [designSystemProcessed, setDesignSystemProcessed] = useState(false);
  const [deleteConfirmScreenIds, setDeleteConfirmScreenIds] = useState<string[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const queryClient = useQueryClient();

  // One-time cleanup of old right panel width from localStorage
  useEffect(() => {
    localStorage.removeItem('appx-right-width');
  }, []);

  // ---------- Socket connection ----------
  const {
    isConnected: socketConnected,
    isReconnecting: socketReconnecting,
    connectionError: socketError,
    screenStates: socketScreenStates,
    onScreenComplete,
    onScreenError,
    chatState: socketChatState,
    sendMessage: socketSendMessage,
    onChatComplete,
    onChatError,
    startGeneration,
    retryScreen,
    multiFileState,
    startMultiFileGeneration,
    modifyMultiFile,
    actionLogs,
    isActionLogActive,
    designSystemState,
    generateDesignSystem,
    isProjectJoined,
    emitEditUndo,
    onEditUndone,
  } = useProjectSocket(projectId);

  // ---------- Thumbnail generation ----------
  const generateAndUploadThumbnail = useCallback(
    async (screenId: string, htmlContent: string, retryCount = 0) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000;

      if (!projectId || !htmlContent) return;
      if (isReactCode(htmlContent)) return;

      try {
        const blob = await generateScreenThumbnail(htmlContent);
        const result = await projectsApiClient.uploadScreenThumbnail(projectId, screenId, blob);
        setScreens((prev) =>
          prev.map((s) =>
            s.id === screenId
              ? { ...s, thumbnailUrl: result.thumbnailUrl, imageUrl: result.imageUrl }
              : s
          )
        );
      } catch (error) {
        console.error('[Thumbnail] Failed for screen', screenId, error);
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            generateAndUploadThumbnail(screenId, htmlContent, retryCount + 1);
          }, RETRY_DELAY * (retryCount + 1));
        }
      }
    },
    [projectId]
  );

  // ---------- Socket: screen:complete ----------
  const deliveredScreenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onScreenComplete((data: ScreenCompleteData) => {
      const compiledHtml = (data as any).compiledHtml as string | null | undefined;
      const compiledHtmlUrl = (data as any).compiledHtmlUrl as string | null | undefined;
      const contentType = (data as any).contentType as 'react' | 'html' | 'react-native' | undefined;
      const dataBuildStatus = (data as any).buildStatus as 'valid' | 'error' | 'skeleton' | 'unknown' | undefined;
      const reactNativeCode = data.reactNativeCode || null;

      deliveredScreenIdsRef.current.add(data.screenId);

      setScreens((prev) => {
        let skeletonIndex = -1;
        if (data.skeletonId) {
          skeletonIndex = prev.findIndex(
            (s) => s.isLoading && s.skeletonId === data.skeletonId
          );
        }
        if (skeletonIndex === -1 && data.index !== undefined && data.index >= 0) {
          skeletonIndex = prev.findIndex(
            (s) => s.isLoading && s.generationIndex === data.index
          );
        }
        if (skeletonIndex === -1) {
          const normalizedDataName = data.name.toLowerCase().replace(/[_\s-]+/g, '');
          skeletonIndex = prev.findIndex(
            (s) => s.isLoading &&
              s.screenNameForMatching?.toLowerCase().replace(/[_\s-]+/g, '') === normalizedDataName
          );
        }

        if (skeletonIndex !== -1) {
          const skeleton = prev[skeletonIndex];
          const updated = [...prev];
          updated[skeletonIndex] = {
            ...skeleton,
            id: data.screenId,
            name: data.name,
            htmlContent: data.html,
            reactNativeCode,
            compiledHtml: compiledHtml || null,
            compiledHtmlUrl: compiledHtmlUrl || null,
            contentType: contentType || (isReactCode(data.html) ? 'react' : 'html'),
            buildStatus: dataBuildStatus,
            thumbnailUrl: data.thumbnailUrl || null,
            isLoading: false,
            loadingText: undefined,
          };
          return updated;
        }

        const existingIndex = prev.findIndex((s) => s.id === data.screenId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...prev[existingIndex],
            htmlContent: data.html,
            reactNativeCode: reactNativeCode || prev[existingIndex].reactNativeCode || null,
            compiledHtml: compiledHtml || prev[existingIndex].compiledHtml || null,
            compiledHtmlUrl: compiledHtmlUrl || prev[existingIndex].compiledHtmlUrl || null,
            contentType: contentType || prev[existingIndex].contentType,
            buildStatus: dataBuildStatus,
            thumbnailUrl: data.thumbnailUrl || null,
            isLoading: false,
            loadingText: undefined,
          };
          return updated;
        }

        const normalizedIncoming = data.name.toLowerCase().replace(/[_\s-]+/g, '');
        const alreadyExists = prev.some(
          (s) => !s.isLoading && s.name.toLowerCase().replace(/[_\s-]+/g, '') === normalizedIncoming
        );
        if (alreadyExists) return prev;

        const mainScreensCount = prev.filter((s) => !s.parentScreenId).length;
        const newScreen: ScreenData = {
          id: data.screenId,
          name: data.name,
          type: 'custom',
          parentScreenId: null,
          imageUrl: null,
          thumbnailUrl: data.thumbnailUrl || null,
          htmlContent: data.html,
          reactNativeCode,
          compiledHtml: compiledHtml || null,
          compiledHtmlUrl: compiledHtmlUrl || null,
          contentType: contentType || (isReactCode(data.html) ? 'react' : 'html'),
          buildStatus: dataBuildStatus,
          aiPrompt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          x: 100 + mainScreensCount * SCREEN_SPACING_X,
          y: 100,
          width: DEVICE_WIDTH,
          height: DEVICE_HEIGHT,
          visible: true,
        };
        return [...prev, newScreen];
      });

      queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      if (data.html && data.screenId) {
        generateAndUploadThumbnail(data.screenId, data.html);
      }

    });
  }, [onScreenComplete, projectId, queryClient, generateAndUploadThumbnail]);

  // ---------- Socket: screen:error ----------
  useEffect(() => {
    onScreenError((data: ScreenErrorData) => {
      setScreens((prev) => {
        let skeletonIndex = -1;
        if (data.skeletonId) {
          skeletonIndex = prev.findIndex(
            (s) => s.isLoading && s.skeletonId === data.skeletonId
          );
        }
        if (skeletonIndex === -1 && data.index !== undefined && data.index >= 0) {
          skeletonIndex = prev.findIndex(
            (s) => s.isLoading && s.generationIndex === data.index
          );
        }
        if (skeletonIndex !== -1) {
          const skeleton = prev[skeletonIndex];
          const updated = [...prev];
          updated[skeletonIndex] = {
            ...skeleton,
            isLoading: false,
            loadingText: undefined,
            hasError: true,
            errorMessage: data.error,
          };
          return updated;
        }
        return prev;
      });
    });
  }, [onScreenError]);

  // ---------- Project query ----------
  const {
    data: project,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID required");
      const response = await projectsApi.get(projectId);
      return response.data.data;
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (hasLoadingScreens) return 10000;
      if (data?.status === "generating") return 3000;
      return false;
    },
  });

  const isRNProject = project?.generationTarget === 'rn';
  isRNProjectRef.current = isRNProject;

  // ---------- Project files for web preview ----------
  const { data: projectFiles } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const response = await api.get(`/projects/${projectId}/files`);
      return response.data.data || response.data;
    },
    enabled: !!projectId,
  });

  const filesMap = useMemo(() => {
    if (!projectFiles?.length) return undefined;
    const map: Record<string, string> = {};
    for (const f of projectFiles) {
      const key = f.path.startsWith('/') ? f.path.slice(1) : f.path;
      map[key] = f.content;
    }
    return map;
  }, [projectFiles]);

  // Build file-type map keyed by lowercase screen name for ScreenListPanel badges
  const fileTypeMap = useMemo(() => {
    if (!projectFiles?.length) return undefined;
    const map: Record<string, { fileType?: string; filePath?: string }> = {};
    for (const f of projectFiles) {
      if (f.screenName) {
        map[f.screenName.toLowerCase()] = {
          fileType: f.isScreen ? 'screen' : (f.contentType || undefined),
          filePath: f.path,
        };
      } else if (f.isScreen) {
        // Derive name from path: app/(tabs)/profile.tsx => "profile"
        const name = (f.path.split('/').pop() || '').replace(/\.tsx?$/, '');
        if (name && name !== '_layout' && name !== 'index') {
          map[name.toLowerCase()] = { fileType: 'screen', filePath: f.path };
        } else if (name === 'index') {
          map['home'] = { fileType: 'screen', filePath: f.path };
        }
      }
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [projectFiles]);

  // ---------- Editable code tab ----------
  const { saveFile } = useProjectFiles(projectId);
  const user = useAuthStore((s) => s.user);
  const userPlan = (user?.plan as PlanType) || 'free';
  const canEditCode = PLAN_FEATURES[userPlan].codeExport;

  const selectedFileId = useMemo(() => {
    if (!selectedFile || !projectFiles?.length) return null;
    const f = projectFiles.find((f: { path: string; id: string }) => f.path === selectedFile);
    return f?.id ?? null;
  }, [selectedFile, projectFiles]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!selectedFile || !value || !canEditCode) return;
    setDirtyFiles(prev => ({ ...prev, [selectedFile]: value }));
    // Debounced auto-save after 1.5s
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!selectedFileId) return;
      setSavingFile(selectedFile);
      saveFile(selectedFileId, selectedFile, value).finally(() => {
        setSavingFile(null);
        setDirtyFiles(prev => {
          const next = { ...prev };
          delete next[selectedFile];
          return next;
        });
      });
    }, 1500);
  }, [selectedFile, selectedFileId, canEditCode, saveFile]);

  const handleEditorSave = useCallback(() => {
    if (!selectedFile || !selectedFileId || !canEditCode) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const content = dirtyFiles[selectedFile];
    if (!content) return; // nothing dirty
    setSavingFile(selectedFile);
    saveFile(selectedFileId, selectedFile, content).finally(() => {
      setSavingFile(null);
      setDirtyFiles(prev => {
        const next = { ...prev };
        delete next[selectedFile];
        return next;
      });
    });
  }, [selectedFile, selectedFileId, canEditCode, dirtyFiles, saveFile]);

  // Derive tab screens from project files when app/(tabs)/*.tsx files exist (reserved for upcoming feature)
  void useMemo(() => {
    if (!filesMap) return undefined;
    let tabEntries = Object.entries(filesMap)
      .filter(([path]) => /^app\/\(tabs\)\/[^/]+\.tsx?$/.test(path))
      .filter(([path]) => !path.includes("_layout"))
      .sort(([a], [b]) => {
        if (a.includes("index.")) return -1;
        if (b.includes("index.")) return 1;
        return a.localeCompare(b);
      });

    // Remove home.tsx if index.tsx exists — index IS the home screen
    const hasIndex = tabEntries.some(([p]) => p.includes('index.'));
    if (hasIndex) {
      tabEntries = tabEntries.filter(([p]) => {
        const name = (p.split('/').pop() || '').replace(/\.tsx?$/, '').toLowerCase();
        return name !== 'home';
      });
    }

    if (tabEntries.length === 0) return undefined;

    // Parse icon names from _layout.tsx (AI generates <Tabs.Screen name="..." ... <IconName .../>)
    const layoutCode = filesMap['app/(tabs)/_layout.tsx'] || '';
    const iconMap: Record<string, string> = {};
    const iconRegex = /Tabs\.Screen\s+name=["']([^"']+)["'][\s\S]*?tabBarIcon:[\s\S]*?<(\w+)/g;
    let match;
    while ((match = iconRegex.exec(layoutCode)) !== null) {
      iconMap[match[1]] = match[2];
    }

    return tabEntries.map(([path]) => {
      const fileName = (path.split("/").pop() || "tab").replace(/\.tsx?$/, "");
      const name =
        fileName === "index"
          ? "Home"
          : fileName.charAt(0).toUpperCase() + fileName.slice(1);
      const icon = iconMap[fileName] || undefined;
      return { name, code: filesMap[path], filePath: path, icon };
    });
  }, [filesMap]);

  const projectScreens = project?.screens;
  const initialScreens = useMemo(() => {
    if (!projectScreens) return [];
    return layoutScreens(projectScreens);
  }, [projectScreens]);

  // ---------- Merge API screens into local state ----------
  useEffect(() => {
    if (initialScreens.length === 0) return;

    setScreens((prevScreens) => {
      if (prevScreens.length === 0) return initialScreens;

      const existingScreensMap = new Map(prevScreens.map((s) => [s.id, s]));
      const newApiScreens = initialScreens.filter(
        (s) => !existingScreensMap.has(s.id),
      );

      const updatedExistingScreens = prevScreens.map((prevScreen) => {
        const freshScreen = initialScreens.find((s) => s.id === prevScreen.id);
        if (freshScreen && freshScreen.updatedAt !== prevScreen.updatedAt) {
          return {
            ...prevScreen,
            htmlContent: freshScreen.htmlContent,
            reactNativeCode: freshScreen.reactNativeCode ?? prevScreen.reactNativeCode,
            compiledHtml: freshScreen.compiledHtml ?? prevScreen.compiledHtml,
            compiledHtmlUrl: (freshScreen as any).compiledHtmlUrl ?? prevScreen.compiledHtmlUrl,
            contentType: freshScreen.contentType ?? prevScreen.contentType,
            thumbnailUrl: freshScreen.thumbnailUrl,
            imageUrl: freshScreen.imageUrl,
            updatedAt: freshScreen.updatedAt,
          };
        }
        if (freshScreen && freshScreen.compiledHtml && !prevScreen.compiledHtml) {
          return {
            ...prevScreen,
            compiledHtml: freshScreen.compiledHtml,
            compiledHtmlUrl: (freshScreen as any).compiledHtmlUrl ?? prevScreen.compiledHtmlUrl,
            contentType: freshScreen.contentType ?? prevScreen.contentType,
            thumbnailUrl: freshScreen.thumbnailUrl ?? prevScreen.thumbnailUrl,
            imageUrl: freshScreen.imageUrl ?? prevScreen.imageUrl,
          };
        }
        if (freshScreen && (
          freshScreen.thumbnailUrl !== prevScreen.thumbnailUrl ||
          freshScreen.imageUrl !== prevScreen.imageUrl
        )) {
          return {
            ...prevScreen,
            thumbnailUrl: freshScreen.thumbnailUrl,
            imageUrl: freshScreen.imageUrl,
          };
        }
        return prevScreen;
      });

      if (newApiScreens.length === 0) return updatedExistingScreens;

      const mainScreensCount = updatedExistingScreens.filter(
        (s) => !s.parentScreenId,
      ).length;
      const repositionedNewScreens = newApiScreens.map((screen, i) => {
        if (!screen.parentScreenId) {
          return {
            ...screen,
            x: 100 + (mainScreensCount + i) * SCREEN_SPACING_X,
            y: 100,
          };
        }
        const parent = updatedExistingScreens.find(
          (p) => p.id === screen.parentScreenId,
        );
        if (parent) {
          const existingVariations = updatedExistingScreens.filter(
            (s) => s.parentScreenId === screen.parentScreenId,
          );
          return {
            ...screen,
            x: parent.x,
            y: parent.y + (existingVariations.length + 1) * 950,
          };
        }
        return {
          ...screen,
          x: 100 + (mainScreensCount + i) * SCREEN_SPACING_X,
          y: 100,
        };
      });

      return [...updatedExistingScreens, ...repositionedNewScreens];
    });
  }, [initialScreens]);

  // ---------- Polling fallback for screen completion ----------
  useEffect(() => {
    if (!project?.screens || !hasLoadingScreens) return;
    const apiScreens = project.screens;

    setScreens((prev) => {
      let hasChanges = false;
      const updated = prev.map((screen) => {
        if (!screen.isLoading) return screen;
        const normalizedSkeletonName = screen.screenNameForMatching?.toLowerCase().replace(/[_\s-]+/g, '') || '';
        const apiScreen = apiScreens.find(
          (api: any) => api.name.toLowerCase().replace(/[_\s-]+/g, '') === normalizedSkeletonName
        );
        if (apiScreen && (apiScreen.htmlContent || apiScreen.reactNativeCode)) {
          if (deliveredScreenIdsRef.current.has(apiScreen.id)) return screen;
          hasChanges = true;
          deliveredScreenIdsRef.current.add(apiScreen.id);
          return {
            ...screen,
            id: apiScreen.id,
            name: apiScreen.name,
            htmlContent: apiScreen.htmlContent ?? null,
            reactNativeCode: apiScreen.reactNativeCode ?? null,
            compiledHtml: (apiScreen as any).compiledHtml ?? null,
            contentType: (apiScreen as any).contentType,
            thumbnailUrl: apiScreen.thumbnailUrl || null,
            isLoading: false,
            loadingText: undefined,
          };
        }
        return screen;
      });
      return hasChanges ? updated : prev;
    });
  }, [project?.screens, hasLoadingScreens]);

  // ---------- Refetch project when multi-file generation completes ----------
  const prevMultiFileGeneratingRef = useRef(false);
  useEffect(() => {
    if (prevMultiFileGeneratingRef.current && !multiFileState.isGenerating) {
      // Multi-file generation just finished — refetch to pick up new screens
      console.log('[ProjectPage] Multi-file generation done, refetching project...');
      setTimeout(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });

        // Sync file metadata to DB so project_files_v2 reflects newly generated files
        if (projectId) {
          api.post(`/projects/${projectId}/files/sync`).then(() => {
            console.log('[ProjectPage] File metadata synced after generation');
            // Re-invalidate project-files to pick up the synced data
            queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
          }).catch((err) => {
            console.warn('[ProjectPage] File sync failed (non-critical):', err?.message || err);
          });
        }
      }, 1000);

    }
    prevMultiFileGeneratingRef.current = multiFileState.isGenerating;
  }, [multiFileState.isGenerating, multiFileState.files, refetch, queryClient, projectId, project?.name]);

  // ---------- Track completed screens ----------
  const completedScreensRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    completedScreensRef.current = new Set();
    deliveredScreenIdsRef.current = new Set();
  }, [project?.id]);

  // ---------- "All screens ready!" toast ----------
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const prevHasLoadingRef = useRef(false);
  useEffect(() => {
    if (prevHasLoadingRef.current && !hasLoadingScreens && screens.length > 0 && screens.some(s => !s.isLoading && (s.htmlContent || s.reactNativeCode))) {
      setShowCompletionToast(true);
      const timer = setTimeout(() => setShowCompletionToast(false), 3000);
      return () => clearTimeout(timer);
    }
    prevHasLoadingRef.current = hasLoadingScreens;
  }, [hasLoadingScreens, screens]);

  // ---------- Streaming design system generation (from dashboard/wizard) ----------
  const designSystemTriggeredRef = useRef(false);

  useEffect(() => {
    const pending = locationState?.pendingDesignSystem;
    if (!pending || !isProjectJoined || designSystemTriggeredRef.current) return;

    designSystemTriggeredRef.current = true;
    generateDesignSystem(pending);

    // Clear pendingDesignSystem from location state to prevent re-trigger on re-render
    navigate(location.pathname, {
      replace: true,
      state: { ...locationState, pendingDesignSystem: undefined, isNewProject: true },
    });
  }, [isProjectJoined, locationState, generateDesignSystem, navigate, location.pathname]);

  // Restore unapproved plan: if project has a saved designSystem but no screens and
  // generation hasn't been completed, the user left before approving — show the plan modal again.
  useEffect(() => {
    if (!project || designSystemTriggeredRef.current) return;
    if (locationState?.pendingDesignSystem) return; // Will be handled by the effect above
    if (designSystemState.status === 'generating') return; // Already streaming

    const hasSavedDesignSystem = !!project.designSystem;
    const hasNoScreens = !project.screens || project.screens.length === 0;
    const notCompleted = !project.initialGenerationCompleted;

    if (hasSavedDesignSystem && hasNoScreens && notCompleted) {
      setShowPlanApproval(true);
    }
  }, [project, locationState?.pendingDesignSystem, designSystemState.status]);

  // Show plan approval modal early when streaming sections start arriving
  useEffect(() => {
    if (designSystemState.status === 'generating' && designSystemState.sections && Object.keys(designSystemState.sections).length > 0) {
      setShowPlanApproval(true);
    }
  }, [designSystemState.status, designSystemState.sections]);

  // When design system completes via socket, refresh data (modal already open from streaming)
  useEffect(() => {
    if (designSystemState.status !== 'complete' || !designSystemState.designSystem) return;

    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['chatHistory', projectId] });

    // Ensure modal is open (fallback for non-streaming path)
    setShowPlanApproval(true);
  }, [designSystemState.status, designSystemState.designSystem, queryClient, projectId]);

  // ---------- Initial generation ----------
  const [generationStarted, setGenerationStarted] = useState(false);
  const [showPlanApproval, setShowPlanApproval] = useState(
    locationState?.showPlanApproval === true
  );
  const [approvedDesignSystem, setApprovedDesignSystem] = useState<DesignSystem | null>(null);
  const [pendingInitialGeneration, setPendingInitialGeneration] =
    useState<InitialGenerationPlan | null>(null);
  const [initialGenerationError, setInitialGenerationError] = useState<string | null>(null);
  const [isStartingInitialGeneration, setIsStartingInitialGeneration] = useState(false);

  const queueInitialGeneration = useCallback((designSystem: DesignSystem | null | undefined) => {
    if (!designSystem) return;
    setInitialGenerationError(null);
    setPendingInitialGeneration(buildInitialGenerationPlan(designSystem));
  }, []);

  useEffect(() => {
    if (!showPlanApproval && locationState?.showPlanApproval && locationState?.designSystem) {
      navigate(location.pathname, { replace: true, state: { ...locationState, showPlanApproval: false } });
    }
  }, [showPlanApproval, location.pathname, locationState, navigate]);

  useEffect(() => {
    if (designSystemProcessed || pendingInitialGeneration || generationStarted || !projectId || initialGenerationError) return;
    if (showPlanApproval) return; // Wait for user to approve the plan

    const isNewProjectFromWizard = locationState?.isNewProject === true;
    const initialGenerationDone = project?.initialGenerationCompleted === true;

    // Only auto-generate from explicitly approved design system or wizard locationState.
    // NEVER auto-generate from project.designSystem — user must approve via PlanApprovalModal first.
    const designSystem =
      approvedDesignSystem ||
      (isNewProjectFromWizard ? locationState?.designSystem : null);

    if (!designSystem) {
      if (initialGenerationDone && !isNewProjectFromWizard) {
        setDesignSystemProcessed(true);
      }
      // If project has unapproved designSystem + no screens → the restore effect shows PlanApprovalModal
      return;
    }

    queueInitialGeneration(designSystem);
  }, [
    queueInitialGeneration,
    approvedDesignSystem,
    designSystemProcessed,
    generationStarted,
    initialGenerationError,
    locationState,
    pendingInitialGeneration,
    project,
    projectId,
    showPlanApproval,
  ]);

  useEffect(() => {
    if (!pendingInitialGeneration || generationStarted || designSystemProcessed || isStartingInitialGeneration || initialGenerationError) return;
    if (!socketConnected) return;

    let cancelled = false;

    const startInitialGeneration = async () => {
      setIsStartingInitialGeneration(true);
      setInitialGenerationError(null);

      try {
        await startGeneration({
          screens: pendingInitialGeneration.screens,
          theme: pendingInitialGeneration.designSystem.theme as unknown as Record<string, string>,
          themeMode: pendingInitialGeneration.designSystem.themeMode || "light",
          navigation: pendingInitialGeneration.designSystem.navigation,
          projectVisualDescription: pendingInitialGeneration.designSystem.projectVisualDescription,
        });

        if (cancelled) return;

        const skeletonScreens = createInitialSkeletonScreens(pendingInitialGeneration);
        setScreens(skeletonScreens);
        if (skeletonScreens.length > 0) {
          setSelectedIds([skeletonScreens[0].id]);
        }
        setGenerationStarted(true);
        setDesignSystemProcessed(true);
        setPendingInitialGeneration(null);
      } catch (error) {
        if (cancelled) return;
        setInitialGenerationError(
          error instanceof Error ? error.message : "Failed to start initial generation.",
        );
        setPendingInitialGeneration(null);
      } finally {
        if (!cancelled) {
          setIsStartingInitialGeneration(false);
        }
      }
    };

    void startInitialGeneration();

    return () => {
      cancelled = true;
    };
  }, [
    designSystemProcessed,
    generationStarted,
    initialGenerationError,
    isStartingInitialGeneration,
    pendingInitialGeneration,
    socketConnected,
    startGeneration,
  ]);

  // Hydrate planned skeleton screens as soon as their streamed file completes.
  // This avoids waiting for the full multi-file batch before preview/device testing becomes usable.
  useEffect(() => {
    if (multiFileState.files.size === 0) return;

    setScreens((prev) => {
      let changed = false;
      const updated = [...prev];

      for (const [filePath, fileState] of multiFileState.files.entries()) {
        if (!fileState.isComplete || !fileState.content) continue;

        const screenName = getScreenNameFromExpoFilePath(filePath);
        if (!screenName) continue;

        const normalizedScreenName = normalizeScreenNameForMatching(screenName);
        const screenIndex = updated.findIndex(
          (screen) =>
            normalizeScreenNameForMatching(screen.screenNameForMatching || screen.name) === normalizedScreenName,
        );

        if (screenIndex === -1) continue;

        const screen = updated[screenIndex];
        if (screen.reactNativeCode === fileState.content && !screen.isLoading) continue;

        updated[screenIndex] = {
          ...screen,
          htmlContent: fileState.content,
          reactNativeCode: fileState.content,
          contentType: "react-native",
          buildStatus: screen.buildStatus ?? "unknown",
          isLoading: false,
          loadingText: undefined,
        };
        changed = true;
      }

      return changed ? updated : prev;
    });
  }, [multiFileState.files, screens]);

  // ---------- Recommendations ----------
  useEffect(() => {
    if (!project?.pendingRecommendations || initialRecommendations) return;
    const recs = project.pendingRecommendations as Array<{
      id: string; name: string; type: string; category: string; description?: string;
    }>;
    if (recs.length > 0) {
      const essential = recs
        .filter((r) => r.category === "essential")
        .map((r) => ({ id: r.id, name: r.name, type: r.type, description: r.description || "" }));
      const optional = recs
        .filter((r) => r.category === "optional")
        .map((r) => ({ id: r.id, name: r.name, type: r.type, description: r.description || "" }));
      if (essential.length > 0 || optional.length > 0) {
        setInitialRecommendations({ essential, optional });
      }
    }
  }, [project?.pendingRecommendations, initialRecommendations]);

  // ---------- Warn before leaving ----------
  useEffect(() => {
    if (!hasLoadingScreens) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasLoadingScreens]);

  // ---------- Navigate from iframes ----------
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'navigateToScreen') return;
      const { targetPath, targetLabel } = event.data as { targetPath: string; targetLabel: string };
      const normalizedTarget = targetPath.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedLabel = targetLabel?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      const targetScreen = screens.find((s) => {
        const screenSlug = slugify(s.name);
        const normalizedScreen = screenSlug.replace(/[^a-z0-9]/g, '');
        return (
          screenSlug === targetPath ||
          normalizedScreen === normalizedTarget ||
          normalizedScreen.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedScreen) ||
          (normalizedLabel && normalizedScreen.includes(normalizedLabel)) ||
          (normalizedLabel && normalizedLabel.includes(normalizedScreen))
        );
      });
      if (targetScreen) setSelectedIds([targetScreen.id]);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [screens]);

  // ---------- Auto-select first file when files load ----------
  useEffect(() => {
    if (projectFiles?.length && !selectedFile) {
      setSelectedFile(projectFiles[0].path);
    }
  }, [projectFiles, selectedFile]);

  // Clean up auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ---------- Auto-select first screen ----------
  useEffect(() => {
    if (screens.length > 0 && selectedIds.length === 0) {
      const homeScreen = screens.find(
        (s) =>
          !s.isLoading &&
          !s.hasError &&
          !s.parentScreenId &&
          normalizeScreenNameForMatching(s.name) === "home",
      );
      const firstNonLoading = screens.find(s => !s.isLoading && !s.hasError && !s.parentScreenId);
      if (homeScreen) setSelectedIds([homeScreen.id]);
      else if (firstNonLoading) setSelectedIds([firstNonLoading.id]);
      else if (screens[0]) setSelectedIds([screens[0].id]);
    }
  }, [screens, selectedIds.length]);

  // ---------- Update selection when skeleton completes ----------
  useEffect(() => {
    if (selectedIds.length !== 1) return;
    const selectedId = selectedIds[0];
    if (selectedId.startsWith('skeleton-')) {
      const realScreen = screens.find(s => !s.isLoading && s.skeletonId === selectedId);
      if (realScreen) setSelectedIds([realScreen.id]);
    }
  }, [screens, selectedIds]);

  // ---------- Selected screen ----------
  const selectedScreen =
    selectedIds.length === 1
      ? screens.find((s) => s.id === selectedIds[0])
      : null;

  // Derive active progress from socket screen states
  const activeProgress = useMemo(() => {
    if (socketScreenStates.size === 0) return null;
    const loadingScreens = screens.filter(s => s.isLoading);
    if (loadingScreens.length === 0) return null;
    const completedCount = Array.from(socketScreenStates.values()).filter(s => s.status === 'complete').length;
    const currentScreen = Array.from(socketScreenStates.entries()).find(([, s]) => s.status === 'generating' || s.status === 'streaming');
    const currentScreenData = currentScreen ? screens.find(s => (s.skeletonId || s.id) === currentScreen[0]) : null;
    return {
      overallProgress: loadingScreens.length > 0 ? (completedCount / loadingScreens.length) * 100 : 0,
      currentScreen: currentScreenData ? { name: currentScreenData.name } : undefined,
    };
  }, [socketScreenStates, screens]);

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isTyping) return;
      switch (e.key) {
        case "Delete":
        case "Backspace":
          if (selectedIds.length > 0) {
            e.preventDefault();
            setDeleteConfirmScreenIds([...selectedIds]);
          }
          break;
        case "Escape":
          setSelectedIds([]);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds]);

  // ---------- Handlers ----------
  const handleDeleteScreen = useCallback(async (screenIdsToDelete?: string[]) => {
    const idsToDelete = screenIdsToDelete || [...selectedIds];
    if (idsToDelete.length === 0 || !projectId) return;
    const removedScreens: ScreenData[] = [];
    setScreens((prev) => {
      const kept: ScreenData[] = [];
      for (const s of prev) {
        if (idsToDelete.includes(s.id)) removedScreens.push(s);
        else kept.push(s);
      }
      return kept;
    });
    setSelectedIds([]);
    for (const screenId of idsToDelete) {
      try {
        await projectsApi.deleteScreen(projectId, screenId);
      } catch (error) {
        console.error(`Failed to delete screen ${screenId}:`, error);
        const failedScreen = removedScreens.find(s => s.id === screenId);
        if (failedScreen) setScreens((prev) => [...prev, failedScreen]);
      }
    }
  }, [selectedIds, projectId]);

  const handleRetryScreen = useCallback((screen: ScreenData) => {
    const designSystem = locationState?.designSystem || project?.designSystem;
    if (!designSystem || !screen.skeletonId) return;
    const screenConfig = designSystem.screens.find(
      (s: { id: string; name: string }) => screen.skeletonId?.includes(s.id) || s.name === screen.name
    );
    if (!screenConfig) return;
    setScreens(prev => prev.map(s =>
      s.id === screen.id
        ? { ...s, isLoading: true, hasError: false, errorMessage: undefined, loadingText: `Retrying ${screen.name}...` }
        : s
    ));
    retryScreen({
      name: screenConfig.name,
      purpose: screenConfig.purpose,
      layoutDescription: screenConfig.layoutDescription,
      skeletonId: screen.skeletonId,
    });
  }, [locationState, project, retryScreen]);

  const handleRunOnDevice = useCallback(() => {
    // Deployment handled via useDeployment hook in CanvasHeader
  }, []);
  const handleSettings = useCallback(() => setShowSettings(true), []);

  const handleDesignSystemChange = useCallback(
    async (customization: DesignSystemCustomization) => {
      if (!projectId) return;
      try {
        await projectsApi.updateDesignSystem(projectId, customization);
        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        queryClient.invalidateQueries({ queryKey: ["screens", projectId] });
      } catch (error) {
        console.error("Failed to update design system:", error);
      }
    },
    [projectId, queryClient],
  );

  const handleViewScreen = useCallback((screenId: string) => setSelectedIds([screenId]), []);

  // Select screen in code tab — also find its corresponding file
  const handleCodeScreenSelect = useCallback((screenId: string) => {
    setSelectedIds([screenId]);
    const screen = screens.find(s => s.id === screenId);
    if (screen && projectFiles?.length) {
      // Try to find the matching file by screen name -> file path
      const screenSlug = slugify(screen.name);
      const matchingFile = projectFiles.find((f: { path: string; isScreen?: boolean; screenName?: string | null }) =>
        f.isScreen && f.screenName?.toLowerCase() === screen.name.toLowerCase()
      ) || projectFiles.find((f: { path: string }) =>
        f.path.toLowerCase().includes(screenSlug) && f.path.endsWith('.tsx')
      );
      if (matchingFile) {
        setSelectedFile(matchingFile.path);
      }
    }
  }, [screens, projectFiles]);

  const handleGenerateRecommended = useCallback(
    async (screenIds: string[]) => {
      if (!project?.id) return;
      try {
        await chatApi.generateRecommendedScreens(project.id, screenIds);
        refetch();
      } catch (error) {
        console.error("Failed to generate recommended screens:", error);
      }
    },
    [project?.id, refetch],
  );

  const handleDismissRecommendations = useCallback(async (_screenIds: string[]) => {}, []);

  const handleUpdateScreenBrief = useCallback(
    async (screenId: string, brief: string) => {
      if (!project?.id) return;
      try {
        await projectsApi.updateScreen(project.id, screenId, { aiPrompt: brief });
        setScreens((prev) =>
          prev.map((s) => (s.id === screenId ? { ...s, aiPrompt: brief } : s)),
        );
      } catch (error) {
        console.error("Failed to update screen brief:", error);
        throw error;
      }
    },
    [project?.id],
  );

  const handleFeaturesChange = useCallback(async (features: string[]) => {
    if (!projectId) return;
    try {
      await projectsApi.updateFeatures(projectId, features);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    } catch (error) {
      console.error('Failed to update features:', error);
    }
  }, [projectId, queryClient]);

  // ---------- Preview props ----------
  const selectedBuildStatus = selectedScreen?.compiledHtml ? ('ready' as const) : ('idle' as const);
  const selectedStreamingState = selectedScreen
    ? socketScreenStates.get(selectedScreen.skeletonId || selectedScreen.id)
    : undefined;
  const initialGenerationWaitingForSocket =
    !!pendingInitialGeneration && !socketConnected && !generationStarted && !designSystemProcessed;

  // ---------- Loading / Error / Generating states ----------
  if (isLoading || (initialScreens.length > 0 && screens.length === 0)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-surface-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
        <p className="text-surface-400">Loading project...</p>
      </div>
    );
  }

  if (isError || (!isLoading && !project)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-surface-950">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Failed to load project</h2>
        <p className="text-surface-400 mb-6">We couldn't load your project. Please try again.</p>
        <div className="flex gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-xl bg-surface-800 text-white font-medium hover:bg-surface-700 transition-colors"
          >
            Back to Dashboard
          </Link>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (project?.status === "generating" && screens.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-surface-950">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-surface-700 border-t-primary-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Generating your screens...</h2>
            <p className="text-surface-400 max-w-md">
              Our AI is creating your screens. This usually takes 1-2 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // MAIN RENDER: 3-panel layout (Chat | Preview | Test)
  // ========================================================================
  return (
    <div
      className="h-screen flex flex-col bg-surface-950 overflow-hidden"
      style={{ overscrollBehavior: "none" }}
    >
      <CanvasHeader
        projectId={projectId}
        projectName={project?.name || "Untitled Project"}
        onSettings={handleSettings}
        socketConnected={socketConnected}
        socketReconnecting={socketReconnecting}
        socketError={socketError}
        lastSavedAt={project?.updatedAt}
        onDeploymentComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        }}
        centerTab={centerTab}
        onCenterTabChange={setCenterTab}
        onHistory={() => setShowProjectHistory(prev => !prev)}
      />

      {(initialGenerationWaitingForSocket || initialGenerationError) && (
        <div className="px-4 py-2 border-b border-surface-800 bg-surface-900/90">
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm",
              initialGenerationError
                ? "border border-red-500/20 bg-red-500/10 text-red-300"
                : "border border-amber-500/20 bg-amber-500/10 text-amber-200",
            )}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {initialGenerationError ||
                  "Waiting for the realtime connection before initial generation can start."}
              </span>
            </div>
            {initialGenerationError && (
              <button
                onClick={() =>
                  queueInitialGeneration(
                    approvedDesignSystem ||
                      locationState?.designSystem ||
                      project?.designSystem ||
                      null,
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ DESKTOP 3-PANEL LAYOUT ============ */}
      <div className="hidden md:flex flex-1 overflow-hidden relative">
        {/* ============ LEFT PANEL: Chat ============ */}
        <div style={{ width: chatWidth }} className="flex-shrink-0 flex flex-col border-r border-surface-800/50 bg-surface-950/80 backdrop-blur-xl">
          {/* AI Chat */}
          <div className="flex-1 overflow-hidden">
            {projectId && (
              <ChatSidebar
                projectId={projectId}
                projectName={project?.name || "Untitled Project"}
                screenId={selectedScreen?.id}
                screenName={selectedScreen?.name}
                parentScreenId={variationParentId}
                isCollapsed={false}
                onToggleCollapse={() => {}}
                embedded
                triggerMessage={triggerMessage}
                triggerScreenId={triggerScreenId}
                onTriggerMessageConsumed={() => {
                  setTriggerMessage(undefined);
                  setTriggerScreenId(undefined);
                }}
                onGenerationStart={() => setIsGeneratingVariation(true)}
                onGenerationEnd={() => {
                  setIsGeneratingVariation(false);
                  setVariationParentId(undefined);
                }}
                onSetScreenLoading={(screenId, loading, loadingText) => {
                  setScreens((prev) =>
                    prev.map((s) =>
                      s.id === screenId
                        ? { ...s, isLoading: loading, loadingText: loading ? loadingText : undefined }
                        : s,
                    ),
                  );
                }}
                onScreenCreated={(screen) => {
                  if (screen) {
                    setScreens((prev) => {
                      const existingIndex = prev.findIndex((s) => s.id === screen.id);
                      if (existingIndex !== -1) {
                        const existingScreen = prev[existingIndex];
                        const updated = [...prev];
                        updated[existingIndex] = {
                          ...existingScreen,
                          htmlContent: screen.htmlContent,
                          name: screen.name || existingScreen.name,
                          designData: screen.designData || existingScreen.designData,
                          isLoading: false,
                          loadingText: undefined,
                        };
                        return updated;
                      }
                      const skeletonIndex = prev.findIndex(
                        (s) =>
                          s.isLoading && s.screenNameForMatching?.replace(/_/g, " ").toLowerCase() === screen.name.toLowerCase(),
                      );
                      if (skeletonIndex !== -1) {
                        const skeleton = prev[skeletonIndex];
                        const newScreen = transformStreamScreenToCanvas(screen, prev);
                        newScreen.x = skeleton.x;
                        newScreen.y = skeleton.y;
                        const updated = [...prev];
                        updated[skeletonIndex] = newScreen;
                        return updated;
                      }
                      const newScreen = transformStreamScreenToCanvas(screen, prev);
                      return [...prev, newScreen];
                    });
                    if (screen.id) setSelectedIds([screen.id]);
                  }
                  queryClient.invalidateQueries({ queryKey: ["project", projectId] });
                  queryClient.invalidateQueries({ queryKey: ["chatHistory", projectId] });
                  refetch();
                  useAuthStore.getState().refreshCredits();
                }}
                onAddSkeletons={(screenNames) => {
                  setScreens((prev) => {
                    const mainScreensCount = prev.filter(
                      (s) => !s.parentScreenId && !s.isLoading,
                    ).length;
                    const skeletons: ScreenData[] = screenNames.map((name, i) => ({
                      id: `skeleton-${name}-${Date.now()}-${i}`,
                      name: name,
                      type: "custom",
                      parentScreenId: null,
                      imageUrl: null,
                      thumbnailUrl: null,
                      htmlContent: null,
                      aiPrompt: null,
                      createdAt: null,
                      updatedAt: null,
                      x: 100 + (mainScreensCount + i) * SCREEN_SPACING_X,
                      y: 100,
                      width: DEVICE_WIDTH,
                      height: DEVICE_HEIGHT,
                      visible: true,
                      isLoading: true,
                      loadingText: `Generating ${name}...`,
                      screenNameForMatching: name,
                    }));
                    return [...prev, ...skeletons];
                  });
                }}
                onRemoveSkeletons={(screenNames) => {
                  setScreens((prev) =>
                    prev.filter(
                      (s) =>
                        !s.isLoading ||
                        !screenNames.includes(s.screenNameForMatching || ""),
                    ),
                  );
                }}
                onViewScreen={handleViewScreen}
                progressMessages={progressMessages}
                activeProgress={activeProgress}
                onGenerateRecommended={handleGenerateRecommended}
                onDismissRecommendations={handleDismissRecommendations}
                screens={screens}
                onUpdateScreenBrief={handleUpdateScreenBrief}
                initialRecommendations={initialRecommendations}
                onClearInitialRecommendations={() => setInitialRecommendations(null)}
                socketConnected={socketConnected}
                socketSendMessage={socketSendMessage}
                socketChatState={socketChatState}
                onSocketChatComplete={onChatComplete}
                onSocketChatError={onChatError}
                emitEditUndo={emitEditUndo}
                onEditUndone={onEditUndone}
                startMultiFileGeneration={startMultiFileGeneration}
                modifyMultiFile={modifyMultiFile}
                multiFileState={multiFileState}
                actionLogs={actionLogs}
                isActionLogActive={isActionLogActive}
                enabledFeatures={project?.enabledFeatures || []}
                onFeaturesChange={handleFeaturesChange}
                referenceImageUrl={project?.referenceImageUrl}
                projectFiles={projectFiles}
              />
            )}
          </div>
        </div>

        <ResizeHandle onMouseDown={chatResize.onMouseDown} direction="right" />
        {/* ============ CENTER PANEL: Preview / Code ============ */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {/* Preview tab */}
          {centerTab === 'preview' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {(
                  <PhonePreviewPanel
                    screen={selectedScreen || null}
                    buildStatus={selectedBuildStatus}
                    streamingHtml={selectedStreamingState?.html}
                    stageMessage={selectedStreamingState?.stageMessage || selectedStreamingState?.statusMessage}
                    progressPercent={selectedStreamingState?.progress}
                    isRNProject={isRNProject}
                    expoSessionId={null}
                    deploymentWebUrl={deploymentWebUrl}
                    deployRevision={deployment?.deployRevision}
                    onRegenerate={handleRetryScreen}
                    onRunOnDevice={handleRunOnDevice}
                    onFixErrors={(msg) => setTriggerMessage(msg)}
                  />
                )}

                {/* Empty state — hide if container has a web URL (preview can load from it) */}
                {screens.length === 0 && project?.status !== "generating" && !deploymentWebUrl && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center mx-auto">
                        <MessageSquare className="w-7 h-7 text-surface-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-surface-300">No screens yet</h3>
                        <p className="text-sm text-surface-500 max-w-xs">
                          Use the chat to describe screens you want to create.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <PreviewConsole onFixErrors={(msg) => setTriggerMessage(msg)} />
            </div>
          )}

          {/* Code tab — Rork-style: file tree + editor + floating preview */}
          {centerTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top: file path breadcrumb + preview toggle */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-800/50 bg-surface-900/80">
                <span className="text-[11px] text-surface-500 truncate flex items-center gap-1.5">
                  {selectedFile || 'No file selected'}
                  {selectedFile && dirtyFiles[selectedFile] && !savingFile && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
                  )}
                  {savingFile === selectedFile && (
                    <span className="text-[10px] text-primary-400">Saving...</span>
                  )}
                  {!canEditCode && selectedFile && (
                    <span className="text-[10px] text-surface-600 ml-1">Read-only — upgrade to edit</span>
                  )}
                </span>
                <button
                  onClick={() => setShowCodePreview(v => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                    showCodePreview
                      ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                      : "text-surface-500 hover:text-surface-300 hover:bg-surface-800/50",
                  )}
                  title={showCodePreview ? "Hide preview" : "Show preview"}
                >
                  <Smartphone className="w-3 h-3" />
                  Preview
                </button>
              </div>
              {/* Middle: file tree + editor + optional preview */}
              <div className="flex-1 flex overflow-hidden">
                {/* File tree / Screen list sidebar */}
                <div className="w-56 flex-shrink-0 border-r border-surface-800/50 bg-surface-950 flex flex-col overflow-hidden">
                  {/* Screens | Files tab switcher */}
                  <div className="flex border-b border-surface-800/50">
                    <button
                      onClick={() => setCodeTreeTab('screens')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium transition-colors",
                        codeTreeTab === 'screens'
                          ? "text-white border-b-2 border-primary-400 bg-surface-900/50"
                          : "text-surface-500 hover:text-surface-300 hover:bg-surface-800/30",
                      )}
                    >
                      <Smartphone className="w-3 h-3" />
                      Screens
                    </button>
                    <button
                      onClick={() => setCodeTreeTab('files')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium transition-colors",
                        codeTreeTab === 'files'
                          ? "text-white border-b-2 border-primary-400 bg-surface-900/50"
                          : "text-surface-500 hover:text-surface-300 hover:bg-surface-800/30",
                      )}
                    >
                      <FolderTree className="w-3 h-3" />
                      Files
                    </button>
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-y-auto">
                    {codeTreeTab === 'screens' ? (
                      <ScreenListPanel
                        screens={screens}
                        selectedId={selectedIds[0] ?? null}
                        onSelectScreen={handleCodeScreenSelect}
                        onAddScreen={() => {
                          // Switch to chat to add a new screen
                          setCenterTab('preview');
                        }}
                        fileTypeMap={fileTypeMap}
                      />
                    ) : (!projectFiles || projectFiles.length === 0) ? (
                      <p className="text-xs text-surface-600 px-3 py-3">No files yet</p>
                    ) : (
                      <FileTree
                        files={projectFiles.map((f: { path: string }) => ({ path: f.path }))}
                        selectedFile={selectedFile ?? undefined}
                        onSelectFile={setSelectedFile}
                      />
                    )}
                  </div>
                </div>
                {/* Editor */}
                <div className="flex-1 overflow-hidden">
                  <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center bg-surface-950">
                      <Loader2 className="w-6 h-6 animate-spin text-surface-500" />
                    </div>
                  }>
                    <MonacoEditor
                      height="100%"
                      language={selectedFile?.endsWith('.css') ? 'css' : selectedFile?.endsWith('.json') ? 'json' : 'typescript'}
                      path={selectedFile || undefined}
                      theme="vs-dark"
                      value={
                        selectedFile
                          ? (dirtyFiles[selectedFile] ?? filesMap?.[selectedFile.startsWith('/') ? selectedFile.slice(1) : selectedFile] ?? '// Select a file to view its code')
                          : '// Select a file to view its code'
                      }
                      onChange={handleEditorChange}
                      beforeMount={(monacoInstance) => {
                        // These are RN .tsx files — enable JSX and disable semantic checks
                        monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
                          jsx: monacoInstance.languages.typescript.JsxEmit.ReactJSX,
                          esModuleInterop: true,
                          allowSyntheticDefaultImports: true,
                          moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
                          target: monacoInstance.languages.typescript.ScriptTarget.ESNext,
                          module: monacoInstance.languages.typescript.ModuleKind.ESNext,
                          allowJs: true,
                        });
                        monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                          noSemanticValidation: true,
                          noSyntaxValidation: false,
                        });
                      }}
                      onMount={(editor, monacoInstance) => {
                        editor.addCommand(
                          // Cmd+S (Mac) / Ctrl+S (Win)
                          // eslint-disable-next-line no-bitwise
                          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
                          () => handleEditorSave(),
                        );
                      }}
                      options={{
                        readOnly: !canEditCode,
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 12 },
                      }}
                    />
                  </Suspense>
                </div>
              </div>
              {/* PiP phone preview — draggable floating overlay with live Railover preview */}
              <AnimatePresence>
                {showCodePreview && (
                  <PiPPreview
                    onClose={() => setShowCodePreview(false)}
                    onRefresh={() => setPipRefreshKey(k => k + 1)}
                  >
                    {deploymentWebUrl ? (
                      <iframe
                        key={`pip-${deploymentWebUrl}-${pipRefreshKey}`}
                        src={deploymentWebUrl}
                        className="w-full h-full border-0 bg-white"
                        title="Live Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-900">
                        <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
                      </div>
                    )}
                  </PiPPreview>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Completion toast */}
          <AnimatePresence>
            {showCompletionToast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-40"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/20 border border-green-500/40 rounded-xl backdrop-blur-sm shadow-lg">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">All screens ready!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right panel only visible on preview tab */}
        {centerTab === 'preview' && (
          <DeviceTestingSidebar
            projectId={projectId!}
            expoUrl={deployment?.expoUrl ?? null}
            webUrl={deploymentWebUrl ?? null}
            status={deployment?.status ?? 'none'}
            errorMessage={deployment?.errorMessage ?? undefined}
            onProvision={() => provision()}
            onWake={() => wake()}
            containerCount={1}
            maxContainers={PLAN_FEATURES[userPlan].containers}
            alwaysOn={deployment?.alwaysOn}
            onToggleAlwaysOn={async (enabled) => {
              try {
                await api.patch(`/projects/${projectId}/container/always-on`, { enabled });
                // Update local state so toggle reflects immediately
                if (deployment) {
                  useDeployStore.getState().setDeployment(projectId!, { ...deployment, alwaysOn: enabled });
                }
              } catch (err: any) {
                // Revert toggle on failure
                if (deployment) {
                  useDeployStore.getState().setDeployment(projectId!, { ...deployment, alwaysOn: !enabled });
                }
                console.error('Always-on toggle failed:', err?.response?.data?.message || err.message);
              }
            }}
            isPaidPlan={userPlan === 'pro' || userPlan === 'business'}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Design System Sidebar (overlay) */}
        <AnimatePresence>
          {designSystemOpen && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-surface-900 border-l border-surface-800 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-surface-900/95 backdrop-blur-sm border-b border-surface-800 p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-500/10">
                    <Sparkles className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">Design System</h2>
                    <p className="text-xs text-surface-400">Customize your app's look</p>
                  </div>
                </div>
                <button
                  onClick={() => setDesignSystemOpen(false)}
                  className="p-2 rounded-lg hover:bg-surface-800 transition-colors text-surface-400 hover:text-white"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4">
                {project?.status === "generating" ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full border-2 border-surface-700 border-t-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-surface-400 mb-2">Design system is locked during generation</p>
                    <p className="text-xs text-surface-500">You can customize it once screens are ready</p>
                  </div>
                ) : (
                  <DesignSystemCustomizer
                    baseStyleName={project?.selectedStyle?.name || "Default Style"}
                    customization={project?.designSystemCustomization || {}}
                    designSystem={project?.designSystem}
                    onChange={handleDesignSystemChange}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============ MOBILE SINGLE-PANEL LAYOUT ============ */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'chat' && (
            <div className="h-full flex flex-col">
              {/* AI Chat */}
              <div className="flex-1 overflow-hidden">
                {projectId && (
                  <ChatSidebar
                    projectId={projectId}
                    projectName={project?.name || "Untitled Project"}
                    screenId={selectedScreen?.id}
                    screenName={selectedScreen?.name}
                    parentScreenId={variationParentId}
                    isCollapsed={false}
                    onToggleCollapse={() => {}}
                    embedded
                    triggerMessage={triggerMessage}
                    triggerScreenId={triggerScreenId}
                    onTriggerMessageConsumed={() => {
                      setTriggerMessage(undefined);
                      setTriggerScreenId(undefined);
                    }}
                    onGenerationStart={() => setIsGeneratingVariation(true)}
                    onGenerationEnd={() => {
                      setIsGeneratingVariation(false);
                      setVariationParentId(undefined);
                    }}
                    onSetScreenLoading={(screenId, loading, loadingText) => {
                      setScreens((prev) =>
                        prev.map((s) =>
                          s.id === screenId
                            ? { ...s, isLoading: loading, loadingText: loading ? loadingText : undefined }
                            : s,
                        ),
                      );
                    }}
                    onScreenCreated={(screen) => {
                      if (screen) {
                        setScreens((prev) => {
                          const existingIndex = prev.findIndex((s) => s.id === screen.id);
                          if (existingIndex !== -1) {
                            const existingScreen = prev[existingIndex];
                            const updated = [...prev];
                            updated[existingIndex] = {
                              ...existingScreen,
                              htmlContent: screen.htmlContent,
                              name: screen.name || existingScreen.name,
                              designData: screen.designData || existingScreen.designData,
                              isLoading: false,
                              loadingText: undefined,
                            };
                            return updated;
                          }
                          const skeletonIndex = prev.findIndex(
                            (s) =>
                              s.isLoading && s.screenNameForMatching?.replace(/_/g, " ").toLowerCase() === screen.name.toLowerCase(),
                          );
                          if (skeletonIndex !== -1) {
                            const skeleton = prev[skeletonIndex];
                            const newScreen = transformStreamScreenToCanvas(screen, prev);
                            newScreen.x = skeleton.x;
                            newScreen.y = skeleton.y;
                            const updated = [...prev];
                            updated[skeletonIndex] = newScreen;
                            return updated;
                          }
                          const newScreen = transformStreamScreenToCanvas(screen, prev);
                          return [...prev, newScreen];
                        });
                        if (screen.id) setSelectedIds([screen.id]);
                      }
                      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
                      queryClient.invalidateQueries({ queryKey: ["chatHistory", projectId] });
                      refetch();
                      useAuthStore.getState().refreshCredits();
                    }}
                    onAddSkeletons={(screenNames) => {
                      setScreens((prev) => {
                        const mainScreensCount = prev.filter(
                          (s) => !s.parentScreenId && !s.isLoading,
                        ).length;
                        const skeletons: ScreenData[] = screenNames.map((name, i) => ({
                          id: `skeleton-${name}-${Date.now()}-${i}`,
                          name: name,
                          type: "custom",
                          parentScreenId: null,
                          imageUrl: null,
                          thumbnailUrl: null,
                          htmlContent: null,
                          aiPrompt: null,
                          createdAt: null,
                          updatedAt: null,
                          x: 100 + (mainScreensCount + i) * SCREEN_SPACING_X,
                          y: 100,
                          width: DEVICE_WIDTH,
                          height: DEVICE_HEIGHT,
                          visible: true,
                          isLoading: true,
                          loadingText: `Generating ${name}...`,
                          screenNameForMatching: name,
                        }));
                        return [...prev, ...skeletons];
                      });
                    }}
                    onRemoveSkeletons={(screenNames) => {
                      setScreens((prev) =>
                        prev.filter(
                          (s) =>
                            !s.isLoading ||
                            !screenNames.includes(s.screenNameForMatching || ""),
                        ),
                      );
                    }}
                    onViewScreen={handleViewScreen}
                    progressMessages={progressMessages}
                    activeProgress={activeProgress}
                    onGenerateRecommended={handleGenerateRecommended}
                    onDismissRecommendations={handleDismissRecommendations}
                    screens={screens}
                    onUpdateScreenBrief={handleUpdateScreenBrief}
                    initialRecommendations={initialRecommendations}
                    onClearInitialRecommendations={() => setInitialRecommendations(null)}
                    socketConnected={socketConnected}
                    socketSendMessage={socketSendMessage}
                    socketChatState={socketChatState}
                    onSocketChatComplete={onChatComplete}
                    onSocketChatError={onChatError}
                emitEditUndo={emitEditUndo}
                onEditUndone={onEditUndone}
                    startMultiFileGeneration={startMultiFileGeneration}
                    modifyMultiFile={modifyMultiFile}
                    multiFileState={multiFileState}
                    actionLogs={actionLogs}
                    isActionLogActive={isActionLogActive}
                    enabledFeatures={project?.enabledFeatures || []}
                    onFeaturesChange={handleFeaturesChange}
                    projectFiles={projectFiles}
                  />
                )}
              </div>
            </div>
          )}
          {mobileTab === 'preview' && (
            <div className="h-full flex items-center justify-center bg-surface-950">
              {(
                <PhonePreviewPanel
                  screen={selectedScreen || null}
                  buildStatus={selectedBuildStatus}
                  streamingHtml={selectedStreamingState?.html}
                  stageMessage={selectedStreamingState?.stageMessage || selectedStreamingState?.statusMessage}
                  progressPercent={selectedStreamingState?.progress}
                  isRNProject={isRNProject}
                  expoSessionId={null}
                  deploymentWebUrl={deploymentWebUrl}
                  deployRevision={deployment?.deployRevision}
                  onRegenerate={handleRetryScreen}
                  onRunOnDevice={handleRunOnDevice}
                  onFixErrors={(msg) => setTriggerMessage(msg)}
                />
              )}
            </div>
          )}
          {mobileTab === 'test' && (
            <div className="h-full flex flex-col">
              {projectId && (
                <PreviewConsole
                  sessionId={null}
                  onFixErrors={(msg) => setTriggerMessage(msg)}
                  defaultExpanded
                />
              )}
            </div>
          )}
        </div>

        {/* Mobile tab bar */}
        <div className="flex border-t border-surface-700 bg-surface-900 flex-shrink-0">
          <button
            onClick={() => setMobileTab('chat')}
            className={cn(
              "flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1",
              mobileTab === 'chat' ? 'text-blue-400' : 'text-surface-500'
            )}
          >
            <MessageSquare className="w-5 h-5" />
            Chat
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={cn(
              "flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1",
              mobileTab === 'preview' ? 'text-blue-400' : 'text-surface-500'
            )}
          >
            <Smartphone className="w-5 h-5" />
            Preview
          </button>
          <button
            onClick={() => setMobileTab('test')}
            className={cn(
              "flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1",
              mobileTab === 'test' ? 'text-blue-400' : 'text-surface-500'
            )}
          >
            <QrCode className="w-5 h-5" />
            Test
          </button>
        </div>
      </div>

      {/* ============ MODALS ============ */}
      {projectId && (
        <DesignSystemPanel
          isOpen={showDesignSystemPanel}
          onClose={() => setShowDesignSystemPanel(false)}
          projectId={projectId}
          designSystem={project?.designSystem}
          onFilesUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          }}
        />
      )}

      {/* PublishModal — coming soon */}

      <AnimatePresence>
        {showVersionHistory && selectedScreen && projectId && (
          <VersionHistoryModal
            projectId={projectId}
            screenId={selectedScreen.id}
            screenName={selectedScreen.name}
            onClose={() => setShowVersionHistory(false)}
            onRestore={() => {
              queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Project-level version history slide-out panel */}
      <AnimatePresence>
        {showProjectHistory && projectId && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-12 right-0 bottom-0 w-80 z-40 bg-surface-900 border-l border-surface-700/50 shadow-2xl shadow-black/40"
          >
            <VersionHistory projectId={projectId} className="h-full" />
            <button
              onClick={() => setShowProjectHistory(false)}
              className="absolute top-3 right-3 p-1 rounded-md text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {projectId && (
        <ProjectSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          projectId={projectId}
          project={project || {
            id: projectId,
            name: 'Untitled Project',
            description: '',
            prompt: '',
            styleId: null,
            userId: '',
            status: 'draft' as const,
            screensCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          onProjectUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirmScreenIds !== null}
        onClose={() => setDeleteConfirmScreenIds(null)}
        onConfirm={() => {
          if (deleteConfirmScreenIds) handleDeleteScreen(deleteConfirmScreenIds);
          setDeleteConfirmScreenIds(null);
        }}
        title={deleteConfirmScreenIds && deleteConfirmScreenIds.length > 1 ? "Delete Screens" : "Delete Screen"}
        message={
          deleteConfirmScreenIds && deleteConfirmScreenIds.length > 1
            ? `Are you sure you want to delete ${deleteConfirmScreenIds.length} screens? This action cannot be undone.`
            : "Are you sure you want to delete this screen? This action cannot be undone."
        }
        confirmLabel="Delete"
        variant="danger"
      />

      {showPlanApproval && (locationState?.designSystem || designSystemState.designSystem || project?.designSystem || (designSystemState.status === 'generating' && designSystemState.sections)) && projectId && !project?.initialGenerationCompleted && (
        <PlanApprovalModal
          designSystem={locationState?.designSystem || designSystemState.designSystem || project?.designSystem || { projectName: '', themeMode: 'light', theme: {} as any, navigation: { type: 'bottom_tabs', tabs: [] }, designReasoning: '', projectVisualDescription: '', screens: [] }}
          projectId={projectId}
          streamingSections={designSystemState.sections}
          isStreaming={designSystemState.status === 'generating'}
          onApprove={async (editedDS) => {
            try {
              await projectsApi.update(projectId, {
                designSystem: editedDS,
                ...(editedDS.appMetadata && {
                  appName: editedDS.appMetadata.appName,
                  appShortName: editedDS.appMetadata.displayName,
                  slug: editedDS.appMetadata.slug,
                  bundleIdIos: editedDS.appMetadata.bundleId,
                  bundleIdAndroid: editedDS.appMetadata.bundleId,
                }),
              });
              setApprovedDesignSystem(editedDS);
              queueInitialGeneration(editedDS);
              setShowPlanApproval(false);
            } catch (error) {
              setInitialGenerationError(
                error instanceof Error
                  ? error.message
                  : "Failed to save the approved plan before generation.",
              );
            }
          }}
          onCancel={() => navigate('/dashboard')}
        />
      )}

    </div>
  );
}

/** Rork-style file tree with folder grouping */
export function FileTreeView({
  files,
  selectedFile,
  onSelectFile,
}: {
  files: Array<{ path: string; content: string }>;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  // Build tree structure from flat file list
  const tree = useMemo(() => {
    const root: Record<string, any> = {};
    for (const f of files) {
      const parts = f.path.replace(/^\//, '').split('/');
      let current = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = f.path;
    }
    return root;
  }, [files]);

  return <TreeNode node={tree} selectedFile={selectedFile} onSelectFile={onSelectFile} depth={0} />;
}

function TreeNode({
  node,
  selectedFile,
  onSelectFile,
  depth,
  name,
}: {
  node: Record<string, any> | string;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  depth: number;
  name?: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  // Leaf node (file)
  if (typeof node === 'string') {
    const fileName = name || node.split('/').pop() || node;
    const isActive = selectedFile === node;
    return (
      <button
        onClick={() => onSelectFile(node)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1 px-2 text-left text-xs rounded transition-colors",
          isActive
            ? "bg-primary-500/15 text-primary-300"
            : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50",
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        <FileCode className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
        <span className="truncate">{fileName}</span>
      </button>
    );
  }

  // Directory node
  const entries = Object.entries(node).sort(([a, va], [b, vb]) => {
    // Folders first, then files
    const aIsDir = typeof va !== 'string';
    const bIsDir = typeof vb !== 'string';
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.localeCompare(b);
  });

  if (!name) {
    // Root level — render children directly
    return (
      <div className="space-y-px">
        {entries.map(([key, value]) => (
          <TreeNode key={key} node={value} name={key} selectedFile={selectedFile} onSelectFile={onSelectFile} depth={depth} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 py-1 px-2 text-left text-xs text-surface-300 hover:text-white hover:bg-surface-800/30 rounded transition-colors"
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        <FolderTree className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform", expanded ? "text-primary-400" : "text-surface-500")} />
        <span className="truncate font-medium">{name}</span>
      </button>
      {expanded && (
        <div>
          {entries.map(([key, value]) => (
            <TreeNode key={key} node={value} name={key} selectedFile={selectedFile} onSelectFile={onSelectFile} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
