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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "status") {
      const dubbingId = url.searchParams.get("dubbing_id");
      if (!dubbingId) throw new Error("dubbing_id required");

      // Verify ownership
      const { data: job } = await supabase
        .from("dubbing_jobs")
        .select("id")
        .eq("dubbing_id", dubbingId)
        .single();
      if (!job) throw new Error("Dubbing job not found or access denied");

      const statusRes = await fetch(
        `https://api.elevenlabs.io/v1/dubbing/${dubbingId}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      );
      const statusData = await statusRes.json();

      return new Response(JSON.stringify(statusData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "download") {
      const dubbingId = url.searchParams.get("dubbing_id");
      const languageCode = url.searchParams.get("language_code") || "hi";
      if (!dubbingId) throw new Error("dubbing_id required");

      // Verify ownership
      const { data: job } = await supabase
        .from("dubbing_jobs")
        .select("id")
        .eq("dubbing_id", dubbingId)
        .single();
      if (!job) throw new Error("Dubbing job not found or access denied");

      const dlRes = await fetch(
        `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/audio/${languageCode}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      );

      if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);

      return new Response(dlRes.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="dubbed_${languageCode}.mp3"`,
        },
      });
    }

    // Create dubbing job
    const formData = await req.formData();
    const videoFile = formData.get("video") as File;
    const targetLang = formData.get("target_lang") as string || "hi";
    const sourceLang = formData.get("source_lang") as string || "en";

    if (!videoFile) throw new Error("Video file required");

    const elFormData = new FormData();
    elFormData.append("file", videoFile);
    elFormData.append("target_lang", targetLang);
    elFormData.append("source_lang", sourceLang);
    elFormData.append("mode", "automatic");
    elFormData.append("num_speakers", "0");

    const response = await fetch("https://api.elevenlabs.io/v1/dubbing", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: elFormData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`ElevenLabs dubbing error: ${JSON.stringify(data)}`);

    // Store dubbing job for ownership tracking
    const { error: insertError } = await supabase
      .from("dubbing_jobs")
      .insert({
        user_id: user.id,
        dubbing_id: data.dubbing_id,
        target_lang: targetLang,
        source_lang: sourceLang,
      });
    if (insertError) {
      console.error("Failed to store dubbing job:", insertError);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
