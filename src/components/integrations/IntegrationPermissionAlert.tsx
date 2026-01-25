import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface IntegrationPermissionAlertProps {
  type: "role" | "plan";
  requiredRole?: string;
  requiredPlan?: string;
}

export function IntegrationPermissionAlert({
  type,
  requiredRole = "Admin",
  requiredPlan = "Pro",
}: IntegrationPermissionAlertProps) {
  if (type === "role") {
    return (
      <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Permission Required</AlertTitle>
        <AlertDescription>
          You need {requiredRole} or Owner permissions to manage integrations.
          Contact your workspace administrator to request access.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-primary/10 border-primary/30">
      <ShieldAlert className="h-4 w-4 text-primary" />
      <AlertTitle>Upgrade Required</AlertTitle>
      <AlertDescription>
        Integrations are available on {requiredPlan} and Enterprise plans.
        Upgrade your workspace to access this feature.
      </AlertDescription>
    </Alert>
  );
}
