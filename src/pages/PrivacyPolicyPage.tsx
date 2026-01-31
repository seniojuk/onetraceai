import { Link } from "react-router-dom";
import { Network, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicyPage = () => {
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
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 31, 2026</p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                OneTrace AI, Inc. ("OneTrace AI," "we," "us," or "our") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
                use our software-as-a-service platform and related services (collectively, the "Service").
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                By accessing or using the Service, you agree to this Privacy Policy. If you do not agree with the 
                terms of this Privacy Policy, please do not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Account Information:</strong> Name, email address, company name, and password when you create an account.</li>
                <li><strong>Payment Information:</strong> Billing address and payment details processed through our secure payment provider.</li>
                <li><strong>Workspace Data:</strong> Project requirements documents (PRDs), user stories, epics, and other artifacts you create within the Service.</li>
                <li><strong>Integration Data:</strong> Data synchronized from third-party services like Jira and GitHub that you connect to OneTrace AI.</li>
                <li><strong>Communications:</strong> Information you provide when contacting our support team.</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Usage Data:</strong> Information about how you interact with the Service, including features used and time spent.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
                <li><strong>Log Data:</strong> IP addresses, access times, and pages viewed.</li>
                <li><strong>Cookies:</strong> We use cookies and similar technologies to enhance your experience and analyze usage patterns.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative information, updates, and security alerts</li>
                <li>Respond to your comments, questions, and support requests</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Power AI features that enhance your workflow (with your explicit consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li><strong>Service Providers:</strong> With trusted third parties who assist us in operating the Service (e.g., hosting, analytics, payment processing).</li>
                <li><strong>Integrations:</strong> With third-party services you choose to connect (e.g., Jira, GitHub) to enable synchronization features.</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights, safety, or property.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
                <li><strong>With Your Consent:</strong> For any other purpose with your explicit consent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256)</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure data centers with physical security measures</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. GDPR Compliance (For EU Users)</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you are located in the European Economic Area (EEA), you have certain rights under the General Data 
                Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li><strong>Right of Access:</strong> Request a copy of your personal data.</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate data.</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
                <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing.</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests.</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at <a href="mailto:privacy@onetraceai.com" className="text-accent hover:underline">privacy@onetraceai.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide the Service. 
                Upon account deletion, we will delete or anonymize your data within 30 days, except where retention is 
                required by law or for legitimate business purposes (e.g., audit trails, legal compliance).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service may contain links to third-party websites or integrate with third-party services. We are not 
                responsible for the privacy practices of these third parties. We encourage you to review their privacy 
                policies before providing any personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is not intended for individuals under 16 years of age. We do not knowingly collect personal 
                information from children. If we become aware that we have collected personal information from a child 
                without parental consent, we will take steps to delete that information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
                the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the Service 
                after any changes indicates your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground font-medium">OneTrace AI, Inc.</p>
                <p className="text-muted-foreground">Email: <a href="mailto:privacy@onetraceai.com" className="text-accent hover:underline">privacy@onetraceai.com</a></p>
              </div>
            </section>
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

export default PrivacyPolicyPage;
