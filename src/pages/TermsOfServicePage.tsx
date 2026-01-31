import { Link } from "react-router-dom";
import { Network, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsOfServicePage = () => {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 31, 2026</p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to OneTrace AI. These Terms of Service ("Terms") constitute a legally binding agreement between 
                you ("User," "you," or "your") and OneTrace AI, Inc. ("OneTrace AI," "we," "us," or "our") governing 
                your access to and use of the OneTrace AI platform, including any associated websites, applications, 
                APIs, and services (collectively, the "Service").
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                By creating an account, accessing, or using the Service, you agree to be bound by these Terms. If you 
                do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                OneTrace AI is an AI-native requirements traceability platform designed for modern software development teams. 
                The Service provides:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>Artifact management for PRDs, epics, stories, acceptance criteria, and test cases</li>
                <li>Traceability graph visualization connecting requirements to implementation</li>
                <li>Coverage analysis and drift detection capabilities</li>
                <li>AI-powered generation and enhancement of software artifacts</li>
                <li>Integration with third-party tools including Jira and GitHub</li>
                <li>Workspace and team collaboration features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Account Registration</h2>
              <p className="text-muted-foreground leading-relaxed">
                To access the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access or security breach</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You must be at least 16 years old to use the Service. If you are using the Service on behalf of an 
                organization, you represent that you have authority to bind that organization to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Subscription and Payment</h2>
              
              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.1 Plans and Pricing</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service is offered under various subscription plans, including free and paid tiers. Current pricing 
                and plan details are available on our website. We reserve the right to modify pricing with 30 days' 
                notice to existing subscribers.
              </p>

              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.2 Billing</h3>
              <p className="text-muted-foreground leading-relaxed">
                Paid subscriptions are billed in advance on a monthly or annual basis. By subscribing to a paid plan, 
                you authorize us to charge your payment method on a recurring basis until you cancel. All fees are 
                non-refundable except as expressly stated in these Terms.
              </p>

              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.3 Cancellation</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may cancel your subscription at any time through your account settings. Cancellation takes effect 
                at the end of the current billing period. You will retain access to paid features until the end of 
                your billing period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. User Content and Data</h2>
              
              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5.1 Your Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                You retain all ownership rights to the content you create, upload, or store using the Service ("User Content"). 
                By using the Service, you grant us a limited license to host, store, display, and process your User Content 
                solely to provide the Service to you.
              </p>

              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5.2 Acceptable Use</h3>
              <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>Upload content that infringes intellectual property rights</li>
                <li>Use the Service for illegal purposes or to violate applicable laws</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                <li>Interfere with or disrupt the Service's infrastructure</li>
                <li>Use automated means to access the Service without authorization</li>
                <li>Resell or redistribute the Service without our written consent</li>
                <li>Use the Service to develop competing products</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. AI Features</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service includes AI-powered features for artifact generation and enhancement. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>AI-generated content is provided "as is" and should be reviewed before use</li>
                <li>We do not guarantee the accuracy, completeness, or suitability of AI outputs</li>
                <li>You are responsible for reviewing and validating all AI-generated content</li>
                <li>AI features may use your inputs to generate outputs but do not train our models on your proprietary data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Third-Party Integrations</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service may integrate with third-party services (e.g., Jira, GitHub). Your use of these integrations 
                is subject to the respective third-party terms and privacy policies. We are not responsible for third-party 
                services and make no warranties regarding their availability, accuracy, or performance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service, including its design, features, documentation, and underlying technology, is owned by 
                OneTrace AI and protected by intellectual property laws. These Terms do not grant you any right to 
                use our trademarks, logos, or brand features without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, 
                INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
                AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ONETRACE AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING 
                OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID 
                BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify, defend, and hold harmless OneTrace AI and its officers, directors, employees, 
                and agents from any claims, liabilities, damages, losses, or expenses arising from your use of the 
                Service, your User Content, or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your access to the Service at any time for violation of these Terms or 
                for any other reason at our sole discretion. Upon termination, your right to use the Service ceases 
                immediately. You may export your data before termination; otherwise, we will delete your data in 
                accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify these Terms at any time. We will notify you of material changes via email or through 
                the Service. Your continued use of the Service after changes take effect constitutes acceptance of 
                the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">14. Governing Law and Disputes</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law 
                principles. Any disputes arising from these Terms shall be resolved through binding arbitration in 
                accordance with the rules of the American Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">15. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground font-medium">OneTrace AI, Inc.</p>
                <p className="text-muted-foreground">Email: <a href="mailto:legal@onetraceai.com" className="text-accent hover:underline">legal@onetraceai.com</a></p>
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

export default TermsOfServicePage;
