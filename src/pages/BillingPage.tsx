import { useState } from "react";
import { 
  CreditCard, 
  Check, 
  Sparkles,
  Zap,
  Building2,
  ArrowRight,
  Receipt,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "For individuals getting started",
    features: [
      "1 workspace",
      "2 projects",
      "100 artifacts",
      "Basic graph view",
      "Community support",
    ],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    period: "per user/month",
    description: "For growing teams",
    features: [
      "Unlimited workspaces",
      "Unlimited projects",
      "Unlimited artifacts",
      "Advanced graph analytics",
      "Jira & GitHub integrations",
      "AI story generation",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: -1,
    period: "custom",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "Advanced security",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantees",
      "On-premise option",
    ],
  },
];

const BillingPage = () => {
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (plan: Plan) => {
    if (plan.id === "enterprise") {
      toast({
        title: "Contact Sales",
        description: "Please contact our sales team for enterprise pricing.",
      });
      return;
    }

    setIsUpgrading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUpgrading(false);
    
    toast({
      title: "Upgrade initiated",
      description: "You'll be redirected to complete your purchase.",
    });
  };

  // Mock usage data
  const usage = {
    artifacts: { used: 45, limit: 100 },
    projects: { used: 1, limit: 2 },
    aiRuns: { used: 8, limit: 10 },
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Billing</h1>
            <p className="text-muted-foreground">
              Manage your subscription and billing
            </p>
          </div>

          {/* Current Plan */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>You're currently on the Free plan</CardDescription>
                </div>
                <Badge className="bg-accent/10 text-accent border-accent/30">
                  Free
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Artifacts</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold text-foreground">{usage.artifacts.used}</span>
                    <span className="text-sm text-muted-foreground">/ {usage.artifacts.limit}</span>
                  </div>
                  <Progress 
                    value={(usage.artifacts.used / usage.artifacts.limit) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Projects</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold text-foreground">{usage.projects.used}</span>
                    <span className="text-sm text-muted-foreground">/ {usage.projects.limit}</span>
                  </div>
                  <Progress 
                    value={(usage.projects.used / usage.projects.limit) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">AI Runs (this month)</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold text-foreground">{usage.aiRuns.used}</span>
                    <span className="text-sm text-muted-foreground">/ {usage.aiRuns.limit}</span>
                  </div>
                  <Progress 
                    value={(usage.aiRuns.used / usage.aiRuns.limit) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plans */}
          <h2 className="text-xl font-semibold text-foreground mb-4">Available Plans</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map(plan => (
              <Card 
                key={plan.id}
                className={cn(
                  "relative",
                  plan.popular && "border-accent shadow-lg",
                  plan.current && "bg-muted/30"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pt-8">
                  <CardTitle className="flex items-center gap-2">
                    {plan.id === "free" && <Zap className="w-5 h-5" />}
                    {plan.id === "pro" && <Sparkles className="w-5 h-5 text-accent" />}
                    {plan.id === "enterprise" && <Building2 className="w-5 h-5" />}
                    {plan.name}
                    {plan.current && <Badge variant="secondary">Current</Badge>}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    {plan.price === -1 ? (
                      <p className="text-3xl font-bold text-foreground">Custom</p>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-muted-foreground">/{plan.period}</span>
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.current ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className={cn(
                        "w-full",
                        plan.popular && "bg-accent hover:bg-accent/90"
                      )}
                      onClick={() => handleUpgrade(plan)}
                      disabled={isUpgrading}
                    >
                      {plan.price === -1 ? "Contact Sales" : "Upgrade"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>Your past invoices and receipts</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Receipt className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No billing history yet</p>
                <p className="text-sm">Invoices will appear here after your first payment</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default BillingPage;
