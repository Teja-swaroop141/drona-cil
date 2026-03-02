import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { moduleId, answers } = await req.json()

    // Validate moduleId
    if (!moduleId || typeof moduleId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid moduleId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate answers structure
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: 'Invalid answers format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate number of answers (prevent oversized payloads)
    const answerKeys = Object.keys(answers)
    if (answerKeys.length === 0 || answerKeys.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid number of answers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate all answer values are valid options (A, B, C, or D)
    for (const [questionId, answer] of Object.entries(answers)) {
      if (typeof answer !== 'string' || !['A', 'B', 'C', 'D'].includes(answer)) {
        return new Response(
          JSON.stringify({ error: 'Invalid answer value' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch questions with correct answers using service role (bypasses RLS)
    const { data: questions, error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .select('id, correct_answer')
      .eq('module_id', moduleId)

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions found for this module' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get pass percentage from module
    const { data: moduleData, error: moduleError } = await supabaseClient
      .from('course_modules')
      .select('pass_percentage')
      .eq('id', moduleId)
      .single()

    if (moduleError) {
      console.error('Error fetching module:', moduleError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch module' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const passPercentage = moduleData?.pass_percentage || 70

    // Grade the quiz
    let correctCount = 0
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++
      }
    })

    const totalQuestions = questions.length
    const scorePercentage = (correctCount / totalQuestions) * 100
    const passed = scorePercentage >= passPercentage

    // Save the attempt
    const { data: attempt, error: attemptError } = await supabaseClient
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        module_id: moduleId,
        score: correctCount,
        total_questions: totalQuestions,
        passed,
        answers
      })
      .select()
      .single()

    if (attemptError) {
      console.error('Error saving attempt:', attemptError)
      return new Response(
        JSON.stringify({ error: 'Failed to save quiz attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        score: correctCount,
        totalQuestions,
        passed,
        passPercentage,
        attemptId: attempt.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in grade-quiz function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})