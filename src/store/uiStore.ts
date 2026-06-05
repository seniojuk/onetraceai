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
  onboardingSeed: string;
  setOnboardingSeed: (seed: string) => void;
  dismissedSetupChecklist: boolean;
  setDismissedSetupChecklist: (dismissed: boolean) => void;
  resetUserScopedState: () => void;

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
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      currentWorkspaceId: null,
      currentProjectId: null,
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id, currentProjectId: null }),
      setCurrentProject: (id) => set({ currentProjectId: id }),

      showOnboarding: false,
      setShowOnboarding: (show) => set({ showOnboarding: show }),
      onboardingSeed: "",
      setOnboardingSeed: (seed) => set({ onboardingSeed: seed }),
      dismissedSetupChecklist: false,
      setDismissedSetupChecklist: (dismissed) => set({ dismissedSetupChecklist: dismissed }),
      resetUserScopedState: () =>
        set({
          currentWorkspaceId: null,
          currentProjectId: null,
          showOnboarding: false,
          onboardingSeed: "",
          dismissedSetupChecklist: false,
          artifactTypeFilter: [],
          statusFilter: [],
        }),

      graphViewMode: "hierarchy",
      setGraphViewMode: (mode) => set({ graphViewMode: mode }),

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
        onboardingSeed: state.onboardingSeed,
        dismissedSetupChecklist: state.dismissedSetupChecklist,
      }),
    }
  )
);
