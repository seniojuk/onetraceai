import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { WizardFooter } from "./WizardFooter";

interface Step2Props {
  value: string;
  setValue: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
  loading?: boolean;
}

export function Step2Describe({ value, setValue, onBack, onContinue, loading }: Step2Props) {
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
