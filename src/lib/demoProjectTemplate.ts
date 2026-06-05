// Demo project seed used for the "Show me what OneTrace can do" onboarding path.
// One realistic SaaS chain: PRD → Epics → Stories → ACs → Tests, with one
// failing test so the new project shows ~75% coverage out of the box.

export interface DemoArtifactSeed {
  key: string; // local seed key, used to wire edges before insert
  type:
    | "PRD"
    | "EPIC"
    | "STORY"
    | "ACCEPTANCE_CRITERION"
    | "TEST_CASE";
  title: string;
  status: "DRAFT" | "ACTIVE" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  parentKey?: string; // CONTAINS edge will be created from parent → child
  markdown?: string;
}

export interface DemoTemplate {
  projectName: string;
  projectKey: string;
  description: string;
  artifacts: DemoArtifactSeed[];
}

export const ACME_NOTES_DEMO: DemoTemplate = {
  projectName: "Acme Notes (Demo)",
  projectKey: "DEMO",
  description:
    "Collaborative note-taking with shared workspaces. Pre-populated demo so you can explore the graph immediately.",
  artifacts: [
    {
      key: "prd",
      type: "PRD",
      title: "Acme Notes: collaborative workspaces",
      status: "ACTIVE",
      markdown: [
        "# Acme Notes — PRD",
        "",
        "## Problem",
        "Small teams keep losing context. Docs live in five tools, decisions evaporate in Slack, and onboarding takes weeks.",
        "",
        "## Goal",
        "Ship a fast, collaborative note app that small teams adopt in under 10 minutes.",
        "",
        "## Scope",
        "1. Email + Google sign in.",
        "2. Rich text editor with mentions and slash commands.",
        "3. Shareable workspaces with role-based access.",
        "",
        "## Out of scope",
        "Realtime cursors, mobile apps, offline mode.",
        "",
        "## Success metrics",
        "Activation in first session > 60%. Day-7 retention > 35%.",
      ].join("\n"),
    },
    // EPIC: Auth
    {
      key: "epic-auth",
      type: "EPIC",
      title: "Authentication",
      status: "DONE",
      parentKey: "prd",
      markdown: "Email and Google sign in with secure sessions.",
    },
    {
      key: "story-auth-email",
      type: "STORY",
      title: "User can sign up with email and password",
      status: "DONE",
      parentKey: "epic-auth",
    },
    {
      key: "story-auth-google",
      type: "STORY",
      title: "User can sign in with Google",
      status: "DONE",
      parentKey: "epic-auth",
    },
    {
      key: "ac-auth-1",
      type: "ACCEPTANCE_CRITERION",
      title: "Email signup creates an account and lands on the editor",
      status: "DONE",
      parentKey: "story-auth-email",
    },
    {
      key: "ac-auth-2",
      type: "ACCEPTANCE_CRITERION",
      title: "Password must be at least 8 characters",
      status: "DONE",
      parentKey: "story-auth-email",
    },
    {
      key: "ac-auth-3",
      type: "ACCEPTANCE_CRITERION",
      title: "Google OAuth returns a verified profile",
      status: "DONE",
      parentKey: "story-auth-google",
    },
    {
      key: "test-auth-1",
      type: "TEST_CASE",
      title: "Signup flow: happy path",
      status: "DONE",
      parentKey: "ac-auth-1",
    },

    // EPIC: Editor
    {
      key: "epic-editor",
      type: "EPIC",
      title: "Rich text editor",
      status: "IN_PROGRESS",
      parentKey: "prd",
      markdown: "Block-based editor with mentions and slash commands.",
    },
    {
      key: "story-editor-slash",
      type: "STORY",
      title: "Slash menu for inserting blocks",
      status: "IN_PROGRESS",
      parentKey: "epic-editor",
    },
    {
      key: "story-editor-mentions",
      type: "STORY",
      title: "@-mentions for teammates",
      status: "DRAFT",
      parentKey: "epic-editor",
    },
    {
      key: "ac-editor-1",
      type: "ACCEPTANCE_CRITERION",
      title: "Typing / opens the slash menu",
      status: "DONE",
      parentKey: "story-editor-slash",
    },
    {
      key: "ac-editor-2",
      type: "ACCEPTANCE_CRITERION",
      title: "Selecting a block inserts it inline",
      status: "IN_PROGRESS",
      parentKey: "story-editor-slash",
    },
    {
      key: "ac-editor-3",
      type: "ACCEPTANCE_CRITERION",
      title: "@-mentions notify the mentioned user",
      status: "DRAFT",
      parentKey: "story-editor-mentions",
    },
    {
      key: "test-editor-1",
      type: "TEST_CASE",
      title: "Slash menu opens and filters",
      status: "DONE",
      parentKey: "ac-editor-1",
    },
    {
      key: "test-editor-2",
      type: "TEST_CASE",
      title: "Block insertion writes to document",
      status: "BLOCKED" as any,
      parentKey: "ac-editor-2",
    },

    // EPIC: Sharing
    {
      key: "epic-sharing",
      type: "EPIC",
      title: "Workspace sharing",
      status: "DRAFT",
      parentKey: "prd",
      markdown: "Invite teammates with viewer or editor roles.",
    },
    {
      key: "story-sharing-invite",
      type: "STORY",
      title: "Invite a teammate by email",
      status: "DRAFT",
      parentKey: "epic-sharing",
    },
    {
      key: "story-sharing-roles",
      type: "STORY",
      title: "Set viewer or editor role",
      status: "DRAFT",
      parentKey: "epic-sharing",
    },
    {
      key: "ac-sharing-1",
      type: "ACCEPTANCE_CRITERION",
      title: "Invite link expires after 7 days",
      status: "DONE",
      parentKey: "story-sharing-invite",
    },
    {
      key: "ac-sharing-2",
      type: "ACCEPTANCE_CRITERION",
      title: "Viewer role cannot edit blocks",
      status: "DRAFT",
      parentKey: "story-sharing-roles",
    },
    {
      key: "ac-sharing-3",
      type: "ACCEPTANCE_CRITERION",
      title: "Editor role can rename the workspace",
      status: "DRAFT",
      parentKey: "story-sharing-roles",
    },
    {
      key: "test-sharing-1",
      type: "TEST_CASE",
      title: "Invite link respects expiry",
      status: "DONE",
      parentKey: "ac-sharing-1",
    },
  ],
};
