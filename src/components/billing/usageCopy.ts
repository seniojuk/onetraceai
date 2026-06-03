// Shared copy + helpers for usage-limit surfaces.
// Keep microcopy tight: situation → number → recovery. One line max.

export type LimitType = "artifact" | "project" | "aiRun" | "storage" | "user";

export const limitNouns: Record<LimitType, { one: string; many: string }> = {
  artifact: { one: "artifact", many: "artifacts" },
  project: { one: "project", many: "projects" },
  aiRun: { one: "AI run", many: "AI runs" },
  storage: { one: "MB", many: "MB" },
  user: { one: "seat", many: "seats" },
};

/** First day of next month (when AI run quota resets). */
export function nextMonthReset(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Short, neutral headline. No exclamation, no "you've". */
export function limitHeadline(type: LimitType, atLimit: boolean): string {
  const noun = limitNouns[type].many;
  if (atLimit) {
    return type === "aiRun" ? `Monthly ${noun} used up` : `${cap(noun)} limit reached`;
  }
  return type === "aiRun" ? `Running low on ${noun}` : `Approaching ${noun} limit`;
}

/** One short recovery hint. Numbers > adjectives. */
export function limitRecovery(type: LimitType, atLimit: boolean): string {
  if (type === "aiRun") {
    const d = daysUntil(nextMonthReset());
    return atLimit
      ? `Resets in ${d}d, or upgrade for more.`
      : `Resets in ${d}d.`;
  }
  if (type === "storage") {
    return atLimit ? "Remove files or upgrade." : "Free space soon.";
  }
  if (type === "user") {
    return atLimit ? "Remove a seat or upgrade." : "Plan ahead.";
  }
  // artifact / project
  return atLimit ? "Archive old items or upgrade." : "Tidy up soon.";
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
