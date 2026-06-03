import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ScrollToTop from "./components/ScrollToTop";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import ContactPage from "./pages/ContactPage";
import Dashboard from "./pages/Dashboard";
import OnboardingPage from "./pages/OnboardingPage";
import ArtifactsPage from "./pages/ArtifactsPage";
import ArtifactDetailPage from "./pages/ArtifactDetailPage";
import CreateArtifactPage from "./pages/CreateArtifactPage";
import GraphPage from "./pages/GraphPage";

import CoveragePage from "./pages/CoveragePage";
import DriftPage from "./pages/DriftPage";
import AIAgentsPage from "./pages/AIAgentsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import JiraOAuthCallbackPage from "./pages/JiraOAuthCallbackPage";
import GitHubOAuthCallbackPage from "./pages/GitHubOAuthCallbackPage";
import TeamPage from "./pages/TeamPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import PlatformAdminPage from "./pages/PlatformAdminPage";
import NotFound from "./pages/NotFound";
import PromptGeneratorPage from "./pages/PromptGeneratorPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import UnsubscribePage from "./pages/UnsubscribePage";
import DesignSystemPage from "./pages/DesignSystemPage";
import PricingPage from "./pages/PricingPage";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep recently-fetched data fresh across navigations so the
      // sidebar / switchers don't flash "Loading…" when re-mounting hooks.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/integrations/jira/callback" element={<JiraOAuthCallbackPage />} />
          <Route path="/integrations/github/callback" element={<GitHubOAuthCallbackPage />} />
          <Route path="/invite/accept" element={<AcceptInvitePage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/design" element={<DesignSystemPage />} />
          <Route path="/lineage" element={<Navigate to="/graph?view=lineage" replace />} />

          {/* Protected routes — share a single mounted layout so the
              sidebar / header don't remount on every navigation */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/artifacts" element={<ArtifactsPage />} />
            <Route path="/artifacts/new" element={<CreateArtifactPage />} />
            <Route path="/artifacts/:id" element={<ArtifactDetailPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/coverage" element={<CoveragePage />} />
            <Route path="/drift" element={<DriftPage />} />
            <Route path="/ai-agents" element={<AIAgentsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<PlatformAdminPage />} />
            <Route path="/prompt-generator" element={<PromptGeneratorPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
