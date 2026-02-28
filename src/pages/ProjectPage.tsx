import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import type { DesignSystem } from "@/lib/design-system";
import { useProjectSocket, type ScreenCompleteData, type ScreenErrorData } from "@/hooks/useProjectSocket";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import { projectsApi, type DesignSystemCustomization } from "@/lib/projects";
import { DesignSystemCustomizer } from "@/components/projects/DesignSystemCustomizer";
import { PublishModal } from "@/components/projects/PublishModal";
import { chatApi } from "@/lib/chat";
import { useAuthStore } from "@/stores/authStore";
import { generateScreenThumbnail } from "@/lib/screenshot";
import { api, projectsApi as projectsApiClient } from "@/lib/api";
import { isReactCode } from "@/lib/codeUtils";
import { slugify } from "@/lib/slugify";

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
import { ScreenListPanel } from "@/components/canvas/ScreenListPanel";
import { PhonePreviewPanel } from "@/components/canvas/PhonePreviewPanel";
import { ExportModal } from "@/components/canvas/ExportModal";
import { ProjectSettingsModal } from "@/components/canvas/ProjectSettingsModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExpoPreviewModal } from "@/components/preview/ExpoPreviewModal";
import { WebPreview } from "@/components/preview/WebPreview";
import { useExpoPreviewStore } from "@/stores/expoPreviewStore";
import { PlanApprovalModal } from "@/components/canvas/PlanApprovalModal";
import { VersionHistoryModal } from "@/components/canvas/VersionHistoryModal";
import { TestPanel } from "@/components/project/TestPanel";

interface LocationState {
  designSystem?: DesignSystem;
  isNewProject?: boolean;
  showPlanApproval?: boolean;
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | undefined>();
  const [triggerScreenId, setTriggerScreenId] = useState<string | undefined>();
  const [variationParentId, setVariationParentId] = useState<string | undefined>();
  const [_isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [designSystemOpen, setDesignSystemOpen] = useState(false);
  const [progressMessages] = useState<Map<string, unknown>>(new Map());
  const [initialRecommendations, setInitialRecommendations] = useState<{
    essential: RecommendationItem[];
    optional: RecommendationItem[];
  } | null>(null);
  const [designSystemProcessed, setDesignSystemProcessed] = useState(false);
  const [deleteConfirmScreenIds, setDeleteConfirmScreenIds] = useState<string[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const queryClient = useQueryClient();

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

      // Auto-sync to expo preview if enabled
      const expoStore = useExpoPreviewStore.getState();
      if (expoStore.autoPreview && projectId) {
        const expoSession = expoStore.sessions.get(projectId);
        if (expoSession) {
          const newCode = data.reactNativeCode || data.html;
          if (newCode) {
            api.patch(`/expo-preview/sessions/${expoSession.sessionId}`, {
              reactNativeCode: newCode,
            }, { timeout: 60000 }).catch(err => {
              console.error('[Expo Auto-Sync] Failed:', err.message);
            });
          }
        }
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

  // ---------- Skeleton creation + generation start ----------
  const [skeletonsCreated, setSkeletonsCreated] = useState(false);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [showPlanApproval, setShowPlanApproval] = useState(
    locationState?.showPlanApproval === true
  );
  const [approvedDesignSystem, setApprovedDesignSystem] = useState<DesignSystem | null>(null);

  useEffect(() => {
    if (designSystemProcessed || !projectId || skeletonsCreated) return;
    if (showPlanApproval) {
      if (!locationState?.designSystem && project?.designSystem) {
        setShowPlanApproval(false);
      }
      return;
    }

    const isNewProjectFromWizard = locationState?.isNewProject === true;
    const designSystemFromLocation = isNewProjectFromWizard
      ? (approvedDesignSystem || locationState.designSystem)
      : null;
    const designSystemFromProject = project?.designSystem;
    const projectHasNoScreens = !project?.screens || project.screens.length === 0;
    const initialGenerationDone = project?.initialGenerationCompleted === true;

    if (initialGenerationDone && !isNewProjectFromWizard) return;

    const designSystem =
      designSystemFromLocation ||
      (projectHasNoScreens && !initialGenerationDone ? designSystemFromProject : null);

    if (!designSystem) return;

    setSkeletonsCreated(true);
    const screenConfigs = designSystem.screens;
    const skeletonScreens: ScreenData[] = screenConfigs.map(
      (config, index) => ({
        id: `skeleton-${index}-${config.id}`,
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
        skeletonId: `skeleton-${index}-${config.id}`,
      }),
    );

    setScreens(skeletonScreens);
    if (skeletonScreens.length > 0) {
      setSelectedIds([skeletonScreens[0].id]);
    }
  }, [projectId, locationState, project, designSystemProcessed, skeletonsCreated, showPlanApproval, approvedDesignSystem]);

  useEffect(() => {
    if (!skeletonsCreated || generationStarted || designSystemProcessed) return;
    if (!socketConnected) return;

    const isNewProjectFromWizard = locationState?.isNewProject === true;
    const initialGenerationDone = project?.initialGenerationCompleted === true;

    if (initialGenerationDone && !isNewProjectFromWizard) {
      setDesignSystemProcessed(true);
      return;
    }

    const designSystem = isNewProjectFromWizard
      ? (approvedDesignSystem || locationState?.designSystem)
      : (locationState?.designSystem || project?.designSystem);

    if (!designSystem) return;

    const screenConfigs = designSystem.screens;
    setGenerationStarted(true);
    setDesignSystemProcessed(true);
    startGeneration({
      screens: screenConfigs.map((config, index) => ({
        name: config.name,
        purpose: config.purpose,
        layoutDescription: config.layoutDescription,
        dataModel: config.dataModel,
        interactions: config.interactions,
        stateManagement: config.stateManagement,
        skeletonId: `skeleton-${index}-${config.id}`,
      })),
      theme: designSystem.theme as unknown as Record<string, string>,
      themeMode: designSystem.themeMode || 'light',
      navigation: designSystem.navigation,
      projectVisualDescription: designSystem.projectVisualDescription,
    });
  }, [skeletonsCreated, generationStarted, designSystemProcessed, socketConnected, startGeneration, projectId, locationState, project, approvedDesignSystem]);

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

  // ---------- Auto-select first screen ----------
  useEffect(() => {
    if (screens.length > 0 && selectedIds.length === 0) {
      const firstNonLoading = screens.find(s => !s.isLoading && !s.hasError && !s.parentScreenId);
      if (firstNonLoading) setSelectedIds([firstNonLoading.id]);
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

  const { openModal: openExpoModal } = useExpoPreviewStore();
  const handleRunOnDevice = useCallback(() => openExpoModal(), [openExpoModal]);
  const handleExport = useCallback(() => setShowExportModal(true), []);
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

  const handleAddScreen = useCallback(() => {
    setTriggerMessage(undefined);
  }, []);

  // ---------- Expo mobile preview helpers ----------
  const getExpoCurrentCode = () => {
    const screen = selectedScreen || screens.find((s) => s.reactNativeCode || s.reactCode || s.htmlContent);
    return screen?.reactNativeCode || screen?.reactCode || screen?.htmlContent || null;
  };

  const getExpoCurrentScreenName = () => {
    const screen = selectedScreen || screens.find((s) => s.reactNativeCode || s.reactCode || s.htmlContent);
    return screen?.name || "Screen";
  };

  const getExpoCurrentScreenId = () => {
    const screen = selectedScreen || screens.find((s) => s.reactNativeCode || s.reactCode || s.htmlContent);
    return screen?.id;
  };

  // ---------- Preview props ----------
  const selectedBuildStatus = selectedScreen?.compiledHtml ? ('ready' as const) : ('idle' as const);
  const selectedStreamingState = selectedScreen
    ? socketScreenStates.get(selectedScreen.skeletonId || selectedScreen.id)
    : undefined;

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
        onExport={handleExport}
        onDesignSystem={() => setDesignSystemOpen(!designSystemOpen)}
        onSettings={handleSettings}
        onPublish={() => setPublishModalOpen(true)}
        isPublished={project?.isPublic}
        socketConnected={socketConnected}
        socketReconnecting={socketReconnecting}
        socketError={socketError}
        lastSavedAt={project?.updatedAt}
        publishedUrl={(project as any)?.publishedUrl}
        onDeploymentComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        }}
      />

      {/* ============ 3-PANEL LAYOUT ============ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============ LEFT PANEL: Screen list + Chat ============ */}
        <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-surface-800/50 bg-surface-950/80 backdrop-blur-xl">
          {/* Screen list */}
          <div className="h-[180px] flex-shrink-0 overflow-hidden border-b border-surface-800/50">
            <ScreenListPanel
              screens={screens}
              selectedId={selectedIds[0] || null}
              onSelectScreen={(id) => setSelectedIds([id])}
              onAddScreen={handleAddScreen}
            />
          </div>

          {/* AI Chat */}
          <div className="flex-1 overflow-hidden">
            {projectId && (
              <ChatSidebar
                projectId={projectId}
                projectName={project?.name || "Untitled Project"}
                screenId={undefined}
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
                startMultiFileGeneration={startMultiFileGeneration}
                modifyMultiFile={modifyMultiFile}
                multiFileState={multiFileState}
              />
            )}
          </div>
        </div>

        {/* ============ CENTER PANEL: Phone Preview ============ */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isRNProject ? (
            <WebPreview
              code={selectedScreen?.reactNativeCode || selectedScreen?.reactCode || selectedScreen?.htmlContent || null}
              onOpenExpo={handleRunOnDevice}
              isGenerating={selectedScreen?.isLoading}
              stageMessage={selectedStreamingState?.stageMessage || selectedStreamingState?.statusMessage}
            />
          ) : (
            <PhonePreviewPanel
              screen={selectedScreen || null}
              buildStatus={selectedBuildStatus}
              streamingHtml={selectedStreamingState?.html}
              stageMessage={selectedStreamingState?.stageMessage || selectedStreamingState?.statusMessage}
              progressPercent={selectedStreamingState?.progress}
              isRNProject={isRNProject}
              onRegenerate={handleRetryScreen}
              onRunOnDevice={handleRunOnDevice}
            />
          )}

          {/* Empty state */}
          {screens.length === 0 && project?.status !== "generating" && (
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

        {/* ============ RIGHT PANEL: Test on Phone ============ */}
        <div className="w-[280px] flex-shrink-0 border-l border-surface-800/50">
          {projectId && (
            <TestPanel
              projectId={projectId}
              getCurrentCode={getExpoCurrentCode}
              getCurrentScreenName={getExpoCurrentScreenName}
              getCurrentScreenId={getExpoCurrentScreenId}
            />
          )}
        </div>

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

      {/* ============ MODALS ============ */}
      {projectId && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          projectId={projectId}
          projectName={project?.name || "Untitled Project"}
        />
      )}

      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        projectId={projectId || ""}
        projectName={project?.name || "Untitled Project"}
        isPublished={project?.isPublic || false}
        screens={screens.map(s => ({
          id: s.id,
          name: s.name,
          thumbnailUrl: s.thumbnailUrl,
          imageUrl: s.imageUrl,
          htmlContent: s.htmlContent,
        }))}
        onPublishSuccess={() => refetch()}
        onRefreshScreens={async () => { await refetch(); }}
      />

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

      {projectId && (
        <ProjectSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          projectId={projectId}
          projectName={project?.name || "Untitled Project"}
          screensCount={screens.filter(s => !s.isLoading).length}
          createdAt={project?.createdAt || new Date().toISOString()}
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

      {showPlanApproval && locationState?.designSystem && projectId && (
        <PlanApprovalModal
          designSystem={locationState.designSystem}
          projectId={projectId}
          onApprove={(editedDS) => {
            setApprovedDesignSystem(editedDS);
            setShowPlanApproval(false);
          }}
          onCancel={() => navigate('/dashboard')}
        />
      )}

      {projectId && (
        <ExpoPreviewModal
          projectId={projectId}
          getCurrentCode={getExpoCurrentCode}
          getCurrentScreenName={getExpoCurrentScreenName}
          getCurrentScreenId={getExpoCurrentScreenId}
        />
      )}
    </div>
  );
}
