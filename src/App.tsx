import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import ContactPage from "./pages/ContactPage";
import Dashboard from "./pages/Dashboard";
import OnboardingPage from "./pages/OnboardingPage";
import ArtifactsPage from "./pages/ArtifactsPage";
import ArtifactDetailPage from "./pages/ArtifactDetailPage";
import CreateArtifactPage from "./pages/CreateArtifactPage";
import GraphPage from "./pages/GraphPage";
import LineagePage from "./pages/LineagePage";
import CoveragePage from "./pages/CoveragePage";
import DriftPage from "./pages/DriftPage";
import AIAgentsPage from "./pages/AIAgentsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import JiraOAuthCallbackPage from "./pages/JiraOAuthCallbackPage";
import TeamPage from "./pages/TeamPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import PlatformAdminPage from "./pages/PlatformAdminPage";
import NotFound from "./pages/NotFound";
import PromptGeneratorPage from "./pages/PromptGeneratorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/artifacts/new" element={<CreateArtifactPage />} />
          <Route path="/artifacts/:id" element={<ArtifactDetailPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/lineage" element={<LineagePage />} />
          <Route path="/coverage" element={<CoveragePage />} />
          <Route path="/drift" element={<DriftPage />} />
          <Route path="/ai-agents" element={<AIAgentsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations/jira/callback" element={<JiraOAuthCallbackPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<PlatformAdminPage />} />
          <Route path="/prompt-generator" element={<PromptGeneratorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
