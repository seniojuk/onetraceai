import { Textarea } from "@/components/ui/textarea";
import { WizardFooter } from "./WizardFooter";

interface Step3Props {
  value: string;
  setValue: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
  loading?: boolean;
}

export function Step3PRD({ value, setValue, onBack, onContinue, loading }: Step3Props) {
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
