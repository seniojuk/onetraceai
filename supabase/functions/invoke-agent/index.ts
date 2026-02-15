import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model name mapping for Lovable AI gateway
const modelMapping: Record<string, string> = {
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
  'gemini-3-flash-preview': 'google/gemini-3-flash-preview',
  'gemini-3-pro-preview': 'google/gemini-3-pro-preview',
  'gpt-5': 'openai/gpt-5',
  'gpt-5-mini': 'openai/gpt-5-mini',
  'gpt-5-nano': 'openai/gpt-5-nano',
  'gpt-5.2': 'openai/gpt-5.2',
};

interface AgentConfig {
  id: string;
  name: string;
  agent_type: string;
  persona: string | null;
  system_prompt: string | null;
  temperature: number | null;
  max_tokens: number | null;
  guardrails: {
    max_tokens_per_run?: number;
    require_approval?: boolean;
    blocked_topics?: string[];
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      agentId, 
      modelId, 
      inputContent, 
      inputArtifactId,
      additionalContext,
      workspaceId,
      projectId,
      stream = false,
      outputFormat = 'json',
    } = await req.json();
    
    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Agent ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!inputContent) {
      return new Response(
        JSON.stringify({ error: 'Input content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Failed to fetch agent config:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agentConfig = agent as AgentConfig;

    // Check if agent is enabled
    if (agent.enabled === false) {
      return new Response(
        JSON.stringify({ error: 'Agent is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which model to use
    const effectiveModelId = modelId || agent.default_model_id;
    let modelName = 'google/gemini-3-flash-preview'; // Default model

    if (effectiveModelId) {
      const { data: model } = await supabase
        .from('llm_models')
        .select('model_name')
        .eq('id', effectiveModelId)
        .single();

      if (model) {
        // Map to Lovable AI gateway format if needed, otherwise use as-is
        // Check if already has provider prefix (contains /)
        if (model.model_name.includes('/')) {
          modelName = model.model_name;
        } else {
          modelName = modelMapping[model.model_name] || `google/${model.model_name}`;
        }
      }
    }

    // Check guardrails
    const guardrails = agentConfig.guardrails;
    if (guardrails?.blocked_topics && guardrails.blocked_topics.length > 0) {
      const lowerInput = inputContent.toLowerCase();
      for (const topic of guardrails.blocked_topics) {
        if (lowerInput.includes(topic.toLowerCase())) {
          return new Response(
            JSON.stringify({ 
              error: `This agent cannot discuss: ${topic}`,
              blockedTopic: topic,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Build the system prompt from agent config
    let systemPrompt = '';
    
    // Add persona if defined
    if (agentConfig.persona) {
      systemPrompt += agentConfig.persona + '\n\n';
    }
    
    // Add system prompt/instructions
    if (agentConfig.system_prompt) {
      systemPrompt += agentConfig.system_prompt;
    }
    
    // Add default system prompt if none configured
    if (!systemPrompt.trim()) {
      systemPrompt = `You are ${agentConfig.name}, an AI assistant specialized in ${agentConfig.agent_type.replace('_', ' ').toLowerCase()} tasks. Provide helpful, accurate, and concise responses.`;
    }

    // Add output format guidance based on agent type and requested format
    const outputFormatGuidance = getOutputFormatForAgentType(agentConfig.agent_type, outputFormat);
    if (outputFormatGuidance) {
      systemPrompt += '\n\n' + outputFormatGuidance;
    }

    // Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: inputContent },
    ];

    // Add additional context if provided
    if (additionalContext) {
      messages[1].content = `Context: ${additionalContext}\n\n${inputContent}`;
    }

    console.log(`Invoking agent: ${agentConfig.name} (${agentConfig.agent_type})`);
    console.log(`Using model: ${modelName}`);
    console.log(`Temperature: ${agentConfig.temperature ?? 0.7}`);
    console.log(`Streaming: ${stream}`);

    const startTime = Date.now();

    // If streaming is requested, use SSE
    if (stream) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: agentConfig.temperature ?? 0.7,
          max_tokens: guardrails?.max_tokens_per_run || agentConfig.max_tokens || 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        
        return new Response(
          JSON.stringify({ error: 'AI service error' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create a ReadableStream for SSE
      const encoder = new TextEncoder();
      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;

      const sseStream = new ReadableStream({
        async start(controller) {
          // Send initial event
          controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({
            agentId: agentConfig.id,
            agentName: agentConfig.name,
            agentType: agentConfig.agent_type,
            model: modelName,
          })}\n\n`));

          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  
                  if (data === '[DONE]') {
                    continue;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    
                    if (delta) {
                      fullContent += delta;
                      controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token: delta })}\n\n`));
                    }

                    // Capture usage if present
                    if (parsed.usage) {
                      inputTokens = parsed.usage.prompt_tokens || 0;
                      outputTokens = parsed.usage.completion_tokens || 0;
                    }
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            }

            const durationMs = Date.now() - startTime;
            const estimatedCost = (inputTokens * 0.0001 + outputTokens * 0.0003) / 1000;

            // Try to parse structured output
            let parsedOutput = null;
            try {
              const jsonMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (jsonMatch) {
                parsedOutput = JSON.parse(jsonMatch[1].trim());
              } else if (fullContent.trim().startsWith('{') || fullContent.trim().startsWith('[')) {
                parsedOutput = JSON.parse(fullContent.trim());
              }
            } catch {
              // Not JSON
            }

            // Send completion event
            controller.enqueue(encoder.encode(`event: complete\ndata: ${JSON.stringify({
              content: fullContent,
              parsedOutput,
              usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                estimatedCost,
              },
              metadata: {
                durationMs,
                temperature: agentConfig.temperature ?? 0.7,
                requiresApproval: guardrails?.require_approval ?? false,
              },
            })}\n\n`));

            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ 
              error: error instanceof Error ? error.message : 'Streaming failed' 
            })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(sseStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response (original behavior)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: agentConfig.temperature ?? 0.7,
        max_tokens: guardrails?.max_tokens_per_run || agentConfig.max_tokens || 4096,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage || {};

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse structured output
    let parsedOutput = null;
    try {
      // Check if response contains JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsedOutput = JSON.parse(jsonMatch[1].trim());
      } else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        parsedOutput = JSON.parse(content.trim());
      }
    } catch {
      // Not JSON, that's fine - will return raw content
    }

    // Calculate approximate cost (using estimated rates)
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const estimatedCost = (inputTokens * 0.0001 + outputTokens * 0.0003) / 1000;

    console.log(`Agent run completed in ${durationMs}ms`);
    console.log(`Tokens - Input: ${inputTokens}, Output: ${outputTokens}`);

    return new Response(
      JSON.stringify({
        success: true,
        agentId: agentConfig.id,
        agentName: agentConfig.name,
        agentType: agentConfig.agent_type,
        model: modelName,
        content: content,
        parsedOutput: parsedOutput,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCost,
        },
        metadata: {
          durationMs,
          temperature: agentConfig.temperature ?? 0.7,
          requiresApproval: guardrails?.require_approval ?? false,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in invoke-agent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to provide output format guidance based on agent type and requested format
function getOutputFormatForAgentType(agentType: string, outputFormat: string = 'json'): string {
  if (outputFormat === 'text') {
    return `IMPORTANT: Respond in plain text only. Do not use markdown formatting, headings, bullet points, or any special syntax. Write clear, readable paragraphs with simple line breaks for separation.`;
  }

  if (outputFormat === 'markdown') {
    const typeGuidance: Record<string, string> = {
      'PRODUCT_AGENT': 'When generating PRDs, use well-structured markdown with clear headings (##), bullet points, and sections for: Overview, Problem Statement, Target Users, Goals, Features, Non-Functional Requirements, Constraints, Timeline, and Success Criteria.',
      'STORY_AGENT': 'When generating user stories, use markdown with each story as a section (###) containing: description, acceptance criteria (checkbox list), story points, and priority.',
      'QA_AGENT': 'When generating test cases, use markdown with each test case as a section (###) containing: type badge, priority, preconditions, numbered steps with expected results, and tags.',
      'ARCHITECTURE_AGENT': 'When designing architecture, use markdown with sections for: Overview, Components (with tables), Data Flow, Integrations, Security, Scalability, and Deployment Strategy.',
      'UX_AGENT': 'When designing UX, use markdown with sections for: User Flows, Wireframe Descriptions, Accessibility Guidelines, Interaction Patterns, and Design Tokens.',
      'SECURITY_AGENT': 'When analyzing security, use markdown with a threat table (name, severity, likelihood, impact, mitigation), recommendations list, compliance checklist, and auth/data protection sections.',
      'DOCS_AGENT': 'When generating documentation, provide well-structured markdown with clear headings, code examples where relevant, and practical usage instructions.',
    };
    return typeGuidance[agentType] || 'Provide clear, well-structured markdown output with appropriate headings, lists, and formatting for readability.';
  }

  // JSON format (default)
  switch (agentType) {
    case 'PRODUCT_AGENT':
      return `When generating PRDs, structure your output as JSON with fields: title, overview, problemStatement, targetUsers, goals, features, nonFunctionalRequirements, constraints, assumptions, outOfScope, timeline, successCriteria.`;
    
    case 'STORY_AGENT':
      return `When generating user stories, structure your output as JSON array with each story having: title, description, acceptanceCriteria (array), storyPoints (1-13), priority (high/medium/low), epic (optional).`;
    
    case 'QA_AGENT':
      return `When generating test cases, structure your output as JSON array with each test case having: title, type (functional/integration/e2e/performance/security/accessibility), priority (critical/high/medium/low), preconditions (array), steps (array of {step, action, expectedResult}), testData (optional), automatable (boolean), tags (array).`;
    
    case 'ARCHITECTURE_AGENT':
      return `When designing architecture, structure your output as JSON with fields: overview, components (array of {name, description, technology, responsibilities}), dataFlow, integrations, securityConsiderations, scalabilityPlan, deploymentStrategy.`;
    
    case 'UX_AGENT':
      return `When designing UX, structure your output as JSON with fields: userFlows (array), wireframeDescriptions (array), accessibilityGuidelines, interactionPatterns, designTokens.`;
    
    case 'SECURITY_AGENT':
      return `When analyzing security, structure your output as JSON with fields: threats (array of {name, severity, likelihood, impact, mitigation}), recommendations, complianceChecklist, authenticationRequirements, dataProtection.`;
    
    case 'DOCS_AGENT':
      return `When generating documentation, provide well-structured markdown with clear headings, code examples where relevant, and practical usage instructions.`;
    
    default:
      return `Provide clear, well-structured output. Use JSON format when generating structured data, or markdown for narrative content.`;
  }
}
