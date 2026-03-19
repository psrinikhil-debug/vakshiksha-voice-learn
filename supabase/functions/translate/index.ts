import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { text, sourceLang } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a precise multilingual translator. Translate the given text into all three languages: English, Hindi, and Telugu. Return translations that are natural, contextually accurate, and culturally appropriate. Handle code-switching (mixed language input) gracefully — detect the primary meaning and translate fully into each target language.`,
          },
          {
            role: "user",
            content: `Translate the following text into English, Hindi (Devanagari script), and Telugu (Telugu script). The source text may be in any of these languages or a mix.\n\nText: "${text.trim()}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_translations",
              description: "Return the translations in all three languages.",
              parameters: {
                type: "object",
                properties: {
                  english: { type: "string", description: "English translation" },
                  hindi: { type: "string", description: "Hindi translation in Devanagari script" },
                  telugu: { type: "string", description: "Telugu translation in Telugu script" },
                  detectedLanguage: {
                    type: "string",
                    enum: ["english", "hindi", "telugu", "mixed"],
                    description: "The detected language of the source text",
                  },
                },
                required: ["english", "hindi", "telugu", "detectedLanguage"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_translations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      throw new Error(`AI gateway error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No translation result from AI");
    }

    const translations = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(translations), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Translation error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
