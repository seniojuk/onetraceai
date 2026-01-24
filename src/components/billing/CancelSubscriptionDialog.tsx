import { Loader2, AlertTriangle, XCircle } from "lucide-react";
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

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  subscriptionEnd: string | null;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  planName,
  subscriptionEnd,
  onConfirm,
  isLoading,
}: CancelSubscriptionDialogProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "the end of your billing period";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            Cancel Subscription
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to cancel your <strong>{planName}</strong> subscription?
              </p>

              <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">What happens when you cancel:</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>• You'll retain access until {formatDate(subscriptionEnd)}</li>
                    <li>• Your workspaces, projects, and data will be preserved</li>
                    <li>• You'll be moved to the Free plan after the period ends</li>
                    <li>• You can resubscribe anytime to regain Pro features</li>
                  </ul>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                You'll be redirected to the Stripe billing portal to confirm cancellation.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
