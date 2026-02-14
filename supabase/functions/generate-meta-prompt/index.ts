import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ArtifactContext {
  id: string;
  type: string;
  title: string;
  short_id: string;
  status: string;
  content_markdown: string | null;
  depth: number;
  direction: "parent" | "self" | "child";
}

// Rough token estimator (~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Priority order: target first, then by type hierarchy proximity
const TYPE_PRIORITY: Record<string, number> = {
  STORY: 1,
  ACCEPTANCE_CRITERION: 2,
  EPIC: 3,
  PRD: 4,
  TEST_CASE: 5,
  IDEA: 6,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { artifactId, toolName, contextConfig } = await req.json();

    if (!artifactId || !toolName) {
      return new Response(
        JSON.stringify({ error: "artifactId and toolName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the target artifact
    const { data: artifact, error: artError } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", artifactId)
      .single();

    if (artError || !artifact) {
      return new Response(
        JSON.stringify({ error: "Artifact not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the tool info
    const { data: tool } = await supabase
      .from("prompt_tools")
      .select("*")
      .eq("name", toolName)
      .eq("enabled", true)
      .single();

    if (!tool) {
      return new Response(
        JSON.stringify({ error: "Tool not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the tool's default template
    const { data: template } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("tool_id", tool.id)
      .eq("is_system", true)
      .limit(1)
      .single();

    // Context configuration
    const includeParents = contextConfig?.includeParents !== false;
    const includeChildren = contextConfig?.includeChildren !== false;
    const maxDepth = contextConfig?.maxDepth ?? 3;
    const tokenBudget = contextConfig?.tokenBudget ?? tool.default_token_limit ?? 8000;
    const includeTypes: string[] | null = contextConfig?.includeTypes ?? null; // null = all types

    const contextArtifacts: ArtifactContext[] = [
      {
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        short_id: artifact.short_id,
        status: artifact.status,
        content_markdown: artifact.content_markdown,
        depth: 0,
        direction: "self",
      },
    ];

    // Fetch all edges for the project
    const { data: allEdges } = await supabase
      .from("artifact_edges")
      .select("*")
      .eq("project_id", artifact.project_id);

    const edges = allEdges || [];
    const visited = new Set<string>([artifact.id]);

    // Walk ancestors (incoming edges)
    if (includeParents) {
      const walkUp = async (currentId: string, depth: number) => {
        if (depth >= maxDepth) return;
        const parentEdges = edges.filter(
          (e: any) => e.to_artifact_id === currentId && !visited.has(e.from_artifact_id)
        );
        for (const edge of parentEdges) {
          visited.add(edge.from_artifact_id);
          const { data: parent } = await supabase
            .from("artifacts")
            .select("id, type, title, short_id, status, content_markdown")
            .eq("id", edge.from_artifact_id)
            .single();
          if (parent) {
            // Apply type filter
            if (includeTypes && !includeTypes.includes(parent.type)) continue;
            contextArtifacts.unshift({
              ...parent,
              depth: depth + 1,
              direction: "parent",
            } as ArtifactContext);
            await walkUp(edge.from_artifact_id, depth + 1);
          }
        }
      };
      await walkUp(artifact.id, 0);
    }

    // Walk descendants (outgoing edges)
    if (includeChildren) {
      const walkDown = async (currentId: string, depth: number) => {
        if (depth >= maxDepth) return;
        const childEdges = edges.filter(
          (e: any) => e.from_artifact_id === currentId && !visited.has(e.to_artifact_id)
        );
        for (const edge of childEdges) {
          visited.add(edge.to_artifact_id);
          const { data: child } = await supabase
            .from("artifacts")
            .select("id, type, title, short_id, status, content_markdown")
            .eq("id", edge.to_artifact_id)
            .single();
          if (child) {
            // Apply type filter
            if (includeTypes && !includeTypes.includes(child.type)) continue;
            contextArtifacts.push({
              ...child,
              depth: depth + 1,
              direction: "child",
            } as ArtifactContext);
            await walkDown(edge.to_artifact_id, depth + 1);
          }
        }
      };
      await walkDown(artifact.id, 0);
    }

    // Sort by type hierarchy order
    const typeOrder = ["IDEA", "PRD", "EPIC", "STORY", "ACCEPTANCE_CRITERION", "TEST_CASE"];
    contextArtifacts.sort(
      (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
    );

    // === Smart Token Budget Allocation ===
    // Reserve ~30% for system prompt overhead, allocate rest to context
    const contextTokenBudget = Math.floor(tokenBudget * 0.7);

    // Build context sections with priority-based truncation
    interface ContextSection {
      artifact: ArtifactContext;
      header: string;
      content: string;
      tokens: number;
      priority: number; // lower = higher priority
    }

    const sections: ContextSection[] = contextArtifacts.map((ctx) => {
      const marker = ctx.id === artifact.id ? " ← TARGET ARTIFACT" : "";
      const depthLabel = ctx.direction === "self" ? "" : ` [depth: ${ctx.depth}]`;
      const header = `## [${ctx.type}] ${ctx.title} (${ctx.short_id})${marker}${depthLabel}\nStatus: ${ctx.status}\n`;
      const content = ctx.content_markdown || "(no content)";
      const fullText = `${header}\n${content}\n\n---\n`;

      // Priority: target=0, then by type proximity and depth
      const typePriority = TYPE_PRIORITY[ctx.type] ?? 10;
      const priority = ctx.direction === "self" ? 0 : typePriority + ctx.depth;

      return {
        artifact: ctx,
        header,
        content,
        tokens: estimateTokens(fullText),
        priority,
      };
    });

    // Sort by priority (target first, then closest/most relevant)
    sections.sort((a, b) => a.priority - b.priority);

    // Allocate tokens greedily by priority
    let usedTokens = 0;
    const includedSections: ContextSection[] = [];
    const truncatedSections: Array<{ short_id: string; type: string; reason: string }> = [];

    for (const section of sections) {
      const remaining = contextTokenBudget - usedTokens;

      if (remaining <= 0) {
        truncatedSections.push({
          short_id: section.artifact.short_id,
          type: section.artifact.type,
          reason: "token_budget_exceeded",
        });
        continue;
      }

      if (section.tokens <= remaining) {
        // Fits fully
        includedSections.push(section);
        usedTokens += section.tokens;
      } else {
        // Partial inclusion — truncate content to fit
        const headerTokens = estimateTokens(section.header);
        const availableForContent = remaining - headerTokens - 20; // 20 tokens for truncation notice

        if (availableForContent > 100) {
          const truncatedContent = section.content.slice(0, availableForContent * 4) + "\n... (truncated to fit token budget)";
          includedSections.push({
            ...section,
            content: truncatedContent,
            tokens: remaining,
          });
          usedTokens += remaining;
        } else {
          truncatedSections.push({
            short_id: section.artifact.short_id,
            type: section.artifact.type,
            reason: "insufficient_space",
          });
        }
      }
    }

    // Re-sort included sections back to hierarchy order for the prompt
    includedSections.sort(
      (a, b) => typeOrder.indexOf(a.artifact.type) - typeOrder.indexOf(b.artifact.type)
    );

    // Build the final context document
    let contextDocument = "";
    for (const section of includedSections) {
      contextDocument += `\n${section.header}\n${section.content}\n\n---\n`;
    }

    if (truncatedSections.length > 0) {
      contextDocument += `\n\n_Note: ${truncatedSections.length} artifact(s) were excluded or truncated due to token budget constraints._\n`;
    }

    // Build the meta-prompt generation system prompt
    const toolInstructions: Record<string, string> = {
      lovable: `You are generating a prompt for **Lovable**, an AI app builder. 
Rules:
- Be concise and feature-focused
- Describe the UI/UX expectations clearly
- Mention specific components, layouts, and interactions
- Include acceptance criteria as bullet points
- Keep under 2000 words
- Format as a single clear prompt the user can paste into Lovable`,

      cursor: `You are generating a prompt for **Cursor AI IDE**.
Rules:
- Include file-level implementation guidance
- Specify which files to create/modify
- Include code structure expectations
- Add relevant .cursorrules context
- Mention frameworks, libraries, and patterns to use
- Include test expectations
- Format as a structured implementation spec`,

      claude_code: `You are generating a prompt for **Claude Code** (Anthropic's coding agent).
Rules:
- Provide a detailed, step-by-step implementation plan
- Specify exact file paths and changes needed
- Include acceptance criteria and edge cases
- Mention constraints, dependencies, and error handling
- Be thorough — Claude Code handles complexity well
- Format as a structured specification with clear sections`,

      codex: `You are generating a prompt for **OpenAI Codex / ChatGPT Code Interpreter**.
Rules:
- Focus on function signatures and expected I/O
- Include test cases and expected outputs
- Specify language and framework requirements
- Keep instructions task-oriented and atomic
- Format as clear, actionable tasks`,

      windsurf: `You are generating a prompt for **Windsurf AI IDE** (Cascade mode).
Rules:
- Break implementation into sequential cascade steps
- Each step should have clear context and expected outcome
- Include file references and code patterns
- Mention when to use Cascade vs inline edits
- Format as numbered implementation steps`,

      custom: `You are generating a general-purpose code generation prompt.
Rules:
- Be clear, structured, and actionable
- Include all relevant context from the artifacts
- Specify expected outcomes and acceptance criteria
- Format as a well-organized implementation guide`,
    };

    const systemPrompt = `${toolInstructions[toolName] || toolInstructions.custom}

You will be given a collection of software artifacts (ideas, PRDs, epics, stories, acceptance criteria, test cases) that form a traceability hierarchy. Your job is to transform this artifact context into an optimized code generation prompt for the specified tool.

The TARGET ARTIFACT is the primary focus — use the other artifacts as supporting context to create a comprehensive, well-informed prompt.

Template guidance: ${template?.template_body || "Generate a clear, actionable prompt."}

IMPORTANT:
- Output ONLY the generated prompt — no meta-commentary or explanations
- Make the prompt self-contained (the reader won't have access to the original artifacts)
- Include specific requirements, constraints, and acceptance criteria from the artifacts
- Adapt the style and format to what works best for the target tool`;

    const userMessage = `Here are the software artifacts to transform into a code generation prompt:\n\n${contextDocument}\n\nGenerate an optimized ${tool.display_name} prompt based on the TARGET ARTIFACT and its context.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.5,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const promptContent = aiData.choices?.[0]?.message?.content;

    if (!promptContent) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the generated prompt along with context info
    return new Response(
      JSON.stringify({
        prompt: promptContent,
        toolId: tool.id,
        toolName: tool.name,
        templateId: template?.id || null,
        contextArtifacts: contextArtifacts.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          short_id: a.short_id,
          depth: a.depth,
          direction: a.direction,
        })),
        truncatedArtifacts: truncatedSections,
        tokenBudget,
        estimatedTokensUsed: usedTokens,
        usage: aiData.usage || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-meta-prompt:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
