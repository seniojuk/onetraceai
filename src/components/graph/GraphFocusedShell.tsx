import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TONE_CLASSES,
  type GraphQuestion,
} from "@/lib/graphQuestions";

interface GraphFocusedShellProps {
  question: GraphQuestion;
  /** Right-aligned chip — typically the result count or status. */
  count?: string;
  /** Optional small subtitle under the question name. */
  subtitle?: ReactNode;
  /** Optional right-side controls (filter chips, view toggles). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Persistent shell for any "I picked a question, now show me the answer"
 * view. Stays calm: thin breadcrumb, clear back-link, no extra chrome.
 * The actual answer (list, lineage, canvas, etc.) lives in `children`.
 */
export function GraphFocusedShell({
  question,
  count,
  subtitle,
  actions,
  children,
}: GraphFocusedShellProps) {
  const tone = TONE_CLASSES[question.tone];
  const Icon = question.icon;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Breadcrumb / question header */}
      <header className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-14 z-20">
        <div className="px-6 py-3 flex items-center gap-3">
          <Link
            to="/graph"
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Graph
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-sm border border-border bg-background flex items-center justify-center shrink-0">
              <Icon className={cn("h-3 w-3", tone.icon)} />
            </div>
            <h1 className="text-[13px] font-medium text-foreground truncate">
              {question.focusedHeading}
            </h1>
            {count !== undefined && (
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-medium rounded border px-1.5 py-0.5",
                  tone.chip,
                )}
              >
                {count}
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-muted-foreground truncate">
                {subtitle}
              </span>
            )}
          </div>

          {actions && (
            <div className="ml-auto flex items-center gap-1.5">{actions}</div>
          )}
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
