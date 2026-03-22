import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are an expert product manager helping enhance and improve existing Product Requirements Documents (PRDs).

Your task depends on the conversation phase:

## PHASE 1: Asking Clarifying Questions
When given an existing PRD and enhancement details, analyze both and ask 3-5 focused clarifying questions to ensure the enhancement is aligned with the original goals. Questions should cover:
- Specific areas that need more detail based on enhancement request
- Potential impacts on existing features or requirements
- Clarifications on new scope or priorities
- Any conflicts between enhancement and existing requirements
- User experience considerations for the enhancements

Return as JSON:
{
  "phase": "questions",
  "questions": [
    {
      "id": "q1",
      "question": "Your question here?",
      "category": "scope|users|features|technical|priorities",
      "options": ["Option 1", "Option 2", "Option 3"] // optional suggested answers
    }
  ],
  "summary": "Brief summary of what you understand about the enhancement request"
}

## PHASE 2: Generating the Enhanced PRD
When you have enough context (after questions are answered), generate an improved PRD that incorporates the enhancements while preserving the original intent.

Return as JSON:
{
  "phase": "complete",
  "prd": {
    "title": "Product name or feature title",
    "overview": "Executive summary of the product",
    "problemStatement": "What problem does this solve",
    "targetUsers": [
      {
        "persona": "User type name",
        "description": "Description of this user",
        "painPoints": ["Pain point 1", "Pain point 2"]
      }
    ],
    "goals": [
      {
        "type": "business" | "user" | "technical",
        "goal": "Goal description",
        "metric": "How to measure success"
      }
    ],
    "features": [
      {
        "name": "Feature name",
        "description": "What it does",
        "priority": "must_have" | "should_have" | "nice_to_have",
        "userStories": ["As a user, I want..."]
      }
    ],
    "nonFunctionalRequirements": {
      "performance": "Performance requirements",
      "security": "Security requirements",
      "scalability": "Scalability requirements",
      "accessibility": "Accessibility requirements"
    },
    "constraints": ["Known constraints or limitations"],
    "assumptions": ["Assumptions made"],
    "outOfScope": ["What is explicitly not included"],
    "timeline": "High-level timeline or phases",
    "successCriteria": ["How we know this is successful"]
  },
  "changesSummary": "Brief summary of what was changed/enhanced in this version"
}

IMPORTANT: 
- Always return valid JSON
- Preserve the core intent of the original PRD
- Clearly integrate the requested enhancements
- Be thorough but concise
- Focus on actionable requirements
- Ask questions when the enhancement request needs clarification`;

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
    const { data: authData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !authData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { existingPrd, enhancementDetails, conversationHistory, action, attachedFiles } = await req.json();
    
    if (!existingPrd) {
      return new Response(
        JSON.stringify({ error: 'An existing PRD is required' }),
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

    // Build attached files context
    let attachedFilesContext = '';
    if (attachedFiles && Array.isArray(attachedFiles) && attachedFiles.length > 0) {
      const fileContents = attachedFiles.map((f: { name: string; type: string; content: string }) => 
        `### ${f.name} (${f.type})\n\`\`\`\n${f.content}\n\`\`\``
      ).join('\n\n');
      attachedFilesContext = `\n\n## Supporting Documents\nThe following documents have been attached to provide additional context:\n\n${fileContents}`;
    }

    // Build messages from conversation history
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      // Add conversation history
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
      
      // If action is to generate enhanced PRD now
      if (action === 'generate') {
        messages.push({
          role: 'user',
          content: 'Based on all the information gathered, please generate the enhanced PRD now. Return it in the "complete" phase format with a changesSummary explaining what was updated.'
        });
      }
    } else {
      // Initial enhancement request - ask clarifying questions
      messages.push({
        role: 'user',
        content: `I want to enhance an existing PRD. Here's the current PRD:\n\n${existingPrd}${attachedFilesContext}\n\n---\n\nHere are the enhancement details I want to incorporate:\n\n${enhancementDetails || 'Please improve this PRD to be more comprehensive and aligned with best practices.'}\n\nPlease analyze the existing PRD${attachedFiles?.length ? ', the attached supporting documents,' : ''} and enhancement request, then ask me clarifying questions to help create an improved version. Return your questions in the "questions" phase JSON format.`
      });
    }

    console.log('Calling Lovable AI for PRD enhancement...');
    console.log('Messages count:', messages.length);

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

    // Parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw content:', content);
      return new Response(
        JSON.stringify({ 
          phase: 'error',
          rawContent: content,
          error: 'Failed to parse structured response'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PRD enhancement phase:', parsedResponse.phase);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-prd:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
