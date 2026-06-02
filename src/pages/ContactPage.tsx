import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, MessageSquare, Clock, CheckCircle2, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { AccentWord } from "@/components/marketing/AccentWord";

/* ===================== Nav ===================== */

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-[11px] font-medium text-accent-foreground">
            OT
          </span>
          <span className="font-geist text-[15px] font-medium tracking-[-0.01em] text-foreground">
            OneTrace <span className="text-muted-foreground">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link to="/#problem" className="text-[13px] text-muted-foreground hover:text-foreground">
            Problem
          </Link>
          <Link to="/#solution" className="text-[13px] text-muted-foreground hover:text-foreground">
            Solution
          </Link>
          <Link to="/#how" className="text-[13px] text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <Link to="/pricing" className="text-[13px] text-muted-foreground hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/auth?mode=login"
            className="hidden text-[13px] text-muted-foreground hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="btn-3d btn-3d-primary inline-flex h-8 items-center gap-1 px-3 text-[12.5px] font-medium"
          >
            Start free <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-8 flex flex-col gap-4">
                <Link to="/#problem">Problem</Link>
                <Link to="/#solution">Solution</Link>
                <Link to="/#how">How it works</Link>
                <Link to="/pricing">Pricing</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/* ===================== Atoms ===================== */

const CHANNELS = [
  {
    icon: Mail,
    eyebrow: "General",
    title: "Support",
    body: "Product questions, account help, anything else.",
    email: "support@onetrace.ai",
  },
  {
    icon: MessageSquare,
    eyebrow: "Sales",
    title: "Enterprise & Growth",
    body: "Custom plans, security review, procurement.",
    email: "sales@onetrace.ai",
  },
];

function ChannelRow({
  icon: Icon,
  eyebrow,
  title,
  body,
  email,
}: {
  icon: typeof Mail;
  eyebrow: string;
  title: string;
  body: string;
  email: string;
}) {
  return (
    <a
      href={`mailto:${email}`}
      className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/15"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
          <div className="mt-1 font-geist text-[15px] font-medium tracking-[-0.01em] text-foreground">
            {title}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
          <div className="mt-3 inline-flex max-w-full items-center gap-1 break-all text-[12.5px] font-medium text-accent group-hover:underline">
            {email} <ArrowUpRight className="h-3 w-3 shrink-0" />
          </div>
        </div>
      </div>
    </a>
  );
}

/* ===================== Page ===================== */

const ContactPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast({
      title: "Message sent",
      description: "We'll get back to you within 24 hours.",
    });
  };

  const handleChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const isValid =
    formData.name && formData.email && formData.category && formData.subject && formData.message;

  return (
    <div className="min-h-screen bg-background text-foreground font-geist antialiased selection:bg-accent/20">
      <Nav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Get in touch
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl font-geist text-[36px] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[48px] md:text-[60px]">
          Talk to a <AccentWord>human.</AccentWord>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-[14.5px]">
          Questions about a plan, a security review, or a custom integration — we read every
          message and reply within 24 hours.
        </p>
      </section>

      {/* Body: left rail + form */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-8">
          {/* Left rail */}
          <aside className="space-y-4">
            {CHANNELS.map((c) => (
              <ChannelRow key={c.email} {...c} />
            ))}

            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Response time
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">
                We reply within <span className="font-medium text-foreground">24 hours</span> on
                business days (Mon–Fri, 9am–6pm EST).
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Priority support</span> ships with
                Growth and Enterprise plans.
              </p>
            </div>
          </aside>

          {/* Form */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 md:p-9">
            {isSubmitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10">
                  <CheckCircle2 className="h-7 w-7 text-accent" />
                </div>
                <h2 className="mt-5 font-geist text-[28px] leading-tight tracking-[-0.02em] text-foreground">
                  Message <AccentWord>received.</AccentWord>
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
                  Our team will review your request and get back to you within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: "", email: "", subject: "", category: "", message: "" });
                  }}
                  className="btn-3d btn-3d-secondary mt-6 inline-flex h-9 items-center px-4 text-[13px] font-medium"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Send a message
                  </div>
                  <h2 className="mt-1 font-geist text-[22px] font-medium tracking-[-0.01em] text-foreground">
                    Tell us what you need.
                  </h2>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[12.5px] font-medium">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Jane Engineer"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[12.5px] font-medium">
                      Work email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@company.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-[12.5px] font-medium">
                      Topic
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleChange("category", value)}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Pick one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales / Enterprise</SelectItem>
                        <SelectItem value="general">General inquiry</SelectItem>
                        <SelectItem value="technical">Technical support</SelectItem>
                        <SelectItem value="billing">Billing & account</SelectItem>
                        <SelectItem value="integration">Integrations</SelectItem>
                        <SelectItem value="feature">Feature request</SelectItem>
                        <SelectItem value="bug">Bug report</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-[12.5px] font-medium">
                      Subject
                    </Label>
                    <Input
                      id="subject"
                      placeholder="Brief summary"
                      value={formData.subject}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[12.5px] font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your team, what you're trying to do, and any relevant context."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col items-start gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11.5px] text-muted-foreground">
                    By submitting, you agree to our{" "}
                    <Link to="/privacy" className="text-accent hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="btn-3d btn-3d-primary inline-flex h-10 items-center gap-1.5 px-5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending…" : "Send message"}
                    {!isSubmitting && <ArrowUpRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
};

export default ContactPage;
