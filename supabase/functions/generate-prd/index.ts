import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are an expert product manager helping create comprehensive Product Requirements Documents (PRDs). 

Your task depends on the conversation phase:

## PHASE 1: Asking Clarifying Questions
When given an initial idea, analyze it and ask 3-5 focused clarifying questions to gather missing information. Questions should cover:
- Target users and their pain points
- Key features and must-haves vs nice-to-haves
- Success metrics and goals
- Technical constraints or integrations
- Timeline or scope preferences

Return as JSON:
{
  "phase": "questions",
  "questions": [
    {
      "id": "q1",
      "question": "Who is the primary target user for this product?",
      "category": "users",
      "options": ["Option 1", "Option 2", "Option 3"] // optional suggested answers
    }
  ],
  "summary": "Brief summary of what you understand so far"
}

## PHASE 2: Generating the PRD
When you have enough context (after questions are answered), generate a complete PRD.

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
  }
}

IMPORTANT: 
- Always return valid JSON
- Be thorough but concise
- Focus on actionable requirements
- Ask questions when context is missing
- Generate PRD only when you have sufficient information`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, conversationHistory, action } = await req.json();
    
    if (!idea && (!conversationHistory || conversationHistory.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'An idea or conversation history is required' }),
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

    // Build messages from conversation history
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      // Add conversation history
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
      
      // If action is to generate PRD now, add instruction
      if (action === 'generate') {
        messages.push({
          role: 'user',
          content: 'Based on all the information gathered, please generate the complete PRD now. Return it in the "complete" phase format.'
        });
      }
    } else {
      // Initial idea - ask clarifying questions
      messages.push({
        role: 'user',
        content: `I have a product idea I'd like to develop into a PRD. Here's the idea:\n\n${idea}\n\nPlease analyze this idea and ask me clarifying questions to help create a comprehensive PRD. Return your questions in the "questions" phase JSON format.`
      });
    }

    console.log('Calling Lovable AI for PRD generation...');
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

    console.log('PRD generation phase:', parsedResponse.phase);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-prd:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
