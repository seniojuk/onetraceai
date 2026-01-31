import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { JiraConnectionStep } from "./JiraConnectionStep";
import { JiraProjectSelectStep } from "./JiraProjectSelectStep";
import { JiraFieldMappingStep } from "./JiraFieldMappingStep";
import { JiraConnection, JiraProject, JiraProjectLink } from "@/hooks/useJiraConnection";

interface JiraSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId: string;
  connection: JiraConnection | null;
  projectLink: JiraProjectLink | null;
  onComplete: () => void;
}

type WizardStep = "connect" | "select-project" | "field-mapping";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "connect", label: "Connect Jira" },
  { id: "select-project", label: "Select Project" },
  { id: "field-mapping", label: "Field Mapping" },
];

export function JiraSetupWizard({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  connection,
  projectLink,
  onComplete,
}: JiraSetupWizardProps) {
  // Determine step based on existing connection state
  const getCorrectStep = (): WizardStep => {
    if (!connection || connection.status === "disconnected") return "connect";
    if (!projectLink) return "select-project";
    return "field-mapping";
  };

  const [currentStep, setCurrentStep] = useState<WizardStep>(getCorrectStep);
  const [selectedJiraProject, setSelectedJiraProject] = useState<JiraProject | null>(null);

  // Reset step when dialog opens to ensure correct starting point
  useEffect(() => {
    if (open) {
      setCurrentStep(getCorrectStep());
      setSelectedJiraProject(null);
    }
  }, [open, connection, projectLink]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleConnectionSuccess = () => {
    setCurrentStep("select-project");
  };

  const handleProjectSelected = (project: JiraProject) => {
    setSelectedJiraProject(project);
    setCurrentStep("field-mapping");
  };

  const handleMappingComplete = () => {
    onComplete();
    handleClose();
  };

  const handleBack = () => {
    if (currentStep === "field-mapping") {
      setCurrentStep("select-project");
    } else if (currentStep === "select-project") {
      setCurrentStep("connect");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Jira Cloud Setup</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Step indicators */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                        isCompleted && "bg-success text-success-foreground",
                        isCurrent && "bg-primary text-primary-foreground",
                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        "ml-2 text-sm hidden sm:inline",
                        isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "w-12 sm:w-24 h-0.5 mx-2 sm:mx-4",
                          isCompleted ? "bg-success" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {currentStep === "connect" && (
            <JiraConnectionStep
              workspaceId={workspaceId}
              connection={connection}
              onSuccess={handleConnectionSuccess}
            />
          )}

          {currentStep === "select-project" && connection && (
            <JiraProjectSelectStep
              workspaceId={workspaceId}
              projectId={projectId}
              connection={connection}
              onProjectSelected={handleProjectSelected}
              onBack={handleBack}
            />
          )}

          {currentStep === "field-mapping" && connection && selectedJiraProject && (
            <JiraFieldMappingStep
              workspaceId={workspaceId}
              projectId={projectId}
              connectionId={connection.id}
              jiraProject={selectedJiraProject}
              onComplete={handleMappingComplete}
              onBack={handleBack}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
