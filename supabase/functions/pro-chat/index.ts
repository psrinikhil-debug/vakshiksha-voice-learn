import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // Check pro subscription
    const { data: sub } = await supabase
      .from("pro_subscriptions")
      .select("expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) throw new Error("Pro subscription required");

    const { message, imageUrl, conversationHistory } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new Error("Message is required");
    }

    if (message.length > 2000) {
      throw new Error("Message too long (max 2000 chars)");
    }

    const history = (conversationHistory || []).slice(0, 20);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    // Save user message using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("pro_chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: message.trim(),
      image_url: imageUrl || null,
    });

    // Build messages for AI
    const userContent: any[] = [{ type: "text", text: message.trim() }];
    if (imageUrl) {
      userContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    const aiMessages = [
      {
        role: "system",
        content: `You are VakSiksha Pro Assistant, an advanced AI tutor. You help users with education, language learning, and general knowledge. Be conversational, helpful, and concise. If an image is shared, analyze it and respond helpfully. Format responses with markdown when useful.`,
      },
      ...history,
      { role: "user", content: imageUrl ? userContent : message.trim() },
    ];

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again shortly.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted.");
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI service error. Please try again.");
    }

    const aiData = await aiResponse.json();
    const answerText = aiData.choices?.[0]?.message?.content;

    if (!answerText) throw new Error("No response from AI");

    // Save assistant message
    await adminClient.from("pro_chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: answerText,
    });

    return new Response(JSON.stringify({ reply: answerText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Pro chat error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const safeMsg = msg.includes("required") || msg.includes("Not authenticated") || msg.includes("Pro subscription") || msg.includes("max 2000") || msg.includes("Please try again") || msg.includes("Rate limit") || msg.includes("credits")
      ? msg : "Chat error. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
