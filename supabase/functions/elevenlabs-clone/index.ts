import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ElevenLabs API key not configured");

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
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) throw new Error("Pro subscription required");

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const audioFile = formData.get("audio") as File;

    if (!name || !audioFile) throw new Error("Name and audio file required");

    // Validate file size (max 10 MB)
    const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
    if (audioFile.size > MAX_AUDIO_BYTES) {
      throw new Error("Audio file too large (max 10 MB)");
    }

    // Validate MIME type
    if (!audioFile.type.startsWith("audio/")) {
      throw new Error("Invalid file type. Please upload an audio file.");
    }

    // Clone voice via ElevenLabs
    const elFormData = new FormData();
    elFormData.append("name", name);
    elFormData.append("files", audioFile);

    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: elFormData,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("ElevenLabs clone error:", JSON.stringify(data));
      throw new Error("Voice cloning failed. Please try again.");
    }

    // Save to DB
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("voice_clones").insert({
      user_id: user.id,
      name,
      elevenlabs_voice_id: data.voice_id,
    });

    return new Response(JSON.stringify({ voice_id: data.voice_id, name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Voice clone error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const safeMsg = msg.includes("required") || msg.includes("Not authenticated") || msg.includes("Pro subscription") || msg.includes("Please try again")
      ? msg : "Voice cloning error. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
