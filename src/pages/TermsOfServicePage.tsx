import {
  LegalLayout,
  LegalSection,
  LegalSubheading,
  LegalList,
  LegalCallout,
} from "@/components/marketing/LegalLayout";

const SECTIONS = [
  { id: "acceptance", label: "Acceptance of terms" },
  { id: "service", label: "Description of service" },
  { id: "account", label: "Account registration" },
  { id: "billing", label: "Subscription & payment" },
  { id: "content", label: "User content & data" },
  { id: "ai", label: "AI features" },
  { id: "thirdparty", label: "Third-party integrations" },
  { id: "ip", label: "Intellectual property" },
  { id: "warranty", label: "Disclaimer of warranties" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "termination", label: "Termination" },
  { id: "changes", label: "Changes to terms" },
  { id: "law", label: "Governing law" },
  { id: "contact", label: "Contact information" },
];

const TermsOfServicePage = () => {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of"
      flourish="service."
      updated="January 31, 2026"
      sections={SECTIONS}
    >
      <LegalSection id="acceptance" index={1} title="Acceptance of terms">
        <p>
          Welcome to OneTrace AI. These Terms of Service ("Terms") constitute a legally binding
          agreement between you ("User," "you," or "your") and OneTrace AI, Inc. ("OneTrace AI,"
          "we," "us," or "our") governing your access to and use of the OneTrace AI platform —
          including any associated websites, applications, APIs, and services (the "Service").
        </p>
        <p>
          By creating an account, accessing, or using the Service, you agree to be bound by these
          Terms. If you do not agree, you may not access or use the Service.
        </p>
      </LegalSection>

      <LegalSection id="service" index={2} title="Description of service">
        <p>
          OneTrace AI is an AI-native requirements traceability platform designed for modern
          software development teams. The Service provides:
        </p>
        <LegalList
          items={[
            "Artifact management for PRDs, epics, stories, acceptance criteria, and test cases",
            "Traceability graph visualization connecting requirements to implementation",
            "Coverage analysis and drift detection capabilities",
            "AI-powered generation and enhancement of software artifacts",
            "Integration with third-party tools including Jira and GitHub",
            "Workspace and team collaboration features",
          ]}
        />
      </LegalSection>

      <LegalSection id="account" index={3} title="Account registration">
        <p>To access the Service, you must create an account. You agree to:</p>
        <LegalList
          items={[
            "Provide accurate, current, and complete information during registration",
            "Maintain and promptly update your account information",
            "Keep your password secure and confidential",
            "Accept responsibility for all activities under your account",
            "Notify us immediately of any unauthorized access or security breach",
          ]}
        />
        <p>
          You must be at least 16 years old to use the Service. If you are using the Service on
          behalf of an organization, you represent that you have authority to bind that
          organization to these Terms.
        </p>
      </LegalSection>

      <LegalSection id="billing" index={4} title="Subscription and payment">
        <LegalSubheading>4.1 Plans and pricing</LegalSubheading>
        <p>
          The Service is offered under various subscription plans, including free and paid tiers.
          Current pricing is available on our website. We reserve the right to modify pricing with
          30 days' notice to existing subscribers.
        </p>
        <LegalSubheading>4.2 Billing</LegalSubheading>
        <p>
          Paid subscriptions are billed in advance on a monthly or annual basis. By subscribing,
          you authorize us to charge your payment method on a recurring basis until you cancel.
          All fees are non-refundable except as expressly stated in these Terms.
        </p>
        <LegalSubheading>4.3 Cancellation</LegalSubheading>
        <p>
          You may cancel your subscription at any time through your account settings.
          Cancellation takes effect at the end of the current billing period. You retain access
          to paid features until then.
        </p>
      </LegalSection>

      <LegalSection id="content" index={5} title="User content and data">
        <LegalSubheading>5.1 Your content</LegalSubheading>
        <p>
          You retain all ownership rights to the content you create, upload, or store using the
          Service ("User Content"). By using the Service, you grant us a limited license to host,
          store, display, and process your User Content solely to provide the Service to you.
        </p>
        <LegalSubheading>5.2 Acceptable use</LegalSubheading>
        <p>You agree not to:</p>
        <LegalList
          items={[
            "Upload content that infringes intellectual property rights",
            "Use the Service for illegal purposes or to violate applicable laws",
            "Attempt to gain unauthorized access to the Service or other users' accounts",
            "Interfere with or disrupt the Service's infrastructure",
            "Use automated means to access the Service without authorization",
            "Resell or redistribute the Service without our written consent",
            "Use the Service to develop competing products",
          ]}
        />
      </LegalSection>

      <LegalSection id="ai" index={6} title="AI features">
        <p>The Service includes AI-powered features for artifact generation and enhancement. You acknowledge that:</p>
        <LegalList
          items={[
            "AI-generated content is provided 'as is' and should be reviewed before use",
            "We do not guarantee the accuracy, completeness, or suitability of AI outputs",
            "You are responsible for reviewing and validating all AI-generated content",
            "AI features may use your inputs to generate outputs but do not train our models on your proprietary data",
          ]}
        />
      </LegalSection>

      <LegalSection id="thirdparty" index={7} title="Third-party integrations">
        <p>
          The Service may integrate with third-party services (e.g., Jira, GitHub). Your use of
          these integrations is subject to the respective third-party terms and privacy policies.
          We are not responsible for third-party services and make no warranties regarding their
          availability, accuracy, or performance.
        </p>
      </LegalSection>

      <LegalSection id="ip" index={8} title="Intellectual property">
        <p>
          The Service, including its design, features, documentation, and underlying technology,
          is owned by OneTrace AI and protected by intellectual property laws. These Terms do not
          grant you any right to use our trademarks, logos, or brand features without our prior
          written consent.
        </p>
      </LegalSection>

      <LegalSection id="warranty" index={9} title="Disclaimer of warranties">
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-foreground/80">
          The Service is provided "as is" and "as available" without warranties of any kind,
          express or implied, including but not limited to implied warranties of merchantability,
          fitness for a particular purpose, and non-infringement. We do not warrant that the
          Service will be uninterrupted, error-free, or secure.
        </p>
      </LegalSection>

      <LegalSection id="liability" index={10} title="Limitation of liability">
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-foreground/80">
          To the maximum extent permitted by law, OneTrace AI shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, including loss of
          profits, data, or goodwill, arising out of or related to your use of the Service. Our
          total liability shall not exceed the amount paid by you to us in the twelve (12) months
          preceding the claim.
        </p>
      </LegalSection>

      <LegalSection id="indemnification" index={11} title="Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless OneTrace AI and its officers,
          directors, employees, and agents from any claims, liabilities, damages, losses, or
          expenses arising from your use of the Service, your User Content, or your violation of
          these Terms.
        </p>
      </LegalSection>

      <LegalSection id="termination" index={12} title="Termination">
        <p>
          We may suspend or terminate your access to the Service at any time for violation of
          these Terms or for any other reason at our sole discretion. Upon termination, your
          right to use the Service ceases immediately. You may export your data before
          termination; otherwise, we will delete your data in accordance with our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="changes" index={13} title="Changes to terms">
        <p>
          We may modify these Terms at any time. We will notify you of material changes via email
          or through the Service. Your continued use of the Service after changes take effect
          constitutes acceptance of the modified Terms.
        </p>
      </LegalSection>

      <LegalSection id="law" index={14} title="Governing law and disputes">
        <p>
          These Terms are governed by the laws of the State of Delaware, USA, without regard to
          conflict of law principles. Any disputes arising from these Terms shall be resolved
          through binding arbitration in accordance with the rules of the American Arbitration
          Association.
        </p>
      </LegalSection>

      <LegalSection id="contact" index={15} title="Contact information">
        <p>For questions about these Terms:</p>
        <LegalCallout label="Legal contact">
          <div className="font-medium text-foreground">OneTrace AI, Inc.</div>
          <div className="mt-1 text-muted-foreground">
            Email:{" "}
            <a href="mailto:legal@onetrace.ai" className="text-accent hover:underline">
              legal@onetrace.ai
            </a>
          </div>
        </LegalCallout>
      </LegalSection>
    </LegalLayout>
  );
};

export default TermsOfServicePage;
