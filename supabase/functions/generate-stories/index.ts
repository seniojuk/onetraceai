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

const epicQuestionSystemPrompt = `You are an expert product manager and agile coach. You help break down Epics into well-structured user stories.

You are being given an Epic along with its parent PRD for full context. The Epic contains a high-level feature description and potentially suggested stories. Your job is to ask clarifying questions to generate detailed, implementable user stories.

When analyzing the Epic and its context, ask 3-5 targeted clarifying questions focusing on:
1. Implementation details and technical approach for each suggested story
2. Priority and sequencing of stories
3. Acceptance criteria specifics
4. Edge cases and error handling
5. Dependencies between stories

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
  "summary": "Brief summary of the Epic scope and why you're asking these questions"
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

const epicGenerateSystemPrompt = `You are an expert product manager and agile coach. Your task is to generate well-structured user stories for a specific Epic, using the full context from the parent PRD.

You are being given:
1. An Epic with its description and suggested stories
2. The parent PRD that provides business context and requirements
3. Any attached supporting documents from the PRD

For each user story, follow this format:
- Title: A concise, action-oriented title
- Description: As a [user type], I want [goal] so that [benefit]
- Acceptance Criteria: A list of specific, testable conditions that must be met (5-10 criteria per story)
- Story Points: Estimate complexity (1, 2, 3, 5, 8, 13)
- Priority: High, Medium, or Low

Guidelines:
1. Generate detailed stories that expand on the Epic's suggested stories
2. Ensure stories align with the PRD's overall vision and requirements
3. Each story should be completable in one sprint
4. Acceptance criteria should be specific, measurable, and derived from both Epic and PRD context
5. Consider edge cases and error handling from the PRD requirements
6. Include both happy path and error scenarios in AC
7. Reference specific requirements from the PRD in your acceptance criteria

Return the stories as valid JSON in this exact format:
{
  "phase": "complete",
  "stories": [
    {
      "title": "string",
      "description": "string",
      "acceptanceCriteria": ["string"],
      "storyPoints": number,
      "priority": "high" | "medium" | "low"
    }
  ],
  "summary": "Brief summary of what was generated and how it relates to the Epic"
}`;

const refineSystemPrompt = `You are an expert product manager and agile coach. Your task is to refine an existing user story based on user feedback.

You will receive:
1. The current story with its title, description, acceptance criteria, story points, and priority
2. User feedback describing how they want the story refined
3. Context from the Epic and/or PRD the story was generated from

Guidelines for refining:
1. Preserve the core intent of the story while addressing the feedback
2. Improve acceptance criteria to be more specific and testable
3. Adjust story points if the scope changes significantly
4. Maintain consistency with the Epic/PRD context
5. Add edge cases and error handling scenarios if requested
6. Keep the story independently deliverable

Return the refined story as valid JSON in this exact format:
{
  "refinedStory": {
    "title": "string",
    "description": "string",
    "acceptanceCriteria": ["string"],
    "storyPoints": number,
    "priority": "high" | "medium" | "low"
  },
  "changes": "Brief summary of what was changed based on the feedback"
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { 
      prdContent, 
      conversationHistory, 
      action, 
      attachedFiles,
      // Epic-specific fields
      epicContent,
      epicTitle,
      parentPrdContent,
      parentPrdTitle,
      parentPrdFiles,
      // Refine-specific fields
      storyToRefine,
      refineFeedback
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle refine action
    if (action === "refine" && storyToRefine && refineFeedback) {
      console.log('Refining story with AI...', { storyTitle: storyToRefine.title });
      
      // Build context for refinement
      let contextInfo = '';
      if (epicContent) {
        contextInfo += `\n\n## Epic Context: ${epicTitle}\n${epicContent}`;
        if (parentPrdContent) {
          contextInfo += `\n\n## Parent PRD Context: ${parentPrdTitle || 'PRD'}\n${parentPrdContent}`;
        }
      } else if (prdContent) {
        contextInfo += `\n\n## PRD Context\n${prdContent}`;
      }

      // Add attached files context
      const filesToUse = parentPrdFiles || attachedFiles || [];
      if (filesToUse.length > 0) {
        const fileContents = filesToUse.map((f: { name: string; type: string; content: string }) => 
          `### ${f.name}\n${f.content.substring(0, 2000)}${f.content.length > 2000 ? '...[truncated]' : ''}`
        ).join('\n\n');
        contextInfo += `\n\n## Supporting Documents\n${fileContents}`;
      }

      const refineUserPrompt = `Please refine the following user story based on the feedback provided.

## Current Story
Title: ${storyToRefine.title}
Description: ${storyToRefine.description}
Priority: ${storyToRefine.priority}
Story Points: ${storyToRefine.storyPoints}
Acceptance Criteria:
${storyToRefine.acceptanceCriteria.map((ac: string, i: number) => `${i + 1}. ${ac}`).join('\n')}

## User Feedback
${refineFeedback}
${contextInfo}

Please refine the story according to the feedback while maintaining consistency with the context.`;

      const refineResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: refineSystemPrompt },
            { role: 'user', content: refineUserPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!refineResponse.ok) {
        const errorText = await refineResponse.text();
        console.error('Lovable AI error during refinement:', refineResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to refine story' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refineData = await refineResponse.json();
      const refineContent = refineData.choices?.[0]?.message?.content;

      if (!refineContent) {
        return new Response(
          JSON.stringify({ error: 'No response from AI' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse the refined story
      try {
        const jsonMatch = refineContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, refineContent];
        const jsonStr = jsonMatch[1].trim();
        const parsedRefine = JSON.parse(jsonStr);
        
        console.log('Story refined successfully:', parsedRefine.changes);
        
        return new Response(
          JSON.stringify(parsedRefine),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('Failed to parse refined story:', parseError);
        return new Response(
          JSON.stringify({ error: 'Failed to parse refined story response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine if we're generating from an Epic
    const isEpicBased = !!epicContent;

    // Build attached files context (use parentPrdFiles for Epic-based generation)
    const filesToUse = isEpicBased ? (parentPrdFiles || []) : (attachedFiles || []);
    let attachedFilesContext = '';
    if (filesToUse && Array.isArray(filesToUse) && filesToUse.length > 0) {
      const fileContents = filesToUse.map((f: { name: string; type: string; content: string }) => 
        `### ${f.name} (${f.type})\n\`\`\`\n${f.content}\n\`\`\``
      ).join('\n\n');
      attachedFilesContext = `\n\n## Supporting Documents\nThe following documents have been attached to provide additional context:\n\n${fileContents}`;
    }

    // Build Epic context if generating from Epic
    let epicContext = '';
    if (isEpicBased) {
      epicContext = `\n\n## Epic: ${epicTitle}\n${epicContent}`;
      if (parentPrdContent) {
        epicContext += `\n\n## Parent PRD: ${parentPrdTitle || 'PRD'}\nThis Epic was derived from the following PRD. Use this for full business context:\n\n${parentPrdContent}`;
      }
    }

    // Determine if we should ask questions or generate stories
    const isFirstMessage = !conversationHistory || conversationHistory.length === 0;
    const shouldGenerate = action === "generate" || 
      (conversationHistory && conversationHistory.length >= 2);

    let systemPrompt: string;
    let userPrompt: string;
    
    if (isFirstMessage) {
      if (isEpicBased) {
        // Epic-based: analyze Epic with PRD context
        systemPrompt = epicQuestionSystemPrompt;
        userPrompt = `Please analyze this Epic and its parent PRD context, then ask clarifying questions to help generate comprehensive user stories:${epicContext}${attachedFilesContext}${filesToUse.length ? '\n\nPlease also consider the attached supporting documents in your analysis.' : ''}`;
      } else if (prdContent) {
        // PRD-based: analyze PRD and ask questions
        systemPrompt = questionSystemPrompt;
        userPrompt = `Please analyze this PRD and ask clarifying questions to help generate comprehensive user stories:\n\n${prdContent}${attachedFilesContext}${attachedFiles?.length ? '\n\nPlease also consider the attached supporting documents in your analysis.' : ''}`;
      } else {
        return new Response(
          JSON.stringify({ error: 'No content provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (shouldGenerate) {
      // Generate stories based on conversation
      systemPrompt = isEpicBased ? epicGenerateSystemPrompt : generateSystemPrompt;
      
      if (isEpicBased) {
        userPrompt = `Based on our conversation about the Epic "${epicTitle}", please generate the detailed user stories now. Remember to leverage the full context from the parent PRD and attached documents.${epicContext}${attachedFilesContext}`;
      } else {
        userPrompt = "Based on our conversation, please generate the user stories now.";
      }
    } else {
      // Continue asking questions or process answers
      systemPrompt = isEpicBased ? epicQuestionSystemPrompt : questionSystemPrompt;
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
      historyLength: conversationHistory?.length || 0,
      isEpicBased,
      epicTitle: epicTitle || null,
      hasParentPrd: !!parentPrdContent,
      attachedFilesCount: filesToUse.length
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
