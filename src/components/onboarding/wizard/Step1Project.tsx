import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardFooter } from "./WizardFooter";

interface Step1Props {
  name: string;
  setName: (v: string) => void;
  keyValue: string;
  setKeyValue: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
  loading?: boolean;
}

export function Step1Project({ name, setName, keyValue, setKeyValue, onBack, onContinue, loading }: Step1Props) {
  const canContinue = !!(name.trim() && keyValue.trim());
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
      <WizardFooter onBack={onBack} onContinue={onContinue} canContinue={canContinue} loading={loading} />
    </div>
  );
}
