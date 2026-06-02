import {
  LegalLayout,
  LegalSection,
  LegalSubheading,
  LegalList,
  LegalCallout,
} from "@/components/marketing/LegalLayout";

const SECTIONS = [
  { id: "intro", label: "Introduction" },
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use it" },
  { id: "share", label: "Sharing & disclosure" },
  { id: "security", label: "Data security" },
  { id: "gdpr", label: "GDPR rights" },
  { id: "retention", label: "Data retention" },
  { id: "thirdparty", label: "Third-party services" },
  { id: "children", label: "Children's privacy" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
];

const PrivacyPolicyPage = () => {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy"
      flourish="policy."
      updated="January 31, 2026"
      sections={SECTIONS}
    >
      <LegalSection id="intro" index={1} title="Introduction">
        <p>
          OneTrace AI, Inc. ("OneTrace AI," "we," "us," or "our") is committed to protecting your
          privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
          information when you use our software-as-a-service platform and related services
          (collectively, the "Service").
        </p>
        <p>
          By accessing or using the Service, you agree to this Privacy Policy. If you do not agree
          with the terms of this Privacy Policy, please do not access the Service.
        </p>
      </LegalSection>

      <LegalSection id="collect" index={2} title="Information we collect">
        <LegalSubheading>2.1 Information you provide</LegalSubheading>
        <LegalList
          items={[
            <><strong className="text-foreground">Account information:</strong> Name, email address, company name, and password when you create an account.</>,
            <><strong className="text-foreground">Payment information:</strong> Billing address and payment details processed through our secure payment provider.</>,
            <><strong className="text-foreground">Workspace data:</strong> PRDs, user stories, epics, and other artifacts you create within the Service.</>,
            <><strong className="text-foreground">Integration data:</strong> Data synchronized from third-party services like Jira and GitHub that you connect to OneTrace AI.</>,
            <><strong className="text-foreground">Communications:</strong> Information you provide when contacting our support team.</>,
          ]}
        />
        <LegalSubheading>2.2 Automatically collected information</LegalSubheading>
        <LegalList
          items={[
            <><strong className="text-foreground">Usage data:</strong> How you interact with the Service, including features used and time spent.</>,
            <><strong className="text-foreground">Device information:</strong> Browser type, operating system, and device identifiers.</>,
            <><strong className="text-foreground">Log data:</strong> IP addresses, access times, and pages viewed.</>,
            <><strong className="text-foreground">Cookies:</strong> We use cookies and similar technologies to enhance your experience and analyze usage patterns.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="use" index={3} title="How we use your information">
        <p>We use the information we collect to:</p>
        <LegalList
          items={[
            "Provide, maintain, and improve the Service",
            "Process transactions and send related information",
            "Send administrative information, updates, and security alerts",
            "Respond to your comments, questions, and support requests",
            "Analyze usage patterns to improve user experience",
            "Detect, prevent, and address technical issues and security threats",
            "Power AI features that enhance your workflow (with your explicit consent)",
          ]}
        />
      </LegalSection>

      <LegalSection id="share" index={4} title="Data sharing and disclosure">
        <p>
          We do not sell your personal information. We may share your information in the following
          circumstances:
        </p>
        <LegalList
          items={[
            <><strong className="text-foreground">Service providers:</strong> With trusted third parties who help us operate the Service (hosting, analytics, payments).</>,
            <><strong className="text-foreground">Integrations:</strong> With third-party services you choose to connect (e.g., Jira, GitHub).</>,
            <><strong className="text-foreground">Legal requirements:</strong> When required by law or to protect our rights, safety, or property.</>,
            <><strong className="text-foreground">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets.</>,
            <><strong className="text-foreground">With your consent:</strong> For any other purpose with your explicit consent.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="security" index={5} title="Data security">
        <p>We implement industry-standard security measures to protect your information:</p>
        <LegalList
          items={[
            "Encryption of data in transit (TLS 1.3) and at rest (AES-256)",
            "Regular security audits and vulnerability assessments",
            "Access controls and authentication mechanisms",
            "Secure data centers with physical security measures",
          ]}
        />
        <p>
          However, no method of transmission over the Internet is 100% secure. We cannot guarantee
          absolute security.
        </p>
      </LegalSection>

      <LegalSection id="gdpr" index={6} title="GDPR compliance (for EU users)">
        <p>
          If you are located in the European Economic Area, you have certain rights under the GDPR:
        </p>
        <LegalList
          items={[
            <><strong className="text-foreground">Right of access:</strong> Request a copy of your personal data.</>,
            <><strong className="text-foreground">Right to rectification:</strong> Request correction of inaccurate data.</>,
            <><strong className="text-foreground">Right to erasure:</strong> Request deletion of your personal data.</>,
            <><strong className="text-foreground">Right to restrict processing:</strong> Request limitation of data processing.</>,
            <><strong className="text-foreground">Right to data portability:</strong> Receive your data in a structured, machine-readable format.</>,
            <><strong className="text-foreground">Right to object:</strong> Object to processing based on legitimate interests.</>,
            <><strong className="text-foreground">Right to withdraw consent:</strong> Withdraw consent at any time where processing is based on consent.</>,
          ]}
        />
        <p>
          To exercise these rights, email{" "}
          <a href="mailto:privacy@onetrace.ai" className="text-accent hover:underline">
            privacy@onetrace.ai
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="retention" index={7} title="Data retention">
        <p>
          We retain your information for as long as your account is active or as needed to provide
          the Service. Upon account deletion, we delete or anonymize your data within 30 days,
          except where retention is required by law or for legitimate business purposes.
        </p>
      </LegalSection>

      <LegalSection id="thirdparty" index={8} title="Third-party services">
        <p>
          The Service may link to or integrate with third-party services. We are not responsible
          for their privacy practices. Review their policies before sharing personal information.
        </p>
      </LegalSection>

      <LegalSection id="children" index={9} title="Children's privacy">
        <p>
          The Service is not intended for individuals under 16. We do not knowingly collect
          personal information from children. If we learn that we have, we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" index={10} title="Changes to this Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be posted
          here with an updated date. Continued use of the Service after changes constitutes
          acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" index={11} title="Contact us">
        <p>If you have questions about this Privacy Policy or our privacy practices:</p>
        <LegalCallout label="Privacy contact">
          <div className="font-medium text-foreground">OneTrace AI, Inc.</div>
          <div className="mt-1 text-muted-foreground">
            Email:{" "}
            <a href="mailto:privacy@onetrace.ai" className="text-accent hover:underline">
              privacy@onetrace.ai
            </a>
          </div>
        </LegalCallout>
      </LegalSection>
    </LegalLayout>
  );
};

export default PrivacyPolicyPage;
