import { create } from "zustand";

export type PreviewMode = "web" | "device";

export type DeviceType =
  | "iphone15"
  | "iphone15promax"
  | "pixel8"
  | "ipadmini";

export type Orientation = "portrait" | "landscape";

export interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  borderRadius: number;
}

export const DEVICES: Record<DeviceType, DeviceConfig> = {
  iphone15: {
    name: "iPhone 15",
    width: 393,
    height: 852,
    borderRadius: 47,
  },
  iphone15promax: {
    name: "iPhone 15 Pro Max",
    width: 430,
    height: 932,
    borderRadius: 55,
  },
  pixel8: {
    name: "Pixel 8",
    width: 412,
    height: 892,
    borderRadius: 36,
  },
  ipadmini: {
    name: "iPad Mini",
    width: 744,
    height: 1133,
    borderRadius: 18,
  },
};

interface PreviewError {
  message: string;
  line?: number;
  column?: number;
}

interface PreviewState {
  previewMode: PreviewMode;
  selectedDevice: DeviceType;
  orientation: Orientation;
  zoom: number;
  isLoading: boolean;
  errors: PreviewError[];
  code: string | null;
  lastUpdatedAt: number | null;

  // Actions
  setPreviewMode: (mode: PreviewMode) => void;
  setSelectedDevice: (device: DeviceType) => void;
  setOrientation: (orientation: Orientation) => void;
  toggleOrientation: () => void;
  setZoom: (zoom: number) => void;
  setIsLoading: (loading: boolean) => void;
  setErrors: (errors: PreviewError[]) => void;
  clearErrors: () => void;
  setCode: (code: string | null) => void;
  reset: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  previewMode: "web",
  selectedDevice: "iphone15",
  orientation: "portrait",
  zoom: 1,
  isLoading: false,
  errors: [],
  code: null,
  lastUpdatedAt: null,

  setPreviewMode: (mode) => set({ previewMode: mode }),

  setSelectedDevice: (device) => set({ selectedDevice: device }),

  setOrientation: (orientation) => set({ orientation }),

  toggleOrientation: () =>
    set((state) => ({
      orientation:
        state.orientation === "portrait" ? "landscape" : "portrait",
    })),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setErrors: (errors) => set({ errors }),

  clearErrors: () => set({ errors: [] }),

  setCode: (code) => set({ code, lastUpdatedAt: Date.now() }),

  reset: () =>
    set({
      previewMode: "web",
      selectedDevice: "iphone15",
      orientation: "portrait",
      zoom: 1,
      isLoading: false,
      errors: [],
      code: null,
      lastUpdatedAt: null,
    }),
}));
