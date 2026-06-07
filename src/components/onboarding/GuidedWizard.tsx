import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StepProgress } from "./StepProgress";
import { supabase } from "@/integrations/supabase/client";
import { useCreateProject } from "@/hooks/useProjects";
import { useCreateArtifact } from "@/hooks/useArtifacts";
import { useCreateArtifactEdge, EdgeType } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { toast } from "sonner";
import { Step1Project } from "./wizard/Step1Project";
import { Step2Describe } from "./wizard/Step2Describe";
import { Step3PRD } from "./wizard/Step3PRD";
import { Step4Epics } from "./wizard/Step4Epics";
import { Step5Final } from "./wizard/Step5Final";
import { fallbackEpics } from "./wizard/fallbackEpics";

interface GuidedWizardProps {
  workspaceId: string;
  seed: string;
  onExit: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

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
      const prd = data?.prd;
      const md = typeof prd === "string"
        ? prd
        : prd
          ? `# ${prd.title || projectName}\n\n${prd.overview || ""}\n\n## Goals\n${(prd.goals || []).map((g: string) => `- ${g}`).join("\n")}\n\n## Requirements\n${(prd.requirements || []).map((r: string) => `- ${r}`).join("\n")}\n\n## Success metrics\n${(prd.successMetrics || []).map((m: string) => `- ${m}`).join("\n")}`
          : `# ${projectName}\n\n${description.trim()}`;
      setPrdMarkdown(md);
      setStep(3);
    } catch (e: any) {
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
          source: "IMPORT",
        });
      }
      setStep(5);
      setTimeout(() => {
        navigate("/graph?welcome=1");
      }, 1100);
    } catch (e: any) {
      toast.error(e.message || "Could not save Epics");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <StepProgress current={step} total={5} label="Let's get you started" />

      <div key={step} className="mt-10 animate-rise-in">
        {step === 1 && (
          <Step1Project
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
          <Step2Describe
            value={description}
            setValue={setDescription}
            onBack={() => setStep(1)}
            onContinue={handleStep2}
            loading={generatingPrd}
          />
        )}
        {step === 3 && (
          <Step3PRD
            value={prdMarkdown}
            setValue={setPrdMarkdown}
            onBack={() => setStep(2)}
            onContinue={handleStep3}
            loading={createArtifact.isPending}
          />
        )}
        {step === 4 && (
          <Step4Epics
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
