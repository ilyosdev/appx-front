import { create } from "zustand";

export interface ExpoSession {
  sessionId: string;
  expoUrl: string;
  qrCodeDataUrl: string;
  port: number;
  status: string;
  expiresAt: string;
  lastActivityAt?: string;
}

export type SessionStatus =
  | "idle"
  | "creating"
  | "active"
  | "updating"
  | "expired"
  | "error";

interface ExpoPreviewState {
  sessions: Map<string, ExpoSession>; // keyed by projectId
  currentStatus: SessionStatus;
  currentError: string | null;
  showModal: boolean;
  autoPreview: boolean;

  // Actions
  setSession: (projectId: string, session: ExpoSession) => void;
  removeSession: (projectId: string) => void;
  setStatus: (status: SessionStatus) => void;
  setError: (error: string | null) => void;
  openModal: () => void;
  closeModal: () => void;
  setAutoPreview: (enabled: boolean) => void;
  reset: () => void;
}

export const useExpoPreviewStore = create<ExpoPreviewState>((set) => ({
  sessions: new Map(),
  currentStatus: "idle",
  currentError: null,
  showModal: false,
  autoPreview: false,

  setSession: (projectId, session) =>
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(projectId, session);
      return { sessions: newSessions, currentStatus: "active", currentError: null };
    }),

  removeSession: (projectId) =>
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(projectId);
      return { sessions: newSessions, currentStatus: "idle" };
    }),

  setStatus: (status) => set({ currentStatus: status }),

  setError: (error) =>
    set({ currentError: error, currentStatus: error ? "error" : "idle" }),

  openModal: () => set({ showModal: true }),

  closeModal: () => set({ showModal: false }),

  setAutoPreview: (enabled) => set({ autoPreview: enabled }),

  reset: () =>
    set({
      sessions: new Map(),
      currentStatus: "idle",
      currentError: null,
      showModal: false,
    }),
}));
