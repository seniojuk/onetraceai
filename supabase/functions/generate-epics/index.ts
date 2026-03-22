import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const questionSystemPrompt = `You are an expert product manager and agile coach. You help break down Product Requirements Documents (PRDs) into well-structured epics.

When given a PRD, analyze it and ask 3-5 targeted clarifying questions to ensure the epics you generate are comprehensive and well-scoped. Focus on:
1. Business priority and timeline constraints
2. Dependencies between major features
3. Team capacity and technical constraints
4. MVP scope vs. future iterations
5. User journey flow and feature grouping

Return your response as valid JSON in this exact format:
{
  "phase": "questions",
  "questions": [
    {
      "id": "q1",
      "question": "Your question here?",
      "category": "Category name",
      "options": ["Option 1", "Option 2"]
    }
  ],
  "summary": "Brief summary of what you understood and why you're asking these questions"
}`;

const generateSystemPrompt = `You are an expert product manager and agile coach. Your task is to generate well-structured epics based on a PRD and clarifying Q&A.

An epic represents a large body of work that can be broken down into multiple user stories. Each epic should:
- Represent a cohesive set of functionality
- Be deliverable within 1-3 sprints
- Have clear business value and goals
- Include success criteria

Guidelines:
1. Group related features and capabilities into logical epics
2. Consider dependencies between epics
3. Prioritize based on business value and technical dependencies
4. Each epic should be independently valuable to users
5. Include clear scope boundaries to prevent scope creep
6. Estimate complexity using T-shirt sizes (S, M, L, XL)

Return the epics as valid JSON in this exact format:
{
  "phase": "complete",
  "epics": [
    {
      "title": "string",
      "description": "string",
      "businessValue": "string",
      "goals": ["string"],
      "successCriteria": ["string"],
      "size": "S" | "M" | "L" | "XL",
      "priority": "high" | "medium" | "low",
      "dependencies": ["string (optional - names of other epics this depends on)"],
      "suggestedStories": ["string (brief story titles that could belong to this epic)"]
    }
  ],
  "summary": "Brief summary of what was generated and how epics are organized"
}`;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.89.0");
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { prdContent, conversationHistory, action, attachedFiles } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build attached files context
    let attachedFilesContext = '';
    if (attachedFiles && Array.isArray(attachedFiles) && attachedFiles.length > 0) {
      const fileContents = attachedFiles.map((f: { name: string; type: string; content: string }) => 
        `### ${f.name} (${f.type})\n\`\`\`\n${f.content}\n\`\`\``
      ).join('\n\n');
      attachedFilesContext = `\n\n## Supporting Documents\nThe following documents have been attached to provide additional context:\n\n${fileContents}`;
    }

    // Determine if we should ask questions or generate epics
    const isFirstMessage = !conversationHistory || conversationHistory.length === 0;
    const shouldGenerate = action === "generate" || 
      (conversationHistory && conversationHistory.length >= 2);

    let systemPrompt: string;
    let userPrompt: string;
    
    if (isFirstMessage && prdContent) {
      // First message: analyze PRD and ask questions
      systemPrompt = questionSystemPrompt;
      userPrompt = `Please analyze this PRD and ask clarifying questions to help generate comprehensive epics:\n\n${prdContent}${attachedFilesContext}${attachedFiles?.length ? '\n\nPlease also consider the attached supporting documents in your analysis.' : ''}`;
    } else if (shouldGenerate) {
      // Generate epics based on conversation
      systemPrompt = generateSystemPrompt;
      userPrompt = "Based on our conversation, please generate the epics now.";
    } else {
      // Continue asking questions or process answers
      systemPrompt = questionSystemPrompt;
      userPrompt = "Based on the answers provided, either ask follow-up questions if needed or indicate you're ready to generate epics.";
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the current prompt if it's the first message or we're generating
    if (isFirstMessage || shouldGenerate) {
      messages.push({ role: 'user', content: userPrompt });
    }

    console.log('Calling Lovable AI for epic generation...', { 
      isFirstMessage, 
      shouldGenerate, 
      historyLength: conversationHistory?.length || 0 
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
      }),
    });

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

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response from the AI
    let parsedResponse;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw content:', content);
      
      // Try to determine phase from content
      if (content.includes('"epics"') || content.includes('epics:')) {
        return new Response(
          JSON.stringify({ 
            phase: 'complete',
            epics: [],
            rawContent: content,
            error: 'Failed to parse structured response'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          phase: 'questions',
          questions: [],
          rawContent: content,
          error: 'Failed to parse structured response'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Response phase: ${parsedResponse.phase}, epics: ${parsedResponse.epics?.length || 0}`);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-epics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
