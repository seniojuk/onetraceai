/**
 * Single source of truth for artifact linking rules.
 *
 * For each child artifact type, we declare:
 *   - which parent types are valid
 *   - which edge_type the link should use
 *   - whether the link is structural (CONTAINS-style) or semantic (DERIVES_FROM-style)
 *
 * This is used by:
 *   - LinkArtifactDialog (filter candidates, pick edge type automatically)
 *   - GraphPage edge dropdown (gate the 9-item list)
 *   - EpicHierarchyView drag handlers (validate the drop)
 *
 * The "structural" edge is the one we treat as the canonical parent
 * (matches the priority order in ArtifactsPage's tree builder).
 */
import { EdgeType } from "@/hooks/useArtifactEdges";
import type { ArtifactType } from "@/hooks/useArtifacts";

export interface LinkRule {
  /** Valid parent type for the child. */
  parentType: ArtifactType;
  /** Edge type written when the link is created. */
  edgeType: EdgeType;
  /** True = this is the parent-of-record (used in tree view). */
  structural: boolean;
  /** Human label shown in the picker section header. */
  label: string;
}

/** child type → ordered list of allowed parent rules (structural first). */
export const linkRules: Partial<Record<ArtifactType, LinkRule[]>> = {
  PRD: [
    { parentType: "IDEA", edgeType: EdgeType.DERIVES_FROM, structural: true, label: "Source idea" },
  ],
  EPIC: [
    { parentType: "PRD", edgeType: EdgeType.DERIVES_FROM, structural: true, label: "Parent PRD" },
  ],
  STORY: [
    { parentType: "EPIC", edgeType: EdgeType.CONTAINS, structural: true, label: "Parent epic" },
    { parentType: "PRD", edgeType: EdgeType.DERIVES_FROM, structural: false, label: "Source PRD" },
  ],
  ACCEPTANCE_CRITERION: [
    { parentType: "STORY", edgeType: EdgeType.DERIVES_FROM, structural: true, label: "Parent story" },
  ],
  TEST_CASE: [
    { parentType: "STORY", edgeType: EdgeType.VALIDATES, structural: true, label: "Story under test" },
    { parentType: "ACCEPTANCE_CRITERION", edgeType: EdgeType.VALIDATES, structural: false, label: "AC under test" },
  ],
  TEST_SUITE: [
    { parentType: "STORY", edgeType: EdgeType.VALIDATES, structural: true, label: "Story under test" },
  ],
  BUG: [
    { parentType: "STORY", edgeType: EdgeType.RELATED, structural: false, label: "Related story" },
    { parentType: "TEST_CASE", edgeType: EdgeType.RELATED, structural: false, label: "Failing test" },
  ],
  COMMIT: [
    { parentType: "STORY", edgeType: EdgeType.IMPLEMENTS, structural: true, label: "Implemented story" },
  ],
  PULL_REQUEST: [
    { parentType: "STORY", edgeType: EdgeType.IMPLEMENTS, structural: true, label: "Implemented story" },
  ],
};

/** True if the (child, parent, edgeType) triple is allowed. */
export function isValidLink(
  childType: ArtifactType,
  parentType: ArtifactType,
  edgeType: EdgeType,
): boolean {
  const rules = linkRules[childType];
  if (!rules) return false;
  return rules.some(
    (r) => r.parentType === parentType && r.edgeType === edgeType,
  );
}

/** Return all valid parent types for a child (for the picker). */
export function validParentTypes(childType: ArtifactType): ArtifactType[] {
  return (linkRules[childType] ?? []).map((r) => r.parentType);
}

/** Look up the canonical (structural) rule for a child type, if any. */
export function structuralRule(childType: ArtifactType): LinkRule | undefined {
  return linkRules[childType]?.find((r) => r.structural);
}

/** Find the rule that matches a given (child, parent) pair. */
export function ruleFor(
  childType: ArtifactType,
  parentType: ArtifactType,
): LinkRule | undefined {
  return linkRules[childType]?.find((r) => r.parentType === parentType);
}
