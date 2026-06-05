import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCircle2, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepProgress } from "./StepProgress";
import { supabase } from "@/integrations/supabase/client";
import { useCreateProject } from "@/hooks/useProjects";
import { useCreateArtifact } from "@/hooks/useArtifacts";
import { useCreateArtifactEdge, EdgeType } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GuidedWizardProps {
  workspaceId: string;
  seed: string;
  onExit: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Name your project",
  2: "Describe what you are building",
  3: "Review your PRD",
  4: "Generate your first Epics",
  5: "See your Artifact Graph",
};

export function GuidedWizard({ workspaceId, seed, onExit }: GuidedWizardProps) {
  const navigate = useNavigate();
  const { setCurrentProject } = useUIStore();
  const createProject = useCreateProject();
  const createArtifact = useCreateArtifact();
  const createEdge = useCreateArtifactEdge();

  const [step, setStep] = useState<WizardStep>(1);
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [description, setDescription] = useState(seed);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [prdMarkdown, setPrdMarkdown] = useState("");
  const [prdId, setPrdId] = useState<string | null>(null);
  const [generatingPrd, setGeneratingPrd] = useState(false);

  const [epics, setEpics] = useState<{ title: string; description: string }[]>([]);
  const [generatingEpics, setGeneratingEpics] = useState(false);

  // Auto-suggest project key from name
  useEffect(() => {
    if (!projectKey && projectName) {
      const suggestion = projectName
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 6);
      setProjectKey(suggestion);
    }
  }, [projectName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStep1 = async () => {
    if (!projectName.trim() || !projectKey.trim()) {
      toast.error("Name and key required");
      return;
    }
    const baseKey = projectKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PROJ";
    const baseName = projectName.trim();
    const candidates = [
      { key: baseKey, name: baseName },
      ...Array.from({ length: 5 }).map(() => {
        const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
        return { key: `${baseKey.slice(0, 6)}${suffix}`.slice(0, 10), name: `${baseName} ${suffix}` };
      }),
    ];
    try {
      let project: any = null;
      let lastErr: any = null;
      for (const c of candidates) {
        try {
          project = await createProject.mutateAsync({
            workspaceId,
            name: c.name,
            projectKey: c.key,
            description: seed,
          });
          if (project) {
            setProjectKey(c.key);
            setProjectName(c.name);
            break;
          }
        } catch (err: any) {
          lastErr = err;
          const msg = `${err?.message || ""} ${err?.code || ""} ${err?.details || ""}`;
          const isDup = msg.includes("duplicate key") || msg.includes("23505") || msg.includes("projects_workspace_id_project_key_key") || msg.includes("projects_workspace_id_name_key");
          if (!isDup) throw err;
        }
      }
      if (!project) throw lastErr || new Error("Could not create a unique project");
      setProjectId(project.id);
      setCurrentProject(project.id);
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || "Could not create project");
    }
  };

  const handleStep2 = async () => {
    if (description.trim().length < 8) {
      toast.error("Add a few more words so we can draft your PRD");
      return;
    }
    setGeneratingPrd(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-prd", {
        body: {
          idea: description.trim(),
          conversationHistory: [],
          action: "generate",
        },
      });
      if (error) throw error;
      // generate-prd returns { phase: "complete", prd: {...} }
      const prd = data?.prd;
      const md = typeof prd === "string"
        ? prd
        : prd
          ? `# ${prd.title || projectName}\n\n${prd.overview || ""}\n\n## Goals\n${(prd.goals || []).map((g: string) => `- ${g}`).join("\n")}\n\n## Requirements\n${(prd.requirements || []).map((r: string) => `- ${r}`).join("\n")}\n\n## Success metrics\n${(prd.successMetrics || []).map((m: string) => `- ${m}`).join("\n")}`
          : `# ${projectName}\n\n${description.trim()}`;
      setPrdMarkdown(md);
      setStep(3);
    } catch (e: any) {
      // Graceful fallback: still let them proceed with a hand-written PRD
      setPrdMarkdown(`# ${projectName}\n\n${description.trim()}\n\n_Could not reach the AI right now. Edit this PRD by hand and continue._`);
      setStep(3);
      toast.message("Drafted a starter PRD locally.");
    } finally {
      setGeneratingPrd(false);
    }
  };

  const handleStep3 = async () => {
    if (!projectId) return;
    try {
      const artifact = await createArtifact.mutateAsync({
        workspaceId,
        projectId,
        type: "PRD",
        title: projectName,
        contentMarkdown: prdMarkdown,
      });
      setPrdId(artifact.id);
      setStep(4);
    } catch (e: any) {
      toast.error(e.message || "Could not save PRD");
    }
  };

  const handleStep4Generate = async () => {
    setGeneratingEpics(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-epics", {
        body: {
          prdContent: prdMarkdown,
          conversationHistory: [],
          action: "generate",
        },
      });
      if (error) throw error;
      const generated = data?.epics || data?.result?.epics || [];
      const list = (generated.length ? generated : fallbackEpics(projectName)).slice(0, 3);
      setEpics(list);
    } catch {
      setEpics(fallbackEpics(projectName));
    } finally {
      setGeneratingEpics(false);
    }
  };

  const handleStep4Save = async () => {
    if (!projectId || !prdId) return;
    try {
      for (const epic of epics) {
        const epicArtifact = await createArtifact.mutateAsync({
          workspaceId,
          projectId,
          type: "EPIC",
          title: epic.title,
          contentMarkdown: epic.description,
        });
        await createEdge.mutateAsync({
          workspaceId,
          projectId,
          fromArtifactId: prdId,
          toArtifactId: epicArtifact.id,
          edgeType: EdgeType.CONTAINS,
          source: "ONBOARDING",
        });
      }
      setStep(5);
      // Small delay before nav for the final beat
      setTimeout(() => {
        navigate("/graph?welcome=1");
      }, 1100);
    } catch (e: any) {
      toast.error(e.message || "Could not save Epics");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <StepProgress current={step} total={5} label={`Setup · ${STEP_LABELS[step]}`} />

      <div key={step} className="mt-10 animate-rise-in">
        {step === 1 && (
          <Step1
            name={projectName}
            setName={setProjectName}
            keyValue={projectKey}
            setKeyValue={setProjectKey}
            onBack={onExit}
            onContinue={handleStep1}
            loading={createProject.isPending}
          />
        )}
        {step === 2 && (
          <Step2
            value={description}
            setValue={setDescription}
            onBack={() => setStep(1)}
            onContinue={handleStep2}
            loading={generatingPrd}
          />
        )}
        {step === 3 && (
          <Step3
            value={prdMarkdown}
            setValue={setPrdMarkdown}
            onBack={() => setStep(2)}
            onContinue={handleStep3}
            loading={createArtifact.isPending}
          />
        )}
        {step === 4 && (
          <Step4
            epics={epics}
            generating={generatingEpics}
            onGenerate={handleStep4Generate}
            onBack={() => setStep(3)}
            onContinue={handleStep4Save}
            saving={createArtifact.isPending || createEdge.isPending}
          />
        )}
        {step === 5 && <Step5Final projectName={projectName} />}
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ name, setName, keyValue, setKeyValue, onBack, onContinue, loading }: any) {
  const canContinue = name.trim() && keyValue.trim();
  return (
    <div>
      <h2 className="font-display text-[28px] font-semibold leading-tight text-foreground sm:text-[36px]">
        Name this project.
      </h2>
      <p className="mt-2 text-[14px] text-muted-foreground">
        A short name plus a key that prefixes every artifact ID.
      </p>
      <div className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="pname">Project name</Label>
          <Input
            id="pname"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Mobile"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pkey">Project key</Label>
          <Input
            id="pkey"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="ACME"
            maxLength={10}
          />
          <p className="font-mono text-[11px] text-muted-foreground/80">{keyValue || "KEY"}-STORY-0001</p>
        </div>
      </div>
      <WizardFooter onBack={onBack} onContinue={onContinue} canContinue={!!canContinue} loading={loading} backLabel="Back" />
    </div>
  );
}

function Step2({ value, setValue, onBack, onContinue, loading }: any) {
  return (
    <div>
      <h2 className="font-display text-[28px] font-semibold leading-tight text-foreground sm:text-[36px]">
        Describe what you are building.
      </h2>
      <p className="mt-2 text-[14px] text-muted-foreground">
        A paragraph is plenty. We will draft a real PRD from it in the next step.
      </p>
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        className="mt-8 resize-none border-border bg-card text-[14px] leading-relaxed shadow-sm focus-visible:ring-accent/40"
      />
      <WizardFooter
        onBack={onBack}
        onContinue={onContinue}
        canContinue={value.trim().length >= 8}
        loading={loading}
        loadingLabel="Drafting your PRD"
        continueLabel="Draft my PRD"
        continueIcon={Sparkles}
      />
    </div>
  );
}

function Step3({ value, setValue, onBack, onContinue, loading }: any) {
  return (
    <div>
      <h2 className="font-display text-[28px] font-semibold leading-tight text-foreground sm:text-[36px]">
        Your PRD draft.
      </h2>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Edit anything that feels off. You can keep iterating later from the artifact page.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={14}
        className="mt-8 resize-none border-border bg-card font-mono text-[12px] leading-relaxed shadow-sm focus-visible:ring-accent/40"
      />
      <WizardFooter
        onBack={onBack}
        onContinue={onContinue}
        canContinue={value.trim().length > 20}
        loading={loading}
        continueLabel="Save and continue"
      />
    </div>
  );
}

function Step4({ epics, generating, onGenerate, onBack, onContinue, saving }: any) {
  const hasEpics = epics.length > 0;
  return (
    <div>
      <h2 className="font-display text-[28px] font-semibold leading-tight text-foreground sm:text-[36px]">
        Generate your first Epics.
      </h2>
      <p className="mt-2 text-[14px] text-muted-foreground">
        We break the PRD into 3 epics. You can edit, add, or delete them anytime.
      </p>

      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border/60">
        {!hasEpics && !generating && (
          <div className="bg-card p-10 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-accent" />
            <p className="mt-3 text-[13px] text-muted-foreground">No epics yet. Generate to see them.</p>
            <Button variant="accent" onClick={onGenerate} className="mt-5 animate-eye-pull">
              Generate Epics
              <Sparkles className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {generating && (
          <div className="bg-card p-10 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
            <p className="mt-3 text-[13px] text-muted-foreground">Splitting your PRD into epics…</p>
          </div>
        )}
        {hasEpics &&
          epics.map((e: any, i: number) => (
            <div key={i} className="flex gap-4 bg-card p-5 animate-rise-in" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-status-epic/10 font-mono text-[11px] font-medium text-status-epic-fg">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground">{e.title}</p>
                {e.description && (
                  <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{e.description}</p>
                )}
              </div>
            </div>
          ))}
      </div>

      <WizardFooter
        onBack={onBack}
        onContinue={hasEpics ? onContinue : onGenerate}
        canContinue={!generating}
        loading={saving}
        continueLabel={hasEpics ? "See my graph" : "Generate Epics"}
        continueIcon={hasEpics ? Network : Sparkles}
      />
    </div>
  );
}

function Step5Final({ projectName }: { projectName: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 animate-node-pop">
        <CheckCircle2 className="h-7 w-7 text-accent" />
      </div>
      <h2 className="font-display text-[28px] font-semibold leading-tight text-foreground sm:text-[36px]">
        Your first trace is live.
      </h2>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Loading the Artifact Graph for <span className="font-medium text-foreground">{projectName}</span>…
      </p>
      <Loader2 className="mx-auto mt-6 h-4 w-4 animate-spin text-accent" />
    </div>
  );
}

// ─── Shared footer ────────────────────────────────────────────────────────────

function WizardFooter({
  onBack,
  onContinue,
  canContinue,
  loading,
  loadingLabel,
  continueLabel = "Continue",
  continueIcon: ContinueIcon = ArrowRight,
  backLabel = "Back",
}: {
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  loading?: boolean;
  loadingLabel?: string;
  continueLabel?: string;
  continueIcon?: React.ElementType;
  backLabel?: string;
}) {
  return (
    <div className="mt-10 flex items-center justify-between">
      <Button variant="ghost" onClick={onBack} disabled={loading} className="text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {backLabel}
      </Button>
      <Button
        variant="accent"
        size="lg"
        onClick={onContinue}
        disabled={!canContinue || loading}
        className={cn(canContinue && !loading && "animate-eye-pull")}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingLabel || "Working…"}
          </>
        ) : (
          <>
            {continueLabel}
            <ContinueIcon className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fallbackEpics(projectName: string) {
  return [
    { title: "Authentication and onboarding", description: `Sign up, sign in, and first-run experience for ${projectName}.` },
    { title: "Core workflow", description: "The primary path users take to get value." },
    { title: "Collaboration and sharing", description: "Inviting teammates and sharing what they produce." },
  ];
}
