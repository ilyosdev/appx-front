import { api, tokenStorage } from './api';
import axios from 'axios';

// Create separate axios instance with longer timeout for visual inspiration
// Visual analysis can take 30-60 seconds for complex images
const visualInspirationApi = axios.create({
  baseURL: api.defaults.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes
});

// Add auth interceptor
visualInspirationApi.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface DetectedScreen {
  id: string;
  name: string;
  type: string;
  description?: string;
  /** Visual description of the screen - colors, mood, layout style */
  visualDescription?: string;
  replicateExactly?: boolean;
}

export interface VisualInspiration {
  userDescription: string;
  aiObservations: string;
  combinedInspiration: string;
  detectedScreens?: DetectedScreen[];
}

export const styleExtractionApi = {
  uploadImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/ai/upload-style-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Backend wraps response in { success: true, data: { imageUrl } }
    return response.data.data;
  },

  getVisualInspiration: (imageUrl: string, userDescription: string = '') =>
    visualInspirationApi.post<{ success: boolean; data: VisualInspiration }>('/ai/visual-inspiration', { imageUrl, userDescription }),
};
