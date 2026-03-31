import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Billing error codes that trigger modals
const BILLING_ERROR_CODES = [
  "INSUFFICIENT_CREDITS",
  "SCREEN_LIMIT_EXCEEDED",
  "PROJECT_LIMIT_EXCEEDED",
  "EXPORT_LIMIT_EXCEEDED",
  "LIMIT_EXCEEDED",
];

type BillingErrorData = {
  required?: number;
  available?: number;
  current?: number;
  limit?: number;
};

type BillingErrorHandler = (
  errorCode: string,
  message: string,
  errorData?: BillingErrorData,
) => void;
let billingErrorHandler: BillingErrorHandler | null = null;

export const setBillingErrorHandler = (handler: BillingErrorHandler) => {
  billingErrorHandler = handler;
};

export const clearBillingErrorHandler = () => {
  billingErrorHandler = null;
};

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) =>
    localStorage.setItem(ACCESS_TOKEN_KEY, token),
  removeAccessToken: () => localStorage.removeItem(ACCESS_TOKEN_KEY),

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    localStorage.setItem(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => localStorage.removeItem(REFRESH_TOKEN_KEY),

  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      const data = error.response.data as {
        code?: string;
        message?: string;
        required?: number;
        available?: number;
        current?: number;
        limit?: number;
      };
      if (data?.code && BILLING_ERROR_CODES.includes(data.code)) {
        if (billingErrorHandler) {
          billingErrorHandler(
            data.code,
            data.message ||
              "You have reached a limit. Please upgrade or purchase credits.",
            {
              required: data.required,
              available: data.available,
              current: data.current,
              limit: data.limit,
            },
          );
        }
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      const refreshToken = tokenStorage.getRefreshToken();

      // Public pages should not redirect to login on 401
      const publicPaths = ['/', '/login', '/register', '/pricing', '/terms', '/privacy', '/gallery'];
      const isPublicPage = publicPaths.includes(window.location.pathname) || window.location.pathname.startsWith('/p/') || window.location.pathname.startsWith('/app/');

      if (!refreshToken) {
        tokenStorage.clearTokens();
        if (!isPublicPage) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` },
          },
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data.data;
        tokenStorage.setTokens(newAccessToken, newRefreshToken || refreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        tokenStorage.clearTokens();
        if (!isPublicPage) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const getApiBaseUrl = () => API_BASE_URL;

/**
 * Rewrite S3/storage URLs to go through the backend proxy.
 * In local dev, direct S3 URLs may not be accessible.
 * The backend provides a proxy at /storage/:bucket/*
 */
export function rewriteStorageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Match AWS S3 URLs: https://{bucket}.s3.{region}.amazonaws.com/{key}
  const s3Match = url.match(/^https?:\/\/([^.]+)\.s3\.[^/]+\.amazonaws\.com\/(.+)$/);
  if (s3Match) {
    const [, , key] = s3Match;
    return `${API_BASE_URL}/storage/assets/${key}`;
  }
  // Match MinIO URLs: http://localhost:9000/{bucket}/{key}
  const minioMatch = url.match(/^https?:\/\/localhost:9000\/([^/]+)\/(.+)$/);
  if (minioMatch) {
    const [, , key] = minioMatch;
    return `${API_BASE_URL}/storage/assets/${key}`;
  }
  return url;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}

// Gallery API (public, no auth required)
export interface GalleryScreen {
  id: string;
  name: string;
  projectName: string;
  thumbnailUrl: string;
  imageUrl: string;
  prompt?: string;
}

export interface GalleryProjectScreen {
  id: string;
  name: string;
  thumbnailUrl: string;
  imageUrl: string;
}

export interface GalleryProject {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  galleryDescription: string | null;
  publishedAt: string | null;
  appPurpose: string | null;
  screens: GalleryProjectScreen[];
  screenCount: number;
}

export interface GalleryResponse {
  screens: GalleryScreen[];
  total: number;
}

export interface GalleryProjectsResponse {
  projects: GalleryProject[];
  total: number;
}

export const galleryApi = {
  getScreens: async (limit = 20): Promise<GalleryResponse> => {
    const response = await axios.get(`${API_BASE_URL}/gallery/screens`, {
      params: { limit },
    });
    return response.data.data;
  },

  getProjects: async (limit = 20): Promise<GalleryProjectsResponse> => {
    const response = await axios.get(`${API_BASE_URL}/gallery/projects`, {
      params: { limit },
    });
    return response.data.data;
  },
};

// Public project view (no auth)
export interface PublicProjectData {
  id: string;
  name: string;
  description: string | null;
  appPurpose: string | null;
  coverImageUrl: string | null;
  galleryDescription: string | null;
  publishedAt: string | null;
  isPublic: boolean;
  designSystem: unknown;
  screens: GalleryProjectScreen[];
  screenCount: number;
}

export const publicApi = {
  getProject: async (projectId: string): Promise<PublicProjectData> => {
    const response = await axios.get(`${API_BASE_URL}/public/projects/${projectId}`);
    return response.data.data;
  },

  getProjectBySlug: async (slug: string): Promise<PublicProjectData> => {
    const response = await axios.get(`${API_BASE_URL}/public/projects/by-slug/${slug}`);
    return response.data.data;
  },
};

// Publish API
export interface PublishProjectRequest {
  galleryDescription?: string;
  selectedScreenIds?: string[];
}

export interface PublishProjectResponse {
  id: string;
  name: string;
  isPublic: boolean;
  publishedAt: string;
  coverImageUrl: string;
  galleryDescription?: string;
  screenCount: number;
}

export interface UploadThumbnailResponse {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
}

export interface UploadCoverResponse {
  url: string;
}

export const projectsApi = {
  publish: async (
    projectId: string,
    data: PublishProjectRequest & { coverImageUrl?: string } = {},
  ): Promise<PublishProjectResponse> => {
    const response = await api.post(`/projects/${projectId}/publish`, data);
    return response.data.data;
  },

  unpublish: async (projectId: string): Promise<{ message: string }> => {
    const response = await api.post(`/projects/${projectId}/unpublish`);
    return response.data.data;
  },

  updateScreenGalleryVisibility: async (
    projectId: string,
    screenId: string,
    isGalleryVisible: boolean,
  ): Promise<{ id: string; isGalleryVisible: boolean }> => {
    const response = await api.patch(
      `/projects/${projectId}/screens/${screenId}/gallery-visibility`,
      { isGalleryVisible },
    );
    return response.data.data;
  },

  uploadScreenThumbnail: async (
    projectId: string,
    screenId: string,
    blob: Blob,
  ): Promise<UploadThumbnailResponse> => {
    const formData = new FormData();
    formData.append('thumbnail', blob, `screen-${screenId}.png`);

    const response = await api.post(
      `/projects/${projectId}/screens/${screenId}/thumbnail`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.data;
  },

  uploadCoverImage: async (
    projectId: string,
    blob: Blob,
  ): Promise<UploadCoverResponse> => {
    const formData = new FormData();
    formData.append('cover', blob, `cover-${projectId}.png`);

    const response = await api.post(
      `/projects/${projectId}/cover`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.data;
  },
};
