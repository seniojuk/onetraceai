import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are an expert product manager and agile coach. Your task is to decompose Product Requirements Documents (PRDs) into well-structured user stories with clear acceptance criteria.

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

Return the stories as a valid JSON array with this structure:
{
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prdContent, projectContext } = await req.json();
    
    if (!prdContent) {
      return new Response(
        JSON.stringify({ error: 'PRD content is required' }),
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

    const userPrompt = `Please analyze the following PRD and generate user stories with acceptance criteria.

${projectContext ? `Project Context: ${projectContext}\n\n` : ''}PRD Content:
${prdContent}

Generate comprehensive user stories that cover all the requirements in this PRD. Ensure each story is independent and testable.`;

    console.log('Calling Lovable AI for story generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
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
    let parsedStories;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsedStories = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw content:', content);
      // Return the raw content if parsing fails
      return new Response(
        JSON.stringify({ 
          stories: [],
          rawContent: content,
          error: 'Failed to parse structured response'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${parsedStories.stories?.length || 0} stories`);

    return new Response(
      JSON.stringify(parsedStories),
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
