import { create } from "zustand";
import type { LocalMessage, ActionLogEvent } from "@/types/canvas";

export interface PlanStep {
  id: number;
  title: string;
  description: string;
  files: string[];
  action: "create" | "modify" | "delete";
}

interface ChatState {
  messages: LocalMessage[];
  isStreaming: boolean;
  streamingStatus: string;
  actionLogs: ActionLogEvent[];
  turnState: {
    status: "idle" | "running" | "success" | "failed" | "needs-retry" | "awaiting-user-plan";
    mode?: string;
    lastError?: string | null;
  };
  activePlanId: string | null;
  activePlanSteps: PlanStep[] | null;
  activePlanVersion: number;
}

interface ChatActions {
  addMessage: (msg: LocalMessage) => void;
  updateMessage: (id: string, updates: Partial<LocalMessage>) => void;
  setMessages: (msgs: LocalMessage[] | ((prev: LocalMessage[]) => LocalMessage[])) => void;
  clearMessages: () => void;
  setStreaming: (isStreaming: boolean, status?: string) => void;
  setStreamingStatus: (status: string) => void;
  addActionLog: (log: ActionLogEvent) => void;
  clearActionLogs: () => void;
  startTurn: (mode: string) => void;
  completeTurn: () => void;
  failTurn: (error: string, needsRetry?: boolean) => void;
  setAwaitingPlan: () => void;
  resetTurn: () => void;
  setActivePlan: (planId: string, steps: PlanStep[], version?: number) => void;
  clearActivePlan: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  messages: [],
  isStreaming: false,
  streamingStatus: "",
  actionLogs: [],
  turnState: {
    status: "idle",
    lastError: null,
  },
  activePlanId: null,
  activePlanSteps: null,
  activePlanVersion: 1,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  setMessages: (msgs) =>
    set((state) => ({
      messages: typeof msgs === "function" ? msgs(state.messages) : msgs,
    })),

  clearMessages: () => set({ messages: [] }),

  setStreaming: (isStreaming, status) =>
    set({ isStreaming, ...(status !== undefined ? { streamingStatus: status } : {}) }),

  setStreamingStatus: (status) => set({ streamingStatus: status }),

  addActionLog: (log) =>
    set((state) => ({ actionLogs: [...state.actionLogs, log] })),

  clearActionLogs: () => set({ actionLogs: [] }),

  startTurn: (mode) =>
    set({
      turnState: {
        status: "running",
        mode,
        lastError: null,
      },
    }),

  completeTurn: () =>
    set((state) => ({
      turnState: {
        ...state.turnState,
        status: "success",
        lastError: null,
      },
    })),

  failTurn: (error, needsRetry = false) =>
    set((state) => ({
      turnState: {
        ...state.turnState,
        status: needsRetry ? "needs-retry" : "failed",
        lastError: error,
      },
    })),

  setAwaitingPlan: () =>
    set((state) => ({
      turnState: {
        ...state.turnState,
        status: "awaiting-user-plan",
        lastError: null,
      },
    })),

  resetTurn: () =>
    set({
      turnState: {
        status: "idle",
        lastError: null,
      },
    }),

  setActivePlan: (planId, steps, version = 1) =>
    set({
      activePlanId: planId,
      activePlanSteps: steps,
      activePlanVersion: version,
    }),

  clearActivePlan: () =>
    set({
      activePlanId: null,
      activePlanSteps: null,
      activePlanVersion: 1,
    }),
}));
