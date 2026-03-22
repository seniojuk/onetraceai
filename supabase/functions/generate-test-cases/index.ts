import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are a QA expert specialized in creating comprehensive test cases from acceptance criteria.

Your task is to generate detailed, executable test cases that cover all aspects of the given acceptance criteria.

For each acceptance criterion, generate test cases that include:
1. Positive test cases (happy path)
2. Negative test cases (error scenarios)
3. Boundary test cases (edge values)
4. Integration test considerations

Each test case must have:
- A clear, descriptive title
- Test type (functional, integration, e2e, performance, security, accessibility)
- Priority (critical, high, medium, low)
- Preconditions (setup required before test)
- Step-by-step test steps
- Expected result for each step
- Test data requirements (if any)

Format your response as a JSON object with this structure:
{
  "testCases": [
    {
      "title": "Test case title",
      "type": "functional|integration|e2e|performance|security|accessibility",
      "priority": "critical|high|medium|low",
      "relatedAC": "The AC this test case validates",
      "preconditions": ["Precondition 1", "Precondition 2"],
      "steps": [
        {
          "step": 1,
          "action": "What to do",
          "expectedResult": "What should happen"
        }
      ],
      "testData": "Any specific test data needed",
      "automatable": true|false,
      "tags": ["smoke", "regression", "etc"]
    }
  ],
  "summary": {
    "total": number,
    "byType": {
      "functional": number,
      "integration": number,
      "e2e": number,
      "performance": number,
      "security": number,
      "accessibility": number
    },
    "byPriority": {
      "critical": number,
      "high": number,
      "medium": number,
      "low": number
    },
    "automatable": number
  }
}

Guidelines:
- Be thorough but practical - focus on test cases that provide real value
- Include at least one negative test case per AC
- Consider accessibility and security implications
- Mark tests as automatable when they can be realistically automated
- Use clear, action-oriented language in test steps
- Ensure expected results are specific and verifiable`;

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { acceptanceCriteria, storyContext } = await req.json();

    if (!acceptanceCriteria || acceptanceCriteria.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Acceptance criteria are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format acceptance criteria for the prompt
    const acList = Array.isArray(acceptanceCriteria) 
      ? acceptanceCriteria.map((ac, i) => `${i + 1}. ${typeof ac === 'string' ? ac : ac.criterion || ac.title || JSON.stringify(ac)}`).join('\n')
      : acceptanceCriteria;

    const userPrompt = `Generate comprehensive test cases for the following acceptance criteria:

${storyContext ? `Story Context: ${storyContext}\n\n` : ''}Acceptance Criteria:
${acList}

Generate detailed test cases covering positive, negative, boundary, and integration scenarios. Return the response as valid JSON.`;

    console.log('Generating test cases for ACs:', acList.substring(0, 200));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate test cases' }),
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
    let testCasesResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonContent = jsonMatch ? jsonMatch[1].trim() : content.trim();
      testCasesResult = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse test cases response',
          rawContent: content 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the response structure
    if (!testCasesResult.testCases || !Array.isArray(testCasesResult.testCases)) {
      console.error('Invalid response structure:', testCasesResult);
      return new Response(
        JSON.stringify({ error: 'Invalid test cases structure in response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully generated ${testCasesResult.testCases.length} test cases`);

    return new Response(
      JSON.stringify(testCasesResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-test-cases function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
