import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Shield,
  Eye,
  RefreshCw,
  BarChart3,
  Users,
  PlayCircle,
  ChevronRight,
  Sparkles,
  Network,
  AlertTriangle,
  TrendingUp
} from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">OneTrace AI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#integrations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Integrations</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 mesh-gradient">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Built for AI-first startups & solo builders
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6 animate-slide-up">
              Ship AI-built software with{" "}
              <span className="text-gradient-brand">confidence</span>
              —not crossed fingers.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up delay-100">
              OneTrace connects your <strong>PRDs → Stories → Jira → Git → Tests</strong> into one{" "}
              <strong>traceable Artifact Graph</strong>, so every feature has an owner, every commit has intent, 
              and every release has proof.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-slide-up delay-200">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg group">
                <PlayCircle className="mr-2 w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in delay-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Start free
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Connect Jira + Git in minutes
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Works with your AI tools
              </span>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 max-w-5xl mx-auto animate-float">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
              <div className="absolute top-0 left-0 right-0 h-10 bg-muted flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="pt-10 p-6">
                <HeroGraphPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="py-12 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <p className="text-muted-foreground">
              Works with <strong className="text-foreground">Jira</strong>, <strong className="text-foreground">GitHub</strong>, 
              and your favorite AI coding workflows.
            </p>
            <div className="h-px w-px md:w-px md:h-8 bg-border" />
            <p className="text-muted-foreground">
              Keeps humans and AI agents aligned with a single source of truth.
            </p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Your build flow is fast.<br />
              <span className="text-drift">Your traceability is broken.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              You ideate in ChatGPT. You generate a PRD. You paste prompts into Lovable/Cursor/Replit. 
              Code appears — but now:
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: AlertTriangle, title: "No clear mapping", desc: "From requirements → modules → commits" },
              { icon: Eye, title: "No objective coverage", desc: "Against Acceptance Criteria" },
              { icon: RefreshCw, title: "No safe regeneration", desc: "When requirements change" },
              { icon: Users, title: "No shared workspace", desc: "Where humans and AI agents collaborate" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-card border border-border/50 text-center">
                <div className="w-12 h-12 rounded-full bg-drift/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-drift" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-lg text-muted-foreground mt-12">
            So <strong className="text-foreground">"Done" becomes a vibe</strong>. Bugs ship. Rework grows.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              The Solution
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              OneTrace AI is your AI-native system of record.
            </h2>
            <p className="text-lg text-muted-foreground">
              OneTrace builds a <strong>living map</strong> of your product — connecting every artifact, 
              tracking every relationship, and versioning every change.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="feature-card">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Artifacts</h3>
              <p className="text-muted-foreground">
                PRDs, Epics, Stories, ACs, Tests, Commits, PRs — all in one place with full version history.
              </p>
            </div>

            <div className="feature-card">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-6">
                <GitBranch className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Edges</h3>
              <p className="text-muted-foreground">
                Implements, Validates, Satisfies, Depends-on — every relationship is explicit and traceable.
              </p>
            </div>

            <div className="feature-card">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mb-6">
                <RefreshCw className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Versions</h3>
              <p className="text-muted-foreground">
                Every change is tracked, explainable, and reversible. See who changed what and why.
              </p>
            </div>
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-card border border-success/30 max-w-3xl mx-auto text-center">
            <p className="text-lg text-foreground">
              <strong className="text-success">Result:</strong> You always know what's built, what's missing, 
              and what will break if you change it.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Three steps to traceable software
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Connect your tools",
                desc: "Link Jira and Git in minutes. OneTrace syncs work items, code changes, and context automatically.",
                icon: Network,
              },
              {
                step: "2", 
                title: "Generate traceable work",
                desc: "Turn PRDs into Epics/Stories/ACs — and push into Jira with full trace metadata.",
                icon: Sparkles,
              },
              {
                step: "3",
                title: "Prove coverage & catch drift",
                desc: "Auto-link commits and PRs. See AC coverage in real-time. Get alerted when code or requirements drift.",
                icon: BarChart3,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-bold text-muted/50 absolute -top-4 -left-2">{item.step}</div>
                <div className="relative pt-12 pl-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage & Drift Section */}
      <section className="py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium mb-6">
                <BarChart3 className="w-4 h-4" />
                Coverage Engine
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Know exactly what's done — and what's not.
              </h2>
              <ul className="space-y-4">
                {[
                  "Real-time coverage ratio for every Story, Epic, and PRD",
                  "See which Acceptance Criteria are satisfied vs. missing",
                  "Evidence-based linkage with confidence scoring",
                  "Rollup coverage to parent artifacts automatically",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <CoveragePreview />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto mt-24">
            <div className="order-2 lg:order-1">
              <DriftPreview />
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-drift/10 text-drift text-sm font-medium mb-6">
                <AlertTriangle className="w-4 h-4" />
                Drift Detection
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Catch problems before they ship.
              </h2>
              <ul className="space-y-4">
                {[
                  "Commits without linked requirements",
                  "Requirements marked done with no code",
                  "Tests without acceptance criteria",
                  "Jira status mismatches",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-drift mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Connects to your existing workflow
            </h2>
            <p className="text-lg text-muted-foreground">
              OneTrace doesn't replace your tools — it connects them.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Jira Cloud", desc: "Two-way sync with full field mapping", color: "bg-blue-500" },
              { name: "GitHub", desc: "Commits, PRs, and webhooks", color: "bg-slate-800" },
              { name: "OpenAI", desc: "GPT-4 for intelligent agents", color: "bg-green-500" },
              { name: "Anthropic", desc: "Claude for reasoning tasks", color: "bg-amber-500" },
            ].map((item, i) => (
              <div key={i} className="integration-card">
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{item.name[0]}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Start free. Scale when you're ready.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                desc: "For solo builders getting started",
                features: ["1 project", "2 users", "100 artifacts", "Basic integrations", "Community support"],
                cta: "Get Started",
                popular: false,
              },
              {
                name: "Builder",
                price: "$29",
                desc: "For growing teams",
                features: ["5 projects", "10 users", "Unlimited artifacts", "Full integrations", "AI agents", "Priority support"],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Scale",
                price: "$99",
                desc: "For larger teams",
                features: ["Unlimited projects", "Unlimited users", "Custom model hub", "Advanced analytics", "SSO/SAML", "Dedicated support"],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan, i) => (
              <div 
                key={i} 
                className={`relative rounded-2xl p-8 bg-card ${
                  plan.popular 
                    ? "border-2 border-accent shadow-xl ring-1 ring-accent/20" 
                    : "border border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${plan.popular ? "bg-accent hover:bg-accent/90" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 hero-gradient text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to ship with confidence?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join AI-first teams building traceable software. Start free, connect your tools in minutes.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">OneTrace AI</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-primary-foreground/70">
              <a href="#" className="hover:text-primary-foreground transition-colors">Docs</a>
              <a href="#" className="hover:text-primary-foreground transition-colors">Blog</a>
              <a href="#" className="hover:text-primary-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary-foreground transition-colors">Terms</a>
            </div>
            <p className="text-sm text-primary-foreground/70">
              © 2024 OneTrace AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Hero Graph Preview Component
const HeroGraphPreview = () => (
  <div className="relative h-[400px] w-full bg-graph-bg rounded-xl overflow-hidden">
    {/* Grid background */}
    <div 
      className="absolute inset-0" 
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--graph-grid)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--graph-grid)) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}
    />
    
    {/* Nodes */}
    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 p-4 bg-card border-2 border-purple-500/50 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-4 h-4 text-purple-500" />
        <span className="text-xs font-medium text-purple-500">PRD</span>
      </div>
      <p className="text-sm font-medium text-foreground">User Authentication</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 bg-success/20 rounded-full overflow-hidden">
          <div className="h-full w-[85%] bg-success rounded-full" />
        </div>
        <span className="text-xs text-success font-medium">85%</span>
      </div>
    </div>

    <div className="absolute top-44 left-24 w-40 p-3 bg-card border-2 border-blue-500/50 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-blue-500">EPIC-001</span>
      </div>
      <p className="text-sm font-medium text-foreground">OAuth Flow</p>
      <span className="text-xs text-muted-foreground">4 stories</span>
    </div>

    <div className="absolute top-44 right-24 w-40 p-3 bg-card border-2 border-blue-500/50 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-blue-500">EPIC-002</span>
      </div>
      <p className="text-sm font-medium text-foreground">Session Mgmt</p>
      <span className="text-xs text-muted-foreground">3 stories</span>
    </div>

    <div className="absolute bottom-16 left-16 w-36 p-3 bg-card border-2 border-accent/50 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-accent">STORY-001</span>
      </div>
      <p className="text-sm font-medium text-foreground truncate">Google OAuth</p>
      <div className="flex items-center gap-1 mt-1">
        <CheckCircle2 className="w-3 h-3 text-success" />
        <span className="text-xs text-success">Done</span>
      </div>
    </div>

    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-36 p-3 bg-card border-2 border-accent/50 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-accent">STORY-002</span>
      </div>
      <p className="text-sm font-medium text-foreground truncate">GitHub OAuth</p>
      <div className="flex items-center gap-1 mt-1">
        <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs text-amber-500">In Progress</span>
      </div>
    </div>

    <div className="absolute bottom-16 right-16 w-36 p-3 bg-card border-2 border-slate-400/50 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="w-3 h-3 text-slate-500" />
        <span className="text-xs font-medium text-slate-500">abc123</span>
      </div>
      <p className="text-xs text-foreground truncate">feat: add OAuth redirect</p>
      <span className="text-xs text-muted-foreground">2h ago</span>
    </div>

    {/* Connection lines (SVG) */}
    <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--graph-edge))" />
        </marker>
      </defs>
      {/* PRD to Epics */}
      <line x1="50%" y1="110" x2="30%" y2="170" stroke="hsl(var(--graph-edge))" strokeWidth="2" markerEnd="url(#arrowhead)" />
      <line x1="50%" y1="110" x2="70%" y2="170" stroke="hsl(var(--graph-edge))" strokeWidth="2" markerEnd="url(#arrowhead)" />
      {/* Epic to Stories */}
      <line x1="25%" y1="230" x2="15%" y2="300" stroke="hsl(var(--graph-edge))" strokeWidth="2" markerEnd="url(#arrowhead)" />
      <line x1="25%" y1="230" x2="50%" y2="300" stroke="hsl(var(--graph-edge))" strokeWidth="2" markerEnd="url(#arrowhead)" />
      {/* Story to Commit */}
      <line x1="55%" y1="330" x2="80%" y2="320" stroke="hsl(var(--trace-implements))" strokeWidth="2" strokeDasharray="5,5" className="trace-line" />
    </svg>
  </div>
);

// Coverage Preview Component
const CoveragePreview = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-semibold text-foreground">Coverage Overview</h3>
      <span className="text-sm text-muted-foreground">Updated 2m ago</span>
    </div>
    
    <div className="space-y-4">
      {[
        { name: "User Authentication", coverage: 85, total: 12, satisfied: 10 },
        { name: "Payment Integration", coverage: 60, total: 8, satisfied: 5 },
        { name: "Dashboard Views", coverage: 100, total: 6, satisfied: 6 },
        { name: "API Layer", coverage: 45, total: 15, satisfied: 7 },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.satisfied}/{item.total} ACs</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  item.coverage === 100 
                    ? 'bg-coverage-full' 
                    : item.coverage >= 70 
                      ? 'bg-coverage-partial' 
                      : 'bg-coverage-none'
                }`}
                style={{ width: `${item.coverage}%` }}
              />
            </div>
          </div>
          <span className={`text-sm font-medium ${
            item.coverage === 100 
              ? 'text-coverage-full' 
              : item.coverage >= 70 
                ? 'text-coverage-partial' 
                : 'text-coverage-none'
          }`}>
            {item.coverage}%
          </span>
        </div>
      ))}
    </div>

    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Overall Coverage</p>
          <p className="text-2xl font-bold text-foreground">72%</p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" />
          <span className="text-sm text-success">+8% this week</span>
        </div>
      </div>
    </div>
  </div>
);

// Drift Preview Component
const DriftPreview = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-semibold text-foreground">Drift Findings</h3>
      <span className="px-2 py-1 rounded-full bg-drift/10 text-drift text-xs font-medium">3 open</span>
    </div>
    
    <div className="space-y-3">
      {[
        { type: "Untraced commit", desc: "abc123 has no linked requirement", severity: "high" },
        { type: "Missing tests", desc: "STORY-004 has 0/3 ACs tested", severity: "medium" },
        { type: "Status mismatch", desc: "STORY-002 is Done but Jira shows In Review", severity: "low" },
      ].map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            item.severity === 'high' ? 'bg-red-500' : 
            item.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
          }`} />
          <div>
            <p className="text-sm font-medium text-foreground">{item.type}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>

    <Button variant="outline" className="w-full mt-4" size="sm">
      View All Findings
      <ChevronRight className="ml-2 w-4 h-4" />
    </Button>
  </div>
);

export default LandingPage;
