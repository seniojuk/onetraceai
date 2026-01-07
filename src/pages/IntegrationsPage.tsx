import { useState } from "react";
import { 
  Plug, 
  Check, 
  ExternalLink,
  Settings,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "source_control" | "project_management" | "ci_cd" | "ai";
  status: "connected" | "disconnected" | "coming_soon";
  lastSync?: string;
}

const integrations: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Sync commits, PRs, and code with your artifact graph",
    icon: "https://github.githubassets.com/favicons/favicon-dark.svg",
    category: "source_control",
    status: "disconnected",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Connect GitLab repositories and merge requests",
    icon: "https://gitlab.com/favicon.ico",
    category: "source_control",
    status: "coming_soon",
  },
  {
    id: "jira",
    name: "Jira Cloud",
    description: "Sync epics, stories, and issues from Jira",
    icon: "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png",
    category: "project_management",
    status: "disconnected",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Import issues and projects from Linear",
    icon: "https://linear.app/favicon.ico",
    category: "project_management",
    status: "coming_soon",
  },
  {
    id: "github_actions",
    name: "GitHub Actions",
    description: "Trigger coverage updates from CI pipelines",
    icon: "https://github.githubassets.com/favicons/favicon-dark.svg",
    category: "ci_cd",
    status: "coming_soon",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Power AI story generation and analysis",
    icon: "https://openai.com/favicon.ico",
    category: "ai",
    status: "connected",
    lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

const IntegrationsPage = () => {
  const { toast } = useToast();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKey, setApiKey] = useState("");

  const handleConnect = async (integration: Integration) => {
    if (integration.status === "coming_soon") {
      toast({
        title: "Coming Soon",
        description: `${integration.name} integration is coming soon!`,
      });
      return;
    }

    setSelectedIntegration(integration);
    setShowConfigDialog(true);
  };

  const handleSaveConnection = async () => {
    if (!selectedIntegration) return;
    
    setConnectingId(selectedIntegration.id);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Connected",
      description: `${selectedIntegration.name} has been connected successfully.`,
    });
    
    setConnectingId(null);
    setShowConfigDialog(false);
    setApiKey("");
  };

  const handleDisconnect = async (integration: Integration) => {
    setConnectingId(integration.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Disconnected",
      description: `${integration.name} has been disconnected.`,
    });
    
    setConnectingId(null);
  };

  const categories = [
    { id: "source_control", label: "Source Control" },
    { id: "project_management", label: "Project Management" },
    { id: "ci_cd", label: "CI/CD" },
    { id: "ai", label: "AI & ML" },
  ];

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
            <p className="text-muted-foreground">
              Connect your tools to sync data with OneTrace
            </p>
          </div>

          <div className="space-y-8">
            {categories.map(category => {
              const categoryIntegrations = integrations.filter(i => i.category === category.id);
              if (categoryIntegrations.length === 0) return null;

              return (
                <div key={category.id}>
                  <h2 className="text-lg font-semibold text-foreground mb-4">{category.label}</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryIntegrations.map(integration => (
                      <Card 
                        key={integration.id}
                        className={cn(
                          "relative",
                          integration.status === "connected" && "border-success/50 bg-success/5"
                        )}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <img 
                              src={integration.icon} 
                              alt={integration.name}
                              className="w-10 h-10 rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/40";
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-foreground">{integration.name}</h3>
                                {integration.status === "connected" && (
                                  <Badge className="bg-success/10 text-success border-success/30">
                                    <Check className="w-3 h-3 mr-1" />
                                    Connected
                                  </Badge>
                                )}
                                {integration.status === "coming_soon" && (
                                  <Badge variant="secondary">Coming Soon</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {integration.description}
                              </p>
                              {integration.lastSync && (
                                <p className="text-xs text-muted-foreground mb-3">
                                  Last synced: {new Date(integration.lastSync).toLocaleString()}
                                </p>
                              )}
                              <div className="flex gap-2">
                                {integration.status === "connected" ? (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleConnect(integration)}
                                    >
                                      <Settings className="w-4 h-4 mr-1" />
                                      Configure
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleDisconnect(integration)}
                                      disabled={connectingId === integration.id}
                                    >
                                      {connectingId === integration.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        "Disconnect"
                                      )}
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleConnect(integration)}
                                    disabled={integration.status === "coming_soon" || connectingId === integration.id}
                                    className={cn(
                                      integration.status !== "coming_soon" && "bg-accent hover:bg-accent/90"
                                    )}
                                  >
                                    {connectingId === integration.id ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Plug className="w-4 h-4 mr-1" />
                                    )}
                                    Connect
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration Dialog */}
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect {selectedIntegration?.name}</DialogTitle>
                <DialogDescription>
                  Enter your credentials to connect {selectedIntegration?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedIntegration?.id === "github" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        You'll be redirected to GitHub to authorize OneTrace.
                      </p>
                    </div>
                    <Button className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Authorize with GitHub
                    </Button>
                  </div>
                )}
                {selectedIntegration?.id === "jira" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="jiraDomain">Jira Domain</Label>
                      <Input
                        id="jiraDomain"
                        placeholder="yourcompany.atlassian.net"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jiraEmail">Email</Label>
                      <Input
                        id="jiraEmail"
                        type="email"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jiraToken">API Token</Label>
                      <Input
                        id="jiraToken"
                        type="password"
                        placeholder="Enter your Jira API token"
                      />
                      <p className="text-xs text-muted-foreground">
                        <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          Create an API token
                        </a>
                      </p>
                    </div>
                  </div>
                )}
                {selectedIntegration?.id === "openai" && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 p-3 bg-success/10 rounded-lg border border-success/20">
                      <Check className="w-5 h-5 text-success mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">AI is already configured</p>
                        <p className="text-xs text-muted-foreground">
                          OneTrace uses built-in AI capabilities
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                  Cancel
                </Button>
                {selectedIntegration?.id !== "openai" && selectedIntegration?.id !== "github" && (
                  <Button 
                    onClick={handleSaveConnection}
                    disabled={connectingId !== null}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {connectingId ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Connect
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default IntegrationsPage;
