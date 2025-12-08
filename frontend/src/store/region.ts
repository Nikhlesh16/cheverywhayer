import { create } from 'zustand';

export interface Workspace {
  id: string;
  h3Index: string;
  name?: string;
  description?: string;
  color?: string;
  memberCount?: number;
  postCount?: number;
}

export interface JoinedWorkspace {
  id: string;
  isPinned: boolean;
  lastVisitedAt: string;
  joinedAt: string;
  workspace: Workspace;
  unreadCount: number;
  customName?: string; // User's custom name for this workspace
}

export interface RegionState {
  selectedRegion: string | null;
  activeWorkspace: Workspace | null;
  joinedWorkspaces: JoinedWorkspace[];
  userLocation: { lat: number; lng: number } | null;
  isLoadingWorkspaces: boolean;
  sidebarWidth: number;
  feedWidth: number;
  mobileView: 'map' | 'workspaces' | 'feed';

  setSelectedRegion: (h3Index: string | null) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setJoinedWorkspaces: (workspaces: JoinedWorkspace[]) => void;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  setIsLoadingWorkspaces: (loading: boolean) => void;
  addJoinedWorkspace: (workspace: JoinedWorkspace) => void;
  removeJoinedWorkspace: (h3Index: string) => void;
  updateWorkspaceUnread: (h3Index: string, unreadCount: number) => void;
  toggleWorkspacePin: (h3Index: string) => void;
  clearUnreadCount: (h3Index: string) => void;
  updateWorkspaceCustomName: (h3Index: string, customName: string | null) => void;
  setSidebarWidth: (width: number) => void;
  setFeedWidth: (width: number) => void;
  setMobileView: (view: 'map' | 'workspaces' | 'feed') => void;
}

export const useRegionStore = create<RegionState>((set) => ({
  selectedRegion: null,
  activeWorkspace: null,
  joinedWorkspaces: [],
  userLocation: null,
  isLoadingWorkspaces: false,
  sidebarWidth: 256, // default 16rem = 256px
  feedWidth: 384, // default 24rem = 384px
  mobileView: 'map', // default to map view on mobile

  setSelectedRegion: (h3Index) => set({ selectedRegion: h3Index }),
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  setJoinedWorkspaces: (workspaces) => set({ joinedWorkspaces: workspaces }),
  setUserLocation: (location) => set({ userLocation: location }),
  setIsLoadingWorkspaces: (loading) => set({ isLoadingWorkspaces: loading }),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(400, width)) }),
  setFeedWidth: (width) => set({ feedWidth: Math.max(300, Math.min(600, width)) }),
  setMobileView: (view) => set({ mobileView: view }),
  
  addJoinedWorkspace: (workspace) =>
    set((state) => ({
      joinedWorkspaces: [workspace, ...state.joinedWorkspaces],
    })),
  
  removeJoinedWorkspace: (h3Index) =>
    set((state) => ({
      joinedWorkspaces: state.joinedWorkspaces.filter(
        (w) => w.workspace.h3Index !== h3Index
      ),
    })),
  
  updateWorkspaceUnread: (h3Index, unreadCount) =>
    set((state) => ({
      joinedWorkspaces: state.joinedWorkspaces.map((w) =>
        w.workspace.h3Index === h3Index ? { ...w, unreadCount } : w
      ),
    })),
  
  toggleWorkspacePin: (h3Index) =>
    set((state) => ({
      joinedWorkspaces: state.joinedWorkspaces.map((w) =>
        w.workspace.h3Index === h3Index ? { ...w, isPinned: !w.isPinned } : w
      ),
    })),
  
  clearUnreadCount: (h3Index) =>
    set((state) => ({
      joinedWorkspaces: state.joinedWorkspaces.map((w) =>
        w.workspace.h3Index === h3Index ? { ...w, unreadCount: 0 } : w
      ),
    })),

  updateWorkspaceCustomName: (h3Index, customName) =>
    set((state) => ({
      joinedWorkspaces: state.joinedWorkspaces.map((w) =>
        w.workspace.h3Index === h3Index ? { ...w, customName: customName || undefined } : w
      ),
    })),
}));
