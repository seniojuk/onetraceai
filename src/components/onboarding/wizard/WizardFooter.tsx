import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardFooterProps {
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  loading?: boolean;
  loadingLabel?: string;
  continueLabel?: string;
  continueIcon?: React.ElementType;
  backLabel?: string;
}

export function WizardFooter({
  onBack,
  onContinue,
  canContinue,
  loading,
  loadingLabel,
  continueLabel = "Continue",
  continueIcon: ContinueIcon = ArrowRight,
  backLabel = "Back",
}: WizardFooterProps) {
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
