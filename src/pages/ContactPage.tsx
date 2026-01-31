import { useState } from "react";
import { Link } from "react-router-dom";
import { Network, ArrowLeft, Mail, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">OneTrace AI</span>
            </Link>
            
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Customer Support</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions or need help? Our team is here to assist you. Reach out and we'll respond as quickly as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Email Support</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  For general inquiries and support requests
                </p>
                <a 
                  href="mailto:support@onetraceai.com" 
                  className="text-accent hover:underline font-medium"
                >
                  support@onetraceai.com
                </a>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Sales Inquiries</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  For enterprise plans and custom solutions
                </p>
                <a 
                  href="mailto:sales@onetraceai.com" 
                  className="text-accent hover:underline font-medium"
                >
                  sales@onetraceai.com
                </a>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Response Time</h3>
                <p className="text-muted-foreground text-sm">
                  We typically respond within <strong className="text-foreground">24 hours</strong> during business days (Monday–Friday, 9am–6pm EST).
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Priority Support</strong> is available for Business and Enterprise plan subscribers with faster response times.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="p-8 rounded-xl bg-card border border-border/50">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground mb-4">Thank You!</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Your message has been received. Our support team will review your request and get back to you within 24 hours.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData({ name: "", email: "", subject: "", category: "", message: "" });
                      }}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Send us a Message</h2>
                    
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="technical">Technical Support</SelectItem>
                            <SelectItem value="billing">Billing & Account</SelectItem>
                            <SelectItem value="integration">Integrations</SelectItem>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="bug">Bug Report</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          placeholder="Brief description of your inquiry"
                          value={formData.subject}
                          onChange={(e) => handleChange("subject", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Please describe your question or issue in detail. Include any relevant information that might help us assist you better."
                        rows={6}
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        required
                      />
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full sm:w-auto px-8"
                        disabled={isSubmitting || !formData.name || !formData.email || !formData.category || !formData.subject || !formData.message}
                      >
                        {isSubmitting ? "Sending..." : "Send Message"}
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      By submitting this form, you agree to our{" "}
                      <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-semibold text-foreground text-center mb-8">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  q: "How do I reset my password?",
                  a: "Click 'Forgot Password' on the login page and follow the instructions sent to your email.",
                },
                {
                  q: "Can I upgrade or downgrade my plan?",
                  a: "Yes, you can change your plan anytime from the Billing section in your account settings.",
                },
                {
                  q: "How do I connect Jira to OneTrace AI?",
                  a: "Navigate to Integrations in your dashboard and follow the Jira setup wizard to authorize the connection.",
                },
                {
                  q: "Is my data secure?",
                  a: "Yes, we use industry-standard encryption (TLS 1.3, AES-256) and follow security best practices. See our Privacy Policy for details.",
                },
              ].map((faq, i) => (
                <div key={i} className="p-6 rounded-xl bg-card border border-border/50">
                  <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 OneTrace AI, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
