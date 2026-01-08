import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Current workspace/project selection
  currentWorkspaceId: string | null;
  currentProjectId: string | null;
  setCurrentWorkspace: (id: string | null) => void;
  setCurrentProject: (id: string | null) => void;

  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;

  // Graph view settings
  graphViewMode: "hierarchy" | "force" | "radial";
  setGraphViewMode: (mode: "hierarchy" | "force" | "radial") => void;

  // Filters
  artifactTypeFilter: string[];
  setArtifactTypeFilter: (types: string[]) => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Current selections
      currentWorkspaceId: null,
      currentProjectId: null,
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id, currentProjectId: null }),
      setCurrentProject: (id) => set({ currentProjectId: id }),

      // Onboarding
      showOnboarding: false,
      setShowOnboarding: (show) => set({ showOnboarding: show }),

      // Graph view
      graphViewMode: "hierarchy",
      setGraphViewMode: (mode) => set({ graphViewMode: mode }),

      // Filters
      artifactTypeFilter: [],
      setArtifactTypeFilter: (types) => set({ artifactTypeFilter: types }),
      statusFilter: [],
      setStatusFilter: (statuses) => set({ statusFilter: statuses }),
    }),
    {
      name: "onetrace-ui-storage",
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
        currentProjectId: state.currentProjectId,
        showOnboarding: state.showOnboarding,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
