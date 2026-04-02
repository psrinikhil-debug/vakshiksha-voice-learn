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
    const MURF_API_KEY = Deno.env.get("AI_VIDEO_DUBBING_API_KEY");
    if (!MURF_API_KEY) throw new Error("AI video dubbing API key not configured");

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

    // Check dubbing status
    if (action === "status") {
      const dubbingId = url.searchParams.get("dubbing_id");
      if (!dubbingId) throw new Error("dubbing_id required");

      const { data: job } = await supabase
        .from("dubbing_jobs")
        .select("id")
        .eq("dubbing_id", dubbingId)
        .single();
      if (!job) throw new Error("Dubbing job not found or access denied");

      const statusRes = await fetch(
        `https://api.murf.ai/v1/video/dub/${dubbingId}`,
        {
          method: "GET",
          headers: { "api-key": MURF_API_KEY },
        }
      );
      const statusData = await statusRes.json();
      console.log("Murf status response:", JSON.stringify(statusData));

      // Normalize status for frontend: map Murf statuses to our expected format
      const normalizedStatus = statusData.status === "completed" ? "dubbed" : statusData.status;

      return new Response(JSON.stringify({ ...statusData, status: normalizedStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download dubbed audio
    if (action === "download") {
      const dubbingId = url.searchParams.get("dubbing_id");
      const languageCode = url.searchParams.get("language_code") || "hi";
      if (!dubbingId) throw new Error("dubbing_id required");

      const { data: job } = await supabase
        .from("dubbing_jobs")
        .select("id")
        .eq("dubbing_id", dubbingId)
        .single();
      if (!job) throw new Error("Dubbing job not found or access denied");

      // Get the dubbed result from Murf
      const resultRes = await fetch(
        `https://api.murf.ai/v1/video/dub/${dubbingId}`,
        {
          method: "GET",
          headers: { "api-key": MURF_API_KEY },
        }
      );
      const resultData = await resultRes.json();
      console.log("Murf download result:", JSON.stringify(resultData));

      // Murf returns a download URL in the response
      const downloadUrl = resultData.audio_url || resultData.output_url || resultData.url;
      if (!downloadUrl) throw new Error("No download URL available yet");

      const dlRes = await fetch(downloadUrl);
      if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);

      return new Response(dlRes.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="dubbed_${languageCode}.mp3"`,
        },
      });
    }

    // Create dubbing job — supports both file upload and URL
    const contentType = req.headers.get("content-type") || "";
    let targetLang: string;
    let sourceLang: string;
    let videoUrl: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      videoUrl = body.source_url;
      targetLang = body.target_lang || "hi";
      sourceLang = body.source_lang || "en";

      if (!videoUrl || typeof videoUrl !== "string") {
        throw new Error("source_url is required");
      }
      if (videoUrl.length > 2048) {
        throw new Error("URL too long");
      }
    } else {
      // File upload: store in Supabase storage to get a public URL
      const formData = await req.formData();
      const videoFile = formData.get("video") as File;
      targetLang = (formData.get("target_lang") as string) || "hi";
      sourceLang = (formData.get("source_lang") as string) || "en";

      if (!videoFile) throw new Error("Video file required");

      const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
      if (videoFile.size > MAX_VIDEO_BYTES) {
        throw new Error("Video file too large (max 100 MB)");
      }
      if (!videoFile.type.startsWith("video/") && !videoFile.type.startsWith("audio/")) {
        throw new Error("Invalid file type. Please upload a video or audio file.");
      }

      // Upload to Supabase storage to get a public URL for Murf
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const fileName = `dubbing/${user.id}/${Date.now()}_${videoFile.name}`;
      const arrayBuffer = await videoFile.arrayBuffer();
      const { error: uploadError } = await serviceClient.storage
        .from("chat-uploads")
        .upload(fileName, arrayBuffer, { contentType: videoFile.type, upsert: true });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("Failed to upload video. Please try again.");
      }

      const { data: publicUrlData } = serviceClient.storage
        .from("chat-uploads")
        .getPublicUrl(fileName);

      videoUrl = publicUrlData.publicUrl;
    }

    // Call Murf Video Dubbing API
    const murfBody = {
      video_url: videoUrl,
      target_language: targetLang,
      source_language: sourceLang,
    };

    console.log("Calling Murf dub API with:", JSON.stringify(murfBody));

    const response = await fetch("https://api.murf.ai/v1/video/dub", {
      method: "POST",
      headers: {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(murfBody),
    });

    const data = await response.json();
    console.log("Murf dub response:", JSON.stringify(data));

    if (!response.ok) {
      const murfError = data?.error?.message || data?.message || data?.error || "Video dubbing failed";
      console.error("Murf dubbing error:", JSON.stringify(data));
      throw new Error(typeof murfError === "string" ? murfError : "Video dubbing failed. Please try again.");
    }

    // Store dubbing job — use Murf's job/task ID
    const dubbingId = data.dubbing_id || data.id || data.task_id;
    if (dubbingId) {
      const { error: insertError } = await supabase
        .from("dubbing_jobs")
        .insert({
          user_id: user.id,
          dubbing_id: String(dubbingId),
          target_lang: targetLang,
          source_lang: sourceLang,
        });
      if (insertError) {
        console.error("Failed to store dubbing job:", insertError);
      }
    }

    return new Response(JSON.stringify({ ...data, dubbing_id: dubbingId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Dubbing error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const safeMsg = msg.includes("required") || msg.includes("Not authenticated") || msg.includes("Pro subscription") || msg.includes("Please try again") || msg.includes("not found") || msg.includes("URL too long") || msg.includes("too large") || msg.includes("Invalid file type") || msg.includes("not configured") || msg.includes("Failed to upload")
      ? msg : "Dubbing error. Please try again.";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
