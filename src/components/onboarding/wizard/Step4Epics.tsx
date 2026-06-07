import { Loader2, Network, Sparkles } from "lucide-react";
import { WizardFooter } from "./WizardFooter";

interface Epic {
  title: string;
  description: string;
}

interface Step4Props {
  epics: Epic[];
  generating: boolean;
  onGenerate: () => void;
  onBack: () => void;
  onContinue: () => void;
  saving?: boolean;
}

export function Step4Epics({ epics, generating, onGenerate, onBack, onContinue, saving }: Step4Props) {
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
          </div>
        )}
        {generating && (
          <div className="bg-card p-10 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
            <p className="mt-3 text-[13px] text-muted-foreground">Splitting your PRD into epics…</p>
          </div>
        )}
        {hasEpics &&
          epics.map((e, i) => (
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
