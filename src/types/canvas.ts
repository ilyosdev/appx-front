/**
 * Types specific to the Canvas page and its components
 */

export interface ScreenData {
  id: string;
  name: string;
  type: string;
  parentScreenId: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  htmlContent: string | null;
  reactCode?: string | null;
  reactNativeCode?: string | null;
  compiledHtml?: string | null;
  reactCodeUrl?: string | null;
  compiledHtmlUrl?: string | null;
  contentType?: 'react' | 'html' | 'react-native';
  /** DB-persisted build status: 'valid' | 'error' | 'skeleton' | 'unknown' */
  buildStatus?: 'valid' | 'error' | 'skeleton' | 'unknown';
  buildErrors?: string[];
  aiPrompt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  designData?: unknown;
  isLoading?: boolean;
  loadingText?: string;
  screenNameForMatching?: string;
  generationIndex?: number;
  skeletonId?: string;
  hasError?: boolean;
  errorMessage?: string;
}

export interface Annotation {
  id: string;
  elementSelector: string;
  x: number;
  y: number;
  text: string;
  elementText?: string; // The actual text content of the clicked element
  elementType?: string; // The type of element (button, text, image, etc.)
}

export interface DragState {
  isPotentialDrag: boolean;
  isDragging: boolean;
  screenId: string | null;
  startX: number;
  startY: number;
  screenStartX: number;
  screenStartY: number;
}

export interface RecommendationItem {
  id: string;
  name: string;
  type: string;
  description: string;
  reasoning?: string;
}

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  error?: boolean;
  createdScreenId?: string;
  metadata?: {
    screenType?: string;
    thumbnailUrl?: string;
    description?: string;
    isGenerationMessage?: boolean;
    isInitialPrompt?: boolean;
    type?: "progress" | "screen_suggestion";
    recommendations?: {
      essential: RecommendationItem[];
      optional: RecommendationItem[];
    };
    [key: string]: unknown;
  };
}

export interface GenerationStatus {
  isGenerating: boolean;
  lastCompletedCount: number;
  pendingRecommendations: {
    essential: RecommendationItem[];
    optional: RecommendationItem[];
  } | null;
}

export interface ActiveSelection {
  x: number;
  y: number;
  width: number;
  height: number;
  elementText?: string;
  elementType?: string;
}

export interface ActivePopup {
  x: number;
  y: number;
  width: number;
  height: number;
  elementText: string;
  elementType: string;
  elementSelector: string;
}

// Constants
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const ZOOM_SENSITIVITY = 0.002;
export const DRAG_THRESHOLD = 5;
