import { CheckCircle2, Loader2 } from "lucide-react";

export function Step5Final({ projectName }: { projectName: string }) {
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
