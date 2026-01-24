import { Check, Sparkles, Zap, Building2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PlanLimit } from "@/hooks/useBilling";

interface PlanCardProps {
  plan: PlanLimit;
  isCurrentPlan: boolean;
  isPopular?: boolean;
  isUpgrading: boolean;
  onUpgrade: (plan: PlanLimit) => void;
}

function PlanCard({ plan, isCurrentPlan, isPopular, isUpgrading, onUpgrade }: PlanCardProps) {
  const features = [
    plan.max_workspaces === null ? "Unlimited workspaces" : `${plan.max_workspaces} workspace${plan.max_workspaces > 1 ? "s" : ""}`,
    plan.max_projects === null ? "Unlimited projects" : `${plan.max_projects} projects`,
    plan.max_artifacts === null ? "Unlimited artifacts" : `${plan.max_artifacts} artifacts`,
    plan.max_ai_runs_per_month === null ? "Unlimited AI runs" : `${plan.max_ai_runs_per_month} AI runs/month`,
    ...(plan.features as string[] || []),
  ];

  const getIcon = () => {
    switch (plan.plan_id) {
      case "free":
        return <Zap className="w-5 h-5" />;
      case "pro":
        return <Sparkles className="w-5 h-5 text-accent" />;
      case "enterprise":
        return <Building2 className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const formatPrice = () => {
    if (plan.price_monthly === -1) {
      return { amount: "Custom", period: "" };
    }
    return {
      amount: `$${(plan.price_monthly / 100).toFixed(0)}`,
      period: plan.price_monthly === 0 ? "forever" : "per user/month",
    };
  };

  const price = formatPrice();

  return (
    <Card
      className={cn(
        "relative",
        isPopular && "border-accent shadow-lg",
        isCurrentPlan && "bg-muted/30"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-accent text-accent-foreground">
            <Sparkles className="w-3 h-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      <CardHeader className="pt-8">
        <CardTitle className="flex items-center gap-2">
          {getIcon()}
          {plan.plan_name}
          {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
        </CardTitle>
        <CardDescription>
          {plan.plan_id === "free" && "For individuals getting started"}
          {plan.plan_id === "pro" && "For growing teams"}
          {plan.plan_id === "enterprise" && "For large organizations"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          {price.amount === "Custom" ? (
            <p className="text-3xl font-bold text-foreground">Custom</p>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{price.amount}</span>
              {price.period && <span className="text-muted-foreground">/{price.period}</span>}
            </div>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {isCurrentPlan ? (
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        ) : (
          <Button
            className={cn("w-full", isPopular && "bg-accent hover:bg-accent/90")}
            onClick={() => onUpgrade(plan)}
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {plan.price_monthly === -1 ? "Contact Sales" : "Upgrade"}
            {!isUpgrading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface PlanCardsProps {
  plans: PlanLimit[] | undefined;
  currentPlanId: string;
  isLoading: boolean;
  isUpgrading: boolean;
  onUpgrade: (plan: PlanLimit) => void;
}

export function PlanCards({ plans, currentPlanId, isLoading, isUpgrading, onUpgrade }: PlanCardsProps) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pt-8">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-20 mb-6" />
              <div className="space-y-3 mb-6">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Unable to load plans
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrentPlan={plan.plan_id === currentPlanId}
          isPopular={plan.plan_id === "pro"}
          isUpgrading={isUpgrading}
          onUpgrade={onUpgrade}
        />
      ))}
    </div>
  );
}
