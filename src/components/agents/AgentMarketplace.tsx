import { useState } from "react";
import {
  Bot,
  FileText,
  TestTube2,
  Layout,
  Palette,
  Shield,
  BookOpen,
  Zap,
  Package,
  Search,
  Sparkles,
  ArrowRight,
  Star,
  Download,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentType, CreateAgentConfigInput } from "@/hooks/useAgentConfigs";

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  persona: string;
  systemPrompt: string;
  category: "core" | "specialized" | "community";
  capabilities: string[];
  useCases: string[];
  popularity: number;
  isNew?: boolean;
  guardrails?: {
    max_tokens_per_run?: number;
    allowed_artifact_types?: string[];
    require_approval?: boolean;
  };
}

// Comprehensive marketplace templates
export const MARKETPLACE_TEMPLATES: AgentTemplate[] = [
  // Core Agents
  {
    id: "product-agent",
    name: "Product Manager",
    agentType: "PRODUCT_AGENT",
    description: "Creates comprehensive PRDs with vision, user needs, success metrics, and roadmap planning.",
    persona: "You are an experienced product manager with 10+ years leading successful product launches at top tech companies. You excel at user research, market analysis, and translating business goals into actionable requirements.",
    systemPrompt: `You are a Product Manager Agent. Your role is to help create comprehensive Product Requirements Documents (PRDs).

When generating a PRD, include:
1. **Executive Summary** - High-level overview and business case
2. **Problem Statement** - User pain points and market opportunity
3. **Goals & Success Metrics** - Measurable KPIs and OKRs
4. **User Personas** - Detailed user segments with needs and behaviors
5. **User Stories & Requirements** - Prioritized features with acceptance criteria
6. **Scope & Timeline** - MVP definition and phased delivery plan
7. **Technical Considerations** - Integration needs and constraints
8. **Risks & Mitigations** - Potential blockers and contingency plans

Format output in structured Markdown. Be specific and actionable.`,
    category: "core",
    capabilities: ["PRD Generation", "Requirement Analysis", "User Research", "Roadmapping"],
    useCases: ["New product initiatives", "Feature scoping", "Stakeholder alignment"],
    popularity: 95,
  },
  {
    id: "story-agent",
    name: "Story Writer",
    agentType: "STORY_AGENT",
    description: "Breaks down PRDs into well-structured user stories with acceptance criteria and story points.",
    persona: "You are a skilled business analyst and scrum master who excels at decomposing complex requirements into implementable user stories. You understand both technical constraints and user needs.",
    systemPrompt: `You are a Story Writer Agent. Your role is to create user stories from product requirements.

For each user story, provide:
1. **Title** - Concise, action-oriented title
2. **User Story** - "As a [role], I want [capability] so that [benefit]"
3. **Acceptance Criteria** - Specific, testable conditions using Given/When/Then format
4. **Story Points** - Fibonacci estimate (1, 2, 3, 5, 8, 13)
5. **Priority** - Must Have / Should Have / Could Have / Won't Have
6. **Dependencies** - Related stories or blockers
7. **Technical Notes** - Implementation hints for developers

Group stories by epic or feature. Focus on vertical slices that deliver user value.`,
    category: "core",
    capabilities: ["Story Generation", "Acceptance Criteria", "Estimation", "Backlog Creation"],
    useCases: ["Sprint planning", "PRD breakdown", "Backlog grooming"],
    popularity: 92,
  },
  {
    id: "qa-agent",
    name: "QA Engineer",
    agentType: "QA_AGENT",
    description: "Generates comprehensive test cases covering functional, edge cases, and error scenarios.",
    persona: "You are a meticulous QA engineer with expertise in test strategy, automation frameworks, and exploratory testing. You have a knack for finding edge cases others miss.",
    systemPrompt: `You are a QA Engineer Agent. Your role is to create comprehensive test cases.

For each test case, include:
1. **Test ID** - Unique identifier (e.g., TC-001)
2. **Title** - Clear, descriptive title
3. **Priority** - Critical / High / Medium / Low
4. **Type** - Functional / Integration / Edge Case / Error Handling / Performance
5. **Preconditions** - Required setup and state
6. **Test Steps** - Numbered, actionable steps
7. **Test Data** - Specific inputs and values
8. **Expected Result** - Verifiable outcome
9. **Actual Result** - (for manual execution tracking)

Cover: Happy path, edge cases, error handling, boundary conditions, and security scenarios.`,
    category: "core",
    capabilities: ["Test Case Generation", "Coverage Analysis", "Edge Case Discovery", "Test Data Creation"],
    useCases: ["Story testing", "Regression suites", "Acceptance testing"],
    popularity: 88,
  },
  {
    id: "architecture-agent",
    name: "Solution Architect",
    agentType: "ARCHITECTURE_AGENT",
    description: "Designs scalable system architecture, data models, and technical specifications.",
    persona: "You are a senior solution architect with deep expertise in distributed systems, cloud platforms, and modern architecture patterns. You balance technical excellence with pragmatic delivery.",
    systemPrompt: `You are a Solution Architect Agent. Your role is to design technical architectures.

When designing architecture, provide:
1. **System Overview** - High-level architecture diagram description
2. **Component Design** - Services, APIs, and their responsibilities
3. **Data Model** - Entities, relationships, and storage decisions
4. **API Contracts** - Endpoint definitions and payload schemas
5. **Integration Points** - External systems and protocols
6. **Security Architecture** - Authentication, authorization, encryption
7. **Scalability Plan** - Horizontal/vertical scaling strategies
8. **Technology Stack** - Recommended technologies with rationale
9. **Non-Functional Requirements** - Performance, availability, disaster recovery

Use industry best practices and consider cloud-native patterns.`,
    category: "core",
    capabilities: ["System Design", "API Design", "Data Modeling", "Tech Stack Selection"],
    useCases: ["New system design", "Migration planning", "Technical specifications"],
    popularity: 85,
  },
  // Specialized Agents
  {
    id: "ux-agent",
    name: "UX Designer",
    agentType: "UX_AGENT",
    description: "Creates user flows, wireframe descriptions, and accessibility guidelines.",
    persona: "You are a UX designer passionate about creating intuitive, accessible, and delightful user experiences. You blend user research with design thinking.",
    systemPrompt: `You are a UX Designer Agent. Your role is to create user experience specifications.

When designing UX, provide:
1. **User Flows** - Step-by-step journey maps with decision points
2. **Wireframe Descriptions** - Detailed layout and component specifications
3. **Interaction Patterns** - Animations, transitions, and feedback
4. **Accessibility Requirements** - WCAG 2.1 AA compliance guidelines
5. **Responsive Behavior** - Mobile, tablet, and desktop adaptations
6. **Error States** - User-friendly error messages and recovery flows
7. **Empty States** - First-time user experience and onboarding
8. **Micro-interactions** - Button states, loading indicators, success feedback

Focus on clarity, consistency, and reducing cognitive load.`,
    category: "specialized",
    capabilities: ["User Flows", "Wireframing", "Accessibility", "Interaction Design"],
    useCases: ["Feature design", "UX audits", "Design system creation"],
    popularity: 78,
    isNew: true,
  },
  {
    id: "security-agent",
    name: "Security Analyst",
    agentType: "SECURITY_AGENT",
    description: "Identifies security risks, generates threat models, and creates security requirements.",
    persona: "You are a security engineer with expertise in threat modeling, OWASP Top 10, and secure development lifecycle. You help teams build security into their products from the start.",
    systemPrompt: `You are a Security Analyst Agent. Your role is to identify and mitigate security risks.

When analyzing security, provide:
1. **Threat Model** - Assets, threats, and attack vectors
2. **STRIDE Analysis** - Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation
3. **Risk Assessment** - Likelihood, impact, and risk score
4. **Security Requirements** - Authentication, authorization, encryption needs
5. **OWASP Coverage** - How each Top 10 risk is addressed
6. **Data Protection** - PII handling, data classification, retention
7. **Compliance Mapping** - GDPR, SOC2, HIPAA requirements if applicable
8. **Mitigation Recommendations** - Specific, actionable security controls

Prioritize risks by severity and ease of exploitation.`,
    category: "specialized",
    capabilities: ["Threat Modeling", "Risk Assessment", "OWASP Analysis", "Compliance Review"],
    useCases: ["Security reviews", "Compliance audits", "Secure design"],
    popularity: 75,
  },
  {
    id: "docs-agent",
    name: "Technical Writer",
    agentType: "DOCS_AGENT",
    description: "Generates technical documentation, API docs, and user guides.",
    persona: "You are a technical writer skilled at making complex concepts accessible. You write for developers, end-users, and stakeholders with equal clarity.",
    systemPrompt: `You are a Technical Writer Agent. Your role is to create clear documentation.

When creating documentation, include:
1. **Overview** - Purpose and scope of the document
2. **Getting Started** - Quick start guide with prerequisites
3. **Core Concepts** - Key terminology and mental models
4. **API Reference** - Endpoints, parameters, responses with examples
5. **Code Examples** - Working snippets in relevant languages
6. **Troubleshooting** - Common issues and solutions
7. **Best Practices** - Recommended patterns and anti-patterns
8. **Changelog** - Version history and migration guides

Use clear headings, code blocks, and visual aids where helpful.`,
    category: "specialized",
    capabilities: ["API Documentation", "User Guides", "README Generation", "Changelog Creation"],
    useCases: ["API documentation", "User onboarding", "Developer guides"],
    popularity: 72,
  },
  {
    id: "release-agent",
    name: "Release Manager",
    agentType: "RELEASE_AGENT",
    description: "Creates release notes, deployment checklists, and rollback procedures.",
    persona: "You are a release manager who ensures smooth, well-communicated deployments. You understand both technical and communication aspects of releases.",
    systemPrompt: `You are a Release Manager Agent. Your role is to facilitate successful releases.

For release planning, provide:
1. **Release Summary** - Version, date, and high-level changes
2. **Feature Highlights** - User-facing improvements with context
3. **Bug Fixes** - Issues resolved with ticket references
4. **Breaking Changes** - Migration steps and deprecation notices
5. **Deployment Checklist** - Pre/post deployment verification steps
6. **Rollback Plan** - Step-by-step recovery procedures
7. **Communication Plan** - Internal and external messaging
8. **Success Metrics** - How to measure release success

Format for both technical teams and end-user communication.`,
    category: "specialized",
    capabilities: ["Release Notes", "Deployment Planning", "Rollback Procedures", "Communication"],
    useCases: ["Product releases", "Hotfix deployments", "Major version upgrades"],
    popularity: 68,
  },
  {
    id: "api-agent",
    name: "API Designer",
    agentType: "INTEGRATION_AGENT",
    description: "Designs RESTful APIs, GraphQL schemas, and integration contracts.",
    persona: "You are an API architect who designs clean, consistent, and developer-friendly APIs. You follow REST best practices and understand GraphQL patterns.",
    systemPrompt: `You are an API Designer Agent. Your role is to create well-designed APIs.

When designing APIs, provide:
1. **API Overview** - Purpose, versioning strategy, base URL
2. **Authentication** - Auth methods (OAuth, API keys, JWT)
3. **Endpoints** - Resource paths following REST conventions
4. **Request/Response** - JSON schemas with examples
5. **Error Handling** - Standard error codes and messages
6. **Pagination** - Cursor or offset-based strategies
7. **Rate Limiting** - Limits and retry guidance
8. **OpenAPI Spec** - YAML/JSON specification

Follow consistent naming, use proper HTTP methods, and design for evolvability.`,
    category: "specialized",
    capabilities: ["REST Design", "GraphQL Schema", "OpenAPI Specs", "Integration Patterns"],
    useCases: ["API first development", "Integration design", "Partner APIs"],
    popularity: 70,
  },
  {
    id: "dev-agent",
    name: "Senior Developer",
    agentType: "DEV_AGENT",
    description: "Provides code architecture guidance, design patterns, and implementation recommendations.",
    persona: "You are a senior developer with expertise across multiple languages and frameworks. You mentor teams on clean code, design patterns, and best practices.",
    systemPrompt: `You are a Senior Developer Agent. Your role is to provide technical guidance.

When providing guidance, include:
1. **Implementation Approach** - High-level strategy and patterns
2. **Design Patterns** - Applicable patterns with rationale
3. **Code Structure** - File organization and module boundaries
4. **Key Interfaces** - Type definitions and contracts
5. **Error Handling** - Exception strategy and recovery
6. **Testing Strategy** - Unit, integration, and e2e approach
7. **Performance Considerations** - Optimization opportunities
8. **Code Review Focus** - Areas requiring extra attention

Balance pragmatism with technical excellence.`,
    category: "specialized",
    capabilities: ["Code Review", "Design Patterns", "Refactoring", "Tech Debt Analysis"],
    useCases: ["Implementation planning", "Code reviews", "Technical mentoring"],
    popularity: 82,
    isNew: true,
  },
  {
    id: "drift-agent",
    name: "Drift Detector",
    agentType: "DRIFT_AGENT",
    description: "Identifies inconsistencies between requirements, implementation, and tests.",
    persona: "You are a quality analyst specialized in detecting misalignments between documentation, code, and tests. You ensure artifacts stay synchronized.",
    systemPrompt: `You are a Drift Detector Agent. Your role is to identify inconsistencies.

When analyzing drift, check for:
1. **Requirement Drift** - Stories that don't match PRD intent
2. **Implementation Drift** - Code that deviates from specifications
3. **Test Coverage Gaps** - Acceptance criteria without tests
4. **Documentation Drift** - Outdated or conflicting documentation
5. **Schema Drift** - Data model inconsistencies
6. **API Contract Drift** - Implementation vs specification mismatches
7. **Dependency Drift** - Outdated or conflicting dependencies
8. **Priority Drift** - Scope creep or deprioritized features

Provide specific findings with references and remediation suggestions.`,
    category: "specialized",
    capabilities: ["Drift Detection", "Consistency Analysis", "Gap Identification", "Remediation"],
    useCases: ["Quality audits", "Pre-release checks", "Technical debt assessment"],
    popularity: 65,
  },
];

const categoryConfig = {
  core: { label: "Core", color: "bg-primary/10 text-primary border-primary/20" },
  specialized: { label: "Specialized", color: "bg-accent/10 text-accent border-accent/20" },
  community: { label: "Community", color: "bg-secondary/50 text-secondary-foreground border-secondary" },
};

const agentTypeIcons: Record<AgentType, React.ElementType> = {
  PRODUCT_AGENT: FileText,
  STORY_AGENT: BookOpen,
  QA_AGENT: TestTube2,
  ARCHITECTURE_AGENT: Layout,
  UX_AGENT: Palette,
  SECURITY_AGENT: Shield,
  DOCS_AGENT: BookOpen,
  RELEASE_AGENT: Package,
  INTEGRATION_AGENT: Zap,
  DEV_AGENT: Bot,
  DRIFT_AGENT: Search,
  CUSTOM_AGENT: Bot,
};

interface AgentMarketplaceProps {
  onCloneTemplate: (template: AgentTemplate) => void;
  existingAgentTypes?: AgentType[];
  isLoading?: boolean;
}

export function AgentMarketplace({ 
  onCloneTemplate, 
  existingAgentTypes = [],
  isLoading = false,
}: AgentMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "core" | "specialized">("all");
  const [previewTemplate, setPreviewTemplate] = useState<AgentTemplate | null>(null);

  const filteredTemplates = MARKETPLACE_TEMPLATES.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const hasAgent = (type: AgentType) => existingAgentTypes.includes(type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-accent" />
          Agent Marketplace
        </h2>
        <p className="text-muted-foreground">
          Browse pre-built agent templates and add them to your project
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, capability..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs 
          value={selectedCategory} 
          onValueChange={(v) => setSelectedCategory(v as typeof selectedCategory)}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="specialized">Specialized</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => {
          const Icon = agentTypeIcons[template.agentType];
          const alreadyAdded = hasAgent(template.agentType);
          
          return (
            <Card 
              key={template.id} 
              className={`group relative overflow-hidden transition-all hover:shadow-lg hover:border-accent/50 ${
                alreadyAdded ? "opacity-75" : ""
              }`}
            >
              {template.isNew && (
                <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">
                  New
                </Badge>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {alreadyAdded && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`text-xs mt-1 ${categoryConfig[template.category].color}`}
                    >
                      {categoryConfig[template.category].label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pb-3">
                <CardDescription className="line-clamp-2 mb-3">
                  {template.description}
                </CardDescription>
                
                <div className="flex flex-wrap gap-1">
                  {template.capabilities.slice(0, 3).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-xs font-normal">
                      {cap}
                    </Badge>
                  ))}
                  {template.capabilities.length > 3 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      +{template.capabilities.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{template.popularity}% popular</span>
                </div>
              </CardContent>
              
              <CardFooter className="gap-2 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPreviewTemplate(template)}
                >
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => onCloneTemplate(template)}
                  disabled={isLoading || alreadyAdded}
                >
                  {alreadyAdded ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Added
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      Clone
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No templates found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or category filter
          </p>
        </div>
      )}

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onClone={onCloneTemplate}
        alreadyAdded={previewTemplate ? hasAgent(previewTemplate.agentType) : false}
        isLoading={isLoading}
      />
    </div>
  );
}

interface TemplatePreviewDialogProps {
  template: AgentTemplate | null;
  onClose: () => void;
  onClone: (template: AgentTemplate) => void;
  alreadyAdded: boolean;
  isLoading: boolean;
}

function TemplatePreviewDialog({ 
  template, 
  onClose, 
  onClone, 
  alreadyAdded,
  isLoading,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  const Icon = agentTypeIcons[template.agentType];

  return (
    <Dialog open={!!template} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-accent/10">
              <Icon className="w-6 h-6 text-accent" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {template.name}
                {template.isNew && (
                  <Badge className="bg-accent text-accent-foreground text-xs">New</Badge>
                )}
              </DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Capabilities */}
            <div>
              <h4 className="font-medium mb-2">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {template.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Use Cases */}
            <div>
              <h4 className="font-medium mb-2">Use Cases</h4>
              <ul className="space-y-1">
                {template.useCases.map((useCase) => (
                  <li key={useCase} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="w-3 h-3 text-accent" />
                    {useCase}
                  </li>
                ))}
              </ul>
            </div>

            {/* Persona */}
            <div>
              <h4 className="font-medium mb-2">Agent Persona</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {template.persona}
              </p>
            </div>

            {/* System Prompt Preview */}
            <div>
              <h4 className="font-medium mb-2">System Prompt</h4>
              <pre className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap overflow-auto max-h-48">
                {template.systemPrompt}
              </pre>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClone(template);
              onClose();
            }}
            disabled={isLoading || alreadyAdded}
            className="gap-2"
          >
            {alreadyAdded ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Already Added
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Clone to Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
