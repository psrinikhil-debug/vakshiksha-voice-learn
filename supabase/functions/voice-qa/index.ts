import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MURF_API_URL = "https://api.murf.ai/v1/speech/generate";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const MURF_API_KEY = Deno.env.get("murf_api_key");
    if (!MURF_API_KEY) throw new Error("murf_api_key is not configured");

    const { question, voiceId, conversationHistory } = await req.json();

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (question.length > 500) {
      return new Response(
        JSON.stringify({ error: "Question too long (max 500 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap conversation history to prevent token abuse
    const history = (conversationHistory || []).slice(0, 10);

    // Step 1: Get AI answer using Lovable AI
    const messages = [
      {
        role: "system",
        content: `You are VakSiksha, an intelligent educational voice assistant. You answer questions accurately, concisely, and in a conversational tone suitable for being read aloud. 

Rules:
- Give direct, clear answers (2-4 sentences for simple questions, up to a paragraph for complex ones)
- Do NOT repeat or echo the user's question back
- Do NOT use markdown formatting, bullet points, or special characters — your response will be spoken aloud
- Use natural, flowing language as if you're a teacher speaking to a student
- If you don't know something, say so honestly
- For educational topics, explain concepts simply and memorably`,
      },
      ...history,
      { role: "user", content: question.trim() },
    ];

    console.log("Calling AI gateway for question:", question.trim().substring(0, 100));

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("Failed to get answer. Please try again.");
    }

    const aiData = await aiResponse.json();
    const answerText = aiData.choices?.[0]?.message?.content;

    if (!answerText) {
      throw new Error("No answer received from AI");
    }

    console.log("AI answer received, generating voice...");

    // Step 2: Convert answer to speech using Murf AI
    const murfResponse = await fetch(MURF_API_URL, {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: answerText,
        voiceId: voiceId || "en-US-natalie",
        format: "MP3",
      }),
    });

    const murfData = await murfResponse.json();

    if (!murfResponse.ok) {
      console.error("Murf API error:", murfData);
      // Return text answer even if voice fails
      return new Response(
        JSON.stringify({
          answer: answerText,
          audioFile: null,
          voiceFailed: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Voice generated successfully");

    return new Response(
      JSON.stringify({
        answer: answerText,
        audioFile: murfData.audioFile || null,
        audioLength: murfData.audioLengthInSeconds || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Voice QA error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const safeMsg = msg.includes("max 500") || msg.includes("Please try again") || msg.includes("not configured")
      ? msg : "Voice assistant error. Please try again.";
    return new Response(
      JSON.stringify({ error: safeMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
