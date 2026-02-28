import { useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import {
  useCollaborationStore,
  type CollaboratorRole,
  type ProjectOwner,
  type Collaborator,
  type OnlineUser,
  type Team,
} from "@/stores/collaborationStore";

interface UseCollaborationReturn {
  owner: ProjectOwner | null;
  collaborators: Collaborator[];
  myAccessLevel: CollaboratorRole | "none";
  isLoading: boolean;
  onlineUsers: OnlineUser[];
  teams: Team[];
  showInviteModal: boolean;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  fetchCollaborators: () => Promise<void>;
  fetchAccessLevel: () => Promise<void>;
  inviteCollaborator: (
    email: string,
    role: "editor" | "viewer",
  ) => Promise<void>;
  removeCollaborator: (userId: string) => Promise<void>;
  updateRole: (userId: string, role: "editor" | "viewer") => Promise<void>;
  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<void>;
  canEdit: boolean;
  isOwner: boolean;
}

export function useCollaboration(
  projectId: string | undefined,
): UseCollaborationReturn {
  const store = useCollaborationStore();

  const fetchCollaborators = useCallback(async () => {
    if (!projectId) return;
    store.setLoadingCollaborators(true);
    try {
      const res = await api.get(`/projects/${projectId}/collaborators`);
      const data = res.data;
      store.setOwner(data.owner ?? null);
      store.setCollaborators(data.collaborators ?? []);
    } catch (err) {
      console.error("Failed to fetch collaborators:", err);
    } finally {
      store.setLoadingCollaborators(false);
    }
  }, [projectId, store]);

  const fetchAccessLevel = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.get(`/projects/${projectId}/access-level`);
      store.setMyAccessLevel(res.data.accessLevel);
    } catch {
      store.setMyAccessLevel("none");
    }
  }, [projectId, store]);

  const inviteCollaborator = useCallback(
    async (email: string, role: "editor" | "viewer") => {
      if (!projectId) return;
      const res = await api.post(`/projects/${projectId}/collaborators`, {
        email,
        role,
      });
      store.addCollaborator({
        id: res.data.id,
        userId: null,
        email: res.data.email,
        name: null,
        avatarUrl: null,
        role: res.data.role,
        status: res.data.status,
        createdAt: res.data.createdAt,
      });
    },
    [projectId, store],
  );

  const removeCollaborator = useCallback(
    async (userId: string) => {
      if (!projectId) return;
      await api.delete(`/projects/${projectId}/collaborators/${userId}`);
      const collab = store.collaborators.find((c) => c.userId === userId);
      if (collab) {
        store.removeCollaborator(collab.id);
      }
    },
    [projectId, store],
  );

  const updateRole = useCallback(
    async (userId: string, role: "editor" | "viewer") => {
      if (!projectId) return;
      await api.put(`/projects/${projectId}/collaborators/${userId}`, { role });
      store.updateCollaboratorRole(userId, role);
    },
    [projectId, store],
  );

  const fetchTeams = useCallback(async () => {
    store.setLoadingTeams(true);
    try {
      const res = await api.get("/teams");
      store.setTeams(res.data);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    } finally {
      store.setLoadingTeams(false);
    }
  }, [store]);

  const createTeam = useCallback(
    async (name: string) => {
      const res = await api.post("/teams", { name });
      store.setTeams([
        ...store.teams,
        {
          ...res.data,
          myRole: "owner",
          ownerId: "",
        },
      ]);
    },
    [store],
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (projectId) {
      fetchCollaborators();
      fetchAccessLevel();
    }
    return () => {
      store.reset();
    };
  }, [projectId]);

  const canEdit =
    store.myAccessLevel === "owner" || store.myAccessLevel === "editor";
  const isOwner = store.myAccessLevel === "owner";

  return {
    owner: store.owner,
    collaborators: store.collaborators,
    myAccessLevel: store.myAccessLevel,
    isLoading: store.isLoadingCollaborators,
    onlineUsers: store.onlineUsers,
    teams: store.teams,
    showInviteModal: store.showInviteModal,
    openInviteModal: store.openInviteModal,
    closeInviteModal: store.closeInviteModal,
    fetchCollaborators,
    fetchAccessLevel,
    inviteCollaborator,
    removeCollaborator,
    updateRole,
    fetchTeams,
    createTeam,
    canEdit,
    isOwner,
  };
}
