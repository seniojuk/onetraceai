import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SeedPromptStepProps {
  initialValue?: string;
  onContinue: (seed: string) => void;
}

const PROMPTS = [
  "A SaaS for small teams to manage feedback from customers",
  "An internal tool that triages incoming bug reports",
  "A mobile app that helps freelancers send invoices",
];

export function SeedPromptStep({ initialValue = "", onContinue }: SeedPromptStepProps) {
  const [value, setValue] = useState(initialValue);
  const [placeholder, setPlaceholder] = useState(PROMPTS[0]);

  // Rotate placeholder examples so the field feels alive.
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % PROMPTS.length;
      setPlaceholder(PROMPTS[i]);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const canContinue = value.trim().length >= 8;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="animate-rise-in">
        <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[56px]">
          What are you building right now?
        </h1>
        <p className="mt-4 max-w-lg text-[15px] text-muted-foreground">
          One or two sentences. We will turn it into your first traceable requirement in under 5 minutes.
        </p>
      </div>

      <div className="mt-10 animate-rise-in" style={{ animationDelay: "120ms" }}>
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="resize-none border-border bg-card text-[15px] leading-relaxed shadow-sm focus-visible:ring-accent/40"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground/70">
            Stays private to your workspace.
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
            {value.trim().length}
          </span>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 animate-rise-in" style={{ animationDelay: "240ms" }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onContinue("")}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </Button>
        <Button
          variant="accent"
          size="lg"
          disabled={!canContinue}
          onClick={() => onContinue(value.trim())}
          className={cn(canContinue && "animate-eye-pull")}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
