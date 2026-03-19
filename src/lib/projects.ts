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
  designSystem?: DesignSystem;
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
  enabledFeatures?: string[];
  generationTarget?: 'web' | 'rn';
  slug?: string | null;
  bundleIdIos?: string | null;
  bundleIdAndroid?: string | null;
  appName?: string | null;
  appShortName?: string | null;
  appIconUrl?: string | null;
  themeColor?: string | null;
  apiDocumentation?: string | null;
  referenceImageUrl?: string | null;
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

export interface EnvVarResponse {
  id: string;
  key: string;
  value: string; // masked for secrets
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
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

  checkSlugAvailability: async (slug: string, excludeProjectId?: string) => {
    const params = excludeProjectId ? { excludeProjectId } : {};
    const response = await api.get(`/projects/slug/check/${slug}`, { params });
    const body = response.data;
    return (body.data || body) as { available: boolean; slug: string };
  },

  uploadIcon: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('icon', file);
    const response = await api.post(`/projects/${projectId}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data as { url: string };
  },

  updateFeatures: async (projectId: string, features: string[]) => {
    const response = await api.patch(`/projects/${projectId}`, { enabledFeatures: features });
    return response.data;
  },

  updateSettings: async (projectId: string, settings: {
    slug?: string;
    bundleIdIos?: string;
    bundleIdAndroid?: string;
    appName?: string;
    appShortName?: string;
    appIconUrl?: string;
    themeColor?: string;
  }) => {
    const response = await api.patch(`/projects/${projectId}`, settings);
    return response.data;
  },

  // API Documentation
  uploadApiDocs: async (projectId: string, apiSpec: string) => {
    const { data } = await api.patch(`/projects/${projectId}/api-docs`, { apiSpec });
    return data as {
      success: boolean;
      title: string;
      version: string;
      baseUrl: string;
      authType: string | null;
      endpointCount: number;
      endpoints: Array<{ method: string; path: string; summary: string; responseSchema?: string }>;
    };
  },
  removeApiDocs: async (projectId: string) => {
    const { data } = await api.delete(`/projects/${projectId}/api-docs`);
    return data as { success: boolean };
  },

  // Env vars
  getEnvVars: async (projectId: string) => {
    const { data } = await api.get(`/projects/${projectId}/env-vars`);
    return (data.data ?? data) as EnvVarResponse[];
  },
  createEnvVar: async (projectId: string, dto: { key: string; value: string; isSecret?: boolean }) => {
    const { data } = await api.post(`/projects/${projectId}/env-vars`, dto);
    return (data.data ?? data) as EnvVarResponse;
  },
  updateEnvVar: async (projectId: string, varId: string, dto: { key?: string; value?: string; isSecret?: boolean }) => {
    const { data } = await api.patch(`/projects/${projectId}/env-vars/${varId}`, dto);
    return (data.data ?? data) as EnvVarResponse;
  },
  deleteEnvVar: async (projectId: string, varId: string) => {
    await api.delete(`/projects/${projectId}/env-vars/${varId}`);
  },
};
