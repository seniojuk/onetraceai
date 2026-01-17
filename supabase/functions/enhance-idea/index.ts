import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttachedFile {
  fileName: string;
  fileType: string;
  content: string;
}

const systemPrompt = `You are an expert product strategist helping enhance and refine product ideas.

Your task depends on the conversation phase:

## PHASE 1: Asking Clarifying Questions
When given an existing idea and enhancement details, analyze both (including any attached supporting documents) and ask 3-5 focused clarifying questions to refine the idea toward the user's goals. Questions should cover:
- Target audience and market clarity
- Problem validation and pain points
- Value proposition refinement
- Competitive differentiation
- Feasibility and scope considerations
- Success metrics and outcomes

When attached files are provided, incorporate insights from those documents into your analysis and questions. Reference specific information from the files when relevant.

Return as JSON:
{
  "phase": "questions",
  "questions": [
    {
      "id": "q1",
      "question": "Your question here?",
      "category": "audience|problem|value|competition|feasibility|metrics",
      "options": ["Option 1", "Option 2", "Option 3"] // optional suggested answers
    }
  ],
  "summary": "Brief summary of what you understand about the enhancement request, including insights from attached files if any"
}

## PHASE 2: Generating the Enhanced Idea
When you have enough context (after questions are answered), generate an improved and refined idea that incorporates the enhancements and insights from any attached documents.

Return as JSON:
{
  "phase": "complete",
  "idea": {
    "title": "Refined idea title",
    "summary": "A compelling one-paragraph summary of the refined idea",
    "problemStatement": "Clear articulation of the problem being solved",
    "targetAudience": [
      {
        "segment": "Audience segment name",
        "description": "Description of this audience",
        "needs": ["Key need 1", "Key need 2"]
      }
    ],
    "valueProposition": "Clear statement of unique value",
    "keyFeatures": [
      {
        "feature": "Feature name",
        "benefit": "How it benefits users"
      }
    ],
    "differentiators": ["What makes this unique 1", "What makes this unique 2"],
    "successMetrics": ["How to measure success 1", "How to measure success 2"],
    "risks": ["Potential risk 1", "Potential risk 2"],
    "nextSteps": ["Recommended next step 1", "Recommended next step 2"]
  },
  "changesSummary": "Brief summary of what was enhanced/refined in this version"
}

IMPORTANT: 
- Always return valid JSON
- Preserve the core intent of the original idea
- Clearly integrate the requested enhancements
- Be thorough but concise
- Focus on making the idea more compelling and actionable
- Ask questions when the enhancement request needs clarification
- When attached files are provided, leverage their content to inform your analysis and enhancements`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { existingIdea, enhancementDetails, attachedFiles, conversationHistory, action } = await req.json();
    
    if (!existingIdea) {
      return new Response(
        JSON.stringify({ error: 'An existing idea is required' }),
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

    // Format attached files content for the prompt
    let attachedFilesContext = '';
    if (attachedFiles && Array.isArray(attachedFiles) && attachedFiles.length > 0) {
      const fileContents = (attachedFiles as AttachedFile[])
        .map((file, index) => {
          return `### Attached Document ${index + 1}: ${file.fileName}\nType: ${file.fileType}\n\n${file.content}`;
        })
        .join('\n\n---\n\n');
      
      attachedFilesContext = `\n\n## Supporting Documents\nThe following documents have been attached to provide additional context:\n\n${fileContents}`;
      console.log(`Including ${attachedFiles.length} attached file(s) in context`);
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
      
      // If action is to generate enhanced idea now
      if (action === 'generate') {
        messages.push({
          role: 'user',
          content: 'Based on all the information gathered, please generate the enhanced idea now. Return it in the "complete" phase format with a changesSummary explaining what was refined.'
        });
      }
    } else {
      // Initial enhancement request - ask clarifying questions
      const userContent = `I want to enhance and refine an existing product idea. Here's the current idea:\n\n${existingIdea}${attachedFilesContext}\n\n---\n\nHere are the enhancement details I want to incorporate:\n\n${enhancementDetails || 'Please help me refine this idea to make it more compelling and actionable.'}\n\nPlease analyze the existing idea${attachedFiles?.length ? ', the attached supporting documents,' : ''} and enhancement request, then ask me clarifying questions to help create an improved version. Return your questions in the "questions" phase JSON format.`;
      
      messages.push({
        role: 'user',
        content: userContent
      });
    }

    console.log('Calling Lovable AI for idea enhancement...');
    console.log('Messages count:', messages.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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

    console.log('Idea enhancement phase:', parsedResponse.phase);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-idea:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
