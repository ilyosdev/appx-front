import { create } from "zustand";

export type CollaboratorRole = "owner" | "editor" | "viewer";
export type CollaboratorStatus = "pending" | "accepted" | "rejected";
export type TeamMemberRole = "owner" | "admin" | "member";

export interface Collaborator {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  createdAt: string;
}

export interface ProjectOwner {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "owner";
}

export interface OnlineUser {
  userId: string;
  email: string;
  name?: string;
  connectedAt: number;
}

export interface CursorPosition {
  userId: string;
  screenId?: string;
  x: number;
  y: number;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  ownerId: string;
  myRole: TeamMemberRole;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: TeamMemberRole;
  joinedAt: string;
}

interface CollaborationState {
  // Project collaborators
  owner: ProjectOwner | null;
  collaborators: Collaborator[];
  myAccessLevel: CollaboratorRole | "none";
  isLoadingCollaborators: boolean;

  // Presence
  onlineUsers: OnlineUser[];
  cursors: Map<string, CursorPosition>;

  // Teams
  teams: Team[];
  activeTeamId: string | null;
  isLoadingTeams: boolean;

  // Invite modal
  showInviteModal: boolean;

  // Actions
  setOwner: (owner: ProjectOwner | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  setMyAccessLevel: (level: CollaboratorRole | "none") => void;
  setLoadingCollaborators: (loading: boolean) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  updateCollaboratorRole: (userId: string, role: CollaboratorRole) => void;

  setOnlineUsers: (users: OnlineUser[]) => void;
  setCursor: (userId: string, cursor: CursorPosition) => void;
  removeCursor: (userId: string) => void;

  setTeams: (teams: Team[]) => void;
  setActiveTeamId: (teamId: string | null) => void;
  setLoadingTeams: (loading: boolean) => void;

  openInviteModal: () => void;
  closeInviteModal: () => void;

  reset: () => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  owner: null,
  collaborators: [],
  myAccessLevel: "none",
  isLoadingCollaborators: false,
  onlineUsers: [],
  cursors: new Map(),
  teams: [],
  activeTeamId: null,
  isLoadingTeams: false,
  showInviteModal: false,

  setOwner: (owner) => set({ owner }),
  setCollaborators: (collaborators) => set({ collaborators }),
  setMyAccessLevel: (myAccessLevel) => set({ myAccessLevel }),
  setLoadingCollaborators: (isLoadingCollaborators) =>
    set({ isLoadingCollaborators }),

  addCollaborator: (collaborator) =>
    set((state) => ({
      collaborators: [...state.collaborators, collaborator],
    })),

  removeCollaborator: (id) =>
    set((state) => ({
      collaborators: state.collaborators.filter((c) => c.id !== id),
    })),

  updateCollaboratorRole: (userId, role) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.userId === userId ? { ...c, role } : c,
      ),
    })),

  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  setCursor: (userId, cursor) =>
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.set(userId, cursor);
      return { cursors: newCursors };
    }),

  removeCursor: (userId) =>
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.delete(userId);
      return { cursors: newCursors };
    }),

  setTeams: (teams) => set({ teams }),
  setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
  setLoadingTeams: (isLoadingTeams) => set({ isLoadingTeams }),

  openInviteModal: () => set({ showInviteModal: true }),
  closeInviteModal: () => set({ showInviteModal: false }),

  reset: () =>
    set({
      owner: null,
      collaborators: [],
      myAccessLevel: "none",
      isLoadingCollaborators: false,
      onlineUsers: [],
      cursors: new Map(),
      showInviteModal: false,
    }),
}));
