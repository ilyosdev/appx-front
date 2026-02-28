import { api } from './api';
import type { DesignSystem } from './design-system';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Full design system customization type matching backend schema
export interface DesignSystemCustomization {
  themeMode?: 'light' | 'dark';
  colors?: {
    // Base & Layout
    background?: string;
    foreground?: string;
    card?: string;
    cardForeground?: string;
    // Brand Colors
    primary?: string;
    primaryForeground?: string;
    secondary?: string;
    secondaryForeground?: string;
    // UI States & Accents
    accent?: string;
    accentForeground?: string;
    muted?: string;
    mutedForeground?: string;
    border?: string;
    destructive?: string;
    // Chart Colors
    chart1?: string;
    chart2?: string;
    chart3?: string;
    chart4?: string;
    chart5?: string;
    // Legacy fields (for backwards compatibility)
    success?: string;
    error?: string;
    surface?: string;
    text?: string;
  };
  typography?: {
    fontSans?: string;
    fontHeading?: string;
    // Legacy fields
    fontFamily?: string;
    headingFont?: string;
    supportedLanguages?: string[];
  };
  spacing?: {
    radius?: string;
    // Legacy field
    borderRadius?: string;
    buttonRadius?: string;
    cardPadding?: string;
  };
  components?: {
    buttonStyle?: 'filled' | 'outlined' | 'text';
    cardStyle?: 'elevated' | 'outlined' | 'filled';
    navigationStyle?: 'bottom' | 'side' | 'top';
  };
  customSpec?: string;
}

export interface ScreenVersion {
  id: string;
  screenId: string;
  version: number;
  htmlContent: string | null;
  aiPrompt: string | null;
  thumbnailUrl: string | null;
  createdAt: string | null;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  appPurpose?: string;
  targetAudience?: string;
  stylePreferences?: {
    colors?: string[];
    typography?: string;
    aesthetic?: string;
  };
  designSystemCustomization?: DesignSystemCustomization;
  onboardingSteps?: number;
  paywallVariations?: number;
  language?: string;
  currency?: string;
  region?: string;
  appType?: string;
  platform?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  prompt?: string;
  styleId?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  prompt: string;
  styleId: string | null;
  userId: string;
  status: ProjectStatus;
  screensCount: number;
  thumbnailUrl?: string | null;
  designSystemCustomization?: DesignSystemCustomization | null;
  initialGenerationCompleted?: boolean;
  isPublic?: boolean;
  publishedAt?: string | null;
  coverImageUrl?: string | null;
  galleryDescription?: string | null;
  generationTarget?: 'web' | 'rn';
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'draft' | 'style_selection' | 'generating' | 'completed' | 'complete' | 'failed';

export interface StyleOption {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
  description: string;
  colors: string[];
  category: string;
}

export interface Screen {
  id: string;
  name: string;
  type?: 'onboarding' | 'paywall' | 'dashboard' | 'settings' | 'custom';
  screenType?: string;
  imageUrl: string;
  thumbnailUrl: string;
  htmlContent?: string | null;
  reactCode?: string | null;
  reactNativeCode?: string | null;
  compiledHtml?: string | null;
  contentType?: 'react' | 'html' | 'react-native';
  parentScreenId?: string | null;
  projectId: string;
  width: number;
  height: number;
  orderIndex: number | null;
  aiPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingRecommendation {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
}

export interface ProjectWithScreens extends Project {
  screens: Screen[];
  selectedStyle: StyleOption | null;
  pendingRecommendations?: PendingRecommendation[] | null;
  designSystem?: DesignSystem | null;
}

export interface PaginatedProjects {
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ListProjectsParams {
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export const projectsApi = {
  list: (params?: ListProjectsParams) => 
    api.get<ApiResponse<PaginatedProjects>>('/projects', { params }),

  get: (id: string) => 
    api.get<ApiResponse<ProjectWithScreens>>(`/projects/${id}`),

  create: (data: CreateProjectDto) => 
    api.post<ApiResponse<Project>>('/projects', data),

  update: (id: string, data: UpdateProjectDto) => 
    api.patch<ApiResponse<Project>>(`/projects/${id}`, data),

  updateDesignSystem: (
    projectId: string,
    customization: DesignSystemCustomization
  ) => api.patch<ApiResponse<Project>>(`/projects/${projectId}/design-system`, { customization }),

  delete: (id: string) => 
    api.delete(`/projects/${id}`),

  duplicate: (id: string) => 
    api.post<ApiResponse<Project>>(`/projects/${id}/duplicate`),

  getScreens: (id: string) => 
    api.get<ApiResponse<Screen[]>>(`/projects/${id}/screens`),

  updateScreen: (projectId: string, screenId: string, data: Partial<Screen>) =>
    api.patch<ApiResponse<Screen>>(`/projects/${projectId}/screens/${screenId}`, data),

  deleteScreen: (projectId: string, screenId: string) =>
    api.delete(`/projects/${projectId}/screens/${screenId}`),

  reorderScreens: (projectId: string, screenIds: string[]) =>
    api.post(`/projects/${projectId}/screens/reorder`, { screenIds }),

  exportProject: (id: string, format: 'png' | 'pdf' | 'figma') =>
    api.post(`/projects/${id}/export`, { format }, { responseType: 'blob' }),

  publish: (id: string, data?: { galleryDescription?: string; selectedScreenIds?: string[]; coverImageUrl?: string }) =>
    api.post<ApiResponse<{
      id: string;
      name: string;
      isPublic: boolean;
      publishedAt: string;
      coverImageUrl: string;
      galleryDescription?: string;
      screenCount: number;
    }>>(`/projects/${id}/publish`, data || {}),

  unpublish: (id: string) =>
    api.post<ApiResponse<{ message: string }>>(`/projects/${id}/unpublish`),

  updateScreenGalleryVisibility: (projectId: string, screenId: string, isGalleryVisible: boolean) =>
    api.patch<ApiResponse<{ id: string; isGalleryVisible: boolean }>>(
      `/projects/${projectId}/screens/${screenId}/gallery-visibility`,
      { isGalleryVisible }
    ),

  getScreenVersions: (projectId: string, screenId: string) =>
    api.get<ApiResponse<{ versions: ScreenVersion[]; currentVersion: number; totalVersions: number }>>(`/projects/${projectId}/screens/${screenId}/versions`),

  restoreScreenVersion: (projectId: string, screenId: string, versionId: string) =>
    api.post<ApiResponse<{ success: boolean; screen: { id: string; version: number; htmlContent: string | null } }>>(`/projects/${projectId}/screens/${screenId}/restore/${versionId}`),

  downloadScreen: (projectId: string, screenId: string) =>
    api.get<ApiResponse<{ url: string; filename: string }>>(`/projects/${projectId}/screens/${screenId}/download`),

  exportCode: (projectId: string) =>
    api.get(`/projects/${projectId}/export?format=react`, { responseType: 'blob' }),
};
