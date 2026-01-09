import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const questionSystemPrompt = `You are an expert product manager and agile coach. You help break down Product Requirements Documents (PRDs) into well-structured user stories.

When given a PRD, analyze it and ask 3-5 targeted clarifying questions to ensure the stories you generate are comprehensive and actionable. Focus on:
1. Technical constraints or dependencies
2. Priority and scope clarification
3. User experience expectations
4. Integration requirements
5. Edge cases and error handling

Return your response as valid JSON in this exact format:
{
  "phase": "questions",
  "questions": [
    {
      "id": "q1",
      "question": "Your question here?",
      "category": "Category name",
      "options": ["Option 1", "Option 2"] // Optional suggested answers
    }
  ],
  "summary": "Brief summary of what you understood and why you're asking these questions"
}`;

const generateSystemPrompt = `You are an expert product manager and agile coach. Your task is to generate well-structured user stories with clear acceptance criteria based on a PRD and clarifying Q&A.

For each user story, follow this format:
- Title: A concise, action-oriented title
- Description: As a [user type], I want [goal] so that [benefit]
- Acceptance Criteria: A list of specific, testable conditions that must be met
- Story Points: Estimate complexity (1, 2, 3, 5, 8, 13)
- Priority: High, Medium, or Low

Guidelines:
1. Break down large features into small, independently deliverable stories
2. Each story should be completable in one sprint
3. Acceptance criteria should be specific and measurable
4. Consider edge cases and error handling
5. Include both happy path and error scenarios in AC
6. Group related stories under epics when appropriate

Return the stories as valid JSON in this exact format:
{
  "phase": "complete",
  "stories": [
    {
      "title": "string",
      "description": "string",
      "acceptanceCriteria": ["string"],
      "storyPoints": number,
      "priority": "high" | "medium" | "low",
      "epic": "string (optional)"
    }
  ],
  "summary": "Brief summary of what was generated"
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
    const { prdContent, conversationHistory, action } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if we should ask questions or generate stories
    const isFirstMessage = !conversationHistory || conversationHistory.length === 0;
    const shouldGenerate = action === "generate" || 
      (conversationHistory && conversationHistory.length >= 2);

    let systemPrompt: string;
    let userPrompt: string;
    
    if (isFirstMessage && prdContent) {
      // First message: analyze PRD and ask questions
      systemPrompt = questionSystemPrompt;
      userPrompt = `Please analyze this PRD and ask clarifying questions to help generate comprehensive user stories:\n\n${prdContent}`;
    } else if (shouldGenerate) {
      // Generate stories based on conversation
      systemPrompt = generateSystemPrompt;
      userPrompt = "Based on our conversation, please generate the user stories now.";
    } else {
      // Continue asking questions or process answers
      systemPrompt = questionSystemPrompt;
      userPrompt = "Based on the answers provided, either ask follow-up questions if needed or indicate you're ready to generate stories.";
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

    console.log('Calling Lovable AI for story generation...', { 
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
      if (content.includes('"stories"') || content.includes('stories:')) {
        return new Response(
          JSON.stringify({ 
            phase: 'complete',
            stories: [],
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

    console.log(`Response phase: ${parsedResponse.phase}, stories: ${parsedResponse.stories?.length || 0}`);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-stories:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
