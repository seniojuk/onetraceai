import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  entityName: string;
  entityType: "workspace" | "project";
  isDeleting?: boolean;
}

const impactDetails = {
  workspace: [
    "All projects within this workspace",
    "All artifacts (PRDs, Epics, Stories, Test Cases, etc.)",
    "All AI agent configurations and run history",
    "All pipelines and pipeline runs",
    "All coverage snapshots and drift findings",
    "All Jira integrations and issue mappings",
    "All workspace members and their access",
    "All billing and subscription data",
  ],
  project: [
    "All artifacts (PRDs, Epics, Stories, Test Cases, etc.)",
    "All artifact versions and lineage edges",
    "All coverage snapshots and drift findings",
    "All AI runs associated with this project",
    "All Jira issue mappings for this project",
    "All file associations and uploaded files",
  ],
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  entityName,
  entityType,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = confirmText === entityName;

  return (
    <AlertDialog open={open} onOpenChange={(val) => {
      if (!val) setConfirmText("");
      onOpenChange(val);
    }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This action is <strong className="text-destructive">permanent and irreversible</strong>. Deleting this {entityType} will remove:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                {impactDetails[entityType].map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-foreground mb-2">
                  Type <strong className="text-destructive">"{entityName}"</strong> to confirm:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={entityName}
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={!isConfirmed || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : `Delete ${entityType}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
