import { useState } from "react";
import {
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  Loader2,
  Terminal,
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CIToken {
  id: string;
  label: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface CICoveragePanelProps {
  workspaceId: string;
  projectId: string;
}

// ── Crypto helpers ──────────────────────────────────────────────────────────
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `otr_${hex}`;
}

// ── Hooks ───────────────────────────────────────────────────────────────────
function useCITokens(projectId: string) {
  return useQuery({
    queryKey: ["ci-tokens", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ci_coverage_tokens")
        .select("id, label, token_prefix, last_used_at, created_at, revoked_at")
        .eq("project_id", projectId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CIToken[];
    },
    enabled: !!projectId,
  });
}

function useCreateCIToken(workspaceId: string, projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (label: string) => {
      const rawToken = generateToken();
      const hash = await sha256Hex(rawToken);
      const prefix = rawToken.slice(0, 12); // "otr_" + 8 chars

      const { error } = await supabase.from("ci_coverage_tokens").insert({
        workspace_id: workspaceId,
        project_id: projectId,
        label,
        token_hash: hash,
        token_prefix: prefix,
      });
      if (error) throw error;
      return rawToken; // return plaintext only once
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ci-tokens", projectId] });
      toast({ title: "Token created", description: "Copy it now — it won't be shown again." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create token", description: err.message, variant: "destructive" });
    },
  });
}

function useRevokeCIToken(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("ci_coverage_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ci-tokens", projectId] });
      toast({ title: "Token revoked" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to revoke token", description: err.message, variant: "destructive" });
    },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className={cn("h-7 w-7 flex-shrink-0", className)} onClick={copy}>
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative group">
      <pre className="bg-muted rounded-md px-3 py-2.5 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {children}
      </pre>
      <CopyButton
        text={children}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}

// ── New token dialog ─────────────────────────────────────────────────────────
function NewTokenDialog({
  open,
  onOpenChange,
  workspaceId,
  projectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  projectId: string;
}) {
  const [label, setLabel] = useState("CI Token");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const createToken = useCreateCIToken(workspaceId, projectId);

  const handleCreate = async () => {
    const raw = await createToken.mutateAsync(label);
    setCreatedToken(raw);
  };

  const handleClose = () => {
    setCreatedToken(null);
    setVisible(false);
    setLabel("CI Token");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create CI Token</DialogTitle>
          <DialogDescription>
            This token grants CI pipelines permission to report coverage to this project.
          </DialogDescription>
        </DialogHeader>

        {!createdToken ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Token label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. GitHub Actions"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-md border border-warning/30">
              <Shield className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning font-medium">
                Copy this token now. It will not be shown again.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Your CI Token</Label>
              <div className="flex gap-2">
                <Input
                  type={visible ? "text" : "password"}
                  value={createdToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="ghost" size="icon" onClick={() => setVisible(!visible)}>
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <CopyButton text={createdToken} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!createdToken ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createToken.isPending || !label.trim()}>
                {createToken.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Token
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
const ENDPOINT = `https://gwanafrslggzqsxpchfw.supabase.co/functions/v1/ci-coverage`;

const GITHUB_ACTIONS_YAML = `name: OneTrace Coverage Report

on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - name: Report coverage to OneTrace
        run: |
          RESULT=$(curl -s -X POST \\
            -H "X-OneTrace-Token: \${{ secrets.ONETRACE_CI_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"coverage_threshold": 0.7}' \\
            ${ENDPOINT})
          echo "$RESULT" | jq .
          PASSES=$(echo "$RESULT" | jq -r '.passes')
          if [ "$PASSES" != "true" ]; then
            echo "Coverage below threshold!"
            exit 1
          fi`;

const CURL_EXAMPLE = `curl -X POST \\
  -H "X-OneTrace-Token: <YOUR_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"coverage_threshold": 0.7}' \\
  ${ENDPOINT}`;

export function CICoveragePanel({ workspaceId, projectId }: CICoveragePanelProps) {
  const [showNewToken, setShowNewToken] = useState(false);
  const { data: tokens = [], isLoading } = useCITokens(projectId);
  const revoke = useRevokeCIToken(projectId);

  return (
    <div className="rounded-lg border bg-card text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">CI Coverage Reporting</span>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNewToken(true)}>
          <Plus className="w-3 h-3 mr-1" />
          New Token
        </Button>
      </div>

      <div className="p-4 space-y-5">
        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Trigger coverage recomputation from your CI pipeline after each push. The endpoint
          validates your token, recomputes AC coverage, persists snapshots, and returns a JSON
          report you can use to fail the build.
        </p>

        {/* Tokens section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Active Tokens</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-5 rounded-md border border-dashed">
              <Key className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No tokens yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md border bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{token.label}</span>
                      <code className="text-xs text-muted-foreground font-mono">{token.token_prefix}…</code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {new Date(token.created_at).toLocaleDateString()}
                      {token.last_used_at && (
                        <span> · Last used {new Date(token.last_used_at).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                    title="Revoke token"
                    onClick={() => revoke.mutate(token.id)}
                    disabled={revoke.isPending}
                  >
                    {revoke.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* GitHub Actions example */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
              src="https://github.githubassets.com/favicons/favicon-dark.svg"
              alt="GitHub"
              className="w-3.5 h-3.5"
            />
            <span className="text-xs font-medium text-foreground">GitHub Actions Example</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Add <code className="bg-muted px-1 rounded text-xs">ONETRACE_CI_TOKEN</code> to your
            repository secrets, then paste this step into your workflow:
          </p>
          <ScrollArea className="h-[200px]">
            <CodeBlock>{GITHUB_ACTIONS_YAML}</CodeBlock>
          </ScrollArea>
        </div>

        <Separator />

        {/* cURL example */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-foreground">cURL / Any CI</span>
          <CodeBlock>{CURL_EXAMPLE}</CodeBlock>
        </div>

        {/* Response schema hint */}
        <div className="rounded-md bg-muted/40 px-3 py-2.5 space-y-1">
          <p className="text-xs font-medium text-foreground">Response fields</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
            <li><code className="font-mono">passes</code> — <span className="text-foreground">true</span> if overall coverage ≥ threshold</li>
            <li><code className="font-mono">project_totals.coverage_percent</code> — 0–100</li>
            <li><code className="font-mono">failing[]</code> — stories below threshold with details</li>
            <li><code className="font-mono">summary.drift_findings_created</code> — new drift records</li>
          </ul>
        </div>
      </div>

      <NewTokenDialog
        open={showNewToken}
        onOpenChange={setShowNewToken}
        workspaceId={workspaceId}
        projectId={projectId}
      />
    </div>
  );
}
